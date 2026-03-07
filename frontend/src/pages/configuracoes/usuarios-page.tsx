import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  History,
  KeyRound,
  ListFilter,
  Plus,
  Printer,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Undo2,
  UserRound,
  UsersRound,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  usuarioDefaultValues,
  usuarioFormSchema,
  usuarioStatusOptions,
  type UsuarioFormInput,
  type UsuarioFormValues
} from "@/features/usuarios/usuario.schema";
import {
  useAtualizarStatusUsuario,
  usePermissoesUsuarios,
  useRemoverUsuario,
  useResetarSenhaUsuario,
  useSalvarUsuario,
  useUsuario,
  useUsuarios
} from "@/features/usuarios/use-usuarios";
import { formatarTextoPorCampo } from "@/lib/text-formatter";
import { mapaCamposTextoUsuarioForm } from "@/lib/text-format-config";
import {
  classeBotaoAbaLateral,
  classeNumeroAbaLateral,
  classesTelaPadraoBeneficiario,
  ordemAcoesCrudPadrao
} from "@/lib/tela-padrao-beneficiario";
import type {
  Usuario,
  UsuarioFiltros,
  UsuarioPayload,
  UsuarioPermissaoCatalogo,
  UsuarioStatus
} from "@/types/usuario";

const abas = [
  { id: "listagem", label: "Listagem de usuarios", icon: ListFilter },
  { id: "cadastro", label: "Cadastro / edicao", icon: UserRound },
  { id: "permissoes", label: "Permissoes e acessos", icon: ShieldCheck },
  { id: "auditoria", label: "Auditoria / historico", icon: History }
] as const;

type AbaId = (typeof abas)[number]["id"];

type AcaoCrud = {
  label: (typeof ordemAcoesCrudPadrao)[number];
  icon: LucideIcon;
  onClick: () => void;
  variant: "default" | "outline" | "danger" | "ghost";
  disabled?: boolean;
};

const pageSizeDefault = 10;

function mapUsuarioParaFormulario(usuario: Usuario): UsuarioFormValues {
  return {
    ...usuarioDefaultValues,
    id_usuario: usuario.id_usuario,
    nome_completo: usuario.nome_completo ?? "",
    nome_exibicao: usuario.nome_exibicao ?? "",
    nome_usuario: usuario.nome_usuario,
    email: usuario.email ?? "",
    telefone: usuario.telefone ?? "",
    cpf: usuario.cpf ?? "",
    matricula: usuario.matricula ?? "",
    setor: usuario.setor ?? "",
    unidade: usuario.unidade ?? "",
    cargo: usuario.cargo ?? "",
    perfil_acesso: usuario.perfil_acesso ?? usuario.permissoes[0] ?? "OPERADOR",
    permissoes: usuario.permissoes.length ? usuario.permissoes : ["OPERADOR"],
    status: usuario.status,
    exigir_troca_senha: usuario.exigir_troca_senha,
    senha: "",
    confirmar_senha: ""
  };
}

function mapFormularioParaPayload(values: UsuarioFormValues): UsuarioPayload {
  const permissoes = Array.from(
    new Set(
      [...(values.permissoes ?? []), values.perfil_acesso ?? ""]
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean)
    )
  );

  const payload: UsuarioPayload = {
    nome_completo: values.nome_completo.trim(),
    nome_exibicao: values.nome_exibicao?.trim() || undefined,
    nome_usuario: values.nome_usuario.trim(),
    email: values.email.trim(),
    telefone: values.telefone?.trim() || undefined,
    cpf: values.cpf?.trim() || undefined,
    matricula: values.matricula?.trim() || undefined,
    setor: values.setor?.trim() || undefined,
    unidade: values.unidade?.trim() || undefined,
    cargo: values.cargo?.trim() || undefined,
    perfil_acesso: values.perfil_acesso?.trim().toUpperCase() || undefined,
    permissoes,
    status: values.status,
    exigir_troca_senha: !!values.exigir_troca_senha
  };

  if (!values.id_usuario) {
    payload.senha = values.senha?.trim();
    payload.confirmar_senha = values.confirmar_senha?.trim();
  }

  return payload;
}

function formatarDataHora(valor?: string) {
  if (!valor) return "---";
  const date = new Date(valor);
  if (Number.isNaN(date.getTime())) return "---";
  return date.toLocaleString("pt-BR");
}

function formatarStatus(status: UsuarioStatus) {
  if (status === "ATIVO") return "Ativo";
  if (status === "INATIVO") return "Inativo";
  return "Bloqueado";
}

function ordenarPermissoesPorModulo(permissoes: UsuarioPermissaoCatalogo[]) {
  const map = new Map<string, UsuarioPermissaoCatalogo[]>();
  permissoes.forEach((item) => {
    const grupo = map.get(item.modulo) ?? [];
    grupo.push(item);
    map.set(item.modulo, grupo);
  });

  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([modulo, itens]) => ({
      modulo,
      itens: itens.sort((a, b) => a.nome.localeCompare(b.nome))
    }));
}

function PopupMensagem({
  titulo,
  texto,
  tipo,
  onClose
}: {
  titulo: string;
  texto: string;
  tipo: "sucesso" | "erro" | "aviso";
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-100 px-5 py-4">
          <h3
            className={`text-base font-semibold ${
              tipo === "sucesso" ? "text-emerald-800" : tipo === "erro" ? "text-rose-700" : "text-amber-700"
            }`}
          >
            {titulo}
          </h3>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-slate-700">{texto}</p>
        </div>
        <div className="flex justify-end border-t border-slate-100 px-5 py-3">
          <Button type="button" onClick={onClose}>
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}

export function UsuariosPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("listagem");
  const [idSelecionado, setIdSelecionado] = useState<string>();
  const [snapshot, setSnapshot] = useState<UsuarioFormValues | null>(null);
  const [popupMensagem, setPopupMensagem] = useState<{
    tipo: "sucesso" | "erro" | "aviso";
    titulo: string;
    texto: string;
  } | null>(null);
  const [popupConfirmacao, setPopupConfirmacao] = useState<{
    tipo: "status" | "excluir";
    titulo: string;
    texto: string;
    usuarioId: string;
    status?: UsuarioStatus;
  } | null>(null);
  const [popupResetSenhaAberto, setPopupResetSenhaAberto] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [exigirTrocaSenhaReset, setExigirTrocaSenhaReset] = useState(true);
  const [filtroDraft, setFiltroDraft] = useState<UsuarioFiltros>({
    nome: "",
    login: "",
    email: "",
    perfil: "",
    setor: "",
    unidade: "",
    status: "",
    criado_de: "",
    criado_ate: "",
    pagina: 1,
    tamanho_pagina: pageSizeDefault
  });
  const [filtros, setFiltros] = useState<UsuarioFiltros>(filtroDraft);

  const { data: listaData, isLoading: carregandoLista, isFetching: atualizandoLista } = useUsuarios(filtros);
  const { data: usuarioData, isLoading: carregandoUsuario } = useUsuario(idSelecionado);
  const { data: permissoesData, isLoading: carregandoPermissoes } = usePermissoesUsuarios();

  const salvarMutation = useSalvarUsuario();
  const atualizarStatusMutation = useAtualizarStatusUsuario();
  const resetarSenhaMutation = useResetarSenhaUsuario();
  const removerMutation = useRemoverUsuario();

  const {
    register,
    reset,
    setValue,
    getValues,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<UsuarioFormInput, unknown, UsuarioFormValues>({
    resolver: zodResolver(usuarioFormSchema),
    defaultValues: usuarioDefaultValues as UsuarioFormInput
  });

  const permissoesSelecionadasValue = watch("permissoes");
  const permissoesSelecionadas = Array.isArray(permissoesSelecionadasValue)
    ? permissoesSelecionadasValue
    : typeof permissoesSelecionadasValue === "string"
      ? permissoesSelecionadasValue
          .split(/[;,]/g)
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  const perfilSelecionado = watch("perfil_acesso") ?? "OPERADOR";
  const acaoEmAndamento =
    salvarMutation.isPending ||
    atualizarStatusMutation.isPending ||
    resetarSenhaMutation.isPending ||
    removerMutation.isPending;

  const gruposPermissoes = useMemo(
    () => ordenarPermissoesPorModulo(permissoesData?.permissoes ?? []),
    [permissoesData]
  );

  const permissoesDisponiveis = useMemo(
    () => (permissoesData?.permissoes ?? []).map((item) => item.nome).sort((a, b) => a.localeCompare(b)),
    [permissoesData]
  );

  useEffect(() => {
    if (!usuarioData?.usuario) return;
    const formValues = mapUsuarioParaFormulario(usuarioData.usuario);
    reset(formValues);
    setSnapshot(formValues);
  }, [usuarioData, reset]);

  function aplicarFormatacaoCampo(campo: keyof UsuarioFormValues) {
    const valorAtual = getValues(campo);
    const valorFormatado = formatarTextoPorCampo(campo, valorAtual, mapaCamposTextoUsuarioForm);
    if (typeof valorFormatado === "string") {
      setValue(campo, valorFormatado as UsuarioFormValues[typeof campo], {
        shouldDirty: true
      });
    }
  }

  function selecionarUsuario(id: string, aba: AbaId = "cadastro") {
    setIdSelecionado(id);
    setAbaAtiva(aba);
  }

  function buscar() {
    setFiltros((atual) => ({ ...atual, ...filtroDraft, pagina: 1 }));
  }

  function novo() {
    setIdSelecionado(undefined);
    setSnapshot(null);
    reset(usuarioDefaultValues);
    setAbaAtiva("cadastro");
  }

  function cancelar() {
    reset(snapshot ?? usuarioDefaultValues);
  }

  function excluir() {
    const id = getValues("id_usuario");
    if (!id) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atencao",
        texto: "Selecione um usuario para excluir."
      });
      return;
    }

    setPopupConfirmacao({
      tipo: "excluir",
      titulo: "Confirmar exclusao",
      texto: "Esta acao e irreversivel. Deseja continuar?",
      usuarioId: id
    });
  }

  function imprimir() {
    window.print();
  }

  function fechar() {
    navigate("/dashboard/visao-geral");
  }

  function limparFiltros() {
    const base: UsuarioFiltros = {
      nome: "",
      login: "",
      email: "",
      perfil: "",
      setor: "",
      unidade: "",
      status: "",
      criado_de: "",
      criado_ate: "",
      pagina: 1,
      tamanho_pagina: filtros.tamanho_pagina ?? pageSizeDefault
    };
    setFiltroDraft(base);
    setFiltros(base);
  }

  function trocarPermissao(nomePermissao: string) {
    const marcada = permissoesSelecionadas.includes(nomePermissao);
    const proximo = marcada
      ? permissoesSelecionadas.filter((item) => item !== nomePermissao)
      : [...permissoesSelecionadas, nomePermissao];

    setValue("permissoes", proximo, { shouldDirty: true, shouldValidate: true });
    if (!proximo.length) {
      setValue("perfil_acesso", "", { shouldDirty: true, shouldValidate: true });
      return;
    }
    if (!proximo.includes(perfilSelecionado)) {
      setValue("perfil_acesso", proximo[0], { shouldDirty: true, shouldValidate: true });
    }
  }

  async function salvar(values: UsuarioFormValues) {
    try {
      const payload = mapFormularioParaPayload(values);
      const resultado = await salvarMutation.mutateAsync({
        ...payload,
        id_usuario: values.id_usuario
      });
      const formValues = mapUsuarioParaFormulario(resultado.usuario);
      reset(formValues);
      setSnapshot(formValues);
      setIdSelecionado(resultado.usuario.id_usuario);
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmacao",
        texto: "Usuario salvo com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Nao foi possivel salvar o usuario."
      });
    }
  }

  function abrirPopupStatus(usuario: Usuario, status: UsuarioStatus) {
    setPopupConfirmacao({
      tipo: "status",
      titulo: "Confirmar alteracao",
      texto: `Deseja alterar o status para ${formatarStatus(status).toLowerCase()}?`,
      usuarioId: usuario.id_usuario,
      status
    });
  }

  async function confirmarPopupAcao() {
    if (!popupConfirmacao) return;

    try {
      if (popupConfirmacao.tipo === "status" && popupConfirmacao.status) {
        const resultado = await atualizarStatusMutation.mutateAsync({
          id_usuario: popupConfirmacao.usuarioId,
          status: popupConfirmacao.status
        });
        if (idSelecionado === resultado.usuario.id_usuario) {
          const formValues = mapUsuarioParaFormulario(resultado.usuario);
          reset(formValues);
          setSnapshot(formValues);
        }
      }

      if (popupConfirmacao.tipo === "excluir") {
        const resultado = await removerMutation.mutateAsync(popupConfirmacao.usuarioId);
        if (idSelecionado === resultado.usuario.id_usuario) {
          const formValues = mapUsuarioParaFormulario(resultado.usuario);
          reset(formValues);
          setSnapshot(formValues);
        }
      }

      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmacao",
        texto: "Operacao concluida com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Nao foi possivel concluir a operacao."
      });
    } finally {
      setPopupConfirmacao(null);
    }
  }

  async function confirmarResetSenha() {
    const id = getValues("id_usuario");
    if (!id) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atencao",
        texto: "Selecione um usuario para redefinir a senha."
      });
      return;
    }

    if (!novaSenha || !confirmarNovaSenha) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atencao",
        texto: "Informe e confirme a nova senha."
      });
      return;
    }

    if (novaSenha.length < 6 || confirmarNovaSenha.length < 6) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atencao",
        texto: "A nova senha deve ter no minimo 6 caracteres."
      });
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atencao",
        texto: "As senhas nao conferem."
      });
      return;
    }

    try {
      await resetarSenhaMutation.mutateAsync({
        id_usuario: id,
        nova_senha: novaSenha,
        confirmar_nova_senha: confirmarNovaSenha,
        exigir_troca_senha: exigirTrocaSenhaReset
      });
      setPopupResetSenhaAberto(false);
      setNovaSenha("");
      setConfirmarNovaSenha("");
      setExigirTrocaSenhaReset(true);
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmacao",
        texto: "Senha redefinida com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Nao foi possivel redefinir a senha."
      });
    }
  }

  const acoesCrud: AcaoCrud[] = [
    { label: "Buscar", icon: Search, onClick: buscar, variant: "outline" },
    { label: "Novo", icon: Plus, onClick: novo, variant: "outline" },
    {
      label: "Salvar",
      icon: Save,
      onClick: () => void handleSubmit(salvar)(),
      variant: "default",
      disabled: acaoEmAndamento
    },
    { label: "Cancelar", icon: Undo2, onClick: cancelar, variant: "outline", disabled: acaoEmAndamento },
    { label: "Excluir", icon: Trash2, onClick: excluir, variant: "danger", disabled: acaoEmAndamento },
    { label: "Imprimir", icon: Printer, onClick: imprimir, variant: "outline" },
    { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
  ];

  const abaAtual = abas.find((aba) => aba.id === abaAtiva);
  const IconeAbaAtual = abaAtual?.icon ?? UsersRound;

  const paginaAtual = listaData?.paginacao.pagina ?? 1;
  const totalPaginas = listaData?.paginacao.total_paginas ?? 1;

  return (
    <main className={classesTelaPadraoBeneficiario.container}>
      <section className={classesTelaPadraoBeneficiario.barraAcoes}>
        <div className={classesTelaPadraoBeneficiario.gradeAcoes}>
          {acoesCrud.map((acao) => (
            <Button
              key={acao.label}
              type="button"
              variant={acao.variant}
              size="sm"
              className={classesTelaPadraoBeneficiario.botaoAcao}
              onClick={acao.onClick}
              disabled={acao.disabled}
            >
              <acao.icon className="mr-1.5 h-3.5 w-3.5" />
              {acao.label}
            </Button>
          ))}
        </div>
      </section>

      <div className={classesTelaPadraoBeneficiario.gradePrincipal}>
        <Card className={classesTelaPadraoBeneficiario.cardAbas}>
          <CardContent className={classesTelaPadraoBeneficiario.conteudoAbas}>
            {abas.map((aba, indice) => (
              <button
                key={aba.id}
                type="button"
                className={classeBotaoAbaLateral(abaAtiva === aba.id)}
                onClick={() => setAbaAtiva(aba.id)}
              >
                <span className={classeNumeroAbaLateral(abaAtiva === aba.id)}>{indice + 1}</span>
                <span>{aba.label}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className={classesTelaPadraoBeneficiario.cardConteudo}>
          <CardHeader className={classesTelaPadraoBeneficiario.cabecalhoConteudo}>
            <div className={classesTelaPadraoBeneficiario.tituloAba}>
              <IconeAbaAtual className="h-4 w-4" />
              <CardTitle className={classesTelaPadraoBeneficiario.tituloAbaTexto}>
                {abaAtual?.label ?? "Usuarios"}
              </CardTitle>
            </div>
            <span className="rounded-full bg-[var(--g3-primary-soft)] px-2 py-1 text-[10px] font-semibold uppercase text-[var(--g3-active)]">
              Configuracoes gerais
            </span>
          </CardHeader>

          <CardContent className="space-y-4">
            {abaAtiva === "listagem" && (
              <section className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1">
                    <Label>Nome</Label>
                    <Input value={filtroDraft.nome ?? ""} onChange={(e) => setFiltroDraft((v) => ({ ...v, nome: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Login</Label>
                    <Input value={filtroDraft.login ?? ""} onChange={(e) => setFiltroDraft((v) => ({ ...v, login: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>E-mail</Label>
                    <Input value={filtroDraft.email ?? ""} onChange={(e) => setFiltroDraft((v) => ({ ...v, email: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select value={filtroDraft.status ?? ""} onChange={(e) => setFiltroDraft((v) => ({ ...v, status: e.target.value as UsuarioStatus | "" }))}>
                      <option value="">Todos</option>
                      {usuarioStatusOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={limparFiltros}>
                    Limpar filtros
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                      <tr>
                        <th className="px-3 py-2 text-left">Nome</th>
                        <th className="px-3 py-2 text-left">Login</th>
                        <th className="px-3 py-2 text-left">Perfil</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-left">Ultimo acesso</th>
                        <th className="px-3 py-2 text-left">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carregandoLista && (
                        <tr>
                          <td className="px-3 py-4 text-center text-[var(--g3-muted)]" colSpan={6}>
                            Carregando usuarios...
                          </td>
                        </tr>
                      )}
                      {!carregandoLista && !listaData?.usuarios.length && (
                        <tr>
                          <td className="px-3 py-4 text-center text-[var(--g3-muted)]" colSpan={6}>
                            Nenhum usuario encontrado.
                          </td>
                        </tr>
                      )}
                      {listaData?.usuarios.map((usuario, indice) => (
                        <tr
                          key={usuario.id_usuario}
                          className={`cursor-pointer border-t border-[var(--g3-border)] ${indice % 2 === 0 ? "bg-white" : "bg-[var(--g3-primary-soft)]/35"}`}
                          onClick={() => selecionarUsuario(usuario.id_usuario, "cadastro")}
                        >
                          <td className="px-3 py-2">{usuario.nome_completo ?? "---"}</td>
                          <td className="px-3 py-2">{usuario.nome_usuario}</td>
                          <td className="px-3 py-2">{usuario.perfil_acesso ?? "---"}</td>
                          <td className="px-3 py-2">{formatarStatus(usuario.status)}</td>
                          <td className="px-3 py-2">{formatarDataHora(usuario.ultimo_acesso_em)}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              <Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); selecionarUsuario(usuario.id_usuario, "cadastro"); }}>
                                Editar
                              </Button>
                              <Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setIdSelecionado(usuario.id_usuario); setPopupResetSenhaAberto(true); }}>
                                Senha
                              </Button>
                              <Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); abrirPopupStatus(usuario, usuario.status === "ATIVO" ? "INATIVO" : "ATIVO"); }}>
                                {usuario.status === "ATIVO" ? "Inativar" : "Ativar"}
                              </Button>
                              <Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); abrirPopupStatus(usuario, "BLOQUEADO"); }}>
                                Bloquear
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-[var(--g3-muted)]">
                    Total: {listaData?.paginacao.total ?? 0}
                    {atualizandoLista ? " (atualizando...)" : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={paginaAtual <= 1} onClick={() => setFiltros((v) => ({ ...v, pagina: paginaAtual - 1 }))}>
                      Anterior
                    </Button>
                    <span className="text-xs text-[var(--g3-muted)]">
                      Pagina {paginaAtual} de {totalPaginas}
                    </span>
                    <Button type="button" variant="outline" size="sm" disabled={paginaAtual >= totalPaginas} onClick={() => setFiltros((v) => ({ ...v, pagina: paginaAtual + 1 }))}>
                      Proxima
                    </Button>
                  </div>
                </div>
              </section>
            )}

            {abaAtiva === "cadastro" && (
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
                <div className="space-y-1 xl:col-span-5">
                  <Label>Nome completo *</Label>
                  <Input {...register("nome_completo")} onBlur={() => aplicarFormatacaoCampo("nome_completo")} />
                  {errors.nome_completo && <p className="text-xs text-red-600">{errors.nome_completo.message}</p>}
                </div>
                <div className="space-y-1 xl:col-span-3">
                  <Label>Nome de exibicao</Label>
                  <Input {...register("nome_exibicao")} onBlur={() => aplicarFormatacaoCampo("nome_exibicao")} />
                </div>
                <div className="space-y-1 xl:col-span-2">
                  <Label>Login *</Label>
                  <Input {...register("nome_usuario")} />
                  {errors.nome_usuario && <p className="text-xs text-red-600">{errors.nome_usuario.message}</p>}
                </div>
                <div className="space-y-1 xl:col-span-2">
                  <Label>Status *</Label>
                  <Select {...register("status")}>
                    {usuarioStatusOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1 xl:col-span-4">
                  <Label>E-mail *</Label>
                  <Input type="email" {...register("email")} />
                  {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
                </div>
                <div className="space-y-1 xl:col-span-2">
                  <Label>Telefone</Label>
                  <Input {...register("telefone")} />
                </div>
                <div className="space-y-1 xl:col-span-2">
                  <Label>CPF</Label>
                  <Input {...register("cpf")} />
                  {errors.cpf && <p className="text-xs text-red-600">{errors.cpf.message}</p>}
                </div>
                <div className="space-y-1 xl:col-span-2">
                  <Label>Matricula</Label>
                  <Input {...register("matricula")} />
                </div>
                <div className="space-y-1 xl:col-span-2">
                  <Label>Perfil</Label>
                  <Select value={perfilSelecionado} onChange={(event) => {
                    const value = event.target.value;
                    setValue("perfil_acesso", value, { shouldDirty: true, shouldValidate: true });
                    if (value && !permissoesSelecionadas.includes(value)) {
                      setValue("permissoes", [...permissoesSelecionadas, value], { shouldDirty: true, shouldValidate: true });
                    }
                  }}>
                    {permissoesDisponiveis.map((permissao) => (
                      <option key={permissao} value={permissao}>
                        {permissao}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1 xl:col-span-4">
                  <Label>Setor</Label>
                  <Input {...register("setor")} onBlur={() => aplicarFormatacaoCampo("setor")} />
                </div>
                <div className="space-y-1 xl:col-span-4">
                  <Label>Unidade</Label>
                  <Input {...register("unidade")} onBlur={() => aplicarFormatacaoCampo("unidade")} />
                </div>
                <div className="space-y-1 xl:col-span-4">
                  <Label>Cargo / funcao</Label>
                  <Input {...register("cargo")} onBlur={() => aplicarFormatacaoCampo("cargo")} />
                </div>
                {!getValues("id_usuario") && (
                  <>
                    <div className="space-y-1 xl:col-span-3">
                      <Label>Senha inicial *</Label>
                      <Input type="password" {...register("senha")} />
                      {errors.senha && <p className="text-xs text-red-600">{errors.senha.message}</p>}
                    </div>
                    <div className="space-y-1 xl:col-span-3">
                      <Label>Confirmar senha *</Label>
                      <Input type="password" {...register("confirmar_senha")} />
                      {errors.confirmar_senha && <p className="text-xs text-red-600">{errors.confirmar_senha.message}</p>}
                    </div>
                  </>
                )}
                <div className="flex flex-wrap items-center gap-3 xl:col-span-12">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--g3-foreground)]">
                    <Checkbox
                      checked={!!watch("exigir_troca_senha")}
                      onChange={(event) =>
                        setValue("exigir_troca_senha", event.target.checked, {
                          shouldDirty: true,
                          shouldValidate: true
                        })
                      }
                    />
                    Exigir troca de senha no primeiro acesso
                  </label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setPopupResetSenhaAberto(true)} disabled={!getValues("id_usuario")}>
                    <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                    Redefinir senha
                  </Button>
                </div>
              </section>
            )}

            {abaAtiva === "permissoes" && (
              <section className="space-y-3">
                {carregandoPermissoes && <p className="text-sm text-[var(--g3-muted)]">Carregando permissoes...</p>}
                {!carregandoPermissoes && !gruposPermissoes.length && <p className="text-sm text-[var(--g3-muted)]">Nenhuma permissao cadastrada.</p>}
                {gruposPermissoes.map((grupo) => (
                  <Card key={grupo.modulo} className="border border-[var(--g3-border)]">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-[var(--g3-active)]">{grupo.modulo}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {grupo.itens.map((item) => {
                        const marcada = permissoesSelecionadas.includes(item.nome);
                        return (
                          <label key={item.nome} className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm ${marcada ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)]" : "border-[var(--g3-border)] bg-white"}`}>
                            <Checkbox checked={marcada} onChange={() => trocarPermissao(item.nome)} />
                            <span>
                              <span className="block font-semibold">{item.nome}</span>
                              <span className="block text-xs text-[var(--g3-muted)]">{item.tela} - {item.acao}</span>
                            </span>
                          </label>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </section>
            )}

            {abaAtiva === "auditoria" && (
              <section className="space-y-3">
                {carregandoUsuario && <p className="text-sm text-[var(--g3-muted)]">Carregando historico...</p>}
                {!carregandoUsuario && !idSelecionado && <p className="text-sm text-[var(--g3-muted)]">Selecione um usuario na listagem.</p>}
                {!carregandoUsuario && idSelecionado && !usuarioData?.auditoria?.length && (
                  <p className="text-sm text-[var(--g3-muted)]">Nenhum registro de auditoria para este usuario.</p>
                )}
                {!!usuarioData?.auditoria?.length && (
                  <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
                    <table className="min-w-full text-sm">
                      <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                        <tr>
                          <th className="px-3 py-2 text-left">Data</th>
                          <th className="px-3 py-2 text-left">Acao</th>
                          <th className="px-3 py-2 text-left">Executado por</th>
                          <th className="px-3 py-2 text-left">Detalhes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usuarioData.auditoria.map((item, indice) => (
                          <tr key={item.id} className={`border-t border-[var(--g3-border)] ${indice % 2 === 0 ? "bg-white" : "bg-[var(--g3-primary-soft)]/35"}`}>
                            <td className="px-3 py-2">{formatarDataHora(item.criado_em)}</td>
                            <td className="px-3 py-2">{item.acao}</td>
                            <td className="px-3 py-2">{item.usuario_nome ?? "Sistema"}</td>
                            <td className="px-3 py-2">
                              <pre className="max-w-[560px] whitespace-pre-wrap break-all text-xs text-[var(--g3-muted)]">
                                {item.dados_json ? JSON.stringify(item.dados_json, null, 2) : "---"}
                              </pre>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </CardContent>
        </Card>
      </div>

      {popupMensagem && <PopupMensagem {...popupMensagem} onClose={() => setPopupMensagem(null)} />}

      {popupConfirmacao && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4" onClick={() => !acaoEmAndamento && setPopupConfirmacao(null)}>
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">{popupConfirmacao.titulo}</h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-slate-700">{popupConfirmacao.texto}</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setPopupConfirmacao(null)} disabled={acaoEmAndamento}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => void confirmarPopupAcao()} disabled={acaoEmAndamento}>
                {acaoEmAndamento ? "Processando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {popupResetSenhaAberto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4" onClick={() => !resetarSenhaMutation.isPending && setPopupResetSenhaAberto(false)}>
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Redefinir senha</h3>
            </div>
            <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Nova senha</Label>
                <Input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Confirmar nova senha</Label>
                <Input type="password" value={confirmarNovaSenha} onChange={(e) => setConfirmarNovaSenha(e.target.value)} />
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--g3-foreground)] sm:col-span-2">
                <Checkbox checked={exigirTrocaSenhaReset} onChange={(event) => setExigirTrocaSenhaReset(event.target.checked)} />
                Exigir troca de senha no proximo acesso
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setPopupResetSenhaAberto(false)} disabled={resetarSenhaMutation.isPending}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => void confirmarResetSenha()} disabled={resetarSenhaMutation.isPending}>
                {resetarSenhaMutation.isPending ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
