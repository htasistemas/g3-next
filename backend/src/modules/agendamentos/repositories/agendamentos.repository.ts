import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { EmailService } from "../../email/services/email.service.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { normalizeDigits, toIsoDate, toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import type {
  AgendamentoBeneficiarioRow,
  AgendamentoCheckInInput,
  AgendamentoConclusaoInput,
  AgendamentoFiltros,
  AgendamentoInput,
  AgendamentoOperacionalBeneficiarioRow,
  AgendamentoOperacionalInput,
  AgendamentoOperacionalItemRow,
  AgendamentoListaEsperaInput,
  AgendamentoListaEsperaRow,
  AgendamentoEnvioCanal,
  AgendamentoRemarcacaoInput,
  AgendamentoRow
} from "../agendamentos.types.js";

type PrismaExecutor = Pick<typeof prisma, "$queryRaw" | "$executeRaw">;

const estruturaSql = [
  `
    CREATE TABLE IF NOT EXISTS agendamento (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      beneficiario_id BIGINT,
      familia_id BIGINT,
      inscricao_origem_id BIGINT,
      beneficiario_nome VARCHAR(200) NOT NULL,
      familia_nome VARCHAR(200),
      responsavel_nome VARCHAR(200),
      telefone VARCHAR(40),
      email VARCHAR(160),
      forma_contato_preferencial VARCHAR(60),
      observacoes_importantes TEXT,
      restricoes_alerta TEXT,
      necessidade_especial TEXT,
      transporte_apoio TEXT,
      unidade VARCHAR(160) NOT NULL,
      setor VARCHAR(160) NOT NULL,
      tipo_atendimento VARCHAR(160) NOT NULL,
      subcategoria VARCHAR(160),
      profissional_id VARCHAR(60),
      profissional_nome VARCHAR(200),
      equipe_apoio JSONB NOT NULL DEFAULT '[]'::jsonb,
      data_agendamento DATE NOT NULL,
      hora_inicial TIME NOT NULL,
      hora_final TIME,
      duracao_minutos INTEGER,
      sala VARCHAR(160),
      recurso VARCHAR(160),
      modalidade VARCHAR(60) NOT NULL,
      origem_atendimento VARCHAR(120),
      prioridade VARCHAR(40) NOT NULL DEFAULT 'Normal',
      status VARCHAR(80) NOT NULL DEFAULT 'Agendado',
      motivo TEXT,
      objetivo TEXT,
      observacao_interna TEXT,
      observacao_curta VARCHAR(240),
      coletivo BOOLEAN NOT NULL DEFAULT FALSE,
      titulo_coletivo VARCHAR(200),
      capacidade_maxima INTEGER,
      participantes JSONB NOT NULL DEFAULT '[]'::jsonb,
      recorrencia JSONB,
      retorno_programado_para DATE,
      encaminhamento_origem VARCHAR(200),
      primeira_vez BOOLEAN NOT NULL DEFAULT FALSE,
      retorno BOOLEAN NOT NULL DEFAULT FALSE,
      urgencia BOOLEAN NOT NULL DEFAULT FALSE,
      documentos_pendentes BOOLEAN NOT NULL DEFAULT FALSE,
      autorizacao_pendente BOOLEAN NOT NULL DEFAULT FALSE,
      confirmacao_canal VARCHAR(60),
      confirmado_em TIMESTAMP,
      confirmado_por_nome VARCHAR(160),
      observacao_confirmacao TEXT,
      status_chegada VARCHAR(80),
      horario_chegada_real TIME,
      horario_inicio_real TIME,
      horario_fim_real TIME,
      concluido_resumo TEXT,
      desfecho VARCHAR(160),
      comparecimento VARCHAR(40),
      encaminhamento_interno TEXT,
      encaminhamento_externo TEXT,
      custo_atendimento NUMERIC(14,2),
      central_atendimento_id BIGINT,
      criado_por_usuario_id BIGINT,
      criado_por_nome VARCHAR(160),
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
  "ALTER TABLE agendamento ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "CREATE INDEX IF NOT EXISTS agendamento_data_idx ON agendamento(data_agendamento, hora_inicial)",
  "CREATE INDEX IF NOT EXISTS agendamento_tenant_idx ON agendamento(tenant_id, data_agendamento, hora_inicial)",
  "CREATE INDEX IF NOT EXISTS agendamento_beneficiario_idx ON agendamento(beneficiario_id)",
  "CREATE INDEX IF NOT EXISTS agendamento_profissional_idx ON agendamento(profissional_nome, data_agendamento)",
  "ALTER TABLE agendamento ADD COLUMN IF NOT EXISTS item_tipo VARCHAR(30)",
  "ALTER TABLE agendamento ADD COLUMN IF NOT EXISTS item_origem_id BIGINT",
  "ALTER TABLE agendamento ADD COLUMN IF NOT EXISTS item_nome VARCHAR(200)",
  "ALTER TABLE agendamento ADD COLUMN IF NOT EXISTS item_dias_semana VARCHAR(200)",
  "ALTER TABLE agendamento ADD COLUMN IF NOT EXISTS item_local VARCHAR(200)",
  "ALTER TABLE agendamento ADD COLUMN IF NOT EXISTS dia_semana VARCHAR(40)",
  `
    CREATE TABLE IF NOT EXISTS agendamento_lista_espera (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      beneficiario_id BIGINT,
      beneficiario_nome VARCHAR(200) NOT NULL,
      familia_id BIGINT,
      familia_nome VARCHAR(200),
      unidade VARCHAR(160),
      setor VARCHAR(160),
      tipo_atendimento VARCHAR(160) NOT NULL,
      profissional_preferencial VARCHAR(200),
      faixa_horario_preferida VARCHAR(120),
      prioridade VARCHAR(40) DEFAULT 'Normal',
      motivo TEXT,
      observacao TEXT,
      data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
      encaixe_automatico BOOLEAN NOT NULL DEFAULT FALSE,
      convertido_agendamento_id BIGINT,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
  "ALTER TABLE agendamento_lista_espera ADD COLUMN IF NOT EXISTS tenant_id UUID",
  `
    CREATE TABLE IF NOT EXISTS agendamento_log (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      agendamento_id BIGINT,
      acao VARCHAR(80) NOT NULL,
      usuario_id BIGINT,
      usuario_nome VARCHAR(160),
      valor_anterior JSONB,
      valor_novo JSONB,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
  "ALTER TABLE agendamento_log ADD COLUMN IF NOT EXISTS tenant_id UUID",
  `
    CREATE TABLE IF NOT EXISTS agendamento_beneficiario (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      agendamento_id BIGINT NOT NULL REFERENCES agendamento(id) ON DELETE CASCADE,
      beneficiario_id BIGINT,
      beneficiario_nome VARCHAR(200) NOT NULL,
      telefone VARCHAR(40),
      email VARCHAR(160),
      status VARCHAR(80) NOT NULL DEFAULT 'Agendado',
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
  "ALTER TABLE agendamento_beneficiario ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "CREATE INDEX IF NOT EXISTS agendamento_beneficiario_agendamento_idx ON agendamento_beneficiario(agendamento_id)",
  "CREATE INDEX IF NOT EXISTS agendamento_beneficiario_tenant_idx ON agendamento_beneficiario(tenant_id, agendamento_id)",
  "CREATE INDEX IF NOT EXISTS agendamento_beneficiario_beneficiario_idx ON agendamento_beneficiario(beneficiario_id)",
  `
    CREATE TABLE IF NOT EXISTS agendamento_sala (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      agendamento_id BIGINT NOT NULL REFERENCES agendamento(id) ON DELETE CASCADE,
      sala_unidade_id BIGINT NOT NULL REFERENCES salas_unidade(id) ON DELETE RESTRICT,
      sala_nome VARCHAR(120) NOT NULL,
      data_agendamento DATE NOT NULL,
      hora_inicial TIME NOT NULL,
      hora_final TIME,
      status VARCHAR(80) NOT NULL DEFAULT 'Agendado',
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
  "ALTER TABLE agendamento_sala ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "CREATE UNIQUE INDEX IF NOT EXISTS agendamento_sala_unique_idx ON agendamento_sala(agendamento_id, sala_unidade_id)",
  "CREATE INDEX IF NOT EXISTS agendamento_sala_tenant_idx ON agendamento_sala(tenant_id, data_agendamento, hora_inicial)",
  "CREATE INDEX IF NOT EXISTS agendamento_sala_sala_idx ON agendamento_sala(tenant_id, sala_unidade_id, data_agendamento, hora_inicial)",
  "CREATE INDEX IF NOT EXISTS agendamento_sala_agendamento_idx ON agendamento_sala(agendamento_id)",
  `
    CREATE TABLE IF NOT EXISTS agendamento_envio (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      agendamento_id BIGINT NOT NULL REFERENCES agendamento(id) ON DELETE CASCADE,
      beneficiario_id BIGINT,
      canal VARCHAR(20) NOT NULL,
      status VARCHAR(40) NOT NULL,
      destinatario VARCHAR(200),
      mensagem TEXT,
      data_envio TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
  "ALTER TABLE agendamento_envio ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "CREATE INDEX IF NOT EXISTS agendamento_envio_tenant_idx ON agendamento_envio(tenant_id, agendamento_id)",
  `
    INSERT INTO agendamento_sala (
      tenant_id,
      agendamento_id,
      sala_unidade_id,
      sala_nome,
      data_agendamento,
      hora_inicial,
      hora_final,
      status,
      criado_em,
      atualizado_em
    )
    SELECT
      a.tenant_id,
      a.id,
      su.id,
      su.nome,
      a.data_agendamento,
      a.hora_inicial,
      a.hora_final,
      COALESCE(a.status, 'Agendado'),
      NOW(),
      NOW()
    FROM agendamento a
    INNER JOIN unidade_assistencial ua ON ua.tenant_id = a.tenant_id
    INNER JOIN salas_unidade su ON su.unidade_id = ua.id
    WHERE a.sala IS NOT NULL
      AND TRIM(a.sala) <> ''
      AND LOWER(TRIM(su.nome)) = LOWER(TRIM(a.sala))
    ON CONFLICT (agendamento_id, sala_unidade_id) DO NOTHING
  `
];

let estruturaPromise: Promise<void> | null = null;

function formatarHora(value?: string | null) {
  const texto = String(value ?? "").trim();
  if (!texto) return null;
  return texto.length === 5 ? `${texto}:00` : texto;
}

function formatarHoraExibicao(value?: Date | string | null) {
  if (!value) return "---";
  if (value instanceof Date) {
    const horas = String(value.getUTCHours()).padStart(2, "0");
    const minutos = String(value.getUTCMinutes()).padStart(2, "0");
    return `${horas}:${minutos}`;
  }

  const texto = String(value).trim();
  if (!texto) return "---";
  const match = texto.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : texto;
}

function formatarDataEntrada(value?: Date | string | null) {
  if (!value) return undefined;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const texto = String(value).trim();
  if (!texto) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
    return texto.slice(0, 10);
  }

  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) return undefined;
  return data.toISOString().slice(0, 10);
}

function formatarHoraEntrada(value?: Date | string | null) {
  if (!value) return undefined;
  if (value instanceof Date) {
    const horas = String(value.getUTCHours()).padStart(2, "0");
    const minutos = String(value.getUTCMinutes()).padStart(2, "0");
    const segundos = String(value.getUTCSeconds()).padStart(2, "0");
    return `${horas}:${minutos}:${segundos}`;
  }

  const texto = String(value).trim();
  if (!texto) return undefined;
  const match = texto.match(/^(\d{2}:\d{2})(?::(\d{2}))?$/);
  if (!match) return undefined;
  return `${match[1]}:${match[2] ?? "00"}`;
}

function formatarData(value?: string | null) {
  return toOptionalDate(value);
}

function sqlTime(value?: string | null) {
  const horario = formatarHora(value);
  if (!horario) return Prisma.sql`NULL`;
  if (!/^\d{2}:\d{2}:\d{2}$/.test(horario)) {
    throw new AppError("Horario invalido para agendamento.", 400);
  }
  return Prisma.raw(`TIME '${horario}'`);
}

function serializarJson(value: unknown) {
  return JSON.stringify(value ?? null, (_key, currentValue) =>
    typeof currentValue === "bigint" ? currentValue.toString() : currentValue
  );
}

function normalizarTextoComparacao(valor?: string | null) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function chaveParticipantePorNome(nome?: string | null) {
  return `nome:${normalizarTextoComparacao(nome)}`;
}

function normalizarTextoSql(campo: Prisma.Sql) {
  return Prisma.sql`
    LOWER(
      TRANSLATE(
        REGEXP_REPLACE(TRIM(COALESCE(${campo}, '')), '\s+', ' ', 'g'),
        'ÁÀÃÂÄáàãâäÉÈÊËéèêëÍÌÎÏíìîïÓÒÕÔÖóòõôöÚÙÛÜúùûüÇçÑñ',
        'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
      )
    )
  `;
}

function formatarDataMensagem(value?: Date | string | null) {
  if (!value) return "";
  if (value instanceof Date) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC"
    }).format(value);
  }

  const texto = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const [ano, mes, dia] = texto.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) {
    return texto;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(data);
}

function formatarHoraMensagem(value?: Date | string | null) {
  if (!value) return "";
  if (value instanceof Date) {
    const horas = String(value.getUTCHours()).padStart(2, "0");
    const minutos = String(value.getUTCMinutes()).padStart(2, "0");
    return `${horas}:${minutos}`;
  }

  const texto = String(value);
  const match = texto.match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : texto;
}

function extrairTelefoneContato(contato?: {
  telefone?: string | null;
  telefone_principal?: string | null;
} | null) {
  if (!contato) return undefined;
  if (typeof contato.telefone_principal === "string" && normalizeDigits(contato.telefone_principal)) {
    return contato.telefone_principal;
  }
  if (typeof contato.telefone === "string" && normalizeDigits(contato.telefone)) {
    return contato.telefone;
  }
  return undefined;
}

function sqlTelefoneLimpo(campo: Prisma.Sql) {
  return Prisma.sql`
    NULLIF(
      REGEXP_REPLACE(COALESCE(${campo}, ''), '\D', '', 'g'),
      ''
    )
  `;
}

function extrairEmailContato(contato?: { email?: string | null } | null) {
  if (!contato) return undefined;
  if (typeof contato.email === "string" && contato.email.trim().length) {
    return contato.email;
  }
  return undefined;
}

function lerInteiroParticipante(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const normalizado = value.trim();
    if (/^\d+$/.test(normalizado)) {
      const parsed = Number(normalizado);
      if (Number.isInteger(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }
  return null;
}

function lerTextoParticipante(value: unknown) {
  if (typeof value !== "string") return null;
  const normalizado = value.trim();
  return normalizado.length ? normalizado : null;
}

type UsuarioActor = { id?: string; nome?: string; nomeUsuario?: string };

export async function ensureAgendamentosEstrutura() {
  if (!estruturaPromise) {
    estruturaPromise = (async () => {
      for (const comando of estruturaSql) {
        await prisma.$executeRawUnsafe(comando);
      }
    })();
  }

  await estruturaPromise;
}

export class AgendamentosRepository {
  private readonly emailService = new EmailService();
  private readonly colunaExisteCache = new Map<string, boolean>();

  async ensureEstrutura() {
    await ensureAgendamentosEstrutura();
  }

  private async colunaExiste(tabela: string, coluna: string, db: PrismaExecutor = prisma) {
    const chave = `${tabela}.${coluna}`;
    if (this.colunaExisteCache.has(chave)) {
      return this.colunaExisteCache.get(chave) ?? false;
    }

    const rows = await db.$queryRaw<Array<{ existe: boolean }>>(Prisma.sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = ${tabela}
          AND column_name = ${coluna}
      ) AS existe
    `);
    const existe = Boolean(rows[0]?.existe);
    this.colunaExisteCache.set(chave, existe);
    return existe;
  }

  private async resolverFamiliaDoBeneficiario(beneficiarioId?: number | null) {
    if (!beneficiarioId) {
      return { familiaId: null, familiaNome: null, responsavelNome: null };
    }

    const rows = await prisma.$queryRaw<Array<{ familia_id: bigint; familia_nome: string | null; responsavel_nome: string | null }>>(Prisma.sql`
      SELECT vf.id AS familia_id, vf.nome_familia AS familia_nome, ref.nome_completo AS responsavel_nome
      FROM vinculo_familiar_membro m
      INNER JOIN vinculo_familiar vf ON vf.id = m.vinculo_familiar_id AND vf.status = 'ATIVO'
      LEFT JOIN cadastro_beneficiario ref ON ref.id = vf.id_referencia_familiar
      WHERE m.beneficiario_id = ${BigInt(beneficiarioId)}
      ORDER BY vf.id DESC
      LIMIT 1
    `);

    return {
      familiaId: rows[0]?.familia_id ?? null,
      familiaNome: rows[0]?.familia_nome ?? null,
      responsavelNome: rows[0]?.responsavel_nome ?? null
    };
  }

  private async registrarLog(
    agendamentoId: bigint | null,
    acao: string,
    usuario: UsuarioActor | undefined,
    tenantId: string,
    anterior?: unknown,
    novo?: unknown,
    db: PrismaExecutor = prisma
  ) {
    await db.$executeRaw(Prisma.sql`
      INSERT INTO agendamento_log (
        tenant_id, agendamento_id, acao, usuario_id, usuario_nome, valor_anterior, valor_novo
      ) VALUES (
        ${tenantId}::uuid,
        ${agendamentoId},
        ${acao},
        ${usuario?.id ? BigInt(usuario.id) : null},
        ${trimOrUndefined(usuario?.nome ?? usuario?.nomeUsuario)},
        ${anterior ? Prisma.sql`${serializarJson(anterior)}::jsonb` : Prisma.sql`NULL`},
        ${novo ? Prisma.sql`${serializarJson(novo)}::jsonb` : Prisma.sql`NULL`}
      )
    `);
  }

  private async registrarHistoricoFamilia(
    familiaId?: bigint | null,
    descricao?: string,
    dadosNovos?: unknown,
    tenantId?: string,
    db: PrismaExecutor = prisma
  ) {
    if (!familiaId) return;

    await db.$executeRaw(Prisma.sql`
      INSERT INTO familia_historico (
        tenant_id, familia_id, tipo_evento, descricao, dados_novos, data_evento
      ) VALUES (
        ${tenantId ? Prisma.sql`${tenantId}::uuid` : Prisma.sql`NULL`},
        ${familiaId},
        'agendamento',
        ${descricao ?? 'Agendamento vinculado à família.'},
        ${dadosNovos ? Prisma.sql`${serializarJson(dadosNovos)}::jsonb` : Prisma.sql`NULL`},
        NOW()
      )
    `);
  }

  private formatarDiaSemana(value: string) {
    const data = new Date(`${value}T12:00:00`);
    if (Number.isNaN(data.getTime())) return null;
    return new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(data);
  }

  private async verificarDuplicidadeAgenda(
    payload: {
      data: string;
      horaInicial: string;
      profissionalNome?: string | null;
      tipoAtendimento?: string | null;
      itemTipo?: string | null;
      itemOrigemId?: number | null;
    },
    tenantId: string,
    idIgnorar?: bigint | null,
    db: PrismaExecutor = prisma
  ) {
    const criterios: Prisma.Sql[] = [
      Prisma.sql`a.data_agendamento = ${formatarData(payload.data)}`,
      Prisma.sql`a.hora_inicial = ${sqlTime(payload.horaInicial)}`
    ];

    if (trimOrUndefined(payload.profissionalNome)) {
      criterios.push(Prisma.sql`LOWER(COALESCE(a.profissional_nome, '')) = LOWER(${trimOrUndefined(payload.profissionalNome)})`);
    }

    if (trimOrUndefined(payload.tipoAtendimento)) {
      criterios.push(Prisma.sql`LOWER(COALESCE(a.tipo_atendimento, '')) = LOWER(${trimOrUndefined(payload.tipoAtendimento)})`);
    }

    if (trimOrUndefined(payload.itemTipo)) {
      criterios.push(Prisma.sql`LOWER(COALESCE(a.item_tipo, '')) = LOWER(${trimOrUndefined(payload.itemTipo)})`);
    }

    if (payload.itemOrigemId) {
      criterios.push(Prisma.sql`a.item_origem_id = ${BigInt(payload.itemOrigemId)}`);
    }

    if (idIgnorar) {
      criterios.push(Prisma.sql`a.id <> ${idIgnorar}`);
    }

    const rows = await db.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT a.id
      FROM agendamento a
      WHERE a.tenant_id::text = ${tenantId}
        AND COALESCE(a.status, '') <> 'Cancelado'
        AND ${Prisma.join(criterios, " AND ")}
      ORDER BY a.id DESC
      LIMIT 1
    `);

    return rows[0]?.id ?? null;
  }

  private chaveParticipante(nome?: string | null, beneficiarioId?: bigint | null) {
    if (beneficiarioId) {
      return `id:${beneficiarioId.toString()}`;
    }
    return chaveParticipantePorNome(nome);
  }

  private async listarBeneficiariosAgendamentoComContato(agendamentoIds: bigint[], tenantId: string) {
    if (!agendamentoIds.length) {
      return [];
    }

    return prisma.$queryRaw<AgendamentoBeneficiarioRow[]>(Prisma.sql`
      SELECT
        ab.id,
        ab.agendamento_id,
        COALESCE(ab.beneficiario_id, contato.beneficiario_id) AS beneficiario_id,
        contato.codigo AS codigo,
        ab.beneficiario_nome,
        contato.data_nascimento AS data_nascimento,
        COALESCE(
          ${sqlTelefoneLimpo(Prisma.sql`ab.telefone`)},
          ${sqlTelefoneLimpo(Prisma.sql`contato.telefone_principal`)},
          ${sqlTelefoneLimpo(Prisma.sql`contato.telefone_secundario`)},
          ${sqlTelefoneLimpo(Prisma.sql`contato.telefone_recado_numero`)}
        ) AS telefone,
        COALESCE(NULLIF(TRIM(ab.email), ''), NULLIF(TRIM(contato.email), '')) AS email,
        ab.status,
        ab.criado_em,
        ab.atualizado_em
      FROM agendamento_beneficiario ab
      LEFT JOIN LATERAL (
        SELECT
          b.id AS beneficiario_id,
          b.codigo,
          b.data_nascimento,
          contato_beneficio.telefone_principal,
          contato_beneficio.telefone_secundario,
          contato_beneficio.telefone_recado_numero,
          contato_beneficio.email
        FROM cadastro_beneficiario b
        LEFT JOIN LATERAL (
          SELECT
            c.telefone_principal,
            c.telefone_secundario,
            c.telefone_recado_numero,
            c.email
          FROM contato_beneficiario c
          WHERE c.beneficiario_id = b.id
            AND c.tenant_id::text = ${tenantId}
          ORDER BY
            CASE
              WHEN COALESCE(
                NULLIF(TRIM(c.telefone_principal), ''),
                NULLIF(TRIM(c.telefone_secundario), ''),
                NULLIF(TRIM(c.telefone_recado_numero), '')
              ) IS NULL THEN 1
              ELSE 0
            END,
            c.id DESC
          LIMIT 1
        ) contato_beneficio ON TRUE
        WHERE b.tenant_id::text = ${tenantId}
          AND (
            (ab.beneficiario_id IS NOT NULL AND b.id = ab.beneficiario_id)
            OR ${normalizarTextoSql(Prisma.sql`b.nome_completo`)} = ${normalizarTextoSql(Prisma.sql`ab.beneficiario_nome`)}
          )
        ORDER BY
          CASE
            WHEN ab.beneficiario_id IS NOT NULL AND b.id = ab.beneficiario_id
            THEN 0
            WHEN ${normalizarTextoSql(Prisma.sql`b.nome_completo`)} = ${normalizarTextoSql(Prisma.sql`ab.beneficiario_nome`)}
            THEN 1
            ELSE 2
          END,
          CASE
            WHEN COALESCE(
              ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_principal`)},
              ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_secundario`)},
              ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_recado_numero`)}
            ) IS NOT NULL
              OR b.data_nascimento IS NOT NULL
            THEN 0
            ELSE 1
          END,
          b.id DESC
        LIMIT 1
      ) contato ON TRUE
      WHERE ab.agendamento_id IN (${Prisma.join(agendamentoIds)})
        AND ab.tenant_id::text = ${tenantId}
      ORDER BY ab.agendamento_id ASC, ab.beneficiario_nome ASC
    `);
  }

  private async listarContatosPorParticipantes(
    participantes: Array<{ beneficiarioId?: number | null; beneficiarioNome?: string | null }>,
    tenantId: string
  ) {
    const ids = Array.from(
      new Set(
        participantes
          .map((participante) => participante.beneficiarioId)
          .filter((valor): valor is number => Number.isInteger(valor) && Number(valor) > 0)
      )
    );
    const nomes = Array.from(
      new Set(
        participantes
          .map((participante) => normalizarTextoComparacao(participante.beneficiarioNome))
          .filter(Boolean)
      )
    );

    if (!ids.length && !nomes.length) {
      return [];
    }

    const filtros: Prisma.Sql[] = [];
    if (ids.length) {
      filtros.push(Prisma.sql`b.id IN (${Prisma.join(ids.map((id) => BigInt(id)))})`);
    }
    if (nomes.length) {
      filtros.push(Prisma.sql`
        ${normalizarTextoSql(Prisma.sql`b.nome_completo`)} IN (${Prisma.join(nomes)})
      `);
    }

      return prisma.$queryRaw<Array<{ beneficiario_id: bigint; codigo: string | null; beneficiario_nome: string; data_nascimento: Date | null; telefone: string | null; email: string | null }>>(Prisma.sql`
      SELECT
        b.id AS beneficiario_id,
        b.codigo,
        b.nome_completo AS beneficiario_nome,
        b.data_nascimento,
        COALESCE(
          ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_principal`)},
          ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_secundario`)},
          ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_recado_numero`)}
        ) AS telefone,
        NULLIF(TRIM(contato_beneficio.email), '') AS email
      FROM cadastro_beneficiario b
      LEFT JOIN LATERAL (
        SELECT
          c.telefone_principal,
          c.telefone_secundario,
          c.telefone_recado_numero,
          c.email
        FROM contato_beneficiario c
        WHERE c.beneficiario_id = b.id
          AND c.tenant_id::text = ${tenantId}
        ORDER BY
          CASE
            WHEN COALESCE(
              NULLIF(TRIM(c.telefone_principal), ''),
              NULLIF(TRIM(c.telefone_secundario), ''),
              NULLIF(TRIM(c.telefone_recado_numero), '')
            ) IS NULL THEN 1
            ELSE 0
          END,
          c.id DESC
        LIMIT 1
      ) contato_beneficio ON TRUE
      WHERE b.tenant_id::text = ${tenantId}
        AND (${Prisma.join(filtros, " OR ")})
      ORDER BY
        CASE
          WHEN ${normalizarTextoSql(Prisma.sql`b.nome_completo`)} IN (${Prisma.join(nomes)})
          THEN 0
          WHEN b.id IN (${Prisma.join(ids.map((id) => BigInt(id)))})
          THEN 1
          ELSE 2
        END,
        b.id DESC
    `);
  }

  private async listarContatosPorNomes(nomesEntrada: Array<string | null | undefined>, tenantId: string) {
    const nomes = Array.from(
      new Set(
        nomesEntrada
          .map((nome) => normalizarTextoComparacao(nome))
          .filter(Boolean)
      )
    );

    if (!nomes.length) {
      return [];
    }

    return prisma.$queryRaw<
      Array<{
        beneficiario_id: bigint;
        codigo: string | null;
        beneficiario_nome: string;
        data_nascimento: Date | null;
        telefone: string | null;
        email: string | null;
      }>
    >(Prisma.sql`
      SELECT
        b.id AS beneficiario_id,
        b.codigo,
        b.nome_completo AS beneficiario_nome,
        b.data_nascimento,
        COALESCE(
          ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_principal`)},
          ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_secundario`)},
          ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_recado_numero`)}
        ) AS telefone,
        NULLIF(TRIM(contato_beneficio.email), '') AS email
      FROM cadastro_beneficiario b
      LEFT JOIN LATERAL (
        SELECT
          c.telefone_principal,
          c.telefone_secundario,
          c.telefone_recado_numero,
          c.email
        FROM contato_beneficiario c
        WHERE c.beneficiario_id = b.id
          AND c.tenant_id::text = ${tenantId}
        ORDER BY
          CASE
            WHEN COALESCE(
              NULLIF(TRIM(c.telefone_principal), ''),
              NULLIF(TRIM(c.telefone_secundario), ''),
              NULLIF(TRIM(c.telefone_recado_numero), '')
            ) IS NULL THEN 1
            ELSE 0
          END,
          c.id DESC
        LIMIT 1
      ) contato_beneficio ON TRUE
      WHERE b.tenant_id::text = ${tenantId}
        AND LOWER(unaccent(TRIM(COALESCE(b.nome_completo, '')))) IN (${Prisma.join(nomes)})
      ORDER BY
        CASE
          WHEN COALESCE(
            ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_principal`)},
            ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_secundario`)},
            ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_recado_numero`)}
          ) IS NOT NULL
            OR b.data_nascimento IS NOT NULL
          THEN 0
          ELSE 1
        END,
        b.id DESC
    `);
  }

  private async listarContatosPorMatriculas(matriculaIds: number[], tenantId: string) {
    const ids = Array.from(
      new Set(matriculaIds.filter((valor) => Number.isInteger(valor) && Number(valor) > 0))
    );

    if (!ids.length) {
      return [];
    }

    return prisma.$queryRaw<
      Array<{
        matricula_id: bigint;
        beneficiario_id: bigint | null;
        beneficiario_nome: string;
        codigo: string | null;
        data_nascimento: Date | null;
        telefone_principal: string | null;
        email: string | null;
      }>
    >(Prisma.sql`
      SELECT
        m.id AS matricula_id,
        contato.beneficiario_id,
        contato.codigo,
        m.beneficiario_nome,
        contato.data_nascimento,
        contato.telefone_principal,
        contato.email
      FROM cursos_atendimentos_matriculas m
      LEFT JOIN LATERAL (
        SELECT
          b.id AS beneficiario_id,
          b.codigo,
          b.data_nascimento,
          COALESCE(
            ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_principal`)},
            ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_secundario`)},
            ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_recado_numero`)}
          ) AS telefone_principal,
          NULLIF(TRIM(contato_beneficio.email), '') AS email
        FROM cadastro_beneficiario b
        LEFT JOIN LATERAL (
          SELECT
            c2.telefone_principal,
            c2.telefone_secundario,
            c2.telefone_recado_numero,
            c2.email
          FROM contato_beneficiario c2
          WHERE c2.beneficiario_id = b.id
            AND c2.tenant_id::text = ${tenantId}
          ORDER BY
            CASE
              WHEN COALESCE(
                NULLIF(TRIM(c2.telefone_principal), ''),
                NULLIF(TRIM(c2.telefone_secundario), ''),
                NULLIF(TRIM(c2.telefone_recado_numero), '')
              ) IS NULL THEN 1
              ELSE 0
            END,
            c2.id DESC
          LIMIT 1
        ) contato_beneficio ON TRUE
        LEFT JOIN LATERAL (
          SELECT numero_documento
          FROM documentos d
          WHERE d.beneficiario_id = b.id
            AND d.tenant_id::text = ${tenantId}
            AND (
              UPPER(COALESCE(d.tipo_documento, '')) = 'CPF'
              OR UPPER(COALESCE(d.nome_documento, '')) LIKE '%CPF%'
            )
          ORDER BY d.id DESC
          LIMIT 1
        ) doc ON TRUE
        WHERE b.tenant_id::text = ${tenantId}
          AND (
            (
              REGEXP_REPLACE(COALESCE(m.cpf, ''), '\D', '', 'g') <> ''
              AND REGEXP_REPLACE(COALESCE(doc.numero_documento, ''), '\D', '', 'g') =
                REGEXP_REPLACE(COALESCE(m.cpf, ''), '\D', '', 'g')
            )
            OR ${normalizarTextoSql(Prisma.sql`b.nome_completo`)} = ${normalizarTextoSql(Prisma.sql`m.beneficiario_nome`)}
          )
        ORDER BY
          CASE
            WHEN COALESCE(
              ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_principal`)},
              ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_secundario`)},
              ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_recado_numero`)}
            ) IS NOT NULL
              OR b.data_nascimento IS NOT NULL
            THEN 0
            ELSE 1
          END,
          CASE
            WHEN REGEXP_REPLACE(COALESCE(m.cpf, ''), '\D', '', 'g') <> ''
              AND REGEXP_REPLACE(COALESCE(doc.numero_documento, ''), '\D', '', 'g') =
                REGEXP_REPLACE(COALESCE(m.cpf, ''), '\D', '', 'g')
            THEN 0
            WHEN ${normalizarTextoSql(Prisma.sql`b.nome_completo`)} = ${normalizarTextoSql(Prisma.sql`m.beneficiario_nome`)}
            THEN 1
            ELSE 2
          END,
          b.id DESC
        LIMIT 1
      ) contato ON TRUE
      WHERE m.tenant_id::text = ${tenantId}
        AND m.id IN (${Prisma.join(ids.map((id) => BigInt(id)))})
    `);
  }

  private async listarContatosPorItensOperacionais(itemIds: number[], tenantId: string) {
    const ids = Array.from(new Set(itemIds.filter((valor) => Number.isInteger(valor) && Number(valor) > 0)));

    if (!ids.length) {
      return [];
    }

    return prisma.$queryRaw<
      Array<{
        item_origem_id: bigint;
        matricula_id: bigint;
        beneficiario_id: bigint | null;
        beneficiario_nome: string;
        codigo: string | null;
        data_nascimento: Date | null;
        telefone: string | null;
        email: string | null;
      }>
    >(Prisma.sql`
      SELECT
        m.curso_id AS item_origem_id,
        m.id AS matricula_id,
        contato.beneficiario_id,
        contato.codigo,
        m.beneficiario_nome,
        contato.data_nascimento,
        contato.telefone AS telefone,
        COALESCE(NULLIF(TRIM(m.email), ''), contato.email) AS email
      FROM cursos_atendimentos_matriculas m
      LEFT JOIN LATERAL (
        SELECT
          b.id AS beneficiario_id,
          b.codigo,
          b.data_nascimento,
          COALESCE(
            ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_principal`)},
            ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_secundario`)},
            ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_recado_numero`)}
          ) AS telefone,
          NULLIF(TRIM(contato_beneficio.email), '') AS email
        FROM cadastro_beneficiario b
        LEFT JOIN LATERAL (
          SELECT
            c2.telefone_principal,
            c2.telefone_secundario,
            c2.telefone_recado_numero,
            c2.email
          FROM contato_beneficiario c2
          WHERE c2.beneficiario_id = b.id
            AND c2.tenant_id::text = ${tenantId}
          ORDER BY
            CASE
              WHEN COALESCE(
                NULLIF(TRIM(c2.telefone_principal), ''),
                NULLIF(TRIM(c2.telefone_secundario), ''),
                NULLIF(TRIM(c2.telefone_recado_numero), '')
              ) IS NULL THEN 1
              ELSE 0
            END,
            c2.id DESC
          LIMIT 1
        ) contato_beneficio ON TRUE
        LEFT JOIN LATERAL (
          SELECT numero_documento
          FROM documentos d
          WHERE d.beneficiario_id = b.id
            AND d.tenant_id::text = ${tenantId}
            AND (
              UPPER(COALESCE(d.tipo_documento, '')) = 'CPF'
              OR UPPER(COALESCE(d.nome_documento, '')) LIKE '%CPF%'
            )
          ORDER BY d.id DESC
          LIMIT 1
        ) doc ON TRUE
        WHERE b.tenant_id::text = ${tenantId}
          AND (
            (
              REGEXP_REPLACE(COALESCE(m.cpf, ''), '\D', '', 'g') <> ''
              AND REGEXP_REPLACE(COALESCE(doc.numero_documento, ''), '\D', '', 'g') =
                REGEXP_REPLACE(COALESCE(m.cpf, ''), '\D', '', 'g')
            )
            OR ${normalizarTextoSql(Prisma.sql`b.nome_completo`)} = ${normalizarTextoSql(Prisma.sql`m.beneficiario_nome`)}
          )
        ORDER BY
          CASE
            WHEN COALESCE(
              ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_principal`)},
              ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_secundario`)},
              ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_recado_numero`)}
            ) IS NOT NULL
              OR b.data_nascimento IS NOT NULL
            THEN 0
            ELSE 1
          END,
          CASE
            WHEN REGEXP_REPLACE(COALESCE(m.cpf, ''), '\D', '', 'g') <> ''
              AND REGEXP_REPLACE(COALESCE(doc.numero_documento, ''), '\D', '', 'g') =
                REGEXP_REPLACE(COALESCE(m.cpf, ''), '\D', '', 'g')
            THEN 0
            WHEN ${normalizarTextoSql(Prisma.sql`b.nome_completo`)} = ${normalizarTextoSql(Prisma.sql`m.beneficiario_nome`)}
            THEN 1
            ELSE 2
          END,
          b.id DESC
        LIMIT 1
      ) contato ON TRUE
      WHERE m.curso_id IN (${Prisma.join(ids.map((id) => BigInt(id)))})
        AND m.tenant_id::text = ${tenantId}
      ORDER BY m.curso_id ASC, m.beneficiario_nome ASC
    `);
  }

  private async hidratarParticipantesAgendamentos(rows: AgendamentoRow[], tenantId: string) {
    if (!rows.length) {
      return rows;
    }

    const contatos = await this.listarBeneficiariosAgendamentoComContato(
      rows.map((row) => row.id),
      tenantId
    );

    const contatosPorAgendamento = new Map<string, AgendamentoBeneficiarioRow[]>();
    for (const contato of contatos) {
      const chave = contato.agendamento_id.toString();
      const lista = contatosPorAgendamento.get(chave);
      if (lista) {
        lista.push(contato);
      } else {
        contatosPorAgendamento.set(chave, [contato]);
      }
    }

    const contatosFallback = await this.listarContatosPorParticipantes(
      rows.flatMap((row) =>
        Array.isArray(row.participantes)
          ? (row.participantes as Array<Record<string, unknown>>).map((participante) => ({
              beneficiarioId: lerInteiroParticipante(
                participante.beneficiarioId ?? participante.beneficiario_id
              ),
              beneficiarioNome: lerTextoParticipante(
                participante.beneficiarioNome ?? participante.beneficiario_nome
              )
            }))
          : []
      ),
      tenantId
    );
    const contatosPorNomeExato = await this.listarContatosPorNomes(
      rows.flatMap((row) =>
        Array.isArray(row.participantes)
          ? (row.participantes as Array<Record<string, unknown>>)
              .map((participante) =>
                lerTextoParticipante(participante.beneficiarioNome ?? participante.beneficiario_nome)
              )
              .filter((valor): valor is string => typeof valor === "string" && valor.trim().length > 0)
          : []
      ),
      tenantId
    );
    const contatosPorMatricula = await this.listarContatosPorMatriculas(
      rows.flatMap((row) =>
        Array.isArray(row.participantes)
          ? (row.participantes as Array<Record<string, unknown>>)
              .map((participante) =>
                lerInteiroParticipante(participante.matriculaId ?? participante.matricula_id)
              )
              .filter((valor): valor is number => Number.isInteger(valor) && Number(valor) > 0)
          : []
      ),
      tenantId
    );
    const contatosItensOperacionais = await this.listarContatosPorItensOperacionais(
      rows
        .map((row) => (row.item_origem_id ? Number(row.item_origem_id) : null))
        .filter((valor): valor is number => Number.isInteger(valor) && Number(valor) > 0),
      tenantId
    );
    const contatosPorMatriculaMap = new Map<
      number,
      {
        beneficiario_id: bigint | null;
        codigo: string | null;
        beneficiario_nome: string;
        data_nascimento: Date | null;
        telefone_principal: string | null;
        email: string | null;
      }
    >();
    for (const contato of contatosPorMatricula) {
      contatosPorMatriculaMap.set(Number(contato.matricula_id), contato);
    }
    const contatosItensPorChave = new Map<
      string,
      { beneficiario_nome: string; codigo: string | null; data_nascimento: Date | null; telefone: string | null; email: string | null }
    >();
    for (const contato of contatosItensOperacionais) {
      const itemOrigemId = Number(contato.item_origem_id);
      const matriculaId = Number(contato.matricula_id);
      contatosItensPorChave.set(`item:${itemOrigemId}:matricula:${matriculaId}`, {
        beneficiario_nome: contato.beneficiario_nome,
        codigo: contato.codigo,
        data_nascimento: contato.data_nascimento,
        telefone: contato.telefone,
        email: contato.email
      });
      contatosItensPorChave.set(
        `item:${itemOrigemId}:participante:${this.chaveParticipante(contato.beneficiario_nome, contato.beneficiario_id)}`,
        {
          beneficiario_nome: contato.beneficiario_nome,
          codigo: contato.codigo,
          data_nascimento: contato.data_nascimento,
          telefone: contato.telefone,
          email: contato.email
        }
      );
    }
    const contatosFallbackPorChave = new Map<
      string,
      { beneficiario_id: bigint; codigo: string | null; beneficiario_nome: string; data_nascimento: Date | null; telefone: string | null; email: string | null }
    >();
    const contatosFallbackPorNome = new Map<
      string,
      { beneficiario_id: bigint; codigo: string | null; beneficiario_nome: string; data_nascimento: Date | null; telefone: string | null; email: string | null }
    >();
    for (const contato of contatosFallback) {
      contatosFallbackPorChave.set(
        this.chaveParticipante(contato.beneficiario_nome, contato.beneficiario_id),
        contato
      );
      contatosFallbackPorNome.set(chaveParticipantePorNome(contato.beneficiario_nome), contato);
    }
    const contatosNomeExatoPorNome = new Map<
      string,
      { beneficiario_id: bigint; codigo: string | null; beneficiario_nome: string; data_nascimento: Date | null; telefone: string | null; email: string | null }
    >();
    for (const contato of contatosPorNomeExato) {
      contatosNomeExatoPorNome.set(chaveParticipantePorNome(contato.beneficiario_nome), contato);
    }

    return rows.map((row) => {
      const contatosDoAgendamento = contatosPorAgendamento.get(row.id.toString()) ?? [];
      const contatosPorChave = new Map<string, AgendamentoBeneficiarioRow>();

      for (const contato of contatosDoAgendamento) {
        contatosPorChave.set(
          this.chaveParticipante(contato.beneficiario_nome, contato.beneficiario_id),
          contato
        );
      }

      const participantesOriginais = Array.isArray(row.participantes)
        ? (row.participantes as Array<Record<string, unknown>>)
        : [];

      const participantes =
        participantesOriginais.length > 0
          ? participantesOriginais.map((participante) => {
              const matriculaId = lerInteiroParticipante(participante.matriculaId ?? participante.matricula_id);
              const beneficiarioIdNumero = lerInteiroParticipante(
                participante.beneficiarioId ?? participante.beneficiario_id
              );
              const itemOrigemId = row.item_origem_id ? Number(row.item_origem_id) : null;
              const beneficiarioId = beneficiarioIdNumero ? BigInt(beneficiarioIdNumero) : null;
              const nome = lerTextoParticipante(participante.beneficiarioNome ?? participante.beneficiario_nome) ?? "";
              const chaveParticipante = this.chaveParticipante(nome, beneficiarioId);
              const chaveNome = chaveParticipantePorNome(nome);
              const contatoMatriculaBruto = matriculaId ? contatosPorMatriculaMap.get(matriculaId) : undefined;
              const contatoMatricula =
                contatoMatriculaBruto &&
                normalizarTextoComparacao(contatoMatriculaBruto.beneficiario_nome) === normalizarTextoComparacao(nome)
                  ? contatoMatriculaBruto
                  : undefined;
              const contatoItemBruto =
                itemOrigemId && matriculaId
                  ? contatosItensPorChave.get(`item:${itemOrigemId}:matricula:${matriculaId}`)
                  : itemOrigemId
                    ? contatosItensPorChave.get(`item:${itemOrigemId}:participante:${chaveParticipante}`)
                    : undefined;
              const contatoItem =
                contatoItemBruto &&
                normalizarTextoComparacao(contatoItemBruto.beneficiario_nome) === normalizarTextoComparacao(nome)
                  ? contatoItemBruto
                  : undefined;
              const contatosCandidatos = [
                contatoMatricula,
                contatoItem,
                contatosNomeExatoPorNome.get(chaveNome),
                contatosPorChave.get(chaveParticipante),
                contatosFallbackPorChave.get(chaveParticipante),
                contatosFallbackPorNome.get(chaveNome)
              ].filter(Boolean) as Array<{
                data_nascimento?: Date | string | null;
                telefone?: string | null;
                telefone_principal?: string | null;
                codigo?: string | null;
                email?: string | null;
              }>;
              const contatoTelefone = contatosCandidatos.find((item) => extrairTelefoneContato(item));
              const contatoDataNascimento = contatosCandidatos.find((item) => item?.data_nascimento);
              const contatoCodigo = contatosCandidatos.find((item) => typeof item?.codigo === "string" && item.codigo.trim().length);
              const contatoEmail = contatosCandidatos.find((item) => extrairEmailContato(item));
              const contatoNomeExato = contatosNomeExatoPorNome.get(chaveNome);
              const telefoneParticipante =
                typeof participante.telefone === "string" && normalizeDigits(participante.telefone)
                  ? participante.telefone
                  : undefined;
              const emailParticipante =
                typeof participante.email === "string" && participante.email.trim().length
                  ? participante.email
                  : undefined;
              const dataNascimentoParticipante =
                typeof participante.dataNascimento === "string" && participante.dataNascimento.trim().length
                  ? participante.dataNascimento
                  : typeof participante.data_nascimento === "string" && participante.data_nascimento.trim().length
                    ? participante.data_nascimento
                    : undefined;

              return {
                ...participante,
                dataNascimento:
                  formatarDataEntrada(contatoNomeExato?.data_nascimento) ??
                  formatarDataEntrada(contatoMatricula?.data_nascimento) ??
                  formatarDataEntrada(contatoDataNascimento?.data_nascimento ?? null) ??
                  dataNascimentoParticipante,
                telefone:
                  extrairTelefoneContato(contatoTelefone) ??
                  (typeof contatoMatricula?.telefone_principal === "string" && normalizeDigits(contatoMatricula.telefone_principal)
                    ? contatoMatricula.telefone_principal
                    : telefoneParticipante),
                codigo:
                  (typeof contatoNomeExato?.codigo === "string" && contatoNomeExato.codigo.trim().length
                    ? contatoNomeExato.codigo
                    : undefined) ??
                  (typeof contatoMatricula?.codigo === "string" && contatoMatricula.codigo.trim().length
                    ? contatoMatricula.codigo
                    : typeof contatoCodigo?.codigo === "string" && contatoCodigo.codigo.trim().length
                      ? contatoCodigo.codigo
                      : undefined) ?? undefined,
                email:
                  typeof contatoNomeExato?.email === "string" && contatoNomeExato.email.trim().length
                    ? contatoNomeExato.email
                    : typeof contatoMatricula?.email === "string" && contatoMatricula.email.trim().length
                      ? contatoMatricula.email
                    : extrairEmailContato(contatoEmail) ?? emailParticipante
              };
            })
          : contatosDoAgendamento.map((contato) => ({
            beneficiarioId: contato.beneficiario_id ? Number(contato.beneficiario_id) : undefined,
            codigo: contato.codigo ?? undefined,
            beneficiarioNome: contato.beneficiario_nome,
            dataNascimento: toIsoDate(contato.data_nascimento ?? null),
            telefone: contato.telefone ?? undefined,
            email: contato.email ?? undefined,
              comparecimento: "Pendente"
            }));

      const contatoPrincipal =
        contatosDoAgendamento.find((contato) => contato.beneficiario_id && row.beneficiario_id && contato.beneficiario_id === row.beneficiario_id) ??
        contatosDoAgendamento[0] ??
        (row.beneficiario_id
          ? contatosFallbackPorChave.get(this.chaveParticipante(row.beneficiario_nome, row.beneficiario_id))
          : contatosFallbackPorChave.get(this.chaveParticipante(row.beneficiario_nome, null)));

      return {
        ...row,
        telefone: row.telefone ?? contatoPrincipal?.telefone ?? null,
        email: row.email ?? contatoPrincipal?.email ?? null,
        participantes
      };
    });
  }

  private async hidratarSalasAgendamentos(rows: AgendamentoRow[], tenantId: string) {
    if (!rows.length) {
      return rows;
    }

    const salas = await this.listarSalasPorAgendamento(
      rows.map((row) => row.id),
      tenantId
    );
    const salasPorAgendamento = new Map<string, Array<{ sala_id: bigint; sala_nome: string }>>();

    for (const sala of salas) {
      const chave = sala.agendamento_id.toString();
      const lista = salasPorAgendamento.get(chave);
      const item = { sala_id: sala.sala_id, sala_nome: sala.sala_nome };
      if (lista) {
        lista.push(item);
      } else {
        salasPorAgendamento.set(chave, [item]);
      }
    }

    return rows.map((row) => ({
      ...row,
      salas: salasPorAgendamento.get(row.id.toString()) ?? []
    }));
  }

  private async sincronizarBeneficiariosAgendamento(
    agendamentoId: bigint,
    tenantId: string,
    participantes: Array<{ beneficiarioId?: number | null; beneficiarioNome: string; telefone?: string | null; email?: string | null }>,
    db: PrismaExecutor = prisma
  ) {
    await db.$executeRaw(Prisma.sql`
      DELETE FROM agendamento_beneficiario
      WHERE agendamento_id = ${agendamentoId}
        AND tenant_id::text = ${tenantId}
    `);

    if (!participantes.length) {
      return;
    }

    const valores = participantes.map((participante) =>
      Prisma.sql`(
        ${tenantId}::uuid,
        ${agendamentoId},
        ${participante.beneficiarioId ? BigInt(participante.beneficiarioId) : null},
        ${participante.beneficiarioNome},
        ${trimOrUndefined(participante.telefone)},
        ${trimOrUndefined(participante.email)},
        'Agendado'
      )`
    );

    await db.$executeRaw(Prisma.sql`
      INSERT INTO agendamento_beneficiario (
        tenant_id, agendamento_id, beneficiario_id, beneficiario_nome, telefone, email, status
      ) VALUES ${Prisma.join(valores)}
    `);
  }

  async listarItensOperacionais(tipo: "curso" | "atendimento" | "oficina", busca: string | undefined, tenantId: string) {
    await this.ensureEstrutura();
    const termo = trimOrUndefined(busca);
    const possuiSalaId = await this.colunaExiste("cursos_atendimentos", "sala_id");

    return prisma.$queryRaw<AgendamentoOperacionalItemRow[]>(Prisma.sql`
      SELECT
        c.id,
        c.tipo,
        c.nome,
        c.profissional,
        TO_CHAR(c.horario_inicial, 'HH24:MI') AS horario_inicial,
        c.duracao_horas,
        c.dias_semana,
        ${possuiSalaId ? Prisma.sql` s.nome AS sala_nome, ` : Prisma.sql` NULL::text AS sala_nome, `}
        c.instituicao_parceira,
        c.status
      FROM cursos_atendimentos c
      ${possuiSalaId ? Prisma.sql`LEFT JOIN salas_unidade s ON s.id = c.sala_id` : Prisma.empty}
      WHERE LOWER(TRIM(COALESCE(c.tipo, ''))) = ${tipo}
        AND c.tenant_id::text = ${tenantId}
        AND COALESCE(c.status, 'Ativo') <> 'Inativo'
        ${termo ? Prisma.sql`AND (c.nome ILIKE ${`%${termo}%`} OR COALESCE(c.profissional, '') ILIKE ${`%${termo}%`})` : Prisma.empty}
      ORDER BY c.nome ASC
    `);
  }

  async obterItemOperacional(itemId: bigint, tenantId: string) {
    await this.ensureEstrutura();
    const possuiSalaId = await this.colunaExiste("cursos_atendimentos", "sala_id");

    const rows = await prisma.$queryRaw<AgendamentoOperacionalItemRow[]>(Prisma.sql`
      SELECT
        c.id,
        c.tipo,
        c.nome,
        c.profissional,
        TO_CHAR(c.horario_inicial, 'HH24:MI') AS horario_inicial,
        c.duracao_horas,
        c.dias_semana,
        ${possuiSalaId ? Prisma.sql` s.nome AS sala_nome, ` : Prisma.sql` NULL::text AS sala_nome, `}
        c.instituicao_parceira,
        c.status
      FROM cursos_atendimentos c
      ${possuiSalaId ? Prisma.sql`LEFT JOIN salas_unidade s ON s.id = c.sala_id` : Prisma.empty}
      WHERE c.id = ${itemId}
        AND c.tenant_id::text = ${tenantId}
        AND COALESCE(c.status, 'Ativo') <> 'Inativo'
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  async listarBeneficiariosOperacionais(itemId: bigint, tenantId: string) {
    await this.ensureEstrutura();

    return prisma.$queryRaw<AgendamentoOperacionalBeneficiarioRow[]>(Prisma.sql`
      SELECT
        m.id AS matricula_id,
        contato.beneficiario_id,
        m.beneficiario_nome,
        contato.data_nascimento,
        contato.telefone AS telefone,
        COALESCE(NULLIF(TRIM(m.email), ''), contato.email) AS email,
        m.status,
        m.cpf,
        COALESCE(NULLIF(TRIM(m.profissional_nome), ''), NULLIF(TRIM(c.profissional), '')) AS profissional_nome
      FROM cursos_atendimentos_matriculas m
      INNER JOIN cursos_atendimentos c ON c.id = m.curso_id
      LEFT JOIN LATERAL (
        SELECT
          b.id AS beneficiario_id,
          b.data_nascimento,
          COALESCE(
            ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_principal`)},
            ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_secundario`)},
            ${sqlTelefoneLimpo(Prisma.sql`contato_beneficio.telefone_recado_numero`)}
          ) AS telefone,
          contato_beneficio.email
        FROM cadastro_beneficiario b
        LEFT JOIN LATERAL (
          SELECT
            c2.telefone_principal,
            c2.telefone_secundario,
            c2.telefone_recado_numero,
            c2.email
          FROM contato_beneficiario c2
          WHERE c2.beneficiario_id = b.id
            AND c2.tenant_id::text = ${tenantId}
          ORDER BY
            CASE
              WHEN COALESCE(
                NULLIF(TRIM(c2.telefone_principal), ''),
                NULLIF(TRIM(c2.telefone_secundario), ''),
                NULLIF(TRIM(c2.telefone_recado_numero), '')
              ) IS NULL THEN 1
              ELSE 0
            END,
            c2.id DESC
          LIMIT 1
        ) contato_beneficio ON TRUE
        LEFT JOIN LATERAL (
          SELECT numero_documento
          FROM documentos d
          WHERE d.beneficiario_id = b.id
            AND d.tenant_id::text = ${tenantId}
            AND (
              UPPER(COALESCE(d.tipo_documento, '')) = 'CPF'
              OR UPPER(COALESCE(d.nome_documento, '')) LIKE '%CPF%'
            )
          ORDER BY d.id DESC
          LIMIT 1
        ) doc ON TRUE
        WHERE b.tenant_id::text = ${tenantId}
          AND (
            (
              REGEXP_REPLACE(COALESCE(m.cpf, ''), '\D', '', 'g') <> ''
              AND REGEXP_REPLACE(COALESCE(doc.numero_documento, ''), '\D', '', 'g') =
                REGEXP_REPLACE(COALESCE(m.cpf, ''), '\D', '', 'g')
            )
            OR ${normalizarTextoSql(Prisma.sql`b.nome_completo`)} = ${normalizarTextoSql(Prisma.sql`m.beneficiario_nome`)}
          )
        ORDER BY
          CASE
            WHEN REGEXP_REPLACE(COALESCE(m.cpf, ''), '\D', '', 'g') <> ''
              AND REGEXP_REPLACE(COALESCE(doc.numero_documento, ''), '\D', '', 'g') =
                REGEXP_REPLACE(COALESCE(m.cpf, ''), '\D', '', 'g')
            THEN 0
            WHEN ${normalizarTextoSql(Prisma.sql`b.nome_completo`)} = ${normalizarTextoSql(Prisma.sql`m.beneficiario_nome`)}
            THEN 1
            ELSE 2
          END,
          b.id DESC
        LIMIT 1
      ) contato ON TRUE
      WHERE m.curso_id = ${itemId}
        AND m.tenant_id::text = ${tenantId}
        AND c.tenant_id::text = ${tenantId}
      ORDER BY m.beneficiario_nome ASC
    `);
  }

  private async listarConflitos(payload: {
    data: string;
    horaInicial: string;
    horaFinal?: string | null;
    profissionalNome?: string | null;
    sala?: string | null;
    salasIds?: number[] | null;
    recurso?: string | null;
    idIgnorar?: bigint | null;
    tenantId: string;
  }, db: PrismaExecutor = prisma) {
    const horaInicial = formatarHora(payload.horaInicial);
    const horaFinal = formatarHora(payload.horaFinal) ?? formatarHora(payload.horaInicial);
    if (!horaInicial || !horaFinal) return [];

    const condicoes: Prisma.Sql[] = [
      Prisma.sql`a.data_agendamento = ${formatarData(payload.data)}`,
      Prisma.sql`COALESCE(a.status, '') NOT IN ('Cancelado', 'Faltou', 'Alta')`,
      Prisma.sql`(${horaInicial}::time <= COALESCE(a.hora_final, a.hora_inicial) AND ${horaFinal}::time >= a.hora_inicial)`
    ];

    if (payload.idIgnorar) {
      condicoes.push(Prisma.sql`a.id <> ${payload.idIgnorar}`);
    }

    const escopos: Prisma.Sql[] = [];
    if (trimOrUndefined(payload.profissionalNome)) {
      escopos.push(
        Prisma.sql`LOWER(COALESCE(a.profissional_nome, '')) = LOWER(${trimOrUndefined(payload.profissionalNome)})`
      );
    }
    const salasIds = Array.from(
      new Set((payload.salasIds ?? []).filter((id): id is number => Number.isInteger(id) && Number(id) > 0))
    );
    if (salasIds.length) {
      escopos.push(Prisma.sql`
        EXISTS (
          SELECT 1
          FROM agendamento_sala ass
          WHERE ass.agendamento_id = a.id
            AND ass.tenant_id::text = ${payload.tenantId}
            AND ass.sala_unidade_id IN (${Prisma.join(salasIds.map((id) => BigInt(id)))})
        )
      `);
    }
    if (trimOrUndefined(payload.sala)) {
      const sala = trimOrUndefined(payload.sala);
      escopos.push(Prisma.sql`
        EXISTS (
          SELECT 1
          FROM agendamento_sala ass
          WHERE ass.agendamento_id = a.id
            AND ass.tenant_id::text = ${payload.tenantId}
            AND LOWER(ass.sala_nome) = LOWER(${sala})
        )
        OR LOWER(COALESCE(a.sala, '')) = LOWER(${sala})
      `);
    }
    if (trimOrUndefined(payload.recurso)) {
      escopos.push(Prisma.sql`LOWER(COALESCE(a.recurso, '')) = LOWER(${trimOrUndefined(payload.recurso)})`);
    }

    if (!escopos.length) return [];

    return db.$queryRaw<
      Array<{
        id: bigint;
        beneficiario_nome: string;
        profissional_nome: string | null;
        sala: string | null;
        recurso: string | null;
        hora_inicial: string;
        hora_final: string | null;
        status: string | null;
      }>
    >(Prisma.sql`
      SELECT
        a.id,
        a.beneficiario_nome,
        a.profissional_nome,
        COALESCE(
          (
            SELECT STRING_AGG(ass.sala_nome, ', ' ORDER BY ass.sala_nome)
            FROM agendamento_sala ass
            WHERE ass.agendamento_id = a.id
              AND ass.tenant_id::text = ${payload.tenantId}
          ),
          a.sala
        ) AS sala,
        a.recurso,
        a.hora_inicial,
        a.hora_final,
        a.status
      FROM agendamento a
      WHERE a.tenant_id::text = ${payload.tenantId}
        AND ${Prisma.join(condicoes, " AND ")}
        AND (${Prisma.join(escopos, " OR ")})
      ORDER BY a.hora_inicial ASC
    `);
  }

  private formatarMensagemConflito(conflitos: Array<{
    id: bigint;
    beneficiario_nome: string;
    profissional_nome: string | null;
    sala: string | null;
    recurso: string | null;
    hora_inicial: string;
    hora_final: Date | string | null;
    status: string | null;
  }>) {
    const resumo = conflitos.slice(0, 3).map((item) => {
      const partes = [
        `ID ${item.id.toString()}`,
        item.beneficiario_nome,
        `Horário ${formatarHoraExibicao(item.hora_inicial)}${item.hora_final ? ` até ${formatarHoraExibicao(item.hora_final)}` : ""}`,
        item.profissional_nome ? `Profissional ${item.profissional_nome}` : null,
        item.sala ? `Sala ${item.sala}` : null,
        item.recurso ? `Recurso ${item.recurso}` : null,
        item.status ? `Status ${item.status}` : null
      ].filter(Boolean);
      return `- ${partes.join("\n- ")}`;
    });

    return [
      "Conflito de agenda identificado.",
      "Agendamento(s) bloqueador(es):",
      ...resumo
    ].join("\n");
  }

  async listarSalasAgendamento(tenantId: string, filtros?: { unidadeId?: string; sala?: string }) {
    await this.ensureEstrutura();
    const unidadeId = trimOrUndefined(filtros?.unidadeId);
    const sala = trimOrUndefined(filtros?.sala);

    const rows = await prisma.$queryRaw<
      Array<{
        sala_id: bigint;
        sala_nome: string;
        sala_ativo: boolean;
        unidade_id: bigint;
        unidade_nome: string | null;
      }>
    >(Prisma.sql`
      SELECT
        s.id AS sala_id,
        s.nome AS sala_nome,
        s.ativo AS sala_ativo,
        ua.id AS unidade_id,
        COALESCE(ua.nome_fantasia, ua.razao_social) AS unidade_nome
      FROM salas_unidade s
      INNER JOIN unidade_assistencial ua ON ua.id = s.unidade_id
      WHERE ua.tenant_id::text = ${tenantId}
        ${unidadeId ? Prisma.sql`AND ua.id = ${BigInt(unidadeId)}` : Prisma.empty}
        ${sala ? Prisma.sql`AND s.nome ILIKE ${`%${sala}%`}` : Prisma.empty}
      ORDER BY COALESCE(ua.nome_fantasia, ua.razao_social) ASC, s.nome ASC
    `);

    return rows.map((row) => ({
      id: Number(row.sala_id),
      nome: row.sala_nome,
      ativo: row.sala_ativo,
      unidadeId: Number(row.unidade_id),
      unidadeNome: row.unidade_nome ?? undefined
    }));
  }

  private async resolverSalasSelecionadas(
    input: { sala?: string | null; salasIds?: number[] | null; itemOrigemId?: number | null },
    tenantId: string,
    db: PrismaExecutor = prisma
  ) {
    const idsInformados = Array.from(
      new Set((input.salasIds ?? []).filter((id): id is number => Number.isInteger(id) && Number(id) > 0))
    );

    const rowsSalas = await db.$queryRaw<
      Array<{
        sala_id: bigint;
        sala_nome: string;
        unidade_id: bigint;
      }>
    >(Prisma.sql`
      SELECT s.id AS sala_id, s.nome AS sala_nome, s.unidade_id
      FROM salas_unidade s
      INNER JOIN unidade_assistencial ua ON ua.id = s.unidade_id
      WHERE ua.tenant_id::text = ${tenantId}
        ${idsInformados.length ? Prisma.sql`AND s.id IN (${Prisma.join(idsInformados.map((id) => BigInt(id)))})` : Prisma.empty}
        ${trimOrUndefined(input.sala) ? Prisma.sql`AND LOWER(s.nome) = LOWER(${trimOrUndefined(input.sala)})` : Prisma.empty}
      ORDER BY s.nome ASC
    `);

    if (rowsSalas.length) {
      return rowsSalas;
    }

    if (input.itemOrigemId) {
      const possuiSalaId = await this.colunaExiste("cursos_atendimentos", "sala_id", db);
      const itemRows = possuiSalaId
        ? await db.$queryRaw<Array<{ sala_id: bigint | null; sala_nome: string | null }>>(Prisma.sql`
            SELECT c.sala_id, s.nome AS sala_nome
            FROM cursos_atendimentos c
            LEFT JOIN salas_unidade s ON s.id = c.sala_id
            WHERE c.id = ${BigInt(input.itemOrigemId)}
              AND c.tenant_id::text = ${tenantId}
            LIMIT 1
          `)
        : await db.$queryRaw<Array<{ sala_id: bigint | null; sala_nome: string | null }>>(Prisma.sql`
            SELECT NULL::bigint AS sala_id, NULL::text AS sala_nome
            FROM cursos_atendimentos c
            WHERE c.id = ${BigInt(input.itemOrigemId)}
              AND c.tenant_id::text = ${tenantId}
            LIMIT 1
          `);
      const salaId = itemRows[0]?.sala_id;
      if (salaId) {
        const salaRows = await db.$queryRaw<
          Array<{ sala_id: bigint; sala_nome: string; unidade_id: bigint }>
        >(Prisma.sql`
          SELECT s.id AS sala_id, s.nome AS sala_nome, s.unidade_id
          FROM salas_unidade s
          INNER JOIN unidade_assistencial ua ON ua.id = s.unidade_id
          WHERE s.id = ${salaId}
            AND ua.tenant_id::text = ${tenantId}
          LIMIT 1
        `);
        if (salaRows.length) {
          return salaRows;
        }
      }

      const salaNome = trimOrUndefined(itemRows[0]?.sala_nome);
      if (salaNome) {
        const salaRows = await db.$queryRaw<
          Array<{ sala_id: bigint; sala_nome: string; unidade_id: bigint }>
        >(Prisma.sql`
          SELECT s.id AS sala_id, s.nome AS sala_nome, s.unidade_id
          FROM salas_unidade s
          INNER JOIN unidade_assistencial ua ON ua.id = s.unidade_id
          WHERE ua.tenant_id::text = ${tenantId}
            AND LOWER(s.nome) = LOWER(${salaNome})
          LIMIT 1
        `);
        if (salaRows.length) {
          return salaRows;
        }
      }
    }

    return [];
  }

  private async resolverSalasSelecionadasSeguras(
    input: { sala?: string | null; salasIds?: number[] | null; itemOrigemId?: number | null },
    tenantId: string,
    db: PrismaExecutor = prisma
  ) {
    try {
      return await this.resolverSalasSelecionadas(input, tenantId, db);
    } catch (error) {
      console.warn("[agendamentos][salas][fallback]", {
        tenantId,
        sala: input.sala,
        salasIds: input.salasIds,
        itemOrigemId: input.itemOrigemId,
        erro: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  private async sincronizarSalasAgendamento(
    agendamentoId: bigint,
    tenantId: string,
    salas: Array<{ sala_id: bigint; sala_nome: string }>,
    db: PrismaExecutor = prisma,
    base?: { data: string; horaInicial: string; horaFinal?: string | null; status?: string | null }
  ) {
    await db.$executeRaw(Prisma.sql`
      DELETE FROM agendamento_sala
      WHERE agendamento_id = ${agendamentoId}
        AND tenant_id::text = ${tenantId}
    `);

    if (!salas.length) {
      return;
    }

    const valores = salas.map((sala) =>
      Prisma.sql`(
        ${tenantId}::uuid,
        ${agendamentoId},
        ${sala.sala_id},
        ${sala.sala_nome},
        ${formatarData(base?.data ?? "")},
        ${sqlTime(base?.horaInicial ?? "00:00")},
        ${sqlTime(base?.horaFinal ?? null)},
        ${base?.status ?? "Agendado"},
        NOW(),
        NOW()
      )`
    );

    await db.$executeRaw(Prisma.sql`
      INSERT INTO agendamento_sala (
        tenant_id, agendamento_id, sala_unidade_id, sala_nome, data_agendamento, hora_inicial, hora_final, status, criado_em, atualizado_em
      ) VALUES ${Prisma.join(valores)}
      ON CONFLICT (agendamento_id, sala_unidade_id) DO UPDATE
      SET
        sala_nome = EXCLUDED.sala_nome,
        data_agendamento = EXCLUDED.data_agendamento,
        hora_inicial = EXCLUDED.hora_inicial,
        hora_final = EXCLUDED.hora_final,
        status = EXCLUDED.status,
        atualizado_em = NOW()
    `);
  }

  private async listarSalasPorAgendamento(agendamentoIds: bigint[], tenantId: string) {
    if (!agendamentoIds.length) {
      return [];
    }

    return prisma.$queryRaw<
      Array<{
        agendamento_id: bigint;
        sala_id: bigint;
        sala_nome: string;
      }>
    >(Prisma.sql`
      SELECT
        ass.agendamento_id,
        ass.sala_unidade_id AS sala_id,
        ass.sala_nome
      FROM agendamento_sala ass
      WHERE ass.tenant_id::text = ${tenantId}
        AND ass.agendamento_id IN (${Prisma.join(agendamentoIds)})
      ORDER BY ass.sala_nome ASC
    `);
  }

  async mapaSalas(tenantId: string, filtros?: { semanaInicio?: string; unidadeId?: string; salaId?: string }) {
    await this.ensureEstrutura();
    const inicio = filtros?.semanaInicio && /^\d{4}-\d{2}-\d{2}$/.test(filtros.semanaInicio)
      ? new Date(`${filtros.semanaInicio}T12:00:00`)
      : (() => {
          const base = new Date();
          const dia = base.getDay();
          const deslocamento = dia === 0 ? -6 : 1 - dia;
          base.setDate(base.getDate() + deslocamento);
          base.setHours(12, 0, 0, 0);
          return base;
        })();
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);

    const salas = await this.listarSalasAgendamento(tenantId, {
      unidadeId: filtros?.unidadeId,
      sala: filtros?.salaId
    });

    const salaId = trimOrUndefined(filtros?.salaId);
    const ocupacoes = await prisma.$queryRaw<
      Array<{
        agendamento_id: bigint;
        sala_id: bigint;
        sala_nome: string;
        data_agendamento: Date;
        hora_inicial: string;
        hora_final: string | null;
        status: string | null;
        beneficiario_nome: string;
        profissional_nome: string | null;
        item_nome: string | null;
        participantes: unknown;
      }>
    >(Prisma.sql`
      SELECT
        ass.agendamento_id,
        ass.sala_unidade_id AS sala_id,
        ass.sala_nome,
        ass.data_agendamento,
        ass.hora_inicial,
        ass.hora_final,
        ass.status,
        a.beneficiario_nome,
        a.profissional_nome,
        a.item_nome,
        a.participantes
      FROM agendamento_sala ass
      INNER JOIN agendamento a ON a.id = ass.agendamento_id
      WHERE ass.tenant_id::text = ${tenantId}
        AND ass.data_agendamento BETWEEN ${formatarDataEntrada(inicio)} AND ${formatarDataEntrada(fim)}
        AND COALESCE(a.status, '') <> 'Cancelado'
        ${salaId ? Prisma.sql`AND ass.sala_unidade_id = ${BigInt(salaId)}` : Prisma.empty}
      ORDER BY ass.data_agendamento ASC, ass.hora_inicial ASC, ass.sala_nome ASC
    `);

    const dias = Array.from({ length: 7 }, (_, indice) => {
      const data = new Date(inicio);
      data.setDate(inicio.getDate() + indice);
      return data.toISOString().slice(0, 10);
    });

    return {
      semanaInicio: formatarDataEntrada(inicio) ?? formatarDataMensagem(inicio),
      semanaFim: formatarDataEntrada(fim) ?? formatarDataMensagem(fim),
      dias,
      salas,
      ocupacoes: ocupacoes.map((item) => ({
        agendamentoId: Number(item.agendamento_id),
        salaId: Number(item.sala_id),
        salaNome: item.sala_nome,
        data: item.data_agendamento.toISOString().slice(0, 10),
        horaInicial: formatarHoraExibicao(item.hora_inicial),
        horaFinal: formatarHoraExibicao(item.hora_final),
        status: item.status ?? undefined,
        beneficiarioNome: item.beneficiario_nome,
        profissionalNome: item.profissional_nome ?? undefined,
        itemNome: item.item_nome ?? undefined,
        participantes: Array.isArray(item.participantes) ? item.participantes : []
      }))
    };
  }

  async listar(filtros: AgendamentoFiltros, tenantId: string) {
    await this.ensureEstrutura();
    const where: Prisma.Sql[] = [];
    const busca = trimOrUndefined(filtros.busca);

    if (busca) {
      const like = `%${busca}%`;
      where.push(Prisma.sql`
        (
          a.beneficiario_nome ILIKE ${like}
          OR COALESCE(a.familia_nome, '') ILIKE ${like}
          OR COALESCE(a.profissional_nome, '') ILIKE ${like}
          OR COALESCE(a.tipo_atendimento, '') ILIKE ${like}
          OR COALESCE(a.unidade, '') ILIKE ${like}
        )
      `);
    }

    if (trimOrUndefined(filtros.unidade)) where.push(Prisma.sql`a.unidade = ${trimOrUndefined(filtros.unidade)}`);
    if (trimOrUndefined(filtros.setor)) where.push(Prisma.sql`a.setor = ${trimOrUndefined(filtros.setor)}`);
    if (trimOrUndefined(filtros.profissional)) where.push(Prisma.sql`a.profissional_nome ILIKE ${`%${trimOrUndefined(filtros.profissional)}%`}`);
    if (trimOrUndefined(filtros.tipoAtendimento)) where.push(Prisma.sql`a.tipo_atendimento ILIKE ${`%${trimOrUndefined(filtros.tipoAtendimento)}%`}`);
    if (trimOrUndefined(filtros.beneficiario)) where.push(Prisma.sql`a.beneficiario_nome ILIKE ${`%${trimOrUndefined(filtros.beneficiario)}%`}`);
    const beneficiarioId = Number(filtros.beneficiarioId);
    if (Number.isInteger(beneficiarioId) && beneficiarioId > 0) {
      where.push(Prisma.sql`
        (
          a.beneficiario_id = ${BigInt(beneficiarioId)}
          OR EXISTS (
            SELECT 1
            FROM agendamento_beneficiario ab
            WHERE ab.agendamento_id = a.id
              AND ab.tenant_id::text = ${tenantId}
              AND ab.beneficiario_id = ${BigInt(beneficiarioId)}
          )
        )
      `);
    }
    if (trimOrUndefined(filtros.familia)) where.push(Prisma.sql`COALESCE(a.familia_nome, '') ILIKE ${`%${trimOrUndefined(filtros.familia)}%`}`);
    if (trimOrUndefined(filtros.status)) where.push(Prisma.sql`a.status = ${trimOrUndefined(filtros.status)}`);
    if (trimOrUndefined(filtros.sala)) where.push(Prisma.sql`COALESCE(a.sala, '') ILIKE ${`%${trimOrUndefined(filtros.sala)}%`}`);
    if (trimOrUndefined(filtros.recurso)) where.push(Prisma.sql`COALESCE(a.recurso, '') ILIKE ${`%${trimOrUndefined(filtros.recurso)}%`}`);
    if (trimOrUndefined(filtros.prioridade)) where.push(Prisma.sql`a.prioridade = ${trimOrUndefined(filtros.prioridade)}`);
    if (trimOrUndefined(filtros.modalidade)) where.push(Prisma.sql`a.modalidade = ${trimOrUndefined(filtros.modalidade)}`);
    if (trimOrUndefined(filtros.periodoInicio)) where.push(Prisma.sql`a.data_agendamento >= ${formatarData(filtros.periodoInicio)}`);
    if (trimOrUndefined(filtros.periodoFim)) where.push(Prisma.sql`a.data_agendamento <= ${formatarData(filtros.periodoFim)}`);

    const rows = await prisma.$queryRaw<AgendamentoRow[]>(Prisma.sql`
      SELECT *
      FROM agendamento a
      WHERE a.tenant_id::text = ${tenantId}
      ${where.length ? Prisma.sql`AND ${Prisma.join(where, " AND ")}` : Prisma.empty}
      ORDER BY a.data_agendamento ASC, a.hora_inicial ASC, a.id ASC
    `);
    const hidratados = await this.hidratarParticipantesAgendamentos(rows, tenantId);
    return this.hidratarSalasAgendamentos(hidratados, tenantId);
  }

  async obter(id: bigint, tenantId: string) {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRaw<AgendamentoRow[]>(Prisma.sql`
      SELECT * FROM agendamento WHERE id = ${id} AND tenant_id::text = ${tenantId} LIMIT 1
    `);
    const hidratados = await this.hidratarParticipantesAgendamentos(rows, tenantId);
    const comSalas = await this.hidratarSalasAgendamentos(hidratados, tenantId);
    return comSalas[0] ?? null;
  }

  private async obterBasico(id: bigint, tenantId: string) {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRaw<AgendamentoRow[]>(Prisma.sql`
      SELECT * FROM agendamento WHERE id = ${id} AND tenant_id::text = ${tenantId} LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async criar(input: AgendamentoInput, usuario: UsuarioActor | undefined, tenantId: string) {
    await this.ensureEstrutura();
    const familiaResolvida = await this.resolverFamiliaDoBeneficiario(input.beneficiarioId);
    const id = await prisma.$transaction(async (tx) => {
      const salasSelecionadas = await this.resolverSalasSelecionadasSeguras(
        {
          sala: input.sala,
          salasIds: input.salasIds,
          itemOrigemId: input.itemOrigemId
        },
        tenantId,
        tx
      );
      const salasTexto = salasSelecionadas.map((sala) => sala.sala_nome).join(", ") || trimOrUndefined(input.sala);
      const conflitos = await this.listarConflitos({
        data: input.data,
        horaInicial: input.horaInicial,
        horaFinal: input.horaFinal,
        profissionalNome: input.profissionalNome,
        sala: input.sala,
        salasIds: salasSelecionadas.map((sala) => Number(sala.sala_id)).filter((valor) => Number.isInteger(valor) && Number(valor) > 0),
        recurso: input.recurso,
        tenantId
      }, tx);

      if (conflitos.length && !input.permitirConflito) {
        throw new AppError(this.formatarMensagemConflito(conflitos), 409);
      }

      const duplicado = await this.verificarDuplicidadeAgenda(
        {
          data: input.data,
          horaInicial: input.horaInicial,
          profissionalNome: input.profissionalNome,
          tipoAtendimento: input.tipoAtendimento,
          itemTipo: input.itemTipo,
          itemOrigemId: input.itemOrigemId
        },
        tenantId,
        null,
        tx
      );
      if (duplicado) {
        throw new AppError("Ja existe um card com a mesma data, horario, profissional e atendimento.", 409);
      }

      const inserted = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO agendamento (
          tenant_id, beneficiario_id, familia_id, inscricao_origem_id, beneficiario_nome, familia_nome, responsavel_nome,
          telefone, email, forma_contato_preferencial, observacoes_importantes, restricoes_alerta, necessidade_especial,
          transporte_apoio, unidade, setor, tipo_atendimento, subcategoria, profissional_id, profissional_nome,
          equipe_apoio, data_agendamento, hora_inicial, hora_final, duracao_minutos, sala, recurso, modalidade,
          origem_atendimento, prioridade, status, motivo, objetivo, observacao_interna, observacao_curta, coletivo,
          titulo_coletivo, capacidade_maxima, participantes, recorrencia, retorno_programado_para, encaminhamento_origem,
          primeira_vez, retorno, urgencia, documentos_pendentes, autorizacao_pendente, item_tipo, item_origem_id,
          item_nome, item_dias_semana, item_local, dia_semana, criado_por_usuario_id, criado_por_nome
        ) VALUES (
          ${tenantId}::uuid,
          ${input.beneficiarioId ? BigInt(input.beneficiarioId) : null},
          ${input.familiaId ? BigInt(input.familiaId) : familiaResolvida.familiaId},
          ${trimOrUndefined(input.inscricaoOrigemId) ? BigInt(trimOrUndefined(input.inscricaoOrigemId) as string) : null},
          ${input.beneficiarioNome},
          ${trimOrUndefined(input.familiaNome) ?? familiaResolvida.familiaNome},
          ${trimOrUndefined(input.responsavelNome) ?? familiaResolvida.responsavelNome},
          ${trimOrUndefined(input.telefone)},
          ${trimOrUndefined(input.email)},
          ${trimOrUndefined(input.formaContatoPreferencial)},
          ${trimOrUndefined(input.observacoesImportantes)},
          ${trimOrUndefined(input.restricoesAlerta)},
          ${trimOrUndefined(input.necessidadeEspecial)},
          ${trimOrUndefined(input.transporteApoio)},
          ${input.unidade},
          ${input.setor},
          ${input.tipoAtendimento},
          ${trimOrUndefined(input.subcategoria)},
          ${trimOrUndefined(input.profissionalId)},
          ${trimOrUndefined(input.profissionalNome)},
          ${Prisma.sql`${serializarJson(input.equipeApoio ?? [])}::jsonb`},
          ${formatarData(input.data)},
          ${sqlTime(input.horaInicial)},
          ${sqlTime(input.horaFinal)},
          ${input.duracaoMinutos ?? null},
          ${salasTexto},
          ${trimOrUndefined(input.recurso)},
          ${input.modalidade},
          ${trimOrUndefined(input.origemAtendimento)},
          ${input.prioridade},
          ${input.status ?? (input.coletivo ? "Atendimento coletivo" : input.permitirConflito ? "Encaixe" : "Agendado")},
          ${trimOrUndefined(input.motivo)},
          ${trimOrUndefined(input.objetivo)},
          ${trimOrUndefined(input.observacaoInterna)},
          ${trimOrUndefined(input.observacaoCurta)},
          ${input.coletivo ?? false},
          ${trimOrUndefined(input.tituloColetivo)},
          ${input.capacidadeMaxima ?? null},
          ${Prisma.sql`${serializarJson(input.participantes ?? [])}::jsonb`},
          ${input.recorrencia ? Prisma.sql`${serializarJson(input.recorrencia)}::jsonb` : Prisma.sql`NULL`},
          ${formatarData(input.retornoProgramadoPara)},
          ${trimOrUndefined(input.encaminhamentoOrigem)},
          ${input.primeiraVez ?? false},
          ${input.retorno ?? false},
          ${input.urgencia ?? false},
          ${input.documentosPendentes ?? false},
          ${input.autorizacaoPendente ?? false},
          ${trimOrUndefined(input.itemTipo ?? undefined)},
          ${input.itemOrigemId ? BigInt(input.itemOrigemId) : null},
          ${trimOrUndefined(input.itemNome)},
          ${trimOrUndefined(input.itemDiasSemana)},
          ${trimOrUndefined(input.itemLocal)},
          ${trimOrUndefined(input.diaSemana) ?? this.formatarDiaSemana(input.data)},
          ${usuario?.id ? BigInt(usuario.id) : null},
          ${trimOrUndefined(usuario?.nome ?? usuario?.nomeUsuario)}
        ) RETURNING id
      `);

      const idInserido = inserted[0]?.id;
      if (!idInserido) throw new AppError("Nao foi possivel criar o agendamento.", 500);
      await this.sincronizarBeneficiariosAgendamento(idInserido, tenantId, input.participantes ?? [], tx);
      await this.sincronizarSalasAgendamento(idInserido, tenantId, salasSelecionadas, tx, {
        data: input.data,
        horaInicial: input.horaInicial,
        horaFinal: input.horaFinal,
        status: input.status ?? (input.coletivo ? "Atendimento coletivo" : input.permitirConflito ? "Encaixe" : "Agendado")
      });
      return idInserido;
    });

    let criado: AgendamentoRow | null = null;
    try {
      criado = await this.obter(id, tenantId);
    } catch (error) {
      console.warn("[agendamentos][criar][obter-fallback]", {
        tenantId,
        agendamentoId: id.toString(),
        erro: error instanceof Error ? error.message : String(error)
      });
      criado = await this.obterBasico(id, tenantId);
    }
    console.info("[agendamentos][criar]", {
      tenantId,
      agendamentoId: criado?.id?.toString() ?? id.toString(),
      data: criado?.data_agendamento ? formatarDataMensagem(criado.data_agendamento) : input.data,
      salas: Array.isArray((criado as { salas?: Array<{ sala_id?: bigint; sala_nome?: string }> }).salas)
        ? ((criado as { salas?: Array<{ sala_id?: bigint; sala_nome?: string }> }).salas ?? []).map((sala) => sala.sala_nome)
        : []
    });
    try {
      await this.registrarLog(id, "criar", usuario, tenantId, null, criado);
    } catch (error) {
      console.warn("[agendamentos][criar][log-falhou]", {
        tenantId,
        agendamentoId: id.toString(),
        erro: error instanceof Error ? error.message : String(error)
      });
    }
    try {
      await this.registrarHistoricoFamilia(criado?.familia_id, "Agendamento criado para a família.", criado, tenantId);
    } catch (error) {
      console.warn("[agendamentos][criar][historico-falhou]", {
        tenantId,
        agendamentoId: id.toString(),
        erro: error instanceof Error ? error.message : String(error)
      });
    }
    return criado;
  }

  async atualizar(id: bigint, input: AgendamentoInput, usuario: UsuarioActor | undefined, tenantId: string) {
    await this.ensureEstrutura();
    const anterior = await this.obter(id, tenantId);
    if (!anterior) throw new AppError("Agendamento nao encontrado.", 404);
    await prisma.$transaction(async (tx) => {
      const salasExistentes = Array.isArray((anterior as { salas?: Array<{ sala_id?: bigint; sala_nome?: string }> }).salas)
        ? ((anterior as { salas?: Array<{ sala_id?: bigint; sala_nome?: string }> }).salas ?? [])
        : [];
      const salasSelecionadas = await this.resolverSalasSelecionadasSeguras(
        {
          sala: input.sala ?? salasExistentes.map((sala) => sala.sala_nome).join(", "),
          salasIds: input.salasIds ?? salasExistentes.map((sala) => Number(sala.sala_id)).filter((valor) => Number.isInteger(valor) && Number(valor) > 0),
          itemOrigemId: input.itemOrigemId ?? (anterior.item_origem_id ? Number(anterior.item_origem_id) : undefined)
        },
        tenantId,
        tx
      );
      const salasTexto = salasSelecionadas.map((sala) => sala.sala_nome).join(", ") || trimOrUndefined(input.sala);
      const conflitos = await this.listarConflitos({
        data: input.data,
        horaInicial: input.horaInicial,
        horaFinal: input.horaFinal,
        profissionalNome: input.profissionalNome,
        sala: input.sala,
        salasIds: salasSelecionadas.map((sala) => Number(sala.sala_id)).filter((valor) => Number.isInteger(valor) && Number(valor) > 0),
        recurso: input.recurso,
        idIgnorar: id,
        tenantId
      }, tx);
      if (conflitos.length && !input.permitirConflito) {
        throw new AppError(this.formatarMensagemConflito(conflitos), 409);
      }

      const duplicado = await this.verificarDuplicidadeAgenda(
        {
          data: input.data,
          horaInicial: input.horaInicial,
          profissionalNome: input.profissionalNome,
          tipoAtendimento: input.tipoAtendimento,
          itemTipo: input.itemTipo,
          itemOrigemId: input.itemOrigemId
        },
        tenantId,
        id,
        tx
      );
      if (duplicado) {
        throw new AppError("Ja existe um card com a mesma data, horario, profissional e atendimento.", 409);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE agendamento
        SET
          beneficiario_id = ${input.beneficiarioId ? BigInt(input.beneficiarioId) : null},
          familia_id = ${input.familiaId ? BigInt(input.familiaId) : anterior.familia_id},
          inscricao_origem_id = ${trimOrUndefined(input.inscricaoOrigemId) ? BigInt(trimOrUndefined(input.inscricaoOrigemId) as string) : null},
          beneficiario_nome = ${input.beneficiarioNome},
          familia_nome = ${trimOrUndefined(input.familiaNome) ?? anterior.familia_nome},
          responsavel_nome = ${trimOrUndefined(input.responsavelNome) ?? anterior.responsavel_nome},
          telefone = ${trimOrUndefined(input.telefone)},
          email = ${trimOrUndefined(input.email)},
          forma_contato_preferencial = ${trimOrUndefined(input.formaContatoPreferencial)},
          observacoes_importantes = ${trimOrUndefined(input.observacoesImportantes)},
          restricoes_alerta = ${trimOrUndefined(input.restricoesAlerta)},
          necessidade_especial = ${trimOrUndefined(input.necessidadeEspecial)},
          transporte_apoio = ${trimOrUndefined(input.transporteApoio)},
          unidade = ${input.unidade},
          setor = ${input.setor},
          tipo_atendimento = ${input.tipoAtendimento},
          subcategoria = ${trimOrUndefined(input.subcategoria)},
          profissional_id = ${trimOrUndefined(input.profissionalId)},
          profissional_nome = ${trimOrUndefined(input.profissionalNome)},
          equipe_apoio = ${Prisma.sql`${serializarJson(input.equipeApoio ?? [])}::jsonb`},
          data_agendamento = ${formatarData(input.data)},
          hora_inicial = ${sqlTime(input.horaInicial)},
          hora_final = ${sqlTime(input.horaFinal)},
          duracao_minutos = ${input.duracaoMinutos ?? null},
          sala = ${salasTexto},
          recurso = ${trimOrUndefined(input.recurso)},
          modalidade = ${input.modalidade},
          origem_atendimento = ${trimOrUndefined(input.origemAtendimento)},
          prioridade = ${input.prioridade},
          status = ${input.status ?? anterior.status},
          motivo = ${trimOrUndefined(input.motivo)},
          objetivo = ${trimOrUndefined(input.objetivo)},
          observacao_interna = ${trimOrUndefined(input.observacaoInterna)},
          observacao_curta = ${trimOrUndefined(input.observacaoCurta)},
          coletivo = ${input.coletivo ?? false},
          titulo_coletivo = ${trimOrUndefined(input.tituloColetivo)},
          capacidade_maxima = ${input.capacidadeMaxima ?? null},
          participantes = ${Prisma.sql`${serializarJson(input.participantes ?? [])}::jsonb`},
          recorrencia = ${input.recorrencia ? Prisma.sql`${serializarJson(input.recorrencia)}::jsonb` : Prisma.sql`NULL`},
          retorno_programado_para = ${formatarData(input.retornoProgramadoPara)},
          encaminhamento_origem = ${trimOrUndefined(input.encaminhamentoOrigem)},
          primeira_vez = ${input.primeiraVez ?? false},
          retorno = ${input.retorno ?? false},
          urgencia = ${input.urgencia ?? false},
          documentos_pendentes = ${input.documentosPendentes ?? false},
          autorizacao_pendente = ${input.autorizacaoPendente ?? false},
          item_tipo = ${trimOrUndefined(input.itemTipo ?? undefined)},
          item_origem_id = ${input.itemOrigemId ? BigInt(input.itemOrigemId) : null},
          item_nome = ${trimOrUndefined(input.itemNome)},
          item_dias_semana = ${trimOrUndefined(input.itemDiasSemana)},
          item_local = ${trimOrUndefined(input.itemLocal)},
          dia_semana = ${trimOrUndefined(input.diaSemana) ?? this.formatarDiaSemana(input.data)},
          atualizado_em = NOW()
        WHERE id = ${id}
          AND tenant_id::text = ${tenantId}
      `);

      await this.sincronizarBeneficiariosAgendamento(id, tenantId, input.participantes ?? [], tx);
      await this.sincronizarSalasAgendamento(id, tenantId, salasSelecionadas, tx, {
        data: input.data,
        horaInicial: input.horaInicial,
        horaFinal: input.horaFinal,
        status: input.status ?? anterior.status
      });
    });

    const atual = await this.obter(id, tenantId);
    await this.registrarLog(id, "editar", usuario, tenantId, anterior, atual);
    return atual;
  }

  async copiar(id: bigint, dataDestino: string, usuario: UsuarioActor | undefined, tenantId: string) {
    await this.ensureEstrutura();
    const origem = await this.obter(id, tenantId);
    if (!origem) throw new AppError("Agendamento nao encontrado.", 404);
    if ((origem.status ?? "").trim().toUpperCase() === "CANCELADO") {
      throw new AppError("Nao e possivel copiar uma agenda cancelada.", 400);
    }

    const novaData = dataDestino.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(novaData)) {
      throw new AppError("Data de destino invalida.", 400);
    }

    const participantesOriginais = Array.isArray(origem.participantes) ? origem.participantes : [];
    const participantes = participantesOriginais.map((participante) => ({
      beneficiarioId: participante.beneficiarioId ?? participante.beneficiario_id,
      beneficiarioNome: participante.beneficiarioNome ?? participante.beneficiario_nome ?? "",
      telefone: participante.telefone ?? undefined,
      email: participante.email ?? undefined
    }));
    const salasOrigem = Array.isArray((origem as { salas?: Array<{ sala_id?: bigint; sala_nome?: string }> }).salas)
      ? ((origem as { salas?: Array<{ sala_id?: bigint; sala_nome?: string }> }).salas ?? [])
      : [];

    const payload: AgendamentoInput = {
      beneficiarioId: origem.beneficiario_id ? Number(origem.beneficiario_id) : undefined,
      familiaId: origem.familia_id ? Number(origem.familia_id) : undefined,
      inscricaoOrigemId: origem.inscricao_origem_id ? String(origem.inscricao_origem_id) : undefined,
      beneficiarioNome: origem.beneficiario_nome,
      familiaNome: origem.familia_nome ?? undefined,
      responsavelNome: origem.responsavel_nome ?? undefined,
      telefone: origem.telefone ?? undefined,
      email: origem.email ?? undefined,
      formaContatoPreferencial: origem.forma_contato_preferencial ?? undefined,
      observacoesImportantes: origem.observacoes_importantes ?? undefined,
      restricoesAlerta: origem.restricoes_alerta ?? undefined,
      necessidadeEspecial: origem.necessidade_especial ?? undefined,
      transporteApoio: origem.transporte_apoio ?? undefined,
      unidade: origem.unidade,
      setor: origem.setor,
      tipoAtendimento: origem.tipo_atendimento,
      subcategoria: origem.subcategoria ?? undefined,
      profissionalId: origem.profissional_id ?? undefined,
      profissionalNome: origem.profissional_nome ?? undefined,
      equipeApoio: Array.isArray(origem.equipe_apoio) ? (origem.equipe_apoio as string[]) : undefined,
      data: novaData,
      horaInicial: formatarHoraEntrada(origem.hora_inicial)?.slice(0, 5) ?? "08:00",
      horaFinal: formatarHoraEntrada(origem.hora_final)?.slice(0, 5),
      duracaoMinutos: origem.duracao_minutos ?? undefined,
      sala: origem.sala ?? undefined,
      salasIds: salasOrigem.map((sala) => Number(sala.sala_id)).filter((valor) => Number.isInteger(valor) && Number(valor) > 0),
      recurso: origem.recurso ?? undefined,
      modalidade: origem.modalidade as AgendamentoInput["modalidade"],
      origemAtendimento: origem.origem_atendimento ?? undefined,
      prioridade: origem.prioridade as AgendamentoInput["prioridade"],
      status: origem.status as AgendamentoInput["status"],
      motivo: origem.motivo ?? undefined,
      objetivo: origem.objetivo ?? undefined,
      observacaoInterna: origem.observacao_interna ?? undefined,
      observacaoCurta: origem.observacao_curta ?? undefined,
      coletivo: origem.coletivo ?? undefined,
      tituloColetivo: origem.titulo_coletivo ?? undefined,
      capacidadeMaxima: origem.capacidade_maxima ?? undefined,
      participantes: participantes.map((participante) => ({
        beneficiarioId: participante.beneficiarioId ?? null,
        beneficiarioNome: participante.beneficiarioNome,
        telefone: participante.telefone ?? undefined,
        email: participante.email ?? undefined,
        comparecimento: "Pendente" as const
      })),
      recorrencia: origem.recorrencia ? (origem.recorrencia as AgendamentoInput["recorrencia"]) : undefined,
      retornoProgramadoPara: origem.retorno_programado_para ? String(origem.retorno_programado_para).slice(0, 10) : undefined,
      encaminhamentoOrigem: origem.encaminhamento_origem ?? undefined,
      primeiraVez: origem.primeira_vez ?? undefined,
      retorno: origem.retorno ?? undefined,
      urgencia: origem.urgencia ?? undefined,
      documentosPendentes: origem.documentos_pendentes ?? undefined,
      autorizacaoPendente: origem.autorizacao_pendente ?? undefined,
      permitirConflito: false,
      itemTipo: (origem.item_tipo ?? undefined) as AgendamentoInput["itemTipo"],
      itemOrigemId: origem.item_origem_id ? Number(origem.item_origem_id) : undefined,
      itemNome: origem.item_nome ?? undefined,
      itemDiasSemana: origem.item_dias_semana ?? undefined,
      itemLocal: origem.item_local ?? undefined,
      diaSemana: this.formatarDiaSemana(novaData) ?? undefined
    };

    const novoId = await prisma.$transaction(async (tx) => {
      const salasSelecionadas = await this.resolverSalasSelecionadasSeguras(
        {
          sala: payload.sala,
          salasIds: payload.salasIds,
          itemOrigemId: payload.itemOrigemId
        },
        tenantId,
        tx
      );
      const salasTexto = salasSelecionadas.map((sala) => sala.sala_nome).join(", ") || trimOrUndefined(payload.sala);
      const conflitos = await this.listarConflitos({
        data: payload.data,
        horaInicial: payload.horaInicial,
        horaFinal: payload.horaFinal,
        profissionalNome: payload.profissionalNome,
        sala: payload.sala,
        salasIds: salasSelecionadas.map((sala) => Number(sala.sala_id)).filter((valor) => Number.isInteger(valor) && Number(valor) > 0),
        recurso: payload.recurso,
        tenantId
      }, tx);
      if (conflitos.length) {
        throw new AppError(this.formatarMensagemConflito(conflitos), 409);
      }

      const duplicado = await this.verificarDuplicidadeAgenda(
        {
          data: payload.data,
          horaInicial: payload.horaInicial,
          profissionalNome: payload.profissionalNome,
          tipoAtendimento: payload.tipoAtendimento,
          itemTipo: payload.itemTipo,
          itemOrigemId: payload.itemOrigemId
        },
        tenantId,
        null,
        tx
      );
      if (duplicado) {
        throw new AppError("Ja existe um card com a mesma data, horario, profissional e atendimento.", 409);
      }

      const inserted = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO agendamento (
          tenant_id, beneficiario_id, familia_id, inscricao_origem_id, beneficiario_nome, familia_nome, responsavel_nome,
          telefone, email, forma_contato_preferencial, observacoes_importantes, restricoes_alerta, necessidade_especial,
          transporte_apoio, unidade, setor, tipo_atendimento, subcategoria, profissional_id, profissional_nome,
          equipe_apoio, data_agendamento, hora_inicial, hora_final, duracao_minutos, sala, recurso, modalidade,
          origem_atendimento, prioridade, status, motivo, objetivo, observacao_interna, observacao_curta, coletivo,
          titulo_coletivo, capacidade_maxima, participantes, recorrencia, retorno_programado_para, encaminhamento_origem,
          primeira_vez, retorno, urgencia, documentos_pendentes, autorizacao_pendente, item_tipo, item_origem_id,
          item_nome, item_dias_semana, item_local, dia_semana, criado_por_usuario_id, criado_por_nome
        ) VALUES (
          ${tenantId}::uuid,
          ${payload.beneficiarioId ? BigInt(payload.beneficiarioId) : null},
          ${payload.familiaId ? BigInt(payload.familiaId) : origem.familia_id},
          ${trimOrUndefined(payload.inscricaoOrigemId) ? BigInt(trimOrUndefined(payload.inscricaoOrigemId) as string) : null},
          ${payload.beneficiarioNome},
          ${trimOrUndefined(payload.familiaNome) ?? origem.familia_nome},
          ${trimOrUndefined(payload.responsavelNome) ?? origem.responsavel_nome},
          ${trimOrUndefined(payload.telefone)},
          ${trimOrUndefined(payload.email)},
          ${trimOrUndefined(payload.formaContatoPreferencial)},
          ${trimOrUndefined(payload.observacoesImportantes)},
          ${trimOrUndefined(payload.restricoesAlerta)},
          ${trimOrUndefined(payload.necessidadeEspecial)},
          ${trimOrUndefined(payload.transporteApoio)},
          ${payload.unidade},
          ${payload.setor},
          ${payload.tipoAtendimento},
          ${trimOrUndefined(payload.subcategoria)},
          ${trimOrUndefined(payload.profissionalId)},
          ${trimOrUndefined(payload.profissionalNome)},
          ${Prisma.sql`${serializarJson(payload.equipeApoio ?? [])}::jsonb`},
          ${formatarData(payload.data)},
          ${sqlTime(payload.horaInicial)},
          ${sqlTime(payload.horaFinal)},
          ${payload.duracaoMinutos ?? null},
          ${salasTexto},
          ${trimOrUndefined(payload.recurso)},
          ${payload.modalidade},
          ${trimOrUndefined(payload.origemAtendimento)},
          ${payload.prioridade},
          ${payload.status ?? "Agendado"},
          ${trimOrUndefined(payload.motivo)},
          ${trimOrUndefined(payload.objetivo)},
          ${trimOrUndefined(payload.observacaoInterna)},
          ${trimOrUndefined(payload.observacaoCurta)},
          ${payload.coletivo ?? origem.coletivo ?? false},
          ${trimOrUndefined(payload.tituloColetivo)},
          ${payload.capacidadeMaxima && payload.capacidadeMaxima > 0 ? payload.capacidadeMaxima : (participantes.length > 0 ? participantes.length : null)},
          ${Prisma.sql`${serializarJson(payload.participantes ?? [])}::jsonb`},
          ${payload.recorrencia ? Prisma.sql`${serializarJson(payload.recorrencia)}::jsonb` : Prisma.sql`NULL`},
          ${formatarData(payload.retornoProgramadoPara)},
          ${trimOrUndefined(payload.encaminhamentoOrigem)},
          ${payload.primeiraVez ?? false},
          ${payload.retorno ?? false},
          ${payload.urgencia ?? false},
          ${payload.documentosPendentes ?? false},
          ${payload.autorizacaoPendente ?? false},
          ${trimOrUndefined(payload.itemTipo ?? undefined)},
          ${payload.itemOrigemId ? BigInt(payload.itemOrigemId) : null},
          ${trimOrUndefined(payload.itemNome)},
          ${trimOrUndefined(payload.itemDiasSemana)},
          ${trimOrUndefined(payload.itemLocal)},
          ${trimOrUndefined(payload.diaSemana) ?? this.formatarDiaSemana(payload.data)},
          ${usuario?.id ? BigInt(usuario.id) : null},
          ${trimOrUndefined(usuario?.nome ?? usuario?.nomeUsuario)}
        ) RETURNING id
      `);

      const idNovo = inserted[0]?.id;
      if (!idNovo) throw new AppError("Nao foi possivel copiar a agenda.", 500);
      await this.sincronizarBeneficiariosAgendamento(idNovo, tenantId, payload.participantes ?? [], tx);
      await this.sincronizarSalasAgendamento(idNovo, tenantId, salasSelecionadas, tx, {
        data: payload.data,
        horaInicial: payload.horaInicial,
        horaFinal: payload.horaFinal,
        status: payload.status ?? "Agendado"
      });
      return idNovo;
    });

    let criado: AgendamentoRow | null = null;
    try {
      criado = await this.obter(novoId, tenantId);
    } catch (error) {
      console.warn("[agendamentos][copiar][obter-fallback]", {
        tenantId,
        agendamentoId: novoId.toString(),
        erro: error instanceof Error ? error.message : String(error)
      });
      criado = await this.obterBasico(novoId, tenantId);
    }
    console.info("[agendamentos][copiar]", {
      tenantId,
      origemId: id.toString(),
      novoId: novoId.toString(),
      dataDestino: novaData,
      salas: Array.isArray((criado as { salas?: Array<{ sala_id?: bigint; sala_nome?: string }> }).salas)
        ? ((criado as { salas?: Array<{ sala_id?: bigint; sala_nome?: string }> }).salas ?? []).map((sala) => sala.sala_nome)
        : []
    });
    try {
      await this.registrarLog(novoId, "copiar", usuario, tenantId, origem, criado);
    } catch (error) {
      console.warn("[agendamentos][copiar][log-falhou]", {
        tenantId,
        agendamentoId: novoId.toString(),
        erro: error instanceof Error ? error.message : String(error)
      });
    }
    return criado;
  }

  async cancelar(id: bigint, motivo: string | null | undefined, usuario: UsuarioActor | undefined, tenantId: string) {
    const anterior = await this.obter(id, tenantId);
    if (!anterior) throw new AppError("Agendamento nao encontrado.", 404);

    await prisma.$executeRaw(Prisma.sql`
      UPDATE agendamento
      SET status = 'Cancelado', observacao_interna = ${trimOrUndefined(motivo) ?? anterior.observacao_interna}, atualizado_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE agendamento_sala
      SET status = 'Cancelado', atualizado_em = NOW()
      WHERE agendamento_id = ${id}
        AND tenant_id::text = ${tenantId}
    `);

    const atual = await this.obter(id, tenantId);
    await this.registrarLog(id, "cancelar", usuario, tenantId, anterior, atual);
    return atual;
  }

  async excluir(id: bigint, usuario: UsuarioActor | undefined, tenantId: string) {
    const anterior = await this.obter(id, tenantId);
    if (!anterior) throw new AppError("Agendamento nao encontrado.", 404);

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM agendamento
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);

    await this.registrarLog(id, "excluir", usuario, tenantId, anterior, null);
    await this.registrarHistoricoFamilia(anterior.familia_id, "Agendamento excluido da agenda.", anterior, tenantId);
    return anterior;
  }

  async remarcar(id: bigint, input: AgendamentoRemarcacaoInput, usuario: UsuarioActor | undefined, tenantId: string) {
    const anterior = await this.obter(id, tenantId);
    if (!anterior) throw new AppError("Agendamento nao encontrado.", 404);
    const salasExistentes = Array.isArray((anterior as { salas?: Array<{ sala_id?: bigint; sala_nome?: string }> }).salas)
      ? ((anterior as { salas?: Array<{ sala_id?: bigint; sala_nome?: string }> }).salas ?? [])
      : [];
    const salasSelecionadas = await this.resolverSalasSelecionadasSeguras(
      {
        sala: input.sala ?? anterior.sala,
        salasIds: input.salasIds ?? salasExistentes.map((sala) => Number(sala.sala_id)).filter((valor) => Number.isInteger(valor) && Number(valor) > 0),
        itemOrigemId: anterior.item_origem_id ? Number(anterior.item_origem_id) : undefined
      },
      tenantId
    );

    const conflitos = await this.listarConflitos({
      data: input.data,
      horaInicial: input.horaInicial,
      horaFinal: input.horaFinal,
      profissionalNome: input.profissionalNome ?? anterior.profissional_nome,
      sala: input.sala ?? anterior.sala,
      salasIds: salasSelecionadas.map((sala) => Number(sala.sala_id)).filter((valor) => Number.isInteger(valor) && Number(valor) > 0),
      recurso: input.recurso ?? anterior.recurso,
      idIgnorar: id,
      tenantId
    });

    if (conflitos.length && !input.permitirConflito) {
      throw new AppError(this.formatarMensagemConflito(conflitos), 409);
    }

    await prisma.$executeRaw(Prisma.sql`
      UPDATE agendamento
      SET
        data_agendamento = ${formatarData(input.data)},
        hora_inicial = ${sqlTime(input.horaInicial)},
        hora_final = ${sqlTime(input.horaFinal)},
        profissional_nome = ${trimOrUndefined(input.profissionalNome) ?? anterior.profissional_nome},
        sala = ${(
          salasSelecionadas.map((sala) => sala.sala_nome).join(", ") ||
          trimOrUndefined(input.sala) ||
          anterior.sala ||
          ""
        )},
        recurso = ${trimOrUndefined(input.recurso) ?? anterior.recurso},
        status = 'Remarcado',
        observacao_interna = ${trimOrUndefined(input.motivo) ?? anterior.observacao_interna},
        atualizado_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
    await this.sincronizarSalasAgendamento(id, tenantId, salasSelecionadas, prisma, {
      data: input.data,
      horaInicial: input.horaInicial,
      horaFinal: input.horaFinal,
      status: "Remarcado"
    });

    const atual = await this.obter(id, tenantId);
    console.info("[agendamentos][remarcar]", {
      tenantId,
      agendamentoId: id.toString(),
      data: input.data,
      salas: salasSelecionadas.map((sala) => sala.sala_nome)
    });
    await this.registrarLog(id, "remarcar", usuario, tenantId, anterior, atual);
    return atual;
  }

  async confirmar(
    id: bigint,
    canal: string | null | undefined,
    observacao: string | null | undefined,
    usuario: UsuarioActor | undefined,
    tenantId: string
  ) {
    const anterior = await this.obter(id, tenantId);
    if (!anterior) throw new AppError("Agendamento nao encontrado.", 404);

    await prisma.$executeRaw(Prisma.sql`
      UPDATE agendamento
      SET
        status = 'Confirmado',
        confirmacao_canal = ${trimOrUndefined(canal)},
        observacao_confirmacao = ${trimOrUndefined(observacao)},
        confirmado_em = NOW(),
        confirmado_por_nome = ${trimOrUndefined(usuario?.nome ?? usuario?.nomeUsuario)},
        atualizado_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);

    const atual = await this.obter(id, tenantId);
    await this.registrarLog(id, "confirmar", usuario, tenantId, anterior, atual);
    return atual;
  }

  async checkIn(id: bigint, input: AgendamentoCheckInInput, usuario: UsuarioActor | undefined, tenantId: string) {
    const anterior = await this.obter(id, tenantId);
    if (!anterior) throw new AppError("Agendamento nao encontrado.", 404);

    const statusFinal =
      input.statusChegada === "Em atendimento"
        ? "Em atendimento"
        : input.statusChegada === "Finalizado"
          ? "Atendido"
          : input.statusChegada === "Nao compareceu"
            ? "Faltou"
            : input.statusChegada === "Reagendado"
              ? "Remarcado"
              : anterior.status;

    await prisma.$executeRaw(Prisma.sql`
      UPDATE agendamento
      SET
        status = ${statusFinal},
        status_chegada = ${input.statusChegada},
        horario_chegada_real = ${sqlTime(input.horarioChegada)},
        horario_inicio_real = ${sqlTime(input.horarioInicio)},
        horario_fim_real = ${sqlTime(input.horarioFim)},
        observacao_interna = ${trimOrUndefined(input.observacao) ?? anterior.observacao_interna},
        atualizado_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);

    const atual = await this.obter(id, tenantId);
    await this.registrarLog(id, "check_in", usuario, tenantId, anterior, atual);
    return atual;
  }

  private async inserirCentralAtendimentoSeNecessario(
    agendamentoId: bigint,
    payload: AgendamentoConclusaoInput,
    usuario: UsuarioActor | undefined,
    tenantId: string
  ) {
    const atual = await this.obter(agendamentoId, tenantId);
    if (!atual) throw new AppError("Agendamento nao encontrado.", 404);
    if (atual.central_atendimento_id) return atual.central_atendimento_id;

    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO central_atendimento (
        beneficiario_id, familia_id, data_hora, tipo_atendimento, setor, profissional_responsavel,
        prioridade, status, classificacao, necessidade_identificada, resumo, observacoes, retorno_previsto,
        criado_por_usuario_id, criado_por_nome, criado_em, atualizado_em
      ) VALUES (
        ${atual.beneficiario_id},
        ${atual.familia_id},
        ${new Date(`${formatarDataEntrada(atual.data_agendamento)}T${formatarHoraEntrada(atual.hora_inicial)}`)},
        ${atual.tipo_atendimento},
        ${atual.setor},
        ${atual.profissional_nome ?? atual.responsavel_nome ?? "Equipe institucional"},
        ${atual.prioridade},
        ${payload.comparecimento === "Faltou" ? "Concluído" : "Concluído"},
        ${atual.subcategoria},
        ${atual.motivo},
        ${payload.resumo},
        ${payload.observacaoImportante ?? atual.observacao_interna},
        ${formatarData(payload.retornoGeradoPara)},
        ${usuario?.id ? BigInt(usuario.id) : null},
        ${trimOrUndefined(usuario?.nome ?? usuario?.nomeUsuario)},
        NOW(),
        NOW()
      ) RETURNING id
    `);

    const centralId = inserted[0]?.id;
    if (!centralId) throw new AppError("Nao foi possivel gerar o historico do atendimento.", 500);

    await prisma.$executeRaw(Prisma.sql`
      UPDATE agendamento
      SET central_atendimento_id = ${centralId}, atualizado_em = NOW()
      WHERE id = ${agendamentoId}
        AND tenant_id::text = ${tenantId}
    `);

    return centralId;
  }

  async concluir(id: bigint, input: AgendamentoConclusaoInput, usuario: UsuarioActor | undefined, tenantId: string) {
    const anterior = await this.obter(id, tenantId);
    if (!anterior) throw new AppError("Agendamento nao encontrado.", 404);
    const centralId = await this.inserirCentralAtendimentoSeNecessario(id, input, usuario, tenantId);

    await prisma.$executeRaw(Prisma.sql`
      UPDATE agendamento
      SET
        status = 'Atendido',
        concluido_resumo = ${input.resumo},
        desfecho = ${trimOrUndefined(input.desfecho)},
        comparecimento = ${trimOrUndefined(input.comparecimento) ?? 'Presente'},
        retorno_programado_para = ${formatarData(input.retornoGeradoPara)},
        encaminhamento_interno = ${trimOrUndefined(input.encaminhamentoInterno)},
        encaminhamento_externo = ${trimOrUndefined(input.encaminhamentoExterno)},
        observacao_interna = ${trimOrUndefined(input.observacaoImportante) ?? anterior.observacao_interna},
        custo_atendimento = ${input.custoAtendimento ?? null},
        central_atendimento_id = ${centralId},
        atualizado_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);

    const atual = await this.obter(id, tenantId);
    await this.registrarLog(id, "concluir", usuario, tenantId, anterior, atual);
    await this.registrarHistoricoFamilia(atual?.familia_id, "Atendimento concluído para a família.", atual, tenantId);
    return atual;
  }

  async listarListaEspera(tenantId: string) {
    await this.ensureEstrutura();
    return prisma.$queryRaw<AgendamentoListaEsperaRow[]>(Prisma.sql`
      SELECT *
      FROM agendamento_lista_espera
      WHERE tenant_id::text = ${tenantId}
      ORDER BY
        CASE prioridade
          WHEN 'Urgencia' THEN 1
          WHEN 'Alta' THEN 2
          WHEN 'Media' THEN 3
          ELSE 4
        END,
        data_entrada ASC,
        id ASC
    `);
  }

  async criarListaEspera(input: AgendamentoListaEsperaInput, tenantId: string) {
    await this.ensureEstrutura();
    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO agendamento_lista_espera (
        tenant_id, beneficiario_id, beneficiario_nome, familia_id, familia_nome, unidade, setor, tipo_atendimento,
        profissional_preferencial, faixa_horario_preferida, prioridade, motivo, observacao, data_entrada, encaixe_automatico
      ) VALUES (
        ${tenantId}::uuid,
        ${input.beneficiarioId ? BigInt(input.beneficiarioId) : null},
        ${input.beneficiarioNome},
        ${input.familiaId ? BigInt(input.familiaId) : null},
        ${trimOrUndefined(input.familiaNome)},
        ${trimOrUndefined(input.unidade)},
        ${trimOrUndefined(input.setor)},
        ${input.tipoAtendimento},
        ${trimOrUndefined(input.profissionalPreferencial)},
        ${trimOrUndefined(input.faixaHorarioPreferida)},
        ${input.prioridade ?? 'Normal'},
        ${trimOrUndefined(input.motivo)},
        ${trimOrUndefined(input.observacao)},
        ${formatarData(input.dataEntrada) ?? formatarData(new Date().toISOString().slice(0, 10))},
        ${input.encaixeAutomatico ?? false}
      ) RETURNING id
    `);

    const id = inserted[0]?.id;
    const rows = await prisma.$queryRaw<AgendamentoListaEsperaRow[]>(Prisma.sql`
      SELECT * FROM agendamento_lista_espera WHERE id = ${id} AND tenant_id::text = ${tenantId}
    `);
    return rows[0] ?? null;
  }

  async converterListaEspera(id: bigint, input: AgendamentoInput, usuario: UsuarioActor | undefined, tenantId: string) {
    const created = await this.criar({ ...input, permitirConflito: input.permitirConflito ?? false }, usuario, tenantId);
    if (!created) throw new AppError("Nao foi possivel converter a lista de espera.", 500);

    await prisma.$executeRaw(Prisma.sql`
      UPDATE agendamento_lista_espera
      SET convertido_agendamento_id = ${BigInt(created.id)}, atualizado_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);

    return created;
  }

  private async montarPayloadOperacional(input: AgendamentoOperacionalInput, tenantId: string): Promise<AgendamentoInput> {
    const [item, beneficiarios] = await Promise.all([
      this.obterItemOperacional(BigInt(input.itemId), tenantId),
      this.listarBeneficiariosOperacionais(BigInt(input.itemId), tenantId)
    ]);
    if (!item) {
      throw new AppError("Item de inscricao nao encontrado para agendamento.", 404);
    }

    const idsMatriculas = new Set(input.matriculasIds ?? []);
    const idsBeneficiarios = new Set(input.beneficiariosIds ?? []);
    const usarMatriculas = idsMatriculas.size > 0;

    const selecionados = beneficiarios.filter((entry) => {
      const matriculaId = Number(entry.matricula_id);
      const beneficiarioId = entry.beneficiario_id ? Number(entry.beneficiario_id) : null;
      return usarMatriculas ? idsMatriculas.has(matriculaId) : !!beneficiarioId && idsBeneficiarios.has(beneficiarioId);
    });

    const totalEsperado = usarMatriculas ? idsMatriculas.size : idsBeneficiarios.size;
    if (!selecionados.length || selecionados.length !== totalEsperado) {
      throw new AppError("Selecione apenas beneficiarios vinculados a inscricao.", 400);
    }

    const participantes = selecionados.map((entry) => ({
      matriculaId: Number(entry.matricula_id),
      beneficiarioId: entry.beneficiario_id ? Number(entry.beneficiario_id) : undefined,
      codigo: entry.codigo ?? undefined,
      beneficiarioNome: entry.beneficiario_nome,
      dataNascimento: entry.data_nascimento ? entry.data_nascimento.toISOString().slice(0, 10) : undefined,
      telefone: entry.telefone ?? undefined,
      email: entry.email ?? undefined,
      comparecimento: "Pendente" as const
    }));

    const horarioBase = formatarHoraEntrada(item.horario_inicial) ?? "08:00:00";
    const profissionalNome = trimOrUndefined(item.profissional) ?? trimOrUndefined(selecionados[0]?.profissional_nome) ?? "Equipe institucional";
    const local = trimOrUndefined(item.sala_nome) ?? trimOrUndefined(item.instituicao_parceira) ?? "Local a definir";
    const salasSelecionadas = await this.resolverSalasSelecionadasSeguras(
      {
        salasIds: input.salasIds,
        itemOrigemId: input.itemId
      },
      tenantId
    );
    const salaTexto = salasSelecionadas.map((sala) => sala.sala_nome).join(", ") || local;

    return {
      beneficiarioId: participantes[0]?.beneficiarioId ?? undefined,
      beneficiarioNome: item.nome,
      unidade: local,
      setor: input.tipo === "curso" ? "Curso" : input.tipo === "oficina" ? "Oficina" : "Atendimento",
      tipoAtendimento: item.nome,
      profissionalNome,
      data: input.data,
      horaInicial: horarioBase.slice(0, 5),
      horaFinal: undefined,
      modalidade: "Coletivo",
      prioridade: "Normal",
      status: "Agendado",
      coletivo: true,
      tituloColetivo: item.nome,
      capacidadeMaxima: participantes.length,
      participantes,
      itemTipo: input.tipo,
      itemOrigemId: input.itemId,
      itemNome: item.nome,
      itemDiasSemana: trimOrUndefined(item.dias_semana),
      itemLocal: local,
      diaSemana: this.formatarDiaSemana(input.data),
      sala: salaTexto,
      salasIds: salasSelecionadas.map((sala) => Number(sala.sala_id)),
      observacaoCurta: `${participantes.length} participante(s) vinculado(s) pela inscricao.`
    };
  }

  async criarOperacional(input: AgendamentoOperacionalInput, usuario: UsuarioActor | undefined, tenantId: string) {
    const payload = await this.montarPayloadOperacional(input, tenantId);
    const itemOrigemId = payload.itemOrigemId;
    const itemTipo = trimOrUndefined(payload.itemTipo);

    if (itemOrigemId && itemTipo) {
      const existente = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        SELECT id
        FROM agendamento
        WHERE tenant_id::text = ${tenantId}
          AND item_tipo = ${itemTipo}
          AND item_origem_id = ${BigInt(itemOrigemId)}
          AND data_agendamento = ${formatarData(payload.data)}
          AND COALESCE(status, '') <> 'Cancelado'
        ORDER BY atualizado_em DESC, id DESC
        LIMIT 1
      `);

      const idExistente = existente[0]?.id;
      if (idExistente) {
        return this.atualizar(idExistente, payload, usuario, tenantId);
      }
    }

    return this.criar(payload, usuario, tenantId);
  }

  async atualizarOperacional(id: bigint, input: AgendamentoOperacionalInput, usuario: UsuarioActor | undefined, tenantId: string) {
    const payload = await this.montarPayloadOperacional(input, tenantId);
    return this.atualizar(id, payload, usuario, tenantId);
  }

  async notificar(id: bigint, canal: AgendamentoEnvioCanal, usuario: UsuarioActor | undefined, tenantId: string) {
    await this.ensureEstrutura();
    const agendamento = await this.obter(id, tenantId);
    if (!agendamento) throw new AppError("Agendamento nao encontrado.", 404);

    const beneficiariosTabela = await this.listarBeneficiariosAgendamentoComContato([id], tenantId);
    const participantesAgendamento = Array.isArray(agendamento.participantes)
      ? (agendamento.participantes as Array<Record<string, unknown>>)
      : [];
    const contatosMatriculas = participantesAgendamento.length
      ? await this.listarContatosPorMatriculas(
          participantesAgendamento
            .map((participante) => lerInteiroParticipante(participante.matriculaId ?? participante.matricula_id))
            .filter((valor): valor is number => Number.isInteger(valor) && Number(valor) > 0),
          tenantId
        )
      : [];
    const contatosMatriculasPorId = new Map<
      number,
      { beneficiario_id: bigint | null; beneficiario_nome: string; telefone_principal: string | null; email: string | null }
    >();
    for (const contato of contatosMatriculas) {
      contatosMatriculasPorId.set(Number(contato.matricula_id), contato);
    }
    const fallbackParticipantes =
      !beneficiariosTabela.length && participantesAgendamento.length
        ? await this.listarContatosPorParticipantes(
            participantesAgendamento.map((participante) => ({
              beneficiarioId: lerInteiroParticipante(participante.beneficiarioId ?? participante.beneficiario_id),
              beneficiarioNome: lerTextoParticipante(participante.beneficiarioNome ?? participante.beneficiario_nome)
            })),
            tenantId
          )
        : [];

    const fallbackPorChave = new Map<string, { telefone: string | null; email: string | null }>();
    for (const contato of fallbackParticipantes) {
      fallbackPorChave.set(
        this.chaveParticipante(contato.beneficiario_nome, contato.beneficiario_id),
        { telefone: contato.telefone, email: contato.email }
      );
    }

    const beneficiarios = beneficiariosTabela.length
      ? beneficiariosTabela.map((beneficiario) => {
          const chave = this.chaveParticipante(beneficiario.beneficiario_nome, beneficiario.beneficiario_id);
          const participante = participantesAgendamento.find((item) => {
            const matriculaId = lerInteiroParticipante(item.matriculaId ?? item.matricula_id);
            const contatoMatricula = matriculaId ? contatosMatriculasPorId.get(matriculaId) : undefined;
            if (contatoMatricula?.beneficiario_id && beneficiario.beneficiario_id) {
              return contatoMatricula.beneficiario_id === beneficiario.beneficiario_id;
            }
            return this.chaveParticipante(
              lerTextoParticipante(item.beneficiarioNome ?? item.beneficiario_nome),
              (() => {
                const id = lerInteiroParticipante(item.beneficiarioId ?? item.beneficiario_id);
                return id ? BigInt(id) : null;
              })()
            ) === chave;
          });
          const matriculaId = participante ? lerInteiroParticipante(participante.matriculaId ?? participante.matricula_id) : null;
          const contatoMatricula = matriculaId ? contatosMatriculasPorId.get(matriculaId) : undefined;
          const fallback = fallbackPorChave.get(chave);
          return {
            ...beneficiario,
            telefone:
              contatoMatricula?.telefone_principal ??
              beneficiario.telefone ??
              fallback?.telefone ??
              (participante && typeof participante.telefone === "string" && participante.telefone.trim().length
                ? participante.telefone
                : null),
            email:
              contatoMatricula?.email ??
              beneficiario.email ??
              fallback?.email ??
              (participante && typeof participante.email === "string" && participante.email.trim().length
                ? participante.email
                : null)
          };
        })
      : participantesAgendamento.map((participante, index) => {
          const matriculaId = lerInteiroParticipante(participante.matriculaId ?? participante.matricula_id);
          const beneficiarioIdNumero = lerInteiroParticipante(participante.beneficiarioId ?? participante.beneficiario_id);
          const beneficiarioId = beneficiarioIdNumero ? BigInt(beneficiarioIdNumero) : null;
          const beneficiarioNome = lerTextoParticipante(participante.beneficiarioNome ?? participante.beneficiario_nome) ?? `Participante ${index + 1}`;
          const chave = this.chaveParticipante(beneficiarioNome, beneficiarioId);
          const contatoMatricula = matriculaId ? contatosMatriculasPorId.get(matriculaId) : undefined;
          const fallback = fallbackPorChave.get(chave);
          return {
            id: BigInt(index + 1),
            agendamento_id: id,
            beneficiario_id: contatoMatricula?.beneficiario_id ?? beneficiarioId,
            beneficiario_nome: beneficiarioNome,
            telefone:
              (typeof contatoMatricula?.telefone_principal === "string" && normalizeDigits(contatoMatricula.telefone_principal)
                ? contatoMatricula.telefone_principal
                : typeof fallback?.telefone === "string" && normalizeDigits(fallback.telefone)
                  ? fallback.telefone
                  : typeof participante.telefone === "string" && normalizeDigits(participante.telefone)
                    ? participante.telefone
                    : null),
            email:
              (typeof contatoMatricula?.email === "string" && contatoMatricula.email.trim().length
                ? contatoMatricula.email
                : typeof fallback?.email === "string" && fallback.email.trim().length
                  ? fallback.email
                  : typeof participante.email === "string" && participante.email.trim().length
                    ? participante.email
                    : null),
            status: "Agendado",
            criado_em: new Date(),
            atualizado_em: new Date()
          };
        });

    if (!beneficiarios.length) {
      throw new AppError("Este agendamento nao possui beneficiarios vinculados.", 400);
    }

    const dataMensagem = formatarDataMensagem(agendamento.data_agendamento);
    const horaMensagem = formatarHoraMensagem(agendamento.hora_inicial);
    const mensagemBase = `Lembrete: ${agendamento.item_nome ?? agendamento.tipo_atendimento} em ${dataMensagem} as ${horaMensagem}.`;
    const resultado = {
      canal,
      enviados: 0,
      ignorados: 0,
      links: [] as string[]
    };

    for (const beneficiario of beneficiarios) {
      try {
        if (canal === "EMAIL") {
          if (!trimOrUndefined(beneficiario.email)) {
            resultado.ignorados += 1;
            continue;
          }

          await this.emailService.enviarEmailSimples({
            destinatario: String(beneficiario.email),
            assunto: `Lembrete de agendamento - ${agendamento.item_nome ?? agendamento.tipo_atendimento}`,
            mensagem: `Ola, ${beneficiario.beneficiario_nome}.\n\n${mensagemBase}\nLocal: ${agendamento.item_local ?? agendamento.sala ?? agendamento.unidade}.`
          });
          resultado.enviados += 1;
          await prisma.$executeRaw(Prisma.sql`
            INSERT INTO agendamento_envio (tenant_id, agendamento_id, beneficiario_id, canal, status, destinatario, mensagem)
            VALUES (${tenantId}::uuid, ${id}, ${beneficiario.beneficiario_id}, 'EMAIL', 'ENVIADO', ${beneficiario.email}, ${mensagemBase})
          `);
          continue;
        }

        const telefone = String(beneficiario.telefone ?? "").replace(/\D/g, "");
        if (!telefone) {
          resultado.ignorados += 1;
          continue;
        }

        const texto = `${mensagemBase} Local: ${agendamento.item_local ?? agendamento.sala ?? agendamento.unidade}.`;
        const link = `https://wa.me/55${telefone}?text=${encodeURIComponent(texto)}`;
        resultado.links.push(link);
        resultado.enviados += 1;
        await prisma.$executeRaw(Prisma.sql`
          INSERT INTO agendamento_envio (tenant_id, agendamento_id, beneficiario_id, canal, status, destinatario, mensagem)
          VALUES (${tenantId}::uuid, ${id}, ${beneficiario.beneficiario_id}, 'WHATSAPP', 'PREPARADO', ${telefone}, ${texto})
        `);
      } catch (error) {
        resultado.ignorados += 1;
        console.error("[agendamentos][notificar] falha ao preparar envio", {
          agendamentoId: id.toString(),
          tenantId,
          canal,
          beneficiarioId: beneficiario.beneficiario_id ? beneficiario.beneficiario_id.toString() : null,
          destinatario: canal === "EMAIL" ? beneficiario.email : beneficiario.telefone,
          error
        });

        const destinatarioFalho =
          canal === "EMAIL"
            ? trimOrUndefined(beneficiario.email)
            : trimOrUndefined(String(beneficiario.telefone ?? "").replace(/\D/g, ""));

        try {
          await prisma.$executeRaw(Prisma.sql`
            INSERT INTO agendamento_envio (tenant_id, agendamento_id, beneficiario_id, canal, status, destinatario, mensagem)
            VALUES (${tenantId}::uuid, ${id}, ${beneficiario.beneficiario_id}, ${canal}, 'FALHA', ${destinatarioFalho}, ${mensagemBase})
          `);
        } catch (registroError) {
          console.error("[agendamentos][notificar] falha ao registrar erro de envio", {
            agendamentoId: id.toString(),
            tenantId,
            canal,
            beneficiarioId: beneficiario.beneficiario_id ? beneficiario.beneficiario_id.toString() : null,
            registroError
          });
        }
      }
    }

    await this.registrarLog(id, "envio", usuario, tenantId, null, resultado);
    return resultado;
  }

  async indicadores(filtros: AgendamentoFiltros, tenantId: string) {
    const rows = await this.listar(filtros, tenantId);
    const hoje = new Date().toISOString().slice(0, 10);
    return {
      totalNoPeriodo: rows.length,
      totalHoje: rows.filter((item) => String(item.data_agendamento).slice(0, 10) === hoje).length,
      confirmados: rows.filter((item) => item.status === "Confirmado").length,
      emAtendimento: rows.filter((item) => item.status === "Em atendimento").length,
      concluidos: rows.filter((item) => item.status === "Atendido").length,
      faltas: rows.filter((item) => item.status === "Faltou").length,
      cancelados: rows.filter((item) => item.status === "Cancelado").length,
      retornosPendentes: rows.filter((item) => item.status === "Retorno pendente" || !!item.retorno_programado_para).length,
      encaixes: rows.filter((item) => item.status === "Encaixe").length,
      coletivos: rows.filter((item) => item.coletivo).length
    };
  }

  async catalogos(tenantId: string) {
    await this.ensureEstrutura();
    const [unidades, setores, profissionais, tipos, salas, recursos] = await Promise.all([
      prisma.$queryRaw<Array<{ nome_fantasia: string | null }>>(Prisma.sql`
        SELECT nome_fantasia
        FROM unidade_assistencial
        WHERE tenant_id::text = ${tenantId}
        ORDER BY nome_fantasia ASC
      `),
      prisma.$queryRaw<Array<{ setor: string | null }>>(Prisma.sql`
        SELECT DISTINCT NULLIF(TRIM(setor), '') AS setor
        FROM usuarios
        WHERE tenant_id::text = ${tenantId}
          AND NULLIF(TRIM(setor), '') IS NOT NULL
        ORDER BY setor ASC
      `),
      prisma.$queryRaw<Array<{ nome_completo: string | null }>>(Prisma.sql`
        SELECT nome_completo
        FROM cadastro_profissionais
        WHERE tenant_id::text = ${tenantId}
        ORDER BY nome_completo ASC
      `),
      prisma.$queryRaw<Array<{ tipo_atendimento: string | null }>>(Prisma.sql`
        SELECT DISTINCT NULLIF(TRIM(tipo_atendimento), '') AS tipo_atendimento
        FROM central_atendimento
        WHERE tenant_id::text = ${tenantId}
          AND NULLIF(TRIM(tipo_atendimento), '') IS NOT NULL
        ORDER BY tipo_atendimento ASC
      `),
      prisma.$queryRaw<Array<{ nome: string | null }>>(Prisma.sql`
        SELECT s.nome
        FROM salas_unidade s
        INNER JOIN unidade_assistencial ua ON ua.id = s.unidade_id
        WHERE ua.tenant_id::text = ${tenantId}
        ORDER BY nome ASC
      `),
      prisma.$queryRaw<Array<{ descricao: string | null }>>(Prisma.sql`
        SELECT DISTINCT NULLIF(TRIM(descricao), '') AS descricao
        FROM almoxarifado_item
        WHERE tenant_id::text = ${tenantId}
          AND NULLIF(TRIM(descricao), '') IS NOT NULL
        ORDER BY descricao ASC
        LIMIT 100
      `)
    ]);

    return {
      unidades: unidades.map((item) => item.nome_fantasia).filter(Boolean),
      setores: setores.map((item) => item.setor).filter(Boolean),
      profissionais: profissionais.map((item) => item.nome_completo).filter(Boolean),
      tiposAtendimento: tipos.map((item) => item.tipo_atendimento).filter(Boolean),
      salas: salas.map((item) => item.nome).filter(Boolean),
      recursos: recursos.map((item) => item.descricao).filter(Boolean)
    };
  }
}
