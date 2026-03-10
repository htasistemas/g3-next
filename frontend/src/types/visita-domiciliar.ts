export type SituacaoVisita = "Agendada" | "Em andamento" | "Realizada" | "Cancelada";

export type EnderecoVisita = {
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
};

export type VisitaAnexo = {
  id?: number;
  nome: string;
  tipo: string;
  tamanho?: string;
};

export type VisitaDomiciliar = {
  id: number;
  beneficiarioId: number;
  beneficiarioNome: string;
  unidade: string;
  responsavel: string;
  dataVisita: string;
  horarioInicial: string;
  horarioFinal?: string;
  tipoVisita?: string;
  situacao: SituacaoVisita;
  usarEnderecoBeneficiario: boolean;
  endereco: EnderecoVisita;
  observacoesIniciais?: string;
  condicoes: {
    tipoMoradia?: string;
    situacaoPosse?: string;
    comodos?: number | null;
    saneamento?: string;
    abastecimentoAgua?: string;
    energiaEletrica?: string;
    condicoesHigiene?: string;
    situacaoRisco?: string[];
    observacoes?: string;
  };
  situacaoSocial: {
    rendaFamiliar?: string;
    faixaRenda?: string;
    beneficios?: string[];
    redeApoio?: string;
    vinculos?: string;
    observacoes?: string;
  };
  registro: {
    relato?: string;
    necessidades?: string;
    encaminhamentos?: string;
    orientacoes?: string;
    plano?: string;
    optaReceberCestaBasica?: boolean | null;
    aptoReceberCestaBasica?: boolean | null;
    motivoNaoReceberCestaBasica?: string;
  };
  anexos: VisitaAnexo[];
  criadoEm?: string;
  atualizadoEm?: string;
};

export type VisitaDomiciliarListaResponse = {
  visitas: VisitaDomiciliar[];
};

