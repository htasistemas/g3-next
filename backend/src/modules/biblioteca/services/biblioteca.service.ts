import { AppError } from "../../../shared/errors/app-error.js";
import { mapEmprestimoRowToResponse, mapLivroRowToResponse } from "../biblioteca.mapper.js";
import { bibliotecaEmprestimoInputSchema, bibliotecaLivroInputSchema } from "../biblioteca.schema.js";
import { BibliotecaRepository } from "../repositories/biblioteca.repository.js";
import type { BibliotecaLivroIsbnConsulta } from "../biblioteca.types.js";

export class BibliotecaService {
  private readonly repository = new BibliotecaRepository();

  async listarLivros() {
    const rows = await this.repository.listarLivros();
    return rows.map(mapLivroRowToResponse);
  }

  async obterProximoCodigoLivro() {
    const codigo = await this.repository.obterProximoCodigo();
    return { codigo };
  }

  async consultarLivroPorIsbn(rawIsbn: string): Promise<BibliotecaLivroIsbnConsulta> {
    const isbn = rawIsbn.replace(/[^0-9Xx]/g, "").toUpperCase();
    if (isbn.length !== 10 && isbn.length !== 13) {
      throw new AppError("Informe um ISBN válido com 10 ou 13 caracteres.", 400);
    }

    const response = await fetch(`https://brasilapi.com.br/api/isbn/v1/${encodeURIComponent(isbn)}`);

    if (response.status === 404) {
      throw new AppError("ISBN não encontrado na BrasilAPI.", 404);
    }

    if (!response.ok) {
      throw new AppError("Não foi possível consultar a BrasilAPI no momento.", 502);
    }

    const payload = (await response.json()) as {
      isbn?: string;
      title?: string;
      subtitle?: string;
      authors?: string[];
      publisher?: string;
      synopsis?: string;
      year?: number;
      subjects?: string[];
      cover_url?: string;
    };

    const titulo = String(payload.title ?? "").trim();
    const autores = Array.isArray(payload.authors)
      ? payload.authors.map((item) => String(item).trim()).filter(Boolean)
      : [];

    if (!titulo || !autores.length) {
      throw new AppError("A BrasilAPI retornou dados incompletos para este ISBN.", 502);
    }

    return {
      isbn: String(payload.isbn ?? isbn),
      titulo,
      subtitulo: payload.subtitle?.trim() || undefined,
      autor: autores.join("; "),
      autores,
      editora: payload.publisher?.trim() || undefined,
      anoPublicacao: typeof payload.year === "number" ? payload.year : undefined,
      categoria: Array.isArray(payload.subjects)
        ? payload.subjects.map((item) => String(item).trim()).find(Boolean)
        : undefined,
      sinopse: payload.synopsis?.trim() || undefined,
      capaUrl: payload.cover_url?.trim() || undefined
    };
  }

  async criarLivro(rawInput: unknown) {
    const input = bibliotecaLivroInputSchema.parse(rawInput);
    const row = await this.repository.criarLivro(input);
    return mapLivroRowToResponse(row);
  }

  async atualizarLivro(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const input = bibliotecaLivroInputSchema.parse(rawInput);
    const row = await this.repository.atualizarLivro(id, input);
    return mapLivroRowToResponse(row);
  }

  async excluirLivro(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.removerLivro(id);
  }

  async listarEmprestimos() {
    const rows = await this.repository.listarEmprestimos();
    return rows.map(mapEmprestimoRowToResponse);
  }

  async criarEmprestimo(rawInput: unknown) {
    const input = bibliotecaEmprestimoInputSchema.parse(rawInput);
    const row = await this.repository.criarEmprestimo(input);
    return mapEmprestimoRowToResponse(row);
  }

  async atualizarEmprestimo(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const input = bibliotecaEmprestimoInputSchema.parse(rawInput);
    const row = await this.repository.atualizarEmprestimo(id, input);
    return mapEmprestimoRowToResponse(row);
  }

  async excluirEmprestimo(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.removerEmprestimo(id);
  }

  async registrarDevolucao(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const input =
      typeof rawInput === "object" && rawInput && "dataDevolucaoReal" in (rawInput as Record<string, unknown>)
        ? String((rawInput as { dataDevolucaoReal: string }).dataDevolucaoReal ?? "")
        : "";

    if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      throw new AppError("Informe a data de devolucao no formato YYYY-MM-DD.", 400);
    }

    const row = await this.repository.registrarDevolucao(id, input);
    return mapEmprestimoRowToResponse(row);
  }

  async listarAlertas() {
    const rows = await this.repository.listarAlertas();
    return rows.map((item) => ({
      emprestimoId: String(item.emprestimo_id),
      livroTitulo: item.livro_titulo,
      beneficiarioNome: item.beneficiario_nome ?? undefined,
      dataDevolucaoPrevista: item.data_devolucao_prevista.toISOString().slice(0, 10),
      diasParaVencimento: Number(item.dias_para_vencimento),
      status: item.status_alerta as "ATRASADO" | "VENCENDO" | "EM_DIA"
    }));
  }

  private parseId(rawId: string): bigint {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador invalido.", 400);
    }
    return BigInt(parsed);
  }
}
