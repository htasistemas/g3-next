export type StorageScopeKey =
  | "beneficiario_foto"
  | "beneficiario_documento"
  | "banco_empregos_documento"
  | "biblioteca_capa"
  | "colaborador_foto"
  | "colaborador_face"
  | "colaborador_documento"
  | "instituicao_documento"
  | "instituicao_imagem"
  | "doacao_comprovante"
  | "curso_comprovante"
  | "curso_imagem"
  | "almoxarifado_anexo"
  | "veiculo_foto"
  | "veiculo_documento"
  | "evento_foto"
  | "chamado_tecnico_anexo"
  | "ocorrencia_anexo"
  | "oficio_documento"
  | "plano_trabalho_documento"
  | "termo_fomento_documento"
  | "autorizacao_compra_anexo"
  | "contabilidade_lancamento_anexo"
  | "captacao_doador_anexo"
  | "captacao_campanha_banner"
  | "educacional_documento"
  | "prestacao_contas_documento"
  | "geral_outro";

export type StoragePolicy = {
  entidadeTipo: string;
  categoria: string;
  subdirectory: string;
  allowedExtensions: string[];
  allowedMimeTypes: string[];
  maxSizeBytes: number;
  imageOnly?: boolean;
  generateThumbnail?: boolean;
};

const imageExtensions = ["jpg", "jpeg", "png", "webp", "svg"];
const imageMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const documentExtensions = [
  ...imageExtensions,
  "pdf",
  "txt",
  "csv",
  "doc",
  "docx",
  "xls",
  "xlsx"
];
const documentMimeTypes = [
  ...imageMimeTypes,
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
];
const attachmentExtensions = [...documentExtensions, "mp4", "webm", "mov"];
const attachmentMimeTypes = [...documentMimeTypes, "video/mp4", "video/webm", "video/quicktime"];

export const requiredStorageDirectories = [
  "tenants",
  "beneficiarios/documentos",
  "banco-empregos/candidatos/documentos",
  "colaboradores/documentos",
  "instituicoes/documentos",
  "doacoes/comprovantes",
  "cursos/comprovantes",
  "almoxarifado/anexos",
  "veiculos/documentos",
  "geral/outros",
  "chamados-tecnicos/anexos",
  "ocorrencias/anexos",
  "oficios/documentos",
  "planos-trabalho/documentos",
  "termos-fomento/documentos",
  "compras/anexos",
  "contabilidade/anexos",
  "captacao/doadores/anexos",
  "captacao/campanhas/banners",
  "educacional/documentos",
  "prestacao-contas/documentos",
  "backups/arquivos",
  "backups/imagens",
  "imagens/beneficiarios",
  "imagens/beneficiarios/thumbs",
  "imagens/biblioteca",
  "imagens/biblioteca/thumbs",
  "imagens/colaboradores",
  "imagens/colaboradores/thumbs",
  "imagens/instituicoes",
  "imagens/instituicoes/thumbs",
  "imagens/cursos",
  "imagens/cursos/thumbs",
  "imagens/veiculos",
  "imagens/veiculos/thumbs",
  "imagens/eventos",
  "imagens/eventos/thumbs",
  "imagens/captacao/campanhas",
  "imagens/captacao/campanhas/thumbs"
] as const;

export const storagePolicies: Record<StorageScopeKey, StoragePolicy> = {
  beneficiario_foto: {
    entidadeTipo: "beneficiario",
    categoria: "foto",
    subdirectory: "imagens/beneficiarios",
    allowedExtensions: imageExtensions,
    allowedMimeTypes: imageMimeTypes,
    maxSizeBytes: 5 * 1024 * 1024,
    imageOnly: true,
    generateThumbnail: true
  },
  beneficiario_documento: {
    entidadeTipo: "beneficiario",
    categoria: "documento",
    subdirectory: "beneficiarios/documentos",
    allowedExtensions: documentExtensions,
    allowedMimeTypes: documentMimeTypes,
    maxSizeBytes: 15 * 1024 * 1024,
    generateThumbnail: true
  },
  banco_empregos_documento: {
    entidadeTipo: "banco_empregos_candidato",
    categoria: "documento",
    subdirectory: "banco-empregos/candidatos/documentos",
    allowedExtensions: documentExtensions,
    allowedMimeTypes: documentMimeTypes,
    maxSizeBytes: 20 * 1024 * 1024,
    generateThumbnail: true
  },
  biblioteca_capa: {
    entidadeTipo: "biblioteca_livro",
    categoria: "capa",
    subdirectory: "imagens/biblioteca",
    allowedExtensions: imageExtensions,
    allowedMimeTypes: imageMimeTypes,
    maxSizeBytes: 8 * 1024 * 1024,
    imageOnly: true,
    generateThumbnail: true
  },
  colaborador_foto: {
    entidadeTipo: "colaborador",
    categoria: "foto",
    subdirectory: "imagens/colaboradores",
    allowedExtensions: imageExtensions,
    allowedMimeTypes: imageMimeTypes,
    maxSizeBytes: 5 * 1024 * 1024,
    imageOnly: true,
    generateThumbnail: true
  },
  colaborador_face: {
    entidadeTipo: "colaborador",
    categoria: "face",
    subdirectory: "imagens/colaboradores",
    allowedExtensions: imageExtensions,
    allowedMimeTypes: imageMimeTypes,
    maxSizeBytes: 5 * 1024 * 1024,
    imageOnly: true,
    generateThumbnail: true
  },
  colaborador_documento: {
    entidadeTipo: "colaborador",
    categoria: "documento",
    subdirectory: "colaboradores/documentos",
    allowedExtensions: documentExtensions,
    allowedMimeTypes: documentMimeTypes,
    maxSizeBytes: 15 * 1024 * 1024,
    generateThumbnail: true
  },
  instituicao_documento: {
    entidadeTipo: "instituicao",
    categoria: "documento",
    subdirectory: "instituicoes/documentos",
    allowedExtensions: ["*"],
    allowedMimeTypes: ["*"],
    maxSizeBytes: 100 * 1024 * 1024,
    generateThumbnail: true
  },
  instituicao_imagem: {
    entidadeTipo: "instituicao",
    categoria: "imagem",
    subdirectory: "imagens/instituicoes",
    allowedExtensions: imageExtensions,
    allowedMimeTypes: imageMimeTypes,
    maxSizeBytes: 8 * 1024 * 1024,
    imageOnly: true,
    generateThumbnail: true
  },
  doacao_comprovante: {
    entidadeTipo: "doacao",
    categoria: "comprovante",
    subdirectory: "doacoes/comprovantes",
    allowedExtensions: documentExtensions,
    allowedMimeTypes: documentMimeTypes,
    maxSizeBytes: 15 * 1024 * 1024,
    generateThumbnail: true
  },
  curso_comprovante: {
    entidadeTipo: "curso",
    categoria: "comprovante",
    subdirectory: "cursos/comprovantes",
    allowedExtensions: documentExtensions,
    allowedMimeTypes: documentMimeTypes,
    maxSizeBytes: 15 * 1024 * 1024,
    generateThumbnail: true
  },
  curso_imagem: {
    entidadeTipo: "curso",
    categoria: "imagem",
    subdirectory: "imagens/cursos",
    allowedExtensions: imageExtensions,
    allowedMimeTypes: imageMimeTypes,
    maxSizeBytes: 8 * 1024 * 1024,
    imageOnly: true,
    generateThumbnail: true
  },
  almoxarifado_anexo: {
    entidadeTipo: "almoxarifado",
    categoria: "anexo",
    subdirectory: "almoxarifado/anexos",
    allowedExtensions: documentExtensions,
    allowedMimeTypes: documentMimeTypes,
    maxSizeBytes: 15 * 1024 * 1024,
    generateThumbnail: true
  },
  veiculo_foto: {
    entidadeTipo: "controle_veiculo",
    categoria: "foto",
    subdirectory: "imagens/veiculos",
    allowedExtensions: imageExtensions,
    allowedMimeTypes: imageMimeTypes,
    maxSizeBytes: 8 * 1024 * 1024,
    imageOnly: true,
    generateThumbnail: true
  },
  veiculo_documento: {
    entidadeTipo: "controle_veiculo",
    categoria: "documento",
    subdirectory: "veiculos/documentos",
    allowedExtensions: documentExtensions,
    allowedMimeTypes: documentMimeTypes,
    maxSizeBytes: 15 * 1024 * 1024,
    generateThumbnail: true
  },
  evento_foto: {
    entidadeTipo: "evento",
    categoria: "foto",
    subdirectory: "imagens/eventos",
    allowedExtensions: imageExtensions,
    allowedMimeTypes: imageMimeTypes,
    maxSizeBytes: 8 * 1024 * 1024,
    imageOnly: true,
    generateThumbnail: true
  },
  chamado_tecnico_anexo: {
    entidadeTipo: "chamado_tecnico",
    categoria: "anexo",
    subdirectory: "chamados-tecnicos/anexos",
    allowedExtensions: attachmentExtensions,
    allowedMimeTypes: attachmentMimeTypes,
    maxSizeBytes: 25 * 1024 * 1024,
    generateThumbnail: true
  },
  ocorrencia_anexo: {
    entidadeTipo: "ocorrencia_crianca",
    categoria: "anexo",
    subdirectory: "ocorrencias/anexos",
    allowedExtensions: documentExtensions,
    allowedMimeTypes: documentMimeTypes,
    maxSizeBytes: 15 * 1024 * 1024,
    generateThumbnail: true
  },
  oficio_documento: {
    entidadeTipo: "oficio",
    categoria: "documento",
    subdirectory: "oficios/documentos",
    allowedExtensions: documentExtensions,
    allowedMimeTypes: documentMimeTypes,
    maxSizeBytes: 20 * 1024 * 1024,
    generateThumbnail: true
  },
  plano_trabalho_documento: {
    entidadeTipo: "plano_trabalho",
    categoria: "documento",
    subdirectory: "planos-trabalho/documentos",
    allowedExtensions: documentExtensions,
    allowedMimeTypes: documentMimeTypes,
    maxSizeBytes: 25 * 1024 * 1024,
    generateThumbnail: true
  },
  autorizacao_compra_anexo: {
    entidadeTipo: "autorizacao_compra",
    categoria: "anexo",
    subdirectory: "compras/anexos",
    allowedExtensions: attachmentExtensions,
    allowedMimeTypes: attachmentMimeTypes,
    maxSizeBytes: 25 * 1024 * 1024,
    generateThumbnail: true
  },
  contabilidade_lancamento_anexo: {
    entidadeTipo: "contabilidade_lancamento",
    categoria: "anexo",
    subdirectory: "contabilidade/anexos",
    allowedExtensions: attachmentExtensions,
    allowedMimeTypes: attachmentMimeTypes,
    maxSizeBytes: 25 * 1024 * 1024,
    generateThumbnail: true
  },
  captacao_doador_anexo: {
    entidadeTipo: "captacao_doador",
    categoria: "anexo",
    subdirectory: "captacao/doadores/anexos",
    allowedExtensions: ["*"],
    allowedMimeTypes: ["*"],
    maxSizeBytes: 100 * 1024 * 1024,
    generateThumbnail: true
  },
  captacao_campanha_banner: {
    entidadeTipo: "captacao_campanha",
    categoria: "banner",
    subdirectory: "imagens/captacao/campanhas",
    allowedExtensions: imageExtensions,
    allowedMimeTypes: imageMimeTypes,
    maxSizeBytes: 10 * 1024 * 1024,
    imageOnly: true,
    generateThumbnail: true
  },
  termo_fomento_documento: {
    entidadeTipo: "termo_fomento",
    categoria: "documento",
    subdirectory: "termos-fomento/documentos",
    allowedExtensions: documentExtensions,
    allowedMimeTypes: documentMimeTypes,
    maxSizeBytes: 25 * 1024 * 1024,
    generateThumbnail: true
  },
  educacional_documento: {
    entidadeTipo: "educacional_documento",
    categoria: "documento",
    subdirectory: "educacional/documentos",
    allowedExtensions: documentExtensions,
    allowedMimeTypes: documentMimeTypes,
    maxSizeBytes: 20 * 1024 * 1024,
    generateThumbnail: true
  },
  prestacao_contas_documento: {
    entidadeTipo: "prestacao_contas",
    categoria: "documento",
    subdirectory: "prestacao-contas/documentos",
    allowedExtensions: documentExtensions,
    allowedMimeTypes: documentMimeTypes,
    maxSizeBytes: 25 * 1024 * 1024,
    generateThumbnail: true
  },
  geral_outro: {
    entidadeTipo: "geral",
    categoria: "outro",
    subdirectory: "geral/outros",
    allowedExtensions: documentExtensions,
    allowedMimeTypes: documentMimeTypes,
    maxSizeBytes: 20 * 1024 * 1024,
    generateThumbnail: true
  }
};

export function getStoragePolicy(scope: StorageScopeKey) {
  return storagePolicies[scope];
}
