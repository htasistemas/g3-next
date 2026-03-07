package br.com.g3.configuracoes.dto;

import java.util.List;

public class BeneficiarioDocumentoConfigListaRequest {
  private List<BeneficiarioDocumentoConfigDto> documents;

  public List<BeneficiarioDocumentoConfigDto> getDocuments() {
    return documents;
  }

  public void setDocuments(List<BeneficiarioDocumentoConfigDto> documents) {
    this.documents = documents;
  }
}
