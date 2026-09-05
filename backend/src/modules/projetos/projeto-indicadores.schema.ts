import { z } from "zod";

const textoOpcional = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const texto = value.trim();
  return texto.length ? texto : undefined;
}, z.string().optional());

const numeroNaoNegativo = z.coerce.number().finite().min(0);

export const projetoIndicadorInputSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do indicador."),
  descricao: textoOpcional,
  tipo: z.enum(["PROCESSO", "PRODUTO", "RESULTADO", "IMPACTO"]),
  unidade_medida: z.string().trim().min(1, "Informe a unidade de medida."),
  linha_base: numeroNaoNegativo.optional(),
  meta: numeroNaoNegativo,
  valor_atual: numeroNaoNegativo.optional(),
  periodicidade: z.enum(["UNICA", "MENSAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL"]),
  fonte_dado: textoOpcional,
  responsavel: textoOpcional,
  status: z.enum(["ATIVO", "INATIVO"]).optional()
});

export const projetoIndicadorMedicaoSchema = z.object({
  competencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma competência válida."),
  valor: numeroNaoNegativo,
  observacao: textoOpcional,
  evidencia_id: z.coerce.number().int().positive().optional()
});
