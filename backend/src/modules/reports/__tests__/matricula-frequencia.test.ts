import assert from "node:assert/strict";
import test from "node:test";
import { ReportsService } from "../services/reports.service.js";

test("ReportsService.gerarListaPresencaMatricula monta relatorio de acompanhamento de frequencia", async () => {
  const service = new ReportsService();

  (service as unknown as {
    repository: { obterInstituicaoRelatorio: (...args: unknown[]) => Promise<unknown> };
    matriculaService: {
      buscarPorId: (...args: unknown[]) => Promise<unknown>;
      listarPresencaDatas: (...args: unknown[]) => Promise<unknown[]>;
      listarPresencasPorData: (...args: unknown[]) => Promise<unknown>;
    };
    template: { montarHtml: (input: unknown) => string };
    renderer: { render: (html: string) => Promise<Buffer> };
  }).repository = {
    async obterInstituicaoRelatorio() {
      return {
        razaoSocial: "Instituicao Teste",
        logoUrl: undefined,
        rodape: { linha1: "Instituicao Teste", linha2: "", linha3: "" }
      };
    }
  };

  (service as unknown as {
    matriculaService: {
      buscarPorId: (...args: unknown[]) => Promise<unknown>;
      listarPresencaDatas: (...args: unknown[]) => Promise<unknown[]>;
      listarPresencasPorData: (...args: unknown[]) => Promise<unknown>;
    };
  }).matriculaService = {
    async buscarPorId() {
      return {
        id_matricula: "10",
        tipo: "CURSO",
        nome: "Curso de Informática",
        status: "ATIVO",
        profissional: "Professora Ana",
        horario_inicial: "08:00",
        duracao_horas: 2,
        vagas_totais: 20,
        vagas_disponiveis: 5,
        total_fila_espera: 0,
        matriculas: [
          {
            id_matricula_item: "1",
            beneficiario_nome: "Maria da Silva",
            cpf: "12345678900",
            data_nascimento: "2000-01-01",
            status: "ATIVO"
          }
        ],
        fila_espera: []
      };
    },
    async listarPresencaDatas() {
      return [
        {
          id: "100",
          data_aula: "2026-07-10",
          status: "PREENCHIDA",
          observacoes: "Aula realizada.",
          total_presencas: 1,
          total_anexos: 0,
          criado_em: "2026-07-10T00:00:00.000Z",
          atualizado_em: "2026-07-10T00:00:00.000Z"
        }
      ];
    },
    async listarPresencasPorData() {
      return {
        data_aula: "2026-07-10",
        presencas: [
          {
            matricula_id: "1",
            beneficiario_nome: "Maria da Silva",
            cpf: "12345678900",
            status: "PRESENTE",
            observacao: "Compareceu no horário"
          }
        ]
      };
    }
  };

  (service as unknown as {
    template: { montarHtml: (input: unknown) => string };
    renderer: { render: (html: string) => Promise<Buffer> };
  }).template = {
    montarHtml(input) {
      return JSON.stringify(input);
    }
  };
  (service as unknown as { renderer: { render: (html: string) => Promise<Buffer> } }).renderer = {
    async render(html: string) {
      return Buffer.from(html);
    }
  };

  const resultado = await service.gerarListaPresencaMatricula(
    {
      matriculaId: "10",
      periodoInicio: "2026-07-10",
      periodoFim: "2026-07-10",
      exibirCpf: true,
      usuarioEmissor: "Ana Responsavel"
    },
    { tenant_id: "550e8400-e29b-41d4-a716-446655440000" }
  );

  assert.match(resultado.html, /Relatório de Acompanhamento de Frequência/);
  assert.match(resultado.html, /Maria da Silva/);
  assert.match(resultado.html, /Presente/);
  assert.doesNotMatch(resultado.html, /Assinatura do profissional responsável/);
  assert.match(resultado.filename, /relatorio-acompanhamento-frequencia-matricula-10\.pdf/);
});
