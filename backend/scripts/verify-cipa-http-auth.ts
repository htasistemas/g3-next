import { randomUUID } from "node:crypto";
import { loadBackendEnvFiles, normalizeRuntimeEnv } from "../src/config/env-runtime.js";
import { prisma } from "../src/database/prisma.js";
import { app } from "../src/app.js";

loadBackendEnvFiles(); Object.assign(process.env, normalizeRuntimeEnv(process.env));
const tenantId = randomUUID(); const identificador = `cipa-http-${tenantId}`; let electionId = 0n;
let server = app.listen(0);
try {
  const address = server.address(); if (!address || typeof address === "string") throw new Error("Não foi possível iniciar o servidor de teste.");
  const rows = await prisma.$queryRaw<Array<{ id: bigint }>>`INSERT INTO cipa_eleicao (tenant_id, instituicao_id, unidade_id, identificador_publico, nome, gestao, status) VALUES (${tenantId}::uuid, ${randomUUID()}::uuid, 1, ${identificador}, 'Teste HTTP CIPA', 'TESTE', 'CONFIGURACAO') RETURNING id`;
  electionId = rows[0].id;
  const base = `http://127.0.0.1:${address.port}`;
  const publico = await fetch(`${base}/api/rh/cipa/portal/${identificador}`);
  const administrativo = await fetch(`${base}/api/rh/cipa/eleicoes`);
  const relatorios = await fetch(`${base}/api/rh/cipa/eleicoes/${electionId}/relatorios?tipo=CANDIDATOS`);
  const cancelar = await fetch(`${base}/api/rh/cipa/eleicoes/${electionId}/cancelar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ motivo: "Tentativa sem sessão" }) });
  if (publico.status !== 200 || administrativo.status !== 401 || relatorios.status !== 401 || cancelar.status !== 401) throw new Error(`Contratos HTTP inesperados: público=${publico.status}, administrativo=${administrativo.status}, relatórios=${relatorios.status}, cancelar=${cancelar.status}`);
  const payload = await publico.json() as { eleicao?: { nome?: string }; candidatos?: unknown[] };
  if (payload.eleicao?.nome !== "Teste HTTP CIPA" || !Array.isArray(payload.candidatos)) throw new Error("Payload público inválido.");
  await new Promise<void>((resolve) => server.close(() => resolve()));
  server = app.listen(0);
  const addressAposReinicio = await new Promise<ReturnType<typeof server.address>>((resolve) => { const verificar = () => { const address = server.address(); if (address) resolve(address); else setTimeout(verificar, 10); }; verificar(); });
  if (!addressAposReinicio || typeof addressAposReinicio === "string") throw new Error("Não foi possível reiniciar o servidor de teste.");
  const healthAposReinicio = await fetch(`http://127.0.0.1:${addressAposReinicio.port}/health`);
  if (healthAposReinicio.status !== 200) throw new Error(`A API não respondeu após reinício: ${healthAposReinicio.status}`);
  console.log(JSON.stringify({ portalPublicoSemSessao: true, rotaAdministrativaSemSessaoNegada: true, relatoriosSemSessaoNegados: true, cancelamentoSemSessaoNegado: true, statusPublico: publico.status, statusAdministrativo: administrativo.status, statusRelatorios: relatorios.status, statusCancelamento: cancelar.status, reinicioHttpValidado: true, statusHealthAposReinicio: healthAposReinicio.status }, null, 2));
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.$executeRaw`DELETE FROM cipa_eleicao WHERE tenant_id = ${tenantId}::uuid AND id = ${electionId}`;
  await prisma.$disconnect();
}
