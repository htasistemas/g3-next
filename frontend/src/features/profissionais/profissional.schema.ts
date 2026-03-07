import { z } from "zod";
import { validarCep, validarCpf } from "@/lib/validators";

const inteiroOpcional = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().int().positive().optional());

export const profissionalStatusOptions = [
  "ATIVO",
  "INATIVO",
  "DESATUALIZADO",
  "INCOMPLETO",
  "EM_ANALISE",
  "BLOQUEADO"
] as const;

export const profissionalFormSchema = z.object({
  id_profissional: z.string().optional(),
  nome_completo: z.string().trim().min(3, "Informe o nome completo."),
  cpf: z
    .string()
    .optional()
    .refine((value) => !value || validarCpf(value), "Informe um CPF válido."),
  nome_social: z.string().optional(),
  apelido: z.string().optional(),
  data_nascimento: z.string().optional(),
  foto_3x4: z.string().optional(),
  sexo_biologico: z.string().optional(),
  identidade_genero: z.string().optional(),
  cor_raca: z.string().optional(),
  estado_civil: z.string().optional(),
  nacionalidade: z.string().optional(),
  naturalidade_cidade: z.string().optional(),
  naturalidade_uf: z.string().optional(),
  nome_mae: z.string().optional(),
  nome_pai: z.string().optional(),
  vinculo: z.string().optional(),
  categoria: z.string().trim().min(2, "Informe a categoria."),
  registro_conselho: z.string().optional(),
  especialidade: z.string().optional(),
  email: z.union([z.string().email("E-mail inválido."), z.literal(""), z.undefined()]).optional(),
  telefone: z.string().optional(),
  unidade: z.string().optional(),
  sala_atendimento: z.string().optional(),
  carga_horaria: inteiroOpcional,
  disponibilidade: z.array(z.string()).default([]),
  canais_atendimento: z.array(z.string()).default([]),
  status: z.enum(profissionalStatusOptions),
  tags: z.array(z.string()).default([]),
  resumo: z.string().optional(),
  observacoes: z.string().optional(),
  cep: z
    .string()
    .optional()
    .refine((value) => !value || validarCep(value), "Informe um CEP válido."),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  ponto_referencia: z.string().optional(),
  municipio: z.string().optional(),
  zona: z.string().optional(),
  subzona: z.string().optional(),
  uf: z.string().optional()
});

export type ProfissionalFormValues = z.infer<typeof profissionalFormSchema>;

export const profissionalDefaultValues: ProfissionalFormValues = {
  nome_completo: "",
  cpf: "",
  nome_social: "",
  apelido: "",
  data_nascimento: "",
  foto_3x4: "",
  sexo_biologico: "",
  identidade_genero: "",
  cor_raca: "",
  estado_civil: "",
  nacionalidade: "",
  naturalidade_cidade: "",
  naturalidade_uf: "",
  nome_mae: "",
  nome_pai: "",
  vinculo: "VOLUNTARIO",
  categoria: "",
  registro_conselho: "",
  especialidade: "",
  email: "",
  telefone: "",
  unidade: "",
  sala_atendimento: "",
  carga_horaria: undefined,
  disponibilidade: [],
  canais_atendimento: [],
  status: "EM_ANALISE",
  tags: [],
  resumo: "",
  observacoes: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  ponto_referencia: "",
  municipio: "",
  zona: "",
  subzona: "",
  uf: ""
};
