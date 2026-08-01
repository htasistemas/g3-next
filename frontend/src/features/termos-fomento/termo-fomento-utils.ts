import type { AditivoTermoFomento, TermoFomentoPayload } from "@/types/termo-fomento";

export type TermoFomentoErros = Record<string, string>;

export function clonarTermoFomento(termo: TermoFomentoPayload): TermoFomentoPayload {
  return JSON.parse(JSON.stringify(termo)) as TermoFomentoPayload;
}

function formatarDataIso(valor?: string) {
  if (!valor) return "---";
  const [ano, mes, dia] = valor.split("-");
  if (!ano || !mes || !dia) return valor;
  return `${dia}/${mes}/${ano}`;
}

function validarDocumentoRelacionado(documento?: { nome?: string; dataUrl?: string }) {
  const erros: TermoFomentoErros = {};
  if (!documento?.nome?.trim()) erros["documentoPrincipal.nome"] = "Informe o nome do documento principal.";
  if (!documento?.dataUrl?.trim()) erros["documentoPrincipal.dataUrl"] = "Informe a URL ou arquivo do documento principal.";
  return erros;
}

function validarAditivo(aditivo: AditivoTermoFomento, indice: number) {
  const erros: TermoFomentoErros = {};
  if (!aditivo.tipoAditivo?.trim()) erros[`aditivos.${indice}.tipoAditivo`] = "Informe o tipo do aditivo.";
  if (!aditivo.dataAditivo) erros[`aditivos.${indice}.dataAditivo`] = "Informe a data do aditivo.";
  if (aditivo.novaDataFim && aditivo.dataAditivo && aditivo.novaDataFim < aditivo.dataAditivo) {
    erros[`aditivos.${indice}.novaDataFim`] = "A nova data de fim não pode ser menor que a data do aditivo.";
  }
  return erros;
}

export function validarTermoFomento(termo: TermoFomentoPayload, modo: "rascunho" | "envio" = "rascunho") {
  const erros: TermoFomentoErros = {};

  if (!termo.numeroTermo?.trim()) erros.numeroTermo = "Informe o número do termo.";
  if (!termo.tipoTermo?.trim()) erros.tipoTermo = "Informe o tipo do termo.";
  if (!termo.situacao?.trim()) erros.situacao = "Informe a situação do termo.";
  if (!termo.orgaoConcedente?.trim()) erros.orgaoConcedente = "Informe o órgão concedente.";
  if (!termo.dataAssinatura) erros.dataAssinatura = "Informe a data de assinatura.";
  if (!termo.dataInicioVigencia) erros.dataInicioVigencia = "Informe o início da vigência.";
  if (!termo.dataFimVigencia) erros.dataFimVigencia = "Informe o fim da vigência.";
  if (termo.dataInicioVigencia && termo.dataFimVigencia && termo.dataFimVigencia < termo.dataInicioVigencia) {
    erros.dataFimVigencia = "A data final não pode ser menor que a data inicial.";
  }
  if (!termo.descricaoObjeto?.trim()) erros.descricaoObjeto = "Informe a descrição do objeto.";
  if (!termo.responsavelInterno?.trim()) erros.responsavelInterno = "Informe o responsável interno.";
  if (termo.valorGlobal != null && termo.valorGlobal < 0) erros.valorGlobal = "Informe um valor global válido.";

  if (termo.documentosRelacionados?.some((documento) => !documento.nome?.trim())) {
    erros.documentosRelacionados = "Todos os documentos relacionados precisam ter nome.";
  }

  termo.aditivos?.forEach((aditivo, indice) => {
    Object.assign(erros, validarAditivo(aditivo, indice));
  });

  if (modo === "envio") {
    Object.assign(erros, validarDocumentoRelacionado(termo.termoDocumento ?? undefined));
  }

  return erros;
}

export function validarTermoFomentoParaImpressao(termo: TermoFomentoPayload) {
  return validarTermoFomento(termo, "envio");
}

export function formatarDataTermo(valor?: string) {
  return formatarDataIso(valor);
}
