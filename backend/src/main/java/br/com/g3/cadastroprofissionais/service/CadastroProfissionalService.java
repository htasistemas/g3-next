package br.com.g3.cadastroprofissionais.service;

import br.com.g3.cadastroprofissionais.dto.CadastroProfissionalCriacaoRequest;
import br.com.g3.cadastroprofissionais.dto.CadastroProfissionalResponse;
import java.util.List;

public interface CadastroProfissionalService {
  CadastroProfissionalResponse criar(CadastroProfissionalCriacaoRequest request, Long usuarioId);

  CadastroProfissionalResponse atualizar(Long id, CadastroProfissionalCriacaoRequest request, Long usuarioId);

  CadastroProfissionalResponse buscarPorId(Long id, Long usuarioId);

  List<CadastroProfissionalResponse> listar(String nome, Long usuarioId);

  void remover(Long id, Long usuarioId);
}
