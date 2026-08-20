import { httpClient } from "./http-client";

export const portalInscricoesService = {
  listarInstituicoes: () => httpClient.get("/api/portal-inscricoes/publico").then((r) => r.data),
  listar: (slug: string, busca = "") => httpClient.get(`/api/portal-inscricoes/publico/${slug}`, { params: { busca } }).then((r) => r.data),
  detalhes: (slug: string, id: string) => httpClient.get(`/api/portal-inscricoes/publico/${slug}/oportunidades/${id}`).then((r) => r.data),
  identificacao: (slug: string, cpf: string) => httpClient.post(`/api/portal-inscricoes/publico/${slug}/identificacao`, { cpf }).then((r) => r.data),
  enviar: (slug: string, data: unknown) => httpClient.post(`/api/portal-inscricoes/publico/${slug}/pre-inscricoes`, data).then((r) => r.data),
  anexarDocumento: (slug: string, protocolo: string, cpf: string, arquivo: File) => { const form = new FormData(); form.append("cpf", cpf); form.append("arquivo", arquivo); return httpClient.post(`/api/portal-inscricoes/publico/${slug}/pre-inscricoes/${protocolo}/documentos`, form).then((r) => r.data); },
  acompanhar: (slug: string, protocolo: string, cpf: string) => httpClient.post(`/api/portal-inscricoes/publico/${slug}/acompanhamento`, { protocolo, cpf }).then((r) => r.data),
  adminListar: (status?: string) => httpClient.get("/api/portal-inscricoes/admin", { params: { status } }).then((r) => r.data),
  adminDetalhe: (id: string) => httpClient.get(`/api/portal-inscricoes/admin/${id}`).then((r) => r.data),
  acao: (id: string, acao: string, motivo?: string) => httpClient.post(`/api/portal-inscricoes/admin/${id}/${acao}`, { motivo }).then((r) => r.data)
};
