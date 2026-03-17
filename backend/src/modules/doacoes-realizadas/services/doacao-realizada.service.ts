import bcrypt from "bcryptjs";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoDoacaoRealizada } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { toStringId } from "../../../utils/string-utils.js";
import { ParametrosSistemaService } from "../../configuracoes-gerais/services/parametros-sistema.service.js";
import {
  doacaoRealizadaFiltersSchema,
  doacaoRealizadaInputSchema
} from "../doacao-realizada.schema.js";
import { mapDoacaoRealizadaToResponse } from "../doacao-realizada.mapper.js";
import { DoacaoRealizadaRepository } from "../repositories/doacao-realizada.repository.js";
import type {
  DoacaoRealizadaInput,
  DoacaoRealizadaItemInput
} from "../doacao-realizada.types.js";

type AtorRaw = {
  id?: string;
  nomeUsuario?: string;
  permissoes?: string[];
};

type AtorDoacaoRealizada = {
  id?: bigint;
  nome_usuario: string;
  permissoes: string[];
};

type ItemBloqueadoCarencia = {
  item_id: number;
  codigo_item?: string;
  descricao_item?: string;
  ultima_entrega_em: string;
};

function parseDateOnly(value: Date | string) {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }

  const texto = String(value).trim();
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }

  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) {
    throw new AppError("Data de doacao invalida.", 400);
  }

  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
}

function formatDateOnly(value: Date | string) {
  return parseDateOnly(value).toISOString().slice(0, 10);
}

function formatDateWithHyphen(value: Date | string) {
  const dataIso = formatDateOnly(value);
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}-${mes}-${ano}`;
}

export function calcularDiasDecorridosCarencia(dataAtual: string, ultimaEntrega: Date | string) {
  const atual = parseDateOnly(dataAtual);
  const anterior = parseDateOnly(ultimaEntrega);
  return Math.floor((atual.getTime() - anterior.getTime()) / 86400000);
}

export function entregaEstaDentroDaCarencia(
  dataAtual: string,
  ultimaEntrega: Date | string,
  diasCarencia: number
) {
  if (diasCarencia <= 0) return false;
  return calcularDiasDecorridosCarencia(dataAtual, ultimaEntrega) < diasCarencia;
}

export class DoacaoRealizadaService {
  constructor(
    private readonly repository: Pick<
      DoacaoRealizadaRepository,
      | "listar"
      | "buscarPorIdOuFalhar"
      | "criar"
      | "atualizar"
      | "remover"
      | "listarBeneficiarios"
      | "listarFamilias"
      | "listarItensEstoque"
      | "buscarUltimaEntregaMesmoItem"
    > = new DoacaoRealizadaRepository(),
    private readonly parametrosSistemaService: Pick<
      ParametrosSistemaService,
      "obterCarenciaDoacaoRealizada"
    > = new ParametrosSistemaService()
  ) {}

  async listar(rawFilters: unknown) {
    const filtersNormalizados =
      rawFilters && typeof rawFilters === "object"
        ? normalizarObjetoTexto(rawFilters as Record<string, unknown>, {
            beneficiario_nome: "nomePessoa",
            tipo_doacao: "textoCurto",
            situacao: "textoCurto"
          })
        : rawFilters;

    const filters = doacaoRealizadaFiltersSchema.parse(filtersNormalizados);
    const registros = await this.repository.listar(filters);
    return registros.map((registro) => mapDoacaoRealizadaToResponse(registro, []));
  }

  async buscarPorId(rawId: string) {
    const id = this.parseId(rawId);
    const registro = await this.repository.buscarPorIdOuFalhar(id);
    return mapDoacaoRealizadaToResponse(registro.registro, registro.itens);
  }

  async criar(rawInput: unknown, atorRaw?: AtorRaw) {
    const ator = this.parseAtor(atorRaw);
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = doacaoRealizadaInputSchema.parse(inputNormalizado);
    const inputComCarencia = await this.aplicarRegraCarencia(input, ator);
    const registro = await this.repository.criar(inputComCarencia);
    return mapDoacaoRealizadaToResponse(registro.registro, registro.itens);
  }

  async atualizar(rawId: string, rawInput: unknown, atorRaw?: AtorRaw) {
    const id = this.parseId(rawId);
    const ator = this.parseAtor(atorRaw);
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = doacaoRealizadaInputSchema.parse(inputNormalizado);
    const inputComCarencia = await this.aplicarRegraCarencia(input, ator, id);
    const registro = await this.repository.atualizar(id, inputComCarencia);
    return mapDoacaoRealizadaToResponse(registro.registro, registro.itens);
  }

  async remover(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.remover(id);
  }

  async listarBeneficiarios(rawTermo?: unknown) {
    const termo = this.parseTermo(rawTermo);
    const registros = await this.repository.listarBeneficiarios(termo);
    return registros.map((item) => ({
      id: toStringId(item.id),
      nome_completo: item.nome_completo,
      codigo: item.codigo ?? undefined,
      cpf: item.cpf ?? undefined
    }));
  }

  async listarFamilias(rawTermo?: unknown) {
    const termo = this.parseTermo(rawTermo);
    const registros = await this.repository.listarFamilias(termo);
    return registros.map((item) => ({
      id: toStringId(item.id),
      nome_familia: item.nome_familia
    }));
  }

  async listarItensEstoque(rawTermo?: unknown) {
    const termo = this.parseTermo(rawTermo);
    const registros = await this.repository.listarItensEstoque(termo);
    return registros.map((item) => ({
      id: toStringId(item.id),
      codigo: item.codigo,
      descricao: item.descricao,
      unidade: item.unidade,
      estoque_atual: item.estoque_atual
    }));
  }

  private parseAtor(atorRaw?: AtorRaw) {
    const nome_usuario = atorRaw?.nomeUsuario?.trim();
    if (!nome_usuario) {
      throw new AppError("Usuario autenticado invalido.", 401);
    }

    const idNumerico = Number(atorRaw?.id);
    const id =
      Number.isInteger(idNumerico) && idNumerico > 0
        ? BigInt(idNumerico)
        : undefined;

    return {
      id,
      nome_usuario,
      permissoes: atorRaw?.permissoes ?? []
    } satisfies AtorDoacaoRealizada;
  }

  private parseId(rawId: string): bigint {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("Identificador invalido.", 400);
    }
    return BigInt(id);
  }

  private parseTermo(rawTermo?: unknown) {
    if (typeof rawTermo === "string") {
      return rawTermo;
    }

    if (Array.isArray(rawTermo)) {
      const primeiroTexto = rawTermo.find((item): item is string => typeof item === "string");
      return primeiroTexto;
    }

    return undefined;
  }

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") {
      return rawInput;
    }

    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoDoacaoRealizada
    );
  }

  private async aplicarRegraCarencia(
    input: DoacaoRealizadaInput,
    ator: AtorDoacaoRealizada,
    ignorarDoacaoRealizadaId?: bigint
  ) {
    const configuracao = await this.parametrosSistemaService.obterCarenciaDoacaoRealizada();
    const tempoCarenciaDias = Number(configuracao.carencia?.tempo_carencia_dias ?? 0);
    if (!Number.isInteger(tempoCarenciaDias) || tempoCarenciaDias <= 0) {
      return {
        ...input,
        senha_administrativa: undefined
      };
    }

    const itensBloqueados: ItemBloqueadoCarencia[] = [];
    let autorizacao:
      | {
          usuario_id: number;
          nome_exibicao: string;
          autorizado_em: string;
        }
      | undefined;

    const itensProcessados: DoacaoRealizadaItemInput[] = [];

    for (const item of input.itens) {
      const ultimaEntrega = await this.repository.buscarUltimaEntregaMesmoItem({
        beneficiario_id: input.beneficiario_id,
        vinculo_familiar_id: input.vinculo_familiar_id,
        item_id: item.item_id,
        ignorar_doacao_realizada_id: ignorarDoacaoRealizadaId
      });

      if (
        !ultimaEntrega ||
        !entregaEstaDentroDaCarencia(input.data_doacao, ultimaEntrega.data_doacao, tempoCarenciaDias)
      ) {
        itensProcessados.push({
          ...item,
          fora_carencia: false,
          carencia_dias_aplicada: tempoCarenciaDias
        });
        continue;
      }

      if (!input.autorizar_fora_carencia) {
        itensBloqueados.push({
          item_id: item.item_id,
          codigo_item: ultimaEntrega.codigo_item,
          descricao_item: ultimaEntrega.descricao_item,
          ultima_entrega_em: formatDateOnly(ultimaEntrega.data_doacao)
        });
        continue;
      }

      if (!autorizacao) {
        autorizacao = await this.validarAutorizacaoForaCarencia(
          input.senha_administrativa,
          ator
        );
      }

      itensProcessados.push({
        ...item,
        fora_carencia: true,
        carencia_dias_aplicada: tempoCarenciaDias,
        autorizado_por_usuario_id: autorizacao.usuario_id,
        autorizado_por_nome: autorizacao.nome_exibicao,
        autorizacao_carencia_em: autorizacao.autorizado_em,
        ultima_entrega_em: formatDateOnly(ultimaEntrega.data_doacao)
      });
    }

    if (itensBloqueados.length) {
      throw new AppError(
        this.montarMensagemItensBloqueadosCarencia(itensBloqueados, tempoCarenciaDias),
        409
      );
    }

    return {
      ...input,
      itens: itensProcessados,
      senha_administrativa: undefined
    };
  }

  private montarMensagemItensBloqueadosCarencia(
    itensBloqueados: ItemBloqueadoCarencia[],
    tempoCarenciaDias: number
  ) {
    const descricaoItens = itensBloqueados
      .map((item) => {
        const rotulo = [item.codigo_item?.trim(), item.descricao_item?.trim()]
          .filter(Boolean)
          .join(" - ");
        return `${rotulo || `Item ${item.item_id}`} (ultima entrega em ${formatDateWithHyphen(item.ultima_entrega_em)})`;
      })
      .join("; ");

    return `Entrega bloqueada pela carencia de ${tempoCarenciaDias} dias para o(s) item(ns): ${descricaoItens}. Informe a senha administrativa para liberar.`;
  }

  private async validarAutorizacaoForaCarencia(
    senhaAdministrativa: string | undefined,
    ator: AtorDoacaoRealizada
  ) {
    if (!ator.id) {
      throw new AppError("Usuario autenticado invalido.", 401);
    }

    if (!ator.permissoes.includes("ADMINISTRADOR")) {
      throw new AppError(
        "Somente administrador logado pode autorizar entrega fora da carencia.",
        403
      );
    }

    const senha = senhaAdministrativa?.trim();
    if (!senha) {
      throw new AppError("Informe a senha administrativa para liberar a entrega.", 422);
    }

    const usuario = await this.buscarUsuarioAutenticadoPorId(ator.id);
    if (!usuario) {
      throw new AppError("Usuario autenticado nao encontrado.", 404);
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) {
      throw new AppError("Senha administrativa invalida.", 401);
    }

    return {
      usuario_id: Number(ator.id),
      nome_exibicao: usuario.nome?.trim() || usuario.nomeUsuario,
      autorizado_em: new Date().toISOString()
    };
  }

  private async buscarUsuarioAutenticadoPorId(id: bigint) {
    return prisma.usuario.findUnique({
      where: { id },
      select: {
        nomeUsuario: true,
        nome: true,
        senhaHash: true
      }
    });
  }
}
