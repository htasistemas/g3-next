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
  UserPlus,
  Users,
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
import type { Usuario, UsuarioListaResponse, UsuarioPayload, UsuarioStatus as UsuarioStatusSistema } from "@/types/usuario";

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

type UsuarioTenantFormState = {
  id_usuario?: string;
  nome_completo: string;
  nome_usuario: string;
  email: string;
  senha: string;
  confirmar_senha: string;
  perfil_acesso: string;
  status: UsuarioStatusSistema;
  exigir_troca_senha: boolean;
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

const formUsuarioInicial: UsuarioTenantFormState = {
  id_usuario: undefined,
  nome_completo: "",
  nome_usuario: "",
  email: "",
  senha: "",
  confirmar_senha: "",
  perfil_acesso: "OPERADOR",
  status: "ATIVO",
  exigir_troca_senha: true
};

const resetSenhaUsuarioInicial = {
  nova_senha: "",
  confirmar_nova_senha: "",
  exigir_troca_senha: true
};

function mapUsuarioTenantParaForm(usuario: Usuario): UsuarioTenantFormState {
  return {
    id_usuario: usuario.id_usuario,
    nome_completo: usuario.nome_completo ?? usuario.nome_exibicao ?? "",
    nome_usuario: usuario.nome_usuario,
    email: usuario.email ?? "",
    senha: "",
    confirmar_senha: "",
    perfil_acesso: usuario.perfil_acesso ?? usuario.permissoes[0] ?? "OPERADOR",
    status: usuario.status,
    exigir_troca_senha: usuario.exigir_troca_senha
  };
}

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

function tituloStatusUsuario(status: UsuarioStatusSistema) {
  return {
    ATIVO: "Ativo",
    INATIVO: "Inativo",
    BLOQUEADO: "Bloqueado"
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
  const [formUsuario, setFormUsuario] = useState<UsuarioTenantFormState>(formUsuarioInicial);
  const [novaSenhaUsuario, setNovaSenhaUsuario] = useState(resetSenhaUsuarioInicial.nova_senha);
  const [confirmarNovaSenhaUsuario, setConfirmarNovaSenhaUsuario] = useState(resetSenhaUsuarioInicial.confirmar_nova_senha);
  const [exigirTrocaSenhaUsuario, setExigirTrocaSenhaUsuario] = useState(resetSenhaUsuarioInicial.exigir_troca_senha);
  const [slugEditadoManual, setSlugEditadoManual] = useState(false);
  const [codigoEditadoManual, setCodigoEditadoManual] = useState(false);

  function limparFormularioUsuarioTenant() {
    setFormUsuario(formUsuarioInicial);
    setNovaSenhaUsuario(resetSenhaUsuarioInicial.nova_senha);
    setConfirmarNovaSenhaUsuario(resetSenhaUsuarioInicial.confirmar_nova_senha);
    setExigirTrocaSenhaUsuario(resetSenhaUsuarioInicial.exigir_troca_senha);
  }

  const instituicoesQuery = useQuery({
    queryKey: ["master-instituicoes"],
    queryFn: () => instituicoesService.listar()
  });

  const usuariosTenantQuery = useQuery<UsuarioListaResponse>({
    queryKey: ["master-instituicoes-usuarios", selecionada?.id],
    queryFn: () => instituicoesService.listarUsuarios(selecionada?.id ?? ""),
    enabled: Boolean(selecionada?.id)
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
      limparFormularioUsuarioTenant();
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

  const criarUsuarioTenantMutation = useMutation({
    mutationFn: async () => {
      if (!selecionada?.id) {
        throw new Error("Selecione uma instituição primeiro.");
      }

      const payload: UsuarioPayload = {
        nome_completo: formUsuario.nome_completo.trim(),
        nome_usuario: formUsuario.nome_usuario.trim(),
        email: formUsuario.email.trim().toLowerCase(),
        perfil_acesso: formUsuario.perfil_acesso,
        status: formUsuario.status,
        exigir_troca_senha: formUsuario.exigir_troca_senha,
        senha: formUsuario.senha,
        confirmar_senha: formUsuario.confirmar_senha
      };

      return instituicoesService.criarUsuario(selecionada.id, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["master-instituicoes-usuarios", selecionada?.id] });
      limparFormularioUsuarioTenant();
      setPopup({
        tipo: "sucesso",
        titulo: "Usuário cadastrado",
        texto: "O usuário do tenant foi criado com sucesso."
      });
    },
    onError: (error: any) => {
      setPopup({
        tipo: "erro",
        titulo: "Falha ao cadastrar usuário",
        texto: error?.response?.data?.message ?? error?.response?.data?.mensagem ?? "Não foi possível cadastrar o usuário."
      });
    }
  });

  const atualizarUsuarioTenantMutation = useMutation({
    mutationFn: async () => {
      if (!selecionada?.id || !formUsuario.id_usuario) {
        throw new Error("Selecione um usuário para editar.");
      }

      const payload: UsuarioPayload = {
        nome_completo: formUsuario.nome_completo.trim(),
        nome_usuario: formUsuario.nome_usuario.trim(),
        email: formUsuario.email.trim().toLowerCase(),
        perfil_acesso: formUsuario.perfil_acesso,
        status: formUsuario.status,
        exigir_troca_senha: formUsuario.exigir_troca_senha
      };

      return instituicoesService.atualizarUsuario(selecionada.id, formUsuario.id_usuario, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["master-instituicoes-usuarios", selecionada?.id] });
      limparFormularioUsuarioTenant();
      setPopup({
        tipo: "sucesso",
        titulo: "Usuário atualizado",
        texto: "As informações do usuário foram salvas com sucesso."
      });
    },
    onError: (error: any) => {
      setPopup({
        tipo: "erro",
        titulo: "Falha ao atualizar usuário",
        texto:
          error?.response?.data?.message ?? error?.response?.data?.mensagem ?? "Não foi possível atualizar o usuário."
      });
    }
  });

  const resetarSenhaUsuarioMutation = useMutation({
    mutationFn: async () => {
      if (!selecionada?.id || !formUsuario.id_usuario) {
        throw new Error("Selecione um usuário para redefinir a senha.");
      }

      const novaSenhaNormalizada = novaSenhaUsuario.trim();
      const confirmarSenhaNormalizada = confirmarNovaSenhaUsuario.trim();

      if (!novaSenhaNormalizada || !confirmarSenhaNormalizada) {
        throw new Error("Informe e confirme a nova senha.");
      }

      if (novaSenhaNormalizada.length < 8) {
        throw new Error("A nova senha deve ter ao menos 8 caracteres.");
      }

      if (novaSenhaNormalizada !== confirmarSenhaNormalizada) {
        throw new Error("A senha e a confirmação precisam ser iguais.");
      }

      return instituicoesService.resetarSenhaUsuario(selecionada.id, formUsuario.id_usuario, {
        nova_senha: novaSenhaNormalizada,
        confirmar_nova_senha: confirmarSenhaNormalizada,
        exigir_troca_senha: exigirTrocaSenhaUsuario
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["master-instituicoes-usuarios", selecionada?.id] });
      limparFormularioUsuarioTenant();
      setPopup({
        tipo: "sucesso",
        titulo: "Senha redefinida",
        texto: "A senha do usuário do tenant foi redefinida com sucesso."
      });
    },
    onError: (error: any) => {
      setPopup({
        tipo: "erro",
        titulo: "Falha ao redefinir senha",
        texto:
          error?.response?.data?.message ?? error?.response?.data?.mensagem ?? "Não foi possível redefinir a senha."
      });
    }
  });

  const desbloquearAcessoMutation = useMutation({
    mutationFn: async () => {
      if (!selecionada?.id) {
        throw new Error("Selecione uma instituição primeiro.");
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
        texto: `Instituição desbloqueada: ${resultado.instituicoes_desbloqueadas}. Usuários desbloqueados: ${resultado.usuarios_desbloqueados}.`
      });
    },
    onError: (error: any) => {
      setPopup({
        tipo: "erro",
        titulo: "Falha ao desbloquear",
        texto:
          error?.response?.data?.message ??
          error?.response?.data?.mensagem ??
          "Não foi possível desbloquear o acesso."
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
        limparFormularioUsuarioTenant();
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
            titulo: "Seleção obrigatória",
            texto: "Selecione uma instituição antes de desbloquear o acesso."
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
                            limparFormularioUsuarioTenant();
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
          <div className="space-y-3">
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
                        name="admin_nome_usuario"
                        autoComplete="new-password"
                        spellCheck={false}
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
                        name="admin_email"
                        type="text"
                        inputMode="email"
                        autoComplete="new-password"
                        spellCheck={false}
                        autoCapitalize="none"
                        value={form.admin_email}
                        onChange={(event) => setForm((current) => ({ ...current, admin_email: event.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin_senha">Senha inicial</Label>
                      <Input
                        id="admin_senha"
                        name="admin_senha"
                        type="password"
                        autoComplete="new-password"
                        spellCheck={false}
                        value={form.admin_senha}
                        onChange={(event) => setForm((current) => ({ ...current, admin_senha: event.target.value }))}
                      />
                    </div>
                    <p className="text-xs text-[var(--g3-muted)]">
                      A senha informada aqui será gravada com segurança no banco e usada no primeiro acesso do novo
                      cliente.
                    </p>
                  </>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="email_reset">E-mail do administrador</Label>
                      <Input
                        id="email_reset"
                        name="email_reset"
                        type="email"
                        autoComplete="off"
                        value={emailReset}
                        onChange={(event) => setEmailReset(event.target.value)}
                        placeholder="Opcional para localizar o admin específico"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nova_senha_reset">Nova senha provisória</Label>
                      <Input
                        id="nova_senha_reset"
                        name="nova_senha_reset"
                        type="password"
                        autoComplete="new-password"
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

            <div className="grid gap-3 lg:grid-cols-[1fr_1.15fr]">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Cadastro e edição de usuários do tenant</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {!selecionada?.id ? (
                    <p className="text-sm text-[var(--g3-muted)]">
                      Selecione um tenant na listagem para cadastrar os usuários vinculados a ele.
                    </p>
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="usuario_nome_completo">Nome completo</Label>
                        <Input
                          id="usuario_nome_completo"
                          value={formUsuario.nome_completo}
                          onChange={(event) =>
                            setFormUsuario((current) => ({ ...current, nome_completo: event.target.value }))
                          }
                        />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <Label htmlFor="usuario_nome_usuario">Login</Label>
                          <Input
                            id="usuario_nome_usuario"
                            autoComplete="new-password"
                            spellCheck={false}
                            value={formUsuario.nome_usuario}
                            onChange={(event) =>
                              setFormUsuario((current) => ({ ...current, nome_usuario: event.target.value }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="usuario_email">E-mail</Label>
                          <Input
                            id="usuario_email"
                            type="text"
                            inputMode="email"
                            autoComplete="new-password"
                            spellCheck={false}
                            autoCapitalize="none"
                            value={formUsuario.email}
                            onChange={(event) =>
                              setFormUsuario((current) => ({ ...current, email: event.target.value }))
                            }
                          />
                        </div>
                      </div>
                    {!formUsuario.id_usuario ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <Label htmlFor="usuario_senha">Senha</Label>
                          <Input
                            id="usuario_senha"
                            type="password"
                            autoComplete="new-password"
                            value={formUsuario.senha}
                            onChange={(event) =>
                              setFormUsuario((current) => ({ ...current, senha: event.target.value }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="usuario_confirmar_senha">Confirmar senha</Label>
                          <Input
                            id="usuario_confirmar_senha"
                            type="password"
                            autoComplete="new-password"
                            value={formUsuario.confirmar_senha}
                            onChange={(event) =>
                              setFormUsuario((current) => ({ ...current, confirmar_senha: event.target.value }))
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <Label htmlFor="usuario_nova_senha">Nova senha</Label>
                            <Input
                              id="usuario_nova_senha"
                              type="password"
                              autoComplete="new-password"
                              value={novaSenhaUsuario}
                              onChange={(event) => setNovaSenhaUsuario(event.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="usuario_confirmar_nova_senha">Confirmar nova senha</Label>
                            <Input
                              id="usuario_confirmar_nova_senha"
                              type="password"
                              autoComplete="new-password"
                              value={confirmarNovaSenhaUsuario}
                              onChange={(event) => setConfirmarNovaSenhaUsuario(event.target.value)}
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 text-sm text-[var(--g3-foreground)]">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                              checked={exigirTrocaSenhaUsuario}
                              onChange={(event) => setExigirTrocaSenhaUsuario(event.target.checked)}
                            />
                            Exigir troca de senha no primeiro acesso
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (!selecionada?.id || !formUsuario.id_usuario) {
                                setPopup({
                                  tipo: "aviso",
                                  titulo: "Seleção obrigatória",
                                  texto: "Selecione um usuário para redefinir a senha."
                                });
                                return;
                              }

                              resetarSenhaUsuarioMutation.mutate();
                            }}
                            disabled={resetarSenhaUsuarioMutation.isPending}
                          >
                            {resetarSenhaUsuarioMutation.isPending ? "Redefinindo..." : "Redefinir senha"}
                          </Button>
                        </div>
                        <p className="mt-3 text-xs text-[var(--g3-muted)]">
                          A nova senha será gravada com segurança e poderá ser usada no próximo acesso do usuário
                          selecionado.
                        </p>
                      </div>
                    )}
                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <Label htmlFor="usuario_perfil_acesso">Perfil de acesso</Label>
                          <Select
                            id="usuario_perfil_acesso"
                            value={formUsuario.perfil_acesso}
                            onChange={(event) =>
                              setFormUsuario((current) => ({ ...current, perfil_acesso: event.target.value }))
                            }
                          >
                            <option value="OPERADOR">Operador</option>
                            <option value="ADMINISTRADOR">Administrador</option>
                            <option value="LEITURA_APENAS">Leitura apenas</option>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="usuario_status">Status</Label>
                          <Select
                            id="usuario_status"
                            value={formUsuario.status}
                            onChange={(event) =>
                              setFormUsuario((current) => ({
                                ...current,
                                status: event.target.value as UsuarioStatusSistema
                              }))
                            }
                          >
                            <option value="ATIVO">Ativo</option>
                            <option value="INATIVO">Inativo</option>
                            <option value="BLOQUEADO">Bloqueado</option>
                          </Select>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-[var(--g3-foreground)]">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                          checked={formUsuario.exigir_troca_senha}
                          onChange={(event) =>
                            setFormUsuario((current) => ({
                              ...current,
                              exigir_troca_senha: event.target.checked
                            }))
                          }
                        />
                        Exigir troca de senha no primeiro acesso
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => {
                            if (!selecionada?.id) {
                              setPopup({
                                tipo: "aviso",
                                titulo: "Seleção obrigatória",
                                texto: "Selecione um tenant antes de cadastrar usuários."
                              });
                              return;
                            }

                            if (!formUsuario.nome_completo.trim() || !formUsuario.nome_usuario.trim() || !formUsuario.email.trim()) {
                              setPopup({
                                tipo: "aviso",
                                titulo: "Campos obrigatórios",
                                texto: "Preencha nome, login e e-mail para salvar o usuário."
                              });
                              return;
                            }

                            if (formUsuario.id_usuario) {
                              atualizarUsuarioTenantMutation.mutate();
                              return;
                            }

                            if (!formUsuario.senha.trim() || !formUsuario.confirmar_senha.trim()) {
                              setPopup({
                                tipo: "aviso",
                                titulo: "Campos obrigatórios",
                                texto: "Preencha senha e confirmação para cadastrar o usuário."
                              });
                              return;
                            }

                            if (formUsuario.senha.trim().length < 6 || formUsuario.confirmar_senha.trim().length < 6) {
                              setPopup({
                                tipo: "aviso",
                                titulo: "Senha inválida",
                                texto: "A senha deve ter ao menos 6 caracteres."
                              });
                              return;
                            }

                            if (formUsuario.senha !== formUsuario.confirmar_senha) {
                              setPopup({
                                tipo: "aviso",
                                titulo: "Senhas diferentes",
                                texto: "A senha e a confirmação precisam ser iguais."
                              });
                              return;
                            }

                            criarUsuarioTenantMutation.mutate();
                          }}
                          disabled={
                            !selecionada?.id ||
                            criarUsuarioTenantMutation.isPending ||
                            atualizarUsuarioTenantMutation.isPending
                          }
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          {formUsuario.id_usuario
                            ? atualizarUsuarioTenantMutation.isPending
                              ? "Salvando..."
                              : "Salvar alterações"
                            : criarUsuarioTenantMutation.isPending
                              ? "Cadastrando..."
                              : "Cadastrar usuário"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={limparFormularioUsuarioTenant}
                          disabled={criarUsuarioTenantMutation.isPending || atualizarUsuarioTenantMutation.isPending}
                        >
                          Limpar formulário
                        </Button>
                      </div>
                      <p className="text-xs text-[var(--g3-muted)]">
                        {formUsuario.id_usuario
                          ? "Edite os dados do usuário e salve as alterações para manter o vínculo com o tenant atual."
                          : "O usuário será vinculado ao tenant atual e receberá acesso conforme o perfil informado."}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Usuários do tenant atual</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!selecionada?.id ? (
                    <p className="text-sm text-[var(--g3-muted)]">
                      Selecione um tenant na listagem para visualizar os usuários cadastrados.
                    </p>
                  ) : usuariosTenantQuery.isLoading ? (
                    <p className="text-sm text-[var(--g3-muted)]">Carregando usuários...</p>
                  ) : (usuariosTenantQuery.data?.usuarios ?? []).length ? (
                    <div className="overflow-hidden rounded-xl border border-[var(--g3-border)]">
                      <div className="max-h-[420px] overflow-auto">
                        <table className="min-w-full text-sm">
                          <thead className="sticky top-0 bg-[var(--g3-card-soft)] text-left text-xs uppercase tracking-wide text-[var(--g3-muted)]">
                            <tr>
                              <th className="px-3 py-2">Nome</th>
                              <th className="px-3 py-2">Login</th>
                              <th className="px-3 py-2">E-mail</th>
                              <th className="px-3 py-2">Perfil</th>
                              <th className="px-3 py-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(usuariosTenantQuery.data?.usuarios ?? []).map((usuario) => {
                              const selecionado = formUsuario.id_usuario === usuario.id_usuario;
                              return (
                              <tr
                                key={usuario.id_usuario}
                                className={`border-t border-[var(--g3-border)] ${
                                  selecionado ? "bg-[var(--g3-primary-soft)]" : "hover:bg-[var(--g3-card-soft)]"
                                } cursor-pointer`}
                          onClick={() => {
                            setFormUsuario(mapUsuarioTenantParaForm(usuario));
                            setNovaSenhaUsuario("");
                            setConfirmarNovaSenhaUsuario("");
                            setExigirTrocaSenhaUsuario(true);
                            setActiveTab("acesso");
                          }}
                        >
                                <td className="px-3 py-2">
                                  <div>
                                    <p className="font-medium text-[var(--g3-foreground)]">
                                      {usuario.nome_completo || usuario.nome_exibicao || usuario.nome_usuario}
                                    </p>
                                    <p className="text-xs text-[var(--g3-muted)]">
                                      Criado em {formatarDataHora(usuario.criado_em)}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-3 py-2">{usuario.nome_usuario}</td>
                                <td className="px-3 py-2">{usuario.email || "---"}</td>
                                <td className="px-3 py-2">{usuario.perfil_acesso || "OPERADOR"}</td>
                                <td className="px-3 py-2">{tituloStatusUsuario(usuario.status)}</td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 text-center">
                      <div className="space-y-2">
                        <Users className="mx-auto h-6 w-6 text-[var(--g3-muted)]" />
                        <p className="text-sm font-medium text-[var(--g3-foreground)]">Nenhum usuário cadastrado</p>
                        <p className="text-xs text-[var(--g3-muted)]">
                          Cadastre o primeiro usuário do tenant usando o formulário ao lado.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </AdminPageLayout>

      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
    </>
  );
}
