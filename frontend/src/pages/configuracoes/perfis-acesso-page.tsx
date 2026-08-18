import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  ListFilter,
  Plus,
  Save,
  Search,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import { CadastroSucessoModal } from "@/components/admin/cadastro-sucesso-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { httpClient } from "@/services/http-client";
import {
  classeBotaoAbaLateral,
  classeNumeroAbaLateral,
  classesTelaPadraoBeneficiario
} from "@/lib/tela-padrao-beneficiario";

type Permission = { codigo: string; moduloCodigo: string; modulo: string; recursoCodigo: string; recurso: string; acao: string };
type Profile = { id: string; nome: string; descricao?: string; ativo: boolean; administrativo: boolean; usuarios_vinculados: number; permissoes_concedidas: number };
type AbaId = "listagem" | "dados" | "permissoes" | "usuarios" | "auditoria";

const abas: { id: AbaId; label: string; icon: typeof ListFilter }[] = [
  { id: "listagem", label: "Listagem de perfis", icon: ListFilter },
  { id: "dados", label: "Dados do perfil", icon: FileText },
  { id: "permissoes", label: "Permissões", icon: ShieldCheck },
  { id: "usuarios", label: "Usuários vinculados", icon: UsersRound },
  { id: "auditoria", label: "Auditoria", icon: FileText }
];

const actionLabels: Record<string, string> = { VISUALIZAR: "Visualizar", INCLUIR: "Incluir", CRIAR: "Criar", ALTERAR: "Alterar", EDITAR: "Editar", EXCLUIR: "Excluir", IMPRIMIR: "Imprimir", EXPORTAR: "Exportar", APROVAR: "Aprovar", CANCELAR: "Cancelar", REABRIR: "Reabrir", EXECUTAR: "Executar", ADMINISTRAR: "Administrar" };

function label(value: string) {
  return value.toLocaleLowerCase("pt-BR").replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
}

export function PerfisAcessoPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [catalog, setCatalog] = useState<Permission[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("listagem");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [administrative, setAdministrative] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [profileQuery, setProfileQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState<{ aberto: boolean; numero?: string }>({ aberto: false });

  const load = async () => {
    setLoading(true);
    try {
      const [profilesResponse, catalogResponse] = await Promise.all([
        httpClient.get<{ perfis: Profile[] }>("/api/perfis-acesso"),
        httpClient.get<{ permissoes: Permission[] }>("/api/perfis-acesso/catalogo")
      ]);
      setProfiles(profilesResponse.data.perfis);
      setCatalog(catalogResponse.data.permissoes);
    } catch (error) {
      setMessage((error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Não foi possível carregar os perfis de acesso.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filteredProfiles = useMemo(() => profiles.filter((profile) => !profileQuery || `${profile.nome} ${profile.descricao ?? ""}`.toLocaleLowerCase("pt-BR").includes(profileQuery.toLocaleLowerCase("pt-BR"))), [profiles, profileQuery]);
  const grouped = useMemo(() => {
    const result: Record<string, Record<string, Permission[]>> = {};
    catalog.filter((permission) => !query || `${permission.modulo} ${permission.recurso} ${permission.codigo}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))).forEach((permission) => {
      result[permission.moduloCodigo] ??= {};
      result[permission.moduloCodigo][permission.recursoCodigo] ??= [];
      result[permission.moduloCodigo][permission.recursoCodigo].push(permission);
    });
    return result;
  }, [catalog, query]);
  const resources = Object.values(grouped).flatMap((items) => Object.values(items));
  const functionalityCount = resources.filter((items) => items.some((permission) => codes.includes(permission.codigo))).length;
  const abaAtual = abas.find((aba) => aba.id === abaAtiva) ?? abas[0];

  function newProfile() {
    setSelected(null); setName(""); setDescription(""); setCodes([]); setActive(true); setAdministrative(false); setMessage(""); setAbaAtiva("dados");
  }

  async function openProfile(profile: Profile) {
    try {
      const response = await httpClient.get<{ perfil: Profile; permissoes: string[] }>(`/api/perfis-acesso/${profile.id}`);
      setSelected(profile); setName(response.data.perfil.nome); setDescription(response.data.perfil.descricao ?? ""); setActive(response.data.perfil.ativo); setAdministrative(response.data.perfil.administrativo); setCodes(response.data.permissoes); setMessage(""); setAbaAtiva("dados");
    } catch (error) {
      setMessage((error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Não foi possível abrir o perfil.");
    }
  }

  function togglePermission(permission: Permission) {
    const hasPermission = codes.includes(permission.codigo);
    let next = hasPermission ? codes.filter((code) => code !== permission.codigo) : [...codes, permission.codigo];
    if (!hasPermission && permission.acao !== "VISUALIZAR") {
      const view = catalog.find((item) => item.recursoCodigo === permission.recursoCodigo && item.acao === "VISUALIZAR");
      if (view && !next.includes(view.codigo)) next.push(view.codigo);
    }
    setCodes([...new Set(next)]);
  }

  function bulk(mode: "none" | "view" | "all") {
    setCodes(mode === "none" ? [] : catalog.filter((permission) => mode === "all" || permission.acao === "VISUALIZAR").map((permission) => permission.codigo));
  }

  async function save() {
    if (!name.trim()) { setMessage("Informe o nome do perfil."); setAbaAtiva("dados"); return; }
    if (!window.confirm(`Salvar alterações do perfil "${name.trim()}"?`)) return;
    setSaving(true); setMessage("");
    try {
      const body = { nome: name, descricao: description, ativo: active, administrativo: administrative, permissoes: codes };
      const response = selected ? await httpClient.put<{ perfil?: { id?: string } }>(`/api/perfis-acesso/${selected.id}`, body) : await httpClient.post<{ perfil?: { id?: string } }>("/api/perfis-acesso", body);
      await load();
      setSuccess({ aberto: true, numero: response.data.perfil?.id ?? selected?.id });
      setMessage("");
    } catch (error) {
      setMessage((error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Não foi possível salvar o perfil.");
    } finally { setSaving(false); }
  }

  async function duplicate(profile: Profile) {
    if (window.confirm(`Duplicar o perfil "${profile.nome}"?`)) { await httpClient.post(`/api/perfis-acesso/${profile.id}/duplicar`); await load(); }
  }

  async function toggleStatus(profile: Profile) {
    try { await httpClient.patch(`/api/perfis-acesso/${profile.id}/status`); await load(); } catch (error) { setMessage((error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Não foi possível alterar o status."); }
  }

  return (
    <main className={classesTelaPadraoBeneficiario.container}>
      <section className={classesTelaPadraoBeneficiario.barraAcoes} data-print="toolbar">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">Configurações / Segurança</p><h1 className="text-sm font-semibold tracking-tight text-[var(--g3-foreground)] sm:text-base">Perfis de acesso</h1></div>
          <div className={classesTelaPadraoBeneficiario.gradeAcoes}>
            <Button type="button" variant="outline" size="sm" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={() => setAbaAtiva("listagem")}><Search className="mr-1.5 h-3.5 w-3.5" />Buscar</Button>
            <Button type="button" size="sm" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={newProfile}><Plus className="mr-1.5 h-3.5 w-3.5" />Novo</Button>
            <Button type="button" size="sm" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={() => void save()} disabled={saving}><Save className="mr-1.5 h-3.5 w-3.5" />{saving ? "Salvando..." : "Salvar"}</Button>
            <Button type="button" variant="outline" size="sm" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={() => { setSelected(null); setAbaAtiva("listagem"); }}><span aria-hidden="true">↩</span><span className="ml-1.5">Cancelar</span></Button>
            {selected ? <Button type="button" variant="danger" size="sm" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={() => void toggleStatus(selected)}>{selected.ativo ? "Inativar" : "Ativar"}</Button> : null}
          </div>
        </div>
      </section>

      <div className={classesTelaPadraoBeneficiario.gradePrincipal} data-print="layout-grid">
        <Card className={classesTelaPadraoBeneficiario.cardAbas} data-print="tabs"><CardContent className={classesTelaPadraoBeneficiario.conteudoAbas}>{abas.map((aba, index) => { const Icon = aba.icon; return <button key={aba.id} type="button" onClick={() => setAbaAtiva(aba.id)} className={classeBotaoAbaLateral(abaAtiva === aba.id)}><span className={classeNumeroAbaLateral(abaAtiva === aba.id)} aria-hidden="true">{index + 1}</span><Icon className="mt-0.5 mr-1 h-3.5 w-3.5" aria-hidden="true" /><span>{aba.label}</span></button>; })}</CardContent></Card>

        <Card className={classesTelaPadraoBeneficiario.cardConteudo}>
          <CardHeader className={classesTelaPadraoBeneficiario.cabecalhoConteudo}><div className={classesTelaPadraoBeneficiario.tituloAba}><abaAtual.icon className="h-4 w-4" aria-hidden="true" /><CardTitle className={classesTelaPadraoBeneficiario.tituloAbaTexto}>{abaAtual.label}</CardTitle></div>{selected ? <span className="text-xs text-[var(--g3-muted)]">Perfil: {selected.nome}</span> : null}</CardHeader>
          <CardContent className="space-y-3 p-3">
            {abaAtiva === "listagem" && <>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><Input value={profileQuery} onChange={(event) => setProfileQuery(event.target.value)} placeholder="Nome do perfil ou descrição" aria-label="Pesquisar perfil" /><Button type="button" variant="outline" onClick={() => setProfileQuery("")}>Limpar filtros</Button></div>
              {loading ? <p className="text-sm text-[var(--g3-muted)]">Carregando perfis...</p> : filteredProfiles.length === 0 ? <p className="rounded-md border border-[var(--g3-border)] p-4 text-sm text-[var(--g3-muted)]">Nenhum perfil encontrado.</p> : <div className="overflow-auto rounded-lg border border-[var(--g3-border)]"><div className="min-w-[680px]"><div className="grid grid-cols-[minmax(180px,2fr)_minmax(160px,2fr)_100px_120px_150px] bg-[var(--g3-primary-soft)] px-3 py-2 text-xs font-semibold text-[var(--g3-active)]"><span>Perfil</span><span>Descrição</span><span>Usuários</span><span>Status</span><span>Ações</span></div>{filteredProfiles.map((profile, index) => <div key={profile.id} className={`grid grid-cols-[minmax(180px,2fr)_minmax(160px,2fr)_100px_120px_150px] items-center gap-2 border-t border-[var(--g3-border)] px-3 py-2 text-sm ${index % 2 === 0 ? "bg-white" : "bg-[var(--g3-primary-soft)]/30"} ${selected?.id === profile.id ? "ring-1 ring-inset ring-[var(--g3-active)]" : ""}`}><button type="button" className="truncate text-left font-semibold text-[var(--g3-active)] hover:underline" onClick={() => void openProfile(profile)}>{profile.nome}</button><span className="truncate text-xs text-[var(--g3-muted)]">{profile.descricao || "---"}</span><span className="text-xs text-[var(--g3-muted)]">{profile.usuarios_vinculados}</span><span className={profile.ativo ? "text-xs font-semibold text-emerald-700" : "text-xs text-slate-500"}>{profile.ativo ? "Ativo" : "Inativo"}</span><span className="flex gap-2"><button type="button" className="text-xs font-semibold text-[var(--g3-active)] hover:underline" onClick={() => void duplicate(profile)}><Copy className="mr-1 inline h-3 w-3" />Duplicar</button><button type="button" className="text-xs text-[var(--g3-muted)] hover:underline" onClick={() => void toggleStatus(profile)}>{profile.ativo ? "Inativar" : "Ativar"}</button></span></div>)}</div></div>}
            </>}

            {abaAtiva === "dados" && <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-[var(--g3-active)]">Nome do perfil*<Input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-9" /></label><label className="text-xs font-semibold text-[var(--g3-active)]">Descrição<Input value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 h-9" /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />Ativo</label><label className="flex items-center gap-2 text-sm" title="Perfis administrativos podem administrar acessos da instituição"><input type="checkbox" checked={administrative} onChange={(event) => setAdministrative(event.target.checked)} />Perfil administrativo</label><div className="sm:col-span-2 rounded-md border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/30 p-3 text-xs text-[var(--g3-muted)]">Defina um nome claro para o perfil. O nome é único dentro da instituição.</div></div>}

            {abaAtiva === "permissoes" && <>
              <div className="flex flex-wrap items-center gap-2 border-b border-[var(--g3-border)] pb-3"><div className="relative min-w-[240px] flex-1"><Search className="absolute left-2 top-2 h-4 w-4 text-slate-400" /><Input className="pl-8" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar módulo ou funcionalidade..." /></div><Button size="sm" variant="outline" onClick={() => bulk("view")}>Somente visualização</Button><Button size="sm" variant="outline" onClick={() => bulk("all")}>Acesso completo</Button><Button size="sm" variant="ghost" onClick={() => bulk("none")}>Desmarcar tudo</Button></div>
              <div className="flex flex-wrap gap-4 text-xs text-[var(--g3-muted)]"><span>{resources.length} funcionalidades disponíveis</span><span>{functionalityCount} com acesso</span><span>{codes.length} permissões concedidas</span></div>
              <div className="space-y-2">{Object.entries(grouped).map(([moduleCode, moduleResources]) => { const moduleCodes = Object.values(moduleResources).flat().map((permission) => permission.codigo); const checked = moduleCodes.length > 0 && moduleCodes.every((code) => codes.includes(code)); const partial = moduleCodes.some((code) => codes.includes(code)) && !checked; return <div key={moduleCode} className="rounded-lg border border-[var(--g3-border)]"><div className="flex items-center gap-2 bg-[var(--g3-primary-soft)] p-3 text-left font-semibold text-[var(--g3-active)]"><button type="button" aria-label={`${open[moduleCode] ? "Recolher" : "Expandir"} ${label(moduleCode)}`} className="rounded p-1" onClick={() => setOpen((old) => ({ ...old, [moduleCode]: !old[moduleCode] }))}>{open[moduleCode] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button><input aria-label={`Selecionar ${label(moduleCode)}`} type="checkbox" checked={checked} ref={(element) => { if (element) element.indeterminate = partial; }} onChange={() => setCodes((old) => checked ? old.filter((code) => !moduleCodes.includes(code)) : [...new Set([...old, ...moduleCodes])])} /><span>{label(moduleCode)}</span><span className="ml-auto text-xs font-normal text-[var(--g3-muted)]">{moduleCodes.filter((code) => codes.includes(code)).length}/{moduleCodes.length}</span></div>{open[moduleCode] ? <div className="space-y-2 border-t p-3">{Object.entries(moduleResources).map(([resourceCode, permissions]) => <div key={resourceCode} className="rounded-md bg-[var(--g3-card-soft)] p-3"><div className="mb-2 font-medium">{label(resourceCode)}</div><div className="flex flex-wrap gap-3">{permissions.map((permission) => <label key={permission.codigo} className="text-sm" title={permission.acao === "VISUALIZAR" ? "Permite consultar informações e abrir registros." : "Permite executar esta operação quando aplicável."}><input type="checkbox" checked={codes.includes(permission.codigo)} onChange={() => togglePermission(permission)} className="mr-1.5" />{actionLabels[permission.acao] ?? permission.acao}</label>)}</div></div>)}</div> : null}</div>; })}</div>
            </>}

            {abaAtiva === "usuarios" && <div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/30 p-4 text-sm text-[var(--g3-muted)]">{selected ? `${selected.usuarios_vinculados} usuário(s) vinculado(s) a este perfil. A gestão detalhada continua disponível no cadastro de usuários.` : "Selecione um perfil para visualizar os usuários vinculados."}</div>}
            {abaAtiva === "auditoria" && <div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/30 p-4 text-sm text-[var(--g3-muted)]">O histórico de alterações será exibido aqui quando houver registros de auditoria para o perfil selecionado.</div>}
            {message ? <p className="text-sm text-red-600" role="alert">{message}</p> : null}
            <div className="flex justify-end border-t border-[var(--g3-border)] pt-3"><Button type="button" onClick={() => void save()} disabled={saving || abaAtiva === "listagem"}><Check className="mr-1.5 h-4 w-4" />Salvar perfil</Button></div>
          </CardContent>
        </Card>
      </div>
      <CadastroSucessoModal aberto={success.aberto} titulo={selected ? "Perfil de acesso atualizado" : "Perfil de acesso criado"} numero={success.numero} onClose={() => setSuccess({ aberto: false })} />
    </main>
  );
}
