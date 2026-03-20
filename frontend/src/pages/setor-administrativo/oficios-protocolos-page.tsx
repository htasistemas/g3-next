import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  Eye,
  FileText,
  ListChecks,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  Upload,
  Undo2,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import {
  useContextoDocumentoOficio,
  useExcluirOficio,
  useImportarConteudoOficio,
  useOficios,
  useProximoNumeroOficio,
  useSalvarOficio
} from "@/features/oficios/use-oficios";
import { useAuth } from "@/hooks/use-auth";
import { abrirRelatorioPdf } from "@/lib/report-utils";
import { matriculasService } from "@/services/matriculas.service";
import { oficiosService } from "@/services/oficios.service";
import { profissionaisService } from "@/services/profissionais.service";
import type { UsuarioAutenticado } from "@/types/auth";
import type { MatriculaSalaCatalogo } from "@/types/matricula";
import type {
  OficioDocumentoContexto,
  OficioImportacaoResultado,
  OficioPayload,
  OficioTramite
} from "@/types/oficio";
import type { Profissional } from "@/types/profissional";

type AbaId = "dashboard" | "identificacao" | "conteudo" | "tramitacao" | "listagem";
type CampoObrigatorio = "setorOrigem" | "responsavel" | "razaoSocial" | "assunto" | "corpo";
type ErrosFormulario = Partial<Record<CampoObrigatorio, string>>;
type ImportacaoLoteItem = {
  id: string;
  nomeArquivo: string;
  status: "sucesso" | "erro" | "rascunho_criado";
  importacao?: OficioImportacaoResultado;
  erro?: string;
  oficioId?: string;
  numeroGerado?: string;
};
type PreenchimentoLotePadrao = {
  setorOrigem: string;
  razaoSocial: string;
  para: string;
  cargoPara: string;
};

const abas: AdminTab[] = [
  { id: "dashboard", label: "Dashboard", icon: ClipboardList },
  { id: "identificacao", label: "Identificação e protocolo", icon: FileText },
  { id: "conteudo", label: "Redação do ofício", icon: FileText },
  { id: "tramitacao", label: "Tramitação e acompanhamento", icon: ListChecks },
  { id: "listagem", label: "Ofícios registrados", icon: ListChecks }
];

const tituloTela = "Ofícios e protocolos";
const LIMITE_IMPORTACAO_LOTE = 10;
const SALA_PADRAO_IMPORTACAO = "Administração geral";
const statusOptions = ["Rascunho", "Em preparacao", "Enviado", "Recebido", "Em analise", "Arquivado"];
const meiosEnvio = ["Sistema G3", "E-mail", "Correio", "Entrega presencial"];
const finalizacaoPadrao =
  "Sem mais para o momento, colocamo-nos à disposição para quaisquer esclarecimentos que se façam necessários.";
const dataExtensoFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "long",
  year: "numeric"
});

function obterHojeIso() {
  const agora = new Date();
  const ajuste = agora.getTime() - agora.getTimezoneOffset() * 60_000;
  return new Date(ajuste).toISOString().slice(0, 10);
}

function obterAnoAtual() {
  return String(new Date().getFullYear());
}

function formatarDataInterface(data?: string) {
  if (!data) return "---";
  const [ano, mes, dia] = data.split("-");
  if (!ano || !mes || !dia) return data;
  return `${dia}-${mes}-${ano}`;
}

function formatarDataExtensoInterface(data?: string) {
  if (!data) return "";
  const valor = new Date(`${data}T12:00:00`);
  if (Number.isNaN(valor.getTime())) return data;
  const texto = dataExtensoFormatter.format(valor);
  return texto.replace(/ de ([a-zà-ú])/u, (_match, letra: string) => ` de ${letra.toUpperCase()}`);
}

function quebrarParagrafos(texto?: string) {
  return (texto ?? "")
    .split(/\r?\n\s*\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function obterNomeUsuarioLogado(usuario?: UsuarioAutenticado | null) {
  return usuario?.nome?.trim() || usuario?.nomeUsuario?.trim() || "";
}

function normalizarBusca(valor?: string) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatarStatus(status?: string) {
  const mapa: Record<string, string> = {
    Rascunho: "Rascunho",
    "Em preparacao": "Em preparação",
    Enviado: "Enviado",
    Recebido: "Recebido",
    "Em analise": "Em análise",
    Arquivado: "Arquivado"
  };

  return mapa[status ?? ""] ?? (status || "---");
}

function gerarProtocoloCurto(prefixo: "ENV" | "REC") {
  const agora = new Date();
  const data = `${agora.getFullYear()}${String(agora.getMonth() + 1).padStart(2, "0")}${String(
    agora.getDate()
  ).padStart(2, "0")}`;
  const sequencia = String(agora.getHours() * 3600 + agora.getMinutes() * 60 + agora.getSeconds()).padStart(
    5,
    "0"
  );
  return `${prefixo}-${data}-${sequencia}`;
}

function montarCidadeUfDocumento(contexto?: OficioDocumentoContexto | null) {
  const cidadeUf = contexto?.cidadeUf?.trim();
  if (cidadeUf) return cidadeUf;

  const cidade = contexto?.instituicao?.cidade?.trim() ?? "";
  const uf = contexto?.instituicao?.uf?.trim().toUpperCase() ?? "";
  if (cidade && uf) return `${cidade}-${uf}`;
  return cidade || uf;
}

function montarLinhasRodapeDocumento(contexto?: OficioDocumentoContexto | null) {
  const instituicao = contexto?.instituicao;
  if (!instituicao) return [];

  if (instituicao.rodapePadrao) {
    return [
      instituicao.rodapePadrao.linha1?.trim() || "",
      instituicao.rodapePadrao.linha2?.trim() || "",
      instituicao.rodapePadrao.linha3?.trim() || ""
    ].filter(Boolean);
  }

  const cidadeUf = montarCidadeUfDocumento(contexto);
  return [
    instituicao.nomeCompleto?.trim() || "",
    instituicao.unidadeOuNucleo?.trim() || "",
    [instituicao.cnpj ? `CNPJ: ${instituicao.cnpj}` : "", instituicao.endereco?.trim() || ""]
      .filter(Boolean)
      .join(" | "),
    [
      instituicao.cep ? `CEP: ${instituicao.cep}` : "",
      cidadeUf,
      instituicao.telefone ? `Telefone: ${instituicao.telefone}` : "",
      instituicao.site ? `Site: ${instituicao.site}` : "",
      instituicao.email ? `E-mail: ${instituicao.email}` : ""
    ]
      .filter(Boolean)
      .join(" | ")
  ].filter(Boolean);
}

function extrairInformacoesComplementaresOficio(form: OficioPayload) {
  const itens: Array<{ rotulo: string; valor: string }> = [];
  const linhas = (form.protocolo.observacoes ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  const mapaRotulos: Array<{ aliases: string[]; rotulo: string }> = [
    { aliases: ["denominacao do evento"], rotulo: "Denominação do evento" },
    { aliases: ["estimativa de publico"], rotulo: "Estimativa de público" },
    { aliases: ["cronograma"], rotulo: "Cronograma" },
    {
      aliases: ["datas e horarios", "data e horario", "data e horarios", "datas e horario"],
      rotulo: "Datas e horários"
    }
  ];
  const linhasConsumidas = new Set<number>();

  linhas.forEach((linha, index) => {
    const separador = linha.indexOf(":");
    if (separador <= 0) return;

    const chave = normalizarBusca(linha.slice(0, separador));
    const valor = linha.slice(separador + 1).trim();
    if (!valor) return;

    const configuracao = mapaRotulos.find((item) => item.aliases.includes(chave));
    if (!configuracao || itens.some((item) => item.rotulo === configuracao.rotulo)) return;

    itens.push({ rotulo: configuracao.rotulo, valor });
    linhasConsumidas.add(index);
  });

  const observacoesLivres = linhas.filter((_, index) => !linhasConsumidas.has(index)).join(" ").trim();
  if (observacoesLivres) {
    itens.push({ rotulo: "Observações complementares", valor: observacoesLivres });
  }

  if (form.identificacao.prazoResposta?.trim()) {
    itens.push({ rotulo: "Prazo de resposta", valor: form.identificacao.prazoResposta.trim() });
  }

  if (form.identificacao.classificacao?.trim()) {
    itens.push({ rotulo: "Classificação", valor: form.identificacao.classificacao.trim() });
  }

  return itens;
}

function extrairCargoProfissional(profissional?: Profissional | null) {
  if (!profissional) return "";
  const categoria = profissional.categoria?.trim() ?? "";
  const especialidade = profissional.especialidade?.trim() ?? "";
  const vinculo = profissional.vinculo?.trim() ?? "";

  if (categoria && especialidade && normalizarBusca(categoria) !== normalizarBusca(especialidade)) {
    return `${categoria} - ${especialidade}`;
  }

  return categoria || especialidade || vinculo;
}

function montarValorSala(sala: MatriculaSalaCatalogo) {
  return [sala.unidade_nome?.trim(), sala.nome.trim()].filter(Boolean).join(" - ");
}

function montarRotuloSala(sala: MatriculaSalaCatalogo) {
  return sala.unidade_nome?.trim() ? `${sala.nome} • ${sala.unidade_nome}` : sala.nome;
}

function obterSalaPadraoImportacao(salas: MatriculaSalaCatalogo[]) {
  const alvo = normalizarBusca(SALA_PADRAO_IMPORTACAO);
  const sala =
    salas.find((item) => normalizarBusca(item.nome) === alvo) ??
    salas.find((item) => normalizarBusca(montarRotuloSala(item)).includes(alvo));

  return sala ? montarValorSala(sala) : SALA_PADRAO_IMPORTACAO;
}

function criarTramitePadrao(responsavel = "", origem = ""): OficioTramite {
  return {
    data: obterHojeIso(),
    origem,
    destino: "",
    responsavel,
    acao: "",
    observacoes: ""
  };
}

function criarFormularioVazio(responsavel = ""): OficioPayload {
  return {
    identificacao: {
      tipo: "emissao",
      numero: "",
      data: obterHojeIso(),
      setorOrigem: "",
      responsavel,
      destinatario: "",
      destinatarioResponsavel: "",
      destinatarioCargo: "",
      meioEnvio: "Sistema G3",
      prazoResposta: "",
      classificacao: ""
    },
    conteudo: {
      razaoSocial: "",
      logoUrl: "",
      titulo: "",
      saudacao: "",
      para: "",
      cargoPara: "",
      assunto: "",
      corpo: "",
      finalizacao: finalizacaoPadrao,
      assinaturaNome: "",
      assinaturaCargo: "",
      rodape: ""
    },
    protocolo: {
      status: "Rascunho",
      protocoloEnvio: "",
      dataEnvio: "",
      protocoloRecebimento: "",
      dataRecebimento: "",
      proximoDestino: "",
      observacoes: ""
    },
    tramites: []
  };
}

function clonarOficio(oficio: OficioPayload): OficioPayload {
  return {
    ...oficio,
    identificacao: { ...oficio.identificacao },
    conteudo: { ...oficio.conteudo },
    protocolo: { ...oficio.protocolo },
    tramites: (oficio.tramites ?? []).map((item) => ({ ...item }))
  };
}

function encontrarProfissionalPorNome(profissionais: Profissional[], nome?: string) {
  const alvo = normalizarBusca(nome);
  if (!alvo) return null;

  return (
    profissionais.find((item) => {
      const nomes = [item.nome_completo, item.nome_social, item.apelido];
      return nomes.some((valor) => normalizarBusca(valor) === alvo);
    }) ?? null
  );
}

function classeStatus(status?: string) {
  if (status === "Recebido") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "Enviado") return "border-sky-200 bg-sky-50 text-sky-800";
  if (status === "Em analise") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "Arquivado") return "border-slate-200 bg-slate-100 text-slate-700";
  if (status === "Em preparacao") return "border-violet-200 bg-violet-50 text-violet-800";
  return "border-[var(--g3-border)] bg-[var(--g3-primary-soft)] text-[var(--g3-active)]";
}

function resumirTextoImportado(valor?: string, limite = 140) {
  const texto = (valor ?? "").replace(/\s+/g, " ").trim();
  if (!texto) return "Não identificado";
  if (texto.length <= limite) return texto;
  return `${texto.slice(0, limite).trimEnd()}...`;
}

function criarPreenchimentoLotePadrao(): PreenchimentoLotePadrao {
  return {
    setorOrigem: "",
    razaoSocial: "",
    para: "",
    cargoPara: ""
  };
}

export function OficiosProtocolosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const importacaoArquivoRef = useRef<HTMLInputElement | null>(null);
  const importacaoLoteArquivoRef = useRef<HTMLInputElement | null>(null);
  const responsavelLogado = useMemo(() => obterNomeUsuarioLogado(usuario), [usuario]);

  const [abaAtiva, setAbaAtiva] = useState<AbaId>("dashboard");
  const [busca, setBusca] = useState("");
  const [anoListagem, setAnoListagem] = useState(() => obterAnoAtual());
  const [erros, setErros] = useState<ErrosFormulario>({});
  const [popupMensagem, setPopupMensagem] = useState<PopupMensagemState | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const [imprimindo, setImprimindo] = useState(false);
  const [oficioCopiaId, setOficioCopiaId] = useState("");
  const [termoBuscaCopia, setTermoBuscaCopia] = useState("");
  const [previaAberta, setPreviaAberta] = useState(false);
  const [ultimaImportacao, setUltimaImportacao] = useState<OficioImportacaoResultado | null>(null);
  const [importacoesLote, setImportacoesLote] = useState<ImportacaoLoteItem[]>([]);
  const [preenchimentoLotePadrao, setPreenchimentoLotePadrao] = useState<PreenchimentoLotePadrao>(
    () => criarPreenchimentoLotePadrao()
  );
  const [progressoImportacaoLote, setProgressoImportacaoLote] = useState<{
    atual: number;
    total: number;
    arquivo: string;
  } | null>(null);
  const [progressoCriacaoLote, setProgressoCriacaoLote] = useState<{
    atual: number;
    total: number;
    arquivo: string;
  } | null>(null);
  const [form, setForm] = useState<OficioPayload>(() => criarFormularioVazio(""));
  const [snapshot, setSnapshot] = useState<OficioPayload>(() => criarFormularioVazio(""));
  const [tramite, setTramite] = useState<OficioTramite>(() => criarTramitePadrao(""));

  const { data } = useOficios();
  const { data: proximoNumeroData, isFetching: carregandoNumero } = useProximoNumeroOficio(form.identificacao.data);
  const { data: contextoDocumento, isLoading: carregandoContextoDocumento } = useContextoDocumentoOficio();
  const importarConteudoMutation = useImportarConteudoOficio();
  const salvarMutation = useSalvarOficio();
  const excluirMutation = useExcluirOficio();
  const importandoLote = !!progressoImportacaoLote;
  const criandoRascunhosLote = !!progressoCriacaoLote;

  const { data: salasData, isLoading: carregandoSalas } = useQuery({
    queryKey: ["matriculas", "catalogo", "salas"],
    queryFn: () => matriculasService.listarSalas(),
    staleTime: 300_000
  });

  const { data: profissionaisData, isLoading: carregandoProfissionais } = useQuery({
    queryKey: ["profissionais", "catalogo", "oficios"],
    queryFn: () => profissionaisService.listar(),
    staleTime: 300_000
  });

  const oficios = data?.oficios ?? [];

  const salas = useMemo(
    () => [...(salasData?.salas ?? [])].sort((a, b) => montarRotuloSala(a).localeCompare(montarRotuloSala(b), "pt-BR")),
    [salasData?.salas]
  );

  const profissionais = useMemo(
    () => [...(profissionaisData?.profissionais ?? [])].sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, "pt-BR")),
    [profissionaisData?.profissionais]
  );
  const setorOrigemImportacaoPadrao = useMemo(() => obterSalaPadraoImportacao(salas), [salas]);

  const oficiosOrdenados = useMemo(() => {
    return [...oficios].sort((a, b) => {
      const dataA = a.identificacao.data || "";
      const dataB = b.identificacao.data || "";
      if (dataA !== dataB) return dataB.localeCompare(dataA);
      return (b.identificacao.numero || "").localeCompare(a.identificacao.numero || "", "pt-BR");
    });
  }, [oficios]);

  const oficiosParaCopia = useMemo(
    () => oficiosOrdenados.filter((item) => item.id !== form.id && item.conteudo.corpo?.trim()),
    [form.id, oficiosOrdenados]
  );

  const oficiosRelacionadosParaCopia = useMemo(() => {
    const termo = normalizarBusca(termoBuscaCopia);
    if (!termo) {
      return [];
    }

    return oficiosParaCopia
      .filter((item) => {
        const alvo = normalizarBusca(
          `${item.identificacao.numero} ${item.conteudo.assunto} ${item.conteudo.razaoSocial}`
        );
        return alvo.includes(termo);
      })
      .slice(0, 8);
  }, [oficiosParaCopia, termoBuscaCopia]);

  const anosDisponiveis = useMemo(() => {
    const anos = new Set<string>([obterAnoAtual()]);
    oficios.forEach((item) => {
      const ano = item.identificacao.data?.slice(0, 4)?.trim();
      if (ano) anos.add(ano);
    });

    return Array.from(anos).sort((a, b) => b.localeCompare(a, "pt-BR"));
  }, [oficios]);

  const oficiosFiltrados = useMemo(() => {
    const termo = normalizarBusca(busca);
    return oficiosOrdenados.filter((item) => {
      const anoItem = item.identificacao.data?.slice(0, 4) ?? "";
      if (anoListagem !== "todos" && anoItem !== anoListagem) {
        return false;
      }

      if (!termo) {
        return true;
      }

      const alvo = normalizarBusca(
        [
          item.identificacao.numero,
          item.identificacao.data,
          item.identificacao.setorOrigem,
          item.identificacao.responsavel,
          item.conteudo.razaoSocial,
          item.conteudo.assunto,
          item.protocolo.status
        ].join(" ")
      );
      return alvo.includes(termo);
    });
  }, [anoListagem, busca, oficiosOrdenados]);

  const itensLotePendentes = useMemo(
    () =>
      importacoesLote.filter(
        (item): item is ImportacaoLoteItem & { importacao: OficioImportacaoResultado } =>
          item.status === "sucesso" && !!item.importacao
      ),
    [importacoesLote]
  );

  const resumoPendenciasLote = useMemo(() => {
    return itensLotePendentes.reduce(
      (acumulado, item) => {
        const importacao = item.importacao;
        const destinatario =
          importacao.conteudo.identificacao.destinatario?.trim() ||
          importacao.conteudo.conteudo.razaoSocial?.trim() ||
          preenchimentoLotePadrao.razaoSocial.trim();
        const destinatarioResponsavel =
          importacao.conteudo.identificacao.destinatarioResponsavel?.trim() ||
          importacao.conteudo.conteudo.para?.trim() ||
          preenchimentoLotePadrao.para.trim();
        const destinatarioCargo =
          importacao.conteudo.identificacao.destinatarioCargo?.trim() ||
          importacao.conteudo.conteudo.cargoPara?.trim() ||
          preenchimentoLotePadrao.cargoPara.trim();

        if (!preenchimentoLotePadrao.setorOrigem.trim()) acumulado.semSala += 1;
        if (!destinatario) acumulado.semDestinatario += 1;
        if (!destinatarioResponsavel) acumulado.semAosCuidados += 1;
        if (!destinatarioCargo) acumulado.semCargo += 1;
        if (!importacao.conteudo.conteudo.assunto?.trim()) acumulado.semAssunto += 1;
        if (!importacao.conteudo.conteudo.corpo?.trim()) acumulado.semCorpo += 1;

        return acumulado;
      },
      {
        semSala: 0,
        semDestinatario: 0,
        semAosCuidados: 0,
        semCargo: 0,
        semAssunto: 0,
        semCorpo: 0
      }
    );
  }, [itensLotePendentes, preenchimentoLotePadrao]);

  const dashboard = useMemo(
    () => ({
      total: oficios.length,
      rascunhos: oficios.filter((item) => item.protocolo.status === "Rascunho").length,
      emPreparacao: oficios.filter((item) => item.protocolo.status === "Em preparacao").length,
      enviados: oficios.filter((item) => item.protocolo.status === "Enviado").length,
      recebidos: oficios.filter((item) => item.protocolo.status === "Recebido").length,
      emAnalise: oficios.filter((item) => item.protocolo.status === "Em analise").length,
      arquivados: oficios.filter((item) => item.protocolo.status === "Arquivado").length,
      semProtocolo: oficios.filter(
        (item) => !item.protocolo.protocoloEnvio?.trim() && !item.protocolo.protocoloRecebimento?.trim()
      ).length
    }),
    [oficios]
  );

  const cidadeUfDocumento = useMemo(
    () => montarCidadeUfDocumento(contextoDocumento),
    [contextoDocumento]
  );
  const dataExtensoDocumento = useMemo(
    () => formatarDataExtensoInterface(form.identificacao.data),
    [form.identificacao.data]
  );
  const destinatarioLinha = useMemo(
    () => [form.conteudo.saudacao?.trim() ?? "", form.conteudo.para?.trim() ?? ""].filter(Boolean).join(" "),
    [form.conteudo.para, form.conteudo.saudacao]
  );
  const corpoPrevia = useMemo(() => quebrarParagrafos(form.conteudo.corpo), [form.conteudo.corpo]);
  const fechamentoPrevia = useMemo(
    () => quebrarParagrafos(form.conteudo.finalizacao),
    [form.conteudo.finalizacao]
  );
  const informacoesComplementaresPrevia = useMemo(
    () => extrairInformacoesComplementaresOficio(form),
    [form]
  );
  const rodapeDocumento = useMemo(
    () => montarLinhasRodapeDocumento(contextoDocumento),
    [contextoDocumento]
  );

  useEffect(() => {
    if (!responsavelLogado) return;

    setForm((atual) =>
      atual.id || atual.identificacao.responsavel === responsavelLogado
        ? atual
        : { ...atual, identificacao: { ...atual.identificacao, responsavel: responsavelLogado } }
    );
    setSnapshot((atual) =>
      atual.id || atual.identificacao.responsavel === responsavelLogado
        ? atual
        : { ...atual, identificacao: { ...atual.identificacao, responsavel: responsavelLogado } }
    );
    setTramite((atual) => (atual.responsavel?.trim() ? atual : { ...atual, responsavel: responsavelLogado }));
  }, [responsavelLogado]);

  useEffect(() => {
    if (form.id || !proximoNumeroData?.numero) return;

    setForm((atual) =>
      atual.id || atual.identificacao.numero === proximoNumeroData.numero
        ? atual
        : { ...atual, identificacao: { ...atual.identificacao, numero: proximoNumeroData.numero } }
    );
    setSnapshot((atual) =>
      atual.id || atual.identificacao.numero === proximoNumeroData.numero
        ? atual
        : { ...atual, identificacao: { ...atual.identificacao, numero: proximoNumeroData.numero } }
    );
  }, [form.id, proximoNumeroData?.numero]);

  useEffect(() => {
    if (!responsavelLogado || profissionais.length === 0) return;

    const profissional = encontrarProfissionalPorNome(profissionais, responsavelLogado);
    if (!profissional) return;

    const cargo = extrairCargoProfissional(profissional);

    setForm((atual) => {
      if (atual.id) return atual;
      const nomeAtual = atual.conteudo.assinaturaNome?.trim() ?? "";
      const cargoAtual = atual.conteudo.assinaturaCargo?.trim() ?? "";
      const manterManual = nomeAtual && normalizarBusca(nomeAtual) !== normalizarBusca(responsavelLogado);
      if (manterManual) return atual;
      if (nomeAtual === profissional.nome_completo && cargoAtual === cargo) return atual;

      return {
        ...atual,
        conteudo: {
          ...atual.conteudo,
          assinaturaNome: profissional.nome_completo,
          assinaturaCargo: cargoAtual || cargo
        }
      };
    });

    setSnapshot((atual) => {
      if (atual.id) return atual;
      const nomeAtual = atual.conteudo.assinaturaNome?.trim() ?? "";
      const cargoAtual = atual.conteudo.assinaturaCargo?.trim() ?? "";
      const manterManual = nomeAtual && normalizarBusca(nomeAtual) !== normalizarBusca(responsavelLogado);
      if (manterManual) return atual;
      if (nomeAtual === profissional.nome_completo && cargoAtual === cargo) return atual;

      return {
        ...atual,
        conteudo: {
          ...atual.conteudo,
          assinaturaNome: profissional.nome_completo,
          assinaturaCargo: cargoAtual || cargo
        }
      };
    });
  }, [profissionais, responsavelLogado]);

  useEffect(() => {
    setTramite((atual) => {
      const origem = atual.origem?.trim() ? atual.origem : form.identificacao.setorOrigem;
      const responsavel = atual.responsavel?.trim()
        ? atual.responsavel
        : responsavelLogado || form.identificacao.responsavel;

      if (origem === (atual.origem ?? "") && responsavel === (atual.responsavel ?? "")) return atual;
      return { ...atual, origem, responsavel };
    });
  }, [form.identificacao.responsavel, form.identificacao.setorOrigem, responsavelLogado]);

  function mensagemCampoObrigatorio(campo: CampoObrigatorio, valor: string) {
    const texto = valor.trim();
    if (campo === "setorOrigem" && !texto) return "Selecione a sala de atendimento de origem.";
    if (campo === "responsavel" && !texto) return "Não foi possível identificar o usuário responsável.";
    if (campo === "razaoSocial" && !texto) return "Informe para quem o ofício será destinado.";
    if (campo === "assunto" && texto.length < 2) return "Informe um assunto com pelo menos 2 caracteres.";
    if (campo === "corpo" && texto.length < 2) return "Informe o corpo do ofício.";
    return "";
  }

  function atualizarErroCampo(campo: CampoObrigatorio, valor: string) {
    setErros((atual) => {
      const mensagem = mensagemCampoObrigatorio(campo, valor);
      const proximo = { ...atual };
      if (mensagem) proximo[campo] = mensagem;
      else delete proximo[campo];
      return proximo;
    });
  }

  function validarFormularioCompleto() {
    const proximosErros: ErrosFormulario = {};
    const campos: Record<CampoObrigatorio, string> = {
      setorOrigem: form.identificacao.setorOrigem ?? "",
      responsavel: form.identificacao.responsavel ?? "",
      razaoSocial: form.conteudo.razaoSocial ?? "",
      assunto: form.conteudo.assunto ?? "",
      corpo: form.conteudo.corpo ?? ""
    };

    (Object.keys(campos) as CampoObrigatorio[]).forEach((campo) => {
      const mensagem = mensagemCampoObrigatorio(campo, campos[campo]);
      if (mensagem) proximosErros[campo] = mensagem;
    });

    setErros(proximosErros);
    return { valido: Object.keys(proximosErros).length === 0, erros: proximosErros };
  }

  function atualizarIdentificacao<K extends keyof OficioPayload["identificacao"]>(
    campo: K,
    valor: OficioPayload["identificacao"][K]
  ) {
    setForm((atual) => ({
      ...atual,
      identificacao: {
        ...atual.identificacao,
        [campo]: valor
      }
    }));
  }

  function atualizarConteudo<K extends keyof OficioPayload["conteudo"]>(
    campo: K,
    valor: OficioPayload["conteudo"][K]
  ) {
    setForm((atual) => ({
      ...atual,
      conteudo: {
        ...atual.conteudo,
        [campo]: valor
      }
    }));
  }

  function atualizarProtocolo<K extends keyof OficioPayload["protocolo"]>(
    campo: K,
    valor: OficioPayload["protocolo"][K]
  ) {
    setForm((atual) => ({
      ...atual,
      protocolo: {
        ...atual.protocolo,
        [campo]: valor
      }
    }));
  }

  function atualizarTramite<K extends keyof OficioTramite>(campo: K, valor: OficioTramite[K]) {
    setTramite((atual) => ({ ...atual, [campo]: valor }));
  }

  function novo() {
    const base = criarFormularioVazio(responsavelLogado);
    const profissionalLogado = encontrarProfissionalPorNome(profissionais, responsavelLogado);
    if (proximoNumeroData?.numero) base.identificacao.numero = proximoNumeroData.numero;
    if (profissionalLogado) {
      base.conteudo.assinaturaNome = profissionalLogado.nome_completo;
      base.conteudo.assinaturaCargo = extrairCargoProfissional(profissionalLogado);
    }

    setForm(base);
    setSnapshot(clonarOficio(base));
    setTramite(criarTramitePadrao(responsavelLogado, base.identificacao.setorOrigem));
    setOficioCopiaId("");
    setTermoBuscaCopia("");
    setPreviaAberta(false);
    setUltimaImportacao(null);
    setImportacoesLote([]);
    setPreenchimentoLotePadrao(criarPreenchimentoLotePadrao());
    setErros({});
    setAbaAtiva("identificacao");
  }

  function selecionar(item: OficioPayload) {
    const proximo = clonarOficio(item);
    setForm(proximo);
    setSnapshot(clonarOficio(proximo));
    setTramite(criarTramitePadrao(proximo.identificacao.responsavel, proximo.identificacao.setorOrigem));
    setOficioCopiaId("");
    setTermoBuscaCopia("");
    setPreviaAberta(false);
    setUltimaImportacao(null);
    setImportacoesLote([]);
    setPreenchimentoLotePadrao(criarPreenchimentoLotePadrao());
    setErros({});
    setAbaAtiva("identificacao");
  }

  function buscar() {
    setAbaAtiva("listagem");
  }

  function cancelar() {
    const restaurado = clonarOficio(snapshot);
    setForm(restaurado);
    setTramite(criarTramitePadrao(restaurado.identificacao.responsavel, restaurado.identificacao.setorOrigem));
    setOficioCopiaId("");
    setTermoBuscaCopia("");
    setPreviaAberta(false);
    setUltimaImportacao(null);
    setImportacoesLote([]);
    setPreenchimentoLotePadrao(criarPreenchimentoLotePadrao());
    setErros({});
  }

  async function salvar() {
    const validacao = validarFormularioCompleto();
    if (!validacao.valido) {
      const possuiErroConteudo =
        !!validacao.erros.razaoSocial || !!validacao.erros.assunto || !!validacao.erros.corpo;
      setAbaAtiva(possuiErroConteudo ? "conteudo" : "identificacao");
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Revise os campos destacados antes de salvar o ofício."
      });
      return;
    }

    try {
      const payload = montarPayloadPersistencia(form);

      const response = await salvarMutation.mutateAsync(payload);
      const clonado = clonarOficio(response);
      setForm(clonado);
      setSnapshot(clonarOficio(clonado));
      setTramite(criarTramitePadrao(clonado.identificacao.responsavel, clonado.identificacao.setorOrigem));
      setErros({});
      setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Ofício salvo com sucesso." });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar o ofício."
      });
    }
  }

  function excluir() {
    if (!form.id) {
      setPopupMensagem({ tipo: "aviso", titulo: "Atenção", texto: "Selecione um ofício para excluir." });
      return;
    }

    setConfirmarExcluir(true);
  }

  async function confirmarExclusao() {
    if (!form.id) return;

    try {
      await excluirMutation.mutateAsync(form.id);
      setConfirmarExcluir(false);
      novo();
      setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Ofício excluído com sucesso." });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir o ofício."
      });
    }
  }

  function adicionarTramite() {
    if (tramite.acao.trim().length < 2) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe uma ação de tramitação com pelo menos 2 caracteres."
      });
      return;
    }

    setForm((atual) => ({
      ...atual,
      tramites: [
        {
          ...tramite,
          data: tramite.data || obterHojeIso(),
          origem: tramite.origem?.trim() || atual.identificacao.setorOrigem || undefined,
          destino: tramite.destino?.trim() || undefined,
          responsavel:
            tramite.responsavel?.trim() || responsavelLogado || atual.identificacao.responsavel || undefined,
          acao: tramite.acao.trim(),
          observacoes: tramite.observacoes?.trim() || undefined
        },
        ...(atual.tramites ?? [])
      ]
    }));

    setTramite(criarTramitePadrao(responsavelLogado || form.identificacao.responsavel, form.identificacao.setorOrigem));
  }

  function registrarEnvio() {
    const hoje = obterHojeIso();
    const protocoloEnvio = form.protocolo.protocoloEnvio?.trim() || gerarProtocoloCurto("ENV");
    const destino = form.protocolo.proximoDestino?.trim() || form.conteudo.razaoSocial.trim() || "Destino externo";

    setForm((atual) => ({
      ...atual,
      protocolo: {
        ...atual.protocolo,
        status: "Enviado",
        protocoloEnvio,
        dataEnvio: atual.protocolo.dataEnvio || hoje
      },
      tramites: [
        {
          data: hoje,
          origem: atual.identificacao.setorOrigem || undefined,
          destino,
          responsavel: responsavelLogado || atual.identificacao.responsavel || undefined,
          acao: "Envio registrado",
          observacoes: `Protocolo ${protocoloEnvio} via ${atual.identificacao.meioEnvio}.`
        },
        ...(atual.tramites ?? [])
      ]
    }));

    setPopupMensagem({
      tipo: "sucesso",
      titulo: "Confirmação",
      texto: "Protocolo de envio registrado. Salve o ofício para persistir a alteração."
    });
  }

  function registrarRecebimento() {
    const hoje = obterHojeIso();
    const protocoloRecebimento = form.protocolo.protocoloRecebimento?.trim() || gerarProtocoloCurto("REC");
    const origem = form.protocolo.proximoDestino?.trim() || form.conteudo.razaoSocial.trim() || "Origem externa";

    setForm((atual) => ({
      ...atual,
      protocolo: {
        ...atual.protocolo,
        status: "Recebido",
        protocoloRecebimento,
        dataRecebimento: atual.protocolo.dataRecebimento || hoje
      },
      tramites: [
        {
          data: hoje,
          origem,
          destino: atual.identificacao.setorOrigem || undefined,
          responsavel: responsavelLogado || atual.identificacao.responsavel || undefined,
          acao: "Recebimento confirmado",
          observacoes: `Confirmação vinculada ao protocolo ${protocoloRecebimento}.`
        },
        ...(atual.tramites ?? [])
      ]
    }));

    setPopupMensagem({
      tipo: "sucesso",
      titulo: "Confirmação",
      texto: "Protocolo de recebimento registrado. Salve o ofício para persistir a alteração."
    });
  }

  function copiarCorpoDeOutroOficio(id: string) {
    if (!id) return;

    const origem = oficiosParaCopia.find((item) => item.id === id);
    if (!origem) return;

    setForm((atual) => ({
      ...atual,
      conteudo: {
        ...atual.conteudo,
        corpo: origem.conteudo.corpo,
        finalizacao: atual.conteudo.finalizacao?.trim() ? atual.conteudo.finalizacao : origem.conteudo.finalizacao
      }
    }));

    setOficioCopiaId(origem.id ?? "");
    setTermoBuscaCopia("");
    atualizarErroCampo("corpo", origem.conteudo.corpo ?? "");
    setPopupMensagem({
      tipo: "sucesso",
      titulo: "Confirmação",
      texto: `Corpo do ofício ${origem.identificacao.numero} copiado para a redação atual.`
    });
  }

  function atualizarPreenchimentoLote<K extends keyof PreenchimentoLotePadrao>(
    campo: K,
    valor: PreenchimentoLotePadrao[K]
  ) {
    setPreenchimentoLotePadrao((atual) => ({
      ...atual,
      [campo]: valor
    }));
  }

  function montarImportacaoComPreenchimentoLote(importacao: OficioImportacaoResultado) {
    const destinatarioEfetivo =
      importacao.conteudo.identificacao.destinatario?.trim() ||
      importacao.conteudo.conteudo.razaoSocial?.trim() ||
      preenchimentoLotePadrao.razaoSocial.trim();
    const destinatarioResponsavelEfetivo =
      importacao.conteudo.identificacao.destinatarioResponsavel?.trim() ||
      importacao.conteudo.conteudo.para?.trim() ||
      preenchimentoLotePadrao.para.trim();
    const destinatarioCargoEfetivo =
      importacao.conteudo.identificacao.destinatarioCargo?.trim() ||
      importacao.conteudo.conteudo.cargoPara?.trim() ||
      preenchimentoLotePadrao.cargoPara.trim();

    return {
      ...importacao,
      conteudo: {
        ...importacao.conteudo,
        identificacao: {
          ...importacao.conteudo.identificacao,
          destinatario: destinatarioEfetivo || undefined,
          destinatarioResponsavel: destinatarioResponsavelEfetivo || undefined,
          destinatarioCargo: destinatarioCargoEfetivo || undefined
        },
        conteudo: {
          ...importacao.conteudo.conteudo,
          razaoSocial: destinatarioEfetivo || undefined,
          para: destinatarioResponsavelEfetivo || undefined,
          cargoPara: destinatarioCargoEfetivo || undefined
        }
      }
    };
  }

  function montarPayloadPersistencia(oficioBase: OficioPayload): OficioPayload {
    return {
      ...oficioBase,
      criadoPor: Number(usuario?.id) || oficioBase.criadoPor || undefined,
      identificacao: {
        ...oficioBase.identificacao,
        numero: oficioBase.id ? oficioBase.identificacao.numero.trim() : "",
        data: oficioBase.identificacao.data || obterHojeIso(),
        setorOrigem: oficioBase.identificacao.setorOrigem.trim(),
        responsavel: (oficioBase.identificacao.responsavel || responsavelLogado).trim(),
        destinatario: oficioBase.conteudo.razaoSocial.trim(),
        destinatarioResponsavel: oficioBase.conteudo.para?.trim() || undefined,
        destinatarioCargo: oficioBase.conteudo.cargoPara?.trim() || undefined,
        meioEnvio: oficioBase.identificacao.meioEnvio.trim(),
        prazoResposta: oficioBase.identificacao.prazoResposta?.trim() || undefined,
        classificacao: oficioBase.identificacao.classificacao?.trim() || undefined
      },
      conteudo: {
        ...oficioBase.conteudo,
        razaoSocial: oficioBase.conteudo.razaoSocial.trim(),
        para: oficioBase.conteudo.para?.trim() || undefined,
        cargoPara: oficioBase.conteudo.cargoPara?.trim() || undefined,
        assunto: oficioBase.conteudo.assunto.trim(),
        corpo: oficioBase.conteudo.corpo.trim(),
        finalizacao: oficioBase.conteudo.finalizacao?.trim() || undefined,
        assinaturaNome: oficioBase.conteudo.assinaturaNome?.trim() || undefined,
        assinaturaCargo: oficioBase.conteudo.assinaturaCargo?.trim() || undefined,
        rodape: ""
      },
      protocolo: {
        ...oficioBase.protocolo,
        status: oficioBase.protocolo.status.trim(),
        protocoloEnvio: oficioBase.protocolo.protocoloEnvio?.trim() || undefined,
        dataEnvio: oficioBase.protocolo.dataEnvio?.trim() || undefined,
        protocoloRecebimento: oficioBase.protocolo.protocoloRecebimento?.trim() || undefined,
        dataRecebimento: oficioBase.protocolo.dataRecebimento?.trim() || undefined,
        proximoDestino: oficioBase.protocolo.proximoDestino?.trim() || undefined,
        observacoes: oficioBase.protocolo.observacoes?.trim() || undefined
      },
      tramites: (oficioBase.tramites ?? [])
        .map((item) => ({
          ...item,
          data: item.data?.trim() || undefined,
          origem: item.origem?.trim() || undefined,
          destino: item.destino?.trim() || undefined,
          responsavel: item.responsavel?.trim() || undefined,
          acao: item.acao.trim(),
          observacoes: item.observacoes?.trim() || undefined
        }))
        .filter((item) => item.acao.length >= 2)
    };
  }

  function montarPayloadRascunhoLote(importacao: OficioImportacaoResultado): OficioPayload {
    const importacaoEfetiva = montarImportacaoComPreenchimentoLote(importacao);
    const assinaturaPadraoProfissional = encontrarProfissionalPorNome(profissionais, responsavelLogado);
    const assinaturaPadraoNome =
      form.conteudo.assinaturaNome?.trim() || assinaturaPadraoProfissional?.nome_completo || "";
    const assinaturaPadraoCargo =
      form.conteudo.assinaturaCargo?.trim() || extrairCargoProfissional(assinaturaPadraoProfissional) || "";
    const base = criarFormularioVazio(responsavelLogado);

    return {
      ...base,
      identificacao: {
        ...base.identificacao,
        tipo: "emissao",
        data: importacaoEfetiva.conteudo.identificacao.data || obterHojeIso(),
        setorOrigem: preenchimentoLotePadrao.setorOrigem.trim(),
        responsavel: (form.identificacao.responsavel || responsavelLogado).trim(),
        destinatario: importacaoEfetiva.conteudo.identificacao.destinatario || "",
        destinatarioResponsavel: importacaoEfetiva.conteudo.identificacao.destinatarioResponsavel || "",
        destinatarioCargo: importacaoEfetiva.conteudo.identificacao.destinatarioCargo || "",
        meioEnvio: form.identificacao.meioEnvio || base.identificacao.meioEnvio,
        prazoResposta: form.identificacao.prazoResposta || "",
        classificacao: form.identificacao.classificacao || ""
      },
      conteudo: {
        ...base.conteudo,
        razaoSocial: importacaoEfetiva.conteudo.conteudo.razaoSocial || "",
        saudacao: importacaoEfetiva.conteudo.conteudo.saudacao || "",
        para: importacaoEfetiva.conteudo.conteudo.para || "",
        cargoPara: importacaoEfetiva.conteudo.conteudo.cargoPara || "",
        assunto: importacaoEfetiva.conteudo.conteudo.assunto || "",
        corpo: importacaoEfetiva.conteudo.conteudo.corpo || "",
        finalizacao:
          importacaoEfetiva.conteudo.conteudo.finalizacao || form.conteudo.finalizacao || finalizacaoPadrao,
        assinaturaNome: importacaoEfetiva.conteudo.conteudo.assinaturaNome || assinaturaPadraoNome,
        assinaturaCargo: importacaoEfetiva.conteudo.conteudo.assinaturaCargo || assinaturaPadraoCargo,
        rodape: ""
      },
      protocolo: {
        ...base.protocolo,
        status: "Rascunho"
      },
      unidadeId: form.unidadeId ?? null,
      criadoPor: Number(usuario?.id) || form.criadoPor || undefined
    };
  }

  function aplicarImportacaoAoFormulario(importacao: OficioImportacaoResultado, usarPreenchimentoLote = false) {
    const importacaoEfetiva = usarPreenchimentoLote ? montarImportacaoComPreenchimentoLote(importacao) : importacao;
    const assinaturaImportadaNome = importacaoEfetiva.conteudo.conteudo.assinaturaNome?.trim() ?? "";
    const assinaturaImportadaProfissional = assinaturaImportadaNome
      ? encontrarProfissionalPorNome(profissionais, assinaturaImportadaNome)
      : undefined;
    const assinaturaImportadaCargo =
      importacaoEfetiva.conteudo.conteudo.assinaturaCargo?.trim() ||
      extrairCargoProfissional(assinaturaImportadaProfissional) ||
      "";

    setForm((atual) => ({
      ...atual,
      identificacao: {
        ...atual.identificacao,
        data: importacaoEfetiva.conteudo.identificacao.data || atual.identificacao.data,
        setorOrigem:
          atual.identificacao.setorOrigem ||
          (usarPreenchimentoLote ? preenchimentoLotePadrao.setorOrigem.trim() : setorOrigemImportacaoPadrao),
        destinatario:
          importacaoEfetiva.conteudo.identificacao.destinatario ||
          importacaoEfetiva.conteudo.conteudo.razaoSocial ||
          atual.identificacao.destinatario,
        destinatarioResponsavel:
          importacaoEfetiva.conteudo.identificacao.destinatarioResponsavel ||
          importacaoEfetiva.conteudo.conteudo.para ||
          atual.identificacao.destinatarioResponsavel,
        destinatarioCargo:
          importacaoEfetiva.conteudo.identificacao.destinatarioCargo ||
          importacaoEfetiva.conteudo.conteudo.cargoPara ||
          atual.identificacao.destinatarioCargo
      },
      conteudo: {
        ...atual.conteudo,
        razaoSocial: importacaoEfetiva.conteudo.conteudo.razaoSocial || atual.conteudo.razaoSocial,
        saudacao: importacaoEfetiva.conteudo.conteudo.saudacao || atual.conteudo.saudacao,
        para: importacaoEfetiva.conteudo.conteudo.para || atual.conteudo.para,
        cargoPara: importacaoEfetiva.conteudo.conteudo.cargoPara || atual.conteudo.cargoPara,
        assunto: importacaoEfetiva.conteudo.conteudo.assunto || atual.conteudo.assunto,
        corpo: importacaoEfetiva.conteudo.conteudo.corpo || atual.conteudo.corpo,
        finalizacao: importacaoEfetiva.conteudo.conteudo.finalizacao || atual.conteudo.finalizacao,
        assinaturaNome: assinaturaImportadaNome || atual.conteudo.assinaturaNome,
        assinaturaCargo: assinaturaImportadaNome
          ? assinaturaImportadaCargo
          : importacaoEfetiva.conteudo.conteudo.assinaturaCargo || atual.conteudo.assinaturaCargo
      },
      protocolo: {
        ...atual.protocolo,
        observacoes: importacaoEfetiva.conteudo.protocolo.observacoes || atual.protocolo.observacoes
      }
    }));

    if (importacaoEfetiva.conteudo.conteudo.razaoSocial) {
      atualizarErroCampo("razaoSocial", importacaoEfetiva.conteudo.conteudo.razaoSocial);
    }
    if (usarPreenchimentoLote && preenchimentoLotePadrao.setorOrigem.trim()) {
      atualizarErroCampo("setorOrigem", preenchimentoLotePadrao.setorOrigem);
    }
    if (!usarPreenchimentoLote && setorOrigemImportacaoPadrao.trim()) {
      atualizarErroCampo("setorOrigem", setorOrigemImportacaoPadrao);
    }
    if (importacaoEfetiva.conteudo.conteudo.assunto) {
      atualizarErroCampo("assunto", importacaoEfetiva.conteudo.conteudo.assunto);
    }
    if (importacaoEfetiva.conteudo.conteudo.corpo) {
      atualizarErroCampo("corpo", importacaoEfetiva.conteudo.conteudo.corpo);
    }

    const referencias = [
      importacaoEfetiva.referencia.numeroOficio ? `Número identificado: ${importacaoEfetiva.referencia.numeroOficio}` : "",
      importacaoEfetiva.referencia.cidadeUf ? `Cidade/UF identificada: ${importacaoEfetiva.referencia.cidadeUf}` : ""
    ].filter(Boolean);

    const mensagens = [
      `${importacaoEfetiva.nomeArquivo} foi lido e os campos do ofício foram preenchidos.`,
      referencias.length ? referencias.join(" | ") : "",
      importacaoEfetiva.avisos.length ? `Atenção: ${importacaoEfetiva.avisos.join(" | ")}` : "",
      usarPreenchimentoLote && preenchimentoLotePadrao.setorOrigem.trim()
        ? `Sala aplicada ao lote: ${preenchimentoLotePadrao.setorOrigem}.`
        : !usarPreenchimentoLote && setorOrigemImportacaoPadrao.trim()
          ? `Sala padrão aplicada: ${setorOrigemImportacaoPadrao}.`
        : ""
    ].filter(Boolean);

    setUltimaImportacao(importacaoEfetiva);
    setPopupMensagem({
      tipo: importacaoEfetiva.avisos.length ? "aviso" : "sucesso",
      titulo: importacaoEfetiva.avisos.length ? "Importação concluída com revisão" : "Importação concluída",
      texto: mensagens.join(" ")
    });
  }

  async function importarArquivoOficio(arquivo?: File | null) {
    if (!arquivo) {
      return;
    }

    try {
      const importacao = await importarConteudoMutation.mutateAsync(arquivo);
      aplicarImportacaoAoFormulario(importacao);
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível ler o arquivo enviado."
      });
    } finally {
      if (importacaoArquivoRef.current) {
        importacaoArquivoRef.current.value = "";
      }
    }
  }

  async function importarArquivosOficioLote(listaArquivos?: FileList | File[] | null) {
    const arquivosSelecionados = Array.from(listaArquivos ?? []);
    if (!arquivosSelecionados.length) {
      return;
    }

    const excedeuLimite = arquivosSelecionados.length > LIMITE_IMPORTACAO_LOTE;
    const arquivos = arquivosSelecionados.slice(0, LIMITE_IMPORTACAO_LOTE);
    const resultados: ImportacaoLoteItem[] = [];

    setPreenchimentoLotePadrao((atual) => ({
      ...atual,
      setorOrigem: atual.setorOrigem || form.identificacao.setorOrigem || setorOrigemImportacaoPadrao
    }));

    setProgressoImportacaoLote({
      atual: 0,
      total: arquivos.length,
      arquivo: arquivos[0]?.name ?? ""
    });

    try {
      for (let index = 0; index < arquivos.length; index += 1) {
        const arquivo = arquivos[index];
        setProgressoImportacaoLote({
          atual: index + 1,
          total: arquivos.length,
          arquivo: arquivo.name
        });

        try {
          const importacao = await oficiosService.importarConteudoArquivo(arquivo);
          resultados.push({
            id: `${arquivo.name}-${arquivo.size}-${arquivo.lastModified}-${index}`,
            nomeArquivo: arquivo.name,
            status: "sucesso",
            importacao
          });
        } catch (error: any) {
          resultados.push({
            id: `${arquivo.name}-${arquivo.size}-${arquivo.lastModified}-${index}`,
            nomeArquivo: arquivo.name,
            status: "erro",
            erro: error?.response?.data?.message ?? "Não foi possível ler o arquivo enviado."
          });
        }
      }

      setImportacoesLote(resultados);

      const totalSucesso = resultados.filter((item) => item.status === "sucesso").length;
      const totalErro = resultados.length - totalSucesso;
      const mensagens = [
        excedeuLimite
          ? `O lote aceita até ${LIMITE_IMPORTACAO_LOTE} arquivos por vez. Foram processados os ${arquivos.length} primeiros.`
          : "",
        totalSucesso
          ? `${totalSucesso} arquivo(s) ficaram prontos para aplicação no formulário atual.`
          : "Nenhum arquivo do lote pôde ser aproveitado automaticamente.",
        totalErro ? `${totalErro} arquivo(s) precisam de revisão manual.` : "",
        totalSucesso ? "Escolha um item da lista abaixo para aplicar ao ofício." : ""
      ].filter(Boolean);

      setPopupMensagem({
        tipo: totalErro ? "aviso" : "sucesso",
        titulo: "Lote processado",
        texto: mensagens.join(" ")
      });
    } finally {
      setProgressoImportacaoLote(null);
      if (importacaoLoteArquivoRef.current) {
        importacaoLoteArquivoRef.current.value = "";
      }
    }
  }

  async function criarRascunhosAutomaticamenteDoLote() {
    if (!itensLotePendentes.length) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Lote",
        texto: "Importe um lote com arquivos válidos antes de criar os rascunhos."
      });
      return;
    }

    const pendenciasCriticas = [];
    if (resumoPendenciasLote.semSala > 0) {
      pendenciasCriticas.push("defina a sala de atendimento para o lote");
    }
    if (resumoPendenciasLote.semDestinatario > 0) {
      pendenciasCriticas.push("informe o destinatário padrão para os itens sem identificação");
    }
    if (resumoPendenciasLote.semAssunto > 0) {
      pendenciasCriticas.push("revise os itens que ainda estão sem assunto");
    }
    if (resumoPendenciasLote.semCorpo > 0) {
      pendenciasCriticas.push("revise os itens que ainda estão sem corpo");
    }

    if (pendenciasCriticas.length) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Preenchimento do lote",
        texto: `Antes de criar os rascunhos, ${pendenciasCriticas.join("; ")}.`
      });
      return;
    }

    let criados = 0;
    let falhas = 0;
    const atualizados = [...importacoesLote];

    setProgressoCriacaoLote({
      atual: 0,
      total: itensLotePendentes.length,
      arquivo: itensLotePendentes[0]?.nomeArquivo ?? ""
    });

    try {
      for (let index = 0; index < itensLotePendentes.length; index += 1) {
        const item = itensLotePendentes[index];
        setProgressoCriacaoLote({
          atual: index + 1,
          total: itensLotePendentes.length,
          arquivo: item.nomeArquivo
        });

        try {
          const payload = montarPayloadPersistencia(montarPayloadRascunhoLote(item.importacao));
          const response = await oficiosService.criar(payload);
          const indice = atualizados.findIndex((atual) => atual.id === item.id);
          if (indice >= 0) {
            atualizados[indice] = {
              ...atualizados[indice],
              status: "rascunho_criado",
              oficioId: response.id,
              numeroGerado: response.identificacao.numero
            };
          }
          criados += 1;
        } catch (error: any) {
          const indice = atualizados.findIndex((atual) => atual.id === item.id);
          if (indice >= 0) {
            atualizados[indice] = {
              ...atualizados[indice],
              status: "erro",
              erro: error?.response?.data?.message ?? "Não foi possível criar o rascunho automaticamente."
            };
          }
          falhas += 1;
        }
      }

      setImportacoesLote(atualizados);
      await queryClient.invalidateQueries({ queryKey: ["oficios"] });

      setPopupMensagem({
        tipo: falhas ? "aviso" : "sucesso",
        titulo: "Rascunhos criados",
        texto: [
          criados ? `${criados} rascunho(s) foram criados automaticamente a partir do lote.` : "",
          falhas ? `${falhas} arquivo(s) não puderam ser convertidos em rascunho.` : "",
          criados ? "Os itens criados continuam identificados na lista para conferência." : ""
        ]
          .filter(Boolean)
          .join(" ")
      });
    } finally {
      setProgressoCriacaoLote(null);
    }
  }

  function selecionarAssinatura(nome: string) {
    if (!nome) {
      setForm((atual) => ({
        ...atual,
        conteudo: { ...atual.conteudo, assinaturaNome: "", assinaturaCargo: "" }
      }));
      return;
    }

    const profissional = encontrarProfissionalPorNome(profissionais, nome);
    const cargo = extrairCargoProfissional(profissional);

    setForm((atual) => ({
      ...atual,
      conteudo: {
        ...atual.conteudo,
        assinaturaNome: nome,
        assinaturaCargo: cargo || atual.conteudo.assinaturaCargo || ""
      }
    }));
  }

  async function abrirPdfOficio(id?: string) {
    if (!id) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Salve o ofício antes de gerar o PDF institucional."
      });
      return;
    }

    try {
      setImprimindo(true);
      const blob = await oficiosService.obterDocumentoPdf(id);
      abrirRelatorioPdf(blob);
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? error?.message ?? "Não foi possível gerar o PDF do ofício."
      });
    } finally {
      setImprimindo(false);
    }
  }

  function imprimir() {
    void abrirPdfOficio(form.id);
  }

  function fechar() {
    navigate("/dashboard/visao-geral");
  }

  const carregandoAcoes = salvarMutation.isPending || excluirMutation.isPending || imprimindo;
  const assinaturaSelecionada = encontrarProfissionalPorNome(profissionais, form.conteudo.assinaturaNome);

  const acoes: AdminAction[] = [
    { label: "Buscar", icon: Search, onClick: buscar, variant: "outline" },
    { label: "Novo", icon: Plus, onClick: novo, variant: "default", disabled: carregandoAcoes },
    {
      label: salvarMutation.isPending ? "Salvando..." : "Salvar",
      icon: Save,
      onClick: () => void salvar(),
      variant: "default",
      disabled: carregandoAcoes
    },
    { label: "Cancelar", icon: Undo2, onClick: cancelar, variant: "outline", disabled: carregandoAcoes },
    { label: "Excluir", icon: Trash2, onClick: excluir, variant: "danger", disabled: carregandoAcoes },
    {
      label: imprimindo ? "Gerando PDF..." : "Imprimir",
      icon: Printer,
      onClick: imprimir,
      variant: "outline",
      disabled: carregandoAcoes
    },
    { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
  ];

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        sectionLabel="Setor administrativo"
        pageTitle={tituloTela}
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={form.identificacao.numero ? `Número ${form.identificacao.numero}` : "Novo ofício"}
      >
        {abaAtiva === "dashboard" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Card className="border-emerald-200 bg-[linear-gradient(180deg,#f5fff7_0%,#def7e6_100%)] shadow-[0_18px_40px_-24px_rgba(22,101,52,0.26)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold tracking-[0.02em] text-emerald-900">
                    Ofícios registrados
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-center">
                  <p className="text-3xl font-black text-emerald-950">{dashboard.total}</p>
                  <p className="text-xs text-emerald-800/80">Base total de ofícios e protocolos.</p>
                </CardContent>
              </Card>

              <Card className="border-emerald-200 bg-[linear-gradient(180deg,#f5fff7_0%,#def7e6_100%)] shadow-[0_18px_40px_-24px_rgba(22,101,52,0.26)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold tracking-[0.02em] text-emerald-900">
                    Em elaboração
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-center">
                  <p className="text-3xl font-black text-emerald-950">{dashboard.rascunhos + dashboard.emPreparacao}</p>
                  <p className="text-xs text-emerald-800/80">Rascunhos e documentos em preparação.</p>
                </CardContent>
              </Card>

              <Card className="border-emerald-200 bg-[linear-gradient(180deg,#f5fff7_0%,#def7e6_100%)] shadow-[0_18px_40px_-24px_rgba(22,101,52,0.26)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold tracking-[0.02em] text-emerald-900">
                    Em análise
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-center">
                  <p className="text-3xl font-black text-emerald-950">{dashboard.emAnalise}</p>
                  <p className="text-xs text-emerald-800/80">Itens aguardando retorno ou validação.</p>
                </CardContent>
              </Card>

              <Card className="border-emerald-200 bg-[linear-gradient(180deg,#f5fff7_0%,#def7e6_100%)] shadow-[0_18px_40px_-24px_rgba(22,101,52,0.26)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold tracking-[0.02em] text-emerald-900">
                    Sem protocolo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-center">
                  <p className="text-3xl font-black text-emerald-950">{dashboard.semProtocolo}</p>
                  <p className="text-xs text-emerald-800/80">Ofícios que ainda não receberam registro formal.</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-3 xl:grid-cols-[1.3fr_1fr]">
              <Card className="border-emerald-200 bg-[linear-gradient(180deg,#f8fffa_0%,#edf9f0_100%)] shadow-[0_18px_40px_-24px_rgba(22,101,52,0.16)]">
                <CardHeader>
                  <CardTitle>Fluxo recomendado</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                  <article className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/45 p-3">
                    <p className="text-xs font-semibold tracking-[0.02em] text-[var(--g3-active)]">1. Identificação</p>
                    <p className="mt-2 text-sm text-[var(--g3-foreground)]">
                      Número sequencial automático, origem por sala de atendimento e responsável pelo usuário logado.
                    </p>
                  </article>
                  <article className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/45 p-3">
                    <p className="text-xs font-semibold tracking-[0.02em] text-[var(--g3-active)]">2. Redação</p>
                    <p className="mt-2 text-sm text-[var(--g3-foreground)]">
                      Destinatário claro, corpo reaproveitável e assinatura vinculada ao profissional cadastrado.
                    </p>
                  </article>
                  <article className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/45 p-3">
                    <p className="text-xs font-semibold tracking-[0.02em] text-[var(--g3-active)]">3. Protocolo</p>
                    <p className="mt-2 text-sm text-[var(--g3-foreground)]">
                      Registro rápido de envio e recebimento, trilha de tramitação e PDF institucional.
                    </p>
                  </article>
                </CardContent>
              </Card>

              <Card className="border-emerald-200 bg-[linear-gradient(180deg,#f8fffa_0%,#edf9f0_100%)] shadow-[0_18px_40px_-24px_rgba(22,101,52,0.16)]">
                <CardHeader>
                  <CardTitle>Resumo operacional</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-[var(--g3-border)] px-3 py-2">
                    <span className="text-sm text-[var(--g3-muted)]">Enviados</span>
                    <strong className="text-sm text-[var(--g3-foreground)]">{dashboard.enviados}</strong>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-[var(--g3-border)] px-3 py-2">
                    <span className="text-sm text-[var(--g3-muted)]">Recebidos</span>
                    <strong className="text-sm text-[var(--g3-foreground)]">{dashboard.recebidos}</strong>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-[var(--g3-border)] px-3 py-2">
                    <span className="text-sm text-[var(--g3-muted)]">Arquivados</span>
                    <strong className="text-sm text-[var(--g3-foreground)]">{dashboard.arquivados}</strong>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        ) : null}

        {abaAtiva === "identificacao" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <article className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 shadow-[0_14px_30px_-24px_rgba(22,101,52,0.28)]">
                <p className="text-[11px] font-semibold tracking-[0.12em] text-emerald-700">Número do ofício</p>
                <p className="mt-2 text-lg font-bold text-emerald-950">
                  {form.identificacao.numero || (carregandoNumero ? "Gerando..." : "Aguardando data")}
                </p>
                <p className="mt-1 text-xs text-emerald-900/70">Sequência controlada automaticamente pelo sistema.</p>
              </article>

              <article className="rounded-xl border border-sky-200 bg-sky-50/80 p-3 shadow-[0_14px_30px_-24px_rgba(3,105,161,0.22)]">
                <p className="text-[11px] font-semibold tracking-[0.12em] text-sky-700">Setor de origem</p>
                <p className="mt-2 text-sm font-semibold text-sky-950">
                  {form.identificacao.setorOrigem || "Selecione uma sala de atendimento"}
                </p>
                <p className="mt-1 text-xs text-sky-900/70">Lista integrada ao cadastro de unidade assistencial.</p>
              </article>

              <article className="rounded-xl border border-violet-200 bg-violet-50/80 p-3 shadow-[0_14px_30px_-24px_rgba(109,40,217,0.18)]">
                <p className="text-[11px] font-semibold tracking-[0.12em] text-violet-700">Responsável atual</p>
                <p className="mt-2 text-sm font-semibold text-violet-950">
                  {form.identificacao.responsavel || "Usuário não identificado"}
                </p>
                <p className="mt-1 text-xs text-violet-900/70">Preenchimento automático com o usuário autenticado.</p>
              </article>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="oficio-tipo">Tipo</Label>
                <Select
                  id="oficio-tipo"
                  value={form.identificacao.tipo}
                  onChange={(event) =>
                    atualizarIdentificacao("tipo", event.target.value as "emissao" | "recebimento")
                  }
                >
                  <option value="emissao">Emissão</option>
                  <option value="recebimento">Recebimento</option>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="oficio-numero">Número</Label>
                <Input
                  id="oficio-numero"
                  value={form.identificacao.numero}
                  readOnly
                  className="bg-slate-50"
                  placeholder={carregandoNumero ? "Gerando..." : "Automático"}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="oficio-data">Data</Label>
                <Input
                  id="oficio-data"
                  type="date"
                  value={form.identificacao.data}
                  onChange={(event) => atualizarIdentificacao("data", event.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="oficio-meio-envio">Meio de envio</Label>
                <Select
                  id="oficio-meio-envio"
                  value={form.identificacao.meioEnvio}
                  onChange={(event) => atualizarIdentificacao("meioEnvio", event.target.value)}
                >
                  {meiosEnvio.map((meio) => (
                    <option key={meio} value={meio}>
                      {meio}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1 xl:col-span-2">
                <Label htmlFor="oficio-setor-origem">Setor de origem</Label>
                <Select
                  id="oficio-setor-origem"
                  value={form.identificacao.setorOrigem}
                  className={erros.setorOrigem ? "border-rose-400 focus:ring-rose-400" : undefined}
                  onChange={(event) => {
                    atualizarIdentificacao("setorOrigem", event.target.value);
                    atualizarErroCampo("setorOrigem", event.target.value);
                  }}
                  onBlur={() => atualizarErroCampo("setorOrigem", form.identificacao.setorOrigem)}
                  disabled={carregandoSalas}
                >
                  <option value="">{carregandoSalas ? "Carregando salas..." : "Selecione uma sala"}</option>
                  {salas.map((sala) => (
                    <option key={sala.id_sala} value={montarValorSala(sala)}>
                      {montarRotuloSala(sala)}
                    </option>
                  ))}
                </Select>
                {erros.setorOrigem ? (
                  <p className="text-xs text-rose-700">{erros.setorOrigem}</p>
                ) : (
                  <p className="text-xs text-[var(--g3-muted)]">
                    A origem acompanha as salas configuradas em unidade assistencial.
                  </p>
                )}
              </div>

              <div className="space-y-1 xl:col-span-2">
                <Label htmlFor="oficio-responsavel">Responsável</Label>
                <Input
                  id="oficio-responsavel"
                  value={form.identificacao.responsavel}
                  readOnly
                  className={erros.responsavel ? "border-rose-400 focus:ring-rose-400 bg-slate-50" : "bg-slate-50"}
                />
                {erros.responsavel ? (
                  <p className="text-xs text-rose-700">{erros.responsavel}</p>
                ) : (
                  <p className="text-xs text-[var(--g3-muted)]">
                    O nome do usuário logado é aplicado automaticamente neste campo.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="oficio-prazo">Prazo de resposta</Label>
                <Input
                  id="oficio-prazo"
                  value={form.identificacao.prazoResposta ?? ""}
                  placeholder="Ex.: 10 dias"
                  onChange={(event) => atualizarIdentificacao("prazoResposta", event.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="oficio-classificacao">Classificação</Label>
                <Input
                  id="oficio-classificacao"
                  value={form.identificacao.classificacao ?? ""}
                  placeholder="Ex.: Interno, externo, urgente"
                  onChange={(event) => atualizarIdentificacao("classificacao", event.target.value)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-[var(--g3-border)] p-3">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--g3-foreground)]">Protocolo e acompanhamento</h3>
                  <p className="text-xs text-[var(--g3-muted)]">
                    Registre envio, recebimento e próximo destino com um clique.
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${classeStatus(form.protocolo.status)}`}
                >
                  {formatarStatus(form.protocolo.status)}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1">
                  <Label htmlFor="oficio-status">Status</Label>
                  <Select
                    id="oficio-status"
                    value={form.protocolo.status}
                    onChange={(event) => atualizarProtocolo("status", event.target.value)}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {formatarStatus(status)}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="oficio-protocolo-envio">Protocolo de envio</Label>
                  <Input
                    id="oficio-protocolo-envio"
                    value={form.protocolo.protocoloEnvio ?? ""}
                    placeholder="Gerado automaticamente"
                    onChange={(event) => atualizarProtocolo("protocoloEnvio", event.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="oficio-data-envio">Data de envio</Label>
                  <Input
                    id="oficio-data-envio"
                    type="date"
                    value={form.protocolo.dataEnvio ?? ""}
                    onChange={(event) => atualizarProtocolo("dataEnvio", event.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="oficio-protocolo-recebimento">Protocolo de recebimento</Label>
                  <Input
                    id="oficio-protocolo-recebimento"
                    value={form.protocolo.protocoloRecebimento ?? ""}
                    placeholder="Gerado automaticamente"
                    onChange={(event) => atualizarProtocolo("protocoloRecebimento", event.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="oficio-data-recebimento">Data de recebimento</Label>
                  <Input
                    id="oficio-data-recebimento"
                    type="date"
                    value={form.protocolo.dataRecebimento ?? ""}
                    onChange={(event) => atualizarProtocolo("dataRecebimento", event.target.value)}
                  />
                </div>

                <div className="space-y-1 xl:col-span-2">
                  <Label htmlFor="oficio-proximo-destino">Próximo destino</Label>
                  <Input
                    id="oficio-proximo-destino"
                    value={form.protocolo.proximoDestino ?? ""}
                    placeholder="Ex.: Diretoria, secretaria, destinatário externo"
                    onChange={(event) => atualizarProtocolo("proximoDestino", event.target.value)}
                  />
                </div>

                <div className="space-y-1 xl:col-span-4">
                  <Label htmlFor="oficio-observacoes-protocolo">Observações</Label>
                  <Textarea
                    id="oficio-observacoes-protocolo"
                    rows={3}
                    value={form.protocolo.observacoes ?? ""}
                    placeholder="Pendências, orientações de envio ou histórico complementar"
                    onChange={(event) => atualizarProtocolo("observacoes", event.target.value)}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" onClick={registrarEnvio}>
                  Registrar envio
                </Button>
                <Button variant="outline" onClick={registrarRecebimento}>
                  Registrar recebimento
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        {abaAtiva === "conteudo" ? (
          <section className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="oficio-importacao-arquivo">Enviar arquivo do ofício</Label>
              <div className="rounded-xl border border-[var(--g3-border)] p-3">
                <input
                  ref={importacaoArquivoRef}
                  id="oficio-importacao-arquivo"
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(event) => void importarArquivoOficio(event.target.files?.[0] ?? null)}
                />
                <input
                  ref={importacaoLoteArquivoRef}
                  id="oficio-importacao-lote-arquivo"
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  multiple
                  className="hidden"
                  onChange={(event) => void importarArquivosOficioLote(event.target.files)}
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => importacaoArquivoRef.current?.click()}
                    disabled={importarConteudoMutation.isPending || importandoLote}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    {importarConteudoMutation.isPending ? "Lendo arquivo..." : "Enviar Word/PDF"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => importacaoLoteArquivoRef.current?.click()}
                    disabled={importarConteudoMutation.isPending || importandoLote}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    {importandoLote && progressoImportacaoLote
                      ? `Processando lote ${progressoImportacaoLote.atual}/${progressoImportacaoLote.total}`
                      : "Enviar lote"}
                  </Button>
                  <p className="text-xs text-[var(--g3-muted)]">
                    Arquivo único: preenche o formulário atual. Lote: aceita até {LIMITE_IMPORTACAO_LOTE} arquivos por vez
                    para conferência e aplicação individual.
                  </p>
                </div>
                {importandoLote && progressoImportacaoLote ? (
                  <p className="mt-2 text-xs text-[var(--g3-active)]">
                    Lendo {progressoImportacaoLote.arquivo} ({progressoImportacaoLote.atual} de{" "}
                    {progressoImportacaoLote.total}).
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-[var(--g3-muted)]">
                    Prefira .docx ou PDF com texto selecionável. A sala entra como {SALA_PADRAO_IMPORTACAO} e pode ser
                    alterada depois. Arquivos escaneados podem exigir revisão após o OCR.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="oficio-para">Para</Label>
                <Input
                  id="oficio-para"
                  value={form.conteudo.razaoSocial}
                  className={erros.razaoSocial ? "border-rose-400 focus:ring-rose-400" : undefined}
                  placeholder="Nome da instituição, órgão ou pessoa destinatária"
                  onChange={(event) => {
                    atualizarConteudo("razaoSocial", event.target.value);
                    atualizarErroCampo("razaoSocial", event.target.value);
                  }}
                  onBlur={() => atualizarErroCampo("razaoSocial", form.conteudo.razaoSocial)}
                />
                {erros.razaoSocial ? (
                  <p className="text-xs text-rose-700">{erros.razaoSocial}</p>
                ) : (
                  <p className="text-xs text-[var(--g3-muted)]">
                    Este campo substitui a antiga identificação de razão social na redação.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="oficio-aos-cuidados">Aos cuidados de</Label>
                <Input
                  id="oficio-aos-cuidados"
                  value={form.conteudo.para ?? ""}
                  placeholder="Nome da pessoa responsável no destino"
                  onChange={(event) => atualizarConteudo("para", event.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="oficio-cargo-destinatario">Cargo do destinatário</Label>
                <Input
                  id="oficio-cargo-destinatario"
                  value={form.conteudo.cargoPara ?? ""}
                  placeholder="Cargo ou função do destinatário"
                  onChange={(event) => atualizarConteudo("cargoPara", event.target.value)}
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="oficio-assunto">Assunto</Label>
                <Input
                  id="oficio-assunto"
                  value={form.conteudo.assunto}
                  className={erros.assunto ? "border-rose-400 focus:ring-rose-400" : undefined}
                  placeholder="Resumo objetivo do tema do ofício"
                  onChange={(event) => {
                    atualizarConteudo("assunto", event.target.value);
                    atualizarErroCampo("assunto", event.target.value);
                  }}
                  onBlur={() => atualizarErroCampo("assunto", form.conteudo.assunto)}
                />
                {erros.assunto ? <p className="text-xs text-rose-700">{erros.assunto}</p> : null}
              </div>

              {ultimaImportacao ? (
                <div className="space-y-2 md:col-span-2">
                  <Label>Conferência da última importação</Label>
                  <div className="rounded-xl border border-emerald-200 bg-[linear-gradient(180deg,#f6fff8_0%,#ecf9f0_100%)] p-3">
                    <div className="flex flex-col gap-3 border-b border-emerald-100 pb-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-emerald-950">{ultimaImportacao.nomeArquivo}</p>
                        <p className="text-xs text-emerald-800">
                          O sistema aplicou o conteúdo ao formulário atual. Revise os campos abaixo antes de salvar ou enviar.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setPreviaAberta(true)}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          Visualizar prévia
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setUltimaImportacao(null)}>
                          Ocultar conferência
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-lg border border-emerald-100 bg-white/80 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                          Número identificado
                        </p>
                        <p className="mt-1 text-sm text-slate-800">
                          {ultimaImportacao.referencia.numeroOficio || "Não identificado"}
                        </p>
                      </div>

                      <div className="rounded-lg border border-emerald-100 bg-white/80 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">Cidade/UF</p>
                        <p className="mt-1 text-sm text-slate-800">
                          {ultimaImportacao.referencia.cidadeUf || "Não identificada"}
                        </p>
                      </div>

                      <div className="rounded-lg border border-emerald-100 bg-white/80 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                          Destinatário
                        </p>
                        <p className="mt-1 text-sm text-slate-800">
                          {resumirTextoImportado(
                            ultimaImportacao.conteudo.identificacao.destinatario ||
                              ultimaImportacao.conteudo.conteudo.razaoSocial
                          )}
                        </p>
                      </div>

                      <div className="rounded-lg border border-emerald-100 bg-white/80 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                          Aos cuidados de
                        </p>
                        <p className="mt-1 text-sm text-slate-800">
                          {resumirTextoImportado(
                            ultimaImportacao.conteudo.identificacao.destinatarioResponsavel ||
                              ultimaImportacao.conteudo.conteudo.para
                          )}
                        </p>
                      </div>

                      <div className="rounded-lg border border-emerald-100 bg-white/80 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">Assunto</p>
                        <p className="mt-1 text-sm text-slate-800">
                          {resumirTextoImportado(ultimaImportacao.conteudo.conteudo.assunto)}
                        </p>
                      </div>

                      <div className="rounded-lg border border-emerald-100 bg-white/80 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                          Assinatura
                        </p>
                        <p className="mt-1 text-sm text-slate-800">
                          {resumirTextoImportado(
                            [
                              ultimaImportacao.conteudo.conteudo.assinaturaNome,
                              ultimaImportacao.conteudo.conteudo.assinaturaCargo
                            ]
                              .filter(Boolean)
                              .join(" | ")
                          )}
                        </p>
                      </div>
                    </div>

                    {ultimaImportacao.avisos.length ? (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                        <p className="text-xs font-semibold text-amber-900">Pontos para revisar</p>
                        <ul className="mt-1 space-y-1 text-xs text-amber-900">
                          {ultimaImportacao.avisos.map((aviso) => (
                            <li key={aviso}>- {aviso}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-emerald-800">
                        Importação concluída sem alertas. Ainda assim, vale conferir a redação e a assinatura antes de salvar.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}

              {importacoesLote.length ? (
                <div className="space-y-2 md:col-span-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <Label>Lote importado para conferência</Label>
                      <p className="text-xs text-[var(--g3-muted)]">
                        Defina os dados comuns do lote e depois crie vários rascunhos automaticamente ou aplique um item
                        específico no formulário atual.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setImportacoesLote([]);
                        setPreenchimentoLotePadrao(criarPreenchimentoLotePadrao());
                      }}
                    >
                      Limpar lote
                    </Button>
                  </div>

                  <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-[var(--g3-foreground)]">Preenchimento em lote</p>
                        <p className="text-xs text-[var(--g3-muted)]">
                          Esses campos entram automaticamente nos itens do lote apenas quando a importação não conseguir
                          identificar o valor.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void criarRascunhosAutomaticamenteDoLote()}
                        disabled={criandoRascunhosLote || importandoLote || !itensLotePendentes.length}
                      >
                        {criandoRascunhosLote && progressoCriacaoLote
                          ? `Criando rascunhos ${progressoCriacaoLote.atual}/${progressoCriacaoLote.total}`
                          : "Criar rascunhos automaticamente"}
                      </Button>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="space-y-1">
                        <Label htmlFor="oficio-lote-setor-origem">Sala de origem do lote</Label>
                        <Select
                          id="oficio-lote-setor-origem"
                          value={preenchimentoLotePadrao.setorOrigem}
                          onChange={(event) => atualizarPreenchimentoLote("setorOrigem", event.target.value)}
                        >
                          <option value="">Selecione uma sala para o lote</option>
                          {salas.map((sala) => (
                            <option key={`${sala.unidade_nome || "sem-unidade"}-${sala.id_sala}`} value={montarValorSala(sala)}>
                              {montarRotuloSala(sala)}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="oficio-lote-destinatario">Destinatário padrão</Label>
                        <Input
                          id="oficio-lote-destinatario"
                          value={preenchimentoLotePadrao.razaoSocial}
                          placeholder="Aplicar quando o destinatário vier vazio"
                          onChange={(event) => atualizarPreenchimentoLote("razaoSocial", event.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="oficio-lote-aos-cuidados">Aos cuidados de</Label>
                        <Input
                          id="oficio-lote-aos-cuidados"
                          value={preenchimentoLotePadrao.para}
                          placeholder="Pessoa responsável no destino"
                          onChange={(event) => atualizarPreenchimentoLote("para", event.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="oficio-lote-cargo-destinatario">Cargo do destinatário</Label>
                        <Input
                          id="oficio-lote-cargo-destinatario"
                          value={preenchimentoLotePadrao.cargoPara}
                          placeholder="Cargo padrão para itens sem identificação"
                          onChange={(event) => atualizarPreenchimentoLote("cargoPara", event.target.value)}
                        />
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                      <div className="rounded-lg border border-[var(--g3-border)] bg-white/85 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--g3-muted)]">
                          Sem sala
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--g3-foreground)]">
                          {resumoPendenciasLote.semSala}
                        </p>
                      </div>
                      <div className="rounded-lg border border-[var(--g3-border)] bg-white/85 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--g3-muted)]">
                          Sem destinatário
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--g3-foreground)]">
                          {resumoPendenciasLote.semDestinatario}
                        </p>
                      </div>
                      <div className="rounded-lg border border-[var(--g3-border)] bg-white/85 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--g3-muted)]">
                          Sem aos cuidados
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--g3-foreground)]">
                          {resumoPendenciasLote.semAosCuidados}
                        </p>
                      </div>
                      <div className="rounded-lg border border-[var(--g3-border)] bg-white/85 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--g3-muted)]">
                          Sem cargo
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--g3-foreground)]">
                          {resumoPendenciasLote.semCargo}
                        </p>
                      </div>
                      <div className="rounded-lg border border-[var(--g3-border)] bg-white/85 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--g3-muted)]">
                          Sem assunto
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--g3-foreground)]">
                          {resumoPendenciasLote.semAssunto}
                        </p>
                      </div>
                      <div className="rounded-lg border border-[var(--g3-border)] bg-white/85 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--g3-muted)]">
                          Sem corpo
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--g3-foreground)]">
                          {resumoPendenciasLote.semCorpo}
                        </p>
                      </div>
                    </div>

                    {criandoRascunhosLote && progressoCriacaoLote ? (
                      <p className="mt-3 text-xs text-[var(--g3-active)]">
                        Criando rascunho para {progressoCriacaoLote.arquivo} ({progressoCriacaoLote.atual} de{" "}
                        {progressoCriacaoLote.total}).
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    {importacoesLote.map((item, index) => (
                      <div
                        key={item.id}
                        className={`rounded-xl border p-3 ${
                          item.status === "sucesso"
                            ? "border-emerald-200 bg-[linear-gradient(180deg,#f8fffa_0%,#eefaf2_100%)]"
                            : item.status === "rascunho_criado"
                              ? "border-sky-200 bg-sky-50/80"
                            : "border-rose-200 bg-rose-50/80"
                        }`}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                              {index + 1}. {item.nomeArquivo}
                            </p>
                            <p
                              className={`text-xs font-medium ${
                                item.status === "sucesso"
                                  ? "text-emerald-800"
                                  : item.status === "rascunho_criado"
                                    ? "text-sky-800"
                                    : "text-rose-700"
                              }`}
                            >
                              {item.status === "sucesso"
                                ? "Pronto para aplicação no formulário"
                                : item.status === "rascunho_criado"
                                  ? `Rascunho criado${item.numeroGerado ? ` com número ${item.numeroGerado}` : ""}`
                                  : "Arquivo com falha na leitura automática"}
                            </p>
                          </div>

                          {item.status === "sucesso" && item.importacao ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                aplicarImportacaoAoFormulario(item.importacao as OficioImportacaoResultado, true)
                              }
                            >
                              Aplicar neste formulário
                            </Button>
                          ) : null}
                        </div>

                        {(item.status === "sucesso" || item.status === "rascunho_criado") && item.importacao ? (
                          <>
                            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                              <div className="rounded-lg border border-emerald-100 bg-white/85 p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                                  Número
                                </p>
                                <p className="mt-1 text-sm text-slate-800">
                                  {item.importacao.referencia.numeroOficio || "Não identificado"}
                                </p>
                              </div>

                              <div className="rounded-lg border border-emerald-100 bg-white/85 p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                                  Destinatário
                                </p>
                                <p className="mt-1 text-sm text-slate-800">
                                  {resumirTextoImportado(
                                    item.importacao.conteudo.identificacao.destinatario ||
                                      item.importacao.conteudo.conteudo.razaoSocial ||
                                      preenchimentoLotePadrao.razaoSocial,
                                    90
                                  )}
                                </p>
                              </div>

                              <div className="rounded-lg border border-emerald-100 bg-white/85 p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                                  Assunto
                                </p>
                                <p className="mt-1 text-sm text-slate-800">
                                  {resumirTextoImportado(item.importacao.conteudo.conteudo.assunto, 110)}
                                </p>
                              </div>

                              <div className="rounded-lg border border-emerald-100 bg-white/85 p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                                  Situação
                                </p>
                                <p className="mt-1 text-sm text-slate-800">
                                  {item.status === "rascunho_criado"
                                    ? "Rascunho já criado no sistema"
                                    : item.importacao.avisos.length
                                    ? `${item.importacao.avisos.length} ponto(s) para revisar`
                                    : "Leitura sem alertas"}
                                </p>
                              </div>
                            </div>

                            {item.importacao.avisos.length ? (
                              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                                <p className="text-xs font-semibold text-amber-900">Revisar antes de salvar</p>
                                <ul className="mt-1 space-y-1 text-xs text-amber-900">
                                  {item.importacao.avisos.map((aviso) => (
                                    <li key={`${item.id}-${aviso}`}>- {aviso}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <p className="mt-3 text-sm text-rose-800">{item.erro || "Falha ao ler este arquivo."}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="oficio-copia">Aproveitar corpo de outro ofício</Label>
                <div className="space-y-2 rounded-xl border border-[var(--g3-border)] p-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="oficio-copia"
                      value={termoBuscaCopia}
                      placeholder="Digite o número do ofício ou o assunto para localizar textos relacionados"
                      onChange={(event) => setTermoBuscaCopia(event.target.value)}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTermoBuscaCopia("");
                        setOficioCopiaId("");
                      }}
                    >
                      Limpar busca
                    </Button>
                  </div>

                  <div className="rounded-lg border border-[var(--g3-border)]">
                    {termoBuscaCopia.trim().length === 0 ? (
                      <div className="px-3 py-4 text-sm text-[var(--g3-muted)]">
                        Digite o número do ofício ou o assunto para listar apenas os registros relacionados.
                      </div>
                    ) : oficiosRelacionadosParaCopia.length ? (
                      <div className="divide-y divide-[var(--g3-border)]">
                        {oficiosRelacionadosParaCopia.map((item) => (
                          <button
                            key={item.id ?? item.identificacao.numero}
                            type="button"
                            className={`flex w-full flex-col gap-2 px-3 py-3 text-left transition hover:bg-[var(--g3-primary-soft)]/30 sm:flex-row sm:items-center sm:justify-between ${
                              oficioCopiaId === item.id ? "bg-[var(--g3-primary-soft)]/40" : "bg-[var(--g3-card)]"
                            }`}
                            onClick={() => item.id && copiarCorpoDeOutroOficio(item.id)}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                                {item.identificacao.numero} • {item.conteudo.assunto}
                              </p>
                              <p className="mt-1 text-xs text-[var(--g3-muted)]">{item.conteudo.razaoSocial}</p>
                            </div>
                            <span className="text-xs font-medium text-[var(--g3-active)]">Usar texto</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-3 py-4 text-sm text-[var(--g3-muted)]">
                        Nenhum ofício encontrado com esse número ou assunto.
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-[var(--g3-muted)]">
                    Digite o número ou o assunto. O sistema lista os ofícios relacionados para seleção imediata.
                  </p>
                </div>
              </div>

              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="oficio-corpo">Corpo do ofício</Label>
                <Textarea
                  id="oficio-corpo"
                  rows={12}
                  value={form.conteudo.corpo}
                  className={erros.corpo ? "border-rose-400 focus:ring-rose-400" : undefined}
                  placeholder="Digite a redação principal do ofício"
                  onChange={(event) => {
                    atualizarConteudo("corpo", event.target.value);
                    atualizarErroCampo("corpo", event.target.value);
                  }}
                  onBlur={() => atualizarErroCampo("corpo", form.conteudo.corpo)}
                />
                {erros.corpo ? (
                  <p className="text-xs text-rose-700">{erros.corpo}</p>
                ) : (
                  <p className="text-xs text-[var(--g3-muted)]">
                    Sugestão: abra com contexto, descreva a solicitação e feche com prazo ou encaminhamento esperado.
                  </p>
                )}
              </div>

              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="oficio-finalizacao">Finalização</Label>
                <Textarea
                  id="oficio-finalizacao"
                  rows={4}
                  value={form.conteudo.finalizacao ?? ""}
                  placeholder="Mensagem de encerramento do documento"
                  onChange={(event) => atualizarConteudo("finalizacao", event.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <Button variant="outline" onClick={() => setPreviaAberta(true)}>
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  Visualizar prévia
                </Button>
                <p className="mt-2 text-xs text-[var(--g3-muted)]">
                  Mostra a redação atual antes do envio. O PDF final continua usando o layout oficial do sistema.
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="oficio-assinatura">Assinatura</Label>
                <Select
                  id="oficio-assinatura"
                  value={form.conteudo.assinaturaNome ?? ""}
                  onChange={(event) => selecionarAssinatura(event.target.value)}
                  disabled={carregandoProfissionais}
                >
                  <option value="">
                    {carregandoProfissionais ? "Carregando profissionais..." : "Selecione um profissional"}
                  </option>
                  {profissionais.map((profissional) => (
                    <option key={profissional.id_profissional ?? profissional.nome_completo} value={profissional.nome_completo}>
                      {`${profissional.nome_completo}${extrairCargoProfissional(profissional) ? ` • ${extrairCargoProfissional(profissional)}` : ""}`}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-[var(--g3-muted)]">
                  A assinatura sempre busca o nome do profissional já cadastrado no sistema.
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="oficio-assinatura-cargo">Assinatura cargo</Label>
                <Input
                  id="oficio-assinatura-cargo"
                  value={form.conteudo.assinaturaCargo ?? ""}
                  placeholder="Preenchido a partir do profissional selecionado"
                  onChange={(event) => atualizarConteudo("assinaturaCargo", event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-xl border border-[var(--g3-border)] p-3">
                <p className="text-sm font-semibold text-[var(--g3-foreground)]">Conferência da assinatura</p>
                <p className="mt-2 text-sm text-[var(--g3-muted)]">
                  {assinaturaSelecionada
                    ? `${assinaturaSelecionada.nome_completo} pronto para assinar como ${form.conteudo.assinaturaCargo || extrairCargoProfissional(assinaturaSelecionada)}.`
                    : "Selecione um profissional para preencher assinatura e cargo automaticamente."}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {abaAtiva === "tramitacao" ? (
          <section className="space-y-4">
            <div className="grid gap-3 rounded-xl border border-[var(--g3-border)] p-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-1">
                <Label htmlFor="tramite-data">Data</Label>
                <Input
                  id="tramite-data"
                  type="date"
                  value={tramite.data ?? ""}
                  onChange={(event) => atualizarTramite("data", event.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="tramite-origem">Origem</Label>
                <Input
                  id="tramite-origem"
                  value={tramite.origem ?? ""}
                  placeholder="Setor ou unidade de origem"
                  onChange={(event) => atualizarTramite("origem", event.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="tramite-destino">Destino</Label>
                <Input
                  id="tramite-destino"
                  value={tramite.destino ?? ""}
                  placeholder="Para onde o documento seguirá"
                  onChange={(event) => atualizarTramite("destino", event.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="tramite-responsavel">Responsável</Label>
                <Input
                  id="tramite-responsavel"
                  value={tramite.responsavel ?? ""}
                  placeholder="Usuário ou setor responsável"
                  onChange={(event) => atualizarTramite("responsavel", event.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="tramite-acao">Ação</Label>
                <Input
                  id="tramite-acao"
                  value={tramite.acao}
                  placeholder="Ex.: Encaminhado para revisão"
                  onChange={(event) => atualizarTramite("acao", event.target.value)}
                />
              </div>

              <div className="space-y-1 md:col-span-2 xl:col-span-5">
                <Label htmlFor="tramite-observacoes">Observações</Label>
                <Textarea
                  id="tramite-observacoes"
                  rows={3}
                  value={tramite.observacoes ?? ""}
                  placeholder="Detalhes complementares da movimentação"
                  onChange={(event) => atualizarTramite("observacoes", event.target.value)}
                />
              </div>

              <div className="md:col-span-2 xl:col-span-5">
                <Button onClick={adicionarTramite}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Adicionar tramitação
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Origem</th>
                    <th className="px-3 py-2 text-left">Destino</th>
                    <th className="px-3 py-2 text-left">Responsável</th>
                    <th className="px-3 py-2 text-left">Ação</th>
                    <th className="px-3 py-2 text-left">Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {(form.tramites ?? []).length ? (
                    (form.tramites ?? []).map((item, index) => (
                      <tr
                        key={`${item.data}-${item.acao}-${index}`}
                        className={`border-t border-[var(--g3-border)] ${
                          index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                        }`}
                      >
                        <td className="px-3 py-2">{formatarDataInterface(item.data)}</td>
                        <td className="px-3 py-2">{item.origem || "---"}</td>
                        <td className="px-3 py-2">{item.destino || "---"}</td>
                        <td className="px-3 py-2">{item.responsavel || "---"}</td>
                        <td className="px-3 py-2">{item.acao}</td>
                        <td className="px-3 py-2">{item.observacoes || "---"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-5 text-center text-[var(--g3-muted)]">
                        Nenhum registro de tramitação foi adicionado até o momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "listagem" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
              <div className="space-y-1">
                <Label htmlFor="oficio-ano-listagem">Ano</Label>
                <Select
                  id="oficio-ano-listagem"
                  value={anoListagem}
                  onChange={(event) => setAnoListagem(event.target.value)}
                >
                  <option value="todos">Todos os anos</option>
                  {anosDisponiveis.map((ano) => (
                    <option key={ano} value={ano}>
                      {ano}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="oficio-busca">Buscar ofício</Label>
                <Input
                  id="oficio-busca"
                  value={busca}
                  placeholder="Número, para, assunto, setor, responsável ou status"
                  onChange={(event) => setBusca(event.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Número</th>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Para</th>
                    <th className="px-3 py-2 text-left">Assunto</th>
                    <th className="px-3 py-2 text-left">Responsável</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {oficiosFiltrados.length ? (
                    oficiosFiltrados.map((item, index) => (
                      <tr
                        key={item.id ?? `${item.identificacao.numero}-${index}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => selecionar(item)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            selecionar(item);
                          }
                        }}
                        className={`border-t border-[var(--g3-border)] transition hover:bg-emerald-50 ${
                          form.id === item.id
                            ? "bg-emerald-100 ring-1 ring-inset ring-emerald-500"
                            : index % 2 === 0
                              ? "bg-[var(--g3-card)]"
                              : "bg-[var(--g3-primary-soft)]/35"
                        }`}
                      >
                        <td className="px-3 py-2 font-medium text-[var(--g3-foreground)]">
                          {item.identificacao.numero}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">{formatarDataInterface(item.identificacao.data)}</td>
                        <td className="px-3 py-2">{item.conteudo.razaoSocial}</td>
                        <td className="px-3 py-2">{item.conteudo.assunto}</td>
                        <td className="px-3 py-2">{item.identificacao.responsavel}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${classeStatus(item.protocolo.status)}`}
                          >
                            {formatarStatus(item.protocolo.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                void abrirPdfOficio(item.id);
                              }}
                              disabled={imprimindo}
                            >
                              PDF
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-3 py-5 text-center text-[var(--g3-muted)]">
                        Nenhum ofício encontrado com os filtros informados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </AdminPageLayout>

      {previaAberta ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4"
          onClick={() => setPreviaAberta(false)}
        >
          <Card
            className="max-h-[90vh] w-full max-w-5xl overflow-hidden border-[var(--g3-active)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <CardHeader className="border-b border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/35">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Prévia do ofício</CardTitle>
                  <p className="mt-1 text-xs text-[var(--g3-muted)]">
                    Modelo oficial de impressão do Ofício. O PDF final segue este mesmo template exclusivo.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setPreviaAberta(false)}>
                  Fechar prévia
                </Button>
              </div>
            </CardHeader>

            <CardContent className="max-h-[calc(90vh-92px)] overflow-y-auto bg-slate-100 p-4">
              <div className="mx-auto w-full max-w-[820px] rounded-sm border border-slate-300 bg-white px-8 py-10 shadow-sm sm:px-12">
                <div className="flex flex-col gap-3 text-[15px] text-slate-800 sm:flex-row sm:items-start sm:justify-between">
                  <p className="font-semibold text-slate-950">Ofício nº {form.identificacao.numero || "A definir"}</p>
                  <p className="max-w-[280px] text-left leading-6 sm:text-right">
                    {[cidadeUfDocumento || "Cidade/UF não configurada", dataExtensoDocumento || "Data não informada"]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>

                <div className="mt-10 space-y-1 text-[15px] leading-7 text-slate-900">
                  {form.conteudo.razaoSocial ? (
                    <p className="font-semibold uppercase tracking-[0.04em] text-slate-950">
                      {form.conteudo.razaoSocial}
                    </p>
                  ) : (
                    <p className="italic text-slate-500">Instituição destinatária não informada.</p>
                  )}
                  {destinatarioLinha ? <p>{destinatarioLinha}</p> : null}
                  {form.conteudo.cargoPara ? <p>{form.conteudo.cargoPara}</p> : null}
                </div>

                <div className="mt-8 text-[15px] leading-7 text-slate-900">
                  <p className="font-semibold">
                    Assunto: {form.conteudo.assunto || "Assunto ainda não informado"}
                  </p>
                </div>

                {informacoesComplementaresPrevia.length ? (
                  <div className="mt-8 rounded-md border border-slate-300 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                      Informações complementares
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-slate-800">
                      {informacoesComplementaresPrevia.map((item) => (
                        <p key={`${item.rotulo}-${item.valor}`}>
                          <span className="font-semibold">{item.rotulo}:</span> {item.valor}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-8 space-y-4 text-[15px] leading-7 text-slate-800">
                  {corpoPrevia.length ? (
                    corpoPrevia.map((paragrafo, index) => (
                      <p key={`corpo-${index}`} className="text-justify" style={{ textIndent: "2rem" }}>
                        {paragrafo}
                      </p>
                    ))
                  ) : (
                    <p className="italic text-slate-500">
                      O corpo do ofício aparecerá aqui assim que a redação for preenchida.
                    </p>
                  )}
                </div>

                {fechamentoPrevia.length ? (
                  <div className="mt-8 space-y-4 text-[15px] leading-7 text-slate-800">
                    {fechamentoPrevia.map((paragrafo, index) => (
                      <p key={`fechamento-${index}`}>{paragrafo}</p>
                    ))}
                  </div>
                ) : null}

                <div className="mt-16 flex flex-col items-center pt-6 text-center">
                  <div className="w-full max-w-[320px] border-t border-slate-500" />
                  <p className="mt-3 text-base font-semibold text-slate-950">
                    {form.conteudo.assinaturaNome || "Assinatura não selecionada"}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {form.conteudo.assinaturaCargo || "Cargo não informado"}
                  </p>
                </div>

                {carregandoContextoDocumento ? (
                  <div className="mt-10 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-800">
                    Carregando os dados institucionais do rodapé oficial...
                  </div>
                ) : null}

                <div className="mt-14 border-t border-slate-400 pt-4 text-center text-[12px] leading-5 text-slate-600">
                  {rodapeDocumento.length ? (
                    rodapeDocumento.map((linha, index) => (
                      <p
                        key={`rodape-${index}`}
                        className={index === 0 ? "font-semibold text-slate-800" : undefined}
                      >
                        {linha}
                      </p>
                    ))
                  ) : (
                    <p className="italic">
                      Configure os dados institucionais da unidade para completar o rodapé oficial do Ofício.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {popupMensagem ? <PopupMensagem popup={popupMensagem} onClose={() => setPopupMensagem(null)} /> : null}

      <PopupConfirmacao
        aberto={confirmarExcluir}
        titulo="Confirmar exclusão"
        texto="Esta ação é irreversível. Deseja continuar?"
        processando={excluirMutation.isPending}
        onCancel={() => setConfirmarExcluir(false)}
        onConfirm={() => void confirmarExclusao()}
        confirmarTexto="Excluir"
      />
    </>
  );
}
