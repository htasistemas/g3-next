import { toIsoDate, toStringId } from "../../utils/string-utils.js";
import type { OficioImagemRow, OficioRow, OficioTramiteRow } from "./oficios.types.js";

export function mapOficioTramiteToResponse(row: OficioTramiteRow) {
  return {
    id: toStringId(row.id),
    data: toIsoDate(row.data),
    origem: row.origem ?? undefined,
    destino: row.destino ?? undefined,
    responsavel: row.responsavel ?? undefined,
    acao: row.acao,
    observacoes: row.observacoes ?? undefined
  };
}

export function mapOficioToResponse(row: OficioRow, tramites: OficioTramiteRow[]) {
  return {
    id: toStringId(row.id),
    pdfAssinadoNome: row.pdf_assinado_nome ?? undefined,
    pdfAssinadoUrl: row.pdf_assinado_conteudo ? `/api/oficios/${row.id.toString()}/pdf-assinado` : undefined,
    identificacao: {
      tipo: row.tipo === "recebimento" ? "recebimento" : "emissao",
      numero: row.numero,
      data: toIsoDate(row.data) ?? "",
      setorOrigem: row.setor_origem,
      responsavel: row.responsavel,
      destinatario: row.destinatario,
      destinatarioResponsavel: row.destinatario_responsavel,
      destinatarioCargo: row.destinatario_cargo,
      meioEnvio: row.meio_envio,
      prazoResposta: row.prazo_resposta ?? undefined,
      classificacao: row.classificacao ?? undefined
    },
    conteudo: {
      razaoSocial: row.razao_social,
      logoUrl: row.logo_url ?? undefined,
      titulo: row.titulo ?? undefined,
      saudacao: row.saudacao ?? undefined,
      para: row.para ?? undefined,
      cargoPara: row.cargo_para ?? undefined,
      assunto: row.assunto,
      corpo: row.corpo,
      finalizacao: row.finalizacao ?? undefined,
      assinaturaNome: row.assinatura_nome ?? undefined,
      assinaturaCargo: row.assinatura_cargo ?? undefined,
      rodape: row.rodape ?? undefined
    },
    protocolo: {
      status: row.status,
      protocoloEnvio: row.protocolo_envio ?? undefined,
      dataEnvio: toIsoDate(row.data_envio),
      protocoloRecebimento: row.protocolo_recebimento ?? undefined,
      dataRecebimento: toIsoDate(row.data_recebimento),
      proximoDestino: row.proximo_destino ?? undefined,
      observacoes: row.observacoes ?? undefined
    },
    tramites: tramites.map(mapOficioTramiteToResponse)
  };
}

export function mapOficioImagemToResponse(row: OficioImagemRow) {
  return {
    id: toStringId(row.id),
    oficioId: toStringId(row.oficio_id),
    nomeArquivo: row.nome_arquivo,
    tipoMime: row.tipo_mime,
    conteudoBase64: row.conteudo_base64,
    ordem: row.ordem
  };
}
