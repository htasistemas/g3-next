package br.com.g3.cadastrobeneficiario.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Size;

public class DocumentoUploadRequest {
  @JsonProperty("id")
  private Long id;

  @Size(max = 200)
  @JsonProperty("nome")
  private String nome;

  @JsonProperty("obrigatorio")
  private Boolean obrigatorio;

  @Size(max = 200)
  @JsonProperty("nomeArquivo")
  private String nomeArquivo;

  @JsonProperty("conteudo")
  private String conteudo;

  @Size(max = 120)
  @JsonProperty("contentType")
  private String contentType;

  @Size(max = 400)
  @JsonProperty("caminhoArquivo")
  private String caminhoArquivo;

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

  public String getNomeArquivo() {
    return nomeArquivo;
  }

  public void setNomeArquivo(String nomeArquivo) {
    this.nomeArquivo = nomeArquivo;
  }

  public String getConteudo() {
    return conteudo;
  }

  public void setConteudo(String conteudo) {
    this.conteudo = conteudo;
  }

  public String getContentType() {
    return contentType;
  }

  public void setContentType(String contentType) {
    this.contentType = contentType;
  }

  public String getCaminhoArquivo() {
    return caminhoArquivo;
  }

  public void setCaminhoArquivo(String caminhoArquivo) {
    this.caminhoArquivo = caminhoArquivo;
  }
}
