package br.com.g3.vinculofamiliar.serviceimpl;

import br.com.g3.cadastrobeneficiario.domain.CadastroBeneficiario;
import br.com.g3.cadastrobeneficiario.repositoryimpl.CadastroBeneficiarioJpaRepository;
import br.com.g3.vinculofamiliar.domain.VinculoFamiliar;
import br.com.g3.vinculofamiliar.domain.VinculoFamiliarMembro;
import br.com.g3.vinculofamiliar.dto.VinculoFamiliarCriacaoRequest;
import br.com.g3.vinculofamiliar.dto.VinculoFamiliarMembroRequest;
import br.com.g3.vinculofamiliar.dto.VinculoFamiliarResponse;
import br.com.g3.vinculofamiliar.mapper.VinculoFamiliarMapper;
import br.com.g3.vinculofamiliar.repository.VinculoFamiliarMembroRepository;
import br.com.g3.vinculofamiliar.repository.VinculoFamiliarRepository;
import br.com.g3.vinculofamiliar.service.VinculoFamiliarService;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VinculoFamiliarServiceImpl implements VinculoFamiliarService {
  private final VinculoFamiliarRepository vinculoRepository;
  private final VinculoFamiliarMembroRepository membroRepository;
  private final CadastroBeneficiarioJpaRepository beneficiarioRepository;

  public VinculoFamiliarServiceImpl(
      VinculoFamiliarRepository vinculoRepository,
      VinculoFamiliarMembroRepository membroRepository,
      CadastroBeneficiarioJpaRepository beneficiarioRepository) {
    this.vinculoRepository = vinculoRepository;
    this.membroRepository = membroRepository;
    this.beneficiarioRepository = beneficiarioRepository;
  }

  @Override
  @Transactional
  public VinculoFamiliarResponse criar(VinculoFamiliarCriacaoRequest request) {
    VinculoFamiliar vinculo = VinculoFamiliarMapper.toDomain(request);
    aplicarReferencia(vinculo, request.getIdReferenciaFamiliar());

    if (request.getMembros() != null) {
      vinculo.getMembros().clear();
      request.getMembros().forEach((membroRequest) -> {
        CadastroBeneficiario beneficiario = buscarBeneficiario(membroRequest.getIdBeneficiario());
        VinculoFamiliarMembro membro =
            VinculoFamiliarMapper.criarMembro(vinculo, beneficiario, membroRequest);
        vinculo.getMembros().add(membro);
      });
    }

    return VinculoFamiliarMapper.toResponse(vinculoRepository.salvar(vinculo));
  }

  @Override
  @Transactional
  public VinculoFamiliarResponse atualizar(Long id, VinculoFamiliarCriacaoRequest request) {
    VinculoFamiliar vinculo = obterVinculo(id);
    VinculoFamiliarMapper.aplicarAtualizacao(vinculo, request);
    aplicarReferencia(vinculo, request.getIdReferenciaFamiliar());

    if (request.getMembros() != null) {
      vinculo.getMembros().clear();
      request.getMembros().forEach((membroRequest) -> {
        CadastroBeneficiario beneficiario = buscarBeneficiario(membroRequest.getIdBeneficiario());
        VinculoFamiliarMembro membro =
            VinculoFamiliarMapper.criarMembro(vinculo, beneficiario, membroRequest);
        vinculo.getMembros().add(membro);
      });
    }

    return VinculoFamiliarMapper.toResponse(vinculoRepository.salvar(vinculo));
  }

  @Override
  @Transactional(readOnly = true)
  public VinculoFamiliarResponse buscarPorId(Long id) {
    return VinculoFamiliarMapper.toResponse(obterVinculo(id));
  }

  @Override
  @Transactional(readOnly = true)
  public List<VinculoFamiliarResponse> listar(
      String nomeFamilia, String municipio, String referencia) {
    String nomeNormalizado = normalizarFiltro(nomeFamilia);
    String municipioNormalizado = normalizarFiltro(municipio);
    String referenciaNormalizada = normalizarFiltro(referencia);

    return vinculoRepository.listar().stream()
        .map(VinculoFamiliarMapper::toResponse)
        .filter(
            familia ->
                nomeNormalizado == null
                    || contemFiltro(familia.getNomeFamilia(), nomeNormalizado))
        .filter(
            familia ->
                municipioNormalizado == null
                    || contemFiltro(familia.getMunicipio(), municipioNormalizado))
        .filter(
            familia ->
                referenciaNormalizada == null
                    || (familia.getReferenciaFamiliar() != null
                        && contemFiltro(
                            familia.getReferenciaFamiliar().getNomeCompleto(),
                            referenciaNormalizada)))
        .collect(Collectors.toList());
  }

  @Override
  @Transactional
  public VinculoFamiliarResponse adicionarMembro(Long familiaId, VinculoFamiliarMembroRequest request) {
    VinculoFamiliar vinculo = obterVinculo(familiaId);
    CadastroBeneficiario beneficiario = buscarBeneficiario(request.getIdBeneficiario());

    Optional<VinculoFamiliarMembro> existente =
        vinculo.getMembros().stream()
            .filter((membro) -> membro.getBeneficiario() != null
                && membro.getBeneficiario().getId().equals(beneficiario.getId()))
            .findFirst();

    if (existente.isPresent()) {
      VinculoFamiliarMapper.aplicarAtualizacaoMembro(
          existente.get(), vinculo, beneficiario, request);
      membroRepository.salvar(existente.get());
      return VinculoFamiliarMapper.toResponse(vinculo);
    }

    VinculoFamiliarMembro membro =
        VinculoFamiliarMapper.criarMembro(vinculo, beneficiario, request);
    vinculo.getMembros().add(membro);
    vinculoRepository.salvar(vinculo);
    return VinculoFamiliarMapper.toResponse(vinculo);
  }

  @Override
  @Transactional
  public VinculoFamiliarResponse atualizarMembro(
      Long familiaId, Long membroId, VinculoFamiliarMembroRequest request) {
    VinculoFamiliar vinculo = obterVinculo(familiaId);
    VinculoFamiliarMembro membro = obterMembro(membroId);
    if (!membro.getVinculoFamiliar().getId().equals(familiaId)) {
      throw new IllegalArgumentException("Membro nao pertence a familia informada.");
    }
    CadastroBeneficiario beneficiario = buscarBeneficiario(request.getIdBeneficiario());
    VinculoFamiliarMapper.aplicarAtualizacaoMembro(membro, vinculo, beneficiario, request);
    membroRepository.salvar(membro);
    return VinculoFamiliarMapper.toResponse(vinculo);
  }

  @Override
  @Transactional
  public void removerMembro(Long familiaId, Long membroId) {
    VinculoFamiliarMembro membro = obterMembro(membroId);
    if (!membro.getVinculoFamiliar().getId().equals(familiaId)) {
      throw new IllegalArgumentException("Membro nao pertence a familia informada.");
    }
    membroRepository.remover(membro);
  }

  private VinculoFamiliar obterVinculo(Long id) {
    return vinculoRepository
        .buscarPorId(id)
        .orElseThrow(() -> new IllegalArgumentException("Familia nao encontrada."));
  }

  private VinculoFamiliarMembro obterMembro(Long id) {
    return membroRepository
        .buscarPorId(id)
        .orElseThrow(() -> new IllegalArgumentException("Membro nao encontrado."));
  }

  private CadastroBeneficiario buscarBeneficiario(Long id) {
    return beneficiarioRepository
        .findById(id)
        .orElseThrow(() -> new IllegalArgumentException("Beneficiario nao encontrado."));
  }

  private void aplicarReferencia(VinculoFamiliar vinculo, Long referenciaId) {
    if (referenciaId == null) {
      vinculo.setReferenciaFamiliar(null);
      return;
    }
    CadastroBeneficiario referencia = buscarBeneficiario(referenciaId);
    vinculo.setReferenciaFamiliar(referencia);
  }

  private String normalizarFiltro(String valor) {
    if (valor == null) {
      return null;
    }
    String normalizado = valor.trim().toLowerCase();
    return normalizado.isEmpty() ? null : normalizado;
  }

  private boolean contemFiltro(String valor, String filtro) {
    String valorNormalizado = normalizarFiltro(valor);
    return valorNormalizado != null && valorNormalizado.contains(filtro);
  }
}
