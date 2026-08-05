import bcrypt from "bcryptjs";
import { randomInt, randomUUID } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
  WebAuthnCredential
} from "@simplewebauthn/server";
import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import {
  authFaceVerificarSchema,
  authEsqueciSenhaSchema,
  authGoogleSchema,
  authLoginSchema,
  authMfaVerificarSchema,
  authPasskeyLoginOptionsSchema,
  authPasskeyLoginVerifySchema,
  authPasskeyRegisterOptionsSchema,
  authPasskeyRegisterVerifySchema
} from "../auth.schema.js";
import { AuthRepository } from "../repositories/auth.repository.js";
import { TokenService } from "./token.service.js";
import type { UsuarioAutenticado } from "../auth.types.js";
import { EmailService } from "../../email/services/email.service.js";
import { parseBase64Payload } from "../../arquivos/services/storage-utils.js";
import {
  calcularMenorDistanciaFace,
  facesConferem,
  gerarAssinaturaFace
} from "../../registro-ponto/services/registro-ponto-face.js";

const googleClient = new OAuth2Client();
const EMAIL_ADMIN_PADRAO = "htasistemas@gmail.com";
const MFA_EXPIRACAO_MS = 10 * 60 * 1000;
const PASSKEY_EXPIRACAO_MS = 5 * 60 * 1000;
const LIMITE_TENTATIVAS_LOGIN_INVALIDAS = 5;
const BLOQUEIO_TEMPORARIO_LOGIN_MS = 15 * 1000;

export class AuthService {
  private readonly repository = new AuthRepository();
  private readonly tokenService = new TokenService();
  private readonly emailService = new EmailService();

  async login(rawInput: unknown): Promise<any> {
    const input = authLoginSchema.parse(rawInput);
    const emailNormalizado = input.email?.trim().toLowerCase();
    let tenantsPorEmail: Awaited<ReturnType<AuthRepository["buscarTenantsPorEmail"]>> | undefined;
    let tenantLookup = {
      cnpj: input.cnpj,
      slug: input.slug,
      codigoInstituicao: input.codigoInstituicao
    };

    if (
      emailNormalizado &&
      !tenantLookup.cnpj &&
      !tenantLookup.slug &&
      !tenantLookup.codigoInstituicao &&
      emailNormalizado !== EMAIL_ADMIN_PADRAO
    ) {
      tenantsPorEmail = await this.repository.buscarTenantsPorEmail(emailNormalizado);
      if (tenantsPorEmail.length === 1) {
        const tenantEncontrado = tenantsPorEmail[0];
        tenantLookup = {
          cnpj: tenantEncontrado.cnpj,
          slug: tenantEncontrado.slug,
          codigoInstituicao: tenantEncontrado.codigo ?? undefined
        };
      } else if (tenantsPorEmail.length > 1) {
        throw new AppError(
          "Foi encontrado mais de um cliente com este e-mail. Informe o CNPJ, código ou slug da instituição para continuar.",
          400
        );
      }
    }

    const usuario = await this.repository.buscarUsuarioPorLogin({
      nomeUsuario: input.nomeUsuario,
      email: input.email,
      cnpj: tenantLookup.cnpj,
      slug: tenantLookup.slug,
      codigoInstituicao: tenantLookup.codigoInstituicao
    });
    const identificador = input.email ?? input.nomeUsuario ?? "";

    if (!usuario) {
      if (emailNormalizado) {
        tenantsPorEmail ??= await this.repository.buscarTenantsPorEmail(emailNormalizado);

        if (
          (tenantLookup.cnpj || tenantLookup.slug || tenantLookup.codigoInstituicao) &&
          tenantsPorEmail.length > 0 &&
          !tenantsPorEmail.some((item) => this.compararTenantLookup(item, tenantLookup))
        ) {
          throw new AppError(
            "O e-mail informado está vinculado a outra instituição. Verifique o CNPJ e o e-mail do administrador inicial cadastrado em Administração inicial.",
            401
          );
        }

        if (
          !tenantLookup.cnpj &&
          !tenantLookup.slug &&
          !tenantLookup.codigoInstituicao &&
          tenantsPorEmail.length === 1
        ) {
          const tenantEncontrado = tenantsPorEmail[0];
          tenantLookup = {
            cnpj: tenantEncontrado.cnpj,
            slug: tenantEncontrado.slug,
            codigoInstituicao: tenantEncontrado.codigo ?? undefined
          };
        }
      }

      await this.repository.registrarEventoAcesso({
        evento: "LOGIN_FALHA",
        identificador,
        detalhes_json: {
          cnpj: input.cnpj,
          slug: input.slug,
          codigoInstituicao: input.codigoInstituicao
        }
      });
      console.warn(`[auth] tentativa de login invalida para usuario: ${identificador}`);
      const possuiContextoTenant = Boolean(input.cnpj?.trim() || input.slug?.trim() || input.codigoInstituicao?.trim());
      throw new AppError(
        possuiContextoTenant
          ? "Nao foi possivel localizar o usuario informado para a instituicao. Verifique e-mail, CNPJ, codigo ou slug e tente novamente."
          : "Informe o CNPJ, codigo ou slug da instituicao para acessar este cliente.",
        401
      );
    }

    const controle = await this.repository.buscarControleAcessoPorUsuarioId(usuario.id);
    this.validarAcessoUsuario(controle?.status, usuario.instituicaoStatus, usuario.email, usuario.isSuperadmin);
    this.validarBloqueioTemporarioLogin(controle);

    const senhaValida = await bcrypt.compare(input.senha, usuario.senhaHash);
    if (!senhaValida) {
      const atualizado = await this.repository.registrarFalhaLogin(usuario.id);
      await this.repository.registrarEventoAcesso({
        tenant_id: usuario.tenantId ?? undefined,
        instituicao_id: usuario.instituicaoId ?? undefined,
        usuario_id: usuario.id,
        evento: "LOGIN_FALHA",
        identificador
      });
      console.warn(`[auth] tentativa de login invalida para usuario: ${identificador}`);
      if (this.estaEmBloqueioTemporarioLogin(atualizado)) {
        throw new AppError("Usuario temporariamente bloqueado por tentativas invalidas. Aguarde 15 segundos e tente novamente.", 429);
      }
      throw new AppError("Senha invalida para o usuario informado.", 401);
    }

    if (this.deveExigirBiometriaFacial(usuario)) {
      return this.criarFaceChallenge(usuario, identificador);
    }

    if (this.deveExigirMfa(usuario)) {
      return this.criarMfaChallenge(usuario, identificador);
    }

    await this.repository.registrarLoginSucesso(usuario.id);
    await this.repository.registrarEventoAcesso({
      tenant_id: usuario.tenantId ?? undefined,
      instituicao_id: usuario.instituicaoId ?? undefined,
      usuario_id: usuario.id,
      evento: "LOGIN_SUCESSO",
      identificador
    });

    const usuarioAutenticado = this.mapUsuarioAutenticado(usuario);
    const token = this.tokenService.gerarToken(usuarioAutenticado);

    return {
      token,
      usuario: usuarioAutenticado
    };
  }

  async loginGoogle(rawInput: unknown) {
    if (env.APP_GOOGLE_CLIENT_IDS.length === 0) {
      throw new AppError("Login com Google nao configurado no servidor.", 503);
    }

    const input = authGoogleSchema.parse(rawInput);
    const ticket = await this.validarIdTokenGoogle(input.idToken, env.APP_GOOGLE_CLIENT_IDS);
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload?.email) {
      throw new AppError("Token Google invalido.", 401);
    }

    if (payload.email_verified === false) {
      throw new AppError("Conta Google sem e-mail verificado.", 401);
    }

    const emailNormalizado = payload.email.trim().toLowerCase();
    const googleId = payload.sub;

    let usuario = await this.repository.buscarUsuarioPorGoogleId(googleId, {
      cnpj: input.cnpj,
      slug: input.slug,
      codigoInstituicao: input.codigoInstituicao
    });
    if (!usuario) {
      const usuarioPorEmail = await this.repository.buscarUsuarioPorEmail(emailNormalizado, {
        cnpj: input.cnpj,
        slug: input.slug,
        codigoInstituicao: input.codigoInstituicao
      });
      if (!usuarioPorEmail) {
        console.warn(`[auth] login google nao autorizado para email: ${emailNormalizado}`);
        throw new AppError("Usuario Google nao autorizado. Solicite acesso ao administrador.", 403);
      }

      usuario = await this.repository.vincularGooglePorUsuarioId(
        usuarioPorEmail.id,
        googleId,
        payload.picture ?? null
      );
    }

    if (!usuario) {
      throw new AppError("Usuario Google nao autorizado. Solicite acesso ao administrador.", 403);
    }

    const controle = await this.repository.buscarControleAcessoPorUsuarioId(usuario.id);
    this.validarAcessoUsuario(controle?.status, usuario.instituicaoStatus, usuario.email, usuario.isSuperadmin);
    this.validarBloqueioTemporarioLogin(controle);
    await this.repository.registrarLoginSucesso(usuario.id);
    await this.repository.registrarEventoAcesso({
      tenant_id: usuario.tenantId ?? undefined,
      instituicao_id: usuario.instituicaoId ?? undefined,
      usuario_id: usuario.id,
      evento: "LOGIN_SUCESSO_GOOGLE",
      identificador: emailNormalizado
    });

    const usuarioAutenticado = this.mapUsuarioAutenticado(usuario);
    const token = this.tokenService.gerarToken(usuarioAutenticado);

    return {
      token,
      usuario: usuarioAutenticado
    };
  }

  async verificarMfa(rawInput: unknown) {
    const input = authMfaVerificarSchema.parse(rawInput);
    const challenge = await this.repository.buscarChallenge(input.challengeId, "MFA_EMAIL");
    if (!challenge || challenge.usado_em || challenge.expirado || !challenge.usuario_id) {
      throw new AppError("Codigo de seguranca expirado ou invalido.", 401);
    }

    if (!challenge.codigo_hash || !(await bcrypt.compare(input.codigo, challenge.codigo_hash))) {
      throw new AppError("Codigo de seguranca invalido.", 401);
    }

    const usuario = await this.repository.buscarUsuarioPorId(challenge.usuario_id);
    if (!usuario) {
      throw new AppError("Usuario autenticado nao encontrado.", 401);
    }

    const controle = await this.repository.buscarControleAcessoPorUsuarioId(usuario.id);
    this.validarAcessoUsuario(controle?.status, usuario.instituicaoStatus, usuario.email, usuario.isSuperadmin);
    this.validarBloqueioTemporarioLogin(controle);

    await this.repository.marcarChallengeUsado(challenge.id);
    await this.repository.registrarLoginSucesso(usuario.id);
    await this.repository.registrarEventoAcesso({
      tenant_id: usuario.tenantId ?? undefined,
      instituicao_id: usuario.instituicaoId ?? undefined,
      usuario_id: usuario.id,
      evento: "LOGIN_SUCESSO_MFA",
      identificador: usuario.email ?? usuario.nomeUsuario
    });

    const usuarioAutenticado = this.mapUsuarioAutenticado(usuario);
    const token = this.tokenService.gerarToken(usuarioAutenticado);

    return { token, usuario: usuarioAutenticado };
  }

  async verificarFace(rawInput: unknown) {
    const input = authFaceVerificarSchema.parse(rawInput);
    const challenge = await this.repository.buscarChallenge(input.challengeId, "FACE_AUTHENTICATION");
    if (!challenge || challenge.usado_em || challenge.expirado || !challenge.usuario_id) {
      throw new AppError("Validacao facial expirada ou invalida.", 401);
    }

    const usuario = await this.repository.buscarUsuarioPorId(challenge.usuario_id);
    if (!usuario) {
      throw new AppError("Usuario autenticado nao encontrado.", 401);
    }

    const controle = await this.repository.buscarControleAcessoPorUsuarioId(usuario.id);
    this.validarAcessoUsuario(controle?.status, usuario.instituicaoStatus, usuario.email, usuario.isSuperadmin);
    this.validarBloqueioTemporarioLogin(controle);

    if (!usuario.faceHash) {
      throw new AppError("Este usuario ainda nao possui biometria facial cadastrada.", 403);
    }

    const { buffer } = parseBase64Payload(input.face_imagem, "image/jpeg");
    const faceHashAtual = await gerarAssinaturaFace(buffer);
    const distancia = calcularMenorDistanciaFace(usuario.faceHash, faceHashAtual);
    if (!facesConferem(usuario.faceHash, faceHashAtual)) {
      await this.repository.registrarEventoAcesso({
        tenant_id: usuario.tenantId ?? undefined,
        instituicao_id: usuario.instituicaoId ?? undefined,
        usuario_id: usuario.id,
        evento: "LOGIN_FACE_FALHA",
        identificador: usuario.email ?? usuario.nomeUsuario,
        detalhes_json: { distancia }
      });
      throw new AppError("A validacao facial nao conferiu com a biometria cadastrada.", 401);
    }

    await this.repository.marcarChallengeUsado(challenge.id);
    await this.repository.registrarLoginSucesso(usuario.id);
    await this.repository.registrarEventoAcesso({
      tenant_id: usuario.tenantId ?? undefined,
      instituicao_id: usuario.instituicaoId ?? undefined,
      usuario_id: usuario.id,
      evento: "LOGIN_SUCESSO_FACE",
      identificador: usuario.email ?? usuario.nomeUsuario,
      detalhes_json: { distancia }
    });

    const usuarioAutenticado = this.mapUsuarioAutenticado(usuario);
    const token = this.tokenService.gerarToken(usuarioAutenticado);

    return { token, usuario: usuarioAutenticado };
  }

  async iniciarCadastroPasskey(usuarioId: string, rawInput: unknown) {
    const input = authPasskeyRegisterOptionsSchema.parse(rawInput);
    const usuario = await this.repository.buscarUsuarioPorId(this.parseUsuarioId(usuarioId));
    if (!usuario) {
      throw new AppError("Usuario autenticado nao encontrado.", 401);
    }

    const contexto = this.resolverWebAuthnContexto(input.origin, input.host);
    const passkeys = await this.repository.listarPasskeysUsuario(usuario.id);
    const options = await generateRegistrationOptions({
      rpName: "Sistema G3 Next",
      rpID: contexto.rpID,
      userName: usuario.email ?? usuario.nomeUsuario,
      userID: new TextEncoder().encode(usuario.id.toString()),
      userDisplayName: usuario.nome ?? usuario.nomeUsuario,
      timeout: 60000,
      attestationType: "none",
      excludeCredentials: passkeys.map((item) => ({
        id: item.credential_id,
        transports: this.normalizarTransports(item.transports)
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "required"
      }
    });

    const challengeId = randomUUID();
    await this.repository.criarChallenge({
      id: challengeId,
      tipo: "PASSKEY_REGISTRATION",
      usuarioId: usuario.id,
      tenantId: usuario.tenantId,
      challenge: options.challenge,
      contexto: contexto,
      expiraEm: new Date(Date.now() + PASSKEY_EXPIRACAO_MS)
    });

    return { challengeId, options };
  }

  async concluirCadastroPasskey(usuarioId: string, rawInput: unknown) {
    const input = authPasskeyRegisterVerifySchema.parse(rawInput);
    const challenge = await this.repository.buscarChallenge(input.challengeId, "PASSKEY_REGISTRATION");
    if (!challenge || challenge.usado_em || challenge.expirado) {
      throw new AppError("Cadastro de passkey expirado ou invalido.", 401);
    }

    const usuario = await this.repository.buscarUsuarioPorId(this.parseUsuarioId(usuarioId));
    if (!usuario || challenge.usuario_id?.toString() !== usuario.id.toString()) {
      throw new AppError("Usuario autenticado invalido para cadastrar passkey.", 401);
    }

    const contexto = this.resolverWebAuthnContexto(input.origin, input.host);
    const verification = await verifyRegistrationResponse({
      response: input.response as RegistrationResponseJSON,
      expectedChallenge: challenge.challenge,
      expectedOrigin: contexto.origin,
      expectedRPID: contexto.rpID,
      requireUserVerification: true
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new AppError("Nao foi possivel validar a passkey.", 401);
    }

    const credential = verification.registrationInfo.credential;
    await this.repository.salvarPasskey({
      id: randomUUID(),
      usuarioId: usuario.id,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: (input.response as RegistrationResponseJSON).response.transports ?? [],
      deviceType: verification.registrationInfo.credentialDeviceType,
      backedUp: verification.registrationInfo.credentialBackedUp,
      nome: input.nome || "Passkey do dispositivo"
    });
    await this.repository.marcarChallengeUsado(challenge.id);
    await this.repository.registrarEventoAcesso({
      tenant_id: usuario.tenantId ?? undefined,
      instituicao_id: usuario.instituicaoId ?? undefined,
      usuario_id: usuario.id,
      evento: "PASSKEY_CADASTRADA",
      identificador: usuario.email ?? usuario.nomeUsuario
    });

    return { cadastrado: true };
  }

  async iniciarLoginPasskey(rawInput: unknown) {
    const input = authPasskeyLoginOptionsSchema.parse(rawInput);
    const usuario = await this.repository.buscarUsuarioPorEmail(input.email, {
      cnpj: input.cnpj,
      slug: input.slug,
      codigoInstituicao: input.codigoInstituicao
    });

    if (!usuario) {
      throw new AppError("Usuario nao localizado para login com passkey.", 401);
    }

    const controle = await this.repository.buscarControleAcessoPorUsuarioId(usuario.id);
    this.validarAcessoUsuario(controle?.status, usuario.instituicaoStatus, usuario.email, usuario.isSuperadmin);
    this.validarBloqueioTemporarioLogin(controle);

    if (this.deveExigirMfa(usuario)) {
      throw new AppError("Este usuario exige autenticacao segura por e-mail. Entre com CNPJ, e-mail e senha para receber a contrassenha.", 403);
    }

    if (this.deveExigirBiometriaFacial(usuario)) {
      throw new AppError("Este usuario exige biometria facial. Entre com CNPJ, e-mail e senha para validar a face.", 403);
    }

    const passkeys = await this.repository.listarPasskeysUsuario(usuario.id);
    if (passkeys.length === 0) {
      throw new AppError("Este usuario ainda nao possui passkey cadastrada.", 404);
    }

    const contexto = this.resolverWebAuthnContexto(input.origin, input.host);
    const options = await generateAuthenticationOptions({
      rpID: contexto.rpID,
      timeout: 60000,
      userVerification: "required",
      allowCredentials: passkeys.map((item) => ({
        id: item.credential_id,
        transports: this.normalizarTransports(item.transports)
      }))
    });

    const challengeId = randomUUID();
    await this.repository.criarChallenge({
      id: challengeId,
      tipo: "PASSKEY_AUTHENTICATION",
      usuarioId: usuario.id,
      tenantId: usuario.tenantId,
      challenge: options.challenge,
      contexto,
      expiraEm: new Date(Date.now() + PASSKEY_EXPIRACAO_MS)
    });

    return { challengeId, options };
  }

  async concluirLoginPasskey(rawInput: unknown) {
    const input = authPasskeyLoginVerifySchema.parse(rawInput);
    const challenge = await this.repository.buscarChallenge(input.challengeId, "PASSKEY_AUTHENTICATION");
    if (!challenge || challenge.usado_em || challenge.expirado || !challenge.usuario_id) {
      throw new AppError("Login com passkey expirado ou invalido.", 401);
    }

    const response = input.response as AuthenticationResponseJSON;
    const passkey = await this.repository.buscarPasskeyPorCredentialId(response.id);
    if (!passkey || passkey.usuario_id.toString() !== challenge.usuario_id.toString()) {
      throw new AppError("Passkey nao reconhecida para este acesso.", 401);
    }

    const contexto = this.resolverWebAuthnContexto(input.origin, input.host);
    const credential: WebAuthnCredential = {
      id: passkey.credential_id,
      publicKey: Buffer.from(passkey.public_key, "base64url"),
      counter: Number(passkey.counter ?? 0),
      transports: this.normalizarTransports(passkey.transports)
    };
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: contexto.origin,
      expectedRPID: contexto.rpID,
      credential,
      requireUserVerification: true
    });

    if (!verification.verified) {
      throw new AppError("Nao foi possivel validar a passkey.", 401);
    }

    const usuario = await this.repository.buscarUsuarioPorId(passkey.usuario_id);
    if (!usuario) {
      throw new AppError("Usuario autenticado nao encontrado.", 401);
    }
    const controle = await this.repository.buscarControleAcessoPorUsuarioId(usuario.id);
    this.validarAcessoUsuario(controle?.status, usuario.instituicaoStatus, usuario.email, usuario.isSuperadmin);
    this.validarBloqueioTemporarioLogin(controle);

    await this.repository.atualizarPasskeyCounter(passkey.credential_id, verification.authenticationInfo.newCounter);
    await this.repository.marcarChallengeUsado(challenge.id);
    await this.repository.registrarLoginSucesso(usuario.id);
    await this.repository.registrarEventoAcesso({
      tenant_id: usuario.tenantId ?? undefined,
      instituicao_id: usuario.instituicaoId ?? undefined,
      usuario_id: usuario.id,
      evento: "LOGIN_SUCESSO_PASSKEY",
      identificador: usuario.email ?? usuario.nomeUsuario
    });

    const usuarioAutenticado = this.mapUsuarioAutenticado(usuario);
    const token = this.tokenService.gerarToken(usuarioAutenticado);
    return { token, usuario: usuarioAutenticado };
  }

  async obterPerfilUsuario(id: string) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      throw new AppError("Usuario autenticado invalido.", 401);
    }

    const usuario = await this.repository.buscarUsuarioPorId(BigInt(numericId));
    if (!usuario) {
      throw new AppError("Usuario autenticado nao encontrado.", 401);
    }

    const controle = await this.repository.buscarControleAcessoPorUsuarioId(usuario.id);
    this.validarAcessoUsuario(controle?.status, usuario.instituicaoStatus, usuario.email, usuario.isSuperadmin);
    this.validarBloqueioTemporarioLogin(controle);

    return this.mapUsuarioAutenticado(usuario);
  }

  async esqueciSenha(rawInput: unknown) {
    const input = authEsqueciSenhaSchema.parse(rawInput);

    const senhaTemporaria = this.gerarSenhaTemporaria();
    const senhaHash = await bcrypt.hash(senhaTemporaria, 10);

    const usuario = await this.repository.redefinirSenhaPorEmail(input.email, senhaHash, {
      cnpj: input.cnpj,
      slug: input.slug,
      codigoInstituicao: input.codigoInstituicao
    });

    if (!usuario) {
      return {
        enviado: true
      };
    }

    if (!env.APP_EMAIL_HABILITADO && env.NODE_ENV === "development") {
      console.warn(
        `[auth] recuperacao de senha em desenvolvimento para ${usuario.email}: senha temporaria ${senhaTemporaria}`
      );
      return {
        enviado: true
      };
    }

    try {
      await this.emailService.enviarEmailRecuperacaoSenha({
        destinatario: usuario.email,
        nomeUsuario: usuario.nome ?? usuario.nome_usuario,
        senhaTemporaria
      });
    } catch (error) {
      console.error("[auth] falha ao enviar email de recuperacao", error);
      throw new AppError("Nao foi possivel enviar o email de recuperacao.", 503);
    }

    return {
      enviado: true
    };
  }

  validarToken(token: string) {
    return this.tokenService.validarToken(token);
  }

  async obterContextoTenant(rawInput: {
    cnpj?: string;
    slug?: string;
    codigoInstituicao?: string;
    host?: string;
  }) {
    return this.repository.buscarTenantContextoPublico(rawInput);
  }

  private async validarIdTokenGoogle(idToken: string, audience: string[]) {
    try {
      return await googleClient.verifyIdToken({
        idToken,
        audience
      });
    } catch {
      throw new AppError("Token Google invalido.", 401);
    }
  }

  private mapUsuarioAutenticado(usuario: Awaited<ReturnType<AuthRepository["buscarUsuarioPorLogin"]>>): UsuarioAutenticado {
    if (!usuario) {
      throw new AppError("Usuario nao encontrado.", 401);
    }

    return {
      id: usuario.id.toString(),
      nomeUsuario: usuario.nomeUsuario,
      nome: usuario.nome ?? undefined,
      email: usuario.email ?? undefined,
      tenant_id: usuario.tenantId ?? undefined,
      instituicao_id: usuario.instituicaoId ?? undefined,
      instituicao_nome: usuario.instituicaoNome ?? undefined,
      instituicao_slug: usuario.instituicaoSlug ?? undefined,
      instituicao_logo_url: usuario.instituicaoLogoUrl ?? undefined,
      cnpj: usuario.instituicaoCnpj ?? undefined,
      plano: usuario.instituicaoPlano ?? undefined,
      perfil: usuario.perfilAcesso ?? (usuario.isSuperadmin ? "MASTER" : undefined),
      is_superadmin: usuario.isSuperadmin,
      permissoes: usuario.permissoes.map((item) => item.permissao.nome)
    };
  }

  private validarAcessoUsuario(
    status?: string | null,
    statusInstituicao?: string | null,
    email?: string | null,
    isSuperadmin?: boolean | null
  ) {
    const statusNormalizado = (status ?? "").trim().toUpperCase();
    const emailNormalizado = (email ?? "").trim().toLowerCase();
    const ehEmailAdminPadrao = emailNormalizado === EMAIL_ADMIN_PADRAO;
    const ehMaster = Boolean(isSuperadmin) || ehEmailAdminPadrao;

    if (statusNormalizado === "INATIVO" && !ehMaster) {
      throw new AppError("Usuario inativo. Procure o administrador.", 403);
    }

    if (statusNormalizado === "BLOQUEADO" && !ehMaster) {
      throw new AppError("Usuario bloqueado. Procure o administrador.", 403);
    }

    const statusTenant = (statusInstituicao ?? "").trim().toUpperCase();
    if (statusTenant === "INATIVO" && !ehMaster) {
      throw new AppError("Instituicao inativa. Procure o suporte da plataforma.", 403);
    }

    if (statusTenant === "BLOQUEADO" && !ehMaster) {
      throw new AppError("Instituicao bloqueada. Regularize o acesso com o suporte da plataforma.", 403);
    }
  }

  private validarBloqueioTemporarioLogin(
    controle?: Awaited<ReturnType<AuthRepository["buscarControleAcessoPorUsuarioId"]>> | null
  ) {
    if (!this.estaEmBloqueioTemporarioLogin(controle)) {
      return;
    }

    throw new AppError("Usuario temporariamente bloqueado por tentativas invalidas. Aguarde 15 segundos e tente novamente.", 429);
  }

  private estaEmBloqueioTemporarioLogin(
    controle?: Awaited<ReturnType<AuthRepository["buscarControleAcessoPorUsuarioId"]>> | null
  ) {
    const tentativas = Number(controle?.tentativas_login_invalidas ?? 0);
    const ultimoLoginInvalido = controle?.ultimo_login_invalido_em;
    if (tentativas < LIMITE_TENTATIVAS_LOGIN_INVALIDAS || !ultimoLoginInvalido) {
      return false;
    }

    return Date.now() - ultimoLoginInvalido.getTime() < BLOQUEIO_TEMPORARIO_LOGIN_MS;
  }

  private gerarSenhaTemporaria() {
    const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let senha = "";
    for (let indice = 0; indice < 10; indice += 1) {
      const randomIndex = randomInt(alfabeto.length);
      senha += alfabeto[randomIndex];
    }
    return senha;
  }

  private async criarMfaChallenge(
    usuario: NonNullable<Awaited<ReturnType<AuthRepository["buscarUsuarioPorLogin"]>>>,
    identificador: string
  ) {
    if (!usuario.email) {
      throw new AppError("Este acesso exige verificacao adicional, mas o usuario nao possui e-mail cadastrado.", 403);
    }

    const codigo = String(randomInt(100000, 1000000));
    const challengeId = randomUUID();
    const codigoHash = await bcrypt.hash(codigo, 10);
    await this.repository.criarChallenge({
      id: challengeId,
      tipo: "MFA_EMAIL",
      usuarioId: usuario.id,
      tenantId: usuario.tenantId,
      challenge: challengeId,
      codigoHash,
      contexto: { identificador },
      expiraEm: new Date(Date.now() + MFA_EXPIRACAO_MS)
    });

    const deveEnviarEmail = env.APP_EMAIL_HABILITADO;
    if (deveEnviarEmail) {
      await this.emailService.enviarEmailCodigoMfa({
        destinatario: usuario.email,
        nomeUsuario: usuario.nome ?? usuario.nomeUsuario,
        codigo
      });
    } else if (env.NODE_ENV === "development") {
      console.warn(`[auth] codigo MFA desenvolvimento para ${usuario.email}: ${codigo}`);
    } else {
      throw new AppError("Verificacao adicional indisponivel: envio de e-mail nao configurado.", 503);
    }

    await this.repository.registrarEventoAcesso({
      tenant_id: usuario.tenantId ?? undefined,
      instituicao_id: usuario.instituicaoId ?? undefined,
      usuario_id: usuario.id,
      evento: "LOGIN_MFA_SOLICITADO",
      identificador
    });

    return {
      mfaRequired: true,
      challengeId,
      method: "email",
      maskedEmail: this.mascararEmail(usuario.email),
      fallbackEmailAvailable: false,
      devCode: env.NODE_ENV === "development" && !env.APP_EMAIL_HABILITADO ? codigo : undefined
    };
  }

  private async criarFaceChallenge(
    usuario: NonNullable<Awaited<ReturnType<AuthRepository["buscarUsuarioPorLogin"]>>>,
    identificador: string
  ) {
    if (!usuario.permitirBiometriaFacialLogin || !usuario.faceHash) {
      throw new AppError("Este usuario exige biometria facial, mas ainda nao possui face cadastrada.", 403);
    }

    const challengeId = randomUUID();
    await this.repository.criarChallenge({
      id: challengeId,
      tipo: "FACE_AUTHENTICATION",
      usuarioId: usuario.id,
      tenantId: usuario.tenantId,
      challenge: challengeId,
      contexto: { identificador },
      expiraEm: new Date(Date.now() + MFA_EXPIRACAO_MS)
    });
    await this.repository.registrarEventoAcesso({
      tenant_id: usuario.tenantId ?? undefined,
      instituicao_id: usuario.instituicaoId ?? undefined,
      usuario_id: usuario.id,
      evento: "LOGIN_FACE_SOLICITADO",
      identificador
    });

    return {
      mfaRequired: true,
      challengeId,
      method: "face",
      fallbackEmailAvailable: Boolean(usuario.email && usuario.exigirAutenticacaoSegura)
    };
  }

  private deveExigirMfa(usuario: NonNullable<Awaited<ReturnType<AuthRepository["buscarUsuarioPorLogin"]>>>) {
    return Boolean(usuario.exigirAutenticacaoSegura);
  }

  private deveExigirBiometriaFacial(
    usuario: NonNullable<Awaited<ReturnType<AuthRepository["buscarUsuarioPorLogin"]>>>
  ) {
    return Boolean(usuario.permitirBiometriaFacialLogin && usuario.exigirBiometriaFacialLogin);
  }

  private mascararEmail(email: string) {
    const [usuario, dominio] = email.split("@");
    if (!usuario || !dominio) return email;
    const inicio = usuario.slice(0, 2);
    return `${inicio}${"*".repeat(Math.max(3, usuario.length - 2))}@${dominio}`;
  }

  private parseUsuarioId(id: string) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      throw new AppError("Usuario autenticado invalido.", 401);
    }
    return BigInt(numericId);
  }

  private resolverWebAuthnContexto(origin: string, host?: string) {
    const url = new URL(origin);
    const hostname = (host?.split(":")[0] || url.hostname).trim().toLowerCase();
    const rpID = hostname || "localhost";
    return {
      origin: url.origin,
      rpID
    };
  }

  private normalizarTransports(transports?: string[] | null) {
    return (transports ?? []).filter(Boolean) as Array<"ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb">;
  }

  private compararTenantLookup(
    tenant: { cnpj?: string; slug?: string; codigo?: string | null },
    lookup: { cnpj?: string; slug?: string; codigoInstituicao?: string }
  ) {
    const cnpjAtual = tenant.cnpj?.trim().toLowerCase();
    const slugAtual = tenant.slug?.trim().toLowerCase();
    const codigoAtual = tenant.codigo?.trim().toLowerCase();
    const cnpjLookup = lookup.cnpj?.trim().toLowerCase();
    const slugLookup = lookup.slug?.trim().toLowerCase();
    const codigoLookup = lookup.codigoInstituicao?.trim().toLowerCase();

    return (
      (!!cnpjLookup && cnpjAtual === cnpjLookup) ||
      (!!slugLookup && slugAtual === slugLookup) ||
      (!!codigoLookup && codigoAtual === codigoLookup)
    );
  }
}
