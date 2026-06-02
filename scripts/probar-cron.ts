// Simula el cron de captura de métricas sin necesitar Vercel.
// Lee las cuentas de la DB, consulta la API y guarda snapshots en mv_rrss_metrica.
//
// Uso: npm run probar-cron

import { config } from "dotenv";
import { resolve } from "path";
import { Pool } from "pg";
import { descifrar } from "../lib/crypto";
import { getMetricasCuenta } from "../lib/instagram";

config({ path: resolve(process.cwd(), ".env.local") });

process.env.INSTAGRAM_APP_ID       ??= "";
process.env.INSTAGRAM_APP_SECRET   ??= "";
process.env.INSTAGRAM_REDIRECT_URI ??= "";

async function main() {
  console.log("\nEjecutando captura de metricas...\n");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
    max: 2,
  });

  try {
    const cuentas = await pool.query<{
      id: bigint;
      rrss_key: string;
      access_token_encriptado: string;
    }>(
      `SELECT c.id, c.rrss_key, c.access_token_encriptado
         FROM mv_rrss_cuenta c
         JOIN tb_rrss r ON r.id = c.tb_rrss_id
        WHERE c.activo = 'S'
          AND c.metricas_habilitadas = 'S'
          AND r.descripcion = 'Instagram'
          AND c.access_token_encriptado IS NOT NULL`
    );

    if (cuentas.rows.length === 0) {
      console.log("No hay cuentas con metricas habilitadas. Ejecuta: npm run setup-db\n");
      return;
    }

    console.log(`Cuentas a procesar: ${cuentas.rows.length}\n`);

    for (const cuenta of cuentas.rows) {
      console.log(`Procesando cuenta id=${cuenta.id} (rrss_key=${cuenta.rrss_key})...`);
      try {
        const token = descifrar(cuenta.access_token_encriptado);
        const m     = await getMetricasCuenta(cuenta.rrss_key, token);

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

        console.log(`  OK — seguidores=${m.seguidores}, likes=${m.likes}, alcance=${m.alcance}`);
      } catch (e) {
        console.error(`  ERROR:`, e instanceof Error ? e.message : e);
      }
    }

    // Mostrar últimos snapshots guardados
    const ultimos = await pool.query(
      `SELECT m.id, c.rrss_key, m.seguidores, m.siguiendo, m.publicaciones,
              m.likes, m.comentarios, m.alcance, m.fecha_captura
         FROM mv_rrss_metrica m
         JOIN mv_rrss_cuenta c ON c.id = m.mv_rrss_cuenta_id
        ORDER BY m.fecha_captura DESC
        LIMIT 5`
    );

    console.log("\n=== Ultimos snapshots en mv_rrss_metrica ===\n");
    console.log(JSON.stringify(ultimos.rows, null, 2));

  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("\nError:", err);
  process.exit(1);
});
