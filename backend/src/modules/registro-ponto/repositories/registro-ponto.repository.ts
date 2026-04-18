
import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toIsoDate } from "../../../utils/string-utils.js";
import {
  mapHistoricoRowToResponse,
  mapOcorrenciaRowToResponse,
  mapRegistroPontoRowToResponse,
  mapUsuarioCatalogoRowToResponse,
  type HistoricoRow,
  type ListaRow,
  type OcorrenciaRow,
  type UsuarioCatalogoRow
} from "../registro-ponto.mapper.js";
import type {
  RegistroPontoAjusteInput,
  RegistroPontoAlertaPendencia,
  RegistroPontoAtor,
  RegistroPontoFilters,
  RegistroPontoHorarioUsuario,
  RegistroPontoHorarioUsuarioInput,
  RegistroPontoMarcarInput,
  RegistroPontoOcorrenciaInput,
  RegistroPontoOrigem,
  RegistroPontoStatusBatida
} from "../registro-ponto.types.js";
import { ensureRegistroPontoEstrutura } from "./registro-ponto-estrutura.repository.js";

type DatabaseTx = Prisma.TransactionClient;

type RegistroLinha = {
  id: bigint;
  usuario_id: bigint;
  data_referencia: Date;
  entrada_1: string | null;
  saida_1: string | null;
  entrada_2: string | null;
  saida_2: string | null;
  observacoes: string | null;
};

type BatidaLinha = {
  id: bigint;
  sequencia: number;
  tipo: string;
  horario_servidor: Date;
};

type UsuarioContexto = {
  id: bigint;
  nome_usuario: string;
  nome: string | null;
  unidade: string | null;
  horario_entrada_1: string | null;
  horario_saida_1: string | null;
  horario_entrada_2: string | null;
  horario_saida_2: string | null;
  unidade_id: bigint | null;
  unidade_nome: string | null;
  modo_validacao_ponto: string | null;
  raio_ponto_metros: number | null;
  accuracy_max_ponto_metros: number | null;
  ip_validacao_ponto: string | null;
  ips_publicos_ponto: string | null;
  redes_locais_ponto: string | null;
  horario_funcionamento: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
};

type UsuarioHorarioRow = {
  horario_entrada_1: string | null;
  horario_saida_1: string | null;
  horario_entrada_2: string | null;
  horario_saida_2: string | null;
};

type ValidacaoOrigemResultado = {
  permitido: boolean;
  motivo?: string;
  origem_validada: boolean;
  detalhes: Record<string, unknown>;
};

const SEQUENCIA_BATIDAS = ["ENTRADA_1", "SAIDA_1", "ENTRADA_2", "SAIDA_2"] as const;
const CAMPOS_HORARIO = ["entrada_1", "saida_1", "entrada_2", "saida_2"] as const;
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

type CarimboBrasilia = {
  data: string;
  hora: string;
  timestamp: string;
  comparavelMs: number;
};

function safeStringify(value: unknown) {
  return JSON.stringify(value, (_key, item) => (typeof item === "bigint" ? item.toString() : item));
}

function normalizarIp(ip?: string | null): string | undefined {
  if (!ip) return undefined;
  const valor = ip.trim();
  if (!valor) return undefined;
  if (valor.includes(",")) {
    const [primeiro] = valor.split(",");
    return normalizarIp(primeiro);
  }
  if (valor.startsWith("::ffff:")) {
    return valor.replace("::ffff:", "");
  }
  return valor;
}

function splitLista(texto?: string | null): string[] {
  if (!texto) return [];
  return texto
    .split(/[;,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function ipv4ParaNumero(ip: string): number | null {
  const partes = ip.split(".");
  if (partes.length !== 4) return null;

  let numero = 0;
  for (const parte of partes) {
    const valor = Number(parte);
    if (!Number.isInteger(valor) || valor < 0 || valor > 255) return null;
    numero = numero * 256 + valor;
  }

  return numero;
}

function ipDentroDaRede(ip: string, cidr: string): boolean {
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

  if (mascara === 0) return true;
  const mask = (0xffffffff << (32 - mascara)) >>> 0;
  return (ipNumero & mask) === (redeNumero & mask);
}

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toMinutes(hora?: string | null): number | null {
  if (!hora) return null;
  const [hh, mm] = hora.split(":").map((item) => Number(item));
  if (!Number.isInteger(hh) || !Number.isInteger(mm)) return null;
  return hh * 60 + mm;
}

function toComparableLocalMs(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  ).getTime();
}

function obterCarimboBrasilia(baseDate = new Date()): CarimboBrasilia {
  const partes = formatterBrasilia.formatToParts(baseDate);
  const valores = Object.fromEntries(
    partes
      .filter((item) => item.type !== "literal")
      .map((item) => [item.type, item.value])
  ) as Record<string, string>;

  const data = `${valores.year}-${valores.month}-${valores.day}`;
  const hora = `${valores.hour}:${valores.minute}:${valores.second}`;

  return {
    data,
    hora,
    timestamp: `${data} ${hora}`,
    comparavelMs: new Date(
      Number(valores.year),
      Number(valores.month) - 1,
      Number(valores.day),
      Number(valores.hour),
      Number(valores.minute),
      Number(valores.second),
      0
    ).getTime()
  };
}

function normalizarHorarioCurto(value?: string | null) {
  if (!value) return undefined;
  return value.slice(0, 5);
}

function diferencaMinutos(inicio?: string | null, fim?: string | null) {
  const inicioMinutos = toMinutes(inicio);
  const fimMinutos = toMinutes(fim);
  if (inicioMinutos === null || fimMinutos === null) return 0;
  return Math.max(0, fimMinutos - inicioMinutos);
}

function extrairHorarioEntradaReferencia(horarioFuncionamento?: string | null): number {
  if (!horarioFuncionamento) return 8 * 60;
  const match = horarioFuncionamento.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 8 * 60;

  const horas = Number(match[1]);
  const minutos = Number(match[2]);
  if (!Number.isInteger(horas) || !Number.isInteger(minutos)) return 8 * 60;
  return horas * 60 + minutos;
}

function calcularDistanciaMetros(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const raioTerra = 6371000;

  const dLat = toRad(latitudeB - latitudeA);
  const dLon = toRad(longitudeB - longitudeA);

  const lat1 = toRad(latitudeA);
  const lat2 = toRad(latitudeB);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return raioTerra * c;
}

export class RegistroPontoRepository {
  async listar(filters: RegistroPontoFilters, ator: RegistroPontoAtor) {
    await ensureRegistroPontoEstrutura(prisma);

    const usuarioId = ator.id;
    if (!usuarioId) {
      throw new AppError("Usuario autenticado invalido.", 401);
    }

    const where: Prisma.Sql[] = [];
    let usuarioIdFiltro = usuarioId;

    if (this.isAdmin(ator) && filters.usuario_id) {
      if (!/^\d+$/.test(filters.usuario_id)) {
        throw new AppError("Funcionario informado para o espelho de ponto e invalido.", 400);
      }
      usuarioIdFiltro = BigInt(filters.usuario_id);
    }

    where.push(Prisma.sql`AND r.usuario_id = ${usuarioIdFiltro}`);

    if (filters.data_inicial) {
      where.push(Prisma.sql`AND r.data_referencia >= ${new Date(`${filters.data_inicial}T00:00:00.000Z`)}`);
    }

    if (filters.data_final) {
      where.push(Prisma.sql`AND r.data_referencia <= ${new Date(`${filters.data_final}T00:00:00.000Z`)}`);
    }


    if (filters.somente_alterados) {
      where.push(Prisma.sql`AND r.alterado_manualmente = TRUE`);
    }

    if (filters.status === "COMPLETO") {
      where.push(
        Prisma.sql`AND r.entrada_1 IS NOT NULL AND r.saida_1 IS NOT NULL AND r.entrada_2 IS NOT NULL AND r.saida_2 IS NOT NULL`
      );
    }

    if (filters.status === "INCOMPLETO") {
      where.push(
        Prisma.sql`AND (r.entrada_1 IS NULL OR r.saida_1 IS NULL OR r.entrada_2 IS NULL OR r.saida_2 IS NULL)`
      );
    }

    if (filters.ocorrencia) {
      where.push(
        Prisma.sql`
          AND EXISTS (
            SELECT 1 FROM registro_ponto_ocorrencia ocf
            WHERE ocf.registro_ponto_id = r.id
              AND ocf.tipo ILIKE ${`%${filters.ocorrencia}%`}
          )
        `
      );
    }

    if (filters.somente_inconsistencias) {
      where.push(
        Prisma.sql`
          AND EXISTS (
            SELECT 1 FROM registro_ponto_ocorrencia oci
            WHERE oci.registro_ponto_id = r.id
              AND oci.tipo IN ('INCONSISTENCIA_SEQUENCIA', 'ESQUECIMENTO_BATIDA')
          )
        `
      );
    }

    const whereClause =
      where.length === 0
        ? Prisma.empty
        : where.length === 1
          ? where[0]
          : Prisma.sql`${Prisma.join(where, " ")}`;

    const rows = await prisma.$queryRaw<ListaRow[]>(Prisma.sql`
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
        r.data_referencia,
        r.entrada_1,
        r.saida_1,
        r.entrada_2,
        r.saida_2,
        r.horas_extras_minutos,
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

  async listarEspelho(filters: RegistroPontoFilters, ator: RegistroPontoAtor) {
    const registros = await this.listar(filters, ator);

    const totais = registros.reduce(
      (acc, item) => {
        acc.horas_extras_minutos += item.horas_extras_minutos;
        acc.banco_horas_minutos += item.banco_horas_minutos;
        acc.faltas_minutos += item.faltas_minutos;
        acc.atrasos_minutos += item.atrasos_minutos;
        acc.total_trabalhado_minutos += item.total_trabalhado_minutos;
        if (item.alterado_manualmente) {
          acc.total_ajustes += 1;
        }
        return acc;
      },
      {
        horas_extras_minutos: 0,
        banco_horas_minutos: 0,
        faltas_minutos: 0,
        atrasos_minutos: 0,
        total_trabalhado_minutos: 0,
        total_dias: registros.length,
        total_ajustes: 0
      }
    );

    return { registros, totais };
  }

  async listarUsuarios(termo?: string) {
    await ensureRegistroPontoEstrutura(prisma);

    const whereTermo = termo?.trim();

    const rows = await prisma.$queryRaw<UsuarioCatalogoRow[]>(Prisma.sql`
      SELECT
        u.id,
        u.nome,
        u.nome_usuario,
        u.unidade
      FROM usuarios u
      WHERE COALESCE(u.status, 'ATIVO') <> 'INATIVO'
        AND (
          ${whereTermo ? Prisma.sql`u.nome ILIKE ${`%${whereTermo}%`} OR u.nome_usuario ILIKE ${`%${whereTermo}%`}` : Prisma.sql`TRUE`}
        )
      ORDER BY u.nome ASC NULLS LAST, u.nome_usuario ASC
      LIMIT 50
    `);

    return rows.map(mapUsuarioCatalogoRowToResponse);
  }

  async buscarHorarioUsuario(ator: RegistroPontoAtor): Promise<RegistroPontoHorarioUsuario> {
    await ensureRegistroPontoEstrutura(prisma);

    if (!ator.id) {
      throw new AppError("Usuario autenticado invalido.", 401);
    }

    const usuario = await this.buscarHorarioUsuarioTx(prisma, ator.id);
    if (!usuario) {
      throw new AppError("Usuario autenticado nao encontrado.", 404);
    }

    return {
      horario_entrada_1: normalizarHorarioCurto(usuario.horario_entrada_1),
      horario_saida_1: normalizarHorarioCurto(usuario.horario_saida_1),
      horario_entrada_2: normalizarHorarioCurto(usuario.horario_entrada_2),
      horario_saida_2: normalizarHorarioCurto(usuario.horario_saida_2),
      jornada_configurada: !!(
        usuario.horario_entrada_1 ||
        usuario.horario_saida_1 ||
        usuario.horario_entrada_2 ||
        usuario.horario_saida_2
      )
    };
  }

  async salvarHorarioUsuario(
    input: RegistroPontoHorarioUsuarioInput,
    ator: RegistroPontoAtor,
    origem: RegistroPontoOrigem
  ): Promise<RegistroPontoHorarioUsuario> {
    await ensureRegistroPontoEstrutura(prisma);

    if (!ator.id) {
      throw new AppError("Usuario autenticado invalido.", 401);
    }

    return prisma.$transaction(async (tx) => {
      const antes = await this.buscarHorarioUsuarioTx(tx, ator.id as bigint);
      if (!antes) {
        throw new AppError("Usuario autenticado nao encontrado.", 404);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE usuarios
        SET
          horario_entrada_1 = CAST(${input.horario_entrada_1 ?? null} AS TIME),
          horario_saida_1 = CAST(${input.horario_saida_1 ?? null} AS TIME),
          horario_entrada_2 = CAST(${input.horario_entrada_2 ?? null} AS TIME),
          horario_saida_2 = CAST(${input.horario_saida_2 ?? null} AS TIME)
        WHERE id = ${ator.id}
      `);

      const depois = await this.buscarHorarioUsuarioTx(tx, ator.id as bigint);
      if (!depois) {
        throw new AppError("Usuario autenticado nao encontrado.", 404);
      }
      const resposta = {
        horario_entrada_1: normalizarHorarioCurto(depois.horario_entrada_1),
        horario_saida_1: normalizarHorarioCurto(depois.horario_saida_1),
        horario_entrada_2: normalizarHorarioCurto(depois.horario_entrada_2),
        horario_saida_2: normalizarHorarioCurto(depois.horario_saida_2),
        jornada_configurada: !!(
          depois.horario_entrada_1 ||
          depois.horario_saida_1 ||
          depois.horario_entrada_2 ||
          depois.horario_saida_2
        )
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

  async buscarAlertaPendencia(ator: RegistroPontoAtor): Promise<RegistroPontoAlertaPendencia> {
    await ensureRegistroPontoEstrutura(prisma);

    if (!ator.id) {
      throw new AppError("Usuario autenticado invalido.", 401);
    }
    const agoraBrasilia = obterCarimboBrasilia();

    const usuario = await this.buscarHorarioUsuarioTx(prisma, ator.id);
    if (!usuario) {
      throw new AppError("Usuario autenticado nao encontrado.", 404);
    }
    const agenda = [
      { campo: "entrada_1", rotulo: "Entrada 1", horario: normalizarHorarioCurto(usuario.horario_entrada_1) },
      { campo: "saida_1", rotulo: "Saída 1", horario: normalizarHorarioCurto(usuario.horario_saida_1) },
      { campo: "entrada_2", rotulo: "Entrada 2", horario: normalizarHorarioCurto(usuario.horario_entrada_2) },
      { campo: "saida_2", rotulo: "Saída 2", horario: normalizarHorarioCurto(usuario.horario_saida_2) }
    ].filter((item): item is { campo: "entrada_1" | "saida_1" | "entrada_2" | "saida_2"; rotulo: string; horario: string } => !!item.horario);

    if (!agenda.length) {
      return { exibir_alerta: false };
    }

    const [registroHoje] = await prisma.$queryRaw<RegistroLinha[]>(Prisma.sql`
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
          mensagem: `O ponto de ${item.rotulo.toLowerCase()} previsto para ${item.horario} ainda não foi registrado. Deseja registrar agora?`
        };
      }
    }

    return { exibir_alerta: false };
  }

  async marcarPonto(
    input: RegistroPontoMarcarInput,
    ator: RegistroPontoAtor,
    origem: RegistroPontoOrigem
  ): Promise<RegistroPontoStatusBatida> {
    await ensureRegistroPontoEstrutura(prisma);

    if (!ator.id) {
      throw new AppError("Usuario autenticado invalido.", 401);
    }

    return prisma.$transaction(async (tx) => {
      const usuario = await this.buscarContextoUsuarioTx(tx, ator.id as bigint);
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

        throw new AppError(
          validacaoOrigem.motivo ?? "Marcacao bloqueada fora da instituicao.",
          403
        );
      }

      const registroId = await this.ensureRegistroHojeTx(
        tx,
        ator.id as bigint,
        usuario.unidade_id ?? null
      );

      const _registro = await this.buscarRegistroParaAtualizacaoTx(tx, registroId);
      const batidas = await this.listarBatidasTx(tx, registroId);

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

      await tx.$executeRawUnsafe(
        `
        UPDATE registro_ponto
        SET ${campo} = CAST($2 AS TIME),
            atualizado_em = CAST($3 AS TIMESTAMP)
        WHERE id = $1
      `,
        registroId,
        horaBatida,
        agoraBrasilia.timestamp
      );

      const insertedBatida = await tx.$queryRaw<{ id: bigint }[]>(Prisma.sql`
        INSERT INTO registro_ponto_batida (
          registro_ponto_id,
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

      await this.recalcularTotaisTx(tx, registroId, usuario.horario_funcionamento);

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
          localizacao_obtida:
            typeof origem.latitude === "number" && typeof origem.longitude === "number",
          localizacao_status: validacaoOrigem.detalhes.localizacao_status ?? null,
          origem_manual: origem.origem_manual ?? null
        }
      });

      const listaRow = await this.buscarListaRowPorIdTx(tx, registroId);
      if (!listaRow) {
        throw new AppError("Nao foi possivel atualizar o espelho de ponto.", 500);
      }

      const registroResponse = mapRegistroPontoRowToResponse(listaRow);
      const mensagem = registroResponse.proxima_batida
        ? `Batida registrada com sucesso. Proxima batida: ${registroResponse.proxima_batida}.`
        : "Batida registrada com sucesso. Jornada do dia concluida.";

      return {
        registro: registroResponse,
        mensagem
      };
    });
  }

  async ajustarRegistro(
    registroIdRaw: string,
    input: RegistroPontoAjusteInput,
    ator: RegistroPontoAtor,
    origem: RegistroPontoOrigem
  ) {
    await ensureRegistroPontoEstrutura(prisma);

    if (!this.isAdmin(ator)) {
      throw new AppError("Somente administradores podem ajustar registros de ponto.", 403);
    }

    const registroId = this.parseId(registroIdRaw, "Registro de ponto");

    return prisma.$transaction(async (tx) => {
      const registroAtual = await this.buscarRegistroParaAtualizacaoTx(tx, registroId);
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

      await tx.$executeRaw(Prisma.sql`
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
      `);

      await this.registrarOcorrenciaTx(tx, {
        registro_ponto_id: registroId,
        tipo: "CORRECAO_ADMINISTRATIVA",
        descricao: input.justificativa,
        origem: "ADMIN",
        criado_por_id: ator.id,
        criado_por_nome: ator.nome_usuario
      });

      await this.recalcularTotaisTx(tx, registroId, null);

      const registroDepois = await this.buscarRegistroParaAtualizacaoTx(tx, registroId);

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

      const row = await this.buscarListaRowPorIdTx(tx, registroId);
      if (!row) {
        throw new AppError("Nao foi possivel carregar o registro atualizado.", 500);
      }

      return mapRegistroPontoRowToResponse(row);
    });
  }

  async adicionarOcorrencia(
    registroIdRaw: string,
    input: RegistroPontoOcorrenciaInput,
    ator: RegistroPontoAtor,
    origem: RegistroPontoOrigem
  ) {
    await ensureRegistroPontoEstrutura(prisma);

    const registroId = this.parseId(registroIdRaw, "Registro de ponto");
    const isAdmin = this.isAdmin(ator);

    return prisma.$transaction(async (tx) => {
      const registro = await this.buscarRegistroParaAtualizacaoTx(tx, registroId);

      if (!isAdmin && ator.id !== registro.usuario_id) {
        throw new AppError("Sem permissao para adicionar ocorrencia neste registro.", 403);
      }

      await this.registrarOcorrenciaTx(tx, {
        registro_ponto_id: registroId,
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

      const row = await this.buscarListaRowPorIdTx(tx, registroId);
      if (!row) {
        throw new AppError("Registro de ponto nao encontrado.", 404);
      }

      return mapRegistroPontoRowToResponse(row);
    });
  }

  async buscarHistorico(registroIdRaw: string, ator: RegistroPontoAtor) {
    await ensureRegistroPontoEstrutura(prisma);

    const registroId = this.parseId(registroIdRaw, "Registro de ponto");
    const isAdmin = this.isAdmin(ator);

    const registro = await prisma.$queryRaw<RegistroLinha[]>(Prisma.sql`
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
      LIMIT 1
    `);

    const item = registro[0];
    if (!item) {
      throw new AppError("Registro de ponto nao encontrado.", 404);
    }

    if (!isAdmin && ator.id !== item.usuario_id) {
      throw new AppError("Sem permissao para visualizar este registro.", 403);
    }

    const historicoRows = await prisma.$queryRaw<HistoricoRow[]>(Prisma.sql`
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
      ORDER BY criado_em DESC, id DESC
    `);

    const ocorrenciasRows = await prisma.$queryRaw<OcorrenciaRow[]>(Prisma.sql`
      SELECT
        id,
        tipo,
        descricao,
        origem,
        criado_por_nome,
        criado_em
      FROM registro_ponto_ocorrencia
      WHERE registro_ponto_id = ${registroId}
      ORDER BY criado_em DESC, id DESC
    `);

    return {
      registro_id: registroId.toString(),
      historico: historicoRows.map(mapHistoricoRowToResponse),
      ocorrencias: ocorrenciasRows.map(mapOcorrenciaRowToResponse)
    };
  }

  private async ensureRegistroHojeTx(tx: DatabaseTx, usuarioId: bigint, unidadeId?: bigint | null) {
    const agoraBrasilia = obterCarimboBrasilia();
    const rows = await tx.$queryRaw<{ id: bigint }[]>(Prisma.sql`
      INSERT INTO registro_ponto (
        usuario_id,
        unidade_id,
        data_referencia,
        criado_em,
        atualizado_em
      ) VALUES (
        ${usuarioId},
        ${unidadeId ?? null},
        CAST(${agoraBrasilia.data} AS DATE),
        CAST(${agoraBrasilia.timestamp} AS TIMESTAMP),
        CAST(${agoraBrasilia.timestamp} AS TIMESTAMP)
      )
      ON CONFLICT (usuario_id, data_referencia)
      DO UPDATE SET
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

  private async buscarRegistroParaAtualizacaoTx(tx: DatabaseTx, registroId: bigint): Promise<RegistroLinha> {
    const rows = await tx.$queryRaw<RegistroLinha[]>(Prisma.sql`
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
      FOR UPDATE
    `);

    const registro = rows[0];
    if (!registro) {
      throw new AppError("Registro de ponto nao encontrado.", 404);
    }

    return registro;
  }

  private async listarBatidasTx(tx: DatabaseTx, registroId: bigint) {
    return tx.$queryRaw<BatidaLinha[]>(Prisma.sql`
      SELECT id, sequencia, tipo, horario_servidor
      FROM registro_ponto_batida
      WHERE registro_ponto_id = ${registroId}
      ORDER BY sequencia ASC
    `);
  }

  private async buscarListaRowPorIdTx(tx: DatabaseTx, registroId: bigint) {
    const rows = await tx.$queryRaw<ListaRow[]>(Prisma.sql`
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

  private async buscarHorarioUsuarioTx(
    tx: DatabaseTx | typeof prisma,
    usuarioId: bigint
  ): Promise<UsuarioHorarioRow | null> {
    const rows = await tx.$queryRaw<UsuarioHorarioRow[]>(Prisma.sql`
      SELECT
        horario_entrada_1::text,
        horario_saida_1::text,
        horario_entrada_2::text,
        horario_saida_2::text
      FROM usuarios
      WHERE id = ${usuarioId}
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  private async buscarContextoUsuarioTx(tx: DatabaseTx, usuarioId: bigint) {
    const rows = await tx.$queryRaw<UsuarioContexto[]>(Prisma.sql`
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
        e.latitude::text AS latitude,
        e.longitude::text AS longitude
      FROM usuario_atual ua
      LEFT JOIN LATERAL (
        SELECT ux.*
        FROM unidade_assistencial ux
        WHERE (
          COALESCE(ua.unidade, '') <> ''
          AND (
            LOWER(TRIM(COALESCE(ux.nome_fantasia, ''))) = LOWER(TRIM(COALESCE(ua.unidade, '')))
            OR LOWER(TRIM(COALESCE(ux.razao_social, ''))) = LOWER(TRIM(COALESCE(ua.unidade, '')))
          )
        )
        OR ux.unidade_principal = TRUE
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
      LEFT JOIN endereco e ON e.id = uni.endereco_id
    `);

    return rows[0] ?? null;
  }

  private validarOrigemMarcacao(
    usuario: UsuarioContexto,
    origem: RegistroPontoOrigem,
    validarLocalizacao: boolean
  ): ValidacaoOrigemResultado {
    const ipCliente = normalizarIp(origem.ip);
    const modo = (usuario.modo_validacao_ponto ?? "IP_OU_REDE").trim().toUpperCase();

    const ipsPermitidos = [
      ...splitLista(usuario.ip_validacao_ponto),
      ...splitLista(usuario.ips_publicos_ponto)
    ];
    const redesPermitidas = splitLista(usuario.redes_locais_ponto);

    const ipPermitido =
      !!ipCliente &&
      ipsPermitidos.some((permitido) => normalizarIp(permitido) === ipCliente);

    const redePermitida =
      !!ipCliente &&
      redesPermitidas.some((rede) => ipDentroDaRede(ipCliente, rede));

    const latitudeUnidade = toNumber(usuario.latitude);
    const longitudeUnidade = toNumber(usuario.longitude);
    const latitudeUsuario = origem.latitude;
    const longitudeUsuario = origem.longitude;
    const accuracyUsuario = origem.accuracy_metros;
    const localizacaoUsuarioDisponivel =
      typeof latitudeUsuario === "number" && typeof longitudeUsuario === "number";
    const localizacaoUnidadeDisponivel =
      typeof latitudeUnidade === "number" && typeof longitudeUnidade === "number";
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
    let geoDetalhes: Record<string, unknown> = {
      geo_aplicado: false,
      localizacao_obtida: localizacaoUsuarioDisponivel,
      localizacao_status: localizacaoStatus,
      localizacao_usuario_disponivel: localizacaoUsuarioDisponivel,
      localizacao_instituicao_disponivel: localizacaoUnidadeDisponivel,
      origem_manual: origem.origem_manual ?? null
    };

    if (
      validarLocalizacao &&
      localizacaoUnidadeDisponivel &&
      localizacaoUsuarioDisponivel
    ) {
      const distancia = calcularDistanciaMetros(
        latitudeUnidade,
        longitudeUnidade,
        latitudeUsuario,
        longitudeUsuario
      );

      const raioMaximo = usuario.raio_ponto_metros ?? 100;
      const accuracyMaximo = usuario.accuracy_max_ponto_metros ?? 80;
      const accuracyOk =
        typeof accuracyUsuario === "number" ? accuracyUsuario <= accuracyMaximo : true;

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
    } else if (!validarLocalizacao) {
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
        motivo:
          "Registro de ponto permitido somente dentro da instituicao por geolocalizacao ou rede autorizada.",
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

  private async recalcularTotaisTx(
    tx: DatabaseTx,
    registroId: bigint,
    horarioFuncionamento?: string | null
  ) {
    const registro = await this.buscarRegistroParaAtualizacaoTx(tx, registroId);

    const totalTrabalhado =
      diferencaMinutos(registro.entrada_1, registro.saida_1) +
      diferencaMinutos(registro.entrada_2, registro.saida_2);

    const atrasoReferencia = extrairHorarioEntradaReferencia(horarioFuncionamento);
    const entrada1Minutos = toMinutes(registro.entrada_1);
    const atrasos =
      entrada1Minutos === null ? 0 : Math.max(0, entrada1Minutos - atrasoReferencia);

    const bancoHoras = totalTrabalhado - JORNADA_PADRAO_MINUTOS;
    const horasExtras = Math.max(0, bancoHoras);

    const hojeIso = obterCarimboBrasilia().data;
    const registroIso = toIsoDate(registro.data_referencia) ?? "";
    const diaFechado = !!registroIso && registroIso < hojeIso;

    const faltas = diaFechado ? Math.max(0, JORNADA_PADRAO_MINUTOS - totalTrabalhado) : 0;
    const agoraBrasilia = obterCarimboBrasilia();

    await tx.$executeRaw(Prisma.sql`
      UPDATE registro_ponto
      SET
        horas_extras_minutos = ${horasExtras},
        banco_horas_minutos = ${bancoHoras},
        faltas_minutos = ${faltas},
        atrasos_minutos = ${atrasos},
        atualizado_em = CAST(${agoraBrasilia.timestamp} AS TIMESTAMP)
      WHERE id = ${registroId}
    `);

    await this.reconstruirOcorrenciasSistemaTx(tx, registroId, {
      atrasoMinutos: atrasos,
      faltasMinutos: faltas,
      horasExtrasMinutos: horasExtras,
      bancoHorasMinutos: bancoHoras,
      registro
    });
  }

  private async reconstruirOcorrenciasSistemaTx(
    tx: DatabaseTx,
    registroId: bigint,
    contexto: {
      atrasoMinutos: number;
      faltasMinutos: number;
      horasExtrasMinutos: number;
      bancoHorasMinutos: number;
      registro: RegistroLinha;
    }
  ) {
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM registro_ponto_ocorrencia
      WHERE registro_ponto_id = ${registroId}
        AND origem = 'SISTEMA'
    `);

    if (contexto.atrasoMinutos > 0) {
      await this.registrarOcorrenciaTx(tx, {
        registro_ponto_id: registroId,
        tipo: "ATRASO",
        descricao: `Atraso de ${contexto.atrasoMinutos} minuto(s).`,
        origem: "SISTEMA"
      });
    }

    if (contexto.faltasMinutos > 0) {
      await this.registrarOcorrenciaTx(tx, {
        registro_ponto_id: registroId,
        tipo: "FALTA",
        descricao: `Saldo de falta de ${contexto.faltasMinutos} minuto(s).`,
        origem: "SISTEMA"
      });
    }

    if (contexto.horasExtrasMinutos > 0) {
      await this.registrarOcorrenciaTx(tx, {
        registro_ponto_id: registroId,
        tipo: "HORA_EXTRA",
        descricao: `Hora extra de ${contexto.horasExtrasMinutos} minuto(s).`,
        origem: "SISTEMA"
      });
    }

    if (contexto.bancoHorasMinutos !== 0) {
      await this.registrarOcorrenciaTx(tx, {
        registro_ponto_id: registroId,
        tipo: "BANCO_HORAS",
        descricao: `Banco de horas com saldo de ${contexto.bancoHorasMinutos} minuto(s).`,
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
        tipo: "ESQUECIMENTO_BATIDA",
        descricao: "Existem batidas pendentes para fechamento completo do dia.",
        origem: "SISTEMA"
      });
    }
  }

  private async registrarOcorrenciaTx(
    tx: DatabaseTx,
    payload: {
      registro_ponto_id: bigint;
      tipo: string;
      descricao?: string;
      origem: string;
      criado_por_id?: bigint;
      criado_por_nome?: string;
    }
  ) {
    const agoraBrasilia = obterCarimboBrasilia();
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO registro_ponto_ocorrencia (
        registro_ponto_id,
        tipo,
        descricao,
        origem,
        criado_por_id,
        criado_por_nome,
        criado_em
      ) VALUES (
        ${payload.registro_ponto_id},
        ${payload.tipo},
        ${payload.descricao ?? null},
        ${payload.origem},
        ${payload.criado_por_id ?? null},
        ${payload.criado_por_nome ?? null},
        CAST(${agoraBrasilia.timestamp} AS TIMESTAMP)
      )
    `);
  }

  private async registrarAuditoriaTx(
    tx: DatabaseTx,
    payload: {
      registro_ponto_id: bigint | null;
      registro_ponto_batida_id: bigint | null;
      acao: string;
      ator: RegistroPontoAtor;
      origem: RegistroPontoOrigem;
      justificativa?: string;
      observacao?: string;
      dados_antes?: unknown;
      dados_depois?: unknown;
    }
  ) {
    const agoraBrasilia = obterCarimboBrasilia();
    const dadosAntesSql = payload.dados_antes
      ? Prisma.sql`CAST(${safeStringify(payload.dados_antes)} AS JSONB)`
      : Prisma.sql`NULL::JSONB`;
    const dadosDepoisSql = payload.dados_depois
      ? Prisma.sql`CAST(${safeStringify(payload.dados_depois)} AS JSONB)`
      : Prisma.sql`NULL::JSONB`;

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO registro_ponto_auditoria (
        registro_ponto_id,
        registro_ponto_batida_id,
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

      await tx.$executeRaw(Prisma.sql`
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
    } catch (error) {
      console.warn("[registro-ponto] nao foi possivel registrar auditoria_evento:", error);
    }
  }

  private sequenciaHorariosValida(input: {
    entrada_1?: string;
    saida_1?: string;
    entrada_2?: string;
    saida_2?: string;
  }) {
    const entrada1 = toMinutes(input.entrada_1 ?? null);
    const saida1 = toMinutes(input.saida_1 ?? null);
    const entrada2 = toMinutes(input.entrada_2 ?? null);
    const saida2 = toMinutes(input.saida_2 ?? null);

    if (entrada1 !== null && saida1 !== null && saida1 < entrada1) return false;
    if (saida1 !== null && entrada2 !== null && entrada2 < saida1) return false;
    if (entrada2 !== null && saida2 !== null && saida2 < entrada2) return false;

    return true;
  }

  private parseId(rawValue: string, label: string) {
    const valor = Number(rawValue);
    if (!Number.isInteger(valor) || valor <= 0) {
      throw new AppError(`${label} invalido.`, 400);
    }
    return BigInt(valor);
  }

  private isAdmin(ator: RegistroPontoAtor) {
    return ator.permissoes.includes("ADMINISTRADOR");
  }
}
