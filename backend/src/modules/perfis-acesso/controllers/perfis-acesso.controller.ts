import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { PerfisAcessoService } from "../services/perfis-acesso.service.js";

const service = new PerfisAcessoService();
export class PerfisAcessoController {
  listar = async (req: AuthenticatedRequest, res: Response) => res.json({ perfis: await service.listar(req.authUser!) });
  catalogo = async (req: AuthenticatedRequest, res: Response) => res.json(await service.catalogo(req.authUser!));
  buscar = async (req: AuthenticatedRequest, res: Response) => res.json(await service.buscar(req.params.id, req.authUser!));
  criar = async (req: AuthenticatedRequest, res: Response) => res.status(201).json(await service.salvar(req.body, req.authUser!));
  atualizar = async (req: AuthenticatedRequest, res: Response) => res.json(await service.salvar(req.body, req.authUser!, req.params.id));
  duplicar = async (req: AuthenticatedRequest, res: Response) => res.status(201).json(await service.duplicar(req.params.id, req.authUser!));
  alternar = async (req: AuthenticatedRequest, res: Response) => res.json(await service.inativar(req.params.id, req.authUser!));
}
