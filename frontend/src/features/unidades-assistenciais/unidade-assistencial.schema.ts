import { z } from "zod";
import { validarCep, validarCnpj } from "@/lib/validators";

const inteiroOpcional = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().int().positive().optional());

export const diretoriaUnidadeSchema = z.object({
  id: z.string().optional(),
  nome_completo: z.string().trim().optional(),
  documento: z.string().trim().optional(),
  funcao: z.string().trim().optional(),
  mandato_inicio: z.string().optional(),
  mandato_fim: z.string().optional()
});

export const unidadeAssistencialFormSchema = z.object({
  id_unidade: z.string().optional(),
  nome_fantasia: z.string().trim().min(3, "Informe o nome fantasia."),
  razao_social: z.string().optional(),
  cnpj: z
    .string()
    .optional()
    .refine((value) => !value || validarCnpj(value), "Informe um CNPJ válido."),
  telefone: z.string().optional(),
  email: z.union([z.string().email("E-mail inválido."), z.literal(""), z.undefined()]).optional(),
  site: z.string().optional(),
  horario_funcionamento: z.string().optional(),
  observacoes: z.string().optional(),
  unidade_principal: z.boolean().default(false),
  cep: z
    .string()
    .optional()
    .refine((value) => !value || validarCep(value), "Informe um CEP válido."),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  ponto_referencia: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  zona: z.string().optional(),
  subzona: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  raio_ponto_metros: inteiroOpcional,
  accuracy_max_ponto_metros: inteiroOpcional,
  ip_validacao_ponto: z.string().optional(),
  ips_publicos_ponto: z.string().optional(),
  redes_locais_ponto: z.string().optional(),
  modo_validacao_ponto: z.string().optional(),
  ping_timeout_ms: inteiroOpcional,
  logomarca: z.string().optional(),
  logomarca_relatorio: z.string().optional(),
  diretoria: z.array(diretoriaUnidadeSchema).default([])
});

export type UnidadeAssistencialFormValues = z.infer<typeof unidadeAssistencialFormSchema>;

export const unidadeAssistencialDefaultValues: UnidadeAssistencialFormValues = {
  nome_fantasia: "",
  razao_social: "",
  cnpj: "",
  telefone: "",
  email: "",
  site: "",
  horario_funcionamento: "",
  observacoes: "",
  unidade_principal: false,
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  ponto_referencia: "",
  cidade: "",
  estado: "",
  zona: "URBANA",
  subzona: "",
  latitude: "",
  longitude: "",
  raio_ponto_metros: 100,
  accuracy_max_ponto_metros: 80,
  ip_validacao_ponto: "",
  ips_publicos_ponto: "",
  redes_locais_ponto: "",
  modo_validacao_ponto: "IP_OU_REDE",
  ping_timeout_ms: 2000,
  logomarca: "",
  logomarca_relatorio: "",
  diretoria: []
};
