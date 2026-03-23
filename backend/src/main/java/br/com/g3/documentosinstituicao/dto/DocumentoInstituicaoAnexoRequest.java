package br.com.g3.documentosinstituicao.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public class DocumentoInstituicaoAnexoRequest {
  @NotBlank(message = "Nome do arquivo e obrigatorio.")
  private String nomeArquivo;

  @NotBlank(message = "Tipo do arquivo e obrigatorio.")
  private String tipo;

  @NotBlank(message = "Tipo MIME do arquivo e obrigatorio.")
  private String tipoMime;

  private String conteudoBase64;

  private String caminhoArquivo;

  private String tamanho;

  private LocalDate dataUpload;

  @NotBlank(message = "Usuario responsavel e obrigatorio.")
  private String usuario;

  public String getNomeArquivo() {
    return nomeArquivo;
  }

  public void setNomeArquivo(String nomeArquivo) {
    this.nomeArquivo = nomeArquivo;
  }

  public String getTipo() {
    return tipo;
  }

  public void setTipo(String tipo) {
    this.tipo = tipo;
  }

  public String getTamanho() {
    return tamanho;
  }

  public void setTamanho(String tamanho) {
    this.tamanho = tamanho;
  }

  public String getTipoMime() {
    return tipoMime;
  }

  public void setTipoMime(String tipoMime) {
    this.tipoMime = tipoMime;
  }

  public String getConteudoBase64() {
    return conteudoBase64;
  }

  public void setConteudoBase64(String conteudoBase64) {
    this.conteudoBase64 = conteudoBase64;
  }

  public String getCaminhoArquivo() {
    return caminhoArquivo;
  }

  public void setCaminhoArquivo(String caminhoArquivo) {
    this.caminhoArquivo = caminhoArquivo;
  }

  public LocalDate getDataUpload() {
    return dataUpload;
  }

  public void setDataUpload(LocalDate dataUpload) {
    this.dataUpload = dataUpload;
  }

  public String getUsuario() {
    return usuario;
  }

  public void setUsuario(String usuario) {
    this.usuario = usuario;
  }
}
