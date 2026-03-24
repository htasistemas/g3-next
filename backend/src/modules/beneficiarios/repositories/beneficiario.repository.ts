import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import {
  joinSemicolonList,
  normalizeDigits,
  toOptionalDate,
  trimOrUndefined
} from "../../../utils/string-utils.js";
import type {
  BeneficiarioAddressSuggestionFilters,
  BeneficiarioFilters,
  BeneficiarioInput
} from "../beneficiario.types.js";

function ehConteudoInlineArquivo(valor?: string | null) {
  const texto = trimOrUndefined(valor);
  if (!texto) return false;
  return texto.startsWith("data:") || /^[a-z0-9+/=\r\n]+$/i.test(texto);
}

const beneficiarioContatoSelect = {
  telefonePrincipal: true,
  telefonePrincipalWhatsapp: true,
  telefoneSecundario: true,
  telefoneRecadoNome: true,
  telefoneRecadoNumero: true,
  email: true,
  permiteContatoTel: true,
  permiteContatoWhatsapp: true,
  permiteContatoSms: true,
  permiteContatoEmail: true,
  horarioPreferencial: true
} satisfies Prisma.ContatoBeneficiarioSelect;

const beneficiarioInclude = {
  endereco: true,
  contatos: {
    select: beneficiarioContatoSelect,
    orderBy: { atualizadoEm: "desc" },
    take: 1
  },
  documentos: { orderBy: { atualizadoEm: "desc" } },
  situacoesSociais: { orderBy: { atualizadoEm: "desc" }, take: 1 },
  escolaridades: { orderBy: { atualizadoEm: "desc" }, take: 1 },
  saudes: { orderBy: { atualizadoEm: "desc" }, take: 1 },
  beneficios: { orderBy: { atualizadoEm: "desc" }, take: 1 },
  observacoes: { orderBy: { atualizadoEm: "desc" }, take: 1 }
} satisfies Prisma.CadastroBeneficiarioInclude;

type TransactionClient = Prisma.TransactionClient;
type SuggestionRow = {
  zona: string | null;
  subzona: string | null;
  total: number;
};
type DuplicateBeneficiarioRow = {
  id: bigint;
  codigo: string | null;
  nome_completo: string;
  cpf: string | null;
};
const sqlCidadeNormalizada = Prisma.raw(
  "translate(lower(trim(coalesce(cidade, ''))), 'áàãâäéèêëíìîïóòõôöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')"
);
const sqlBairroNormalizado = Prisma.raw(
  "translate(lower(trim(coalesce(bairro, ''))), 'áàãâäéèêëíìîïóòõôöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')"
);

const caracteresAcentuadosNormalizacao =
  "\u00E1\u00E0\u00E3\u00E2\u00E4\u00E9\u00E8\u00EA\u00EB\u00ED\u00EC\u00EE\u00EF\u00F3\u00F2\u00F5\u00F4\u00F6\u00FA\u00F9\u00FB\u00FC\u00E7";
const sqlCidadeNormalizadaBusca = Prisma.raw(
  `translate(lower(trim(coalesce(cidade, ''))), '${caracteresAcentuadosNormalizacao}', 'aaaaaeeeeiiiiooooouuuuc')`
);
const sqlBairroNormalizadoBusca = Prisma.raw(
  `translate(lower(trim(coalesce(bairro, ''))), '${caracteresAcentuadosNormalizacao}', 'aaaaaeeeeiiiiooooouuuuc')`
);
const sqlNomeCompletoNormalizadoBusca = Prisma.raw(
  `translate(lower(trim(coalesce(nome_completo, ''))), '${caracteresAcentuadosNormalizacao}', 'aaaaaeeeeiiiiooooouuuuc')`
);
const sqlNomeMaeNormalizadoBusca = Prisma.raw(
  `translate(lower(trim(coalesce(nome_mae, ''))), '${caracteresAcentuadosNormalizacao}', 'aaaaaeeeeiiiiooooouuuuc')`
);

function hasAnyAddressData(input: BeneficiarioInput): boolean {
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

function parseDecimal(value?: string): Prisma.Decimal | undefined {
  if (!value) return undefined;
  try {
    return new Prisma.Decimal(value);
  } catch {
    return undefined;
  }
}

function normalizarTextoBusca(value?: string | null) {
  const texto = trimOrUndefined(value);
  if (!texto) return undefined;
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function buildCodigoVariants(value?: string): string[] {
  if (!value) return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  const numeric = trimmed.replace(/\D/g, "");
  const variants = new Set<string>([trimmed]);
  if (numeric) {
    variants.add(numeric);
    variants.add(String(Number(numeric)));
    variants.add(numeric.padStart(4, "0"));
  }
  variants.delete("NaN");
  return [...variants].filter(Boolean);
}

async function obterProximoCodigoTransacao(tx: TransactionClient): Promise<string> {
  const result = await tx.$queryRaw<{ max_code: number | null }[]>`
    SELECT MAX(CAST(codigo AS INTEGER)) AS max_code
    FROM cadastro_beneficiario
    WHERE codigo IS NOT NULL
      AND codigo ~ '^[0-9]+$'
  `;
  const maxCode = result[0]?.max_code ?? 0;
  return String(maxCode + 1).padStart(4, "0");
}

export class BeneficiarioRepository {
  async listar(filters: BeneficiarioFilters) {
    const where: Prisma.CadastroBeneficiarioWhereInput = {};
    const andFilters: Prisma.CadastroBeneficiarioWhereInput[] = [];

    const nome = trimOrUndefined(filters.nome);
    if (nome) {
      where.OR = [
        { nomeCompleto: { contains: nome, mode: "insensitive" } },
        { nomeSocial: { contains: nome, mode: "insensitive" } },
        { apelido: { contains: nome, mode: "insensitive" } }
      ];
    }

    const status = trimOrUndefined(filters.status);
    if (status) {
      where.status = status;
    }

    const codigoVariants = buildCodigoVariants(filters.codigo);
    if (codigoVariants.length) {
      andFilters.push({ codigo: { in: codigoVariants } });
    }

    const cpf = normalizeDigits(filters.cpf);
    if (cpf) {
      andFilters.push({
        documentos: {
          some: {
            tipoDocumento: "CPF",
            numeroDocumento: { contains: cpf }
          }
        }
      });
    }

    const nis = normalizeDigits(filters.nis);
    if (nis) {
      andFilters.push({
        documentos: {
          some: {
            tipoDocumento: "NIS",
            numeroDocumento: { contains: nis }
          }
        }
      });
    }

    const dataNascimento = toOptionalDate(filters.data_nascimento);
    if (dataNascimento) {
      andFilters.push({ dataNascimento });
    }

    if (andFilters.length) {
      where.AND = andFilters;
    }

    return prisma.cadastroBeneficiario.findMany({
      where,
      include: beneficiarioInclude,
      orderBy: [{ nomeCompleto: "asc" }]
    });
  }

  async buscarPorId(id: bigint) {
    return prisma.cadastroBeneficiario.findUnique({
      where: { id },
      include: beneficiarioInclude
    });
  }

  async buscarPorIdOuFalhar(id: bigint) {
    const beneficiario = await this.buscarPorId(id);
    if (!beneficiario) {
      throw new AppError("Beneficiario nao encontrado.", 404);
    }
    return beneficiario;
  }

  async obterProximoCodigo() {
    return obterProximoCodigoTransacao(prisma as unknown as TransactionClient);
  }

  async buscarDuplicidadeCadastro(input: BeneficiarioInput, idIgnorado?: bigint) {
    const nomeCompleto = normalizarTextoBusca(input.nome_completo);
    const nomeMae = normalizarTextoBusca(input.nome_mae);
    const dataNascimento = toOptionalDate(input.data_nascimento);
    const cpf = normalizeDigits(input.cpf);

    if (!nomeCompleto || !nomeMae || !dataNascimento) {
      return null;
    }

    const filtroIdIgnorado =
      typeof idIgnorado === "bigint" ? Prisma.sql`AND b.id <> ${idIgnorado}` : Prisma.empty;

    const duplicadosPorDados = await prisma.$queryRaw<DuplicateBeneficiarioRow[]>(Prisma.sql`
      SELECT
        b.id,
        b.codigo,
        b.nome_completo,
        (
          SELECT regexp_replace(coalesce(d.numero_documento, ''), '[^0-9]', '', 'g')
          FROM documentos d
          WHERE d.beneficiario_id = b.id
            AND upper(coalesce(d.tipo_documento, '')) = 'CPF'
          ORDER BY d.id DESC
          LIMIT 1
        ) AS cpf
      FROM cadastro_beneficiario b
      WHERE b.data_nascimento = ${dataNascimento}
        AND ${sqlNomeCompletoNormalizadoBusca} = ${nomeCompleto}
        AND ${sqlNomeMaeNormalizadoBusca} = ${nomeMae}
        ${filtroIdIgnorado}
      LIMIT 1
    `);

    if (duplicadosPorDados[0]) {
      return duplicadosPorDados[0];
    }

    if (!cpf) {
      return null;
    }

    const duplicadosPorCpf = await prisma.$queryRaw<DuplicateBeneficiarioRow[]>(Prisma.sql`
      SELECT
        b.id,
        b.codigo,
        b.nome_completo,
        ${cpf} AS cpf
      FROM cadastro_beneficiario b
      WHERE EXISTS (
        SELECT 1
        FROM documentos d
        WHERE d.beneficiario_id = b.id
          AND upper(coalesce(d.tipo_documento, '')) = 'CPF'
          AND regexp_replace(coalesce(d.numero_documento, ''), '[^0-9]', '', 'g') = ${cpf}
      )
      ${filtroIdIgnorado}
      LIMIT 1
    `);

    return duplicadosPorCpf[0] ?? null;
  }

  async buscarSugestaoEndereco(filters: BeneficiarioAddressSuggestionFilters) {
    const municipio = normalizarTextoBusca(filters.municipio);
    if (!municipio) {
      return null;
    }

    const bairro = normalizarTextoBusca(filters.bairro);

    const buscarCombinacao = async (filtrarPorBairro: boolean) => {
      const rows = await prisma.$queryRaw<SuggestionRow[]>(Prisma.sql`
        SELECT
          NULLIF(TRIM(zona), '') AS zona,
          NULLIF(TRIM(subzona), '') AS subzona,
          COUNT(*)::integer AS total
        FROM endereco
        WHERE ${sqlCidadeNormalizadaBusca} = ${municipio}
          AND (
            COALESCE(TRIM(zona), '') <> ''
            OR COALESCE(TRIM(subzona), '') <> ''
          )
          ${
            filtrarPorBairro && bairro
              ? Prisma.sql`AND ${sqlBairroNormalizadoBusca} = ${bairro}`
              : Prisma.empty
          }
        GROUP BY 1, 2
        ORDER BY COUNT(*) DESC, zona NULLS LAST, subzona NULLS LAST
        LIMIT 1
      `);

      const sugestao = rows[0];
      if (!sugestao?.zona && !sugestao?.subzona) {
        return null;
      }

      return {
        zona: sugestao.zona ?? undefined,
        subzona: sugestao.subzona ?? undefined
      };
    };

    return (await buscarCombinacao(true)) ?? (await buscarCombinacao(false));
  }

  async criar(input: BeneficiarioInput) {
    return prisma.$transaction(async (tx) => {
      const now = new Date();
      let enderecoId: bigint | undefined;

      if (hasAnyAddressData(input)) {
        const endereco = await tx.endereco.create({
          data: {
            cep: trimOrUndefined(input.cep),
            logradouro: trimOrUndefined(input.logradouro),
            numero: trimOrUndefined(input.numero),
            complemento: trimOrUndefined(input.complemento),
            bairro: trimOrUndefined(input.bairro),
            pontoReferencia: trimOrUndefined(input.ponto_referencia),
            cidade: trimOrUndefined(input.municipio),
            estado: trimOrUndefined(input.uf),
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

      const codigo = trimOrUndefined(input.codigo) ?? (await obterProximoCodigoTransacao(tx));
      const beneficiario = await tx.cadastroBeneficiario.create({
        data: {
          codigo,
          nomeCompleto: input.nome_completo,
          nomeSocial: trimOrUndefined(input.nome_social),
          apelido: trimOrUndefined(input.apelido),
          dataNascimento: toOptionalDate(input.data_nascimento)!,
          foto3x4: trimOrUndefined(input.foto_3x4),
          sexoBiologico: trimOrUndefined(input.sexo_biologico),
          identidadeGenero: trimOrUndefined(input.identidade_genero),
          corRaca: trimOrUndefined(input.cor_raca),
          estadoCivil: trimOrUndefined(input.estado_civil),
          nacionalidade: trimOrUndefined(input.nacionalidade),
          naturalidadeCidade: trimOrUndefined(input.naturalidade_cidade),
          naturalidadeUf: trimOrUndefined(input.naturalidade_uf),
          nomeMae: input.nome_mae,
          nomePai: trimOrUndefined(input.nome_pai),
          status: input.status,
          optaReceberCestaBasica: input.opta_receber_cesta_basica,
          aptoReceberCestaBasica: input.apto_receber_cesta_basica,
          enderecoId,
          criadoEm: now,
          atualizadoEm: now
        }
      });

      await this.recriarDadosRelacionados(tx, beneficiario.id, input, now);
      return this.buscarPorIdTransacao(tx, beneficiario.id);
    });
  }

  async atualizar(id: bigint, input: BeneficiarioInput) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.cadastroBeneficiario.findUnique({
        where: { id }
      });

      if (!existing) {
        throw new AppError("Beneficiario nao encontrado.", 404);
      }

      const now = new Date();
      let enderecoId = existing.enderecoId ?? undefined;
      const hasAddress = hasAnyAddressData(input);

      if (hasAddress) {
        if (existing.enderecoId) {
          await tx.endereco.update({
            where: { id: existing.enderecoId },
            data: {
              cep: trimOrUndefined(input.cep),
              logradouro: trimOrUndefined(input.logradouro),
              numero: trimOrUndefined(input.numero),
              complemento: trimOrUndefined(input.complemento),
              bairro: trimOrUndefined(input.bairro),
              pontoReferencia: trimOrUndefined(input.ponto_referencia),
              cidade: trimOrUndefined(input.municipio),
              estado: trimOrUndefined(input.uf),
              zona: trimOrUndefined(input.zona),
              subzona: trimOrUndefined(input.subzona),
              latitude: parseDecimal(input.latitude),
              longitude: parseDecimal(input.longitude),
              atualizadoEm: now
            }
          });
        } else {
          const created = await tx.endereco.create({
            data: {
              cep: trimOrUndefined(input.cep),
              logradouro: trimOrUndefined(input.logradouro),
              numero: trimOrUndefined(input.numero),
              complemento: trimOrUndefined(input.complemento),
              bairro: trimOrUndefined(input.bairro),
              pontoReferencia: trimOrUndefined(input.ponto_referencia),
              cidade: trimOrUndefined(input.municipio),
              estado: trimOrUndefined(input.uf),
              zona: trimOrUndefined(input.zona),
              subzona: trimOrUndefined(input.subzona),
              latitude: parseDecimal(input.latitude),
              longitude: parseDecimal(input.longitude),
              criadoEm: now,
              atualizadoEm: now
            }
          });
          enderecoId = created.id;
        }
      } else {
        enderecoId = undefined;
      }

      await tx.cadastroBeneficiario.update({
        where: { id },
        data: {
          codigo: trimOrUndefined(input.codigo) ?? existing.codigo,
          nomeCompleto: input.nome_completo,
          nomeSocial: trimOrUndefined(input.nome_social),
          apelido: trimOrUndefined(input.apelido),
          dataNascimento: toOptionalDate(input.data_nascimento)!,
          foto3x4: trimOrUndefined(input.foto_3x4),
          sexoBiologico: trimOrUndefined(input.sexo_biologico),
          identidadeGenero: trimOrUndefined(input.identidade_genero),
          corRaca: trimOrUndefined(input.cor_raca),
          estadoCivil: trimOrUndefined(input.estado_civil),
          nacionalidade: trimOrUndefined(input.nacionalidade),
          naturalidadeCidade: trimOrUndefined(input.naturalidade_cidade),
          naturalidadeUf: trimOrUndefined(input.naturalidade_uf),
          nomeMae: input.nome_mae,
          nomePai: trimOrUndefined(input.nome_pai),
          status: input.status,
          optaReceberCestaBasica: input.opta_receber_cesta_basica,
          aptoReceberCestaBasica: input.apto_receber_cesta_basica,
          enderecoId,
          atualizadoEm: now
        }
      });

      await this.limparDadosRelacionados(tx, id);
      await this.recriarDadosRelacionados(tx, id, input, now);
      return this.buscarPorIdTransacao(tx, id);
    });
  }

  async remover(id: bigint) {
    await this.buscarPorIdOuFalhar(id);
    await prisma.cadastroBeneficiario.delete({ where: { id } });
  }

  private async buscarPorIdTransacao(tx: TransactionClient, id: bigint) {
    const beneficiario = await tx.cadastroBeneficiario.findUnique({
      where: { id },
      include: beneficiarioInclude
    });
    if (!beneficiario) {
      throw new AppError("Beneficiario nao encontrado.", 404);
    }
    return beneficiario;
  }

  private async limparDadosRelacionados(tx: TransactionClient, id: bigint) {
    await tx.contatoBeneficiario.deleteMany({ where: { beneficiarioId: id } });
    await tx.documento.deleteMany({ where: { beneficiarioId: id } });
    await tx.situacaoSocial.deleteMany({ where: { beneficiarioId: id } });
    await tx.escolaridadeBeneficiario.deleteMany({ where: { beneficiarioId: id } });
    await tx.saudeBeneficiario.deleteMany({ where: { beneficiarioId: id } });
    await tx.beneficiosBeneficiario.deleteMany({ where: { beneficiarioId: id } });
    await tx.observacoesBeneficiario.deleteMany({ where: { beneficiarioId: id } });
  }

  private async recriarDadosRelacionados(
    tx: TransactionClient,
    beneficiarioId: bigint,
    input: BeneficiarioInput,
    now: Date
  ) {
    await tx.contatoBeneficiario.create({
      data: {
        beneficiarioId,
        telefonePrincipal: normalizeDigits(input.telefone_principal),
        telefonePrincipalWhatsapp: input.telefone_principal_whatsapp ?? false,
        telefoneSecundario: normalizeDigits(input.telefone_secundario),
        telefoneRecadoNome: trimOrUndefined(input.telefone_recado_nome),
        telefoneRecadoNumero: normalizeDigits(input.telefone_recado_numero),
        email: trimOrUndefined(input.email),
        permiteContatoTel: input.permite_contato_tel ?? true,
        permiteContatoWhatsapp: input.permite_contato_whatsapp ?? true,
        permiteContatoSms: input.permite_contato_sms ?? false,
        permiteContatoEmail: input.permite_contato_email ?? false,
        horarioPreferencial: trimOrUndefined(input.horario_preferencial_contato),
        criadoEm: now,
        atualizadoEm: now
      }
    });

    await tx.situacaoSocial.create({
      data: {
        beneficiarioId,
        moraComFamilia: input.mora_com_familia ?? false,
        responsavelLegal: input.responsavel_legal ?? false,
        vinculoFamiliar: trimOrUndefined(input.vinculo_familiar),
        situacaoVulnerabilidade: trimOrUndefined(input.situacao_vulnerabilidade),
        composicaoFamiliar: trimOrUndefined(input.composicao_familiar),
        criancasAdolescentes: input.criancas_adolescentes,
        idosos: input.idosos,
        acompanhamentoCras: input.acompanhamento_cras ?? false,
        acompanhamentoSaude: input.acompanhamento_saude ?? false,
        participaComunidade: trimOrUndefined(input.participa_comunidade),
        redeApoio: trimOrUndefined(input.rede_apoio),
        criadoEm: now,
        atualizadoEm: now
      }
    });

    await tx.escolaridadeBeneficiario.create({
      data: {
        beneficiarioId,
        sabeLerEscrever: input.sabe_ler_escrever ?? false,
        nivelEscolaridade: trimOrUndefined(input.nivel_escolaridade),
        estudaAtualmente: input.estuda_atualmente ?? false,
        ocupacao: trimOrUndefined(input.ocupacao),
        situacaoTrabalho: trimOrUndefined(input.situacao_trabalho),
        localTrabalho: trimOrUndefined(input.local_trabalho),
        rendaMensal: trimOrUndefined(input.renda_mensal),
        fonteRenda: trimOrUndefined(input.fonte_renda),
        criadoEm: now,
        atualizadoEm: now
      }
    });

    await tx.saudeBeneficiario.create({
      data: {
        beneficiarioId,
        possuiDeficiencia: input.possui_deficiencia ?? false,
        tipoDeficiencia: trimOrUndefined(input.tipo_deficiencia),
        cidPrincipal: trimOrUndefined(input.cid_principal),
        usaMedicacaoContinua: input.usa_medicacao_continua ?? false,
        descricaoMedicacao: trimOrUndefined(input.descricao_medicacao),
        servicoSaudeReferencia: trimOrUndefined(input.servico_saude_referencia),
        criadoEm: now,
        atualizadoEm: now
      }
    });

    await tx.beneficiosBeneficiario.create({
      data: {
        beneficiarioId,
        recebeBeneficio: input.recebe_beneficio ?? false,
        beneficiosDescricao: trimOrUndefined(input.beneficios_descricao),
        valorTotalBeneficios: trimOrUndefined(input.valor_total_beneficios),
        beneficiosRecebidos: joinSemicolonList(input.beneficios_recebidos),
        criadoEm: now,
        atualizadoEm: now
      }
    });

    await tx.observacoesBeneficiario.create({
      data: {
        beneficiarioId,
        aceiteLgpd: input.aceite_lgpd,
        dataAceiteLgpd: toOptionalDate(input.data_aceite_lgpd),
        observacoes: trimOrUndefined(input.observacoes),
        criadoEm: now,
        atualizadoEm: now
      }
    });

    const documentos = this.montarDocumentos(beneficiarioId, input, now);
    if (documentos.length) {
      try {
        await tx.documento.createMany({ data: documentos });
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }

        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === "P2000" || error.code === "P2002" || error.code === "P2003")
        ) {
          throw new AppError(
            "Nao foi possivel salvar os documentos do beneficiario. Revise os anexos informados e tente novamente.",
            422
          );
        }

        throw new AppError(
          "Nao foi possivel salvar os documentos do beneficiario. Revise os anexos informados e tente novamente.",
          500
        );
      }
    }
  }

  private montarDocumentos(beneficiarioId: bigint, input: BeneficiarioInput, now: Date) {
    const documentos: Prisma.DocumentoCreateManyInput[] = [];

    const adicionarDocumentoNumerico = (
      tipoDocumento: string,
      numeroDocumento?: string | null,
      extra?: Partial<Prisma.DocumentoCreateManyInput>
    ) => {
      const numero = normalizeDigits(numeroDocumento);
      if (!numero && !extra?.nomeDocumento) return;
      documentos.push({
        beneficiarioId,
        tipoDocumento,
        numeroDocumento: numero,
        ...extra,
        criadoEm: now,
        atualizadoEm: now
      });
    };

    adicionarDocumentoNumerico("CPF", input.cpf);
    adicionarDocumentoNumerico("NIS", input.nis);
    adicionarDocumentoNumerico("TITULO_ELEITOR", input.titulo_eleitor);
    adicionarDocumentoNumerico("CNH", input.cnh);
    adicionarDocumentoNumerico("CARTAO_SUS", input.cartao_sus);
    adicionarDocumentoNumerico("RG", input.rg_numero, {
      orgaoEmissor: trimOrUndefined(input.rg_orgao_emissor),
      ufEmissor: trimOrUndefined(input.rg_uf),
      dataEmissao: toOptionalDate(input.rg_data_emissao)
    });

    if (
      trimOrUndefined(input.certidao_tipo) ||
      trimOrUndefined(input.certidao_livro) ||
      trimOrUndefined(input.certidao_folha) ||
      trimOrUndefined(input.certidao_termo) ||
      trimOrUndefined(input.certidao_cartorio) ||
      trimOrUndefined(input.certidao_municipio) ||
      trimOrUndefined(input.certidao_uf)
    ) {
      documentos.push({
        beneficiarioId,
        tipoDocumento: "CERTIDAO",
        nomeDocumento: trimOrUndefined(input.certidao_tipo),
        livro: trimOrUndefined(input.certidao_livro),
        folha: trimOrUndefined(input.certidao_folha),
        termo: trimOrUndefined(input.certidao_termo),
        cartorio: trimOrUndefined(input.certidao_cartorio),
        municipio: trimOrUndefined(input.certidao_municipio),
        uf: trimOrUndefined(input.certidao_uf),
        criadoEm: now,
        atualizadoEm: now
      });
    }

    for (const doc of input.documentos_obrigatorios ?? []) {
      const nomeDocumento = trimOrUndefined(doc.nome);
      const numeroDocumento = trimOrUndefined(doc.numeroDocumento);
      const contentType = trimOrUndefined(doc.contentType);
      const caminhoArquivoInformado = trimOrUndefined(doc.caminhoArquivo);
      const conteudoInformado = trimOrUndefined(doc.conteudo);
      const caminhoArquivo = caminhoArquivoInformado;
      const nomeArquivo = trimOrUndefined(doc.nomeArquivo);
      const possuiConteudo = !!(numeroDocumento || nomeArquivo || caminhoArquivo || doc.ignorado);

      if (!nomeDocumento || !possuiConteudo) {
        continue;
      }

      if (ehConteudoInlineArquivo(caminhoArquivoInformado) || ehConteudoInlineArquivo(conteudoInformado)) {
        throw new AppError(
          `O documento ${nomeDocumento} nao foi processado corretamente. Anexe o arquivo novamente antes de salvar.`,
          400
        );
      }

      documentos.push({
        beneficiarioId,
        tipoDocumento: "ANEXO",
        nomeDocumento,
        numeroDocumento,
        nomeArquivo,
        caminhoArquivo,
        contentType,
        obrigatorio: doc.ignorado ? false : (doc.obrigatorio ?? true),
        criadoEm: now,
        atualizadoEm: now
      });
    }

    return documentos;
  }
}
