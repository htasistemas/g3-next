export type JobStatus = "Aberta" | "Pausada" | "Encerrada";

export type JobEncaminhamentoInput = {
  id?: string;
  beneficiarioId?: string | null;
  beneficiarioNome: string;
  data: string;
  status: string;
  observacoes?: string | null;
};

export type JobPayloadInput = {
  dadosVaga: {
    titulo: string;
    area?: string | null;
    tipo?: string | null;
    nivel?: string | null;
    modelo?: string | null;
    status: JobStatus;
    dataAbertura?: string | null;
    dataEncerramento?: string | null;
    tipoContrato?: string | null;
    cargaHoraria?: string | null;
    salario?: string | null;
    beneficios?: string | null;
  };
  empresaLocal?: {
    nomeEmpresa: string;
    cnpj?: string | null;
    responsavel?: string | null;
    telefone?: string | null;
    email?: string | null;
    endereco?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    uf?: string | null;
  } | null;
  requisitos?: {
    escolaridade?: string | null;
    experiencia?: string | null;
    habilidades?: string | null;
    requisitos?: string | null;
    descricao?: string | null;
    observacoes?: string | null;
  } | null;
  encaminhamentos?: JobEncaminhamentoInput[];
};

export type JobCandidatoInput = {
  beneficiarioId?: string | null;
  beneficiarioNome: string;
  necessidadesProfissionais?: string | null;
  status?: string | null;
  curriculoNome?: string | null;
  curriculoTipo?: string | null;
  curriculoConteudo?: string | null;
};

export type JobRow = {
  id: bigint;
  dados_vaga: unknown;
  empresa_local: unknown;
  requisitos: unknown;
  encaminhamentos: unknown;
  criado_em: Date;
  atualizado_em: Date;
};

export type JobCandidatoRow = {
  id: bigint;
  emprego_id: bigint;
  beneficiario_id: string | null;
  beneficiario_nome: string;
  necessidades_profissionais: string | null;
  status: string | null;
  curriculo_nome: string | null;
  curriculo_tipo: string | null;
  curriculo_conteudo: string | null;
  criado_em: Date;
};
