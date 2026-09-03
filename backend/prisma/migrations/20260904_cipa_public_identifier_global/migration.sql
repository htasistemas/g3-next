-- O identificador público é uma capacidade de acesso ao portal e deve ser globalmente único.
CREATE UNIQUE INDEX IF NOT EXISTS cipa_eleicao_identificador_publico_global_unq
  ON cipa_eleicao (identificador_publico);
