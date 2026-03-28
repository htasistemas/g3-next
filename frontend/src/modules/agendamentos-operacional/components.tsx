import { CalendarDays, Clock3, Mail, MapPin, MessageCircle, Pencil, Printer, Users, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type {
  Agendamento,
  AgendamentoOperacionalBeneficiario,
  AgendamentoOperacionalItem,
  AgendamentoOperacionalTipo
} from "@/types/agendamento";

const formatarData = (data?: string) => {
  if (!data) return "---";
  const [ano, mes, dia] = data.slice(0, 10).split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : data;
};

const formatarDiaSemana = (data?: string) => {
  if (!data) return "";
  const parsed = new Date(`${data}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  const texto = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(parsed);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const formatarHorario = (horario?: string) => {
  if (!horario) return "---";
  const match = horario.match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : horario;
};

export function TipoSelector(props: {
  value?: AgendamentoOperacionalTipo;
  onChange: (value: AgendamentoOperacionalTipo) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>Tipo</Label>
      <Select value={props.value ?? ""} onChange={(event) => props.onChange(event.target.value as AgendamentoOperacionalTipo)}>
        <option value="">Selecione</option>
        <option value="curso">Curso</option>
        <option value="atendimento">Atendimento</option>
        <option value="oficina">Oficina</option>
      </Select>
    </div>
  );
}

export function ItemSelector(props: {
  busca: string;
  onBuscaChange: (value: string) => void;
  itens: AgendamentoOperacionalItem[];
  selecionadoId?: number | null;
  onSelect: (item: AgendamentoOperacionalItem) => void;
  carregando?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="max-h-56 overflow-auto rounded-xl border border-[var(--g3-border)] bg-white p-2 shadow-sm">
        {props.carregando ? (
          <p className="px-2 py-6 text-sm text-[var(--g3-muted)]">Carregando itens...</p>
        ) : props.itens.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {props.itens.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => props.onSelect(item)}
                className={`h-full rounded-xl border px-3 py-3 text-left shadow-sm transition-all ${
                  props.selecionadoId === item.id
                    ? "border-emerald-300 bg-white shadow-md ring-1 ring-emerald-200"
                    : "border-[var(--g3-border)] bg-white hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
                }`}
              >
                <p className="text-sm font-semibold text-[var(--g3-foreground)]">{item.nome}</p>
                <p className="mt-1 text-xs text-[var(--g3-muted)]">{item.profissionalNome || "Sem profissional definido"}</p>
              </button>
            ))}
          </div>
        ) : (
          <p className="px-2 py-6 text-sm text-[var(--g3-muted)]">Nenhum item encontrado.</p>
        )}
      </div>
    </div>
  );
}

export function ItemResumoCard({ item }: { item?: AgendamentoOperacionalItem | null }) {
  if (!item) {
    return (
      <Card className="border-dashed border-[var(--g3-border)]">
        <CardContent className="px-4 py-5 text-sm text-[var(--g3-muted)]">
          Selecione um item para ver o resumo automaticamente.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-[var(--g3-border)] bg-[linear-gradient(180deg,#fbfffc_0%,#eff9f2_100%)] shadow-sm">
      <div className="h-1.5 bg-emerald-600" />
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{item.nome}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm lg:grid-cols-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Profissional</p>
          <p className="mt-1 text-[var(--g3-foreground)]">{item.profissionalNome || "Sem profissional definido"}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Dias</p>
          <p className="mt-1 text-[var(--g3-foreground)]">{item.diasSemana || "Não informado"}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Horário</p>
          <p className="mt-1 text-[var(--g3-foreground)]">{formatarHorario(item.horario)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Local</p>
          <p className="mt-1 text-[var(--g3-foreground)]">{item.local || "Não informado"}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function BeneficiarioSelector(props: {
  busca: string;
  onBuscaChange: (value: string) => void;
  beneficiarios: AgendamentoOperacionalBeneficiario[];
  selecionados: number[];
  onToggle: (matriculaId: number) => void;
  onSelecionarTodos: () => void;
  onLimparSelecao: () => void;
  carregando?: boolean;
}) {
  const selecionadosValidos = props.beneficiarios.filter((item) => props.selecionados.includes(item.matriculaId));

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex-1 space-y-1">
          <Label>Beneficiários vinculados</Label>
          <Input value={props.busca} onChange={(event) => props.onBuscaChange(event.target.value)} placeholder="Buscar por nome" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={props.onSelecionarTodos}>
            Selecionar todos
          </Button>
          <Button type="button" variant="outline" onClick={props.onLimparSelecao} disabled={!props.selecionados.length}>
            Limpar seleção
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--g3-border)] bg-[linear-gradient(180deg,#ffffff_0%,#f7fbf8_100%)] p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--g3-muted)]">
          <Badge variant="info">{props.beneficiarios.filter((item) => item.selecionavel).length} disponíveis</Badge>
          <Badge variant="default">{props.selecionados.length} selecionados</Badge>
        </div>
        <div className="mt-3 min-h-[24px]">
          {selecionadosValidos.length ? (
            <div className="flex flex-wrap gap-2">
              {selecionadosValidos.slice(0, 6).map((item) => (
                <Badge key={`${item.matriculaId}-${item.beneficiarioId ?? "sem-vinculo"}`} variant="info" className="max-w-full">
                  <span className="truncate">{item.nomeCompleto}</span>
                </Badge>
              ))}
              {selecionadosValidos.length > 6 ? <Badge variant="default">+{selecionadosValidos.length - 6} selecionados</Badge> : null}
            </div>
          ) : (
            <p className="text-xs text-[var(--g3-muted)]">Nenhum beneficiário selecionado ainda.</p>
          )}
        </div>
      </div>

      <div className="max-h-72 overflow-auto rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-2">
        {props.carregando ? (
          <p className="px-2 py-8 text-sm text-[var(--g3-muted)]">Carregando beneficiários...</p>
        ) : props.beneficiarios.length ? (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {props.beneficiarios.map((item) => {
              const ativo = props.selecionados.includes(item.matriculaId);
              return (
                <label
                  key={`${item.matriculaId}-${item.beneficiarioId ?? "sem-vinculo"}`}
                  className={`flex items-start gap-3 rounded-xl border px-3 py-3 ${
                    ativo ? "border-emerald-300 bg-emerald-50" : "border-[var(--g3-border)] bg-white"
                  } ${item.selecionavel ? "cursor-pointer" : "opacity-70"}`}
                >
                  <Checkbox checked={ativo} disabled={!item.selecionavel} onChange={() => props.onToggle(item.matriculaId)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--g3-foreground)]">{item.nomeCompleto}</p>
                      <Badge variant="info">{item.status || "Ativo"}</Badge>
                      {!item.selecionavel ? <Badge variant="warning">Cadastro não vinculado</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-[var(--g3-muted)]">
                      {item.telefone || "Sem telefone"}
                      {item.email ? ` - ${item.email}` : ""}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="px-2 py-8 text-sm text-[var(--g3-muted)]">Nenhum beneficiário encontrado para este item.</p>
        )}
      </div>
    </div>
  );
}

export function DataSelector(props: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-[220px_1fr]">
      <div className="space-y-1">
        <Label>Data do agendamento</Label>
        <Input type="date" value={props.value} onChange={(event) => props.onChange(event.target.value)} />
      </div>
      <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Dia da semana</p>
        <p className="mt-1 text-sm font-semibold text-[var(--g3-foreground)]">{formatarDiaSemana(props.value) || "---"}</p>
      </div>
    </div>
  );
}

export function GenerateCardButton(props: { disabled?: boolean; loading?: boolean; onClick: () => void; texto?: string }) {
  return (
    <div className="space-y-2">
      <Button
        type="button"
        className="w-full bg-emerald-600 shadow-sm hover:bg-emerald-700"
        disabled={props.disabled || props.loading}
        onClick={props.onClick}
      >
        {props.loading ? "Gerando agenda..." : props.texto || "Gerar Agenda"}
      </Button>
      <p className="text-center text-xs text-[var(--g3-muted)]">Ao clicar em Gerar Agenda, o card é salvo imediatamente.</p>
    </div>
  );
}

export function AgendaCardList(props: {
  cards: Agendamento[];
  selecionadoId?: number | null;
  onEditar: (item: Agendamento) => void;
  onCancelar: (item: Agendamento) => void;
  onWhatsApp: (item: Agendamento) => void;
  onEmail: (item: Agendamento) => void;
  onImprimir: (item: Agendamento) => void;
}) {
  if (!props.cards.length) {
    return (
      <Card className="border-[var(--g3-border)]">
        <CardContent className="px-4 py-8 text-sm text-[var(--g3-muted)]">
          Nenhum card operacional gerado no período selecionado.
        </CardContent>
      </Card>
    );
  }

  const grupos = props.cards.reduce<Array<{ data: string; itens: Agendamento[] }>>((acc, item) => {
    const chave = item.data || "Sem data";
    const existente = acc.find((grupo) => grupo.data === chave);
    if (existente) {
      existente.itens.push(item);
      return acc;
    }
    acc.push({ data: chave, itens: [item] });
    return acc;
  }, []);

  return (
    <div className="space-y-4">
      {grupos.map((grupo) => (
        <section key={grupo.data} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/35 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--g3-foreground)]">{formatarData(grupo.data)}</p>
              <p className="text-xs text-[var(--g3-muted)]">{formatarDiaSemana(grupo.data) || "Data não identificada"}</p>
            </div>
            <Badge variant="info">{grupo.itens.length} card(s)</Badge>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {grupo.itens.map((item) => (
              <AgendaCard
                key={item.id ?? `${item.itemOrigemId}-${item.data}`}
                item={item}
                ativo={props.selecionadoId === item.id}
                onEditar={() => props.onEditar(item)}
                onCancelar={() => props.onCancelar(item)}
                onWhatsApp={() => props.onWhatsApp(item)}
                onEmail={() => props.onEmail(item)}
                onImprimir={() => props.onImprimir(item)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function AgendaCard(props: {
  item: Agendamento;
  ativo?: boolean;
  onWhatsApp: () => void;
  onEmail: () => void;
  onImprimir: () => void;
  onEditar: () => void;
  onCancelar: () => void;
}) {
  const participantes = props.item.participantes ?? [];

  return (
    <Card
      className={`overflow-hidden border-[var(--g3-border)] bg-white shadow-sm transition-all ${
        props.ativo
          ? "border-emerald-300 bg-[linear-gradient(180deg,#ffffff_0%,#f4fbf6_100%)] ring-2 ring-emerald-500 ring-offset-2"
          : "hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      <div className={`px-4 py-3 ${props.ativo ? "bg-emerald-700" : "bg-emerald-600"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-base font-semibold text-white">{props.item.itemNome || props.item.tipoAtendimento}</p>
          <div className="flex flex-wrap items-center gap-2">
            {props.ativo ? <Badge variant="warning">Em edição</Badge> : null}
            <Badge variant="default" className="border-white/35 bg-white/15 text-white">
              {participantes.length} participante(s)
            </Badge>
          </div>
        </div>
      </div>
      <CardContent className="space-y-4 px-4 py-4">
        {props.ativo ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
            Este card está aberto no formulário para edição. Qualquer alteração será aplicada neste agendamento.
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-[var(--g3-primary-soft)]/30 px-3 py-3 text-sm text-[var(--g3-foreground)]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Profissional</p>
            <p className="mt-1 flex items-center gap-2 font-medium">
              <Users className="h-4 w-4 text-emerald-700" /> {props.item.profissionalNome || "Sem profissional definido"}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--g3-primary-soft)]/30 px-3 py-3 text-sm text-[var(--g3-foreground)]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Data</p>
            <p className="mt-1 flex items-center gap-2 font-medium">
              <CalendarDays className="h-4 w-4 text-emerald-700" /> {formatarData(props.item.data)} {props.item.diaSemana ? `- ${props.item.diaSemana}` : ""}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--g3-primary-soft)]/30 px-3 py-3 text-sm text-[var(--g3-foreground)]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Horário</p>
            <p className="mt-1 flex items-center gap-2 font-medium">
              <Clock3 className="h-4 w-4 text-emerald-700" /> {props.item.horaInicial || "---"}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--g3-primary-soft)]/30 px-3 py-3 text-sm text-[var(--g3-foreground)]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Local</p>
            <p className="mt-1 flex items-center gap-2 font-medium">
              <MapPin className="h-4 w-4 text-emerald-700" /> {props.item.itemLocal || props.item.sala || props.item.unidade || "---"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Beneficiários</p>
            <p className="text-xs text-[var(--g3-muted)]">Lista de presença do card</p>
          </div>
          <div className="space-y-2">
            {participantes.map((participante, index) => (
              <div
                key={`${participante.matriculaId ?? participante.beneficiarioId ?? participante.beneficiarioNome}-${index}`}
                className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-3 text-sm text-[var(--g3-foreground)]"
              >
                <p className="font-medium">{participante.beneficiarioNome}</p>
                <p className="mt-1 text-xs text-[var(--g3-muted)]">{participante.telefone || "Sem telefone cadastrado"}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-[var(--g3-border)] pt-4">
          <Button type="button" variant="outline" className="h-8 gap-1.5 px-2.5 text-xs shadow-sm" onClick={props.onImprimir}>
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
          <Button type="button" variant="outline" className="h-8 gap-1.5 px-2.5 text-xs" onClick={props.onWhatsApp}>
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </Button>
          <Button type="button" variant="outline" className="h-8 gap-1.5 px-2.5 text-xs" onClick={props.onEmail}>
            <Mail className="h-4 w-4" /> E-mail
          </Button>
          <Button type="button" variant="default" className="h-8 gap-1.5 px-2.5 text-xs" onClick={props.onEditar}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
          <Button type="button" variant="danger" className="h-8 gap-1.5 px-2.5 text-xs" onClick={props.onCancelar}>
            <XCircle className="h-4 w-4" /> Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
