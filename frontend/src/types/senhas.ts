export type SenhaFilaStatus = "AGUARDANDO" | "CHAMADO" | "FINALIZADO" | "CANCELADO";
export type SenhaChamadaStatus = "CHAMADO" | "FINALIZADO";

export type SenhaFilaResponse = {
  id: number;
  beneficiarioId: number;
  nomeBeneficiario: string;
  status: SenhaFilaStatus;
  prioridade: number;
  dataHoraEntrada: string;
  unidadeId?: number;
  salaAtendimento?: string;
};

export type SenhaChamadaResponse = {
  id: string;
  filaId: number;
  beneficiarioId: number;
  nomeBeneficiario: string;
  localAtendimento: string;
  status: SenhaChamadaStatus;
  dataHoraChamada: string;
  unidadeId?: number;
  chamadoPor: string;
};

export type SenhaEmitirRequest = {
  beneficiarioId: number;
  prioridade?: number | null;
  unidadeId?: number | null;
  usuarioId?: number | null;
  salaAtendimento?: string | null;
};

export type SenhaChamarRequest = {
  filaId: number;
  localAtendimento: string;
  unidadeId?: number | null;
  usuarioId?: number | null;
};

export type SenhaFinalizarRequest = {
  chamadaId: string;
};

export type SenhaAvisoSonoro = {
  id: string;
  nome: string;
  url: string;
};

export type SenhasConfigResponse = {
  fraseFala: string;
  rssUrl: string;
  velocidadeTicker: number;
  modoNoticias?: string | null;
  noticiasManuais?: string | null;
  quantidadeUltimasChamadas: number;
  unidadePainelId?: number | null;
  tituloTela?: string | null;
  descricaoTela?: string | null;
  avisosSonoros?: SenhaAvisoSonoro[] | null;
  avisoSonoroAtivoId?: string | null;
};

export type SenhasConfigRequest = SenhasConfigResponse;

