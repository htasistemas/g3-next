import { z } from "zod";
import { normalizarCnpj } from "../../utils/br-utils.js";

const EMAIL_MASTER_SEM_TENANT = "htasistemas@gmail.com";

function ehEmailMasterSemTenant(email?: string) {
  return email?.trim().toLowerCase() === EMAIL_MASTER_SEM_TENANT;
}

function ehLoginMasterSemTenant(login?: string) {
  return login?.trim().toLowerCase() === EMAIL_MASTER_SEM_TENANT;
}

export const authLoginSchema = z.object({
  cnpj: z
    .string()
    .trim()
    .optional()
    .transform((value) => normalizarCnpj(value) ?? undefined),
  codigoInstituicao: z.string().trim().optional(),
  slug: z.string().trim().optional(),
  nomeUsuario: z.string().trim().optional(),
  email: z.string().trim().email("Informe um email valido.").optional(),
  senha: z.string().min(1, "Informe a senha.")
}).superRefine((value, ctx) => {
  const possuiEmail = Boolean(value.email?.trim());
  const possuiUsuario = Boolean(value.nomeUsuario?.trim());
  const possuiInstituicao =
    Boolean(value.cnpj?.trim()) || Boolean(value.codigoInstituicao?.trim()) || Boolean(value.slug?.trim());
  const dispensarInstituicao =
    ehEmailMasterSemTenant(value.email) || ehLoginMasterSemTenant(value.nomeUsuario);

  if (!possuiEmail && !possuiUsuario) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["email"],
      message: "Informe o e-mail ou usuario."
    });
  }

  if (!possuiInstituicao && !dispensarInstituicao && !possuiEmail) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cnpj"],
      message: "Informe o CNPJ, codigo ou slug da instituicao."
    });
  }
});

export const authGoogleSchema = z.object({
  idToken: z.string().trim().min(1, "Token Google obrigatorio."),
  cnpj: z
    .string()
    .trim()
    .optional()
    .transform((value) => normalizarCnpj(value) ?? undefined),
  slug: z.string().trim().optional(),
  codigoInstituicao: z.string().trim().optional()
}).superRefine((value, ctx) => {
  const possuiInstituicao =
    Boolean(value.cnpj?.trim()) || Boolean(value.codigoInstituicao?.trim()) || Boolean(value.slug?.trim());

  if (!possuiInstituicao) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cnpj"],
      message: "Informe o CNPJ, codigo ou slug da instituicao."
    });
  }
});

export const authEsqueciSenhaSchema = z.object({
  email: z.string().trim().email("Informe um email valido."),
  cnpj: z
    .string()
    .trim()
    .optional()
    .transform((value) => normalizarCnpj(value) ?? undefined),
  codigoInstituicao: z.string().trim().optional(),
  slug: z.string().trim().optional()
}).superRefine((value, ctx) => {
  const possuiInstituicao =
    Boolean(value.cnpj?.trim()) || Boolean(value.codigoInstituicao?.trim()) || Boolean(value.slug?.trim());
  const dispensarInstituicao = ehEmailMasterSemTenant(value.email);

  if (!possuiInstituicao && !dispensarInstituicao) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cnpj"],
      message: "Informe o CNPJ, codigo ou slug da instituicao."
    });
  }
});
