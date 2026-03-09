import type { Request, Response } from "express";
import { MatriculaService } from "../services/matricula.service.js";

const service = new MatriculaService();

export class MatriculaController {
  async listar(request: Request, response: Response) {
    const matriculas = await service.listar(request.query);
    return response.json({ matriculas });
  }

  async buscarPorId(request: Request, response: Response) {
    const matricula = await service.buscarPorId(request.params.id);
    return response.json({ matricula });
  }

  async criar(request: Request, response: Response) {
    const matricula = await service.criar(request.body);
    return response.status(201).json({ matricula });
  }

  async atualizar(request: Request, response: Response) {
    const matricula = await service.atualizar(request.params.id, request.body);
    return response.json({ matricula });
  }

  async remover(request: Request, response: Response) {
    await service.remover(request.params.id);
    return response.status(204).send();
  }

  async listarBeneficiarios(request: Request, response: Response) {
    const beneficiarios = await service.listarBeneficiarios(request.query.termo);
    return response.json({ beneficiarios });
  }

  async listarProfissionais(request: Request, response: Response) {
    const profissionais = await service.listarProfissionais(request.query.termo);
    return response.json({ profissionais });
  }

  async listarSalas(_request: Request, response: Response) {
    const salas = await service.listarSalas();
    return response.json({ salas });
  }

  async listarPresencaDatas(request: Request, response: Response) {
    const datas = await service.listarPresencaDatas(request.params.id, request.query.pendentes);
    return response.json({ datas });
  }

  async criarPresencaData(request: Request, response: Response) {
    const data = await service.criarPresencaData(request.params.id, request.body);
    return response.status(201).json(data);
  }

  async atualizarPresencaData(request: Request, response: Response) {
    const data = await service.atualizarPresencaData(request.params.id, request.params.presencaDataId, request.body);
    return response.json(data);
  }

  async cancelarPresencaData(request: Request, response: Response) {
    const data = await service.cancelarPresencaData(request.params.id, request.params.presencaDataId);
    return response.json(data);
  }

  async removerPresencaData(request: Request, response: Response) {
    await service.removerPresencaData(request.params.id, request.params.presencaDataId);
    return response.status(204).send();
  }

  async listarPresencasPorData(request: Request, response: Response) {
    const resultado = await service.listarPresencasPorData(request.params.id, request.params.presencaDataId);
    return response.json(resultado);
  }

  async salvarPresencasPorData(request: Request, response: Response) {
    const resultado = await service.salvarPresencasPorData(request.params.id, request.params.presencaDataId, request.body);
    return response.json(resultado);
  }
}
