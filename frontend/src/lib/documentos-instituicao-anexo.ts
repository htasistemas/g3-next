import type { DocumentoInstituicaoAnexoPayload } from "@/types/documentos-instituicao";

function bytesParaBase64(bytes: Uint8Array) {
  let binario = "";
  bytes.forEach((byte) => {
    binario += String.fromCharCode(byte);
  });
  return btoa(binario);
}

export async function montarPayloadAnexoDocumentoInstituicao(input: {
  arquivo: File;
  usuario: string;
}): Promise<DocumentoInstituicaoAnexoPayload> {
  const { arquivo, usuario } = input;
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const nomeArquivo = arquivo.name.trim() || "anexo";
  const extensao = nomeArquivo.includes(".") ? nomeArquivo.slice(nomeArquivo.lastIndexOf(".") + 1) : "";
  const tipo = extensao.trim() ? extensao.trim().toUpperCase().slice(0, 30) : "ARQUIVO";

  return {
    nomeArquivo,
    tipo,
    tipoMime: arquivo.type || "application/octet-stream",
    conteudoBase64: bytesParaBase64(bytes),
    tamanho: `${Math.max(1, Math.round(arquivo.size / 1024))} KB`,
    dataUpload: new Date().toISOString().slice(0, 10),
    usuario
  };
}
