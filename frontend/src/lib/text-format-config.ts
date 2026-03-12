export type TipoFormatacaoTexto = "nomePessoa" | "endereco" | "instituicao" | "textoCurto";

export const conectivosMinusculos = new Set([
  "da",
  "de",
  "do",
  "das",
  "dos",
  "e",
  "di",
  "du",
  "em",
  "na",
  "no",
  "nas",
  "nos"
]);

export const siglasPreservadas = new Set([
  "CPF",
  "RG",
  "SUS",
  "CNS",
  "CEP",
  "CNPJ",
  "ONG",
  "MEI",
  "INSS",
  "CRAS",
  "CREAS",
  "BPC",
  "S/N",
  "UF"
]);

export const camposTecnicosIgnorados = new Set([
  "email",
  "login",
  "username",
  "nome_usuario",
  "nomeUsuario",
  "senha",
  "senha_hash",
  "senhaHash",
  "token",
  "cpf",
  "cnpj",
  "rg_numero",
  "numero_documento",
  "numeroDocumento",
  "codigo",
  "codigoInterno",
  "id",
  "idBeneficiario",
  "idFamilia",
  "idUnidade",
  "idReferenciaFamiliar",
  "idFamiliaMembro",
  "id_beneficiario",
  "id_familia",
  "id_unidade",
  "id_referencia_familiar",
  "id_familia_membro",
  "url",
  "site",
  "hash"
]);

export const mapaCamposTextoBeneficiarioForm: Record<string, TipoFormatacaoTexto> = {
  nome_completo: "nomePessoa",
  nome_social: "nomePessoa",
  apelido: "nomePessoa",
  nome_mae: "nomePessoa",
  nome_pai: "nomePessoa",
  nacionalidade: "endereco",
  naturalidade_cidade: "endereco",
  logradouro: "endereco",
  complemento: "endereco",
  bairro: "endereco",
  ponto_referencia: "endereco",
  municipio: "endereco",
  vinculo_familiar: "textoCurto",
  situacao_vulnerabilidade: "textoCurto",
  composicao_familiar: "textoCurto",
  participa_comunidade: "textoCurto",
  rede_apoio: "textoCurto",
  nivel_escolaridade: "textoCurto",
  ocupacao: "instituicao",
  situacao_trabalho: "textoCurto",
  local_trabalho: "instituicao",
  fonte_renda: "textoCurto",
  tipo_deficiencia: "textoCurto",
  descricao_medicacao: "textoCurto",
  servico_saude_referencia: "instituicao",
  beneficios_descricao: "textoCurto",
  observacoes: "textoCurto"
};

export const mapaDocumentoBeneficiarioForm: Record<string, TipoFormatacaoTexto> = {
  nome: "textoCurto"
};

export const mapaCamposTextoFamiliaForm: Record<string, TipoFormatacaoTexto> = {
  nome_familia: "instituicao",
  logradouro: "endereco",
  complemento: "endereco",
  bairro: "endereco",
  ponto_referencia: "endereco",
  municipio: "endereco",
  situacao_imovel: "textoCurto",
  tipo_moradia: "textoCurto",
  esgoto_tipo: "textoCurto",
  coleta_lixo: "textoCurto",
  arranjo_familiar: "textoCurto",
  faixa_renda_per_capita: "textoCurto",
  principais_fontes_renda: "textoCurto",
  situacao_inseguranca_alimentar: "textoCurto",
  descricao_dividas: "textoCurto",
  vulnerabilidades_familia: "textoCurto",
  servicos_acompanhamento: "textoCurto",
  tecnico_responsavel: "nomePessoa",
  periodicidade_atendimento: "textoCurto",
  observacoes: "textoCurto"
};

export const mapaMembroFamiliaForm: Record<string, TipoFormatacaoTexto> = {
  parentesco: "textoCurto",
  observacoes: "textoCurto"
};

export const mapaCamposTextoUnidadeForm: Record<string, TipoFormatacaoTexto> = {
  nome_fantasia: "instituicao",
  razao_social: "instituicao",
  horario_funcionamento: "textoCurto",
  observacoes: "textoCurto",
  logradouro: "endereco",
  complemento: "endereco",
  bairro: "endereco",
  ponto_referencia: "endereco",
  cidade: "endereco",
  zona: "textoCurto",
  subzona: "textoCurto"
};

export const mapaDiretoriaUnidadeForm: Record<string, TipoFormatacaoTexto> = {
  nome_completo: "nomePessoa",
  funcao: "instituicao"
};

export const mapaSalaUnidadeForm: Record<string, TipoFormatacaoTexto> = {
  nome: "textoCurto"
};

export const mapaCamposTextoProfissionalForm: Record<string, TipoFormatacaoTexto> = {
  nome_completo: "nomePessoa",
  nome_social: "nomePessoa",
  apelido: "nomePessoa",
  nacionalidade: "endereco",
  naturalidade_cidade: "endereco",
  nome_mae: "nomePessoa",
  nome_pai: "nomePessoa",
  categoria: "instituicao",
  registro_conselho: "instituicao",
  especialidade: "instituicao",
  unidade: "instituicao",
  sala_atendimento: "textoCurto",
  vinculo: "textoCurto",
  logradouro: "endereco",
  complemento: "endereco",
  bairro: "endereco",
  ponto_referencia: "endereco",
  municipio: "endereco",
  zona: "textoCurto",
  subzona: "textoCurto",
  resumo: "textoCurto",
  observacoes: "textoCurto"
};

export const mapaCamposTextoVoluntarioForm: Record<string, TipoFormatacaoTexto> = {
  nome_completo: "nomePessoa",
  genero: "textoCurto",
  profissao: "instituicao",
  motivacao: "textoCurto",
  cidade: "endereco",
  area_interesse: "textoCurto",
  habilidades: "textoCurto",
  idiomas: "textoCurto",
  logradouro: "endereco",
  complemento: "endereco",
  bairro: "endereco",
  ponto_referencia: "endereco",
  municipio: "endereco",
  zona: "textoCurto",
  subzona: "textoCurto",
  carga_horaria_semanal: "textoCurto",
  observacoes: "textoCurto"
};

export const mapaCamposTextoMatriculaForm: Record<string, TipoFormatacaoTexto> = {
  tipo: "textoCurto",
  nome: "instituicao",
  descricao: "textoCurto",
  sexo_permitido: "textoCurto",
  restricoes: "textoCurto",
  profissional: "nomePessoa",
  instituicao_parceira: "instituicao",
  status: "textoCurto",
  beneficiario_nome: "nomePessoa",
  status_agendamento: "textoCurto",
  profissional_nome: "nomePessoa",
  profissional_tipo: "textoCurto"
};

export const mapaCamposTextoDoadorForm: Record<string, TipoFormatacaoTexto> = {
  nome: "nomePessoa",
  tipo_pessoa: "textoCurto",
  responsavel_empresa: "nomePessoa",
  logradouro: "endereco",
  complemento: "endereco",
  bairro: "endereco",
  cidade: "endereco",
  observacoes: "textoCurto"
};

export const mapaCamposTextoBancoEmpregosForm: Record<string, TipoFormatacaoTexto> = {
  titulo: "textoCurto",
  area: "textoCurto",
  tipo: "textoCurto",
  nivel: "textoCurto",
  modelo: "textoCurto",
  tipoContrato: "textoCurto",
  cargaHoraria: "textoCurto",
  beneficios: "textoCurto",
  nomeEmpresa: "instituicao",
  responsavel: "nomePessoa",
  endereco: "endereco",
  bairro: "endereco",
  cidade: "endereco",
  escolaridade: "textoCurto",
  experiencia: "textoCurto",
  habilidades: "textoCurto",
  requisitos: "textoCurto",
  descricao: "textoCurto",
  observacoes: "textoCurto"
};

export const mapaCamposTextoRegistroDoacaoForm: Record<string, TipoFormatacaoTexto> = {
  tipo_doacao: "textoCurto",
  descricao: "textoCurto",
  forma_recebimento: "textoCurto",
  periodicidade: "textoCurto",
  status: "textoCurto",
  observacoes: "textoCurto",
  conservacao: "textoCurto"
};

export const mapaCamposTextoDoacaoRealizadaForm: Record<string, TipoFormatacaoTexto> = {
  tipo_doacao: "textoCurto",
  situacao: "textoCurto",
  responsavel: "nomePessoa",
  observacoes: "textoCurto"
};

export const mapaCamposTextoDoacaoPlanejadaForm: Record<string, TipoFormatacaoTexto> = {
  prioridade: "textoCurto",
  status: "textoCurto",
  observacoes: "textoCurto",
  motivo_cancelamento: "textoCurto"
};

export const mapaCamposTextoUsuarioForm: Record<string, TipoFormatacaoTexto> = {
  nome_completo: "nomePessoa",
  nome_exibicao: "nomePessoa",
  setor: "instituicao",
  unidade: "instituicao",
  cargo: "instituicao"
};
