import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { normalizeDigits, trimOrUndefined } from "../../../utils/string-utils.js";
import type { ContextoOrganizacional } from "../../auth/auth.types.js";
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
type SalaNormalizada = { id?: bigint; nome: string; capacidade_maxima: number; ativo: boolean };

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

function parseSalaId(id?: string | number) {
  if (id === undefined || id === null || id === "") return undefined;
  try {
    return BigInt(id);
  } catch {
    return undefined;
  }
}

function normalizarSalas(salas?: SalaUnidadeInput[]): SalaNormalizada[] {
  if (!salas?.length) return [];
  const nomesUnicos = new Set<string>();
  const idsUnicos = new Set<string>();
  const resultado: SalaNormalizada[] = [];
  for (const sala of salas) {
    const nome = trimOrUndefined(sala.nome);
    if (!nome) continue;
    const id = parseSalaId(sala.id);
    const chaveId = id?.toString();
    const chaveNome = nome.toLocaleLowerCase("pt-BR");
    if ((chaveId && idsUnicos.has(chaveId)) || nomesUnicos.has(chaveNome)) continue;
    if (chaveId) idsUnicos.add(chaveId);
    nomesUnicos.add(chaveNome);
    const capacidadeInformada = Number(sala.capacidade_maxima);
    const capacidade = Number.isInteger(capacidadeInformada) && capacidadeInformada >= 0 ? capacidadeInformada : 0;
    const ativo = sala.ativo !== false && String(sala.ativo).toLowerCase() !== "false";
    resultado.push({ id, nome, capacidade_maxima: capacidade, ativo });
  }
  return resultado;
}

export class UnidadeAssistencialRepository {
  async listar(filters: UnidadeAssistencialFilters, tenantId?: string, contexto?: ContextoOrganizacional) {
    await this.garantirColunaSalaAtivo();
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
      if (filters.tipo_unidade) {
        where.tipoUnidade = filters.tipo_unidade;
      }

      const unidades = await prisma.unidadeAssistencial.findMany({
        where,
        include: unidadeInclude,
        orderBy: [{ nomeFantasia: "asc" }]
      });
      return this.anexarStatusSalas(unidades);
    }

    const ids = await this.listarIdsPorTenant(filters, tenantId, contexto);
    if (!ids.length) return [];

    const unidades = await prisma.unidadeAssistencial.findMany({
      where: { id: { in: ids } },
      include: unidadeInclude,
      orderBy: [{ nomeFantasia: "asc" }]
    });

    const ordem = new Map(ids.map((id, indice) => [id.toString(), indice]));
    const ordenadas = unidades.sort((a, b) => (ordem.get(a.id.toString()) ?? 0) - (ordem.get(b.id.toString()) ?? 0));
    return this.anexarStatusSalas(ordenadas);
  }

  async buscarPorId(id: bigint) {
    await this.garantirColunaSalaAtivo();
    const unidade = await prisma.unidadeAssistencial.findUnique({
      where: { id },
      include: unidadeInclude
    });
    return unidade ? this.anexarStatusSalas(unidade) : null;
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

  async buscarPorIdOuFalhar(id: bigint, tenantId?: string, contexto?: ContextoOrganizacional) {
    const unidade = await this.buscarPorIdDoTenant(id, tenantId);
    if (!unidade || (tenantId && contexto && !(await this.unidadePermitidaNoContexto(id, tenantId, contexto)))) {
      throw new AppError("Unidade assistencial nao encontrada.", 404);
    }
    return unidade;
  }

  async buscarAtual(tenantId?: string, contexto?: ContextoOrganizacional) {
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

    if (contexto && !(await this.unidadePermitidaNoContexto(unidadeId, tenantId, contexto))) return null;

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
          tipoUnidade: input.tipo_unidade ?? "ASSISTENCIAL",
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
        await this.garantirColunaSalaAtivo(tx);
        for (const sala of salas) {
          await this.criarSala(tx, unidade.id, sala, now);
        }
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
          tipoUnidade: input.tipo_unidade ?? existing.tipoUnidade,
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
        await this.garantirColunaSalaAtivo(tx);
        const salas = normalizarSalas(input.salas);
        const idsRecebidos = salas.map((sala) => sala.id).filter((salaId): salaId is bigint => !!salaId);
        const salasExistentes = existing.salas ?? [];
        const salasRemovidas = salasExistentes.filter(
          (sala) => !idsRecebidos.some((salaId) => salaId === sala.id)
        );

        for (const sala of salasRemovidas) {
          const possuiVinculo = await this.salaPossuiVinculo(sala.id, tx);
          if (possuiVinculo) {
            throw new AppError(
              `A sala "${sala.nome}" possui vínculo de uso no sistema. Não é possível remover; inative a sala.`,
              409
            );
          }
          await tx.salaUnidade.delete({ where: { id: sala.id } });
        }

        for (const sala of salas) {
          if (sala.id) {
            await this.atualizarSala(tx, id, sala, now);
          } else {
            await this.criarSala(tx, id, sala, now);
          }
        }
      }

      return this.buscarPorIdTransacao(tx, id, tenantId);
    });
  }

  async remover(id: bigint, tenantId?: string) {
    await this.buscarPorIdOuFalhar(id, tenantId);
    await prisma.unidadeAssistencial.delete({ where: { id } });
  }

  async verificarVinculosSala(salaId: bigint, tenantId?: string) {
    await this.garantirColunaSalaAtivo();
    const rows = await prisma.$queryRawUnsafe<Array<{ id: bigint }>>(
      `
      SELECT s.id
      FROM salas_unidade s
      INNER JOIN unidade_assistencial ua ON ua.id = s.unidade_id
      WHERE s.id = $1
        ${tenantId ? "AND ua.tenant_id::text = $2" : ""}
      LIMIT 1
      `,
      ...(tenantId ? [salaId, tenantId] : [salaId])
    );

    if (!rows[0]) {
      throw new AppError("Sala de atendimento nao encontrada.", 404);
    }

    const total = await this.contarVinculosSala(salaId);
    return { total, possuiVinculo: total > 0 };
  }

  private async buscarPorIdTransacao(tx: TransactionClient, id: bigint, tenantId?: string) {
    if (tenantId) {
      const pertenceAoTenant = await this.unidadePertenceAoTenant(id, tenantId, tx);
      if (!pertenceAoTenant) {
        return null;
      }
    }

    const unidade = await tx.unidadeAssistencial.findUnique({
      where: { id },
      include: unidadeInclude
    });
    return unidade ? this.anexarStatusSalas(unidade, tx) : null;
  }

  private async garantirColunaSalaAtivo(db: Pick<TransactionClient, "$executeRawUnsafe"> = prisma) {
    await db.$executeRawUnsafe(
      "ALTER TABLE salas_unidade ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE"
    );
    await db.$executeRawUnsafe(
      "ALTER TABLE salas_unidade ADD COLUMN IF NOT EXISTS capacidade_maxima INTEGER NOT NULL DEFAULT 0"
    );
  }

  private async criarSala(tx: TransactionClient, unidadeId: bigint, sala: SalaNormalizada, now: Date) {
    await tx.$executeRawUnsafe(
      `
      INSERT INTO salas_unidade (unidade_id, nome, capacidade_maxima, ativo, criado_em, atualizado_em)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      unidadeId,
      sala.nome,
      sala.capacidade_maxima,
      sala.ativo,
      now,
      now
    );
  }

  private async atualizarSala(tx: TransactionClient, unidadeId: bigint, sala: SalaNormalizada, now: Date) {
    await tx.$executeRawUnsafe(
      `
      UPDATE salas_unidade
      SET nome = $3,
          capacidade_maxima = $4,
          ativo = $5,
          atualizado_em = $6
      WHERE id = $1
        AND unidade_id = $2
      `,
      sala.id,
      unidadeId,
      sala.nome,
      sala.capacidade_maxima,
      sala.ativo,
      now
    );
  }

  private async anexarStatusSalas<T extends { salas?: Array<{ id: bigint }> }>(
    entrada: T,
    db?: Pick<TransactionClient, "$queryRawUnsafe">
  ): Promise<T>;
  private async anexarStatusSalas<T extends { salas?: Array<{ id: bigint }> }>(
    entrada: T[],
    db?: Pick<TransactionClient, "$queryRawUnsafe">
  ): Promise<T[]>;
  private async anexarStatusSalas<T extends { salas?: Array<{ id: bigint }> }>(
    entrada: T | T[],
    db: Pick<TransactionClient, "$queryRawUnsafe"> = prisma
  ) {
    const unidades = Array.isArray(entrada) ? entrada : [entrada];
    const ids = unidades.flatMap((unidade) => unidade.salas?.map((sala) => sala.id) ?? []);
    if (!ids.length) return entrada;

    const rows = await db.$queryRawUnsafe<Array<{ id: bigint; ativo: boolean }>>(
      `
      SELECT id, COALESCE(ativo, TRUE) AS ativo
      FROM salas_unidade
      WHERE id = ANY($1::bigint[])
      `,
      ids.map((id) => id.toString())
    );
    const statusPorId = new Map(rows.map((row) => [row.id.toString(), row.ativo]));

    for (const unidade of unidades) {
      for (const sala of unidade.salas ?? []) {
        (sala as any).ativo = statusPorId.get(sala.id.toString()) ?? true;
      }
    }

    return entrada;
  }

  private async salaPossuiVinculo(salaId: bigint, db: Pick<TransactionClient, "$queryRawUnsafe"> = prisma) {
    return (await this.contarVinculosSala(salaId, db)) > 0;
  }

  private async contarVinculosSala(salaId: bigint, db: Pick<TransactionClient, "$queryRawUnsafe"> = prisma) {
    const tabelaRows = await db.$queryRawUnsafe<Array<{ existe: string | null }>>(
      "SELECT to_regclass('public.cursos_atendimentos')::text AS existe"
    );
    if (!tabelaRows[0]?.existe) return 0;

    const rows = await db.$queryRawUnsafe<Array<{ total: bigint }>>(
      `
      SELECT COUNT(*)::bigint AS total
      FROM cursos_atendimentos
      WHERE sala_id = $1
      `,
      salaId
    );

    return Number(rows[0]?.total ?? 0);
  }

  private async listarIdsPorTenant(filters: UnidadeAssistencialFilters, tenantId: string, contexto?: ContextoOrganizacional) {
    const params: unknown[] = [tenantId];
    const condicoes = ["ua.tenant_id::text = $1"];

    if (contexto?.unidade_id) {
      params.push(contexto.unidade_id);
      condicoes.push(`EXISTS (SELECT 1 FROM unidades_organizacionais uo WHERE uo.id = $${params.length}::bigint AND uo.unidade_assistencial_id = ua.id)`);
    } else if (contexto?.projeto_id) {
      params.push(contexto.projeto_id);
      condicoes.push(`EXISTS (SELECT 1 FROM projetos p JOIN unidades_organizacionais uo ON uo.id = p.unidade_organizacional_id WHERE p.id = $${params.length}::bigint AND uo.unidade_assistencial_id = ua.id)`);
    } else if (contexto?.entidade_juridica_id) {
      params.push(contexto.entidade_juridica_id);
      condicoes.push(`ua.entidade_juridica_id = $${params.length}::bigint`);
    }

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

    if (filters.tipo_unidade) {
      params.push(filters.tipo_unidade);
      condicoes.push(`ua.tipo_unidade = $${params.length}`);
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

  private async unidadePermitidaNoContexto(id: bigint, tenantId: string, contexto: ContextoOrganizacional) {
    if (contexto.unidade_id) {
      const rows = await prisma.$queryRawUnsafe<IdRow[]>(
        `SELECT ua.id FROM unidade_assistencial ua JOIN unidades_organizacionais uo ON uo.unidade_assistencial_id = ua.id
         WHERE ua.id = $1 AND ua.tenant_id::text = $2 AND uo.id = $3::bigint LIMIT 1`, id, tenantId, contexto.unidade_id
      );
      return !!rows[0];
    }
    if (contexto.projeto_id) {
      const rows = await prisma.$queryRawUnsafe<IdRow[]>(
        `SELECT ua.id FROM unidade_assistencial ua JOIN unidades_organizacionais uo ON uo.unidade_assistencial_id = ua.id
         JOIN projetos p ON p.unidade_organizacional_id = uo.id
         WHERE ua.id = $1 AND ua.tenant_id::text = $2 AND p.id = $3::bigint LIMIT 1`, id, tenantId, contexto.projeto_id
      );
      return !!rows[0];
    }
    if (contexto.entidade_juridica_id) {
      const rows = await prisma.$queryRawUnsafe<IdRow[]>(
        `SELECT id FROM unidade_assistencial WHERE id = $1 AND tenant_id::text = $2 AND entidade_juridica_id = $3::bigint LIMIT 1`, id, tenantId, contexto.entidade_juridica_id
      );
      return !!rows[0];
    }
    return true;
  }
}
