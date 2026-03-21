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
import { useFamilia, useFamiliaAlertas, useFamiliaHistorico, useFamilias, useRemoverFamilia, useSalvarFamilia, useValidacaoBeneficioFamiliar } from "@/features/familias/use-familias";
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
  const [buscaBeneficiario, setBuscaBeneficiario] = useState("");

  const familiasQuery = useFamilias(filtros);
  const familiaQuery = useFamilia(familiaIdSelecionada);
  const alertasQuery = useFamiliaAlertas(familiaIdSelecionada);
  const historicoQuery = useFamiliaHistorico(familiaIdSelecionada);
  const validacaoQuery = useValidacaoBeneficioFamiliar(familiaIdSelecionada, "Cesta básica");
  const salvarFamilia = useSalvarFamilia();
  const removerFamilia = useRemoverFamilia();
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
    setBuscaBeneficiario("");
    setAbaAtiva("composicao");
    void queryClient.removeQueries({ queryKey: ["familia"] });
  }

  function selecionarFamilia(id?: string) {
    setFamiliaIdSelecionada(id);
    setAbaAtiva("resumo");
  }

  function adicionarMembroLocal() {
    if (!membroForm.id_beneficiario || !membroForm.parentesco.trim()) {
      setPopup({ tipo: "erro", titulo: "Vínculo incompleto", texto: "Selecione o beneficiário e informe o parentesco." });
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
    setMembroForm(membroVazio);
  }

  function selecionarBeneficiario(beneficiario: Beneficiario, responsavel = false) {
    setMembroForm({
      id_beneficiario: String(beneficiario.id_beneficiario ?? ""),
      parentesco: responsavel ? "Responsável familiar" : "",
      responsavel_familiar: responsavel,
      usa_endereco_familia: true,
      beneficiario: { id_beneficiario: String(beneficiario.id_beneficiario ?? ""), nome_completo: beneficiario.nome_completo, nome_social: beneficiario.nome_social, codigo: beneficiario.codigo, cpf: beneficiario.cpf }
    });
    if (!familiaForm.nome_familia && responsavel) setFamiliaForm((atual) => ({ ...atual, nome_familia: `Família ${beneficiario.nome_completo}`.trim() }));
  }

  async function salvar() {
    const responsavel = membros.find((item) => item.responsavel_familiar);
    if (!familiaForm.nome_familia.trim()) return setPopup({ tipo: "erro", titulo: "Nome obrigatório", texto: "Informe o nome da família." });
    if (!membros.length) return setPopup({ tipo: "erro", titulo: "Composição obrigatória", texto: "Adicione pelo menos um membro." });
    if (!responsavel?.id_beneficiario) return setPopup({ tipo: "erro", titulo: "Responsável obrigatório", texto: "Defina um responsável familiar." });
    if (membros.some((item) => !item.parentesco?.trim())) return setPopup({ tipo: "erro", titulo: "Parentesco obrigatório", texto: "Todos os membros precisam ter parentesco." });
    try {
      const response = await salvarFamilia.mutateAsync({ ...familiaForm, id_familia: familiaIdSelecionada, id_referencia_familiar: responsavel.id_beneficiario, membros });
      setFamiliaIdSelecionada(response.familia.id_familia);
      setAbaAtiva("resumo");
      setPopup({ tipo: "sucesso", titulo: "Vínculo familiar salvo", texto: "A família foi salva com sucesso." });
    } catch (error) {
      setPopup({ tipo: "erro", titulo: "Erro ao salvar", texto: mensagemErroApi(error) });
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
        <section className="space-y-4">
          <Card><CardHeader><CardTitle className="text-base">Cabeçalho da família</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><div className="rounded-xl border border-[var(--g3-border)] p-3"><p className="text-xs uppercase tracking-wide text-[var(--g3-muted)]">Nome</p><p className="mt-1 font-semibold">{familiaForm.nome_familia || "Nova família"}</p></div><div className="rounded-xl border border-[var(--g3-border)] p-3"><p className="text-xs uppercase tracking-wide text-[var(--g3-muted)]">Responsável</p><p className="mt-1 font-semibold">{nomePessoa(membros.find((item) => item.responsavel_familiar)?.beneficiario)}</p></div><div className="rounded-xl border border-[var(--g3-border)] p-3"><p className="text-xs uppercase tracking-wide text-[var(--g3-muted)]">Membros</p><p className="mt-1 font-semibold">{membros.length}</p></div><div className="rounded-xl border border-[var(--g3-border)] p-3"><p className="text-xs uppercase tracking-wide text-[var(--g3-muted)]">Alertas</p><p className="mt-1 font-semibold">{alertas.length}</p></div></CardContent></Card>

          {abaAtiva === "listagem" ? <Card><CardHeader><CardTitle className="text-base">Listagem de famílias</CardTitle></CardHeader><CardContent className="space-y-3"><div className="grid gap-3 md:grid-cols-3"><div className="space-y-1"><Label>Nome</Label><Input value={filtros.nome_familia ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, nome_familia: event.target.value || undefined }))} /></div><div className="space-y-1"><Label>Município</Label><Input value={filtros.municipio ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, municipio: event.target.value || undefined }))} /></div><div className="space-y-1"><Label>Status</Label><Select value={filtros.status ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, status: event.target.value || undefined }))}><option value="">Todos</option><option value="ATIVO">Ativo</option><option value="INATIVO">Inativo</option><option value="BLOQUEADO">Bloqueado</option></Select></div></div><div className="grid gap-2">{familias.map((item) => <button key={item.id_familia} type="button" className={`rounded-xl border px-3 py-3 text-left ${item.id_familia === familiaIdSelecionada ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)]" : "border-[var(--g3-border)] bg-[var(--g3-card)]"}`} onClick={() => selecionarFamilia(item.id_familia)}><p className="font-semibold">{item.nome_familia}</p><p className="text-xs text-[var(--g3-muted)]">{item.referencia_familiar?.nome_completo || "Sem responsável"} • {item.status || "ATIVO"}</p></button>)}{!familias.length ? <p className="text-sm text-[var(--g3-muted)]">Nenhuma família encontrada.</p> : null}</div></CardContent></Card> : null}

          {abaAtiva === "resumo" ? <Card><CardHeader><CardTitle className="text-base">Resumo familiar</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{resumoCards.map((item) => <div key={item.titulo} className="rounded-xl border border-[var(--g3-border)] p-3"><p className="text-xs uppercase tracking-wide text-[var(--g3-muted)]">{item.titulo}</p><p className="mt-1 font-semibold">{String(item.valor)}</p></div>)}<div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Nome de referência</Label><Input value={familiaForm.nome_familia} onChange={(event) => setFamiliaForm((atual) => ({ ...atual, nome_familia: event.target.value }))} /></div><div className="space-y-1"><Label>Status</Label><Select value={familiaForm.status ?? "ATIVO"} onChange={(event) => setFamiliaForm((atual) => ({ ...atual, status: event.target.value as Familia["status"] }))}><option value="ATIVO">Ativo</option><option value="INATIVO">Inativo</option><option value="BLOQUEADO">Bloqueado</option></Select></div><div className="space-y-1"><Label>Renda familiar total</Label><Input value={familiaForm.renda_familiar_total ?? ""} onChange={(event) => setFamiliaForm((atual) => ({ ...atual, renda_familiar_total: event.target.value }))} /></div></CardContent></Card> : null}

          {abaAtiva === "composicao" ? <Card><CardHeader><CardTitle className="text-base">Composição familiar</CardTitle></CardHeader><CardContent className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]"><div className="space-y-2"><Label>Buscar beneficiário</Label><Input value={buscaBeneficiario} onChange={(event) => setBuscaBeneficiario(event.target.value)} />{beneficiarios.map((beneficiario) => <div key={beneficiario.id_beneficiario} className="rounded-xl border border-[var(--g3-border)] p-3"><p className="font-medium">{beneficiario.nome_completo}</p><div className="mt-2 flex gap-2"><Button size="sm" variant="outline" onClick={() => selecionarBeneficiario(beneficiario)}>Adicionar</Button><Button size="sm" onClick={() => selecionarBeneficiario(beneficiario, true)}>Definir responsável</Button></div></div>)}</div><div className="space-y-4"><Card className="border-dashed"><CardHeader><CardTitle className="text-sm">Novo membro</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2"><div className="space-y-1"><Label>Beneficiário</Label><Input value={nomePessoa(membroForm.beneficiario)} readOnly /></div><div className="space-y-1"><Label>Parentesco</Label><Select value={membroForm.parentesco} onChange={(event) => setMembroForm((atual) => ({ ...atual, parentesco: event.target.value }))}><option value="">Selecione</option>{parentescoOptions.map((item) => <option key={item} value={item}>{item}</option>)}</Select></div><label className="flex items-center gap-2 text-sm"><Checkbox checked={Boolean(membroForm.responsavel_familiar)} onChange={(event) => setMembroForm((atual) => ({ ...atual, responsavel_familiar: event.target.checked, parentesco: event.target.checked ? "Responsável familiar" : atual.parentesco }))} />Responsável familiar</label><label className="flex items-center gap-2 text-sm"><Checkbox checked={Boolean(membroForm.usa_endereco_familia)} onChange={(event) => setMembroForm((atual) => ({ ...atual, usa_endereco_familia: event.target.checked }))} />Usa endereço da família</label><div><Button onClick={adicionarMembroLocal} disabled={!membroForm.id_beneficiario}>Salvar membro</Button></div></CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Membros cadastrados</CardTitle></CardHeader><CardContent className="space-y-2">{membros.map((membro) => <div key={membro.id_beneficiario} className="flex items-center justify-between rounded-xl border border-[var(--g3-border)] px-3 py-2"><div><p className="font-medium">{nomePessoa(membro.beneficiario)}</p><p className="text-xs text-[var(--g3-muted)]">{membro.parentesco}</p></div><div className="flex gap-1">{membro.responsavel_familiar ? <Badge variant="success">Responsável</Badge> : null}<Button size="sm" variant="danger" onClick={() => setMembros((atual) => atual.filter((item) => item.id_beneficiario !== membro.id_beneficiario))}>Remover</Button></div></div>)}</CardContent></Card></div></CardContent></Card> : null}

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
