export type LembreteDiarioInput = {
  titulo: string;
  descricao?: string;
  dataInicial: string;
  usuarioId?: number | null;
  todosUsuarios?: boolean;
  horaAviso?: string | null;
};

export type LembreteDiarioAdiarInput = {
  novaDataHora: string;
};

export type LembreteDiarioRow = {
  id: bigint;
  titulo: string;
  descricao: string | null;
  data_inicial: Date;
  usuario_id: bigint | null;
  todos_usuarios: boolean;
  recorrencia: string;
  hora_aviso: Date | string | null;
  status: string;
  proxima_execucao_em: Date;
  adiado_ate: Date | null;
  concluido_em: Date | null;
  criado_em: Date;
  atualizado_em: Date;
};
