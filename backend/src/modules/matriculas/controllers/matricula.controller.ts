import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { MatriculaService } from "../services/matricula.service.js";

const service = new MatriculaService();

export class MatriculaController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const matriculas = await service.listar(request.query, request.authUser?.tenant_id);
    return response.json({ matriculas });
  }

  async obterResumoCatalogo(request: AuthenticatedRequest, response: Response) {
    const resumo = await service.obterResumoCatalogo(request.authUser?.tenant_id);
    return response.json({ resumo });
  }

  async buscarPorId(request: AuthenticatedRequest, response: Response) {
    const matricula = await service.buscarPorId(request.params.id, request.authUser?.tenant_id);
    return response.json({ matricula });
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const matricula = await service.criar(
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.status(201).json({ matricula });
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const matricula = await service.atualizar(
      request.params.id,
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.json({ matricula });
  }

  async remover(request: AuthenticatedRequest, response: Response) {
    await service.remover(request.params.id, request.authUser?.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }

  async listarBeneficiarios(request: AuthenticatedRequest, response: Response) {
    const beneficiarios = await service.listarBeneficiarios(request.query.termo, request.authUser?.tenant_id);
    return response.json({ beneficiarios });
  }

  async listarProfissionais(request: AuthenticatedRequest, response: Response) {
    const profissionais = await service.listarProfissionais(request.query.termo, request.authUser?.tenant_id);
    return response.json({ profissionais });
  }

  async listarSalas(request: AuthenticatedRequest, response: Response) {
    const salas = await service.listarSalas(request.authUser?.tenant_id);
    return response.json({ salas });
  }

  async listarPresencaDatas(request: AuthenticatedRequest, response: Response) {
    const datas = await service.listarPresencaDatas(request.params.id, request.query.pendentes, request.authUser?.tenant_id);
    return response.json({ datas });
  }

  async criarPresencaData(request: AuthenticatedRequest, response: Response) {
    const data = await service.criarPresencaData(request.params.id, request.body, request.authUser?.tenant_id);
    return response.status(201).json(data);
  }

  async atualizarPresencaData(request: AuthenticatedRequest, response: Response) {
    const data = await service.atualizarPresencaData(request.params.id, request.params.presencaDataId, request.body, request.authUser?.tenant_id);
    return response.json(data);
  }

  async cancelarPresencaData(request: AuthenticatedRequest, response: Response) {
    const data = await service.cancelarPresencaData(request.params.id, request.params.presencaDataId, request.authUser?.tenant_id);
    return response.json(data);
  }

  async removerPresencaData(request: AuthenticatedRequest, response: Response) {
    await service.removerPresencaData(
      request.params.id,
      request.params.presencaDataId,
      request.authUser?.tenant_id,
      request.authUser
        ? {
            id: request.authUser.id,
            nome: request.authUser.nome ?? request.authUser.nomeUsuario
          }
        : undefined
    );
    return response.status(204).send();
  }

  async listarPresencasPorData(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.listarPresencasPorData(request.params.id, request.params.presencaDataId, request.authUser?.tenant_id);
    return response.json(resultado);
  }

  async salvarPresencasPorData(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.salvarPresencasPorData(
      request.params.id,
      request.params.presencaDataId,
      request.body,
      request.authUser?.tenant_id,
      request.authUser
        ? {
            id: request.authUser.id,
            nome: request.authUser.nome ?? request.authUser.nomeUsuario
          }
        : undefined
    );
    return response.json(resultado);
  }

  async validarSenhaPresenca(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.validarSenhaPresenca(
      request.body,
      request.authUser?.tenant_id,
      request.authUser
        ? {
            id: request.authUser.id,
            nome: request.authUser.nome ?? request.authUser.nomeUsuario
          }
        : undefined
    );
    return response.json(resultado);
  }
}
