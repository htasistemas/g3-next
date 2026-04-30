import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { normalizeDigits, trimOrUndefined } from "../../../utils/string-utils.js";
import type {
  DiretoriaUnidadeInput,
  SalaUnidadeInput,
  UnidadeAssistencialFilters,
  UnidadeAssistencialInput
} from "../unidade-assistencial.types.js";

const unidadeInclude = {
  endereco: true,
  imagemUnidade: true,
  diretoria: { orderBy: { nomeCompleto: "asc" } },
  salas: { orderBy: { nome: "asc" } }
} satisfies Prisma.UnidadeAssistencialInclude;

type TransactionClient = Prisma.TransactionClient;
type IdRow = { id: bigint };

function hasAnyAddressData(input: UnidadeAssistencialInput): boolean {
  return !!(
    trimOrUndefined(input.cep) ||
    trimOrUndefined(input.logradouro) ||
    trimOrUndefined(input.numero) ||
    trimOrUndefined(input.complemento) ||
    trimOrUndefined(input.bairro) ||
    trimOrUndefined(input.ponto_referencia) ||
    trimOrUndefined(input.cidade) ||
    trimOrUndefined(input.estado) ||
    trimOrUndefined(input.zona) ||
    trimOrUndefined(input.subzona) ||
    trimOrUndefined(input.latitude) ||
    trimOrUndefined(input.longitude)
  );
}

function parseDecimal(value?: string): Prisma.Decimal | undefined {
  if (!value) return undefined;
  try {
    return new Prisma.Decimal(value);
  } catch {
    return undefined;
  }
}

function normalizarDiretoria(diretoria?: DiretoriaUnidadeInput[]) {
  if (!diretoria?.length) return [];
  return diretoria
    .map((membro) => ({
      nomeCompleto: trimOrUndefined(membro.nome_completo),
      documento: normalizeDigits(membro.documento) ?? trimOrUndefined(membro.documento),
      funcao: trimOrUndefined(membro.funcao),
      mandatoInicio: trimOrUndefined(membro.mandato_inicio),
      mandatoFim: trimOrUndefined(membro.mandato_fim)
    }))
    .filter((membro) => membro.nomeCompleto && membro.documento && membro.funcao) as Array<{
    nomeCompleto: string;
    documento: string;
    funcao: string;
    mandatoInicio?: string;
    mandatoFim?: string;
  }>;
}

function normalizarSalas(salas?: SalaUnidadeInput[]) {
  if (!salas?.length) return [];
  const nomesUnicos = new Set<string>();
  for (const sala of salas) {
    const nome = trimOrUndefined(sala.nome);
    if (!nome) continue;
    nomesUnicos.add(nome);
  }
  return Array.from(nomesUnicos);
}

export class UnidadeAssistencialRepository {
  async listar(filters: UnidadeAssistencialFilters, tenantId?: string) {
    if (!tenantId) {
      const where: Prisma.UnidadeAssistencialWhereInput = {};

      const nome = trimOrUndefined(filters.nome_fantasia);
      if (nome) {
        where.OR = [
          { nomeFantasia: { contains: nome, mode: "insensitive" } },
          { razaoSocial: { contains: nome, mode: "insensitive" } }
        ];
      }

      const cnpj = normalizeDigits(filters.cnpj);
      if (cnpj) {
        where.cnpj = { contains: cnpj };
      }

      const cidade = trimOrUndefined(filters.cidade);
      if (cidade) {
        where.endereco = {
          is: {
            cidade: { contains: cidade, mode: "insensitive" }
          }
        };
      }

      if (typeof filters.unidade_principal === "boolean") {
        where.unidadePrincipal = filters.unidade_principal;
      }

      return prisma.unidadeAssistencial.findMany({
        where,
        include: unidadeInclude,
        orderBy: [{ nomeFantasia: "asc" }]
      });
    }

    const ids = await this.listarIdsPorTenant(filters, tenantId);
    if (!ids.length) return [];

    const unidades = await prisma.unidadeAssistencial.findMany({
      where: { id: { in: ids } },
      include: unidadeInclude,
      orderBy: [{ nomeFantasia: "asc" }]
    });

    const ordem = new Map(ids.map((id, indice) => [id.toString(), indice]));
    return unidades.sort((a, b) => (ordem.get(a.id.toString()) ?? 0) - (ordem.get(b.id.toString()) ?? 0));
  }

  async buscarPorId(id: bigint) {
    return prisma.unidadeAssistencial.findUnique({
      where: { id },
      include: unidadeInclude
    });
  }

  async buscarPorIdDoTenant(id: bigint, tenantId?: string) {
    if (!tenantId) {
      return this.buscarPorId(id);
    }

    const pertenceAoTenant = await this.unidadePertenceAoTenant(id, tenantId);
    if (!pertenceAoTenant) {
      return null;
    }

    return prisma.unidadeAssistencial.findUnique({
      where: { id },
      include: unidadeInclude
    });
  }

  async buscarPorIdOuFalhar(id: bigint, tenantId?: string) {
    const unidade = await this.buscarPorIdDoTenant(id, tenantId);
    if (!unidade) {
      throw new AppError("Unidade assistencial nao encontrada.", 404);
    }
    return unidade;
  }

  async buscarAtual(tenantId?: string) {
    if (!tenantId) {
      const unidadePrincipal = await prisma.unidadeAssistencial.findFirst({
        where: { unidadePrincipal: true },
        include: unidadeInclude,
        orderBy: [{ atualizadoEm: "desc" }]
      });

      if (unidadePrincipal) return unidadePrincipal;

      return prisma.unidadeAssistencial.findFirst({
        include: unidadeInclude,
        orderBy: [{ criadoEm: "asc" }]
      });
    }

    const rows = await prisma.$queryRawUnsafe<IdRow[]>(
      `
      SELECT id
      FROM unidade_assistencial
      WHERE tenant_id::text = $1
      ORDER BY unidade_principal DESC, atualizado_em DESC, criado_em ASC
      LIMIT 1
      `,
      tenantId
    );

    const unidadeId = rows[0]?.id;
    if (!unidadeId) return null;

    return prisma.unidadeAssistencial.findUnique({
      where: { id: unidadeId },
      include: unidadeInclude
    });
  }

  async criar(input: UnidadeAssistencialInput, tenantId?: string) {
    return prisma.$transaction(async (tx) => {
      const now = new Date();
      let enderecoId: bigint | undefined;
      const possuiEndereco = hasAnyAddressData(input);

      if (input.unidade_principal && tenantId) {
        await tx.$executeRawUnsafe(
          `
          UPDATE unidade_assistencial
          SET unidade_principal = FALSE,
              atualizado_em = $2
          WHERE tenant_id::text = $1
            AND unidade_principal = TRUE
          `,
          tenantId,
          now
        );
      }

      if (possuiEndereco) {
        const endereco = await tx.endereco.create({
          data: {
            cep: normalizeDigits(input.cep),
            logradouro: trimOrUndefined(input.logradouro),
            numero: trimOrUndefined(input.numero),
            complemento: trimOrUndefined(input.complemento),
            bairro: trimOrUndefined(input.bairro),
            pontoReferencia: trimOrUndefined(input.ponto_referencia),
            cidade: trimOrUndefined(input.cidade),
            estado: trimOrUndefined(input.estado),
            zona: trimOrUndefined(input.zona),
            subzona: trimOrUndefined(input.subzona),
            latitude: parseDecimal(input.latitude),
            longitude: parseDecimal(input.longitude),
            criadoEm: now,
            atualizadoEm: now
          }
        });
        enderecoId = endereco.id;
      }

      const unidade = await tx.unidadeAssistencial.create({
        data: {
          nomeFantasia: input.nome_fantasia,
          razaoSocial: trimOrUndefined(input.razao_social),
          cnpj: normalizeDigits(input.cnpj),
          email: trimOrUndefined(input.email),
          site: trimOrUndefined(input.site),
          telefone: normalizeDigits(input.telefone),
          horarioFuncionamento: trimOrUndefined(input.horario_funcionamento),
          observacoes: trimOrUndefined(input.observacoes),
          unidadePrincipal: input.unidade_principal ?? false,
          enderecoId,
          raioPontoMetros: input.raio_ponto_metros ?? 100,
          accuracyMaxPontoMetros: input.accuracy_max_ponto_metros ?? 80,
          ipValidacaoPonto: trimOrUndefined(input.ip_validacao_ponto),
          ipsPublicosPonto: trimOrUndefined(input.ips_publicos_ponto),
          redesLocaisPonto: trimOrUndefined(input.redes_locais_ponto),
          modoValidacaoPonto: trimOrUndefined(input.modo_validacao_ponto) ?? "IP_OU_REDE",
          pingTimeoutMs: input.ping_timeout_ms ?? 2000,
          criadoEm: now,
          atualizadoEm: now
        }
      });

      if (tenantId) {
        await tx.$executeRawUnsafe(
          `
          UPDATE unidade_assistencial
          SET tenant_id = $2::uuid
          WHERE id = $1
          `,
          unidade.id,
          tenantId
        );
      }

      const logomarca = trimOrUndefined(input.logomarca);
      const logomarcaRelatorio = trimOrUndefined(input.logomarca_relatorio);
      if (logomarca || logomarcaRelatorio) {
        await tx.imagemUnidade.create({
          data: {
            unidadeId: unidade.id,
            logomarca,
            logomarcaRelatorio,
            criadoEm: now,
            atualizadoEm: now
          }
        });
      }

      const diretoria = normalizarDiretoria(input.diretoria);
      if (diretoria.length) {
        await tx.diretoriaUnidade.createMany({
          data: diretoria.map((membro) => ({
            unidadeId: unidade.id,
            nomeCompleto: membro.nomeCompleto,
            documento: membro.documento,
            funcao: membro.funcao,
            mandatoInicio: membro.mandatoInicio,
            mandatoFim: membro.mandatoFim,
            criadoEm: now,
            atualizadoEm: now
          }))
        });
      }

      const salas = normalizarSalas(input.salas);
      if (salas.length) {
        await tx.salaUnidade.createMany({
          data: salas.map((nome) => ({
            unidadeId: unidade.id,
            nome,
            criadoEm: now,
            atualizadoEm: now
          }))
        });
      }

      return this.buscarPorIdTransacao(tx, unidade.id, tenantId);
    });
  }

  async atualizar(id: bigint, input: UnidadeAssistencialInput, tenantId?: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await this.buscarPorIdTransacao(tx, id, tenantId);
      if (!existing) {
        throw new AppError("Unidade assistencial nao encontrada.", 404);
      }

      const now = new Date();
      let enderecoId = existing.enderecoId ?? undefined;
      const possuiEndereco = hasAnyAddressData(input);

      if (input.unidade_principal && tenantId) {
        await tx.$executeRawUnsafe(
          `
          UPDATE unidade_assistencial
          SET unidade_principal = FALSE,
              atualizado_em = $3
          WHERE tenant_id::text = $1
            AND unidade_principal = TRUE
            AND id <> $2
          `,
          tenantId,
          id,
          now
        );
      }

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
              cidade: trimOrUndefined(input.cidade),
              estado: trimOrUndefined(input.estado),
              zona: trimOrUndefined(input.zona),
              subzona: trimOrUndefined(input.subzona),
              latitude: parseDecimal(input.latitude),
              longitude: parseDecimal(input.longitude),
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
              cidade: trimOrUndefined(input.cidade),
              estado: trimOrUndefined(input.estado),
              zona: trimOrUndefined(input.zona),
              subzona: trimOrUndefined(input.subzona),
              latitude: parseDecimal(input.latitude),
              longitude: parseDecimal(input.longitude),
              criadoEm: now,
              atualizadoEm: now
            }
          });
          enderecoId = endereco.id;
        }
      } else {
        enderecoId = undefined;
      }

      await tx.unidadeAssistencial.update({
        where: { id },
        data: {
          nomeFantasia: input.nome_fantasia,
          razaoSocial: trimOrUndefined(input.razao_social),
          cnpj: normalizeDigits(input.cnpj),
          email: trimOrUndefined(input.email),
          site: trimOrUndefined(input.site),
          telefone: normalizeDigits(input.telefone),
          horarioFuncionamento: trimOrUndefined(input.horario_funcionamento),
          observacoes: trimOrUndefined(input.observacoes),
          unidadePrincipal: input.unidade_principal ?? existing.unidadePrincipal,
          enderecoId,
          raioPontoMetros: input.raio_ponto_metros ?? existing.raioPontoMetros,
          accuracyMaxPontoMetros:
            input.accuracy_max_ponto_metros ?? existing.accuracyMaxPontoMetros,
          ipValidacaoPonto:
            trimOrUndefined(input.ip_validacao_ponto) ?? existing.ipValidacaoPonto,
          ipsPublicosPonto:
            trimOrUndefined(input.ips_publicos_ponto) ?? existing.ipsPublicosPonto,
          redesLocaisPonto:
            trimOrUndefined(input.redes_locais_ponto) ?? existing.redesLocaisPonto,
          modoValidacaoPonto:
            trimOrUndefined(input.modo_validacao_ponto) ?? existing.modoValidacaoPonto,
          pingTimeoutMs: input.ping_timeout_ms ?? existing.pingTimeoutMs,
          atualizadoEm: now
        }
      });

      const logomarca = trimOrUndefined(input.logomarca);
      const logomarcaRelatorio = trimOrUndefined(input.logomarca_relatorio);
      if (logomarca || logomarcaRelatorio) {
        await tx.imagemUnidade.upsert({
          where: { unidadeId: id },
          create: {
            unidadeId: id,
            logomarca,
            logomarcaRelatorio,
            criadoEm: now,
            atualizadoEm: now
          },
          update: {
            logomarca,
            logomarcaRelatorio,
            atualizadoEm: now
          }
        });
      } else {
        await tx.imagemUnidade.deleteMany({ where: { unidadeId: id } });
      }

      if (input.diretoria) {
        await tx.diretoriaUnidade.deleteMany({ where: { unidadeId: id } });
        const diretoria = normalizarDiretoria(input.diretoria);
        if (diretoria.length) {
          await tx.diretoriaUnidade.createMany({
            data: diretoria.map((membro) => ({
              unidadeId: id,
              nomeCompleto: membro.nomeCompleto,
              documento: membro.documento,
              funcao: membro.funcao,
              mandatoInicio: membro.mandatoInicio,
              mandatoFim: membro.mandatoFim,
              criadoEm: now,
              atualizadoEm: now
            }))
          });
        }
      }

      if (input.salas) {
        await tx.salaUnidade.deleteMany({ where: { unidadeId: id } });
        const salas = normalizarSalas(input.salas);
        if (salas.length) {
          await tx.salaUnidade.createMany({
            data: salas.map((nome) => ({
              unidadeId: id,
              nome,
              criadoEm: now,
              atualizadoEm: now
            }))
          });
        }
      }

      return this.buscarPorIdTransacao(tx, id, tenantId);
    });
  }

  async remover(id: bigint, tenantId?: string) {
    await this.buscarPorIdOuFalhar(id, tenantId);
    await prisma.unidadeAssistencial.delete({ where: { id } });
  }

  private async buscarPorIdTransacao(tx: TransactionClient, id: bigint, tenantId?: string) {
    if (tenantId) {
      const pertenceAoTenant = await this.unidadePertenceAoTenant(id, tenantId, tx);
      if (!pertenceAoTenant) {
        return null;
      }
    }

    return tx.unidadeAssistencial.findUnique({
      where: { id },
      include: unidadeInclude
    });
  }

  private async listarIdsPorTenant(filters: UnidadeAssistencialFilters, tenantId: string) {
    const params: unknown[] = [tenantId];
    const condicoes = ["ua.tenant_id::text = $1"];

    const nome = trimOrUndefined(filters.nome_fantasia);
    if (nome) {
      params.push(`%${nome}%`);
      condicoes.push(
        `(COALESCE(ua.nome_fantasia, '') ILIKE $${params.length} OR COALESCE(ua.razao_social, '') ILIKE $${params.length})`
      );
    }

    const cnpj = normalizeDigits(filters.cnpj);
    if (cnpj) {
      params.push(`%${cnpj}%`);
      condicoes.push(`COALESCE(ua.cnpj, '') LIKE $${params.length}`);
    }

    const cidade = trimOrUndefined(filters.cidade);
    if (cidade) {
      params.push(`%${cidade}%`);
      condicoes.push(`COALESCE(e.cidade, '') ILIKE $${params.length}`);
    }

    if (typeof filters.unidade_principal === "boolean") {
      params.push(filters.unidade_principal);
      condicoes.push(`ua.unidade_principal = $${params.length}`);
    }

    const rows = await prisma.$queryRawUnsafe<IdRow[]>(
      `
      SELECT ua.id
      FROM unidade_assistencial ua
      LEFT JOIN endereco e ON e.id = ua.endereco_id
      WHERE ${condicoes.join(" AND ")}
      ORDER BY ua.nome_fantasia ASC, ua.id ASC
      `,
      ...params
    );

    return rows.map((row) => row.id);
  }

  private async unidadePertenceAoTenant(
    id: bigint,
    tenantId: string,
    db: Pick<TransactionClient, "$queryRawUnsafe"> = prisma
  ) {
    const rows = await db.$queryRawUnsafe<IdRow[]>(
      `
      SELECT id
      FROM unidade_assistencial
      WHERE id = $1
        AND tenant_id::text = $2
      LIMIT 1
      `,
      id,
      tenantId
    );

    return !!rows[0];
  }
}
