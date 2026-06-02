import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { descifrar } from "@/lib/crypto";
import { getMetricasCuenta } from "@/lib/instagram";

// ============================================================
// GET /api/cron/capturar-metricas
// Lo dispara el Cron de Vercel (ver vercel.json).
// Recorre las cuentas de Instagram con metricas_habilitadas = 'S',
// consulta la API y guarda UN snapshot nuevo en mv_rrss_metrica.
//
// Seguridad: Vercel manda el header "Authorization: Bearer <CRON_SECRET>".
// Validamos ese secreto para que nadie más pueda gatillar el endpoint.
// ============================================================

export const maxDuration = 60; // segundos (ajusta según tu plan)

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const cuentas = await pool.query(
    `SELECT c.id, c.rrss_key, c.access_token_encriptado
       FROM mv_rrss_cuenta c
       JOIN tb_rrss r ON r.id = c.tb_rrss_id
      WHERE c.activo = 'S'
        AND c.metricas_habilitadas = 'S'
        AND r.descripcion = 'Instagram'
        AND c.access_token_encriptado IS NOT NULL`
  );

  const resultados: Array<{ cuenta: number; ok: boolean; error?: string }> = [];

  for (const cuenta of cuentas.rows) {
    try {
      const token = descifrar(cuenta.access_token_encriptado);
      const m = await getMetricasCuenta(cuenta.rrss_key, token);

      await pool.query(
        `INSERT INTO mv_rrss_metrica
           (mv_rrss_cuenta_id, seguidores, siguiendo, publicaciones,
            likes, comentarios, alcance, datos_originales, fecha_captura)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          cuenta.id,
          m.seguidores,
          m.siguiendo,
          m.publicaciones,
          m.likes,
          m.comentarios,
          m.alcance,
          JSON.stringify(m.datos_originales),
        ]
      );
      resultados.push({ cuenta: cuenta.id, ok: true });
    } catch (e) {
      console.error(`Cuenta ${cuenta.id} falló:`, e);
      resultados.push({
        cuenta: cuenta.id,
        ok: false,
        error: e instanceof Error ? e.message : "desconocido",
      });
    }
  }

  return NextResponse.json({ procesadas: resultados.length, resultados });
}
