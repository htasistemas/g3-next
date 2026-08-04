import { useMemo, useState } from "react";
import { Bot, CircleHelp, FileSearch, Plus, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useCriarPrestacaoProfissional,
  usePrestacaoAuditoriaProfissional,
  usePrestacaoIaConfiguracoes,
  usePrestacaoIaConfiguracoes as useIaConfigs,
  usePrestacaoProfissionalLista,
  usePrestacaoProfissionalVisaoGeral,
  useSalvarPrestacaoIaConfiguracao
} from "@/features/prestacao-contas/use-prestacao-contas";
import { prestacaoContasService } from "@/services/prestacao-contas.service";
import type { PrestacaoIaConfig, PrestacaoProfissionalEntidade } from "@/types/prestacao-contas";

type Area =
  | "dashboard"
  | "concedentes"
  | "instrumentos"
  | "modelos"
  | "plano"
  | "orcamento"
  | "receitas"
  | "despesas"
  | "objeto"
  | "metas"
  | "documentos"
  | "conciliacao"
  | "prestacao"
  | "diligencias"
  | "aprovacoes"
  | "relatorios"
  | "transparencia"
  | "configuracoes"
  | "auditoria";

const entidadePorArea: Partial<Record<Area, PrestacaoProfissionalEntidade>> = {
  concedentes: "concedentes",
  instrumentos: "instrumentos",
  modelos: "modelos",
  plano: "instrumentos",
  orcamento: "rubricas",
  receitas: "receitas",
  despesas: "despesas",
  objeto: "metas",
  metas: "metas",
  documentos: "documentos",
  conciliacao: "conciliacoes",
  diligencias: "diligencias",
  aprovacoes: "aprovacoes",
  transparencia: "transparencia"
};

const titulos: Record<Area, string> = {
  dashboard: "Visão geral profissional",
  concedentes: "Concedentes",
  instrumentos: "Parcerias e instrumentos",
  modelos: "Modelo de prestação do concedente",
  plano: "Plano de trabalho",
  orcamento: "Orçamento e plano de aplicação",
  receitas: "Recebimentos e repasses",
  despesas: "Execução financeira",
  objeto: "Execução do objeto",
  metas: "Metas e indicadores",
  documentos: "Documentos comprobatórios",
  conciliacao: "Conciliação bancária",
  prestacao: "Prestação por etapas",
  diligencias: "Diligências e pendências",
  aprovacoes: "Aprovações e pareceres",
  relatorios: "Relatórios",
  transparencia: "Transparência",
  configuracoes: "Configurações, IA e OCR",
  auditoria: "Histórico e auditoria"
};

const ajuda: Record<string, string> = {
  objeto:
    "O objeto descreve exatamente o que será executado com o recurso. Use preferencialmente o texto aprovado no instrumento ou plano de trabalho.",
  indicador:
    "O indicador informa como o resultado será medido. Exemplo: beneficiários atendidos, oficinas realizadas ou percentual de frequência.",
  meioVerificacao:
    "Informe evidências que demonstram o cumprimento da meta, como listas de presença, relatórios, fotos, certificados ou registros de atendimento.",
  rubrica:
    "A rubrica organiza o orçamento aprovado. Vincule despesas à rubrica correta para controlar saldo e evitar glosa.",
  conciliacao:
    "A conciliação compara movimentações bancárias com lançamentos do sistema. Pendências devem ser justificadas ou corrigidas antes do envio."
};

function toMoney(value?: number) {
  return (value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function AjudaCampo({ texto }: { texto: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--g3-muted)]" title={texto}>
      <CircleHelp className="h-3.5 w-3.5" />
      Ajuda
    </span>
  );
}

function Campo({ label, value, onChange, ajuda: textoAjuda, type = "text" }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  ajuda?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        {textoAjuda ? <AjudaCampo texto={textoAjuda} /> : null}
      </div>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function registrosResumo(registro: Record<string, any>) {
  return (
    registro.razaoSocial ||
    registro.nome ||
    registro.objeto ||
    registro.descricao ||
    registro.categoria ||
    registro.numeroInstrumento ||
    registro.tipoInstrumento ||
    `Registro ${registro.id ?? ""}`
  );
}

function useEntidade(area: Area) {
  return entidadePorArea[area] ?? "instrumentos";
}

export function PrestacaoContasProfissionalPanel({ area }: { area: Area }) {
  const entidade = useEntidade(area);
  const listaQuery = usePrestacaoProfissionalLista(entidade);
  const criarMutation = useCriarPrestacaoProfissional(entidade);
  const visaoQuery = usePrestacaoProfissionalVisaoGeral();
  const auditoriaQuery = usePrestacaoAuditoriaProfissional();
  const iaQuery = usePrestacaoIaConfiguracoes();
  const salvarIaMutation = useSalvarPrestacaoIaConfiguracao();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [iaDraft, setIaDraft] = useState<PrestacaoIaConfig & { credencial?: string }>({ tipo: "IA", ambiente: "HOMOLOGACAO", timeoutMs: 30000, ativo: false });
  const dados = visaoQuery.data;

  const campos = useMemo(() => {
    if (area === "concedentes") return ["razaoSocial", "cpfCnpj", "esfera", "tipoEntidade", "email", "telefone"];
    if (area === "instrumentos" || area === "plano") return ["tipoInstrumento", "numeroInstrumento", "objeto", "inicioVigencia", "terminoVigencia", "valorGlobal"];
    if (area === "modelos") return ["nome", "tipoInstrumento", "esfera", "legislacaoAplicavel"];
    if (area === "orcamento") return ["instrumentoId", "categoria", "descricao", "valorTotal", "fonteRecurso"];
    if (area === "receitas") return ["instrumentoId", "tipoReceita", "dataRecebida", "valorRecebido", "documento"];
    if (area === "despesas") return ["instrumentoId", "descricao", "fornecedor", "numeroDocumento", "dataPagamento", "valorBruto"];
    if (area === "objeto" || area === "metas") return ["instrumentoId", "codigo", "descricao", "indicador", "quantidadePrevista", "quantidadeRealizada"];
    if (area === "documentos") return ["instrumentoId", "categoria", "tipo", "descricao", "nomeOriginal", "validade"];
    if (area === "conciliacao") return ["instrumentoId", "dataMovimento", "valor", "descricao", "situacao"];
    if (area === "diligencias") return ["instrumentoId", "numero", "prazo", "descricao", "responsavel", "situacao"];
    if (area === "aprovacoes") return ["instrumentoId", "etapa", "cargo", "decisao", "parecer"];
    if (area === "transparencia") return ["instrumentoId", "situacao"];
    return [];
  }, [area]);

  async function salvar() {
    setMensagem(null);
    try {
      await criarMutation.mutateAsync(draft);
      setDraft({});
      setMensagem("Registro salvo com sucesso.");
    } catch (error: any) {
      setMensagem(error?.response?.data?.message ?? "Não foi possível salvar o registro.");
    }
  }

  async function testarIa(tipo: "IA" | "OCR") {
    const resultado = await prestacaoContasService.testarConfiguracaoIa(tipo);
    setMensagem(resultado.mensagem);
  }

  async function assistente() {
    const resultado = await prestacaoContasService.acionarAssistente("Verifique pendências da prestação.", {
      area,
      indicadores: dados ?? {}
    });
    setMensagem(String(resultado.resposta ?? "Rascunho gerado."));
  }

  function informarExportacaoIndisponivel(tipo: string) {
    setMensagem(`${tipo} ainda não possui endpoint de exportação nesta tela profissional.`);
  }

  if (area === "dashboard") {
    return (
      <section className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Valor global", toMoney(dados?.valorGlobal), "info"],
            ["Valor recebido", toMoney(dados?.valorRecebido), "success"],
            ["Valor executado", toMoney(dados?.valorExecutado), "warning"],
            ["Saldo disponível", toMoney(dados?.saldoDisponivel), "info"],
            ["Metas atrasadas", dados?.metasAtrasadas ?? 0, "danger"],
            ["Documentos pendentes", dados?.documentosPendentes ?? 0, "warning"],
            ["Conciliações pendentes", dados?.conciliacoesPendentes ?? 0, "warning"],
            ["Diligências abertas", dados?.diligenciasAbertas ?? 0, "danger"]
          ].map(([label, value, variant]) => (
            <Card key={String(label)}>
              <CardContent className="space-y-2 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--g3-muted)]">{label}</p>
                <p className="text-2xl font-semibold text-[var(--g3-foreground)]">{value}</p>
                <Badge variant={variant as any}>Abrir listagem</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (area === "configuracoes") {
    const configs = iaQuery.data ?? [];
    return (
      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Configurações de IA e OCR</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={iaDraft.tipo} onChange={(event) => setIaDraft((atual) => ({ ...atual, tipo: event.target.value as "IA" | "OCR" }))}>
                  <option value="IA">IA</option>
                  <option value="OCR">OCR</option>
                </Select>
              </div>
              <Campo label="Provedor" value={iaDraft.provedor ?? ""} onChange={(value) => setIaDraft((atual) => ({ ...atual, provedor: value }))} />
              <Campo label="Modelo" value={iaDraft.modelo ?? ""} onChange={(value) => setIaDraft((atual) => ({ ...atual, modelo: value }))} />
              <Campo label="URL da API" value={iaDraft.urlApi ?? ""} onChange={(value) => setIaDraft((atual) => ({ ...atual, urlApi: value }))} />
              <Campo label="Timeout" type="number" value={String(iaDraft.timeoutMs ?? 30000)} onChange={(value) => setIaDraft((atual) => ({ ...atual, timeoutMs: Number(value) }))} />
              <Campo label="Chave ou token" value={iaDraft.credencial ?? ""} onChange={(value) => setIaDraft((atual) => ({ ...atual, credencial: value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={Boolean(iaDraft.ativo)} onChange={(event) => setIaDraft((atual) => ({ ...atual, ativo: event.target.checked }))} />
              Ativar integração para este tenant
            </label>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => salvarIaMutation.mutate(iaDraft)}>
                <Save className="mr-1.5 h-4 w-4" />
                Salvar
              </Button>
              <Button variant="outline" onClick={() => void testarIa(iaDraft.tipo)}>
                Testar conexão
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {configs.map((config) => (
                <div key={config.id ?? config.tipo} className="rounded-lg border border-[var(--g3-border)] p-3 text-sm">
                  <p className="font-semibold">{config.tipo} - {config.provedor || "Sem provedor"}</p>
                  <p>Chave configurada: {config.credencialMascarada || "Não configurada"}</p>
                  <p>Último teste: {config.ultimoTesteEm ? new Date(config.ultimoTesteEm).toLocaleString("pt-BR") : "Não testado"}</p>
                  {config.ultimoErro ? <p className="text-red-700">{config.ultimoErro}</p> : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (area === "relatorios" || area === "prestacao") {
    return (
      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{titulos[area]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-4">
              {["Identificação", "Receitas", "Despesas", "Conciliação", "Metas", "Documentos", "Aprovações", "Envio"].map((etapa, index) => (
                <div key={etapa} className="rounded-lg border border-[var(--g3-border)] p-3">
                  <p className="text-xs text-[var(--g3-muted)]">Etapa {index + 1}</p>
                  <p className="font-medium">{etapa}</p>
                  <Badge variant={index < 2 ? "success" : "warning"}>{index < 2 ? "Em andamento" : "Pendente"}</Badge>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => informarExportacaoIndisponivel("Relatório PDF")}>Gerar relatório PDF</Button>
              <Button variant="outline" onClick={() => informarExportacaoIndisponivel("XLSX")}>Gerar XLSX</Button>
              <Button variant="outline" onClick={() => informarExportacaoIndisponivel("Pacote ZIP")}>Preparar pacote ZIP</Button>
              <Button variant="outline" onClick={() => void assistente()}>
                <Bot className="mr-1.5 h-4 w-4" />
                Revisão inteligente
              </Button>
            </div>
          </CardContent>
        </Card>
        {mensagem ? <p className="rounded-lg border border-[var(--g3-border)] p-3 text-sm">{mensagem}</p> : null}
      </section>
    );
  }

  if (area === "auditoria") {
    const auditoria = auditoriaQuery.data ?? [];
    return (
      <section className="space-y-3">
        <Card>
          <CardHeader>
            <CardTitle>Histórico e auditoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {auditoria.length ? auditoria.map((item) => (
              <div key={item.id} className="rounded-lg border border-[var(--g3-border)] p-3 text-sm">
                <p className="font-medium">{item.acao} em {item.entidade}</p>
                <p className="text-[var(--g3-muted)]">{item.usuarioNome || "Usuário não informado"} - {item.criadoEm ? new Date(item.criadoEm).toLocaleString("pt-BR") : ""}</p>
              </div>
            )) : <p className="text-sm text-[var(--g3-muted)]">Nenhum evento registrado.</p>}
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{titulos[area]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {campos.map((campo) => (
              campo === "objeto" || campo === "descricao" || campo === "parecer" ? (
                <div key={campo} className="space-y-1 md:col-span-2 xl:col-span-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{campo}</Label>
                    <AjudaCampo texto={campo === "objeto" ? ajuda.objeto : campo === "descricao" ? ajuda.meioVerificacao : "Registre a justificativa com base em documentos e dados reais."} />
                  </div>
                  <Textarea rows={3} value={draft[campo] ?? ""} onChange={(event) => setDraft((atual) => ({ ...atual, [campo]: event.target.value }))} />
                </div>
              ) : (
                <Campo
                  key={campo}
                  label={campo}
                  type={campo.toLowerCase().includes("data") || campo.includes("Vigencia") || campo === "prazo" || campo === "validade" ? "date" : campo.toLowerCase().includes("valor") || campo.includes("quantidade") ? "number" : "text"}
                  value={draft[campo] ?? ""}
                  ajuda={campo === "indicador" ? ajuda.indicador : campo === "categoria" ? ajuda.rubrica : campo === "situacao" ? ajuda.conciliacao : undefined}
                  onChange={(value) => setDraft((atual) => ({ ...atual, [campo]: value }))}
                />
              )
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void salvar()} disabled={criarMutation.isPending || !campos.length}>
              <Plus className="mr-1.5 h-4 w-4" />
              Salvar registro
            </Button>
            <Button variant="outline" onClick={() => void assistente()}>
              <Bot className="mr-1.5 h-4 w-4" />
              Pedir sugestão
            </Button>
            {area === "documentos" ? (
              <Button variant="outline" onClick={() => void prestacaoContasService.analisarDocumento(draft.id || "0")}>
                <FileSearch className="mr-1.5 h-4 w-4" />
                Analisar documento
              </Button>
            ) : null}
          </div>
          {mensagem ? <p className="rounded-lg border border-[var(--g3-border)] p-3 text-sm">{mensagem}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registros</CardTitle>
        </CardHeader>
        <CardContent>
          {listaQuery.isLoading ? (
            <p className="text-sm text-[var(--g3-muted)]">Carregando registros...</p>
          ) : (listaQuery.data ?? []).length ? (
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Código</th>
                    <th className="px-3 py-2 text-left">Resumo</th>
                    <th className="px-3 py-2 text-left">Situação</th>
                    <th className="px-3 py-2 text-left">Atualização</th>
                  </tr>
                </thead>
                <tbody>
                  {(listaQuery.data ?? []).map((item) => (
                    <tr key={item.id} className="border-t border-[var(--g3-border)]">
                      <td className="px-3 py-2">{item.id}</td>
                      <td className="px-3 py-2">{registrosResumo(item)}</td>
                      <td className="px-3 py-2"><Badge variant="info">{item.situacao || "Ativo"}</Badge></td>
                      <td className="px-3 py-2">{item.atualizadoEm ? new Date(item.atualizadoEm).toLocaleString("pt-BR") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[var(--g3-muted)]">Nenhum registro cadastrado nesta área.</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
