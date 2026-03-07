package br.com.g3.cadastrobeneficiario.service;

import br.com.g3.cadastrobeneficiario.domain.DocumentoBeneficiario;
import br.com.g3.cadastrobeneficiario.dto.AptidaoCestaBasicaRequest;
import br.com.g3.cadastrobeneficiario.dto.CadastroBeneficiarioCriacaoRequest;
import br.com.g3.cadastrobeneficiario.dto.CadastroBeneficiarioResponse;
import br.com.g3.cadastrobeneficiario.dto.CadastroBeneficiarioResumoResponse;
import java.util.List;

public interface CadastroBeneficiarioService {
  CadastroBeneficiarioResponse criar(CadastroBeneficiarioCriacaoRequest request);

  CadastroBeneficiarioResponse atualizar(Long id, CadastroBeneficiarioCriacaoRequest request);

  CadastroBeneficiarioResponse buscarPorId(Long id);

  List<CadastroBeneficiarioResponse> listar(
      String nome, String status, String codigo, String cpf, String nis, String dataNascimento);

  List<CadastroBeneficiarioResumoResponse> listarResumo(
      String nome, String status, String codigo, String cpf, String nis, String dataNascimento);

  String obterProximoCodigo();

  void remover(Long id);

  DocumentoBeneficiario obterDocumento(Long beneficiarioId, Long documentoId);

  CadastroBeneficiarioResponse geocodificarEndereco(Long id, boolean forcar);

  CadastroBeneficiarioResponse atualizarAptidaoCestaBasica(
      Long id, AptidaoCestaBasicaRequest request);
}
