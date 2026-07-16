import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../../../database/prisma.js";
import { RegistroPontoRepository } from "../repositories/registro-ponto.repository.js";

function obterSqlDaQuery(query: unknown) {
  if (typeof query === "string") return query;
  if (!query || typeof query !== "object") return "";

  const valor = query as Record<string, unknown>;
  if (typeof valor.sql === "string") return valor.sql;
  if (typeof valor.text === "string") return valor.text;
  if (Array.isArray(valor.strings)) {
    return valor.strings.join("?");
  }

  return String(query);
}

test("listarUsuarios do registro de ponto retorna apenas usuarios ativos e nao deletados", async () => {
  const repository = new RegistroPontoRepository();
  const queryRawOriginal = prisma.$queryRaw;
  const executeRawOriginal = prisma.$executeRaw;
  const executeRawUnsafeOriginal = prisma.$executeRawUnsafe;

  const sqlCapturada: string[] = [];

  // O bootstrap de estrutura dispara SQL de criação; aqui isolamos só a query do catálogo.
  prisma.$executeRaw = async () => 0;
  prisma.$executeRawUnsafe = async () => 0;
  prisma.$queryRaw = async (query: unknown) => {
    sqlCapturada.push(obterSqlDaQuery(query));
    return [
      {
        id: BigInt(1),
        nome: "Usuário Ativo",
        nome_usuario: "usuario.ativo",
        unidade: null
      }
    ];
  };

  try {
    const resultado = await repository.listarUsuarios(undefined, "tenant-1");

    assert.equal(resultado.length, 1);
    assert.equal(resultado[0]?.login, "usuario.ativo");
    assert.ok(sqlCapturada[0]?.includes("u.deletado_em IS NULL"));
    assert.ok(sqlCapturada[0]?.includes("COALESCE(u.status, 'ATIVO') = 'ATIVO'"));
  } finally {
    prisma.$queryRaw = queryRawOriginal;
    prisma.$executeRaw = executeRawOriginal;
    prisma.$executeRawUnsafe = executeRawUnsafeOriginal;
  }
});
