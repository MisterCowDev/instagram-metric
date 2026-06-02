import crypto from "crypto";

// ============================================================
// Cifrado de tokens (AES-256-GCM)
// Tu tabla guarda los tokens en columnas *_encriptada / *_encriptado.
// NUNCA guardes el token en texto plano ni lo expongas al frontend.
//
// Necesitas una clave de 32 bytes en la variable de entorno
// TOKEN_ENCRYPTION_KEY (en hexadecimal, 64 caracteres).
// Para generarla una vez:  openssl rand -hex 32
// ============================================================

const ALGORITMO = "aes-256-gcm";

function obtenerClave(): Buffer {
  const clave = process.env.TOKEN_ENCRYPTION_KEY;
  if (!clave || clave.length !== 64) {
    throw new Error(
      "Falta TOKEN_ENCRYPTION_KEY o no mide 64 caracteres hex (32 bytes)."
    );
  }
  return Buffer.from(clave, "hex");
}

// Devuelve un string "iv:authTag:ciphertext" en base64, listo para guardar en TEXT.
export function cifrar(textoPlano: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITMO, obtenerClave(), iv);
  const cifrado = Buffer.concat([
    cipher.update(textoPlano, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    cifrado.toString("base64"),
  ].join(":");
}

export function descifrar(valorCifrado: string): string {
  const [ivB64, tagB64, datosB64] = valorCifrado.split(":");
  if (!ivB64 || !tagB64 || !datosB64) {
    throw new Error("Formato de token cifrado inválido.");
  }
  const decipher = crypto.createDecipheriv(
    ALGORITMO,
    obtenerClave(),
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const descifrado = Buffer.concat([
    decipher.update(Buffer.from(datosB64, "base64")),
    decipher.final(),
  ]);
  return descifrado.toString("utf8");
}
