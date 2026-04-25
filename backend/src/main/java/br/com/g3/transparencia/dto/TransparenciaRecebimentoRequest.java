package br.com.g3.transparencia.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public class TransparenciaRecebimentoRequest {
  private Long id;

  @Size(max = 200, message = "fonte deve ter no maximo 200 caracteres")
  private String fonte;

  @Digits(integer = 12, fraction = 2, message = "valor deve ter no maximo 12 digitos inteiros e 2 decimais")
  private BigDecimal valor;

  @Size(max = 200, message = "periodicidade deve ter no maximo 200 caracteres")
  private String periodicidade;

  @Size(max = 60, message = "status deve ter no maximo 60 caracteres")
  private String status;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getFonte() {
    return fonte;
  }

  public void setFonte(String fonte) {
    this.fonte = fonte;
  }

  public BigDecimal getValor() {
    return valor;
  }

  public void setValor(BigDecimal valor) {
    this.valor = valor;
  }

  public String getPeriodicidade() {
    return periodicidade;
  }

  public void setPeriodicidade(String periodicidade) {
    this.periodicidade = periodicidade;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }
}
