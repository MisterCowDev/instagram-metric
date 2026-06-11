# Flujo de métricas de Instagram

Captura seguidores, likes, comentarios y alcance de una cuenta de Instagram Creator o Business, guarda los datos cifrados en PostgreSQL y los renueva automáticamente. No requiere cuenta de Facebook.

---

## Requisitos previos

| Herramienta | Versión mínima | Verificar |
|---|---|---|
| Node.js | 20 | `node -v` |
| PostgreSQL | 14 | `psql --version` |

La cuenta de Instagram debe ser **Creator o Business** (no personal). Se cambia gratis desde la app: Configuración → Cuenta → Cambiar a cuenta profesional. Conservás usuario y contraseña.

---

## Estructura de archivos

```
lib/
  crypto.ts                           Cifrado AES-256-GCM de tokens
  db.ts                               Pool de conexión a PostgreSQL
  instagram.ts                        Todas las llamadas a la API de Meta
  token-local.ts                      Gestión de token local con auto-renovación

app/api/
  instagram/connect/route.ts          (Producción) Inicia el flujo OAuth
  instagram/callback/route.ts         (Producción) Recibe el token y lo guarda en DB
  cron/capturar-metricas/route.ts     (Producción) Cron diario de snapshots
  cron/refrescar-tokens/route.ts      (Producción) Cron semanal de renovación

scripts/
  guardar-token.ts                    Guarda el token inicial en token.json
  setup-db.ts                         Inserta la cuenta en la base de datos
  probar-cron.ts                      Simula el cron localmente
  ver-metricas.ts                     Muestra las métricas actuales como JSON
  ver-posts.ts                        Genera posts.html con las últimas 3 publicaciones
  generar-url-auth.ts                 Genera la URL de autorización de Instagram
  canjear-code.ts                     Canjea el code OAuth por un token largo

vercel.json                           Configuración de crons para Vercel
PrimeroChile_MVP_v4.sql               Schema de la base de datos
.env.example                          Plantilla de variables de entorno
```

---

## Paso 1 — Crear la app en Meta for Developers

1. Entrá a [developers.facebook.com](https://developers.facebook.com) e iniciá sesión.
2. Hacé clic en **Mis apps → Crear app**.
3. Elegí tipo **Business** (o "Ninguno" si no tenés cuenta de Business Manager).
4. Poné un nombre (ej: `metricas-instagram`) y creá la app.
5. En el panel de la app, buscá el producto **Instagram** y hacé clic en **Configurar** bajo "API with Instagram Login".
6. En el menú izquierdo: **Instagram → Configuración de la API con inicio de sesión de Instagram**.
7. Anotá los valores que vas a necesitar:
   - **ID de la aplicación de Instagram** → `INSTAGRAM_APP_ID`
   - **Secreto de la aplicación de Instagram** → `INSTAGRAM_APP_SECRET`

---

## Paso 2 — Registrar la URL de redirección

En la misma sección de configuración, buscá **URI de redireccionamiento de OAuth válidos** y agregá:

```
http://localhost:3000/api/instagram/callback
```

> Para producción agregás también: `https://tu-dominio.vercel.app/api/instagram/callback`

Guardá los cambios.

---

## Paso 3 — Instalar el proyecto

```bash
npm install
```

---

## Paso 4 — Crear la base de datos

### 4.1 Crear la base de datos en PostgreSQL

```bash
psql -U postgres -c "CREATE DATABASE primero_chile;"
```

> En Windows con PostgreSQL instalado:
> ```powershell
> & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE primero_chile;"
> ```

### 4.2 Ejecutar el schema

```bash
psql -U postgres -d primero_chile -f PrimeroChile_MVP_v4.sql
```

> En Windows:
> ```powershell
> & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d primero_chile -f "PrimeroChile_MVP_v4.sql"
> ```

---

## Paso 5 — Configurar variables de entorno

Copiá el archivo de ejemplo:

```bash
copy .env.example .env.local   # Windows
cp .env.example .env.local     # Mac/Linux
```

Editá `.env.local` con tus datos reales:

```env
# Base de datos
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/primero_chile
PGSSL=false

# App de Meta (del Paso 1)
INSTAGRAM_APP_ID=tu_app_id
INSTAGRAM_APP_SECRET=tu_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/instagram/callback

# Clave de cifrado: genera una con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
TOKEN_ENCRYPTION_KEY=clave_de_64_caracteres_hexadecimales

# Secreto para los crons: genera uno con: node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
CRON_SECRET=secreto_para_los_crons
```

---

## Paso 6 — Obtener el token de Instagram

### 6.1 Generar la URL de autorización

```bash
npm run generar-url-auth
```

Copiá la URL que imprime y abrila en el navegador.

### 6.2 Autorizar la app

Iniciá sesión con tu cuenta de Instagram Creator/Business y hacé clic en **Autorizar**.

Instagram te va a redirigir a una URL como:

```
http://localhost:3000/api/instagram/callback?code=AQBxxxxx...#_
```

Copiá el valor del parámetro `code` (todo lo que está entre `code=` y `#_`).

> Si el servidor no está corriendo, la página va a dar error de conexión — es normal. El código igual está en la barra de direcciones del navegador.

### 6.3 Canjear el code por un token largo (60 días)

```bash
npm run canjear-code -- AQBxxxxx...el_code_que_copiaste
```

El script imprime las dos líneas que necesitás agregar a `.env.local`:

```
IG_USER_ID=17841406991700156
IG_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx
```

Agregalas a `.env.local`.

### 6.4 Guardar el token localmente

```bash
npm run guardar-token
```

Crea `token.json` con el token y la fecha de expiración. Desde ahora los scripts renuevan el token automáticamente cuando quedan 7 días para que expire.

---

## Paso 7 — Inicializar la cuenta en la base de datos

```bash
npm run setup-db
```

Este script:
- Verifica la conexión a PostgreSQL
- Consulta el perfil de Instagram
- Crea un usuario administrador en `tb_usuario` si no existe ninguno
- Cifra el token con `TOKEN_ENCRYPTION_KEY`
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

## Paso 8 — Probar el sistema completo

```bash
npm run probar-cron
```

Simula el cron diario de Vercel: lee la cuenta de la DB, consulta la API de Instagram y guarda un snapshot en `mv_rrss_metrica`. Al final muestra el JSON guardado:

```json
[
  {
    "id": "1",
    "rrss_key": "17841406991700156",
    "seguidores": 60,
    "siguiendo": 481,
    "publicaciones": 23,
    "likes": 347,
    "comentarios": 35,
    "alcance": 1,
    "fecha_captura": "2026-06-02T..."
  }
]
```

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run ver-metricas` | Muestra las métricas actuales como JSON (sin DB) |
| `npm run ver-posts` | Genera `posts.html` con las últimas 3 publicaciones |
| `npm run guardar-token` | Guarda o actualiza el token en `token.json` |
| `npm run setup-db` | Inserta la cuenta en la base de datos |
| `npm run probar-cron` | Simula el cron de captura de métricas con la DB |
| `npm run generar-url-auth` | Genera la URL de autorización de Instagram |
| `npm run canjear-code -- <code>` | Canjea el code OAuth por un token largo |
| `npm run dev` | Levanta el servidor Next.js en localhost:3000 |

---

## Renovación automática del token

El token de Instagram dura **60 días**. Hay dos mecanismos de renovación:

**Desarrollo local:** `lib/token-local.ts` detecta automáticamente cuando quedan menos de 7 días y renueva el token al correr cualquier script.

**Producción (Vercel):** el cron `refrescar-tokens` se ejecuta semanalmente y renueva todos los tokens en la DB que estén por vencer.

Si el token expira sin renovarse (solo pasa si no corriste nada por más de 60 días), repetís el Paso 6 completo.

---

## Despliegue en Vercel

1. Subí el proyecto a GitHub.
2. Importalo en [vercel.com](https://vercel.com).
3. En **Project Settings → Environment Variables**, agregá las mismas variables de `.env.local` pero con `INSTAGRAM_REDIRECT_URI` apuntando a tu dominio de Vercel:
   ```
   INSTAGRAM_REDIRECT_URI=https://tu-app.vercel.app/api/instagram/callback
   ```
4. Registrá esa URL también en Meta for Developers (Paso 2).
5. Los crons de `vercel.json` se activan automáticamente al deployar.

---

## Notas importantes

- **Cuenta personal de Instagram:** no funciona. Debe ser Creator o Business (el cambio es gratis y reversible).
- **Alcance (`alcance`):** puede venir en `null` en cuentas con menos de 100 seguidores. Es una restricción de la API de Meta.
- **Modo desarrollo de Meta:** solo podés conectar cuentas que sean Administradores, Desarrolladores o Testers de tu app. Para conectar cuentas de terceros necesitás pasar el App Review de Meta.
- **`datos_originales`:** la columna JSONB guarda la respuesta cruda de la API. Si una métrica aparece en `null`, consultá ese campo para ver qué nombre usa Meta en la versión actual y ajustá `getMetricasCuenta()` en `lib/instagram.ts`.
- **`token.json` y `.env.local`** están en `.gitignore` — nunca se suben al repositorio.
