// Guarda el token inicial en token.json.
// Ejecutar una sola vez (o cuando el token expiró y hay que renovar manualmente).
//
// Uso:
//   npm run guardar-token
//
// Requiere en .env.local:
//   ACCESS_TOKEN=EAAxxxxxx     <- token de Instagram Login (de npm run canjear-code)
//   IG_USER_ID=17841406991700156

import { config } from "dotenv";
import { resolve } from "path";
import { guardarToken } from "../lib/token-local";

config({ path: resolve(process.cwd(), ".env.local") });

const token  = process.env.ACCESS_TOKEN ?? "";
const userId = process.env.IG_USER_ID   ?? "";

if (!token || !userId) {
  console.error(
    "\nFaltan variables en .env.local:\n" +
    "  ACCESS_TOKEN=EAAxxxxxx\n" +
    "  IG_USER_ID=17841406991700156\n"
  );
  process.exit(1);
}

// Verificar que el token funciona antes de guardarlo
async function main() {
  console.log("\nVerificando token con la API de Instagram...");

  const r = await fetch(
    `https://graph.instagram.com/v22.0/me?fields=username,followers_count&access_token=${token}`
  );
  const data = await r.json() as { username?: string; error?: unknown };

  if (!r.ok || data.error) {
    console.error("\nEl token no es válido:", data.error ?? data);
    process.exit(1);
  }

  console.log(`Token válido. Cuenta: @${data.username}`);

  const expires_at = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

  guardarToken({ access_token: token, user_id: userId, expires_at });

  console.log(`\nGuardado en token.json`);
  console.log(`Expira: ${new Date(expires_at).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}`);
  console.log("\nDesde ahora los scripts renuevan el token solos cuando quedan 7 días.\n");
}

main().catch((err) => {
  console.error("\nError:", err);
  process.exit(1);
});
