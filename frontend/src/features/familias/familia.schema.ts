import { z } from "zod";

export const familiaStatusOptions = ["ATIVO", "INATIVO", "BLOQUEADO"] as const;

export const parentescoOptions = [
  "Responsável familiar",
  "Cônjuge/companheiro(a)",
  "Filho(a)",
  "Enteado(a)",
  "Pai/Mãe",
  "Avô/Avó",
  "Irmão(ã)",
  "Outro"
] as const;

export const familiaMembroFormSchema = z.object({
  id_familia_membro: z.string().optional(),
  id_beneficiario: z.string().min(1, "Selecione um beneficiário."),
  parentesco: z.string().trim().min(1, "Informe o parentesco."),
  responsavel_familiar: z.boolean().default(false),
  contribui_renda: z.boolean().default(false),
  renda_individual: z.string().optional(),
  participa_servicos: z.boolean().default(false),
  observacoes: z.string().optional(),
  usa_endereco_familia: z.boolean().default(true),
  beneficiario_nome: z.string().optional(),
  beneficiario_documento: z.string().optional()
});

export const familiaFormSchema = z
  .object({
    nome_familia: z.string().trim().min(3, "Informe o nome da família."),
    id_referencia_familiar: z.string().min(1, "Selecione o responsável principal."),
    status: z.enum(familiaStatusOptions),
    cep: z.string().optional(),
    logradouro: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    ponto_referencia: z.string().optional(),
    municipio: z.string().optional(),
    uf: z.string().max(2).optional(),
    zona: z.string().optional(),
    situacao_imovel: z.string().optional(),
    tipo_moradia: z.string().optional(),
    agua_encanada: z.boolean().default(false),
    esgoto_tipo: z.string().optional(),
    coleta_lixo: z.string().optional(),
    energia_eletrica: z.boolean().default(false),
    internet: z.boolean().default(false),
    arranjo_familiar: z.string().optional(),
    qtd_membros: z.number().int().nonnegative().optional(),
    qtd_criancas: z.number().int().nonnegative().optional(),
    qtd_adolescentes: z.number().int().nonnegative().optional(),
    qtd_idosos: z.number().int().nonnegative().optional(),
    qtd_pessoas_deficiencia: z.number().int().nonnegative().optional(),
    renda_familiar_total: z.string().optional(),
    renda_per_capita: z.string().optional(),
    faixa_renda_per_capita: z.string().optional(),
    principais_fontes_renda: z.string().optional(),
    situacao_inseguranca_alimentar: z.string().optional(),
    possui_dividas_relevantes: z.boolean().default(false),
    descricao_dividas: z.string().optional(),
    vulnerabilidades_familia: z.string().optional(),
    servicos_acompanhamento: z.string().optional(),
    tecnico_responsavel: z.string().optional(),
    periodicidade_atendimento: z.string().optional(),
    proxima_visita_prevista: z.string().optional(),
    observacoes: z.string().optional(),
    membros: z.array(familiaMembroFormSchema)
  })
  .superRefine((value, ctx) => {
    if (!value.membros.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Inclua pelo menos um membro na família.",
        path: ["membros"]
      });
    }

    const ids = new Set<string>();
    let responsaveis = 0;

    for (const [index, membro] of value.membros.entries()) {
      if (ids.has(membro.id_beneficiario)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Não repita o mesmo beneficiário.",
          path: ["membros", index, "id_beneficiario"]
        });
      }
      ids.add(membro.id_beneficiario);

      if (membro.responsavel_familiar) {
        responsaveis += 1;
      }
    }

    if (responsaveis > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A família pode ter apenas um responsável familiar.",
        path: ["membros"]
      });
    }
  });

export type FamiliaFormValues = z.input<typeof familiaFormSchema>;
export type FamiliaMembroFormValues = z.input<typeof familiaMembroFormSchema>;

export const familiaDefaultValues: FamiliaFormValues = {
  nome_familia: "",
  id_referencia_familiar: "",
  status: "ATIVO",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  ponto_referencia: "",
  municipio: "",
  uf: "",
  zona: "",
  situacao_imovel: "",
  tipo_moradia: "",
  agua_encanada: false,
  esgoto_tipo: "",
  coleta_lixo: "",
  energia_eletrica: false,
  internet: false,
  arranjo_familiar: "",
  qtd_membros: undefined,
  qtd_criancas: undefined,
  qtd_adolescentes: undefined,
  qtd_idosos: undefined,
  qtd_pessoas_deficiencia: undefined,
  renda_familiar_total: "",
  renda_per_capita: "",
  faixa_renda_per_capita: "",
  principais_fontes_renda: "",
  situacao_inseguranca_alimentar: "",
  possui_dividas_relevantes: false,
  descricao_dividas: "",
  vulnerabilidades_familia: "",
  servicos_acompanhamento: "",
  tecnico_responsavel: "",
  periodicidade_atendimento: "",
  proxima_visita_prevista: "",
  observacoes: "",
  membros: []
};
