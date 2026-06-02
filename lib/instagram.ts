// ============================================================
// Instagram API with Instagram Login  (SIN Facebook)
// Toda la comunicación con Meta vive aquí.
// Host de datos: graph.instagram.com (no graph.facebook.com).
//
// OJO: Meta versiona los nombres de métricas. Si una métrica deja de
// existir, revisa la respuesta cruda que igual guardamos en
// datos_originales y ajusta los nombres en getMetricasCuenta().
// ============================================================

const GRAPH = "https://graph.instagram.com/v22.0";
const APP_ID = process.env.INSTAGRAM_APP_ID!;
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET!;
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI!;

// Permisos mínimos para leer perfil + métricas.
// (Estos son los scopes nuevos vigentes desde 2025.)
const SCOPES = ["instagram_business_basic", "instagram_business_manage_insights"];

// 1) URL a la que mandamos al usuario para que autorice.
export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(","),
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

// 2) Cambiar el "code" del callback por un token de corta duración (~1 hora).
export async function intercambiarCodePorToken(code: string): Promise<{
  access_token: string;
  user_id: string;
}> {
  const body = new URLSearchParams({
    client_id: APP_ID,
    client_secret: APP_SECRET,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI,
    code,
  });
  const r = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error(`Error intercambiando code: ${await r.text()}`);
  const data = await r.json();
  return { access_token: data.access_token, user_id: String(data.user_id) };
}

// 3) Cambiar el token corto por uno largo (~60 días).
export async function obtenerTokenLargo(tokenCorto: string): Promise<{
  access_token: string;
  expires_in: number; // segundos
}> {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: APP_SECRET,
    access_token: tokenCorto,
  });
  const r = await fetch(
    `https://graph.instagram.com/access_token?${params.toString()}`
  );
  if (!r.ok) throw new Error(`Error obteniendo token largo: ${await r.text()}`);
  return r.json();
}

// 4) Renovar un token largo antes de que expire (lo usa el cron de refresco).
export async function refrescarTokenLargo(tokenLargo: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const params = new URLSearchParams({
    grant_type: "ig_refresh_token",
    access_token: tokenLargo,
  });
  const r = await fetch(
    `https://graph.instagram.com/refresh_access_token?${params.toString()}`
  );
  if (!r.ok) throw new Error(`Error refrescando token: ${await r.text()}`);
  return r.json();
}

// 5) Datos básicos del perfil (incluye el id de cuenta que necesitamos guardar).
export async function getInfoCuenta(token: string): Promise<{
  user_id: string;
  username: string;
  account_type: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
}> {
  const params = new URLSearchParams({
    fields: "user_id,username,account_type,followers_count,follows_count,media_count",
    access_token: token,
  });
  const r = await fetch(`${GRAPH}/me?${params.toString()}`);
  if (!r.ok) throw new Error(`Error leyendo perfil: ${await r.text()}`);
  return r.json();
}

// 6) Snapshot de métricas: perfil + alcance + suma de likes/comentarios recientes.
export type SnapshotMetricas = {
  seguidores: number | null;
  siguiendo: number | null;
  publicaciones: number | null;
  likes: number | null;
  comentarios: number | null;
  alcance: number | null;
  datos_originales: unknown; // respuesta cruda, va a la columna JSONB
};

export async function getMetricasCuenta(
  igUserId: string,
  token: string
): Promise<SnapshotMetricas> {
  const perfil = await getInfoCuenta(token);

  // Alcance a nivel de cuenta (últimos datos disponibles).
  let alcance: number | null = null;
  let alcanceRaw: unknown = null;
  try {
    const params = new URLSearchParams({
      metric: "reach",
      period: "day",
      metric_type: "total_value",
      access_token: token,
    });
    const r = await fetch(`${GRAPH}/${igUserId}/insights?${params.toString()}`);
    if (r.ok) {
      alcanceRaw = await r.json();
      const valor = (alcanceRaw as any)?.data?.[0]?.total_value?.value;
      if (typeof valor === "number") alcance = valor;
    }
  } catch {
    // Cuentas con <100 seguidores pueden no tener insights: lo dejamos en null.
  }

  // Likes y comentarios: se suman desde las publicaciones recientes.
  let likes: number | null = null;
  let comentarios: number | null = null;
  let mediaRaw: unknown = null;
  try {
    const params = new URLSearchParams({
      fields: "id,like_count,comments_count",
      limit: "25",
      access_token: token,
    });
    const r = await fetch(`${GRAPH}/me/media?${params.toString()}`);
    if (r.ok) {
      mediaRaw = await r.json();
      const items = (mediaRaw as any)?.data ?? [];
      likes = items.reduce((s: number, m: any) => s + (m.like_count ?? 0), 0);
      comentarios = items.reduce(
        (s: number, m: any) => s + (m.comments_count ?? 0),
        0
      );
    }
  } catch {
    // sin datos de media -> null
  }

  return {
    seguidores: perfil.followers_count ?? null,
    siguiendo: perfil.follows_count ?? null,
    publicaciones: perfil.media_count ?? null,
    likes,
    comentarios,
    alcance,
    datos_originales: { perfil, alcance: alcanceRaw, media: mediaRaw },
  };
}
