import type { Request, Response } from "express";
import { OficiosService } from "../services/oficios.service.js";

const service = new OficiosService();

export class OficiosController {
  async listar(_request: Request, response: Response) {
    const oficios = await service.listar();
    return response.json({ oficios });
  }

  async obter(request: Request, response: Response) {
    const oficio = await service.obter(request.params.id);
    return response.json(oficio);
  }

  async criar(request: Request, response: Response) {
    const oficio = await service.criar(request.body);
    return response.status(201).json(oficio);
  }

  async atualizar(request: Request, response: Response) {
    const oficio = await service.atualizar(request.params.id, request.body);
    return response.json(oficio);
  }

  async excluir(request: Request, response: Response) {
    await service.remover(request.params.id);
    return response.status(204).send();
  }

  async salvarPdfAssinado(request: Request, response: Response) {
    const oficio = await service.salvarPdfAssinado(request.params.id, request.body);
    return response.json(oficio);
  }

  async obterPdfAssinado(request: Request, response: Response) {
    const pdf = await service.obterPdfAssinado(request.params.id);
    return response.json(pdf);
  }

  async removerPdfAssinado(request: Request, response: Response) {
    await service.removerPdfAssinado(request.params.id);
    return response.status(204).send();
  }

  async listarImagens(request: Request, response: Response) {
    const imagens = await service.listarImagens(request.params.id);
    return response.json(imagens);
  }

  async adicionarImagem(request: Request, response: Response) {
    const imagem = await service.adicionarImagem(request.params.id, request.body);
    return response.status(201).json(imagem);
  }

  async removerImagem(request: Request, response: Response) {
    await service.removerImagem(request.params.id, request.params.imagemId);
    return response.status(204).send();
  }
}
