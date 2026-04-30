package br.com.g3.cadastroprofissionais.domain;

import jakarta.persistence.Column;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.time.LocalDate;
import br.com.g3.unidadeassistencial.domain.Endereco;
import java.util.UUID;

@Entity
@Table(name = "cadastro_profissionais")
public class CadastroProfissional {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "nome_completo", length = 200, nullable = false)
  private String nomeCompleto;

  @Column(name = "cpf", length = 20)
  private String cpf;

  @Column(name = "data_nascimento")
  private LocalDate dataNascimento;

  @Column(name = "foto_3x4")
  private String foto3x4;

  @Column(name = "sexo_biologico", length = 60)
  private String sexoBiologico;

  @Column(name = "estado_civil", length = 60)
  private String estadoCivil;

  @Column(name = "nacionalidade", length = 120)
  private String nacionalidade;

  @Column(name = "naturalidade_cidade", length = 150)
  private String naturalidadeCidade;

  @Column(name = "naturalidade_uf", length = 2)
  private String naturalidadeUf;

  @Column(name = "nome_mae", length = 200)
  private String nomeMae;

  @Column(name = "vinculo", length = 40)
  private String vinculo;

  @Column(name = "categoria", length = 120, nullable = false)
  private String categoria;

  @Column(name = "registro_conselho", length = 120)
  private String registroConselho;

  @Column(name = "especialidade", length = 120)
  private String especialidade;

  @Column(name = "email", length = 150)
  private String email;

  @Column(name = "telefone", length = 30)
  private String telefone;

  @Column(name = "unidade", length = 200)
  private String unidade;

  @Column(name = "sala_atendimento", length = 120)
  private String salaAtendimento;

  @Column(name = "carga_horaria")
  private Integer cargaHoraria;

  @Column(name = "disponibilidade")
  private String disponibilidade;

  @Column(name = "canais_atendimento")
  private String canaisAtendimento;

  @Column(name = "status", length = 60)
  private String status;

  @Column(name = "tags")
  private String tags;

  @Column(name = "resumo")
  private String resumo;

  @Column(name = "observacoes")
  private String observacoes;

  @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)
  @JoinColumn(name = "endereco_id")
  private Endereco endereco;

  @Column(name = "criado_em", nullable = false)
  private LocalDateTime criadoEm;

  @Column(name = "atualizado_em", nullable = false)
  private LocalDateTime atualizadoEm;

  @Column(name = "tenant_id")
  private UUID tenantId;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getNomeCompleto() {
    return nomeCompleto;
  }

  public void setNomeCompleto(String nomeCompleto) {
    this.nomeCompleto = nomeCompleto;
  }

  public String getCpf() {
    return cpf;
  }

  public void setCpf(String cpf) {
    this.cpf = cpf;
  }

  public LocalDate getDataNascimento() {
    return dataNascimento;
  }

  public void setDataNascimento(LocalDate dataNascimento) {
    this.dataNascimento = dataNascimento;
  }

  public String getFoto3x4() {
    return foto3x4;
  }

  public void setFoto3x4(String foto3x4) {
    this.foto3x4 = foto3x4;
  }

  public String getSexoBiologico() {
    return sexoBiologico;
  }

  public void setSexoBiologico(String sexoBiologico) {
    this.sexoBiologico = sexoBiologico;
  }

  public String getEstadoCivil() {
    return estadoCivil;
  }

  public void setEstadoCivil(String estadoCivil) {
    this.estadoCivil = estadoCivil;
  }

  public String getNacionalidade() {
    return nacionalidade;
  }

  public void setNacionalidade(String nacionalidade) {
    this.nacionalidade = nacionalidade;
  }

  public String getNaturalidadeCidade() {
    return naturalidadeCidade;
  }

  public void setNaturalidadeCidade(String naturalidadeCidade) {
    this.naturalidadeCidade = naturalidadeCidade;
  }

  public String getNaturalidadeUf() {
    return naturalidadeUf;
  }

  public void setNaturalidadeUf(String naturalidadeUf) {
    this.naturalidadeUf = naturalidadeUf;
  }

  public String getNomeMae() {
    return nomeMae;
  }

  public void setNomeMae(String nomeMae) {
    this.nomeMae = nomeMae;
  }

  public String getVinculo() {
    return vinculo;
  }

  public void setVinculo(String vinculo) {
    this.vinculo = vinculo;
  }

  public String getCategoria() {
    return categoria;
  }

  public void setCategoria(String categoria) {
    this.categoria = categoria;
  }

  public String getRegistroConselho() {
    return registroConselho;
  }

  public void setRegistroConselho(String registroConselho) {
    this.registroConselho = registroConselho;
  }

  public String getEspecialidade() {
    return especialidade;
  }

  public void setEspecialidade(String especialidade) {
    this.especialidade = especialidade;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getTelefone() {
    return telefone;
  }

  public void setTelefone(String telefone) {
    this.telefone = telefone;
  }

  public String getUnidade() {
    return unidade;
  }

  public void setUnidade(String unidade) {
    this.unidade = unidade;
  }

  public String getSalaAtendimento() {
    return salaAtendimento;
  }

  public void setSalaAtendimento(String salaAtendimento) {
    this.salaAtendimento = salaAtendimento;
  }

  public Integer getCargaHoraria() {
    return cargaHoraria;
  }

  public void setCargaHoraria(Integer cargaHoraria) {
    this.cargaHoraria = cargaHoraria;
  }

  public String getDisponibilidade() {
    return disponibilidade;
  }

  public void setDisponibilidade(String disponibilidade) {
    this.disponibilidade = disponibilidade;
  }

  public String getCanaisAtendimento() {
    return canaisAtendimento;
  }

  public void setCanaisAtendimento(String canaisAtendimento) {
    this.canaisAtendimento = canaisAtendimento;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getTags() {
    return tags;
  }

  public void setTags(String tags) {
    this.tags = tags;
  }

  public String getResumo() {
    return resumo;
  }

  public void setResumo(String resumo) {
    this.resumo = resumo;
  }

  public String getObservacoes() {
    return observacoes;
  }

  public void setObservacoes(String observacoes) {
    this.observacoes = observacoes;
  }

  public Endereco getEndereco() {
    return endereco;
  }

  public void setEndereco(Endereco endereco) {
    this.endereco = endereco;
  }

  public LocalDateTime getCriadoEm() {
    return criadoEm;
  }

  public void setCriadoEm(LocalDateTime criadoEm) {
    this.criadoEm = criadoEm;
  }

  public LocalDateTime getAtualizadoEm() {
    return atualizadoEm;
  }

  public void setAtualizadoEm(LocalDateTime atualizadoEm) {
    this.atualizadoEm = atualizadoEm;
  }

  public UUID getTenantId() {
    return tenantId;
  }

  public void setTenantId(UUID tenantId) {
    this.tenantId = tenantId;
  }
}
