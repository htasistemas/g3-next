import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { AppError } from "../../../shared/errors/app-error.js";
import { AuthService } from "../services/auth.service.js";

function criarServiceComStubs(stubs: {
  usuario: Record<string, unknown> | null;
  controle?: {
    status?: string | null;
    tentativas_login_invalidas?: number | bigint | null;
    ultimo_login_invalido_em?: Date | null;
  } | null;
  tenantsPorEmail?: Array<{ cnpj: string; slug: string; codigo?: string | null }>;
  falhaLoginRetorno?: {
    status?: string | null;
    tentativas_login_invalidas?: number | bigint | null;
    ultimo_login_invalido_em?: Date | null;
  } | null;
  exigirMfa?: boolean;
  exigirFace?: boolean;
  passkeys?: Array<{
    id: string;
    usuario_id: bigint;
    credential_id: string;
    public_key: string;
    counter: number;
    transports: string[];
    device_type: string | null;
    backed_up: boolean;
    nome: string | null;
  }>;
}) {
  const service = new AuthService() as unknown as {
    repository: Record<string, unknown>;
    tokenService: { gerarToken: (usuario: unknown) => string };
    emailService: Record<string, unknown>;
    deveExigirMfa: (usuario?: unknown) => boolean;
    deveExigirBiometriaFacial: () => boolean;
    login: AuthService["login"];
  };

  service.repository = {
    buscarTenantsPorEmail: async () =>
      stubs.tenantsPorEmail?.map((item, indice) => ({
        tenant_id: `tenant-${indice + 1}`,
        cnpj: item.cnpj,
        slug: item.slug,
        codigo: item.codigo ?? null,
        usuario_id: BigInt(indice + 1),
        email: "admin@cliente.org.br"
      })) ?? [],
    buscarUsuarioPorLogin: async () => stubs.usuario,
    buscarControleAcessoPorUsuarioId: async () => stubs.controle ?? null,
    registrarLoginSucesso: async () => undefined,
    registrarEventoAcesso: async () => undefined,
    registrarFalhaLogin: async () => stubs.falhaLoginRetorno ?? undefined,
    listarPasskeysUsuario: async () => stubs.passkeys ?? [],
    criarChallenge: async () => undefined
  };

  service.tokenService = {
    gerarToken: () => "token-teste"
  };

  service.emailService = {
    enviarEmailCodigoMfa: async () => undefined
  };
  service.deveExigirMfa = (usuario: any) =>
    Boolean(stubs.exigirMfa) ||
    Boolean(usuario?.exigirAutenticacaoSegura) ||
    Boolean(usuario?.isSuperadmin) ||
    usuario?.email?.trim().toLowerCase() === "htasistemas@gmail.com";
  service.deveExigirBiometriaFacial = () => Boolean(stubs.exigirFace);

  return service;
}

test("login master ignora status bloqueado da instituicao vinculada", async () => {
  const senhaHash = await bcrypt.hash("Senha#123", 10);
  const service = criarServiceComStubs({
    usuario: {
      id: BigInt(1),
      nomeUsuario: "htasistemas@gmail.com",
      nome: "Master",
      email: "htasistemas@gmail.com",
      senhaHash,
      googleId: null,
      tenantId: "tenant-1",
      instituicaoId: "instituicao-1",
      instituicaoNome: "Instituicao Master",
      instituicaoSlug: "master",
      instituicaoCnpj: "00000000000000",
      instituicaoPlano: "profissional",
      instituicaoStatus: "BLOQUEADO",
      instituicaoLogoUrl: null,
      isSuperadmin: true,
      perfilAcesso: "MASTER",
      permissoes: []
    },
    controle: { status: "ATIVO" }
  });

  const resultado = await service.login({
    email: "htasistemas@gmail.com",
    senha: "Senha#123"
  });

  assert.equal(resultado.mfaRequired, true);
  assert.equal(resultado.method, "email");
  assert.ok(resultado.challengeId);
});

test("login nao master continua respeitando status da instituicao", async () => {
  const senhaHash = await bcrypt.hash("Senha#123", 10);
  const service = criarServiceComStubs({
    usuario: {
      id: BigInt(2),
      nomeUsuario: "operador",
      nome: "Operador",
      email: "operador@instituicao.org.br",
      senhaHash,
      googleId: null,
      tenantId: "tenant-2",
      instituicaoId: "instituicao-2",
      instituicaoNome: "Instituicao",
      instituicaoSlug: "instituicao",
      instituicaoCnpj: "11111111000111",
      instituicaoPlano: "profissional",
      instituicaoStatus: "BLOQUEADO",
      instituicaoLogoUrl: null,
      isSuperadmin: false,
      perfilAcesso: "ADMINISTRADOR",
      permissoes: []
    },
    controle: { status: "ATIVO" }
  });

  await assert.rejects(
    () =>
      service.login({
        email: "operador@instituicao.org.br",
        cnpj: "11.111.111/0001-11",
        senha: "Senha#123"
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.message, "Instituicao bloqueada. Regularize o acesso com o suporte da plataforma.");
      assert.equal(error.statusCode, 403);
      return true;
    }
  );
});

test("login do administrador inicial de novo cliente funciona com email, senha e CNPJ", async () => {
  const senhaHash = await bcrypt.hash("_Adm@3c5x9cfg", 10);
  const service = criarServiceComStubs({
    usuario: {
      id: BigInt(3),
      nomeUsuario: "admincliente",
      nome: "Administrador Cliente",
      email: "admin@cliente.org.br",
      senhaHash,
      googleId: null,
      tenantId: "tenant-3",
      instituicaoId: "instituicao-3",
      instituicaoNome: "Cliente Novo",
      instituicaoSlug: "cliente-novo",
      instituicaoCnpj: "12345678000199",
      instituicaoPlano: "essencial",
      instituicaoStatus: "ATIVO",
      instituicaoLogoUrl: null,
      isSuperadmin: false,
      perfilAcesso: "ADMINISTRADOR",
      permissoes: []
    },
    controle: { status: "ATIVO" }
  });

  const resultado = await service.login({
    email: "admin@cliente.org.br",
    cnpj: "12.345.678/0001-99",
    senha: "_Adm@3c5x9cfg"
  });

  assert.equal(resultado.token, "token-teste");
  assert.equal(resultado.usuario.email, "admin@cliente.org.br");
  assert.equal(resultado.usuario.is_superadmin, false);
});

test("login pode identificar a instituição pelo e-mail quando o tenant for unico", async () => {
  const senhaHash = await bcrypt.hash("Senha#123", 10);
  const service = criarServiceComStubs({
    tenantsPorEmail: [{ cnpj: "12345678000199", slug: "cliente-novo", codigo: "CLN" }],
    usuario: {
      id: BigInt(4),
      nomeUsuario: "admincliente",
      nome: "Administrador Cliente",
      email: "admin@cliente.org.br",
      senhaHash,
      googleId: null,
      tenantId: "tenant-4",
      instituicaoId: "instituicao-4",
      instituicaoNome: "Cliente Novo",
      instituicaoSlug: "cliente-novo",
      instituicaoCnpj: "12345678000199",
      instituicaoPlano: "essencial",
      instituicaoStatus: "ATIVO",
      instituicaoLogoUrl: null,
      isSuperadmin: false,
      perfilAcesso: "ADMINISTRADOR",
      permissoes: []
    },
    controle: { status: "ATIVO" }
  });

  const resultado = await service.login({
    email: "admin@cliente.org.br",
    senha: "Senha#123"
  });

  assert.equal(resultado.token, "token-teste");
  assert.equal(resultado.usuario.instituicao_slug, "cliente-novo");
});

test("login informa quando o e-mail pertence a outra instituicao", async () => {
  const service = criarServiceComStubs({
    tenantsPorEmail: [{ cnpj: "99999999000199", slug: "outra-instituicao", codigo: "OUT" }],
    usuario: null,
    controle: null
  });

  service.repository.buscarUsuarioPorLogin = async () => null;
  service.repository.buscarTenantsPorEmail = async () => [
    {
      tenant_id: "tenant-9",
      cnpj: "99999999000199",
      slug: "outra-instituicao",
      codigo: "OUT",
      usuario_id: BigInt(9),
      email: "admin@outra.org.br"
    }
  ];

  await assert.rejects(
    () =>
      service.login({
        email: "admin@cliente.org.br",
        cnpj: "12.345.678/0001-99",
        senha: "Senha#123"
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(
        error.message,
        "O e-mail informado está vinculado a outra instituição. Verifique o CNPJ e o e-mail do administrador inicial cadastrado em Administração inicial."
      );
      assert.equal(error.statusCode, 401);
      return true;
    }
  );
});

test("login bloqueia temporariamente por 15 segundos sem depender de status bloqueado", async () => {
  const senhaHash = await bcrypt.hash("Senha#123", 10);
  const service = criarServiceComStubs({
    usuario: {
      id: BigInt(5),
      nomeUsuario: "operador",
      nome: "Operador",
      email: "operador@instituicao.org.br",
      senhaHash,
      googleId: null,
      tenantId: "tenant-5",
      instituicaoId: "instituicao-5",
      instituicaoNome: "Instituicao",
      instituicaoSlug: "instituicao",
      instituicaoCnpj: "11111111000111",
      instituicaoPlano: "profissional",
      instituicaoStatus: "ATIVO",
      instituicaoLogoUrl: null,
      isSuperadmin: false,
      perfilAcesso: "OPERADOR",
      permissoes: []
    },
    controle: {
      status: "ATIVO",
      tentativas_login_invalidas: 5,
      ultimo_login_invalido_em: new Date()
    }
  });

  await assert.rejects(
    () =>
      service.login({
        email: "operador@instituicao.org.br",
        cnpj: "11.111.111/0001-11",
        senha: "Senha#123"
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(
        error.message,
        "Usuario temporariamente bloqueado por tentativas invalidas. Aguarde 15 segundos e tente novamente."
      );
      assert.equal(error.statusCode, 429);
      return true;
    }
  );
});

test("quinta senha invalida gera bloqueio temporario sem status definitivo", async () => {
  const senhaHash = await bcrypt.hash("Senha#123", 10);
  const agora = new Date();
  const service = criarServiceComStubs({
    usuario: {
      id: BigInt(6),
      nomeUsuario: "operador",
      nome: "Operador",
      email: "operador@instituicao.org.br",
      senhaHash,
      googleId: null,
      tenantId: "tenant-6",
      instituicaoId: "instituicao-6",
      instituicaoNome: "Instituicao",
      instituicaoSlug: "instituicao",
      instituicaoCnpj: "11111111000111",
      instituicaoPlano: "profissional",
      instituicaoStatus: "ATIVO",
      instituicaoLogoUrl: null,
      isSuperadmin: false,
      perfilAcesso: "OPERADOR",
      permissoes: []
    },
    controle: {
      status: "ATIVO",
      tentativas_login_invalidas: 4,
      ultimo_login_invalido_em: new Date(Date.now() - 60_000)
    },
    falhaLoginRetorno: {
      status: "ATIVO",
      tentativas_login_invalidas: 5,
      ultimo_login_invalido_em: agora
    }
  });

  await assert.rejects(
    () =>
      service.login({
        email: "operador@instituicao.org.br",
        cnpj: "11.111.111/0001-11",
        senha: "Senha#errada"
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(
        error.message,
        "Usuario temporariamente bloqueado por tentativas invalidas. Aguarde 15 segundos e tente novamente."
      );
      assert.equal(error.statusCode, 429);
      return true;
    }
  );
});

test("login com autenticacao segura exige codigo por email mesmo com passkey disponivel", async () => {
  const senhaHash = await bcrypt.hash("Senha#123", 10);
  const service = criarServiceComStubs({
    exigirMfa: true,
    passkeys: [
      {
        id: "passkey-1",
        usuario_id: BigInt(7),
        credential_id: "credential-passkey-teste",
        public_key: "public-key",
        counter: 0,
        transports: ["internal"],
        device_type: "singleDevice",
        backed_up: false,
        nome: "Dispositivo"
      }
    ],
    usuario: {
      id: BigInt(7),
      nomeUsuario: "admin",
      nome: "Administrador",
      email: "admin@instituicao.org.br",
      senhaHash,
      googleId: null,
      tenantId: "tenant-7",
      instituicaoId: "instituicao-7",
      instituicaoNome: "Instituicao",
      instituicaoSlug: "instituicao",
      instituicaoCnpj: "11111111000111",
      instituicaoPlano: "profissional",
      instituicaoStatus: "ATIVO",
      instituicaoLogoUrl: null,
      isSuperadmin: false,
      perfilAcesso: "ADMINISTRADOR",
      exigirAutenticacaoSegura: true,
      permissoes: []
    },
    controle: { status: "ATIVO" }
  });

  const resultado = await service.login({
    email: "admin@instituicao.org.br",
    cnpj: "11.111.111/0001-11",
    senha: "Senha#123",
    origin: "http://localhost:5173"
  });

  assert.equal(resultado.mfaRequired, true);
  assert.equal(resultado.method, "email");
  assert.ok(resultado.challengeId);
  assert.equal(resultado.maskedEmail, "ad***@instituicao.org.br");
});

test("login com biometria facial obrigatoria gera desafio facial apos senha", async () => {
  const senhaHash = await bcrypt.hash("Senha#123", 10);
  const service = criarServiceComStubs({
    exigirFace: true,
    usuario: {
      id: BigInt(9),
      nomeUsuario: "operador",
      nome: "Operador",
      email: "operador@instituicao.org.br",
      senhaHash,
      googleId: null,
      tenantId: "tenant-9",
      instituicaoId: "instituicao-9",
      instituicaoNome: "Instituicao",
      instituicaoSlug: "instituicao",
      instituicaoCnpj: "11111111000111",
      instituicaoPlano: "profissional",
      instituicaoStatus: "ATIVO",
      instituicaoLogoUrl: null,
      isSuperadmin: false,
      perfilAcesso: "OPERADOR",
      exigirAutenticacaoSegura: false,
      permitirBiometriaFacialLogin: true,
      exigirBiometriaFacialLogin: true,
      faceHash: "face-hash",
      permissoes: []
    },
    controle: { status: "ATIVO" }
  });

  const resultado = await service.login({
    email: "operador@instituicao.org.br",
    cnpj: "11.111.111/0001-11",
    senha: "Senha#123",
    origin: "http://localhost:5173"
  });

  assert.equal(resultado.mfaRequired, true);
  assert.equal(resultado.method, "face");
  assert.ok(resultado.challengeId);
});

test("login direto com passkey respeita usuario com autenticacao segura por email", async () => {
  const service = new AuthService() as unknown as {
    repository: Record<string, unknown>;
    deveExigirMfa: (usuario: Record<string, unknown>) => boolean;
    iniciarLoginPasskey: AuthService["iniciarLoginPasskey"];
  };

  service.repository = {
    buscarUsuarioPorEmail: async () => ({
      id: BigInt(7),
      nomeUsuario: "admin",
      nome: "Administrador",
      email: "admin@instituicao.org.br",
      senhaHash: "hash",
      googleId: null,
      tenantId: "tenant-7",
      instituicaoId: "instituicao-7",
      instituicaoNome: "Instituicao",
      instituicaoSlug: "instituicao",
      instituicaoCnpj: "11111111000111",
      instituicaoPlano: "profissional",
      instituicaoStatus: "ATIVO",
      instituicaoLogoUrl: null,
      isSuperadmin: false,
      perfilAcesso: "ADMINISTRADOR",
      exigirAutenticacaoSegura: true,
      permissoes: []
    }),
    buscarControleAcessoPorUsuarioId: async () => ({ status: "ATIVO" })
  };
  service.deveExigirMfa = (usuario) => Boolean(usuario.exigirAutenticacaoSegura);

  await assert.rejects(
    () =>
      service.iniciarLoginPasskey({
        email: "admin@instituicao.org.br",
        cnpj: "11.111.111/0001-11",
        origin: "http://localhost:5173"
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(
        error.message,
        "Este usuario exige autenticacao segura por e-mail. Entre com CNPJ, e-mail e senha para receber a contrassenha."
      );
      assert.equal(error.statusCode, 403);
      return true;
    }
  );
});

test("verificacao MFA respeita validade calculada pelo banco e nao o timezone do Node", async () => {
  const codigoHash = await bcrypt.hash("123456", 10);
  const service = new AuthService() as unknown as {
    repository: Record<string, unknown>;
    tokenService: { gerarToken: (usuario: unknown) => string };
    verificarMfa: AuthService["verificarMfa"];
  };

  service.repository = {
    buscarChallenge: async () => ({
      id: "11111111-1111-4111-8111-111111111111",
      tipo: "MFA_EMAIL",
      usuario_id: BigInt(8),
      tenant_id: "tenant-8",
      challenge: "11111111-1111-4111-8111-111111111111",
      codigo_hash: codigoHash,
      contexto_json: null,
      expira_em: new Date(Date.now() - 60_000),
      usado_em: null,
      expirado: false
    }),
    buscarUsuarioPorId: async () => ({
      id: BigInt(8),
      nomeUsuario: "admin",
      nome: "Administrador",
      email: "admin@instituicao.org.br",
      senhaHash: "",
      googleId: null,
      tenantId: "tenant-8",
      instituicaoId: "instituicao-8",
      instituicaoNome: "Instituicao",
      instituicaoSlug: "instituicao",
      instituicaoCnpj: "11111111000111",
      instituicaoPlano: "profissional",
      instituicaoStatus: "ATIVO",
      instituicaoLogoUrl: null,
      isSuperadmin: false,
      perfilAcesso: "ADMINISTRADOR",
      permissoes: []
    }),
    buscarControleAcessoPorUsuarioId: async () => ({ status: "ATIVO" }),
    marcarChallengeUsado: async () => undefined,
    registrarLoginSucesso: async () => undefined,
    registrarEventoAcesso: async () => undefined
  };
  service.tokenService = {
    gerarToken: () => "token-teste"
  };

  const resultado = await service.verificarMfa({
    challengeId: "11111111-1111-4111-8111-111111111111",
    codigo: "123456"
  });

  assert.equal(resultado.token, "token-teste");
});
