import { describe, expect, it } from "vitest";
import {
  clonarPlano,
  gerarCronogramaExecucao,
  planoVazio,
  somarAplicacaoRecursos,
  somarDesembolso,
  validarPlano,
  validarPlanoParaImpressao
} from "../../features/planos-trabalho/plano-trabalho-utils";
import { gerarHtmlPlanoTrabalho } from "../../features/planos-trabalho/plano-trabalho-report";
import type { ArquivoMetadata } from "../../types/arquivo";

function montarPlanoCompleto() {
  const plano = planoVazio();
  Object.assign(plano, {
    titulo: "Plano de trabalho completo",
    tipoParceria: "Termo de Fomento",
    orgaoParceiro: "Prefeitura Municipal",
    periodoInicio: "2026-05-01",
    periodoFim: "2026-12-31",
    responsavelTecnico: "Ana Souza",
    responsavelLegal: "Carlos Silva",
    razaoSocial: "Instituto Social Modelo",
    nomeFantasia: "Instituto Modelo",
    cnpj: "12345678000195",
    cep: "38400000",
    logradouro: "Rua das Flores",
    numero: "123",
    complemento: "Sala 2",
    bairro: "Centro",
    cidade: "Uberlândia",
    uf: "MG",
    telefone: "34999999999",
    email: "contato@institutomodelo.org.br",
    representanteLegal: "Carlos Silva",
    representanteCpf: "52998224725",
    representanteCargo: "Presidente",
    bancoNome: "Caixa Econômica Federal",
    bancoAgencia: "1234",
    bancoConta: "56789-0",
    bancoOperacao: "Pessoa Jurídica",
    bancoPix: "contato@institutomodelo.org.br",
    bancoObservacao: "Conta vinculada ao termo",
    historicoOsc: "Atuação social contínua desde 2010.",
    finalidadeInstitucional: "Promover assistência social.",
    experienciaAnterior: "Atendimentos territoriais e oficinas.",
    conselhosCertificacoes: "CMAS e certificação local.",
    publicoAtendidoAtual: "Famílias em vulnerabilidade social.",
    capacidadeTecnicaOperacional: "Equipe multiprofissional e estrutura adequada.",
    descricaoObjeto: "Executar ações de atendimento e acompanhamento.",
    areaAtuacao: "Assistência social",
    localExecucao: "Uberlândia",
    abrangenciaTerritorial: "Zona urbana",
    publicoAlvo: "Famílias acompanhadas pelo CRAS",
    quantidadeBeneficiarios: 120,
    criteriosSelecao: "Prioridade social e avaliação técnica.",
    problemaSocial: "Desigualdade de acesso a serviços.",
    causasConsequencias: "Baixa renda e vulnerabilidade territorial.",
    dadosIndicadores: "Registro nominal e monitoramento mensal.",
    capacidadeExecucao: "Equipe e espaço físico compatíveis.",
    impactoEsperado: "Ampliação do acesso e fortalecimento familiar.",
    objetivoGeral: "Fortalecer a rede de proteção social.",
    objetivosEspecificos: [
      {
        descricao: "Ampliar o atendimento",
        resultadoEsperado: "Mais famílias acompanhadas",
        metasVinculadas: ["Meta 1"]
      }
    ],
    metas: [
      {
        numeroMeta: "Meta 1",
        descricao: "Atender famílias",
        indicadorResultado: "Famílias acompanhadas",
        unidadeMedida: "famílias",
        quantidadePrevista: 50,
        meioVerificacao: "Lista de presença",
        dataInicio: "2026-05-01",
        dataFim: "2026-12-31",
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
            situacao: "Planejada",
            valorEstimado: 1000
          }
        ]
      }
    ],
    aplicacaoRecursos: [
      {
        categoriaDespesa: "Serviços de terceiros",
        item: "Oficina",
        descricao: "Oficina de acompanhamento",
        quantidade: 1,
        unidade: "serviço",
        valorUnitario: 1000,
        valorTotal: 1000,
        fonteRecurso: "Público"
      }
    ],
    desembolso: [
      {
        mesAno: "05/2026",
        valorPrevisto: 1000,
        fonteRecurso: "Público",
        metaNumero: "Meta 1",
        observacao: "Primeira parcela"
      }
    ],
    formaAcompanhamento: "Relatórios mensais",
    indicadoresMonitoramento: "Atendimentos realizados",
    periodicidadeMonitoramento: "Mensal",
    responsavelColetaDados: "Maria Oliveira",
    instrumentosMonitoramento: ["Lista de presença", "Relatório técnico"],
    resultadoEsperadoMonitoramento: "Acompanhamento sistemático.",
    evidenciasObrigatorias: "Fotos e relatórios.",
    periodicidadePrestacao: "Trimestral",
    dataLimitePrestacao: "2026-12-20",
    documentosExigidos: "Relatório final",
    responsavelPrestacao: "Carlos Silva",
    observacoesPrestacao: "Prestação entregue ao fim da execução.",
    checklistPrestacao: [{ descricao: "Relatório final", obrigatorio: true, concluido: false }],
    localDeclaracao: "Uberlândia",
    dataDeclaracao: "2026-05-01",
    nomeRepresentanteDeclaracao: "Carlos Silva",
    cpfRepresentanteDeclaracao: "52998224725",
    cargoRepresentanteDeclaracao: "Presidente",
    declaracaoVeracidade: true,
    aprovacaoInterna: "Diretoria executiva",
    situacaoAprovacao: "Aprovado internamente",
    observacaoAprovador: "Plano revisado e validado.",
    arquivoFormato: "PDF"
  });
  return plano;
}

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

  it("aceita um plano completamente preenchido para envio e impressão", () => {
    const plano = montarPlanoCompleto();
    expect(validarPlano(plano, "envio")).toEqual({});
    expect(validarPlanoParaImpressao(plano)).toEqual({});
  });

  it("permite salvar rascunho incompleto e valida CPF somente quando informado", () => {
    const plano = planoVazio();

    expect(validarPlano(plano, "rascunho")).toEqual({});

    plano.cpfRepresentanteDeclaracao = "52998224725";
    expect(validarPlano(plano, "rascunho")).toEqual({});

    plano.cpfRepresentanteDeclaracao = "12345678900";
    expect(validarPlano(plano, "rascunho").cpfRepresentanteDeclaracao).toContain("CPF");
  });

  it("faz clone profundo do plano sem compartilhar referências internas", () => {
    const original = montarPlanoCompleto();
    const clone = clonarPlano(original);

    clone.titulo = "Plano clonado";
    clone.metas[0].descricao = "Alterado";
    clone.objetivosEspecificos[0].descricao = "Objetivo alterado";

    expect(original.titulo).toBe("Plano de trabalho completo");
    expect(original.metas[0].descricao).toBe("Atender famílias");
    expect(original.objetivosEspecificos[0].descricao).toBe("Ampliar o atendimento");
  });

  it("gera html de impressão com instituição, banco e seções principais", () => {
    const plano = montarPlanoCompleto();
    const anexos: ArquivoMetadata[] = [
      {
        id: 1,
        nomeOriginal: "anexo.pdf",
        nomeArquivo: "anexo.pdf",
        caminhoArquivo: "/storage/plano/anexo.pdf",
        categoria: "documento",
        mimeType: "application/pdf",
        dataUpload: "2026-07-14T00:00:00.000Z",
        entidadeTipo: "plano_trabalho",
        entidadeId: 1
      }
    ];

    const html = gerarHtmlPlanoTrabalho(plano, gerarCronogramaExecucao(plano), anexos);

    expect(html).toContain("Plano de trabalho");
    expect(html).toContain("Instituto Social Modelo");
    expect(html).toContain("Caixa Econômica Federal");
    expect(html).toContain("Dados bancários");
    expect(html).toContain("Cronograma de execução");
    expect(html).toContain("anexo.pdf");
  });
});
