import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import { AppError } from "../../../shared/errors/app-error.js";
import { DoacaoRealizadaService } from "../services/doacao-realizada.service.js";
import type { DoacaoRealizadaInput } from "../doacao-realizada.types.js";

function criarRetornoPersistencia(input: DoacaoRealizadaInput) {
  return {
    registro: {
      id: 1n,
      beneficiario_id: input.beneficiario_id ? BigInt(input.beneficiario_id) : null,
      vinculo_familiar_id: input.vinculo_familiar_id ? BigInt(input.vinculo_familiar_id) : null,
      beneficiario_nome: null,
      familia_nome: null,
      tipo_doacao: input.tipo_doacao,
      situacao: input.situacao,
      responsavel: input.responsavel ?? null,
      observacoes: input.observacoes ?? null,
      data_doacao: input.data_doacao,
      criado_em: new Date("2026-03-17T12:00:00Z"),
      atualizado_em: new Date("2026-03-17T12:00:00Z"),
      total_itens: input.itens.length,
      possui_item_fora_carencia: input.itens.some((item) => item.fora_carencia)
    },
    itens: input.itens.map((item, indice) => ({
      id: BigInt(indice + 1),
      doacao_realizada_id: 1n,
      almoxarifado_item_id: BigInt(item.item_id),
      codigo_item: `ITEM-${item.item_id}`,
      descricao_item: `Item ${item.item_id}`,
      unidade_item: "UN",
      quantidade: item.quantidade,
      observacoes: item.observacoes ?? null,
      fora_carencia: item.fora_carencia ?? false,
      carencia_dias: item.carencia_dias_aplicada ?? null,
      autorizado_por_nome: item.autorizado_por_nome ?? null,
      autorizacao_carencia_em: item.autorizacao_carencia_em
        ? new Date(item.autorizacao_carencia_em)
        : null,
      ultima_entrega_em: item.ultima_entrega_em ?? null
    }))
  };
}

function criarContextoTeste(opcoes?: {
  tempoCarenciaDias?: number;
  ultimaEntregaMesmoItem?: Date | string | null;
}) {
  let payloadCriado: DoacaoRealizadaInput | undefined;

  const repository = {
    listar: async () => [],
    buscarPorIdOuFalhar: async () => {
      throw new Error("nao utilizado neste teste");
    },
    criar: async (input: DoacaoRealizadaInput) => {
      payloadCriado = input;
      return criarRetornoPersistencia(input);
    },
    atualizar: async () => {
      throw new Error("nao utilizado neste teste");
    },
    remover: async () => undefined,
    listarBeneficiarios: async () => [],
    listarFamilias: async () => [],
    listarItensEstoque: async () => [],
    buscarUltimaEntregaMesmoItem: async () => {
      if (!opcoes?.ultimaEntregaMesmoItem) {
        return null;
      }

      return {
        doacao_realizada_id: 99n,
        data_doacao: opcoes.ultimaEntregaMesmoItem,
        codigo_item: "ARZ-001",
        descricao_item: "Arroz"
      };
    }
  };

  const parametrosSistemaService = {
    obterCarenciaDoacaoRealizada: async () => ({
      carencia: {
        tempo_carencia_dias: opcoes?.tempoCarenciaDias ?? 0
      },
      atualizado_em: null
    })
  };

  const service = new DoacaoRealizadaService(
    repository as any,
    parametrosSistemaService as any
  );

  return {
    service,
    obterPayloadCriado: () => payloadCriado
  };
}

test("deve bloquear entrega do mesmo item dentro da carencia sem autorizacao administrativa", async () => {
  const { service } = criarContextoTeste({
    tempoCarenciaDias: 30,
    ultimaEntregaMesmoItem: "2026-03-01"
  });

  await assert.rejects(
    () =>
      service.criar(
        {
          beneficiario_id: 10,
          tipo_doacao: "Doacao entregue",
          situacao: "Entregue",
          responsavel: "Operador",
          observacoes: "teste",
          data_doacao: "2026-03-17",
          itens: [{ item_id: 7, quantidade: 1 }]
        },
        {
          id: "2",
          nomeUsuario: "operador",
          permissoes: ["OPERADOR"]
        }
      ),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 409 &&
      error.message.includes("carencia de 30 dias") &&
      error.message.includes("01-03-2026")
  );
});

test("deve permitir entrega quando o item ja cumpriu a carencia", async () => {
  const { service, obterPayloadCriado } = criarContextoTeste({
    tempoCarenciaDias: 30,
    ultimaEntregaMesmoItem: "2026-02-01"
  });

  await service.criar(
    {
      beneficiario_id: 10,
      tipo_doacao: "Doacao entregue",
      situacao: "Entregue",
      responsavel: "Operador",
      observacoes: "teste",
      data_doacao: "2026-03-17",
      itens: [{ item_id: 7, quantidade: 1 }]
    },
    {
      id: "2",
      nomeUsuario: "operador",
      permissoes: ["OPERADOR"]
    }
  );

  const payloadCriado = obterPayloadCriado();
  assert.ok(payloadCriado);
  assert.equal(payloadCriado?.itens[0]?.fora_carencia, false);
  assert.equal(payloadCriado?.itens[0]?.carencia_dias_aplicada, 30);
});

test("deve registrar autorizacao administrativa ao liberar entrega dentro da carencia", async () => {
  const { service, obterPayloadCriado } = criarContextoTeste({
    tempoCarenciaDias: 30,
    ultimaEntregaMesmoItem: "2026-03-10"
  });

  const senhaHash = await bcrypt.hash("123456", 10);
  (service as any).buscarUsuarioAutenticadoPorId = async () => ({
    nomeUsuario: "admin",
    nome: "Administrador G3",
    senhaHash
  });

  await service.criar(
    {
      beneficiario_id: 10,
      tipo_doacao: "Doacao entregue",
      situacao: "Entregue",
      responsavel: "Administrador G3",
      observacoes: "liberado",
      data_doacao: "2026-03-17",
      autorizar_fora_carencia: true,
      senha_administrativa: "123456",
      itens: [{ item_id: 7, quantidade: 2 }]
    },
    {
      id: "99",
      nomeUsuario: "admin",
      permissoes: ["ADMINISTRADOR"]
    }
  );

  const payloadCriado = obterPayloadCriado();
  assert.ok(payloadCriado);
  assert.equal(payloadCriado?.itens[0]?.fora_carencia, true);
  assert.equal(payloadCriado?.itens[0]?.carencia_dias_aplicada, 30);
  assert.equal(payloadCriado?.itens[0]?.autorizado_por_usuario_id, 99);
  assert.equal(payloadCriado?.itens[0]?.autorizado_por_nome, "Administrador G3");
  assert.equal(payloadCriado?.itens[0]?.ultima_entrega_em, "2026-03-10");
  assert.ok(payloadCriado?.itens[0]?.autorizacao_carencia_em);
});
