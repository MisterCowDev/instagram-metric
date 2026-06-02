import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { cifrar, descifrar } from "@/lib/crypto";
import { refrescarTokenLargo } from "@/lib/instagram";

// ============================================================
// GET /api/cron/refrescar-tokens
// El token largo de Instagram dura 60 días. Este cron (semanal)
// renueva los que vencen dentro de los próximos 7 días, para que
// la conexión nunca se caiga sola.
// ============================================================

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const porVencer = await pool.query(
    `SELECT c.id, c.access_token_encriptado
       FROM mv_rrss_cuenta c
       JOIN tb_rrss r ON r.id = c.tb_rrss_id
      WHERE c.activo = 'S'
        AND r.descripcion = 'Instagram'
        AND c.access_token_encriptado IS NOT NULL
        AND c.token_expira_en IS NOT NULL
        AND c.token_expira_en < NOW() + INTERVAL '7 days'`
  );

  const resultados: Array<{ cuenta: number; ok: boolean }> = [];

  for (const cuenta of porVencer.rows) {
    try {
      const tokenActual = descifrar(cuenta.access_token_encriptado);
      const { access_token, expires_in } = await refrescarTokenLargo(
        tokenActual
      );
      const expiraEn = new Date(Date.now() + expires_in * 1000);

      await pool.query(
        `UPDATE mv_rrss_cuenta
            SET access_token_encriptado = $1,
                token_expira_en = $2,
                fecha_mod = NOW()
          WHERE id = $3`,
        [cifrar(access_token), expiraEn, cuenta.id]
      );
      resultados.push({ cuenta: cuenta.id, ok: true });
    } catch (e) {
      console.error(`No se pudo refrescar token de cuenta ${cuenta.id}:`, e);
      resultados.push({ cuenta: cuenta.id, ok: false });
    }
  }

  return NextResponse.json({ revisadas: resultados.length, resultados });
}
