import { z } from "zod";
import { normalizarCpf, normalizarTelefone, validarCpf } from "../../utils/br-utils.js";
import {
  barracaStatusValues,
  eventoCarteiraModoFinanceiroValues,
  eventoCarteiraStatusValues,
  eventoCarteiraTipoValues,
  formaPagamentoCarteiraValues,
  itemEventoCategoriaValues,
  participanteCarteiraStatusValues,
  tipoRelatorioCarteiraValues
} from "./carteira-evento.types.js";

const optionalTrimmedString = z.string().trim().optional();

export const eventoCarteiraInputSchema = z.object({
  nome_evento: z.string().trim().min(3).max(200),
  tipo_evento: z.enum(eventoCarteiraTipoValues),
  data_inicio: z.string().trim().min(10),
  data_fim: optionalTrimmedString,
  status: z.enum(eventoCarteiraStatusValues),
  permite_recarga: z.coerce.boolean(),
  permite_transferencia: z.coerce.boolean(),
  permite_estorno: z.coerce.boolean(),
  validade_credito: optionalTrimmedString,
  centro_receita: optionalTrimmedString,
  modo_financeiro: z.enum(eventoCarteiraModoFinanceiroValues),
  observacoes: z.string().trim().max(2000).optional(),
  permite_saldo_negativo_adm: z.coerce.boolean().optional()
});

export const participanteCarteiraInputSchema = z.object({
  evento_id: z.coerce.number().int().positive(),
  nome: z.string().trim().min(3).max(200),
  telefone: optionalTrimmedString,
  cpf: optionalTrimmedString,
  foto_url: optionalTrimmedString,
  responsavel: optionalTrimmedString,
  numero_carteira: optionalTrimmedString,
  status: z.enum(participanteCarteiraStatusValues),
  observacoes: z.string().trim().max(1000).optional()
}).superRefine((input, context) => {
  const telefone = normalizarTelefone(input.telefone);
  if (telefone && ![10, 11].includes(telefone.length)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["telefone"],
      message: "Informe um telefone valido."
    });
  }

  const cpf = normalizarCpf(input.cpf);
  if (cpf && !validarCpf(cpf)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cpf"],
      message: "Informe um CPF valido."
    });
  }
});

export const recargaCarteiraInputSchema = z.object({
  participante_id: z.coerce.number().int().positive(),
  valor_recarga: z.coerce.number().positive(),
  forma_pagamento: z.enum(formaPagamentoCarteiraValues),
  observacao: z.string().trim().max(1000).optional()
});

export const transferenciaCarteiraInputSchema = z.object({
  evento_id: z.coerce.number().int().positive(),
  carteira_origem_id: z.coerce.number().int().positive(),
  carteira_destino_id: z.coerce.number().int().positive(),
  valor_transferencia: z.coerce.number().positive(),
  motivo: z.string().trim().min(3).max(500)
});

export const ajusteCarteiraInputSchema = z.object({
  participante_id: z.coerce.number().int().positive(),
  tipo_ajuste: z.enum(["CREDITO", "DEBITO", "ESTORNO"]),
  valor: z.coerce.number().positive(),
  motivo: z.string().trim().min(3).max(500)
});

export const barracaEventoInputSchema = z.object({
  evento_id: z.coerce.number().int().positive(),
  nome_barraca: z.string().trim().min(3).max(180),
  responsavel: optionalTrimmedString,
  tipo_barraca: optionalTrimmedString,
  operador: optionalTrimmedString,
  status: z.enum(barracaStatusValues),
  impressora: optionalTrimmedString,
  observacoes: z.string().trim().max(1000).optional()
});

export const itemEventoInputSchema = z.object({
  evento_id: z.coerce.number().int().positive(),
  barraca_id: z.coerce.number().int().positive().optional(),
  nome_item: z.string().trim().min(2).max(180),
  categoria: z.enum(itemEventoCategoriaValues),
  preco: z.coerce.number().nonnegative(),
  estoque: z.coerce.number().int().nonnegative().optional(),
  ativo: z.coerce.boolean(),
  foto_url: optionalTrimmedString,
  ordem_exibicao: z.coerce.number().int().nonnegative().optional()
});

export const operacaoConsultaTokenSchema = z.object({
  evento_id: z.coerce.number().int().positive(),
  token: z.string().trim().min(1).max(160)
});

export const operacaoVendaInputSchema = z.object({
  evento_id: z.coerce.number().int().positive(),
  barraca_id: z.coerce.number().int().positive(),
  token: z.string().trim().min(1).max(160),
  chave_operacao: z.string().trim().min(8).max(120),
  observacao: z.string().trim().max(1000).optional(),
  itens: z
    .array(
      z.object({
        item_id: z.coerce.number().int().positive(),
        quantidade: z.coerce.number().positive()
      })
    )
    .min(1)
});

export const eventoCarteiraFiltersSchema = z.object({
  status: optionalTrimmedString,
  busca: optionalTrimmedString,
  limite: z.coerce.number().int().positive().max(200).optional()
});

export const participanteCarteiraFiltersSchema = z.object({
  evento_id: z.coerce.number().int().positive().optional(),
  busca: optionalTrimmedString,
  status: optionalTrimmedString,
  limite: z.coerce.number().int().positive().max(300).optional()
});

export const barracaEventoFiltersSchema = z.object({
  evento_id: z.coerce.number().int().positive().optional(),
  status: optionalTrimmedString
});

export const itemEventoFiltersSchema = z.object({
  evento_id: z.coerce.number().int().positive().optional(),
  barraca_id: z.coerce.number().int().positive().optional(),
  ativo: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (typeof value === "boolean") return value;
      if (value === "true") return true;
      if (value === "false") return false;
      return undefined;
    }),
  busca: optionalTrimmedString
});

export const extratoCarteiraFiltersSchema = z.object({
  participante_id: z.coerce.number().int().positive(),
  limite: z.coerce.number().int().positive().max(500).optional()
});

export const dashboardCarteiraFiltersSchema = z.object({
  evento_id: z.coerce.number().int().positive()
});

export const fechamentoCarteiraFiltersSchema = z.object({
  evento_id: z.coerce.number().int().positive()
});

export const relatorioCarteiraFiltersSchema = z.object({
  evento_id: z.coerce.number().int().positive(),
  tipo: z.enum(tipoRelatorioCarteiraValues)
});
