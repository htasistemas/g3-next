package br.com.g3.configuracoes.dto;

public class BeneficiarioDocumentoConfigDto {
  private Long id;
  private String nome;
  private Boolean obrigatorio;

  public BeneficiarioDocumentoConfigDto() {}

  public BeneficiarioDocumentoConfigDto(Long id, String nome, Boolean obrigatorio) {
    this.id = id;
    this.nome = nome;
    this.obrigatorio = obrigatorio;
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getNome() {
    return nome;
  }

  public void setNome(String nome) {
    this.nome = nome;
  }

  public Boolean getObrigatorio() {
    return obrigatorio;
  }

  public void setObrigatorio(Boolean obrigatorio) {
    this.obrigatorio = obrigatorio;
  }
}
