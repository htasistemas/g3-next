import type {
  UsuarioAuditoriaItem,
  UsuarioPermissaoCatalogo,
  UsuarioResponse,
  UsuarioStatus
} from "./usuario.types.js";

type UsuarioRow = {
  id: bigint;
  nome_usuario: string;
  nome: string | null;
  nome_exibicao: string | null;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
  matricula: string | null;
  setor: string | null;
  unidade: string | null;
  cargo: string | null;
  status: string | null;
  exigir_troca_senha: boolean | null;
  tentativas_login_invalidas: number | bigint | null;
  ultimo_login_invalido_em: Date | null;
  ultimo_acesso_em: Date | null;
  criado_em: Date;
  atualizado_em: Date;
  permissoes: string[] | null;
};

type AuditoriaRow = {
  id: string;
  acao: string;
  usuario_id: bigint | null;
  usuario_nome: string | null;
  dados_json: unknown;
  criado_em: Date;
};

const permissaoCatalogoFixo: Record<
  string,
  { modulo: string; tela: string; acao: string }
> = {
  ADMINISTRADOR: {
    modulo: "Configuracoes gerais",
    tela: "Usuarios",
    acao: "Acesso total"
  },
  OPERADOR: {
    modulo: "Operacao",
    tela: "Cadastros",
    acao: "Operar modulo"
  },
  LEITURA_APENAS: {
    modulo: "Operacao",
    tela: "Consultas",
    acao: "Somente leitura"
  },
  CHAMADO_TECNICO_DESENVOLVIMENTO: {
    modulo: "Configuracoes gerais",
    tela: "Chamado tecnico",
    acao: "Desenvolvimento"
  }
};

function limparTexto(valor?: string | null): string | undefined {
  if (!valor) return undefined;
  const trimmed = valor.trim();
  return trimmed.length ? trimmed : undefined;
}

function mapStatus(valor?: string | null): UsuarioStatus {
  const status = limparTexto(valor)?.toUpperCase();
  if (status === "BLOQUEADO") return "BLOQUEADO";
  if (status === "INATIVO") return "INATIVO";
  return "ATIVO";
}

function toInteger(valor: number | bigint | null | undefined): number {
  if (typeof valor === "bigint") return Number(valor);
  if (typeof valor === "number") return valor;
  return 0;
}

function toTitleCase(valor: string): string {
  const texto = valor
    .toLowerCase()
    .replaceAll("_", " ")
    .trim();
  if (!texto.length) return "";
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function mapPermissaoMeta(nomePermissao: string): UsuarioPermissaoCatalogo {
  const nome = nomePermissao.trim().toUpperCase();
  const fixo = permissaoCatalogoFixo[nome];
  if (fixo) {
    return {
      nome,
      ...fixo
    };
  }

  const partes = nome.split("_").filter(Boolean);
  if (partes.length >= 2) {
    const [modulo, ...resto] = partes;
    return {
      nome,
      modulo: toTitleCase(modulo),
      tela: resto.length > 1 ? toTitleCase(resto.slice(0, -1).join("_")) : toTitleCase(modulo),
      acao: toTitleCase(resto[resto.length - 1] ?? "Acesso")
    };
  }

  return {
    nome,
    modulo: "Sistema",
    tela: "Geral",
    acao: toTitleCase(nome)
  };
}

function resolverPerfilAcesso(permissoes: string[]): string | undefined {
  if (!permissoes.length) return undefined;

  if (permissoes.includes("ADMINISTRADOR")) return "ADMINISTRADOR";
  if (permissoes.includes("OPERADOR")) return "OPERADOR";
  if (permissoes.includes("LEITURA_APENAS")) return "LEITURA_APENAS";
  return permissoes[0];
}

export function mapUsuarioRowParaResponse(row: UsuarioRow): UsuarioResponse {
  const permissoes = (row.permissoes ?? []).filter(Boolean).map((item) => item.trim()).filter(Boolean);

  return {
    id_usuario: row.id.toString(),
    nome_completo: limparTexto(row.nome),
    nome_exibicao: limparTexto(row.nome_exibicao),
    nome_usuario: row.nome_usuario,
    email: limparTexto(row.email),
    telefone: limparTexto(row.telefone),
    cpf: limparTexto(row.cpf),
    matricula: limparTexto(row.matricula),
    setor: limparTexto(row.setor),
    unidade: limparTexto(row.unidade),
    cargo: limparTexto(row.cargo),
    perfil_acesso: resolverPerfilAcesso(permissoes),
    permissoes,
    status: mapStatus(row.status),
    exigir_troca_senha: !!row.exigir_troca_senha,
    tentativas_login_invalidas: toInteger(row.tentativas_login_invalidas),
    ultimo_login_invalido_em: row.ultimo_login_invalido_em?.toISOString(),
    ultimo_acesso_em: row.ultimo_acesso_em?.toISOString(),
    criado_em: row.criado_em.toISOString(),
    atualizado_em: row.atualizado_em.toISOString()
  };
}

export function mapAuditoriaRowParaResponse(row: AuditoriaRow): UsuarioAuditoriaItem {
  return {
    id: row.id,
    acao: row.acao,
    usuario_id: row.usuario_id ? row.usuario_id.toString() : undefined,
    usuario_nome: limparTexto(row.usuario_nome),
    dados_json:
      row.dados_json && typeof row.dados_json === "object"
        ? (row.dados_json as Record<string, unknown>)
        : null,
    criado_em: row.criado_em.toISOString()
  };
}

export function mapPermissoesParaCatalogo(
  permissoes: string[]
): UsuarioPermissaoCatalogo[] {
  return permissoes
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .map(mapPermissaoMeta);
}

export type { UsuarioRow, AuditoriaRow };
