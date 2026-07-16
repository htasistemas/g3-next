import test from "node:test";
import assert from "node:assert/strict";
import { InstituicoesService } from "../services/instituicoes.service.js";

function criarServiceComRepositorioStub() {
  const service = new InstituicoesService() as unknown as {
    repository: Record<string, unknown>;
    listarUsuarios: InstituicoesService["listarUsuarios"];
    criarUsuario: InstituicoesService["criarUsuario"];
    atualizarUsuario: InstituicoesService["atualizarUsuario"];
    resetarSenhaUsuario: InstituicoesService["resetarSenhaUsuario"];
  };

  service.repository = {
    listarUsuarios: async (id: string) => ({
      id,
      usuarios: [
        {
          id_usuario: "1",
          nome_completo: "Usuário Teste",
          nome_usuario: "usuario.teste",
          email: "usuario@teste.org.br",
          permissoes: ["OPERADOR"],
          status: "ATIVO"
        }
      ],
      paginacao: {
        pagina: 1,
        tamanho_pagina: 100,
        total: 1,
        total_paginas: 1
      }
    }),
    criarUsuario: async (id: string, input: unknown, nomeUsuarioAtor?: string, idAtor?: string) => ({
      id,
      input,
      nomeUsuarioAtor,
      idAtor
    }),
    atualizarUsuario: async (id: string, usuarioId: string, input: unknown, nomeUsuarioAtor?: string, idAtor?: string) => ({
      id,
      usuarioId,
      input,
      nomeUsuarioAtor,
      idAtor
    }),
    resetarSenhaUsuario: async (id: string, usuarioId: string, input: unknown, nomeUsuarioAtor?: string, idAtor?: string) => ({
      id,
      usuarioId,
      input,
      nomeUsuarioAtor,
      idAtor
    })
  };

  return service;
}

test("listarUsuarios retorna os usuarios do tenant selecionado", async () => {
  const service = criarServiceComRepositorioStub();
  const resultado: any = await service.listarUsuarios("instituicao-1");

  assert.equal(resultado.usuarios.length, 1);
  assert.equal(resultado.usuarios[0]?.nome_usuario, "usuario.teste");
});

test("criarUsuario valida e delega o cadastro do usuario do tenant", async () => {
  const service = criarServiceComRepositorioStub();
  const resultado: any = await service.criarUsuario(
    "instituicao-1",
    {
      nome_completo: "Usuário Teste",
      nome_usuario: "usuario.teste",
      email: "usuario@teste.org.br",
      senha: "Senha#123",
      confirmar_senha: "Senha#123",
      perfil_acesso: "OPERADOR"
    },
    "master@htasistemas.com.br",
    "7"
  );

  assert.equal(resultado.id, "instituicao-1");
  assert.equal((resultado.input as { nome_usuario: string }).nome_usuario, "usuario.teste");
  assert.equal(resultado.nomeUsuarioAtor, "master@htasistemas.com.br");
  assert.equal(resultado.idAtor, "7");
});

test("atualizarUsuario valida e delega a edicao do usuario do tenant", async () => {
  const service = criarServiceComRepositorioStub();
  const resultado: any = await service.atualizarUsuario(
    "instituicao-1",
    "usuario-1",
    {
      nome_completo: "Usuário Editado",
      nome_usuario: "usuario.editado",
      email: "usuario@teste.org.br",
      perfil_acesso: "ADMINISTRADOR",
      status: "ATIVO",
      exigir_troca_senha: false
    },
    "master@htasistemas.com.br",
    "7"
  );

  assert.equal(resultado.id, "instituicao-1");
  assert.equal(resultado.usuarioId, "usuario-1");
  assert.equal((resultado.input as { nome_usuario: string }).nome_usuario, "usuario.editado");
  assert.equal(resultado.nomeUsuarioAtor, "master@htasistemas.com.br");
  assert.equal(resultado.idAtor, "7");
});

test("resetarSenhaUsuario valida e delega a redefinicao da senha do usuario do tenant", async () => {
  const service = criarServiceComRepositorioStub();
  const resultado: any = await service.resetarSenhaUsuario(
    "instituicao-1",
    "usuario-1",
    {
      nova_senha: "SenhaNova#123",
      confirmar_nova_senha: "SenhaNova#123",
      exigir_troca_senha: true
    },
    "master@htasistemas.com.br",
    "7"
  );

  assert.equal(resultado.id, "instituicao-1");
  assert.equal(resultado.usuarioId, "usuario-1");
  assert.equal((resultado.input as { nova_senha: string }).nova_senha, "SenhaNova#123");
  assert.equal(resultado.nomeUsuarioAtor, "master@htasistemas.com.br");
  assert.equal(resultado.idAtor, "7");
});
