import {
  formatarCep,
  formatarCnpj,
  formatarCpf,
  formatarMoeda,
  mascararTelefoneInput,
  normalizarCep,
  normalizarCnpj,
  normalizarCpf,
  normalizarEmail,
  normalizarTelefone,
  validarCnpj,
  validarCpf,
  validarEmail
} from "../../lib/br-utils";
import type {
  PlanoAplicacaoRecurso,
  PlanoChecklistPrestacao,
  PlanoCronogramaExecucaoItem,
  PlanoDesembolso,
  PlanoMeta,
  PlanoMetaEtapa,
  PlanoObjetivoEspecifico,
  PlanoTrabalhoPayload
} from "../../types/plano-trabalho";

export {
  formatarCep,
  formatarCnpj,
  formatarCpf,
  formatarMoeda,
  mascararTelefoneInput,
  normalizarCep,
  normalizarCnpj,
  normalizarCpf,
  normalizarEmail,
  normalizarTelefone,
  validarCnpj,
  validarCpf,
  validarEmail
};

export type PlanoErros = Record<string, string>;

export function novoObjetivoEspecifico(): PlanoObjetivoEspecifico {
  return { descricao: "", resultadoEsperado: "", metasVinculadas: [] };
}

export function novaEtapaMeta(): PlanoMetaEtapa {
  return { nome: "", situacao: "Planejada" };
}

export function novaMeta(): PlanoMeta {
  return {
    numeroMeta: "",
    descricao: "",
    indicadorResultado: "",
    unidadeMedida: "",
    quantidadePrevista: undefined,
    meioVerificacao: "",
    dataInicio: "",
    dataFim: "",
    responsavel: "",
    situacao: "Planejada",
    etapas: []
  };
}

export function novoItemAplicacao(): PlanoAplicacaoRecurso {
  return {
    categoriaDespesa: "",
    item: "",
    descricao: "",
    quantidade: undefined,
    unidade: "",
    valorUnitario: undefined,
    valorTotal: undefined,
    fonteRecurso: "",
    metaNumero: "",
    etapaNome: "",
    naturezaDespesa: "",
    observacao: ""
  };
}

export function novoDesembolso(): PlanoDesembolso {
  return { mesAno: "", valorPrevisto: undefined, fonteRecurso: "", metaNumero: "", observacao: "" };
}

export function novoChecklistPrestacao(): PlanoChecklistPrestacao {
  return { descricao: "", obrigatorio: true, concluido: false };
}

export function planoVazio(): PlanoTrabalhoPayload {
  return {
    codigoInterno: "",
    titulo: "",
    tipoParceria: "Termo de Fomento",
    orgaoParceiro: "",
    editalChamamento: "",
    periodoInicio: "",
    periodoFim: "",
    status: "RASCUNHO",
    responsavelTecnico: "",
    responsavelLegal: "",
    termoFomentoId: "",
    numeroProcesso: "",
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    telefone: "",
    email: "",
    representanteLegal: "",
    representanteCpf: "",
    representanteCargo: "",
    bancoNome: "",
    bancoAgencia: "",
    bancoConta: "",
    bancoOperacao: "",
    bancoPix: "",
    bancoObservacao: "",
    historicoOsc: "",
    finalidadeInstitucional: "",
    experienciaAnterior: "",
    conselhosCertificacoes: "",
    publicoAtendidoAtual: "",
    capacidadeTecnicaOperacional: "",
    descricaoObjeto: "",
    areaAtuacao: "",
    localExecucao: "",
    abrangenciaTerritorial: "",
    publicoAlvo: "",
    quantidadeBeneficiarios: undefined,
    criteriosSelecao: "",
    problemaSocial: "",
    causasConsequencias: "",
    dadosIndicadores: "",
    capacidadeExecucao: "",
    impactoEsperado: "",
    objetivoGeral: "",
    objetivosEspecificos: [],
    metas: [],
    aplicacaoRecursos: [],
    desembolso: [],
    formaAcompanhamento: "",
    indicadoresMonitoramento: "",
    periodicidadeMonitoramento: "",
    responsavelColetaDados: "",
    instrumentosMonitoramento: [],
    resultadoEsperadoMonitoramento: "",
    evidenciasObrigatorias: "",
    periodicidadePrestacao: "",
    dataLimitePrestacao: "",
    documentosExigidos: "",
    responsavelPrestacao: "",
    observacoesPrestacao: "",
    checklistPrestacao: [],
    localDeclaracao: "",
    dataDeclaracao: "",
    nomeRepresentanteDeclaracao: "",
    cpfRepresentanteDeclaracao: "",
    cargoRepresentanteDeclaracao: "",
    declaracaoVeracidade: false,
    aprovacaoInterna: "",
    situacaoAprovacao: "",
    observacaoAprovador: "",
    arquivoFormato: "PDF"
  };
}

export function clonarPlano(plano: PlanoTrabalhoPayload): PlanoTrabalhoPayload {
  return JSON.parse(JSON.stringify(plano)) as PlanoTrabalhoPayload;
}

export function calcularValorTotalAplicacao(item: PlanoAplicacaoRecurso) {
  const quantidade = Number(item.quantidade ?? 0);
  const valorUnitario = Number(item.valorUnitario ?? 0);
  const valorTotalInformado = Number(item.valorTotal ?? 0);
  if (quantidade > 0 && valorUnitario > 0) {
    return Number((quantidade * valorUnitario).toFixed(2));
  }
  return Number(valorTotalInformado.toFixed(2));
}

export function somarAplicacaoRecursos(plano: PlanoTrabalhoPayload) {
  return Number(
    (plano.aplicacaoRecursos ?? [])
      .reduce((acc, item) => acc + calcularValorTotalAplicacao(item), 0)
      .toFixed(2)
  );
}

export function somarDesembolso(plano: PlanoTrabalhoPayload) {
  return Number(
    (plano.desembolso ?? []).reduce((acc, item) => acc + Number(item.valorPrevisto ?? 0), 0).toFixed(2)
  );
}

export function gerarCronogramaExecucao(plano: PlanoTrabalhoPayload): PlanoCronogramaExecucaoItem[] {
  return (plano.metas ?? []).flatMap((meta) =>
    (meta.etapas ?? []).map((etapa) => ({
      metaNumero: meta.numeroMeta,
      etapaNome: etapa.nome,
      especificacao: etapa.acaoExecutar || etapa.descricaoDetalhada || meta.descricao,
      unidade: etapa.unidade || meta.unidadeMedida,
      quantidade: etapa.quantidade ?? meta.quantidadePrevista,
      inicio: etapa.dataInicio || meta.dataInicio,
      termino: etapa.dataFim || meta.dataFim,
      responsavel: etapa.responsavel || meta.responsavel,
      status: etapa.situacao || meta.situacao,
      valorEstimado: etapa.valorEstimado
    }))
  );
}

export function validarPlano(plano: PlanoTrabalhoPayload, modo: "rascunho" | "envio" = "rascunho"): PlanoErros {
  const erros: PlanoErros = {};

  if (!plano.titulo.trim()) erros.titulo = "Informe o título do plano.";
  if (!plano.tipoParceria.trim()) erros.tipoParceria = "Informe o tipo da parceria.";
  if (!plano.orgaoParceiro.trim()) erros.orgaoParceiro = "Informe o órgão concedente ou parceiro.";
  if (!plano.periodoInicio) erros.periodoInicio = "Informe o início da execução.";
  if (!plano.periodoFim) erros.periodoFim = "Informe o término da execução.";
  if (plano.periodoInicio && plano.periodoFim && plano.periodoFim < plano.periodoInicio) {
    erros.periodoFim = "A data final não pode ser menor que a data inicial.";
  }
  if (!plano.responsavelTecnico.trim()) erros.responsavelTecnico = "Informe o responsável técnico.";
  if (!plano.responsavelLegal.trim()) erros.responsavelLegal = "Informe o responsável legal.";
  if (!plano.razaoSocial.trim()) erros.razaoSocial = "Informe a razão social.";
  if (!validarCnpj(plano.cnpj)) erros.cnpj = "Informe um CNPJ válido.";
  if (plano.cep && normalizarCep(plano.cep).length !== 8) erros.cep = "Informe um CEP válido.";
  if (plano.telefone) {
    const telefone = normalizarTelefone(plano.telefone);
    if (![10, 11].includes(telefone.length)) erros.telefone = "Informe um telefone válido.";
  }
  if (plano.email && !validarEmail(plano.email)) erros.email = "Informe um e-mail válido.";
  if (!plano.representanteLegal.trim()) erros.representanteLegal = "Informe o representante legal.";
  if (!validarCpf(plano.representanteCpf)) erros.representanteCpf = "Informe um CPF válido.";
  if (!plano.descricaoObjeto.trim()) erros.descricaoObjeto = "Informe o objeto do plano.";
  if (!plano.areaAtuacao.trim()) erros.areaAtuacao = "Informe a área de atuação.";
  if (!plano.localExecucao.trim()) erros.localExecucao = "Informe o local de execução.";
  if (!plano.publicoAlvo.trim()) erros.publicoAlvo = "Informe o público-alvo.";
  if (!plano.problemaSocial.trim()) erros.problemaSocial = "Informe o problema social.";
  if (!plano.objetivoGeral.trim()) erros.objetivoGeral = "Informe o objetivo geral.";

  if (modo === "envio") {
    if (!(plano.metas ?? []).length) erros.metas = "Cadastre pelo menos uma meta.";
    if ((plano.metas ?? []).some((meta) => !meta.indicadorResultado?.trim())) {
      erros.metasIndicadores = "Todas as metas devem possuir indicador.";
    }
    if ((plano.metas ?? []).some((meta) => !(meta.etapas ?? []).length)) {
      erros.metasEtapas = "Cada meta precisa ter pelo menos uma etapa.";
    }
    if (
      (plano.metas ?? []).some((meta) =>
        (meta.etapas ?? []).some((etapa) => !etapa.responsavel?.trim())
      )
    ) {
      erros.etapasResponsavel = "Todas as etapas devem possuir responsável.";
    }
    if (
      (plano.objetivosEspecificos ?? []).some((objetivo) => !(objetivo.metasVinculadas ?? []).length)
    ) {
      erros.objetivosEspecificos = "Todos os objetivos específicos devem estar vinculados a metas.";
    }
    if (somarAplicacaoRecursos(plano) <= 0) {
      erros.aplicacaoRecursos = "O plano de aplicação precisa ter valor total maior que zero.";
    }
    if (Math.abs(somarAplicacaoRecursos(plano) - somarDesembolso(plano)) > 0.009) {
      erros.desembolso = "O total do desembolso deve ser igual ao total da aplicação.";
    }
    if (!(plano.checklistPrestacao ?? []).some((item) => item.obrigatorio !== false)) {
      erros.checklistPrestacao = "Cadastre ao menos um documento obrigatório na prestação de contas.";
    }
    if (!plano.declaracaoVeracidade) {
      erros.declaracaoVeracidade = "Confirme a declaração de veracidade antes do envio.";
    }

    const cronograma = gerarCronogramaExecucao(plano);
    if (
      cronograma.some(
        (item) =>
          (item.inicio && plano.periodoInicio && item.inicio < plano.periodoInicio) ||
          (item.termino && plano.periodoFim && item.termino > plano.periodoFim)
      )
    ) {
      erros.cronogramaExecucao = "O cronograma de execução possui itens fora do período de execução.";
    }
  }

  return erros;
}

export function validarPlanoParaImpressao(plano: PlanoTrabalhoPayload): PlanoErros {
  const erros = validarPlano(plano, "envio");

  if (!plano.bancoNome?.trim()) erros.bancoNome = "Informe o banco.";
  if (!plano.bancoAgencia?.trim()) erros.bancoAgencia = "Informe a agência.";
  if (!plano.bancoConta?.trim()) erros.bancoConta = "Informe a conta.";

  return erros;
}
