import { Pool } from "pg";

// ============================================================
// Conexión a PostgreSQL.
// En Vercel, define DATABASE_URL en las Environment Variables.
// Se usa un pool global para no abrir conexiones nuevas en cada request
// (las serverless functions reusan el módulo entre invocaciones).
// ============================================================

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

export const pool =
  global._pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Muchos proveedores (Neon, Supabase, etc.) requieren SSL:
    ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  global._pgPool = pool;
}
