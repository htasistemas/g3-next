import {
  BadgeCheck,
  CalendarDays,
  CircleHelp,
  Clock3,
  Copy,
  LoaderCircle,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Printer,
  Trash2,
  Users,
  XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatarTelefone } from "@/lib/br-utils";
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

const formatarIdade = (dataNascimento?: string) => {
  if (!dataNascimento) return "";
  const nascimento = new Date(`${dataNascimento.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(nascimento.getTime())) return "";

  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mesAtual = hoje.getMonth();
  const mesNascimento = nascimento.getMonth();
  const diaAtual = hoje.getDate();
  const diaNascimento = nascimento.getDate();

  if (mesAtual < mesNascimento || (mesAtual === mesNascimento && diaAtual < diaNascimento)) {
    idade -= 1;
  }

  return idade >= 0 ? `${idade} ano${idade === 1 ? "" : "s"}` : "";
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
      <div className="max-h-56 overflow-auto rounded-xl border border-[var(--g3-border)] bg-white shadow-sm">
        {props.carregando ? (
          <p className="px-2 py-6 text-sm text-[var(--g3-muted)]">Carregando itens...</p>
        ) : props.itens.length ? (
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-emerald-50 text-left">
              <tr>
                <th className="border-b border-[var(--g3-border)] px-3 py-2 font-semibold text-emerald-900">Nome</th>
                <th className="border-b border-[var(--g3-border)] px-3 py-2 font-semibold text-emerald-900">Profissional</th>
                <th className="border-b border-[var(--g3-border)] px-3 py-2 font-semibold text-emerald-900">Horário</th>
                <th className="border-b border-[var(--g3-border)] px-3 py-2 font-semibold text-emerald-900">Local</th>
              </tr>
            </thead>
            <tbody>
              {props.itens.map((item) => {
                const ativo = props.selecionadoId === item.id;
                return (
                  <tr
                    key={item.id}
                    onClick={() => props.onSelect(item)}
                    className={`cursor-pointer transition-colors ${
                      ativo ? "bg-emerald-50" : "bg-white hover:bg-[var(--g3-primary-soft)]/35"
                    }`}
                  >
                    <td className="border-b border-[var(--g3-border)] px-3 py-2 font-medium text-[var(--g3-foreground)]">{item.nome}</td>
                    <td className="border-b border-[var(--g3-border)] px-3 py-2 text-[var(--g3-muted)]">
                      {item.profissionalNome || "Sem profissional definido"}
                    </td>
                    <td className="border-b border-[var(--g3-border)] px-3 py-2 text-[var(--g3-muted)]">{formatarHorario(item.horario)}</td>
                    <td className="border-b border-[var(--g3-border)] px-3 py-2 text-[var(--g3-muted)]">{item.local || "Não informado"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="px-2 py-6 text-sm text-[var(--g3-muted)]">Nenhum item encontrado.</p>
        )}
      </div>
    </div>
  );
}

export function ItemResumoCard({ item }: { item?: AgendamentoOperacionalItem | null }) {
  if (!item) {
    return null;
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
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex-1 space-y-1">
          <Label>Beneficiários vinculados</Label>
          <Input value={props.busca} onChange={(event) => props.onBuscaChange(event.target.value)} placeholder="Buscar por nome" />
        </div>
        <div className="flex flex-wrap gap-2 xl:self-end">
          <Button
            type="button"
            variant="default"
            onClick={props.onSelecionarTodos}
            className="bg-emerald-600 shadow-[0_10px_22px_rgba(5,150,105,0.18)] hover:bg-emerald-700"
          >
            Selecionar todos
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={props.onLimparSelecao}
            disabled={!props.selecionados.length}
            className="bg-emerald-600 shadow-[0_10px_22px_rgba(5,150,105,0.18)] hover:bg-emerald-700 disabled:bg-emerald-300"
          >
            Limpar seleção
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--g3-border)] bg-[linear-gradient(180deg,#ffffff_0%,#f7fbf8_100%)] p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--g3-muted)]">
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
                      {formatarTelefone(item.telefone) || item.telefone || "Sem telefone"}
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
        {props.loading ? "Gerando agenda..." : props.texto || "Gerar agenda"}
      </Button>
      <p className="text-center text-xs text-[var(--g3-muted)]">Ao clicar em Gerar agenda, o card é salvo imediatamente.</p>
    </div>
  );
}

export function AgendaCardList(props: {
  cards: Agendamento[];
  selecionadoId?: number | null;
  envioEmAndamento?: {
    agendamentoId: number;
    canal: "WHATSAPP" | "EMAIL";
    etapa: number;
  } | null;
  onAlternarConfirmacao: (item: Agendamento, index: number) => void;
  onMoverParticipante: (item: Agendamento, index: number) => void;
  onExcluirParticipante: (item: Agendamento, index: number) => void;
  onCopiar: (item: Agendamento) => void;
  onExcluir: (item: Agendamento) => void;
  onMover: (item: Agendamento) => void;
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

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {props.cards.map((item) => (
        <AgendaCard
          key={item.id ?? `${item.itemOrigemId}-${item.data}`}
          item={item}
          ativo={props.selecionadoId === item.id}
          envioEmAndamento={
            props.envioEmAndamento && Number(item.id) === props.envioEmAndamento.agendamentoId
              ? props.envioEmAndamento
              : null
          }
          onAlternarConfirmacao={(index) => props.onAlternarConfirmacao(item, index)}
          onMoverParticipante={(index) => props.onMoverParticipante(item, index)}
          onExcluirParticipante={(index) => props.onExcluirParticipante(item, index)}
          onCopiar={() => props.onCopiar(item)}
          onExcluir={() => props.onExcluir(item)}
          onMover={() => props.onMover(item)}
          onEditar={() => props.onEditar(item)}
          onCancelar={() => props.onCancelar(item)}
          onWhatsApp={() => props.onWhatsApp(item)}
          onEmail={() => props.onEmail(item)}
          onImprimir={() => props.onImprimir(item)}
        />
      ))}
    </div>
  );
}

export function AgendaCard(props: {
  item: Agendamento;
  ativo?: boolean;
  envioEmAndamento?: {
    agendamentoId: number;
    canal: "WHATSAPP" | "EMAIL";
    etapa: number;
  } | null;
  onAlternarConfirmacao: (index: number) => void;
  onMoverParticipante: (index: number) => void;
  onExcluirParticipante: (index: number) => void;
  onCopiar: () => void;
  onExcluir: () => void;
  onMover: () => void;
  onWhatsApp: () => void;
  onEmail: () => void;
  onImprimir: () => void;
  onEditar: () => void;
  onCancelar: () => void;
}) {
  const participantes = props.item.participantes ?? [];
  const canalEmEnvio = props.envioEmAndamento?.canal;
  const progressoEnvio = props.envioEmAndamento ? ((props.envioEmAndamento.etapa + 1) / 3) * 100 : 0;
  const textoEnvio =
    canalEmEnvio === "WHATSAPP"
      ? [
          "Preparando links e validando contatos do WhatsApp...",
          "Montando a fila de mensagens da agenda operacional...",
          "Finalizando os links para abertura do WhatsApp..."
        ][props.envioEmAndamento?.etapa ?? 0]
      : canalEmEnvio === "EMAIL"
        ? [
            "Preparando envio e validando e-mails dos participantes...",
            "Processando os destinatários da agenda operacional...",
            "Finalizando o disparo dos e-mails da agenda..."
          ][props.envioEmAndamento?.etapa ?? 0]
        : "";

  return (
    <Card
      className={`overflow-hidden border-[var(--g3-border)] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.10)] transition-all ${
        props.ativo
          ? "border-emerald-300 bg-[linear-gradient(180deg,#ffffff_0%,#f4fbf6_100%)] ring-2 ring-emerald-500 ring-offset-2 shadow-[0_18px_40px_rgba(5,150,105,0.18)]"
          : "hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.16)]"
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

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 shadow-sm">
          <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
            <div className="text-[var(--g3-foreground)]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Profissional</p>
              <p className="mt-1 flex items-center gap-2 font-medium">
                <Users className="h-4 w-4 text-emerald-700" /> {props.item.profissionalNome || "Sem profissional definido"}
              </p>
            </div>
            <div className="text-[var(--g3-foreground)]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Data</p>
              <p className="mt-1 flex items-center gap-2 font-medium">
                <CalendarDays className="h-4 w-4 text-emerald-700" /> {formatarData(props.item.data)} {props.item.diaSemana ? `- ${props.item.diaSemana}` : ""}
              </p>
            </div>
            <div className="text-[var(--g3-foreground)]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Horário</p>
              <p className="mt-1 flex items-center gap-2 font-medium">
                <Clock3 className="h-4 w-4 text-emerald-700" /> {props.item.horaInicial || "---"}
              </p>
            </div>
            <div className="text-[var(--g3-foreground)]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Local</p>
              <p className="mt-1 flex items-center gap-2 font-medium">
                <MapPin className="h-4 w-4 text-emerald-700" /> {props.item.itemLocal || props.item.sala || props.item.unidade || "---"}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--g3-border)]">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-emerald-50 text-left">
              <tr>
                <th className="border-b border-[var(--g3-border)] px-3 py-2 font-semibold text-emerald-900">Beneficiário</th>
                <th className="border-b border-[var(--g3-border)] px-3 py-2 font-semibold text-emerald-900">Telefone</th>
                <th className="border-b border-[var(--g3-border)] px-3 py-2 text-center font-semibold text-emerald-900">Ações</th>
              </tr>
            </thead>
            <tbody>
              {participantes.length ? (
                participantes.map((participante, index) => {
                  const confirmado = props.item.status === "Confirmado" || participante.comparecimento === "Presente";
                  const idade = formatarIdade(participante.dataNascimento);
                  return (
                  <tr
                    key={`${participante.matriculaId ?? participante.beneficiarioId ?? participante.beneficiarioNome}-${index}`}
                    className="bg-white"
                  >
                    <td className="border-b border-[var(--g3-border)] px-3 py-2 text-[var(--g3-foreground)]">
                      <div className="space-y-0.5">
                        <p className="font-medium">{participante.beneficiarioNome}</p>
                        {idade ? <p className="text-xs text-[var(--g3-muted)]">{idade}</p> : null}
                      </div>
                    </td>
                    <td className="border-b border-[var(--g3-border)] px-3 py-2 text-[var(--g3-muted)] whitespace-nowrap">
                      {formatarTelefone(participante.telefone) || participante.telefone || "Sem telefone cadastrado"}
                    </td>
                    <td className="border-b border-[var(--g3-border)] px-3 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          disabled={confirmado}
                          onClick={() => props.onAlternarConfirmacao(index)}
                          className={`inline-flex h-9 min-w-28 items-center justify-center gap-1.5 rounded-full border px-3 transition-colors ${
                            confirmado
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                          }`}
                          title={confirmado ? "Confirmado" : "A confirmar"}
                          aria-label={confirmado ? "Confirmado" : "A confirmar"}
                        >
                          {confirmado ? <BadgeCheck className="h-4 w-4" /> : <CircleHelp className="h-4 w-4" />}
                          <span className="text-xs font-semibold">{confirmado ? "Confirmado" : "A confirmar"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => props.onMoverParticipante(index)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-700 transition-colors hover:bg-sky-100"
                          title="Mover beneficiário"
                          aria-label="Mover beneficiário"
                        >
                          <CalendarDays className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => props.onExcluirParticipante(index)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700 transition-colors hover:bg-rose-100"
                          title="Excluir beneficiário"
                          aria-label="Excluir beneficiário"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr className="bg-white">
                  <td colSpan={3} className="px-3 py-4 text-center text-[var(--g3-muted)]">
                    Nenhum beneficiário vinculado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto border-t border-[var(--g3-border)] pt-4">
          <Button type="button" variant="outline" className="h-8 min-w-8 px-2 shadow-sm" onClick={props.onCopiar} title="Copiar agenda" aria-label="Copiar agenda">
            <Copy className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" className="h-8 min-w-8 px-2 shadow-sm" onClick={props.onMover} title="Mover agenda" aria-label="Mover agenda">
            <CalendarDays className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 min-w-8 px-2 shadow-sm"
            onClick={props.onImprimir}
            title="Imprimir agendamento"
            aria-label="Imprimir agendamento"
          >
            <Printer className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 min-w-8 px-2"
            onClick={props.onWhatsApp}
            title="WhatsApp"
            aria-label="WhatsApp"
            disabled={Boolean(props.envioEmAndamento)}
          >
            {canalEmEnvio === "WHATSAPP" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 min-w-8 px-2"
            onClick={props.onEmail}
            title="E-mail"
            aria-label="E-mail"
            disabled={Boolean(props.envioEmAndamento)}
          >
            {canalEmEnvio === "EMAIL" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          </Button>
          <Button type="button" variant="outline" className="h-8 min-w-8 px-2" onClick={props.onExcluir} title="Excluir agenda" aria-label="Excluir agenda">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="default" className="h-8 gap-1.5 px-2.5 text-xs whitespace-nowrap" onClick={props.onEditar}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
          <Button type="button" variant="danger" className="h-8 gap-1.5 px-2.5 text-xs whitespace-nowrap" onClick={props.onCancelar}>
            <XCircle className="h-4 w-4" /> Cancelar
          </Button>
        </div>

        {props.envioEmAndamento ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-900">
            <div className="flex items-center gap-2">
              <LoaderCircle className="h-4 w-4 animate-spin text-sky-700" />
              <p className="font-medium">
                {canalEmEnvio === "WHATSAPP" ? "Enviando via WhatsApp" : "Enviando via e-mail"}
              </p>
            </div>
            <p className="mt-1 text-xs text-sky-800">{textoEnvio}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-sky-100">
              <div
                className="h-full rounded-full bg-sky-600 transition-[width] duration-500"
                style={{ width: `${progressoEnvio}%` }}
              />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
