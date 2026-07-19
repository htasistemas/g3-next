import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync, spawn } from "node:child_process";
import { loadBackendEnvFiles } from "../src/config/env-runtime.js";

loadBackendEnvFiles();

const npmCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const childOptions = { stdio: "inherit" as const, env: process.env, shell: process.platform === "win32" };
const migration = spawnSync(npmCommand, ["prisma", "migrate", "deploy"], childOptions);

if (migration.status !== 0) {
  const migrationsDir = resolve(process.cwd(), "prisma", "migrations");
  const migrations = existsSync(migrationsDir)
    ? readdirSync(migrationsDir).filter((name) => name.includes("educacional") || name.includes("tipo_unidade")).sort()
    : [];

  if (migrations.length === 0) {
    process.exit(migration.status ?? 1);
  }

  console.warn("[g3n-backend-node] migrate deploy não aplicável ao banco legado; aplicando migrations educacionais idempotentes.");
  for (const migrationName of migrations) {
    const file = join(migrationsDir, migrationName, "migration.sql");
    const result = spawnSync(npmCommand, ["prisma", "db", "execute", "--schema", "prisma/schema.prisma", "--file", file], childOptions);
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}

const server = spawn(npmCommand, ["tsx", "watch", "src/server.ts"], childOptions);
server.on("exit", (code, signal) => {
  process.exitCode = signal ? 1 : code ?? 1;
});
