export type JobStatus = "Aberta" | "Pausada" | "Encerrada";

export type JobEncaminhamento = {
  id: string;
  beneficiarioId: string;
  beneficiarioNome: string;
  beneficiarioTelefone?: string;
  data: string;
  status: string;
  observacoes?: string;
};

export type JobCandidato = {
  id: string;
  empregoId: string;
  beneficiarioId?: string | null;
  beneficiarioNome: string;
  necessidadesProfissionais?: string | null;
  status?: string | null;
  curriculoNome?: string | null;
  curriculoTipo?: string | null;
  curriculoConteudo?: string | null;
  criadoEm?: string;
};

export type JobPayload = {
  dadosVaga: {
    titulo: string;
    area?: string;
    tipo?: string;
    nivel?: string;
    modelo?: string;
    status: JobStatus;
    dataAbertura?: string;
    dataEncerramento?: string;
    tipoContrato?: string;
    cargaHoraria?: string;
    salario?: string;
    beneficios?: string;
  };
  empresaLocal?: {
    nomeEmpresa: string;
    cnpj?: string;
    responsavel?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
  };
  requisitos?: {
    escolaridade?: string;
    experiencia?: string;
    habilidades?: string;
    requisitos?: string;
    descricao?: string;
    observacoes?: string;
  };
  encaminhamentos?: JobEncaminhamento[];
};

export type JobRecord = JobPayload & {
  id: string;
  criadoEm: string;
  atualizadoEm?: string;
};
