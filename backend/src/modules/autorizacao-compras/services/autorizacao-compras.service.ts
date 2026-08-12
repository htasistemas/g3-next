import { AppError } from "../../../shared/errors/app-error.js";
import { normalizarCnpj, normalizarCpf, validarCnpj, validarCpf } from "../../../utils/br-utils.js";
import { mapaCamposTextoAutorizacaoCompras } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import {
  mapAutorizacaoCompraCotacaoToResponse,
  mapAutorizacaoCompraDetalheToResponse,
  mapAutorizacaoCompraResumoToResponse,
  mapFornecedorByCnpj,
  mapReservaBancariaToResponse
} from "../autorizacao-compras.mapper.js";
import {
  autorizacaoCompraAprovacaoInputSchema,
  autorizacaoCompraCotacaoInputSchema,
  autorizacaoCompraEscolhaFornecedorSchema,
  autorizacaoCompraInputSchema,
  autorizacaoPagamentoInputSchema,
  reservaBancariaInputSchema
} from "../autorizacao-compras.schema.js";
import type { AutorizacaoCompraAtor } from "../autorizacao-compras.types.js";
import { normalizarTipoCompra } from "../autorizacao-compras.workflow.js";
import { AutorizacaoComprasRepository } from "../repositories/autorizacao-compras.repository.js";

type BrasilApiCnpjResponse = {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  descricao_situacao_cadastral?: string;
  data_inicio_atividade?: string;
  cnae_fiscal_descricao?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  ddd_telefone_1?: string;
  ddd_telefone_2?: string;
  email?: string;
};

type ConsultaCnpjPublica = {
  dados: BrasilApiCnpjResponse | null;
  origem?: string;
  falhaExterna: boolean;
};

export class AutorizacaoComprasService {
  private readonly repository = new AutorizacaoComprasRepository();

  async listar(rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    const rows = await this.repository.listar(tenantId);
    return rows.map(mapAutorizacaoCompraResumoToResponse);
  }

  async listarIndicadores(rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    return this.repository.listarIndicadores(tenantId);
  }

  async listarSetoresSolicitantes(rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    const rows = await this.repository.listarSetoresSolicitantes(tenantId);
    return rows.map((row) => {
      const nome = row.nome.trim();
      const unidadeNome = row.unidade_nome?.trim() || undefined;
      const label = unidadeNome ? `${nome} - ${unidadeNome}` : nome;
      return {
        valor: label,
        label,
        nome,
        unidadeNome
      };
    });
  }

  async buscarDetalhe(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    const detalhe = await this.repository.buscarDetalhePorId(id, tenantId);
    return mapAutorizacaoCompraDetalheToResponse(detalhe);
  }

  async criar(rawInput: unknown, ator: AutorizacaoCompraAtor) {
    const tenantId = this.parseTenant(ator.tenantId);
    const input = autorizacaoCompraInputSchema.parse(
      this.normalizarSolicitacaoPayload(rawInput)
    );
    const detalhe = await this.repository.criar(input, tenantId, ator);
    return mapAutorizacaoCompraDetalheToResponse(detalhe);
  }

  async atualizar(rawId: string, rawInput: unknown, ator: AutorizacaoCompraAtor) {
    const tenantId = this.parseTenant(ator.tenantId);
    const id = this.parseId(rawId);
    const input = autorizacaoCompraInputSchema.parse(
      this.normalizarSolicitacaoPayload(rawInput)
    );
    const detalhe = await this.repository.atualizar(id, input, tenantId, ator);
    return mapAutorizacaoCompraDetalheToResponse(detalhe);
  }

  async remover(rawId: string, ator: AutorizacaoCompraAtor) {
    const tenantId = this.parseTenant(ator.tenantId);
    const id = this.parseId(rawId);
    await this.repository.remover(id, tenantId, ator);
  }

  async enviarParaAprovacao(rawId: string, ator: AutorizacaoCompraAtor) {
    const tenantId = this.parseTenant(ator.tenantId);
    const id = this.parseId(rawId);
    const detalhe = await this.repository.enviarParaAprovacao(id, tenantId, ator);
    return mapAutorizacaoCompraDetalheToResponse(detalhe);
  }

  async registrarAprovacao(rawId: string, rawInput: unknown, ator: AutorizacaoCompraAtor) {
    const tenantId = this.parseTenant(ator.tenantId);
    const id = this.parseId(rawId);
    const input = autorizacaoCompraAprovacaoInputSchema.parse(
      this.normalizarPayload(rawInput)
    );
    const detalhe = await this.repository.registrarAprovacao(id, input, tenantId, ator);
    return mapAutorizacaoCompraDetalheToResponse(detalhe);
  }

  async listarCotacoes(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    const rows = await this.repository.listarCotacoes(id, tenantId);
    return rows.map((row) => mapAutorizacaoCompraCotacaoToResponse(row));
  }

  async criarCotacao(rawId: string, rawInput: unknown, ator: AutorizacaoCompraAtor) {
    const tenantId = this.parseTenant(ator.tenantId);
    const id = this.parseId(rawId);
    const input = autorizacaoCompraCotacaoInputSchema.parse(
      this.normalizarPayload(rawInput)
    );
    const rows = await this.repository.criarCotacao(id, input, tenantId, ator);
    return rows.map((row) => mapAutorizacaoCompraCotacaoToResponse(row));
  }

  async removerCotacao(rawId: string, rawCotacaoId: string, ator: AutorizacaoCompraAtor) {
    const tenantId = this.parseTenant(ator.tenantId);
    const id = this.parseId(rawId);
    const cotacaoId = this.parseId(rawCotacaoId);
    await this.repository.removerCotacao(id, cotacaoId, tenantId, ator);
  }

  async definirFornecedor(rawId: string, rawInput: unknown, ator: AutorizacaoCompraAtor) {
    const tenantId = this.parseTenant(ator.tenantId);
    const id = this.parseId(rawId);
    const input = autorizacaoCompraEscolhaFornecedorSchema.parse(
      this.normalizarPayload(rawInput)
    );
    const detalhe = await this.repository.definirFornecedor(id, input, tenantId, ator);
    return mapAutorizacaoCompraDetalheToResponse(detalhe);
  }

  async buscarFornecedorPorCnpj(rawCnpj: string, rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    const cnpj = rawCnpj.replace(/\D/g, "");
    if (cnpj.length < 8) {
      throw new AppError("CNPJ inválido.", 400);
    }
    const row = await this.repository.buscarFornecedorPorCnpj(cnpj, tenantId);
    return mapFornecedorByCnpj(row);
  }

  async consultarDocumentoFornecedor(rawTipo: string, rawDocumento: string, rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    const tipo = rawTipo.trim().toLowerCase();
    if (tipo !== "cpf" && tipo !== "cnpj") {
      throw new AppError("Tipo de documento invalido.", 400);
    }

    if (tipo === "cpf") {
      const cpf = normalizarCpf(rawDocumento) ?? "";
      if (!validarCpf(cpf)) {
        throw new AppError("Informe um CPF valido.", 400);
      }

      return {
        tipo,
        documento: cpf,
        encontrado: false,
        mensagem:
          "CPF validado. A consulta cadastral publica de CPF pela Receita Federal nao retorna dados para autopreenchimento sem integracao oficial autorizada."
      };
    }

    const cnpj = normalizarCnpj(rawDocumento) ?? "";
    if (!validarCnpj(cnpj)) {
      throw new AppError("Informe um CNPJ valido.", 400);
    }

    const consultaPublica = await this.consultarCnpjPublico(cnpj);
    const dadosReceita = consultaPublica.dados;
    if (dadosReceita) {
      return {
        tipo,
        documento: dadosReceita.cnpj ?? cnpj,
        encontrado: true,
        fornecedor: dadosReceita.nome_fantasia?.trim() || dadosReceita.razao_social?.trim() || undefined,
        razaoSocial: dadosReceita.razao_social?.trim() || undefined,
        nomeFantasia: dadosReceita.nome_fantasia?.trim() || undefined,
        telefone: dadosReceita.ddd_telefone_1?.trim() || dadosReceita.ddd_telefone_2?.trim() || undefined,
        email: dadosReceita.email?.trim().toLowerCase() || undefined,
        situacaoCadastral: dadosReceita.descricao_situacao_cadastral?.trim() || undefined,
        dataInicioAtividade: dadosReceita.data_inicio_atividade?.trim() || undefined,
        atividadePrincipal: dadosReceita.cnae_fiscal_descricao?.trim() || undefined,
        endereco: this.montarEnderecoCnpj(dadosReceita),
        origem: consultaPublica.origem
      };
    }

    const row = await this.repository.buscarFornecedorPorCnpj(cnpj, tenantId);
    if (row) {
      return {
        tipo,
        documento: row.cnpj ?? cnpj,
        encontrado: true,
        fornecedor: row.razao_social ?? undefined,
        razaoSocial: row.razao_social ?? undefined,
        nomeFantasia: row.razao_social ?? undefined,
        origem: "Historico interno de cotacoes"
      };
    }

    if (consultaPublica.falhaExterna) {
      throw new AppError("Nao foi possivel consultar o CNPJ nas APIs publicas e nao ha historico interno para este fornecedor.", 502);
    }

    throw new AppError("CNPJ nao encontrado na consulta publica ou no historico interno.", 404);
  }

  async listarReservas(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    const rows = await this.repository.listarReservas(id, tenantId);
    return rows.map(mapReservaBancariaToResponse);
  }

  private async consultarCnpjPublico(cnpj: string): Promise<ConsultaCnpjPublica> {
    const provedores = [
      { origem: "Minha Receita", url: `https://minhareceita.org/${cnpj}` },
      { origem: "BrasilAPI / Minha Receita", url: `https://brasilapi.com.br/api/cnpj/v1/${cnpj}` }
    ];
    let falhaExterna = false;

    for (const provedor of provedores) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);

      try {
        const response = await fetch(provedor.url, {
          headers: { Accept: "application/json" },
          signal: controller.signal
        });

        if (response.status === 404) {
          continue;
        }
        if (!response.ok) {
          falhaExterna = true;
          continue;
        }

        return {
          dados: (await response.json()) as BrasilApiCnpjResponse,
          origem: provedor.origem,
          falhaExterna
        };
      } catch {
        falhaExterna = true;
      } finally {
        clearTimeout(timeout);
      }
    }

    return { dados: null, falhaExterna };
  }

  private montarEnderecoCnpj(dados: BrasilApiCnpjResponse) {
    const partes = [
      dados.logradouro,
      dados.numero,
      dados.complemento,
      dados.bairro,
      dados.municipio,
      dados.uf,
      dados.cep ? `CEP ${dados.cep}` : undefined
    ]
      .map((valor) => valor?.trim())
      .filter(Boolean);

    return partes.length ? partes.join(", ") : undefined;
  }

  async registrarReservaBancaria(rawId: string, rawInput: unknown, ator: AutorizacaoCompraAtor) {
    const tenantId = this.parseTenant(ator.tenantId);
    const id = this.parseId(rawId);
    const input = reservaBancariaInputSchema.parse(rawInput);
    const rows = await this.repository.registrarReservaBancaria(id, input, tenantId, ator);
    return rows.map(mapReservaBancariaToResponse);
  }

  async removerReservaBancaria(rawId: string, rawReservaId: string, ator: AutorizacaoCompraAtor) {
    const tenantId = this.parseTenant(ator.tenantId);
    const id = this.parseId(rawId);
    const reservaId = this.parseId(rawReservaId);
    await this.repository.removerReservaBancaria(id, reservaId, tenantId, ator);
  }

  async gerarAutorizacaoPagamento(rawId: string, rawInput: unknown, ator: AutorizacaoCompraAtor) {
    const tenantId = this.parseTenant(ator.tenantId);
    const id = this.parseId(rawId);
    const input = autorizacaoPagamentoInputSchema.parse(this.normalizarPayload(rawInput));
    const detalhe = await this.repository.gerarAutorizacaoPagamento(id, input, tenantId, ator);
    return mapAutorizacaoCompraDetalheToResponse(detalhe);
  }

  private parseId(rawId: string): bigint {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador inválido.", 400);
    }
    return BigInt(parsed);
  }

  private parseTenant(rawTenantId?: string) {
    const tenantId = rawTenantId?.trim();
    if (!tenantId) {
      throw new AppError("Tenant da sessao nao identificado.", 401);
    }
    return tenantId;
  }

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") return rawInput;
    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoAutorizacaoCompras
    );
  }

  private normalizarSolicitacaoPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") return rawInput;
    const payload = this.normalizarPayload(rawInput) as Record<string, unknown>;

    payload.numeroSolicitacao = undefined;

    if (typeof payload.tipoCompra === "string") {
      payload.tipoCompra = normalizarTipoCompra(payload.tipoCompra);
    }

    if (Array.isArray(payload.itens)) {
      payload.itens = payload.itens.map((item) =>
        normalizarObjetoTexto(item as Record<string, unknown>, {
          descricao: "textoCurto",
          categoria: "textoCurto",
          unidade: "textoCurto"
        })
      );
    }

    return payload;
  }
}
