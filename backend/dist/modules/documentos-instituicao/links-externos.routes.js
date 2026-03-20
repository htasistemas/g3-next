import { Router } from "express";
import { LinkExternoService } from "./services/link-externo.service.js";
const routes = Router();
const service = new LinkExternoService();
routes.get("/", async (req, res) => {
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
});
routes.post("/", async (req, res) => {
    await service.salvar(req.body);
    res.status(201).send();
});
routes.put("/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await service.salvar(req.body, id);
    res.status(204).send();
});
routes.delete("/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await service.excluir(id);
    res.status(204).send();
});
export { routes as linksExternosRoutes };
