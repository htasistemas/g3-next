package br.com.g3.autenticacao.security;

import java.util.List;

public record TokenAutenticacaoPayload(
    Long usuarioId,
    String nomeUsuario,
    List<String> permissoes,
    long expiracaoEpochSeconds) {}
