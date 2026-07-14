import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  KeyRound,
  ListFilter,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  ShieldCheck,
  Unlock
} from "lucide-react";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatarCnpj, formatarTelefone, normalizarCnpj, normalizarTelefone } from "@/lib/br-utils";
import { instituicoesService } from "@/services/instituicoes.service";
import type {
  InstituicaoPayload,
  InstituicaoPlano,
  InstituicaoResumo,
  InstituicaoStatus
} from "@/types/instituicao";

const tabs: AdminTab[] = [
  { id: "listagem", label: "Listagem de instituições", icon: ListFilter },
  { id: "cadastro", label: "Cadastro do tenant", icon: Building2 },
  { id: "acesso", label: "Administração inicial", icon: ShieldCheck }
];

type TabId = (typeof tabs)[number]["id"];

type FormState = {
  id?: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  slug: string;
  codigo: string;
  email: string;
  telefone: string;
  endereco: string;
  plano: InstituicaoPlano;
  status: InstituicaoStatus;
  logo_url: string;
  cor_tema: string;
  admin_nome: string;
  admin_nome_usuario: string;
  admin_email: string;
  admin_senha: string;
};

const formInicial: FormState = {
  cnpj: "",
  razao_social: "",
  nome_fantasia: "",
  slug: "",
  codigo: "",
  email: "",
  telefone: "",
  endereco: "",
  plano: "essencial",
  status: "ativo",
  logo_url: "",
  cor_tema: "",
  admin_nome: "",
  admin_nome_usuario: "",
  admin_email: "",
  admin_senha: ""
};

function gerarSlugInstituicao(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function gerarCodigoInstituicao(valor: string) {
  const palavras = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (!palavras.length) return "";

  const iniciais = palavras.map((palavra) => palavra[0]).join("").slice(0, 6);
  if (iniciais.length >= 3) return iniciais;

  const compacto = palavras.join("").slice(0, 6);
  return compacto || iniciais;
}

function mapInstituicaoParaForm(instituicao: InstituicaoResumo): FormState {
  return {
    id: instituicao.id,
    cnpj: instituicao.cnpj,
    razao_social: instituicao.razao_social,
    nome_fantasia: instituicao.nome_fantasia ?? "",
    slug: instituicao.slug,
    codigo: instituicao.codigo ?? "",
    email: instituicao.email ?? "",
    telefone: instituicao.telefone ?? "",
    endereco: instituicao.endereco ?? "",
    plano: instituicao.plano,
    status: instituicao.status,
    logo_url: instituicao.logo_url ?? "",
    cor_tema: instituicao.cor_tema ?? "",
    admin_nome: "",
    admin_nome_usuario: "",
    admin_email: "",
    admin_senha: ""
  };
}

function formatarDataHora(valor?: string) {
  if (!valor) return "---";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "---";
  return data.toLocaleString("pt-BR");
}

function tituloPlano(plano: InstituicaoPlano) {
  return {
    essencial: "Essencial",
    profissional: "Profissional",
    avancado: "Avançado",
    premium: "Premium",
    enterprise: "Enterprise"
  }[plano];
}

function tituloStatus(status: InstituicaoStatus) {
  return {
    ativo: "Ativo",
    inativo: "Inativo",
    bloqueado: "Bloqueado"
  }[status];
}

export function MasterInstituicoesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>("listagem");
  const [selecionada, setSelecionada] = useState<InstituicaoResumo | null>(null);
  const [form, setForm] = useState<FormState>(formInicial);
  const [filtro, setFiltro] = useState("");
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [emailReset, setEmailReset] = useState("");
  const [novaSenhaReset, setNovaSenhaReset] = useState("");
  const [slugEditadoManual, setSlugEditadoManual] = useState(false);
  const [codigoEditadoManual, setCodigoEditadoManual] = useState(false);

  const instituicoesQuery = useQuery({
    queryKey: ["master-instituicoes"],
    queryFn: () => instituicoesService.listar()
  });

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const payload: InstituicaoPayload = {
        cnpj: normalizarCnpj(form.cnpj),
        razao_social: form.razao_social.trim(),
        nome_fantasia: form.nome_fantasia.trim() || undefined,
        slug: form.slug.trim().toLowerCase(),
        codigo: form.codigo.trim() || undefined,
        email: form.email.trim().toLowerCase() || undefined,
        telefone: normalizarTelefone(form.telefone) || undefined,
        endereco: form.endereco.trim() || undefined,
        plano: form.plano,
        status: form.status,
        logo_url: form.logo_url.trim() || undefined,
        cor_tema: form.cor_tema.trim() || undefined
      };

      if (!form.id) {
        payload.admin_inicial = {
          nome: form.admin_nome.trim(),
          nome_usuario: form.admin_nome_usuario.trim(),
          email: form.admin_email.trim().toLowerCase(),
          senha: form.admin_senha
        };
        return instituicoesService.criar(payload);
      }

      return instituicoesService.atualizar(form.id, payload);
    },
    onSuccess: async (instituicao) => {
      await queryClient.invalidateQueries({ queryKey: ["master-instituicoes"] });
      setSelecionada(instituicao);
      setForm(mapInstituicaoParaForm(instituicao));
      setPopup({
        tipo: "sucesso",
        titulo: "Instituição salva",
        texto: "Os dados do tenant foram atualizados com sucesso."
      });
      setActiveTab("cadastro");
    },
    onError: (error: any) => {
      setPopup({
        tipo: "erro",
        titulo: "Falha ao salvar",
        texto: error?.response?.data?.message ?? error?.response?.data?.mensagem ?? "Não foi possível salvar a instituição."
      });
    }
  });

  const resetarAdminMutation = useMutation({
    mutationFn: async () => {
      if (!selecionada?.id) {
        throw new Error("Selecione uma instituição primeiro.");
      }
      return instituicoesService.resetarAdmin(selecionada.id, {
        email: emailReset.trim() || undefined,
        nova_senha: novaSenhaReset
      });
    },
    onSuccess: () => {
      setNovaSenhaReset("");
      setPopup({
        tipo: "sucesso",
        titulo: "Senha redefinida",
        texto: "A senha do administrador inicial foi redefinida com sucesso."
      });
    },
    onError: (error: any) => {
      setPopup({
        tipo: "erro",
        titulo: "Falha ao redefinir senha",
        texto:
          error?.response?.data?.message ??
          error?.response?.data?.mensagem ??
          "Não foi possível redefinir a senha do administrador."
      });
    }
  });

  const desbloquearAcessoMutation = useMutation({
    mutationFn: async () => {
      if (!selecionada?.id) {
        throw new Error("Selecione uma instituiÃ§Ã£o primeiro.");
      }
      return instituicoesService.desbloquearAcesso(selecionada.id);
    },
    onSuccess: async (resultado) => {
      await queryClient.invalidateQueries({ queryKey: ["master-instituicoes"] });
      setForm((current) => ({
        ...current,
        status: current.status === "bloqueado" ? "ativo" : current.status
      }));
      setSelecionada((current) =>
        current ? { ...current, status: current.status === "bloqueado" ? "ativo" : current.status } : current
      );
      setPopup({
        tipo: "sucesso",
        titulo: "Acesso desbloqueado",
        texto: `InstituiÃ§Ã£o desbloqueada: ${resultado.instituicoes_desbloqueadas}. UsuÃ¡rios desbloqueados: ${resultado.usuarios_desbloqueados}.`
      });
    },
    onError: (error: any) => {
      setPopup({
        tipo: "erro",
        titulo: "Falha ao desbloquear",
        texto:
          error?.response?.data?.message ??
          error?.response?.data?.mensagem ??
          "NÃ£o foi possÃ­vel desbloquear o acesso."
      });
    }
  });

  const instituicoesFiltradas = useMemo(() => {
    const termo = filtro.trim().toLowerCase();
    const dados = instituicoesQuery.data ?? [];
    if (!termo) return dados;
    return dados.filter((item) =>
      [
        item.razao_social,
        item.nome_fantasia,
        item.cnpj,
        item.slug,
        item.codigo,
        item.email
      ]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termo))
    );
  }, [filtro, instituicoesQuery.data]);

  const actions: AdminAction[] = [
    {
      id: "novo",
      label: "Nova instituição",
      icon: Plus,
      variant: "outline",
      onClick: () => {
        setSelecionada(null);
        setForm(formInicial);
        setSlugEditadoManual(false);
        setCodigoEditadoManual(false);
        setEmailReset("");
        setNovaSenhaReset("");
        setActiveTab("cadastro");
      }
    },
    {
      id: "salvar",
      label: "Salvar tenant",
      icon: Save,
      variant: "default",
      disabled: salvarMutation.isPending,
      onClick: () => {
        const cnpjNormalizado = normalizarCnpj(form.cnpj);
        if (cnpjNormalizado.length !== 14) {
          setPopup({ tipo: "aviso", titulo: "CNPJ obrigatório", texto: "Informe um CNPJ válido para continuar." });
          return;
        }
        if (!form.razao_social.trim() || !form.slug.trim()) {
          setPopup({
            tipo: "aviso",
            titulo: "Campos obrigatórios",
            texto: "Preencha ao menos razão social e slug da instituição."
          });
          return;
        }
        if (!form.id && (!form.admin_nome.trim() || !form.admin_nome_usuario.trim() || !form.admin_email.trim() || !form.admin_senha.trim())) {
          setPopup({
            tipo: "aviso",
            titulo: "Administração inicial obrigatória",
            texto: "Ao criar um tenant novo, informe os dados do administrador inicial."
          });
          setActiveTab("acesso");
          return;
        }
        salvarMutation.mutate();
      }
    },
    {
      id: "atualizar",
      label: "Atualizar lista",
      icon: RefreshCcw,
      variant: "outline",
      disabled: instituicoesQuery.isFetching,
      onClick: () => void instituicoesQuery.refetch()
    },
    {
      id: "resetar-admin",
      label: "Resetar senha admin",
      icon: KeyRound,
      variant: "outline",
      disabled: !selecionada?.id || resetarAdminMutation.isPending,
      onClick: () => {
        if (!selecionada?.id) {
          setPopup({
            tipo: "aviso",
            titulo: "Seleção obrigatória",
            texto: "Selecione uma instituição antes de redefinir a senha do administrador."
          });
          return;
        }
        if (!novaSenhaReset.trim()) {
          setPopup({
            tipo: "aviso",
            titulo: "Nova senha obrigatória",
            texto: "Informe a nova senha na aba Administração inicial."
          });
          setActiveTab("acesso");
          return;
        }
        resetarAdminMutation.mutate();
      }
    },
    {
      id: "desbloquear-acesso",
      label: "Desbloquear acesso",
      icon: Unlock,
      variant: "outline",
      disabled: !selecionada?.id || desbloquearAcessoMutation.isPending,
      onClick: () => {
        if (!selecionada?.id) {
          setPopup({
            tipo: "aviso",
            titulo: "SeleÃ§Ã£o obrigatÃ³ria",
            texto: "Selecione uma instituiÃ§Ã£o antes de desbloquear o acesso."
          });
          return;
        }
        desbloquearAcessoMutation.mutate();
      }
    }
  ];

  return (
    <>
      <AdminPageLayout
        tabs={tabs}
        activeTab={activeTab}
        onChangeTab={(tabId) => setActiveTab(tabId as TabId)}
        actions={actions}
        sectionLabel="Painel master"
        pageTitle="Clientes registrados"
        activeTitle={
          activeTab === "listagem"
            ? "Listagem de tenants"
            : activeTab === "cadastro"
              ? "Cadastro do tenant"
              : "Administração inicial"
        }
        activeIcon={activeTab === "acesso" ? ShieldCheck : activeTab === "cadastro" ? Pencil : Building2}
        codeBadge={selecionada ? `Tenant ${selecionada.tenant_id.slice(0, 8)}` : "Novo tenant"}
      >
        {activeTab === "listagem" && (
          <div className="space-y-3">
            <Card>
              <CardContent className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <Label htmlFor="filtro-instituicao">Buscar instituição</Label>
                  <Input
                    id="filtro-instituicao"
                    value={filtro}
                    onChange={(event) => setFiltro(event.target.value)}
                    placeholder="Razão social, nome fantasia, CNPJ, slug ou e-mail"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" variant="outline" onClick={() => setFiltro("")}>
                    Limpar filtros
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="overflow-hidden rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)]">
              <div className="max-h-[460px] overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-[var(--g3-card-soft)] text-left text-xs uppercase tracking-wide text-[var(--g3-muted)]">
                    <tr>
                      <th className="px-3 py-2">Instituição</th>
                      <th className="px-3 py-2">CNPJ</th>
                      <th className="px-3 py-2">Plano</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Usuários</th>
                      <th className="px-3 py-2">Último acesso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {instituicoesFiltradas.map((item) => {
                      const selecionado = selecionada?.id === item.id;
                      return (
                        <tr
                          key={item.id}
                          className={`cursor-pointer border-t border-[var(--g3-border)] ${
                            selecionado ? "bg-[var(--g3-primary-soft)]" : "hover:bg-[var(--g3-card-soft)]"
                          }`}
                          onClick={() => {
                            setSelecionada(item);
                            setForm(mapInstituicaoParaForm(item));
                            setSlugEditadoManual(true);
                            setCodigoEditadoManual(true);
                            setEmailReset(item.email ?? "");
                            setNovaSenhaReset("");
                            setActiveTab("cadastro");
                          }}
                        >
                          <td className="px-3 py-2">
                            <div>
                              <p className="font-medium text-[var(--g3-foreground)]">{item.nome_fantasia || item.razao_social}</p>
                              <p className="text-xs text-[var(--g3-muted)]">{item.slug}</p>
                            </div>
                          </td>
                          <td className="px-3 py-2">{formatarCnpj(item.cnpj)}</td>
                          <td className="px-3 py-2">{tituloPlano(item.plano)}</td>
                          <td className="px-3 py-2">{tituloStatus(item.status)}</td>
                          <td className="px-3 py-2">{item.quantidade_usuarios}</td>
                          <td className="px-3 py-2">{formatarDataHora(item.ultimo_acesso_em)}</td>
                        </tr>
                      );
                    })}
                    {!instituicoesFiltradas.length && (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-sm text-[var(--g3-muted)]">
                          Nenhuma instituição encontrada para os filtros informados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "cadastro" && (
          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Identificação do tenant</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div>
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    inputMode="numeric"
                    value={formatarCnpj(form.cnpj)}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, cnpj: normalizarCnpj(event.target.value).slice(0, 14) }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="razao_social">Razão social</Label>
                  <Input
                    id="razao_social"
                    value={form.razao_social}
                    onChange={(event) =>
                      setForm((current) => {
                        const razaoSocial = event.target.value;
                        return {
                          ...current,
                          razao_social: razaoSocial,
                          slug: slugEditadoManual ? current.slug : gerarSlugInstituicao(razaoSocial),
                          codigo: codigoEditadoManual ? current.codigo : gerarCodigoInstituicao(razaoSocial)
                        };
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="nome_fantasia">Nome fantasia</Label>
                  <Input
                    id="nome_fantasia"
                    value={form.nome_fantasia}
                    onChange={(event) => setForm((current) => ({ ...current, nome_fantasia: event.target.value }))}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      value={form.slug}
                      onChange={(event) => {
                        setSlugEditadoManual(true);
                        setForm((current) => ({
                          ...current,
                          slug: event.target.value.toLowerCase().replace(/\s+/g, "-")
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="codigo">Código da instituição</Label>
                    <Input
                      id="codigo"
                      value={form.codigo}
                      onChange={(event) => {
                        setCodigoEditadoManual(true);
                        setForm((current) => ({
                          ...current,
                          codigo: event.target.value.toUpperCase().replace(/\s+/g, "")
                        }));
                      }}
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label htmlFor="plano">Plano contratado</Label>
                    <Select
                      id="plano"
                      value={form.plano}
                      onChange={(event) => setForm((current) => ({ ...current, plano: event.target.value as InstituicaoPlano }))}
                    >
                      <option value="essencial">Essencial</option>
                      <option value="profissional">Profissional</option>
                      <option value="avancado">Avançado</option>
                      <option value="premium">Premium</option>
                      <option value="enterprise">Enterprise</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      id="status"
                      value={form.status}
                      onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as InstituicaoStatus }))}
                    >
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                      <option value="bloqueado">Bloqueado</option>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Contato e identidade visual</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div>
                  <Label htmlFor="email">E-mail principal</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formatarTelefone(form.telefone)}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, telefone: normalizarTelefone(event.target.value).slice(0, 11) }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={form.endereco}
                    onChange={(event) => setForm((current) => ({ ...current, endereco: event.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="logo_url">Caminho da logomarca</Label>
                  <Input
                    id="logo_url"
                    value={form.logo_url}
                    onChange={(event) => setForm((current) => ({ ...current, logo_url: event.target.value }))}
                    placeholder="/storage/instituicoes/documentos/logo.png"
                  />
                </div>
                <div>
                  <Label htmlFor="cor_tema">Cor do tema</Label>
                  <Input
                    id="cor_tema"
                    value={form.cor_tema}
                    onChange={(event) => setForm((current) => ({ ...current, cor_tema: event.target.value }))}
                    placeholder="#0f766e"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "acesso" && (
          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {form.id ? "Reset de administrador" : "Administrador inicial"}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {!form.id ? (
                  <>
                    <div>
                      <Label htmlFor="admin_nome">Nome completo</Label>
                      <Input
                        id="admin_nome"
                        value={form.admin_nome}
                        onChange={(event) => setForm((current) => ({ ...current, admin_nome: event.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin_nome_usuario">Login inicial</Label>
                      <Input
                        id="admin_nome_usuario"
                        value={form.admin_nome_usuario}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, admin_nome_usuario: event.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin_email">E-mail do administrador</Label>
                      <Input
                        id="admin_email"
                        type="email"
                        value={form.admin_email}
                        onChange={(event) => setForm((current) => ({ ...current, admin_email: event.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin_senha">Senha inicial</Label>
                      <Input
                        id="admin_senha"
                        type="password"
                        value={form.admin_senha}
                        onChange={(event) => setForm((current) => ({ ...current, admin_senha: event.target.value }))}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="email_reset">E-mail do administrador</Label>
                      <Input
                        id="email_reset"
                        type="email"
                        value={emailReset}
                        onChange={(event) => setEmailReset(event.target.value)}
                        placeholder="Opcional para localizar o admin específico"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nova_senha_reset">Nova senha provisória</Label>
                      <Input
                        id="nova_senha_reset"
                        type="password"
                        value={novaSenhaReset}
                        onChange={(event) => setNovaSenhaReset(event.target.value)}
                      />
                    </div>
                    <p className="text-xs text-[var(--g3-muted)]">
                      Ao redefinir a senha, o sistema marca o usuário para troca obrigatória no próximo acesso.
                    </p>
                    <p className="text-xs text-[var(--g3-muted)]">
                      Use Desbloquear acesso para reativar o tenant bloqueado e zerar as tentativas inválidas dos usuários bloqueados.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Resumo operacional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--g3-muted)]">Tenant atual</p>
                  <p className="font-semibold text-[var(--g3-foreground)]">
                    {selecionada?.nome_fantasia || selecionada?.razao_social || "Novo tenant"}
                  </p>
                  <p className="text-[var(--g3-muted)]">
                    {selecionada ? `Plano ${tituloPlano(selecionada.plano)} • ${tituloStatus(selecionada.status)}` : "Ainda não salvo"}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--g3-muted)]">Diretrizes desta tela</p>
                  <ul className="space-y-1 text-[var(--g3-muted)]">
                    <li>O tenant é localizado por CNPJ, slug ou código da instituição.</li>
                    <li>Todos os dados operacionais devem usar `tenant_id` vindo do token autenticado.</li>
                    <li>O painel master é exclusivo para superadmin.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </AdminPageLayout>

      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
    </>
  );
}
