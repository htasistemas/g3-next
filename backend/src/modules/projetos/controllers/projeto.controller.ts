import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { ProjetoService } from "../services/projeto.service.js";
import { ProjetoReportService } from "../services/projeto-report.service.js";

const service = new ProjetoService();
const reportService = new ProjetoReportService();

function getActor(request: AuthenticatedRequest) {
  return {
    id: request.authUser?.id,
    nome: request.authUser?.nome ?? request.authUser?.nomeUsuario ?? "Usuário",
    tenant_id: request.authUser?.tenant_id
    ,contexto: request.authUser?.contexto
  };
}

export class ProjetoController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const projetos = await service.listar(request.query, request.authUser?.tenant_id, request.authUser?.contexto);
    return response.json({ projetos });
  }

  async dashboard(request: AuthenticatedRequest, response: Response) {
    const dashboard = await service.dashboard(request.query, request.authUser?.tenant_id, request.authUser?.contexto);
    return response.json(dashboard);
  }

  async buscarPorId(request: AuthenticatedRequest, response: Response) {
    const projeto = await service.buscarPorId(request.params.id, request.authUser?.tenant_id, request.authUser?.contexto);
    return response.json({ projeto });
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const projeto = await service.criar(request.body, getActor(request));
    return response.status(201).json({ projeto });
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const projeto = await service.atualizar(request.params.id, request.body, getActor(request));
    return response.json({ projeto });
  }

  async remover(request: AuthenticatedRequest, response: Response) {
    await service.remover(request.params.id, getActor(request));
    return response.status(204).send();
  }

  async listarHistorico(request: AuthenticatedRequest, response: Response) {
    const historico = await service.listarHistorico(request.params.id, request.authUser?.tenant_id, request.authUser?.contexto);
    return response.json({ historico });
  }

  async criarTarefa(request: AuthenticatedRequest, response: Response) {
    const tarefa = await service.criarTarefa(request.params.id, request.body, getActor(request));
    return response.status(201).json({ tarefa });
  }

  async atualizarTarefa(request: AuthenticatedRequest, response: Response) {
    const tarefa = await service.atualizarTarefa(
      request.params.id,
      request.params.tarefaId,
      request.body,
      getActor(request)
    );
    return response.json({ tarefa });
  }

  async moverTarefa(request: AuthenticatedRequest, response: Response) {
    const tarefa = await service.moverTarefa(
      request.params.id,
      request.params.tarefaId,
      request.body,
      getActor(request)
    );
    return response.json({ tarefa });
  }

  async gerarRelatorio(request: AuthenticatedRequest, response: Response) {
    const tipo = request.params.tipo;
    const resultado = await reportService.gerar(tipo, request.body, request.authUser);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `inline; filename="${resultado.filename}"`);
    return response.send(resultado.pdf);
  }
}
