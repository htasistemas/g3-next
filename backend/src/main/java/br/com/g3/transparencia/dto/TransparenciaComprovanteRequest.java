package br.com.g3.transparencia.dto;

import jakarta.validation.constraints.Size;

public class TransparenciaComprovanteRequest {
  private Long id;

  @Size(max = 200, message = "titulo deve ter no maximo 200 caracteres")
  private String titulo;
  private String descricao;

  @Size(max = 255, message = "arquivoNome deve ter no maximo 255 caracteres")
  private String arquivoNome;
  private String arquivoUrl;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getTitulo() {
    return titulo;
  }

  public void setTitulo(String titulo) {
    this.titulo = titulo;
  }

  public String getDescricao() {
    return descricao;
  }

  public void setDescricao(String descricao) {
    this.descricao = descricao;
  }

  public String getArquivoNome() {
    return arquivoNome;
  }

  public void setArquivoNome(String arquivoNome) {
    this.arquivoNome = arquivoNome;
  }

  public String getArquivoUrl() {
    return arquivoUrl;
  }

  public void setArquivoUrl(String arquivoUrl) {
    this.arquivoUrl = arquivoUrl;
  }
}
