import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { CentralAtendimentosService } from "../services/central-atendimentos.service.js";

const service = new CentralAtendimentosService();

export class CentralAtendimentosController {
  async buscarBeneficiarios(request: AuthenticatedRequest, response: Response) {
    const beneficiarios = await service.buscarBeneficiarios(request.query);
    return response.json({ beneficiarios });
  }

  async obterVisaoGeral(request: AuthenticatedRequest, response: Response) {
    const visao = await service.obterVisaoGeral(request.params.beneficiarioId);
    return response.json(visao);
  }

  async listarAtendimentos(request: AuthenticatedRequest, response: Response) {
    const atendimentos = await service.listarAtendimentos(request.params.beneficiarioId);
    return response.json({ atendimentos });
  }

  async criarAtendimento(request: AuthenticatedRequest, response: Response) {
    const atendimentos = await service.criarAtendimento(
      request.params.beneficiarioId,
      request.body,
      request.authUser
    );
    return response.status(201).json({ atendimentos });
  }

  async atualizarAtendimento(request: AuthenticatedRequest, response: Response) {
    const atendimentos = await service.atualizarAtendimento(
      request.params.beneficiarioId,
      request.params.id,
      request.body,
      request.authUser
    );
    return response.json({ atendimentos });
  }

  async removerAtendimento(request: AuthenticatedRequest, response: Response) {
    await service.removerAtendimento(request.params.beneficiarioId, request.params.id, request.authUser);
    return response.status(204).send();
  }

  async listarBeneficios(request: AuthenticatedRequest, response: Response) {
    const beneficios = await service.listarBeneficios(request.params.beneficiarioId);
    return response.json({ beneficios });
  }

  async criarBeneficio(request: AuthenticatedRequest, response: Response) {
    const beneficios = await service.criarBeneficio(
      request.params.beneficiarioId,
      request.body,
      request.authUser
    );
    return response.status(201).json({ beneficios });
  }

  async atualizarBeneficio(request: AuthenticatedRequest, response: Response) {
    const beneficios = await service.atualizarBeneficio(
      request.params.beneficiarioId,
      request.params.id,
      request.body,
      request.authUser
    );
    return response.json({ beneficios });
  }

  async removerBeneficio(request: AuthenticatedRequest, response: Response) {
    await service.removerBeneficio(request.params.beneficiarioId, request.params.id, request.authUser);
    return response.status(204).send();
  }

  async listarEncaminhamentos(request: AuthenticatedRequest, response: Response) {
    const encaminhamentos = await service.listarEncaminhamentos(request.params.beneficiarioId);
    return response.json({ encaminhamentos });
  }

  async criarEncaminhamento(request: AuthenticatedRequest, response: Response) {
    const encaminhamentos = await service.criarEncaminhamento(
      request.params.beneficiarioId,
      request.body,
      request.authUser
    );
    return response.status(201).json({ encaminhamentos });
  }

  async atualizarEncaminhamento(request: AuthenticatedRequest, response: Response) {
    const encaminhamentos = await service.atualizarEncaminhamento(
      request.params.beneficiarioId,
      request.params.id,
      request.body,
      request.authUser
    );
    return response.json({ encaminhamentos });
  }

  async removerEncaminhamento(request: AuthenticatedRequest, response: Response) {
    await service.removerEncaminhamento(
      request.params.beneficiarioId,
      request.params.id,
      request.authUser
    );
    return response.status(204).send();
  }

  async listarHistorico(request: AuthenticatedRequest, response: Response) {
    const historico = await service.listarHistorico(request.params.beneficiarioId);
    return response.json({ historico });
  }

  async listarCustos(request: AuthenticatedRequest, response: Response) {
    const custos = await service.listarCustos(request.params.beneficiarioId);
    return response.json(custos);
  }

  async listarGrupoFamiliar(request: AuthenticatedRequest, response: Response) {
    const grupoFamiliar = await service.listarGrupoFamiliar(request.params.beneficiarioId);
    return response.json({ grupoFamiliar });
  }

  async listarAlertas(request: AuthenticatedRequest, response: Response) {
    const alertas = await service.listarAlertas(request.params.beneficiarioId);
    return response.json({ alertas });
  }

  async gerarRelatorio(request: AuthenticatedRequest, response: Response) {
    const relatorio = await service.gerarRelatorio(
      request.params.beneficiarioId,
      String(request.params.tipo ?? "")
    );
    return response.json(relatorio);
  }

  async gerarRelatorioPdf(request: AuthenticatedRequest, response: Response) {
    const pdf = await service.gerarRelatorioPdf(
      request.params.beneficiarioId,
      String(request.params.tipo ?? "")
    );
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `inline; filename="${pdf.nomeArquivo}"`);
    return response.send(pdf.buffer);
  }
}
