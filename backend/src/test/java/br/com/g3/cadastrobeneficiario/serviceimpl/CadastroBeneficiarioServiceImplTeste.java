package br.com.g3.cadastrobeneficiario.serviceimpl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import br.com.g3.cadastrobeneficiario.dto.CadastroBeneficiarioResponse;
import br.com.g3.cadastrobeneficiario.dto.DocumentoBeneficiarioResponse;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class CadastroBeneficiarioServiceImplTeste {

  @Test
  void listarAlteracoesEmailDeveDescreverCamposAlterados() {
    CadastroBeneficiarioResponse anterior = mock(CadastroBeneficiarioResponse.class);
    CadastroBeneficiarioResponse atual = mock(CadastroBeneficiarioResponse.class);

    when(anterior.getNomeCompleto()).thenReturn("Maria");
    when(atual.getNomeCompleto()).thenReturn("Maria da Silva");

    when(anterior.getTelefonePrincipal()).thenReturn("34999990000");
    when(atual.getTelefonePrincipal()).thenReturn("34988887777");

    when(anterior.getDataNascimento()).thenReturn(LocalDate.of(2000, 1, 10));
    when(atual.getDataNascimento()).thenReturn(LocalDate.of(2000, 1, 10));

    when(anterior.getPermiteContatoEmail()).thenReturn(Boolean.FALSE);
    when(atual.getPermiteContatoEmail()).thenReturn(Boolean.TRUE);

    when(anterior.getDocumentosObrigatorios())
        .thenReturn(List.of(new DocumentoBeneficiarioResponse(1L, "CPF", "cpf-antigo.pdf", null, null, true)));
    when(atual.getDocumentosObrigatorios())
        .thenReturn(
            List.of(
                new DocumentoBeneficiarioResponse(1L, "CPF", "cpf-atualizado.pdf", null, null, true),
                new DocumentoBeneficiarioResponse(2L, "Cartão SUS", "cartao-sus.pdf", null, null, false)));

    List<String> alteracoes =
        CadastroBeneficiarioServiceImpl.listarAlteracoesEmail(anterior, atual);

    assertTrue(
        alteracoes.contains("Nome completo: de \"Maria\" para \"Maria da Silva\"."));
    assertTrue(
        alteracoes.contains("Telefone principal: de \"34999990000\" para \"34988887777\"."));
    assertTrue(
        alteracoes.contains("Permite contato por e-mail: de \"Não\" para \"Sim\"."));
    assertTrue(
        alteracoes.contains(
            "Documentos obrigatórios: de \"CPF (cpf-antigo.pdf)\" para \"CPF (cpf-atualizado.pdf), Cartão SUS (cartao-sus.pdf)\"."));
  }

  @Test
  void listarAlteracoesEmailDeveRetornarVazioQuandoNaoHaMudancas() {
    CadastroBeneficiarioResponse anterior = mock(CadastroBeneficiarioResponse.class);
    CadastroBeneficiarioResponse atual = mock(CadastroBeneficiarioResponse.class);

    when(anterior.getNomeCompleto()).thenReturn("Maria");
    when(atual.getNomeCompleto()).thenReturn("Maria");

    when(anterior.getPermiteContatoEmail()).thenReturn(Boolean.TRUE);
    when(atual.getPermiteContatoEmail()).thenReturn(Boolean.TRUE);

    when(anterior.getDocumentosObrigatorios()).thenReturn(List.of());
    when(atual.getDocumentosObrigatorios()).thenReturn(List.of());

    List<String> alteracoes =
        CadastroBeneficiarioServiceImpl.listarAlteracoesEmail(anterior, atual);

    assertEquals(List.of(), alteracoes);
  }
}
