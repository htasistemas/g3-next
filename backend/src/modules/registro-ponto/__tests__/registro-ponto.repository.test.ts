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
  const prismaMock = prisma as unknown as {
    $queryRaw: (query: unknown) => Promise<unknown>;
    $executeRaw: (query: unknown) => Promise<number>;
    $executeRawUnsafe: (query: unknown) => Promise<number>;
  };
  const queryRawOriginal = prismaMock.$queryRaw;
  const executeRawOriginal = prismaMock.$executeRaw;
  const executeRawUnsafeOriginal = prismaMock.$executeRawUnsafe;

  const sqlCapturada: string[] = [];

  // O bootstrap de estrutura dispara SQL de criação; aqui isolamos só a query do catálogo.
  prismaMock.$executeRaw = async () => 0;
  prismaMock.$executeRawUnsafe = async () => 0;
  prismaMock.$queryRaw = async (query: unknown) => {
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
    prismaMock.$queryRaw = queryRawOriginal;
    prismaMock.$executeRaw = executeRawOriginal;
    prismaMock.$executeRawUnsafe = executeRawUnsafeOriginal;
  }
});
