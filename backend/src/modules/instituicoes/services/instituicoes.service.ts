import { normalizeDigits, trimOrUndefined } from "../../../utils/string-utils.js";
import { instituicaoCreateSchema, instituicaoResetAdminSchema, instituicaoUpdateSchema } from "../instituicoes.schema.js";
import { InstituicoesRepository } from "../repositories/instituicoes.repository.js";

function slugify(valor: string) {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export class InstituicoesService {
  private readonly repository = new InstituicoesRepository();

  async listar() {
    return this.repository.listar();
  }

  async criar(rawInput: unknown) {
    const input = instituicaoCreateSchema.parse(rawInput);
    return this.repository.criar({
      ...input,
      cnpj: normalizeDigits(input.cnpj) ?? input.cnpj,
      slug: slugify(input.slug || input.nome_fantasia || input.razao_social),
      codigo: trimOrUndefined(input.codigo)?.toUpperCase()
    });
  }

  async atualizar(id: string, rawInput: unknown) {
    const input = instituicaoUpdateSchema.parse(rawInput);
    return this.repository.atualizar(id, {
      ...input,
      cnpj: input.cnpj ? normalizeDigits(input.cnpj) ?? input.cnpj : undefined,
      slug: input.slug ? slugify(input.slug) : undefined,
      codigo: trimOrUndefined(input.codigo)?.toUpperCase()
    });
  }

  async resetarAdmin(id: string, rawInput: unknown) {
    const input = instituicaoResetAdminSchema.parse(rawInput);
    return this.repository.resetarSenhaAdmin(id, input.email, input.nova_senha);
  }
}
