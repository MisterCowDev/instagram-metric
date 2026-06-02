# Flujo de métricas de Instagram (sin Facebook)

Conecta una cuenta de Instagram con login directo (**Instagram API with Instagram Login**), guarda el token cifrado en tu tabla `mv_rrss_cuenta` y captura snapshots de métricas en `mv_rrss_metrica`.

## Requisito previo (una sola vez)

La cuenta de Instagram debe ser **Creator o Business** (no personal). Es gratis y se cambia en la app de Instagram: Configuración → Tipo de cuenta. Conservas el mismo usuario y contraseña.

## Archivos

```
lib/crypto.ts                              Cifrado/descifrado de tokens (AES-256-GCM)
lib/db.ts                                  Conexión a PostgreSQL
lib/instagram.ts                           Todas las llamadas a la API de Meta
app/api/instagram/connect/route.ts         Botón "Conectar Instagram" -> redirige al login
app/api/instagram/callback/route.ts        Recibe el code, guarda el token cifrado
app/api/cron/capturar-metricas/route.ts    Cron: guarda un snapshot de métricas
app/api/cron/refrescar-tokens/route.ts     Cron: renueva tokens antes de los 60 días
vercel.json                                Configuración de los crons
.env.example                               Variables de entorno
```

> Las rutas usan el alias `@/lib/...`. Si tu proyecto no lo tiene, configúralo en `tsconfig.json` (`"paths": { "@/*": ["./*"] }`) o cambia los imports a rutas relativas.

## Configuración paso a paso

1. **Crea la app en Meta.** En developers.facebook.com → crea una app → agrega el producto **Instagram** → "API with Instagram Login". Copia el *Instagram App ID* y el *App Secret*.
2. **Registra la URL de redirección** en la configuración de la app: debe ser exactamente `https://tu-dominio/api/instagram/callback`.
3. **Variables de entorno.** Copia `.env.example` a `.env.local` y complétalo. Genera las claves:
   - `openssl rand -hex 32` → `TOKEN_ENCRYPTION_KEY`
   - `openssl rand -hex 16` → `CRON_SECRET`
4. **Instala la dependencia de Postgres:** `npm install pg` (y `npm install -D @types/pg`).
5. **Sube las mismas variables a Vercel** (Project Settings → Environment Variables).

## Cómo funciona

1. El usuario entra a `/api/instagram/connect` → lo mandamos al login de Instagram.
2. Autoriza → Instagram redirige a `/api/instagram/callback?code=...`.
3. El callback cambia el `code` por un token corto, luego por uno largo (60 días), lee el perfil y guarda todo cifrado en `mv_rrss_cuenta` con `metricas_habilitadas = 'S'`.
4. El cron diario lee esa cuenta, consulta la API y hace `INSERT` en `mv_rrss_metrica` (un snapshot por día).
5. El cron semanal renueva los tokens que están por vencer.

## Notas

- Los nombres de métricas que Meta entrega cambian entre versiones. Por eso guardamos la respuesta cruda en la columna `datos_originales` (JSONB): si algo viene en `null`, revisa ese JSON y ajusta los campos en `getMetricasCuenta()`.
- Algunas métricas (como alcance) no están disponibles en cuentas con menos de 100 seguidores.
- Para conectar cuentas que **no** son tuyas necesitarás pasar el App Review de Meta. Para probar con tu propia cuenta, el modo desarrollo basta.
