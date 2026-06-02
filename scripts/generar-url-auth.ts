import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const APP_ID       = process.env.INSTAGRAM_APP_ID ?? "";
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI ?? "";

if (!APP_ID || !REDIRECT_URI) {
  console.error(
    "\nFaltan variables en .env.local:\n" +
    "  INSTAGRAM_APP_ID=...\n" +
    "  INSTAGRAM_REDIRECT_URI=...\n"
  );
  process.exit(1);
}

const SCOPES = ["instagram_business_basic", "instagram_business_manage_insights"];

const params = new URLSearchParams({
  client_id:     APP_ID,
  redirect_uri:  REDIRECT_URI,
  response_type: "code",
  scope:         SCOPES.join(","),
  state:         "test",
});

const url = `https://www.instagram.com/oauth/authorize?${params.toString()}`;

console.log("\n=== Abre esta URL en el navegador ===\n");
console.log(url);
console.log(
  "\nDespues de autorizar, Instagram te redirige a tu redirect_uri con ?code=XXXX&state=test" +
  "\nCopia ese valor de 'code' y ejecuta:\n" +
  "  npm run canjear-code -- <el_code>\n"
);
