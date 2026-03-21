export type AiContext = {
  pathname?: string;
  pageTitle?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  intent?: string;
  data?: {
    origem?: "banco_interno";
    fontes?: string[];
    escopo?: string;
    parametros?: Record<string, string | number>;
    resumo?: Record<string, string | number | null>;
    exemplos?: Array<Record<string, string | number | null>>;
  };
};

export type AiSuggestionCategory =
  | "familias"
  | "beneficiarios"
  | "beneficios"
  | "atendimentos"
  | "cursos-oficinas"
  | "gestao-indicadores"
  | "doadores-doacoes"
  | "fornecedores-estoque"
  | "territorio"
  | "inconsistencias"
  | "legislacao-orientacao";

export type AiSuggestionItem = {
  id: string;
  categoria: AiSuggestionCategory;
  pergunta: string;
  descricao: string;
  contextos?: string[];
};

export type AiSuggestionCategoryMeta = {
  id: AiSuggestionCategory;
  label: string;
  descricao: string;
};
