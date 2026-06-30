import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import {
  joinSemicolonList,
  normalizeDigits,
  toOptionalDate,
  trimOrUndefined
} from "../../../utils/string-utils.js";
import type { VoluntarioFilters, VoluntarioInput } from "../voluntario.types.js";
import {
  voluntarioEscalaDiaValues,
  type VoluntarioEscalaInput,
  type VoluntarioEscalaResumo
} from "../voluntario-escala.types.js";
import { splitSemicolonList } from "../../../utils/string-utils.js";

const voluntarioInclude = {
  endereco: true,
  profissional: {
    select: {
      id: true,
      nomeCompleto: true,
      categoria: true
    }
  }
} satisfies Prisma.CadastroVoluntarioInclude;

type TransactionClient = Prisma.TransactionClient;

type VoluntarioEscalaRow = {
  id: bigint;
  tenant_id: string;
  voluntario_id: bigint;
  sala_id: bigint;
  sala_nome: string;
  unidade_nome: string | null;
  atividade_tipo: string;
  titulo: string | null;
  dias_semana: string;
  hora_inicio: string;
  hora_fim: string;
  carga_horaria_semanal: number | string;
  status: string;
  observacoes: string | null;
  criado_em: Date | string;
  atualizado_em: Date | string;
};

function hasAnyAddressData(input: VoluntarioInput): boolean {
  return !!(
    trimOrUndefined(input.cep) ||
    trimOrUndefined(input.logradouro) ||
    trimOrUndefined(input.numero) ||
    trimOrUndefined(input.complemento) ||
    trimOrUndefined(input.bairro) ||
    trimOrUndefined(input.ponto_referencia) ||
    trimOrUndefined(input.municipio) ||
    trimOrUndefined(input.uf) ||
    trimOrUndefined(input.zona) ||
    trimOrUndefined(input.subzona)
  );
}

function toBigIntOrUndefined(value?: number): bigint | undefined {
  if (!value || !Number.isInteger(value) || value <= 0) return undefined;
  return BigInt(value);
}

function calcularCargaHorariaSemanal(dias: string[], horaInicio: string, horaFim: string) {
  const [inicioHora, inicioMinuto] = horaInicio.split(":").map(Number);
  const [fimHora, fimMinuto] = horaFim.split(":").map(Number);
  const minutos = fimHora * 60 + fimMinuto - (inicioHora * 60 + inicioMinuto);
  if (minutos <= 0) {
    throw new AppError("O horario final deve ser maior que o horario inicial.", 422);
  }
  const total = (minutos / 60) * dias.length;
  return Number(total.toFixed(2));
}

function mapEscalaRow(row: VoluntarioEscalaRow): VoluntarioEscalaResumo {
  const dias = splitSemicolonList(row.dias_semana)
    .map((dia) => dia.toUpperCase())
    .filter((dia): dia is (typeof voluntarioEscalaDiaValues)[number] =>
      (voluntarioEscalaDiaValues as readonly string[]).includes(dia)
    );

  return {
    id_escala: row.id.toString(),
    voluntario_id: row.voluntario_id.toString(),
    sala_id: row.sala_id.toString(),
    sala_nome: row.sala_nome,
    unidade_nome: row.unidade_nome ?? undefined,
    atividade_tipo: row.atividade_tipo,
    titulo: row.titulo ?? undefined,
    dias_semana: dias,
    hora_inicio: row.hora_inicio,
    hora_fim: row.hora_fim,
    carga_horaria_semanal: Number(row.carga_horaria_semanal ?? 0),
    status: row.status as VoluntarioEscalaResumo["status"],
    observacoes: row.observacoes ?? undefined,
    criado_em: new Date(row.criado_em).toISOString(),
    atualizado_em: new Date(row.atualizado_em).toISOString()
  };
}

const sqlEstruturaVoluntarioEscala = [
  `
  CREATE TABLE IF NOT EXISTS voluntario_escala (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    voluntario_id BIGINT NOT NULL REFERENCES cadastro_voluntario(id) ON DELETE CASCADE,
    sala_id BIGINT NOT NULL REFERENCES salas_unidade(id) ON DELETE RESTRICT,
    atividade_tipo VARCHAR(120) NOT NULL,
    titulo VARCHAR(180),
    dias_semana TEXT NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    carga_horaria_semanal NUMERIC(6,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVA',
    observacoes TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
  "ALTER TABLE voluntario_escala ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE voluntario_escala ADD COLUMN IF NOT EXISTS titulo VARCHAR(180)",
  "ALTER TABLE voluntario_escala ADD COLUMN IF NOT EXISTS observacoes TEXT",
  "ALTER TABLE voluntario_escala ADD COLUMN IF NOT EXISTS carga_horaria_semanal NUMERIC(6,2) NOT NULL DEFAULT 0",
  "ALTER TABLE voluntario_escala ALTER COLUMN hora_inicio TYPE TIME USING hora_inicio::time",
  "ALTER TABLE voluntario_escala ALTER COLUMN hora_fim TYPE TIME USING hora_fim::time",
  "CREATE INDEX IF NOT EXISTS voluntario_escala_tenant_idx ON voluntario_escala (tenant_id, voluntario_id, criado_em DESC)",
  "CREATE INDEX IF NOT EXISTS voluntario_escala_sala_idx ON voluntario_escala (tenant_id, sala_id)"
];

const estruturaVoluntarioEscala = {
  inicializada: false
};
let estruturaVoluntarioEscalaPromise: Promise<void> | null = null;

async function ensureVoluntarioEscalaEstrutura() {
  if (estruturaVoluntarioEscala.inicializada) return;
  if (!estruturaVoluntarioEscalaPromise) {
    estruturaVoluntarioEscalaPromise = (async () => {
      for (const sql of sqlEstruturaVoluntarioEscala) {
        await prisma.$executeRawUnsafe(sql);
      }
      estruturaVoluntarioEscala.inicializada = true;
    })().catch((error) => {
      estruturaVoluntarioEscalaPromise = null;
      throw error;
    });
  }

  await estruturaVoluntarioEscalaPromise;
}

async function validarProfissional(
  tx: TransactionClient,
  tenantId: string,
  profissionalId?: bigint
): Promise<void> {
  if (!profissionalId) return;
  const profissional = await tx.$queryRaw<Array<{ id: bigint }>>`
    SELECT p.id
    FROM cadastro_profissionais p
    WHERE p.id = ${profissionalId}
      AND p.tenant_id::text = ${tenantId}
    LIMIT 1
  `;

  if (!profissional.length) {
    throw new AppError("Profissional vinculado nao encontrado.", 404);
  }
}

export class VoluntarioRepository {
  async listar(filters: VoluntarioFilters, tenantId: string) {
    const condicoes: Prisma.Sql[] = [Prisma.sql`v.tenant_id::text = ${tenantId}`];

    const nome = trimOrUndefined(filters.nome);
    if (nome) {
      condicoes.push(
        Prisma.sql`(
          v.nome_completo ILIKE ${`%${nome}%`}
          OR COALESCE(p.nome_completo, '') ILIKE ${`%${nome}%`}
        )`
      );
    }

    const status = trimOrUndefined(filters.status);
    if (status) {
      condicoes.push(Prisma.sql`COALESCE(v.status, '') = ${status.toUpperCase()}`);
    }

    const cpf = normalizeDigits(filters.cpf);
    if (cpf) {
      condicoes.push(Prisma.sql`COALESCE(v.cpf, '') LIKE ${`%${cpf}%`}`);
    }

    const email = trimOrUndefined(filters.email);
    if (email) {
      condicoes.push(Prisma.sql`COALESCE(v.email, '') ILIKE ${`%${email}%`}`);
    }

    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>`
      SELECT v.id
      FROM cadastro_voluntario v
      LEFT JOIN cadastro_profissionais p ON p.id = v.profissional_id
      WHERE ${Prisma.join(condicoes, " AND ")}
      ORDER BY v.nome_completo ASC
    `;

    if (!rows.length) {
      return [];
    }

    const ids = rows.map((row) => row.id);
    const voluntarios = await prisma.cadastroVoluntario.findMany({
      where: { id: { in: ids } },
      include: voluntarioInclude
    });

    const ordem = new Map(ids.map((id, index) => [id.toString(), index]));
    return voluntarios.sort(
      (a, b) => (ordem.get(a.id.toString()) ?? 0) - (ordem.get(b.id.toString()) ?? 0)
    );
  }

  async buscarPorId(id: bigint, tenantId: string) {
    const row = await prisma.$queryRaw<Array<{ id: bigint }>>`
      SELECT v.id
      FROM cadastro_voluntario v
      WHERE v.id = ${id}
        AND v.tenant_id::text = ${tenantId}
      LIMIT 1
    `;

    if (!row.length) {
      return null;
    }

    return prisma.cadastroVoluntario.findUnique({
      where: { id },
      include: voluntarioInclude
    });
  }

  async buscarPorIdOuFalhar(id: bigint, tenantId: string) {
    const voluntario = await this.buscarPorId(id, tenantId);
    if (!voluntario) {
      throw new AppError("Voluntario nao encontrado.", 404);
    }
    return voluntario;
  }

  async criar(input: VoluntarioInput, tenantId: string) {
    return prisma.$transaction(async (tx) => {
      const now = new Date();
      let enderecoId: bigint | undefined;
      const profissionalId = toBigIntOrUndefined(input.profissional_id);

      await validarProfissional(tx, tenantId, profissionalId);

      if (hasAnyAddressData(input)) {
        const endereco = await tx.endereco.create({
          data: {
            cep: normalizeDigits(input.cep),
            logradouro: trimOrUndefined(input.logradouro),
            numero: trimOrUndefined(input.numero),
            complemento: trimOrUndefined(input.complemento),
            bairro: trimOrUndefined(input.bairro),
            pontoReferencia: trimOrUndefined(input.ponto_referencia),
            cidade: trimOrUndefined(input.municipio),
            estado: trimOrUndefined(input.uf),
            zona: trimOrUndefined(input.zona),
            subzona: trimOrUndefined(input.subzona),
            criadoEm: now,
            atualizadoEm: now
          }
        });
        enderecoId = endereco.id;
      }

      const voluntario = await tx.cadastroVoluntario.create({
        data: {
          profissionalId,
          nomeCompleto: input.nome_completo,
          cpf: normalizeDigits(input.cpf) ?? "",
          rg: trimOrUndefined(input.rg),
          foto3x4: trimOrUndefined(input.foto_3x4),
          enderecoId,
          dataNascimento: toOptionalDate(input.data_nascimento),
          genero: trimOrUndefined(input.genero),
          profissao: trimOrUndefined(input.profissao),
          motivacao: trimOrUndefined(input.motivacao),
          telefone: normalizeDigits(input.telefone),
          email: input.email,
          cidade: trimOrUndefined(input.cidade),
          estado: trimOrUndefined(input.estado),
          areaInteresse: trimOrUndefined(input.area_interesse),
          habilidades: trimOrUndefined(input.habilidades),
          idiomas: trimOrUndefined(input.idiomas),
          linkedin: trimOrUndefined(input.linkedin),
          status: input.status ?? "ATIVO",
          disponibilidadeDias: joinSemicolonList(input.disponibilidade_dias),
          disponibilidadePeriodos: joinSemicolonList(input.disponibilidade_periodos),
          cargaHorariaSemanal: trimOrUndefined(input.carga_horaria_semanal),
          presencial: input.presencial ?? false,
          remoto: input.remoto ?? false,
          inicioPrevisto: toOptionalDate(input.inicio_previsto),
          observacoes: trimOrUndefined(input.observacoes),
          documentoIdentificacao: trimOrUndefined(input.documento_identificacao),
          comprovanteEndereco: trimOrUndefined(input.comprovante_endereco),
          aceiteVoluntariado: input.aceite_voluntariado ?? false,
          aceiteImagem: input.aceite_imagem ?? false,
          assinaturaDigital: trimOrUndefined(input.assinatura_digital),
          criadoEm: now,
          atualizadoEm: now
        }
      });

      await tx.$executeRaw`
        UPDATE cadastro_voluntario
        SET tenant_id = ${tenantId}::uuid
        WHERE id = ${voluntario.id}
      `;

      const salvo = await this.buscarPorIdTransacao(tx, voluntario.id, tenantId);
      if (!salvo) {
        throw new AppError("Voluntario nao encontrado apos criar o registro.", 500);
      }
      return salvo;
    });
  }

  async atualizar(id: bigint, input: VoluntarioInput, tenantId: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await this.buscarPorIdTransacao(tx, id, tenantId);
      if (!existing) {
        throw new AppError("Voluntario nao encontrado.", 404);
      }

      const now = new Date();
      let enderecoId: bigint | null = existing.enderecoId;
      const possuiEndereco = hasAnyAddressData(input);
      const profissionalId = toBigIntOrUndefined(input.profissional_id);

      await validarProfissional(tx, tenantId, profissionalId);

      if (possuiEndereco) {
        if (existing.enderecoId) {
          await tx.endereco.update({
            where: { id: existing.enderecoId },
            data: {
              cep: normalizeDigits(input.cep),
              logradouro: trimOrUndefined(input.logradouro),
              numero: trimOrUndefined(input.numero),
              complemento: trimOrUndefined(input.complemento),
              bairro: trimOrUndefined(input.bairro),
              pontoReferencia: trimOrUndefined(input.ponto_referencia),
              cidade: trimOrUndefined(input.municipio),
              estado: trimOrUndefined(input.uf),
              zona: trimOrUndefined(input.zona),
              subzona: trimOrUndefined(input.subzona),
              atualizadoEm: now
            }
          });
        } else {
          const endereco = await tx.endereco.create({
            data: {
              cep: normalizeDigits(input.cep),
              logradouro: trimOrUndefined(input.logradouro),
              numero: trimOrUndefined(input.numero),
              complemento: trimOrUndefined(input.complemento),
              bairro: trimOrUndefined(input.bairro),
              pontoReferencia: trimOrUndefined(input.ponto_referencia),
              cidade: trimOrUndefined(input.municipio),
              estado: trimOrUndefined(input.uf),
              zona: trimOrUndefined(input.zona),
              subzona: trimOrUndefined(input.subzona),
              criadoEm: now,
              atualizadoEm: now
            }
          });
          enderecoId = endereco.id;
        }
      } else {
        enderecoId = null;
      }

      await tx.cadastroVoluntario.update({
        where: { id },
        data: {
          profissionalId,
          nomeCompleto: input.nome_completo,
          cpf: normalizeDigits(input.cpf) ?? existing.cpf,
          rg: trimOrUndefined(input.rg),
          foto3x4: trimOrUndefined(input.foto_3x4),
          enderecoId,
          dataNascimento: toOptionalDate(input.data_nascimento),
          genero: trimOrUndefined(input.genero),
          profissao: trimOrUndefined(input.profissao),
          motivacao: trimOrUndefined(input.motivacao),
          telefone: normalizeDigits(input.telefone),
          email: input.email,
          cidade: trimOrUndefined(input.cidade),
          estado: trimOrUndefined(input.estado),
          areaInteresse: trimOrUndefined(input.area_interesse),
          habilidades: trimOrUndefined(input.habilidades),
          idiomas: trimOrUndefined(input.idiomas),
          linkedin: trimOrUndefined(input.linkedin),
          status: input.status ?? existing.status ?? "ATIVO",
          disponibilidadeDias: joinSemicolonList(input.disponibilidade_dias),
          disponibilidadePeriodos: joinSemicolonList(input.disponibilidade_periodos),
          cargaHorariaSemanal: trimOrUndefined(input.carga_horaria_semanal),
          presencial: input.presencial ?? false,
          remoto: input.remoto ?? false,
          inicioPrevisto: toOptionalDate(input.inicio_previsto),
          observacoes: trimOrUndefined(input.observacoes),
          documentoIdentificacao: trimOrUndefined(input.documento_identificacao),
          comprovanteEndereco: trimOrUndefined(input.comprovante_endereco),
          aceiteVoluntariado: input.aceite_voluntariado ?? false,
          aceiteImagem: input.aceite_imagem ?? false,
          assinaturaDigital: trimOrUndefined(input.assinatura_digital),
          atualizadoEm: now
        }
      });

      await tx.$executeRaw`
        UPDATE cadastro_voluntario
        SET tenant_id = ${tenantId}::uuid
        WHERE id = ${id}
      `;

      const atualizado = await this.buscarPorIdTransacao(tx, id, tenantId);
      if (!atualizado) {
        throw new AppError("Voluntario nao encontrado apos atualizar o registro.", 500);
      }
      return atualizado;
    });
  }

  async remover(id: bigint, tenantId: string) {
    await this.buscarPorIdOuFalhar(id, tenantId);
    await prisma.cadastroVoluntario.delete({ where: { id } });
  }

  async listarEscalas(voluntarioId: bigint, tenantId: string) {
    await ensureVoluntarioEscalaEstrutura();
    return prisma.$queryRaw<VoluntarioEscalaRow[]>(Prisma.sql`
      SELECT
        e.id,
        e.tenant_id::text AS tenant_id,
        e.voluntario_id,
        e.sala_id,
        s.nome AS sala_nome,
        u.nome_fantasia AS unidade_nome,
        e.atividade_tipo,
        e.titulo,
        e.dias_semana,
        to_char(e.hora_inicio, 'HH24:MI') AS hora_inicio,
        to_char(e.hora_fim, 'HH24:MI') AS hora_fim,
        e.carga_horaria_semanal,
        e.status,
        e.observacoes,
        e.criado_em,
        e.atualizado_em
      FROM voluntario_escala e
      INNER JOIN cadastro_voluntario v ON v.id = e.voluntario_id
      INNER JOIN salas_unidade s ON s.id = e.sala_id
      LEFT JOIN unidade_assistencial u ON u.id = s.unidade_id
      WHERE e.voluntario_id = ${voluntarioId}
        AND e.tenant_id::text = ${tenantId}
        AND v.tenant_id::text = ${tenantId}
      ORDER BY e.criado_em DESC
    `);
  }

  async buscarEscalaPorId(id: bigint, tenantId: string) {
    await ensureVoluntarioEscalaEstrutura();
    const rows = await prisma.$queryRaw<VoluntarioEscalaRow[]>(Prisma.sql`
      SELECT
        e.id,
        e.tenant_id::text AS tenant_id,
        e.voluntario_id,
        e.sala_id,
        s.nome AS sala_nome,
        u.nome_fantasia AS unidade_nome,
        e.atividade_tipo,
        e.titulo,
        e.dias_semana,
        to_char(e.hora_inicio, 'HH24:MI') AS hora_inicio,
        to_char(e.hora_fim, 'HH24:MI') AS hora_fim,
        e.carga_horaria_semanal,
        e.status,
        e.observacoes,
        e.criado_em,
        e.atualizado_em
      FROM voluntario_escala e
      INNER JOIN salas_unidade s ON s.id = e.sala_id
      LEFT JOIN unidade_assistencial u ON u.id = s.unidade_id
      WHERE e.id = ${id}
        AND e.tenant_id::text = ${tenantId}
      LIMIT 1
    `);

    return rows[0] ? mapEscalaRow(rows[0]) : null;
  }

  async criarEscala(input: VoluntarioEscalaInput, tenantId: string) {
    await ensureVoluntarioEscalaEstrutura();
    const voluntarioId = input.voluntario_id;
    const salaId = input.sala_id;
    const diasSemana = input.dias_semana;
    const cargaHoraria =
      typeof input.carga_horaria_semanal === "number" && Number.isFinite(input.carga_horaria_semanal)
        ? Number(input.carga_horaria_semanal.toFixed(2))
        : calcularCargaHorariaSemanal(diasSemana, input.hora_inicio, input.hora_fim);
    const now = new Date();

    await this.validarVoluntarioSalaEscalaTx(prisma, voluntarioId, salaId, tenantId);

    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO voluntario_escala (
        tenant_id,
        voluntario_id,
        sala_id,
        atividade_tipo,
        titulo,
        dias_semana,
        hora_inicio,
        hora_fim,
        carga_horaria_semanal,
        status,
        observacoes,
        criado_em,
        atualizado_em
      )
      VALUES (
        ${tenantId}::uuid,
        ${voluntarioId},
        ${salaId},
        ${input.atividade_tipo},
        ${input.titulo ?? null},
        ${joinSemicolonList(diasSemana)},
        CAST(${input.hora_inicio} AS time),
        CAST(${input.hora_fim} AS time),
        ${cargaHoraria},
        ${input.status},
        ${input.observacoes ?? null},
        ${now},
        ${now}
      )
      RETURNING id
    `);

    const id = rows[0]?.id;
    if (!id) {
      throw new AppError("Nao foi possivel criar a escala do voluntario.", 500);
    }

    const escala = await this.buscarEscalaPorId(id, tenantId);
    if (!escala) {
      throw new AppError("Nao foi possivel recuperar a escala do voluntario.", 500);
    }
    return escala;
  }

  async atualizarEscala(id: bigint, input: VoluntarioEscalaInput, tenantId: string) {
    await ensureVoluntarioEscalaEstrutura();
    const voluntarioId = input.voluntario_id;
    const salaId = input.sala_id;
    const diasSemana = input.dias_semana;
    const cargaHoraria =
      typeof input.carga_horaria_semanal === "number" && Number.isFinite(input.carga_horaria_semanal)
        ? Number(input.carga_horaria_semanal.toFixed(2))
        : calcularCargaHorariaSemanal(diasSemana, input.hora_inicio, input.hora_fim);
    const now = new Date();

    await this.validarVoluntarioSalaEscalaTx(prisma, voluntarioId, salaId, tenantId);

    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      UPDATE voluntario_escala
      SET
        voluntario_id = ${voluntarioId},
        sala_id = ${salaId},
        atividade_tipo = ${input.atividade_tipo},
        titulo = ${input.titulo ?? null},
        dias_semana = ${joinSemicolonList(diasSemana)},
        hora_inicio = CAST(${input.hora_inicio} AS time),
        hora_fim = CAST(${input.hora_fim} AS time),
        carga_horaria_semanal = ${cargaHoraria},
        status = ${input.status},
        observacoes = ${input.observacoes ?? null},
        atualizado_em = ${now}
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
      RETURNING id
    `);

    const row = rows[0];
    if (!row) {
      throw new AppError("Escala nao encontrada.", 404);
    }

    const escala = await this.buscarEscalaPorId(row.id, tenantId);
    if (!escala) {
      throw new AppError("Escala nao encontrada.", 404);
    }
    return escala;
  }

  async removerEscala(id: bigint, tenantId: string) {
    await ensureVoluntarioEscalaEstrutura();
    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>`
      SELECT id
      FROM voluntario_escala
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `;
    if (!rows.length) {
      throw new AppError("Escala nao encontrada.", 404);
    }

    await prisma.$executeRaw`
      DELETE FROM voluntario_escala
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `;
  }

  private async buscarPorIdTransacao(tx: TransactionClient, id: bigint, tenantId: string) {
    const row = await tx.$queryRaw<Array<{ id: bigint }>>`
      SELECT v.id
      FROM cadastro_voluntario v
      WHERE v.id = ${id}
        AND v.tenant_id::text = ${tenantId}
      LIMIT 1
    `;
    if (!row.length) {
      return null;
    }

    return tx.cadastroVoluntario.findUnique({
      where: { id },
      include: voluntarioInclude
    });
  }

  private async validarVoluntarioSalaEscalaTx(
    db: Pick<TransactionClient, "$queryRawUnsafe">,
    voluntarioId: bigint,
    salaId: bigint,
    tenantId: string
  ) {
    const voluntarioRows = await db.$queryRawUnsafe<Array<{ id: bigint }>>(
      `
      SELECT v.id
      FROM cadastro_voluntario v
      WHERE v.id = $1
        AND v.tenant_id::text = $2
      LIMIT 1
      `,
      voluntarioId,
      tenantId
    );
    if (!voluntarioRows[0]) {
      throw new AppError("Voluntario nao encontrado para a escala.", 404);
    }

    const salaRows = await db.$queryRawUnsafe<Array<{ id: bigint }>>(
      `
      SELECT s.id
      FROM salas_unidade s
      INNER JOIN unidade_assistencial u ON u.id = s.unidade_id
      WHERE s.id = $1
        AND u.tenant_id::text = $2
      LIMIT 1
      `,
      salaId,
      tenantId
    );
    if (!salaRows[0]) {
      throw new AppError("Sala nao encontrada para a escala.", 404);
    }
  }
}
