import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { EmailService } from "../../email/services/email.service.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
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
  "CREATE INDEX IF NOT EXISTS agendamento_envio_tenant_idx ON agendamento_envio(tenant_id, agendamento_id)"
];

let estruturaPromise: Promise<void> | null = null;

function formatarHora(value?: string | null) {
  const texto = String(value ?? "").trim();
  if (!texto) return null;
  return texto.length === 5 ? `${texto}:00` : texto;
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
  if (typeof contato.telefone_principal === "string" && contato.telefone_principal.trim().length) {
    return contato.telefone_principal;
  }
  if (typeof contato.telefone === "string" && contato.telefone.trim().length) {
    return contato.telefone;
  }
  return undefined;
}

function extrairEmailContato(contato?: { email?: string | null } | null) {
  if (!contato) return undefined;
  if (typeof contato.email === "string" && contato.email.trim().length) {
    return contato.email;
  }
  return undefined;
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

  async ensureEstrutura() {
    await ensureAgendamentosEstrutura();
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
    novo?: unknown
  ) {
    await prisma.$executeRaw(Prisma.sql`
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

  private async registrarHistoricoFamilia(familiaId?: bigint | null, descricao?: string, dadosNovos?: unknown) {
    if (!familiaId) return;

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO familia_historico (
        familia_id, tipo_evento, descricao, dados_novos, data_evento
      ) VALUES (
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

  private chaveParticipante(nome?: string | null, beneficiarioId?: bigint | null) {
    if (beneficiarioId) {
      return `id:${beneficiarioId.toString()}`;
    }
    return `nome:${normalizarTextoComparacao(nome)}`;
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
        ab.beneficiario_nome,
        COALESCE(
          NULLIF(TRIM(ab.telefone), ''),
          NULLIF(TRIM(contato.telefone_principal), ''),
          NULLIF(TRIM(contato.telefone_secundario), ''),
          NULLIF(TRIM(contato.telefone_recado_numero), '')
        ) AS telefone,
        COALESCE(NULLIF(TRIM(ab.email), ''), NULLIF(TRIM(contato.email), '')) AS email,
        ab.status,
        ab.criado_em,
        ab.atualizado_em
      FROM agendamento_beneficiario ab
      LEFT JOIN LATERAL (
        SELECT
          b.id AS beneficiario_id,
          c.telefone_principal,
          c.telefone_secundario,
          c.telefone_recado_numero,
          c.email
        FROM cadastro_beneficiario b
        LEFT JOIN contato_beneficiario c ON c.beneficiario_id = b.id AND c.tenant_id::text = ${tenantId}
        WHERE b.tenant_id::text = ${tenantId}
          AND (
            (ab.beneficiario_id IS NOT NULL AND b.id = ab.beneficiario_id)
            OR (
              ab.beneficiario_id IS NULL
              AND LOWER(
                TRANSLATE(
                  REGEXP_REPLACE(TRIM(COALESCE(b.nome_completo, '')), '\s+', ' ', 'g'),
                  'ÁÀÃÂÄáàãâäÉÈÊËéèêëÍÌÎÏíìîïÓÒÕÔÖóòõôöÚÙÛÜúùûüÇçÑñ',
                  'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
                )
              ) = LOWER(
                TRANSLATE(
                  REGEXP_REPLACE(TRIM(COALESCE(ab.beneficiario_nome, '')), '\s+', ' ', 'g'),
                  'ÁÀÃÂÄáàãâäÉÈÊËéèêëÍÌÎÏíìîïÓÒÕÔÖóòõôöÚÙÛÜúùûüÇçÑñ',
                  'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
                )
              )
            )
          )
        ORDER BY c.id DESC NULLS LAST, b.id DESC
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
        LOWER(
          TRANSLATE(
            REGEXP_REPLACE(TRIM(COALESCE(b.nome_completo, '')), '\s+', ' ', 'g'),
            'ÁÀÃÂÄáàãâäÉÈÊËéèêëÍÌÎÏíìîïÓÒÕÔÖóòõôöÚÙÛÜúùûüÇçÑñ',
            'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
          )
        ) IN (${Prisma.join(nomes)})
      `);
    }

    return prisma.$queryRaw<Array<{ beneficiario_id: bigint; beneficiario_nome: string; telefone: string | null; email: string | null }>>(Prisma.sql`
      SELECT
        b.id AS beneficiario_id,
        b.nome_completo AS beneficiario_nome,
        COALESCE(
          NULLIF(TRIM(c.telefone_principal), ''),
          NULLIF(TRIM(c.telefone_secundario), ''),
          NULLIF(TRIM(c.telefone_recado_numero), '')
        ) AS telefone,
        NULLIF(TRIM(c.email), '') AS email
      FROM cadastro_beneficiario b
      LEFT JOIN contato_beneficiario c ON c.beneficiario_id = b.id AND c.tenant_id::text = ${tenantId}
      WHERE b.tenant_id::text = ${tenantId}
        AND (${Prisma.join(filtros, " OR ")})
      ORDER BY b.id DESC
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
        telefone_principal: string | null;
        email: string | null;
      }>
    >(Prisma.sql`
      SELECT
        m.id AS matricula_id,
        contato.beneficiario_id,
        m.beneficiario_nome,
        contato.telefone_principal,
        contato.email
      FROM cursos_atendimentos_matriculas m
      LEFT JOIN LATERAL (
        SELECT
          b.id AS beneficiario_id,
          NULLIF(TRIM(c2.telefone_principal), '') AS telefone_principal,
          NULLIF(TRIM(c2.email), '') AS email
        FROM cadastro_beneficiario b
        LEFT JOIN contato_beneficiario c2 ON c2.beneficiario_id = b.id AND c2.tenant_id::text = ${tenantId}
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
            OR (
              REGEXP_REPLACE(COALESCE(m.cpf, ''), '\D', '', 'g') = ''
              AND LOWER(
                TRANSLATE(
                  REGEXP_REPLACE(TRIM(COALESCE(b.nome_completo, '')), '\s+', ' ', 'g'),
                  'ÁÀÃÂÄáàãâäÉÈÊËéèêëÍÌÎÏíìîïÓÒÕÔÖóòõôöÚÙÛÜúùûüÇçÑñ',
                  'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
                )
              ) = LOWER(
                TRANSLATE(
                  REGEXP_REPLACE(TRIM(COALESCE(m.beneficiario_nome, '')), '\s+', ' ', 'g'),
                  'ÁÀÃÂÄáàãâäÉÈÊËéèêëÍÌÎÏíìîïÓÒÕÔÖóòõôöÚÙÛÜúùûüÇçÑñ',
                  'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
                )
              )
            )
          )
        ORDER BY c2.id DESC NULLS LAST, b.id DESC
        LIMIT 1
      ) contato ON TRUE
      WHERE m.tenant_id::text = ${tenantId}
        AND m.id IN (${Prisma.join(ids.map((id) => BigInt(id)))})
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
              beneficiarioId:
                typeof participante.beneficiarioId === "number" && Number.isInteger(participante.beneficiarioId)
                  ? participante.beneficiarioId
                  : null,
              beneficiarioNome:
                typeof participante.beneficiarioNome === "string" ? participante.beneficiarioNome : null
            }))
          : []
      ),
      tenantId
    );
    const contatosPorMatricula = await this.listarContatosPorMatriculas(
      rows.flatMap((row) =>
        Array.isArray(row.participantes)
          ? (row.participantes as Array<Record<string, unknown>>)
              .map((participante) =>
                typeof participante.matriculaId === "number" && Number.isInteger(participante.matriculaId)
                  ? participante.matriculaId
                  : null
              )
              .filter((valor): valor is number => Number.isInteger(valor) && Number(valor) > 0)
          : []
      ),
      tenantId
    );
    const contatosPorMatriculaMap = new Map<
      number,
      { beneficiario_id: bigint | null; beneficiario_nome: string; telefone_principal: string | null; email: string | null }
    >();
    for (const contato of contatosPorMatricula) {
      contatosPorMatriculaMap.set(Number(contato.matricula_id), contato);
    }
    const contatosFallbackPorChave = new Map<
      string,
      { beneficiario_id: bigint; beneficiario_nome: string; telefone: string | null; email: string | null }
    >();
    for (const contato of contatosFallback) {
      contatosFallbackPorChave.set(
        this.chaveParticipante(contato.beneficiario_nome, contato.beneficiario_id),
        contato
      );
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
              const matriculaId =
                typeof participante.matriculaId === "number" && Number.isInteger(participante.matriculaId)
                  ? participante.matriculaId
                  : null;
              const beneficiarioId =
                typeof participante.beneficiarioId === "number" && Number.isInteger(participante.beneficiarioId)
                  ? BigInt(participante.beneficiarioId)
                  : null;
              const nome = typeof participante.beneficiarioNome === "string" ? participante.beneficiarioNome : "";
              const chaveParticipante = this.chaveParticipante(nome, beneficiarioId);
              const contatoMatricula = matriculaId ? contatosPorMatriculaMap.get(matriculaId) : undefined;
              const contato =
                contatoMatricula ??
                contatosPorChave.get(chaveParticipante) ??
                contatosFallbackPorChave.get(chaveParticipante);
              const telefoneContato = extrairTelefoneContato(contato);
              const emailContato = extrairEmailContato(contato);
              const telefoneParticipante =
                typeof participante.telefone === "string" && participante.telefone.trim().length
                  ? participante.telefone
                  : undefined;
              const emailParticipante =
                typeof participante.email === "string" && participante.email.trim().length
                  ? participante.email
                  : undefined;

              return {
                ...participante,
                telefone:
                  typeof contatoMatricula?.telefone_principal === "string" && contatoMatricula.telefone_principal.trim().length
                    ? contatoMatricula.telefone_principal
                    : telefoneContato ?? telefoneParticipante,
                email:
                  typeof contatoMatricula?.email === "string" && contatoMatricula.email.trim().length
                    ? contatoMatricula.email
                    : emailContato ?? emailParticipante
              };
            })
          : contatosDoAgendamento.map((contato) => ({
              beneficiarioId: contato.beneficiario_id ? Number(contato.beneficiario_id) : undefined,
              beneficiarioNome: contato.beneficiario_nome,
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

  private async sincronizarBeneficiariosAgendamento(
    agendamentoId: bigint,
    tenantId: string,
    participantes: Array<{ beneficiarioId?: number | null; beneficiarioNome: string; telefone?: string | null; email?: string | null }>
  ) {
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM agendamento_beneficiario
      WHERE agendamento_id = ${agendamentoId}
        AND tenant_id::text = ${tenantId}
    `);

    for (const participante of participantes) {
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO agendamento_beneficiario (
          tenant_id, agendamento_id, beneficiario_id, beneficiario_nome, telefone, email, status
        ) VALUES (
          ${tenantId}::uuid,
          ${agendamentoId},
          ${participante.beneficiarioId ? BigInt(participante.beneficiarioId) : null},
          ${participante.beneficiarioNome},
          ${trimOrUndefined(participante.telefone)},
          ${trimOrUndefined(participante.email)},
          'Agendado'
        )
      `);
    }
  }

  async listarItensOperacionais(tipo: "curso" | "atendimento" | "oficina", busca: string | undefined, tenantId: string) {
    await this.ensureEstrutura();
    const termo = trimOrUndefined(busca);

    return prisma.$queryRaw<AgendamentoOperacionalItemRow[]>(Prisma.sql`
      SELECT
        c.id,
        c.tipo,
        c.nome,
        c.profissional,
        TO_CHAR(c.horario_inicial, 'HH24:MI') AS horario_inicial,
        c.duracao_horas,
        c.dias_semana,
        s.nome AS sala_nome,
        c.instituicao_parceira,
        c.status
      FROM cursos_atendimentos c
      LEFT JOIN salas_unidade s ON s.id = c.sala_id
      WHERE LOWER(COALESCE(c.tipo, '')) = ${tipo}
        AND c.tenant_id::text = ${tenantId}
        AND COALESCE(c.status, 'Ativo') <> 'Inativo'
        ${termo ? Prisma.sql`AND (c.nome ILIKE ${`%${termo}%`} OR COALESCE(c.profissional, '') ILIKE ${`%${termo}%`})` : Prisma.empty}
      ORDER BY c.nome ASC
    `);
  }

  async listarBeneficiariosOperacionais(itemId: bigint, tenantId: string) {
    await this.ensureEstrutura();

    return prisma.$queryRaw<AgendamentoOperacionalBeneficiarioRow[]>(Prisma.sql`
      SELECT
        m.id AS matricula_id,
        contato.beneficiario_id,
        m.beneficiario_nome,
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
          COALESCE(
            NULLIF(TRIM(c2.telefone_principal), ''),
            NULLIF(TRIM(c2.telefone_secundario), ''),
            NULLIF(TRIM(c2.telefone_recado_numero), '')
          ) AS telefone,
          c2.email
        FROM cadastro_beneficiario b
        LEFT JOIN contato_beneficiario c2 ON c2.beneficiario_id = b.id AND c2.tenant_id::text = ${tenantId}
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
            OR (
              REGEXP_REPLACE(COALESCE(m.cpf, ''), '\D', '', 'g') = ''
              AND LOWER(
                TRANSLATE(
                  REGEXP_REPLACE(TRIM(COALESCE(b.nome_completo, '')), '\s+', ' ', 'g'),
                  'ÁÀÃÂÄáàãâäÉÈÊËéèêëÍÌÎÏíìîïÓÒÕÔÖóòõôöÚÙÛÜúùûüÇçÑñ',
                  'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
                )
              ) = LOWER(
                TRANSLATE(
                  REGEXP_REPLACE(TRIM(COALESCE(m.beneficiario_nome, '')), '\s+', ' ', 'g'),
                  'ÁÀÃÂÄáàãâäÉÈÊËéèêëÍÌÎÏíìîïÓÒÕÔÖóòõôöÚÙÛÜúùûüÇçÑñ',
                  'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
                )
              )
            )
          )
        ORDER BY c2.id DESC NULLS LAST, b.id DESC
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
    recurso?: string | null;
    idIgnorar?: bigint | null;
    tenantId: string;
  }) {
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
    if (trimOrUndefined(payload.sala)) {
      escopos.push(Prisma.sql`LOWER(COALESCE(a.sala, '')) = LOWER(${trimOrUndefined(payload.sala)})`);
    }
    if (trimOrUndefined(payload.recurso)) {
      escopos.push(Prisma.sql`LOWER(COALESCE(a.recurso, '')) = LOWER(${trimOrUndefined(payload.recurso)})`);
    }

    if (!escopos.length) return [];

    return prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT a.id, a.beneficiario_nome, a.profissional_nome, a.sala, a.recurso, a.hora_inicial, a.hora_final, a.status
      FROM agendamento a
      WHERE a.tenant_id::text = ${payload.tenantId}
        AND ${Prisma.join(condicoes, " AND ")}
        AND (${Prisma.join(escopos, " OR ")})
      ORDER BY a.hora_inicial ASC
    `);
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
    return this.hidratarParticipantesAgendamentos(rows, tenantId);
  }

  async obter(id: bigint, tenantId: string) {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRaw<AgendamentoRow[]>(Prisma.sql`
      SELECT * FROM agendamento WHERE id = ${id} AND tenant_id::text = ${tenantId} LIMIT 1
    `);
    const hidratados = await this.hidratarParticipantesAgendamentos(rows, tenantId);
    return hidratados[0] ?? null;
  }

  async criar(input: AgendamentoInput, usuario: UsuarioActor | undefined, tenantId: string) {
    await this.ensureEstrutura();
    const familiaResolvida = await this.resolverFamiliaDoBeneficiario(input.beneficiarioId);
    const conflitos = await this.listarConflitos({
      data: input.data,
      horaInicial: input.horaInicial,
      horaFinal: input.horaFinal,
      profissionalNome: input.profissionalNome,
      sala: input.sala,
      recurso: input.recurso,
      tenantId
    });

    if (conflitos.length && !input.permitirConflito) {
      throw new AppError("Conflito de agenda identificado.", 409);
    }

    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
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
        ${trimOrUndefined(input.sala)},
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

    const id = inserted[0]?.id;
    if (!id) throw new AppError("Nao foi possivel criar o agendamento.", 500);
    await this.sincronizarBeneficiariosAgendamento(id, tenantId, input.participantes ?? []);
    const criado = await this.obter(id, tenantId);
    await this.registrarLog(id, "criar", usuario, tenantId, null, criado);
    await this.registrarHistoricoFamilia(criado?.familia_id, "Agendamento criado para a família.", criado);
    return criado;
  }

  async atualizar(id: bigint, input: AgendamentoInput, usuario: UsuarioActor | undefined, tenantId: string) {
    await this.ensureEstrutura();
    const anterior = await this.obter(id, tenantId);
    if (!anterior) throw new AppError("Agendamento nao encontrado.", 404);
    const conflitos = await this.listarConflitos({
      data: input.data,
      horaInicial: input.horaInicial,
      horaFinal: input.horaFinal,
      profissionalNome: input.profissionalNome,
      sala: input.sala,
      recurso: input.recurso,
      idIgnorar: id,
      tenantId
    });
    if (conflitos.length && !input.permitirConflito) {
      throw new AppError("Conflito de agenda identificado.", 409);
    }

    await prisma.$executeRaw(Prisma.sql`
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
        sala = ${trimOrUndefined(input.sala)},
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

    await this.sincronizarBeneficiariosAgendamento(id, tenantId, input.participantes ?? []);
    const atual = await this.obter(id, tenantId);
    await this.registrarLog(id, "editar", usuario, tenantId, anterior, atual);
    return atual;
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

    const atual = await this.obter(id, tenantId);
    await this.registrarLog(id, "cancelar", usuario, tenantId, anterior, atual);
    return atual;
  }

  async remarcar(id: bigint, input: AgendamentoRemarcacaoInput, usuario: UsuarioActor | undefined, tenantId: string) {
    const anterior = await this.obter(id, tenantId);
    if (!anterior) throw new AppError("Agendamento nao encontrado.", 404);

    const conflitos = await this.listarConflitos({
      data: input.data,
      horaInicial: input.horaInicial,
      horaFinal: input.horaFinal,
      profissionalNome: input.profissionalNome ?? anterior.profissional_nome,
      sala: input.sala ?? anterior.sala,
      recurso: input.recurso ?? anterior.recurso,
      idIgnorar: id,
      tenantId
    });

    if (conflitos.length && !input.permitirConflito) {
      throw new AppError("Conflito de agenda identificado.", 409);
    }

    await prisma.$executeRaw(Prisma.sql`
      UPDATE agendamento
      SET
        data_agendamento = ${formatarData(input.data)},
        hora_inicial = ${sqlTime(input.horaInicial)},
        hora_final = ${sqlTime(input.horaFinal)},
        profissional_nome = ${trimOrUndefined(input.profissionalNome) ?? anterior.profissional_nome},
        sala = ${trimOrUndefined(input.sala) ?? anterior.sala},
        recurso = ${trimOrUndefined(input.recurso) ?? anterior.recurso},
        status = 'Remarcado',
        observacao_interna = ${trimOrUndefined(input.motivo) ?? anterior.observacao_interna},
        atualizado_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);

    const atual = await this.obter(id, tenantId);
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
        ${new Date(`${String(atual.data_agendamento).slice(0, 10)}T${String(atual.hora_inicial).slice(0, 8)}`)},
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
    await this.registrarHistoricoFamilia(atual?.familia_id, "Atendimento concluído para a família.", atual);
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
    const itens = await this.listarItensOperacionais(input.tipo, undefined, tenantId);
    const item = itens.find((entry) => Number(entry.id) === input.itemId);
    if (!item) {
      throw new AppError("Item de inscricao nao encontrado para agendamento.", 404);
    }

    const beneficiarios = await this.listarBeneficiariosOperacionais(BigInt(input.itemId), tenantId);
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
      beneficiarioNome: entry.beneficiario_nome,
      telefone: entry.telefone ?? undefined,
      email: entry.email ?? undefined,
      comparecimento: "Pendente" as const
    }));

    const horarioBase = String(item.horario_inicial ?? "08:00:00").slice(0, 8);
    const profissionalNome = trimOrUndefined(item.profissional) ?? trimOrUndefined(selecionados[0]?.profissional_nome) ?? "Equipe institucional";
    const local = trimOrUndefined(item.sala_nome) ?? trimOrUndefined(item.instituicao_parceira) ?? "Local a definir";

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
      sala: local,
      observacaoCurta: `${participantes.length} participante(s) vinculado(s) pela inscricao.`
    };
  }

  async criarOperacional(input: AgendamentoOperacionalInput, usuario: UsuarioActor | undefined, tenantId: string) {
    const payload = await this.montarPayloadOperacional(input, tenantId);
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
            .map((participante) =>
              typeof participante.matriculaId === "number" && Number.isInteger(participante.matriculaId)
                ? participante.matriculaId
                : null
            )
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
              beneficiarioId:
                typeof participante.beneficiarioId === "number" && Number.isInteger(participante.beneficiarioId)
                  ? participante.beneficiarioId
                  : null,
              beneficiarioNome:
                typeof participante.beneficiarioNome === "string" ? participante.beneficiarioNome : null
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
            const matriculaId =
              typeof item.matriculaId === "number" && Number.isInteger(item.matriculaId) ? item.matriculaId : null;
            const contatoMatricula = matriculaId ? contatosMatriculasPorId.get(matriculaId) : undefined;
            if (contatoMatricula?.beneficiario_id && beneficiario.beneficiario_id) {
              return contatoMatricula.beneficiario_id === beneficiario.beneficiario_id;
            }
            return this.chaveParticipante(
              typeof item.beneficiarioNome === "string" ? item.beneficiarioNome : null,
              typeof item.beneficiarioId === "number" && Number.isInteger(item.beneficiarioId) ? BigInt(item.beneficiarioId) : null
            ) === chave;
          });
          const matriculaId =
            participante && typeof participante.matriculaId === "number" && Number.isInteger(participante.matriculaId)
              ? participante.matriculaId
              : null;
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
          const matriculaId =
            typeof participante.matriculaId === "number" && Number.isInteger(participante.matriculaId)
              ? participante.matriculaId
              : null;
          const beneficiarioId =
            typeof participante.beneficiarioId === "number" && Number.isInteger(participante.beneficiarioId)
              ? BigInt(participante.beneficiarioId)
              : null;
          const beneficiarioNome =
            typeof participante.beneficiarioNome === "string" && participante.beneficiarioNome.trim().length
              ? participante.beneficiarioNome
              : `Participante ${index + 1}`;
          const chave = this.chaveParticipante(beneficiarioNome, beneficiarioId);
          const contatoMatricula = matriculaId ? contatosMatriculasPorId.get(matriculaId) : undefined;
          const fallback = fallbackPorChave.get(chave);
          return {
            id: BigInt(index + 1),
            agendamento_id: id,
            beneficiario_id: contatoMatricula?.beneficiario_id ?? beneficiarioId,
            beneficiario_nome: beneficiarioNome,
            telefone:
              (typeof contatoMatricula?.telefone_principal === "string" && contatoMatricula.telefone_principal.trim().length
                ? contatoMatricula.telefone_principal
                : typeof fallback?.telefone === "string" && fallback.telefone.trim().length
                  ? fallback.telefone
                  : typeof participante.telefone === "string" && participante.telefone.trim().length
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
        FROM usuario
        WHERE tenant_id::text = ${tenantId}
          AND NULLIF(TRIM(setor), '') IS NOT NULL
        ORDER BY setor ASC
      `),
      prisma.$queryRaw<Array<{ nome_completo: string | null }>>(Prisma.sql`
        SELECT nome_completo
        FROM cadastro_profissional
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
        SELECT nome
        FROM salas
        WHERE tenant_id::text = ${tenantId}
        ORDER BY nome ASC
      `),
      prisma.$queryRaw<Array<{ descricao: string | null }>>(Prisma.sql`
        SELECT DISTINCT NULLIF(TRIM(descricao), '') AS descricao
        FROM item_almoxarifado
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
