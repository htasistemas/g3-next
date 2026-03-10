import { BibliotecaService } from "../services/biblioteca.service.js";
const service = new BibliotecaService();
export class BibliotecaController {
    async listarLivros(_request, response) {
        const livros = await service.listarLivros();
        return response.json({ livros });
    }
    async obterProximoCodigoLivro(_request, response) {
        const payload = await service.obterProximoCodigoLivro();
        return response.json(payload);
    }
    async consultarLivroPorIsbn(request, response) {
        const livro = await service.consultarLivroPorIsbn(request.params.isbn);
        return response.json({ livro });
    }
    async criarLivro(request, response) {
        const livro = await service.criarLivro(request.body);
        return response.status(201).json({ livro });
    }
    async atualizarLivro(request, response) {
        const livro = await service.atualizarLivro(request.params.id, request.body);
        return response.json({ livro });
    }
    async excluirLivro(request, response) {
        await service.excluirLivro(request.params.id);
        return response.status(204).send();
    }
    async listarEmprestimos(_request, response) {
        const emprestimos = await service.listarEmprestimos();
        return response.json({ emprestimos });
    }
    async criarEmprestimo(request, response) {
        const emprestimo = await service.criarEmprestimo(request.body);
        return response.status(201).json({ emprestimo });
    }
    async atualizarEmprestimo(request, response) {
        const emprestimo = await service.atualizarEmprestimo(request.params.id, request.body);
        return response.json({ emprestimo });
    }
    async excluirEmprestimo(request, response) {
        await service.excluirEmprestimo(request.params.id);
        return response.status(204).send();
    }
    async registrarDevolucao(request, response) {
        const emprestimo = await service.registrarDevolucao(request.params.id, request.body);
        return response.json({ emprestimo });
    }
    async listarAlertas(_request, response) {
        const alertas = await service.listarAlertas();
        return response.json({ alertas });
    }
}
