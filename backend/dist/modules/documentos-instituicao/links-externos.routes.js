import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { ensureAuthenticated, ensurePermissions } from "../auth/middlewares/auth.middleware.js";
import { LinkExternoService } from "./services/link-externo.service.js";
const routes = Router();
const service = new LinkExternoService();
const permissoesLeitura = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"];
const permissoesEscrita = ["ADMINISTRADOR", "OPERADOR"];
const permissaoExclusao = ["ADMINISTRADOR"];
routes.get("/", ensureAuthenticated, ensurePermissions(permissoesLeitura), asyncHandler(async (_req, res) => {
    const links = await service.listar();
    const linksMapeados = links.map(link => ({
        id: link.id,
        nome: link.nome,
        url: link.url,
        tiposRelacionados: link.tipos_relacionados,
        observacao: link.observacao
    }));
    res.json(linksMapeados);
}));
routes.post("/", ensureAuthenticated, ensurePermissions(permissoesEscrita), asyncHandler(async (req, res) => {
    await service.salvar(req.body);
    res.status(201).send();
}));
routes.put("/:id", ensureAuthenticated, ensurePermissions(permissoesEscrita), asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    await service.salvar(req.body, id);
    res.status(204).send();
}));
routes.delete("/:id", ensureAuthenticated, ensurePermissions(permissaoExclusao), asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    await service.excluir(id);
    res.status(204).send();
}));
export { routes as linksExternosRoutes };
