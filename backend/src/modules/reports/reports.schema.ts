import { z } from "zod";

const optionalString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

export const formatoRelatorioSchema = z.enum(["pdf", "html"]).default("pdf");

export const beneficiarioRelacaoRequestSchema = z.object({
  nome: optionalString,
  cpf: optionalString,
  codigo: optionalString,
  status: optionalString,
  dataNascimento: optionalString,
  usuarioEmissor: optionalString
});

export const beneficiarioFichaRequestSchema = z.object({
  beneficiarioId: z.string().trim().min(1, "beneficiarioId e obrigatorio."),
  usuarioEmissor: optionalString
});

export const termoAutorizacaoRequestSchema = z.object({
  beneficiarioNome: z.string().trim().min(1, "beneficiarioNome e obrigatorio."),
  rg: optionalString,
  cpf: optionalString,
  enderecoCompleto: optionalString,
  cidade: optionalString,
  uf: optionalString,
  finalidadeDados: optionalString,
  finalidadeImagem: optionalString,
  vigencia: optionalString,
  localAssinatura: optionalString,
  dataAssinatura: optionalString,
  responsavelNome: optionalString,
  responsavelCpf: optionalString,
  responsavelRelacao: optionalString,
  representanteNome: optionalString,
  representanteCargo: optionalString,
  issuedBy: optionalString
});

export const unidadeAssistencialRelacaoRequestSchema = z.object({
  nome_fantasia: optionalString,
  cnpj: optionalString,
  cidade: optionalString,
  unidade_principal: z.boolean().optional(),
  usuarioEmissor: optionalString
});

export const profissionalRelacaoRequestSchema = z.object({
  nome: optionalString,
  categoria: optionalString,
  status: optionalString,
  cpf: optionalString,
  vinculo: optionalString,
  usuarioEmissor: optionalString
});

export const profissionalFichaRequestSchema = z.object({
  profissionalId: z.string().trim().min(1, "profissionalId e obrigatorio."),
  usuarioEmissor: optionalString
});

export const voluntarioRelacaoRequestSchema = z.object({
  nome: optionalString,
  cpf: optionalString,
  status: optionalString,
  email: optionalString,
  usuarioEmissor: optionalString
});

export const voluntarioFichaRequestSchema = z.object({
  voluntarioId: z.string().trim().min(1, "voluntarioId e obrigatorio."),
  usuarioEmissor: optionalString
});
