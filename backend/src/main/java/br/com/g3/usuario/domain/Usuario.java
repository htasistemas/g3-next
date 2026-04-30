package br.com.g3.usuario.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "usuarios")
public class Usuario {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "nome_usuario", length = 120, nullable = false)
  private String nomeUsuario;

  @Column(name = "nome", length = 150)
  private String nome;

  @Column(name = "email", length = 150)
  private String email;

  @Column(name = "senha_hash", length = 255, nullable = false)
  private String senhaHash;

  @Column(name = "google_id", length = 80)
  private String googleId;

  @Column(name = "foto_url", length = 255)
  private String fotoUrl;

  @Column(name = "horario_entrada_1")
  private LocalTime horarioEntrada1;

  @Column(name = "horario_saida_1")
  private LocalTime horarioSaida1;

  @Column(name = "horario_entrada_2")
  private LocalTime horarioEntrada2;

  @Column(name = "horario_saida_2")
  private LocalTime horarioSaida2;

  @Column(name = "horario_segunda_entrada_1")
  private LocalTime horarioSegundaEntrada1;

  @Column(name = "horario_segunda_saida_1")
  private LocalTime horarioSegundaSaida1;

  @Column(name = "horario_segunda_entrada_2")
  private LocalTime horarioSegundaEntrada2;

  @Column(name = "horario_segunda_saida_2")
  private LocalTime horarioSegundaSaida2;

  @Column(name = "horario_terca_entrada_1")
  private LocalTime horarioTercaEntrada1;

  @Column(name = "horario_terca_saida_1")
  private LocalTime horarioTercaSaida1;

  @Column(name = "horario_terca_entrada_2")
  private LocalTime horarioTercaEntrada2;

  @Column(name = "horario_terca_saida_2")
  private LocalTime horarioTercaSaida2;

  @Column(name = "horario_quarta_entrada_1")
  private LocalTime horarioQuartaEntrada1;

  @Column(name = "horario_quarta_saida_1")
  private LocalTime horarioQuartaSaida1;

  @Column(name = "horario_quarta_entrada_2")
  private LocalTime horarioQuartaEntrada2;

  @Column(name = "horario_quarta_saida_2")
  private LocalTime horarioQuartaSaida2;

  @Column(name = "horario_quinta_entrada_1")
  private LocalTime horarioQuintaEntrada1;

  @Column(name = "horario_quinta_saida_1")
  private LocalTime horarioQuintaSaida1;

  @Column(name = "horario_quinta_entrada_2")
  private LocalTime horarioQuintaEntrada2;

  @Column(name = "horario_quinta_saida_2")
  private LocalTime horarioQuintaSaida2;

  @Column(name = "horario_sexta_entrada_1")
  private LocalTime horarioSextaEntrada1;

  @Column(name = "horario_sexta_saida_1")
  private LocalTime horarioSextaSaida1;

  @Column(name = "horario_sexta_entrada_2")
  private LocalTime horarioSextaEntrada2;

  @Column(name = "horario_sexta_saida_2")
  private LocalTime horarioSextaSaida2;

  @Column(name = "horario_sabado_entrada_1")
  private LocalTime horarioSabadoEntrada1;

  @Column(name = "horario_sabado_saida_1")
  private LocalTime horarioSabadoSaida1;

  @Column(name = "horario_sabado_entrada_2")
  private LocalTime horarioSabadoEntrada2;

  @Column(name = "horario_sabado_saida_2")
  private LocalTime horarioSabadoSaida2;

  @Column(name = "horario_domingo_entrada_1")
  private LocalTime horarioDomingoEntrada1;

  @Column(name = "horario_domingo_saida_1")
  private LocalTime horarioDomingoSaida1;

  @Column(name = "horario_domingo_entrada_2")
  private LocalTime horarioDomingoEntrada2;

  @Column(name = "horario_domingo_saida_2")
  private LocalTime horarioDomingoSaida2;

  @Column(name = "criado_em", nullable = false)
  private LocalDateTime criadoEm;

  @Column(name = "atualizado_em", nullable = false)
  private LocalDateTime atualizadoEm;

  @Column(name = "tenant_id")
  private UUID tenantId;

  @ManyToMany(fetch = FetchType.LAZY)
  @JoinTable(
      name = "usuario_permissao",
      joinColumns = @JoinColumn(name = "usuario_id"),
      inverseJoinColumns = @JoinColumn(name = "permissao_id"))
  private Set<Permissao> permissoes = new HashSet<>();

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getNomeUsuario() {
    return nomeUsuario;
  }

  public void setNomeUsuario(String nomeUsuario) {
    this.nomeUsuario = nomeUsuario;
  }

  public String getNome() {
    return nome;
  }

  public void setNome(String nome) {
    this.nome = nome;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getSenhaHash() {
    return senhaHash;
  }

  public void setSenhaHash(String senhaHash) {
    this.senhaHash = senhaHash;
  }

  public String getGoogleId() {
    return googleId;
  }

  public void setGoogleId(String googleId) {
    this.googleId = googleId;
  }

  public String getFotoUrl() {
    return fotoUrl;
  }

  public void setFotoUrl(String fotoUrl) {
    this.fotoUrl = fotoUrl;
  }

  public LocalTime getHorarioEntrada1() {
    return horarioEntrada1;
  }

  public void setHorarioEntrada1(LocalTime horarioEntrada1) {
    this.horarioEntrada1 = horarioEntrada1;
  }

  public LocalTime getHorarioSaida1() {
    return horarioSaida1;
  }

  public void setHorarioSaida1(LocalTime horarioSaida1) {
    this.horarioSaida1 = horarioSaida1;
  }

  public LocalTime getHorarioEntrada2() {
    return horarioEntrada2;
  }

  public void setHorarioEntrada2(LocalTime horarioEntrada2) {
    this.horarioEntrada2 = horarioEntrada2;
  }

  public LocalTime getHorarioSaida2() {
    return horarioSaida2;
  }

  public void setHorarioSaida2(LocalTime horarioSaida2) {
    this.horarioSaida2 = horarioSaida2;
  }

  public LocalTime getHorarioSegundaEntrada1() {
    return horarioSegundaEntrada1;
  }

  public void setHorarioSegundaEntrada1(LocalTime horarioSegundaEntrada1) {
    this.horarioSegundaEntrada1 = horarioSegundaEntrada1;
  }

  public LocalTime getHorarioSegundaSaida1() {
    return horarioSegundaSaida1;
  }

  public void setHorarioSegundaSaida1(LocalTime horarioSegundaSaida1) {
    this.horarioSegundaSaida1 = horarioSegundaSaida1;
  }

  public LocalTime getHorarioSegundaEntrada2() {
    return horarioSegundaEntrada2;
  }

  public void setHorarioSegundaEntrada2(LocalTime horarioSegundaEntrada2) {
    this.horarioSegundaEntrada2 = horarioSegundaEntrada2;
  }

  public LocalTime getHorarioSegundaSaida2() {
    return horarioSegundaSaida2;
  }

  public void setHorarioSegundaSaida2(LocalTime horarioSegundaSaida2) {
    this.horarioSegundaSaida2 = horarioSegundaSaida2;
  }

  public LocalTime getHorarioTercaEntrada1() {
    return horarioTercaEntrada1;
  }

  public void setHorarioTercaEntrada1(LocalTime horarioTercaEntrada1) {
    this.horarioTercaEntrada1 = horarioTercaEntrada1;
  }

  public LocalTime getHorarioTercaSaida1() {
    return horarioTercaSaida1;
  }

  public void setHorarioTercaSaida1(LocalTime horarioTercaSaida1) {
    this.horarioTercaSaida1 = horarioTercaSaida1;
  }

  public LocalTime getHorarioTercaEntrada2() {
    return horarioTercaEntrada2;
  }

  public void setHorarioTercaEntrada2(LocalTime horarioTercaEntrada2) {
    this.horarioTercaEntrada2 = horarioTercaEntrada2;
  }

  public LocalTime getHorarioTercaSaida2() {
    return horarioTercaSaida2;
  }

  public void setHorarioTercaSaida2(LocalTime horarioTercaSaida2) {
    this.horarioTercaSaida2 = horarioTercaSaida2;
  }

  public LocalTime getHorarioQuartaEntrada1() {
    return horarioQuartaEntrada1;
  }

  public void setHorarioQuartaEntrada1(LocalTime horarioQuartaEntrada1) {
    this.horarioQuartaEntrada1 = horarioQuartaEntrada1;
  }

  public LocalTime getHorarioQuartaSaida1() {
    return horarioQuartaSaida1;
  }

  public void setHorarioQuartaSaida1(LocalTime horarioQuartaSaida1) {
    this.horarioQuartaSaida1 = horarioQuartaSaida1;
  }

  public LocalTime getHorarioQuartaEntrada2() {
    return horarioQuartaEntrada2;
  }

  public void setHorarioQuartaEntrada2(LocalTime horarioQuartaEntrada2) {
    this.horarioQuartaEntrada2 = horarioQuartaEntrada2;
  }

  public LocalTime getHorarioQuartaSaida2() {
    return horarioQuartaSaida2;
  }

  public void setHorarioQuartaSaida2(LocalTime horarioQuartaSaida2) {
    this.horarioQuartaSaida2 = horarioQuartaSaida2;
  }

  public LocalTime getHorarioQuintaEntrada1() {
    return horarioQuintaEntrada1;
  }

  public void setHorarioQuintaEntrada1(LocalTime horarioQuintaEntrada1) {
    this.horarioQuintaEntrada1 = horarioQuintaEntrada1;
  }

  public LocalTime getHorarioQuintaSaida1() {
    return horarioQuintaSaida1;
  }

  public void setHorarioQuintaSaida1(LocalTime horarioQuintaSaida1) {
    this.horarioQuintaSaida1 = horarioQuintaSaida1;
  }

  public LocalTime getHorarioQuintaEntrada2() {
    return horarioQuintaEntrada2;
  }

  public void setHorarioQuintaEntrada2(LocalTime horarioQuintaEntrada2) {
    this.horarioQuintaEntrada2 = horarioQuintaEntrada2;
  }

  public LocalTime getHorarioQuintaSaida2() {
    return horarioQuintaSaida2;
  }

  public void setHorarioQuintaSaida2(LocalTime horarioQuintaSaida2) {
    this.horarioQuintaSaida2 = horarioQuintaSaida2;
  }

  public LocalTime getHorarioSextaEntrada1() {
    return horarioSextaEntrada1;
  }

  public void setHorarioSextaEntrada1(LocalTime horarioSextaEntrada1) {
    this.horarioSextaEntrada1 = horarioSextaEntrada1;
  }

  public LocalTime getHorarioSextaSaida1() {
    return horarioSextaSaida1;
  }

  public void setHorarioSextaSaida1(LocalTime horarioSextaSaida1) {
    this.horarioSextaSaida1 = horarioSextaSaida1;
  }

  public LocalTime getHorarioSextaEntrada2() {
    return horarioSextaEntrada2;
  }

  public void setHorarioSextaEntrada2(LocalTime horarioSextaEntrada2) {
    this.horarioSextaEntrada2 = horarioSextaEntrada2;
  }

  public LocalTime getHorarioSextaSaida2() {
    return horarioSextaSaida2;
  }

  public void setHorarioSextaSaida2(LocalTime horarioSextaSaida2) {
    this.horarioSextaSaida2 = horarioSextaSaida2;
  }

  public LocalTime getHorarioSabadoEntrada1() {
    return horarioSabadoEntrada1;
  }

  public void setHorarioSabadoEntrada1(LocalTime horarioSabadoEntrada1) {
    this.horarioSabadoEntrada1 = horarioSabadoEntrada1;
  }

  public LocalTime getHorarioSabadoSaida1() {
    return horarioSabadoSaida1;
  }

  public void setHorarioSabadoSaida1(LocalTime horarioSabadoSaida1) {
    this.horarioSabadoSaida1 = horarioSabadoSaida1;
  }

  public LocalTime getHorarioSabadoEntrada2() {
    return horarioSabadoEntrada2;
  }

  public void setHorarioSabadoEntrada2(LocalTime horarioSabadoEntrada2) {
    this.horarioSabadoEntrada2 = horarioSabadoEntrada2;
  }

  public LocalTime getHorarioSabadoSaida2() {
    return horarioSabadoSaida2;
  }

  public void setHorarioSabadoSaida2(LocalTime horarioSabadoSaida2) {
    this.horarioSabadoSaida2 = horarioSabadoSaida2;
  }

  public LocalTime getHorarioDomingoEntrada1() {
    return horarioDomingoEntrada1;
  }

  public void setHorarioDomingoEntrada1(LocalTime horarioDomingoEntrada1) {
    this.horarioDomingoEntrada1 = horarioDomingoEntrada1;
  }

  public LocalTime getHorarioDomingoSaida1() {
    return horarioDomingoSaida1;
  }

  public void setHorarioDomingoSaida1(LocalTime horarioDomingoSaida1) {
    this.horarioDomingoSaida1 = horarioDomingoSaida1;
  }

  public LocalTime getHorarioDomingoEntrada2() {
    return horarioDomingoEntrada2;
  }

  public void setHorarioDomingoEntrada2(LocalTime horarioDomingoEntrada2) {
    this.horarioDomingoEntrada2 = horarioDomingoEntrada2;
  }

  public LocalTime getHorarioDomingoSaida2() {
    return horarioDomingoSaida2;
  }

  public void setHorarioDomingoSaida2(LocalTime horarioDomingoSaida2) {
    this.horarioDomingoSaida2 = horarioDomingoSaida2;
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

  public Set<Permissao> getPermissoes() {
    return permissoes;
  }

  public void setPermissoes(Set<Permissao> permissoes) {
    this.permissoes = permissoes;
  }
}
