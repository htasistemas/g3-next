package br.com.g3.transparencia.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public class TransparenciaRequest {
  private Long unidadeId;

  @Digits(integer = 12, fraction = 2, message = "totalRecebido deve ter no maximo 12 digitos inteiros e 2 decimais")
  private BigDecimal totalRecebido;

  @Size(max = 200, message = "totalRecebidoHelper deve ter no maximo 200 caracteres")
  private String totalRecebidoHelper;

  @Digits(integer = 12, fraction = 2, message = "totalAplicado deve ter no maximo 12 digitos inteiros e 2 decimais")
  private BigDecimal totalAplicado;

  @Size(max = 200, message = "totalAplicadoHelper deve ter no maximo 200 caracteres")
  private String totalAplicadoHelper;

  @Digits(integer = 12, fraction = 2, message = "saldoDisponivel deve ter no maximo 12 digitos inteiros e 2 decimais")
  private BigDecimal saldoDisponivel;

  @Size(max = 200, message = "saldoDisponivelHelper deve ter no maximo 200 caracteres")
  private String saldoDisponivelHelper;

  @Digits(integer = 12, fraction = 2, message = "prestadoMes deve ter no maximo 12 digitos inteiros e 2 decimais")
  private BigDecimal prestadoMes;

  @Size(max = 200, message = "prestadoMesHelper deve ter no maximo 200 caracteres")
  private String prestadoMesHelper;

  @Valid
  private List<TransparenciaRecebimentoRequest> recebimentos;

  @Valid
  private List<TransparenciaDestinacaoRequest> destinacoes;

  @Valid
  private List<TransparenciaComprovanteRequest> comprovantes;

  @Valid
  private List<TransparenciaTimelineRequest> timelines;

  @Valid
  private List<TransparenciaChecklistRequest> checklist;

  public Long getUnidadeId() {
    return unidadeId;
  }

  public void setUnidadeId(Long unidadeId) {
    this.unidadeId = unidadeId;
  }

  public BigDecimal getTotalRecebido() {
    return totalRecebido;
  }

  public void setTotalRecebido(BigDecimal totalRecebido) {
    this.totalRecebido = totalRecebido;
  }

  public String getTotalRecebidoHelper() {
    return totalRecebidoHelper;
  }

  public void setTotalRecebidoHelper(String totalRecebidoHelper) {
    this.totalRecebidoHelper = totalRecebidoHelper;
  }

  public BigDecimal getTotalAplicado() {
    return totalAplicado;
  }

  public void setTotalAplicado(BigDecimal totalAplicado) {
    this.totalAplicado = totalAplicado;
  }

  public String getTotalAplicadoHelper() {
    return totalAplicadoHelper;
  }

  public void setTotalAplicadoHelper(String totalAplicadoHelper) {
    this.totalAplicadoHelper = totalAplicadoHelper;
  }

  public BigDecimal getSaldoDisponivel() {
    return saldoDisponivel;
  }

  public void setSaldoDisponivel(BigDecimal saldoDisponivel) {
    this.saldoDisponivel = saldoDisponivel;
  }

  public String getSaldoDisponivelHelper() {
    return saldoDisponivelHelper;
  }

  public void setSaldoDisponivelHelper(String saldoDisponivelHelper) {
    this.saldoDisponivelHelper = saldoDisponivelHelper;
  }

  public BigDecimal getPrestadoMes() {
    return prestadoMes;
  }

  public void setPrestadoMes(BigDecimal prestadoMes) {
    this.prestadoMes = prestadoMes;
  }

  public String getPrestadoMesHelper() {
    return prestadoMesHelper;
  }

  public void setPrestadoMesHelper(String prestadoMesHelper) {
    this.prestadoMesHelper = prestadoMesHelper;
  }

  public List<TransparenciaRecebimentoRequest> getRecebimentos() {
    return recebimentos;
  }

  public void setRecebimentos(List<TransparenciaRecebimentoRequest> recebimentos) {
    this.recebimentos = recebimentos;
  }

  public List<TransparenciaDestinacaoRequest> getDestinacoes() {
    return destinacoes;
  }

  public void setDestinacoes(List<TransparenciaDestinacaoRequest> destinacoes) {
    this.destinacoes = destinacoes;
  }

  public List<TransparenciaComprovanteRequest> getComprovantes() {
    return comprovantes;
  }

  public void setComprovantes(List<TransparenciaComprovanteRequest> comprovantes) {
    this.comprovantes = comprovantes;
  }

  public List<TransparenciaTimelineRequest> getTimelines() {
    return timelines;
  }

  public void setTimelines(List<TransparenciaTimelineRequest> timelines) {
    this.timelines = timelines;
  }

  public List<TransparenciaChecklistRequest> getChecklist() {
    return checklist;
  }

  public void setChecklist(List<TransparenciaChecklistRequest> checklist) {
    this.checklist = checklist;
  }
}
