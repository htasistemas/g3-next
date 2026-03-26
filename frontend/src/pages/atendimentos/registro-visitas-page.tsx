import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  FileText,
  History,
  Home,
  ListFilter,
  List,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  Undo2,
  UserCheck,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import {
  useRemoverVisitaDomiciliar,
  useSalvarVisitaDomiciliar,
  useVisitasDomiciliares
} from "@/features/visitas-domiciliares/use-visitas-domiciliares";
import { useAuth } from "@/hooks/use-auth";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import { beneficiariosService } from "@/services/beneficiarios.service";
import { unidadesAssistenciaisService } from "@/services/unidades-assistenciais.service";
import type { Beneficiario } from "@/types/beneficiario";
import type { UnidadeAssistencial } from "@/types/unidade-assistencial";
import type { SituacaoVisita, VisitaDomiciliar } from "@/types/visita-domiciliar";

type AbaId = "listagem" | "identificacao" | "condicoes" | "social" | "registro" | "anexos" | "historico";

type VisitaFiltro = {
  beneficiario: string;
  responsavel: string;
  unidade: string;
  situacao: string;
  dataVisita: string;
};

const abas: AdminTab[] = [
  { id: "listagem", label: "Listagem das visitas", icon: ListFilter },
  { id: "identificacao", label: "Identificação da visita", icon: ClipboardList },
  { id: "condicoes", label: "Condições do domicílio", icon: Home },
  { id: "social", label: "Situação familiar e social", icon: UserCheck },
  { id: "registro", label: "Registro da visita", icon: FileText },
  { id: "anexos", label: "Anexos", icon: List },
  { id: "historico", label: "Histórico do beneficiário", icon: History }
];

const tituloTela = "Registro de visitas";

const filtroPadrao: VisitaFiltro = {
  beneficiario: "",
  responsavel: "",
  unidade: "",
  situacao: "",
  dataVisita: ""
};

function obterDataAtualIso() {
  const agora = new Date();
  const timezoneOffset = agora.getTimezoneOffset() * 60_000;
  return new Date(agora.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function criarFormularioPadrao(responsavelPadrao = ""): VisitaDomiciliar {
  return {
    id: 0,
    beneficiarioId: 0,
    beneficiarioNome: "",
    unidade: "",
    responsavel: responsavelPadrao,
    dataVisita: obterDataAtualIso(),
    horarioInicial: "",
    horarioFinal: "",
    tipoVisita: "Social",
    situacao: "Agendada",
    usarEnderecoBeneficiario: true,
    endereco: {},
    observacoesIniciais: "",
    condicoes: {},
    situacaoSocial: {},
    registro: {},
    anexos: []
  };
}

function formatarDataBr(dataIso?: string) {
  if (!dataIso) return "---";
  const [ano, mes, dia] = dataIso.split("-");
  if (!ano || !mes || !dia) return dataIso;
  return `${dia}/${mes}/${ano}`;
}

export function RegistroVisitasPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const responsavelPadrao = usuario?.nome?.trim() || usuario?.nomeUsuario?.trim() || "";
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("listagem");
  const [form, setForm] = useState<VisitaDomiciliar>(() => criarFormularioPadrao(responsavelPadrao));
  const [snapshot, setSnapshot] = useState<VisitaDomiciliar>(() => criarFormularioPadrao(responsavelPadrao));
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const [buscaBeneficiario, setBuscaBeneficiario] = useState("");
  const [resultadoBeneficiarios, setResultadoBeneficiarios] = useState<Beneficiario[]>([]);
  const [unidades, setUnidades] = useState<UnidadeAssistencial[]>([]);
  const [filtroDraft, setFiltroDraft] = useState<VisitaFiltro>(filtroPadrao);
  const [filtros, setFiltros] = useState<VisitaFiltro>(filtroPadrao);

  const visitasQuery = useVisitasDomiciliares();
  const salvarMutation = useSalvarVisitaDomiciliar();
  const removerMutation = useRemoverVisitaDomiciliar();
  const visitas = visitasQuery.data ?? [];

  useEffect(() => {
    void unidadesAssistenciaisService.listar().then((res) => setUnidades(res.unidades ?? []));
  }, []);

  useEffect(() => {
    setForm((atual) => {
      if (atual.id || (atual.responsavel && atual.dataVisita)) {
        return atual;
      }

      return {
        ...atual,
        responsavel: atual.responsavel || responsavelPadrao,
        dataVisita: atual.dataVisita || obterDataAtualIso()
      };
    });

    setSnapshot((atual) => {
      if (atual.id || (atual.responsavel && atual.dataVisita)) {
        return atual;
      }

      return {
        ...atual,
        responsavel: atual.responsavel || responsavelPadrao,
        dataVisita: atual.dataVisita || obterDataAtualIso()
      };
    });
  }, [responsavelPadrao]);

  useEffect(() => {
    if (buscaBeneficiario.trim().length < 2) {
      setResultadoBeneficiarios([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      void beneficiariosService
        .listar({ nome: buscaBeneficiario })
        .then((res) => setResultadoBeneficiarios(res.beneficiarios ?? []))
        .catch(() => setResultadoBeneficiarios([]));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [buscaBeneficiario]);

  const historicoBeneficiario = useMemo(
    () => visitas.filter((item) => item.beneficiarioId === form.beneficiarioId),
    [form.beneficiarioId, visitas]
  );

  const visitasFiltradas = useMemo(() => {
    return visitas.filter((item) => {
      const correspondeBeneficiario =
        !filtros.beneficiario ||
        item.beneficiarioNome.toLowerCase().includes(filtros.beneficiario.toLowerCase());
      const correspondeResponsavel =
        !filtros.responsavel || item.responsavel.toLowerCase().includes(filtros.responsavel.toLowerCase());
      const correspondeUnidade = !filtros.unidade || item.unidade === filtros.unidade;
      const correspondeSituacao = !filtros.situacao || item.situacao === filtros.situacao;
      const correspondeData = !filtros.dataVisita || item.dataVisita === filtros.dataVisita;

      return (
        correspondeBeneficiario &&
        correspondeResponsavel &&
        correspondeUnidade &&
        correspondeSituacao &&
        correspondeData
      );
    });
  }, [filtros, visitas]);

  function buscarVisitas() {
    setFiltros(filtroDraft);
    setAbaAtiva("listagem");
  }

  function novo() {
    const formularioPadrao = criarFormularioPadrao(responsavelPadrao);
    setForm(formularioPadrao);
    setSnapshot(formularioPadrao);
    setAbaAtiva("identificacao");
    setBuscaBeneficiario("");
    setResultadoBeneficiarios([]);
  }

  function cancelar() {
    setForm(snapshot);
    setBuscaBeneficiario(snapshot.beneficiarioNome ?? "");
    setResultadoBeneficiarios([]);
  }

  function selecionar(visita: VisitaDomiciliar) {
    setForm(visita);
    setSnapshot(visita);
    setBuscaBeneficiario(visita.beneficiarioNome ?? "");
    setResultadoBeneficiarios([]);
    setAbaAtiva("identificacao");
  }

  function selecionarBeneficiario(item: Beneficiario) {
    setForm((atual) => ({
      ...atual,
      beneficiarioId: Number(item.id_beneficiario ?? 0),
      beneficiarioNome: item.nome_completo
    }));
    setBuscaBeneficiario(item.nome_completo);
    setResultadoBeneficiarios([]);
  }

  async function salvar() {
    if (!form.beneficiarioId || !form.unidade || !form.responsavel || !form.dataVisita || !form.horarioInicial) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Preencha beneficiário, unidade, responsável, data e horário inicial."
      });
      return;
    }

    try {
      const response = await salvarMutation.mutateAsync(form);
      setForm(response);
      setSnapshot(response);
      setBuscaBeneficiario(response.beneficiarioNome ?? "");
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Visita salva com sucesso." });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Nao foi possivel salvar a visita."
      });
    }
  }

  async function confirmarExclusao() {
    if (!form.id) return;

    try {
      await removerMutation.mutateAsync(form.id);
      setConfirmarExcluir(false);
      novo();
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Visita excluída com sucesso." });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Nao foi possivel excluir a visita."
      });
    }
  }

  function imprimir() {
    try {
      imprimirConteudoAtual({ titulo: "Registro de visitas" });
    } catch {
      window.print();
    }
  }

  const rotulosSalvarPorAba: Record<AbaId, string> = {
    listagem: "Salvar visita",
    identificacao: "Salvar identificação da visita",
    condicoes: "Salvar condições do domicílio",
    social: "Salvar situação familiar e social",
    registro: "Salvar registro da visita",
    anexos: "Salvar visita com anexos",
    historico: "Salvar visita"
  };

  const acoes: AdminAction[] = [
    { label: "Buscar histórico", icon: Search, onClick: () => setAbaAtiva("historico"), variant: "outline" },
    { label: "Nova visita", icon: Plus, onClick: novo, variant: "default" },
    {
      label: rotulosSalvarPorAba[abaAtiva],
      icon: Save,
      onClick: () => void salvar(),
      variant: "default",
      disabled: salvarMutation.isPending
    },
    { label: "Cancelar edição", icon: Undo2, onClick: cancelar, variant: "outline" },
    {
      label: "Excluir visita",
      icon: Trash2,
      onClick: () => setConfirmarExcluir(true),
      variant: "danger",
      disabled: !form.id
    },
    { label: "Imprimir visita", icon: Printer, onClick: imprimir, variant: "outline" },
    { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
  ];

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        sectionLabel="Atendimentos"
        pageTitle={tituloTela}
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={form.id ? `Código: ${form.id}` : "Novo"}
      >
        {abaAtiva === "listagem" ? (
          <section className="space-y-4">
            <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-1">
                  <Label>Beneficiário</Label>
                  <Input
                    className="h-8"
                    value={filtroDraft.beneficiario}
                    onChange={(event) =>
                      setFiltroDraft((atual) => ({ ...atual, beneficiario: event.target.value }))
                    }
                    placeholder="Digite o nome do beneficiário"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Responsável</Label>
                  <Input
                    className="h-8"
                    value={filtroDraft.responsavel}
                    onChange={(event) =>
                      setFiltroDraft((atual) => ({ ...atual, responsavel: event.target.value }))
                    }
                    placeholder="Digite o responsável"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Unidade</Label>
                  <Select
                    className="h-8"
                    value={filtroDraft.unidade}
                    onChange={(event) =>
                      setFiltroDraft((atual) => ({ ...atual, unidade: event.target.value }))
                    }
                  >
                    <option value="">Todas</option>
                    {unidades.map((unidade) => (
                      <option key={unidade.id_unidade} value={unidade.nome_fantasia}>
                        {unidade.nome_fantasia}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Situação</Label>
                  <Select
                    className="h-8"
                    value={filtroDraft.situacao}
                    onChange={(event) =>
                      setFiltroDraft((atual) => ({ ...atual, situacao: event.target.value }))
                    }
                  >
                    <option value="">Todas</option>
                    <option value="Agendada">Agendada</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Realizada">Realizada</option>
                    <option value="Cancelada">Cancelada</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Data da visita</Label>
                  <Input
                    className="h-8"
                    type="date"
                    value={filtroDraft.dataVisita}
                    onChange={(event) =>
                      setFiltroDraft((atual) => ({ ...atual, dataVisita: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={buscarVisitas}>
                  Buscar visitas
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  onClick={() => {
                    setFiltroDraft(filtroPadrao);
                    setFiltros(filtroPadrao);
                  }}
                >
                  Limpar filtros
                </Button>
              </div>
            </div>

            <div className="max-h-[420px] overflow-auto rounded-lg border border-[var(--g3-border)]">
              {visitasQuery.isLoading ? (
                <p className="p-3 text-sm text-[var(--g3-muted)]">Carregando visitas...</p>
              ) : visitasFiltradas.length === 0 ? (
                <p className="p-3 text-sm text-[var(--g3-muted)]">Nenhuma visita encontrada.</p>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                    <tr>
                      <th className="px-2 py-2">Código</th>
                      <th className="px-2 py-2">Beneficiário</th>
                      <th className="px-2 py-2">Data</th>
                      <th className="px-2 py-2">Responsável</th>
                      <th className="px-2 py-2">Unidade</th>
                      <th className="px-2 py-2">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitasFiltradas.map((item, indice) => (
                      <tr
                        key={item.id}
                        className={`cursor-pointer border-t border-[var(--g3-border)] hover:bg-[var(--g3-primary-soft-hover)] ${
                          item.id === form.id
                            ? "bg-[var(--g3-primary-soft-hover)]"
                            : indice % 2 === 0
                              ? "bg-[var(--g3-card)]"
                              : "bg-[var(--g3-card-soft)]"
                        }`}
                        onClick={() => selecionar(item)}
                      >
                        <td className="px-2 py-2">{item.id}</td>
                        <td className="px-2 py-2">{item.beneficiarioNome || "---"}</td>
                        <td className="px-2 py-2">{formatarDataBr(item.dataVisita)}</td>
                        <td className="px-2 py-2">{item.responsavel || "---"}</td>
                        <td className="px-2 py-2">{item.unidade || "---"}</td>
                        <td className="px-2 py-2">{item.situacao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        ) : null}

        {abaAtiva === "identificacao" ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1 md:col-span-2 xl:col-span-4">
              <Label>Beneficiário *</Label>
              <Input
                value={buscaBeneficiario}
                onChange={(event) => {
                  const valor = event.target.value;
                  setBuscaBeneficiario(valor);
                  setForm((atual) => ({ ...atual, beneficiarioId: 0, beneficiarioNome: valor }));
                }}
                placeholder="Digite para buscar e selecione o beneficiário"
              />
              {resultadoBeneficiarios.length ? (
                <div className="mt-2 max-h-32 overflow-y-auto rounded-md border border-[var(--g3-border)] p-2">
                  {resultadoBeneficiarios.map((item) => (
                    <button
                      key={item.id_beneficiario ?? item.cpf}
                      type="button"
                      className="flex w-full justify-between rounded px-2 py-1 text-left hover:bg-[var(--g3-primary-soft)]"
                      onClick={() => selecionarBeneficiario(item)}
                    >
                      {item.nome_completo}
                      <span className="text-xs text-[var(--g3-muted)]">{item.cpf}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              <p className="text-xs text-[var(--g3-muted)]">
                Digite pelo menos 2 letras para buscar e depois selecione o beneficiário desejado na lista.
              </p>
            </div>

            <div className="space-y-1">
              <Label>Unidade *</Label>
              <Select value={form.unidade} onChange={(event) => setForm((atual) => ({ ...atual, unidade: event.target.value }))}>
                <option value="">Selecione</option>
                {unidades.map((unidade) => (
                  <option key={unidade.id_unidade} value={unidade.nome_fantasia}>
                    {unidade.nome_fantasia}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Responsável *</Label>
              <Input value={form.responsavel} onChange={(event) => setForm((atual) => ({ ...atual, responsavel: event.target.value }))} />
            </div>

            <div className="space-y-1">
              <Label>Data *</Label>
              <Input type="date" value={form.dataVisita} onChange={(event) => setForm((atual) => ({ ...atual, dataVisita: event.target.value }))} />
            </div>

            <div className="space-y-1">
              <Label>Horário inicial *</Label>
              <Input type="time" value={form.horarioInicial} onChange={(event) => setForm((atual) => ({ ...atual, horarioInicial: event.target.value }))} />
            </div>

            <div className="space-y-1">
              <Label>Horário final</Label>
              <Input type="time" value={form.horarioFinal ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, horarioFinal: event.target.value }))} />
            </div>

            <div className="space-y-1">
              <Label>Situação *</Label>
              <Select
                value={form.situacao}
                onChange={(event) => setForm((atual) => ({ ...atual, situacao: event.target.value as SituacaoVisita }))}
              >
                <option value="Agendada">Agendada</option>
                <option value="Em andamento">Em andamento</option>
                <option value="Realizada">Realizada</option>
                <option value="Cancelada">Cancelada</option>
              </Select>
            </div>

            <div className="space-y-1 md:col-span-2 xl:col-span-4">
              <Label>Observações iniciais</Label>
              <Textarea
                rows={2}
                value={form.observacoesIniciais ?? ""}
                onChange={(event) => setForm((atual) => ({ ...atual, observacoesIniciais: event.target.value }))}
              />
            </div>
          </section>
        ) : null}

        {abaAtiva === "condicoes" ? (
          <section className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Tipo de moradia</Label>
              <Input
                value={form.condicoes.tipoMoradia ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, condicoes: { ...atual.condicoes, tipoMoradia: event.target.value } }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Situação de posse</Label>
              <Input
                value={form.condicoes.situacaoPosse ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, condicoes: { ...atual.condicoes, situacaoPosse: event.target.value } }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Cômodos</Label>
              <Input
                type="number"
                value={form.condicoes.comodos ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, condicoes: { ...atual.condicoes, comodos: Number(event.target.value) || null } }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Condições de higiene</Label>
              <Input
                value={form.condicoes.condicoesHigiene ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    condicoes: { ...atual.condicoes, condicoesHigiene: event.target.value }
                  }))
                }
              />
            </div>
          </section>
        ) : null}

        {abaAtiva === "social" ? (
          <section className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Renda familiar</Label>
              <Input
                value={form.situacaoSocial.rendaFamiliar ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    situacaoSocial: { ...atual.situacaoSocial, rendaFamiliar: event.target.value }
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Faixa de renda</Label>
              <Input
                value={form.situacaoSocial.faixaRenda ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    situacaoSocial: { ...atual.situacaoSocial, faixaRenda: event.target.value }
                  }))
                }
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Rede de apoio</Label>
              <Textarea
                rows={2}
                value={form.situacaoSocial.redeApoio ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    situacaoSocial: { ...atual.situacaoSocial, redeApoio: event.target.value }
                  }))
                }
              />
            </div>
          </section>
        ) : null}

        {abaAtiva === "registro" ? (
          <section className="space-y-2">
            <Label>Relato</Label>
            <Textarea
              rows={4}
              value={form.registro.relato ?? ""}
              onChange={(event) => setForm((atual) => ({ ...atual, registro: { ...atual.registro, relato: event.target.value } }))}
            />
            <Label>Necessidades</Label>
            <Textarea
              rows={3}
              value={form.registro.necessidades ?? ""}
              onChange={(event) =>
                setForm((atual) => ({ ...atual, registro: { ...atual.registro, necessidades: event.target.value } }))
              }
            />
            <Label>Encaminhamentos</Label>
            <Textarea
              rows={3}
              value={form.registro.encaminhamentos ?? ""}
              onChange={(event) =>
                setForm((atual) => ({ ...atual, registro: { ...atual.registro, encaminhamentos: event.target.value } }))
              }
            />
          </section>
        ) : null}

        {abaAtiva === "anexos" ? (
          <section className="space-y-3">
            <div className="rounded-lg border border-[var(--g3-border)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[var(--g3-foreground)]">Anexos vinculados</p>
                  <p className="text-xs text-[var(--g3-muted)]">Os anexos já cadastrados para esta visita são exibidos abaixo.</p>
                </div>
                <span className="rounded-full border border-[var(--g3-border)] px-2 py-1 text-xs text-[var(--g3-muted)]">
                  {(form.anexos ?? []).length} item(ns)
                </span>
              </div>

              {(form.anexos ?? []).length ? (
                <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--g3-border)]">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                      <tr>
                        <th className="px-3 py-2 text-left">Nome</th>
                        <th className="px-3 py-2 text-left">Tipo</th>
                        <th className="px-3 py-2 text-left">Tamanho</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(form.anexos ?? []).map((anexo, index) => (
                        <tr
                          key={`${anexo.id ?? anexo.nome}-${index}`}
                          className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}
                        >
                          <td className="px-3 py-2">{anexo.nome}</td>
                          <td className="px-3 py-2">{anexo.tipo || "---"}</td>
                          <td className="px-3 py-2">{anexo.tamanho || "---"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-[var(--g3-border)] px-4 py-6 text-center text-sm text-[var(--g3-muted)]">
                  Nenhum anexo cadastrado para esta visita.
                </div>
              )}
            </div>
          </section>
        ) : null}

        {abaAtiva === "historico" ? (
          <section className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                <tr>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-left">Situação</th>
                  <th className="px-3 py-2 text-left">Responsável</th>
                  <th className="px-3 py-2 text-left">Unidade</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {historicoBeneficiario.length ? (
                  historicoBeneficiario.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}
                    >
                      <td className="px-3 py-2">{item.dataVisita}</td>
                      <td className="px-3 py-2">{item.situacao}</td>
                      <td className="px-3 py-2">{item.responsavel}</td>
                      <td className="px-3 py-2">{item.unidade}</td>
                      <td className="px-3 py-2 text-right">
                        <Button variant="outline" size="sm" onClick={() => selecionar(item)}>
                          Selecionar
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center">
                      {visitasQuery.isLoading ? "Carregando histórico..." : "Nenhuma visita encontrada."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        ) : null}
      </AdminPageLayout>

      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}

      <PopupConfirmacao
        aberto={confirmarExcluir}
        titulo="Confirmar exclusão"
        texto="Esta ação é irreversível. Deseja continuar?"
        processando={removerMutation.isPending}
        onCancel={() => setConfirmarExcluir(false)}
        onConfirm={() => void confirmarExclusao()}
        confirmarTexto="Excluir"
      />
    </>
  );
}

