import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { AppError } from "../../../shared/errors/app-error.js";
import { AuthService } from "../services/auth.service.js";

function criarServiceComStubs(stubs: {
  usuario: Record<string, unknown> | null;
  controle?: { status?: string | null } | null;
  tenantsPorEmail?: Array<{ cnpj: string; slug: string; codigo?: string | null }>;
}) {
  const service = new AuthService() as unknown as {
    repository: Record<string, unknown>;
    tokenService: { gerarToken: (usuario: unknown) => string };
    emailService: Record<string, unknown>;
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
    registrarFalhaLogin: async () => undefined
  };

  service.tokenService = {
    gerarToken: () => "token-teste"
  };

  service.emailService = {};

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

  assert.equal(resultado.token, "token-teste");
  assert.equal(resultado.usuario.is_superadmin, true);
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
