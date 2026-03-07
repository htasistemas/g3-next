package br.com.g3.vinculofamiliar.service;

import br.com.g3.vinculofamiliar.dto.VinculoFamiliarCriacaoRequest;
import br.com.g3.vinculofamiliar.dto.VinculoFamiliarMembroRequest;
import br.com.g3.vinculofamiliar.dto.VinculoFamiliarResponse;
import java.util.List;

public interface VinculoFamiliarService {
  VinculoFamiliarResponse criar(VinculoFamiliarCriacaoRequest request);

  VinculoFamiliarResponse atualizar(Long id, VinculoFamiliarCriacaoRequest request);

  VinculoFamiliarResponse buscarPorId(Long id);

  List<VinculoFamiliarResponse> listar(String nomeFamilia, String municipio, String referencia);

  VinculoFamiliarResponse adicionarMembro(Long familiaId, VinculoFamiliarMembroRequest request);

  VinculoFamiliarResponse atualizarMembro(Long familiaId, Long membroId, VinculoFamiliarMembroRequest request);

  void removerMembro(Long familiaId, Long membroId);
}
