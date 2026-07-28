import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Edit3, Save, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { matriculasService } from "@/services/matriculas.service";
import {
  useRemoverVoluntarioEscala,
  useSalvarVoluntarioEscala,
  useVoluntarioEscalas,
  useVoluntarioEscalasGeral
} from "@/features/voluntarios/use-voluntarios";
import type {
  VoluntarioEscala,
  VoluntarioEscalaDia,
  VoluntarioEscalaPayload,
  VoluntarioEscalaStatus,
  Voluntario
} from "@/types/voluntario";
import { useAuth } from "@/hooks/use-auth";

type FormState = {
  id_escala?: string;
  sala_id: string;
  atividade_tipo: string;
  titulo: string;
  dias_semana: VoluntarioEscalaDia[];
  hora_inicio: string;
  hora_fim: string;
  status: VoluntarioEscalaStatus;
  observacoes: string;
};

const diasSemanaOptions: Array<{ value: VoluntarioEscalaDia; label: string }> = [
  { value: "SEGUNDA", label: "Segunda" },
  { value: "TERCA", label: "Terça" },
  { value: "QUARTA", label: "Quarta" },
  { value: "QUINTA", label: "Quinta" },
  { value: "SEXTA", label: "Sexta" },
  { value: "SABADO", label: "Sábado" },
  { value: "DOMINGO", label: "Domingo" }
];

const statusOptions: Array<{ value: VoluntarioEscalaStatus; label: string }> = [
  { value: "ATIVA", label: "Ativa" },
  { value: "PAUSADA", label: "Pausada" },
  { value: "INATIVA", label: "Inativa" }
];

const diasOrdenados: VoluntarioEscalaDia[] = [
  "SEGUNDA",
  "TERCA",
  "QUARTA",
  "QUINTA",
  "SEXTA",
  "SABADO",
  "DOMINGO"
];

const diasMapeados: Record<VoluntarioEscalaDia, string> = {
  SEGUNDA: "Segunda",
  TERCA: "Terça",
  QUARTA: "Quarta",
  QUINTA: "Quinta",
  SEXTA: "Sexta",
  SABADO: "Sábado",
  DOMINGO: "Domingo"
};

const formInicial: FormState = {
  sala_id: "",
  atividade_tipo: "",
  titulo: "",
  dias_semana: [],
  hora_inicio: "08:00",
  hora_fim: "12:00",
  status: "ATIVA",
  observacoes: ""
};

type VoluntarioResumo = Pick<Voluntario, "id_voluntario" | "nome_completo" | "cpf" | "status">;

function horaParaMinutos(valor: string) {
  const [hora, minuto] = valor.split(":").map(Number);
  if (Number.isNaN(hora) || Number.isNaN(minuto)) return 0;
  return hora * 60 + minuto;
}

function formatarHorasSemana(form: FormState) {
  const duracaoMinutos = horaParaMinutos(form.hora_fim) - horaParaMinutos(form.hora_inicio);
  if (duracaoMinutos <= 0 || !form.dias_semana.length) return "0,00";
  return ((duracaoMinutos / 60) * form.dias_semana.length).toFixed(2).replace(".", ",");
}

function formatarDias(dias: VoluntarioEscalaDia[]) {
  const ordem: VoluntarioEscalaDia[] = [
    "SEGUNDA",
    "TERCA",
    "QUARTA",
    "QUINTA",
    "SEXTA",
    "SABADO",
    "DOMINGO"
  ];
  return ordem.filter((dia) => dias.includes(dia)).join(", ");
}

function gerarTituloAutomatico(atividade: string, sala: string) {
  const partes = [atividade.trim(), sala.trim()].filter(Boolean);
  return partes.join(" - ");
}

function validarHorarioEscala(horaInicio: string, horaFim: string) {
  const inicio = horaParaMinutos(horaInicio);
  const fim = horaParaMinutos(horaFim);
  if (inicio <= 0 || fim <= 0) return "Informe o horário inicial e final.";
  if (fim <= inicio) return "O horário final deve ser maior que o horário inicial.";
  return "";
}

function varianteBadgeStatusEscala(status: VoluntarioEscalaStatus) {
  switch (status) {
    case "ATIVA":
      return "success";
    case "PAUSADA":
      return "warning";
    case "INATIVA":
      return "default";
    default:
      return "default";
  }
}

function agruparEscalasPorDia(escalas: VoluntarioEscala[]) {
  return diasOrdenados.reduce<Record<VoluntarioEscalaDia, VoluntarioEscala[]>>((acc, dia) => {
    acc[dia] = escalas.filter((escala) => escala.dias_semana.includes(dia));
    return acc;
  }, {} as Record<VoluntarioEscalaDia, VoluntarioEscala[]>);
}

function distribuirEmFaixas(escalas: VoluntarioEscala[]) {
  const ordenadas = [...escalas].sort((a, b) => horaParaMinutos(a.hora_inicio) - horaParaMinutos(b.hora_inicio));
  const faixasFim: number[] = [];

  const itens = ordenadas.map((escala) => {
    const inicio = horaParaMinutos(escala.hora_inicio);
    const fim = horaParaMinutos(escala.hora_fim);
    let indice = faixasFim.findIndex((faixaFim) => inicio >= faixaFim);
    if (indice === -1) {
      indice = faixasFim.length;
      faixasFim.push(fim);
    } else {
      faixasFim[indice] = fim;
    }

    return { escala, indice, inicio, fim };
  });

  const totalFaixas = Math.max(faixasFim.length, 1);
  return itens.map((item) => ({ ...item, totalFaixas }));
}

function resumirSala(escala: VoluntarioEscala) {
  return `${escala.sala_nome}${escala.unidade_nome ? ` • ${escala.unidade_nome}` : ""}`;
}

export function VoluntarioEscalasPanel({
  voluntarioId,
  voluntarios
}: {
  voluntarioId?: string;
  voluntarios: VoluntarioResumo[];
}) {
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  const [form, setForm] = useState<FormState>(formInicial);
  const [tituloManual, setTituloManual] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [cadastroConcluido, setCadastroConcluido] = useState<{ id: string; atualizacao: boolean } | null>(null);

  const { data: escalasData, isLoading: carregandoEscalas } = useVoluntarioEscalas(voluntarioId);
  const { data: escalasSistemaData, isLoading: carregandoEscalasSistema } = useVoluntarioEscalasGeral();
  const { data: salasData } = useQuery({
    queryKey: ["voluntario-escalas", tenantKey, "salas-catalogo"],
    queryFn: () => matriculasService.listarSalas(),
    enabled: !!usuario
  });

  const salvarMutation = useSalvarVoluntarioEscala(voluntarioId);
  const removerMutation = useRemoverVoluntarioEscala(voluntarioId);

  const salas = salasData?.salas ?? [];
  const escalas = escalasData?.escalas ?? [];
  const escalasSistema = escalasSistemaData?.escalas ?? [];
  const salaSelecionada = salas.find((item) => item.id_sala === form.sala_id);
  const cargaSemanal = useMemo(() => formatarHorasSemana(form), [form]);
  const erroHorario = validarHorarioEscala(form.hora_inicio, form.hora_fim);
  const erroDias = form.dias_semana.length ? "" : "Selecione ao menos um dia da semana.";
  const formularioValido =
    !!voluntarioId &&
    !!form.sala_id &&
    !!form.atividade_tipo.trim() &&
    !erroHorario &&
    !erroDias;
  const voluntarioSelecionado = useMemo(
    () => voluntarios.find((item) => item.id_voluntario === voluntarioId),
    [voluntarioId, voluntarios]
  );
  const escalasDoVoluntarioOrdenadas = useMemo(
    () => [...escalas].sort((a, b) => horaParaMinutos(a.hora_inicio) - horaParaMinutos(b.hora_inicio)),
    [escalas]
  );
  const mapaEscalas = voluntarioId ? escalasDoVoluntarioOrdenadas : escalasSistema;
  const carregandoMapa = voluntarioId ? carregandoEscalas : carregandoEscalasSistema;
  const tituloMapa = voluntarioId
    ? `Mapa do voluntário${voluntarioSelecionado?.nome_completo ? `: ${voluntarioSelecionado.nome_completo}` : ""}`
    : "Mapa geral das escalas";
  const subtituloMapa = voluntarioId
    ? "Visualização focada no voluntário selecionado para leitura e edição."
    : "Visualização geral com todas as escalas cadastradas no sistema.";
  const escalasPorDiaMapa = useMemo(() => agruparEscalasPorDia(mapaEscalas), [mapaEscalas]);

  useEffect(() => {
    setForm(formInicial);
    setTituloManual(false);
    setMensagem(null);
    setCadastroConcluido(null);
  }, [voluntarioId]);

  useEffect(() => {
    if (tituloManual) return;
    const titulo = gerarTituloAutomatico(form.atividade_tipo, salaSelecionada?.nome ?? "");
    setForm((current) => ({ ...current, titulo }));
  }, [form.atividade_tipo, salaSelecionada?.nome, tituloManual]);

  function alternarDia(dia: VoluntarioEscalaDia) {
    setForm((current) => ({
      ...current,
      dias_semana: current.dias_semana.includes(dia)
        ? current.dias_semana.filter((item) => item !== dia)
        : [...current.dias_semana, dia]
    }));
  }

  function editarEscala(escala: VoluntarioEscala) {
    setForm({
      id_escala: escala.id_escala,
      sala_id: escala.sala_id,
      atividade_tipo: escala.atividade_tipo,
      titulo: escala.titulo ?? "",
      dias_semana: escala.dias_semana,
      hora_inicio: escala.hora_inicio,
      hora_fim: escala.hora_fim,
      status: escala.status,
      observacoes: escala.observacoes ?? ""
    });
    setTituloManual(true);
    setMensagem(null);
  }

  async function salvarEscala() {
    if (!voluntarioId) {
      setMensagem({ tipo: "erro", texto: "Selecione um voluntário para cadastrar a escala." });
      return;
    }
    if (!form.sala_id || !form.atividade_tipo.trim() || !form.dias_semana.length) {
      setMensagem({
        tipo: "erro",
        texto: "Preencha sala, atividade e ao menos um dia da semana."
      });
      return;
    }
    if (erroHorario) {
      setMensagem({ tipo: "erro", texto: erroHorario });
      return;
    }

    const payload: VoluntarioEscalaPayload = {
      id_escala: form.id_escala,
      voluntario_id: voluntarioId,
      sala_id: form.sala_id,
      atividade_tipo: form.atividade_tipo.trim(),
      titulo: form.titulo.trim() || undefined,
      dias_semana: form.dias_semana,
      hora_inicio: form.hora_inicio,
      hora_fim: form.hora_fim,
      carga_horaria_semanal: Number(cargaSemanal.replace(",", ".")),
      status: form.status,
      observacoes: form.observacoes.trim() || undefined
    };

    try {
      const resposta = await salvarMutation.mutateAsync(payload);
      setForm(formInicial);
      setTituloManual(false);
      setMensagem(null);
      setCadastroConcluido({
        id: resposta.escala?.id_escala ?? payload.id_escala ?? "—",
        atualizacao: Boolean(payload.id_escala)
      });
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar a escala."
      });
    }
  }

  async function removerEscala(escalaId?: string) {
    if (!escalaId) return;
    try {
      await removerMutation.mutateAsync(escalaId);
      setMensagem({ tipo: "sucesso", texto: "Escala removida com sucesso." });
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.response?.data?.message ?? "Não foi possível remover a escala."
      });
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{tituloMapa}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--g3-muted)]">{subtituloMapa}</p>
              <p className="text-xs text-[var(--g3-muted)]">
                Quando nenhuma pessoa estiver selecionada, a tela mostra a ocupação total por dia, sala e horário.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">{mapaEscalas.length} escalas</Badge>
              <Badge variant={voluntarioId ? "success" : "default"}>{voluntarioId ? "Filtro ativo" : "Visão geral"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Nova escala de voluntariado</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
            <div className="xl:col-span-5">
              <Label>Sala de atuação</Label>
              <Select
                value={form.sala_id}
                onChange={(event) =>
                  setForm((current) => ({ ...current, sala_id: event.target.value }))
                }
              >
                <option value="">Selecione</option>
                {salas.map((sala) => (
                  <option key={sala.id_sala} value={sala.id_sala}>
                    {sala.nome} {sala.unidade_nome ? `- ${sala.unidade_nome}` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div className="xl:col-span-4">
              <Label>Tipo de atividade</Label>
              <Input
                value={form.atividade_tipo}
                onChange={(event) => setForm((current) => ({ ...current, atividade_tipo: event.target.value }))}
                onBlur={() => {
                  if (!tituloManual) {
                    setForm((current) => ({
                      ...current,
                      titulo: gerarTituloAutomatico(current.atividade_tipo, salaSelecionada?.nome ?? "")
                    }));
                  }
                }}
                placeholder="Apoio, oficina, recepção, triagem..."
              />
            </div>
            <div className="xl:col-span-3">
              <Label>Status</Label>
              <Select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value as VoluntarioEscalaStatus }))
                }
              >
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="xl:col-span-6">
              <Label>Título da escala</Label>
              <Input
                value={form.titulo}
                onChange={(event) => {
                  setTituloManual(true);
                  setForm((current) => ({ ...current, titulo: event.target.value }));
                }}
                placeholder="Ex.: Apoio da manhã - Sala 3"
              />
            </div>
            <div className="xl:col-span-3">
              <Label>Hora inicial</Label>
              <Input
                type="time"
                value={form.hora_inicio}
                onChange={(event) => setForm((current) => ({ ...current, hora_inicio: event.target.value }))}
              />
            </div>
            <div className="xl:col-span-3">
              <Label>Hora final</Label>
              <Input
                type="time"
                value={form.hora_fim}
                onChange={(event) => setForm((current) => ({ ...current, hora_fim: event.target.value }))}
                className={erroHorario ? "border-red-500 focus-visible:ring-red-500" : undefined}
              />
              {erroHorario && <p className="mt-1 text-xs text-red-600">{erroHorario}</p>}
            </div>
            <div className="xl:col-span-3">
              <Label>Carga semanal estimada</Label>
              <Input value={`${cargaSemanal} h`} readOnly />
            </div>
            <div className="xl:col-span-12">
              <Label>Dias da semana</Label>
              <div className="mt-2 flex flex-wrap gap-3">
                {diasSemanaOptions.map((dia) => (
                  <label key={dia.value} className="inline-flex items-center gap-2 text-sm">
                    <Checkbox checked={form.dias_semana.includes(dia.value)} onChange={() => alternarDia(dia.value)} />
                    {dia.label}
                  </label>
                ))}
              </div>
              {erroDias && <p className="mt-1 text-xs text-red-600">{erroDias}</p>}
            </div>
            <div className="xl:col-span-12">
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(event) => setForm((current) => ({ ...current, observacoes: event.target.value }))}
                placeholder="Observações operacionais, restrições ou orientações"
                rows={3}
              />
            </div>
            <div className="xl:col-span-12 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setForm(formInicial);
                  setTituloManual(false);
                }}
                disabled={salvarMutation.isPending}
              >
                Limpar
              </Button>
              <Button
                type="button"
                onClick={() => void salvarEscala()}
                disabled={salvarMutation.isPending || !formularioValido}
              >
                {salvarMutation.isPending ? (
                  "Salvando..."
                ) : (
                  <>
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                    Salvar escala
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Critérios da escala</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[var(--g3-muted)]">
            <p>O sistema mantém a escala vinculada ao tenant, ao voluntário e à sala escolhida.</p>
            <p>A carga horária semanal é calculada a partir dos dias selecionados e do intervalo de horário.</p>
            <p>O título pode ser automático ou personalizado, para dar leitura operacional mais clara.</p>
            <p>O cadastro não apaga o histórico: editar gera atualização e remover exige ação explícita.</p>
          </CardContent>
        </Card>
      </div>

      {mensagem && (
        <Card>
          <CardContent className={`p-3 text-sm ${mensagem.tipo === "sucesso" ? "text-emerald-800" : "text-red-700"}`}>
            {mensagem.texto}
          </CardContent>
        </Card>
      )}

      {cadastroConcluido && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4 py-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setCadastroConcluido(null)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white px-6 pb-6 pt-8 shadow-2xl sm:px-8"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Fechar confirmação da escala"
              className="absolute right-4 top-4 rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              onClick={() => setCadastroConcluido(null)}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="h-20 w-20 stroke-[1.8] text-[var(--g3-primary)]" aria-hidden="true" />
              <h3 className="mt-5 text-xl font-semibold text-slate-800">
                {cadastroConcluido.atualizacao ? "Cadastro atualizado com sucesso" : "Cadastro realizado com sucesso"}
              </h3>
              <p className="mt-3 text-sm text-slate-500">
                Número do cadastro: <span className="font-semibold text-slate-700">{cadastroConcluido.id}</span>
              </p>
            </div>
            <div className="mt-7">
              <Button
                type="button"
                className="h-12 w-full rounded-lg bg-[var(--g3-primary-button)] text-base font-semibold text-white shadow-sm hover:bg-[var(--g3-primary-button-hover)]"
                onClick={() => setCadastroConcluido(null)}
              >
                Finalizar cadastro
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Mapa de usabilidade das escalas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {carregandoMapa ? (
            <p className="text-sm text-[var(--g3-muted)]">Carregando escalas...</p>
          ) : mapaEscalas.length ? (
            <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
              {diasOrdenados.map((dia) => {
                const escalasDia = escalasPorDiaMapa[dia];
                const escalasDiaFaixas = distribuirEmFaixas(escalasDia);
                const ocupacaoTotal = escalasDia.length;

                return (
                  <div key={dia} className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--g3-foreground)]">{diasMapeados[dia]}</h3>
                        <p className="text-xs text-[var(--g3-muted)]">
                          {ocupacaoTotal} escala{ocupacaoTotal === 1 ? "" : "s"} neste dia
                        </p>
                      </div>
                      <Badge variant={ocupacaoTotal ? "info" : "default"}>{ocupacaoTotal}</Badge>
                    </div>

                    <div className="relative mt-3 h-[20rem] overflow-hidden rounded-lg border border-[var(--g3-border)] bg-[linear-gradient(to_bottom,rgba(15,118,110,0.04)_1px,transparent_1px)] bg-[length:100%_10%]">
                      <div className="absolute inset-0">
                        {[0, 6, 12, 18, 24].map((hora) => (
                          <div
                            key={hora}
                            className="absolute left-0 right-0 border-t border-dashed border-[var(--g3-border)]/70 text-[10px] text-[var(--g3-muted)]"
                            style={{ top: `${(hora / 24) * 100}%` }}
                          >
                            <span className="absolute left-1 -top-2 bg-[var(--g3-card)] px-1">
                              {hora.toString().padStart(2, "0")}:00
                            </span>
                          </div>
                        ))}
                      </div>

                      {escalasDiaFaixas.length ? (
                        escalasDiaFaixas.map(({ escala, indice, totalFaixas, inicio, fim }) => {
                          const duracao = Math.max(fim - inicio, 20);
                          const top = (inicio / 1440) * 100;
                          const height = Math.max((duracao / 1440) * 100, 4);
                          const largura = Math.max(100 / totalFaixas - 1.5, 20);
                          const deslocamento = indice * (100 / totalFaixas);

                          return (
                            <div
                              key={escala.id_escala}
                              className={`absolute rounded-lg border px-2 py-1 text-[11px] shadow-sm ${
                                escala.status === "ATIVA"
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                                  : escala.status === "PAUSADA"
                                    ? "border-amber-300 bg-amber-50 text-amber-900"
                                    : "border-slate-300 bg-slate-50 text-slate-700"
                              }`}
                              style={{
                                top: `${top}%`,
                                height: `${height}%`,
                                left: `calc(${deslocamento}% + 0.25rem)`,
                                width: `calc(${largura}% - 0.25rem)`
                              }}
                            >
                              <div className="flex h-full flex-col justify-between gap-1 overflow-hidden">
                                <div className="space-y-0.5">
                                  <p className="truncate font-semibold">{escala.titulo || escala.atividade_tipo}</p>
                                  <p className="truncate text-[10px] opacity-80">{resumirSala(escala)}</p>
                                </div>
                                <div className="space-y-0.5">
                                  <p className="truncate text-[10px]">
                                    {escala.voluntario_nome || "Voluntário não informado"}
                                  </p>
                                  <p className="text-[10px] font-medium">
                                    {escala.hora_inicio} - {escala.hora_fim}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[var(--g3-muted)]">
                          Nenhuma escala cadastrada neste dia.
                        </div>
                      )}
                    </div>

                    <div className="mt-3 space-y-2">
                      {escalasDia.length ? (
                        escalasDiaFaixas.map(({ escala }) => (
                          <div
                            key={`${dia}-${escala.id_escala}-resumo`}
                            className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-2 text-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-[var(--g3-foreground)]">
                                  {escala.titulo || escala.atividade_tipo}
                                </p>
                                <p className="truncate text-[var(--g3-muted)]">{resumirSala(escala)}</p>
                              </div>
                              <Badge variant={varianteBadgeStatusEscala(escala.status)}>{escala.status}</Badge>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[var(--g3-muted)]">
                              <span>{escala.voluntario_nome || "Voluntário não informado"}</span>
                              <span>•</span>
                              <span>
                                {escala.hora_inicio} - {escala.hora_fim}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-[var(--g3-muted)]">Sem ocupação neste dia.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--g3-muted)]">Nenhuma escala cadastrada no sistema.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Escalas deste voluntário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {voluntarioId ? (
            escalasDoVoluntarioOrdenadas.length ? (
              <div className="overflow-hidden rounded-lg border border-[var(--g3-border)]">
                <div className="max-h-[380px] overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-[var(--g3-card-soft)] text-left text-xs uppercase tracking-wide text-[var(--g3-muted)]">
                      <tr>
                        <th className="px-3 py-2">Título</th>
                        <th className="px-3 py-2">Sala</th>
                        <th className="px-3 py-2">Dias</th>
                        <th className="px-3 py-2">Horário</th>
                        <th className="px-3 py-2">Horas</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {escalasDoVoluntarioOrdenadas.map((escala) => (
                        <tr key={escala.id_escala} className="border-t border-[var(--g3-border)]">
                          <td className="px-3 py-2">
                            <div className="font-medium text-[var(--g3-foreground)]">
                              {escala.titulo || escala.atividade_tipo}
                            </div>
                            <div className="text-xs text-[var(--g3-muted)]">{escala.atividade_tipo}</div>
                          </td>
                          <td className="px-3 py-2">
                            <div>{escala.sala_nome}</div>
                            <div className="text-xs text-[var(--g3-muted)]">
                              {escala.unidade_nome || "Unidade não informada"}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs text-[var(--g3-muted)]">{formatarDias(escala.dias_semana)}</td>
                          <td className="px-3 py-2">
                            {escala.hora_inicio} às {escala.hora_fim}
                          </td>
                          <td className="px-3 py-2">
                            {escala.carga_horaria_semanal.toFixed(2).replace(".", ",")} h
                          </td>
                          <td className="px-3 py-2">{escala.status}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => editarEscala(escala)}>
                                <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                                Editar
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void removerEscala(escala.id_escala)}
                                disabled={removerMutation.isPending}
                              >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                Excluir
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--g3-muted)]">Nenhuma escala cadastrada para este voluntário.</p>
            )
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-4 text-sm text-[var(--g3-muted)]">
                Nenhum voluntário foi selecionado. A visualização acima está mostrando todas as escalas do sistema.
                Clique em um voluntário na listagem para focar o mapa nesse cadastro específico.
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
