package br.com.g3.shared.service;

import java.util.List;

public interface EmailService {
  void enviarRecuperacaoSenha(String destinatario, String nome, String token, String validade);

  void enviarChamadoTecnico(String destinatario, br.com.g3.chamadotecnico.dto.ChamadoTecnicoResponse chamado);

  void enviarCadastroBeneficiario(String destinatario, String nome, String codigo);

  void enviarAtualizacaoBeneficiario(String destinatario, String nome, String codigo);

  void enviarAtualizacaoBeneficiario(
      String destinatario, String nome, String codigo, List<String> alteracoes);

  void enviarAlertasSistema(String destinatario, java.util.List<String> alertas, String frequenciaEnvio);
}
