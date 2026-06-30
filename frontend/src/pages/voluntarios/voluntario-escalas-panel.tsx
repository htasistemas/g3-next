import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Edit3, Save, Trash2 } from "lucide-react";
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
  useVoluntarioEscalas
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

export function VoluntarioEscalasPanel({
  voluntarioId,
  voluntarios,
  onSelecionarVoluntario
}: {
  voluntarioId?: string;
  voluntarios: VoluntarioResumo[];
  onSelecionarVoluntario: (voluntarioId: string) => void;
}) {
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  const [form, setForm] = useState<FormState>(formInicial);
  const [tituloManual, setTituloManual] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [voluntarioEscolhidoId, setVoluntarioEscolhidoId] = useState("");

  const { data: escalasData, isLoading: carregandoEscalas } = useVoluntarioEscalas(voluntarioId);
  const { data: salasData } = useQuery({
    queryKey: ["voluntario-escalas", tenantKey, "salas-catalogo"],
    queryFn: () => matriculasService.listarSalas(),
    enabled: !!usuario
  });

  const salvarMutation = useSalvarVoluntarioEscala(voluntarioId);
  const removerMutation = useRemoverVoluntarioEscala(voluntarioId);

  const salas = salasData?.salas ?? [];
  const escalas = escalasData?.escalas ?? [];
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

  useEffect(() => {
    setForm(formInicial);
    setTituloManual(false);
    setMensagem(null);
    setVoluntarioEscolhidoId(voluntarioId ?? "");
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
      await salvarMutation.mutateAsync(payload);
      setForm(formInicial);
      setTituloManual(false);
      setMensagem({
        tipo: "sucesso",
        texto: "Escala de voluntariado salva com sucesso."
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

  if (!voluntarioId) {
    return (
      <div className="space-y-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Selecionar voluntário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[var(--g3-muted)]">
              Para montar a escala, escolha um voluntário já cadastrado. Se preferir, volte para a aba Listagem
              e abra o registro desejado.
            </p>
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <Label>Voluntário</Label>
                <Select value={voluntarioEscolhidoId} onChange={(event) => setVoluntarioEscolhidoId(event.target.value)}>
                  <option value="">Selecione</option>
                  {voluntarios.map((voluntario) => (
                    <option key={voluntario.id_voluntario} value={voluntario.id_voluntario ?? ""}>
                      {voluntario.nome_completo} {voluntario.cpf ? `- ${voluntario.cpf}` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={() => voluntarioEscolhidoId && onSelecionarVoluntario(voluntarioEscolhidoId)}
                  disabled={!voluntarioEscolhidoId}
                >
                  Abrir voluntário
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Como a escala funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[var(--g3-muted)]">
            <p>A escala fica vinculada ao voluntário, à sala e ao tenant da instituição.</p>
            <p>Você pode definir dias da semana, horário, atividade, título e observações operacionais.</p>
            <p>Depois de selecionar o voluntário, o formulário completo de escala é liberado nesta mesma aba.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Escalas cadastradas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {carregandoEscalas ? (
            <p className="text-sm text-[var(--g3-muted)]">Carregando escalas...</p>
          ) : escalas.length ? (
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
                    {escalas.map((escala) => (
                      <tr key={escala.id_escala} className="border-t border-[var(--g3-border)]">
                        <td className="px-3 py-2">
                          <div className="font-medium text-[var(--g3-foreground)]">{escala.titulo || escala.atividade_tipo}</div>
                          <div className="text-xs text-[var(--g3-muted)]">{escala.atividade_tipo}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div>{escala.sala_nome}</div>
                          <div className="text-xs text-[var(--g3-muted)]">{escala.unidade_nome || "Unidade não informada"}</div>
                        </td>
                        <td className="px-3 py-2 text-xs text-[var(--g3-muted)]">{formatarDias(escala.dias_semana)}</td>
                        <td className="px-3 py-2">{escala.hora_inicio} às {escala.hora_fim}</td>
                        <td className="px-3 py-2">{escala.carga_horaria_semanal.toFixed(2).replace(".", ",")} h</td>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
