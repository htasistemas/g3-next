import { toIsoDate, toStringId } from "../../utils/string-utils.js";
function parseDiasAntecedencia(value) {
    if (!value)
        return [];
    if (Array.isArray(value)) {
        return value.map((item) => Number(item)).filter((item) => Number.isFinite(item));
    }
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.map((item) => Number(item)).filter((item) => Number.isFinite(item));
            }
            return [];
        }
        catch {
            return [];
        }
    }
    return [];
}
function calcularSituacaoDocumento(row) {
    if (row.em_renovacao)
        return "em_renovacao";
    if (row.sem_vencimento || row.vencimento_indeterminado || !row.validade) {
        return "sem_vencimento";
    }
    const diasAlerta = Math.max(0, ...parseDiasAntecedencia(row.dias_antecedencia));
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const validade = new Date(row.validade);
    validade.setHours(0, 0, 0, 0);
    if (Number.isNaN(validade.getTime()))
        return "valido";
    if (validade < hoje)
        return "vencido";
    const alerta = new Date(hoje);
    alerta.setDate(alerta.getDate() + (diasAlerta || 30));
    if (validade <= alerta)
        return "vence_em_breve";
    return "valido";
}
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
        diasAntecedencia: parseDiasAntecedencia(row.dias_antecedencia),
        formaAlerta: row.forma_alerta ?? undefined,
        emRenovacao: row.em_renovacao,
        semVencimento: row.sem_vencimento,
        vencimentoIndeterminado: row.vencimento_indeterminado,
        situacao: calcularSituacaoDocumento(row),
        criadoEm: row.criado_em.toISOString(),
        atualizadoEm: row.atualizado_em.toISOString()
    };
}
export function mapDocumentoInstituicaoAnexoToResponse(row) {
    return {
        id: toStringId(row.id),
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
