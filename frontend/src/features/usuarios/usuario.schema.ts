import { z } from "zod";
import { validarCpf } from "@/lib/validators";
import type { UsuarioOrigemTipo, UsuarioStatus } from "@/types/usuario";

export const usuarioStatusOptions: { value: UsuarioStatus; label: string }[] = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "BLOQUEADO", label: "Bloqueado" }
];

export const usuarioOrigemOptions: { value: UsuarioOrigemTipo; label: string }[] = [
  { value: "BENEFICIARIO", label: "Beneficiário" },
  { value: "PROFISSIONAL", label: "Profissional" },
  { value: "VOLUNTARIO", label: "Voluntário" }
];

const optionalTrimmedString = z
  .string()
  .optional()
  .transform((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  });

const optionalBoolean = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      if (value === "true") return true;
      if (value === "false") return false;
    }
    return undefined;
  });

const optionalStringArray = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .transform((value) => {
    if (Array.isArray(value)) {
      return value.map((item) => item.trim()).filter(Boolean);
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      return trimmed
        .split(/[;,]/g)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return undefined;
  });

export const usuarioFormSchema = z
  .object({
    id_usuario: z.string().optional(),
    nome_completo: z.string().trim().min(3, "Informe o nome completo."),
    nome_exibicao: optionalTrimmedString,
    nome_usuario: z.string().trim().min(3, "Informe o login."),
    email: z.string().trim().email("Informe um e-mail valido."),
    telefone: optionalTrimmedString,
    cpf: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || validarCpf(value), "Informe um CPF valido."),
    matricula: optionalTrimmedString,
    setor: optionalTrimmedString,
    unidade: optionalTrimmedString,
    cargo: optionalTrimmedString,
    perfil_acesso: optionalTrimmedString,
    permissoes: optionalStringArray.default([]),
    status: z.enum(["ATIVO", "INATIVO", "BLOQUEADO"]).default("ATIVO"),
    exigir_troca_senha: optionalBoolean.default(false),
    origem_tipo: z.enum(["BENEFICIARIO", "PROFISSIONAL", "VOLUNTARIO"]).optional(),
    origem_id: optionalTrimmedString,
    origem_nome: optionalTrimmedString,
    senha: z.string().optional(),
    confirmar_senha: z.string().optional()
  })
  .superRefine((input, context) => {
    const criando = !input.id_usuario;
    const senhaInformada = !!input.senha?.trim();
    const confirmarInformada = !!input.confirmar_senha?.trim();

    if (criando) {
      if (!senhaInformada) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["senha"],
          message: "Informe a senha inicial."
        });
      }
      if (!confirmarInformada) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["confirmar_senha"],
          message: "Confirme a senha inicial."
        });
      }
    }

    if (senhaInformada || confirmarInformada) {
      if ((input.senha ?? "").length < 6) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["senha"],
          message: "A senha deve ter no minimo 6 caracteres."
        });
      }

      if ((input.confirmar_senha ?? "").length < 6) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["confirmar_senha"],
          message: "A confirmacao da senha deve ter no minimo 6 caracteres."
        });
      }

      if ((input.senha ?? "") !== (input.confirmar_senha ?? "")) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["confirmar_senha"],
          message: "As senhas nao conferem."
        });
      }
    }

    if (input.origem_tipo && !input.origem_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["origem_id"],
        message: "Selecione um cadastro de origem."
      });
    }
  });

export type UsuarioFormInput = z.input<typeof usuarioFormSchema>;
export type UsuarioFormValues = z.output<typeof usuarioFormSchema>;

export const usuarioDefaultValues: UsuarioFormValues = {
  id_usuario: undefined,
  nome_completo: "",
  nome_exibicao: "",
  nome_usuario: "",
  email: "",
  telefone: "",
  cpf: "",
  matricula: "",
  setor: "",
  unidade: "",
  cargo: "",
  perfil_acesso: "OPERADOR",
  permissoes: ["OPERADOR"],
  status: "ATIVO",
  exigir_troca_senha: false,
  origem_tipo: undefined,
  origem_id: undefined,
  origem_nome: undefined,
  senha: "",
  confirmar_senha: ""
};
