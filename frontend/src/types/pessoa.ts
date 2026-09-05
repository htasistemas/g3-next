export type Pessoa = { id: string; nomeCompleto: string; nomeSocial?: string | null; dataNascimento?: string | null; cpfMascarado?: string; email?: string | null; status: string; vinculos: number };
export type PessoaVinculo = { id: string; tipoVinculo: string; entidadeId?: string; identificadorExterno?: string | null; principal: boolean; ativo: boolean; inicioEm?: string | null; fimEm?: string | null };
export type PessoaListaResponse = { dados: Pessoa[]; paginacao: { pagina: number; tamanho: number; total: number } };
