import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { BibliotecaService } from "../services/biblioteca.service.js";

const service = new BibliotecaService();

export class BibliotecaController {
  async listarLivros(_request: Request, response: Response) {
    const livros = await service.listarLivros();
    return response.json({ livros });
  }

  async obterProximoCodigoLivro(_request: Request, response: Response) {
    const payload = await service.obterProximoCodigoLivro();
    return response.json(payload);
  }

  async consultarLivroPorIsbn(request: Request, response: Response) {
    const livro = await service.consultarLivroPorIsbn(request.params.isbn);
    return response.json({ livro });
  }

  async criarLivro(request: Request, response: Response) {
    const livro = await service.criarLivro(
      request.body,
      (request as AuthenticatedRequest).authUser?.id
    );
    return response.status(201).json({ livro });
  }

  async atualizarLivro(request: Request, response: Response) {
    const livro = await service.atualizarLivro(
      request.params.id,
      request.body,
      (request as AuthenticatedRequest).authUser?.id
    );
    return response.json({ livro });
  }

  async excluirLivro(request: Request, response: Response) {
    await service.excluirLivro(request.params.id, (request as AuthenticatedRequest).authUser?.id);
    return response.status(204).send();
  }

  async listarEmprestimos(_request: Request, response: Response) {
    const emprestimos = await service.listarEmprestimos();
    return response.json({ emprestimos });
  }

  async criarEmprestimo(request: Request, response: Response) {
    const emprestimo = await service.criarEmprestimo(request.body);
    return response.status(201).json({ emprestimo });
  }

  async atualizarEmprestimo(request: Request, response: Response) {
    const emprestimo = await service.atualizarEmprestimo(request.params.id, request.body);
    return response.json({ emprestimo });
  }

  async excluirEmprestimo(request: Request, response: Response) {
    await service.excluirEmprestimo(request.params.id);
    return response.status(204).send();
  }

  async registrarDevolucao(request: Request, response: Response) {
    const emprestimo = await service.registrarDevolucao(request.params.id, request.body);
    return response.json({ emprestimo });
  }

  async listarAlertas(_request: Request, response: Response) {
    const alertas = await service.listarAlertas();
    return response.json({ alertas });
  }
}
