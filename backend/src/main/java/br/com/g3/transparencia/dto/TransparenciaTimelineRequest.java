package br.com.g3.transparencia.dto;

import jakarta.validation.constraints.Size;

public class TransparenciaTimelineRequest {
  private Long id;

  @Size(max = 200, message = "titulo deve ter no maximo 200 caracteres")
  private String titulo;
  private String detalhe;

  @Size(max = 30, message = "status deve ter no maximo 30 caracteres")
  private String status;

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

  public String getDetalhe() {
    return detalhe;
  }

  public void setDetalhe(String detalhe) {
    this.detalhe = detalhe;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }
}
