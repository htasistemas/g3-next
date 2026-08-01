import { useEffect, useMemo, useState } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { BadgeDollarSign, QrCode, ReceiptText, RefreshCcw, Save, Store, WalletCards } from "lucide-react";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  formatarCpf,
  formatarMoedaInput,
  formatarTelefone,
  mascararTelefoneInput,
  normalizarCpf,
  normalizarMoeda,
  normalizarTelefone,
  validarCpf
} from "@/lib/br-utils";
import { carteiraEventoService } from "@/services/carteira-evento.service";
import type {
  BarracaEvento,
  DashboardCarteiraEvento,
  EventoCarteira,
  ItemEventoCarteira,
  MovimentacaoCarteira,
  ParticipanteCarteira,
  VendaCarteira
} from "@/types/carteira-evento";

type AbaId = "dashboard" | "cadastros" | "carteiras" | "operacao" | "fechamento";

const abas: AdminTab[] = [
  { id: "dashboard", label: "Dashboard", icon: BadgeDollarSign },
  { id: "cadastros", label: "Cadastros", icon: Store },
  { id: "carteiras", label: "Carteiras", icon: WalletCards },
  { id: "operacao", label: "Operação", icon: QrCode },
  { id: "fechamento", label: "Fechamento", icon: ReceiptText }
];

const tiposEvento = ["FESTA_BARRACAS", "BAZAR", "CANTINA", "QUERMESSE", "FEIRA_SOLIDARIA", "CAMPANHA_BENEFICENTE", "OUTROS"];
const categoriasItem = ["ALIMENTO", "BEBIDA", "DOCE", "BRINCADEIRA", "BAZAR", "INGRESSO", "FICHA_ESPECIAL", "OUTROS"];
const formasRecarga = ["DINHEIRO", "PIX", "CARTAO", "CORTESIA", "TRANSFERENCIA_INTERNA"];

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toDateInput(valor?: string) {
  return valor?.slice(0, 10) ?? "";
}

function formatarData(valor?: string) {
  if (!valor) return "---";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleDateString("pt-BR");
}

function mascararCpfInput(valor?: string) {
  const digitos = normalizarCpf(valor).slice(0, 11);
  if (digitos.length <= 3) return digitos;
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
  if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

function CampoErro({ texto }: { texto?: string }) {
  if (!texto) return null;
  return <p className="text-xs text-rose-600">{texto}</p>;
}

function classesCampoInvalido(erro?: string) {
  return erro ? "border-rose-500 focus-visible:ring-rose-500" : "";
}

function novaChaveOperacao() {
  return `g3n-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function criarEventoFormPadrao() {
  return {
    id: 0,
    nome_evento: "",
    tipo_evento: "FESTA_BARRACAS",
    data_inicio: "",
    data_fim: "",
    status: "ATIVO",
    permite_recarga: true,
    permite_transferencia: true,
    permite_estorno: true,
    validade_credito: "",
    centro_receita: "",
    modo_financeiro: "SIMPLES",
    observacoes: "",
    permite_saldo_negativo_adm: false
  };
}

function criarParticipanteFormPadrao() {
  return {
    id: 0,
    nome: "",
    telefone: "",
    cpf: "",
    foto_url: "",
    responsavel: "",
    numero_carteira: "",
    status: "ATIVO",
    observacoes: ""
  };
}

function criarBarracaFormPadrao() {
  return {
    id: 0,
    nome_barraca: "",
    responsavel: "",
    tipo_barraca: "",
    operador: "",
    status: "ATIVA",
    impressora: "",
    observacoes: ""
  };
}

function criarItemFormPadrao() {
  return {
    id: 0,
    barraca_id: "",
    nome_item: "",
    categoria: "ALIMENTO",
    preco: "",
    estoque: "",
    ativo: true,
    foto_url: "",
    ordem_exibicao: "0"
  };
}

function validarDataIso(valor: string) {
  const match = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const [, ano, mes, dia] = match.map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (Number.isNaN(data.getTime())) return false;
  return data.toISOString().slice(0, 10) === valor;
}

function validarInteiroNaoNegativo(valor: string) {
  if (!valor.trim()) return true;
  return /^\d+$/.test(valor.trim());
}

export function CarteiraDigitalEventoPage() {
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("dashboard");
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [eventos, setEventos] = useState<EventoCarteira[]>([]);
  const [participantes, setParticipantes] = useState<ParticipanteCarteira[]>([]);
  const [barracas, setBarracas] = useState<BarracaEvento[]>([]);
  const [itens, setItens] = useState<ItemEventoCarteira[]>([]);
  const [dashboard, setDashboard] = useState<DashboardCarteiraEvento | null>(null);
  const [fechamento, setFechamento] = useState<Record<string, unknown> | null>(null);
  const [eventoSelecionadoId, setEventoSelecionadoId] = useState(0);
  const [participanteSelecionado, setParticipanteSelecionado] = useState<ParticipanteCarteira | null>(null);
  const [extrato, setExtrato] = useState<MovimentacaoCarteira[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [barcodeSvg, setBarcodeSvg] = useState("");
  const [carteiraOperacao, setCarteiraOperacao] = useState<ParticipanteCarteira | null>(null);
  const [tokenOperacao, setTokenOperacao] = useState("");
  const [barracaOperacaoId, setBarracaOperacaoId] = useState(0);
  const [itensVenda, setItensVenda] = useState<Array<{ item: ItemEventoCarteira; quantidade: number }>>([]);
  const [ultimaVenda, setUltimaVenda] = useState<VendaCarteira | null>(null);
  const [chaveOperacao, setChaveOperacao] = useState(novaChaveOperacao());

  const [eventoForm, setEventoForm] = useState(criarEventoFormPadrao);
  const [participanteForm, setParticipanteForm] = useState(criarParticipanteFormPadrao);
  const [barracaForm, setBarracaForm] = useState(criarBarracaFormPadrao);
  const [itemForm, setItemForm] = useState(criarItemFormPadrao);
  const [recargaValor, setRecargaValor] = useState("");
  const [recargaForma, setRecargaForma] = useState("DINHEIRO");
  const [ajusteValor, setAjusteValor] = useState("");
  const [ajusteTipo, setAjusteTipo] = useState("CREDITO");
  const [ajusteMotivo, setAjusteMotivo] = useState("");
  const [transferenciaDestinoId, setTransferenciaDestinoId] = useState("");
  const [transferenciaValor, setTransferenciaValor] = useState("");
  const [transferenciaMotivo, setTransferenciaMotivo] = useState("");
  const [errosParticipante, setErrosParticipante] = useState<Record<string, string | undefined>>({});
  const [errosOperacao, setErrosOperacao] = useState<Record<string, string | undefined>>({});
  const [errosEvento, setErrosEvento] = useState<Record<string, string | undefined>>({});
  const [errosBarraca, setErrosBarraca] = useState<Record<string, string | undefined>>({});
  const [errosItem, setErrosItem] = useState<Record<string, string | undefined>>({});
  const [consultaSaldoId, setConsultaSaldoId] = useState("");

  const eventoSelecionado = useMemo(() => eventos.find((item) => item.id === eventoSelecionadoId) ?? null, [eventos, eventoSelecionadoId]);
  const barracasEvento = useMemo(() => barracas.filter((item) => item.eventoId === eventoSelecionadoId), [barracas, eventoSelecionadoId]);
  const itensEvento = useMemo(() => itens.filter((item) => item.eventoId === eventoSelecionadoId), [itens, eventoSelecionadoId]);
  const itensOperacao = useMemo(
    () =>
      itensEvento.filter(
        (item) => item.ativo && (!barracaOperacaoId || !item.barracaId || item.barracaId === barracaOperacaoId)
      ),
    [itensEvento, barracaOperacaoId]
  );
  const subtotalVenda = itensVenda.reduce((acc, atual) => acc + atual.item.preco * atual.quantidade, 0);
  const participanteSaldoConsulta = useMemo(
    () => participantes.find((item) => item.id === Number(consultaSaldoId || 0)) ?? participanteSelecionado ?? null,
    [consultaSaldoId, participanteSelecionado, participantes]
  );

  const actions: AdminAction[] = [
    { label: "Atualizar", icon: RefreshCcw, onClick: () => void carregarBase(eventoSelecionadoId), variant: "outline" }
  ];

  async function carregarBase(eventoIdPreferencial?: number) {
    setCarregando(true);
    try {
      const eventosData = await carteiraEventoService.listarEventos();
      const listaEventos = eventosData.eventos;
      const eventoId = eventoIdPreferencial || eventoSelecionadoId || listaEventos[0]?.id || 0;
      setEventos(listaEventos);
      setEventoSelecionadoId(eventoId);
      if (!eventoId) return;
      const [participantesData, barracasData, itensData, dashboardData, fechamentoData] = await Promise.all([
        carteiraEventoService.listarParticipantes({ evento_id: eventoId }),
        carteiraEventoService.listarBarracas({ evento_id: eventoId }),
        carteiraEventoService.listarItens({ evento_id: eventoId }),
        carteiraEventoService.dashboard(eventoId),
        carteiraEventoService.fechamento(eventoId)
      ]);
      setParticipantes(participantesData.participantes);
      setBarracas(barracasData.barracas);
      setItens(itensData.itens);
      setDashboard(dashboardData);
      setFechamento(fechamentoData);
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Carteira digital do evento", texto: error?.response?.data?.message ?? "Não foi possível carregar o módulo." });
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarBase();
  }, []);

  useEffect(() => {
    if (!participanteSelecionado) {
      setQrCodeUrl("");
      setBarcodeSvg("");
      setExtrato([]);
      return;
    }
    void QRCode.toDataURL(participanteSelecionado.qrCodeTokenUnico, { margin: 1, width: 320 }).then(setQrCodeUrl).catch(() => setQrCodeUrl(""));
    try {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      JsBarcode(svg, participanteSelecionado.numeroCarteira, {
        format: "CODE128",
        width: 1.2,
        height: 44,
        margin: 6,
        displayValue: true,
        fontOptions: "bold",
        fontSize: 12,
        background: "transparent",
        lineColor: "#0f172a"
      });
      setBarcodeSvg(svg.outerHTML);
    } catch {
      setBarcodeSvg("");
    }
    void carteiraEventoService.extrato(participanteSelecionado.id).then((data) => setExtrato(data.movimentacoes)).catch(() => setExtrato([]));
  }, [participanteSelecionado]);

  function selecionarEvento(item: EventoCarteira) {
    setEventoForm({
      id: item.id,
      nome_evento: item.nomeEvento,
      tipo_evento: item.tipoEvento,
      data_inicio: toDateInput(item.dataInicio),
      data_fim: toDateInput(item.dataFim),
      status: item.status,
      permite_recarga: item.permiteRecarga,
      permite_transferencia: item.permiteTransferencia,
      permite_estorno: item.permiteEstorno,
      validade_credito: toDateInput(item.validadeCredito),
      centro_receita: item.centroReceita,
      modo_financeiro: item.modoFinanceiro,
      observacoes: item.observacoes,
      permite_saldo_negativo_adm: item.permiteSaldoNegativoAdm
    });
  }

  function selecionarParticipante(item: ParticipanteCarteira) {
    setConsultaSaldoId(String(item.id));
    setParticipanteSelecionado(item);
    setParticipanteForm({
      id: item.id,
      nome: item.nome,
      telefone: item.telefone,
      cpf: item.cpf,
      foto_url: item.fotoUrl,
      responsavel: item.responsavel,
      numero_carteira: item.numeroCarteira,
      status: item.status,
      observacoes: item.observacoes
    });
  }

  function validarCampoParticipante(campo: "nome" | "telefone" | "cpf", valor: string) {
    if (campo === "nome") {
      return valor.trim().length >= 3 ? undefined : "Informe um nome com pelo menos 3 caracteres.";
    }
    if (campo === "telefone") {
      const telefone = normalizarTelefone(valor);
      if (!telefone) return undefined;
      return [10, 11].includes(telefone.length) ? undefined : "Informe um telefone válido.";
    }
    if (campo === "cpf") {
      const cpf = normalizarCpf(valor);
      if (!cpf) return undefined;
      return validarCpf(cpf) ? undefined : "Informe um CPF válido.";
    }
    return undefined;
  }

  function validarParticipanteForm() {
    const proximosErros = {
      nome: validarCampoParticipante("nome", participanteForm.nome),
      telefone: validarCampoParticipante("telefone", participanteForm.telefone),
      cpf: validarCampoParticipante("cpf", participanteForm.cpf)
    };
    setErrosParticipante(proximosErros);
    return !Object.values(proximosErros).some(Boolean);
  }

  function validarEventoForm() {
    const dataInicioValida = validarDataIso(eventoForm.data_inicio);
    const dataFimValida = !eventoForm.data_fim || validarDataIso(eventoForm.data_fim);
    const validadeCreditoValida = !eventoForm.validade_credito || validarDataIso(eventoForm.validade_credito);
    const proximosErros = {
      nome_evento:
        eventoForm.nome_evento.trim().length >= 3 ? undefined : "Informe um nome de evento com pelo menos 3 caracteres.",
      data_inicio: dataInicioValida ? undefined : "Informe uma data inicial válida.",
      data_fim: dataFimValida ? undefined : "Informe uma data final válida.",
      periodo:
        dataInicioValida && dataFimValida && eventoForm.data_fim && eventoForm.data_fim < eventoForm.data_inicio
          ? "A data final não pode ser anterior à data inicial."
          : undefined,
      validade_credito: validadeCreditoValida ? undefined : "Informe uma validade de crédito válida."
    };
    setErrosEvento(proximosErros);
    return !Object.values(proximosErros).some(Boolean);
  }

  function validarBarracaForm() {
    const proximosErros = {
      nome_barraca:
        barracaForm.nome_barraca.trim().length >= 3
          ? undefined
          : "Informe um nome de barraca com pelo menos 3 caracteres."
    };
    setErrosBarraca(proximosErros);
    return !Object.values(proximosErros).some(Boolean);
  }

  function validarItemForm() {
    const preco = normalizarMoeda(itemForm.preco);
    const estoqueValido = validarInteiroNaoNegativo(itemForm.estoque);
    const ordemValida = validarInteiroNaoNegativo(itemForm.ordem_exibicao);
    const proximosErros = {
      nome_item:
        itemForm.nome_item.trim().length >= 2 ? undefined : "Informe um nome de produto com pelo menos 2 caracteres.",
      preco: preco > 0 ? undefined : "Informe um preço maior que zero.",
      estoque: estoqueValido ? undefined : "Informe o estoque apenas com números inteiros.",
      ordem_exibicao: ordemValida ? undefined : "Informe a ordem apenas com números inteiros."
    };
    setErrosItem(proximosErros);
    return !Object.values(proximosErros).some(Boolean);
  }

  function validarRecargaForm() {
    const proximosErros = {
      recargaValor: normalizarMoeda(recargaValor) > 0 ? undefined : "Informe um valor de recarga maior que zero."
    };
    setErrosOperacao((atual) => ({ ...atual, ...proximosErros }));
    return !Object.values(proximosErros).some(Boolean);
  }

  function validarAjusteForm() {
    const proximosErros = {
      ajusteValor: normalizarMoeda(ajusteValor) > 0 ? undefined : "Informe um valor maior que zero.",
      ajusteMotivo: ajusteMotivo.trim().length >= 3 ? undefined : "Informe um motivo com pelo menos 3 caracteres."
    };
    setErrosOperacao((atual) => ({ ...atual, ...proximosErros }));
    return !Object.values(proximosErros).some(Boolean);
  }

  function validarTransferenciaForm() {
    const proximosErros = {
      transferenciaDestinoId: transferenciaDestinoId ? undefined : "Selecione a carteira de destino.",
      transferenciaValor: normalizarMoeda(transferenciaValor) > 0 ? undefined : "Informe um valor maior que zero.",
      transferenciaMotivo:
        transferenciaMotivo.trim().length >= 3 ? undefined : "Informe um motivo com pelo menos 3 caracteres."
    };
    setErrosOperacao((atual) => ({ ...atual, ...proximosErros }));
    return !Object.values(proximosErros).some(Boolean);
  }

  function selecionarBarraca(item: BarracaEvento) {
    setBarracaForm({
      id: item.id,
      nome_barraca: item.nomeBarraca,
      responsavel: item.responsavel,
      tipo_barraca: item.tipoBarraca,
      operador: item.operador,
      status: item.status,
      impressora: item.impressora,
      observacoes: item.observacoes
    });
  }

  function selecionarItem(item: ItemEventoCarteira) {
    setItemForm({
      id: item.id,
      barraca_id: item.barracaId ? String(item.barracaId) : "",
      nome_item: item.nomeItem,
      categoria: item.categoria,
      preco: String(item.preco),
      estoque: item.estoque == null ? "" : String(item.estoque),
      ativo: item.ativo,
      foto_url: item.fotoUrl,
      ordem_exibicao: String(item.ordemExibicao)
    });
  }

  async function salvarEvento() {
    if (!validarEventoForm()) {
      setPopup({ tipo: "aviso", titulo: "Carteira digital do evento", texto: "Revise os campos inválidos do evento antes de salvar." });
      return;
    }
    try {
      const payload = { ...eventoForm };
      const eventoSalvo = eventoForm.id
        ? await carteiraEventoService.atualizarEvento(eventoForm.id, payload)
        : await carteiraEventoService.criarEvento(payload);
      await carregarBase(eventoSalvo.id);
      setEventoSelecionadoId(eventoSalvo.id);
      setEventoForm(criarEventoFormPadrao());
      setErrosEvento({});
      setPopup({ tipo: "sucesso", titulo: "Carteira digital do evento", texto: eventoForm.id ? "Evento atualizado com sucesso." : "Evento criado com sucesso. Use Novo evento para iniciar outro cadastro." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Carteira digital do evento", texto: error?.response?.data?.message ?? "Não foi possível salvar o evento." });
    }
  }

  async function salvarParticipante() {
    if (!eventoSelecionadoId) return;
    if (!validarParticipanteForm()) {
      setPopup({ tipo: "aviso", titulo: "Carteira digital do evento", texto: "Revise os campos inválidos da carteira antes de salvar." });
      return;
    }
    try {
      const payload = {
        ...participanteForm,
        evento_id: eventoSelecionadoId,
        telefone: normalizarTelefone(participanteForm.telefone) || undefined,
        cpf: normalizarCpf(participanteForm.cpf) || undefined
      };
      const participante = participanteForm.id ? await carteiraEventoService.atualizarParticipante(participanteForm.id, payload) : await carteiraEventoService.criarParticipante(payload);
      await carregarBase(eventoSelecionadoId);
      setParticipanteSelecionado(participante);
      setConsultaSaldoId(String(participante.id));
      setParticipanteForm(criarParticipanteFormPadrao());
      setErrosParticipante({});
      setPopup({ tipo: "sucesso", titulo: "Carteira digital do evento", texto: "Carteira salva com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Carteira digital do evento", texto: error?.response?.data?.message ?? "Não foi possível salvar a carteira." });
    }
  }

  async function salvarBarraca() {
    if (!eventoSelecionadoId) return;
    if (!validarBarracaForm()) {
      setPopup({ tipo: "aviso", titulo: "Carteira digital do evento", texto: "Revise os campos inválidos da barraca antes de salvar." });
      return;
    }
    try {
      const payload = { ...barracaForm, evento_id: eventoSelecionadoId };
      if (barracaForm.id) await carteiraEventoService.atualizarBarraca(barracaForm.id, payload);
      else await carteiraEventoService.criarBarraca(payload);
      await carregarBase(eventoSelecionadoId);
      setBarracaForm(criarBarracaFormPadrao());
      setErrosBarraca({});
      setPopup({ tipo: "sucesso", titulo: "Carteira digital do evento", texto: "Barraca salva com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Carteira digital do evento", texto: error?.response?.data?.message ?? "Não foi possível salvar a barraca." });
    }
  }

  async function salvarItem() {
    if (!eventoSelecionadoId) return;
    if (!validarItemForm()) {
      setPopup({ tipo: "aviso", titulo: "Carteira digital do evento", texto: "Revise os campos inválidos do produto antes de salvar." });
      return;
    }
    try {
      const payload = { ...itemForm, evento_id: eventoSelecionadoId, barraca_id: itemForm.barraca_id ? Number(itemForm.barraca_id) : undefined, preco: normalizarMoeda(itemForm.preco), estoque: itemForm.estoque ? Number(itemForm.estoque) : undefined, ordem_exibicao: Number(itemForm.ordem_exibicao || 0) };
      if (itemForm.id) await carteiraEventoService.atualizarItem(itemForm.id, payload);
      else await carteiraEventoService.criarItem(payload);
      await carregarBase(eventoSelecionadoId);
      setItemForm(criarItemFormPadrao());
      setErrosItem({});
      setPopup({ tipo: "sucesso", titulo: "Carteira digital do evento", texto: "Produto salvo com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Carteira digital do evento", texto: error?.response?.data?.message ?? "Não foi possível salvar o produto." });
    }
  }

  async function executarRecarga() {
    if (!participanteSelecionado) return;
    if (!validarRecargaForm()) {
      setPopup({ tipo: "aviso", titulo: "Recarga", texto: "Informe um valor de recarga maior que zero." });
      return;
    }
    const valorRecarga = normalizarMoeda(recargaValor);
    try {
      const participante = await carteiraEventoService.recarregar({ participante_id: participanteSelecionado.id, valor_recarga: valorRecarga, forma_pagamento: recargaForma });
      await carregarBase(eventoSelecionadoId);
      setParticipanteSelecionado(participante);
      setRecargaValor("");
      setErrosOperacao((atual) => ({ ...atual, recargaValor: undefined }));
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Recarga", texto: error?.response?.data?.message ?? "Não foi possível realizar a recarga." });
    }
  }

  async function executarAjuste() {
    if (!participanteSelecionado) return;
    if (!validarAjusteForm()) {
      setPopup({ tipo: "aviso", titulo: "Ajuste", texto: "Informe valor maior que zero e um motivo válido para o ajuste." });
      return;
    }
    const valorAjuste = normalizarMoeda(ajusteValor);
    try {
      const participante = await carteiraEventoService.ajustar({ participante_id: participanteSelecionado.id, tipo_ajuste: ajusteTipo, valor: valorAjuste, motivo: ajusteMotivo.trim() });
      await carregarBase(eventoSelecionadoId);
      setParticipanteSelecionado(participante);
      setAjusteValor("");
      setAjusteMotivo("");
      setErrosOperacao((atual) => ({ ...atual, ajusteValor: undefined, ajusteMotivo: undefined }));
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Ajuste", texto: error?.response?.data?.message ?? "Não foi possível registrar o ajuste." });
    }
  }

  async function executarTransferencia() {
    if (!participanteSelecionado) return;
    if (!validarTransferenciaForm()) {
      setPopup({ tipo: "aviso", titulo: "Transferência", texto: "Informe carteira destino, valor maior que zero e motivo válido para transferir." });
      return;
    }
    const valorTransferencia = normalizarMoeda(transferenciaValor);
    try {
      const resposta = await carteiraEventoService.transferir({ evento_id: eventoSelecionadoId, carteira_origem_id: participanteSelecionado.id, carteira_destino_id: Number(transferenciaDestinoId), valor_transferencia: valorTransferencia, motivo: transferenciaMotivo.trim() });
      await carregarBase(eventoSelecionadoId);
      setParticipanteSelecionado(resposta.origem);
      setTransferenciaDestinoId("");
      setTransferenciaValor("");
      setTransferenciaMotivo("");
      setErrosOperacao((atual) => ({
        ...atual,
        transferenciaDestinoId: undefined,
        transferenciaValor: undefined,
        transferenciaMotivo: undefined
      }));
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Transferência", texto: error?.response?.data?.message ?? "Não foi possível transferir os créditos." });
    }
  }

  async function consultarCarteiraOperacao() {
    if (!eventoSelecionadoId || !tokenOperacao.trim()) return;
    try {
      setCarteiraOperacao(await carteiraEventoService.consultarToken({ evento_id: eventoSelecionadoId, token: tokenOperacao.trim() }));
      setUltimaVenda(null);
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Operação", texto: error?.response?.data?.message ?? "Não foi possível localizar a carteira." });
    }
  }

  async function confirmarVenda() {
    if (!eventoSelecionadoId) {
      setPopup({ tipo: "erro", titulo: "Venda", texto: "Selecione o evento em operação antes de confirmar o débito." });
      return;
    }
    if (!barracaOperacaoId) {
      setPopup({ tipo: "erro", titulo: "Venda", texto: "Selecione a barraca ou ponto de venda antes de confirmar o débito." });
      return;
    }
    if (!itensVenda.length) {
      setPopup({ tipo: "erro", titulo: "Venda", texto: "Adicione pelo menos um item antes de confirmar o débito." });
      return;
    }
    try {
      let carteiraAtual = carteiraOperacao;
      if (!carteiraAtual) {
        if (!tokenOperacao.trim()) {
          setPopup({ tipo: "erro", titulo: "Venda", texto: "Informe o QR Code, token ou número da carteira antes de confirmar o débito." });
          return;
        }
        carteiraAtual = await carteiraEventoService.consultarToken({ evento_id: eventoSelecionadoId, token: tokenOperacao.trim() });
        setCarteiraOperacao(carteiraAtual);
      }
      const venda = await carteiraEventoService.realizarVenda({ evento_id: eventoSelecionadoId, barraca_id: barracaOperacaoId, token: carteiraAtual.qrCodeTokenUnico, chave_operacao: chaveOperacao, itens: itensVenda.map((item) => ({ item_id: item.item.id, quantidade: item.quantidade })) });
      setUltimaVenda(venda);
      setItensVenda([]);
      setCarteiraOperacao((atual) => (atual ? { ...atual, saldoAtual: venda.saldoDepois } : atual));
      setChaveOperacao(novaChaveOperacao());
      await carregarBase(eventoSelecionadoId);
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Venda", texto: error?.response?.data?.message ?? "Não foi possível concluir a venda." });
    }
  }

  function alternarItemVenda(item: ItemEventoCarteira) {
    if (!barracaOperacaoId && item.barracaId) {
      setBarracaOperacaoId(item.barracaId);
    }
    if (barracaOperacaoId && item.barracaId && item.barracaId !== barracaOperacaoId) {
      setPopup({
        tipo: "erro",
        titulo: "Venda",
        texto: "Este item pertence a outra barraca. Troque a barraca antes de continuar."
      });
      return;
    }
    setItensVenda((atual) => {
      const existente = atual.find((registro) => registro.item.id === item.id);
      return existente ? atual.map((registro) => (registro.item.id === item.id ? { ...registro, quantidade: registro.quantidade + 1 } : registro)) : [...atual, { item, quantidade: 1 }];
    });
  }

  function imprimirCartaoQr() {
    if (!participanteSelecionado || !qrCodeUrl || !eventoSelecionado) return;
    const popup = window.open("", "_blank", "width=420,height=620");
    if (!popup) return;
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Carteira digital do evento</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}img{width:220px;height:220px;display:block;margin:16px auto}.barcode{display:flex;justify-content:center;margin:12px 0}.token{font-size:12px;word-break:break-all;color:#475569}section{border:2px solid #0f766e;border-radius:18px;padding:20px}</style></head><body><section><h1>${eventoSelecionado.nomeEvento}</h1><h2>${participanteSelecionado.nome}</h2><p>Carteira ${participanteSelecionado.numeroCarteira}</p><img src="${qrCodeUrl}" alt="QR Code"><div class="barcode">${barcodeSvg || ""}</div><p class="token">Número da carteira: ${participanteSelecionado.numeroCarteira}</p><p class="token">Token seguro interno: ${participanteSelecionado.qrCodeTokenUnico}</p><p>Apresente o QR Code ou o código de barras nas barracas ou pontos de venda.</p></section><script>window.onload=()=>window.print();</script></body></html>`);
    popup.document.close();
  }

  return (
    <AdminPageLayout
      tabs={abas}
      activeTab={abaAtiva}
      onChangeTab={(tab) => setAbaAtiva(tab as AbaId)}
      sectionLabel="Vendas e Caixa"
      pageTitle="Carteira digital do evento"
      activeTitle="Carteira digital do evento"
      actions={actions}
    >
      <section className="space-y-4">
        <Card>
          <CardContent className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_repeat(3,180px)]">
            <div>
              <Label>Evento em operação</Label>
              <Select
                value={String(eventoSelecionadoId || "")}
                onChange={(e) => {
                  const id = Number(e.target.value || 0);
                  setEventoSelecionadoId(id);
                  void carregarBase(id);
                }}
              >
                <option value="">Selecione</option>
                {eventos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nomeEvento}
                  </option>
                ))}
              </Select>
            </div>
            <div className="rounded-xl border border-[var(--g3-border)] px-3 py-2">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--g3-muted)]">Participantes</p>
              <p className="mt-2 text-2xl font-black">{dashboard?.quantidadeParticipantes ?? 0}</p>
            </div>
            <div className="rounded-xl border border-[var(--g3-border)] px-3 py-2">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--g3-muted)]">Total carregado</p>
              <p className="mt-2 text-xl font-black">{formatarMoeda(dashboard?.totalCarregado ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-[var(--g3-border)] px-3 py-2">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--g3-muted)]">Total consumido</p>
              <p className="mt-2 text-xl font-black">{formatarMoeda(dashboard?.totalConsumido ?? 0)}</p>
            </div>
          </CardContent>
        </Card>

        {abaAtiva === "dashboard" && dashboard ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Ranking de barracas</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {dashboard.rankingBarracas.map((item) => (
                  <div key={item.barraca} className="flex items-center justify-between rounded-xl border border-[var(--g3-border)] px-3 py-2">
                    <span className="font-semibold">{item.posicao}. {item.barraca}</span>
                    <span className="font-black">{formatarMoeda(item.total)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Formas de pagamento</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {dashboard.totalPorFormaPagamento.map((item) => (
                  <div key={item.formaPagamento} className="flex items-center justify-between rounded-xl border border-[var(--g3-border)] px-3 py-2">
                    <span className="font-semibold">{item.formaPagamento}</span>
                    <span className="font-black">{formatarMoeda(item.total)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {abaAtiva === "cadastros" ? (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>{eventoForm.id ? "Editar evento" : "Novo evento"}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {eventos.map((item) => (
                  <button key={item.id} type="button" onClick={() => selecionarEvento(item)} className="w-full rounded-xl border border-[var(--g3-border)] px-3 py-2 text-left hover:bg-[var(--g3-card-soft)]">
                    <p className="font-semibold">{item.nomeEvento}</p>
                    <p className="text-sm text-[var(--g3-muted)]">{item.status}</p>
                  </button>
                ))}
                <div className="grid gap-3 pt-2 md:grid-cols-2">
                  <div className="space-y-1 md:col-span-2">
                    <Label>Nome do evento</Label>
                    <Input className={classesCampoInvalido(errosEvento.nome_evento)} value={eventoForm.nome_evento} onChange={(e) => setEventoForm((a) => ({ ...a, nome_evento: e.target.value }))} onBlur={validarEventoForm} placeholder="Nome do evento" />
                    <CampoErro texto={errosEvento.nome_evento} />
                  </div>
                  <div className="space-y-1">
                    <Label>Tipo do evento</Label>
                    <Select value={eventoForm.tipo_evento} onChange={(e) => setEventoForm((a) => ({ ...a, tipo_evento: e.target.value }))}>
                      {tiposEvento.map((item) => <option key={item}>{item}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select value={eventoForm.status} onChange={(e) => setEventoForm((a) => ({ ...a, status: e.target.value }))}>
                      <option value="ATIVO">Ativo</option>
                      <option value="PLANEJADO">Planejado</option>
                      <option value="FINALIZADO">Finalizado</option>
                      <option value="CANCELADO">Cancelado</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Data inicial</Label>
                    <Input className={classesCampoInvalido(errosEvento.data_inicio || errosEvento.periodo)} type="date" value={eventoForm.data_inicio} onChange={(e) => setEventoForm((a) => ({ ...a, data_inicio: e.target.value }))} onBlur={validarEventoForm} />
                    <CampoErro texto={errosEvento.data_inicio || errosEvento.periodo} />
                  </div>
                  <div className="space-y-1">
                    <Label>Data final</Label>
                    <Input className={classesCampoInvalido(errosEvento.data_fim || errosEvento.periodo)} type="date" value={eventoForm.data_fim} onChange={(e) => setEventoForm((a) => ({ ...a, data_fim: e.target.value }))} onBlur={validarEventoForm} placeholder="Data final" />
                    <CampoErro texto={errosEvento.data_fim || errosEvento.periodo} />
                  </div>
                  <div className="space-y-1">
                    <Label>Centro de receita</Label>
                    <Input value={eventoForm.centro_receita} onChange={(e) => setEventoForm((a) => ({ ...a, centro_receita: e.target.value }))} placeholder="Centro de receita" />
                  </div>
                  <div className="space-y-1">
                    <Label>Validade do crédito</Label>
                    <Input className={classesCampoInvalido(errosEvento.validade_credito)} type="date" value={eventoForm.validade_credito} onChange={(e) => setEventoForm((a) => ({ ...a, validade_credito: e.target.value }))} onBlur={validarEventoForm} />
                    <CampoErro texto={errosEvento.validade_credito} />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Observações do evento</Label>
                    <Textarea value={eventoForm.observacoes} onChange={(e) => setEventoForm((a) => ({ ...a, observacoes: e.target.value }))} rows={4} placeholder="Observações do evento" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" className="flex-1" onClick={() => void salvarEvento()}><Save className="mr-1.5 h-4 w-4" />Salvar</Button>
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setEventoForm(criarEventoFormPadrao())}>Novo evento</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{barracaForm.id ? "Editar barraca" : "Nova barraca"}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="rounded-xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-3 text-sm text-[var(--g3-muted)]">
                  As barracas cadastradas para o evento selecionado aparecem abaixo para conferência e edição rápida.
                </div>
                {barracasEvento.map((item) => (
                  <button key={item.id} type="button" onClick={() => selecionarBarraca(item)} className="w-full rounded-xl border border-[var(--g3-border)] px-3 py-2 text-left hover:bg-[var(--g3-card-soft)]">
                    <p className="font-semibold">{item.nomeBarraca}</p>
                    <p className="text-sm text-[var(--g3-muted)]">{item.status}</p>
                  </button>
                ))}
                <div className="grid gap-3 pt-2 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Nome da barraca</Label>
                    <Input className={classesCampoInvalido(errosBarraca.nome_barraca)} value={barracaForm.nome_barraca} onChange={(e) => setBarracaForm((a) => ({ ...a, nome_barraca: e.target.value }))} onBlur={validarBarracaForm} placeholder="Nome da barraca" />
                    <CampoErro texto={errosBarraca.nome_barraca} />
                  </div>
                  <div className="space-y-1">
                    <Label>Tipo</Label>
                    <Input value={barracaForm.tipo_barraca} onChange={(e) => setBarracaForm((a) => ({ ...a, tipo_barraca: e.target.value }))} placeholder="Tipo" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" className="flex-1" onClick={() => void salvarBarraca()}><Save className="mr-1.5 h-4 w-4" />Salvar</Button>
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setBarracaForm(criarBarracaFormPadrao())}>Nova barraca</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{itemForm.id ? "Editar item" : "Novo item"}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="rounded-xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-3 text-sm text-[var(--g3-muted)]">
                  Os produtos do evento selecionado ficam listados abaixo com barraca, categoria e preço para melhorar a conferência visual antes da operação.
                </div>
                {itensEvento.map((item) => (
                  <button key={item.id} type="button" onClick={() => selecionarItem(item)} className="w-full rounded-xl border border-[var(--g3-border)] px-3 py-2 text-left hover:bg-[var(--g3-card-soft)]">
                    <p className="font-semibold">{item.nomeItem}</p>
                    <p className="text-sm text-[var(--g3-muted)]">{item.nomeBarraca || "Evento"} · {formatarMoeda(item.preco)}</p>
                  </button>
                ))}
                <div className="grid gap-3 pt-2 md:grid-cols-2">
                  <div className="space-y-1 md:col-span-2">
                    <Label>Nome do produto</Label>
                    <Input className={classesCampoInvalido(errosItem.nome_item)} value={itemForm.nome_item} onChange={(e) => setItemForm((a) => ({ ...a, nome_item: e.target.value }))} onBlur={validarItemForm} placeholder="Nome do produto" />
                    <CampoErro texto={errosItem.nome_item} />
                  </div>
                  <div className="space-y-1">
                    <Label>Barraca</Label>
                    <Select value={itemForm.barraca_id} onChange={(e) => setItemForm((a) => ({ ...a, barraca_id: e.target.value }))}>
                      <option value="">Evento</option>
                      {barracasEvento.map((item) => <option key={item.id} value={item.id}>{item.nomeBarraca}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Categoria</Label>
                    <Select value={itemForm.categoria} onChange={(e) => setItemForm((a) => ({ ...a, categoria: e.target.value }))}>
                      {categoriasItem.map((item) => <option key={item}>{item}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Preço</Label>
                    <Input className={classesCampoInvalido(errosItem.preco)} inputMode="decimal" value={itemForm.preco} onChange={(e) => setItemForm((a) => ({ ...a, preco: e.target.value }))} onBlur={() => { setItemForm((a) => ({ ...a, preco: formatarMoedaInput(a.preco) })); validarItemForm(); }} placeholder="0,00" />
                    <CampoErro texto={errosItem.preco} />
                  </div>
                  <div className="space-y-1">
                    <Label>Estoque</Label>
                    <Input className={classesCampoInvalido(errosItem.estoque)} inputMode="numeric" value={itemForm.estoque} onChange={(e) => setItemForm((a) => ({ ...a, estoque: e.target.value.replace(/\D/g, "") }))} onBlur={validarItemForm} placeholder="Estoque opcional" />
                    <CampoErro texto={errosItem.estoque} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" className="flex-1" onClick={() => void salvarItem()}><Save className="mr-1.5 h-4 w-4" />Salvar</Button>
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setItemForm(criarItemFormPadrao())}>Novo item</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Conferência visual</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Evento em edição</p>
                  <p className="mt-2 text-xl font-black">{eventoForm.nome_evento || "Nome do evento não informado"}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Tipo</p>
                      <p className="mt-1 text-sm font-semibold">{eventoForm.tipo_evento || "---"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Data inicial</p>
                      <p className="mt-1 text-sm font-semibold">{formatarData(eventoForm.data_inicio)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Status</p>
                      <p className="mt-1 text-sm font-semibold">{eventoForm.status || "---"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--g3-border)] p-4">
                  <p className="text-sm font-semibold">Barracas cadastradas</p>
                  <div className="mt-3 space-y-2">
                    {barracasEvento.length ? barracasEvento.map((item) => (
                      <div key={item.id} className="rounded-xl border border-[var(--g3-border)] px-3 py-2">
                        <p className="font-semibold">{item.nomeBarraca}</p>
                        <p className="text-sm text-[var(--g3-muted)]">{item.tipoBarraca || "Tipo não informado"} · {item.status}</p>
                      </div>
                    )) : <p className="text-sm text-[var(--g3-muted)]">Nenhuma barraca cadastrada para este evento.</p>}
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--g3-border)] p-4">
                  <p className="text-sm font-semibold">Produtos cadastrados</p>
                  <div className="mt-3 space-y-2">
                    {itensEvento.length ? itensEvento.map((item) => (
                      <div key={item.id} className="rounded-xl border border-[var(--g3-border)] px-3 py-2">
                        <p className="font-semibold">{item.nomeItem}</p>
                        <p className="text-sm text-[var(--g3-muted)]">{item.nomeBarraca || "Evento"} · {item.categoria}</p>
                        <p className="text-sm font-semibold">{formatarMoeda(item.preco)}</p>
                      </div>
                    )) : <p className="text-sm text-[var(--g3-muted)]">Nenhum produto cadastrado para este evento.</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {abaAtiva === "carteiras" ? (
          <div className="space-y-4">
            {participanteSelecionado ? (
              <Card>
                <CardHeader><CardTitle>Identificação da carteira</CardTitle></CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-4 text-center">
                    {qrCodeUrl ? <img src={qrCodeUrl} alt="QR Code" className="mx-auto h-48 w-48" /> : null}
                    <p className="mt-2 font-semibold">{participanteSelecionado.nome}</p>
                    <p className="text-sm text-[var(--g3-muted)]">Carteira {participanteSelecionado.numeroCarteira}</p>
                    <p className="mt-2 text-xs font-semibold text-[var(--g3-muted)]">QR Code: token seguro</p>
                  </div>
                  <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-4 text-center">
                    {barcodeSvg ? <div className="mx-auto w-full max-w-full overflow-hidden rounded-lg bg-white p-3 [&_svg]:h-auto [&_svg]:max-w-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: barcodeSvg }} /> : null}
                    <p className="mt-2 font-semibold">{participanteSelecionado.nome}</p>
                    <p className="text-sm text-[var(--g3-muted)]">Carteira {participanteSelecionado.numeroCarteira}</p>
                    <p className="text-xs break-all text-[var(--g3-muted)]">Número da carteira: {participanteSelecionado.numeroCarteira}</p>
                    <p className="mt-2 text-xs font-semibold text-[var(--g3-muted)]">Código de barras: número da carteira</p>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-[0.9fr_1fr_1fr]">
              <Card>
                <CardHeader><CardTitle>Carteiras do evento</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {participantes.map((item) => (
                    <button key={item.id} type="button" onClick={() => selecionarParticipante(item)} className={`w-full rounded-xl border px-3 py-2 text-left ${participanteSelecionado?.id === item.id ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)]" : "border-[var(--g3-border)] hover:bg-[var(--g3-card-soft)]"}`}>
                      <p className="font-semibold">{item.nome}</p>
                      <p className="text-sm text-[var(--g3-muted)]">Carteira {item.numeroCarteira} · {formatarMoeda(item.saldoAtual)}</p>
                      <p className="text-xs text-[var(--g3-muted)]">{formatarTelefone(item.telefone) || "Telefone não informado"}{item.cpf ? ` · CPF ${formatarCpf(item.cpf)}` : ""}</p>
                    </button>
                  ))}
                  <div className="grid gap-3 pt-2">
                    <div className="space-y-1">
                      <Label>Nome</Label>
                      <Input className={classesCampoInvalido(errosParticipante.nome)} value={participanteForm.nome} onChange={(e) => setParticipanteForm((a) => ({ ...a, nome: e.target.value }))} onBlur={() => setErrosParticipante((atual) => ({ ...atual, nome: validarCampoParticipante("nome", participanteForm.nome) }))} placeholder="Nome" />
                      <CampoErro texto={errosParticipante.nome} />
                    </div>
                    <div className="space-y-1">
                      <Label>Telefone</Label>
                      <Input className={classesCampoInvalido(errosParticipante.telefone)} value={mascararTelefoneInput(participanteForm.telefone)} onChange={(e) => setParticipanteForm((a) => ({ ...a, telefone: e.target.value }))} onBlur={() => setErrosParticipante((atual) => ({ ...atual, telefone: validarCampoParticipante("telefone", participanteForm.telefone) }))} placeholder="(00) 00000-0000" />
                      <CampoErro texto={errosParticipante.telefone} />
                    </div>
                    <div className="space-y-1">
                      <Label>CPF</Label>
                      <Input className={classesCampoInvalido(errosParticipante.cpf)} value={mascararCpfInput(participanteForm.cpf)} onChange={(e) => setParticipanteForm((a) => ({ ...a, cpf: e.target.value }))} onBlur={() => setErrosParticipante((atual) => ({ ...atual, cpf: validarCampoParticipante("cpf", participanteForm.cpf) }))} placeholder="000.000.000-00" />
                      <CampoErro texto={errosParticipante.cpf} />
                    </div>
                    <Button type="button" onClick={() => void salvarParticipante()}><Save className="mr-1.5 h-4 w-4" />Salvar carteira</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>QR Code, código de barras, saldo e recarga</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {participanteSelecionado ? (
                    <>
                      <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-4 text-center">
                        {qrCodeUrl ? <img src={qrCodeUrl} alt="QR Code" className="mx-auto h-40 w-40" /> : null}
                        {barcodeSvg ? <div className="mt-4 w-full overflow-hidden rounded-lg bg-white p-3 [&_svg]:h-auto [&_svg]:max-w-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: barcodeSvg }} /> : null}
                        <p className="mt-2 font-semibold">{participanteSelecionado.nome}</p>
                        <p className="text-sm text-[var(--g3-muted)]">Carteira {participanteSelecionado.numeroCarteira}</p>
                        <Button type="button" variant="outline" className="mt-3 w-full" onClick={imprimirCartaoQr}>
                          Imprimir cartão/comanda
                        </Button>
                      </div>
                      <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Consulta de saldo</p>
                        <div className="mt-3 space-y-2">
                          <Select value={consultaSaldoId} onChange={(e) => setConsultaSaldoId(e.target.value)}>
                            <option value="">Selecione a carteira</option>
                            {participantes.map((item) => <option key={item.id} value={item.id}>{item.nome} · {item.numeroCarteira}</option>)}
                          </Select>
                          {participanteSaldoConsulta ? (
                            <div className="rounded-xl border border-[var(--g3-border)] bg-white px-3 py-3">
                              <p className="font-semibold">{participanteSaldoConsulta.nome}</p>
                              <p className="text-sm text-[var(--g3-muted)]">Carteira {participanteSaldoConsulta.numeroCarteira}</p>
                              <p className="mt-2 text-2xl font-black text-[var(--g3-active)]">{formatarMoeda(participanteSaldoConsulta.saldoAtual)}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-[var(--g3-muted)]">Selecione um participante para consultar o saldo atual da carteira.</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Valor da recarga</Label>
                        <Input className={classesCampoInvalido(errosOperacao.recargaValor)} inputMode="decimal" value={recargaValor} onChange={(e) => setRecargaValor(formatarMoedaInput(e.target.value))} onBlur={validarRecargaForm} placeholder="0,00" />
                        <CampoErro texto={errosOperacao.recargaValor} />
                        <Select value={recargaForma} onChange={(e) => setRecargaForma(e.target.value)}>
                          {formasRecarga.map((item) => <option key={item}>{item}</option>)}
                        </Select>
                        <Button type="button" onClick={() => void executarRecarga()}>Registrar recarga</Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-[var(--g3-muted)]">Selecione uma carteira.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Ajuste, transferência e extrato</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {participanteSelecionado ? (
                    <>
                      <Select value={ajusteTipo} onChange={(e) => setAjusteTipo(e.target.value)}>
                        <option value="CREDITO">CREDITO</option>
                        <option value="DEBITO">DEBITO</option>
                        <option value="ESTORNO">ESTORNO</option>
                      </Select>
                      <Input className={classesCampoInvalido(errosOperacao.ajusteValor)} inputMode="decimal" value={ajusteValor} onChange={(e) => setAjusteValor(formatarMoedaInput(e.target.value))} onBlur={validarAjusteForm} placeholder="Valor do ajuste" />
                      <CampoErro texto={errosOperacao.ajusteValor} />
                      <Textarea className={classesCampoInvalido(errosOperacao.ajusteMotivo)} value={ajusteMotivo} onChange={(e) => setAjusteMotivo(e.target.value)} onBlur={validarAjusteForm} rows={2} placeholder="Motivo do ajuste" />
                      <CampoErro texto={errosOperacao.ajusteMotivo} />
                      <Button type="button" variant="outline" onClick={() => void executarAjuste()}>Aplicar ajuste</Button>
                      <Select className={classesCampoInvalido(errosOperacao.transferenciaDestinoId)} value={transferenciaDestinoId} onChange={(e) => setTransferenciaDestinoId(e.target.value)} onBlur={validarTransferenciaForm}>
                        <option value="">Carteira destino</option>
                        {participantes.filter((item) => item.id !== participanteSelecionado.id).map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                      </Select>
                      <CampoErro texto={errosOperacao.transferenciaDestinoId} />
                      <Input className={classesCampoInvalido(errosOperacao.transferenciaValor)} inputMode="decimal" value={transferenciaValor} onChange={(e) => setTransferenciaValor(formatarMoedaInput(e.target.value))} onBlur={validarTransferenciaForm} placeholder="Valor da transferência" />
                      <CampoErro texto={errosOperacao.transferenciaValor} />
                      <Input className={classesCampoInvalido(errosOperacao.transferenciaMotivo)} value={transferenciaMotivo} onChange={(e) => setTransferenciaMotivo(e.target.value)} onBlur={validarTransferenciaForm} placeholder="Motivo da transferência" />
                      <CampoErro texto={errosOperacao.transferenciaMotivo} />
                      <Button type="button" variant="outline" onClick={() => void executarTransferencia()}>Transferir crédito</Button>
                      <div className="space-y-2 pt-2">
                        {extrato.slice(0, 6).map((item) => (
                          <div key={item.id} className="rounded-xl border border-[var(--g3-border)] px-3 py-2">
                            <p className="font-semibold">{item.tipoMovimentacao}</p>
                            <p className="text-sm text-[var(--g3-muted)]">{item.descricao || item.motivo}</p>
                            <p className="text-sm font-bold">{formatarMoeda(item.valor)} · saldo {formatarMoeda(item.saldoPosterior)}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}

        {abaAtiva === "operacao" ? (
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader><CardTitle>Consulta da carteira</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Select
                  value={String(barracaOperacaoId || "")}
                  onChange={(e) => {
                    const novaBarracaId = Number(e.target.value || 0);
                    if (itensVenda.length && novaBarracaId !== barracaOperacaoId) {
                      setItensVenda([]);
                    }
                    setBarracaOperacaoId(novaBarracaId);
                  }}
                >
                  <option value="">Barraca / ponto de venda</option>
                  {barracasEvento.map((item) => <option key={item.id} value={item.id}>{item.nomeBarraca}</option>)}
                </Select>
                <Input value={tokenOperacao} onChange={(e) => setTokenOperacao(e.target.value)} placeholder="Token do QR Code ou número da carteira" />
                <div className="flex gap-2">
                  <Button type="button" onClick={() => void consultarCarteiraOperacao()}>Consultar</Button>
                  <Button type="button" variant="outline" onClick={() => { setCarteiraOperacao(null); setTokenOperacao(""); setItensVenda([]); setUltimaVenda(null); }}>Limpar</Button>
                </div>
                <div className="rounded-xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-3 text-sm text-[var(--g3-muted)]">
                  {barracaOperacaoId
                    ? "Barraca ativa selecionada. Ao trocar a barraca, a compra atual e limpa para evitar mistura de itens."
                    : "Selecione a barraca primeiro ou toque em um item vinculado a uma barraca para o sistema assumir essa barraca automaticamente."}
                </div>
                {carteiraOperacao ? <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-4"><p className="text-sm text-[var(--g3-muted)]">Participante</p><p className="text-xl font-black">{carteiraOperacao.nome}</p><p className="mt-2 text-3xl font-black text-[var(--g3-active)]">{formatarMoeda(carteiraOperacao.saldoAtual)}</p></div> : null}
                <div className="rounded-xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-3 text-sm text-[var(--g3-muted)]">Operação preparada para celular e desktop. O token manual funciona imediatamente. A leitura por câmera pode ser conectada ao detector nativo do navegador em ambiente compatível.</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Itens e fechamento da compra</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 md:grid-cols-2">
                  {itensOperacao.map((item) => <button key={item.id} type="button" onClick={() => alternarItemVenda(item)} className="rounded-xl border border-[var(--g3-border)] px-3 py-3 text-left hover:bg-[var(--g3-card-soft)]"><p className="font-semibold">{item.nomeItem}</p><p className="text-sm text-[var(--g3-muted)]">{item.nomeBarraca || "Evento"}</p><p className="text-lg font-black">{formatarMoeda(item.preco)}</p></button>)}
                </div>
                <div className="rounded-xl border border-[var(--g3-border)] p-4">
                  <div className="space-y-2">
                    {itensVenda.length ? itensVenda.map((registro) => <div key={registro.item.id} className="flex items-center justify-between rounded-xl border border-[var(--g3-border)] px-3 py-2"><span>{registro.item.nomeItem} · {registro.quantidade}</span><span className="font-black">{formatarMoeda(registro.item.preco * registro.quantidade)}</span></div>) : <p className="text-sm text-[var(--g3-muted)]">Nenhum item selecionado.</p>}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-[var(--g3-border)] pt-3"><span className="font-semibold">Total</span><span className="text-3xl font-black">{formatarMoeda(subtotalVenda)}</span></div>
                  <Button type="button" className="mt-3 w-full" onClick={() => void confirmarVenda()}>Confirmar débito</Button>
                </div>
                {ultimaVenda ? <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)] p-4"><p className="font-semibold">Venda concluída</p><p className="text-sm text-[var(--g3-muted)]">{ultimaVenda.participanteNome} · {ultimaVenda.barracaNome}</p><p className="mt-2 text-2xl font-black">{formatarMoeda(ultimaVenda.valorTotal)}</p><p className="text-sm font-semibold">Saldo atual: {formatarMoeda(ultimaVenda.saldoDepois)}</p></div> : null}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {abaAtiva === "fechamento" && fechamento ? <div className="grid gap-4 xl:grid-cols-2"><Card><CardHeader><CardTitle>Resumo do fechamento</CardTitle></CardHeader><CardContent className="space-y-2">{[["Total carregado", Number(fechamento.totalCarregadoEmCredito ?? 0)], ["Total consumido", Number(fechamento.totalConsumidoEmCredito ?? 0)], ["Saldo remanescente", Number(fechamento.saldoRemanescente ?? 0)], ["Divergências", Number(fechamento.divergencias ?? 0)]].map(([titulo, valor]) => <div key={String(titulo)} className="flex items-center justify-between rounded-xl border border-[var(--g3-border)] px-4 py-3"><span className="font-semibold">{titulo}</span><span className="font-black">{formatarMoeda(Number(valor))}</span></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Operadores</CardTitle></CardHeader><CardContent className="space-y-2">{Array.isArray(fechamento.relatorioPorOperador) ? (fechamento.relatorioPorOperador as Array<any>).map((item) => <div key={item.operador} className="flex items-center justify-between rounded-xl border border-[var(--g3-border)] px-4 py-3"><span className="font-semibold">{item.operador}</span><span className="font-black">{formatarMoeda(Number(item.total ?? 0))}</span></div>) : null}</CardContent></Card></div> : null}
      </section>
      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
      {carregando ? <div className="fixed bottom-4 right-4 rounded-full bg-[var(--g3-primary)] px-4 py-2 text-sm font-semibold text-white shadow-lg">Atualizando carteira digital...</div> : null}
    </AdminPageLayout>
  );
}
