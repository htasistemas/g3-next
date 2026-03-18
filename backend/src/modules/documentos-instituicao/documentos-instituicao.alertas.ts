import type { DocumentoSituacao } from "./documentos-instituicao.types.js";

export type DocumentoInstituicaoAlertaEmail = {
  id: string;
  tipoDocumento: string;
  orgaoEmissor: string;
  validade?: string;
  situacao?: DocumentoSituacao;
  gerarAlerta?: boolean;
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function criarReferenciaAlertaEmailDocumento(referencia = new Date()) {
  return `${referencia.getFullYear()}-${pad2(referencia.getMonth() + 1)}-${pad2(referencia.getDate())}`;
}

export function formatarDataAlertaEmailDocumento(valor?: string | null) {
  if (!valor) return "---";

  const normalizado = valor.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizado)) {
    const [ano, mes, dia] = normalizado.split("-");
    return `${dia}-${mes}-${ano}`;
  }

  const data = new Date(normalizado);
  if (Number.isNaN(data.getTime())) return normalizado;
  return `${pad2(data.getDate())}-${pad2(data.getMonth() + 1)}-${data.getFullYear()}`;
}

export function formatarSituacaoAlertaEmailDocumento(situacao?: DocumentoSituacao | null) {
  switch (situacao) {
    case "vencido":
      return "Vencido";
    case "vence_em_breve":
      return "A vencer";
    case "em_renovacao":
      return "Em renovacao";
    case "sem_vencimento":
      return "Sem vencimento";
    case "valido":
      return "Valido";
    default:
      return "Sem classificacao";
  }
}

export function deveEnviarAlertaEmailDocumento(
  documento: Pick<DocumentoInstituicaoAlertaEmail, "gerarAlerta" | "situacao">
) {
  if (documento.gerarAlerta === false) return false;
  return documento.situacao === "vencido" || documento.situacao === "vence_em_breve";
}

export function montarObservacaoHistoricoAlertaEmailDocumento(
  documento: Pick<DocumentoInstituicaoAlertaEmail, "situacao" | "validade">,
  referenciaIso = criarReferenciaAlertaEmailDocumento()
) {
  const dataReferencia = formatarDataAlertaEmailDocumento(referenciaIso);
  const validade = formatarDataAlertaEmailDocumento(documento.validade);

  if (documento.situacao === "vencido") {
    return `Alerta automatico de documento vencido enviado em ${dataReferencia}. Validade registrada: ${validade}.`;
  }

  return `Alerta automatico de documento a vencer enviado em ${dataReferencia}. Validade registrada: ${validade}.`;
}

export function montarMensagemAlertaEmailDocumentos(
  nomeUnidade: string,
  documentos: DocumentoInstituicaoAlertaEmail[],
  referenciaIso = criarReferenciaAlertaEmailDocumento()
) {
  const linhas = documentos.map((documento, indice) => {
    const validade = formatarDataAlertaEmailDocumento(documento.validade);
    return [
      `${indice + 1}. ${documento.tipoDocumento}`,
      `Orgao emissor: ${documento.orgaoEmissor || "---"}`,
      `Situacao: ${formatarSituacaoAlertaEmailDocumento(documento.situacao)}`,
      `Validade: ${validade}`
    ].join(" | ");
  });

  return [
    `O G3N identificou documentos institucionais que exigem atencao na unidade assistencial principal ${nomeUnidade}.`,
    "",
    `Referencia do alerta: ${formatarDataAlertaEmailDocumento(referenciaIso)}`,
    "",
    ...linhas,
    "",
    "Acesse a tela de Gestao de documentos para revisar e atualizar os registros."
  ].join("\n");
}
