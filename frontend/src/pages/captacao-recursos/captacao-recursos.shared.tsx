import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const captacaoTabPaths = {
  dashboard: "/captacao-recursos/dashboard",
  doadores: "/captacao-recursos/doadores",
  doacoes: "/captacao-recursos/doacoes",
  campanhas: "/captacao-recursos/campanhas",
  portal: "/captacao-recursos/portal-doador",
  comprovantes: "/captacao-recursos/comprovantes",
  configuracoes: "/captacao-recursos/configuracoes-pagamento",
  relatorios: "/captacao-recursos/relatorios",
  permissoes: "/captacao-recursos/permissoes"
} as const;

export type CaptacaoTabId = keyof typeof captacaoTabPaths;

export const tipoDoadorOptions = [
  { value: "pessoa_fisica", label: "Pessoa física" },
  { value: "pessoa_juridica", label: "Pessoa jurídica" },
  { value: "anonimo", label: "Doador anônimo" },
  { value: "mantenedor", label: "Mantenedor" },
  { value: "patrocinador", label: "Patrocinador" },
  { value: "parceiro", label: "Parceiro" }
];

export const categoriaDoadorOptions = [
  { value: "individual", label: "Individual" },
  { value: "empresarial", label: "Empresarial" },
  { value: "institucional", label: "Institucional" },
  { value: "mantenedor", label: "Mantenedor" },
  { value: "parceiro", label: "Parceiro" },
  { value: "patrocinador", label: "Patrocinador" }
];

export const statusDoadorOptions = [
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
  { value: "prospecto", label: "Prospecto" }
];

export const tipoDoacaoOptions = [
  { value: "unica", label: "Única" },
  { value: "recorrente", label: "Recorrente" },
  { value: "espontanea", label: "Espontânea" },
  { value: "campanha", label: "Campanha" },
  { value: "evento", label: "Evento" },
  { value: "patrocinio", label: "Patrocínio" }
];

export const formaPagamentoOptions = [
  { value: "pix", label: "PIX" },
  { value: "cartao", label: "Cartão" },
  { value: "boleto", label: "Boleto" }
];

export const situacaoDoacaoOptions = [
  { value: "pendente", label: "Pendente" },
  { value: "aguardando_pagamento", label: "Aguardando pagamento" },
  { value: "pago", label: "Pago" },
  { value: "confirmado", label: "Confirmado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "vencido", label: "Vencido" },
  { value: "expirado", label: "Expirado" },
  { value: "estornado", label: "Estornado" },
  { value: "falha_pagamento", label: "Falha no pagamento" }
];

export const origemDoacaoOptions = [
  { value: "administrativo", label: "Administrativo" },
  { value: "portal_doador", label: "Portal doador" },
  { value: "campanha_publica", label: "Campanha pública" },
  { value: "link_direto", label: "Link direto" },
  { value: "qr_code", label: "QR Code" },
  { value: "evento", label: "Evento" }
];

export const statusCampanhaOptions = [
  { value: "rascunho", label: "Rascunho" },
  { value: "ativa", label: "Ativa" },
  { value: "pausada", label: "Pausada" },
  { value: "encerrada", label: "Encerrada" }
];

export const tipoCampanhaOptions = [
  { value: "institucional", label: "Institucional" },
  { value: "emergencial", label: "Emergencial" },
  { value: "sazonal", label: "Sazonal" },
  { value: "projeto_social", label: "Projeto social" },
  { value: "evento", label: "Evento" },
  { value: "manutencao", label: "Manutenção" }
];

export const periodicidadeOptions = [
  { value: "mensal", label: "Mensal" },
  { value: "bimestral", label: "Bimestral" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" }
];

export const statusRecorrenciaOptions = [
  { value: "ativa", label: "Ativa" },
  { value: "pausada", label: "Pausada" },
  { value: "cancelada", label: "Cancelada" },
  { value: "falhou", label: "Falhou" },
  { value: "encerrada", label: "Encerrada" }
];

export const permissaoCaptacaoDetalhada = [
  "CAPTACAO_DASHBOARD_VISUALIZAR",
  "CAPTACAO_DOADORES_VISUALIZAR",
  "CAPTACAO_DOADORES_CADASTRAR",
  "CAPTACAO_DOADORES_EDITAR",
  "CAPTACAO_DOADORES_INATIVAR",
  "CAPTACAO_DOACOES_VISUALIZAR",
  "CAPTACAO_DOACOES_CADASTRAR",
  "CAPTACAO_DOACOES_CONFIRMAR",
  "CAPTACAO_DOACOES_CANCELAR",
  "CAPTACAO_DOACOES_ESTORNAR",
  "CAPTACAO_COBRANCAS_GERAR",
  "CAPTACAO_COMPROVANTES_EMITIR",
  "CAPTACAO_COMPROVANTES_REENVIAR",
  "CAPTACAO_CAMPANHAS_CRIAR",
  "CAPTACAO_CAMPANHAS_EDITAR",
  "CAPTACAO_CAMPANHAS_PAUSAR",
  "CAPTACAO_CAMPANHAS_ENCERRAR",
  "CAPTACAO_PORTAL_ACESSAR",
  "CAPTACAO_CONFIGURAR",
  "CAPTACAO_RELATORIOS_VISUALIZAR",
  "CAPTACAO_RELATORIOS_EXPORTAR",
  "CAPTACAO_DADOS_SENSIVEIS_VISUALIZAR"
];

export function formatarMoeda(valor?: number | null) {
  return Number(valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

export function formatarNumero(valor?: number | null) {
  return Number(valor ?? 0).toLocaleString("pt-BR");
}

export function formatarData(valor?: string | null) {
  if (!valor) return "—";
  const partes = valor.slice(0, 10).split("-");
  if (partes.length !== 3) return valor;
  return `${partes[2]}-${partes[1]}-${partes[0]}`;
}

export function formatarDataHora(valor?: string | null) {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    return formatarData(valor);
  }
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(data);
}

export function dataHojeIso() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
}

export function primeiroDiaMesIso() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-01`;
}

export function toInputDate(valor?: string | null) {
  if (!valor) return "";
  if (/^\d{4}-\d{2}-\d{2}$/u.test(valor)) return valor;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

export function toInputDateTime(valor?: string | null) {
  if (!valor) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}T${String(data.getHours()).padStart(2, "0")}:${String(data.getMinutes()).padStart(2, "0")}`;
}

export function badgeClasseStatus(valor?: string) {
  switch (valor) {
    case "confirmado":
    case "pago":
    case "ativa":
    case "ativo":
      return "bg-emerald-100 text-emerald-700";
    case "pendente":
    case "aguardando_pagamento":
    case "rascunho":
      return "bg-amber-100 text-amber-700";
    case "cancelado":
    case "estornado":
    case "falha_pagamento":
    case "inativo":
    case "encerrada":
      return "bg-rose-100 text-rose-700";
    case "pausada":
    case "prospecto":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-[var(--g3-primary-soft)] text-[var(--g3-active)]";
  }
}

export function SecaoCard({
  titulo,
  descricao,
  children,
  right
}: {
  titulo: string;
  descricao?: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <Card className="border-[var(--g3-border)]">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold text-[var(--g3-foreground)]">
            {titulo}
          </CardTitle>
          {descricao ? (
            <p className="mt-1 text-xs text-[var(--g3-muted)]">{descricao}</p>
          ) : null}
        </div>
        {right}
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

export function IndicadorCard({
  titulo,
  valor,
  detalhe
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
}) {
  return (
    <Card className="border-[var(--g3-border)] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
      <CardContent className="space-y-1 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--g3-muted)]">
          {titulo}
        </p>
        <p className="text-2xl font-semibold tracking-tight text-[var(--g3-foreground)]">
          {valor}
        </p>
        {detalhe ? <p className="text-xs text-[var(--g3-muted)]">{detalhe}</p> : null}
      </CardContent>
    </Card>
  );
}
