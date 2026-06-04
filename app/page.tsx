import { obtenerToken } from "@/lib/token-local";

const GR_IG = "https://graph.instagram.com/v22.0";

interface Post {
  id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  caption?: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
}

interface Perfil {
  username: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
}

async function getDatos(): Promise<{ perfil: Perfil; posts: Post[] } | { error: string }> {
  try {
    const { access_token } = await obtenerToken();

    const [perfilRes, mediaRes] = await Promise.all([
      fetch(
        `${GR_IG}/me?fields=username,followers_count,follows_count,media_count&access_token=${access_token}`,
        { cache: "no-store" }
      ),
      fetch(
        `${GR_IG}/me/media?fields=id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,like_count,comments_count&limit=9&access_token=${access_token}`,
        { cache: "no-store" }
      ),
    ]);

    const perfil: Perfil = await perfilRes.json();
    const media = await mediaRes.json();

    return { perfil, posts: media.data ?? [] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

function formatNum(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default async function Page() {
  const datos = await getDatos();

  if ("error" in datos) {
    return (
      <main style={s.main}>
        <div style={s.errorBox}>
          <p style={{ margin: 0, fontWeight: 600 }}>No se pudo cargar la información</p>
          <p style={{ margin: "8px 0 0", color: "#636366", fontSize: "0.85rem" }}>{datos.error}</p>
          <p style={{ margin: "12px 0 0", fontSize: "0.8rem", color: "#8e8e8e" }}>
            Asegurate de haber ejecutado <code>npm run guardar-token</code> y que <code>token.json</code> existe.
          </p>
        </div>
      </main>
    );
  }

  const { perfil, posts } = datos;

  return (
    <main style={s.main}>
      {/* Header / Perfil */}
      <section style={s.header}>
        <div style={s.avatar}>
          {perfil.username.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 style={s.username}>@{perfil.username}</h1>
          <div style={s.stats}>
            <span><strong>{formatNum(perfil.followers_count)}</strong> seguidores</span>
            <span><strong>{formatNum(perfil.follows_count)}</strong> siguiendo</span>
            <span><strong>{perfil.media_count}</strong> publicaciones</span>
          </div>
        </div>
      </section>

      {/* Grid de posts */}
      <section style={s.grid}>
        {posts.map((post) => {
          const img = post.thumbnail_url ?? post.media_url ?? "";
          const caption = post.caption
            ? post.caption.slice(0, 100) + (post.caption.length > 100 ? "…" : "")
            : "";
          const badge =
            post.media_type === "VIDEO" ? "VIDEO" :
            post.media_type === "CAROUSEL_ALBUM" ? "CARRUSEL" : null;

          return (
            <a key={post.id} href={post.permalink} target="_blank" rel="noopener" style={s.card}>
              {/* Imagen */}
              <div style={s.imgWrap}>
                {img
                  ? <img src={img} alt={caption || "post"} style={s.img} />
                  : <div style={s.noImg}>Sin imagen</div>
                }
                {badge && <span style={s.badge}>{badge}</span>}
              </div>

              {/* Info */}
              <div style={s.cardBody}>
                {caption && <p style={s.caption}>{caption}</p>}
                <div style={s.cardStats}>
                  <span>❤️ {post.like_count}</span>
                  <span>💬 {post.comments_count}</span>
                  <span style={{ marginLeft: "auto", color: "#8e8e8e" }}>
                    {formatFecha(post.timestamp)}
                  </span>
                </div>
              </div>
            </a>
          );
        })}
      </section>

      <p style={s.footer}>
        Datos en tiempo real · <a href="/api/instagram/posts" target="_blank" style={{ color: "#0095f6" }}>Ver JSON</a>
      </p>
    </main>
  );
}

// Estilos
const s = {
  main: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "32px 16px 64px",
  } as React.CSSProperties,

  errorBox: {
    background: "#fff",
    border: "1px solid #dbdbdb",
    borderRadius: 8,
    padding: 24,
    maxWidth: 480,
    margin: "80px auto",
  } as React.CSSProperties,

  header: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    marginBottom: 32,
    background: "#fff",
    border: "1px solid #dbdbdb",
    borderRadius: 10,
    padding: "20px 24px",
  } as React.CSSProperties,

  avatar: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "1.2rem",
    flexShrink: 0,
  } as React.CSSProperties,

  username: {
    margin: 0,
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#262626",
  } as React.CSSProperties,

  stats: {
    display: "flex",
    gap: 16,
    marginTop: 6,
    fontSize: "0.85rem",
    color: "#262626",
    flexWrap: "wrap",
  } as React.CSSProperties,

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
  } as React.CSSProperties,

  card: {
    background: "#fff",
    border: "1px solid #dbdbdb",
    borderRadius: 8,
    overflow: "hidden",
    textDecoration: "none",
    color: "inherit",
    display: "block",
    transition: "box-shadow .2s",
  } as React.CSSProperties,

  imgWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: "1",
    background: "#efefef",
    overflow: "hidden",
  } as React.CSSProperties,

  img: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  } as React.CSSProperties,

  noImg: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#8e8e8e",
    fontSize: "0.85rem",
  } as React.CSSProperties,

  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    background: "rgba(0,0,0,.6)",
    color: "#fff",
    fontSize: "0.7rem",
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 4,
    letterSpacing: ".5px",
  } as React.CSSProperties,

  cardBody: {
    padding: 14,
  } as React.CSSProperties,

  caption: {
    margin: "0 0 10px",
    fontSize: "0.82rem",
    color: "#262626",
    lineHeight: 1.4,
  } as React.CSSProperties,

  cardStats: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    fontSize: "0.82rem",
    color: "#8e8e8e",
  } as React.CSSProperties,

  footer: {
    textAlign: "center",
    marginTop: 40,
    fontSize: "0.8rem",
    color: "#8e8e8e",
  } as React.CSSProperties,
};
