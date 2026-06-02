// Obtiene las últimas 3 publicaciones con imágenes y genera posts.html
import { config } from "dotenv";
import { resolve } from "path";
import { writeFileSync } from "fs";
import { exec } from "child_process";
import { obtenerToken } from "../lib/token-local";

config({ path: resolve(process.cwd(), ".env.local") });

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

async function main() {
  console.log("\nObteniendo ultimas 3 publicaciones...\n");

  const { access_token: TOKEN } = await obtenerToken();

  const r = await fetch(
    `${GR_IG}/me/media?fields=id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,like_count,comments_count&limit=3&access_token=${TOKEN}`
  );
  const data = await r.json() as { data?: Post[]; error?: unknown };

  if (!r.ok || data.error) {
    console.error("Error de la API:", data);
    process.exit(1);
  }

  const posts: Post[] = data.data ?? [];
  if (posts.length === 0) {
    console.log("No se encontraron publicaciones.");
    process.exit(0);
  }

  const html = generarHTML(posts);
  const outputPath = resolve(process.cwd(), "posts.html");
  writeFileSync(outputPath, html, "utf-8");
  console.log(`HTML generado: ${outputPath}`);

  exec(`start "" "${outputPath}"`);
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function generarHTML(posts: Post[]) {
  const cards = posts.map((p) => {
    const imgSrc = p.thumbnail_url ?? p.media_url ?? "";
    const caption = p.caption
      ? p.caption.slice(0, 120) + (p.caption.length > 120 ? "…" : "")
      : "<em>Sin descripción</em>";
    const badge = p.media_type === "VIDEO" ? "VIDEO"
                : p.media_type === "CAROUSEL_ALBUM" ? "CARRUSEL"
                : "";

    return `
    <a class="card" href="${p.permalink}" target="_blank" rel="noopener">
      <div class="img-wrap">
        ${imgSrc ? `<img src="${imgSrc}" alt="post" loading="lazy">` : '<div class="no-img">Sin imagen</div>'}
        ${badge ? `<span class="badge">${badge}</span>` : ""}
      </div>
      <div class="info">
        <p class="caption">${caption}</p>
        <div class="stats">
          <span>❤️ ${p.like_count}</span>
          <span>💬 ${p.comments_count}</span>
          <span class="fecha">${formatFecha(p.timestamp)}</span>
        </div>
      </div>
    </a>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Últimas publicaciones</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #fafafa;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 16px;
    }
    h1 {
      font-size: 1.1rem;
      font-weight: 600;
      color: #262626;
      margin-bottom: 32px;
      letter-spacing: .5px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      width: 100%;
      max-width: 960px;
    }
    .card {
      background: #fff;
      border: 1px solid #dbdbdb;
      border-radius: 8px;
      overflow: hidden;
      text-decoration: none;
      color: inherit;
      transition: box-shadow .2s;
    }
    .card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.12); }
    .img-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 1;
      background: #efefef;
      overflow: hidden;
    }
    .img-wrap img {
      width: 100%; height: 100%;
      object-fit: cover;
      display: block;
    }
    .no-img {
      width: 100%; height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #8e8e8e;
      font-size: .85rem;
    }
    .badge {
      position: absolute;
      top: 8px; right: 8px;
      background: rgba(0,0,0,.6);
      color: #fff;
      font-size: .7rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      letter-spacing: .5px;
    }
    .info { padding: 14px; }
    .caption {
      font-size: .85rem;
      color: #262626;
      line-height: 1.4;
      min-height: 2.8em;
    }
    .stats {
      display: flex;
      gap: 14px;
      align-items: center;
      margin-top: 12px;
      font-size: .82rem;
      color: #8e8e8e;
    }
    .fecha { margin-left: auto; }
  </style>
</head>
<body>
  <h1>Últimas publicaciones</h1>
  <div class="grid">
    ${cards}
  </div>
</body>
</html>`;
}

main().catch((err) => {
  console.error("\nError:", err);
  process.exit(1);
});
