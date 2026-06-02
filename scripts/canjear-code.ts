import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const APP_ID       = process.env.INSTAGRAM_APP_ID       ?? "";
const APP_SECRET   = process.env.INSTAGRAM_APP_SECRET   ?? "";
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI ?? "";

const code = process.argv[2];

if (!code) {
  console.error("\nUso: npm run canjear-code -- <code_del_callback>\n");
  process.exit(1);
}

if (!APP_ID || !APP_SECRET || !REDIRECT_URI) {
  console.error(
    "\nFaltan variables en .env.local:\n" +
    "  INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, INSTAGRAM_REDIRECT_URI\n"
  );
  process.exit(1);
}

async function main() {
  console.log("\n1) Canjeando code por token de corta duracion...");

  const bodyCorto = new URLSearchParams({
    client_id:     APP_ID,
    client_secret: APP_SECRET,
    grant_type:    "authorization_code",
    redirect_uri:  REDIRECT_URI,
    code,
  });

  const r1 = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: bodyCorto,
  });

  if (!r1.ok) {
    const txt = await r1.text();
    console.error("   Error:", txt);
    process.exit(1);
  }

  const { access_token: tokenCorto, user_id } = await r1.json() as {
    access_token: string;
    user_id: number;
  };

  console.log(`   User ID: ${user_id}`);
  console.log("   Token corto obtenido (expira en ~1 hora)");

  console.log("\n2) Canjeando por token largo (60 dias)...");

  const params = new URLSearchParams({
    grant_type:    "ig_exchange_token",
    client_secret: APP_SECRET,
    access_token:  tokenCorto,
  });

  const r2 = await fetch(
    `https://graph.instagram.com/access_token?${params.toString()}`
  );

  if (!r2.ok) {
    const txt = await r2.text();
    console.error("   Error:", txt);
    process.exit(1);
  }

  const { access_token: tokenLargo, expires_in } = await r2.json() as {
    access_token: string;
    expires_in: number;
  };

  const diasExpira = Math.round(expires_in / 86400);

  console.log(`   Token largo obtenido (expira en ${diasExpira} dias)\n`);
  console.log("=== Agrega esto a tu .env.local ===\n");
  console.log(`IG_USER_ID=${user_id}`);
  console.log(`IG_ACCESS_TOKEN=${tokenLargo}`);
  console.log("\n====================================\n");
}

main().catch((err) => {
  console.error("\nError:", err);
  process.exit(1);
});
