import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, History, Home, List, MapPinned, Plus, Printer, Save, Trash2, UserRound, UsersRound } from "lucide-react";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { beneficiariosService } from "@/services/beneficiarios.service";
import { useDesmembrarFamilia, useFamilia, useFamiliaAlertas, useFamiliaHistorico, useFamilias, useRemoverFamilia, useSalvarFamilia, useTransferirMembroFamilia, useValidacaoBeneficioFamiliar } from "@/features/familias/use-familias";
import type { Beneficiario } from "@/types/beneficiario";
import type { Familia, FamiliaFiltro, FamiliaMembro } from "@/types/familia";

type AbaId = "listagem" | "resumo" | "composicao" | "endereco" | "renda" | "atendimentos" | "beneficios" | "historico" | "documentos";

const abas: AdminTab[] = [
  { id: "listagem", label: "Listagem de famílias", icon: List },
  { id: "resumo", label: "Resumo familiar", icon: UsersRound },
  { id: "composicao", label: "Composição familiar", icon: UserRound },
  { id: "endereco", label: "Endereço e moradia", icon: MapPinned },
  { id: "renda", label: "Renda e perfil social", icon: Home },
  { id: "atendimentos", label: "Atendimentos", icon: Home },
  { id: "beneficios", label: "Benefícios / concessões", icon: AlertTriangle },
  { id: "historico", label: "Histórico de alterações", icon: History },
  { id: "documentos", label: "Documentos / anexos", icon: Home }
];

const familiaVazia: Familia = { nome_familia: "", status: "ATIVO", membros: [], renda_familiar_total: "", observacoes: "", logradouro: "", bairro: "", municipio: "", uf: "" };
const membroVazio: FamiliaMembro = { id_beneficiario: "", parentesco: "", responsavel_familiar: false, usa_endereco_familia: true };
const parentescoOptions = [
  "Responsável familiar",
  "Cônjuge",
  "Companheiro(a)",
  "Filho(a)",
  "Enteado(a)",
  "Pai",
  "Mãe",
  "Irmão(ã)",
  "Avô(ó)",
  "Neto(a)",
  "Tio(a)",
  "Sobrinho(a)",
  "Genro",
  "Nora",
  "Outro"
];

const nomePessoa = (m?: FamiliaMembro["beneficiario"] | null) => m?.nome_completo || m?.nome_social || "Beneficiário";
const dataPt = (v?: string) => (v ? new Date(v).toLocaleDateString("pt-BR") : "—");
const mensagemErroApi = (error: unknown) => {
  if (error && typeof error === "object") {
    const candidate = error as { response?: { data?: { message?: string } }; message?: string };
    if (candidate.response?.data?.message) {
      return candidate.response.data.message;
    }
    if (candidate.message) {
      return candidate.message;
    }
  }
  return "Ocorreu um erro na operação.";
};

export function CadastroVinculoFamiliarPage() {
  const queryClient = useQueryClient();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("listagem");
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [filtros, setFiltros] = useState<FamiliaFiltro>({ status: "ATIVO" });
  const [familiaIdSelecionada, setFamiliaIdSelecionada] = useState<string>();
  const [familiaForm, setFamiliaForm] = useState<Familia>(familiaVazia);
  const [membros, setMembros] = useState<FamiliaMembro[]>([]);
  const [membroForm, setMembroForm] = useState<FamiliaMembro>(membroVazio);
  const [membroEmEdicaoId, setMembroEmEdicaoId] = useState<string>();
  const [buscaBeneficiario, setBuscaBeneficiario] = useState("");
  const [membroTransferenciaId, setMembroTransferenciaId] = useState("");
  const [familiaDestinoId, setFamiliaDestinoId] = useState("");
  const [novoNomeFamilia, setNovoNomeFamilia] = useState("");

  const familiasQuery = useFamilias(filtros);
  const familiaQuery = useFamilia(familiaIdSelecionada);
  const alertasQuery = useFamiliaAlertas(familiaIdSelecionada);
  const historicoQuery = useFamiliaHistorico(familiaIdSelecionada);
  const validacaoQuery = useValidacaoBeneficioFamiliar(familiaIdSelecionada, "Cesta básica");
  const salvarFamilia = useSalvarFamilia();
  const removerFamilia = useRemoverFamilia();
  const transferirMembro = useTransferirMembroFamilia();
  const desmembrarFamilia = useDesmembrarFamilia();
  const buscaBeneficiarios = useQuery({
    queryKey: ["familias", "busca-beneficiario", buscaBeneficiario],
    queryFn: () => beneficiariosService.listar({ nome: buscaBeneficiario || undefined }),
    enabled: buscaBeneficiario.trim().length >= 2
  });

  const familias = familiasQuery.data?.familias ?? [];
  const familia = familiaQuery.data?.familia;
  const alertas = alertasQuery.data?.alertas ?? [];
  const historico = historicoQuery.data?.historico ?? [];
  const validacao = validacaoQuery.data;
  const beneficiarios = buscaBeneficiarios.data?.beneficiarios ?? [];

  useEffect(() => {
    if (!familiaIdSelecionada) return;
    if (!familia) return;
    setFamiliaForm({ ...familia, membros: familia.membros ?? [] });
    setMembros(familia.membros ?? []);
  }, [familia, familiaIdSelecionada]);

  function novaFamilia() {
    setFamiliaIdSelecionada(undefined);
    setFamiliaForm(familiaVazia);
    setMembros([]);
    setMembroForm(membroVazio);
    setMembroEmEdicaoId(undefined);
    setBuscaBeneficiario("");
    setMembroTransferenciaId("");
    setFamiliaDestinoId("");
    setNovoNomeFamilia("");
    setAbaAtiva("composicao");
    void queryClient.removeQueries({ queryKey: ["familia"] });
  }

  function selecionarFamilia(id?: string) {
    setFamiliaIdSelecionada(id);
    setAbaAtiva("resumo");
  }

  function familiaComMesmoMembro(idBeneficiario: string) {
    return familias.find((familiaItem) => {
      if (familiaItem.id_familia === familiaIdSelecionada) return false;
      if ((familiaItem.status ?? "ATIVO") !== "ATIVO") return false;
      return (familiaItem.membros ?? []).some((membro) => membro.id_beneficiario === idBeneficiario);
    });
  }

  async function aplicarEnderecoDoResponsavelSeNecessario(idBeneficiario: string) {
    if (familiaForm.logradouro || familiaForm.bairro || familiaForm.municipio || familiaForm.uf || familiaForm.cep) {
      return;
    }

    const response = await beneficiariosService.buscarPorId(idBeneficiario);
    const beneficiario = response.beneficiario;
    if (!beneficiario.logradouro && !beneficiario.bairro && !beneficiario.municipio && !beneficiario.uf && !beneficiario.cep) {
      return;
    }

    setFamiliaForm((atual) => ({
      ...atual,
      cep: atual.cep || beneficiario.cep || "",
      logradouro: atual.logradouro || beneficiario.logradouro || "",
      numero: atual.numero || beneficiario.numero || "",
      complemento: atual.complemento || beneficiario.complemento || "",
      bairro: atual.bairro || beneficiario.bairro || "",
      ponto_referencia: atual.ponto_referencia || beneficiario.ponto_referencia || "",
      municipio: atual.municipio || beneficiario.municipio || "",
      uf: atual.uf || beneficiario.uf || "",
      zona: atual.zona || beneficiario.zona || ""
    }));
  }

  async function adicionarMembroLocal() {
    if (!membroForm.id_beneficiario || !membroForm.parentesco.trim()) {
      setPopup({ tipo: "erro", titulo: "Vínculo incompleto", texto: "Selecione o beneficiário e informe o parentesco." });
      return;
    }
    const familiaDuplicada = familiaComMesmoMembro(membroForm.id_beneficiario);
    if (familiaDuplicada) {
      setPopup({
        tipo: "erro",
        titulo: "Membro já vinculado",
        texto: `Este beneficiário já pertence à família ativa ${familiaDuplicada.nome_familia}.`
      });
      return;
    }
    const responsavelExistente = membros.find((item) => item.responsavel_familiar);
    if (
      membroForm.responsavel_familiar &&
      responsavelExistente &&
      responsavelExistente.id_beneficiario !== membroForm.id_beneficiario
    ) {
      setPopup({
        tipo: "erro",
        titulo: "Responsável já definido",
        texto: "A família já possui um responsável ativo. Altere o responsável atual antes de definir outro."
      });
      return;
    }
    const listaBase = membros.filter((item) => item.id_beneficiario !== membroForm.id_beneficiario);
    const lista = membroForm.responsavel_familiar ? listaBase.map((item) => ({ ...item, responsavel_familiar: false })) : listaBase;
    setMembros([...lista, { ...membroForm, parentesco: membroForm.responsavel_familiar ? "Responsável familiar" : membroForm.parentesco }]);
    if (membroForm.responsavel_familiar) {
      await aplicarEnderecoDoResponsavelSeNecessario(membroForm.id_beneficiario);
    }
    setMembroForm(membroVazio);
    setMembroEmEdicaoId(undefined);
  }

  function selecionarBeneficiario(beneficiario: Beneficiario, responsavel = false) {
    const familiaDuplicada = familiaComMesmoMembro(String(beneficiario.id_beneficiario ?? ""));
    if (familiaDuplicada) {
      setPopup({
        tipo: "erro",
        titulo: "Beneficiário já vinculado",
        texto: `Este beneficiário já pertence à família ativa ${familiaDuplicada.nome_familia}.`
      });
      return;
    }
    setMembroForm({
      id_beneficiario: String(beneficiario.id_beneficiario ?? ""),
      parentesco: responsavel ? "Responsável familiar" : "",
      responsavel_familiar: responsavel,
      usa_endereco_familia: true,
      beneficiario: { id_beneficiario: String(beneficiario.id_beneficiario ?? ""), nome_completo: beneficiario.nome_completo, nome_social: beneficiario.nome_social, codigo: beneficiario.codigo, cpf: beneficiario.cpf }
    });
    setMembroEmEdicaoId(String(beneficiario.id_beneficiario ?? ""));
    if (!familiaForm.nome_familia && responsavel) setFamiliaForm((atual) => ({ ...atual, nome_familia: `Família ${beneficiario.nome_completo}`.trim() }));
  }

  function editarMembro(membro: FamiliaMembro) {
    setMembroForm(membro);
    setMembroEmEdicaoId(membro.id_beneficiario);
  }

  async function tornarResponsavel(membro: FamiliaMembro) {
    setMembros((atual) =>
      atual.map((item) => ({
        ...item,
        responsavel_familiar: item.id_beneficiario === membro.id_beneficiario,
        parentesco: item.id_beneficiario === membro.id_beneficiario ? "Responsável familiar" : item.parentesco
      }))
    );
    await aplicarEnderecoDoResponsavelSeNecessario(membro.id_beneficiario);
  }

  async function salvar() {
    const responsavel = membros.find((item) => item.responsavel_familiar);
    if (!familiaForm.nome_familia.trim()) return setPopup({ tipo: "erro", titulo: "Nome obrigatório", texto: "Informe o nome da família." });
    if (!membros.length) return setPopup({ tipo: "erro", titulo: "Composição obrigatória", texto: "Adicione pelo menos um membro." });
    if (!responsavel?.id_beneficiario) return setPopup({ tipo: "erro", titulo: "Responsável obrigatório", texto: "Defina um responsável familiar." });
    if (membros.some((item) => !item.parentesco?.trim())) return setPopup({ tipo: "erro", titulo: "Parentesco obrigatório", texto: "Todos os membros precisam ter parentesco." });
    if (membros.filter((item) => item.responsavel_familiar).length > 1) return setPopup({ tipo: "erro", titulo: "Responsável duplicado", texto: "A família pode ter apenas um responsável ativo." });
    if (membros.some((item) => item.usa_endereco_familia !== false) && !familiaForm.logradouro && !familiaForm.bairro && !familiaForm.municipio && !familiaForm.uf) {
      return setPopup({ tipo: "erro", titulo: "Endereço principal obrigatório", texto: "Informe o endereço principal da família ou defina um responsável com endereço cadastrado." });
    }
    try {
      const response = await salvarFamilia.mutateAsync({ ...familiaForm, id_familia: familiaIdSelecionada, id_referencia_familiar: responsavel.id_beneficiario, membros });
      setFamiliaIdSelecionada(response.familia.id_familia);
      setAbaAtiva("resumo");
      setPopup({ tipo: "sucesso", titulo: "Vínculo familiar salvo", texto: "A família foi salva com sucesso." });
    } catch (error) {
      setPopup({ tipo: "erro", titulo: "Erro ao salvar", texto: mensagemErroApi(error) });
    }
  }

  async function transferirParaOutraFamilia() {
    if (!familiaIdSelecionada || !membroTransferenciaId || !familiaDestinoId) {
      setPopup({ tipo: "erro", titulo: "Transferência incompleta", texto: "Selecione o membro e a família de destino." });
      return;
    }
    try {
      await transferirMembro.mutateAsync({
        familiaId: familiaIdSelecionada,
        transferencia: {
          id_membro: Number(membroTransferenciaId),
          familia_destino_id: Number(familiaDestinoId)
        }
      });
      setMembroTransferenciaId("");
      setFamiliaDestinoId("");
      setPopup({ tipo: "sucesso", titulo: "Membro transferido", texto: "O membro foi transferido para outra família com sucesso." });
    } catch (error) {
      setPopup({ tipo: "erro", titulo: "Erro na transferência", texto: mensagemErroApi(error) });
    }
  }

  async function criarNovaFamiliaPorDesmembramento() {
    if (!familiaIdSelecionada || !membroTransferenciaId || !novoNomeFamilia.trim()) {
      setPopup({ tipo: "erro", titulo: "Desmembramento incompleto", texto: "Selecione o membro e informe o nome da nova família." });
      return;
    }
    const membro = membros.find((item) => item.id_beneficiario === membroTransferenciaId);
    if (!membro) {
      setPopup({ tipo: "erro", titulo: "Membro inválido", texto: "Selecione um membro válido para formar outra família." });
      return;
    }
    if (!membro.id_familia_membro) {
      setPopup({ tipo: "erro", titulo: "Salve a família primeiro", texto: "Para desmembrar, salve a família atual antes." });
      return;
    }
    try {
      const response = await desmembrarFamilia.mutateAsync({
        familiaId: familiaIdSelecionada,
        desmembramento: {
          membro_ids: [Number(membro.id_familia_membro)],
          nome_familia: novoNomeFamilia.trim(),
          novo_responsavel_id: Number(membro.id_beneficiario),
          copiar_endereco_familiar: true
        }
      });
      setFamiliaIdSelecionada(response.familia_nova.id_familia);
      setAbaAtiva("resumo");
      setMembroTransferenciaId("");
      setNovoNomeFamilia("");
      setPopup({ tipo: "sucesso", titulo: "Nova família criada", texto: "O membro saiu do núcleo anterior e passou a ser o principal da nova família." });
    } catch (error) {
      setPopup({ tipo: "erro", titulo: "Erro no desmembramento", texto: mensagemErroApi(error) });
    }
  }

  async function inativar() {
    if (!familiaIdSelecionada) return;
    try {
      await removerFamilia.mutateAsync(familiaIdSelecionada);
      novaFamilia();
      setAbaAtiva("listagem");
      setPopup({ tipo: "sucesso", titulo: "Família inativada", texto: "A família foi inativada logicamente." });
    } catch (error) {
      setPopup({ tipo: "erro", titulo: "Erro ao inativar", texto: mensagemErroApi(error) });
    }
  }

  const acoes: AdminAction[] = [
    { label: "Nova família", icon: Plus, variant: "default", onClick: novaFamilia },
    { label: "Salvar vínculo", icon: Save, variant: "outline", onClick: () => void salvar(), disabled: salvarFamilia.isPending },
    { label: "Imprimir", icon: Printer, variant: "ghost", onClick: () => window.print(), disabled: !familiaIdSelecionada },
    { label: "Inativar família", icon: Trash2, variant: "danger", onClick: () => void inativar(), disabled: !familiaIdSelecionada || removerFamilia.isPending }
  ];

  const resumoCards = useMemo(() => [
    { titulo: "Membros", valor: membros.length },
    { titulo: "Alertas", valor: alertas.length },
    { titulo: "Status", valor: familiaForm.status || "ATIVO" },
    { titulo: "Atualização", valor: dataPt(familiaForm.data_atualizacao) }
  ], [alertas.length, familiaForm.data_atualizacao, familiaForm.status, membros.length]);

  return (
    <>
      <AdminPageLayout tabs={abas} activeTab={abaAtiva} onChangeTab={(id) => setAbaAtiva(id as AbaId)} actions={acoes} sectionLabel="Cadastros" pageTitle="Vínculo familiar" activeTitle={abas.find((item) => item.id === abaAtiva)?.label} codeBadge={familiaIdSelecionada ? `Código da família: ${familiaIdSelecionada}` : "Nova família"}>
        <section className={abaAtiva === "composicao" ? "flex max-h-[calc(100vh-185px)] min-h-0 flex-col gap-2 overflow-hidden" : "space-y-4"}>
          <Card className={abaAtiva === "composicao" ? "shrink-0 overflow-hidden" : undefined}><CardHeader className={abaAtiva === "composicao" ? "px-3 py-2" : undefined}><CardTitle className="text-base">Cabeçalho da família</CardTitle></CardHeader><CardContent className={abaAtiva === "composicao" ? "grid gap-2 px-3 pb-2 pt-0 md:grid-cols-2 xl:grid-cols-4" : "grid gap-3 md:grid-cols-2 xl:grid-cols-4"}><div className={abaAtiva === "composicao" ? "rounded-xl border border-[var(--g3-border)] p-2" : "rounded-xl border border-[var(--g3-border)] p-3"}><p className="text-xs uppercase tracking-wide text-[var(--g3-muted)]">Nome</p><p className={abaAtiva === "composicao" ? "mt-0.5 truncate text-sm font-semibold" : "mt-1 font-semibold"}>{familiaForm.nome_familia || "Nova família"}</p></div><div className={abaAtiva === "composicao" ? "rounded-xl border border-[var(--g3-border)] p-2" : "rounded-xl border border-[var(--g3-border)] p-3"}><p className="text-xs uppercase tracking-wide text-[var(--g3-muted)]">Responsável</p><p className={abaAtiva === "composicao" ? "mt-0.5 truncate text-sm font-semibold" : "mt-1 font-semibold"}>{nomePessoa(membros.find((item) => item.responsavel_familiar)?.beneficiario)}</p></div><div className={abaAtiva === "composicao" ? "rounded-xl border border-[var(--g3-border)] p-2" : "rounded-xl border border-[var(--g3-border)] p-3"}><p className="text-xs uppercase tracking-wide text-[var(--g3-muted)]">Membros</p><p className={abaAtiva === "composicao" ? "mt-0.5 text-sm font-semibold" : "mt-1 font-semibold"}>{membros.length}</p></div><div className={abaAtiva === "composicao" ? "rounded-xl border border-[var(--g3-border)] p-2" : "rounded-xl border border-[var(--g3-border)] p-3"}><p className="text-xs uppercase tracking-wide text-[var(--g3-muted)]">Alertas</p><p className={abaAtiva === "composicao" ? "mt-0.5 text-sm font-semibold" : "mt-1 font-semibold"}>{alertas.length}</p></div></CardContent></Card>

          {abaAtiva === "listagem" ? <Card><CardHeader><CardTitle className="text-base">Listagem de famílias</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-12"><div className="sm:col-span-2 lg:col-span-5"><Label>Nome da família</Label><Input className="h-8 text-xs" value={filtros.nome_familia ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, nome_familia: event.target.value || undefined }))} placeholder="Buscar por nome da família" /></div><div className="lg:col-span-3"><Label>Município</Label><Input className="h-8 text-xs" value={filtros.municipio ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, municipio: event.target.value || undefined }))} placeholder="Buscar por município" /></div><div className="lg:col-span-2"><Label>Status</Label><Select className="h-8 text-xs" value={filtros.status ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, status: event.target.value || undefined }))}><option value="">Todos</option><option value="ATIVO">Ativo</option><option value="INATIVO">Inativo</option><option value="BLOQUEADO">Bloqueado</option></Select></div><div className="lg:col-span-2"><Label>Responsável</Label><Input className="h-8 text-xs" value={filtros.referencia ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, referencia: event.target.value || undefined }))} placeholder="Buscar responsável" /></div></div><Button type="button" variant="outline" className="w-full border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" onClick={() => setFiltros({ status: "ATIVO" })}>Limpar filtros</Button><div className="max-h-[420px] overflow-auto rounded-md border border-slate-200">{familiasQuery.isLoading ? <p className="p-3 text-sm text-slate-500">Carregando famílias...</p> : !familias.length ? <p className="p-3 text-sm text-slate-500">Nenhuma família encontrada.</p> : <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-2 py-2">Família</th><th className="px-2 py-2">Responsável</th><th className="px-2 py-2">Membros</th><th className="px-2 py-2">Município</th><th className="px-2 py-2">Status</th></tr></thead><tbody>{familias.map((item, indice) => <tr key={item.id_familia} className={`cursor-pointer border-t border-[var(--g3-border)] hover:bg-[var(--g3-primary-soft-hover)] ${item.id_familia === familiaIdSelecionada ? "bg-[var(--g3-primary-soft-hover)]" : indice % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-card-soft)]"}`} onClick={() => selecionarFamilia(item.id_familia)}><td className="px-2 py-2">{item.nome_familia}</td><td className="px-2 py-2">{item.referencia_familiar?.nome_completo || "Sem responsável"}</td><td className="px-2 py-2">{item.membros?.length ?? 0}</td><td className="px-2 py-2">{item.municipio ?? "---"}</td><td className="px-2 py-2"><Badge variant={(item.status ?? "ATIVO") === "ATIVO" ? "success" : (item.status ?? "ATIVO") === "INATIVO" ? "default" : "warning"}>{item.status ?? "ATIVO"}</Badge></td></tr>)}</tbody></table>}</div></CardContent></Card> : null}

          {abaAtiva === "resumo" ? <Card><CardHeader><CardTitle className="text-base">Resumo familiar</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{resumoCards.map((item) => <div key={item.titulo} className="rounded-xl border border-[var(--g3-border)] p-3"><p className="text-xs uppercase tracking-wide text-[var(--g3-muted)]">{item.titulo}</p><p className="mt-1 font-semibold">{String(item.valor)}</p></div>)}<div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Nome de referência</Label><Input value={familiaForm.nome_familia} onChange={(event) => setFamiliaForm((atual) => ({ ...atual, nome_familia: event.target.value }))} /></div><div className="space-y-1"><Label>Status</Label><Select value={familiaForm.status ?? "ATIVO"} onChange={(event) => setFamiliaForm((atual) => ({ ...atual, status: event.target.value as Familia["status"] }))}><option value="ATIVO">Ativo</option><option value="INATIVO">Inativo</option><option value="BLOQUEADO">Bloqueado</option></Select></div><div className="space-y-1"><Label>Renda familiar total</Label><Input value={familiaForm.renda_familiar_total ?? ""} onChange={(event) => setFamiliaForm((atual) => ({ ...atual, renda_familiar_total: event.target.value }))} /></div></CardContent></Card> : null}

          {abaAtiva === "composicao" ? (
            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <CardHeader className="shrink-0 py-3">
                <CardTitle className="text-base">Composição familiar</CardTitle>
              </CardHeader>
              <CardContent className="grid min-h-0 flex-1 gap-3 overflow-hidden xl:grid-cols-[280px_minmax(0,1fr)] [&_button]:h-8 [&_input]:h-8 [&_label]:text-xs [&_select]:h-8">
                <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
                  <Label>Buscar beneficiário</Label>
                  <Input value={buscaBeneficiario} onChange={(event) => setBuscaBeneficiario(event.target.value)} />
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {beneficiarios.map((beneficiario) => (
                      <div key={beneficiario.id_beneficiario} className="rounded-xl border border-[var(--g3-border)] p-2">
                        <p className="text-sm font-medium">{beneficiario.nome_completo}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => selecionarBeneficiario(beneficiario)}>Adicionar</Button>
                          <Button size="sm" onClick={() => selecionarBeneficiario(beneficiario, true)}>Definir responsável</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex min-h-0 flex-col gap-3 overflow-hidden pr-1">
                  <Card className="shrink-0 border-dashed">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">{membroEmEdicaoId ? "Editar membro" : "Novo membro"}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Beneficiário</Label>
                        <Input value={nomePessoa(membroForm.beneficiario)} readOnly />
                      </div>
                      <div className="space-y-1">
                        <Label>Parentesco</Label>
                        <Select value={membroForm.parentesco} onChange={(event) => setMembroForm((atual) => ({ ...atual, parentesco: event.target.value }))}>
                          <option value="">Selecione</option>
                          {parentescoOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                        </Select>
                      </div>
                      <label className="flex items-center gap-2 text-xs">
                        <Checkbox checked={Boolean(membroForm.responsavel_familiar)} disabled={Boolean(membros.find((item) => item.responsavel_familiar && item.id_beneficiario !== membroForm.id_beneficiario))} onChange={(event) => setMembroForm((atual) => ({ ...atual, responsavel_familiar: event.target.checked, parentesco: event.target.checked ? "Responsável familiar" : atual.parentesco }))} />
                        Responsável familiar
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <Checkbox checked={Boolean(membroForm.usa_endereco_familia)} onChange={(event) => setMembroForm((atual) => ({ ...atual, usa_endereco_familia: event.target.checked }))} />
                        Usa endereço da família
                      </label>
                      <div className="flex flex-wrap gap-2 md:col-span-2">
                        <Button onClick={() => void adicionarMembroLocal()} disabled={!membroForm.id_beneficiario}>{membroEmEdicaoId ? "Atualizar membro" : "Salvar membro"}</Button>
                        {membroEmEdicaoId ? <Button variant="outline" onClick={() => { setMembroForm(membroVazio); setMembroEmEdicaoId(undefined); }}>Cancelar edição</Button> : null}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <CardHeader className="shrink-0 py-3">
                      <CardTitle className="text-sm">Membros cadastrados</CardTitle>
                    </CardHeader>
                    <CardContent className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                      {membros.map((membro) => (
                        <div key={membro.id_beneficiario} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--g3-border)] px-3 py-2">
                          <div>
                            <p className="text-sm font-medium">{nomePessoa(membro.beneficiario)}</p>
                            <p className="text-xs text-[var(--g3-muted)]">{membro.parentesco}</p>
                            <p className="text-xs text-[var(--g3-muted)]">{membro.usa_endereco_familia ? "Herdará o endereço principal da família" : "Mantém endereço próprio"}</p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {membro.responsavel_familiar ? <Badge variant="success">Responsável</Badge> : null}
                            <Button size="sm" variant="outline" onClick={() => editarMembro(membro)}>Editar</Button>
                            <Button size="sm" variant="outline" onClick={() => void tornarResponsavel(membro)} disabled={membro.responsavel_familiar}>Tornar responsável</Button>
                            <Button size="sm" variant="danger" onClick={() => setMembros((atual) => atual.filter((item) => item.id_beneficiario !== membro.id_beneficiario))}>Remover</Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  {familiaIdSelecionada ? (
                    <Card className="shrink-0">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">Saída do núcleo familiar</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-2 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label>Membro</Label>
                          <Select value={membroTransferenciaId} onChange={(event) => setMembroTransferenciaId(event.target.value)}>
                            <option value="">Selecione</option>
                            {membros.filter((item) => !item.responsavel_familiar).map((item) => <option key={item.id_beneficiario} value={item.id_beneficiario}>{nomePessoa(item.beneficiario)}</option>)}
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>Transferir para família existente</Label>
                          <Select value={familiaDestinoId} onChange={(event) => setFamiliaDestinoId(event.target.value)}>
                            <option value="">Selecione</option>
                            {familias.filter((item) => item.id_familia !== familiaIdSelecionada).map((item) => <option key={item.id_familia} value={item.id_familia}>{item.nome_familia}</option>)}
                          </Select>
                        </div>
                        <div>
                          <Button variant="outline" onClick={() => void transferirParaOutraFamilia()} disabled={!membroTransferenciaId || !familiaDestinoId}>Transferir para outra família</Button>
                        </div>
                        <div className="space-y-1">
                          <Label>Ou criar nova família</Label>
                          <Input value={novoNomeFamilia} onChange={(event) => setNovoNomeFamilia(event.target.value)} placeholder="Nome da nova família" />
                        </div>
                        <div>
                          <Button variant="outline" onClick={() => void criarNovaFamiliaPorDesmembramento()} disabled={!membroTransferenciaId || !novoNomeFamilia.trim()}>Transformar em nova família</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {abaAtiva === "endereco" ? <Card><CardHeader><CardTitle className="text-base">Endereço e moradia</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2"><div className="space-y-1"><Label>Logradouro</Label><Input value={familiaForm.logradouro ?? ""} onChange={(event) => setFamiliaForm((atual) => ({ ...atual, logradouro: event.target.value }))} /></div><div className="space-y-1"><Label>Bairro</Label><Input value={familiaForm.bairro ?? ""} onChange={(event) => setFamiliaForm((atual) => ({ ...atual, bairro: event.target.value }))} /></div><div className="space-y-1"><Label>Município</Label><Input value={familiaForm.municipio ?? ""} onChange={(event) => setFamiliaForm((atual) => ({ ...atual, municipio: event.target.value }))} /></div><div className="space-y-1"><Label>UF</Label><Input value={familiaForm.uf ?? ""} onChange={(event) => setFamiliaForm((atual) => ({ ...atual, uf: event.target.value }))} /></div></CardContent></Card> : null}
          {abaAtiva === "renda" ? <Card><CardHeader><CardTitle className="text-base">Renda e perfil social</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2"><div className="space-y-1"><Label>Renda familiar total</Label><Input value={familiaForm.renda_familiar_total ?? ""} onChange={(event) => setFamiliaForm((atual) => ({ ...atual, renda_familiar_total: event.target.value }))} /></div><div className="space-y-1"><Label>Observações</Label><Input value={familiaForm.observacoes ?? ""} onChange={(event) => setFamiliaForm((atual) => ({ ...atual, observacoes: event.target.value }))} /></div></CardContent></Card> : null}
          {abaAtiva === "atendimentos" ? <Card><CardHeader><CardTitle className="text-base">Atendimentos</CardTitle></CardHeader><CardContent><p className="text-sm text-[var(--g3-muted)]">Aba reservada para integração com a Central de atendimentos.</p></CardContent></Card> : null}
          {abaAtiva === "beneficios" ? <Card><CardHeader><CardTitle className="text-base">Benefícios / concessões</CardTitle></CardHeader><CardContent><p className="text-sm text-[var(--g3-muted)]">{validacao?.mensagem || "Nenhuma duplicidade recente encontrada para cesta básica."}</p></CardContent></Card> : null}
          {abaAtiva === "historico" ? <Card><CardHeader><CardTitle className="text-base">Histórico de alterações</CardTitle></CardHeader><CardContent className="space-y-2">{historico.map((item) => <div key={item.id} className="rounded-xl border border-[var(--g3-border)] p-3"><p className="text-xs text-[var(--g3-muted)]">{item.data_evento}</p><p className="font-medium">{item.descricao}</p></div>)}{!historico.length ? <p className="text-sm text-[var(--g3-muted)]">Nenhum evento encontrado.</p> : null}</CardContent></Card> : null}
          {abaAtiva === "documentos" ? <Card><CardHeader><CardTitle className="text-base">Documentos / anexos</CardTitle></CardHeader><CardContent><p className="text-sm text-[var(--g3-muted)]">Estrutura preparada para anexos familiares.</p></CardContent></Card> : null}
        </section>
      </AdminPageLayout>
      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
    </>
  );
}

export default CadastroVinculoFamiliarPage;
