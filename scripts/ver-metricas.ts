// ============================================================
// Obtiene métricas de Instagram y las muestra como JSON.
// Soporta dos tipos de token:
//   A) Instagram Login token  (graph.instagram.com)
//   B) Facebook user token    (graph.facebook.com / Graph API Explorer)
//
// Variables en .env.local:
//   ACCESS_TOKEN=EAAxxxxxxx  <- el token que tenés
// ============================================================

import { config } from "dotenv";
import { resolve } from "path";
import { obtenerToken } from "../lib/token-local";

config({ path: resolve(process.cwd(), ".env.local") });

const GR_IG = "https://graph.instagram.com/v22.0";
const GR_FB = "https://graph.facebook.com/v22.0";

let TOKEN = "";

async function fetchJson(url: string) {
  const r = await fetch(url);
  const json = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(json));
  return json;
}

// --- Intento A: token de Instagram Login (graph.instagram.com) ---
async function intentarInstagramLogin() {
  const perfil = await fetchJson(
    `${GR_IG}/me?fields=user_id,username,account_type,followers_count,follows_count,media_count&access_token=${TOKEN}`
  );

  let alcance: number | null = null;
  let alcanceRaw: unknown = null;
  try {
    alcanceRaw = await fetchJson(
      `${GR_IG}/${perfil.user_id}/insights?metric=reach&period=day&metric_type=total_value&access_token=${TOKEN}`
    );
    alcance = (alcanceRaw as any)?.data?.[0]?.total_value?.value ?? null;
  } catch { /* cuentas con <100 seguidores no tienen insights */ }

  let likes: number | null = null;
  let comentarios: number | null = null;
  let mediaRaw: unknown = null;
  try {
    mediaRaw = await fetchJson(
      `${GR_IG}/me/media?fields=id,like_count,comments_count&limit=25&access_token=${TOKEN}`
    );
    const items = (mediaRaw as any)?.data ?? [];
    likes       = items.reduce((s: number, m: any) => s + (m.like_count      ?? 0), 0);
    comentarios = items.reduce((s: number, m: any) => s + (m.comments_count  ?? 0), 0);
  } catch { /* sin datos de media */ }

  return {
    fuente: "instagram-login-api",
    seguidores:    perfil.followers_count ?? null,
    siguiendo:     perfil.follows_count   ?? null,
    publicaciones: perfil.media_count     ?? null,
    likes,
    comentarios,
    alcance,
    datos_originales: { perfil, alcance: alcanceRaw, media: mediaRaw },
  };
}

// --- Intento B: token de Facebook user (Graph API Explorer) ---
async function intentarFacebookToken() {
  // Obtener páginas del usuario
  const paginas = await fetchJson(
    `${GR_FB}/me/accounts?access_token=${TOKEN}`
  );

  const pagina = paginas?.data?.[0];
  if (!pagina) throw new Error("El token no tiene páginas de Facebook asociadas.");

  const pageToken = pagina.access_token;
  const pageId    = pagina.id;

  // Obtener la cuenta de Instagram Business conectada a la página
  const pageData = await fetchJson(
    `${GR_FB}/${pageId}?fields=instagram_business_account&access_token=${pageToken}`
  );

  const igId = pageData?.instagram_business_account?.id;
  if (!igId) {
    throw new Error(
      `La página "${pagina.name}" no tiene una cuenta de Instagram Business conectada.\n` +
      "Conectá una cuenta Instagram Business a tu página de Facebook en el Centro de cuentas de Meta."
    );
  }

  // Perfil de la cuenta de Instagram
  const perfil = await fetchJson(
    `${GR_FB}/${igId}?fields=username,followers_count,follows_count,media_count&access_token=${pageToken}`
  );

  // Alcance (insights)
  let alcance: number | null = null;
  let alcanceRaw: unknown = null;
  try {
    alcanceRaw = await fetchJson(
      `${GR_FB}/${igId}/insights?metric=reach&period=day&access_token=${pageToken}`
    );
    alcance = (alcanceRaw as any)?.data?.[0]?.values?.slice(-1)?.[0]?.value ?? null;
  } catch { /* cuentas pequeñas sin insights */ }

  // Media reciente (likes y comentarios)
  let likes: number | null = null;
  let comentarios: number | null = null;
  let mediaRaw: unknown = null;
  try {
    mediaRaw = await fetchJson(
      `${GR_FB}/${igId}/media?fields=id,like_count,comments_count&limit=25&access_token=${pageToken}`
    );
    const items = (mediaRaw as any)?.data ?? [];
    likes       = items.reduce((s: number, m: any) => s + (m.like_count      ?? 0), 0);
    comentarios = items.reduce((s: number, m: any) => s + (m.comments_count  ?? 0), 0);
  } catch { /* sin media */ }

  return {
    fuente: "facebook-graph-api",
    seguidores:    perfil.followers_count ?? null,
    siguiendo:     perfil.follows_count   ?? null,
    publicaciones: perfil.media_count     ?? null,
    likes,
    comentarios,
    alcance,
    datos_originales: { perfil, alcance: alcanceRaw, media: mediaRaw },
  };
}

// --- Main ---
async function main() {
  console.log("\nObteniendo metricas...\n");

  const { access_token } = await obtenerToken();
  TOKEN = access_token;

  let metricas: unknown;

  try {
    metricas = await intentarInstagramLogin();
    console.log("(token: Instagram Login API)\n");
  } catch (errA) {
    console.log("(Instagram Login API no funcionó, probando Facebook Graph API...)\n");
    try {
      metricas = await intentarFacebookToken();
      console.log("(token: Facebook Graph API)\n");
    } catch (errB) {
      console.error("Error con Instagram Login API:", errA);
      console.error("Error con Facebook Graph API:", errB);
      process.exit(1);
    }
  }

  console.log(JSON.stringify(metricas, null, 2));
}

main().catch((err) => {
  console.error("\nError:", err);
  process.exit(1);
});
