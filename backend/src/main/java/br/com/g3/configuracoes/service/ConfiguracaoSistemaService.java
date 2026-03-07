package br.com.g3.configuracoes.service;

import br.com.g3.configuracoes.dto.AtualizarVersaoRequest;
import br.com.g3.configuracoes.dto.BeneficiarioDocumentoConfigDto;
import br.com.g3.configuracoes.dto.DestinoChamadoResponse;
import br.com.g3.configuracoes.dto.HistoricoVersaoResponse;
import br.com.g3.configuracoes.dto.VersaoSistemaResponse;
import java.util.List;

public interface ConfiguracaoSistemaService {
  VersaoSistemaResponse obterVersaoAtual();

  VersaoSistemaResponse atualizarVersao(AtualizarVersaoRequest request);

  List<HistoricoVersaoResponse> listarHistorico();

  DestinoChamadoResponse obterDestinoChamados();

  String obterVersaoArquivo();

  List<BeneficiarioDocumentoConfigDto> listarDocumentosBeneficiario();

  List<BeneficiarioDocumentoConfigDto> atualizarDocumentosBeneficiario(
      List<BeneficiarioDocumentoConfigDto> documentos);
}
