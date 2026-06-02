// Gestión de token local sin base de datos.
// Guarda el token en token.json (ignorado por git).
// Auto-renueva si quedan menos de DIAS_ANTES_DE_RENOVAR días para expirar.

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

const TOKEN_FILE = resolve(process.cwd(), "token.json");
const DIAS_ANTES_DE_RENOVAR = 7;
const GR_IG = "https://graph.instagram.com";

interface TokenData {
  access_token: string;
  user_id: string;
  expires_at: string; // ISO 8601
}

export function leerTokenGuardado(): TokenData | null {
  if (!existsSync(TOKEN_FILE)) return null;
  try {
    return JSON.parse(readFileSync(TOKEN_FILE, "utf-8")) as TokenData;
  } catch {
    return null;
  }
}

export function guardarToken(data: TokenData) {
  writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function diasParaExpirar(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

async function refrescar(tokenActual: string): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type:   "ig_refresh_token",
    access_token: tokenActual,
  });
  const r = await fetch(`${GR_IG}/refresh_access_token?${params.toString()}`);
  if (!r.ok) throw new Error(`Error al refrescar token: ${await r.text()}`);
  return r.json();
}

// Retorna un token válido, renovándolo automáticamente si está por vencer.
export async function obtenerToken(): Promise<{ access_token: string; user_id: string }> {
  const APP_ID       = process.env.INSTAGRAM_APP_ID      ?? "";
  const APP_SECRET   = process.env.INSTAGRAM_APP_SECRET  ?? "";
  const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI ?? "";

  // Silenciar advertencias de vars no usadas en este módulo
  void APP_ID; void APP_SECRET; void REDIRECT_URI;

  let data = leerTokenGuardado();

  if (!data) {
    const envToken  = process.env.ACCESS_TOKEN ?? "";
    const envUserId = process.env.IG_USER_ID   ?? "";
    if (!envToken) {
      throw new Error(
        "No hay token.json ni ACCESS_TOKEN en .env.local.\n" +
        "Ejecuta: npm run guardar-token"
      );
    }
    // Primera vez: asumimos token de Instagram Login válido, expira en 60 días
    data = {
      access_token: envToken,
      user_id:      envUserId,
      expires_at:   new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    };
    guardarToken(data);
    console.log("Token guardado en token.json (expira en 60 días).\n");
  }

  const dias = diasParaExpirar(data.expires_at);

  if (dias <= 0) {
    throw new Error("El token expiró. Ejecuta npm run guardar-token con un token nuevo.");
  }

  if (dias <= DIAS_ANTES_DE_RENOVAR) {
    console.log(`Token expira en ${dias} días. Renovando automáticamente...`);
    const renovado = await refrescar(data.access_token);
    data = {
      access_token: renovado.access_token,
      user_id:      data.user_id,
      expires_at:   new Date(Date.now() + renovado.expires_in * 1000).toISOString(),
    };
    guardarToken(data);
    console.log("Token renovado y guardado en token.json.\n");
  } else {
    console.log(`Token válido (expira en ${dias} días).\n`);
  }

  return { access_token: data.access_token, user_id: data.user_id };
}
