import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoOficios } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { storageService } from "../../arquivos/services/storage-instance.js";
import { ReportsRepository } from "../../reports/repositories/reports.repository.js";
import { mapOficioImagemToResponse, mapOficioToResponse } from "../oficios.mapper.js";
import {
  oficioImagemInputSchema,
  oficioInputSchema,
  oficioPdfAssinadoInputSchema
} from "../oficios.schema.js";
import { OficiosRepository } from "../repositories/oficios.repository.js";
import type { OficioRow } from "../oficios.types.js";
import {
  OficioDocumentRenderer,
  type OficioDocumentoInstituicao,
  type OficioDocumentoLayout
} from "./oficio-document-renderer.js";
import {
  OficioImportParser,
  type OficioImportacaoResultado
} from "./oficio-import-parser.js";

type ContextoInstitucional = {
  instituicao: OficioDocumentoInstituicao;
};

export class OficiosService {
  private readonly repository = new OficiosRepository();
  private readonly reportsRepository = new ReportsRepository();
  private readonly renderer = new OficioDocumentRenderer();
  private readonly importParser = new OficioImportParser();
  private readonly dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  private readonly dateLongFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  async listar(rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    const registros = await this.repository.listar(tenantId);
    return registros.map((item) => mapOficioToResponse(item.oficio, item.tramites));
  }

  async obter(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.buscarPorIdOuFalhar(id, tenantId);
    return mapOficioToResponse(registro.oficio, registro.tramites);
  }

  async obterProximoNumero(rawData?: unknown, rawTenantId?: string) {
    const dataReferencia = this.parseDataReferencia(rawData);
    const tenantId = this.parseTenant(rawTenantId);
    return this.repository.obterProximoNumero(dataReferencia, tenantId);
  }

  async criar(rawInput: unknown, rawUsuarioId?: string, rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    const input = oficioInputSchema.parse(
      await this.prepararPayloadCriacao(rawInput, rawUsuarioId, tenantId)
    );
    const registro = await this.repository.criar(input, tenantId);
    return mapOficioToResponse(registro.oficio, registro.tramites);
  }

  async atualizar(rawId: string, rawInput: unknown, rawUsuarioId?: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    const input = oficioInputSchema.parse(
      await this.prepararPayloadAtualizacao(id, rawInput, rawUsuarioId, tenantId)
    );
    const registro = await this.repository.atualizar(id, input, tenantId);
    return mapOficioToResponse(registro.oficio, registro.tramites);
  }

  async remover(rawId: string, rawUsuarioId?: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.buscarPorIdOuFalhar(id, tenantId);
    const imagens = await this.repository.listarImagens(id, tenantId);
    await this.repository.remover(id, tenantId);
    await this.limparArquivo(registro.oficio.pdf_assinado_conteudo, usuarioId);
    for (const imagem of imagens) {
      await this.limparArquivo(imagem.conteudo_base64, usuarioId);
    }
  }

  async salvarPdfAssinado(
    rawId: string,
    rawInput: unknown,
    rawUsuarioId?: string,
    rawTenantId?: string
  ) {
    const id = this.parseId(rawId);
    const input = oficioPdfAssinadoInputSchema.parse(this.normalizarPayload(rawInput));
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const tenantId = this.parseTenant(rawTenantId);
    const existente = await this.repository.buscarPorIdOuFalhar(id, tenantId);
    const arquivo = await storageService.salvarArquivo({
      scope: "oficio_documento",
      conteudo: input.conteudoBase64,
      nomeOriginal: input.nomeArquivo,
      mimeType: input.tipoMime,
      entidadeId: id,
      usuarioUploadId: usuarioId,
      observacao: "PDF assinado do oficio"
    });

    try {
      const registro = await this.repository.salvarPdfAssinado(id, {
        ...input,
        conteudoBase64: arquivo.caminhoArquivo,
        tipoMime: arquivo.registro.mime_type
      }, tenantId);
      await storageService.vincularEntidade(arquivo.caminhoArquivo, id);
      await this.limparArquivo(existente.oficio.pdf_assinado_conteudo, usuarioId, arquivo.caminhoArquivo);
      return mapOficioToResponse(registro.oficio, registro.tramites);
    } catch (error) {
      await storageService.rollbackArquivos([arquivo.caminhoArquivo]);
      throw error;
    }
  }

  async obterPdfAssinado(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    const pdf = await this.repository.obterPdfAssinado(id, tenantId);
    if (!pdf.nome || !pdf.tipo || !pdf.conteudo) {
      throw new AppError("Oficio nao possui PDF assinado.", 404);
    }
    return pdf;
  }

  async removerPdfAssinado(rawId: string, rawUsuarioId?: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const tenantId = this.parseTenant(rawTenantId);
    const pdf = await this.repository.obterPdfAssinado(id, tenantId);
    await this.repository.removerPdfAssinado(id, tenantId);
    await this.limparArquivo(pdf.conteudo, usuarioId);
  }

  async listarImagens(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    const imagens = await this.repository.listarImagens(id, tenantId);
    return imagens.map(mapOficioImagemToResponse);
  }

  async adicionarImagem(
    rawId: string,
    rawInput: unknown,
    rawUsuarioId?: string,
    rawTenantId?: string
  ) {
    const id = this.parseId(rawId);
    const input = oficioImagemInputSchema.parse(this.normalizarPayload(rawInput));
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const tenantId = this.parseTenant(rawTenantId);
    const arquivo = await storageService.salvarArquivo({
      scope: "oficio_documento",
      conteudo: input.conteudoBase64,
      nomeOriginal: input.nomeArquivo,
      mimeType: input.tipoMime,
      entidadeId: id,
      usuarioUploadId: usuarioId,
      observacao: "Imagem do oficio"
    });

    try {
      const imagem = await this.repository.adicionarImagem(id, {
        ...input,
        conteudoBase64: arquivo.caminhoArquivo,
        tipoMime: arquivo.registro.mime_type
      }, tenantId);
      await storageService.vincularEntidade(arquivo.caminhoArquivo, id);
      return mapOficioImagemToResponse(imagem);
    } catch (error) {
      await storageService.rollbackArquivos([arquivo.caminhoArquivo]);
      throw error;
    }
  }

  async removerImagem(
    rawId: string,
    rawImagemId: string,
    rawUsuarioId?: string,
    rawTenantId?: string
  ) {
    const id = this.parseId(rawId);
    const imagemId = this.parseId(rawImagemId);
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const tenantId = this.parseTenant(rawTenantId);
    const imagens = await this.repository.listarImagens(id, tenantId);
    const imagem = imagens.find((item) => item.id === imagemId);
    await this.repository.removerImagem(id, imagemId, tenantId);
    await this.limparArquivo(imagem?.conteudo_base64, usuarioId);
  }

  async gerarDocumento(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.buscarPorIdOuFalhar(id, tenantId);
    const contexto = await this.montarContextoInstitucional(tenantId);
    const documento = this.montarDocumentoOficio(registro.oficio, contexto);
    const pdf = await this.renderer.render(documento);

    return {
      filename: `oficio-${registro.oficio.numero.replace(/[^\d/]+/g, "").replaceAll("/", "-") || id.toString()}.pdf`,
      pdf
    };
  }

  async obterContextoDocumento(rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    const contexto = await this.montarContextoInstitucional(tenantId);
    return {
      cidadeUf: this.formatarCidadeUf(contexto),
      instituicao: contexto.instituicao
    };
  }

  async importarConteudoArquivo(
    arquivo?: Pick<Express.Multer.File, "originalname" | "mimetype" | "buffer">
  ): Promise<OficioImportacaoResultado> {
    return this.importParser.importar(
      arquivo
        ? {
            nomeArquivo: arquivo.originalname,
            tipoMime: arquivo.mimetype,
            buffer: arquivo.buffer
          }
        : undefined
    );
  }

  private parseId(rawId: string): bigint {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador invalido.", 400);
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
    return normalizarObjetoTexto(rawInput as Record<string, unknown>, mapaCamposTextoOficios);
  }

  private async prepararPayloadCriacao(rawInput: unknown, rawUsuarioId?: string, tenantId?: string) {
    const payload = this.normalizarPayload(rawInput);
    if (!payload || typeof payload !== "object") {
      return payload;
    }

    const registro = payload as Record<string, unknown>;
    const identificacaoBase =
      registro.identificacao && typeof registro.identificacao === "object"
        ? (registro.identificacao as Record<string, unknown>)
        : {};

    const dataReferencia = this.parseDataReferencia(identificacaoBase.data);
    const numero = await this.repository.obterProximoNumero(dataReferencia, tenantId!);
    const criadoPor = this.parseUsuarioIdNumber(rawUsuarioId);

    return {
      ...registro,
      criadoPor: registro.criadoPor ?? criadoPor ?? undefined,
      identificacao: {
        ...identificacaoBase,
        numero
      }
    };
  }

  private async prepararPayloadAtualizacao(
    id: bigint,
    rawInput: unknown,
    rawUsuarioId?: string,
    rawTenantId?: string
  ) {
    const payload = this.normalizarPayload(rawInput);
    if (!payload || typeof payload !== "object") {
      return payload;
    }

    const existente = await this.repository.buscarPorIdOuFalhar(id, rawTenantId!);
    const registro = payload as Record<string, unknown>;
    const identificacaoBase =
      registro.identificacao && typeof registro.identificacao === "object"
        ? (registro.identificacao as Record<string, unknown>)
        : {};
    const numeroInformado =
      typeof identificacaoBase.numero === "string" ? identificacaoBase.numero.trim() : "";
    const criadoPor = this.parseUsuarioIdNumber(rawUsuarioId);

    return {
      ...registro,
      criadoPor: registro.criadoPor ?? criadoPor ?? undefined,
      identificacao: {
        ...identificacaoBase,
        numero: numeroInformado || existente.oficio.numero
      }
    };
  }

  private parseDataReferencia(rawValue?: unknown) {
    if (typeof rawValue !== "string") {
      return undefined;
    }

    const valor = rawValue.trim();
    if (!valor) {
      return undefined;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      throw new AppError("Data de referencia invalida. Use o formato AAAA-MM-DD.", 400);
    }

    return valor;
  }

  private isManagedStoragePath(valor?: string | null) {
    if (!valor?.trim()) return false;
    const normalized = valor.trim();
    return !normalized.startsWith("data:") && !/^https?:\/\//i.test(normalized);
  }

  private async limparArquivo(valor?: string | null, usuarioId?: bigint, ignorarCaminho?: string) {
    if (!this.isManagedStoragePath(valor)) {
      return;
    }

    if (valor === ignorarCaminho) {
      return;
    }

    await storageService.desativarPorCaminho(valor, usuarioId);
  }

  private parseUsuarioId(rawUsuarioId?: string) {
    if (!rawUsuarioId) return undefined;
    const parsed = Number(rawUsuarioId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return undefined;
    }
    return BigInt(parsed);
  }

  private parseUsuarioIdNumber(rawUsuarioId?: string) {
    if (!rawUsuarioId) return undefined;
    const parsed = Number(rawUsuarioId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return undefined;
    }
    return parsed;
  }

  private async montarContextoInstitucional(tenantId: string): Promise<ContextoInstitucional> {
    const instituicao = await this.reportsRepository.obterInstituicaoRelatorio(tenantId);

    return {
      instituicao: {
        nomeCompleto: this.normalizarTexto(instituicao.razaoSocial) ?? "Instituição não cadastrada",
        unidadeOuNucleo: this.normalizarTexto(instituicao.unidadeNome),
        cnpj: this.normalizarTexto(instituicao.cnpj),
        endereco: this.normalizarTexto(instituicao.enderecoCompleto),
        cep: this.normalizarTexto(instituicao.cep),
        cidade: this.normalizarTexto(instituicao.cidade),
        uf: this.normalizarTexto(instituicao.uf)?.toUpperCase(),
        telefone: this.normalizarTexto(instituicao.telefone),
        site: this.normalizarTexto(instituicao.site),
        email: this.normalizarTexto(instituicao.email),
        logoUrl: this.normalizarTexto(instituicao.logoUrl),
        rodapePadrao: {
          linha1: this.normalizarTexto(instituicao.rodape.linha1) ?? "Instituição não cadastrada",
          linha2: this.normalizarTexto(instituicao.rodape.linha2),
          linha3: this.normalizarTexto(instituicao.rodape.linha3)
        }
      }
    };
  }

  private montarDocumentoOficio(
    oficio: OficioRow,
    contexto: ContextoInstitucional
  ): OficioDocumentoLayout {
    return {
      numeroOficio: this.normalizarTexto(oficio.numero) ?? "---",
      cidadeUf: this.formatarCidadeUf(contexto),
      dataExtenso: this.formatarDataExtenso(oficio.data),
      destinatarioInstituicao:
        this.normalizarTexto(oficio.razao_social) ?? this.normalizarTexto(oficio.destinatario),
      destinatarioTratamento: this.normalizarTexto(oficio.saudacao),
      destinatarioNome:
        this.normalizarTexto(oficio.para) ?? this.normalizarTexto(oficio.destinatario_responsavel),
      destinatarioCargo:
        this.normalizarTexto(oficio.cargo_para) ?? this.normalizarTexto(oficio.destinatario_cargo),
      assunto: this.normalizarTexto(oficio.assunto),
      corpoTexto: this.normalizarTexto(oficio.corpo),
      informacoesComplementares: this.montarInformacoesComplementares(oficio),
      fechamento: this.normalizarTexto(oficio.finalizacao),
      responsavelNome:
        this.normalizarTexto(oficio.assinatura_nome) ?? this.normalizarTexto(oficio.responsavel),
      responsavelCargo: this.normalizarTexto(oficio.assinatura_cargo),
      instituicao: contexto.instituicao
    };
  }

  private montarInformacoesComplementares(oficio: OficioRow) {
    const itens: Array<{ rotulo: string; valor: string }> = [];
    const observacoes = this.normalizarTexto(oficio.observacoes);
    const linhas = (observacoes ?? "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
    const rotulosMapa: Array<{ aliases: string[]; rotulo: string }> = [
      { aliases: ["denominacao do evento"], rotulo: "Denominação do evento" },
      { aliases: ["estimativa de publico"], rotulo: "Estimativa de público" },
      { aliases: ["cronograma"], rotulo: "Cronograma" },
      {
        aliases: ["datas e horarios", "data e horario", "data e horarios", "datas e horario"],
        rotulo: "Datas e horários"
      }
    ];
    const linhasConsumidas = new Set<number>();

    for (const [index, linha] of linhas.entries()) {
      const separador = linha.indexOf(":");
      if (separador <= 0) {
        continue;
      }

      const chave = this.normalizarMarcador(linha.slice(0, separador));
      const valor = this.normalizarTexto(linha.slice(separador + 1));
      if (!valor) {
        continue;
      }

      const configuracao = rotulosMapa.find((item) => item.aliases.includes(chave));
      if (!configuracao || itens.some((item) => item.rotulo === configuracao.rotulo)) {
        continue;
      }

      itens.push({ rotulo: configuracao.rotulo, valor });
      linhasConsumidas.add(index);
    }

    const observacoesLivres = linhas.filter((_, index) => !linhasConsumidas.has(index)).join(" ");
    const observacoesComplementares = this.normalizarTexto(observacoesLivres);
    if (observacoesComplementares) {
      itens.push({ rotulo: "Observações complementares", valor: observacoesComplementares });
    }

    const prazoResposta = this.normalizarTexto(oficio.prazo_resposta);
    if (prazoResposta) {
      itens.push({ rotulo: "Prazo de resposta", valor: prazoResposta });
    }

    const classificacao = this.normalizarTexto(oficio.classificacao);
    if (classificacao) {
      itens.push({ rotulo: "Classificação", valor: classificacao });
    }

    return itens.length ? itens : undefined;
  }

  private normalizarMarcador(valor?: string | null) {
    return (valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  private formatarCidadeUf(contexto: ContextoInstitucional) {
    const cidade = this.normalizarTexto(contexto.instituicao.cidade);
    const uf = this.normalizarTexto(contexto.instituicao.uf)?.toUpperCase();
    if (cidade && uf) {
      return `${cidade}-${uf}`;
    }

    return cidade ?? uf ?? "";
  }

  private normalizarTexto(valor?: string | number | Date | null) {
    if (valor === null || valor === undefined) {
      return undefined;
    }

    if (valor instanceof Date) {
      return this.formatarData(valor);
    }

    const texto = String(valor).trim();
    return texto.length > 0 ? texto : undefined;
  }

  private formatarDataExtenso(valor?: string | Date | null) {
    if (!valor) {
      return "";
    }

    const data = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(data.getTime())) {
      return typeof valor === "string" ? valor : "";
    }

    const texto = this.dateLongFormatter.format(data);
    return texto.replace(/ de ([a-zà-ú])/u, (_match, letra: string) => ` de ${letra.toUpperCase()}`);
  }

  private formatarData(valor?: string | Date | null) {
    if (!valor) {
      return "---";
    }

    const data = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(data.getTime())) {
      return typeof valor === "string" ? valor : "---";
    }

    return this.dateFormatter.format(data).replaceAll("/", "-");
  }
}
