import { describe, expect, it } from "vitest";
import {
  gerarCronogramaExecucao,
  planoVazio,
  somarAplicacaoRecursos,
  somarDesembolso,
  validarPlano
} from "../../features/planos-trabalho/plano-trabalho-utils";

describe("plano-trabalho-utils", () => {
  it("gera cronograma a partir das metas e etapas", () => {
    const plano = planoVazio();
    plano.metas = [
      {
        numeroMeta: "Meta 1",
        descricao: "Atender famílias",
        indicadorResultado: "Famílias acompanhadas",
        unidadeMedida: "famílias",
        quantidadePrevista: 30,
        meioVerificacao: "Relatório",
        dataInicio: "2026-05-01",
        dataFim: "2026-10-31",
        responsavel: "Ana Souza",
        situacao: "Planejada",
        etapas: [
          {
            nome: "Busca ativa",
            acaoExecutar: "Mapear territórios",
            quantidade: 10,
            unidade: "ações",
            dataInicio: "2026-05-01",
            dataFim: "2026-05-31",
            responsavel: "Ana Souza",
            situacao: "Planejada"
          }
        ]
      }
    ];

    const cronograma = gerarCronogramaExecucao(plano);
    expect(cronograma).toHaveLength(1);
    expect(cronograma[0]?.metaNumero).toBe("Meta 1");
    expect(cronograma[0]?.etapaNome).toBe("Busca ativa");
  });

  it("valida divergencia entre aplicacao e desembolso no envio", () => {
    const plano = planoVazio();
    Object.assign(plano, {
      titulo: "Plano teste",
      tipoParceria: "Termo de Fomento",
      orgaoParceiro: "Prefeitura",
      periodoInicio: "2026-05-01",
      periodoFim: "2026-12-31",
      responsavelTecnico: "Ana Souza",
      responsavelLegal: "Carlos Silva",
      razaoSocial: "Instituto Social",
      cnpj: "12345678000195",
      representanteLegal: "Carlos Silva",
      representanteCpf: "52998224725",
      descricaoObjeto: "Executar serviço socioassistencial",
      areaAtuacao: "Assistência social",
      localExecucao: "Uberlândia",
      publicoAlvo: "Famílias em vulnerabilidade",
      problemaSocial: "Baixo acesso a serviços",
      objetivoGeral: "Ampliar atendimento",
      declaracaoVeracidade: true
    });
    plano.metas = [
      {
        numeroMeta: "Meta 1",
        descricao: "Atender famílias",
        indicadorResultado: "Famílias atendidas",
        unidadeMedida: "famílias",
        quantidadePrevista: 50,
        meioVerificacao: "Lista",
        dataInicio: "2026-05-01",
        dataFim: "2026-12-31",
        responsavel: "Ana Souza",
        situacao: "Planejada",
        etapas: [
          {
            nome: "Atendimento",
            responsavel: "Ana Souza"
          }
        ]
      }
    ];
    plano.objetivosEspecificos = [
      {
        descricao: "Melhorar acesso",
        resultadoEsperado: "Mais famílias atendidas",
        metasVinculadas: ["Meta 1"]
      }
    ];
    plano.aplicacaoRecursos = [
      { categoriaDespesa: "Serviços de terceiros", item: "Oficina", valorTotal: 1000 }
    ];
    plano.desembolso = [{ mesAno: "05/2026", valorPrevisto: 900 }];
    plano.checklistPrestacao = [{ descricao: "Relatório", obrigatorio: true, concluido: false }];

    expect(somarAplicacaoRecursos(plano)).toBe(1000);
    expect(somarDesembolso(plano)).toBe(900);
    const erros = validarPlano(plano, "envio");
    expect(erros.desembolso).toContain("desembolso");
  });
});
