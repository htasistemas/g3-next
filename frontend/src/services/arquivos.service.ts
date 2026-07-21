import { httpClient } from "./http-client";
import type { ArquivoMetadata } from "@/types/arquivo";

type ArquivoApiRow = {
  id: number;
  entidade_tipo: string;
  entidade_id?: number | null;
  categoria: string;
  nome_original: string;
  nome_arquivo: string;
  caminho_arquivo: string;
  thumbnail_caminho?: string | null;
  mime_type: string;
  observacao?: string | null;
  data_upload: string;
};

function mapArquivo(row: ArquivoApiRow): ArquivoMetadata {
  return {
    id: row.id,
    entidadeTipo: row.entidade_tipo,
    entidadeId: row.entidade_id ?? undefined,
    categoria: row.categoria,
    nomeOriginal: row.nome_original,
    nomeArquivo: row.nome_arquivo,
    caminhoArquivo: row.caminho_arquivo,
    thumbnailCaminho: row.thumbnail_caminho ?? undefined,
    mimeType: row.mime_type,
    observacao: row.observacao ?? undefined,
    dataUpload: row.data_upload
  };
}

export const arquivosService = {
  async listarPorEntidade(entidadeTipo: string, entidadeId: string | number) {
    const { data } = await httpClient.get<{ arquivos: ArquivoApiRow[] }>("/api/arquivos", {
      params: {
        entidadeTipo,
        entidadeId,
        ativo: true
      }
    });
    return (data.arquivos ?? []).map(mapArquivo);
  },

  async uploadPorEntidade(input: {
    scope: string;
    entidadeTipo: string;
    entidadeId: string | number;
    arquivo: File;
    observacao?: string;
  }) {
    const formData = new FormData();
    formData.append("scope", input.scope);
    formData.append("entidadeTipo", input.entidadeTipo);
    formData.append("entidadeId", String(input.entidadeId));
    if (input.observacao?.trim()) {
      formData.append("observacao", input.observacao.trim());
    }
    formData.append("arquivo", input.arquivo);

    const { data } = await httpClient.post<{ arquivo: ArquivoApiRow }>(
      "/api/arquivos/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data"
        },
        timeout: 300000
      }
    );

    return mapArquivo(data.arquivo);
  },

  async listarPorCompra(compraId: string | number) {
    const { data } = await httpClient.get<{ arquivos: ArquivoApiRow[] }>("/api/arquivos", {
      params: {
        entidadeTipo: "autorizacao_compra",
        entidadeId: compraId,
        ativo: true
      }
    });
    return (data.arquivos ?? []).map(mapArquivo);
  },

  async uploadParaCompra(
    compraId: string | number,
    arquivo: File,
    observacao?: string
  ) {
    const formData = new FormData();
    formData.append("scope", "autorizacao_compra_anexo");
    formData.append("entidadeTipo", "autorizacao_compra");
    formData.append("entidadeId", String(compraId));
    if (observacao?.trim()) {
      formData.append("observacao", observacao.trim());
    }
    formData.append("arquivo", arquivo);

    const { data } = await httpClient.post<{ arquivo: ArquivoApiRow }>("/api/arquivos/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });

    return mapArquivo(data.arquivo);
  },

  async listarPorLancamentoContabil(lancamentoId: string | number) {
    const { data } = await httpClient.get<{ arquivos: ArquivoApiRow[] }>('/api/arquivos', {
      params: {
        entidadeTipo: 'contabilidade_lancamento',
        entidadeId: lancamentoId,
        ativo: true
      }
    });
    return (data.arquivos ?? []).map(mapArquivo);
  },

  async uploadParaLancamentoContabil(
    lancamentoId: string | number,
    arquivo: File,
    observacao?: string
  ) {
    const formData = new FormData();
    formData.append('scope', 'contabilidade_lancamento_anexo');
    formData.append('entidadeTipo', 'contabilidade_lancamento');
    formData.append('entidadeId', String(lancamentoId));
    if (observacao?.trim()) {
      formData.append('observacao', observacao.trim());
    }
    formData.append('arquivo', arquivo);

    const { data } = await httpClient.post<{ arquivo: ArquivoApiRow }>(
      '/api/arquivos/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    return mapArquivo(data.arquivo);
  },

  async uploadParaDocumentoEducacional(documentoId: string | number, arquivo: File, observacao?: string) {
    const formData = new FormData();
    formData.append("scope", "educacional_documento");
    formData.append("entidadeTipo", "educacional_documento");
    formData.append("entidadeId", String(documentoId));
    if (observacao?.trim()) formData.append("observacao", observacao.trim());
    formData.append("arquivo", arquivo);
    const { data } = await httpClient.post<{ arquivo: ArquivoApiRow }>("/api/arquivos/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 300000
    });
    return mapArquivo(data.arquivo);
  },

  async excluir(id: string | number) {
    await httpClient.delete(`/api/arquivos/${id}`);
  }
};
