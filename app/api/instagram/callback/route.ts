import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { cifrar } from "@/lib/crypto";
import {
  intercambiarCodePorToken,
  obtenerTokenLargo,
  getInfoCuenta,
} from "@/lib/instagram";

// ============================================================
// GET /api/instagram/callback
// Instagram redirige aquí con ?code=... tras autorizar.
// Pasos:
//   1. Verificar el state (anti-CSRF).
//   2. code -> token corto -> token largo (60 días).
//   3. Leer datos del perfil.
//   4. Guardar/actualizar la fila en mv_rrss_cuenta (token CIFRADO).
//
// Nota: el responsable de la cuenta (tb_usuario_responsable_id) aquí
// se toma de una env var de ejemplo. En tu app real, úsalo desde la
// sesión del usuario que está conectando su Instagram.
// ============================================================

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/?ig=error&motivo=${error}`, req.url)
    );
  }
  if (!code) {
    return NextResponse.json({ error: "Falta el code" }, { status: 400 });
  }

  // 1) Verificar state contra la cookie.
  const stateCookie = req.cookies.get("ig_oauth_state")?.value;
  if (!state || !stateCookie || state !== stateCookie) {
    return NextResponse.json({ error: "State inválido" }, { status: 400 });
  }

  try {
    // 2) code -> token corto -> token largo
    const { access_token: tokenCorto } = await intercambiarCodePorToken(code);
    const { access_token: tokenLargo, expires_in } = await obtenerTokenLargo(
      tokenCorto
    );

    // 3) Datos del perfil
    const info = await getInfoCuenta(tokenLargo);

    // 4) Guardar en mv_rrss_cuenta
    const tokenCifrado = cifrar(tokenLargo);
    const expiraEn = new Date(Date.now() + expires_in * 1000);
    const responsableId = Number(process.env.DEFAULT_RESPONSABLE_USER_ID ?? 1);
    const urlPerfil = `https://www.instagram.com/${info.username}/`;

    // ¿Ya existe esta cuenta? (usamos rrss_key = id numérico de IG)
    const existente = await pool.query(
      `SELECT id FROM mv_rrss_cuenta WHERE rrss_key = $1 LIMIT 1`,
      [info.user_id]
    );

    if (existente.rowCount && existente.rowCount > 0) {
      await pool.query(
        `UPDATE mv_rrss_cuenta
            SET usuario_rrss = $1,
                url_rrss = $2,
                access_token_encriptado = $3,
                token_expira_en = $4,
                metricas_habilitadas = 'S',
                fecha_mod = NOW(),
                usuario_mod = $5
          WHERE id = $6`,
        [
          info.username,
          urlPerfil,
          tokenCifrado,
          expiraEn,
          responsableId,
          existente.rows[0].id,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO mv_rrss_cuenta
           (tb_rrss_id, tb_usuario_responsable_id, nombre_cuenta, usuario_rrss,
            url_rrss, rrss_key, cuenta_oficial, metricas_habilitadas,
            access_token_encriptado, token_expira_en, usuario_crea)
         VALUES
           ((SELECT id FROM tb_rrss WHERE descripcion = 'Instagram'),
            $1, $2, $3, $4, $5, 'S', 'S', $6, $7, $8)`,
        [
          responsableId,
          info.username, // nombre_cuenta
          info.username, // usuario_rrss
          urlPerfil,
          info.user_id, // rrss_key = id de cuenta IG (lo usa el cron)
          tokenCifrado,
          expiraEn,
          responsableId,
        ]
      );
    }

    const res = NextResponse.redirect(new URL("/?ig=ok", req.url));
    res.cookies.delete("ig_oauth_state");
    return res;
  } catch (e) {
    console.error("Callback IG falló:", e);
    return NextResponse.json(
      { error: "No se pudo conectar la cuenta" },
      { status: 500 }
    );
  }
}
