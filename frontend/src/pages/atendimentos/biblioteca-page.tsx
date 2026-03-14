import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Book, BookOpen, BookPlus, Image as ImageIcon, List, Plus, Printer, Save, Search, Trash2, Undo2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { useAlertasBiblioteca, useConsultarLivroIsbnBiblioteca, useEmprestimosBiblioteca, useLivrosBiblioteca, useProximoCodigoLivroBiblioteca, useRegistrarDevolucaoBiblioteca, useRemoverEmprestimoBiblioteca, useRemoverLivroBiblioteca, useSalvarEmprestimoBiblioteca, useSalvarLivroBiblioteca } from "@/features/biblioteca/use-biblioteca";
import { useBeneficiarios } from "@/features/beneficiarios/use-beneficiarios";
import { useAuth } from "@/hooks/use-auth";
import { obterUrlArquivoAutenticado } from "@/lib/arquivos";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import type { Beneficiario } from "@/types/beneficiario";
import type { BibliotecaEmprestimoCadastro, BibliotecaLivro, BibliotecaLivroCadastro } from "@/types/biblioteca";

type AbaId = "visao" | "livros" | "emprestimos" | "devolucoes" | "disponiveis" | "alertas";

const abas: AdminTab[] = [
  { id: "visao", label: "Visão geral", icon: BookOpen },
  { id: "livros", label: "Cadastro de livros", icon: BookPlus },
  { id: "emprestimos", label: "Empréstimos", icon: Book },
  { id: "devolucoes", label: "Devoluções", icon: Undo2 },
  { id: "disponiveis", label: "Livros disponíveis", icon: List },
  { id: "alertas", label: "Alertas de devolução", icon: AlertTriangle }
];

const tituloTela = "Biblioteca";

const defaultLivro: BibliotecaLivroCadastro = {
  codigo: "",
  titulo: "",
  autor: "",
  isbn: "",
  capaUrl: "",
  editora: "",
  anoPublicacao: null,
  categoria: "",
  quantidadeTotal: 1,
  quantidadeDisponivel: 1,
  localizacao: "",
  status: "ATIVO",
  estadoLivro: "",
  observacoes: ""
};

const opcoesEstadoLivro = ["Novo", "Ótimo", "Bom", "Regular", "Desgastado", "Danificado", "Em restauração", "Inutilizado"] as const;

const formatarNumero = (valor: number) => valor.toLocaleString("pt-BR");
const formatarDataIso = (data?: string | null) => {
  if (!data) return "Sem data";
  const [ano, mes, dia] = data.split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : data;
};

function localizarBeneficiarioPorNome(beneficiarios: Beneficiario[], nome: string) {
  const nomeNormalizado = nome.trim().toLocaleLowerCase("pt-BR");
  if (!nomeNormalizado) return null;
  return beneficiarios.find((item) => item.id_beneficiario && item.nome_completo.trim().toLocaleLowerCase("pt-BR") === nomeNormalizado) ?? null;
}

const descreverLivro = (item: Pick<BibliotecaLivro, "codigo" | "titulo">) => `${item.codigo} - ${item.titulo}`;

function filtrarLivrosPorTermo(livros: BibliotecaLivro[], valor: string) {
  const termo = valor.trim().toLocaleLowerCase("pt-BR");
  return livros.filter((item) => item.status === "ATIVO").filter((item) => {
    if (!termo) return true;
    const descricao = descreverLivro(item).toLocaleLowerCase("pt-BR");
    return `${item.codigo} ${item.titulo} ${item.autor} ${item.isbn ?? ""} ${descricao}`.toLocaleLowerCase("pt-BR").includes(termo);
  });
}

function localizarLivroPorDescricao(livros: BibliotecaLivro[], valor: string) {
  const termo = valor.trim().toLocaleLowerCase("pt-BR");
  if (!termo) return null;
  const exato = livros.filter((item) => item.status === "ATIVO").find((item) => {
    const descricao = descreverLivro(item).trim().toLocaleLowerCase("pt-BR");
    const titulo = item.titulo.trim().toLocaleLowerCase("pt-BR");
    const codigo = item.codigo.trim().toLocaleLowerCase("pt-BR");
    const isbn = item.isbn?.trim().toLocaleLowerCase("pt-BR");
    return descricao === termo || titulo === termo || codigo === termo || isbn === termo;
  }) ?? null;
  if (exato) {
    return exato;
  }
  const candidatos = filtrarLivrosPorTermo(livros, valor);
  return candidatos.length === 1 ? candidatos[0] : null;
}

const normalizarIsbn = (valor: string) => valor.replace(/[^0-9Xx]/g, "").toUpperCase();

export function BibliotecaPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const nomeResponsavelAtual = usuario?.nome?.trim() || usuario?.nomeUsuario || "";
  const defaultEmprestimo: BibliotecaEmprestimoCadastro = useMemo(() => ({ livroId: "", livroNome: "", beneficiarioId: "", beneficiarioNome: "", responsavelId: usuario?.id ?? "", responsavelNome: nomeResponsavelAtual, dataEmprestimo: new Date().toISOString().slice(0, 10), dataDevolucaoPrevista: "", status: "ATIVO" }), [nomeResponsavelAtual, usuario?.id]);
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("visao");
  const [livroForm, setLivroForm] = useState<BibliotecaLivroCadastro>(defaultLivro);
  const [emprestimoForm, setEmprestimoForm] = useState<BibliotecaEmprestimoCadastro>(defaultEmprestimo);
  const [livroSelecionadoId, setLivroSelecionadoId] = useState<string>();
  const [emprestimoSelecionadoId, setEmprestimoSelecionadoId] = useState<string>();
  const [buscaLivro, setBuscaLivro] = useState("");
  const [buscaEmprestimo, setBuscaEmprestimo] = useState("");
  const [capaLivroPreviewUrl, setCapaLivroPreviewUrl] = useState("");
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState<"livro" | "emprestimo" | null>(null);
  const livrosQuery = useLivrosBiblioteca();
  const emprestimosQuery = useEmprestimosBiblioteca();
  const alertasQuery = useAlertasBiblioteca();
  const proximoCodigoQuery = useProximoCodigoLivroBiblioteca();
  const consultarIsbnMutation = useConsultarLivroIsbnBiblioteca();
  const salvarLivroMutation = useSalvarLivroBiblioteca();
  const removerLivroMutation = useRemoverLivroBiblioteca();
  const salvarEmprestimoMutation = useSalvarEmprestimoBiblioteca();
  const removerEmprestimoMutation = useRemoverEmprestimoBiblioteca();
  const devolucaoMutation = useRegistrarDevolucaoBiblioteca();
  const beneficiariosQuery = useBeneficiarios({ nome: emprestimoForm.beneficiarioNome?.trim() ?? "" }, { enabled: (emprestimoForm.beneficiarioNome?.trim().length ?? 0) >= 2 });
  const livros = livrosQuery.data ?? [];
  const emprestimos = emprestimosQuery.data ?? [];
  const alertas = alertasQuery.data ?? [];
  const sugestoesBeneficiarios = useMemo(() => (beneficiariosQuery.data?.beneficiarios ?? []).slice(0, 8), [beneficiariosQuery.data]);
  const sugestoesLivros = useMemo(() => filtrarLivrosPorTermo(livros, emprestimoForm.livroNome ?? "").slice(0, 8), [emprestimoForm.livroNome, livros]);
  const livrosFiltrados = useMemo(() => livros.filter((item) => `${item.codigo} ${item.titulo} ${item.autor} ${item.isbn ?? ""}`.toLocaleLowerCase("pt-BR").includes(buscaLivro.toLocaleLowerCase("pt-BR"))), [buscaLivro, livros]);
  const emprestimosFiltrados = useMemo(() => emprestimos.filter((item) => `${item.livroTitulo} ${item.beneficiarioNome ?? ""}`.toLocaleLowerCase("pt-BR").includes(buscaEmprestimo.toLocaleLowerCase("pt-BR"))), [buscaEmprestimo, emprestimos]);
  const emprestimosPendentes = useMemo(() => emprestimos.filter((item) => item.status === "ATIVO" || item.status === "ATRASADO"), [emprestimos]);
  const totalTitulos = livros.length;
  const acervoAtivo = livros.filter((item) => item.status === "ATIVO").length;
  const acervoInativo = livros.filter((item) => item.status === "INATIVO").length;
  const totalExemplares = livros.reduce((acc, item) => acc + item.quantidadeTotal, 0);
  const exemplaresDisponiveis = livros.reduce((acc, item) => acc + item.quantidadeDisponivel, 0);
  const exemplaresEmprestados = Math.max(totalExemplares - exemplaresDisponiveis, 0);
  const emprestimosAtivos = emprestimos.filter((item) => item.status === "ATIVO").length;
  const emprestimosAtrasados = emprestimos.filter((item) => item.status === "ATRASADO").length;
  const alertasVencendo = alertas.filter((item) => item.status === "VENCENDO").length;
  const livrosSemDisponibilidade = livros.filter((item) => item.status === "ATIVO" && item.quantidadeDisponivel === 0).length;
  const categoriasAtivas = new Set(livros.map((item) => item.categoria?.trim()).filter((item): item is string => Boolean(item))).size;
  const taxaDisponibilidade = totalExemplares ? Math.round((exemplaresDisponiveis / totalExemplares) * 100) : 0;
  const proximaDevolucao = [...emprestimosPendentes].sort((a, b) => a.dataDevolucaoPrevista.localeCompare(b.dataDevolucaoPrevista))[0];
  const cardsVisao = [
    { titulo: "Acervo cadastrado", valor: formatarNumero(totalTitulos), detalhe1: `${formatarNumero(acervoAtivo)} ativos`, detalhe2: `${formatarNumero(acervoInativo)} inativos`, icon: BookPlus, classe: "from-emerald-100 via-white to-cyan-100 text-emerald-950 shadow-[0_24px_50px_-28px_rgba(16,185,129,0.55)]" },
    { titulo: "Exemplares", valor: formatarNumero(totalExemplares), detalhe1: `${formatarNumero(exemplaresDisponiveis)} disponíveis`, detalhe2: `${formatarNumero(exemplaresEmprestados)} emprestados`, icon: List, classe: "from-sky-100 via-white to-cyan-100 text-sky-950 shadow-[0_24px_50px_-28px_rgba(14,165,233,0.5)]" },
    { titulo: "Empréstimos ativos", valor: formatarNumero(emprestimosAtivos), detalhe1: `${formatarNumero(emprestimosPendentes.length)} pendentes`, detalhe2: `${formatarNumero(emprestimosAtrasados)} atrasados`, icon: Book, classe: "from-indigo-100 via-white to-sky-100 text-slate-950 shadow-[0_24px_50px_-28px_rgba(99,102,241,0.45)]" },
    { titulo: "Alertas", valor: formatarNumero(alertas.length), detalhe1: `${formatarNumero(alertasVencendo)} vencendo`, detalhe2: `${formatarNumero(emprestimosAtrasados)} em atraso`, icon: AlertTriangle, classe: "from-amber-100 via-white to-orange-100 text-amber-950 shadow-[0_24px_50px_-28px_rgba(245,158,11,0.55)]" },
    { titulo: "Disponibilidade", valor: `${taxaDisponibilidade}%`, detalhe1: `${formatarNumero(categoriasAtivas)} categorias`, detalhe2: `${formatarNumero(livrosSemDisponibilidade)} sem estoque`, icon: BookOpen, classe: "from-teal-100 via-white to-emerald-100 text-teal-950 shadow-[0_24px_50px_-28px_rgba(13,148,136,0.55)]" },
    { titulo: "Próxima devolução", valor: proximaDevolucao ? formatarDataIso(proximaDevolucao.dataDevolucaoPrevista) : "--", detalhe1: proximaDevolucao?.livroTitulo ?? "Sem pendências", detalhe2: proximaDevolucao?.beneficiarioNome ?? "Nenhum beneficiário pendente", icon: Undo2, classe: "from-rose-100 via-white to-pink-100 text-rose-950 shadow-[0_24px_50px_-28px_rgba(244,63,94,0.45)]" }
  ] as const;
  const carregandoAcoes = consultarIsbnMutation.isPending || salvarLivroMutation.isPending || removerLivroMutation.isPending || salvarEmprestimoMutation.isPending || removerEmprestimoMutation.isPending || devolucaoMutation.isPending;
  const salvandoAtual = abaAtiva === "livros" ? salvarLivroMutation.isPending : abaAtiva === "emprestimos" ? salvarEmprestimoMutation.isPending : false;
  useEffect(() => { if (!livroSelecionadoId && proximoCodigoQuery.data) setLivroForm((atual) => ({ ...atual, codigo: proximoCodigoQuery.data })); }, [livroSelecionadoId, proximoCodigoQuery.data]);
  useEffect(() => { if (emprestimoSelecionadoId || !nomeResponsavelAtual) return; setEmprestimoForm((atual) => ({ ...atual, responsavelId: usuario?.id ?? atual.responsavelId ?? "", responsavelNome: atual.responsavelNome?.trim() || nomeResponsavelAtual })); }, [emprestimoSelecionadoId, nomeResponsavelAtual, usuario?.id]);
  useEffect(() => {
    let ativo = true;
    let revokeAtual: (() => void) | undefined;
    const capaAtual = livroForm.capaUrl?.trim() ?? "";

    if (!capaAtual) {
      setCapaLivroPreviewUrl("");
      return;
    }

    if (
      capaAtual.startsWith("data:") ||
      capaAtual.startsWith("blob:") ||
      /^https?:\/\//i.test(capaAtual)
    ) {
      setCapaLivroPreviewUrl(capaAtual);
      return;
    }

    void (async () => {
      try {
        const arquivo = await obterUrlArquivoAutenticado(capaAtual);
        if (!ativo) {
          arquivo.revoke?.();
          return;
        }

        revokeAtual = arquivo.revoke;
        setCapaLivroPreviewUrl(arquivo.url);
      } catch {
        if (!ativo) return;
        setCapaLivroPreviewUrl("");
      }
    })();

    return () => {
      ativo = false;
      revokeAtual?.();
    };
  }, [livroForm.capaUrl]);
  function novo() { setLivroSelecionadoId(undefined); setEmprestimoSelecionadoId(undefined); setLivroForm({ ...defaultLivro, codigo: proximoCodigoQuery.data ?? "" }); setEmprestimoForm(defaultEmprestimo); setAbaAtiva("livros"); }
  function cancelar() { novo(); }
  function selecionarLivro(id: string) { const item = livros.find((livro) => livro.id === id); if (!item) return; setLivroSelecionadoId(id); setLivroForm({ codigo: item.codigo, titulo: item.titulo, autor: item.autor, isbn: item.isbn, capaUrl: item.capaUrl ?? "", editora: item.editora, anoPublicacao: item.anoPublicacao, categoria: item.categoria, quantidadeTotal: item.quantidadeTotal, quantidadeDisponivel: item.quantidadeDisponivel, localizacao: item.localizacao, status: item.status, estadoLivro: item.estadoLivro, observacoes: item.observacoes }); setAbaAtiva("livros"); }
  function selecionarEmprestimo(id: string) { const item = emprestimos.find((emprestimo) => emprestimo.id === id); if (!item) return; setEmprestimoSelecionadoId(id); setEmprestimoForm({ livroId: item.livroId, livroNome: item.livroCodigo && item.livroTitulo ? descreverLivro({ codigo: item.livroCodigo, titulo: item.livroTitulo }) : item.livroTitulo ?? "", beneficiarioId: item.beneficiarioId, beneficiarioNome: item.beneficiarioNome, responsavelId: item.responsavelId, responsavelNome: item.responsavelNome, dataEmprestimo: item.dataEmprestimo, dataDevolucaoPrevista: item.dataDevolucaoPrevista, dataDevolucaoReal: item.dataDevolucaoReal, status: item.status, observacoes: item.observacoes }); setAbaAtiva("emprestimos"); }
  function atualizarLivroEmprestimo(valor: string) { const item = localizarLivroPorDescricao(livros, valor); setEmprestimoForm((atual) => ({ ...atual, livroNome: valor, livroId: item?.id ?? "" })); }
  function atualizarBeneficiarioEmprestimo(valor: string) { const item = localizarBeneficiarioPorNome(sugestoesBeneficiarios, valor); setEmprestimoForm((atual) => ({ ...atual, beneficiarioNome: valor, beneficiarioId: item?.id_beneficiario ?? "" })); }
  async function buscarLivroPorIsbn() { const isbn = normalizarIsbn(livroForm.isbn ?? ""); if (isbn.length !== 10 && isbn.length !== 13) { setPopup({ tipo: "aviso", titulo: "Validação", texto: "Informe um ISBN válido com 10 ou 13 caracteres." }); return; } try { const livroApi = await consultarIsbnMutation.mutateAsync(isbn); setLivroForm((atual) => ({ ...atual, isbn: livroApi.isbn, titulo: livroApi.titulo || atual.titulo, autor: livroApi.autor || atual.autor, capaUrl: livroApi.capaUrl ?? atual.capaUrl ?? "", editora: livroApi.editora ?? atual.editora ?? "", anoPublicacao: livroApi.anoPublicacao ?? atual.anoPublicacao ?? null, categoria: livroApi.categoria ?? atual.categoria ?? "", observacoes: atual.observacoes?.trim() || livroApi.sinopse || atual.observacoes || "" })); setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Dados do livro carregados pelo ISBN." }); } catch (error: any) { setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível consultar o ISBN." }); } }
  async function salvar() { try { if (abaAtiva === "livros") { if (!livroForm.codigo?.trim() || !livroForm.titulo?.trim() || !livroForm.autor?.trim()) { setPopup({ tipo: "aviso", titulo: "Validação", texto: "Preencha código, título e autor do livro." }); return; } await salvarLivroMutation.mutateAsync({ id: livroSelecionadoId, payload: livroForm }); setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Livro salvo com sucesso." }); return; } if (abaAtiva === "emprestimos") { const beneficiarioSelecionado = emprestimoForm.beneficiarioId && emprestimoForm.beneficiarioNome ? { id: emprestimoForm.beneficiarioId, nome: emprestimoForm.beneficiarioNome } : (() => { const item = localizarBeneficiarioPorNome(sugestoesBeneficiarios, emprestimoForm.beneficiarioNome ?? ""); return item?.id_beneficiario ? { id: item.id_beneficiario, nome: item.nome_completo } : null; })(); const livroSelecionado = (emprestimoForm.livroId ? livros.find((item) => item.id === emprestimoForm.livroId) ?? null : null) ?? localizarLivroPorDescricao(livros, emprestimoForm.livroNome ?? ""); if (!livroSelecionado || !beneficiarioSelecionado || !emprestimoForm.dataDevolucaoPrevista) { setPopup({ tipo: "aviso", titulo: "Validação", texto: "Selecione um livro cadastrado por nome, código ou ISBN, um beneficiário cadastrado e a data prevista." }); return; } const { livroNome, ...emprestimoPayload } = emprestimoForm; await salvarEmprestimoMutation.mutateAsync({ id: emprestimoSelecionadoId, payload: { ...emprestimoPayload, livroId: livroSelecionado.id, beneficiarioId: beneficiarioSelecionado.id, beneficiarioNome: beneficiarioSelecionado.nome, responsavelId: emprestimoForm.responsavelId || usuario?.id || null, responsavelNome: emprestimoForm.responsavelNome?.trim() || nomeResponsavelAtual } }); setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Empréstimo salvo com sucesso." }); return; } setPopup({ tipo: "aviso", titulo: "Atenção", texto: "Selecione a aba de livros ou empréstimos para salvar." }); } catch (error: any) { setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível salvar." }); } }
  async function registrarDevolucao(id: string) { try { await devolucaoMutation.mutateAsync({ id, dataDevolucaoReal: new Date().toISOString().slice(0, 10) }); setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "A devolução foi realizada com sucesso e o livro retornou para a biblioteca." }); } catch (error: any) { setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível registrar a devolução." }); } }
  async function confirmarExclusaoAtual() { try { if (confirmarExcluir === "livro" && livroSelecionadoId) await removerLivroMutation.mutateAsync(livroSelecionadoId); if (confirmarExcluir === "emprestimo" && emprestimoSelecionadoId) await removerEmprestimoMutation.mutateAsync(emprestimoSelecionadoId); setConfirmarExcluir(null); novo(); setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Registro excluído com sucesso." }); } catch (error: any) { setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível excluir." }); } }
  function imprimir() { try { imprimirConteudoAtual({ titulo: "Biblioteca" }); } catch (error: any) { setPopup({ tipo: "erro", titulo: "Erro", texto: error?.message ?? "Não foi possível preparar a impressão." }); } }
  const acoes: AdminAction[] = [
    { label: "Buscar", icon: Search, onClick: () => setAbaAtiva("livros"), variant: "outline" },
    { label: "Novo", icon: Plus, onClick: novo, variant: "default", disabled: carregandoAcoes },
    { label: salvandoAtual ? "Salvando..." : "Salvar", icon: Save, onClick: () => void salvar(), variant: "default", disabled: carregandoAcoes },
    { label: "Cancelar", icon: Undo2, onClick: cancelar, variant: "outline", disabled: carregandoAcoes },
    { label: "Excluir", icon: Trash2, onClick: () => setConfirmarExcluir(abaAtiva === "emprestimos" ? "emprestimo" : "livro"), variant: "danger", disabled: (abaAtiva === "emprestimos" ? !emprestimoSelecionadoId : !livroSelecionadoId) || carregandoAcoes },
    { label: "Imprimir", icon: Printer, onClick: imprimir, variant: "outline" },
    { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
  ];

  return (
    <>
      <AdminPageLayout tabs={abas} activeTab={abaAtiva} onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)} actions={acoes} sectionLabel="Atendimentos" pageTitle={tituloTela} activeTitle={abas.find((item) => item.id === abaAtiva)?.label} codeBadge={livroSelecionadoId ?? emprestimoSelecionadoId ? `Código: ${livroSelecionadoId ?? emprestimoSelecionadoId}` : "Novo"}>
        {abaAtiva === "visao" ? <section className="space-y-4"><Card className="overflow-hidden border-emerald-200/80 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-[0_24px_60px_-38px_rgba(6,182,212,0.9)]"><CardContent className="space-y-5 px-5 py-6 text-center"><div className="space-y-2"><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80">Biblioteca</p><h2 className="text-xl font-semibold sm:text-2xl">Painel moderno do acervo</h2><p className="mx-auto max-w-2xl text-xs leading-5 text-white/85 sm:text-sm">Acompanhe o desempenho da biblioteca, a disponibilidade do acervo e a movimentação de empréstimos em tempo real.</p></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/20 bg-white/15 px-4 py-3 backdrop-blur"><p className="text-[11px] uppercase tracking-[0.18em] text-white/75">Títulos</p><p className="mt-2 text-2xl font-semibold">{formatarNumero(totalTitulos)}</p><p className="mt-1 text-[11px] text-white/80">{formatarNumero(totalExemplares)} exemplares no total</p></div><div className="rounded-2xl border border-white/20 bg-white/15 px-4 py-3 backdrop-blur"><p className="text-[11px] uppercase tracking-[0.18em] text-white/75">Disponíveis</p><p className="mt-2 text-2xl font-semibold">{formatarNumero(exemplaresDisponiveis)}</p><p className="mt-1 text-[11px] text-white/80">{taxaDisponibilidade}% do acervo pronto para empréstimo</p></div><div className="rounded-2xl border border-white/20 bg-white/15 px-4 py-3 backdrop-blur"><p className="text-[11px] uppercase tracking-[0.18em] text-white/75">Operação</p><p className="mt-2 text-2xl font-semibold">{formatarNumero(emprestimosPendentes.length)}</p><p className="mt-1 text-[11px] text-white/80">pendências monitoradas por {nomeResponsavelAtual || "usuário atual"}</p></div></div></CardContent></Card><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cardsVisao.map((card) => { const Icone = card.icon; return <Card key={card.titulo} className={`overflow-hidden border-white/70 bg-gradient-to-br ${card.classe}`}><CardHeader className="items-center space-y-2 pb-2 text-center"><div className="rounded-full border border-white/70 bg-white/70 p-2.5 shadow-sm"><Icone className="h-5 w-5" /></div><CardTitle className="text-[11px] uppercase tracking-[0.18em] opacity-70">{card.titulo}</CardTitle></CardHeader><CardContent className="space-y-1.5 px-4 pb-4 text-center"><p className="text-2xl font-semibold leading-none">{card.valor}</p><p className="text-sm font-medium">{card.detalhe1}</p><p className="text-[11px] opacity-70">{card.detalhe2}</p></CardContent></Card>; })}</div></section> : null}
        {abaAtiva === "livros" ? (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1">
                <Label>Código *</Label>
                <Input
                  value={livroForm.codigo}
                  onChange={(event) =>
                    setLivroForm((atual) => ({ ...atual, codigo: event.target.value }))
                  }
                  disabled={carregandoAcoes}
                />
              </div>
              <div className="space-y-1 xl:col-span-2">
                <Label>ISBN</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={livroForm.isbn ?? ""}
                    inputMode="numeric"
                    placeholder="9788545702870"
                    onChange={(event) =>
                      setLivroForm((atual) => ({
                        ...atual,
                        isbn: normalizarIsbn(event.target.value)
                      }))
                    }
                    disabled={carregandoAcoes}
                  />
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => void buscarLivroPorIsbn()}
                    disabled={carregandoAcoes}
                    className="border border-emerald-300 bg-emerald-200 text-emerald-950 shadow-sm hover:bg-emerald-300 active:bg-emerald-500 active:text-white sm:min-w-[150px]"
                  >
                    {consultarIsbnMutation.isPending ? "Buscando ISBN..." : "Buscar ISBN"}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={livroForm.status}
                  onChange={(event) =>
                    setLivroForm((atual) => ({
                      ...atual,
                      status: event.target.value as BibliotecaLivroCadastro["status"]
                    }))
                  }
                  disabled={carregandoAcoes}
                >
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                </Select>
              </div>
              <div className="space-y-1 md:row-span-4 xl:col-span-1">
                <Label>Capa do livro</Label>
                <div className="flex min-h-[260px] items-center justify-center overflow-hidden rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-3">
                  {capaLivroPreviewUrl ? (
                    <img
                      src={capaLivroPreviewUrl}
                      alt={livroForm.titulo?.trim() ? `Capa de ${livroForm.titulo}` : "Capa do livro"}
                      className="h-full max-h-[320px] w-full rounded-lg object-contain shadow-[0_18px_40px_-28px_rgba(15,118,110,0.6)]"
                    />
                  ) : (
                    <div className="space-y-2 px-4 text-center text-emerald-900/80">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200 bg-white/80">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium">Nenhuma capa carregada</p>
                      <p className="text-xs leading-5 text-slate-600">
                        Use o botão Buscar ISBN para preencher a capa quando a base pública
                        disponibilizar a imagem.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1 xl:col-span-2">
                <Label>Título *</Label>
                <Input
                  value={livroForm.titulo}
                  onChange={(event) =>
                    setLivroForm((atual) => ({ ...atual, titulo: event.target.value }))
                  }
                  disabled={carregandoAcoes}
                />
              </div>
              <div className="space-y-1 xl:col-span-2">
                <Label>Autor *</Label>
                <Input
                  value={livroForm.autor}
                  onChange={(event) =>
                    setLivroForm((atual) => ({ ...atual, autor: event.target.value }))
                  }
                  disabled={carregandoAcoes}
                />
              </div>
              <div className="space-y-1">
                <Label>Editora</Label>
                <Input
                  value={livroForm.editora ?? ""}
                  onChange={(event) =>
                    setLivroForm((atual) => ({ ...atual, editora: event.target.value }))
                  }
                  disabled={carregandoAcoes}
                />
              </div>
              <div className="space-y-1">
                <Label>Ano de publicação</Label>
                <Input
                  type="number"
                  value={livroForm.anoPublicacao ?? ""}
                  onChange={(event) =>
                    setLivroForm((atual) => ({
                      ...atual,
                      anoPublicacao: event.target.value ? Number(event.target.value) : null
                    }))
                  }
                  disabled={carregandoAcoes}
                />
              </div>
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Input
                  value={livroForm.categoria ?? ""}
                  onChange={(event) =>
                    setLivroForm((atual) => ({ ...atual, categoria: event.target.value }))
                  }
                  disabled={carregandoAcoes}
                />
              </div>
              <div className="space-y-1">
                <Label>Localização</Label>
                <Input
                  value={livroForm.localizacao ?? ""}
                  onChange={(event) =>
                    setLivroForm((atual) => ({ ...atual, localizacao: event.target.value }))
                  }
                  disabled={carregandoAcoes}
                />
              </div>
              <div className="space-y-1">
                <Label>Qtd. total</Label>
                <Input
                  type="number"
                  value={livroForm.quantidadeTotal}
                  onChange={(event) =>
                    setLivroForm((atual) => ({
                      ...atual,
                      quantidadeTotal: Number(event.target.value) || 0
                    }))
                  }
                  disabled={carregandoAcoes}
                />
              </div>
              <div className="space-y-1">
                <Label>Qtd. disponível</Label>
                <Input
                  type="number"
                  value={livroForm.quantidadeDisponivel}
                  onChange={(event) =>
                    setLivroForm((atual) => ({
                      ...atual,
                      quantidadeDisponivel: Number(event.target.value) || 0
                    }))
                  }
                  disabled={carregandoAcoes}
                />
              </div>
              <div className="space-y-1">
                <Label>Estado do livro</Label>
                <Select
                  value={livroForm.estadoLivro ?? ""}
                  onChange={(event) =>
                    setLivroForm((atual) => ({ ...atual, estadoLivro: event.target.value }))
                  }
                  disabled={carregandoAcoes}
                >
                  <option value="">Selecione</option>
                  {opcoesEstadoLivro.map((opcao) => (
                    <option key={opcao} value={opcao}>
                      {opcao}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1 md:col-span-2 xl:col-span-4">
                <Label>Observações</Label>
                <Textarea
                  rows={3}
                  value={livroForm.observacoes ?? ""}
                  onChange={(event) =>
                    setLivroForm((atual) => ({ ...atual, observacoes: event.target.value }))
                  }
                  disabled={carregandoAcoes}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Buscar livro</Label>
              <Input
                placeholder="Título, autor, código ou ISBN"
                value={buscaLivro}
                onChange={(event) => setBuscaLivro(event.target.value)}
                disabled={carregandoAcoes}
              />
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Código</th>
                    <th className="px-3 py-2 text-left">Título</th>
                    <th className="px-3 py-2 text-left">Autor</th>
                    <th className="px-3 py-2 text-left">ISBN</th>
                    <th className="px-3 py-2 text-left">Disponíveis</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {livrosFiltrados.length ? (
                    livrosFiltrados.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}
                      >
                        <td className="px-3 py-2">{item.codigo}</td>
                        <td className="px-3 py-2">{item.titulo}</td>
                        <td className="px-3 py-2">{item.autor}</td>
                        <td className="px-3 py-2">{item.isbn ?? "---"}</td>
                        <td className="px-3 py-2">{item.quantidadeDisponivel}</td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => selecionarLivro(item.id)}
                            disabled={carregandoAcoes}
                          >
                            Selecionar
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center">
                        {livrosQuery.isLoading
                          ? "Carregando livros..."
                          : "Nenhum livro encontrado."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
        {abaAtiva === "emprestimos" ? <section className="space-y-3"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><div className="space-y-1"><Label>Livro *</Label><Input list="catalogo-livros-biblioteca" value={emprestimoForm.livroNome ?? ""} onChange={(event) => atualizarLivroEmprestimo(event.target.value)} onBlur={(event) => atualizarLivroEmprestimo(event.target.value)} disabled={carregandoAcoes} placeholder="Digite nome, código ou ISBN" /><datalist id="catalogo-livros-biblioteca">{sugestoesLivros.map((item) => <option key={item.id} value={descreverLivro(item)}>{`Código ${item.codigo}${item.isbn ? ` | ISBN ${item.isbn}` : ""}`}</option>)}</datalist><p className="text-xs text-slate-500">Digite o nome do livro, o código ou o ISBN para localizar o acervo.</p></div><div className="space-y-1"><Label>Beneficiário *</Label><Input list="catalogo-beneficiarios-biblioteca" value={emprestimoForm.beneficiarioNome ?? ""} onChange={(event) => atualizarBeneficiarioEmprestimo(event.target.value)} onBlur={(event) => atualizarBeneficiarioEmprestimo(event.target.value)} disabled={carregandoAcoes} placeholder="Digite para localizar um beneficiário" /><datalist id="catalogo-beneficiarios-biblioteca">{sugestoesBeneficiarios.map((item, index) => <option key={item.id_beneficiario ?? `${item.nome_completo}-${index}`} value={item.nome_completo}>{item.codigo ? `Código ${item.codigo}` : "Beneficiário cadastrado"}</option>)}</datalist><p className="text-xs text-slate-500">O empréstimo deve ser vinculado a um beneficiário já cadastrado.</p></div><div className="space-y-1"><Label>Responsável</Label><Input value={emprestimoForm.responsavelNome ?? ""} readOnly disabled={carregandoAcoes} /></div><div className="space-y-1"><Label>Status</Label><Select value={emprestimoForm.status ?? "ATIVO"} onChange={(event) => setEmprestimoForm((atual) => ({ ...atual, status: event.target.value as BibliotecaEmprestimoCadastro["status"] }))} disabled={carregandoAcoes}><option value="ATIVO">Ativo</option><option value="ATRASADO">Atrasado</option><option value="DEVOLVIDO">Devolvido</option><option value="CANCELADO">Cancelado</option></Select></div><div className="space-y-1"><Label>Data empréstimo *</Label><Input type="date" value={emprestimoForm.dataEmprestimo} onChange={(event) => setEmprestimoForm((atual) => ({ ...atual, dataEmprestimo: event.target.value }))} disabled={carregandoAcoes} /></div><div className="space-y-1"><Label>Data prevista *</Label><Input type="date" value={emprestimoForm.dataDevolucaoPrevista} onChange={(event) => setEmprestimoForm((atual) => ({ ...atual, dataDevolucaoPrevista: event.target.value }))} disabled={carregandoAcoes} /></div><div className="space-y-1"><Label>Data real</Label><Input type="date" value={emprestimoForm.dataDevolucaoReal ?? ""} onChange={(event) => setEmprestimoForm((atual) => ({ ...atual, dataDevolucaoReal: event.target.value }))} disabled={carregandoAcoes} /></div><div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Observações</Label><Textarea rows={2} value={emprestimoForm.observacoes ?? ""} onChange={(event) => setEmprestimoForm((atual) => ({ ...atual, observacoes: event.target.value }))} disabled={carregandoAcoes} /></div></div><div className="space-y-1"><Label>Buscar empréstimo</Label><Input value={buscaEmprestimo} onChange={(event) => setBuscaEmprestimo(event.target.value)} disabled={carregandoAcoes} /></div><div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Livro</th><th className="px-3 py-2 text-left">Beneficiário</th><th className="px-3 py-2 text-left">Prevista</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Ações</th></tr></thead><tbody>{emprestimosFiltrados.length ? emprestimosFiltrados.map((item, index) => <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{item.livroTitulo}</td><td className="px-3 py-2">{item.beneficiarioNome ?? "---"}</td><td className="px-3 py-2">{item.dataDevolucaoPrevista}</td><td className="px-3 py-2">{item.status}</td><td className="px-3 py-2 text-right"><Button size="sm" variant="outline" onClick={() => selecionarEmprestimo(item.id)} disabled={carregandoAcoes}>Selecionar</Button></td></tr>) : <tr><td colSpan={5} className="px-3 py-4 text-center">{emprestimosQuery.isLoading ? "Carregando empréstimos..." : "Nenhum empréstimo encontrado."}</td></tr>}</tbody></table></div></section> : null}
        {abaAtiva === "devolucoes" ? <section className="overflow-x-auto rounded-lg border border-[var(--g3-border)]"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Livro</th><th className="px-3 py-2 text-left">Beneficiário</th><th className="px-3 py-2 text-left">Data prevista</th><th className="px-3 py-2 text-right">Ações</th></tr></thead><tbody>{emprestimosPendentes.length ? emprestimosPendentes.map((item, index) => <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{item.livroTitulo}</td><td className="px-3 py-2">{item.beneficiarioNome ?? "---"}</td><td className="px-3 py-2">{item.dataDevolucaoPrevista}</td><td className="px-3 py-2 text-right"><Button size="sm" onClick={() => void registrarDevolucao(item.id)} disabled={devolucaoMutation.isPending}>{devolucaoMutation.isPending ? "Registrando..." : "Registrar devolução"}</Button></td></tr>) : <tr><td colSpan={4} className="px-3 py-4 text-center">Nenhuma devolução pendente.</td></tr>}</tbody></table></section> : null}
        {abaAtiva === "disponiveis" ? <section className="overflow-x-auto rounded-lg border border-[var(--g3-border)]"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Código</th><th className="px-3 py-2 text-left">Título</th><th className="px-3 py-2 text-left">Autor</th><th className="px-3 py-2 text-left">Disponíveis</th></tr></thead><tbody>{livros.filter((item) => item.status === "ATIVO" && item.quantidadeDisponivel > 0).map((item, index) => <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{item.codigo}</td><td className="px-3 py-2">{item.titulo}</td><td className="px-3 py-2">{item.autor}</td><td className="px-3 py-2">{item.quantidadeDisponivel}</td></tr>)}</tbody></table></section> : null}
        {abaAtiva === "alertas" ? <section className="overflow-x-auto rounded-lg border border-[var(--g3-border)]"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Livro</th><th className="px-3 py-2 text-left">Beneficiário</th><th className="px-3 py-2 text-left">Prevista</th><th className="px-3 py-2 text-left">Dias</th><th className="px-3 py-2 text-left">Status</th></tr></thead><tbody>{alertas.length ? alertas.map((item, index) => <tr key={item.emprestimoId} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{item.livroTitulo}</td><td className="px-3 py-2">{item.beneficiarioNome ?? "---"}</td><td className="px-3 py-2">{item.dataDevolucaoPrevista}</td><td className="px-3 py-2">{item.diasParaVencimento}</td><td className="px-3 py-2">{item.status}</td></tr>) : <tr><td colSpan={5} className="px-3 py-4 text-center">{alertasQuery.isLoading ? "Carregando alertas..." : "Nenhum alerta no momento."}</td></tr>}</tbody></table></section> : null}
      </AdminPageLayout>
      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
      <PopupConfirmacao aberto={!!confirmarExcluir} titulo="Confirmar exclusão" texto="Esta ação é irreversível. Deseja continuar?" processando={removerLivroMutation.isPending || removerEmprestimoMutation.isPending} onCancel={() => setConfirmarExcluir(null)} onConfirm={() => void confirmarExclusaoAtual()} confirmarTexto="Excluir" />
    </>
  );
}
