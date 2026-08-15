import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toIsoDate, toStringId } from "../../../utils/string-utils.js";
import { calcularDesviosRegistroPonto } from "../registro-ponto-calculos.js";
import { mapHistoricoRowToResponse, mapOcorrenciaRowToResponse, mapRegistroPontoRowToResponse, mapUsuarioCatalogoRowToResponse } from "../registro-ponto.mapper.js";
import { ensureRegistroPontoEstrutura } from "./registro-ponto-estrutura.repository.js";
const SEQUENCIA_BATIDAS = ["ENTRADA_1", "SAIDA_1", "ENTRADA_2", "SAIDA_2"];
const CAMPOS_HORARIO = ["entrada_1", "saida_1", "entrada_2", "saida_2"];
const JORNADA_PADRAO_MINUTOS = 8 * 60;
const ESPERA_BATIDA_SEGUNDOS = 15;
const BRASILIA_TIME_ZONE = "America/Sao_Paulo";
const formatterBrasilia = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRASILIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
});
function safeStringify(value) {
    return JSON.stringify(value, (_key, item) => (typeof item === "bigint" ? item.toString() : item));
}
function normalizarIp(ip) {
    if (!ip)
        return undefined;
    const valor = ip.trim();
    if (!valor)
        return undefined;
    if (valor.includes(",")) {
        const [primeiro] = valor.split(",");
        return normalizarIp(primeiro);
    }
    if (valor.startsWith("::ffff:")) {
        return valor.replace("::ffff:", "");
    }
    return valor;
}
function splitLista(texto) {
    if (!texto)
        return [];
    return texto
        .split(/[;,\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
}
function ipv4ParaNumero(ip) {
    const partes = ip.split(".");
    if (partes.length !== 4)
        return null;
    let numero = 0;
    for (const parte of partes) {
        const valor = Number(parte);
        if (!Number.isInteger(valor) || valor < 0 || valor > 255)
            return null;
        numero = numero * 256 + valor;
    }
    return numero;
}
function ipDentroDaRede(ip, cidr) {
    const [redeIp, mascaraTexto] = cidr.split("/");
    const mascara = Number(mascaraTexto);
    if (!redeIp || !Number.isInteger(mascara) || mascara < 0 || mascara > 32) {
        return false;
    }
    const ipNumero = ipv4ParaNumero(ip);
    const redeNumero = ipv4ParaNumero(redeIp);
    if (ipNumero === null || redeNumero === null) {
        return false;
    }
    if (mascara === 0)
        return true;
    const mask = (0xffffffff << (32 - mascara)) >>> 0;
    return (ipNumero & mask) === (redeNumero & mask);
}
function toNumber(value) {
    if (typeof value === "number")
        return value;
    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed))
            return parsed;
    }
    return undefined;
}
function toMinutes(hora) {
    if (!hora)
        return null;
    const [hh, mm] = hora.split(":").map((item) => Number(item));
    if (!Number.isInteger(hh) || !Number.isInteger(mm))
        return null;
    return hh * 60 + mm;
}
function toComparableLocalMs(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()).getTime();
}
function obterCarimboBrasilia(baseDate = new Date()) {
    const partes = formatterBrasilia.formatToParts(baseDate);
    const valores = Object.fromEntries(partes
        .filter((item) => item.type !== "literal")
        .map((item) => [item.type, item.value]));
    const data = `${valores.year}-${valores.month}-${valores.day}`;
    const hora = `${valores.hour}:${valores.minute}:${valores.second}`;
    return {
        data,
        hora,
        timestamp: `${data} ${hora}`,
        comparavelMs: new Date(Number(valores.year), Number(valores.month) - 1, Number(valores.day), Number(valores.hour), Number(valores.minute), Number(valores.second), 0).getTime()
    };
}
function normalizarHorarioCurto(value) {
    if (!value)
        return undefined;
    return value.slice(0, 5);
}
function diferencaMinutos(inicio, fim) {
    const inicioMinutos = toMinutes(inicio);
    const fimMinutos = toMinutes(fim);
    if (inicioMinutos === null || fimMinutos === null)
        return 0;
    return Math.max(0, fimMinutos - inicioMinutos);
}
function extrairHorarioEntradaReferencia(horarioFuncionamento) {
    if (!horarioFuncionamento)
        return 8 * 60;
    const match = horarioFuncionamento.match(/(\d{1,2}):(\d{2})/);
    if (!match)
        return 8 * 60;
    const horas = Number(match[1]);
    const minutos = Number(match[2]);
    if (!Number.isInteger(horas) || !Number.isInteger(minutos))
        return 8 * 60;
    return horas * 60 + minutos;
}
function calcularDistanciaMetros(latitudeA, longitudeA, latitudeB, longitudeB) {
    const toRad = (value) => (value * Math.PI) / 180;
    const raioTerra = 6371000;
    const dLat = toRad(latitudeB - latitudeA);
    const dLon = toRad(longitudeB - longitudeA);
    const lat1 = toRad(latitudeA);
    const lat2 = toRad(latitudeB);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return raioTerra * c;
}
export class RegistroPontoRepository {
    async listar(filters, ator) {
        await ensureRegistroPontoEstrutura(prisma);
        const usuarioId = ator.id;
        if (!usuarioId) {
            throw new AppError("Usuario autenticado invalido.", 401);
        }
        const where = [];
        let usuarioIdFiltro = usuarioId;
        if (this.isAdmin(ator) && filters.usuario_id) {
            if (!/^\d+$/.test(filters.usuario_id)) {
                throw new AppError("Funcionario informado para o espelho de ponto e invalido.", 400);
            }
            usuarioIdFiltro = BigInt(filters.usuario_id);
        }
        where.push(Prisma.sql `AND r.usuario_id = ${usuarioIdFiltro}`);
        // Registros antigos podem ter sido criados antes da coluna tenant_id existir.
        // O usuário já está limitado ao tenant autenticado, então aceitamos esses
        // registros legados somente quando o tenant do próprio registro está nulo.
        where.push(Prisma.sql `AND COALESCE(r.tenant_id::text, u.tenant_id::text) = ${ator.tenant_id}`);
        where.push(Prisma.sql `AND u.tenant_id::text = ${ator.tenant_id}`);
        if (filters.data_inicial) {
            where.push(Prisma.sql `AND r.data_referencia >= CAST(${filters.data_inicial} AS DATE)`);
        }
        if (filters.data_final) {
            where.push(Prisma.sql `AND r.data_referencia <= CAST(${filters.data_final} AS DATE)`);
        }
        if (filters.somente_alterados) {
            where.push(Prisma.sql `AND r.alterado_manualmente = TRUE`);
        }
        if (filters.status === "COMPLETO") {
            where.push(Prisma.sql `AND r.entrada_1 IS NOT NULL AND r.saida_1 IS NOT NULL AND r.entrada_2 IS NOT NULL AND r.saida_2 IS NOT NULL`);
        }
        if (filters.status === "INCOMPLETO") {
            where.push(Prisma.sql `AND (r.entrada_1 IS NULL OR r.saida_1 IS NULL OR r.entrada_2 IS NULL OR r.saida_2 IS NULL)`);
        }
        if (filters.ocorrencia) {
            where.push(Prisma.sql `
          AND EXISTS (
            SELECT 1 FROM registro_ponto_ocorrencia ocf
            WHERE ocf.registro_ponto_id = r.id
              AND ocf.tipo ILIKE ${`%${filters.ocorrencia}%`}
          )
        `);
        }
        if (filters.somente_inconsistencias) {
            where.push(Prisma.sql `
          AND EXISTS (
            SELECT 1 FROM registro_ponto_ocorrencia oci
            WHERE oci.registro_ponto_id = r.id
              AND oci.tipo IN ('INCONSISTENCIA_SEQUENCIA', 'ESQUECIMENTO_BATIDA')
          )
        `);
        }
        const whereClause = where.length === 0
            ? Prisma.empty
            : where.length === 1
                ? where[0]
                : Prisma.sql `${Prisma.join(where, " ")}`;
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        r.id,
        r.usuario_id,
        u.nome AS usuario_nome,
        u.nome_usuario AS usuario_login,
        u.unidade,
        u.horario_entrada_1::text,
        u.horario_saida_1::text,
        u.horario_entrada_2::text,
        u.horario_saida_2::text,
        r.data_referencia,
        r.entrada_1::text,
        r.saida_1::text,
        r.entrada_2::text,
        r.saida_2::text,
        r.horas_extras_minutos,
        r.horas_extras_pendentes_minutos,
        r.horas_extras_autorizadas_minutos,
        r.horas_extras_negadas_minutos,
        r.horas_extras_compensadas_minutos,
        r.horas_extras_pagas_minutos,
        r.banco_horas_minutos,
        r.faltas_minutos,
        r.atrasos_minutos,
        r.observacoes,
        r.alterado_manualmente,
        CASE
          WHEN r.entrada_1 IS NOT NULL
            AND r.saida_1 IS NOT NULL
            AND r.entrada_2 IS NOT NULL
            AND r.saida_2 IS NOT NULL
          THEN 'COMPLETO'
          ELSE 'INCOMPLETO'
        END AS status_registro,
        COALESCE(ARRAY_REMOVE(ARRAY_AGG(DISTINCT oc.tipo), NULL), ARRAY[]::text[]) AS ocorrencias,
        (
          GREATEST(0, COALESCE(EXTRACT(EPOCH FROM (r.saida_1 - r.entrada_1)) / 60, 0)::integer)
          + GREATEST(0, COALESCE(EXTRACT(EPOCH FROM (r.saida_2 - r.entrada_2)) / 60, 0)::integer)
        )::integer AS total_trabalhado_minutos,
        r.criado_em,
        r.atualizado_em
      FROM registro_ponto r
      INNER JOIN usuarios u ON u.id = r.usuario_id
      LEFT JOIN registro_ponto_ocorrencia oc ON oc.registro_ponto_id = r.id
      WHERE 1 = 1
      ${whereClause}
      GROUP BY
        r.id,
        r.usuario_id,
        u.nome,
        u.nome_usuario,
        u.unidade,
        u.horario_entrada_1,
        u.horario_saida_1,
        u.horario_entrada_2,
        u.horario_saida_2,
        r.data_referencia,
        r.entrada_1,
        r.saida_1,
        r.entrada_2,
        r.saida_2,
        r.horas_extras_minutos,
        r.horas_extras_pendentes_minutos,
        r.horas_extras_autorizadas_minutos,
        r.horas_extras_negadas_minutos,
        r.horas_extras_compensadas_minutos,
        r.horas_extras_pagas_minutos,
        r.banco_horas_minutos,
        r.faltas_minutos,
        r.atrasos_minutos,
        r.observacoes,
        r.alterado_manualmente,
        r.criado_em,
        r.atualizado_em
      ORDER BY r.data_referencia DESC, r.id DESC
      LIMIT 500
    `);
        return rows.map(mapRegistroPontoRowToResponse);
    }
    async listarEspelho(filters, ator) {
        const registros = await this.listar(filters, ator);
        const hojeIso = obterCarimboBrasilia().data;
        const periodoFechado = !!filters.data_final && filters.data_final < hojeIso;
        const totais = registros.reduce((acc, item) => {
            acc.horas_extras_minutos += item.horas_extras_minutos;
            acc.horas_extras_pendentes_minutos += item.horas_extras_pendentes_minutos;
            acc.horas_extras_autorizadas_minutos += item.horas_extras_autorizadas_minutos;
            acc.horas_extras_negadas_minutos += item.horas_extras_negadas_minutos;
            acc.horas_extras_compensadas_minutos += item.horas_extras_compensadas_minutos;
            acc.horas_extras_pagas_minutos += item.horas_extras_pagas_minutos;
            acc.banco_horas_minutos += item.banco_horas_minutos;
            acc.faltas_minutos += item.faltas_minutos;
            acc.atrasos_minutos += item.atrasos_minutos;
            acc.total_trabalhado_minutos += item.total_trabalhado_minutos;
            if (item.alterado_manualmente) {
                acc.total_ajustes += 1;
            }
            return acc;
        }, {
            horas_extras_minutos: 0,
            horas_extras_pendentes_minutos: 0,
            horas_extras_autorizadas_minutos: 0,
            horas_extras_negadas_minutos: 0,
            horas_extras_compensadas_minutos: 0,
            horas_extras_pagas_minutos: 0,
            banco_horas_minutos: 0,
            faltas_minutos: 0,
            atrasos_minutos: 0,
            total_trabalhado_minutos: 0,
            total_dias: registros.length,
            total_ajustes: 0
        });
        return {
            registros,
            totais,
            periodo: {
                data_inicial: filters.data_inicial ?? null,
                data_final: filters.data_final ?? null,
                fechado: periodoFechado
            }
        };
    }
    async listarUsuarios(termo, tenantId) {
        await ensureRegistroPontoEstrutura(prisma);
        const whereTermo = termo?.trim();
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        u.id,
        u.nome,
        u.nome_usuario,
        u.unidade
      FROM usuarios u
      WHERE u.deletado_em IS NULL
        AND COALESCE(u.status, 'ATIVO') = 'ATIVO'
        AND u.tenant_id::text = ${tenantId}
        AND (
          ${whereTermo ? Prisma.sql `u.nome ILIKE ${`%${whereTermo}%`} OR u.nome_usuario ILIKE ${`%${whereTermo}%`}` : Prisma.sql `TRUE`}
        )
      ORDER BY u.nome ASC NULLS LAST, u.nome_usuario ASC
      LIMIT 50
    `);
        return rows.map(mapUsuarioCatalogoRowToResponse);
    }
    async buscarHorarioUsuario(ator) {
        await ensureRegistroPontoEstrutura(prisma);
        if (!ator.id) {
            throw new AppError("Usuario autenticado invalido.", 401);
        }
        const usuario = await this.buscarHorarioUsuarioTx(prisma, ator.id, ator.tenant_id);
        if (!usuario) {
            throw new AppError("Usuario autenticado nao encontrado.", 404);
        }
        return {
            horario_entrada_1: normalizarHorarioCurto(usuario.horario_entrada_1),
            horario_saida_1: normalizarHorarioCurto(usuario.horario_saida_1),
            horario_entrada_2: normalizarHorarioCurto(usuario.horario_entrada_2),
            horario_saida_2: normalizarHorarioCurto(usuario.horario_saida_2),
            jornada_configurada: !!(usuario.horario_entrada_1 ||
                usuario.horario_saida_1 ||
                usuario.horario_entrada_2 ||
                usuario.horario_saida_2)
        };
    }
    async salvarHorarioUsuario(input, ator, origem) {
        await ensureRegistroPontoEstrutura(prisma);
        if (!ator.id) {
            throw new AppError("Usuario autenticado invalido.", 401);
        }
        return prisma.$transaction(async (tx) => {
            const antes = await this.buscarHorarioUsuarioTx(tx, ator.id, ator.tenant_id);
            if (!antes) {
                throw new AppError("Usuario autenticado nao encontrado.", 404);
            }
            await tx.$executeRaw(Prisma.sql `
        UPDATE usuarios
        SET
          horario_entrada_1 = CAST(${input.horario_entrada_1 ?? null} AS TIME),
          horario_saida_1 = CAST(${input.horario_saida_1 ?? null} AS TIME),
          horario_entrada_2 = CAST(${input.horario_entrada_2 ?? null} AS TIME),
          horario_saida_2 = CAST(${input.horario_saida_2 ?? null} AS TIME)
        WHERE id = ${ator.id}
      `);
            const depois = await this.buscarHorarioUsuarioTx(tx, ator.id, ator.tenant_id);
            if (!depois) {
                throw new AppError("Usuario autenticado nao encontrado.", 404);
            }
            const resposta = {
                horario_entrada_1: normalizarHorarioCurto(depois.horario_entrada_1),
                horario_saida_1: normalizarHorarioCurto(depois.horario_saida_1),
                horario_entrada_2: normalizarHorarioCurto(depois.horario_entrada_2),
                horario_saida_2: normalizarHorarioCurto(depois.horario_saida_2),
                jornada_configurada: !!(depois.horario_entrada_1 ||
                    depois.horario_saida_1 ||
                    depois.horario_entrada_2 ||
                    depois.horario_saida_2)
            };
            await this.registrarAuditoriaTx(tx, {
                registro_ponto_id: null,
                registro_ponto_batida_id: null,
                acao: "CONFIGURACAO_HORARIO_TRABALHO",
                ator,
                origem,
                justificativa: undefined,
                observacao: "Atualizacao dos horarios de trabalho do usuario.",
                dados_antes: antes
                    ? {
                        horario_entrada_1: normalizarHorarioCurto(antes.horario_entrada_1),
                        horario_saida_1: normalizarHorarioCurto(antes.horario_saida_1),
                        horario_entrada_2: normalizarHorarioCurto(antes.horario_entrada_2),
                        horario_saida_2: normalizarHorarioCurto(antes.horario_saida_2)
                    }
                    : null,
                dados_depois: resposta
            });
            return resposta;
        });
    }
    async buscarAlertaPendencia(ator) {
        await ensureRegistroPontoEstrutura(prisma);
        if (!ator.id) {
            throw new AppError("Usuario autenticado invalido.", 401);
        }
        const agoraBrasilia = obterCarimboBrasilia();
        const usuario = await this.buscarHorarioUsuarioTx(prisma, ator.id, ator.tenant_id);
        if (!usuario) {
            throw new AppError("Usuario autenticado nao encontrado.", 404);
        }
        const agenda = [
            { campo: "entrada_1", rotulo: "Entrada 1", horario: normalizarHorarioCurto(usuario.horario_entrada_1) },
            { campo: "saida_1", rotulo: "Saída 1", horario: normalizarHorarioCurto(usuario.horario_saida_1) },
            { campo: "entrada_2", rotulo: "Entrada 2", horario: normalizarHorarioCurto(usuario.horario_entrada_2) },
            { campo: "saida_2", rotulo: "Saída 2", horario: normalizarHorarioCurto(usuario.horario_saida_2) }
        ].filter((item) => !!item.horario);
        if (!agenda.length) {
            return { exibir_alerta: false };
        }
        const [registroHoje] = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        usuario_id,
        data_referencia,
        entrada_1::text,
        saida_1::text,
        entrada_2::text,
        saida_2::text,
        observacoes
      FROM registro_ponto
      WHERE usuario_id = ${ator.id}
        AND tenant_id::text = ${ator.tenant_id}
        AND data_referencia = CAST(${agoraBrasilia.data} AS DATE)
      LIMIT 1
    `);
        const horaAtualMinutos = toMinutes(agoraBrasilia.hora);
        if (horaAtualMinutos === null) {
            return { exibir_alerta: false };
        }
        for (const item of agenda) {
            const horarioPrevistoMinutos = toMinutes(item.horario);
            const valorRegistrado = registroHoje?.[item.campo];
            if (horarioPrevistoMinutos === null || valorRegistrado) {
                continue;
            }
            if (horaAtualMinutos >= horarioPrevistoMinutos) {
                return {
                    exibir_alerta: true,
                    data_referencia: agoraBrasilia.data,
                    campo: item.campo,
                    rotulo_batida: item.rotulo,
                    horario_previsto: item.horario,
                    mensagem: `O ponto de ${item.rotulo.toLowerCase()} previsto para ${item.horario} ainda nao foi registrado. Deseja registrar agora?`
                };
            }
        }
        return { exibir_alerta: false };
    }
    async buscarConfiguracaoHoraExtra(ator) {
        await ensureRegistroPontoEstrutura(prisma);
        return this.buscarConfiguracaoHoraExtraTx(prisma, ator.tenant_id);
    }
    async salvarConfiguracaoHoraExtra(input, ator, origem) {
        await ensureRegistroPontoEstrutura(prisma);
        if (!this.isAdmin(ator)) {
            throw new AppError("Somente administradores podem alterar a configuracao de hora extra.", 403);
        }
        if (!ator.id) {
            throw new AppError("Usuario autenticado invalido.", 401);
        }
        return prisma.$transaction(async (tx) => {
            const antes = await this.buscarConfiguracaoHoraExtraTx(tx, ator.tenant_id);
            await tx.$executeRaw(Prisma.sql `
        INSERT INTO registro_ponto_configuracao (
          tenant_id,
          tolerancia_entrada_antecipada_minutos,
          exigir_autorizacao_hora_extra_antecipada,
          limite_hora_extra_diaria_minutos,
          permitir_solicitacao_hora_extra_pelo_funcionario,
          mensagem_ciencia_hora_extra,
          criado_em,
          atualizado_em
        ) VALUES (
          CAST(${ator.tenant_id} AS UUID),
          ${input.tolerancia_entrada_antecipada_minutos},
          ${input.exigir_autorizacao_hora_extra_antecipada},
          ${input.limite_hora_extra_diaria_minutos},
          ${input.permitir_solicitacao_hora_extra_pelo_funcionario},
          ${input.mensagem_ciencia_hora_extra},
          NOW(),
          NOW()
        )
        ON CONFLICT (tenant_id)
        DO UPDATE SET
          tolerancia_entrada_antecipada_minutos = EXCLUDED.tolerancia_entrada_antecipada_minutos,
          exigir_autorizacao_hora_extra_antecipada = EXCLUDED.exigir_autorizacao_hora_extra_antecipada,
          limite_hora_extra_diaria_minutos = EXCLUDED.limite_hora_extra_diaria_minutos,
          permitir_solicitacao_hora_extra_pelo_funcionario = EXCLUDED.permitir_solicitacao_hora_extra_pelo_funcionario,
          mensagem_ciencia_hora_extra = EXCLUDED.mensagem_ciencia_hora_extra,
          atualizado_em = NOW()
      `);
            const depois = await this.buscarConfiguracaoHoraExtraTx(tx, ator.tenant_id);
            await this.registrarAuditoriaTx(tx, {
                registro_ponto_id: null,
                registro_ponto_batida_id: null,
                acao: "CONFIGURACAO_HORA_EXTRA",
                ator,
                origem,
                justificativa: undefined,
                observacao: "Atualizacao da configuracao de hora extra antecipada.",
                dados_antes: antes,
                dados_depois: depois
            });
            return depois;
        });
    }
    async listarHorasExtras(filters, ator) {
        await ensureRegistroPontoEstrutura(prisma);
        const where = [Prisma.sql `h.tenant_id::text = ${ator.tenant_id}`];
        if (filters.data_inicial) {
            where.push(Prisma.sql `h.data_referencia >= CAST(${filters.data_inicial} AS DATE)`);
        }
        if (filters.data_final) {
            where.push(Prisma.sql `h.data_referencia <= CAST(${filters.data_final} AS DATE)`);
        }
        if (filters.funcionario) {
            where.push(Prisma.sql `(u.nome ILIKE ${`%${filters.funcionario}%`} OR u.nome_usuario ILIKE ${`%${filters.funcionario}%`})`);
        }
        if (filters.setor) {
            where.push(Prisma.sql `u.setor ILIKE ${`%${filters.setor}%`}`);
        }
        if (filters.status && filters.status !== "TODOS") {
            where.push(Prisma.sql `h.status = ${filters.status}`);
        }
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        h.id,
        h.registro_ponto_id,
        h.registro_ponto_batida_id,
        h.usuario_id,
        u.nome AS usuario_nome,
        u.nome_usuario AS usuario_login,
        u.unidade,
        u.setor,
        h.data_referencia,
        h.campo_batida,
        h.horario_previsto::text,
        h.horario_real::text,
        h.minutos_excedentes,
        h.status::text AS status,
        h.justificativa_funcionario,
        h.ciencia_registrada,
        h.ciencia_em,
        h.ciencia_usuario_nome,
        h.gestor_id,
        h.gestor_nome,
        h.gestor_justificativa,
        h.minutos_aprovados,
        h.minutos_negados,
        h.criado_em,
        h.atualizado_em
      FROM registro_ponto_hora_extra h
      INNER JOIN usuarios u ON u.id = h.usuario_id
      WHERE ${Prisma.join(where, " AND ")}
      ORDER BY h.data_referencia DESC, h.id DESC
      LIMIT 500
    `);
        const registros = rows.map((row) => this.mapHoraExtraRowToResponse(row));
        const totais = registros.reduce((acc, item) => {
            switch (item.status) {
                case "EXTRA_PENDENTE_AUTORIZACAO":
                    acc.total_pendentes_minutos += item.minutos_excedentes;
                    break;
                case "EXTRA_AUTORIZADA":
                    acc.total_autorizadas_minutos += item.minutos_aprovados;
                    acc.saldo_banco_horas_aprovado_minutos += item.minutos_aprovados;
                    break;
                case "EXTRA_NEGADA":
                    acc.total_negadas_minutos += item.minutos_negados;
                    break;
                case "EXTRA_COMPENSADA_BANCO":
                    acc.total_compensadas_minutos += item.minutos_aprovados;
                    acc.saldo_banco_horas_aprovado_minutos += item.minutos_aprovados;
                    break;
                case "EXTRA_PAGA_FOLHA":
                    acc.total_pagas_minutos += item.minutos_aprovados;
                    break;
                default:
                    break;
            }
            return acc;
        }, {
            total_pendentes_minutos: 0,
            total_autorizadas_minutos: 0,
            total_negadas_minutos: 0,
            total_compensadas_minutos: 0,
            total_pagas_minutos: 0,
            saldo_banco_horas_aprovado_minutos: 0
        });
        return { registros, totais };
    }
    async registrarCienciaHoraExtra(horaExtraIdRaw, input, ator, origem) {
        await ensureRegistroPontoEstrutura(prisma);
        if (!ator.id) {
            throw new AppError("Usuario autenticado invalido.", 401);
        }
        const horaExtraId = this.parseId(horaExtraIdRaw, "Hora extra");
        return prisma.$transaction(async (tx) => {
            const registro = await tx.$queryRaw(Prisma.sql `
        SELECT
          h.id,
          h.registro_ponto_id,
          h.registro_ponto_batida_id,
          h.usuario_id,
          u.nome AS usuario_nome,
          u.nome_usuario AS usuario_login,
          u.unidade,
          u.setor,
          h.data_referencia,
          h.campo_batida,
          h.horario_previsto::text,
          h.horario_real::text,
          h.minutos_excedentes,
          h.status::text AS status,
          h.justificativa_funcionario,
          h.ciencia_registrada,
          h.ciencia_em,
          h.ciencia_usuario_nome,
          h.gestor_id,
          h.gestor_nome,
          h.gestor_justificativa,
          h.minutos_aprovados,
          h.minutos_negados,
          h.criado_em,
          h.atualizado_em
        FROM registro_ponto_hora_extra h
        INNER JOIN usuarios u ON u.id = h.usuario_id
        WHERE h.id = ${horaExtraId}
          AND h.tenant_id::text = ${ator.tenant_id}
          AND h.usuario_id = ${ator.id}
        LIMIT 1
      `);
            const atual = registro[0];
            if (!atual) {
                throw new AppError("Registro de hora extra nao encontrado.", 404);
            }
            if (atual.status !== "EXTRA_PENDENTE_AUTORIZACAO") {
                throw new AppError("Esta ocorrencia nao esta pendente de ciencia.", 409);
            }
            await tx.$executeRaw(Prisma.sql `
        UPDATE registro_ponto_hora_extra
        SET
          justificativa_funcionario = ${input.justificativa_funcionario},
          ciencia_registrada = TRUE,
          ciencia_em = NOW(),
          ciencia_usuario_id = ${ator.id},
          ciencia_usuario_nome = ${ator.nome_usuario},
          atualizado_em = NOW()
        WHERE id = ${horaExtraId}
          AND tenant_id::text = ${ator.tenant_id}
          AND usuario_id = ${ator.id}
      `);
            await this.registrarAuditoriaTx(tx, {
                registro_ponto_id: atual.registro_ponto_id,
                registro_ponto_batida_id: atual.registro_ponto_batida_id,
                acao: "CIENCIA_HORA_EXTRA",
                ator,
                origem,
                justificativa: input.justificativa_funcionario,
                observacao: "Ciencia do funcionario sobre hora extra antecipada.",
                dados_antes: atual,
                dados_depois: {
                    ...atual,
                    justificativa_funcionario: input.justificativa_funcionario,
                    ciencia_registrada: true
                }
            });
            await this.recalcularTotaisTx(tx, atual.registro_ponto_id, ator.tenant_id, null);
            const atualizada = await this.buscarHoraExtraPendenciaTx(tx, horaExtraId, ator.tenant_id);
            return atualizada ? this.mapHoraExtraRowToResponse(atualizada) : null;
        });
    }
    async decidirHoraExtra(horaExtraIdRaw, input, ator, origem) {
        await ensureRegistroPontoEstrutura(prisma);
        if (!this.isAdmin(ator)) {
            throw new AppError("Somente gestores e RH podem decidir horas extras.", 403);
        }
        if (!ator.id) {
            throw new AppError("Usuario autenticado invalido.", 401);
        }
        const horaExtraId = this.parseId(horaExtraIdRaw, "Hora extra");
        return prisma.$transaction(async (tx) => {
            const atual = await tx.$queryRaw(Prisma.sql `
        SELECT
          h.id,
          h.registro_ponto_id,
          h.registro_ponto_batida_id,
          h.usuario_id,
          u.nome AS usuario_nome,
          u.nome_usuario AS usuario_login,
          u.unidade,
          u.setor,
          h.data_referencia,
          h.campo_batida,
          h.horario_previsto::text,
          h.horario_real::text,
          h.minutos_excedentes,
          h.status::text AS status,
          h.justificativa_funcionario,
          h.ciencia_registrada,
          h.ciencia_em,
          h.ciencia_usuario_nome,
          h.gestor_id,
          h.gestor_nome,
          h.gestor_justificativa,
          h.minutos_aprovados,
          h.minutos_negados,
          h.criado_em,
          h.atualizado_em
        FROM registro_ponto_hora_extra h
        INNER JOIN usuarios u ON u.id = h.usuario_id
        WHERE h.id = ${horaExtraId}
          AND h.tenant_id::text = ${ator.tenant_id}
        LIMIT 1
      `);
            const registro = atual[0];
            if (!registro) {
                throw new AppError("Registro de hora extra nao encontrado.", 404);
            }
            const minutosAprovados = Math.min(input.minutos_aprovados ?? registro.minutos_excedentes, registro.minutos_excedentes);
            const minutosNegados = Math.min(input.minutos_negados ?? Math.max(0, registro.minutos_excedentes - minutosAprovados), registro.minutos_excedentes);
            let novoStatus = "EXTRA_PENDENTE_AUTORIZACAO";
            if (minutosAprovados > 0) {
                novoStatus = "EXTRA_AUTORIZADA";
            }
            else {
                novoStatus = "EXTRA_NEGADA";
            }
            if (input.justificativa.length < 5) {
                throw new AppError("Informe a justificativa da decisao.", 422);
            }
            await tx.$executeRaw(Prisma.sql `
        UPDATE registro_ponto_hora_extra
        SET
          status = ${novoStatus},
          gestor_id = ${ator.id},
          gestor_nome = ${ator.nome_usuario},
          gestor_justificativa = ${input.justificativa},
          minutos_aprovados = ${minutosAprovados},
          minutos_negados = ${minutosNegados},
          atualizado_em = NOW()
        WHERE id = ${horaExtraId}
          AND tenant_id::text = ${ator.tenant_id}
      `);
            await this.registrarAuditoriaTx(tx, {
                registro_ponto_id: registro.registro_ponto_id,
                registro_ponto_batida_id: registro.registro_ponto_batida_id,
                acao: "DECISAO_HORA_EXTRA",
                ator,
                origem,
                justificativa: input.justificativa,
                observacao: `Decisao de hora extra: ${novoStatus}.`,
                dados_antes: registro,
                dados_depois: {
                    ...registro,
                    status: novoStatus,
                    gestor_id: ator.id?.toString(),
                    gestor_nome: ator.nome_usuario,
                    gestor_justificativa: input.justificativa,
                    minutos_aprovados: minutosAprovados,
                    minutos_negados: minutosNegados
                }
            });
            await this.recalcularTotaisTx(tx, registro.registro_ponto_id, ator.tenant_id, null);
            const atualizada = await this.buscarHoraExtraPendenciaTx(tx, horaExtraId, ator.tenant_id);
            return atualizada ? this.mapHoraExtraRowToResponse(atualizada) : null;
        });
    }
    async listarRelatorioMensal(filters, ator) {
        await ensureRegistroPontoEstrutura(prisma);
        const where = [Prisma.sql `r.tenant_id::text = ${ator.tenant_id}`];
        if (filters.data_inicial)
            where.push(Prisma.sql `r.data_referencia >= CAST(${filters.data_inicial} AS DATE)`);
        if (filters.data_final)
            where.push(Prisma.sql `r.data_referencia <= CAST(${filters.data_final} AS DATE)`);
        if (filters.usuario_id)
            where.push(Prisma.sql `r.usuario_id = ${this.parseId(filters.usuario_id, "Usuario")}`);
        if (filters.funcionario) {
            where.push(Prisma.sql `(u.nome ILIKE ${`%${filters.funcionario}%`} OR u.nome_usuario ILIKE ${`%${filters.funcionario}%`})`);
        }
        if (filters.setor)
            where.push(Prisma.sql `u.setor ILIKE ${`%${filters.setor}%`}`);
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        r.id,
        r.usuario_id,
        u.nome AS usuario_nome,
        u.nome_usuario AS usuario_login,
        u.unidade,
        u.setor,
        r.data_referencia,
        r.entrada_1::text,
        r.saida_1::text,
        r.entrada_2::text,
        r.saida_2::text,
        r.horas_extras_pendentes_minutos,
        r.horas_extras_autorizadas_minutos,
        r.horas_extras_negadas_minutos,
        r.horas_extras_compensadas_minutos,
        r.horas_extras_pagas_minutos
      FROM registro_ponto r
      INNER JOIN usuarios u ON u.id = r.usuario_id
      WHERE ${Prisma.join(where, " AND ")}
      ORDER BY r.data_referencia DESC, r.id DESC
      LIMIT 1000
    `);
        const registros = rows.map((row) => ({
            id: toStringId(row.id),
            usuario_id: toStringId(row.usuario_id),
            usuario_nome: row.usuario_nome?.trim() || row.usuario_login,
            usuario_login: row.usuario_login,
            unidade: row.unidade ?? undefined,
            setor: row.setor ?? undefined,
            data_referencia: toIsoDate(row.data_referencia) ?? "",
            jornada_prevista: undefined,
            batidas_reais: [row.entrada_1, row.saida_1, row.entrada_2, row.saida_2].filter((item) => !!item).map((item) => item.slice(0, 5)),
            entradas_antecipadas: [],
            horas_extras_pendentes_minutos: row.horas_extras_pendentes_minutos ?? 0,
            horas_extras_aprovadas_minutos: (row.horas_extras_autorizadas_minutos ?? 0) +
                (row.horas_extras_compensadas_minutos ?? 0) +
                (row.horas_extras_pagas_minutos ?? 0),
            horas_extras_negadas_minutos: row.horas_extras_negadas_minutos ?? 0,
            saldo_banco_horas_aprovado_minutos: (row.horas_extras_autorizadas_minutos ?? 0) + (row.horas_extras_compensadas_minutos ?? 0),
            justificativas: [],
            ciencia_funcionario: false,
            aprovacao_gestor_rh: false
        }));
        const totais = registros.reduce((acc, item) => {
            acc.funcionarios += 1;
            acc.horas_extras_pendentes_minutos += item.horas_extras_pendentes_minutos;
            acc.horas_extras_aprovadas_minutos += item.horas_extras_aprovadas_minutos;
            acc.horas_extras_negadas_minutos += item.horas_extras_negadas_minutos;
            acc.saldo_banco_horas_aprovado_minutos += item.saldo_banco_horas_aprovado_minutos;
            return acc;
        }, {
            funcionarios: 0,
            horas_extras_pendentes_minutos: 0,
            horas_extras_aprovadas_minutos: 0,
            horas_extras_negadas_minutos: 0,
            saldo_banco_horas_aprovado_minutos: 0
        });
        return { registros, totais };
    }
    async marcarPonto(input, ator, origem) {
        await ensureRegistroPontoEstrutura(prisma);
        if (!ator.id) {
            throw new AppError("Usuario autenticado invalido.", 401);
        }
        return prisma.$transaction(async (tx) => {
            const usuario = await this.buscarContextoUsuarioTx(tx, ator.id, ator.tenant_id);
            if (!usuario) {
                throw new AppError("Usuario autenticado nao encontrado.", 404);
            }
            const agoraBrasilia = obterCarimboBrasilia();
            const validarLocalizacao = input.validar_localizacao !== false;
            const validacaoOrigem = this.validarOrigemMarcacao(usuario, origem, validarLocalizacao);
            if (!validacaoOrigem.permitido) {
                await this.registrarAuditoriaTx(tx, {
                    registro_ponto_id: null,
                    registro_ponto_batida_id: null,
                    acao: "TENTATIVA_BLOQUEADA",
                    ator,
                    origem,
                    justificativa: validacaoOrigem.motivo ?? "Origem nao autorizada.",
                    observacao: "Bloqueio de marcacao por validacao de origem.",
                    dados_antes: null,
                    dados_depois: validacaoOrigem.detalhes
                });
                throw new AppError(validacaoOrigem.motivo ?? "Marcacao bloqueada fora da instituicao.", 403);
            }
            const registroId = await this.ensureRegistroHojeTx(tx, ator.id, ator.tenant_id, usuario.unidade_id ?? null);
            const _registro = await this.buscarRegistroParaAtualizacaoTx(tx, registroId, ator.tenant_id);
            const batidas = await this.listarBatidasTx(tx, registroId, ator.tenant_id);
            if (batidas.length >= 4) {
                throw new AppError("Limite de marcacoes do dia atingido.", 409);
            }
            const ultimoRegistro = batidas[batidas.length - 1];
            if (ultimoRegistro) {
                const ultimoMs = toComparableLocalMs(ultimoRegistro.horario_servidor);
                if (agoraBrasilia.comparavelMs - ultimoMs < ESPERA_BATIDA_SEGUNDOS * 1000) {
                    throw new AppError("Aguarde alguns segundos antes de registrar uma nova batida.", 409);
                }
            }
            const horaBatida = agoraBrasilia.hora;
            const sequencia = batidas.length + 1;
            const tipo = SEQUENCIA_BATIDAS[sequencia - 1];
            const campo = CAMPOS_HORARIO[sequencia - 1];
            await tx.$executeRawUnsafe(`
        UPDATE registro_ponto
        SET ${campo} = CAST($2 AS TIME),
            atualizado_em = CAST($3 AS TIMESTAMP)
        WHERE id = $1
      `, registroId, horaBatida, agoraBrasilia.timestamp);
            const insertedBatida = await tx.$queryRaw(Prisma.sql `
        INSERT INTO registro_ponto_batida (
          registro_ponto_id,
          tenant_id,
          sequencia,
          tipo,
          horario_servidor,
          ip_origem,
          user_agent,
          origem_validada,
          latitude,
          longitude,
          accuracy_metros,
          origem_json,
          criado_em
      ) VALUES (
          ${registroId},
          CAST(${ator.tenant_id} AS UUID),
          ${sequencia},
          ${tipo},
          CAST(${agoraBrasilia.timestamp} AS TIMESTAMP),
          ${normalizarIp(origem.ip) ?? null},
          ${origem.user_agent?.slice(0, 300) ?? null},
          ${validacaoOrigem.origem_validada},
          ${input.latitude ?? null},
          ${input.longitude ?? null},
          ${typeof input.accuracy_metros === "number" ? Math.round(input.accuracy_metros) : null},
          CAST(${JSON.stringify(validacaoOrigem.detalhes)} AS JSONB),
          CAST(${agoraBrasilia.timestamp} AS TIMESTAMP)
        ) RETURNING id
      `);
            const batidaId = insertedBatida[0]?.id ?? null;
            if (!batidaId) {
                throw new AppError("Nao foi possivel registrar a batida de ponto.", 500);
            }
            let pendenciaHoraExtra;
            let alertaCritico = false;
            const configuracaoHoraExtra = await this.buscarConfiguracaoHoraExtraTx(tx, ator.tenant_id);
            const campoAntecipado = tipo === "ENTRADA_1" || tipo === "ENTRADA_2" ? campo : null;
            const horarioPrevisto = campoAntecipado === "entrada_1"
                ? usuario.horario_entrada_1
                : campoAntecipado === "entrada_2"
                    ? usuario.horario_entrada_2
                    : null;
            if (campoAntecipado && horarioPrevisto) {
                const minutoPrevisto = toMinutes(horarioPrevisto);
                const minutoReal = toMinutes(horaBatida);
                if (minutoPrevisto !== null && minutoReal !== null && minutoReal < minutoPrevisto) {
                    const minutosAntecipados = minutoPrevisto - minutoReal;
                    if (minutosAntecipados > configuracaoHoraExtra.tolerancia_entrada_antecipada_minutos) {
                        const resultadoHoraExtra = await this.registrarHoraExtraAntecipadaTx(tx, {
                            registroId,
                            batidaId,
                            usuarioId: usuario.id,
                            tenantId: ator.tenant_id,
                            dataReferencia: agoraBrasilia.timestamp ? new Date(`${agoraBrasilia.data}T00:00:00-03:00`) : new Date(),
                            campoBatida: campoAntecipado,
                            horarioPrevisto,
                            horarioReal: horaBatida,
                            minutosExcedentes: minutosAntecipados,
                            configuracao: configuracaoHoraExtra,
                            ator,
                            origem
                        });
                        pendenciaHoraExtra = resultadoHoraExtra.pendencia;
                        alertaCritico = resultadoHoraExtra.critico;
                    }
                }
            }
            await this.recalcularTotaisTx(tx, registroId, ator.tenant_id, usuario);
            await this.registrarAuditoriaTx(tx, {
                registro_ponto_id: registroId,
                registro_ponto_batida_id: batidaId,
                acao: "MARCACAO",
                ator,
                origem,
                justificativa: undefined,
                observacao: `Batida ${sequencia} registrada como ${tipo}.`,
                dados_antes: {
                    sequencia,
                    tipo,
                    campo
                },
                dados_depois: {
                    horario: horaBatida,
                    origem_validada: validacaoOrigem.origem_validada,
                    unidade_validada: usuario.unidade_nome,
                    latitude: origem.latitude ?? null,
                    longitude: origem.longitude ?? null,
                    accuracy_metros: origem.accuracy_metros ?? null,
                    localizacao_obtida: typeof origem.latitude === "number" && typeof origem.longitude === "number",
                    localizacao_status: validacaoOrigem.detalhes.localizacao_status ?? null,
                    origem_manual: origem.origem_manual ?? null
                }
            });
            const listaRow = await this.buscarListaRowPorIdTx(tx, registroId, ator.tenant_id);
            if (!listaRow) {
                throw new AppError("Nao foi possivel atualizar o espelho de ponto.", 500);
            }
            const registroResponse = mapRegistroPontoRowToResponse(listaRow);
            const mensagem = registroResponse.proxima_batida
                ? `Batida registrada com sucesso. Proxima batida: ${registroResponse.proxima_batida}.`
                : "Batida registrada com sucesso. Jornada do dia concluida.";
            return {
                registro: registroResponse,
                mensagem: pendenciaHoraExtra
                    ? `${mensagem} ${alertaCritico ? "A ocorrência excede o limite diário parametrizado e seguirá para análise prioritária do RH." : "A antecipação ficou pendente de análise do RH/gestor."}`
                    : mensagem,
                pendencia_hora_extra: pendenciaHoraExtra
            };
        });
    }
    async ajustarRegistro(registroIdRaw, input, ator, origem) {
        await ensureRegistroPontoEstrutura(prisma);
        if (!this.isAdmin(ator)) {
            throw new AppError("Somente administradores podem ajustar registros de ponto.", 403);
        }
        const registroId = this.parseId(registroIdRaw, "Registro de ponto");
        return prisma.$transaction(async (tx) => {
            const registroAtual = await this.buscarRegistroParaAtualizacaoTx(tx, registroId, ator.tenant_id);
            const agoraBrasilia = obterCarimboBrasilia();
            const ajusteCompleto = {
                entrada_1: input.entrada_1 ?? registroAtual.entrada_1 ?? undefined,
                saida_1: input.saida_1 ?? registroAtual.saida_1 ?? undefined,
                entrada_2: input.entrada_2 ?? registroAtual.entrada_2 ?? undefined,
                saida_2: input.saida_2 ?? registroAtual.saida_2 ?? undefined
            };
            if (!this.sequenciaHorariosValida(ajusteCompleto)) {
                throw new AppError("Sequencia de horarios invalida para ajuste.", 422);
            }
            await tx.$executeRaw(Prisma.sql `
        UPDATE registro_ponto
        SET
          entrada_1 = COALESCE(CAST(${input.entrada_1 ?? null} AS TIME), entrada_1),
          saida_1 = COALESCE(CAST(${input.saida_1 ?? null} AS TIME), saida_1),
          entrada_2 = COALESCE(CAST(${input.entrada_2 ?? null} AS TIME), entrada_2),
          saida_2 = COALESCE(CAST(${input.saida_2 ?? null} AS TIME), saida_2),
          observacoes = ${input.observacoes ?? registroAtual.observacoes},
          alterado_manualmente = TRUE,
          atualizado_em = CAST(${agoraBrasilia.timestamp} AS TIMESTAMP)
        WHERE id = ${registroId}
          AND tenant_id::text = ${ator.tenant_id}
      `);
            await this.registrarOcorrenciaTx(tx, {
                registro_ponto_id: registroId,
                tenant_id: ator.tenant_id,
                tipo: "CORRECAO_ADMINISTRATIVA",
                descricao: input.justificativa,
                origem: "ADMIN",
                criado_por_id: ator.id,
                criado_por_nome: ator.nome_usuario
            });
            const usuarioDoRegistro = await this.buscarContextoUsuarioTx(tx, registroAtual.usuario_id, ator.tenant_id);
            await this.recalcularTotaisTx(tx, registroId, ator.tenant_id, usuarioDoRegistro);
            const registroDepois = await this.buscarRegistroParaAtualizacaoTx(tx, registroId, ator.tenant_id);
            await this.registrarAuditoriaTx(tx, {
                registro_ponto_id: registroId,
                registro_ponto_batida_id: null,
                acao: "AJUSTE_MANUAL",
                ator,
                origem,
                justificativa: input.justificativa,
                observacao: input.observacao,
                dados_antes: registroAtual,
                dados_depois: registroDepois
            });
            const row = await this.buscarListaRowPorIdTx(tx, registroId, ator.tenant_id);
            if (!row) {
                throw new AppError("Nao foi possivel carregar o registro atualizado.", 500);
            }
            return mapRegistroPontoRowToResponse(row);
        });
    }
    async adicionarOcorrencia(registroIdRaw, input, ator, origem) {
        await ensureRegistroPontoEstrutura(prisma);
        const registroId = this.parseId(registroIdRaw, "Registro de ponto");
        const isAdmin = this.isAdmin(ator);
        return prisma.$transaction(async (tx) => {
            const registro = await this.buscarRegistroParaAtualizacaoTx(tx, registroId, ator.tenant_id);
            if (!isAdmin && ator.id !== registro.usuario_id) {
                throw new AppError("Sem permissao para adicionar ocorrencia neste registro.", 403);
            }
            await this.registrarOcorrenciaTx(tx, {
                registro_ponto_id: registroId,
                tenant_id: ator.tenant_id,
                tipo: input.tipo,
                descricao: input.descricao,
                origem: isAdmin ? "ADMIN" : "OPERACIONAL",
                criado_por_id: ator.id,
                criado_por_nome: ator.nome_usuario
            });
            await this.registrarAuditoriaTx(tx, {
                registro_ponto_id: registroId,
                registro_ponto_batida_id: null,
                acao: "ADICIONAR_OCORRENCIA",
                ator,
                origem,
                justificativa: undefined,
                observacao: input.descricao,
                dados_antes: null,
                dados_depois: {
                    tipo: input.tipo,
                    descricao: input.descricao
                }
            });
            const row = await this.buscarListaRowPorIdTx(tx, registroId, ator.tenant_id);
            if (!row) {
                throw new AppError("Registro de ponto nao encontrado.", 404);
            }
            return mapRegistroPontoRowToResponse(row);
        });
    }
    async buscarHistorico(registroIdRaw, ator) {
        await ensureRegistroPontoEstrutura(prisma);
        const registroId = this.parseId(registroIdRaw, "Registro de ponto");
        const isAdmin = this.isAdmin(ator);
        const registro = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        usuario_id,
        data_referencia,
        entrada_1::text,
        saida_1::text,
        entrada_2::text,
        saida_2::text,
        observacoes
      FROM registro_ponto
      WHERE id = ${registroId}
        AND tenant_id::text = ${ator.tenant_id}
      LIMIT 1
    `);
        const item = registro[0];
        if (!item) {
            throw new AppError("Registro de ponto nao encontrado.", 404);
        }
        if (!isAdmin && ator.id !== item.usuario_id) {
            throw new AppError("Sem permissao para visualizar este registro.", 403);
        }
        const historicoRows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        acao,
        usuario_id,
        usuario_nome,
        justificativa,
        observacao,
        ip_origem,
        dados_antes,
        dados_depois,
        criado_em
      FROM registro_ponto_auditoria
      WHERE registro_ponto_id = ${registroId}
        AND tenant_id::text = ${ator.tenant_id}
      ORDER BY criado_em DESC, id DESC
    `);
        const ocorrenciasRows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        tipo,
        descricao,
        origem,
        criado_por_nome,
        criado_em
      FROM registro_ponto_ocorrencia
      WHERE registro_ponto_id = ${registroId}
        AND tenant_id::text = ${ator.tenant_id}
      ORDER BY criado_em DESC, id DESC
    `);
        return {
            registro_id: registroId.toString(),
            historico: historicoRows.map(mapHistoricoRowToResponse),
            ocorrencias: ocorrenciasRows.map(mapOcorrenciaRowToResponse)
        };
    }
    async ensureRegistroHojeTx(tx, usuarioId, tenantId, unidadeId) {
        const agoraBrasilia = obterCarimboBrasilia();
        const rows = await tx.$queryRaw(Prisma.sql `
      INSERT INTO registro_ponto (
        usuario_id,
        tenant_id,
        unidade_id,
        data_referencia,
        criado_em,
        atualizado_em
      ) VALUES (
        ${usuarioId},
        CAST(${tenantId} AS UUID),
        ${unidadeId ?? null},
        CAST(${agoraBrasilia.data} AS DATE),
        CAST(${agoraBrasilia.timestamp} AS TIMESTAMP),
        CAST(${agoraBrasilia.timestamp} AS TIMESTAMP)
      )
      ON CONFLICT (usuario_id, data_referencia)
      DO UPDATE SET
        tenant_id = COALESCE(registro_ponto.tenant_id, EXCLUDED.tenant_id),
        unidade_id = COALESCE(registro_ponto.unidade_id, EXCLUDED.unidade_id),
        atualizado_em = CAST(${agoraBrasilia.timestamp} AS TIMESTAMP)
      RETURNING id
    `);
        const registroId = rows[0]?.id;
        if (!registroId) {
            throw new AppError("Nao foi possivel iniciar o registro de ponto do dia.", 500);
        }
        return registroId;
    }
    async buscarRegistroParaAtualizacaoTx(tx, registroId, tenantId) {
        const rows = await tx.$queryRaw(Prisma.sql `
      SELECT
        id,
        usuario_id,
        data_referencia,
        entrada_1::text,
        saida_1::text,
        entrada_2::text,
        saida_2::text,
        observacoes
      FROM registro_ponto
      WHERE id = ${registroId}
        AND tenant_id::text = ${tenantId}
      FOR UPDATE
    `);
        const registro = rows[0];
        if (!registro) {
            throw new AppError("Registro de ponto nao encontrado.", 404);
        }
        return registro;
    }
    async listarBatidasTx(tx, registroId, tenantId) {
        return tx.$queryRaw(Prisma.sql `
      SELECT id, sequencia, tipo, horario_servidor
      FROM registro_ponto_batida
      WHERE registro_ponto_id = ${registroId}
        AND tenant_id::text = ${tenantId}
      ORDER BY sequencia ASC
    `);
    }
    async buscarListaRowPorIdTx(tx, registroId, tenantId) {
        const rows = await tx.$queryRaw(Prisma.sql `
      SELECT
        r.id,
        r.usuario_id,
        u.nome AS usuario_nome,
        u.nome_usuario AS usuario_login,
        u.unidade,
        r.data_referencia,
        r.entrada_1::text,
        r.saida_1::text,
        r.entrada_2::text,
        r.saida_2::text,
        r.horas_extras_minutos,
        r.horas_extras_pendentes_minutos,
        r.horas_extras_autorizadas_minutos,
        r.horas_extras_negadas_minutos,
        r.horas_extras_compensadas_minutos,
        r.horas_extras_pagas_minutos,
        r.banco_horas_minutos,
        r.faltas_minutos,
        r.atrasos_minutos,
        r.observacoes,
        r.alterado_manualmente,
        CASE
          WHEN r.entrada_1 IS NOT NULL
            AND r.saida_1 IS NOT NULL
            AND r.entrada_2 IS NOT NULL
            AND r.saida_2 IS NOT NULL
          THEN 'COMPLETO'
          ELSE 'INCOMPLETO'
        END AS status_registro,
        COALESCE(ARRAY_REMOVE(ARRAY_AGG(DISTINCT o.tipo), NULL), ARRAY[]::text[]) AS ocorrencias,
        COALESCE(ARRAY_REMOVE(ARRAY_AGG(DISTINCT o.descricao), NULL), ARRAY[]::text[]) AS ocorrencias_descricao,
        (
          GREATEST(0, COALESCE(EXTRACT(EPOCH FROM (r.saida_1 - r.entrada_1)) / 60, 0)::integer)
          + GREATEST(0, COALESCE(EXTRACT(EPOCH FROM (r.saida_2 - r.entrada_2)) / 60, 0)::integer)
        )::integer AS total_trabalhado_minutos,
        r.criado_em,
        r.atualizado_em
      FROM registro_ponto r
      INNER JOIN usuarios u ON u.id = r.usuario_id
      LEFT JOIN registro_ponto_ocorrencia o ON o.registro_ponto_id = r.id
      WHERE r.id = ${registroId}
        AND r.tenant_id::text = ${tenantId}
        AND u.tenant_id::text = ${tenantId}
      GROUP BY
        r.id,
        r.usuario_id,
        u.nome,
        u.nome_usuario,
        u.unidade,
        r.data_referencia,
        r.entrada_1,
        r.saida_1,
        r.entrada_2,
        r.saida_2,
        r.horas_extras_minutos,
        r.horas_extras_pendentes_minutos,
        r.horas_extras_autorizadas_minutos,
        r.horas_extras_negadas_minutos,
        r.horas_extras_compensadas_minutos,
        r.horas_extras_pagas_minutos,
        r.banco_horas_minutos,
        r.faltas_minutos,
        r.atrasos_minutos,
        r.observacoes,
        r.alterado_manualmente,
        r.criado_em,
        r.atualizado_em
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async buscarHorarioUsuarioTx(tx, usuarioId, tenantId) {
        const rows = await tx.$queryRaw(Prisma.sql `
      SELECT
        horario_entrada_1::text,
        horario_saida_1::text,
        horario_entrada_2::text,
        horario_saida_2::text
      FROM usuarios
      WHERE id = ${usuarioId}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async buscarConfiguracaoHoraExtraTx(tx, tenantId) {
        const rows = await tx.$queryRaw(Prisma.sql `
      SELECT
        COALESCE(tolerancia_entrada_antecipada_minutos, 10) AS tolerancia_entrada_antecipada_minutos,
        COALESCE(exigir_autorizacao_hora_extra_antecipada, TRUE) AS exigir_autorizacao_hora_extra_antecipada,
        COALESCE(limite_hora_extra_diaria_minutos, 120) AS limite_hora_extra_diaria_minutos,
        COALESCE(permitir_solicitacao_hora_extra_pelo_funcionario, FALSE) AS permitir_solicitacao_hora_extra_pelo_funcionario,
        COALESCE(
          mensagem_ciencia_hora_extra,
          'Declaro ciência de que a realização de hora extra depende de autorização da empresa.'
        ) AS mensagem_ciencia_hora_extra
      FROM registro_ponto_configuracao
      WHERE tenant_id::text = ${tenantId}
      ORDER BY id DESC
      LIMIT 1
    `);
        return (rows[0] ?? {
            tolerancia_entrada_antecipada_minutos: 10,
            exigir_autorizacao_hora_extra_antecipada: true,
            limite_hora_extra_diaria_minutos: 120,
            permitir_solicitacao_hora_extra_pelo_funcionario: false,
            mensagem_ciencia_hora_extra: "Declaro ciência de que a realização de hora extra depende de autorização da empresa."
        });
    }
    async buscarResumoHoraExtraTx(tx, registroId, tenantId) {
        const rows = await tx.$queryRaw(Prisma.sql `
      SELECT
        COALESCE(SUM(CASE WHEN status = 'EXTRA_PENDENTE_AUTORIZACAO' THEN minutos_excedentes ELSE 0 END), 0)::integer AS horas_extras_pendentes_minutos,
        COALESCE(SUM(CASE WHEN status = 'EXTRA_AUTORIZADA' THEN minutos_aprovados ELSE 0 END), 0)::integer AS horas_extras_autorizadas_minutos,
        COALESCE(SUM(CASE WHEN status = 'EXTRA_NEGADA' THEN minutos_negados ELSE 0 END), 0)::integer AS horas_extras_negadas_minutos,
        COALESCE(SUM(CASE WHEN status = 'EXTRA_COMPENSADA_BANCO' THEN minutos_aprovados ELSE 0 END), 0)::integer AS horas_extras_compensadas_minutos,
        COALESCE(SUM(CASE WHEN status = 'EXTRA_PAGA_FOLHA' THEN minutos_aprovados ELSE 0 END), 0)::integer AS horas_extras_pagas_minutos
      FROM registro_ponto_hora_extra
      WHERE registro_ponto_id = ${registroId}
        AND tenant_id::text = ${tenantId}
    `);
        const resumo = rows[0] ?? {
            horas_extras_pendentes_minutos: 0,
            horas_extras_autorizadas_minutos: 0,
            horas_extras_negadas_minutos: 0,
            horas_extras_compensadas_minutos: 0,
            horas_extras_pagas_minutos: 0
        };
        const horasExtrasAutorizadas = Number(resumo.horas_extras_autorizadas_minutos ?? 0);
        const horasExtrasCompensadas = Number(resumo.horas_extras_compensadas_minutos ?? 0);
        const horasExtrasPagas = Number(resumo.horas_extras_pagas_minutos ?? 0);
        const horasExtrasPendentes = Number(resumo.horas_extras_pendentes_minutos ?? 0);
        const horasExtrasNegadas = Number(resumo.horas_extras_negadas_minutos ?? 0);
        const horasExtrasMinutos = horasExtrasAutorizadas + horasExtrasCompensadas + horasExtrasPagas;
        const bancoHorasMinutos = horasExtrasAutorizadas + horasExtrasCompensadas;
        return {
            horas_extras_pendentes_minutos: horasExtrasPendentes,
            horas_extras_autorizadas_minutos: horasExtrasAutorizadas,
            horas_extras_negadas_minutos: horasExtrasNegadas,
            horas_extras_compensadas_minutos: horasExtrasCompensadas,
            horas_extras_pagas_minutos: horasExtrasPagas,
            horas_extras_minutos: horasExtrasMinutos,
            banco_horas_minutos: bancoHorasMinutos
        };
    }
    async buscarHoraExtraPendenciaTx(tx, registroBatidaId, tenantId) {
        const rows = await tx.$queryRaw(Prisma.sql `
      SELECT
        id,
        registro_ponto_id,
        registro_ponto_batida_id,
        usuario_id,
        u.nome AS usuario_nome,
        u.nome_usuario AS usuario_login,
        u.unidade,
        u.setor,
        h.data_referencia,
        h.campo_batida,
        h.horario_previsto::text,
        h.horario_real::text,
        h.minutos_excedentes,
        h.status::text AS status,
        justificativa_funcionario,
        ciencia_registrada,
        ciencia_em,
        ciencia_usuario_nome,
        gestor_id,
        gestor_nome,
        gestor_justificativa,
        minutos_aprovados,
        minutos_negados,
        h.criado_em,
        h.atualizado_em
      FROM registro_ponto_hora_extra h
      INNER JOIN usuarios u ON u.id = h.usuario_id
      WHERE h.registro_ponto_batida_id = ${registroBatidaId}
        AND h.tenant_id::text = ${tenantId}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    montarPendenciaHoraExtraResponse(args) {
        return {
            id: args.id.toString(),
            status: args.status,
            campo_batida: args.campo_batida,
            horario_previsto: args.horario_previsto,
            horario_real: args.horario_real,
            minutos_excedentes: args.minutos_excedentes,
            tolerancia_minutos: args.tolerancia_minutos,
            limite_diario_minutos: args.limite_diario_minutos,
            ciencia_obrigatoria: args.ciencia_obrigatoria,
            justificativa_obrigatoria: args.justificativa_obrigatoria,
            mensagem: "Você está registrando entrada antes do horário previsto. Horas extras somente são válidas mediante autorização da empresa. Caso não exista autorização, este período ficará pendente de análise do RH/gestor e poderá não ser aprovado como hora extra.",
            mensagem_ciencia: args.mensagem_ciencia
        };
    }
    async registrarHoraExtraAntecipadaTx(tx, args) {
        const resumoAtual = await this.buscarResumoHoraExtraTx(tx, args.registroId, args.tenantId);
        const totalDiarioAteAqui = resumoAtual.horas_extras_pendentes_minutos +
            resumoAtual.horas_extras_autorizadas_minutos +
            resumoAtual.horas_extras_compensadas_minutos +
            resumoAtual.horas_extras_pagas_minutos +
            args.minutosExcedentes;
        const critico = totalDiarioAteAqui > args.configuracao.limite_hora_extra_diaria_minutos;
        const status = args.configuracao.exigir_autorizacao_hora_extra_antecipada
            ? "EXTRA_PENDENTE_AUTORIZACAO"
            : "EXTRA_AUTORIZADA";
        const inserted = await tx.$queryRaw(Prisma.sql `
      INSERT INTO registro_ponto_hora_extra (
        tenant_id,
        registro_ponto_id,
        registro_ponto_batida_id,
        usuario_id,
        data_referencia,
        campo_batida,
        horario_previsto,
        horario_real,
        minutos_excedentes,
        status,
        justificativa_funcionario,
        ciencia_registrada,
        minutos_aprovados,
        minutos_negados,
        criado_em,
        atualizado_em
      ) VALUES (
        CAST(${args.tenantId} AS UUID),
        ${args.registroId},
        ${args.batidaId},
        ${args.usuarioId},
        CAST(${toIsoDate(args.dataReferencia) ?? ""} AS DATE),
        ${args.campoBatida},
        CAST(${args.horarioPrevisto} AS TIME),
        CAST(${args.horarioReal} AS TIME),
        ${args.minutosExcedentes},
        ${status},
        ${args.justificativaFuncionario ?? null},
        ${false},
        ${status === "EXTRA_AUTORIZADA" ? args.minutosExcedentes : 0},
        ${0},
        NOW(),
        NOW()
      )
      ON CONFLICT (registro_ponto_batida_id)
      DO UPDATE SET
        horario_previsto = EXCLUDED.horario_previsto,
        horario_real = EXCLUDED.horario_real,
        minutos_excedentes = EXCLUDED.minutos_excedentes,
        status = EXCLUDED.status,
        atualizado_em = NOW()
      RETURNING id
    `);
        const pendencia = this.montarPendenciaHoraExtraResponse({
            id: inserted[0]?.id ?? args.batidaId,
            status,
            campo_batida: args.campoBatida,
            horario_previsto: args.horarioPrevisto,
            horario_real: args.horarioReal,
            minutos_excedentes: args.minutosExcedentes,
            tolerancia_minutos: args.configuracao.tolerancia_entrada_antecipada_minutos,
            limite_diario_minutos: args.configuracao.limite_hora_extra_diaria_minutos,
            mensagem_ciencia: args.configuracao.mensagem_ciencia_hora_extra,
            ciencia_obrigatoria: true,
            justificativa_obrigatoria: true
        });
        if (critico) {
            await this.registrarOcorrenciaTx(tx, {
                registro_ponto_id: args.registroId,
                tenant_id: args.tenantId,
                tipo: "OBSERVACAO_OPERACIONAL",
                descricao: `Antecipacao critica de ${args.minutosExcedentes} minuto(s) antes do horario previsto.`,
                origem: "SISTEMA"
            });
        }
        return {
            pendencia,
            critico
        };
    }
    async buscarContextoUsuarioTx(tx, usuarioId, tenantId) {
        const rows = await tx.$queryRaw(Prisma.sql `
      WITH usuario_atual AS (
        SELECT
          u.id,
          u.nome_usuario,
          u.nome,
          u.unidade,
          u.horario_entrada_1::text,
          u.horario_saida_1::text,
          u.horario_entrada_2::text,
          u.horario_saida_2::text
        FROM usuarios u
        WHERE u.id = ${usuarioId}
          AND u.tenant_id::text = ${tenantId}
        LIMIT 1
      )
      SELECT
        ua.id,
        ua.nome_usuario,
        ua.nome,
        ua.unidade,
        ua.horario_entrada_1,
        ua.horario_saida_1,
        ua.horario_entrada_2,
        ua.horario_saida_2,
        uni.id AS unidade_id,
        COALESCE(uni.nome_fantasia, uni.razao_social) AS unidade_nome,
        uni.modo_validacao_ponto,
        uni.raio_ponto_metros,
        uni.accuracy_max_ponto_metros,
        uni.ip_validacao_ponto,
        uni.ips_publicos_ponto,
        uni.redes_locais_ponto,
        uni.horario_funcionamento,
        COALESCE(cfg.tolerancia_entrada_antecipada_minutos, 10) AS tolerancia_entrada_antecipada_minutos,
        COALESCE(cfg.exigir_autorizacao_hora_extra_antecipada, TRUE) AS exigir_autorizacao_hora_extra_antecipada,
        COALESCE(cfg.limite_hora_extra_diaria_minutos, 120) AS limite_hora_extra_diaria_minutos,
        COALESCE(cfg.permitir_solicitacao_hora_extra_pelo_funcionario, FALSE) AS permitir_solicitacao_hora_extra_pelo_funcionario,
        COALESCE(
          cfg.mensagem_ciencia_hora_extra,
          'Declaro ciência de que a realização de hora extra depende de autorização da empresa.'
        ) AS mensagem_ciencia_hora_extra,
        e.latitude::text AS latitude,
        e.longitude::text AS longitude
      FROM usuario_atual ua
      LEFT JOIN LATERAL (
        SELECT ux.*
        FROM unidade_assistencial ux
        WHERE (
          ux.tenant_id::text = ${tenantId}
          AND COALESCE(ua.unidade, '') <> ''
          AND (
            LOWER(TRIM(COALESCE(ux.nome_fantasia, ''))) = LOWER(TRIM(COALESCE(ua.unidade, '')))
            OR LOWER(TRIM(COALESCE(ux.razao_social, ''))) = LOWER(TRIM(COALESCE(ua.unidade, '')))
          )
        )
        OR (ux.tenant_id::text = ${tenantId} AND ux.unidade_principal = TRUE)
        ORDER BY
          CASE
            WHEN COALESCE(ua.unidade, '') <> ''
              AND (
                LOWER(TRIM(COALESCE(ux.nome_fantasia, ''))) = LOWER(TRIM(COALESCE(ua.unidade, '')))
                OR LOWER(TRIM(COALESCE(ux.razao_social, ''))) = LOWER(TRIM(COALESCE(ua.unidade, '')))
              )
            THEN 0
            WHEN ux.unidade_principal = TRUE THEN 1
            ELSE 2
          END,
          ux.id
        LIMIT 1
      ) uni ON TRUE
      LEFT JOIN registro_ponto_configuracao cfg
        ON cfg.tenant_id::text = ${tenantId}
      LEFT JOIN endereco e ON e.id = uni.endereco_id
    `);
        return rows[0] ?? null;
    }
    validarOrigemMarcacao(usuario, origem, validarLocalizacao) {
        const ipCliente = normalizarIp(origem.ip);
        const modo = (usuario.modo_validacao_ponto ?? "IP_OU_REDE").trim().toUpperCase();
        const ipsPermitidos = [
            ...splitLista(usuario.ip_validacao_ponto),
            ...splitLista(usuario.ips_publicos_ponto)
        ];
        const redesPermitidas = splitLista(usuario.redes_locais_ponto);
        const ipPermitido = !!ipCliente &&
            ipsPermitidos.some((permitido) => normalizarIp(permitido) === ipCliente);
        const redePermitida = !!ipCliente &&
            redesPermitidas.some((rede) => ipDentroDaRede(ipCliente, rede));
        const latitudeUnidade = toNumber(usuario.latitude);
        const longitudeUnidade = toNumber(usuario.longitude);
        const latitudeUsuario = origem.latitude;
        const longitudeUsuario = origem.longitude;
        const accuracyUsuario = origem.accuracy_metros;
        const localizacaoUsuarioDisponivel = typeof latitudeUsuario === "number" && typeof longitudeUsuario === "number";
        const localizacaoUnidadeDisponivel = typeof latitudeUnidade === "number" && typeof longitudeUnidade === "number";
        const localizacaoStatus = !validarLocalizacao
            ? localizacaoUsuarioDisponivel
                ? "capturada_validacao_desativada"
                : "nao_obtida_validacao_desativada"
            : !localizacaoUsuarioDisponivel
                ? "nao_obtida"
                : !localizacaoUnidadeDisponivel
                    ? "instituicao_sem_coordenadas"
                    : "capturada";
        let geoPermitido = false;
        let geoDetalhes = {
            geo_aplicado: false,
            localizacao_obtida: localizacaoUsuarioDisponivel,
            localizacao_status: localizacaoStatus,
            localizacao_usuario_disponivel: localizacaoUsuarioDisponivel,
            localizacao_instituicao_disponivel: localizacaoUnidadeDisponivel,
            origem_manual: origem.origem_manual ?? null
        };
        if (validarLocalizacao &&
            localizacaoUnidadeDisponivel &&
            localizacaoUsuarioDisponivel) {
            const distancia = calcularDistanciaMetros(latitudeUnidade, longitudeUnidade, latitudeUsuario, longitudeUsuario);
            const raioMaximo = usuario.raio_ponto_metros ?? 100;
            const accuracyMaximo = usuario.accuracy_max_ponto_metros ?? 80;
            const accuracyOk = typeof accuracyUsuario === "number" ? accuracyUsuario <= accuracyMaximo : true;
            geoPermitido = distancia <= raioMaximo && accuracyOk;
            geoDetalhes = {
                geo_aplicado: true,
                distancia_metros: Number(distancia.toFixed(2)),
                raio_maximo_metros: raioMaximo,
                accuracy_metros: accuracyUsuario,
                accuracy_maximo_metros: accuracyMaximo,
                accuracy_ok: accuracyOk,
                localizacao_obtida: true,
                localizacao_status: "capturada"
            };
        }
        else if (!validarLocalizacao) {
            geoDetalhes = {
                ...geoDetalhes,
                validacao_localizacao_ativa: false
            };
        }
        const detalhes = {
            modo,
            validar_localizacao: validarLocalizacao,
            ip_cliente: ipCliente,
            ip_permitido: ipPermitido,
            rede_permitida: redePermitida,
            geo_permitido: geoPermitido,
            unidade_id: usuario.unidade_id?.toString(),
            unidade_nome: usuario.unidade_nome,
            ...geoDetalhes
        };
        if (!validarLocalizacao) {
            return {
                permitido: true,
                origem_validada: true,
                detalhes: {
                    ...detalhes,
                    validacao_origem_desativada: true
                }
            };
        }
        if (!usuario.unidade_id) {
            return {
                permitido: false,
                motivo: "Usuario sem unidade autorizada para registro de ponto.",
                origem_validada: false,
                detalhes
            };
        }
        if (modo === "LIVRE") {
            return {
                permitido: true,
                origem_validada: true,
                detalhes
            };
        }
        if (modo === "IP") {
            return {
                permitido: ipPermitido,
                motivo: "Registro de ponto permitido apenas pela rede autorizada da instituicao.",
                origem_validada: ipPermitido,
                detalhes
            };
        }
        if (modo === "REDE") {
            return {
                permitido: redePermitida,
                motivo: "Registro de ponto permitido apenas dentro da rede interna da instituicao.",
                origem_validada: redePermitida,
                detalhes
            };
        }
        if (modo === "GEO") {
            return {
                permitido: geoPermitido,
                motivo: "Registro de ponto permitido apenas dentro do raio geografico da instituicao.",
                origem_validada: geoPermitido,
                detalhes
            };
        }
        if (modo === "GEO_OU_IP") {
            const permitido = geoPermitido || ipPermitido || redePermitida;
            return {
                permitido,
                motivo: "Registro de ponto permitido somente dentro da instituicao por geolocalizacao ou rede autorizada.",
                origem_validada: permitido,
                detalhes
            };
        }
        const permitidoPadrao = ipPermitido || redePermitida;
        return {
            permitido: permitidoPadrao,
            motivo: "Registro de ponto permitido apenas na instituicao (IP/rede autorizada).",
            origem_validada: permitidoPadrao,
            detalhes
        };
    }
    async recalcularTotaisTx(tx, registroId, tenantId, contextoUsuario) {
        const registro = await this.buscarRegistroParaAtualizacaoTx(tx, registroId, tenantId);
        const resumoHoraExtra = await this.buscarResumoHoraExtraTx(tx, registroId, tenantId);
        const desvios = calcularDesviosRegistroPonto({
            entrada_1: contextoUsuario?.horario_entrada_1 ?? null,
            saida_1: contextoUsuario?.horario_saida_1 ?? null,
            entrada_2: contextoUsuario?.horario_entrada_2 ?? null,
            saida_2: contextoUsuario?.horario_saida_2 ?? null
        }, {
            entrada_1: registro.entrada_1 ?? null,
            saida_1: registro.saida_1 ?? null,
            entrada_2: registro.entrada_2 ?? null,
            saida_2: registro.saida_2 ?? null
        });
        const totalTrabalhado = diferencaMinutos(registro.entrada_1, registro.saida_1) +
            diferencaMinutos(registro.entrada_2, registro.saida_2);
        const atrasos = desvios.atrasos_minutos;
        const horasExtras = desvios.horas_extras_minutos;
        const bancoHoras = desvios.banco_horas_minutos;
        const hojeIso = obterCarimboBrasilia().data;
        const registroIso = toIsoDate(registro.data_referencia) ?? "";
        const diaFechado = !!registroIso && registroIso < hojeIso;
        const faltas = diaFechado ? Math.max(0, JORNADA_PADRAO_MINUTOS - totalTrabalhado) : 0;
        const agoraBrasilia = obterCarimboBrasilia();
        await tx.$executeRaw(Prisma.sql `
      UPDATE registro_ponto
      SET
        horas_extras_minutos = ${horasExtras},
        horas_extras_pendentes_minutos = ${resumoHoraExtra.horas_extras_pendentes_minutos},
        horas_extras_autorizadas_minutos = ${resumoHoraExtra.horas_extras_autorizadas_minutos},
        horas_extras_negadas_minutos = ${resumoHoraExtra.horas_extras_negadas_minutos},
        horas_extras_compensadas_minutos = ${resumoHoraExtra.horas_extras_compensadas_minutos},
        horas_extras_pagas_minutos = ${resumoHoraExtra.horas_extras_pagas_minutos},
        banco_horas_minutos = ${bancoHoras},
        faltas_minutos = ${faltas},
        atrasos_minutos = ${atrasos},
        atualizado_em = CAST(${agoraBrasilia.timestamp} AS TIMESTAMP)
      WHERE id = ${registroId}
    `);
        await this.reconstruirOcorrenciasSistemaTx(tx, registroId, tenantId, {
            atrasoMinutos: atrasos,
            faltasMinutos: faltas,
            horasExtrasMinutos: horasExtras,
            bancoHorasMinutos: bancoHoras,
            desvios,
            resumoHoraExtra,
            registro
        });
    }
    async reconstruirOcorrenciasSistemaTx(tx, registroId, tenantId, contexto) {
        const rotuloCampoBatida = (campo) => {
            if (campo === "entrada_1")
                return "E1";
            if (campo === "saida_1")
                return "S1";
            if (campo === "entrada_2")
                return "E2";
            return "S2";
        };
        const extrairHorarioCurto = (valor) => String(valor ?? "").slice(0, 5);
        const descreverDesvio = (item) => {
            const rotulo = rotuloCampoBatida(item.campo);
            const previsto = extrairHorarioCurto(item.horario_previsto);
            const real = extrairHorarioCurto(item.horario_real);
            if (item.tipo === "ATRASO") {
                return `Lançado com atraso em ${rotulo} (${previsto} → ${real}).`;
            }
            return `Lançado como hora extra em ${rotulo} (${previsto} → ${real}).`;
        };
        await tx.$executeRaw(Prisma.sql `
      DELETE FROM registro_ponto_ocorrencia
      WHERE registro_ponto_id = ${registroId}
        AND tenant_id::text = ${tenantId}
        AND origem = 'SISTEMA'
    `);
        if (contexto.atrasoMinutos > 0) {
            await this.registrarOcorrenciaTx(tx, {
                registro_ponto_id: registroId,
                tenant_id: tenantId,
                tipo: "ATRASO",
                descricao: contexto.desvios.detalhes.filter((item) => item.tipo === "ATRASO").map(descreverDesvio).join(" "),
                origem: "SISTEMA"
            });
        }
        if (contexto.faltasMinutos > 0) {
            await this.registrarOcorrenciaTx(tx, {
                registro_ponto_id: registroId,
                tenant_id: tenantId,
                tipo: "FALTA",
                descricao: `Saldo de falta de ${contexto.faltasMinutos} minuto(s).`,
                origem: "SISTEMA"
            });
        }
        if (contexto.horasExtrasMinutos > 0) {
            await this.registrarOcorrenciaTx(tx, {
                registro_ponto_id: registroId,
                tenant_id: tenantId,
                tipo: "HORA_EXTRA",
                descricao: contexto.desvios.detalhes.filter((item) => item.tipo === "HORA_EXTRA").map(descreverDesvio).join(" "),
                origem: "SISTEMA"
            });
        }
        if (contexto.bancoHorasMinutos !== 0) {
            await this.registrarOcorrenciaTx(tx, {
                registro_ponto_id: registroId,
                tenant_id: tenantId,
                tipo: "BANCO_HORAS",
                descricao: `Banco de horas com saldo de ${contexto.bancoHorasMinutos > 0 ? "+" : ""}${contexto.bancoHorasMinutos} minuto(s).`,
                origem: "SISTEMA"
            });
        }
        if (contexto.resumoHoraExtra.horas_extras_pendentes_minutos > 0) {
            await this.registrarOcorrenciaTx(tx, {
                registro_ponto_id: registroId,
                tenant_id: tenantId,
                tipo: "OBSERVACAO_OPERACIONAL",
                descricao: `Horas extras pendentes de autorizacao: ${contexto.resumoHoraExtra.horas_extras_pendentes_minutos} minuto(s).`,
                origem: "SISTEMA"
            });
        }
        const sequenciaValida = this.sequenciaHorariosValida({
            entrada_1: contexto.registro.entrada_1 ?? undefined,
            saida_1: contexto.registro.saida_1 ?? undefined,
            entrada_2: contexto.registro.entrada_2 ?? undefined,
            saida_2: contexto.registro.saida_2 ?? undefined
        });
        if (!sequenciaValida) {
            await this.registrarOcorrenciaTx(tx, {
                registro_ponto_id: registroId,
                tenant_id: tenantId,
                tipo: "INCONSISTENCIA_SEQUENCIA",
                descricao: "Sequencia de horarios inconsistente no espelho de ponto.",
                origem: "SISTEMA"
            });
        }
        const batidasDoDia = [
            contexto.registro.entrada_1,
            contexto.registro.saida_1,
            contexto.registro.entrada_2,
            contexto.registro.saida_2
        ].filter(Boolean).length;
        if (batidasDoDia > 0 && batidasDoDia < 4) {
            await this.registrarOcorrenciaTx(tx, {
                registro_ponto_id: registroId,
                tenant_id: tenantId,
                tipo: "ESQUECIMENTO_BATIDA",
                descricao: "Existem batidas pendentes para fechamento completo do dia.",
                origem: "SISTEMA"
            });
        }
    }
    async registrarOcorrenciaTx(tx, payload) {
        const agoraBrasilia = obterCarimboBrasilia();
        await tx.$executeRaw(Prisma.sql `
      INSERT INTO registro_ponto_ocorrencia (
        registro_ponto_id,
        tenant_id,
        tipo,
        descricao,
        origem,
        criado_por_id,
        criado_por_nome,
        criado_em
      ) VALUES (
        ${payload.registro_ponto_id},
        CAST(${payload.tenant_id} AS UUID),
        ${payload.tipo},
        ${payload.descricao ?? null},
        ${payload.origem},
        ${payload.criado_por_id ?? null},
        ${payload.criado_por_nome ?? null},
        CAST(${agoraBrasilia.timestamp} AS TIMESTAMP)
      )
    `);
    }
    async registrarAuditoriaTx(tx, payload) {
        const agoraBrasilia = obterCarimboBrasilia();
        const dadosAntesSql = payload.dados_antes
            ? Prisma.sql `CAST(${safeStringify(payload.dados_antes)} AS JSONB)`
            : Prisma.sql `NULL::JSONB`;
        const dadosDepoisSql = payload.dados_depois
            ? Prisma.sql `CAST(${safeStringify(payload.dados_depois)} AS JSONB)`
            : Prisma.sql `NULL::JSONB`;
        await tx.$executeRaw(Prisma.sql `
      INSERT INTO registro_ponto_auditoria (
        registro_ponto_id,
        registro_ponto_batida_id,
        tenant_id,
        acao,
        usuario_id,
        usuario_nome,
        ip_origem,
        justificativa,
        observacao,
        dados_antes,
        dados_depois,
        criado_em
      ) VALUES (
        ${payload.registro_ponto_id},
        ${payload.registro_ponto_batida_id},
        CAST(${payload.ator.tenant_id} AS UUID),
        ${payload.acao},
        ${payload.ator.id ?? null},
        ${payload.ator.nome_usuario},
        ${normalizarIp(payload.origem.ip) ?? null},
        ${payload.justificativa ?? null},
        ${payload.observacao ?? null},
        ${dadosAntesSql},
        ${dadosDepoisSql},
        CAST(${agoraBrasilia.timestamp} AS TIMESTAMP)
      )
    `);
        try {
            const dadosJsonAuditoria = {
                justificativa: payload.justificativa,
                observacao: payload.observacao,
                dados_antes: payload.dados_antes,
                dados_depois: payload.dados_depois
            };
            await tx.$executeRaw(Prisma.sql `
        INSERT INTO auditoria_evento (
          usuario_id,
          acao,
          entidade,
          entidade_id,
          dados_json,
          criado_em
        ) VALUES (
          ${payload.ator.id ?? null},
          ${payload.acao},
          'registro_ponto',
          ${payload.registro_ponto_id ? payload.registro_ponto_id.toString() : null},
          CAST(${safeStringify(dadosJsonAuditoria)} AS JSONB),
          CAST(${agoraBrasilia.timestamp} AS TIMESTAMP)
        )
      `);
        }
        catch (error) {
            console.warn("[registro-ponto] nao foi possivel registrar auditoria_evento:", error);
        }
    }
    mapHoraExtraRowToResponse(row) {
        return {
            id: toStringId(row.id),
            registro_ponto_id: toStringId(row.registro_ponto_id),
            registro_ponto_batida_id: toStringId(row.registro_ponto_batida_id),
            usuario_id: toStringId(row.usuario_id),
            usuario_nome: row.usuario_nome?.trim() || undefined,
            usuario_login: row.usuario_login?.trim() || undefined,
            unidade: row.unidade?.trim() || undefined,
            setor: row.setor?.trim() || undefined,
            data_referencia: toIsoDate(row.data_referencia) ?? "",
            campo_batida: row.campo_batida,
            horario_previsto: row.horario_previsto.slice(0, 5),
            horario_real: row.horario_real.slice(0, 5),
            minutos_excedentes: row.minutos_excedentes ?? 0,
            status: row.status,
            justificativa_funcionario: row.justificativa_funcionario?.trim() || undefined,
            ciencia_registrada: !!row.ciencia_registrada,
            ciencia_em: row.ciencia_em ? row.ciencia_em.toISOString() : undefined,
            ciencia_usuario_nome: row.ciencia_usuario_nome?.trim() || undefined,
            gestor_id: row.gestor_id ? toStringId(row.gestor_id) : undefined,
            gestor_nome: row.gestor_nome?.trim() || undefined,
            gestor_justificativa: row.gestor_justificativa?.trim() || undefined,
            minutos_aprovados: row.minutos_aprovados ?? 0,
            minutos_negados: row.minutos_negados ?? 0,
            criado_em: row.criado_em.toISOString(),
            atualizado_em: row.atualizado_em.toISOString()
        };
    }
    sequenciaHorariosValida(input) {
        const entrada1 = toMinutes(input.entrada_1 ?? null);
        const saida1 = toMinutes(input.saida_1 ?? null);
        const entrada2 = toMinutes(input.entrada_2 ?? null);
        const saida2 = toMinutes(input.saida_2 ?? null);
        if (entrada1 !== null && saida1 !== null && saida1 < entrada1)
            return false;
        if (saida1 !== null && entrada2 !== null && entrada2 < saida1)
            return false;
        if (entrada2 !== null && saida2 !== null && saida2 < entrada2)
            return false;
        return true;
    }
    parseId(rawValue, label) {
        const valor = Number(rawValue);
        if (!Number.isInteger(valor) || valor <= 0) {
            throw new AppError(`${label} invalido.`, 400);
        }
        return BigInt(valor);
    }
    isAdmin(ator) {
        return ator.permissoes.includes("ADMINISTRADOR");
    }
}
