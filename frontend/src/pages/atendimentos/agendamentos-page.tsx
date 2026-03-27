import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  FileDown,
  PhoneCall,
  Plus,
  Printer,
  Save,
  Users,
  X
} from "lucide-react";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useAgendamentos,
  useCancelarAgendamento,
  useCatalogosAgendamentos,
  useConcluirAgendamento,
  useConfirmarAgendamento,
  useConverterListaEsperaAgendamento,
  useCriarListaEsperaAgendamento,
  useIndicadoresAgendamentos,
  useListaEsperaAgendamentos,
  useSalvarAgendamento
} from "@/features/agendamentos/use-agendamentos";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import { matriculasService } from "@/services/matriculas.service";
import type { Agendamento, AgendamentoFiltros, AgendamentoListaEspera } from "@/types/agendamento";

type AbaId = "agenda" | "espera" | "indicadores";

type AgendaCard = {
  chave: string;
  data: string;
  profissionalNome: string;
  tipoAtendimento: string;
  itens: Agendamento[];
};

const abas: AdminTab[] = [
  { id: "agenda", label: "Agenda operacional", icon: CalendarRange },
  { id: "espera", label: "Lista de espera", icon: Users },
  { id: "indicadores", label: "Painel inteligente", icon: ClipboardList }
];

const filtrosPadrao: AgendamentoFiltros = {
  busca: "",
  unidade: "",
  setor: "",
  status: "",
  periodoInicio: "",
  periodoFim: "",
  visualizacao: "dia"
};

const agendamentoPadrao: Agendamento = {
  beneficiarioNome: "",
  unidade: "",
  setor: "Agendamentos",
  tipoAtendimento: "",
  data: new Date().toISOString().slice(0, 10),
  horaInicial: "",
  horaFinal: "",
  modalidade: "Coletivo",
  prioridade: "Normal",
  status: "Agendado",
  coletivo: true
};

const esperaPadrao: AgendamentoListaEspera = {
  beneficiarioNome: "",
  tipoAtendimento: "",
  prioridade: "Normal",
  dataEntrada: new Date().toISOString().slice(0, 10)
};

const HORARIO_INICIAL_PADRAO_MINUTOS = 8 * 60;
const INTERVALO_PADRAO_MINUTOS = 30;

function formatarData(data?: string) {
  if (!data) return "---";
  const [ano, mes, dia] = data.slice(0, 10).split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : data;
}

function formatarDiaSemana(data?: string) {
  if (!data) return "";
  const valor = new Date(`${data.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(valor.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(valor);
}

function formatarHora(valor?: string) {
  if (!valor) return "--:--";
  return valor.slice(0, 5);
}

function corStatus(status?: string) {
  return status === "Confirmado"
    ? "bg-emerald-100 text-emerald-800"
    : status === "Em atendimento"
      ? "bg-sky-100 text-sky-800"
      : status === "Atendido"
        ? "bg-slate-200 text-slate-800"
        : status === "Cancelado"
          ? "bg-rose-100 text-rose-800"
          : "bg-[var(--g3-primary-soft)] text-[var(--g3-active)]";
}

function normalizarTexto(valor?: string | null) {
  return valor?.trim().toLocaleLowerCase("pt-BR") ?? "";
}

function listarValoresUnicos(valores: Array<string | null | undefined>) {
  return [...new Set(valores.map((item) => item?.trim()).filter(Boolean) as string[])].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
}

function converterHorarioEmMinutos(valor?: string | null) {
  if (!valor) return null;
  const [hora, minuto] = valor.slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(hora) || !Number.isFinite(minuto)) return null;
  return hora * 60 + minuto;
}

function converterMinutosEmHorario(totalMinutos: number) {
  const horas = Math.floor(totalMinutos / 60)
    .toString()
    .padStart(2, "0");
  const minutos = (totalMinutos % 60).toString().padStart(2, "0");
  return `${horas}:${minutos}`;
}

function obterProximoHorario(agendamentos: Agendamento[], data: string, profissionalNome?: string) {
  const horariosNoDia = agendamentos
    .filter(
      (item) =>
        item.data === data &&
        normalizarTexto(item.profissionalNome) === normalizarTexto(profissionalNome)
    )
    .map((item) => converterHorarioEmMinutos(item.horaInicial))
    .filter((item): item is number => item !== null);

  const ultimaFaixa = horariosNoDia.length
    ? Math.max(...horariosNoDia) + INTERVALO_PADRAO_MINUTOS
    : HORARIO_INICIAL_PADRAO_MINUTOS;

  return {
    horaInicial: converterMinutosEmHorario(ultimaFaixa),
    horaFinal: converterMinutosEmHorario(ultimaFaixa + INTERVALO_PADRAO_MINUTOS),
    duracaoMinutos: INTERVALO_PADRAO_MINUTOS
  };
}

export function AgendamentosPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("agenda");
  const [form, setForm] = useState<Agendamento>(agendamentoPadrao);
  const [esperaForm, setEsperaForm] = useState<AgendamentoListaEspera>(esperaPadrao);
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);

  const agendamentosQuery = useAgendamentos(filtrosPadrao);
  const listaEsperaQuery = useListaEsperaAgendamentos();
  const indicadoresQuery = useIndicadoresAgendamentos(filtrosPadrao);
  const catalogosQuery = useCatalogosAgendamentos();
  const salvarMutation = useSalvarAgendamento();
  const cancelarMutation = useCancelarAgendamento();
  const concluirMutation = useConcluirAgendamento();
  const confirmarMutation = useConfirmarAgendamento();
  const criarEsperaMutation = useCriarListaEsperaAgendamento();
  const converterMutation = useConverterListaEsperaAgendamento();
  const cursosOrigemQuery = useQuery({
    queryKey: ["agendamentos", "origens-inscricoes"],
    queryFn: () => matriculasService.listar({})
  });

  const agendamentos = agendamentosQuery.data ?? [];
  const listaEspera = listaEsperaQuery.data ?? [];
  const indicadores = indicadoresQuery.data ?? {};
  const catalogos = catalogosQuery.data;
  const cursosOrigem = cursosOrigemQuery.data?.matriculas ?? [];
  const selecionado = agendamentos.find((item) => item.id === selecionadoId) ?? null;
  const cursoSelecionado = useMemo(() => {
    if (form.inscricaoOrigemId) {
      const porId = cursosOrigem.find((item) => item.id_matricula === form.inscricaoOrigemId);
      if (porId) return porId;
    }

    const nomeCurso = normalizarTexto(form.tipoAtendimento);
    if (!nomeCurso) return null;
    return cursosOrigem.find((item) => normalizarTexto(item.nome) === nomeCurso) ?? null;
  }, [cursosOrigem, form.inscricaoOrigemId, form.tipoAtendimento]);
  const cursosDisponiveis = useMemo(
    () => [...cursosOrigem].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [cursosOrigem]
  );
  const cursoDetalhesQuery = useQuery({
    queryKey: ["agendamentos", "origem-inscricao", cursoSelecionado?.id_matricula],
    queryFn: () => matriculasService.buscarPorId(cursoSelecionado?.id_matricula as string),
    enabled: !!cursoSelecionado?.id_matricula
  });
  const datasCursoQuery = useQuery({
    queryKey: ["agendamentos", "origem-inscricao", cursoSelecionado?.id_matricula, "datas"],
    queryFn: () => matriculasService.listarPresencaDatas(cursoSelecionado?.id_matricula as string, false),
    enabled: !!cursoSelecionado?.id_matricula
  });
  const datasCursoDisponiveis = useMemo(
    () =>
      [...new Set((datasCursoQuery.data?.datas ?? []).map((item) => item.data_aula).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [datasCursoQuery.data]
  );
  const profissionaisDosCursos = useMemo(
    () => listarValoresUnicos(cursosOrigem.map((item) => item.profissional)),
    [cursosOrigem]
  );
  const beneficiariosDoCursoSelecionado = useMemo(() => {
    const matricula = cursoDetalhesQuery.data?.matricula;
    return (matricula?.matriculas ?? [])
      .map((item) => ({
        id_beneficiario: undefined,
        nome_completo: item.beneficiario_nome,
        cpf: item.cpf,
        data_agendada: item.data_agendada
      }))
      .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, "pt-BR"));
  }, [cursoDetalhesQuery.data]);
  const beneficiariosSugeridos = useMemo(() => {
    const termo = normalizarTexto(form.beneficiarioNome);
    if (!termo) return beneficiariosDoCursoSelecionado.slice(0, 12);
    return beneficiariosDoCursoSelecionado
      .filter((item) => normalizarTexto(item.nome_completo).includes(termo))
      .slice(0, 12);
  }, [beneficiariosDoCursoSelecionado, form.beneficiarioNome]);
  const profissionaisDoCursoSelecionado = useMemo(() => {
    const matricula = cursoDetalhesQuery.data?.matricula;
    return listarValoresUnicos([
      cursoSelecionado?.profissional,
      matricula?.profissional,
      ...(matricula?.matriculas?.map((item) => item.profissional_nome) ?? [])
    ]);
  }, [cursoDetalhesQuery.data, cursoSelecionado]);
  const profissionaisDisponiveis = profissionaisDoCursoSelecionado.length
    ? profissionaisDoCursoSelecionado
    : profissionaisDosCursos;

  useEffect(() => {
    if (form.unidade || !catalogos?.unidades?.length) return;
    setForm((atual) => ({ ...atual, unidade: catalogos.unidades[0] ?? "" }));
  }, [catalogos?.unidades, form.unidade]);

  useEffect(() => {
    if (!cursoSelecionado?.id_matricula) return;

    setForm((atual) => {
      const proximaData =
        atual.data && datasCursoDisponiveis.includes(atual.data)
          ? atual.data
          : datasCursoDisponiveis[0] ?? atual.data;
      const proximoProfissional =
        atual.profissionalNome && profissionaisDisponiveis.includes(atual.profissionalNome)
          ? atual.profissionalNome
          : profissionaisDisponiveis[0] ?? atual.profissionalNome;

      if (
        atual.inscricaoOrigemId === cursoSelecionado.id_matricula &&
        atual.tipoAtendimento === cursoSelecionado.nome &&
        atual.data === proximaData &&
        atual.profissionalNome === proximoProfissional
      ) {
        return atual;
      }

      return {
        ...atual,
        inscricaoOrigemId: cursoSelecionado.id_matricula,
        tipoAtendimento: cursoSelecionado.nome,
        beneficiarioId: undefined,
        beneficiarioNome: "",
        data: proximaData,
        profissionalNome: proximoProfissional
      };
    });
  }, [cursoSelecionado, datasCursoDisponiveis, profissionaisDisponiveis]);

  const agendaPorProfissional = useMemo(
    () =>
      agendamentos.reduce<Record<string, number>>((acc, item) => {
        const chave = item.profissionalNome?.trim() || "Sem profissional";
        acc[chave] = (acc[chave] ?? 0) + 1;
        return acc;
      }, {}),
    [agendamentos]
  );

  const agendaAgrupadaEmCards = useMemo(() => {
    const grupos = agendamentos.reduce<Record<string, AgendaCard>>((acc, item) => {
      const data = item.data || "Sem data";
      const profissionalNome = item.profissionalNome?.trim() || "Sem profissional";
      const tipoAtendimento = item.tipoAtendimento?.trim() || "Sem tipo";
      const chave = `${data}::${profissionalNome}::${tipoAtendimento}`;

      if (!acc[chave]) {
        acc[chave] = {
          chave,
          data,
          profissionalNome,
          tipoAtendimento,
          itens: []
        };
      }

      acc[chave].itens.push(item);
      return acc;
    }, {});

    return Object.values(grupos)
      .map((grupo) => ({
        ...grupo,
        itens: [...grupo.itens].sort((a, b) => {
          const horaA = a.horaInicial || "";
          const horaB = b.horaInicial || "";
          if (horaA !== horaB) return horaA.localeCompare(horaB);
          return a.beneficiarioNome.localeCompare(b.beneficiarioNome, "pt-BR");
        })
      }))
      .sort((a, b) => {
        if (a.data !== b.data) return a.data.localeCompare(b.data);
        if (a.profissionalNome !== b.profissionalNome) {
          return a.profissionalNome.localeCompare(b.profissionalNome, "pt-BR");
        }
        return a.tipoAtendimento.localeCompare(b.tipoAtendimento, "pt-BR");
      });
  }, [agendamentos]);

  const exportar = () => {
    const linhas =
      abaAtiva === "espera"
        ? ["Data de entrada;Beneficiário;Tipo;Prioridade;Status"]
        : abaAtiva === "indicadores"
          ? ["Indicador;Valor"]
          : ["Data;Hora;Beneficiário;Tipo;Profissional;Unidade;Setor;Status"];

    if (abaAtiva === "espera") {
      listaEspera.forEach((item) =>
        linhas.push(
          [
            item.dataEntrada,
            item.beneficiarioNome,
            item.tipoAtendimento,
            item.prioridade,
            ""
          ].join(";")
        )
      );
    } else if (abaAtiva === "indicadores") {
      Object.entries(indicadores).forEach(([chave, valor]) => {
        linhas.push([chave, String(valor ?? "")].join(";"));
      });
    } else {
      agendamentos.forEach((item) =>
        linhas.push(
          [
            item.data,
            item.horaInicial,
            item.beneficiarioNome,
            item.tipoAtendimento,
            item.profissionalNome,
            item.unidade,
            item.setor,
            item.status
          ].join(";")
        )
      );
    }

    const blob = new Blob([linhas.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      abaAtiva === "espera"
        ? "lista-espera.csv"
        : abaAtiva === "indicadores"
          ? "painel-inteligente.csv"
          : "agendamentos.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const novo = () => {
    setSelecionadoId(null);
    setForm((atual) => ({
      ...agendamentoPadrao,
      unidade: atual.unidade || catalogos?.unidades?.[0] || "",
      setor: atual.setor || "Agendamentos",
      data: new Date().toISOString().slice(0, 10)
    }));
    setAbaAtiva("agenda");
  };

  const imprimirAtual = () =>
    imprimirConteudoAtual({
      titulo:
        abaAtiva === "espera"
          ? "Lista de espera"
          : abaAtiva === "indicadores"
            ? "Painel inteligente"
            : "Agenda operacional"
    });

  async function executarSalvar() {
    if (!form.beneficiarioNome.trim() || !form.tipoAtendimento.trim() || !form.data || !form.profissionalNome?.trim()) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe beneficiário, curso/atendimento/oficina, data e profissional."
      });
      return;
    }

    try {
      const horarios =
        form.id && form.horaInicial
          ? {
              horaInicial: form.horaInicial,
              horaFinal: form.horaFinal || "",
              duracaoMinutos: form.duracaoMinutos ?? INTERVALO_PADRAO_MINUTOS
            }
          : obterProximoHorario(agendamentos, form.data, form.profissionalNome);

      const payload: Agendamento = {
        ...form,
        inscricaoOrigemId: cursoSelecionado?.id_matricula ?? form.inscricaoOrigemId,
        beneficiarioNome: form.beneficiarioNome.trim(),
        unidade: form.unidade || catalogos?.unidades?.[0] || "Unidade principal",
        setor: form.setor || "Agendamentos",
        tipoAtendimento: form.tipoAtendimento.trim(),
        profissionalNome: form.profissionalNome.trim(),
        tituloColetivo: form.tipoAtendimento.trim(),
        modalidade: "Coletivo",
        coletivo: true,
        prioridade: form.prioridade ?? "Normal",
        status: form.status ?? "Agendado",
        ...horarios
      };

      const salvo = await salvarMutation.mutateAsync(payload);
      if (salvo?.id) setSelecionadoId(salvo.id);
      setForm({
        ...agendamentoPadrao,
        unidade: payload.unidade,
        setor: payload.setor,
        data: payload.data
      });
      setPopup({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: `Agendamento salvo com sucesso. Horário gerado: ${formatarHora(
          payload.horaInicial
        )}.`
      });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar o agendamento."
      });
    }
  }

  async function executarSalvarEspera() {
    try {
      await criarEsperaMutation.mutateAsync(esperaForm);
      setEsperaForm(esperaPadrao);
      setPopup({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Lista de espera registrada com sucesso."
      });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar a lista de espera."
      });
    }
  }

  async function executarConfirmacao() {
    if (!selecionado?.id) return;
    try {
      await confirmarMutation.mutateAsync({ id: selecionado.id, payload: { canal: "Manual" } });
      setPopup({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Agendamento confirmado com sucesso."
      });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível confirmar o agendamento."
      });
    }
  }

  async function executarConclusao() {
    if (!selecionado?.id) return;
    try {
      await concluirMutation.mutateAsync({
        id: selecionado.id,
        payload: {
          resumo: form.concluidoResumo || form.observacaoInterna || "Atendimento concluído.",
          comparecimento: "Presente"
        }
      });
      setPopup({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Atendimento concluído com sucesso."
      });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível concluir o atendimento."
      });
    }
  }

  const acoesPorAba: Record<AbaId, AdminAction[]> = {
    agenda: [
      { label: "Novo agendamento", icon: Plus, onClick: novo, variant: "default" },
      {
        label: "Salvar agendamento",
        icon: Save,
        onClick: () => void executarSalvar(),
        variant: "default",
        disabled: salvarMutation.isPending
      },
      {
        label: "Confirmar agendamento",
        icon: CheckCircle2,
        onClick: () => void executarConfirmacao(),
        variant: "outline",
        disabled: !selecionado?.id || confirmarMutation.isPending
      },
      {
        label: "Concluir atendimento",
        icon: PhoneCall,
        onClick: () => void executarConclusao(),
        variant: "outline",
        disabled: !selecionado?.id || concluirMutation.isPending
      },
      {
        label: "Cancelar agendamento",
        icon: X,
        onClick: () => setConfirmarCancelar(true),
        variant: "danger",
        disabled: !selecionado?.id || cancelarMutation.isPending
      },
      { label: "Imprimir agenda", icon: Printer, onClick: imprimirAtual, variant: "outline" },
      { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
    ],
    espera: [
      { label: "Novo item da espera", icon: Plus, onClick: novo, variant: "default" },
      {
        label: "Salvar lista de espera",
        icon: Save,
        onClick: () => void executarSalvarEspera(),
        variant: "default",
        disabled: criarEsperaMutation.isPending || converterMutation.isPending
      },
      {
        label: "Agendar da lista de espera",
        icon: CheckCircle2,
        onClick: () =>
          void (
            esperaForm.id
              ? converterMutation.mutateAsync({
                  id: esperaForm.id,
                  payload: {
                    ...form,
                    beneficiarioNome: esperaForm.beneficiarioNome || form.beneficiarioNome,
                    tipoAtendimento: esperaForm.tipoAtendimento || form.tipoAtendimento,
                    prioridade: esperaForm.prioridade || form.prioridade || "Normal",
                    unidade: form.unidade || catalogos?.unidades?.[0] || "Unidade principal",
                    setor: form.setor || "Agendamentos",
                    status: form.status || "Agendado",
                    ...obterProximoHorario(
                      agendamentos,
                      form.data || new Date().toISOString().slice(0, 10),
                      form.profissionalNome
                    )
                  }
                })
              : Promise.resolve()
          ),
        variant: "outline",
        disabled: !esperaForm.id || converterMutation.isPending || criarEsperaMutation.isPending
      },
      { label: "Imprimir lista de espera", icon: Printer, onClick: imprimirAtual, variant: "outline" },
      { label: "Exportar lista de espera", icon: FileDown, onClick: exportar, variant: "outline" },
      { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
    ],
    indicadores: [
      {
        label: "Atualizar painel",
        icon: Save,
        onClick: () => void indicadoresQuery.refetch(),
        variant: "default",
        disabled: indicadoresQuery.isFetching
      },
      { label: "Imprimir painel", icon: Printer, onClick: imprimirAtual, variant: "outline" },
      { label: "Exportar painel", icon: FileDown, onClick: exportar, variant: "outline" },
      { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
    ]
  };

  const acoes = acoesPorAba[abaAtiva];

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        sectionLabel="Atendimentos"
        pageTitle="Agendamentos"
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={selecionado?.id ? `Código: ${selecionado.id}` : "Novo"}
      >
        <section className="space-y-4">
          {abaAtiva === "agenda" ? (
            <div className="space-y-4">
              <Card className="border-[var(--g3-border)]">
                <CardHeader>
                  <CardTitle className="text-sm">Novo agendamento simplificado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Curso, atendimento ou oficina</Label>
                      <Select
                        value={cursoSelecionado?.id_matricula ?? ""}
                        onChange={(event) =>
                          setForm((atual) => {
                            const itemSelecionado =
                              cursosDisponiveis.find((item) => item.id_matricula === event.target.value) ?? null;

                            return {
                              ...atual,
                              inscricaoOrigemId: itemSelecionado?.id_matricula,
                              tipoAtendimento: itemSelecionado?.nome ?? "",
                              beneficiarioId: undefined,
                              beneficiarioNome: "",
                              profissionalNome: ""
                            };
                          })
                        }
                      >
                        <option value="">Selecione</option>
                        {cursosDisponiveis.map((item) => (
                          <option key={item.id_matricula ?? item.nome} value={item.id_matricula}>
                            {item.nome}
                          </option>
                        ))}
                      </Select>
                      <p className="text-xs text-[var(--g3-muted)]">
                        Selecione um curso, atendimento ou oficina já cadastrado em Inscrições.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <Label>Beneficiário</Label>
                      <Select
                        disabled={!cursoSelecionado?.id_matricula}
                        value={form.beneficiarioNome}
                        onChange={(event) =>
                          setForm((atual) => ({
                            ...atual,
                            beneficiarioNome: event.target.value
                          }))
                        }
                      >
                        <option value="">
                          {cursoSelecionado?.id_matricula ? "Selecione" : "Selecione primeiro o curso"}
                        </option>
                        {beneficiariosDoCursoSelecionado.map((item, index) => (
                          <option
                            key={item.id_beneficiario ?? `${item.nome_completo}-${index}`}
                            value={item.nome_completo}
                          >
                            {item.nome_completo}
                          </option>
                        ))}
                      </Select>
                      <p className="text-xs text-[var(--g3-muted)]">
                        {cursoSelecionado?.id_matricula
                          ? "Selecione um beneficiário já cadastrado nesse curso."
                          : "A lista de beneficiários é carregada a partir do curso, atendimento ou oficina selecionado."}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label>Data</Label>
                      {datasCursoDisponiveis.length ? (
                        <Select
                          value={datasCursoDisponiveis.includes(form.data) ? form.data : ""}
                          onChange={(event) =>
                            setForm((atual) => ({ ...atual, data: event.target.value }))
                          }
                        >
                          <option value="">Selecione a data</option>
                          {datasCursoDisponiveis.map((item) => (
                            <option key={item} value={item}>
                              {formatarData(item)}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Input
                          type="date"
                          value={form.data}
                          onChange={(event) =>
                            setForm((atual) => ({ ...atual, data: event.target.value }))
                          }
                        />
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label>Profissional</Label>
                      <Input
                        list="catalogo-profissionais-agendamento"
                        value={form.profissionalNome ?? ""}
                        onChange={(event) =>
                          setForm((atual) => ({ ...atual, profissionalNome: event.target.value }))
                        }
                        placeholder="Selecione o profissional"
                      />
                      <datalist id="catalogo-profissionais-agendamento">
                        {profissionaisDisponiveis.map((item) => (
                          <option key={item} value={item} />
                        ))}
                      </datalist>
                    </div>

                    <div className="space-y-1">
                      <Label>Observação interna</Label>
                      <Textarea
                        rows={1}
                        className="min-h-10 h-10 resize-none"
                        value={form.observacaoInterna ?? ""}
                        onChange={(event) =>
                          setForm((atual) => ({ ...atual, observacaoInterna: event.target.value }))
                        }
                        placeholder="Opcional"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => void executarSalvar()}
                      disabled={salvarMutation.isPending}
                    >
                      Incluir agenda
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[var(--g3-border)]">
                <CardHeader>
                  <CardTitle className="text-sm">Cards da agenda operacional</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {agendamentosQuery.isLoading ? (
                    <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-6 text-sm text-[var(--g3-muted)]">
                      Carregando agendamentos...
                    </div>
                  ) : agendaAgrupadaEmCards.length ? (
                    <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                      {agendaAgrupadaEmCards.map((grupo) => (
                        <div
                          key={grupo.chave}
                          className="overflow-hidden rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)]"
                        >
                          <div className="flex flex-col gap-2 border-b border-[var(--g3-border)] bg-[var(--g3-primary-soft)] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <p className="text-base font-semibold text-[var(--g3-active)]">
                                {grupo.tipoAtendimento}
                              </p>
                              <p className="text-sm font-medium text-[var(--g3-foreground)]">
                                {grupo.profissionalNome}
                              </p>
                              <p className="text-xs capitalize text-[var(--g3-muted)]">
                                {formatarData(grupo.data)}{formatarDiaSemana(grupo.data) ? ` • ${formatarDiaSemana(grupo.data)}` : ""}
                              </p>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--g3-active)]">
                              {grupo.itens.length} beneficiário(s)
                            </span>
                          </div>

                          <div className="space-y-2 p-3">
                            {grupo.itens.map((item) => (
                              <button
                                key={item.id ?? `${grupo.chave}-${item.beneficiarioNome}`}
                                type="button"
                                onClick={() => {
                                  setSelecionadoId(item.id ?? null);
                                  setForm({ ...item });
                                }}
                                className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left transition-colors ${
                                  selecionadoId === item.id
                                    ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)]"
                                    : "border-[var(--g3-border)] bg-white hover:bg-[var(--g3-primary-soft)]/45"
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-[var(--g3-foreground)]">
                                    {item.beneficiarioNome}
                                  </p>
                                  <p className="text-xs text-[var(--g3-muted)]">
                                    Horário gerado: {formatarHora(item.horaInicial)}
                                  </p>
                                </div>
                                <span
                                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${corStatus(
                                    item.status
                                  )}`}
                                >
                                  {item.status || "Agendado"}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-6 text-sm text-[var(--g3-muted)]">
                      Nenhum agendamento encontrado.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

          {abaAtiva === "espera" ? (
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <Card className="border-[var(--g3-border)]">
                <CardHeader>
                  <CardTitle className="text-sm">Novo item da lista de espera</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="space-y-1">
                    <Label>Beneficiário</Label>
                    <Input
                      value={esperaForm.beneficiarioNome}
                      onChange={(event) =>
                        setEsperaForm((atual) => ({
                          ...atual,
                          beneficiarioNome: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Curso, atendimento ou oficina</Label>
                    <Input
                      value={esperaForm.tipoAtendimento}
                      onChange={(event) =>
                        setEsperaForm((atual) => ({
                          ...atual,
                          tipoAtendimento: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Unidade</Label>
                      <Input
                        value={esperaForm.unidade ?? ""}
                        onChange={(event) =>
                          setEsperaForm((atual) => ({ ...atual, unidade: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Profissional preferencial</Label>
                      <Input
                        value={esperaForm.profissionalPreferencial ?? ""}
                        onChange={(event) =>
                          setEsperaForm((atual) => ({
                            ...atual,
                            profissionalPreferencial: event.target.value
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Prioridade</Label>
                      <Select
                        value={esperaForm.prioridade ?? "Normal"}
                        onChange={(event) =>
                          setEsperaForm((atual) => ({
                            ...atual,
                            prioridade: event.target.value as AgendamentoListaEspera["prioridade"]
                          }))
                        }
                      >
                        <option value="Normal">Normal</option>
                        <option value="Media">Média</option>
                        <option value="Alta">Alta</option>
                        <option value="Urgencia">Urgência</option>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Motivo</Label>
                    <Textarea
                      rows={3}
                      value={esperaForm.motivo ?? ""}
                      onChange={(event) =>
                        setEsperaForm((atual) => ({ ...atual, motivo: event.target.value }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-[var(--g3-border)]">
                <CardHeader>
                  <CardTitle className="text-sm">Fila ativa de espera</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {listaEsperaQuery.isLoading ? (
                    <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-6 text-sm text-[var(--g3-muted)]">
                      Carregando lista de espera...
                    </div>
                  ) : listaEspera.length ? (
                    listaEspera.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                              {item.beneficiarioNome}
                            </p>
                            <p className="text-xs text-[var(--g3-muted)]">
                              {item.tipoAtendimento} • {item.unidade || "Sem unidade"}
                            </p>
                            <p className="text-xs text-[var(--g3-muted)]">
                              Entrada em {formatarData(item.dataEntrada)} • Prioridade{" "}
                              {item.prioridade || "Normal"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              void converterMutation
                                .mutateAsync({
                                  id: item.id as number,
                                  payload: {
                                    ...agendamentoPadrao,
                                    beneficiarioId: item.beneficiarioId,
                                    beneficiarioNome: item.beneficiarioNome,
                                    familiaId: item.familiaId,
                                    familiaNome: item.familiaNome,
                                    unidade: item.unidade || catalogos?.unidades?.[0] || "",
                                    setor: "Agendamentos",
                                    tipoAtendimento: item.tipoAtendimento,
                                    profissionalNome: item.profissionalPreferencial,
                                    prioridade: item.prioridade ?? "Normal",
                                    horaInicial: "08:00",
                                    horaFinal: "08:30"
                                  }
                                })
                                .then((convertido) => {
                                  if (convertido?.id) {
                                    setSelecionadoId(convertido.id);
                                    setForm({ ...agendamentoPadrao, ...convertido });
                                    setAbaAtiva("agenda");
                                  }
                                  setPopup({
                                    tipo: "sucesso",
                                    titulo: "Confirmação",
                                    texto: "Item convertido em agendamento com sucesso."
                                  });
                                })
                                .catch((error: any) =>
                                  setPopup({
                                    tipo: "erro",
                                    titulo: "Erro",
                                    texto:
                                      error?.response?.data?.message ??
                                      "Não foi possível converter a lista de espera."
                                  })
                                )
                            }
                          >
                            Converter em agendamento
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-6 text-sm text-[var(--g3-muted)]">
                      Nenhum item na fila de espera.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

          {abaAtiva === "indicadores" ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="border-[var(--g3-border)] xl:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm">Painel do período</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                      Total agendado
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[var(--g3-foreground)]">
                      {agendamentos.length}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                      Confirmados
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[var(--g3-foreground)]">
                      {indicadores.confirmados ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                      Profissionais ativos
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[var(--g3-foreground)]">
                      {Object.keys(agendaPorProfissional).length}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                      Lista de espera
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[var(--g3-foreground)]">
                      {listaEspera.length}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[var(--g3-border)]">
                <CardHeader>
                  <CardTitle className="text-sm">Indicadores principais</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {[
                    { label: "Total no período", value: indicadores.totalNoPeriodo ?? agendamentos.length },
                    { label: "Total do dia", value: indicadores.totalHoje ?? 0 },
                    { label: "Concluídos", value: indicadores.concluidos ?? 0 },
                    { label: "Faltas", value: indicadores.faltas ?? 0 },
                    { label: "Retornos pendentes", value: indicadores.retornosPendentes ?? 0 },
                    { label: "Profissionais", value: Object.keys(agendaPorProfissional).length }
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                        {card.label}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-[var(--g3-foreground)]">
                        {card.value}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="border-[var(--g3-border)]">
                <CardHeader>
                  <CardTitle className="text-sm">Agenda por profissional</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(agendaPorProfissional).length ? (
                    Object.entries(agendaPorProfissional).map(([profissional, total]) => (
                      <div
                        key={profissional}
                        className="flex items-center justify-between rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-2"
                      >
                        <span className="text-sm text-[var(--g3-foreground)]">{profissional}</span>
                        <span className="rounded-full bg-[var(--g3-primary-soft)] px-2 py-1 text-xs font-semibold text-[var(--g3-active)]">
                          {total}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--g3-muted)]">
                      Sem dados para o período filtrado.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </section>
      </AdminPageLayout>
      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
      <PopupConfirmacao
        aberto={confirmarCancelar}
        titulo="Cancelar agendamento"
        texto="Deseja realmente cancelar o agendamento selecionado?"
        processando={cancelarMutation.isPending}
        onCancel={() => setConfirmarCancelar(false)}
        onConfirm={() => {
          if (!selecionado?.id) return;
          void cancelarMutation
            .mutateAsync({ id: selecionado.id, motivo: "Cancelado pela central de agendamentos." })
            .then(() => {
              setPopup({
                tipo: "sucesso",
                titulo: "Confirmação",
                texto: "Agendamento cancelado com sucesso."
              });
              setConfirmarCancelar(false);
            })
            .catch((error: any) =>
              setPopup({
                tipo: "erro",
                titulo: "Erro",
                texto:
                  error?.response?.data?.message ?? "Não foi possível cancelar o agendamento."
              })
            );
        }}
        confirmarTexto="Cancelar agendamento"
      />
    </>
  );
}
