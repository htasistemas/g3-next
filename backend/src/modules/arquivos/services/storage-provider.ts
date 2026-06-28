export interface StorageProvider {
  ensureReady(): Promise<void>;
  normalizePath(caminhoArquivo: string): string;
  salvar(caminhoArquivo: string, conteudo: Buffer, mimeType?: string): Promise<void>;
  mover(caminhoOrigem: string, caminhoDestino: string): Promise<void>;
  remover(caminhoArquivo: string): Promise<void>;
  existe(caminhoArquivo: string): Promise<boolean>;
  criarLeitura(caminhoArquivo: string): NodeJS.ReadableStream;
  lerBuffer(caminhoArquivo: string): Promise<Buffer | undefined>;
}
