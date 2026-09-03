import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, LockKeyhole, ShieldCheck, Vote } from "lucide-react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cipaService } from "@/services/cipa.service";

function CipaVotingFlow({ etapa, nome, eleicao, candidatos, selecionado, setSelecionado, erro, carregando, onConfirm, onBack }: {
  etapa: Etapa;
  nome: string;
  eleicao?: { nome: string; gestao: string; votos_por_eleitor?: number; permite_voto_branco?: boolean; permite_voto_nulo?: boolean };
  candidatos: Candidato[];
  selecionado?: SelecaoVoto;
  setSelecionado: (value: SelecaoVoto | undefined) => void;
  erro: string;
  carregando: boolean;
  onConfirm: () => void;
  onBack: () => void;
}) {
  if (etapa !== "urna" && etapa !== "confirmacao") return null;
  const limite = eleicao?.votos_por_eleitor ?? 1;
  const ids = selecionado?.tipo === "VALIDO" ? selecionado.candidaturaIds : [];
  const selecionados = candidatos.filter((candidato) => ids.includes(candidato.id));
  const alternar = (id: string) => {
    const atuais = selecionado?.tipo === "VALIDO" ? selecionado.candidaturaIds : [];
    if (atuais.includes(id)) setSelecionado({ tipo: "VALIDO", candidaturaIds: atuais.filter((item) => item !== id) });
    else if (atuais.length < limite) setSelecionado({ tipo: "VALIDO", candidaturaIds: [...atuais, id] });
  };
  if (etapa === "urna") return <Card><CardHeader><p className="text-sm text-[var(--g3-muted)]">Olá, {nome}.</p><CardTitle className="mt-1">{eleicao?.nome} — Gestão {eleicao?.gestao}</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-[var(--g3-muted)]">Selecione até {limite} candidato(s). Os resultados não são exibidos durante a votação.</p><div className="grid gap-3">{candidatos.map((candidato) => { const ativo = ids.includes(candidato.id); return <button key={candidato.id} type="button" className={`rounded-xl border p-4 text-left ${ativo ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)]" : "border-[var(--g3-border)]"}`} onClick={() => alternar(candidato.id)} aria-pressed={ativo}><div className="flex items-start gap-3">{candidato.foto_url ? <img src={candidato.foto_url} alt={`Foto de ${candidato.nome_publico}`} className="h-12 w-12 shrink-0 rounded-full object-cover" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--g3-primary-button)] text-lg font-bold text-white">{candidato.numero}</span>}<span><strong className="block">{candidato.nome_publico}</strong><span className="mt-1 block text-xs font-semibold text-[var(--g3-muted)]">Número {candidato.numero}</span>{candidato.apresentacao ? <span className="mt-2 block text-sm text-[var(--g3-muted)]">{candidato.apresentacao}</span> : null}</span></div></button>; })}{eleicao?.permite_voto_branco ? <button type="button" className="rounded-xl border p-4 text-left font-semibold" onClick={() => setSelecionado({ tipo: "BRANCO" })}>Voto em branco</button> : null}{eleicao?.permite_voto_nulo ? <button type="button" className="rounded-xl border p-4 text-left font-semibold" onClick={() => setSelecionado({ tipo: "NULO" })}>Voto nulo</button> : null}</div>{erro ? <p role="alert" className="text-sm text-red-700">{erro}</p> : null}<Button className="h-11 w-full" disabled={!selecionado || (selecionado.tipo === "VALIDO" && !selecionado.candidaturaIds.length)} onClick={onBack}>Continuar</Button></CardContent></Card>;
  return <Card><CardHeader><CardTitle>Confirme seu voto</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-[var(--g3-muted)]">Você selecionou:</p><div className="rounded-xl border border-[var(--g3-active)] bg-[var(--g3-primary-soft)] p-5 text-center">{selecionados.length ? selecionados.map((candidato) => <div key={candidato.id}><p className="text-3xl font-bold text-[var(--g3-active)]">{candidato.numero}</p><p className="mt-1 text-lg font-semibold">{candidato.nome_publico}</p></div>) : <p className="text-lg font-semibold">{selecionado?.tipo === "BRANCO" ? "Voto em branco" : "Voto nulo"}</p>}</div><p className="text-sm font-medium">Deseja confirmar este voto?</p>{erro ? <p role="alert" className="text-sm text-red-700">{erro}</p> : null}<div className="grid gap-2 sm:grid-cols-2"><Button variant="outline" onClick={onBack} disabled={carregando}>Voltar e alterar</Button><Button onClick={onConfirm} disabled={carregando}>{carregando ? "Registrando..." : "Confirmar voto"}</Button></div></CardContent></Card>;
}

type Etapa = "identificacao" | "urna" | "confirmacao" | "sucesso" | "candidatura" | "candidaturaSucesso";
type Candidato = { id: string; numero: number; nome_publico: string; cargo_publico?: string; setor_publico?: string; apresentacao?: string; foto_url?: string };
type SelecaoVoto = { tipo: "VALIDO"; candidaturaIds: string[] } | { tipo: "BRANCO" | "NULO" };

function mensagemErro(error: any, padrao: string) { return error?.response?.data?.message ?? padrao; }

export function CipaEleicaoPortalPage() {
  const { identificador = "" } = useParams();
  const [etapa, setEtapa] = useState<Etapa>("identificacao");
  const [modo, setModo] = useState<"voto" | "candidatura">("voto");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [token, setToken] = useState("");
  const [nome, setNome] = useState("");
  const [eleicao, setEleicao] = useState<{ nome: string; gestao: string; votos_por_eleitor?: number; permite_voto_branco?: boolean; permite_voto_nulo?: boolean }>();
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [selecionado, setSelecionado] = useState<SelecaoVoto>();
  const [protocolo, setProtocolo] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [apresentacao, setApresentacao] = useState(""); const [proposta, setProposta] = useState(""); const [ciencia, setCiencia] = useState(false); const [protocoloCandidatura, setProtocoloCandidatura] = useState("");
  const [foto, setFoto] = useState<File>(); const [fotoMensagem, setFotoMensagem] = useState("");
  const [portal, setPortal] = useState<{ eleicao: { nome: string; gestao: string; status: string; votacaoInicio?: string; votacaoFim?: string }; candidatos: Candidato[] }>();

  useEffect(() => { if (!identificador) return; let ativo = true; void cipaService.obterPortalPublico(identificador).then((data) => { if (ativo) setPortal({ eleicao: data.eleicao, candidatos: data.candidatos.map((item) => ({ id: item.id, numero: item.numero, nome_publico: item.nomePublico, cargo_publico: item.cargoPublico, setor_publico: item.setorPublico, apresentacao: item.apresentacao, foto_url: item.fotoUrl })) }); }).catch(() => { if (ativo) setErro("Não foi possível carregar as informações desta eleição."); }); return () => { ativo = false; }; }, [identificador]);

  async function entrar(event: FormEvent) {
    event.preventDefault(); setErro(""); setCarregando(true);
    try {
      const acesso = await cipaService.autenticarEleitor(identificador, { cpf, dataNascimento });
      const urna = await cipaService.obterUrna(identificador, acesso.token);
      setToken(acesso.token); setNome(acesso.colaborador.nome); setEleicao(acesso.eleicao); setCandidatos(urna.candidatos); setEtapa("urna");
    } catch (error) { setErro(mensagemErro(error, "Não foi possível iniciar a votação. Confira seus dados ou procure o RH.")); } finally { setCarregando(false); }
  }

  async function confirmar() {
    if (!selecionado) return; setErro(""); setCarregando(true);
    try { const resultado = await cipaService.registrarVoto(identificador, token, selecionado); setProtocolo(resultado.protocolo); setToken(""); setEtapa("sucesso"); }
    catch (error) { setErro(mensagemErro(error, "Não foi possível registrar o voto. Se o problema continuar, procure a comissão eleitoral.")); }
    finally { setCarregando(false); }
  }

  async function entrarCandidato(event: FormEvent) { event.preventDefault(); setErro(""); setCarregando(true); try { const acesso = await cipaService.autenticarCandidato(identificador, { cpf, dataNascimento }); setToken(acesso.token); setNome(acesso.colaborador.nome); setEleicao(acesso.eleicao); setEtapa("candidatura"); } catch (error) { setErro(mensagemErro(error, "Não foi possível iniciar sua candidatura. Confira seus dados ou procure o RH.")); } finally { setCarregando(false); } }
  async function enviarCandidatura() { if (!ciencia) return; setErro(""); setCarregando(true); try { if (foto) { await cipaService.enviarFotoCandidatura(identificador, token, foto); setFotoMensagem("Foto enviada com sucesso."); } const resultado = await cipaService.enviarCandidatura(identificador, token, { apresentacao, proposta, declaracaoCiencia: true }); setProtocoloCandidatura(resultado.protocolo); setToken(""); setEtapa("candidaturaSucesso"); } catch (error) { setErro(mensagemErro(error, "Não foi possível enviar sua candidatura. Confira os dados e tente novamente.")); } finally { setCarregando(false); } }

  return <main className="flex min-h-screen items-center justify-center bg-[var(--g3-bg)] px-4 py-6"><div className="w-full max-w-xl space-y-4"><header className="rounded-2xl bg-[var(--g3-primary-button)] p-6 text-white shadow-lg"><div className="flex items-center gap-3"><div className="rounded-xl bg-white/15 p-3"><Vote className="h-7 w-7" aria-hidden="true" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/75">Eleição eletrônica</p><h1 className="text-2xl font-bold">ELEIÇÃO DA CIPA</h1></div></div><p className="mt-4 text-sm text-white/90">Participe da eleição dos representantes dos empregados.</p></header>
    {portal ? <Card><CardHeader><CardTitle>{portal.eleicao.nome}</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-[var(--g3-muted)]">Gestão {portal.eleicao.gestao} · Situação: {portal.eleicao.status.replaceAll("_", " ")}</p>{portal.eleicao.votacaoInicio && portal.eleicao.votacaoFim ? <p className="text-sm text-[var(--g3-muted)]">Votação: {portal.eleicao.votacaoInicio.slice(0, 10)} a {portal.eleicao.votacaoFim.slice(0, 10)}</p> : null}<details><summary className="cursor-pointer font-medium">Como funciona a votação</summary><p className="mt-2 text-sm text-[var(--g3-muted)]">Identifique-se com CPF e data de nascimento, confira os candidatos, selecione uma opção, confirme seu voto e guarde o comprovante de participação.</p></details>{portal.candidatos.length ? <div><p className="text-sm font-medium">Candidatos publicados</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{portal.candidatos.map((candidato) => <div key={candidato.id} className="rounded-lg border border-[var(--g3-border)] p-3"><p className="font-medium">{candidato.numero} — {candidato.nome_publico}</p>{candidato.cargo_publico || candidato.setor_publico ? <p className="text-xs text-[var(--g3-muted)]">{[candidato.cargo_publico, candidato.setor_publico].filter(Boolean).join(" · ")}</p> : null}</div>)}</div></div> : <p className="text-sm text-[var(--g3-muted)]">A relação de candidatos ainda não foi publicada.</p>}</CardContent></Card> : null}
    {etapa === "identificacao" && modo === "voto" ? <Card><CardHeader><CardTitle>Identifique-se para votar</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={(event) => void entrar(event)}><p className="text-sm text-[var(--g3-muted)]">Usaremos seus dados apenas para confirmar que você está apto a votar nesta eleição.</p><div><Label htmlFor="cipa-cpf">CPF</Label><Input id="cipa-cpf" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" value={cpf} onChange={(event) => setCpf(event.target.value)} required /></div><div><Label htmlFor="cipa-nascimento">Data de nascimento</Label><Input id="cipa-nascimento" type="date" autoComplete="bday" value={dataNascimento} onChange={(event) => setDataNascimento(event.target.value)} required /></div>{erro ? <p role="alert" className="text-sm text-red-700">{erro}</p> : null}<Button type="submit" className="h-11 w-full text-base" disabled={carregando}>{carregando ? "Verificando..." : "Votar"}</Button></form><button type="button" className="mt-4 w-full text-sm text-[var(--g3-active)] underline" onClick={() => { setModo("candidatura"); setErro(""); }}>Quero me candidatar</button><div className="mt-5 flex items-start gap-2 rounded-lg bg-[var(--g3-primary-soft)] p-3 text-xs text-[var(--g3-muted)]"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />Seu voto é secreto. O comprovante confirma apenas sua participação.</div></CardContent></Card> : null}
    {etapa === "identificacao" && modo === "candidatura" ? <Card><CardHeader><CardTitle>Inscreva-se como candidato</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={(event) => void entrarCandidato(event)}><p className="text-sm text-[var(--g3-muted)]">Confira seus dados para iniciar uma candidatura individual nesta eleição.</p><div><Label htmlFor="cipa-cpf-candidato">CPF</Label><Input id="cipa-cpf-candidato" inputMode="numeric" autoComplete="off" value={cpf} onChange={(event) => setCpf(event.target.value)} required /></div><div><Label htmlFor="cipa-nascimento-candidato">Data de nascimento</Label><Input id="cipa-nascimento-candidato" type="date" value={dataNascimento} onChange={(event) => setDataNascimento(event.target.value)} required /></div>{erro ? <p role="alert" className="text-sm text-red-700">{erro}</p> : null}<Button type="submit" className="h-11 w-full" disabled={carregando}>{carregando ? "Verificando..." : "Continuar candidatura"}</Button></form><button type="button" className="mt-4 w-full text-sm text-[var(--g3-active)] underline" onClick={() => { setModo("voto"); setErro(""); }}>Voltar para votação</button></CardContent></Card> : null}
    {etapa === "candidatura" ? <Card><CardHeader><p className="text-sm text-[var(--g3-muted)]">Olá, {nome}.</p><CardTitle>Envie sua candidatura</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-[var(--g3-muted)]">{eleicao?.nome} — Gestão {eleicao?.gestao}</p><div><Label htmlFor="cipa-foto-candidato">Foto (opcional)</Label><Input id="cipa-foto-candidato" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { setFoto(event.target.files?.[0]); setFotoMensagem(""); }} /><p className="mt-1 text-xs text-[var(--g3-muted)]">Use uma foto nítida. O storage oficial valida formato e tamanho.</p>{fotoMensagem ? <p role="status" className="text-xs text-emerald-700">{fotoMensagem}</p> : null}</div><div><Label htmlFor="cipa-apresentacao">Apresentação</Label><textarea id="cipa-apresentacao" className="min-h-24 w-full rounded-md border border-[var(--g3-border)] p-3 text-sm" value={apresentacao} onChange={(event) => setApresentacao(event.target.value)} /></div><div><Label htmlFor="cipa-proposta">Proposta</Label><textarea id="cipa-proposta" className="min-h-24 w-full rounded-md border border-[var(--g3-border)] p-3 text-sm" value={proposta} onChange={(event) => setProposta(event.target.value)} /></div><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={ciencia} onChange={(event) => setCiencia(event.target.checked)} />Declaro ciência das regras desta eleição.</label>{erro ? <p role="alert" className="text-sm text-red-700">{erro}</p> : null}<Button className="w-full" disabled={!ciencia || carregando} onClick={() => void enviarCandidatura()}>{carregando ? "Enviando..." : "Enviar candidatura"}</Button></CardContent></Card> : null}
    {etapa === "candidaturaSucesso" ? <Card><CardContent className="py-10 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" /><h2 className="mt-4 text-xl font-semibold">Candidatura recebida com sucesso.</h2><p className="mt-2 text-sm text-[var(--g3-muted)]">A comissão eleitoral analisará sua inscrição.</p><p className="mt-4 font-mono font-semibold">Protocolo: {protocoloCandidatura}</p></CardContent></Card> : null}
    <CipaVotingFlow etapa={etapa} nome={nome} eleicao={eleicao} candidatos={candidatos} selecionado={selecionado} setSelecionado={setSelecionado} erro={erro} carregando={carregando} onConfirm={() => void confirmar()} onBack={() => setEtapa(etapa === "urna" ? "confirmacao" : "urna")} />
    {etapa === "sucesso" ? <Card><CardContent className="py-10 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" /><h2 className="mt-4 text-xl font-semibold">Voto registrado com sucesso.</h2><p className="mt-2 text-sm text-[var(--g3-muted)]">Seu comprovante confirma apenas a participação e não revela o candidato escolhido.</p><div className="mt-5 rounded-xl bg-[var(--g3-primary-soft)] p-4"><p className="text-xs text-[var(--g3-muted)]">Protocolo</p><p className="mt-1 font-mono text-lg font-semibold">{protocolo}</p></div><Button variant="outline" className="mt-5" onClick={() => window.print()}>Imprimir ou salvar em PDF</Button><div className="mt-5 flex items-center justify-center gap-2 text-xs text-[var(--g3-muted)]"><ShieldCheck className="h-4 w-4" aria-hidden="true" />Sessão encerrada com segurança.</div></CardContent></Card> : null}
  </div></main>;
}
