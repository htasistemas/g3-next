package br.com.g3.configuracoes.dto;

import java.util.List;

public class BeneficiarioDocumentoConfigListaResponse {
  private final List<BeneficiarioDocumentoConfigDto> documents;

  public BeneficiarioDocumentoConfigListaResponse(List<BeneficiarioDocumentoConfigDto> documents) {
    this.documents = documents;
  }

  public List<BeneficiarioDocumentoConfigDto> getDocuments() {
    return documents;
  }
}
