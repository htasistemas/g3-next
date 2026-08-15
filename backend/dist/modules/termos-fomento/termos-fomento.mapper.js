import { toIsoDate, toStringId } from "../../utils/string-utils.js";
function mapDocumento(row) {
    return {
        id: toStringId(row.id),
        nome: row.nome,
        dataUrl: row.data_url ?? undefined,
        tipo: row.tipo_documento === "termo" || row.tipo_documento === "aditivo" ? row.tipo_documento : "outro"
    };
}
export function mapTermoFomentoToResponse(termo, aditivos, documentos) {
    const termoDocumento = documentos.find((item) => item.tipo_documento === "termo");
    const documentosRelacionados = documentos.filter((item) => item.tipo_documento !== "termo" && item.tipo_documento !== "aditivo");
    return {
        id: toStringId(termo.id),
        numeroTermo: termo.numero_termo,
        tipoTermo: termo.tipo_termo,
        referenciaTermo: termo.referencia_termo ?? undefined,
        responsavelIndicacao: termo.responsavel_indicacao ?? undefined,
        orgaoConcedente: termo.orgao_concedente ?? undefined,
        dataAssinatura: toIsoDate(termo.data_assinatura),
        dataInicioVigencia: toIsoDate(termo.data_inicio_vigencia),
        dataFimVigencia: toIsoDate(termo.data_fim_vigencia),
        situacao: termo.situacao,
        descricaoObjeto: termo.descricao_objeto ?? undefined,
        valorGlobal: termo.valor_global ?? undefined,
        responsavelInterno: termo.responsavel_interno ?? undefined,
        termoDocumento: termoDocumento ? mapDocumento(termoDocumento) : null,
        documentosRelacionados: documentosRelacionados.map(mapDocumento),
        aditivos: aditivos.map((aditivo) => {
            const anexo = documentos.find((doc) => doc.tipo_documento === "aditivo" && doc.aditivo_id === aditivo.id);
            return {
                id: toStringId(aditivo.id),
                tipoAditivo: aditivo.tipo_aditivo,
                dataAditivo: toIsoDate(aditivo.data_aditivo) ?? "",
                novaDataFim: toIsoDate(aditivo.nova_data_fim),
                novoValor: aditivo.novo_valor ?? undefined,
                observacoes: aditivo.observacoes ?? undefined,
                anexo: anexo ? mapDocumento(anexo) : null
            };
        })
    };
}
