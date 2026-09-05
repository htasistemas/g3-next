import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function chaveCriptografia() {
  const base = process.env.G3N_CREDENTIAL_KEY || process.env.JWT_SECRET || "g3-next-dev-credential-key";
  return createHash("sha256").update(base).digest();
}

export function criptografarSegredo(valor?: unknown) {
  const texto = typeof valor === "string" ? valor.trim() : "";
  if (!texto) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", chaveCriptografia(), iv);
  const criptografado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${criptografado.toString("base64")}`;
}

export function descriptografarSegredo(valor?: unknown) {
  if (typeof valor !== "string" || !valor.trim()) return undefined;
  const [ivBase64, tagBase64, dataBase64] = valor.split(".");
  if (!ivBase64 || !tagBase64 || !dataBase64) return undefined;
  try {
    const decipher = createDecipheriv("aes-256-gcm", chaveCriptografia(), Buffer.from(ivBase64, "base64"));
    decipher.setAuthTag(Buffer.from(tagBase64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataBase64, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return undefined;
  }
}

export function mascararSegredo(valor?: unknown) {
  const texto = typeof valor === "string" ? valor.trim() : "";
  return texto ? `${"•".repeat(12)}${texto.slice(-4)}` : undefined;
}
