import { z } from "zod";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const optionalIsoDate = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());

export const rhCandidatoInputSchema = z.object({
  nomeCompleto: z.string().trim().min(2, "Informe o nome completo."),
  cpf: optionalTrimmedString.nullable().optional(),
  rg: optionalTrimmedString.nullable().optional(),
  pis: optionalTrimmedString.nullable().optional(),
  dataNascimento: optionalIsoDate.nullable().optional(),
  naturalidade: optionalTrimmedString.nullable().optional(),
  estadoCivil: optionalTrimmedString.nullable().optional(),
  nomeMae: optionalTrimmedString.nullable().optional(),
  nomeConjuge: optionalTrimmedString.nullable().optional(),
  vagaPretendida: optionalTrimmedString.nullable().optional(),
  dataPreenchimento: optionalIsoDate.nullable().optional(),
  filhosPossui: z.coerce.boolean().optional(),
  filhos: z.unknown().optional(),
  deficienciaPossui: z.coerce.boolean().optional(),
  deficienciaTipo: optionalTrimmedString.nullable().optional(),
  deficienciaDescricao: optionalTrimmedString.nullable().optional(),
  endereco: z.unknown().optional(),
  telefone: optionalTrimmedString.nullable().optional(),
  whatsapp: optionalTrimmedString.nullable().optional(),
  anexos: z.unknown().optional(),
  statusProcesso: optionalTrimmedString.nullable().optional()
});

export const rhStatusProcessoInputSchema = z.object({
  status: z.string().trim().min(2, "Informe o status do processo.")
});

export const rhEntrevistaInputSchema = z.object({
  tipoRoteiro: optionalTrimmedString.nullable().optional(),
  perguntas: z.unknown().optional(),
  respostas: z.unknown().optional(),
  parecer: optionalTrimmedString.nullable().optional(),
  observacoes: optionalTrimmedString.nullable().optional(),
  dataEntrevista: optionalIsoDate.nullable().optional()
});

export const rhFichaInputSchema = z.object({
  dadosPessoais: z.unknown().optional(),
  dependentes: z.unknown().optional(),
  dadosInternos: z.unknown().optional()
});

export const rhDocumentoInputSchema = z.object({
  tipoDocumento: optionalTrimmedString.nullable().optional(),
  obrigatorio: z.coerce.boolean().optional(),
  status: optionalTrimmedString.nullable().optional(),
  observacao: optionalTrimmedString.nullable().optional()
});

export const rhArquivoInputSchema = z.object({
  categoria: z.string().trim().min(2, "Informe a categoria do arquivo."),
  tipoDocumento: optionalTrimmedString.nullable().optional(),
  nomeArquivo: z.string().trim().min(2, "Informe o nome do arquivo."),
  mimeType: z.string().trim().min(3, "Informe o mime type do arquivo."),
  tamanhoBytes: z.coerce.number().int().positive().optional().nullable(),
  conteudoBase64: optionalTrimmedString.nullable().optional(),
  caminhoArquivo: optionalTrimmedString.nullable().optional()
});

export const rhTermoInputSchema = z.object({
  tipo: z.string().trim().min(2, "Informe o tipo do termo."),
  dados: z.unknown().optional(),
  statusAssinatura: optionalTrimmedString.nullable().optional(),
  dataAssinatura: optionalIsoDate.nullable().optional(),
  responsavel: optionalTrimmedString.nullable().optional()
});

export const rhPpdInputSchema = z.object({
  cabecalho: z.unknown().optional(),
  ladoA: z.unknown().optional(),
  ladoB: z.unknown().optional()
});

export const rhCartaBancoInputSchema = z.object({
  dados: z.unknown().optional()
});
