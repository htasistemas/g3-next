import type { Request, Response } from "express";
import multer from "multer";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { CipaService } from "../services/cipa.service.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { cipaLiveEvents, type CipaAtualizacao } from "../cipa.live.js";

const service = new CipaService();
export const cipaImportUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

function auth(request: Request) {
  const user = (request as AuthenticatedRequest).authUser;
  return { tenantId: user?.tenant_id, instituicaoId: user?.instituicao_id, usuarioId: user?.id };
}

function bearer(request: Request) {
  const header = request.headers.authorization;
  return header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

export class CipaController {
  listarColaboradores(request: Request, response: Response) { return service.listarColaboradores(auth(request).tenantId, request.query).then((data) => response.json(data)); }
  buscarColaborador(request: Request, response: Response) { return service.buscarColaborador(auth(request).tenantId, request.params.id).then((data) => response.json(data)); }
  criarColaborador(request: Request, response: Response) { const a = auth(request); return service.criarColaborador(a.tenantId, a.instituicaoId, a.usuarioId, request.body).then((data) => response.status(201).json(data)); }
  listarEleicoes(request: Request, response: Response) { return service.listarEleicoes(auth(request).tenantId).then((data) => response.json(data)); }
  buscarEleicao(request: Request, response: Response) { return service.buscarEleicao(auth(request).tenantId, request.params.id).then((data) => response.json(data)); }
  criarEleicao(request: Request, response: Response) { const a = auth(request); return service.criarEleicao(a.tenantId, a.instituicaoId, a.usuarioId, request.body).then((data) => response.status(201).json(data)); }
  editarEleicao(request: Request, response: Response) { const a = auth(request); return service.editarEleicao(a.tenantId, a.usuarioId, request.params.id, request.body).then((data) => response.json(data)); }
  listarEleitores(request: Request, response: Response) { return service.listarEleitores(auth(request).tenantId, request.params.id).then((data) => response.json(data)); }
  adicionarEleitor(request: Request, response: Response) { const a = auth(request); return service.adicionarEleitor(a.tenantId, a.usuarioId, request.params.id, String(request.body?.colaboradorId ?? "")).then((data) => response.status(201).json(data)); }
  removerEleitor(request: Request, response: Response) { const a = auth(request); return service.removerEleitor(a.tenantId, a.usuarioId, request.params.id, request.params.eleitorId).then((data) => response.json(data)); }
  portalPublico(request: Request, response: Response) { return service.obterPortalPublico(request.params.identificador).then((data) => response.json(data)); }
  importarEleitores(request: Request, response: Response) { const a = auth(request); if (!request.file) return Promise.reject(new AppError("Selecione uma planilha para importar.", 400)); return service.importarEleitores(a.tenantId, a.usuarioId, request.params.id, request.file).then((data) => response.status(201).json(data)); }
  listarCandidaturas(request: Request, response: Response) { return service.listarCandidaturas(auth(request).tenantId, request.params.id).then((data) => response.json(data)); }
  criarCandidatura(request: Request, response: Response) { const a = auth(request); return service.criarCandidatura(a.tenantId, a.usuarioId, request.params.id, request.body).then((data) => response.status(201).json(data)); }
  alterarStatusCandidatura(request: Request, response: Response) { const a = auth(request); return service.alterarStatusCandidatura(a.tenantId, a.usuarioId, request.params.id, request.params.candidaturaId, request.body).then((data) => response.json(data)); }
  abrirInscricoes(request: Request, response: Response) { const a = auth(request); return service.abrirInscricoes(a.tenantId, a.usuarioId, request.params.id).then((data) => response.json(data)); }
  encerrarInscricoes(request: Request, response: Response) { const a = auth(request); return service.encerrarInscricoes(a.tenantId, a.usuarioId, request.params.id).then((data) => response.json(data)); }
  cancelarEleicao(request: Request, response: Response) { const a = auth(request); return service.cancelarEleicao(a.tenantId, a.usuarioId, request.params.id, request.body).then((data) => response.json(data)); }
  obterDashboard(request: Request, response: Response) { return service.obterDashboard(auth(request).tenantId, request.params.id).then((data) => response.json(data)); }
  listarComissao(request: Request, response: Response) { return service.listarComissao(auth(request).tenantId, request.params.id).then((data) => response.json(data)); }
  listarAuditoria(request: Request, response: Response) { return service.listarAuditoria(auth(request).tenantId, request.params.id).then((data) => response.json(data)); }
  adicionarComissao(request: Request, response: Response) { const a = auth(request); return service.adicionarComissao(a.tenantId, a.usuarioId, request.params.id, request.body).then((data) => response.status(201).json(data)); }
  removerComissao(request: Request, response: Response) { const a = auth(request); return service.removerComissao(a.tenantId, a.usuarioId, request.params.id, request.params.membroId).then((data) => response.json(data)); }
  publicarEleicao(request: Request, response: Response) { const a = auth(request); return service.publicarEleicao(a.tenantId, a.usuarioId, request.params.id).then((data) => response.json(data)); }
  gerarZeresima(request: Request, response: Response) { const a = auth(request); return service.gerarZeresima(a.tenantId, a.usuarioId, request.params.id).then((data) => response.status(201).json(data)); }
  abrirVotacao(request: Request, response: Response) { const a = auth(request); return service.abrirVotacao(a.tenantId, a.usuarioId, request.params.id).then((data) => response.json(data)); }
  encerrarVotacao(request: Request, response: Response) { const a = auth(request); return service.encerrarVotacao(a.tenantId, a.usuarioId, request.params.id).then((data) => response.json(data)); }
  estenderVotacao(request: Request, response: Response) { const a = auth(request); return service.estenderVotacao(a.tenantId, a.usuarioId, request.params.id, Number(request.body?.dias ?? 2)).then((data) => response.json(data)); }
  apurar(request: Request, response: Response) { const a = auth(request); return service.apurar(a.tenantId, a.usuarioId, request.params.id).then((data) => response.json(data)); }
  buscarApuracao(request: Request, response: Response) { return service.buscarApuracao(auth(request).tenantId, request.params.id).then((data) => response.json(data)); }
  publicarResultado(request: Request, response: Response) { const a = auth(request); return service.publicarResultado(a.tenantId, a.usuarioId, request.params.id).then((data) => response.json(data)); }
  registrarDesempate(request: Request, response: Response) { const a = auth(request); return service.registrarDesempate(a.tenantId, a.usuarioId, request.params.id, request.body).then((data) => response.status(201).json(data)); }
  gerarDocumento(request: Request, response: Response) { const a = auth(request); return service.gerarDocumento(a.tenantId, a.usuarioId, request.params.id, String(request.body?.tipo ?? "")).then((data) => response.status(201).json(data)); }
  listarDocumentos(request: Request, response: Response) { return service.listarDocumentos(auth(request).tenantId, request.params.id).then((data) => response.json({ documentos: data })); }
  obterConteudoDocumento(request: Request, response: Response) { const a = auth(request); return service.obterConteudoDocumento(a.tenantId, a.usuarioId, request.params.id, request.params.documentoId).then((data) => { response.setHeader("Content-Type", data.mimeType); response.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(data.nomeArquivo)}"`); return data.stream.pipe(response); }); }
  gerarRelatorio(request: Request, response: Response) { const a = auth(request); return service.gerarRelatorio(a.tenantId, request.params.id, String(request.query.tipo ?? "")).then((data) => { response.setHeader("Content-Type", data.contentType); response.setHeader("Content-Disposition", `attachment; filename="${data.filename}"`); return response.send(data.content); }); }
  acompanhar(request: Request, response: Response) { const a = auth(request); if (!a.tenantId) return Promise.reject(new AppError("O contexto institucional da sessão não está completo.", 403)); const eleicaoId = request.params.id; response.status(200).set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" }); response.flushHeaders(); const enviar = (evento: string, dados: unknown) => response.write(`event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`); const listener = (atualizacao: CipaAtualizacao) => { if (atualizacao.tenantId === a.tenantId && atualizacao.eleicaoId === eleicaoId) void service.obterDashboard(a.tenantId, eleicaoId).then((dashboard) => enviar("atualizacao", dashboard)).catch(() => undefined); }; cipaLiveEvents.on("atualizacao", listener); const heartbeat = setInterval(() => response.write(": heartbeat\n\n"), 25000); request.on("close", () => { clearInterval(heartbeat); cipaLiveEvents.off("atualizacao", listener); }); return service.obterDashboard(a.tenantId, eleicaoId).then((dashboard) => enviar("snapshot", dashboard)); }
  autenticarEleitor(request: Request, response: Response) { return service.autenticarPortal(request.body, request.params.identificador, "VOTACAO").then((data) => response.json(data)); }
  autenticarCandidato(request: Request, response: Response) { return service.autenticarPortal(request.body, request.params.identificador, "CANDIDATURA").then((data) => response.json(data)); }
  obterUrna(request: Request, response: Response) { return service.obterUrna(bearer(request), request.params.identificador).then((data) => response.json(data)); }
  obterFotoCandidaturaPortal(request: Request, response: Response) { return service.obterFotoCandidaturaPortal(request.params.identificador, request.params.candidaturaId).then((data) => { response.setHeader("Content-Type", data.mimeType); response.setHeader("Cache-Control", "public, max-age=300"); return data.stream.pipe(response); }); }
  registrarVoto(request: Request, response: Response) { return service.registrarVoto(bearer(request), request.params.identificador, request.body).then((data) => response.status(201).json(data)); }
  criarCandidaturaPortal(request: Request, response: Response) { return service.criarCandidaturaPortal(bearer(request), request.params.identificador, request.body).then((data) => response.status(201).json(data)); }
  enviarFotoCandidaturaPortal(request: Request, response: Response) { return service.enviarFotoCandidaturaPortal(bearer(request), request.params.identificador, request.file).then((data) => response.status(201).json(data)); }
}
