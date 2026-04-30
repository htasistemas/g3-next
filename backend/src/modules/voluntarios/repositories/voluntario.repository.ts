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
}
