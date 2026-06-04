import { NextRequest, NextResponse } from "next/server";
import { obtenerToken } from "@/lib/token-local";

const GR_IG = "https://graph.instagram.com/v22.0";

export async function GET(req: NextRequest) {
  const limit = Math.min(
    Number(new URL(req.url).searchParams.get("limit") ?? "9"),
    25
  );

  try {
    const { access_token, user_id } = await obtenerToken();

    const [perfilRes, mediaRes] = await Promise.all([
      fetch(
        `${GR_IG}/me?fields=username,followers_count,follows_count,media_count,account_type&access_token=${access_token}`
      ),
      fetch(
        `${GR_IG}/me/media?fields=id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,like_count,comments_count&limit=${limit}&access_token=${access_token}`
      ),
    ]);

    if (!perfilRes.ok || !mediaRes.ok) {
      const err = !perfilRes.ok ? await perfilRes.json() : await mediaRes.json();
      return NextResponse.json({ error: err }, { status: 502 });
    }

    const perfil = await perfilRes.json();
    const media  = await mediaRes.json();

    return NextResponse.json({ perfil: { ...perfil, user_id }, posts: media.data ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
