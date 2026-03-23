package br.com.g3.contabilidade.controller;

import br.com.g3.contabilidade.dto.ContaBancariaRequest;
import br.com.g3.contabilidade.dto.ContaBancariaResponse;
import br.com.g3.contabilidade.dto.EmendaImpositivaRequest;
import br.com.g3.contabilidade.dto.EmendaImpositivaResponse;
import br.com.g3.contabilidade.dto.LancamentoFinanceiroRequest;
import br.com.g3.contabilidade.dto.LancamentoFinanceiroResponse;
import br.com.g3.contabilidade.dto.MovimentacaoFinanceiraRequest;
import br.com.g3.contabilidade.dto.MovimentacaoFinanceiraResponse;
import br.com.g3.contabilidade.dto.PagamentoLancamentoRequest;
import br.com.g3.contabilidade.dto.ReciboPagamentoResponse;
import br.com.g3.contabilidade.dto.StatusRequest;
import br.com.g3.contabilidade.service.ContabilidadeService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.DeleteMapping;

@RestController
@RequestMapping("/api/contabilidade")
public class ContabilidadeController {
  private final ContabilidadeService service;

  public ContabilidadeController(ContabilidadeService service) {
    this.service = service;
  }

  @PostMapping("/contas-bancarias")
  public ResponseEntity<ContaBancariaResponse> criarConta(@RequestBody ContaBancariaRequest request) {
    return ResponseEntity.ok(service.criarContaBancaria(request));
  }

  @PutMapping("/contas-bancarias/{id}")
  public ResponseEntity<ContaBancariaResponse> atualizarConta(
      @PathVariable("id") Long id, @RequestBody ContaBancariaRequest request) {
    return ResponseEntity.ok(service.atualizarContaBancaria(id, request));
  }

  @GetMapping("/contas-bancarias")
  public ResponseEntity<List<ContaBancariaResponse>> listarContas() {
    return ResponseEntity.ok(service.listarContasBancarias());
  }

  @DeleteMapping("/contas-bancarias/{id}")
  public ResponseEntity<Void> removerConta(@PathVariable("id") Long id) {
    service.removerContaBancaria(id);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/lancamentos")
  public ResponseEntity<LancamentoFinanceiroResponse> criarLancamento(@RequestBody LancamentoFinanceiroRequest request) {
    return ResponseEntity.ok(service.criarLancamento(request));
  }

  @PutMapping("/lancamentos/{id}")
  public ResponseEntity<LancamentoFinanceiroResponse> atualizarLancamento(
      @PathVariable("id") Long id, @RequestBody LancamentoFinanceiroRequest request) {
    return ResponseEntity.ok(service.atualizarLancamento(id, request));
  }

  @GetMapping("/lancamentos")
  public ResponseEntity<List<LancamentoFinanceiroResponse>> listarLancamentos() {
    return ResponseEntity.ok(service.listarLancamentos());
  }

  @PatchMapping("/lancamentos/{id}/status")
  public ResponseEntity<LancamentoFinanceiroResponse> atualizarStatusLancamento(
      @PathVariable("id") Long id, @RequestBody StatusRequest request) {        
    return ResponseEntity.ok(service.atualizarSituacaoLancamento(id, request.getStatus()));
  }

  @PatchMapping("/lancamentos/{id}/estorno")
  public ResponseEntity<LancamentoFinanceiroResponse> estornarLancamento(@PathVariable("id") Long id) {
    return ResponseEntity.ok(service.estornarLancamento(id));
  }

  @DeleteMapping("/lancamentos/{id}")
  public ResponseEntity<Void> removerLancamento(@PathVariable("id") Long id) {
    service.removerLancamento(id);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/lancamentos/{id}/pagamento")
  public ResponseEntity<ReciboPagamentoResponse> pagarLancamento(
      @PathVariable("id") Long id, @RequestBody PagamentoLancamentoRequest request) {
    return ResponseEntity.ok(service.pagarLancamento(id, request));
  }

  @PostMapping("/movimentacoes")
  public ResponseEntity<MovimentacaoFinanceiraResponse> criarMovimentacao(
      @RequestBody MovimentacaoFinanceiraRequest request) {
    return ResponseEntity.ok(service.criarMovimentacao(request));
  }

  @PutMapping("/movimentacoes/{id}")
  public ResponseEntity<MovimentacaoFinanceiraResponse> atualizarMovimentacao(
      @PathVariable("id") Long id, @RequestBody MovimentacaoFinanceiraRequest request) {
    return ResponseEntity.ok(service.atualizarMovimentacao(id, request));
  }

  @GetMapping("/movimentacoes")
  public ResponseEntity<List<MovimentacaoFinanceiraResponse>> listarMovimentacoes() {
    return ResponseEntity.ok(service.listarMovimentacoes());
  }

  @DeleteMapping("/movimentacoes/{id}")
  public ResponseEntity<Void> removerMovimentacao(@PathVariable("id") Long id) {
    service.removerMovimentacao(id);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/emendas")
  public ResponseEntity<EmendaImpositivaResponse> criarEmenda(@RequestBody EmendaImpositivaRequest request) {
    return ResponseEntity.ok(service.criarEmenda(request));
  }

  @GetMapping("/emendas")
  public ResponseEntity<List<EmendaImpositivaResponse>> listarEmendas() {
    return ResponseEntity.ok(service.listarEmendas());
  }

  @PatchMapping("/emendas/{id}/status")
  public ResponseEntity<EmendaImpositivaResponse> atualizarStatusEmenda(
      @PathVariable("id") Long id, @RequestBody StatusRequest request) {
    return ResponseEntity.ok(service.atualizarStatusEmenda(id, request.getStatus()));
  }
}
