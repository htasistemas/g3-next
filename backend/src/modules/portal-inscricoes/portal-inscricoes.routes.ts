import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { AppError } from "../../shared/errors/app-error.js";
import { rateLimit } from "../../shared/http/rate-limit.js";
import { ensureAuthenticated, ensurePermissions, type AuthenticatedRequest } from "../auth/middlewares/auth.middleware.js";
import { PortalInscricoesService } from "./portal-inscricoes.service.js";
import { acaoPreInscricaoSchema, publicacaoSchema } from "./portal-inscricoes.schema.js";

const service = new PortalInscricoesService();
export const portalInscricoesRoutes = Router();
const publico = rateLimit({ keyPrefix: "portal-inscricoes", windowMs: 15 * 60 * 1000, max: 40, key: (r) => String(r.params.slug ?? r.ip) });
const documentoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } }).single("arquivo");

portalInscricoesRoutes.get("/publico/:slug", publico, asyncHandler(async (req, res) => res.json(await service.listar(req.params.slug, undefined, String(req.query.busca ?? "")))));
portalInscricoesRoutes.get("/publico", publico, asyncHandler(async (_req, res) => res.json({ instituicoes: await service.listarInstituicoes() })));
portalInscricoesRoutes.get("/publico/:slug/oportunidades/:id", publico, asyncHandler(async (req, res) => res.json({ oportunidade: await service.detalhes(req.params.id, req.params.slug) })));
portalInscricoesRoutes.get("/publico/:slug/oportunidades/:id/imagem", publico, asyncHandler(async (req, res) => { const conteudo = await service.obterImagemOportunidade(req.params.id, req.params.slug); res.setHeader("Content-Type", conteudo.mimeType); res.setHeader("Cache-Control", "public, max-age=3600"); return conteudo.stream.pipe(res); }));
portalInscricoesRoutes.post("/publico/:slug/identificacao", publico, asyncHandler(async (req, res) => res.json(await service.cpfExistente(String(req.body?.cpf ?? ""), req.params.slug))));
portalInscricoesRoutes.post("/publico/:slug/pre-inscricoes", publico, asyncHandler(async (req, res) => res.status(201).json(await service.criar(req.body, { slug: req.params.slug, ip: req.ip, userAgent: String(req.headers["user-agent"] ?? "") }))));
portalInscricoesRoutes.post("/publico/:slug/acompanhamento", publico, asyncHandler(async (req, res) => res.json(await service.acompanhar(String(req.body?.protocolo ?? ""), String(req.body?.cpf ?? ""), req.params.slug))));
portalInscricoesRoutes.post("/publico/:slug/pre-inscricoes/:protocolo/documentos", publico, documentoUpload, asyncHandler(async (req, res) => { const file = (req as typeof req & { file?: Express.Multer.File }).file; if (!file) throw new AppError("Selecione um documento para anexar.", 400); return res.status(201).json(await service.anexarDocumento(req.params.slug, req.params.protocolo, String(req.body?.cpf ?? ""), file)); }));

const interno = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"];
portalInscricoesRoutes.get("/admin", ensureAuthenticated, ensurePermissions(interno), asyncHandler(async (req: AuthenticatedRequest, res) => res.json({ preInscricoes: await service.adminList(String(req.authUser?.tenant_id), req.query) })));
portalInscricoesRoutes.get("/admin/resumo", ensureAuthenticated, ensurePermissions(interno), asyncHandler(async (req: AuthenticatedRequest, res) => res.json({ resumo: await service.adminResumo(String(req.authUser?.tenant_id)) })));
portalInscricoesRoutes.get("/admin/:id", ensureAuthenticated, ensurePermissions(interno), asyncHandler(async (req: AuthenticatedRequest, res) => res.json({ preInscricao: await service.adminDetalhe(req.params.id, String(req.authUser?.tenant_id)) })));
portalInscricoesRoutes.put("/admin/oportunidades/:id/publicacao", ensureAuthenticated, ensurePermissions(["ADMINISTRADOR", "OPERADOR"]), asyncHandler(async (req: AuthenticatedRequest, res) => res.json({ oportunidade: await service.configurarPublicacao(req.params.id, publicacaoSchema.parse(req.body), String(req.authUser?.tenant_id)) })));
portalInscricoesRoutes.post("/admin/:id/:acao", ensureAuthenticated, ensurePermissions(["ADMINISTRADOR", "OPERADOR"]), asyncHandler(async (req: AuthenticatedRequest, res) => { const parsed = acaoPreInscricaoSchema.parse(req.body ?? {}); return res.json(await service.acao(req.params.id, req.params.acao, parsed.motivo, { tenantId: String(req.authUser?.tenant_id), usuarioId: req.authUser?.id, usuarioNome: req.authUser?.nome, ip: req.ip })); }));
