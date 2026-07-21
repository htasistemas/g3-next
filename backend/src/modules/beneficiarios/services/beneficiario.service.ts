import { randomInt } from "node:crypto";
import { AppError } from "../../../shared/errors/app-error.js";
import { EmailService } from "../../email/services/email.service.js";
import {
  beneficiarioAddressSuggestionSchema,
  beneficiarioFiltersSchema,
  beneficiarioInputSchema
} from "../beneficiario.schema.js";
import { mapBeneficiarioToResponse } from "../beneficiario.mapper.js";
import {
  BeneficiarioRepository,
  possuiBeneficiarioPortalAcesso
} from "../repositories/beneficiario.repository.js";
import {
  montarMensagemAlteracoesBeneficiario,
  montarResumoAlteracoesBeneficiario,
  obterDestinatariosAlteracaoBeneficiario
} from "./beneficiario-email-notificacao.js";
import {
  mapaCamposTextoBeneficiario,
  mapaDocumentoBeneficiario
} from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import type { BeneficiarioInput } from "../beneficiario.types.js";
import { storageService } from "../../arquivos/services/storage-instance.js";
import { ParametrosSistemaService } from "../../configuracoes-gerais/services/parametros-sistema.service.js";
import { prisma } from "../../../database/prisma.js";

export class BeneficiarioService {
  private readonly repository = new BeneficiarioRepository();
  private readonly emailService = new EmailService();
  private readonly parametrosSistemaService = new ParametrosSistemaService();

  async listar(rawFilters: unknown, tenantId?: string) {
    const filtersNormalizados =
      rawFilters && typeof rawFilters === "object"
        ? normalizarObjetoTexto(
            rawFilters as Record<string, unknown>,
            {
              nome: "nomePessoa",
              status: "textoCurto"
            }
          )
        : rawFilters;

    const filters = beneficiarioFiltersSchema.parse(filtersNormalizados);
    const beneficiarios = await this.repository.listar(filters, this.parseTenantId(tenantId));
    return beneficiarios.map(mapBeneficiarioToResponse);
  }

  async buscarPorId(rawId: string, tenantId?: string) {
    const id = this.parseId(rawId);
    const beneficiario = await this.repository.buscarPorIdOuFalhar(id, this.parseTenantId(tenantId));
    return mapBeneficiarioToResponse(beneficiario);
  }

  async criar(rawInput: unknown, rawUsuarioId?: string, tenantId?: string) {
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = beneficiarioInputSchema.parse(inputNormalizado);
    const tenantObrigatorio = this.parseTenantId(tenantId);
    await this.validarDocumentosObrigatorios(input, tenantObrigatorio);
    await this.validarDuplicidadeCadastro(input, tenantObrigatorio);
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const senhaPortalGerada = this.resolverSenhaPortal(input.senha_portal, false);
    const preparado = await this.prepararArquivosPayload(input, usuarioId, undefined, tenantObrigatorio);

    try {
      const beneficiario = await this.repository.criar(
        {
          ...preparado.input,
          senha_portal: senhaPortalGerada
        },
        tenantObrigatorio
      );
      await this.vincularArquivos(preparado.novosCaminhos, beneficiario.id, tenantObrigatorio);
      return {
        beneficiario: mapBeneficiarioToResponse(beneficiario),
        senha_portal_gerada: senhaPortalGerada
      };
    } catch (error) {
      await storageService.rollbackArquivos(preparado.novosCaminhos);
      throw error;
    }
  }

  async criarPendenteImportacao(rawInput: unknown, tenantId: string) {
    const inputNormalizado = this.normalizarPayload(rawInput);
    if (!inputNormalizado || typeof inputNormalizado !== "object") {
      throw new AppError("Dados da importação inválidos.", 422);
    }
    // Mantém compatibilidade com bancos de produção que ainda não receberam
    // a migration de campos incompletos. A operação é idempotente e não cria
    // valores artificiais: apenas permite NULL nos campos pendentes.
    await prisma.$executeRawUnsafe("ALTER TABLE cadastro_beneficiario ALTER COLUMN data_nascimento DROP NOT NULL");
    await prisma.$executeRawUnsafe("ALTER TABLE cadastro_beneficiario ALTER COLUMN nome_mae DROP NOT NULL");
    return this.repository.criar(inputNormalizado as BeneficiarioInput, tenantId);
  }

  async atualizar(rawId: string, rawInput: unknown, rawUsuarioId?: string, tenantId?: string) {
    const id = this.parseId(rawId);
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = beneficiarioInputSchema.parse(inputNormalizado);
    const tenantObrigatorio = this.parseTenantId(tenantId);
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    await this.validarDocumentosObrigatorios(input, tenantObrigatorio);
    await this.validarDuplicidadeCadastro(input, tenantObrigatorio, id);
    const senhaPortalExistente = await possuiBeneficiarioPortalAcesso(id, tenantObrigatorio);
    const senhaPortalGerada = this.resolverSenhaPortal(input.senha_portal, senhaPortalExistente);
    const existente = await this.repository.buscarPorIdOuFalhar(id, tenantObrigatorio);
    const snapshotAnterior = mapBeneficiarioToResponse(existente);
    const preparado = await this.prepararArquivosPayload(input, usuarioId, id, tenantObrigatorio);

    try {
      let beneficiario;
      try {
        beneficiario = await this.repository.atualizar(
          id,
          {
            ...preparado.input,
            senha_portal: senhaPortalGerada
          },
          tenantObrigatorio
        );
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }

        const motivo =
          error instanceof Error && error.message.trim()
            ? error.message.trim()
            : "falha inesperada ao atualizar os dados do beneficiario";

        throw new AppError(`Nao foi possivel atualizar o beneficiario. ${motivo}.`, 500);
      }

      try {
        await this.vincularArquivos(preparado.novosCaminhos, id, tenantObrigatorio);
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }

        const motivo =
          error instanceof Error && error.message.trim()
            ? error.message.trim()
            : "falha inesperada ao vincular os arquivos do beneficiario";

        throw new AppError(`Nao foi possivel vincular os arquivos do beneficiario. ${motivo}.`, 500);
      }

      try {
        await this.limparArquivosSubstituidos(
          this.coletarCaminhosRegistro(existente),
          this.coletarCaminhosRegistro(beneficiario),
          usuarioId
        );
      } catch (error) {
        console.warn("[beneficiario] falha ao limpar arquivos substituidos apos atualizar cadastro:", error);
      }

      const response = mapBeneficiarioToResponse(beneficiario);
      await this.enviarEmailAtualizacaoCadastro(snapshotAnterior, response);
      return {
        beneficiario: response,
        senha_portal_gerada: senhaPortalGerada
      };
    } catch (error) {
      await storageService.rollbackArquivos(preparado.novosCaminhos);
      throw error;
    }
  }

  async remover(rawId: string, rawUsuarioId?: string, tenantId?: string) {
    const id = this.parseId(rawId);
    const tenantObrigatorio = this.parseTenantId(tenantId);
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const existente = await this.repository.buscarPorIdOuFalhar(id, tenantObrigatorio);
    await this.repository.remover(id, tenantObrigatorio);
    await this.limparArquivosSubstituidos(this.coletarCaminhosRegistro(existente), [], usuarioId);
  }

  async obterProximoCodigo(tenantId?: string) {
    const codigo = await this.repository.obterProximoCodigo(this.parseTenantId(tenantId));
    return { codigo };
  }

  async obterSugestaoEndereco(rawQuery: unknown, tenantId?: string) {
    const query = beneficiarioAddressSuggestionSchema.parse(rawQuery);
    return this.repository.buscarSugestaoEndereco(query, this.parseTenantId(tenantId));
  }

  private parseId(rawId: string): bigint {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("Identificador de beneficiario invalido.", 400);
    }
    return BigInt(id);
  }

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") {
      return rawInput;
    }

    const inputBase = normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoBeneficiario
    );

    if (Array.isArray(inputBase.documentos_obrigatorios)) {
      inputBase.documentos_obrigatorios = inputBase.documentos_obrigatorios.map((documento) => {
        if (!documento || typeof documento !== "object") return documento;
        return normalizarObjetoTexto(documento as Record<string, unknown>, mapaDocumentoBeneficiario);
      });
    }

    return inputBase;
  }

  private async validarDuplicidadeCadastro(
    input: BeneficiarioInput,
    tenantId: string,
    idIgnorado?: bigint
  ) {
    const duplicidade = await this.repository.buscarDuplicidadeCadastro(input, tenantId, idIgnorado);
    if (!duplicidade) {
      return;
    }

    const detalhes = [
      duplicidade.codigo ? `código ${duplicidade.codigo}` : null,
      duplicidade.cpf ? `CPF ${duplicidade.cpf}` : null
    ].filter(Boolean);

    const sufixo = detalhes.length ? ` (${detalhes.join(", ")})` : "";
    throw new AppError(
      `Já existe um beneficiário cadastrado com os mesmos dados${sufixo}.`,
      409
    );
  }

  private async prepararArquivosPayload(
    input: BeneficiarioInput,
    usuarioId?: bigint,
    entidadeId?: bigint,
    tenantId?: string
  ) {
    const novosCaminhos: string[] = [];

    let foto;
    try {
      foto = await storageService.persistirCampo({
        scope: "beneficiario_foto",
        valor: input.foto_3x4,
        nomeOriginal: `beneficiario-${input.codigo ?? "sem-codigo"}-foto.jpg`,
        mimeType: "image/jpeg",
        entidadeId,
        usuarioUploadId: usuarioId,
        tenantId,
        observacao: "Foto 3x4 do beneficiario"
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw new AppError(`Nao foi possivel processar a foto 3x4: ${error.message}`, error.statusCode);
      }
      throw new AppError("Nao foi possivel processar a foto 3x4 do beneficiario.", 422);
    }

    if (foto.registro && foto.caminhoArquivo) {
      novosCaminhos.push(foto.caminhoArquivo);
    }

    const documentosObrigatorios = await Promise.all(
      (input.documentos_obrigatorios ?? []).map(async (documento) => {
        let arquivo;
        try {
          arquivo = await storageService.persistirCampo({
            scope: "beneficiario_documento",
            valor: documento.caminhoArquivo ?? documento.conteudo,
            nomeOriginal:
              documento.nomeArquivo ??
              `${documento.nome?.replace(/\s+/g, "-").toLowerCase() || "documento"}.pdf`,
            mimeType: documento.contentType,
            entidadeId,
            usuarioUploadId: usuarioId,
            tenantId,
            observacao: documento.nome
          });
        } catch (error) {
          if (error instanceof AppError) {
            throw new AppError(
              `Nao foi possivel processar o documento ${documento.nome}: ${error.message}`,
              error.statusCode
            );
          }

          const motivo =
            error instanceof Error && error.message.trim()
              ? error.message.trim()
              : "erro desconhecido no processamento do arquivo";

          throw new AppError(
            `Nao foi possivel processar o documento ${documento.nome}: ${motivo}.`,
            422
          );
        }

        if (arquivo.registro && arquivo.caminhoArquivo) {
          novosCaminhos.push(arquivo.caminhoArquivo);
        }

        return {
          ...documento,
          caminhoArquivo: arquivo.caminhoArquivo,
          conteudo: undefined,
          contentType: documento.contentType ?? arquivo.registro?.mime_type,
          nomeArquivo: documento.nomeArquivo ?? arquivo.registro?.nome_original
        };
      })
    );

    return {
      input: {
        ...input,
        foto_3x4: foto.caminhoArquivo,
        documentos_obrigatorios: documentosObrigatorios
      },
      novosCaminhos
    };
  }

  private coletarCaminhosRegistro(registro: Awaited<ReturnType<BeneficiarioRepository["buscarPorIdOuFalhar"]>>) {
    const caminhos = new Set<string>();

    if (this.isManagedStoragePath(registro.foto3x4)) {
      caminhos.add(registro.foto3x4!);
    }

    for (const documento of registro.documentos) {
      if (this.isManagedStoragePath(documento.caminhoArquivo)) {
        caminhos.add(documento.caminhoArquivo!);
      }
    }

    return [...caminhos];
  }

  private async vincularArquivos(caminhos: string[], entidadeId: bigint, tenantId: string) {
    for (const caminho of caminhos) {
      await storageService.vincularEntidade(caminho, entidadeId, tenantId);
    }
  }

  private async validarDocumentosObrigatorios(input: BeneficiarioInput, tenantId: string) {
    const configuracao =
      await this.parametrosSistemaService.obterObrigatoriedadeDocumentosBeneficiario(tenantId);
    const documentos = input.documentos_obrigatorios ?? [];
    const porChave = new Map<string, (typeof documentos)[number]>();

    for (const documento of documentos) {
      const chaves = [
        documento.id ? String(documento.id) : undefined,
        documento.nome ? this.normalizarNomeDocumento(documento.nome) : undefined
      ].filter((valor): valor is string => !!valor);

      for (const chave of chaves) {
        porChave.set(chave, documento);
      }
    }

    const pendencias: string[] = [];

    for (const documentoConfig of configuracao.obrigatoriedade.documentos) {
      if (!documentoConfig.obrigatorio) continue;

      const documento =
        porChave.get(documentoConfig.id) ??
        porChave.get(this.normalizarNomeDocumento(documentoConfig.nome));

      const numeroDocumento = documento?.numeroDocumento?.trim();
      const caminhoArquivo = documento?.caminhoArquivo?.trim() || documento?.conteudo?.trim();

      if (documentoConfig.id === "cpf") {
        continue;
      }

      if (documentoConfig.id === "comprovante_endereco") {
        if (!numeroDocumento || !caminhoArquivo || documento?.ignorado) {
          pendencias.push(documentoConfig.nome);
        }
        continue;
      }

      if ((!numeroDocumento && !caminhoArquivo) || documento?.ignorado) {
        pendencias.push(documentoConfig.nome);
      }
    }

    if (pendencias.length) {
      throw new AppError(`Documentos obrigatorios pendentes: ${pendencias.join(", ")}.`, 400);
    }
  }

  private normalizarNomeDocumento(nome: string) {
    return nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  private async limparArquivosSubstituidos(
    caminhosAntigos: string[],
    caminhosAtuais: string[],
    usuarioId?: bigint
  ) {
    const atuais = new Set(caminhosAtuais);
    for (const caminho of caminhosAntigos) {
      if (!atuais.has(caminho)) {
        await storageService.desativarPorCaminho(caminho, usuarioId);
      }
    }
  }

  private isManagedStoragePath(valor?: string | null) {
    if (!valor?.trim()) return false;
    const normalized = valor.trim();
    return !normalized.startsWith("data:") && !/^https?:\/\//i.test(normalized);
  }

  private parseUsuarioId(rawUsuarioId?: string) {
    if (!rawUsuarioId) return undefined;
    const parsed = Number(rawUsuarioId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return undefined;
    }
    return BigInt(parsed);
  }

  private parseTenantId(rawTenantId?: string) {
    const tenantId = rawTenantId?.trim();
    if (!tenantId) {
      throw new AppError("Tenant da sessao nao identificado.", 401);
    }
    return tenantId;
  }

  private resolverSenhaPortal(senhaPortal?: string, senhaExistente = false) {
    const senhaNormalizada = senhaPortal?.replace(/\D/g, "").trim();
    if (senhaNormalizada) {
      if (senhaNormalizada.length !== 4) {
        throw new AppError("A senha do portal deve ter 4 digitos.", 422);
      }
      return senhaNormalizada;
    }

    if (senhaExistente) {
      return undefined;
    }

    return String(randomInt(1000, 10000));
  }

  private async enviarEmailAtualizacaoCadastro(
    anterior: Record<string, unknown>,
    atual: Record<string, unknown>
  ) {
    const alteracoes = montarResumoAlteracoesBeneficiario(anterior, atual);
    if (!alteracoes.length) {
      return;
    }

    const destinatarios = obterDestinatariosAlteracaoBeneficiario(anterior, atual);
    if (!destinatarios.length) {
      console.warn("[beneficiario] atualizacao sem destinatario para envio de email:", {
        codigo: atual.codigo,
        nome: atual.nome_completo
      });
      return;
    }

    const assunto = "Atualizacao cadastral do beneficiario - G3 Next";
    const mensagem = montarMensagemAlteracoesBeneficiario(atual, alteracoes);

    console.info("[beneficiario] preparando email automatico de atualizacao:", {
      codigo: atual.codigo,
      nome: atual.nome_completo,
      destinatarios,
      totalAlteracoes: alteracoes.length
    });

    for (const destinatario of destinatarios) {
      try {
        await this.emailService.enviarEmailSimples({
          destinatario,
          assunto,
          mensagem
        });
        console.info("[beneficiario] email automatico de atualizacao enviado:", {
          codigo: atual.codigo,
          destinatario
        });
      } catch (error) {
        console.warn("[beneficiario] falha ao enviar email automatico de atualizacao:", {
          codigo: atual.codigo,
          destinatario,
          error
        });
      }
    }
  }
}
