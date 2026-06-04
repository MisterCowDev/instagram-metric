# Métricas de Instagram — Guía completa desde cero

Este proyecto captura seguidores, likes, comentarios y alcance de una cuenta de Instagram Creator o Business, guarda los datos en PostgreSQL y renueva el token automáticamente.

---

## Antes de empezar — ¿qué necesitás tener?

Antes de seguir cualquier paso, asegurate de tener estos datos a mano. Los vas a necesitar durante la configuración.

### Credenciales de Instagram / Meta

| Dato | Dónde lo obtenés | Variable en `.env.local` |
|---|---|---|
| Token de 60 días | [developers.facebook.com](https://developers.facebook.com) → tu app → Herramientas de la API | `ACCESS_TOKEN` |
| ID numérico de la cuenta | Al final del token en el panel, o consultando la API (se explica abajo) | `IG_USER_ID` |
| App ID de Instagram | Panel de tu app en Meta → Instagram → Configuración | `INSTAGRAM_APP_ID` |
| App Secret | Panel de tu app en Meta → Instagram → Configuración → Mostrar | `INSTAGRAM_APP_SECRET` |

> **¿Tenés el token pero no sabés el IG_USER_ID?**
> Abrí este enlace en el navegador reemplazando `TU_TOKEN`:
> ```
> https://graph.instagram.com/v22.0/me?fields=user_id,username&access_token=TU_TOKEN
> ```
> La respuesta te muestra el `user_id` (número) y el `username` (@nombre).

> **¿No tenés el token todavía?**
> Seguí el [Anexo A — Obtener el token desde cero](#anexo-a--obtener-el-token-desde-cero) antes de continuar.

---

### Tipo de cuenta de Instagram

La cuenta debe ser **Creator** o **Business** (no personal). Para verificarlo o cambiarlo:
- Abrí la app de Instagram en tu celular
- Configuración → Cuenta → Cambiar a cuenta profesional → Creador
- Es gratis y reversible. Conservás el mismo usuario y contraseña.

---

## Paso 1 — Instalar Node.js

Verificá si ya lo tenés:
```bash
node -v
```

Si el comando no existe o la versión es menor a 20, descargalo desde [nodejs.org](https://nodejs.org) (descargá la versión LTS). Después de instalar, cerrá y volvé a abrir la terminal.

---

## Paso 2 — Instalar PostgreSQL

Verificá si ya lo tenés:
```bash
psql --version
```

**Windows:** si el comando no existe, buscá el servicio de PostgreSQL:
```powershell
Get-Service -Name postgresql* | Select-Object Name, Status
```

Si no aparece ningún servicio, descargá el instalador desde [postgresql.org/download](https://www.postgresql.org/download). Durante la instalación anotá la contraseña que le ponés al usuario `postgres` — la vas a necesitar después.

---

## Paso 3 — Instalar las dependencias del proyecto

Abrí una terminal en la carpeta del proyecto y ejecutá:

```bash
npm install
```

Esto instala Next.js, el driver de PostgreSQL, TypeScript y todas las librerías necesarias.

---

## Paso 4 — Crear la base de datos

### 4.1 Crear la base de datos vacía

**Mac / Linux:**
```bash
psql -U postgres -c "CREATE DATABASE primero_chile;"
```

**Windows (PowerShell):**
```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE primero_chile;"
```

Ingresá la contraseña del usuario `postgres` cuando te la pida.

### 4.2 Cargar el schema (tablas, índices y datos iniciales)

**Mac / Linux:**
```bash
psql -U postgres -d primero_chile -f PrimeroChile_MVP_v4.sql
```

**Windows (PowerShell):**
```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d primero_chile -f "PrimeroChile_MVP_v4.sql"
```

Si todo salió bien, el comando termina sin errores rojos y dice `COMMIT` al final.

---

## Paso 5 — Configurar las variables de entorno

### 5.1 Crear el archivo de configuración

```bash
copy .env.example .env.local    # Windows
cp .env.example .env.local      # Mac / Linux
```

### 5.2 Completar `.env.local`

Abrí `.env.local` y completá los valores con tus datos reales:

```env
# ── Token de Instagram (lo tenés de las credenciales) ─────────────────
ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx
IG_USER_ID=17841406991700156

# ── Base de datos ─────────────────────────────────────────────────────
# Reemplazá TU_PASSWORD con la contraseña del usuario postgres
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/primero_chile
PGSSL=false

# ── Clave de cifrado del token ────────────────────────────────────────
# Generá una clave única con este comando y pegá el resultado:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
TOKEN_ENCRYPTION_KEY=pega_aqui_la_clave_generada

# ── App de Meta (para conectar cuentas nuevas via OAuth) ──────────────
INSTAGRAM_APP_ID=tu_instagram_app_id
INSTAGRAM_APP_SECRET=tu_instagram_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/instagram/callback

# ── Secreto para los crons de Vercel (producción) ─────────────────────
# node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
CRON_SECRET=pega_aqui_el_secreto_generado
```

### 5.3 Generar la clave de cifrado

Ejecutá este comando en la terminal y copiá el resultado en `TOKEN_ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ejemplo de resultado: `a3f8c2d1e4b7...` (64 caracteres hexadecimales). **Guardala en un lugar seguro** — si la perdés, los tokens cifrados en la DB quedan ilegibles.

---

## Paso 6 — Guardar el token

```bash
npm run guardar-token
```

Este script verifica que el token sea válido contra la API de Instagram y crea el archivo `token.json` con el token y su fecha de expiración.

Salida esperada:
```
Verificando token con la API de Instagram...
Token válido. Cuenta: @tu_usuario

Guardado en token.json
Expira: 01 de agosto de 2026

Desde ahora los scripts renuevan el token solos cuando quedan 7 días.
```

Si ves un error de token inválido, revisá que copiaste bien el `ACCESS_TOKEN` en `.env.local`. No debe tener espacios ni saltos de línea.

---

## Paso 7 — Registrar la cuenta en la base de datos

```bash
npm run setup-db
```

Este script:
- Se conecta a PostgreSQL con la `DATABASE_URL` de tu `.env.local`
- Consulta el perfil de tu cuenta en la API de Instagram
- Crea un usuario administrador en la tabla `tb_usuario` (si no existe ninguno)
- Cifra el token con tu `TOKEN_ENCRYPTION_KEY` usando AES-256-GCM
- Inserta la cuenta en `mv_rrss_cuenta` con `metricas_habilitadas = 'S'`

Salida esperada:
```
Obteniendo perfil de Instagram...
Cuenta: @tu_usuario
Usuario creado: id=1 (admin@local.dev)

Cuenta insertada en mv_rrss_cuenta
  rrss_key:             17841406991700156
  usuario:              @tu_usuario
  token expira:         01 de agosto de 2026
  metricas_habilitadas: S

Base de datos lista. Ahora podes probar el cron:
  npm run probar-cron
```

---

## Paso 8 — Verificar que todo funciona

### Ver las métricas en JSON

```bash
npm run ver-metricas
```

Salida esperada:
```json
{
  "fuente": "instagram-login-api",
  "seguidores": 60,
  "siguiendo": 481,
  "publicaciones": 23,
  "likes": 347,
  "comentarios": 35,
  "alcance": 1,
  "datos_originales": { ... }
}
```

### Simular el cron de captura (con base de datos)

```bash
npm run probar-cron
```

Lee la cuenta de la DB, consulta la API y guarda un snapshot en `mv_rrss_metrica`. Muestra al final los registros guardados.

### Ver la página web

```bash
npm run dev
```

Abrí `http://localhost:3000`. Verás el perfil de la cuenta y las últimas 9 publicaciones con imágenes, likes, comentarios y fecha.

### Ver las últimas publicaciones como HTML

```bash
npm run ver-posts
```

Genera `posts.html` y lo abre automáticamente en el navegador con las últimas 3 publicaciones.

---

## Renovación automática del token

El token de Instagram dura **60 días**. El sistema lo renueva solo — no necesitás hacer nada.

### ¿Cómo funciona?

Cada vez que corrés cualquier script o recargás la página, el sistema revisa `token.json` y decide:

```
Días restantes > 7   →  Usa el token sin cambios. Muestra: "Token válido (expira en X días)"
Días restantes ≤ 7   →  Renueva el token automáticamente con la API de Instagram,
                         sobreescribe token.json y continúa normalmente.
                         Muestra: "Token renovado y guardado en token.json"
Días restantes = 0   →  El token expiró. Necesitás obtener uno nuevo manualmente.
```

### ¿Necesitás el App ID y App Secret para renovar?

**No.** La renovación solo usa el token actual. El endpoint que usa es:
```
GET https://graph.instagram.com/refresh_access_token
    ?grant_type=ig_refresh_token
    &access_token=TOKEN_ACTUAL
```

### ¿Cuándo sí necesitás el App ID y App Secret?

Solo en dos casos:

| Situación | Necesitás App ID + Secret |
|---|---|
| Usar el sistema día a día | No |
| Renovar automáticamente (quedan ≤7 días) | No |
| Conectar una cuenta nueva desde cero | Sí |
| Token expiró sin renovar (más de 60 días sin usar) | Sí |

### ¿Qué pasa si el token expira sin renovarse?

Si no usaste el sistema por más de 60 días, el token expira. Para recuperarlo seguís el [Anexo A](#anexo-a--obtener-el-token-desde-cero) y después volvés al [Paso 6](#paso-6--guardar-el-token).

---

## Agregar una segunda cuenta de Instagram

El sistema soporta múltiples cuentas. Cada una tiene su propia fila en `mv_rrss_cuenta` y el cron captura métricas de todas.

### Paso a paso

1. Obtené el token de la cuenta nueva (ver [Anexo A](#anexo-a--obtener-el-token-desde-cero))

2. Actualizá `.env.local` con los datos de la cuenta nueva:
   ```env
   ACCESS_TOKEN=EAAyyyyyyyyy    ← token de la cuenta nueva
   IG_USER_ID=99887766554433   ← user_id de la cuenta nueva
   ```

3. Guardá el token nuevo:
   ```bash
   npm run guardar-token
   ```

4. Registrala en la DB (inserta una fila nueva sin tocar la cuenta anterior):
   ```bash
   npm run setup-db
   ```

5. Verificá que el cron procesa ambas cuentas:
   ```bash
   npm run probar-cron
   ```
   Debe mostrar una línea `Procesando cuenta id=...` por cada cuenta registrada.

> Para volver a usar el sistema con la cuenta original, restaurá en `.env.local` los valores del `ACCESS_TOKEN` e `IG_USER_ID` anteriores y volvé a ejecutar `npm run guardar-token`.

---

## Scripts disponibles

| Comando | Qué hace | Necesita DB | Necesita App ID/Secret |
|---|---|---|---|
| `npm run dev` | Página web en `http://localhost:3000` | No | No |
| `npm run ver-metricas` | Métricas actuales como JSON en la terminal | No | No |
| `npm run ver-posts` | HTML con las últimas 3 publicaciones | No | No |
| `npm run guardar-token` | Valida el token y lo guarda en `token.json` | No | No |
| `npm run setup-db` | Registra la cuenta en la base de datos | Sí | No |
| `npm run probar-cron` | Simula el cron diario de captura de métricas | Sí | No |
| `npm run generar-url-auth` | Genera la URL del login OAuth de Instagram | No | Sí |
| `npm run canjear-code -- <code>` | Intercambia el code OAuth por un token de 60 días | No | Sí |

---

## Despliegue en Vercel

### Variables de entorno en Vercel

En **Project Settings → Environment Variables** cargá estas variables. Son las mismas que en `.env.local` con dos diferencias:

```env
DATABASE_URL=postgresql://usuario:password@host:5432/basedatos
PGSSL=true
TOKEN_ENCRYPTION_KEY=la_misma_clave_que_generaste_en_local
CRON_SECRET=el_mismo_secreto_que_generaste_en_local
INSTAGRAM_APP_ID=tu_app_id
INSTAGRAM_APP_SECRET=tu_app_secret
INSTAGRAM_REDIRECT_URI=https://tu-app.vercel.app/api/instagram/callback
```

> `ACCESS_TOKEN` e `IG_USER_ID` **no van en Vercel**. En producción los tokens viven en la DB, cifrados. El cron de Vercel los lee y descifra directamente de `mv_rrss_cuenta`.

### URL de redirección en Meta

Registrá la URL de producción en Meta for Developers (además de la de localhost):
```
https://tu-app.vercel.app/api/instagram/callback
```

### Crons automáticos

`vercel.json` ya configura los crons. Se activan solos al deployar:

| Cron | Horario (UTC) | Qué hace |
|---|---|---|
| `/api/cron/capturar-metricas` | Todos los días a las 6:00 | Guarda snapshot de métricas por cada cuenta activa |
| `/api/cron/refrescar-tokens` | Cada domingo a las 3:00 | Renueva tokens que vencen en menos de 10 días |

---

## Solución de problemas

### "Invalid OAuth access token - Cannot parse access token"
El `ACCESS_TOKEN` en `.env.local` es inválido o expiró. Verificá que lo copiaste completo sin espacios. Si expiró, seguí el [Anexo A](#anexo-a--obtener-el-token-desde-cero).

### "No hay token.json ni ACCESS_TOKEN en .env.local"
Completá `ACCESS_TOKEN` e `IG_USER_ID` en `.env.local` y ejecutá `npm run guardar-token`.

### "Configura DATABASE_URL con la contraseña real"
El campo `DATABASE_URL` todavía tiene `TU_PASSWORD` como texto literal. Reemplazalo con tu contraseña real de PostgreSQL.

### "No se encontró 'Instagram' en tb_rrss"
El schema SQL no se cargó correctamente. Repetí el [Paso 4.2](#42-cargar-el-schema-tablas-índices-y-datos-iniciales).

### El `code` del OAuth expiró o no funciona
El `code` es de un solo uso y expira en pocos minutos. Generá una URL nueva con `npm run generar-url-auth` y repetí el proceso.

### `alcance` siempre viene `null`
La cuenta tiene menos de 100 seguidores. La API de Meta no entrega datos de alcance por debajo de ese umbral. No es un error del sistema.

---

## Notas importantes

- **`token.json` y `.env.local`** están en `.gitignore`. Nunca se suben al repositorio.
- **Los tokens nunca se guardan en texto plano en la DB.** Se cifran con AES-256-GCM antes del INSERT y se descifran solo al momento de usarlos.
- **`datos_originales`** (columna JSONB en `mv_rrss_metrica`) guarda la respuesta cruda de la API. Si una métrica aparece en `null`, revisá ese campo para ver el nombre exacto que usa Meta y ajustá `getMetricasCuenta()` en `lib/instagram.ts`.
- **Modo desarrollo de Meta:** en modo desarrollo solo podés conectar cuentas que sean Administradores, Desarrolladores o Testers de tu app. Para conectar cuentas de terceros necesitás pasar el App Review de Meta.

---

## Anexo A — Obtener el token desde cero

Seguí este anexo si no tenés un token de 60 días o si el tuyo expiró.

**Requisito:** tener `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` e `INSTAGRAM_REDIRECT_URI` en `.env.local`.

### A.1 — Crear la app en Meta for Developers (si no la tenés)

1. Entrá a [developers.facebook.com](https://developers.facebook.com) e iniciá sesión.
2. **Mis apps → Crear app** → tipo **Business** (o "Ninguno").
3. Ponele un nombre (ej: `metricas-instagram`) y creá la app.
4. En el panel de la app → producto **Instagram** → **Configurar** bajo "API with Instagram Login".
5. En el menú: **Instagram → Configuración de la API con inicio de sesión de Instagram**.
6. Anotá:
   - **ID de la aplicación de Instagram** → `INSTAGRAM_APP_ID`
   - **Secreto de la aplicación** → `INSTAGRAM_APP_SECRET`

### A.2 — Registrar la URL de redirección

En la misma sección buscá **URI de redireccionamiento de OAuth válidos** y agregá:
```
http://localhost:3000/api/instagram/callback
```
Guardá los cambios.

### A.3 — Generar la URL de autorización

```bash
npm run generar-url-auth
```

Copiá la URL que imprime y abrila en el navegador.

### A.4 — Autorizar la app

Iniciá sesión con tu cuenta de Instagram Creator/Business y hacé clic en **Autorizar**.

Instagram te redirige a una URL así:
```
http://localhost:3000/api/instagram/callback?code=AQBxxxxx...yyyyy#_
```

Copiá el valor del `code` (todo entre `code=` y `#_`, sin incluir el `#_`).

> Si la página da error de conexión, es normal (el servidor no está corriendo). El `code` igual está en la barra de direcciones del navegador.

### A.5 — Canjear el code por un token de 60 días

```bash
npm run canjear-code -- AQBxxxxx...el_code_copiado
```

Salida esperada:
```
1) Canjeando code por token de corta duracion...
   User ID: 17841406991700156
   Token corto obtenido (expira en ~1 hora)

2) Canjeando por token largo (60 dias)...
   Token largo obtenido (expira en 60 dias)

=== Agrega esto a tu .env.local ===

IG_USER_ID=17841406991700156
IG_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx

====================================
```

Copiá `IG_USER_ID` e `IG_ACCESS_TOKEN` a `.env.local` como `IG_USER_ID` y `ACCESS_TOKEN` respectivamente. Luego volvé al [Paso 6](#paso-6--guardar-el-token).
