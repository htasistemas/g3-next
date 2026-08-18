import { PerfisAcessoService } from "../services/perfis-acesso.service.js";
const service = new PerfisAcessoService();
export class PerfisAcessoController {
    listar = async (req, res) => res.json({ perfis: await service.listar(req.authUser) });
    catalogo = async (req, res) => res.json(await service.catalogo(req.authUser));
    buscar = async (req, res) => res.json(await service.buscar(req.params.id, req.authUser));
    criar = async (req, res) => res.status(201).json(await service.salvar(req.body, req.authUser));
    atualizar = async (req, res) => res.json(await service.salvar(req.body, req.authUser, req.params.id));
    duplicar = async (req, res) => res.status(201).json(await service.duplicar(req.params.id, req.authUser));
    alternar = async (req, res) => res.json(await service.inativar(req.params.id, req.authUser));
}
