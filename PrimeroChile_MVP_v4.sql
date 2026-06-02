-- ================================================================
-- PrimeroChile - Prototipo Base de Datos MVP Profesional v2
-- Motor objetivo: PostgreSQL
-- Fecha: 2026-05-30
--
-- Criterios aplicados:
-- - Catálogos con prefijo tb_
-- - Entidades / movimientos / relaciones con prefijo mv_
-- - Auditoría estilo institucional: activo, fecha_crea, usuario_crea, fecha_mod, usuario_mod
-- - activo CHAR(1) con valores S/N
-- - IDs numéricos PostgreSQL: BIGINT GENERATED ALWAYS AS IDENTITY
-- - Ubicación normalizada: región -> provincia -> comuna
-- - slug para URLs públicas amigables
-- - Imágenes como rutas/URLs, no binarios en PostgreSQL
-- - Métricas RRSS como snapshots históricos por cuenta asociada a usuario responsable
-- ================================================================

BEGIN;

-- ================================================================
-- Limpieza opcional para reprototipado
-- ================================================================
DROP TABLE IF EXISTS mv_rrss_metrica CASCADE;
DROP TABLE IF EXISTS mv_rrss_cuenta CASCADE;

DROP TABLE IF EXISTS mv_solicitud_servicio_imagen CASCADE;
DROP TABLE IF EXISTS mv_solicitud_servicio_caracteristica CASCADE;
DROP TABLE IF EXISTS mv_solicitud_servicio_tipo CASCADE;
DROP TABLE IF EXISTS mv_solicitud_servicio CASCADE;

DROP TABLE IF EXISTS mv_noticia_imagen CASCADE;
DROP TABLE IF EXISTS mv_noticia CASCADE;

DROP TABLE IF EXISTS mv_servicio_imagen CASCADE;
DROP TABLE IF EXISTS mv_servicio_caracteristica CASCADE;
DROP TABLE IF EXISTS mv_servicio_tipo CASCADE;
DROP TABLE IF EXISTS mv_servicio CASCADE;

DROP TABLE IF EXISTS mv_atractivo_imagen CASCADE;
DROP TABLE IF EXISTS mv_atractivo_caracteristica CASCADE;
DROP TABLE IF EXISTS mv_atractivo_tipo CASCADE;
DROP TABLE IF EXISTS mv_atractivo CASCADE;

DROP TABLE IF EXISTS mv_imagen CASCADE;

DROP TABLE IF EXISTS tb_rrss CASCADE;
DROP TABLE IF EXISTS tb_categoria_noticia CASCADE;
DROP TABLE IF EXISTS tb_caracteristica CASCADE;
DROP TABLE IF EXISTS tb_tipo_servicio CASCADE;
DROP TABLE IF EXISTS tb_tipo_atractivo CASCADE;
DROP TABLE IF EXISTS tb_estado_solicitud CASCADE;
DROP TABLE IF EXISTS tb_estado_publicacion CASCADE;
DROP TABLE IF EXISTS tb_comuna CASCADE;
DROP TABLE IF EXISTS tb_provincia CASCADE;
DROP TABLE IF EXISTS tb_region CASCADE;
DROP TABLE IF EXISTS tb_usuario CASCADE;
DROP TABLE IF EXISTS tb_usuario_rol CASCADE;

-- ================================================================
-- SEGURIDAD / ADMINISTRACIÓN
-- ================================================================

CREATE TABLE tb_usuario_rol (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    descripcion VARCHAR(80) NOT NULL UNIQUE,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT chk_tb_usuario_rol_activo CHECK (activo IN ('S', 'N'))
);

CREATE TABLE tb_usuario (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tb_usuario_rol_id BIGINT NOT NULL,

    nombre_completo VARCHAR(180) NOT NULL,
    correo VARCHAR(180) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,

    ultimo_acceso TIMESTAMPTZ NULL,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT fk_tb_usuario_rol
        FOREIGN KEY (tb_usuario_rol_id) REFERENCES tb_usuario_rol(id),
    CONSTRAINT chk_tb_usuario_activo CHECK (activo IN ('S', 'N'))
);

-- ================================================================
-- UBICACIÓN: región -> provincia -> comuna
-- ================================================================

CREATE TABLE tb_region (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL UNIQUE,
    slug VARCHAR(140) NOT NULL UNIQUE,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT chk_tb_region_activo CHECK (activo IN ('S', 'N'))
);

CREATE TABLE tb_provincia (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tb_region_id BIGINT NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    slug VARCHAR(140) NOT NULL,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT fk_tb_provincia_region
        FOREIGN KEY (tb_region_id) REFERENCES tb_region(id),
    CONSTRAINT uq_tb_provincia_region_slug UNIQUE (tb_region_id, slug),
    CONSTRAINT uq_tb_provincia_region_nombre UNIQUE (tb_region_id, nombre),
    CONSTRAINT chk_tb_provincia_activo CHECK (activo IN ('S', 'N'))
);

CREATE TABLE tb_comuna (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tb_provincia_id BIGINT NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    slug VARCHAR(140) NOT NULL,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT fk_tb_comuna_provincia
        FOREIGN KEY (tb_provincia_id) REFERENCES tb_provincia(id),
    CONSTRAINT uq_tb_comuna_provincia_slug UNIQUE (tb_provincia_id, slug),
    CONSTRAINT uq_tb_comuna_provincia_nombre UNIQUE (tb_provincia_id, nombre),
    CONSTRAINT chk_tb_comuna_activo CHECK (activo IN ('S', 'N'))
);

-- ================================================================
-- CATÁLOGOS
-- ================================================================

CREATE TABLE tb_estado_publicacion (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    descripcion VARCHAR(80) NOT NULL UNIQUE,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT chk_tb_estado_publicacion_activo CHECK (activo IN ('S', 'N'))
);

CREATE TABLE tb_estado_solicitud (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    descripcion VARCHAR(80) NOT NULL UNIQUE,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT chk_tb_estado_solicitud_activo CHECK (activo IN ('S', 'N'))
);

CREATE TABLE tb_tipo_atractivo (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    descripcion VARCHAR(120) NOT NULL UNIQUE,
    icono VARCHAR(100) NULL,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT chk_tb_tipo_atractivo_activo CHECK (activo IN ('S', 'N'))
);

CREATE TABLE tb_tipo_servicio (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    descripcion VARCHAR(120) NOT NULL UNIQUE,
    icono VARCHAR(100) NULL,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT chk_tb_tipo_servicio_activo CHECK (activo IN ('S', 'N'))
);

CREATE TABLE tb_caracteristica (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    descripcion VARCHAR(120) NOT NULL UNIQUE,
    icono VARCHAR(100) NULL,

    aplica_atractivo CHAR(1) NOT NULL DEFAULT 'S',
    aplica_servicio CHAR(1) NOT NULL DEFAULT 'S',

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT chk_tb_caracteristica_aplica_atractivo CHECK (aplica_atractivo IN ('S', 'N')),
    CONSTRAINT chk_tb_caracteristica_aplica_servicio CHECK (aplica_servicio IN ('S', 'N')),
    CONSTRAINT chk_tb_caracteristica_activo CHECK (activo IN ('S', 'N'))
);

CREATE TABLE tb_categoria_noticia (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    descripcion VARCHAR(120) NOT NULL UNIQUE,
    icono VARCHAR(100) NULL,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT chk_tb_categoria_noticia_activo CHECK (activo IN ('S', 'N'))
);

CREATE TABLE tb_rrss (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    descripcion VARCHAR(80) NOT NULL UNIQUE,
    url_base VARCHAR(255) NULL,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT chk_tb_rrss_activo CHECK (activo IN ('S', 'N'))
);

-- ================================================================
-- IMÁGENES DINÁMICAS
-- Nota: assets permanentes del frontend NO deben vivir aquí.
-- Esta tabla es para imágenes subidas desde admin/formularios y servidas por storage/backend.
-- ================================================================

CREATE TABLE mv_imagen (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    url_archivo VARCHAR(500) NOT NULL,
    ruta_archivo VARCHAR(500) NULL,
    nombre_original VARCHAR(255) NULL,
    nombre_guardado VARCHAR(255) NULL,
    mime_type VARCHAR(100) NULL,
    peso_bytes BIGINT NULL,
    texto_alt VARCHAR(255) NULL,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT chk_mv_imagen_activo CHECK (activo IN ('S', 'N'))
);

-- ================================================================
-- ATRACTIVOS TURÍSTICOS
-- ================================================================

CREATE TABLE mv_atractivo (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tb_comuna_id BIGINT NOT NULL,
    tb_estado_publicacion_id BIGINT NOT NULL,

    nombre VARCHAR(180) NOT NULL,
    slug VARCHAR(220) NOT NULL UNIQUE,
    resumen VARCHAR(300) NULL,
    descripcion TEXT NULL,
    direccion VARCHAR(255) NULL,
    latitud NUMERIC(10,7) NULL,
    longitud NUMERIC(10,7) NULL,
    dificultad VARCHAR(80) NULL,
    destacado CHAR(1) NOT NULL DEFAULT 'N',
    publicado_en TIMESTAMPTZ NULL,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT fk_mv_atractivo_comuna
        FOREIGN KEY (tb_comuna_id) REFERENCES tb_comuna(id),
    CONSTRAINT fk_mv_atractivo_estado_publicacion
        FOREIGN KEY (tb_estado_publicacion_id) REFERENCES tb_estado_publicacion(id),
    CONSTRAINT chk_mv_atractivo_activo CHECK (activo IN ('S', 'N')),
    CONSTRAINT chk_mv_atractivo_destacado CHECK (destacado IN ('S', 'N')),
    CONSTRAINT chk_mv_atractivo_latitud CHECK (latitud IS NULL OR latitud BETWEEN -90 AND 90),
    CONSTRAINT chk_mv_atractivo_longitud CHECK (longitud IS NULL OR longitud BETWEEN -180 AND 180)
);

CREATE TABLE mv_atractivo_tipo (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mv_atractivo_id BIGINT NOT NULL,
    tb_tipo_atractivo_id BIGINT NOT NULL,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT fk_mv_atractivo_tipo_atractivo
        FOREIGN KEY (mv_atractivo_id) REFERENCES mv_atractivo(id),
    CONSTRAINT fk_mv_atractivo_tipo_tipo
        FOREIGN KEY (tb_tipo_atractivo_id) REFERENCES tb_tipo_atractivo(id),
    CONSTRAINT uq_mv_atractivo_tipo UNIQUE (mv_atractivo_id, tb_tipo_atractivo_id),
    CONSTRAINT chk_mv_atractivo_tipo_activo CHECK (activo IN ('S', 'N'))
);

CREATE TABLE mv_atractivo_caracteristica (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mv_atractivo_id BIGINT NOT NULL,
    tb_caracteristica_id BIGINT NOT NULL,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT fk_mv_atractivo_caracteristica_atractivo
        FOREIGN KEY (mv_atractivo_id) REFERENCES mv_atractivo(id),
    CONSTRAINT fk_mv_atractivo_caracteristica_caracteristica
        FOREIGN KEY (tb_caracteristica_id) REFERENCES tb_caracteristica(id),
    CONSTRAINT uq_mv_atractivo_caracteristica UNIQUE (mv_atractivo_id, tb_caracteristica_id),
    CONSTRAINT chk_mv_atractivo_caracteristica_activo CHECK (activo IN ('S', 'N'))
);

CREATE TABLE mv_atractivo_imagen (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mv_atractivo_id BIGINT NOT NULL,
    mv_imagen_id BIGINT NOT NULL,

    es_portada CHAR(1) NOT NULL DEFAULT 'N',
    orden INTEGER NOT NULL DEFAULT 0,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT fk_mv_atractivo_imagen_atractivo
        FOREIGN KEY (mv_atractivo_id) REFERENCES mv_atractivo(id),
    CONSTRAINT fk_mv_atractivo_imagen_imagen
        FOREIGN KEY (mv_imagen_id) REFERENCES mv_imagen(id),
    CONSTRAINT uq_mv_atractivo_imagen UNIQUE (mv_atractivo_id, mv_imagen_id),
    CONSTRAINT chk_mv_atractivo_imagen_portada CHECK (es_portada IN ('S', 'N')),
    CONSTRAINT chk_mv_atractivo_imagen_activo CHECK (activo IN ('S', 'N'))
);

-- ================================================================
-- SERVICIOS / EMPRENDEDORES / PROVEEDORES TURÍSTICOS
-- ================================================================

CREATE TABLE mv_servicio (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tb_comuna_id BIGINT NOT NULL,
    tb_estado_publicacion_id BIGINT NOT NULL,

    nombre VARCHAR(180) NOT NULL,
    slug VARCHAR(220) NOT NULL UNIQUE,
    descripcion TEXT NULL,
    direccion VARCHAR(255) NULL,
    latitud NUMERIC(10,7) NULL,
    longitud NUMERIC(10,7) NULL,

    nombre_contacto VARCHAR(180) NULL,
    correo_contacto VARCHAR(180) NULL,
    telefono_contacto VARCHAR(60) NULL,
    url_sitio_web VARCHAR(500) NULL,
    url_instagram VARCHAR(500) NULL,
    url_facebook VARCHAR(500) NULL,
    url_tiktok VARCHAR(500) NULL,

    precio_desde NUMERIC(12,2) NULL,
    precio_hasta NUMERIC(12,2) NULL,

    destacado CHAR(1) NOT NULL DEFAULT 'N',
    publicado_en TIMESTAMPTZ NULL,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT fk_mv_servicio_comuna
        FOREIGN KEY (tb_comuna_id) REFERENCES tb_comuna(id),
    CONSTRAINT fk_mv_servicio_estado_publicacion
        FOREIGN KEY (tb_estado_publicacion_id) REFERENCES tb_estado_publicacion(id),
    CONSTRAINT chk_mv_servicio_activo CHECK (activo IN ('S', 'N')),
    CONSTRAINT chk_mv_servicio_destacado CHECK (destacado IN ('S', 'N')),
    CONSTRAINT chk_mv_servicio_latitud CHECK (latitud IS NULL OR latitud BETWEEN -90 AND 90),
    CONSTRAINT chk_mv_servicio_longitud CHECK (longitud IS NULL OR longitud BETWEEN -180 AND 180),
    CONSTRAINT chk_mv_servicio_precios CHECK (
        precio_desde IS NULL OR precio_hasta IS NULL OR precio_hasta >= precio_desde
    )
);

CREATE TABLE mv_servicio_tipo (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mv_servicio_id BIGINT NOT NULL,
    tb_tipo_servicio_id BIGINT NOT NULL,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT fk_mv_servicio_tipo_servicio
        FOREIGN KEY (mv_servicio_id) REFERENCES mv_servicio(id),
    CONSTRAINT fk_mv_servicio_tipo_tipo
        FOREIGN KEY (tb_tipo_servicio_id) REFERENCES tb_tipo_servicio(id),
    CONSTRAINT uq_mv_servicio_tipo UNIQUE (mv_servicio_id, tb_tipo_servicio_id),
    CONSTRAINT chk_mv_servicio_tipo_activo CHECK (activo IN ('S', 'N'))
);

CREATE TABLE mv_servicio_caracteristica (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mv_servicio_id BIGINT NOT NULL,
    tb_caracteristica_id BIGINT NOT NULL,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT fk_mv_servicio_caracteristica_servicio
        FOREIGN KEY (mv_servicio_id) REFERENCES mv_servicio(id),
    CONSTRAINT fk_mv_servicio_caracteristica_caracteristica
        FOREIGN KEY (tb_caracteristica_id) REFERENCES tb_caracteristica(id),
    CONSTRAINT uq_mv_servicio_caracteristica UNIQUE (mv_servicio_id, tb_caracteristica_id),
    CONSTRAINT chk_mv_servicio_caracteristica_activo CHECK (activo IN ('S', 'N'))
);

CREATE TABLE mv_servicio_imagen (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mv_servicio_id BIGINT NOT NULL,
    mv_imagen_id BIGINT NOT NULL,

    es_portada CHAR(1) NOT NULL DEFAULT 'N',
    orden INTEGER NOT NULL DEFAULT 0,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT fk_mv_servicio_imagen_servicio
        FOREIGN KEY (mv_servicio_id) REFERENCES mv_servicio(id),
    CONSTRAINT fk_mv_servicio_imagen_imagen
        FOREIGN KEY (mv_imagen_id) REFERENCES mv_imagen(id),
    CONSTRAINT uq_mv_servicio_imagen UNIQUE (mv_servicio_id, mv_imagen_id),
    CONSTRAINT chk_mv_servicio_imagen_portada CHECK (es_portada IN ('S', 'N')),
    CONSTRAINT chk_mv_servicio_imagen_activo CHECK (activo IN ('S', 'N'))
);

-- ================================================================
-- NOTICIAS
-- ================================================================

CREATE TABLE mv_noticia (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tb_categoria_noticia_id BIGINT NOT NULL,
    tb_estado_publicacion_id BIGINT NOT NULL,
    tb_usuario_autor_id BIGINT NULL,

    titulo VARCHAR(220) NOT NULL,
    slug VARCHAR(260) NOT NULL UNIQUE,
    bajada VARCHAR(300) NULL,
    contenido TEXT NOT NULL,

    publicado_en TIMESTAMPTZ NULL,
    fecha_expiracion TIMESTAMPTZ NULL,
    destacado CHAR(1) NOT NULL DEFAULT 'N',

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT fk_mv_noticia_categoria
        FOREIGN KEY (tb_categoria_noticia_id) REFERENCES tb_categoria_noticia(id),
    CONSTRAINT fk_mv_noticia_estado_publicacion
        FOREIGN KEY (tb_estado_publicacion_id) REFERENCES tb_estado_publicacion(id),
    CONSTRAINT fk_mv_noticia_autor
        FOREIGN KEY (tb_usuario_autor_id) REFERENCES tb_usuario(id),
    CONSTRAINT chk_mv_noticia_activo CHECK (activo IN ('S', 'N')),
    CONSTRAINT chk_mv_noticia_destacado CHECK (destacado IN ('S', 'N')),
    CONSTRAINT chk_mv_noticia_fechas CHECK (
        fecha_expiracion IS NULL OR publicado_en IS NULL OR fecha_expiracion >= publicado_en
    )
);

CREATE TABLE mv_noticia_imagen (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mv_noticia_id BIGINT NOT NULL,
    mv_imagen_id BIGINT NOT NULL,

    es_portada CHAR(1) NOT NULL DEFAULT 'N',
    orden INTEGER NOT NULL DEFAULT 0,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT fk_mv_noticia_imagen_noticia
        FOREIGN KEY (mv_noticia_id) REFERENCES mv_noticia(id),
    CONSTRAINT fk_mv_noticia_imagen_imagen
        FOREIGN KEY (mv_imagen_id) REFERENCES mv_imagen(id),
    CONSTRAINT uq_mv_noticia_imagen UNIQUE (mv_noticia_id, mv_imagen_id),
    CONSTRAINT chk_mv_noticia_imagen_portada CHECK (es_portada IN ('S', 'N')),
    CONSTRAINT chk_mv_noticia_imagen_activo CHECK (activo IN ('S', 'N'))
);

-- ================================================================
-- SOLICITUDES DE PUBLICACIÓN DE SERVICIO
-- Flujo esperado:
-- 1) visitante/enviante crea solicitud pendiente
-- 2) admin revisa
-- 3) si aprueba, se crea mv_servicio y se referencia en mv_servicio_generado_id
-- ================================================================

CREATE TABLE mv_solicitud_servicio (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tb_comuna_id BIGINT NOT NULL,
    tb_estado_solicitud_id BIGINT NOT NULL,
    mv_servicio_generado_id BIGINT NULL,

    nombre_servicio VARCHAR(180) NOT NULL,
    descripcion TEXT NULL,
    direccion VARCHAR(255) NULL,
    latitud NUMERIC(10,7) NULL,
    longitud NUMERIC(10,7) NULL,

    nombre_contacto VARCHAR(180) NOT NULL,
    correo_contacto VARCHAR(180) NOT NULL,
    telefono_contacto VARCHAR(60) NULL,
    url_sitio_web VARCHAR(500) NULL,
    url_instagram VARCHAR(500) NULL,
    url_facebook VARCHAR(500) NULL,
    url_tiktok VARCHAR(500) NULL,

    precio_desde NUMERIC(12,2) NULL,
    precio_hasta NUMERIC(12,2) NULL,

    comentario_solicitante TEXT NULL,
    comentario_admin TEXT NULL,
    motivo_rechazo TEXT NULL,
    tb_usuario_revisor_id BIGINT NULL,
    fecha_revision TIMESTAMPTZ NULL,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT fk_mv_solicitud_servicio_comuna
        FOREIGN KEY (tb_comuna_id) REFERENCES tb_comuna(id),
    CONSTRAINT fk_mv_solicitud_servicio_estado
        FOREIGN KEY (tb_estado_solicitud_id) REFERENCES tb_estado_solicitud(id),
    CONSTRAINT fk_mv_solicitud_servicio_generado
        FOREIGN KEY (mv_servicio_generado_id) REFERENCES mv_servicio(id),
    CONSTRAINT fk_mv_solicitud_servicio_revisor
        FOREIGN KEY (tb_usuario_revisor_id) REFERENCES tb_usuario(id),
    CONSTRAINT chk_mv_solicitud_servicio_activo CHECK (activo IN ('S', 'N')),
    CONSTRAINT chk_mv_solicitud_servicio_latitud CHECK (latitud IS NULL OR latitud BETWEEN -90 AND 90),
    CONSTRAINT chk_mv_solicitud_servicio_longitud CHECK (longitud IS NULL OR longitud BETWEEN -180 AND 180),
    CONSTRAINT chk_mv_solicitud_servicio_precios CHECK (
        precio_desde IS NULL OR precio_hasta IS NULL OR precio_hasta >= precio_desde
    )
);

CREATE TABLE mv_solicitud_servicio_tipo (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mv_solicitud_servicio_id BIGINT NOT NULL,
    tb_tipo_servicio_id BIGINT NOT NULL,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT fk_mv_solicitud_servicio_tipo_solicitud
        FOREIGN KEY (mv_solicitud_servicio_id) REFERENCES mv_solicitud_servicio(id),
    CONSTRAINT fk_mv_solicitud_servicio_tipo_tipo
        FOREIGN KEY (tb_tipo_servicio_id) REFERENCES tb_tipo_servicio(id),
    CONSTRAINT uq_mv_solicitud_servicio_tipo UNIQUE (mv_solicitud_servicio_id, tb_tipo_servicio_id),
    CONSTRAINT chk_mv_solicitud_servicio_tipo_activo CHECK (activo IN ('S', 'N'))
);

CREATE TABLE mv_solicitud_servicio_caracteristica (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mv_solicitud_servicio_id BIGINT NOT NULL,
    tb_caracteristica_id BIGINT NOT NULL,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT fk_mv_solicitud_servicio_caracteristica_solicitud
        FOREIGN KEY (mv_solicitud_servicio_id) REFERENCES mv_solicitud_servicio(id),
    CONSTRAINT fk_mv_solicitud_servicio_caracteristica_caracteristica
        FOREIGN KEY (tb_caracteristica_id) REFERENCES tb_caracteristica(id),
    CONSTRAINT uq_mv_solicitud_servicio_caracteristica UNIQUE (mv_solicitud_servicio_id, tb_caracteristica_id),
    CONSTRAINT chk_mv_solicitud_servicio_caracteristica_activo CHECK (activo IN ('S', 'N'))
);

CREATE TABLE mv_solicitud_servicio_imagen (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mv_solicitud_servicio_id BIGINT NOT NULL,
    mv_imagen_id BIGINT NOT NULL,

    es_portada CHAR(1) NOT NULL DEFAULT 'N',
    orden INTEGER NOT NULL DEFAULT 0,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT fk_mv_solicitud_servicio_imagen_solicitud
        FOREIGN KEY (mv_solicitud_servicio_id) REFERENCES mv_solicitud_servicio(id),
    CONSTRAINT fk_mv_solicitud_servicio_imagen_imagen
        FOREIGN KEY (mv_imagen_id) REFERENCES mv_imagen(id),
    CONSTRAINT uq_mv_solicitud_servicio_imagen UNIQUE (mv_solicitud_servicio_id, mv_imagen_id),
    CONSTRAINT chk_mv_solicitud_servicio_imagen_portada CHECK (es_portada IN ('S', 'N')),
    CONSTRAINT chk_mv_solicitud_servicio_imagen_activo CHECK (activo IN ('S', 'N'))
);

-- ================================================================
-- REDES SOCIALES Y MÉTRICAS
-- La API key / token se configura solo por BD para cuentas autorizadas.
-- Si metricas_habilitadas = 'S' y existe credencial/token, el backend puede consultar APIs externas.
-- ================================================================

CREATE TABLE mv_rrss_cuenta (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tb_rrss_id BIGINT NOT NULL,
    tb_usuario_responsable_id BIGINT NOT NULL,

    nombre_cuenta VARCHAR(160) NOT NULL,
    usuario_rrss VARCHAR(160) NULL,
    url_rrss VARCHAR(500) NOT NULL,
    rrss_key VARCHAR(255) NULL,

    cuenta_oficial CHAR(1) NOT NULL DEFAULT 'S',
    metricas_habilitadas CHAR(1) NOT NULL DEFAULT 'N',

    -- Guardar cifrado si se usa. No exponer por frontend.
    api_key_encriptada TEXT NULL,
    api_secret_encriptado TEXT NULL,
    access_token_encriptado TEXT NULL,
    refresh_token_encriptado TEXT NULL,
    token_expira_en TIMESTAMPTZ NULL,

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT fk_mv_rrss_cuenta_rrss
        FOREIGN KEY (tb_rrss_id) REFERENCES tb_rrss(id),
    CONSTRAINT fk_mv_rrss_cuenta_usuario_responsable
        FOREIGN KEY (tb_usuario_responsable_id) REFERENCES tb_usuario(id),
    CONSTRAINT chk_mv_rrss_cuenta_oficial CHECK (cuenta_oficial IN ('S', 'N')),
    CONSTRAINT chk_mv_rrss_cuenta_metricas CHECK (metricas_habilitadas IN ('S', 'N')),
    CONSTRAINT chk_mv_rrss_cuenta_activo CHECK (activo IN ('S', 'N'))
);

CREATE TABLE mv_rrss_metrica (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mv_rrss_cuenta_id BIGINT NOT NULL,

    seguidores BIGINT NULL,
    siguiendo BIGINT NULL,
    publicaciones BIGINT NULL,
    likes BIGINT NULL,
    comentarios BIGINT NULL,
    compartidos BIGINT NULL,
    visualizaciones BIGINT NULL,
    alcance BIGINT NULL,
    impresiones BIGINT NULL,
    engagement NUMERIC(10,4) NULL,

    datos_originales JSONB NULL,
    fecha_captura TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    activo CHAR(1) NOT NULL DEFAULT 'S',
    fecha_crea TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_crea BIGINT NULL,
    fecha_mod TIMESTAMPTZ NULL,
    usuario_mod BIGINT NULL,

    CONSTRAINT fk_mv_rrss_metrica_cuenta
        FOREIGN KEY (mv_rrss_cuenta_id) REFERENCES mv_rrss_cuenta(id),
    CONSTRAINT chk_mv_rrss_metrica_activo CHECK (activo IN ('S', 'N'))
);

-- ================================================================
-- ÍNDICES RECOMENDADOS
-- ================================================================

CREATE INDEX idx_tb_provincia_region ON tb_provincia(tb_region_id);
CREATE INDEX idx_tb_comuna_provincia ON tb_comuna(tb_provincia_id);

CREATE INDEX idx_mv_atractivo_comuna ON mv_atractivo(tb_comuna_id);
CREATE INDEX idx_mv_atractivo_estado ON mv_atractivo(tb_estado_publicacion_id);
CREATE INDEX idx_mv_atractivo_activo ON mv_atractivo(activo);
CREATE INDEX idx_mv_atractivo_destacado ON mv_atractivo(destacado);

CREATE INDEX idx_mv_servicio_comuna ON mv_servicio(tb_comuna_id);
CREATE INDEX idx_mv_servicio_estado ON mv_servicio(tb_estado_publicacion_id);
CREATE INDEX idx_mv_servicio_activo ON mv_servicio(activo);
CREATE INDEX idx_mv_servicio_destacado ON mv_servicio(destacado);

CREATE INDEX idx_mv_noticia_categoria ON mv_noticia(tb_categoria_noticia_id);
CREATE INDEX idx_mv_noticia_estado ON mv_noticia(tb_estado_publicacion_id);
CREATE INDEX idx_mv_noticia_activo ON mv_noticia(activo);
CREATE INDEX idx_mv_noticia_expiracion ON mv_noticia(fecha_expiracion);

CREATE INDEX idx_mv_solicitud_estado ON mv_solicitud_servicio(tb_estado_solicitud_id);
CREATE INDEX idx_mv_solicitud_comuna ON mv_solicitud_servicio(tb_comuna_id);
CREATE INDEX idx_mv_solicitud_revisor ON mv_solicitud_servicio(tb_usuario_revisor_id);

CREATE INDEX idx_mv_rrss_cuenta_usuario ON mv_rrss_cuenta(tb_usuario_responsable_id);
CREATE INDEX idx_mv_rrss_cuenta_rrss ON mv_rrss_cuenta(tb_rrss_id);
CREATE INDEX idx_mv_rrss_metrica_cuenta_fecha ON mv_rrss_metrica(mv_rrss_cuenta_id, fecha_captura DESC);

-- ================================================================
-- FUNCIÓN OPCIONAL: desactivar noticias expiradas antes de consultar inicio
-- Uso sugerido desde backend:
-- SELECT fn_desactivar_noticias_expiradas(:usuario_sistema_id);
-- ================================================================

CREATE OR REPLACE FUNCTION fn_desactivar_noticias_expiradas(p_usuario_mod BIGINT DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    v_total INTEGER;
BEGIN
    UPDATE mv_noticia
       SET activo = 'N',
           fecha_mod = NOW(),
           usuario_mod = p_usuario_mod
     WHERE activo = 'S'
       AND fecha_expiracion IS NOT NULL
       AND fecha_expiracion < NOW();

    GET DIAGNOSTICS v_total = ROW_COUNT;
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- SEEDS BASE
-- ================================================================

INSERT INTO tb_usuario_rol (descripcion) VALUES
('Administrador'),
('Desarrollador'),
('Usuario');

INSERT INTO tb_estado_publicacion (descripcion) VALUES
('Borrador'),
('Publicado'),
('Oculto');

INSERT INTO tb_estado_solicitud (descripcion) VALUES
('Pendiente'),
('En revisión'),
('Aprobada'),
('Rechazada');

INSERT INTO tb_rrss (descripcion, url_base) VALUES
('Instagram', 'https://www.instagram.com/'),
('Facebook', 'https://www.facebook.com/'),
('TikTok', 'https://www.tiktok.com/@'),
('YouTube', 'https://www.youtube.com/');

INSERT INTO tb_tipo_atractivo (descripcion, icono) VALUES
('Termas', 'fa-solid fa-hot-tub-person'),
('Volcán', 'fa-solid fa-mountain'),
('Lago', 'fa-solid fa-water'),
('Parque Nacional', 'fa-solid fa-tree'),
('Trekking', 'fa-solid fa-person-hiking'),
('Mirador', 'fa-solid fa-binoculars'),
('Museo', 'fa-solid fa-landmark'),
('Cascada', 'fa-solid fa-waterfall');

INSERT INTO tb_tipo_servicio (descripcion, icono) VALUES
('Alojamiento', 'fa-solid fa-bed'),
('Gastronomía', 'fa-solid fa-utensils'),
('Agencia de turismo', 'fa-solid fa-route'),
('Rent a car', 'fa-solid fa-car'),
('Guía turístico', 'fa-solid fa-person-walking-luggage'),
('Transporte', 'fa-solid fa-van-shuttle');

INSERT INTO tb_caracteristica (descripcion, icono, aplica_atractivo, aplica_servicio) VALUES
('WiFi', 'fa-solid fa-wifi', 'N', 'S'),
('Estacionamiento', 'fa-solid fa-square-parking', 'S', 'S'),
('Pet friendly', 'fa-solid fa-paw', 'N', 'S'),
('Acceso universal', 'fa-solid fa-wheelchair', 'S', 'S'),
('Baños', 'fa-solid fa-restroom', 'S', 'S'),
('Pago con tarjeta', 'fa-solid fa-credit-card', 'N', 'S'),
('Senderos habilitados', 'fa-solid fa-person-hiking', 'S', 'N'),
('Zona de picnic', 'fa-solid fa-umbrella-beach', 'S', 'S');

INSERT INTO tb_categoria_noticia (descripcion, icono) VALUES
('Turismo', 'fa-solid fa-map-location-dot'),
('Cultura', 'fa-solid fa-masks-theater'),
('Emprendimiento', 'fa-solid fa-store'),
('Comunidad', 'fa-solid fa-people-group'),
('Aviso importante', 'fa-solid fa-circle-info');

COMMIT;
