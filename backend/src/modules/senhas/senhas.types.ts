export type SenhaFilaStatus = "AGUARDANDO" | "CHAMADO" | "FINALIZADO" | "CANCELADO";
export type SenhaChamadaStatus = "CHAMADO" | "FINALIZADO";

export type SenhaEmitirInput = {
  beneficiarioId: number;
  prioridade?: number | null;
  unidadeId?: number | null;
  usuarioId?: number | null;
  salaAtendimento?: string | null;
};

export type SenhaChamarInput = {
  filaId: number;
  localAtendimento: string;
  unidadeId?: number | null;
  usuarioId?: number | null;
};

export type SenhaFinalizarInput = {
  chamadaId: string;
};

export type SenhasConfigInput = {
  fraseFala: string;
  rssUrl: string;
  velocidadeTicker: number;
  modoNoticias?: string | null;
  noticiasManuais?: string | null;
  quantidadeUltimasChamadas: number;
  unidadePainelId?: number | null;
  tituloTela?: string | null;
  descricaoTela?: string | null;
};

export type SenhaFilaRow = {
  id: bigint;
  beneficiario_id: bigint;
  nome_beneficiario: string;
  status: string;
  prioridade: number;
  data_hora_entrada: Date;
  unidade_id: bigint | null;
  sala_atendimento: string | null;
};

export type SenhaChamadaRow = {
  id: bigint;
  fila_id: bigint;
  beneficiario_id: bigint;
  nome_beneficiario: string;
  local_atendimento: string;
  status: string;
  data_hora_chamada: Date;
  unidade_id: bigint | null;
  chamado_por: string;
};

export type SenhasConfigRow = {
  id: bigint;
  frase_fala: string;
  rss_url: string;
  velocidade_ticker: number;
  modo_noticias: string | null;
  noticias_manuais: string | null;
  quantidade_ultimas_chamadas: number;
  unidade_painel_id: bigint | null;
  titulo_tela: string | null;
  descricao_tela: string | null;
  atualizado_em: Date;
};
