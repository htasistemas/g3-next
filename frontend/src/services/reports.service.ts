import { httpClient } from "./http-client";

export const reportsService = {
  async gerarRelacaoTermosParceria(payload: Record<string, unknown>) {
    const { data } = await httpClient.post("/api/reports/termos-parceria/relacao", payload, { responseType: "blob" });
    return data as Blob;
  },

  async gerarTermoParceriaCompleto(payload: { termoId: string; usuarioEmissor?: string }) {
    const { data } = await httpClient.post("/api/reports/termos-parceria/completo", payload, { responseType: "blob" });
    return data as Blob;
  },

  async gerarRelacaoUnidadesAssistenciais(payload: Record<string, unknown>) {
    const { data } = await httpClient.post("/api/reports/unidades-assistenciais/relacao", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarRelacaoBeneficiarios(payload: Record<string, unknown>) {
    const { data } = await httpClient.post("/api/reports/beneficiarios/relacao", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarFichaBeneficiario(payload: { beneficiarioId: string; usuarioEmissor?: string }) {
    const { data } = await httpClient.post("/api/reports/beneficiarios/ficha", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarTermoAutorizacao(payload: Record<string, unknown>) {
    const { data } = await httpClient.post("/api/reports/authorization-term", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarRelacaoProfissionais(payload: Record<string, unknown>) {
    const { data } = await httpClient.post("/api/reports/profissionais/relacao", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarFichaProfissional(payload: { profissionalId: string; usuarioEmissor?: string }) {
    const { data } = await httpClient.post("/api/reports/profissionais/ficha", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarRelacaoVoluntarios(payload: Record<string, unknown>) {
    const { data } = await httpClient.post("/api/reports/voluntarios/relacao", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarFichaVoluntario(payload: { voluntarioId: string; usuarioEmissor?: string }) {
    const { data } = await httpClient.post("/api/reports/voluntarios/ficha", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarTermoVoluntariado(payload: { voluntarioId: string; usuarioEmissor?: string }) {
    const { data } = await httpClient.post("/api/reports/voluntarios/termo", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarRelacaoLivrosBiblioteca(payload: Record<string, unknown>) {
    const { data } = await httpClient.post("/api/reports/biblioteca/livros/relacao", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarFichaLivroBiblioteca(payload: { livroId: string; usuarioEmissor?: string }) {
    const { data } = await httpClient.post("/api/reports/biblioteca/livros/ficha", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarRelacaoEmprestimosBiblioteca(payload: Record<string, unknown>) {
    const { data } = await httpClient.post("/api/reports/biblioteca/emprestimos/relacao", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarDevolucoesPendentesBiblioteca(payload: Record<string, unknown>) {
    const { data } = await httpClient.post("/api/reports/biblioteca/devolucoes/pendentes", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarLivrosDisponiveisBiblioteca(payload: Record<string, unknown>) {
    const { data } = await httpClient.post("/api/reports/biblioteca/livros/disponiveis", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarAlertasBiblioteca(payload: Record<string, unknown>) {
    const { data } = await httpClient.post("/api/reports/biblioteca/alertas/devolucao", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarPainelBiblioteca(payload: Record<string, unknown>) {
    const { data } = await httpClient.post("/api/reports/biblioteca/painel", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarRelacaoMatriculas(payload: Record<string, unknown>) {
    const { data } = await httpClient.post("/api/reports/matriculas/relacao", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarListaPresencaMatricula(payload: Record<string, unknown>) {
    const { data } = await httpClient.post("/api/reports/matriculas/lista-presenca", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarComprovanteMatricula(payload: Record<string, unknown>) {
    const { data } = await httpClient.post("/api/reports/matriculas/comprovante", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarComprovantePreMatriculaListaEspera(payload: Record<string, unknown>) {
    const { data } = await httpClient.post("/api/reports/matriculas/pre-matricula-lista-espera", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarRelacaoRegistroDoacao(payload: Record<string, unknown>) {
    const { data } = await httpClient.post("/api/reports/registro-doacao/relacao", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarRelacaoDoacoesRealizadas(payload: Record<string, unknown>) {
    const { data } = await httpClient.post("/api/reports/doacoes-realizadas/relacao", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarReciboDoacaoRealizada(payload: { doacaoRealizadaId: string; usuarioEmissor?: string }) {
    const { data } = await httpClient.post("/api/reports/doacoes-realizadas/recibo", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarEspelhoPonto(payload: Record<string, unknown>) {
    const { data } = await httpClient.post("/api/reports/registro-ponto/espelho", payload, {
      responseType: "blob"
    });
    return data as Blob;
  }
};
