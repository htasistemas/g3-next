import bcrypt from "bcryptjs";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { storageService } from "../../arquivos/services/storage-instance.js";
import { parseBase64Payload } from "../../arquivos/services/storage-utils.js";
import {
  registroPontoAjusteSchema,
  registroPontoFaceSchema,
  registroPontoFiltersSchema,
  registroPontoHorarioUsuarioSchema,
  registroPontoMarcarSchema,
  registroPontoOcorrenciaSchema
} from "../registro-ponto.schema.js";
import { ensureRegistroPontoEstrutura } from "../repositories/registro-ponto-estrutura.repository.js";
import { RegistroPontoRepository } from "../repositories/registro-ponto.repository.js";
import type { RegistroPontoOrigem } from "../registro-ponto.types.js";
import { calcularDistanciaHashFace, facesConferem, gerarHashFace } from "./registro-ponto-face.js";

type AtorRaw = {
  id?: string | number | bigint;
  nomeUsuario?: string;
  permissoes?: string[];
};

type UsuarioConfirmacaoRow = {
  id: bigint;
  nome_usuario: string;
  email: string | null;
  senha_hash: string;
  face_hash: string | null;
  face_foto_url: string | null;
  face_cadastrada_em: Date | null;
};

export class RegistroPontoService {
  private readonly repository = new RegistroPontoRepository();

  async listar(rawFilters: unknown, atorRaw: AtorRaw) {
    const filters = registroPontoFiltersSchema.parse(rawFilters);
    const ator = this.parseAtor(atorRaw);
    return this.repository.listar(filters, ator);
  }

  async listarEspelho(rawFilters: unknown, atorRaw: AtorRaw) {
    const filters = registroPontoFiltersSchema.parse(rawFilters);
    const ator = this.parseAtor(atorRaw);
    return this.repository.listarEspelho(filters, ator);
  }

  async listarUsuarios(rawTermo: unknown) {
    const termo = typeof rawTermo === "string" ? rawTermo : undefined;
    return this.repository.listarUsuarios(termo);
  }

  async buscarHorarioUsuario(atorRaw: AtorRaw) {
    const ator = this.parseAtor(atorRaw);
    return this.repository.buscarHorarioUsuario(ator);
  }

  async salvarHorarioUsuario(rawInput: unknown, atorRaw: AtorRaw, origem: RegistroPontoOrigem) {
    const input = registroPontoHorarioUsuarioSchema.parse(rawInput ?? {});
    const ator = this.parseAtor(atorRaw);
    return this.repository.salvarHorarioUsuario(input, ator, origem);
  }

  async buscarAlertaPendencia(atorRaw: AtorRaw) {
    const ator = this.parseAtor(atorRaw);
    return this.repository.buscarAlertaPendencia(ator);
  }

  async buscarFaceUsuario(atorRaw: AtorRaw) {
    const ator = this.parseAtor(atorRaw);
    const usuario = await this.buscarUsuarioConfirmacao(ator.id);

    if (!usuario) {
      throw new AppError("Usuario autenticado nao encontrado.", 404);
    }

    return this.mapFaceStatus(usuario);
  }

  async salvarFaceUsuario(rawInput: unknown, atorRaw: AtorRaw) {
    const input = registroPontoFaceSchema.parse(rawInput ?? {});
    const ator = this.parseAtor(atorRaw);
    const usuario = await this.buscarUsuarioConfirmacao(ator.id);

    if (!usuario) {
      throw new AppError("Usuario autenticado nao encontrado.", 404);
    }

    const { buffer } = parseBase64Payload(input.face_imagem, "image/jpeg");
    const faceHash = await gerarHashFace(buffer);
    const resultado = await storageService.salvarArquivo({
      scope: "colaborador_face",
      conteudo: input.face_imagem,
      nomeOriginal: `usuario-${ator.id?.toString() ?? "sem-id"}-face.jpg`,
      mimeType: "image/jpeg",
      entidadeId: ator.id,
      usuarioUploadId: ator.id,
      observacao: "Cadastro de face do usuario para registro de ponto"
    });

    try {
      await prisma.$executeRaw`
        UPDATE usuarios
           SET face_hash = ${faceHash},
               face_foto_url = ${resultado.caminhoArquivo},
               face_cadastrada_em = NOW(),
               atualizado_em = NOW()
         WHERE id = ${ator.id}
      `;

      await storageService.vincularEntidade(resultado.caminhoArquivo, ator.id as bigint);

      if (
        usuario.face_foto_url &&
        this.isManagedStoragePath(usuario.face_foto_url) &&
        usuario.face_foto_url !== resultado.caminhoArquivo
      ) {
        await storageService.desativarPorCaminho(usuario.face_foto_url, ator.id);
      }
    } catch (error) {
      await storageService.rollbackArquivos([resultado.caminhoArquivo]);
      throw error;
    }

    const status = await this.buscarFaceUsuario(atorRaw);
    return {
      mensagem: "Face cadastrada com sucesso.",
      ...status
    };
  }

  async marcarPonto(rawInput: unknown, atorRaw: AtorRaw, origem: RegistroPontoOrigem) {
    const input = registroPontoMarcarSchema.parse(rawInput ?? {});
    const ator = this.parseAtor(atorRaw);
    await this.validarConfirmacaoUsuario(input.usuario_login, input.senha, input.face_imagem, ator);
    return this.repository.marcarPonto(input, ator, origem);
  }

  async ajustarRegistro(
    rawRegistroId: string,
    rawInput: unknown,
    atorRaw: AtorRaw,
    origem: RegistroPontoOrigem
  ) {
    const input = registroPontoAjusteSchema.parse(rawInput);
    const ator = this.parseAtor(atorRaw);
    return this.repository.ajustarRegistro(rawRegistroId, input, ator, origem);
  }

  async adicionarOcorrencia(
    rawRegistroId: string,
    rawInput: unknown,
    atorRaw: AtorRaw,
    origem: RegistroPontoOrigem
  ) {
    const input = registroPontoOcorrenciaSchema.parse(rawInput);
    const ator = this.parseAtor(atorRaw);
    return this.repository.adicionarOcorrencia(rawRegistroId, input, ator, origem);
  }

  async buscarHistorico(rawRegistroId: string, atorRaw: AtorRaw) {
    const ator = this.parseAtor(atorRaw);
    return this.repository.buscarHistorico(rawRegistroId, ator);
  }

  private parseAtor(atorRaw: AtorRaw) {
    const nome_usuario = atorRaw.nomeUsuario?.trim();
    if (!nome_usuario) {
      throw new AppError("Usuario autenticado invalido.", 401);
    }

    const idNumerico = Number(atorRaw.id);
    const id = Number.isInteger(idNumerico) && idNumerico > 0 ? BigInt(idNumerico) : undefined;

    return {
      id,
      nome_usuario,
      permissoes: atorRaw.permissoes ?? []
    };
  }

  private async validarConfirmacaoUsuario(
    login: string,
    senha: string,
    faceImagem: string,
    ator: { id?: bigint; nome_usuario: string }
  ) {
    if (!ator.id) {
      throw new AppError("Usuario autenticado invalido.", 401);
    }

    const usuario = await this.buscarUsuarioConfirmacao(ator.id);

    if (!usuario) {
      throw new AppError("Usuario autenticado nao encontrado.", 404);
    }

    const loginNormalizado = login.trim().toLowerCase();
    const nomeUsuarioNormalizado = usuario.nome_usuario.trim().toLowerCase();
    const emailNormalizado = usuario.email?.trim().toLowerCase();

    const loginConfere =
      loginNormalizado === nomeUsuarioNormalizado ||
      (emailNormalizado ? loginNormalizado === emailNormalizado : false);

    if (!loginConfere) {
      throw new AppError("Usuario ou senha invalidos para confirmar o registro de ponto.", 401);
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaConfere) {
      throw new AppError("Usuario ou senha invalidos para confirmar o registro de ponto.", 401);
    }

    if (!usuario.face_hash) {
      throw new AppError(
        "Cadastre a face do usuario antes de registrar o ponto com validacao facial.",
        400
      );
    }

    const { buffer } = parseBase64Payload(faceImagem, "image/jpeg");
    const faceHashAtual = await gerarHashFace(buffer);
    const distancia = calcularDistanciaHashFace(usuario.face_hash, faceHashAtual);

    if (!facesConferem(usuario.face_hash, faceHashAtual)) {
      throw new AppError(
        `A validacao facial nao conferiu com a face cadastrada para este usuario. Distancia calculada: ${distancia}.`,
        401
      );
    }
  }

  private async buscarUsuarioConfirmacao(usuarioId?: bigint) {
    if (!usuarioId) {
      return null;
    }

    await ensureRegistroPontoEstrutura(prisma);

    const rows = await prisma.$queryRaw<UsuarioConfirmacaoRow[]>`
      SELECT
        id,
        nome_usuario,
        email,
        senha_hash,
        face_hash,
        face_foto_url,
        face_cadastrada_em
      FROM usuarios
      WHERE id = ${usuarioId}
      LIMIT 1
    `;

    return rows[0] ?? null;
  }

  private mapFaceStatus(usuario: UsuarioConfirmacaoRow) {
    return {
      face_cadastrada: Boolean(usuario.face_hash && usuario.face_foto_url),
      face_url: usuario.face_foto_url ?? undefined,
      face_cadastrada_em: usuario.face_cadastrada_em?.toISOString()
    };
  }

  private isManagedStoragePath(valor?: string | null) {
    if (!valor?.trim()) return false;
    const normalized = valor.trim();
    return !normalized.startsWith("data:") && !/^https?:\/\//i.test(normalized);
  }
}
