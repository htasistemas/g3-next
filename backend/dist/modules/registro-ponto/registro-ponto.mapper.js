import { toIsoDate, toStringId } from "../../utils/string-utils.js";
import { calcularResumoExibicaoRegistroPonto } from "./registro-ponto-calculos.js";
function toNumber(value) {
    if (typeof value === "number")
        return value;
    if (typeof value === "bigint")
        return Number(value);
    return 0;
}
function normalizarHora(value) {
    if (!value)
        return undefined;
    return value.slice(0, 8);
}
function pad2(value) {
    return String(value).padStart(2, "0");
}
function formatarTimestampLocalBrasilia(value) {
    const ano = value.getFullYear();
    const mes = pad2(value.getMonth() + 1);
    const dia = pad2(value.getDate());
    const hora = pad2(value.getHours());
    const minuto = pad2(value.getMinutes());
    const segundo = pad2(value.getSeconds());
    return `${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}-03:00`;
}
function obterProximaBatida(item) {
    if (!item.entrada_1)
        return "Entrada 1";
    if (!item.saida_1)
        return "Saida 1";
    if (!item.entrada_2)
        return "Entrada 2";
    if (!item.saida_2)
        return "Saida 2";
    return undefined;
}
export function mapRegistroPontoRowToResponse(row) {
    const entrada_1 = normalizarHora(row.entrada_1);
    const saida_1 = normalizarHora(row.saida_1);
    const entrada_2 = normalizarHora(row.entrada_2);
    const saida_2 = normalizarHora(row.saida_2);
    const resumoExibicao = calcularResumoExibicaoRegistroPonto({
        previsto: {
            entrada_1: row.horario_entrada_1,
            saida_1: row.horario_saida_1,
            entrada_2: row.horario_entrada_2,
            saida_2: row.horario_saida_2
        },
        real: {
            entrada_1,
            saida_1,
            entrada_2,
            saida_2
        },
        dataReferencia: row.data_referencia,
        hoje: new Date()
    });
    return {
        id: toStringId(row.id),
        usuario_id: toStringId(row.usuario_id),
        usuario_nome: row.usuario_nome?.trim() || row.usuario_login,
        usuario_login: row.usuario_login,
        unidade: row.unidade ?? undefined,
        data: toIsoDate(row.data_referencia) ?? "",
        entrada_1,
        saida_1,
        entrada_2,
        saida_2,
        horas_extras_minutos: resumoExibicao.horas_extras_minutos,
        horas_extras_pendentes_minutos: toNumber(row.horas_extras_pendentes_minutos),
        horas_extras_autorizadas_minutos: toNumber(row.horas_extras_autorizadas_minutos),
        horas_extras_negadas_minutos: toNumber(row.horas_extras_negadas_minutos),
        horas_extras_compensadas_minutos: toNumber(row.horas_extras_compensadas_minutos),
        horas_extras_pagas_minutos: toNumber(row.horas_extras_pagas_minutos),
        banco_horas_minutos: resumoExibicao.banco_horas_minutos,
        faltas_minutos: resumoExibicao.faltas_minutos,
        atrasos_minutos: resumoExibicao.atrasos_minutos,
        observacoes: row.observacoes ?? undefined,
        ocorrencias: row.ocorrencias?.filter(Boolean) ?? [],
        ocorrencias_descricao: row.ocorrencias_descricao?.filter(Boolean) ?? [],
        alterado_manualmente: !!row.alterado_manualmente,
        status: row.status_registro,
        proxima_batida: obterProximaBatida({ entrada_1, saida_1, entrada_2, saida_2 }),
        total_trabalhado_minutos: resumoExibicao.total_trabalhado_minutos,
        criado_em: formatarTimestampLocalBrasilia(row.criado_em),
        atualizado_em: formatarTimestampLocalBrasilia(row.atualizado_em)
    };
}
export function mapHistoricoRowToResponse(row) {
    return {
        id: toStringId(row.id),
        acao: row.acao,
        usuario_id: row.usuario_id ? toStringId(row.usuario_id) : undefined,
        usuario_nome: row.usuario_nome ?? undefined,
        justificativa: row.justificativa ?? undefined,
        observacao: row.observacao ?? undefined,
        ip_origem: row.ip_origem ?? undefined,
        dados_antes: row.dados_antes ?? undefined,
        dados_depois: row.dados_depois ?? undefined,
        criado_em: formatarTimestampLocalBrasilia(row.criado_em)
    };
}
export function mapOcorrenciaRowToResponse(row) {
    return {
        id: toStringId(row.id),
        tipo: row.tipo,
        descricao: row.descricao ?? undefined,
        origem: row.origem,
        criado_por_nome: row.criado_por_nome ?? undefined,
        criado_em: formatarTimestampLocalBrasilia(row.criado_em)
    };
}
export function mapUsuarioCatalogoRowToResponse(row) {
    return {
        id: toStringId(row.id),
        nome: row.nome?.trim() || row.nome_usuario,
        login: row.nome_usuario,
        unidade: row.unidade ?? undefined
    };
}
