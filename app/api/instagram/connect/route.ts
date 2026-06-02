import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthUrl } from "@/lib/instagram";

// ============================================================
// GET /api/instagram/connect
// Este es el botón "Conectar Instagram".
// Genera un "state" anti-CSRF, lo guarda en una cookie, y redirige
// a la pantalla de autorización de Instagram.
// ============================================================

export async function GET() {
  const state = crypto.randomBytes(16).toString("hex");
  const url = getAuthUrl(state);

  const res = NextResponse.redirect(url);
  res.cookies.set("ig_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutos
    path: "/",
  });
  return res;
}
