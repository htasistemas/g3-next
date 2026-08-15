import { toIsoDate, toStringId } from "../../utils/string-utils.js";
import { calcularSituacaoDocumentoInstituicao, parseDiasAntecedenciaDocumentoInstituicao } from "./documentos-instituicao-status.js";
export function mapDocumentoInstituicaoToResponse(row) {
    return {
        id: toStringId(row.id),
        tipoDocumento: row.tipo_documento,
        orgaoEmissor: row.orgao_emissor,
        descricao: row.descricao ?? undefined,
        categoria: row.categoria ?? undefined,
        emissao: toIsoDate(row.emissao),
        validade: toIsoDate(row.validade),
        responsavelInterno: row.responsavel_interno ?? undefined,
        modoRenovacao: row.modo_renovacao ?? undefined,
        observacaoRenovacao: row.observacao_renovacao ?? undefined,
        gerarAlerta: row.gerar_alerta,
        diasAntecedencia: parseDiasAntecedenciaDocumentoInstituicao(row.dias_antecedencia),
        formaAlerta: row.forma_alerta ?? undefined,
        emRenovacao: row.em_renovacao,
        semVencimento: row.sem_vencimento,
        vencimentoIndeterminado: row.vencimento_indeterminado,
        situacao: calcularSituacaoDocumentoInstituicao(row),
        anexoQuantidade: row.anexo_quantidade ?? 0,
        criadoEm: row.criado_em.toISOString(),
        atualizadoEm: row.atualizado_em.toISOString()
    };
}
export function mapDocumentoInstituicaoAnexoToResponse(row) {
    return {
        id: toStringId(row.id),
        arquivoId: row.arquivo_id ? toStringId(row.arquivo_id) : undefined,
        documentoId: toStringId(row.documento_id),
        nomeArquivo: row.nome_arquivo,
        tipo: row.tipo,
        tipoMime: row.tipo_mime ?? undefined,
        tamanho: row.tamanho ?? undefined,
        dataUpload: toIsoDate(row.data_upload),
        usuario: row.usuario,
        arquivoUrl: row.caminho_arquivo ?? undefined,
        criadoEm: row.criado_em.toISOString()
    };
}
export function mapDocumentoInstituicaoHistoricoToResponse(row) {
    return {
        id: toStringId(row.id),
        documentoId: toStringId(row.documento_id),
        dataHora: row.data_hora.toISOString(),
        usuario: row.usuario,
        tipoAlteracao: row.tipo_alteracao,
        observacao: row.observacao ?? undefined,
        criadoEm: row.criado_em.toISOString()
    };
}
