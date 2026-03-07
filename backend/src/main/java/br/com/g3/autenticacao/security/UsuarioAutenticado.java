package br.com.g3.autenticacao.security;

import java.util.List;

public record UsuarioAutenticado(Long id, String nomeUsuario, List<String> permissoes) {}
