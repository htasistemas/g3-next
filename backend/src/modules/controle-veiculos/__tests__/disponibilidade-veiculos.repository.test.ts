import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../../database/prisma.js";
import { ControleVeiculosDisponibilidadeRepository } from "../disponibilidade-veiculos.repository.js";

function criarStubPrisma(respostas: unknown[]) {
  const originalQuery = prisma.$queryRawUnsafe;
  const originalExecute = prisma.$executeRawUnsafe;
  let indice = 0;

  (prisma as unknown as {
    $queryRawUnsafe: (...args: unknown[]) => Promise<unknown>;
    $executeRawUnsafe: (...args: unknown[]) => Promise<unknown>;
  }).$queryRawUnsafe = async () => respostas[indice++] ?? [];
  (prisma as unknown as {
    $queryRawUnsafe: (...args: unknown[]) => Promise<unknown>;
    $executeRawUnsafe: (...args: unknown[]) => Promise<unknown>;
  }).$executeRawUnsafe = async () => undefined;

  return () => {
    (prisma as unknown as {
      $queryRawUnsafe: (...args: unknown[]) => Promise<unknown>;
      $executeRawUnsafe: (...args: unknown[]) => Promise<unknown>;
    }).$queryRawUnsafe = originalQuery;
    (prisma as unknown as {
      $queryRawUnsafe: (...args: unknown[]) => Promise<unknown>;
      $executeRawUnsafe: (...args: unknown[]) => Promise<unknown>;
    }).$executeRawUnsafe = originalExecute;
  };
}

test("consulta disponibilidade marca reservado quando ha bloqueio no periodo", async () => {
  const restaurar = criarStubPrisma([
    [{ id: 1n, placa: "ABC1234", modelo: "Uno", marca: "Fiat", ativo: true }],
    [
      {
        id: 10n,
        tenant_id: "tenant-1",
        veiculo_id: 1n,
        tipo_situacao: "RESERVADO",
        data_hora_inicio: new Date("2026-07-14T08:00:00.000Z"),
        data_hora_fim: new Date("2026-07-14T10:00:00.000Z"),
        motivo: "Uso institucional",
        motivo_detalhado: null,
        destino: null,
        responsavel_nome: "Maria",
        observacoes: null,
        status_registro: "ATIVO",
        criado_por_nome: "Admin",
        criado_em: new Date("2026-07-14T07:00:00.000Z"),
        alterado_por_nome: "Admin",
        alterado_em: new Date("2026-07-14T07:00:00.000Z"),
        cancelado_por_nome: null,
        cancelado_em: null,
        motivo_cancelamento: null,
        version: 1,
        placa: "ABC1234",
        modelo: "Uno",
        marca: "Fiat",
        veiculo_ativo: true
      }
    ]
  ]);

  try {
    const repository = new ControleVeiculosDisponibilidadeRepository();
    const resultado = await repository.consultarDisponibilidade("tenant-1", {
      dataHoraInicio: "2026-07-14T09:00:00.000Z",
      dataHoraFim: "2026-07-14T09:30:00.000Z"
    });

    assert.equal(resultado[0]?.situacao, "RESERVADO");
    assert.equal(resultado[0]?.bloqueios?.[0]?.responsavelNome, "Maria");
  } finally {
    restaurar();
  }
});

test("proxima disponibilidade considera bloqueios consecutivos", async () => {
  const restaurar = criarStubPrisma([
    [{ id: 2n, placa: "XYZ9999", modelo: "Doblo", marca: "Fiat", ativo: true }],
    [
      {
        id: 20n,
        tenant_id: "tenant-1",
        veiculo_id: 2n,
        tipo_situacao: "RESERVADO",
        data_hora_inicio: new Date("2026-07-14T08:00:00.000Z"),
        data_hora_fim: new Date("2026-07-14T10:00:00.000Z"),
        motivo: "Viagem",
        motivo_detalhado: null,
        destino: null,
        responsavel_nome: "Joao",
        observacoes: null,
        status_registro: "ATIVO",
        criado_por_nome: "Admin",
        criado_em: new Date("2026-07-14T07:00:00.000Z"),
        alterado_por_nome: "Admin",
        alterado_em: new Date("2026-07-14T07:00:00.000Z"),
        cancelado_por_nome: null,
        cancelado_em: null,
        motivo_cancelamento: null,
        version: 1,
        placa: "XYZ9999",
        modelo: "Doblo",
        marca: "Fiat",
        veiculo_ativo: true
      },
      {
        id: 21n,
        tenant_id: "tenant-1",
        veiculo_id: 2n,
        tipo_situacao: "INDISPONIVEL",
        data_hora_inicio: new Date("2026-07-14T10:00:00.000Z"),
        data_hora_fim: new Date("2026-07-14T12:30:00.000Z"),
        motivo: "Manutenção",
        motivo_detalhado: null,
        destino: null,
        responsavel_nome: "Oficina",
        observacoes: null,
        status_registro: "ATIVO",
        criado_por_nome: "Admin",
        criado_em: new Date("2026-07-14T07:00:00.000Z"),
        alterado_por_nome: "Admin",
        alterado_em: new Date("2026-07-14T07:00:00.000Z"),
        cancelado_por_nome: null,
        cancelado_em: null,
        motivo_cancelamento: null,
        version: 1,
        placa: "XYZ9999",
        modelo: "Doblo",
        marca: "Fiat",
        veiculo_ativo: true
      }
    ]
  ]);

  try {
    const repository = new ControleVeiculosDisponibilidadeRepository();
    const resultado = await repository.proximaDisponibilidade(
      "tenant-1",
      2,
      new Date("2026-07-14T09:00:00.000Z")
    );

    assert.equal(resultado.situacaoAtual, "INDISPONIVEL");
    assert.equal(resultado.disponivelEm, new Date("2026-07-14T12:30:00.000Z").toISOString());
  } finally {
    restaurar();
  }
});
