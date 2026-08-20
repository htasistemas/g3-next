import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  X
} from "lucide-react";

import { CursoCatalogoCard } from "@/components/matriculas/curso-catalogo-card";
import { Button } from "@/components/ui/button";
import { httpClient } from "@/services/http-client";
import { portalInscricoesService } from "@/services/portal-inscricoes.service";

type Opportunity = {
  id: string;
  nome: string;
  tipo: string;
  descricao: string;
  imagem?: string;
  modalidade: string;
  local: string;
  periodo?: string;
  horario?: string;
  vagasDisponiveis: number;
  vagasTotais?: number;
  totalInscritos?: number;
  totalFila?: number;
  status: string;
  encerramento?: string;
};

const statusLabel: Record<string, string> = {
  ABERTAS: "Inscrições abertas",
  ULTIMAS_VAGAS: "Últimas vagas",
  LISTA_ESPERA: "Lista de espera",
  ENCERRADAS: "Inscrições encerradas",
  EM_BREVE: "Em breve"
};

const baseApi = String(httpClient.defaults.baseURL ?? "").replace(/\/$/, "");

function imagemOportunidade(slug: string, oportunidade: Opportunity) {
  if (!oportunidade.imagem) return "";
  if (/^(data:|blob:|https?:\/\/)/i.test(oportunidade.imagem)) return oportunidade.imagem;
  return `${baseApi}/api/portal-inscricoes/publico/${slug}/oportunidades/${oportunidade.id}/imagem`;
}

function PortalLogo({ slug }: { slug: string }) {
  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/25 bg-white/15 shadow-lg backdrop-blur">
      <img
        src={`${baseApi}/api/portais-externos/transparencia/${slug}/logo`}
        alt=""
        className="h-full w-full object-contain p-2"
        onError={(event) => { event.currentTarget.style.display = "none"; }}
      />
      <ClipboardCheck className="h-7 w-7 text-white" style={{ display: "none" }} />
    </div>
  );
}

export function PortalInscricoesPage() {
  const slug = window.location.pathname.split("/").filter(Boolean)[1] || "";
  const [data, setData] = useState<any>();
  const [instituicoes, setInstituicoes] = useState<Array<{ slug: string; nome: string }>>([]);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todos");
  const [somenteVagas, setSomenteVagas] = useState(false);
  const [selecionada, setSelecionada] = useState<Opportunity>();
  const [etapa, setEtapa] = useState(0);
  const [erro, setErro] = useState("");
  const [protocolo, setProtocolo] = useState("");
  const [form, setForm] = useState<any>({ cpf: "", nomeCompleto: "", dataNascimento: "", telefone: "", email: "", termosVersao: "1.0", termosAceitos: false });

  useEffect(() => {
    setErro("");
    if (slug) {
      portalInscricoesService.listar(slug, busca).then(setData).catch((e) => setErro(e.response?.data?.message || "Não foi possível carregar as oportunidades."));
    } else {
      portalInscricoesService.listarInstituicoes().then((r) => setInstituicoes(r.instituicoes ?? [])).catch(() => setErro("Não foi possível carregar as instituições."));
    }
  }, [slug, busca]);

  const corPrincipal = data?.instituicao?.corPrincipal || "#1d4ed8";
  const todas = useMemo(() => data?.oportunidades ?? [], [data]);
  const categorias = useMemo<string[]>(() => {
    const tipos = todas.map((item: Opportunity) => item.tipo).filter((item: string | undefined): item is string => Boolean(item));
    return ["Todos", ...Array.from(new Set<string>(tipos))];
  }, [todas]);
  const oportunidades = useMemo(() => (todas as Opportunity[]).filter((item: Opportunity) => {
    const categoriaOk = categoria === "Todos" || item.tipo === categoria;
    const vagasOk = !somenteVagas || item.vagasDisponiveis > 0 || item.status === "LISTA_ESPERA";
    return categoriaOk && vagasOk;
  }), [categoria, somenteVagas, todas]);

  const mudar = (campo: string, valor: unknown) => setForm((atual: any) => ({ ...atual, [campo]: valor }));
  const iniciar = (oportunidade: Opportunity) => { setSelecionada(oportunidade); setEtapa(1); setErro(""); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const enviar = async () => {
    if (!selecionada) return;
    if (!form.termosAceitos) return setErro("Aceite os termos obrigatórios para continuar.");
    try {
      const resultado = await portalInscricoesService.enviar(slug, { ...form, cursoId: selecionada.id });
      setProtocolo(resultado.protocolo);
      setEtapa(4);
    } catch (e: any) {
      setErro(e.response?.data?.message || "Não foi possível concluir sua inscrição. Confira os campos destacados e tente novamente.");
    }
  };

  const indicadores: Array<{ label: string; value: string; icon: typeof Sparkles }> = [
    { label: "Oportunidades", value: String(todas.length), icon: Sparkles },
    { label: "Com vagas", value: String(todas.filter((item: Opportunity) => item.vagasDisponiveis > 0).length), icon: Users },
    { label: "Modalidades", value: String(new Set(todas.map((item: Opportunity) => item.modalidade).filter(Boolean)).size || 1), icon: MapPin }
  ];

  if (!slug) return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[2rem] bg-white p-8 text-center shadow-xl ring-1 ring-slate-100">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-blue-50 text-blue-700"><ClipboardCheck className="h-8 w-8" /></div>
          <h1 className="mt-5 text-3xl font-black tracking-tight">Portal de inscrições</h1>
          <p className="mt-3 text-slate-600">Escolha uma instituição para encontrar cursos, atividades e atendimentos.</p>
        </div>
        <div className="mt-5 grid gap-3">{instituicoes.map((instituicao) => <a key={instituicao.slug} href={`/inscricoes/${instituicao.slug}`} className="group flex items-center justify-between rounded-2xl bg-white p-5 font-semibold shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-lg">{instituicao.nome}<ArrowRight className="h-5 w-5 text-blue-600 transition group-hover:translate-x-1" /></a>)}</div>
        {erro && <p className="mt-5 text-center text-sm text-red-600">{erro}</p>}
      </div>
    </main>
  );

  if (etapa === 4) return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 text-center shadow-xl ring-1 ring-slate-100">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full" style={{ backgroundColor: `${corPrincipal}15`, color: corPrincipal }}><CheckCircle2 className="h-10 w-10" /></div>
        <h1 className="mt-6 text-3xl font-black tracking-tight">Pré-inscrição recebida!</h1>
        <p className="mt-3 text-slate-600">Recebemos sua solicitação. Ela será analisada pela equipe responsável.</p>
        <div className="my-7 rounded-2xl p-5" style={{ backgroundColor: `${corPrincipal}12` }}><p className="text-sm text-slate-600">Número da pré-inscrição</p><strong className="text-2xl" style={{ color: corPrincipal }}>{protocolo}</strong><p className="mt-3 text-sm font-medium">Status: Aguardando análise</p></div>
        <p className="text-sm text-slate-500">Esta solicitação ainda não representa confirmação definitiva da vaga.</p>
        <Button className="mt-7" style={{ backgroundColor: corPrincipal }} onClick={() => { setEtapa(0); setSelecionada(undefined); }}>Voltar ao portal</Button>
      </div>
    </main>
  );

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-slate-900">
      <header className="relative overflow-hidden px-5 pb-24 pt-7 text-white" style={{ background: `linear-gradient(135deg, ${corPrincipal}, color-mix(in srgb, ${corPrincipal} 62%, #111827))` }}>
        <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full border-[32px] border-white/10" />
        <div className="pointer-events-none absolute bottom-[-170px] left-[42%] h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <div className="flex items-center gap-3"><PortalLogo slug={slug} /><div><p className="text-sm text-white/75">Portal de inscrições</p><h1 className="text-xl font-black tracking-tight">{data?.instituicao?.nome || "Instituição"}</h1></div></div>
          <div className="mt-14 max-w-3xl"><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur"><Sparkles className="h-3.5 w-3.5" /> Oportunidades para transformar seu futuro</div><h2 className="text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">Encontre uma oportunidade para você.</h2><p className="mt-5 max-w-xl text-base text-white/80 md:text-lg">Faça sua pré-inscrição de forma rápida, segura e sem complicação.</p></div>
          <div className="mt-8 mb-2 flex max-w-2xl items-center gap-3 rounded-2xl bg-white p-2 text-slate-700 shadow-2xl"><Search className="ml-3 h-5 w-5" style={{ color: corPrincipal }} /><input aria-label="O que você está procurando?" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Pesquise por curso, oficina, atendimento ou atividade..." className="min-w-0 flex-1 bg-transparent px-2 py-3 outline-none" /><span className="hidden rounded-xl px-3 py-2 text-xs font-bold text-white sm:inline" style={{ backgroundColor: corPrincipal }}>Buscar</span></div>
        </div>
      </header>

      <main className="relative mx-auto mt-8 max-w-6xl px-4 pb-16">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* @ts-ignore: componentes Lucide armazenados nos indicadores. */}
          {[["Oportunidades", String(todas.length), Sparkles], ["Com vagas", String(todas.filter((item: Opportunity) => item.vagasDisponiveis > 0).length), Users], ["Modalidades", String(new Set(todas.map((item: Opportunity) => item.modalidade).filter(Boolean)).size || 1), MapPin], ["Inscrições abertas", String(todas.filter((item: Opportunity) => ["ABERTAS", "ULTIMAS_VAGAS", "LISTA_ESPERA"].includes(item.status)).length), BadgeCheck], ["Encerradas", String(todas.filter((item: Opportunity) => item.status === "ENCERRADAS").length), ClipboardCheck]].map(([label, value, Icon]) => <div key={String(label)} className="flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50 px-5 py-4 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-100"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/80" style={{ color: corPrincipal }}><Icon className="h-5 w-5" /></span><div><p className="text-xs font-semibold text-emerald-800/75">{label}</p><strong className="text-xl font-black text-emerald-950">{value}</strong></div></div>)}
        </section>

        <section className="mt-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-semibold" style={{ color: corPrincipal }}>Catálogo de oportunidades</p><h2 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">Escolha o que combina com você</h2><p className="mt-2 text-sm text-slate-500">Veja os detalhes, horários e vagas antes de fazer sua pré-inscrição.</p></div><button type="button" onClick={() => setSomenteVagas((atual) => !atual)} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${somenteVagas ? "text-white shadow-lg" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`} style={somenteVagas ? { backgroundColor: corPrincipal, borderColor: corPrincipal } : undefined}><SlidersHorizontal className="h-4 w-4" /> {somenteVagas ? "Mostrando com vagas" : "Somente com vagas"}</button></section>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">{categorias.map((item) => <button type="button" key={item} onClick={() => setCategoria(item)} className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${categoria === item ? "text-white shadow-md" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`} style={categoria === item ? { backgroundColor: corPrincipal, borderColor: corPrincipal } : undefined}>{item}</button>)}</div>

        {erro && <div role="alert" className="mt-5 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><span>{erro}</span><button type="button" aria-label="Fechar aviso" onClick={() => setErro("")}><X className="h-4 w-4" /></button></div>}
        {etapa === 0 && (!oportunidades.length ? <div className="mt-8 rounded-[2rem] bg-white px-6 py-20 text-center shadow-sm ring-1 ring-slate-100"><ClipboardCheck className="mx-auto h-12 w-12 text-slate-300" /><h2 className="mt-4 text-xl font-black">Nenhuma oportunidade encontrada</h2><p className="mt-2 text-slate-500">Tente alterar a busca ou remover os filtros.</p></div> : <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{oportunidades.map((item: Opportunity) => <CursoCatalogoCard key={item.id} nome={item.nome} tipo={item.tipo} descricao={item.descricao} imagemSrc={imagemOportunidade(slug, item)} primaryColor={corPrincipal} vagasTotais={item.vagasTotais ?? item.vagasDisponiveis} vagasDisponiveis={item.vagasDisponiveis} inscritos={item.totalInscritos} fila={item.totalFila} horario={item.horario} periodo={item.periodo} dias={item.periodo} local={item.local} encerramento={item.encerramento} situacao={statusLabel[item.status]} onInscrever={() => iniciar(item)} />)}</div>)}

        {etapa > 0 && selecionada && <section className="mx-auto mt-8 max-w-2xl rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-100 md:p-9"><div className="mb-7 rounded-2xl p-4" style={{ backgroundColor: `${corPrincipal}12` }}><p className="text-sm font-semibold" style={{ color: corPrincipal }}>Você está se inscrevendo em</p><h2 className="mt-1 text-xl font-black">{selecionada.nome}</h2></div>{etapa === 1 && <div className="space-y-5"><h2 className="text-2xl font-black">Identificação</h2><label className="block text-sm font-semibold">CPF<input required value={form.cpf} onChange={(event) => mudar("cpf", event.target.value)} placeholder="000.000.000-00" className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-slate-400" /></label><label className="block text-sm font-semibold">Nome completo<input required value={form.nomeCompleto} onChange={(event) => mudar("nomeCompleto", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-slate-400" /></label><label className="block text-sm font-semibold">Data de nascimento<input required type="date" value={form.dataNascimento} onChange={(event) => mudar("dataNascimento", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-slate-400" /></label><Button style={{ backgroundColor: corPrincipal }} onClick={() => setEtapa(2)}>Continuar <ArrowRight className="ml-2 h-4 w-4" /></Button></div>}{etapa === 2 && <div className="space-y-5"><h2 className="text-2xl font-black">Contato</h2><label className="block text-sm font-semibold">Telefone celular<input value={form.telefone} onChange={(event) => mudar("telefone", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3" /></label><label className="block text-sm font-semibold">E-mail<input type="email" value={form.email} onChange={(event) => mudar("email", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3" /></label><Button style={{ backgroundColor: corPrincipal }} onClick={() => setEtapa(3)}>Continuar <ArrowRight className="ml-2 h-4 w-4" /></Button></div>}{etapa === 3 && <div className="space-y-5"><h2 className="text-2xl font-black">Confira sua inscrição</h2><div className="space-y-3 rounded-2xl bg-slate-50 p-4 text-sm"><p><b>Participante:</b> {form.nomeCompleto}</p><p><b>Contato:</b> {form.telefone || "Não informado"} {form.email && `• ${form.email}`}</p><p><b>Oportunidade:</b> {selecionada.nome}</p></div><label className="flex gap-3 text-sm"><input type="checkbox" checked={form.termosAceitos} onChange={(event) => mudar("termosAceitos", event.target.checked)} /> <span>Declaro que as informações são verdadeiras e autorizo o tratamento dos meus dados conforme a Política de Privacidade e LGPD.</span></label><Button style={{ backgroundColor: corPrincipal }} onClick={enviar}><BadgeCheck className="mr-2 h-4 w-4" /> Confirmar pré-inscrição</Button></div>}</section>}
      </main>
      <footer className="border-t bg-white px-5 py-10 text-center text-sm text-slate-500"><ShieldCheck className="mx-auto mb-2 h-5 w-5" style={{ color: corPrincipal }} /><p className="font-semibold text-slate-700">Seus dados são tratados com segurança e privacidade.</p><p className="mt-1">Portal oficial de inscrições da instituição.</p></footer>
    </div>
  );
}
