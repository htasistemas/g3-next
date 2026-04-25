package br.com.g3.transparencia.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public class TransparenciaDestinacaoRequest {
  private Long id;

  @Size(max = 200, message = "titulo deve ter no maximo 200 caracteres")
  private String titulo;
  private String descricao;

  @Min(value = 0, message = "percentual deve ser maior ou igual a zero")
  @Max(value = 100, message = "percentual deve ser menor ou igual a 100")
  private Integer percentual;

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

  public Integer getPercentual() {
    return percentual;
  }

  public void setPercentual(Integer percentual) {
    this.percentual = percentual;
  }
}
