import { AppError } from "../../shared/errors/app-error.js";
import {
  formatarEndereco,
  formatarNomeInstituicao,
  formatarNomePessoa,
  formatarTextoCurto,
  normalizarEspacos
} from "../../utils/text-formatter.js";
import type { PlanoTrabalhoInput } from "./planos-trabalho.types.js";

function uniq(values: string[]) {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

function somarValores(values: Array<number | null | undefined>) {
  return values.reduce<number>((acc, current) => acc + Number(current ?? 0), 0);
}

export function totalAplicacaoRecursos(input: PlanoTrabalhoInput) {
  return somarValores(input.aplicacaoRecursos.map((item) => item.valorTotal));
}

export function totalDesembolso(input: PlanoTrabalhoInput) {
  return somarValores(input.desembolso.map((item) => item.valorPrevisto));
}

export function normalizarPlanoTrabalhoInput(input: PlanoTrabalhoInput): PlanoTrabalhoInput {
  return {
    ...input,
    titulo: formatarTextoCurto(input.titulo),
    tipoParceria: formatarTextoCurto(input.tipoParceria),
    orgaoParceiro: formatarNomeInstituicao(input.orgaoParceiro),
    editalChamamento: input.editalChamamento ? formatarTextoCurto(input.editalChamamento) : undefined,
    responsavelTecnico: formatarNomePessoa(input.responsavelTecnico),
    responsavelLegal: formatarNomePessoa(input.responsavelLegal),
    numeroProcesso: input.numeroProcesso ? formatarTextoCurto(input.numeroProcesso) : undefined,
    razaoSocial: formatarNomeInstituicao(input.razaoSocial),
    nomeFantasia: input.nomeFantasia ? formatarNomeInstituicao(input.nomeFantasia) : undefined,
    logradouro: input.logradouro ? formatarEndereco(input.logradouro) : undefined,
    numero: input.numero ? normalizarEspacos(input.numero) : undefined,
    complemento: input.complemento ? formatarEndereco(input.complemento) : undefined,
    bairro: input.bairro ? formatarEndereco(input.bairro) : undefined,
    cidade: input.cidade ? formatarEndereco(input.cidade) : undefined,
    representanteLegal: formatarNomePessoa(input.representanteLegal),
    representanteCargo: input.representanteCargo
      ? formatarNomeInstituicao(input.representanteCargo)
      : undefined,
    bancoNome: input.bancoNome ? formatarNomeInstituicao(input.bancoNome) : undefined,
    bancoObservacao: input.bancoObservacao ? formatarTextoCurto(input.bancoObservacao) : undefined,
    historicoOsc: input.historicoOsc ? normalizarEspacos(input.historicoOsc) : undefined,
    finalidadeInstitucional: input.finalidadeInstitucional
      ? normalizarEspacos(input.finalidadeInstitucional)
      : undefined,
    experienciaAnterior: input.experienciaAnterior ? normalizarEspacos(input.experienciaAnterior) : undefined,
    conselhosCertificacoes: input.conselhosCertificacoes
      ? normalizarEspacos(input.conselhosCertificacoes)
      : undefined,
    publicoAtendidoAtual: input.publicoAtendidoAtual ? normalizarEspacos(input.publicoAtendidoAtual) : undefined,
    capacidadeTecnicaOperacional: input.capacidadeTecnicaOperacional
      ? normalizarEspacos(input.capacidadeTecnicaOperacional)
      : undefined,
    descricaoObjeto: normalizarEspacos(input.descricaoObjeto),
    areaAtuacao: formatarTextoCurto(input.areaAtuacao),
    localExecucao: formatarEndereco(input.localExecucao),
    abrangenciaTerritorial: input.abrangenciaTerritorial
      ? formatarTextoCurto(input.abrangenciaTerritorial)
      : undefined,
    publicoAlvo: normalizarEspacos(input.publicoAlvo),
    criteriosSelecao: input.criteriosSelecao ? normalizarEspacos(input.criteriosSelecao) : undefined,
    problemaSocial: normalizarEspacos(input.problemaSocial),
    causasConsequencias: input.causasConsequencias ? normalizarEspacos(input.causasConsequencias) : undefined,
    dadosIndicadores: input.dadosIndicadores ? normalizarEspacos(input.dadosIndicadores) : undefined,
    capacidadeExecucao: input.capacidadeExecucao ? normalizarEspacos(input.capacidadeExecucao) : undefined,
    impactoEsperado: input.impactoEsperado ? normalizarEspacos(input.impactoEsperado) : undefined,
    objetivoGeral: normalizarEspacos(input.objetivoGeral),
    formaAcompanhamento: input.formaAcompanhamento ? normalizarEspacos(input.formaAcompanhamento) : undefined,
    indicadoresMonitoramento: input.indicadoresMonitoramento
      ? normalizarEspacos(input.indicadoresMonitoramento)
      : undefined,
    periodicidadeMonitoramento: input.periodicidadeMonitoramento
      ? formatarTextoCurto(input.periodicidadeMonitoramento)
      : undefined,
    responsavelColetaDados: input.responsavelColetaDados
      ? formatarNomePessoa(input.responsavelColetaDados)
      : undefined,
    instrumentosMonitoramento: uniq(input.instrumentosMonitoramento ?? []).map((item) =>
      formatarTextoCurto(item)
    ),
    resultadoEsperadoMonitoramento: input.resultadoEsperadoMonitoramento
      ? normalizarEspacos(input.resultadoEsperadoMonitoramento)
      : undefined,
    evidenciasObrigatorias: input.evidenciasObrigatorias
      ? normalizarEspacos(input.evidenciasObrigatorias)
      : undefined,
    periodicidadePrestacao: input.periodicidadePrestacao
      ? formatarTextoCurto(input.periodicidadePrestacao)
      : undefined,
    documentosExigidos: input.documentosExigidos ? normalizarEspacos(input.documentosExigidos) : undefined,
    responsavelPrestacao: input.responsavelPrestacao
      ? formatarNomePessoa(input.responsavelPrestacao)
      : undefined,
    observacoesPrestacao: input.observacoesPrestacao
      ? normalizarEspacos(input.observacoesPrestacao)
      : undefined,
    localDeclaracao: input.localDeclaracao ? formatarEndereco(input.localDeclaracao) : undefined,
    nomeRepresentanteDeclaracao: input.nomeRepresentanteDeclaracao
      ? formatarNomePessoa(input.nomeRepresentanteDeclaracao)
      : undefined,
    cargoRepresentanteDeclaracao: input.cargoRepresentanteDeclaracao
      ? formatarNomeInstituicao(input.cargoRepresentanteDeclaracao)
      : undefined,
    aprovacaoInterna: input.aprovacaoInterna ? formatarTextoCurto(input.aprovacaoInterna) : undefined,
    situacaoAprovacao: input.situacaoAprovacao ? formatarTextoCurto(input.situacaoAprovacao) : undefined,
    observacaoAprovador: input.observacaoAprovador ? normalizarEspacos(input.observacaoAprovador) : undefined,
    metas: (input.metas ?? []).map((meta) => ({
      ...meta,
      numeroMeta: formatarTextoCurto(meta.numeroMeta),
      descricao: normalizarEspacos(meta.descricao),
      indicadorResultado: meta.indicadorResultado ? normalizarEspacos(meta.indicadorResultado) : undefined,
      unidadeMedida: meta.unidadeMedida ? formatarTextoCurto(meta.unidadeMedida) : undefined,
      meioVerificacao: meta.meioVerificacao ? normalizarEspacos(meta.meioVerificacao) : undefined,
      responsavel: meta.responsavel ? formatarNomePessoa(meta.responsavel) : undefined,
      situacao: meta.situacao ? formatarTextoCurto(meta.situacao) : undefined,
      etapas: (meta.etapas ?? []).map((etapa) => ({
        ...etapa,
        nome: formatarTextoCurto(etapa.nome),
        acaoExecutar: etapa.acaoExecutar ? normalizarEspacos(etapa.acaoExecutar) : undefined,
        descricaoDetalhada: etapa.descricaoDetalhada ? normalizarEspacos(etapa.descricaoDetalhada) : undefined,
        publicoAtendido: etapa.publicoAtendido ? normalizarEspacos(etapa.publicoAtendido) : undefined,
        unidade: etapa.unidade ? formatarTextoCurto(etapa.unidade) : undefined,
        local: etapa.local ? formatarEndereco(etapa.local) : undefined,
        documentoComprobatorioEsperado: etapa.documentoComprobatorioEsperado
          ? normalizarEspacos(etapa.documentoComprobatorioEsperado)
          : undefined,
        responsavel: etapa.responsavel ? formatarNomePessoa(etapa.responsavel) : undefined,
        situacao: etapa.situacao ? formatarTextoCurto(etapa.situacao) : undefined
      }))
    })),
    objetivosEspecificos: (input.objetivosEspecificos ?? []).map((objetivo) => ({
      ...objetivo,
      descricao: normalizarEspacos(objetivo.descricao),
      resultadoEsperado: objetivo.resultadoEsperado ? normalizarEspacos(objetivo.resultadoEsperado) : undefined,
      metasVinculadas: uniq(objetivo.metasVinculadas ?? []).map((item) => formatarTextoCurto(item))
    })),
    aplicacaoRecursos: (input.aplicacaoRecursos ?? []).map((item) => ({
      ...item,
      categoriaDespesa: formatarTextoCurto(item.categoriaDespesa),
      item: formatarTextoCurto(item.item),
      descricao: item.descricao ? normalizarEspacos(item.descricao) : undefined,
      unidade: item.unidade ? formatarTextoCurto(item.unidade) : undefined,
      fonteRecurso: item.fonteRecurso ? formatarTextoCurto(item.fonteRecurso) : undefined,
      metaNumero: item.metaNumero ? formatarTextoCurto(item.metaNumero) : undefined,
      etapaNome: item.etapaNome ? formatarTextoCurto(item.etapaNome) : undefined,
      naturezaDespesa: item.naturezaDespesa ? formatarTextoCurto(item.naturezaDespesa) : undefined,
      observacao: item.observacao ? normalizarEspacos(item.observacao) : undefined
    })),
    desembolso: (input.desembolso ?? []).map((item) => ({
      ...item,
      mesAno: item.mesAno.trim(),
      fonteRecurso: item.fonteRecurso ? formatarTextoCurto(item.fonteRecurso) : undefined,
      metaNumero: item.metaNumero ? formatarTextoCurto(item.metaNumero) : undefined,
      observacao: item.observacao ? normalizarEspacos(item.observacao) : undefined
    })),
    checklistPrestacao: (input.checklistPrestacao ?? []).map((item) => ({
      ...item,
      descricao: normalizarEspacos(item.descricao)
    }))
  };
}

export function validarConformidadePlano(input: PlanoTrabalhoInput) {
  const erros: string[] = [];

  if (!input.metas.length) erros.push("Cadastre ao menos uma meta antes de enviar para análise.");
  if (input.metas.some((meta) => !meta.indicadorResultado?.trim())) {
    erros.push("Todas as metas devem informar um indicador de resultado.");
  }
  if (input.metas.some((meta) => !meta.etapas.length)) {
    erros.push("Cada meta deve possuir pelo menos uma etapa ou fase cadastrada.");
  }
  if (input.metas.some((meta) => meta.etapas.some((etapa) => !etapa.responsavel?.trim()))) {
    erros.push("Todas as etapas devem possuir responsável.");
  }
  if (input.objetivosEspecificos.some((objetivo) => !(objetivo.metasVinculadas ?? []).length)) {
    erros.push("Todos os objetivos específicos devem estar vinculados a pelo menos uma meta.");
  }
  if (totalAplicacaoRecursos(input) <= 0) {
    erros.push("O plano de aplicação dos recursos deve possuir valor total maior que zero.");
  }
  if (Math.abs(totalAplicacaoRecursos(input) - totalDesembolso(input)) > 0.009) {
    erros.push("O total do cronograma de desembolso deve ser igual ao total do plano de aplicação.");
  }
  if (!(input.checklistPrestacao ?? []).some((item) => item.obrigatorio !== false)) {
    erros.push("Cadastre ao menos um documento obrigatório na prestação de contas.");
  }

  return erros;
}

export function garantirConformidadeParaEnvio(input: PlanoTrabalhoInput) {
  if (!["EM_ANALISE", "APROVADO", "EM_EXECUCAO", "CONCLUIDO"].includes(input.status)) {
    return;
  }

  const erros = validarConformidadePlano(input);
  if (erros.length) {
    throw new AppError(erros[0]!, 400);
  }
}
