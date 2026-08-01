import { toIsoDate, toStringId } from "../../utils/string-utils.js";

type NullableDate = Date | string | null | undefined;

function splitList(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value: NullableDate): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return toIsoDate(value);
  const texto = String(value).trim();
  if (!texto) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) return undefined;
  return toIsoDate(data);
}

function formatDateTime(value: NullableDate): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const texto = String(value).trim();
  if (!texto) return undefined;
  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) return undefined;
  return data.toISOString();
}

function formatTime(value: NullableDate): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    return value.toISOString().slice(11, 16);
  }

  const texto = String(value).trim();
  if (!texto) return undefined;
  const match = texto.match(/^(\d{2}:\d{2})/);
  if (match) return match[1];

  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) return undefined;
  return data.toISOString().slice(11, 16);
}

export type MatriculaCursoRow = {
  id: bigint;
  tipo: string;
  nome: string;
  descricao: string | null;
  imagem: string | null;
  imagem_thumbnail: string | null;
  vagas_totais: number;
  vagas_disponiveis: number;
  carga_horaria: number | null;
  horario_inicial: Date | string | null;
  controle_horario_atendimento: boolean | null;
  horario_final_atendimento: Date | string | null;
  intervalo_atendimento_minutos: number | null;
  duracao_horas: number;
  dias_semana: string | null;
  faixa_etaria: string | null;
  vaga_preferencial_idosos: boolean | null;
  sexo_permitido: string | null;
  restricoes: string | null;
  profissional: string | null;
  instituicao_parceira: string | null;
  sala_id: bigint | null;
  sala_nome: string | null;
  unidade_id: bigint | null;
  unidade_nome: string | null;
  status: string;
  data_triagem: NullableDate;
  data_encaminhamento: NullableDate;
  data_conclusao: NullableDate;
  criado_em: Date;
  atualizado_em: Date;
  total_matriculas?: bigint | number | null;
  total_fila_espera?: bigint | number | null;
};

export type MatriculaInscricaoRow = {
  id: bigint;
  curso_id: bigint;
  beneficiario_nome: string;
  cpf: string | null;
  data_nascimento: Date | null;
  telefone: string | null;
  email: string | null;
  status: string;
  data_matricula: NullableDate;
  data_agendada: NullableDate;
  hora_agendada: Date | string | null;
  status_agendamento: string | null;
  profissional_id: string | null;
  profissional_nome: string | null;
  profissional_tipo: string | null;
  confirmacao_presenca: boolean | null;
};

export type MatriculaFilaEsperaRow = {
  id: bigint;
  curso_id: bigint;
  beneficiario_nome: string;
  cpf: string | null;
  telefone: string | null;
  data_entrada: NullableDate;
};

function toNumeric(value?: bigint | number | null): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  return 0;
}

export function mapCursoToResponse(
  curso: MatriculaCursoRow,
  matriculas: MatriculaInscricaoRow[],
  filaEspera: MatriculaFilaEsperaRow[]
) {
  return {
    id_matricula: toStringId(curso.id),
    tipo: curso.tipo,
    nome: curso.nome,
    descricao: curso.descricao ?? undefined,
    imagem: curso.imagem ?? undefined,
    imagem_thumbnail: curso.imagem_thumbnail ?? undefined,
    vagas_totais: curso.vagas_totais,
    vagas_disponiveis: curso.vagas_disponiveis,
    carga_horaria: curso.carga_horaria ?? undefined,
    horario_inicial: formatTime(curso.horario_inicial),
    controle_horario_atendimento: !!curso.controle_horario_atendimento,
    horario_final_atendimento: formatTime(curso.horario_final_atendimento),
    intervalo_atendimento_minutos: curso.intervalo_atendimento_minutos ?? undefined,
    duracao_horas: curso.duracao_horas,
    dias_semana: splitList(curso.dias_semana),
    faixa_etaria: splitList(curso.faixa_etaria),
    vaga_preferencial_idosos: !!curso.vaga_preferencial_idosos,
    sexo_permitido: curso.sexo_permitido ?? undefined,
    restricoes: curso.restricoes ?? undefined,
    profissional: curso.profissional ?? undefined,
    instituicao_parceira: curso.instituicao_parceira ?? undefined,
    sala_id: curso.sala_id ? toStringId(curso.sala_id) : undefined,
    sala_nome: curso.sala_nome ?? undefined,
    unidade_id: curso.unidade_id ? toStringId(curso.unidade_id) : undefined,
    unidade_nome: curso.unidade_nome ?? undefined,
    status: curso.status,
    data_triagem: formatDate(curso.data_triagem),
    data_encaminhamento: formatDate(curso.data_encaminhamento),
    data_conclusao: formatDate(curso.data_conclusao),
    total_matriculas: curso.total_matriculas ? toNumeric(curso.total_matriculas) : matriculas.length,
    total_fila_espera: curso.total_fila_espera ? toNumeric(curso.total_fila_espera) : filaEspera.length,
    matriculas: matriculas.map((item) => ({
      id_matricula_item: toStringId(item.id),
      beneficiario_nome: item.beneficiario_nome,
      cpf: item.cpf ?? undefined,
      data_nascimento: item.data_nascimento ? toIsoDate(item.data_nascimento) ?? undefined : undefined,
      telefone: item.telefone ?? undefined,
      email: item.email ?? undefined,
      status: item.status,
      data_matricula: formatDateTime(item.data_matricula),
      data_agendada: formatDate(item.data_agendada),
      hora_agendada: formatTime(item.hora_agendada),
      status_agendamento: item.status_agendamento ?? undefined,
      profissional_id: item.profissional_id ?? undefined,
      profissional_nome: item.profissional_nome ?? undefined,
      profissional_tipo: item.profissional_tipo ?? undefined,
      confirmacao_presenca: !!item.confirmacao_presenca
    })),
    fila_espera: filaEspera.map((item) => ({
      id_fila_espera: toStringId(item.id),
      beneficiario_nome: item.beneficiario_nome,
      cpf: item.cpf ?? undefined,
      telefone: item.telefone ?? undefined,
      data_entrada: formatDateTime(item.data_entrada)
    })),
    data_cadastro: curso.criado_em.toISOString(),
    data_atualizacao: curso.atualizado_em.toISOString()
  };
}

export function mapBeneficiarioCatalogoToResponse(record: {
  id: bigint;
  nome_completo: string;
  cpf: string | null;
  codigo: string | null;
  telefone: string | null;
  email: string | null;
}) {
  return {
    id_beneficiario: toStringId(record.id),
    nome_completo: record.nome_completo,
    cpf: record.cpf ?? undefined,
    codigo: record.codigo ?? undefined,
    telefone: record.telefone ?? undefined,
    email: record.email ?? undefined
  };
}

export function mapProfissionalCatalogoToResponse(record: {
  id: bigint;
  nome_completo: string;
  categoria: string;
}) {
  return {
    id_profissional: toStringId(record.id),
    nome_completo: record.nome_completo,
    categoria: record.categoria
  };
}

export function mapSalaCatalogoToResponse(record: {
  id: bigint;
  nome: string;
  unidade_id: bigint | null;
  unidade_nome: string | null;
}) {
  return {
    id_sala: toStringId(record.id),
    nome: record.nome,
    unidade_id: record.unidade_id ? toStringId(record.unidade_id) : undefined,
    unidade_nome: record.unidade_nome ?? undefined
  };
}
