import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Building2,
  FileText,
  List,
  Plus,
  Printer,
  Save,
  Search,
  Send,
  Trash2,
  Undo2,
  Users,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  AdminPageLayout,
  type AdminAction,
  type AdminTab
} from "@/components/admin/admin-page-layout";
import {
  PopupConfirmacao,
  PopupMensagem,
  type PopupMensagemState
} from "@/components/admin/admin-popups";
import {
  useCandidatosVaga,
  useCriarCandidatoVaga,
  useRemoverCandidatoVaga,
  useRemoverVagaBancoEmpregos,
  useSalvarVagaBancoEmpregos,
  useVagasBancoEmpregos
} from "@/features/banco-empregos/use-banco-empregos";
import { useBeneficiarios } from "@/features/beneficiarios/use-beneficiarios";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import type { JobPayload, JobRecord } from "@/types/banco-empregos";
import type { Beneficiario } from "@/types/beneficiario";

type AbaId =
  | "listagemVagas"
  | "dadosVaga"
  | "empresaLocal"
  | "requisitos"
  | "encaminhamentos"
  | "candidatos";

type BeneficiarioSelecionado = {
  id: string;
  nome: string;
};

const abas: AdminTab[] = [
  { id: "listagemVagas", label: "Listagem de vagas", icon: List },
  { id: "dadosVaga", label: "Dados da vaga", icon: Briefcase },
  { id: "empresaLocal", label: "Empresa e local", icon: Building2 },
  { id: "requisitos", label: "Requisitos e descrição", icon: FileText },
  { id: "encaminhamentos", label: "Encaminhamentos", icon: Send },
  { id: "candidatos", label: "Candidatos da vaga", icon: Users }
];

function criarFormularioVazio(): JobPayload {
  return {
    dadosVaga: {
      titulo: "",
      status: "Aberta",
      dataAbertura: new Date().toISOString().slice(0, 10)
    },
    empresaLocal: {
      nomeEmpresa: "",
      cidade: ""
    },
    requisitos: {
      descricao: ""
    },
    encaminhamentos: []
  };
}

function localizarBeneficiarioPorNome(beneficiarios: Beneficiario[], nome: string) {
  const nomeNormalizado = nome.trim().toLocaleLowerCase("pt-BR");
  if (!nomeNormalizado) {
    return null;
  }

  return (
    beneficiarios.find(
      (item) =>
        item.id_beneficiario &&
        item.nome_completo.trim().toLocaleLowerCase("pt-BR") === nomeNormalizado
    ) ?? null
  );
}

function mapearBeneficiarioSelecionado(item: Beneficiario | null): BeneficiarioSelecionado | null {
  if (!item?.id_beneficiario) {
    return null;
  }

  return {
    id: item.id_beneficiario,
    nome: item.nome_completo
  };
}

export function BancoEmpregosPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("listagemVagas");
  const [vagaSelecionadaId, setVagaSelecionadaId] = useState<string>();
  const [form, setForm] = useState<JobPayload>(() => criarFormularioVazio());
  const [snapshot, setSnapshot] = useState<JobPayload>(() => criarFormularioVazio());
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [nomeEncaminhamento, setNomeEncaminhamento] = useState("");
  const [encaminhamentoSelecionado, setEncaminhamentoSelecionado] =
    useState<BeneficiarioSelecionado | null>(null);
  const [nomeCandidato, setNomeCandidato] = useState("");
  const [candidatoSelecionado, setCandidatoSelecionado] =
    useState<BeneficiarioSelecionado | null>(null);
  const [statusCandidato, setStatusCandidato] = useState("EM_ANALISE");

  const vagasQuery = useVagasBancoEmpregos();
  const salvarMutation = useSalvarVagaBancoEmpregos();
  const removerMutation = useRemoverVagaBancoEmpregos();
  const candidatosQuery = useCandidatosVaga(vagaSelecionadaId);
  const criarCandidatoMutation = useCriarCandidatoVaga();
  const removerCandidatoMutation = useRemoverCandidatoVaga(vagaSelecionadaId);
  const beneficiariosEncaminhamentoQuery = useBeneficiarios(
    { nome: nomeEncaminhamento.trim() },
    { enabled: nomeEncaminhamento.trim().length >= 2 }
  );
  const beneficiariosCandidatosQuery = useBeneficiarios(
    { nome: nomeCandidato.trim() },
    { enabled: nomeCandidato.trim().length >= 2 }
  );

  const carregandoAcoes =
    salvarMutation.isPending ||
    removerMutation.isPending ||
    criarCandidatoMutation.isPending ||
    removerCandidatoMutation.isPending;

  const vagas = vagasQuery.data ?? [];
  const vagasFiltradas = useMemo(
    () =>
      vagas.filter((item) =>
        `${item.dadosVaga.titulo} ${item.empresaLocal?.nomeEmpresa ?? ""}`
          .toLocaleLowerCase("pt-BR")
          .includes(filtro.toLocaleLowerCase("pt-BR"))
      ),
    [filtro, vagas]
  );
  const sugestoesEncaminhamento = useMemo(
    () => (beneficiariosEncaminhamentoQuery.data?.beneficiarios ?? []).slice(0, 8),
    [beneficiariosEncaminhamentoQuery.data]
  );
  const sugestoesCandidatos = useMemo(
    () => (beneficiariosCandidatosQuery.data?.beneficiarios ?? []).slice(0, 8),
    [beneficiariosCandidatosQuery.data]
  );

  function limparSelecoesAuxiliares() {
    setNomeEncaminhamento("");
    setEncaminhamentoSelecionado(null);
    setNomeCandidato("");
    setCandidatoSelecionado(null);
    setStatusCandidato("EM_ANALISE");
  }

  function novo() {
    const vazio = criarFormularioVazio();
    setVagaSelecionadaId(undefined);
    setForm(vazio);
    setSnapshot(vazio);
    limparSelecoesAuxiliares();
    setAbaAtiva("dadosVaga");
  }

  function cancelar() {
    setForm(snapshot);
    limparSelecoesAuxiliares();
  }

  function selecionar(vaga: JobRecord) {
    setVagaSelecionadaId(vaga.id);
    setForm(vaga);
    setSnapshot(vaga);
    limparSelecoesAuxiliares();
    setAbaAtiva("dadosVaga");
  }

  function atualizarBeneficiarioEncaminhamento(valor: string) {
    setNomeEncaminhamento(valor);
    setEncaminhamentoSelecionado(
      mapearBeneficiarioSelecionado(localizarBeneficiarioPorNome(sugestoesEncaminhamento, valor))
    );
  }

  function atualizarBeneficiarioCandidato(valor: string) {
    setNomeCandidato(valor);
    setCandidatoSelecionado(
      mapearBeneficiarioSelecionado(localizarBeneficiarioPorNome(sugestoesCandidatos, valor))
    );
  }

  async function salvar() {
    if (
      !form.dadosVaga.titulo?.trim() ||
      !form.empresaLocal?.nomeEmpresa?.trim() ||
      !form.empresaLocal?.cidade?.trim() ||
      !form.requisitos?.descricao?.trim()
    ) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Preencha título, empresa, cidade e descrição."
      });
      return;
    }

    try {
      const response = await salvarMutation.mutateAsync({
        id: vagaSelecionadaId,
        payload: {
          ...form,
          encaminhamentos: (form.encaminhamentos ?? []).filter((item) =>
            item.beneficiarioNome?.trim()
          )
        }
      });

      setVagaSelecionadaId(response.id);
      setForm(response);
      setSnapshot(response);
      setPopup({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Vaga salva com sucesso."
      });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar."
      });
    }
  }

  async function confirmarExclusaoAtual() {
    if (!vagaSelecionadaId) return;

    try {
      await removerMutation.mutateAsync(vagaSelecionadaId);
      setConfirmarExcluir(false);
      novo();
      setPopup({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Vaga excluída com sucesso."
      });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir."
      });
    }
  }

  function adicionarEncaminhamento() {
    const nomeInformado = nomeEncaminhamento.trim();
    if (!nomeInformado) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe o nome do beneficiário."
      });
      return;
    }

    const beneficiario =
      encaminhamentoSelecionado ??
      mapearBeneficiarioSelecionado(
        localizarBeneficiarioPorNome(sugestoesEncaminhamento, nomeInformado)
      );

    setForm((atual) => ({
      ...atual,
      encaminhamentos: [
        {
          id: `enc-${Date.now()}`,
          beneficiarioId: beneficiario?.id ?? "",
          beneficiarioNome: beneficiario?.nome ?? nomeInformado,
          data: new Date().toISOString().slice(0, 10),
          status: "Aguardando contato"
        },
        ...(atual.encaminhamentos ?? [])
      ]
    }));
    setNomeEncaminhamento("");
    setEncaminhamentoSelecionado(null);
  }

  async function adicionarCandidato() {
    if (!vagaSelecionadaId) {
      setPopup({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Salve a vaga antes de cadastrar candidatos."
      });
      return;
    }

    const beneficiario =
      candidatoSelecionado ??
      mapearBeneficiarioSelecionado(localizarBeneficiarioPorNome(sugestoesCandidatos, nomeCandidato));

    if (!beneficiario?.id) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Selecione um beneficiário cadastrado."
      });
      return;
    }

    try {
      await criarCandidatoMutation.mutateAsync({
        empregoId: vagaSelecionadaId,
        payload: {
          beneficiarioId: beneficiario.id,
          beneficiarioNome: beneficiario.nome,
          status: statusCandidato,
          necessidadesProfissionais: "Não informado"
        }
      });

      setNomeCandidato("");
      setCandidatoSelecionado(null);
      setPopup({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Candidato adicionado com sucesso."
      });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível adicionar candidato."
      });
    }
  }

  function imprimir() {
    try {
      imprimirConteudoAtual({ titulo: "Banco de empregos" });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.message ?? "Não foi possível preparar a impressão."
      });
    }
  }

  const acoes: AdminAction[] = [
    {
      label: "Buscar",
      icon: Search,
      onClick: () => setAbaAtiva("listagemVagas"),
      variant: "outline"
    },
    { label: "Novo", icon: Plus, onClick: novo, variant: "default", disabled: carregandoAcoes },
    {
      label: salvarMutation.isPending ? "Salvando..." : "Salvar",
      icon: Save,
      onClick: () => void salvar(),
      variant: "default",
      disabled: carregandoAcoes
    },
    {
      label: "Cancelar",
      icon: Undo2,
      onClick: cancelar,
      variant: "outline",
      disabled: carregandoAcoes
    },
    {
      label: "Excluir",
      icon: Trash2,
      onClick: () => setConfirmarExcluir(true),
      variant: "danger",
      disabled: !vagaSelecionadaId || carregandoAcoes
    },
    { label: "Imprimir", icon: Printer, onClick: imprimir, variant: "outline" },
    {
      label: "Fechar",
      icon: X,
      onClick: () => navigate("/dashboard/visao-geral"),
      variant: "outline"
    }
  ];

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={vagaSelecionadaId ? `Código: ${vagaSelecionadaId}` : "Novo"}
      >
        {abaAtiva === "listagemVagas" ? (
          <section className="space-y-3">
            <div className="space-y-1">
              <Label>Pesquisar</Label>
              <Input
                placeholder="Título ou empresa"
                value={filtro}
                onChange={(event) => setFiltro(event.target.value)}
              />
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Título</th>
                    <th className="px-3 py-2 text-left">Empresa</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {vagasFiltradas.length ? (
                    vagasFiltradas.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`border-t border-[var(--g3-border)] ${
                          index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                        }`}
                      >
                        <td className="px-3 py-2 font-medium">{item.dadosVaga.titulo}</td>
                        <td className="px-3 py-2">{item.empresaLocal?.nomeEmpresa ?? "---"}</td>
                        <td className="px-3 py-2">{item.dadosVaga.status}</td>
                        <td className="px-3 py-2 text-right">
                          <Button variant="outline" size="sm" onClick={() => selecionar(item)}>
                            Selecionar
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center">
                        {vagasQuery.isLoading ? "Carregando vagas..." : "Nenhuma vaga encontrada."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "dadosVaga" ? (
          <section className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label>Título da vaga *</Label>
              <Input
                value={form.dadosVaga.titulo}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    dadosVaga: { ...atual.dadosVaga, titulo: event.target.value }
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Status *</Label>
              <Select
                value={form.dadosVaga.status}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    dadosVaga: {
                      ...atual.dadosVaga,
                      status: event.target.value as JobPayload["dadosVaga"]["status"]
                    }
                  }))
                }
              >
                <option value="Aberta">Aberta</option>
                <option value="Pausada">Pausada</option>
                <option value="Encerrada">Encerrada</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Data de abertura</Label>
              <Input
                type="date"
                value={form.dadosVaga.dataAbertura ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    dadosVaga: { ...atual.dadosVaga, dataAbertura: event.target.value }
                  }))
                }
              />
            </div>
          </section>
        ) : null}

        {abaAtiva === "empresaLocal" ? (
          <section className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label>Nome da empresa *</Label>
              <Input
                value={form.empresaLocal?.nomeEmpresa ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    empresaLocal: {
                      ...atual.empresaLocal,
                      nomeEmpresa: event.target.value
                    } as JobPayload["empresaLocal"]
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Cidade *</Label>
              <Input
                value={form.empresaLocal?.cidade ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    empresaLocal: {
                      ...atual.empresaLocal,
                      cidade: event.target.value
                    } as JobPayload["empresaLocal"]
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>CNPJ</Label>
              <Input
                value={form.empresaLocal?.cnpj ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    empresaLocal: {
                      ...atual.empresaLocal,
                      cnpj: event.target.value
                    } as JobPayload["empresaLocal"]
                  }))
                }
              />
            </div>
          </section>
        ) : null}

        {abaAtiva === "requisitos" ? (
          <section className="space-y-2">
            <Label>Descrição *</Label>
            <Textarea
              rows={4}
              value={form.requisitos?.descricao ?? ""}
              onChange={(event) =>
                setForm((atual) => ({
                  ...atual,
                  requisitos: {
                    ...atual.requisitos,
                    descricao: event.target.value
                  } as JobPayload["requisitos"]
                }))
              }
            />
            <Label>Requisitos</Label>
            <Textarea
              rows={3}
              value={form.requisitos?.requisitos ?? ""}
              onChange={(event) =>
                setForm((atual) => ({
                  ...atual,
                  requisitos: {
                    ...atual.requisitos,
                    requisitos: event.target.value
                  } as JobPayload["requisitos"]
                }))
              }
            />
          </section>
        ) : null}

        {abaAtiva === "encaminhamentos" ? (
          <section className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex-1 space-y-1">
                <Label>Beneficiário</Label>
                <Input
                  list="catalogo-beneficiarios-encaminhamentos"
                  placeholder="Digite o nome do beneficiário"
                  value={nomeEncaminhamento}
                  onChange={(event) => atualizarBeneficiarioEncaminhamento(event.target.value)}
                  onBlur={(event) => atualizarBeneficiarioEncaminhamento(event.target.value)}
                  disabled={carregandoAcoes}
                />
                <datalist id="catalogo-beneficiarios-encaminhamentos">
                  {sugestoesEncaminhamento.map((item) => (
                    <option key={item.id_beneficiario} value={item.nome_completo}>
                      {item.codigo ? `Código ${item.codigo}` : "Beneficiário cadastrado"}
                    </option>
                  ))}
                </datalist>
                <p className="text-xs text-slate-500">
                  Ao selecionar um cadastro existente, o encaminhamento será vinculado ao beneficiário.
                </p>
              </div>
              <div className="self-end">
                <Button onClick={adicionarEncaminhamento} disabled={carregandoAcoes}>
                  Adicionar
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Beneficiário</th>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(form.encaminhamentos ?? []).length ? (
                    (form.encaminhamentos ?? []).map((item, index) => (
                      <tr
                        key={item.id}
                        className={`border-t border-[var(--g3-border)] ${
                          index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                        }`}
                      >
                        <td className="px-3 py-2">{item.beneficiarioNome}</td>
                        <td className="px-3 py-2">{item.data}</td>
                        <td className="px-3 py-2">{item.status}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center">
                        Nenhum encaminhamento adicionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "candidatos" ? (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1 md:col-span-2">
                <Label>Nome do candidato</Label>
                <Input
                  list="catalogo-beneficiarios-candidatos"
                  value={nomeCandidato}
                  onChange={(event) => atualizarBeneficiarioCandidato(event.target.value)}
                  onBlur={(event) => atualizarBeneficiarioCandidato(event.target.value)}
                  disabled={criarCandidatoMutation.isPending || removerCandidatoMutation.isPending}
                  placeholder="Digite para localizar um beneficiário"
                />
                <datalist id="catalogo-beneficiarios-candidatos">
                  {sugestoesCandidatos.map((item) => (
                    <option key={item.id_beneficiario} value={item.nome_completo}>
                      {item.codigo ? `Código ${item.codigo}` : "Beneficiário cadastrado"}
                    </option>
                  ))}
                </datalist>
                <p className="text-xs text-slate-500">
                  O candidato deve ser selecionado a partir do cadastro de beneficiários.
                </p>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={statusCandidato}
                  onChange={(event) => setStatusCandidato(event.target.value)}
                  disabled={criarCandidatoMutation.isPending || removerCandidatoMutation.isPending}
                >
                  <option value="EM_ANALISE">Em análise</option>
                  <option value="EM_ANDAMENTO">Em andamento</option>
                  <option value="ENCAMINHADO">Encaminhado</option>
                  <option value="CONTRATADO">Contratado</option>
                  <option value="NAO_APROVADO">Não aprovado</option>
                </Select>
              </div>
            </div>
            <Button
              onClick={() => void adicionarCandidato()}
              disabled={criarCandidatoMutation.isPending || removerCandidatoMutation.isPending}
            >
              {criarCandidatoMutation.isPending ? "Adicionando candidato..." : "Adicionar candidato"}
            </Button>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Beneficiário</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(candidatosQuery.data ?? []).length ? (
                    (candidatosQuery.data ?? []).map((item, index) => (
                      <tr
                        key={item.id}
                        className={`border-t border-[var(--g3-border)] ${
                          index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                        }`}
                      >
                        <td className="px-3 py-2">{item.beneficiarioNome}</td>
                        <td className="px-3 py-2">{item.status ?? "---"}</td>
                        <td className="px-3 py-2">{item.criadoEm?.slice(0, 10) ?? "---"}</td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => void removerCandidatoMutation.mutateAsync(item.id)}
                            disabled={
                              criarCandidatoMutation.isPending || removerCandidatoMutation.isPending
                            }
                          >
                            {removerCandidatoMutation.isPending ? "Removendo..." : "Remover"}
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center">
                        Nenhum candidato cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
        onConfirm={() => void confirmarExclusaoAtual()}
        confirmarTexto="Excluir"
      />
    </>
  );
}
