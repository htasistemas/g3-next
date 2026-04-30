import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import {
  joinSemicolonList,
  normalizeDigits,
  toOptionalDate,
  trimOrUndefined
} from "../../../utils/string-utils.js";
import type { ProfissionalFilters, ProfissionalInput } from "../profissional.types.js";

const profissionalInclude = {
  endereco: true
} satisfies Prisma.CadastroProfissionalInclude;

type TransactionClient = Prisma.TransactionClient;

function hasAnyAddressData(input: ProfissionalInput): boolean {
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

export class ProfissionalRepository {
  async listar(filters: ProfissionalFilters, tenantId: string) {
    const condicoes: Prisma.Sql[] = [Prisma.sql`p.tenant_id::text = ${tenantId}`];

    const nome = trimOrUndefined(filters.nome);
    if (nome) {
      condicoes.push(
        Prisma.sql`(
          p.nome_completo ILIKE ${`%${nome}%`}
          OR COALESCE(p.nome_social, '') ILIKE ${`%${nome}%`}
          OR COALESCE(p.apelido, '') ILIKE ${`%${nome}%`}
          OR COALESCE(p.especialidade, '') ILIKE ${`%${nome}%`}
        )`
      );
    }

    const categoria = trimOrUndefined(filters.categoria);
    if (categoria) {
      condicoes.push(Prisma.sql`COALESCE(p.categoria, '') ILIKE ${`%${categoria}%`}`);
    }

    const status = trimOrUndefined(filters.status);
    if (status) {
      condicoes.push(Prisma.sql`COALESCE(p.status, '') = ${status.toUpperCase()}`);
    }

    const cpf = normalizeDigits(filters.cpf);
    if (cpf) {
      condicoes.push(Prisma.sql`COALESCE(p.cpf, '') LIKE ${`%${cpf}%`}`);
    }

    const vinculo = trimOrUndefined(filters.vinculo);
    if (vinculo) {
      condicoes.push(Prisma.sql`COALESCE(p.vinculo, '') ILIKE ${vinculo}`);
    }

    const whereSql = Prisma.sql`${Prisma.join(condicoes, " AND ")}`;
    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>`
      SELECT p.id
      FROM cadastro_profissionais p
      WHERE ${whereSql}
      ORDER BY p.nome_completo ASC
    `;

    if (!rows.length) {
      return [];
    }

    const ids = rows.map((row) => row.id);
    const profissionais = await prisma.cadastroProfissional.findMany({
      where: { id: { in: ids } },
      include: profissionalInclude
    });

    const ordem = new Map(ids.map((id, index) => [id.toString(), index]));
    return profissionais.sort(
      (a, b) => (ordem.get(a.id.toString()) ?? 0) - (ordem.get(b.id.toString()) ?? 0)
    );
  }

  async buscarPorId(id: bigint, tenantId: string) {
    const row = await prisma.$queryRaw<Array<{ id: bigint }>>`
      SELECT p.id
      FROM cadastro_profissionais p
      WHERE p.id = ${id}
        AND p.tenant_id::text = ${tenantId}
      LIMIT 1
    `;

    if (!row.length) {
      return null;
    }

    return prisma.cadastroProfissional.findUnique({
      where: { id },
      include: profissionalInclude
    });
  }

  async buscarPorIdOuFalhar(id: bigint, tenantId: string) {
    const profissional = await this.buscarPorId(id, tenantId);
    if (!profissional) {
      throw new AppError("Profissional nao encontrado.", 404);
    }
    return profissional;
  }

  async criar(input: ProfissionalInput, tenantId: string) {
    return prisma.$transaction(async (tx) => {
      const now = new Date();
      let enderecoId: bigint | undefined;

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

      const profissional = await tx.cadastroProfissional.create({
        data: {
          nomeCompleto: input.nome_completo,
          cpf: normalizeDigits(input.cpf),
          nomeSocial: trimOrUndefined(input.nome_social),
          apelido: trimOrUndefined(input.apelido),
          dataNascimento: toOptionalDate(input.data_nascimento),
          foto3x4: trimOrUndefined(input.foto_3x4),
          sexoBiologico: trimOrUndefined(input.sexo_biologico),
          identidadeGenero: trimOrUndefined(input.identidade_genero),
          corRaca: trimOrUndefined(input.cor_raca),
          estadoCivil: trimOrUndefined(input.estado_civil),
          nacionalidade: trimOrUndefined(input.nacionalidade),
          naturalidadeCidade: trimOrUndefined(input.naturalidade_cidade),
          naturalidadeUf: trimOrUndefined(input.naturalidade_uf),
          nomeMae: trimOrUndefined(input.nome_mae),
          nomePai: trimOrUndefined(input.nome_pai),
          vinculo: trimOrUndefined(input.vinculo),
          categoria: input.categoria,
          registroConselho: trimOrUndefined(input.registro_conselho),
          especialidade: trimOrUndefined(input.especialidade),
          email: trimOrUndefined(input.email),
          telefone: normalizeDigits(input.telefone),
          unidade: trimOrUndefined(input.unidade),
          salaAtendimento: trimOrUndefined(input.sala_atendimento),
          cargaHoraria: input.carga_horaria,
          disponibilidade: joinSemicolonList(input.disponibilidade),
          canaisAtendimento: joinSemicolonList(input.canais_atendimento),
          status: input.status ?? "EM_ANALISE",
          tags: joinSemicolonList(input.tags),
          resumo: trimOrUndefined(input.resumo),
          observacoes: trimOrUndefined(input.observacoes),
          enderecoId,
          criadoEm: now,
          atualizadoEm: now
        }
      });

      await tx.$executeRaw`
        UPDATE cadastro_profissionais
        SET tenant_id = ${tenantId}::uuid
        WHERE id = ${profissional.id}
      `;

      const salvo = await this.buscarPorIdTransacao(tx, profissional.id, tenantId);
      if (!salvo) {
        throw new AppError("Profissional nao encontrado apos criar o registro.", 500);
      }
      return salvo;
    });
  }

  async atualizar(id: bigint, input: ProfissionalInput, tenantId: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await this.buscarPorIdTransacao(tx, id, tenantId);
      if (!existing) {
        throw new AppError("Profissional nao encontrado.", 404);
      }

      const now = new Date();
      let enderecoId: bigint | null = existing.enderecoId;
      const possuiEndereco = hasAnyAddressData(input);

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

      await tx.cadastroProfissional.update({
        where: { id },
        data: {
          nomeCompleto: input.nome_completo,
          cpf: normalizeDigits(input.cpf),
          nomeSocial: trimOrUndefined(input.nome_social),
          apelido: trimOrUndefined(input.apelido),
          dataNascimento: toOptionalDate(input.data_nascimento),
          foto3x4: trimOrUndefined(input.foto_3x4),
          sexoBiologico: trimOrUndefined(input.sexo_biologico),
          identidadeGenero: trimOrUndefined(input.identidade_genero),
          corRaca: trimOrUndefined(input.cor_raca),
          estadoCivil: trimOrUndefined(input.estado_civil),
          nacionalidade: trimOrUndefined(input.nacionalidade),
          naturalidadeCidade: trimOrUndefined(input.naturalidade_cidade),
          naturalidadeUf: trimOrUndefined(input.naturalidade_uf),
          nomeMae: trimOrUndefined(input.nome_mae),
          nomePai: trimOrUndefined(input.nome_pai),
          vinculo: trimOrUndefined(input.vinculo),
          categoria: input.categoria,
          registroConselho: trimOrUndefined(input.registro_conselho),
          especialidade: trimOrUndefined(input.especialidade),
          email: trimOrUndefined(input.email),
          telefone: normalizeDigits(input.telefone),
          unidade: trimOrUndefined(input.unidade),
          salaAtendimento: trimOrUndefined(input.sala_atendimento),
          cargaHoraria: input.carga_horaria,
          disponibilidade: joinSemicolonList(input.disponibilidade),
          canaisAtendimento: joinSemicolonList(input.canais_atendimento),
          status: input.status ?? existing.status ?? "EM_ANALISE",
          tags: joinSemicolonList(input.tags),
          resumo: trimOrUndefined(input.resumo),
          observacoes: trimOrUndefined(input.observacoes),
          enderecoId,
          atualizadoEm: now
        }
      });

      await tx.$executeRaw`
        UPDATE cadastro_profissionais
        SET tenant_id = ${tenantId}::uuid
        WHERE id = ${id}
      `;

      const atualizado = await this.buscarPorIdTransacao(tx, id, tenantId);
      if (!atualizado) {
        throw new AppError("Profissional nao encontrado apos atualizar o registro.", 500);
      }
      return atualizado;
    });
  }

  async remover(id: bigint, tenantId: string) {
    await this.buscarPorIdOuFalhar(id, tenantId);
    await prisma.cadastroProfissional.delete({ where: { id } });
  }

  private async buscarPorIdTransacao(tx: TransactionClient, id: bigint, tenantId: string) {
    const row = await tx.$queryRaw<Array<{ id: bigint }>>`
      SELECT p.id
      FROM cadastro_profissionais p
      WHERE p.id = ${id}
        AND p.tenant_id::text = ${tenantId}
      LIMIT 1
    `;
    if (!row.length) {
      return null;
    }

    const profissional = await tx.cadastroProfissional.findUnique({
      where: { id },
      include: profissionalInclude
    });
    if (!profissional) {
      throw new AppError("Profissional nao encontrado.", 404);
    }
    return profissional;
  }
}
