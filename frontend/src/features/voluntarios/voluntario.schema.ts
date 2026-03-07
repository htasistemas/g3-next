import { z } from "zod";
import { validarCep, validarCpf } from "@/lib/validators";

export const voluntarioStatusOptions = ["ATIVO", "INATIVO", "BLOQUEADO"] as const;

export const voluntarioFormSchema = z.object({
  id_voluntario: z.string().optional(),
  profissional_id: z.string().optional(),
  nome_completo: z.string().trim().min(3, "Informe o nome completo."),
  cpf: z
    .string()
    .trim()
    .refine((value) => validarCpf(value), "Informe um CPF válido."),
  rg: z.string().optional(),
  foto_3x4: z.string().optional(),
  data_nascimento: z.string().optional(),
  genero: z.string().optional(),
  profissao: z.string().optional(),
  motivacao: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().trim().email("Informe um e-mail válido."),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  area_interesse: z.string().optional(),
  habilidades: z.string().optional(),
  idiomas: z.string().optional(),
  linkedin: z.string().optional(),
  status: z.enum(voluntarioStatusOptions),
  disponibilidade_dias: z.array(z.string()).default([]),
  disponibilidade_periodos: z.array(z.string()).default([]),
  carga_horaria_semanal: z.string().optional(),
  presencial: z.boolean().default(false),
  remoto: z.boolean().default(false),
  inicio_previsto: z.string().optional(),
  observacoes: z.string().optional(),
  documento_identificacao: z.string().optional(),
  comprovante_endereco: z.string().optional(),
  aceite_voluntariado: z.boolean().default(false),
  aceite_imagem: z.boolean().default(false),
  assinatura_digital: z.string().optional(),
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

export type VoluntarioFormValues = z.infer<typeof voluntarioFormSchema>;

export const voluntarioDefaultValues: VoluntarioFormValues = {
  profissional_id: "",
  nome_completo: "",
  cpf: "",
  rg: "",
  foto_3x4: "",
  data_nascimento: "",
  genero: "",
  profissao: "",
  motivacao: "",
  telefone: "",
  email: "",
  cidade: "",
  estado: "",
  area_interesse: "",
  habilidades: "",
  idiomas: "",
  linkedin: "",
  status: "ATIVO",
  disponibilidade_dias: [],
  disponibilidade_periodos: [],
  carga_horaria_semanal: "",
  presencial: true,
  remoto: false,
  inicio_previsto: "",
  observacoes: "",
  documento_identificacao: "",
  comprovante_endereco: "",
  aceite_voluntariado: false,
  aceite_imagem: false,
  assinatura_digital: "",
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
