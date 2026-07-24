import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { ensureAuthenticated, ensurePermissions } from "../auth/middlewares/auth.middleware.js";
import { LinkExternoService } from "./services/link-externo.service.js";

const routes = Router();
const service = new LinkExternoService();

routes.get("/", ensureAuthenticated, ensurePermissions(["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"]), asyncHandler(async (req, res) => {
  const links = await service.listar();
  // Converte snake_case para camelCase para o frontend
  const linksMapeados = links.map(link => ({
    id: link.id,
    nome: link.nome,
    url: link.url,
    tiposRelacionados: link.tipos_relacionados,
    observacao: link.observacao
  }));
  res.json(linksMapeados);
}));

routes.post("/", ensureAuthenticated, ensurePermissions(["ADMINISTRADOR", "OPERADOR"]), asyncHandler(async (req, res) => {
  await service.salvar(req.body);
  res.status(201).send();
}));

routes.put("/:id", ensureAuthenticated, ensurePermissions(["ADMINISTRADOR", "OPERADOR"]), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  await service.salvar(req.body, id);
  res.status(204).send();
}));

routes.delete("/:id", ensureAuthenticated, ensurePermissions(["ADMINISTRADOR"]), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  await service.excluir(id);
  res.status(204).send();
}));

export { routes as linksExternosRoutes };
