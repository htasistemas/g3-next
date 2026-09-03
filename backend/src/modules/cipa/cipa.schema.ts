import { z } from "zod";

const textoOpcional = z.preprocess((value) => {
  if (value == null) return undefined;
  if (typeof value !== "string") return value;
  const texto = value.trim();
  return texto.length ? texto : undefined;
}, z.string().optional());

const idOpcional = textoOpcional.nullable().optional();
const dataIso = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?)?$/u, "Informe uma data válida.");
const dataOpcional = dataIso.nullable().optional();
const booleanOpcional = z.boolean().optional();

function validarCpf(value: string) {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/u.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i += 1) soma += Number(cpf[i]) * (10 - i);
  let digito = (soma * 10) % 11;
  if (digito === 10) digito = 0;
  if (digito !== Number(cpf[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i += 1) soma += Number(cpf[i]) * (11 - i);
  digito = (soma * 10) % 11;
  if (digito === 10) digito = 0;
  return digito === Number(cpf[10]);
}

export const cipaColaboradorInputSchema = z.object({
  unidadeId: idOpcional,
  profissionalId: idOpcional,
  matricula: z.string().trim().min(1, "Informe a matrícula.").max(80),
  nomeCompleto: z.string().trim().min(3, "Informe o nome completo.").max(200),
  cpf: z.string().trim().transform((value) => value.replace(/\D/g, "")).refine(validarCpf, "Informe um CPF válido."),
  dataNascimento: dataIso,
  cargo: textoOpcional.nullable().optional(),
  setor: textoOpcional.nullable().optional(),
  turno: textoOpcional.nullable().optional(),
  dataAdmissao: dataIso,
  dataDesligamento: dataOpcional,
  status: z.enum(["ATIVO", "AFASTADO", "DESLIGADO", "INATIVO"]).optional().default("ATIVO"),
  email: textoOpcional.nullable().optional(),
  telefone: textoOpcional.nullable().optional(),
  fotoCaminhoLogico: textoOpcional.nullable().optional()
});

export const cipaColaboradorFiltersSchema = z.object({
  termo: textoOpcional,
  status: textoOpcional,
  unidadeId: textoOpcional,
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(200).default(50)
});

export const cipaEleicaoInputSchema = z.object({
  unidadeId: z.string().trim().min(1, "Informe o estabelecimento."),
  nome: z.string().trim().min(3, "Informe o nome da eleição.").max(200),
  gestao: z.string().trim().min(1, "Informe a gestão.").max(80),
  descricao: textoOpcional.nullable().optional(),
  observacoes: textoOpcional.nullable().optional(),
  inscricoesInicio: dataIso,
  inscricoesFim: dataIso,
  divulgacaoCandidatosEm: dataOpcional,
  votacaoInicio: dataIso,
  votacaoFim: dataIso,
  apuracaoEm: dataOpcional,
  publicacaoPrevistaEm: dataOpcional,
  posseEm: dataOpcional,
  titulares: z.coerce.number().int().min(1).max(100).optional().default(1),
  suplentes: z.coerce.number().int().min(0).max(100).optional().default(1),
  votosPorEleitor: z.coerce.number().int().min(1).max(100).optional().default(1),
  permiteVotoBranco: booleanOpcional.default(true),
  permiteVotoNulo: booleanOpcional.default(true),
  permiteVotacaoCelular: booleanOpcional.default(true),
  permiteVotacaoPresencial: booleanOpcional.default(false),
  regraDesempate: z.enum(["TEMPO_SERVICO_ESTABELECIMENTO", "SORTEIO_AUDITADO", "REGRA_CUSTOMIZADA"]).default("TEMPO_SERVICO_ESTABELECIMENTO")
}).superRefine((input, ctx) => {
  const datas = [
    ["inscricoesInicio", input.inscricoesInicio],
    ["inscricoesFim", input.inscricoesFim],
    ["votacaoInicio", input.votacaoInicio],
    ["votacaoFim", input.votacaoFim]
  ] as const;
  const parsed = new Map(datas.map(([campo, valor]) => [campo, new Date(valor).getTime()]));
  const obterTempo = (campo: keyof typeof input) => { const valor = input[campo]; return typeof valor === "string" ? new Date(valor).getTime() : NaN; };
  if ([...parsed.values()].some((value) => !Number.isFinite(value))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["inscricoesInicio"], message: "Há uma data inválida no cronograma." });
    return;
  }
  if ((parsed.get("inscricoesFim") ?? 0) <= (parsed.get("inscricoesInicio") ?? 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["inscricoesFim"], message: "O fim das inscrições deve ocorrer depois do início." });
  }
  const diasInscricao = ((parsed.get("inscricoesFim") ?? 0) - (parsed.get("inscricoesInicio") ?? 0)) / 86_400_000;
  if (diasInscricao < 15) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["inscricoesFim"], message: "O período de inscrição deve ter pelo menos 15 dias corridos." });
  }
  if ((parsed.get("votacaoInicio") ?? 0) < (parsed.get("inscricoesFim") ?? 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["votacaoInicio"], message: "A votação deve começar após o encerramento das inscrições." });
  }
  if ((parsed.get("votacaoFim") ?? 0) <= (parsed.get("votacaoInicio") ?? 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["votacaoFim"], message: "O fim da votação deve ocorrer depois do início." });
  }
  const opcionais = [
    ["divulgacaoCandidatosEm", input.divulgacaoCandidatosEm, "inscricoesFim", "A divulgação dos candidatos não pode ocorrer antes do fim das inscrições.", "votacaoInicio", "A divulgação dos candidatos deve ocorrer antes do início da votação."],
    ["apuracaoEm", input.apuracaoEm, "votacaoFim", "A apuração não pode ocorrer antes do fim da votação."],
    ["publicacaoPrevistaEm", input.publicacaoPrevistaEm, "apuracaoEm", "A publicação prevista não pode ocorrer antes da apuração."],
    ["posseEm", input.posseEm, "publicacaoPrevistaEm", "A posse prevista não pode ocorrer antes da publicação do resultado."]
  ] as const;
  for (const [campo, valor, anterior, mensagem, proxima, mensagemProxima] of opcionais) {
    if (!valor) continue;
    const atual = new Date(valor).getTime(); const antes = obterTempo(anterior);
    if (!Number.isFinite(atual)) { ctx.addIssue({ code: z.ZodIssueCode.custom, path: [campo], message: "Informe uma data válida." }); continue; }
    if (Number.isFinite(antes) && atual < antes) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [campo], message: mensagem });
    if (proxima && mensagemProxima) {
      const depois = obterTempo(proxima);
      if (Number.isFinite(depois) && atual > depois) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [campo], message: mensagemProxima });
    }
  }
});

export const cipaCandidaturaInputSchema = z.object({
  colaboradorId: z.string().trim().min(1, "Informe o colaborador."),
  apresentacao: textoOpcional.nullable().optional(),
  proposta: textoOpcional.nullable().optional(),
  declaracaoCiencia: z.literal(true, { errorMap: () => ({ message: "Confirme a ciência das regras da eleição." }) })
});

export const cipaCandidaturaStatusSchema = z.object({
  status: z.enum(["APROVADA", "REPROVADA", "CORRECAO_SOLICITADA", "DESISTENTE"]),
  motivo: textoOpcional.nullable().optional()
});

export const cipaComissaoMembroSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome do membro.").max(200),
  funcao: z.string().trim().min(2, "Informe a função do membro.").max(100),
  colaboradorId: textoOpcional.nullable().optional()
});

export const cipaDesempateSchema = z.object({
  itens: z.array(z.object({ candidaturaId: z.string().trim().min(1), ordem: z.coerce.number().int().min(1), criterio: z.enum(["TEMPO_SERVICO_ESTABELECIMENTO", "SORTEIO_AUDITADO", "REGRA_CUSTOMIZADA"]), justificativa: z.string().trim().min(10).max(1000) })).min(2).max(100)
});

export const cipaPortalCandidaturaInputSchema = z.object({
  apresentacao: textoOpcional.nullable().optional(),
  proposta: textoOpcional.nullable().optional(),
  declaracaoCiencia: z.literal(true, { errorMap: () => ({ message: "Confirme a ciência das regras da eleição." }) })
});

export const cipaPortalAuthSchema = z.object({
  cpf: z.string().trim().transform((value) => value.replace(/\D/g, "")).refine((value) => value.length === 11, "Informe um CPF válido."),
  dataNascimento: dataIso
});

export const cipaVotoSchema = z.object({
  tipo: z.enum(["VALIDO", "BRANCO", "NULO"]),
  candidaturaId: z.string().trim().optional(),
  candidaturaIds: z.array(z.string().trim().min(1)).max(100).optional()
}).superRefine((input, ctx) => {
  if (input.candidaturaId && input.candidaturaIds?.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["candidaturaIds"], message: "Informe as candidaturas em apenas um formato." });
  }
  const ids = input.candidaturaIds?.length ? input.candidaturaIds : input.candidaturaId ? [input.candidaturaId] : [];
  if (input.tipo === "VALIDO" && !ids.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["candidaturaIds"], message: "Selecione pelo menos um candidato." });
  }
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["candidaturaIds"], message: "Não repita candidatos no mesmo voto." });
  }
  if (input.tipo !== "VALIDO" && ids.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["candidaturaIds"], message: "O voto branco ou nulo não possui candidato." });
  }
});

export const cipaCancelamentoSchema = z.object({
  motivo: z.string().trim().min(10, "Informe um motivo com pelo menos 10 caracteres.").max(1000)
});
