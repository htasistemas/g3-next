import {
  Activity,
  BadgeAlert,
  BadgeCheck,
  Building2,
  CalendarRange,
  Files,
  FolderOpen,
  Gift,
  HandHeart,
  House,
  ImageIcon,
  Landmark,
  Send,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  UserRound,
  UserX,
  Users,
  UsersRound,
  type LucideIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PowerBiCard } from "@/types/power-bi";

const mapaIcones: Record<string, LucideIcon> = {
  activity: Activity,
  "badge-alert": BadgeAlert,
  "badge-check": BadgeCheck,
  "building-2": Building2,
  "calendar-range": CalendarRange,
  files: Files,
  "folder-open": FolderOpen,
  gift: Gift,
  "hand-heart": HandHeart,
  house: House,
  "image-icon": ImageIcon,
  landmark: Landmark,
  send: Send,
  "shield-alert": ShieldAlert,
  sparkles: Sparkles,
  stethoscope: Stethoscope,
  "user-round": UserRound,
  "user-x": UserX,
  users: Users,
  "users-round": UsersRound
};

function classeTendencia(tendencia: PowerBiCard["tendencia"]) {
  if (tendencia === "subiu") return "text-emerald-700";
  if (tendencia === "caiu") return "text-rose-700";
  return "text-slate-500";
}

function rotuloTendencia(tendencia: PowerBiCard["tendencia"]) {
  if (tendencia === "subiu") return "Subiu";
  if (tendencia === "caiu") return "Caiu";
  return "Estável";
}

type PowerBiKpiCardProps = {
  card: PowerBiCard;
  onClick?: () => void;
};

export function PowerBiKpiCard({ card, onClick }: PowerBiKpiCardProps) {
  const Icone = mapaIcones[card.icone] ?? Activity;
  const interativo = typeof onClick === "function";

  return (
    <Card
      className={`border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 shadow-[0_18px_45px_-30px_rgba(16,185,129,0.45)] transition ${
        interativo ? "cursor-pointer hover:-translate-y-0.5 hover:border-emerald-300" : ""
      }`}
      onClick={onClick}
      title={card.tooltip ?? card.descricao}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700/80">
              Indicador
            </p>
            <CardTitle className="text-sm font-semibold text-slate-900">{card.titulo}</CardTitle>
          </div>
          <span className="rounded-2xl border border-emerald-200 bg-white/80 p-2 text-emerald-700 shadow-sm">
            <Icone className="h-5 w-5" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center">
          <p className="text-3xl font-semibold tracking-tight text-slate-950">{card.valor.toLocaleString("pt-BR")}</p>
          <p className="mt-1 text-xs text-slate-500">{card.descricao}</p>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-white/80 px-3 py-2 text-xs">
          <span className={classeTendencia(card.tendencia)}>{rotuloTendencia(card.tendencia)}</span>
          <span className="font-medium text-slate-600">
            {card.comparacaoRotulo}: {card.comparacaoValor.toLocaleString("pt-BR")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
