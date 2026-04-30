import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { BibliotecaService } from "../services/biblioteca.service.js";

const service = new BibliotecaService();

export class BibliotecaController {
  async listarLivros(request: AuthenticatedRequest, response: Response) {
    const livros = await service.listarLivros(request.authUser?.tenant_id);
    return response.json({ livros });
  }

  async obterProximoCodigoLivro(request: AuthenticatedRequest, response: Response) {
    const payload = await service.obterProximoCodigoLivro(request.authUser?.tenant_id);
    return response.json(payload);
  }

  async consultarLivroPorIsbn(request: Request, response: Response) {
    const livro = await service.consultarLivroPorIsbn(request.params.isbn);
    return response.json({ livro });
  }

  async criarLivro(request: AuthenticatedRequest, response: Response) {
    const livro = await service.criarLivro(
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.status(201).json({ livro });
  }

  async atualizarLivro(request: AuthenticatedRequest, response: Response) {
    const livro = await service.atualizarLivro(
      request.params.id,
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.json({ livro });
  }

  async excluirLivro(request: AuthenticatedRequest, response: Response) {
    await service.excluirLivro(request.params.id, request.authUser?.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }

  async listarEmprestimos(request: AuthenticatedRequest, response: Response) {
    const emprestimos = await service.listarEmprestimos(request.authUser?.tenant_id);
    return response.json({ emprestimos });
  }

  async criarEmprestimo(request: AuthenticatedRequest, response: Response) {
    const emprestimo = await service.criarEmprestimo(request.body, request.authUser?.tenant_id);
    return response.status(201).json({ emprestimo });
  }

  async atualizarEmprestimo(request: AuthenticatedRequest, response: Response) {
    const emprestimo = await service.atualizarEmprestimo(request.params.id, request.body, request.authUser?.tenant_id);
    return response.json({ emprestimo });
  }

  async excluirEmprestimo(request: AuthenticatedRequest, response: Response) {
    await service.excluirEmprestimo(request.params.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }

  async registrarDevolucao(request: AuthenticatedRequest, response: Response) {
    const emprestimo = await service.registrarDevolucao(request.params.id, request.body, request.authUser?.tenant_id);
    return response.json({ emprestimo });
  }

  async listarAlertas(request: AuthenticatedRequest, response: Response) {
    const alertas = await service.listarAlertas(request.authUser?.tenant_id);
    return response.json({ alertas });
  }
}
