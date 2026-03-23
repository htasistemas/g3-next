package br.com.g3.documentosinstituicao.service;

import br.com.g3.documentosinstituicao.dto.DocumentoInstituicaoAnexoRequest;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ArmazenamentoDocumentoInstituicaoAnexoService {
  private final Path baseDir;

  public ArmazenamentoDocumentoInstituicaoAnexoService(
      @Value("${app.storage.documentos-instituicao:storage/documentos-instituicao}") String baseDir) {
    this.baseDir = Paths.get(baseDir);
  }

  public String salvarArquivo(Long documentoId, DocumentoInstituicaoAnexoRequest request) {
    if (request == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Envie o arquivo do anexo.");
    }
    validarTipoArquivo(request.getTipoMime(), request.getNomeArquivo());
    String caminhoArquivoExistente = normalizarCaminhoArquivo(request.getCaminhoArquivo());
    if (caminhoArquivoExistente != null) {
      return caminhoArquivoExistente;
    }
    if (request.getConteudoBase64() == null || request.getConteudoBase64().trim().isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Envie o arquivo do anexo.");
    }
    String extensao = obterExtensao(request.getNomeArquivo(), request.getTipoMime());
    String nomeArquivo = UUID.randomUUID() + extensao;
    Path destino = baseDir.resolve(String.valueOf(documentoId)).resolve(nomeArquivo);

    try {
      Files.createDirectories(destino.getParent());
      byte[] bytes = decodificarBase64(request.getConteudoBase64());
      Files.write(destino, bytes);
      return destino.toString();
    } catch (IOException ex) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao salvar o anexo.");
    }
  }

  public void excluirArquivo(String caminhoArquivo, Long documentoId) {
    Path caminho = resolverCaminhoArquivo(caminhoArquivo, documentoId);
    if (caminho == null) {
      return;
    }
    try {
      Files.deleteIfExists(caminho);
    } catch (IOException ex) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao excluir o anexo.");
    }
  }

  public Path resolverCaminhoArquivo(String caminhoArquivo, Long documentoId) {
    if (caminhoArquivo == null || caminhoArquivo.trim().isEmpty()) {
      return null;
    }
    Path caminho = Paths.get(caminhoArquivo);
    if (Files.exists(caminho)) {
      return caminho;
    }
    if (documentoId == null) {
      return caminho;
    }
    Path nomeArquivo = caminho.getFileName();
    if (nomeArquivo == null) {
      return caminho;
    }
    Path fallback = baseDir.resolve(String.valueOf(documentoId)).resolve(nomeArquivo.toString());
    return Files.exists(fallback) ? fallback : caminho;
  }

  private void validarTipoArquivo(String contentType, String nomeArquivo) {
    String tipo = contentType == null ? "" : contentType.toLowerCase();
    String nome = nomeArquivo == null ? "" : nomeArquivo.toLowerCase();

    boolean valido =
        tipo.contains("jpeg")
            || tipo.contains("jpg")
            || tipo.contains("png")
            || tipo.contains("pdf")
            || nome.endsWith(".jpg")
            || nome.endsWith(".jpeg")
            || nome.endsWith(".png")
            || nome.endsWith(".pdf");

    if (!valido) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Envie apenas arquivos PDF, JPG ou PNG.");
    }
  }

  private byte[] decodificarBase64(String conteudo) {
    String base64 = conteudo;
    int indice = conteudo.indexOf("base64,");
    if (indice >= 0) {
      base64 = conteudo.substring(indice + 7);
    }
    return Base64.getDecoder().decode(base64);
  }

  private String normalizarCaminhoArquivo(String caminhoArquivo) {
    if (caminhoArquivo == null || caminhoArquivo.trim().isEmpty()) {
      return null;
    }
    return caminhoArquivo.trim();
  }

  private String obterExtensao(String nomeArquivo, String contentType) {
    if (nomeArquivo != null && nomeArquivo.contains(".")) {
      return nomeArquivo.substring(nomeArquivo.lastIndexOf('.'));
    }
    if (contentType == null) {
      return ".bin";
    }
    String tipo = contentType.toLowerCase();
    if (tipo.contains("pdf")) {
      return ".pdf";
    }
    if (tipo.contains("png")) {
      return ".png";
    }
    if (tipo.contains("jpeg") || tipo.contains("jpg")) {
      return ".jpg";
    }
    return ".bin";
  }
}
