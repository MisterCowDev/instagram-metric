// Inicializa la base de datos con la cuenta de Instagram.
// Lee token.json, cifra el token y lo inserta en mv_rrss_cuenta.
// Crea un usuario administrador si la tabla tb_usuario está vacía.
//
// Uso: npm run setup-db

import { config } from "dotenv";
import { resolve } from "path";
import { Pool } from "pg";
import { leerTokenGuardado } from "../lib/token-local";
import { cifrar } from "../lib/crypto";

config({ path: resolve(process.cwd(), ".env.local") });

const GR_IG = "https://graph.instagram.com/v22.0";

async function main() {
  // Validaciones previas
  const tokenData = leerTokenGuardado();
  if (!tokenData) {
    console.error("\nNo hay token.json. Ejecuta primero: npm run guardar-token\n");
    process.exit(1);
  }

  if (!process.env.TOKEN_ENCRYPTION_KEY || process.env.TOKEN_ENCRYPTION_KEY.length !== 64) {
    console.error("\nFalta TOKEN_ENCRYPTION_KEY (64 caracteres hex) en .env.local\n");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("TU_PASSWORD")) {
    console.error("\nConfigura DATABASE_URL con la contraseña real de PostgreSQL en .env.local\n");
    process.exit(1);
  }

  // Obtener perfil de Instagram para el nombre de usuario
  console.log("\nObteniendo perfil de Instagram...");
  const r = await fetch(
    `${GR_IG}/me?fields=username,followers_count&access_token=${tokenData.access_token}`
  );
  const perfil = await r.json() as { username?: string; error?: unknown };
  if (!r.ok || perfil.error) {
    console.error("Error al consultar Instagram:", perfil.error ?? perfil);
    process.exit(1);
  }
  const username = perfil.username ?? tokenData.user_id;
  console.log(`Cuenta: @${username}`);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
    max: 2,
  });

  try {
    // 1. Obtener o crear usuario administrador
    const usuarios = await pool.query<{ id: bigint }>(
      "SELECT id FROM tb_usuario LIMIT 1"
    );

    let userId: bigint;
    if (usuarios.rows.length === 0) {
      const rol = await pool.query<{ id: bigint }>(
        "SELECT id FROM tb_usuario_rol WHERE descripcion = 'Administrador' LIMIT 1"
      );
      if (!rol.rows[0]) throw new Error("No se encontró el rol Administrador en tb_usuario_rol.");

      const nuevo = await pool.query<{ id: bigint }>(
        `INSERT INTO tb_usuario (tb_usuario_rol_id, nombre_completo, correo)
         VALUES ($1, 'Administrador', 'admin@local.dev')
         RETURNING id`,
        [rol.rows[0].id]
      );
      userId = nuevo.rows[0].id;
      console.log(`Usuario creado: id=${userId} (admin@local.dev)`);
    } else {
      userId = usuarios.rows[0].id;
      console.log(`Usuario existente: id=${userId}`);
    }

    // 2. Obtener id de Instagram en tb_rrss
    const rrss = await pool.query<{ id: bigint }>(
      "SELECT id FROM tb_rrss WHERE descripcion = 'Instagram' LIMIT 1"
    );
    if (!rrss.rows[0]) throw new Error("No se encontró 'Instagram' en tb_rrss. ¿Corriste el schema SQL?");
    const rrssId = rrss.rows[0].id;

    // 3. Cifrar token
    const tokenCifrado = cifrar(tokenData.access_token);
    const expiraEn    = new Date(tokenData.expires_at);

    // 4. Insertar o actualizar mv_rrss_cuenta
    const existing = await pool.query<{ id: bigint }>(
      "SELECT id FROM mv_rrss_cuenta WHERE rrss_key = $1",
      [tokenData.user_id]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE mv_rrss_cuenta
            SET access_token_encriptado = $1,
                token_expira_en         = $2,
                metricas_habilitadas    = 'S',
                activo                  = 'S',
                fecha_mod               = NOW()
          WHERE rrss_key = $3`,
        [tokenCifrado, expiraEn, tokenData.user_id]
      );
      console.log(`\nCuenta actualizada en mv_rrss_cuenta (rrss_key=${tokenData.user_id})`);
    } else {
      await pool.query(
        `INSERT INTO mv_rrss_cuenta
           (tb_rrss_id, tb_usuario_responsable_id,
            nombre_cuenta, usuario_rrss, url_rrss, rrss_key,
            metricas_habilitadas, access_token_encriptado, token_expira_en)
         VALUES ($1, $2, $3, $4, $5, $6, 'S', $7, $8)`,
        [
          rrssId,
          userId,
          `Instagram @${username}`,
          username,
          `https://www.instagram.com/${username}/`,
          tokenData.user_id,
          tokenCifrado,
          expiraEn,
        ]
      );
      console.log(`\nCuenta insertada en mv_rrss_cuenta`);
    }

    console.log(`  rrss_key:            ${tokenData.user_id}`);
    console.log(`  usuario:             @${username}`);
    console.log(`  token expira:        ${expiraEn.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}`);
    console.log(`  metricas_habilitadas: S`);
    console.log("\nBase de datos lista. Ahora podes probar el cron:\n");
    console.log("  npm run probar-cron\n");

  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("\nError:", err);
  process.exit(1);
});
