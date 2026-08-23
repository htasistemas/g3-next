import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync, spawn } from "node:child_process";
import { createConnection } from "node:net";
import { loadBackendEnvFiles, normalizeRuntimeEnv } from "../src/config/env-runtime.js";

loadBackendEnvFiles();
// O Prisma CLI e os processos filhos leem diretamente de process.env. Aplicar
// aqui a mesma normalização usada pela configuração da API garante que o
// ambiente de desenvolvimento tenha DATABASE_URL e o segredo padrão antes de
// executar as migrations.
Object.assign(process.env, normalizeRuntimeEnv(process.env));

const apiHost = process.env.API_HOST || "0.0.0.0";
const apiPort = Number(process.env.API_PORT || 3333);

function portaEmUso(): Promise<boolean> {
  return new Promise((resolvePorta) => {
    const socket = createConnection({ host: "127.0.0.1", port: apiPort });
    const finalizar = (emUso: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolvePorta(emUso);
    };

    socket.once("connect", () => finalizar(true));
    socket.once("error", () => finalizar(false));
    socket.setTimeout(750, () => finalizar(false));
  });
}

if (await portaEmUso()) {
  console.warn(
    `[g3n-backend-node] API já está em execução em ${apiHost}:${apiPort}; nenhuma nova instância foi iniciada.`
  );
  process.exit(0);
}

const npmCommand = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npx";
const npmPrefix = process.platform === "win32" ? ["/d", "/s", "/c", "npx.cmd"] : [];
const childOptions = { stdio: "inherit" as const, env: process.env, shell: false };
const migration = spawnSync(npmCommand, [...npmPrefix, "prisma", "migrate", "deploy"], {
  ...childOptions,
  stdio: ["ignore", "pipe", "pipe"]
});

if (migration.status !== 0) {
  const migrationOutput = `${migration.stdout?.toString() ?? ""}\n${migration.stderr?.toString() ?? ""}`;
  const bancoLegado = migrationOutput.includes("P3005") || migrationOutput.includes("schema is not empty");
  const migrationsDir = resolve(process.cwd(), "prisma", "migrations");
    const migrations = existsSync(migrationsDir)
    ? readdirSync(migrationsDir).filter((name) => name.includes("educacional") || name.includes("tipo_unidade") || name.includes("login_contexto_organizacional") || name.includes("prestacao_contas_profissional") || name.includes("gestao_parcerias_instrumentos") || name.includes("harden_gestao_parcerias") || name.includes("vinculo_termo_fomento_parceria") || name.includes("portal_inscricoes")).sort()
    : [];

  if (migrations.length === 0) {
    process.exit(migration.status ?? 1);
  }

  if (bancoLegado) {
    console.warn("[g3n-backend-node] Banco legado detectado; aplicando migrations compatíveis sem apagar dados.");
  } else {
    console.error("[g3n-backend-node] Falha ao aplicar migrations do banco:", migrationOutput.trim());
  }
  for (const migrationName of migrations) {
    const file = join(migrationsDir, migrationName, "migration.sql");
    const result = spawnSync(
      npmCommand,
      [...npmPrefix, "prisma", "db", "execute", "--schema", "prisma/schema.prisma", "--file", file],
      childOptions
    );
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}

if (process.argv.includes("--migrations-only")) {
  console.info("[g3n-backend-node] Migrations concluídas sem iniciar a API.");
  process.exit(0);
}

const server = spawn(npmCommand, [...npmPrefix, "tsx", "watch", "src/server.ts"], childOptions);
server.on("exit", (code, signal) => {
  process.exitCode = signal ? 1 : code ?? 1;
});
