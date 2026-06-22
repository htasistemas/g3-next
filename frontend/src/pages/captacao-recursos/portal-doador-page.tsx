import { useEffect, useState } from "react";
import { Eye, HandCoins, LogOut, Printer, Save, ShieldUser } from "lucide-react";
import { PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { abrirArquivoAutenticado, imprimirArquivoAutenticado } from "@/lib/arquivos";
import { normalizarCpf, normalizarCnpj, normalizarEmail } from "@/lib/br-utils";
import { captacaoRecursosService } from "@/services/captacao-recursos.service";
import type { CaptacaoPortalPainel } from "@/types/captacao-recursos";
import { formatarDataHora, formatarMoeda, formaPagamentoOptions, tipoDoacaoOptions } from "./captacao-recursos.shared";

const TOKEN_KEY = "g3n.captacao.portal.token";
const DEMO_TOKEN = "g3n.portal.doador.demo";

function criarPainelDemonstrativo(): CaptacaoPortalPainel {
  return {
    doador: {
      id: "demo-doador",
      uuid: "demo-doador",
      tipoDoador: "pessoa_fisica",
      nome: "Doador demonstrativo",
      cpfCnpj: "00000000000",
      emailPrincipal: "doador@exemplo.org",
      telefone: "(11) 3000-0000",
      whatsapp: "(11) 99999-0000",
      cidade: "São Paulo",
      uf: "SP",
      status: "ativo",
      aceitouLgpd: true,
      aceitaEmail: true,
      aceitaWhatsapp: true,
      aceitaReceberCampanhas: true,
      portalAtivo: true,
      totalDoado: 1850,
      quantidadeDoacoes: 4,
      ticketMedio: 462.5,
      maiorDoacao: 750,
      campanhasApoiadas: 2,
      recorrenciaAtiva: true
    },
    campanhas: [
      {
        id: "demo-campanha-1",
        uuid: "demo-campanha-1",
        nome: "Apoio institucional",
        descricaoCurta: "Contribuição livre para manutenção das atividades.",
        metaFinanceira: 50000,
        valorArrecadado: 18500,
        percentualAtingido: 37,
        valorFaltante: 31500,
        status: "ativa",
        corDestaque: "#0f766e",
        tipo: "institucional",
        destaqueNoPortal: true,
        visivelAoPublico: true,
        totalDoacoes: 42,
        totalDoadores: 31,
        metaAtingida: false
      }
    ],
    doacoes: [
      {
        id: "demo-doacao-1",
        uuid: "demo-doacao-1",
        numeroDoacao: "DOA-DEMO-001",
        dataHora: new Date().toISOString(),
        doadorId: "demo-doador",
        doadorNome: "Doador demonstrativo",
        campanhaId: "demo-campanha-1",
        campanhaNome: "Apoio institucional",
        valor: 250,
        valorLiquido: 250,
        valorTaxas: 0,
        tipoDoacao: "unica",
        formaPagamento: "pix",
        situacao: "confirmado",
        origem: "portal",
        comprovanteGerado: true
      }
    ],
    comprovantes: [
      {
        id: "demo-comprovante-1",
        uuid: "demo-comprovante-1",
        doacaoId: "demo-doacao-1",
        doadorId: "demo-doador",
        numeroComprovante: "REC-DEMO-001",
        codigoValidacao: "DEMO-001",
        enviadoEmail: true,
        mensagemAgradecimento: "Obrigado por apoiar a instituição.",
        numeroDoacao: "DOA-DEMO-001",
        valorLiquido: 250,
        formaPagamento: "pix",
        dataHora: new Date().toISOString(),
        doadorNome: "Doador demonstrativo",
        campanhaNome: "Apoio institucional"
      }
    ],
    recorrencias: [
      {
        id: "demo-recorrencia-1",
        uuid: "demo-recorrencia-1",
        doadorId: "demo-doador",
        campanhaId: "demo-campanha-1",
        campanhaNome: "Apoio institucional",
        valorRecorrente: 100,
        periodicidade: "mensal",
        formaPagamento: "pix",
        dataProximaCobranca: new Date().toISOString().slice(0, 10),
        ciclosPagos: 3,
        semPrevisaoTermino: true,
        status: "ativa"
      }
    ]
  };
}

export function PortalDoadorPage() {
  const [email, setEmail] = useState("");
  const [documento, setDocumento] = useState("");
  const [token, setToken] = useState("");
  const [painel, setPainel] = useState<CaptacaoPortalPainel | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [formDoacao, setFormDoacao] = useState({
    campanhaId: "",
    valor: "",
    formaPagamento: "pix",
    tipoDoacao: "unica",
    observacoesInternas: ""
  });
  const [meusDados, setMeusDados] = useState({
    telefone: "",
    whatsapp: "",
    cidade: "",
    uf: "",
    aceitaEmail: true,
    aceitaWhatsapp: true,
    aceitaReceberCampanhas: true,
    observacoes: ""
  });

  async function carregarPainel(tokenAtual: string) {
    setCarregando(true);
    try {
      const resultado = await captacaoRecursosService.obterPainelPortal(tokenAtual);
      setPainel(resultado);
      setMeusDados({
        telefone: resultado.doador.telefone ?? "",
        whatsapp: resultado.doador.whatsapp ?? "",
        cidade: resultado.doador.cidade ?? "",
        uf: resultado.doador.uf ?? "",
        aceitaEmail: resultado.doador.aceitaEmail,
        aceitaWhatsapp: resultado.doador.aceitaWhatsapp,
        aceitaReceberCampanhas: resultado.doador.aceitaReceberCampanhas,
        observacoes: resultado.doador.observacoes ?? ""
      });
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    const salvo = window.localStorage.getItem(TOKEN_KEY) ?? "";
    if (!salvo) return;
    setToken(salvo);
    void carregarPainel(salvo).catch(() => {
      window.localStorage.removeItem(TOKEN_KEY);
      setToken("");
    });
  }, []);

  async function entrar() {
    setCarregando(true);
    try {
      const resultado = await captacaoRecursosService.portalLogin(normalizarEmail(email), normalizarCpf(documento) || normalizarCnpj(documento) || documento.trim());
      window.localStorage.setItem(TOKEN_KEY, resultado.token);
      setToken(resultado.token);
      await carregarPainel(resultado.token);
      setPopup({ tipo: "sucesso", titulo: "Acesso liberado", texto: "Seu portal foi carregado com sucesso." });
    } catch (error) {
      setPopup({ tipo: "erro", titulo: "Falha no acesso", texto: error instanceof Error ? error.message : "Não foi possível acessar o portal." });
    } finally {
      setCarregando(false);
    }
  }

  async function salvarDados() {
    if (!token) return;
    if (token === DEMO_TOKEN) {
      setPainel((atual) =>
        atual
          ? {
              ...atual,
              doador: {
                ...atual.doador,
                telefone: meusDados.telefone,
                whatsapp: meusDados.whatsapp,
                cidade: meusDados.cidade,
                uf: meusDados.uf,
                aceitaEmail: meusDados.aceitaEmail,
                aceitaWhatsapp: meusDados.aceitaWhatsapp,
                aceitaReceberCampanhas: meusDados.aceitaReceberCampanhas,
                observacoes: meusDados.observacoes
              }
            }
          : atual
      );
      setPopup({ tipo: "sucesso", titulo: "Dados atualizados", texto: "Suas preferências foram salvas na demonstração." });
      return;
    }
    setCarregando(true);
    try {
      const atualizado = await captacaoRecursosService.atualizarDadosPortal(token, meusDados);
      setPainel(atualizado);
      setPopup({ tipo: "sucesso", titulo: "Dados atualizados", texto: "Suas preferências foram salvas." });
    } catch (error) {
      setPopup({ tipo: "erro", titulo: "Erro ao salvar", texto: error instanceof Error ? error.message : "Não foi possível atualizar seus dados." });
    } finally {
      setCarregando(false);
    }
  }

  async function criarDoacao() {
    if (!token) return;
    if (token === DEMO_TOKEN) {
      const valor = Number(formDoacao.valor.replace(",", "."));
      if (!Number.isFinite(valor) || valor <= 0) {
        setPopup({ tipo: "aviso", titulo: "Valor obrigatório", texto: "Informe um valor maior que zero para registrar o apoio." });
        return;
      }
      const agora = new Date().toISOString();
      setPainel((atual) => {
        if (!atual) return atual;
        const campanha = atual.campanhas.find((item) => item.id === formDoacao.campanhaId);
        const novaDoacao = {
          id: `demo-doacao-${Date.now()}`,
          uuid: `demo-doacao-${Date.now()}`,
          numeroDoacao: `DOA-DEMO-${String(atual.doacoes.length + 1).padStart(3, "0")}`,
          dataHora: agora,
          doadorId: atual.doador.id,
          doadorNome: atual.doador.nome,
          campanhaId: campanha?.id,
          campanhaNome: campanha?.nome,
          valor,
          valorLiquido: valor,
          valorTaxas: 0,
          tipoDoacao: formDoacao.tipoDoacao,
          formaPagamento: formDoacao.formaPagamento as any,
          situacao: "confirmado" as const,
          origem: "portal",
          observacoesInternas: formDoacao.observacoesInternas || undefined,
          comprovanteGerado: true
        };
        return {
          ...atual,
          doador: {
            ...atual.doador,
            totalDoado: atual.doador.totalDoado + valor,
            quantidadeDoacoes: atual.doador.quantidadeDoacoes + 1,
            ticketMedio: (atual.doador.totalDoado + valor) / (atual.doador.quantidadeDoacoes + 1),
            maiorDoacao: Math.max(atual.doador.maiorDoacao, valor)
          },
          doacoes: [novaDoacao, ...atual.doacoes],
          comprovantes: [
            {
              id: `demo-comprovante-${Date.now()}`,
              uuid: `demo-comprovante-${Date.now()}`,
              doacaoId: novaDoacao.id,
              doadorId: atual.doador.id,
              numeroComprovante: `REC-DEMO-${String(atual.comprovantes.length + 1).padStart(3, "0")}`,
              codigoValidacao: `DEMO-${Date.now()}`,
              enviadoEmail: false,
              numeroDoacao: novaDoacao.numeroDoacao,
              valorLiquido: valor,
              formaPagamento: formDoacao.formaPagamento,
              dataHora: agora,
              doadorNome: atual.doador.nome,
              campanhaNome: campanha?.nome
            },
            ...atual.comprovantes
          ]
        };
      });
      setFormDoacao({
        campanhaId: "",
        valor: "",
        formaPagamento: "pix",
        tipoDoacao: "unica",
        observacoesInternas: ""
      });
      setPopup({ tipo: "sucesso", titulo: "Apoio registrado", texto: "Sua nova doação foi criada na demonstração." });
      return;
    }
    setCarregando(true);
    try {
      await captacaoRecursosService.criarDoacaoPortal(token, {
        campanhaId: formDoacao.campanhaId || undefined,
        valor: Number(formDoacao.valor.replace(",", ".")),
        formaPagamento: formDoacao.formaPagamento,
        tipoDoacao: formDoacao.tipoDoacao,
        observacoesInternas: formDoacao.observacoesInternas || undefined
      });
      await carregarPainel(token);
      setFormDoacao({
        campanhaId: "",
        valor: "",
        formaPagamento: "pix",
        tipoDoacao: "unica",
        observacoesInternas: ""
      });
      setPopup({ tipo: "sucesso", titulo: "Apoio registrado", texto: "Sua nova doação foi criada com sucesso." });
    } catch (error) {
      setPopup({ tipo: "erro", titulo: "Erro na doação", texto: error instanceof Error ? error.message : "Não foi possível registrar sua doação." });
    } finally {
      setCarregando(false);
    }
  }

  async function cancelarRecorrencia(recorrenciaId: string) {
    if (!token) return;
    if (token === DEMO_TOKEN) {
      setPainel((atual) =>
        atual
          ? {
              ...atual,
              recorrencias: atual.recorrencias.filter((item) => item.id !== recorrenciaId),
              doador: { ...atual.doador, recorrenciaAtiva: false }
            }
          : atual
      );
      setPopup({ tipo: "sucesso", titulo: "Recorrência cancelada", texto: "A recorrência foi cancelada na demonstração." });
      return;
    }
    setCarregando(true);
    try {
      await captacaoRecursosService.cancelarRecorrenciaPortal(token, recorrenciaId);
      await carregarPainel(token);
      setPopup({ tipo: "sucesso", titulo: "Recorrência cancelada", texto: "A recorrência foi cancelada com sucesso." });
    } catch (error) {
      setPopup({ tipo: "erro", titulo: "Erro ao cancelar", texto: error instanceof Error ? error.message : "Não foi possível cancelar a recorrência." });
    } finally {
      setCarregando(false);
    }
  }

  function sair() {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setPainel(null);
  }

  function entrarDemonstracao() {
    const painelDemo = criarPainelDemonstrativo();
    setToken(DEMO_TOKEN);
    setPainel(painelDemo);
    setMeusDados({
      telefone: painelDemo.doador.telefone ?? "",
      whatsapp: painelDemo.doador.whatsapp ?? "",
      cidade: painelDemo.doador.cidade ?? "",
      uf: painelDemo.doador.uf ?? "",
      aceitaEmail: painelDemo.doador.aceitaEmail,
      aceitaWhatsapp: painelDemo.doador.aceitaWhatsapp,
      aceitaReceberCampanhas: painelDemo.doador.aceitaReceberCampanhas,
      observacoes: painelDemo.doador.observacoes ?? ""
    });
    setPopup({ tipo: "sucesso", titulo: "Demonstração aberta", texto: "O portal do doador foi carregado com dados demonstrativos." });
  }

  if (!token || !painel) {
    return (
      <>
        <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef5ff_100%)] px-4 py-10">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="rounded-3xl bg-[linear-gradient(135deg,#0f766e_0%,#2563eb_100%)] px-6 py-8 text-white shadow-[0_25px_80px_-40px_rgba(15,118,110,0.7)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">Portal do doador</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Acompanhe sua jornada de apoio com transparência</h1>
              <p className="mt-3 max-w-2xl text-sm text-white/85">Consulte doações, comprovantes, recorrências e apoie novamente em um ambiente seguro e acolhedor.</p>
            </div>
            <Card className="mx-auto max-w-xl border-[var(--g3-border)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><ShieldUser className="h-5 w-5" />Acessar meu portal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>E-mail</Label>
                  <Input value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>CPF / CNPJ</Label>
                  <Input value={documento} onChange={(event) => setDocumento(event.target.value)} />
                </div>
                <Button className="w-full" disabled={carregando} onClick={() => void entrar()}>
                  {carregando ? "Acessando..." : "Entrar no portal"}
                </Button>
                <Button className="w-full" variant="outline" disabled={carregando} onClick={entrarDemonstracao}>
                  Acessar demonstração
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
      </>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef5ff_100%)] px-4 py-8">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-[linear-gradient(135deg,#0f766e_0%,#2563eb_100%)] px-6 py-6 text-white shadow-[0_25px_80px_-40px_rgba(15,118,110,0.7)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/75">Meu painel</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{painel.doador.nome}</h1>
              <p className="mt-2 text-sm text-white/85">Total doado: {formatarMoeda(painel.doador.totalDoado)} • Doações: {painel.doador.quantidadeDoacoes}</p>
            </div>
            <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={sair}>
              <LogOut className="mr-1.5 h-4 w-4" />
              Sair
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <Card className="border-[var(--g3-border)]">
              <CardHeader><CardTitle>Minhas doações e comprovantes</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                      <tr><th className="px-3 py-2 text-left">Número</th><th className="px-3 py-2 text-left">Campanha</th><th className="px-3 py-2 text-left">Valor</th><th className="px-3 py-2 text-left">Situação</th></tr>
                    </thead>
                    <tbody>
                      {painel.doacoes.map((item) => <tr key={item.id} className="border-t border-[var(--g3-border)]"><td className="px-3 py-2">{item.numeroDoacao}</td><td className="px-3 py-2">{item.campanhaNome || "—"}</td><td className="px-3 py-2">{formatarMoeda(item.valorLiquido || item.valor)}</td><td className="px-3 py-2">{item.situacao}</td></tr>)}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-2">
                  {painel.comprovantes.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--g3-border)] px-3 py-2"><div><p className="text-sm font-medium">{item.numeroComprovante}</p><p className="text-xs text-[var(--g3-muted)]">{formatarDataHora(item.dataHora)} • {formatarMoeda(item.valorLiquido)}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => void abrirArquivoAutenticado(item.arquivoCaminho, item.numeroComprovante)}><Eye className="mr-1.5 h-4 w-4" />Visualizar</Button><Button size="sm" variant="outline" onClick={() => void imprimirArquivoAutenticado(item.arquivoCaminho, item.numeroComprovante)}><Printer className="mr-1.5 h-4 w-4" />Imprimir</Button></div></div>)}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="border-[var(--g3-border)]">
                <CardHeader><CardTitle className="flex items-center gap-2"><HandCoins className="h-5 w-5" />Apoiar novamente</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1"><Label>Campanha</Label><Select value={formDoacao.campanhaId} onChange={(event) => setFormDoacao((atual) => ({ ...atual, campanhaId: event.target.value }))}><option value="">Apoio institucional</option>{painel.campanhas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</Select></div>
                  <div className="space-y-1"><Label>Valor</Label><Input value={formDoacao.valor} onChange={(event) => setFormDoacao((atual) => ({ ...atual, valor: event.target.value }))} /></div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1"><Label>Forma de pagamento</Label><Select value={formDoacao.formaPagamento} onChange={(event) => setFormDoacao((atual) => ({ ...atual, formaPagamento: event.target.value }))}>{formaPagamentoOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></div>
                    <div className="space-y-1"><Label>Tipo de doação</Label><Select value={formDoacao.tipoDoacao} onChange={(event) => setFormDoacao((atual) => ({ ...atual, tipoDoacao: event.target.value }))}>{tipoDoacaoOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></div>
                  </div>
                  <div className="space-y-1"><Label>Observações</Label><Textarea value={formDoacao.observacoesInternas} onChange={(event) => setFormDoacao((atual) => ({ ...atual, observacoesInternas: event.target.value }))} rows={3} /></div>
                  <Button className="w-full" disabled={carregando} onClick={() => void criarDoacao()}>{carregando ? "Processando..." : "Registrar apoio"}</Button>
                </CardContent>
              </Card>

              <Card className="border-[var(--g3-border)]">
                <CardHeader><CardTitle>Meus dados e preferências</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1"><Label>Telefone</Label><Input value={meusDados.telefone} onChange={(event) => setMeusDados((atual) => ({ ...atual, telefone: event.target.value }))} /></div>
                    <div className="space-y-1"><Label>WhatsApp</Label><Input value={meusDados.whatsapp} onChange={(event) => setMeusDados((atual) => ({ ...atual, whatsapp: event.target.value }))} /></div>
                    <div className="space-y-1"><Label>Cidade</Label><Input value={meusDados.cidade} onChange={(event) => setMeusDados((atual) => ({ ...atual, cidade: event.target.value }))} /></div>
                    <div className="space-y-1"><Label>UF</Label><Input value={meusDados.uf} onChange={(event) => setMeusDados((atual) => ({ ...atual, uf: event.target.value.toUpperCase() }))} /></div>
                  </div>
                  <label className="flex items-center gap-2 rounded-md border border-[var(--g3-border)] px-3 py-2"><Checkbox checked={meusDados.aceitaEmail} onChange={(event) => { const checked = event.currentTarget.checked; setMeusDados((atual) => ({ ...atual, aceitaEmail: checked })); }} />Aceito e-mail</label>
                  <label className="flex items-center gap-2 rounded-md border border-[var(--g3-border)] px-3 py-2"><Checkbox checked={meusDados.aceitaWhatsapp} onChange={(event) => { const checked = event.currentTarget.checked; setMeusDados((atual) => ({ ...atual, aceitaWhatsapp: checked })); }} />Aceito WhatsApp</label>
                  <label className="flex items-center gap-2 rounded-md border border-[var(--g3-border)] px-3 py-2"><Checkbox checked={meusDados.aceitaReceberCampanhas} onChange={(event) => { const checked = event.currentTarget.checked; setMeusDados((atual) => ({ ...atual, aceitaReceberCampanhas: checked })); }} />Aceito receber campanhas</label>
                  <div className="space-y-1"><Label>Observações</Label><Textarea value={meusDados.observacoes} onChange={(event) => setMeusDados((atual) => ({ ...atual, observacoes: event.target.value }))} rows={3} /></div>
                  <Button className="w-full" disabled={carregando} onClick={() => void salvarDados()}>
                    <Save className="mr-1.5 h-4 w-4" />
                    Salvar meus dados
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-[var(--g3-border)]">
                <CardHeader><CardTitle>Minhas recorrências</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {painel.recorrencias.length ? painel.recorrencias.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--g3-border)] px-3 py-2"><div><p className="text-sm font-medium">{formatarMoeda(item.valorRecorrente)} • {item.periodicidade}</p><p className="text-xs text-[var(--g3-muted)]">Próxima cobrança: {item.dataProximaCobranca || "—"} • {item.status}</p></div><Button size="sm" variant="danger" onClick={() => void cancelarRecorrencia(item.id)}>Cancelar</Button></div>) : <p className="text-sm text-[var(--g3-muted)]">Nenhuma recorrência ativa.</p>}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
    </>
  );
}
