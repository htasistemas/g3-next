import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const currentDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(currentDir, "../..");
const workspaceRoot = resolve(backendRoot, "..");

export function loadBackendEnvFiles() {
  const candidates = [
    resolve(backendRoot, ".env"),
    resolve(workspaceRoot, ".env")
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      config({ path });
    }
  }
}

function buildDatabaseUrlFromLegacyEnv(rawEnv: NodeJS.ProcessEnv) {
  const databaseUrl = rawEnv.DATABASE_URL?.trim();
  if (databaseUrl) {
    return databaseUrl;
  }

  const dbUrl = rawEnv.DB_URL?.trim();
  if (dbUrl) {
    return dbUrl;
  }

  const dbHost = rawEnv.DB_HOST?.trim();
  const dbName = rawEnv.DB_NAME?.trim();
  if (!dbHost || !dbName) {
    return undefined;
  }

  const dbUser = rawEnv.DB_USERNAME?.trim() || "postgres";
  const dbPassword = rawEnv.DB_PASSWORD?.trim() || "admin";
  const dbPort = rawEnv.DB_PORT?.trim() || "5432";

  return `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=public`;
}

export function normalizeRuntimeEnv(rawEnv: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const normalizedEnv = { ...rawEnv };
  const isDevelopment =
    !normalizedEnv.NODE_ENV || normalizedEnv.NODE_ENV.trim().toLowerCase() === "development";

  normalizedEnv.DATABASE_URL =
    buildDatabaseUrlFromLegacyEnv(normalizedEnv) ??
    (isDevelopment ? "postgresql://postgres:admin@localhost:5432/g3?schema=public" : undefined);

  if (!normalizedEnv.APP_EMAIL_HABILITADO && !normalizedEnv.MAIL_PASS && isDevelopment) {
    normalizedEnv.APP_EMAIL_HABILITADO = "false";
  }

  return normalizedEnv;
}
