import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import type { ChangeEvent, KeyboardEvent } from "react";
import {
  BookOpenCheck,
  CalendarClock,
  Check,
  ClipboardList,
  ClipboardPenLine,
  Copy,
  Mail,
  MessageCircle,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  Upload,
  Undo2,
  UserPlus,
  Users,
  X
} from "lucide-react";
import { PopupConfirmacao } from "@/components/admin/admin-popups";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  diasSemanaOptions,
  faixaEtariaOptions,
  matriculaDefaultValues,
  matriculaFormSchema,
  matriculaSexoPermitidoOptions,
  matriculaStatusOptions,
  matriculaTipoOptions,
  statusAgendamentoOptions,
  statusInscricaoOptions,
  type MatriculaFormInput,
  type MatriculaFormValues
} from "@/features/matriculas/matricula.schema";
import {
  useMatricula,
  useMatriculas,
  useRemoverMatricula,
  useSalvarMatricula
} from "@/features/matriculas/use-matriculas";
import { reportsService } from "@/services/reports.service";
import { matriculasService } from "@/services/matriculas.service";
import { arquivosService } from "@/services/arquivos.service";
import { obterUrlArquivoAutenticado, resolverUrlArquivo } from "@/lib/arquivos";
import { abrirRelatorioPdf } from "@/lib/report-utils";
import { formatarTextoPadrao, formatarTextoPorCampo } from "@/lib/text-formatter";
import { mapaCamposTextoMatriculaForm } from "@/lib/text-format-config";
import { fotoMaximaBytes, lerArquivoComoDataUrl } from "@/lib/foto-3x4";
import { somenteDigitos, validarCpf } from "@/lib/validators";
import {
  classeBotaoAbaLateral,
  classeNumeroAbaLateral,
  classesTelaPadraoBeneficiario
} from "@/lib/tela-padrao-beneficiario";
import { useAuth } from "@/hooks/use-auth";
import type {
  Matricula,
  MatriculaBeneficiarioCatalogo,
  MatriculaFilaEspera,
  MatriculaFiltro,
  MatriculaInscricao,
  MatriculaPresencaData,
  MatriculaPresencaStatus,
  MatriculaProfissionalCatalogo,
  MatriculaSalaCatalogo
} from "@/types/matricula";
import { PreInscricoesPage } from "@/pages/portal-inscricoes/pre-inscricoes-page";

const abas = [
  { id: "listagem", label: "Listagem de inscrições", icon: Search },
  { id: "dados", label: "Dados da inscrição", icon: BookOpenCheck },
  { id: "catalogo", label: "Catálogo e vagas", icon: CalendarClock },
  { id: "inscricoes", label: "Inscrições e lista de espera", icon: UserPlus },
  { id: "pre-inscricoes", label: "Pré-inscrições", icon: ClipboardPenLine },
  { id: "presenca", label: "Confirmar presença", icon: Users }
] as const;

type AbaId = "listagem" | "dados" | "catalogo" | "inscricoes" | "pre-inscricoes" | "presenca";

type AcaoCrud = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant: "default" | "outline" | "danger" | "ghost";
  disabled?: boolean;
};

type PopupMensagemState = {
  tipo: "sucesso" | "erro" | "aviso";
  titulo: string;
  texto: string;
};

const secaoTela = "Atendimentos diários";
const tituloTela = "Inscrições em cursos e atendimentos";

function formatarStatus(status?: string) {
  if (!status) return "Não informado";
  const texto = status.toLowerCase().replaceAll("_", " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatarData(data?: string) {
  if (!data) return "---";
  const texto = String(data).trim();
  const matchIso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) {
    const [, ano, mes, dia] = matchIso;
    return `${dia}/${mes}/${ano}`;
  }
  const parsed = new Date(texto);
  if (Number.isNaN(parsed.getTime())) return data;
  return parsed.toLocaleDateString("pt-BR");
}

function formatarCpf(cpf?: string) {
  if (!cpf) return "---";
  const digitos = somenteDigitos(cpf);
  if (digitos.length !== 11) return cpf;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

function formatarTelefone(telefone?: string) {
  if (!telefone) return "---";
  const digitos = somenteDigitos(telefone);
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return telefone;
}

function chavePresenca(matriculaId?: string | number | null) {
  return String(matriculaId ?? "").trim();
}

function obterPrimeiroNome(nome?: string) {
  const texto = formatarTextoPadrao(nome ?? "");
  if (!texto) return "---";
  return texto.split(/\s+/)[0] ?? texto;
}

function formatarPeriodoCurso(dataInicial?: string, dataFinal?: string) {
  if (!dataInicial && !dataFinal) return "---";
  return `${formatarData(dataInicial)} a ${formatarData(dataFinal)}`;
}

function normalizarListaProfissionais(valor?: string) {
  const itens = String(valor ?? "")
    .split(/[;,]/g)
    .map((item) => formatarTextoPadrao(item))
    .filter((item) => item.length > 0);

  const unicos: string[] = [];
  itens.forEach((item) => {
    const itemNormalizado = item.toLocaleLowerCase("pt-BR");
    if (!unicos.some((atual) => atual.toLocaleLowerCase("pt-BR") === itemNormalizado)) {
      unicos.push(item);
    }
  });

  return unicos;
}

function obterProfissionalUnico(valor?: string) {
  const lista = normalizarListaProfissionais(valor);
  if (lista.length > 0) return lista[0];
  return formatarTextoPadrao(valor ?? "");
}

function obterDataAtualIso() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function somarDiasDataIso(dataIso: string, dias: number) {
  const [ano, mes, dia] = dataIso.split("-").map((parte) => Number(parte));
  const data = new Date(ano, (mes || 1) - 1, dia || 1);
  if (Number.isNaN(data.getTime())) return dataIso;
  data.setDate(data.getDate() + dias);
  const novoAno = data.getFullYear();
  const novoMes = String(data.getMonth() + 1).padStart(2, "0");
  const novoDia = String(data.getDate()).padStart(2, "0");
  return `${novoAno}-${novoMes}-${novoDia}`;
}

function normalizarTelefoneWhatsapp(telefone?: string) {
  const digitos = somenteDigitos(telefone);
  if (!digitos) return undefined;
  if (digitos.startsWith("55") && digitos.length >= 12) return digitos;
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos.length >= 12 ? digitos : undefined;
}

function emailValido(email?: string) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function normalizarDataIso(valor?: string) {
  if (!valor) return undefined;
  const texto = valor.trim();
  if (!texto) return undefined;
  const match = texto.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : undefined;
}

function normalizarHora(valor?: string) {
  if (!valor) return undefined;
  const texto = valor.trim();
  if (!texto) return undefined;
  const match = texto.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : undefined;
}

function calcularHorariosAtendimento(horarioInicial?: string, horarioFinal?: string, intervalo?: number) {
  const inicio = normalizarHora(horarioInicial);
  const fim = normalizarHora(horarioFinal);
  const intervaloMinutos = Number(intervalo ?? 0);
  if (!inicio || !fim || !Number.isInteger(intervaloMinutos) || intervaloMinutos <= 0) return [];

  const [horaInicial, minutoInicial] = inicio.split(":").map(Number);
  const [horaFinal, minutoFinal] = fim.split(":").map(Number);
  const inicioMinutos = horaInicial * 60 + minutoInicial;
  const fimMinutos = horaFinal * 60 + minutoFinal;
  if (fimMinutos <= inicioMinutos) return [];

  const horarios: string[] = [];
  for (let minuto = inicioMinutos; minuto + intervaloMinutos <= fimMinutos; minuto += intervaloMinutos) {
    horarios.push(`${String(Math.floor(minuto / 60)).padStart(2, "0")}:${String(minuto % 60).padStart(2, "0")}`);
  }
  return horarios;
}

function normalizarEmailOpcional(email?: string) {
  const valor = email?.trim().toLowerCase();
  if (!valor) return undefined;
  return emailValido(valor) ? valor : undefined;
}

function normalizarIdNumericoOpcional(valor?: string) {
  const texto = valor?.trim();
  if (!texto) return undefined;
  return /^\d+$/.test(texto) ? texto : undefined;
}

function normalizarNomeComparacaoTexto(valor?: string) {
  return formatarTextoPadrao(valor ?? "").toLocaleLowerCase("pt-BR");
}

function normalizarStatusAgendamentoParaReagendar(status?: string) {
  return (status ?? "AGUARDANDO").trim().toUpperCase() === "CONFIRMADO" ? "AGUARDANDO" : status;
}

function montarChaveAgenda(item: MatriculaInscricao, dataAgenda: string) {
  const chaveBeneficiario = somenteDigitos(item.cpf) || normalizarNomeComparacaoTexto(item.beneficiario_nome);
  const hora = String(item.hora_agendada ?? "").trim() || "__SEM_HORA__";
  const profissional = normalizarNomeComparacaoTexto(item.profissional_nome);
  return `${chaveBeneficiario}|${dataAgenda}|${hora}|${profissional}`;
}

function normalizarStatusMatricula(status?: string) {
  const statusAtual = status?.trim().toUpperCase();
  if (!statusAtual) return "ATIVO";
  if (statusAtual === "FINALIZADO" || statusAtual === "CANCELADO" || statusAtual === "ATIVO") {
    return statusAtual;
  }
  if (statusAtual === "CONCLUIDO" || statusAtual === "CONCLUÍDO") {
    return "FINALIZADO";
  }
  return "ATIVO";
}

function mapMatriculaParaFormulario(matricula: Matricula): MatriculaFormValues {
  return {
    ...matriculaDefaultValues,
    ...matricula,
    id_matricula: matricula.id_matricula,
    imagem: matricula.imagem ?? "",
    dias_semana: matricula.dias_semana ?? [],
    faixa_etaria: matricula.faixa_etaria ?? [],
    unidade_id: matricula.unidade_id ?? "",
    sala_id: matricula.sala_id ?? "",
    descricao: matricula.descricao ?? "",
    restricoes: matricula.restricoes ?? "",
    profissional: matricula.profissional ?? "",
    instituicao_parceira: matricula.instituicao_parceira ?? "",
    status: normalizarStatusMatricula(matricula.status),
    horario_inicial: matricula.horario_inicial ?? "",
    controle_horario_atendimento: !!matricula.controle_horario_atendimento,
    horario_final_atendimento: matricula.horario_final_atendimento ?? "",
    intervalo_atendimento_minutos: matricula.intervalo_atendimento_minutos,
    data_triagem: matricula.data_triagem ?? "",
    data_encaminhamento: matricula.data_encaminhamento ?? "",
    data_conclusao: matricula.data_conclusao ?? ""
  };
}

function mapFormularioParaPayload(
  values: MatriculaFormValues,
  inscricoes: MatriculaInscricao[],
  filaEspera: MatriculaFilaEspera[]
): Matricula {
  const inscricoesNormalizadas = inscricoes.map(({ telefone: _telefoneIgnorado, ...item }) => ({
    ...item,
    beneficiario_nome: formatarTextoPadrao(item.beneficiario_nome),
    cpf: somenteDigitos(item.cpf) || undefined,
    email: normalizarEmailOpcional(item.email),
    status: item.status?.trim() || undefined,
    data_matricula: normalizarDataIso(item.data_matricula),
    data_agendada: normalizarDataIso(item.data_agendada),
    hora_agendada: normalizarHora(item.hora_agendada),
    status_agendamento: item.status_agendamento?.trim() || undefined,
    profissional_nome: item.profissional_nome ? formatarTextoPadrao(item.profissional_nome) : undefined
  }));

  const filaEsperaNormalizada = filaEspera.map(({ telefone: _telefoneIgnorado, ...item }) => ({
    ...item,
    beneficiario_nome: formatarTextoPadrao(item.beneficiario_nome),
    cpf: somenteDigitos(item.cpf) || undefined,
    data_entrada: normalizarDataIso(item.data_entrada)
  }));

  return {
    id_matricula: values.id_matricula,
    tipo: values.tipo.trim(),
    nome: values.nome.trim(),
    imagem: values.imagem?.trim() || undefined,
    descricao: values.descricao?.trim() || undefined,
    vagas_totais: Number(values.vagas_totais) || 0,
    vagas_disponiveis:
      values.vagas_disponiveis === undefined || values.vagas_disponiveis === null
        ? undefined
        : Number(values.vagas_disponiveis),
    carga_horaria:
      values.carga_horaria === undefined || values.carga_horaria === null
        ? undefined
        : Number(values.carga_horaria),
    horario_inicial: values.horario_inicial?.trim() || undefined,
    controle_horario_atendimento: values.tipo.trim().toUpperCase() === "ATENDIMENTO" && !!values.controle_horario_atendimento,
    horario_final_atendimento: values.horario_final_atendimento?.trim() || undefined,
    intervalo_atendimento_minutos:
      values.intervalo_atendimento_minutos === undefined || values.intervalo_atendimento_minutos === null
        ? undefined
        : Number(values.intervalo_atendimento_minutos),
    duracao_horas: Number(values.duracao_horas) || 0,
    dias_semana: values.dias_semana ?? [],
    faixa_etaria: values.faixa_etaria ?? [],
    vaga_preferencial_idosos: !!values.vaga_preferencial_idosos,
    sexo_permitido: values.sexo_permitido?.trim() || undefined,
    restricoes: values.restricoes?.trim() || undefined,
    profissional: values.profissional?.trim() || undefined,
    instituicao_parceira: values.instituicao_parceira?.trim() || undefined,
    sala_id: normalizarIdNumericoOpcional(values.sala_id),
    status: values.status.trim(),
    data_triagem: values.data_triagem?.trim() || undefined,
    data_encaminhamento: values.data_encaminhamento?.trim() || undefined,
    data_conclusao: values.data_conclusao?.trim() || undefined,
    matriculas: inscricoesNormalizadas,
    fila_espera: filaEsperaNormalizada
  };
}

function PopupMensagem({ popup, onClose }: { popup: PopupMensagemState; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <h3
            className={`text-base font-semibold ${
              popup.tipo === "sucesso"
                ? "text-emerald-800"
                : popup.tipo === "erro"
                  ? "text-rose-700"
                  : "text-amber-700"
            }`}
          >
            {popup.titulo}
          </h3>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-slate-700">{popup.texto}</p>
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

function ImagemAutenticada({
  valor,
  fallbackValor,
  alt,
  className,
  placeholder = "Sem foto"
}: {
  valor?: string | null;
  fallbackValor?: string | null;
  alt: string;
  className?: string;
  placeholder?: string;
}) {
  const [url, setUrl] = useState("");
  const [falhou, setFalhou] = useState(false);
  const [fonteAtual, setFonteAtual] = useState("");

  useEffect(() => {
    setFalhou(false);
    setFonteAtual(valor?.trim() ?? fallbackValor?.trim() ?? "");
  }, [valor, fallbackValor]);

  useEffect(() => {
    let ativo = true;
    let revokeAtual: (() => void) | undefined;
    const imagem = fonteAtual.trim();
    const fallback = fallbackValor?.trim() ?? "";

    setUrl("");

    if (!imagem) {
      return () => {
        revokeAtual?.();
      };
    }

    if (imagem.startsWith("data:") || imagem.startsWith("blob:") || /^https?:\/\//i.test(imagem)) {
      setUrl(imagem);
      return () => {
        revokeAtual?.();
      };
    }

    void (async () => {
      try {
        const arquivo = await obterUrlArquivoAutenticado(imagem, { cache: true, auditar: false });
        if (!ativo) {
          arquivo.revoke?.();
          return;
        }

        revokeAtual = arquivo.revoke;
        setUrl(arquivo.url || resolverUrlArquivo(imagem));
      } catch {
        if (!ativo) return;
        if (fallback && imagem !== fallback) {
          setFonteAtual(fallback);
          return;
        }
        setUrl("");
        setFalhou(true);
      }
    })();

    return () => {
      ativo = false;
      revokeAtual?.();
    };
  }, [fonteAtual, fallbackValor]);

  if (!url || falhou) {
    return <span className="px-2 text-center text-[10px] text-[var(--g3-muted)]">{placeholder}</span>;
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => {
        const fallback = fallbackValor?.trim() ?? "";
        if (fallback && fonteAtual !== fallback) {
          setFalhou(false);
          setFonteAtual(fallback);
          return;
        }

        setFalhou(true);
      }}
    />
  );
}

export function CadastroMatriculasPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { usuario } = useAuth();
  const abaInicial = searchParams.get("aba") === "dados" ? "dados" : searchParams.get("aba") === "pre-inscricoes" ? "pre-inscricoes" : "listagem";
  const [abaAtiva, setAbaAtiva] = useState<AbaId>(abaInicial);
  const [idSelecionado, setIdSelecionado] = useState<string>();
  const [snapshot, setSnapshot] = useState<MatriculaFormValues | null>(null);
  const [popupMensagem, setPopupMensagem] = useState<PopupMensagemState | null>(null);
  const [popupExcluirAberto, setPopupExcluirAberto] = useState(false);
  const [popupExcluirPresencaAberto, setPopupExcluirPresencaAberto] = useState(false);
  const [filtroDraft, setFiltroDraft] = useState<MatriculaFiltro>({
    nome: "",
    tipo: "",
    status: "",
    profissional: "",
    beneficiario: "",
    unidade_id: "",
    sala_id: ""
  });
  const [filtros, setFiltros] = useState<MatriculaFiltro>(filtroDraft);
  const [filtroStatusAgendamentoRapido, setFiltroStatusAgendamentoRapido] = useState<"" | "AGENDADO" | "PENDENTE" | "CANCELADA" | "FINALIZADA">("");
  const [inscricoes, setInscricoes] = useState<MatriculaInscricao[]>([]);
  const [filaEspera, setFilaEspera] = useState<MatriculaFilaEspera[]>([]);
  const [novaInscricao, setNovaInscricao] = useState<MatriculaInscricao>({
    beneficiario_nome: "",
    cpf: "",
    email: "",
    status: "ATIVO",
    data_agendada: "",
    hora_agendada: "",
    status_agendamento: "",
    profissional_nome: "",
    confirmacao_presenca: false
  });
  const [inscricaoEditandoIndex, setInscricaoEditandoIndex] = useState<number | null>(null);
  const [novoFilaEspera, setNovoFilaEspera] = useState<MatriculaFilaEspera>({
    beneficiario_nome: "",
    cpf: "",
    telefone: ""
  });
  const [termoCatalogoBeneficiario, setTermoCatalogoBeneficiario] = useState("");
  const [mostrarSugestoesBeneficiarioInscricao, setMostrarSugestoesBeneficiarioInscricao] = useState(false);
  const [termoCatalogoFilaEspera, setTermoCatalogoFilaEspera] = useState("");
  const [mostrarSugestoesFilaEspera, setMostrarSugestoesFilaEspera] = useState(false);
  const [termoCatalogoProfissional, setTermoCatalogoProfissional] = useState("");
  const [termoCatalogoProfissionalResponsavel, setTermoCatalogoProfissionalResponsavel] = useState("");
  const [mostrarSugestoesProfissionalResponsavel, setMostrarSugestoesProfissionalResponsavel] = useState(false);
  const [termoCatalogoAgendaProfissional, setTermoCatalogoAgendaProfissional] = useState("");
  const [mostrarSugestoesAgendaProfissional, setMostrarSugestoesAgendaProfissional] = useState(false);
  const [termoAgendaBeneficiario, setTermoAgendaBeneficiario] = useState("");
  const [mostrarSugestoesAgendaBeneficiario, setMostrarSugestoesAgendaBeneficiario] = useState(false);
  const [inscricoesAgendaSelecionadas, setInscricoesAgendaSelecionadas] = useState<string[]>([]);
  const [profissionaisAtendimentoSelecionados, setProfissionaisAtendimentoSelecionados] = useState<string[]>([]);
  const [agendaDataSelecionada, setAgendaDataSelecionada] = useState("");
  const [agendaStatusFiltro, setAgendaStatusFiltro] = useState("");
  const [agendaProfissionalFiltro, setAgendaProfissionalFiltro] = useState("");
  const [agendaCopiaOrigem, setAgendaCopiaOrigem] = useState("");
  const [agendaCopiaDestino, setAgendaCopiaDestino] = useState("");
  const [dataEnviandoLembreteEmail, setDataEnviandoLembreteEmail] = useState<string | null>(null);
  const [agendaForm, setAgendaForm] = useState({
    chave_inscricao: "",
    data_agendada: obterDataAtualIso(),
    hora_agendada: "",
    profissional_nome: "",
    status_agendamento: "AGUARDANDO"
  });
  const [presencaDatas, setPresencaDatas] = useState<MatriculaPresencaData[]>([]);
  const [presencaDataSelecionada, setPresencaDataSelecionada] = useState<MatriculaPresencaData | null>(null);
  const [presencasPorMatricula, setPresencasPorMatricula] = useState<Record<string, MatriculaPresencaStatus>>({});
  const [presencasSalvasPorMatricula, setPresencasSalvasPorMatricula] = useState<Record<string, MatriculaPresencaStatus>>({});
  const [presencasObservacoesPorMatricula, setPresencasObservacoesPorMatricula] = useState<Record<string, string>>({});
  const [dataPresencaSelecionada, setDataPresencaSelecionada] = useState(obterDataAtualIso);
  const [presencaObservacoes, setPresencaObservacoes] = useState("");
  const [presencaExibirCpf, setPresencaExibirCpf] = useState(true);
  const [presencaCarregando, setPresencaCarregando] = useState(false);
  const [presencaSalvando, setPresencaSalvando] = useState(false);
  const [presencaExcluindo, setPresencaExcluindo] = useState(false);
  const [presencaPendente, setPresencaPendente] = useState(false);
  const [presencaAlteracaoPendente, setPresencaAlteracaoPendente] = useState<{
    matriculaId: string;
    status: MatriculaPresencaStatus;
    beneficiarioNome: string;
  } | null>(null);
  const [senhaConfirmacaoPresenca, setSenhaConfirmacaoPresenca] = useState("");
  const [presencaListaAutorizada, setPresencaListaAutorizada] = useState<string | null>(null);
  const [presencaValidandoSenha, setPresencaValidandoSenha] = useState(false);
  const [presencaErroSenha, setPresencaErroSenha] = useState("");
  const [imagemCursoArquivo, setImagemCursoArquivo] = useState<File | null>(null);
  const [salvandoImagemCurso, setSalvandoImagemCurso] = useState(false);
  const inputImagemRef = useRef<HTMLInputElement | null>(null);

  const { data: listaData, isLoading: carregandoLista, isFetching: atualizandoLista } = useMatriculas(filtros);
  const { data: catalogoData, isLoading: carregandoCatalogo } = useMatriculas({});
  const { data: detalhesData, isLoading: carregandoDetalhes } = useMatricula(idSelecionado);
  const salvarMutation = useSalvarMatricula();
  const removerMutation = useRemoverMatricula();

  const { data: salasData } = useQuery({
    queryKey: ["matriculas", usuario?.tenant_id ?? "sem-tenant", "catalogo-salas"],
    queryFn: () => matriculasService.listarSalas(),
    enabled: !!usuario
  });

  const { data: beneficiariosCatalogoData, isFetching: carregandoBeneficiariosCatalogo } = useQuery({
    queryKey: ["matriculas", usuario?.tenant_id ?? "sem-tenant", "catalogo-beneficiarios", termoCatalogoBeneficiario],
    queryFn: () => matriculasService.listarBeneficiarios(termoCatalogoBeneficiario),
    enabled: !!usuario && termoCatalogoBeneficiario.trim().length >= 2
  });
  const { data: beneficiariosFilaCatalogoData, isFetching: carregandoBeneficiariosFilaCatalogo } = useQuery({
    queryKey: ["matriculas", usuario?.tenant_id ?? "sem-tenant", "catalogo-beneficiarios-fila", termoCatalogoFilaEspera],
    queryFn: () => matriculasService.listarBeneficiarios(termoCatalogoFilaEspera),
    enabled: !!usuario && termoCatalogoFilaEspera.trim().length >= 2
  });

  const { data: profissionaisCatalogoData } = useQuery({
    queryKey: ["matriculas", usuario?.tenant_id ?? "sem-tenant", "catalogo-profissionais", termoCatalogoProfissional],
    queryFn: () => matriculasService.listarProfissionais(termoCatalogoProfissional),
    enabled: !!usuario
  });

  const { data: profissionaisResponsavelCatalogoData, isFetching: carregandoProfissionaisResponsavelCatalogo } = useQuery({
    queryKey: ["matriculas", usuario?.tenant_id ?? "sem-tenant", "catalogo-profissionais-responsavel", termoCatalogoProfissionalResponsavel],
    queryFn: () => matriculasService.listarProfissionais(termoCatalogoProfissionalResponsavel),
    enabled: !!usuario && termoCatalogoProfissionalResponsavel.trim().length >= 2
  });
  const { data: profissionaisAgendaCatalogoData, isFetching: carregandoProfissionaisAgendaCatalogo } = useQuery({
    queryKey: ["matriculas", usuario?.tenant_id ?? "sem-tenant", "catalogo-profissionais-agenda", termoCatalogoAgendaProfissional],
    queryFn: () => matriculasService.listarProfissionais(termoCatalogoAgendaProfissional),
    enabled: !!usuario && termoCatalogoAgendaProfissional.trim().length >= 2
  });

  const {
    register,
    reset,
    setValue,
    getValues,
    watch,
    handleSubmit,
    formState: { errors }
  } = useForm<MatriculaFormInput, unknown, MatriculaFormValues>({
    resolver: zodResolver(matriculaFormSchema),
    defaultValues: matriculaDefaultValues as MatriculaFormInput
  });

  const diasSemanaSelecionados = watch("dias_semana") ?? [];
  const faixaEtariaSelecionada = watch("faixa_etaria") ?? [];
  const tipoMatriculaAtual = String(watch("tipo") ?? "");
  const horarioInicialAtendimento = String(watch("horario_inicial") ?? "");
  const horarioFinalAtendimento = String(watch("horario_final_atendimento") ?? "");
  const duracaoAtendimentoMinutos = Number(watch("duracao_horas") ?? 0);
  const controleHorarioSelecionado = Boolean(watch("controle_horario_atendimento"));
  const imagemAtual = String(watch("imagem") ?? "");
  const profissionalResponsavelValor = String(watch("profissional") ?? "");
  const unidadeIdFormulario = String(watch("unidade_id") ?? "");
  const salaIdFormulario = String(watch("sala_id") ?? "");
  const matriculaIdFormulario = watch("id_matricula");
  const vagasTotaisFormulario = watch("vagas_totais");
  const acaoEmAndamento =
    salvarMutation.isPending ||
    removerMutation.isPending ||
    carregandoDetalhes ||
    atualizandoLista ||
    salvandoImagemCurso ||
    presencaSalvando ||
    presencaExcluindo ||
    presencaCarregando;

  const matriculas = catalogoData?.matriculas ?? [];
  const matriculasListagem = listaData?.matriculas ?? [];
  const salasCatalogo = salasData?.salas ?? [];
  const unidadesCatalogo = useMemo(() => {
    const mapa = new Map<string, { id: string; nome: string }>();

    salasCatalogo.forEach((sala) => {
      const id = String(sala.unidade_id ?? "").trim();
      const nome = String(sala.unidade_nome ?? "").trim();
      if (!id || !nome || mapa.has(id)) return;
      mapa.set(id, { id, nome });
    });

    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [salasCatalogo]);
  const salasFormulario = useMemo(
    () =>
      salasCatalogo.filter((sala) => {
        if (!unidadeIdFormulario) return true;
        return String(sala.unidade_id ?? "") === unidadeIdFormulario;
      }),
    [salasCatalogo, unidadeIdFormulario]
  );
  const beneficiariosCatalogo = beneficiariosCatalogoData?.beneficiarios ?? [];
  const beneficiariosFilaCatalogo = beneficiariosFilaCatalogoData?.beneficiarios ?? [];
  const profissionaisCatalogo = profissionaisCatalogoData?.profissionais ?? [];
  const profissionaisResponsavelCatalogo = profissionaisResponsavelCatalogoData?.profissionais ?? [];
  const profissionaisAgendaCatalogo = profissionaisAgendaCatalogoData?.profissionais ?? [];
  const cursoSelecionadoInscricao =
    matriculas.find((item) => item.id_matricula === (idSelecionado ?? matriculaIdFormulario)) ?? null;
  const ehAtendimentoSelecionado = (cursoSelecionadoInscricao?.tipo ?? "").trim().toUpperCase() === "ATENDIMENTO";
  const ehInscricaoAtendimento = (cursoSelecionadoInscricao?.tipo ?? "").trim().toUpperCase() === "ATENDIMENTO";
  const ehTipoAtendimento = tipoMatriculaAtual.trim().toUpperCase() === "ATENDIMENTO";
  const controleHorarioAtendimento = ehTipoAtendimento && controleHorarioSelecionado;
  const horariosAtendimento = useMemo(
    () =>
      ehTipoAtendimento && controleHorarioAtendimento
        ? calcularHorariosAtendimento(horarioInicialAtendimento, horarioFinalAtendimento, duracaoAtendimentoMinutos)
        : [],
    [controleHorarioAtendimento, duracaoAtendimentoMinutos, ehTipoAtendimento, horarioFinalAtendimento, horarioInicialAtendimento]
  );
  const abaAtual = abas.find((aba) => aba.id === abaAtiva);
  const possuiMatriculaSelecionada = Boolean(getValues("id_matricula"));
  const inscricoesAtivas = inscricoes.filter((item) => (item.status ?? "ATIVO") !== "CANCELADO");
  const presencaDatasOrdenadas = [...presencaDatas].sort((a, b) => a.data_aula.localeCompare(b.data_aula));
  const dataPresencaTitulo = presencaDataSelecionada?.data_aula ?? dataPresencaSelecionada ?? "";
  const presencaTitulo = cursoSelecionadoInscricao
    ? `Frequência — ${cursoSelecionadoInscricao.nome} — ${formatarData(dataPresencaTitulo)}`
    : "Frequência";
  const horaPadraoAgenda = useMemo(
    () => String(cursoSelecionadoInscricao?.horario_inicial ?? getValues("horario_inicial") ?? "").trim(),
    [cursoSelecionadoInscricao?.horario_inicial, getValues]
  );
  const agendamentosDoDia = obterAgendamentosDoDia();
  const agendamentosPorData = Object.entries(
    agendamentosDoDia.reduce<Record<string, Array<{ chave: string; item: MatriculaInscricao }>>>((acc, atual) => {
      const data = normalizarDataIso(atual.item.data_agendada) ?? "Sem data";
      if (!acc[data]) acc[data] = [];
      acc[data].push(atual);
      return acc;
    }, {})
  ).sort(([dataA], [dataB]) => dataA.localeCompare(dataB));
  const resumoListagem = useMemo(() => {
    const totalCursos = matriculasListagem.length;
    const totalVagas = matriculasListagem.reduce((total, item) => total + (item.vagas_totais ?? 0), 0);
    const totalDisponiveis = matriculasListagem.reduce((total, item) => total + (item.vagas_disponiveis ?? 0), 0);
    const totalInscritos = matriculasListagem.reduce((total, item) => total + (item.total_matriculas ?? 0), 0);
    const totalFila = matriculasListagem.reduce((total, item) => total + (item.total_fila_espera ?? 0), 0);
    const ocupacao = totalVagas > 0 ? Math.round(((totalVagas - totalDisponiveis) / totalVagas) * 100) : 0;

    return {
      totalCursos,
      totalVagas,
      totalDisponiveis,
      totalInscritos,
      totalFila,
      ocupacao
    };
  }, [matriculasListagem]);
  const unidadesListagem = useMemo(() => {
    const mapa = new Map<string, { id: string; nome: string }>();

    matriculasListagem.forEach((curso) => {
      const id = String(curso.unidade_id ?? "").trim();
      const nome = String(curso.unidade_nome ?? "").trim();
      if (!id || !nome || mapa.has(id)) return;
      mapa.set(id, { id, nome });
    });

    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [matriculasListagem]);
  const salasListagem = useMemo(() => {
    const unidadeFiltro = String(filtroDraft.unidade_id ?? "").trim();
    const mapa = new Map<string, { id: string; nome: string; unidade_id?: string }>();

    matriculasListagem.forEach((curso) => {
      const id = String(curso.sala_id ?? "").trim();
      const nome = String(curso.sala_nome ?? "").trim();
      const unidadeId = String(curso.unidade_id ?? "").trim();
      if (!id || !nome || mapa.has(id)) return;
      if (unidadeFiltro && unidadeId !== unidadeFiltro) return;
      mapa.set(id, { id, nome, unidade_id: unidadeId || undefined });
    });

    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [filtroDraft.unidade_id, matriculasListagem]);
  const inscricoesListagem = useMemo(() => {
    const termoNome = normalizarNomeComparacaoTexto(filtros.nome);
    const termoTipo = normalizarNomeComparacaoTexto(filtros.tipo);
    const termoStatus = normalizarNomeComparacaoTexto(filtros.status);
    const termoProfissional = normalizarNomeComparacaoTexto(filtros.profissional);
    const termoBeneficiario = normalizarNomeComparacaoTexto(filtros.beneficiario);
    const filtroUnidadeId = String(filtros.unidade_id ?? "").trim();
    const filtroSalaId = String(filtros.sala_id ?? "").trim();

    return matriculasListagem
      .flatMap((curso) =>
        (curso.matriculas ?? []).map((inscricao) => ({
          ...inscricao,
          curso_id: curso.id_matricula,
          curso_nome: curso.nome,
          curso_tipo: curso.tipo,
          curso_status: curso.status,
          sala_id: curso.sala_id,
          sala_nome: curso.sala_nome,
          unidade_id: curso.unidade_id,
          unidade_nome: curso.unidade_nome
        }))
      )
      .filter((item) => {
        const statusInscricaoNormalizado = String(item.status ?? "").trim().toUpperCase();
        const possuiAgendamento = Boolean(normalizarDataIso(item.data_agendada) || String(item.hora_agendada ?? "").trim());
        const statusAgendamentoNormalizado =
          statusInscricaoNormalizado === "CANCELADO"
            ? "CANCELADA"
            : statusInscricaoNormalizado === "FINALIZADO"
              ? "FINALIZADA"
              : possuiAgendamento
                ? "AGENDADO"
                : "PENDENTE";
        if (termoNome && !normalizarNomeComparacaoTexto(item.curso_nome).includes(termoNome)) return false;
        if (termoTipo && !normalizarNomeComparacaoTexto(item.curso_tipo).includes(termoTipo)) return false;
        if (termoStatus && !normalizarNomeComparacaoTexto(item.status ?? item.curso_status).includes(termoStatus)) return false;
        if (termoProfissional && !normalizarNomeComparacaoTexto(item.profissional_nome).includes(termoProfissional)) return false;
        if (termoBeneficiario && !normalizarNomeComparacaoTexto(item.beneficiario_nome).includes(termoBeneficiario)) return false;
        if (filtroUnidadeId && String(item.unidade_id ?? "") !== filtroUnidadeId) return false;
        if (filtroSalaId && String(item.sala_id ?? "") !== filtroSalaId) return false;
        if (filtroStatusAgendamentoRapido && statusAgendamentoNormalizado !== filtroStatusAgendamentoRapido) return false;
        return true;
      })
      .sort((a, b) => {
        const dataA = normalizarDataIso(a.data_matricula) ?? "";
        const dataB = normalizarDataIso(b.data_matricula) ?? "";
        if (dataA !== dataB) return dataB.localeCompare(dataA);
        return a.beneficiario_nome.localeCompare(b.beneficiario_nome, "pt-BR");
      });
  }, [filtroStatusAgendamentoRapido, filtros, matriculasListagem]);
  const alunosPorUnidadeSala = useMemo(() => {
    const grupos = new Map<
      string,
      {
        unidadeNome: string;
        salaNome: string;
        alunos: typeof inscricoesListagem;
      }
    >();

    inscricoesListagem.forEach((item) => {
      const unidadeNome = String(item.unidade_nome ?? "Sem unidade").trim() || "Sem unidade";
      const salaNome = String(item.sala_nome ?? "Sem sala").trim() || "Sem sala";
      const chave = `${item.unidade_id ?? "sem-unidade"}:${item.sala_id ?? "sem-sala"}`;
      const grupo = grupos.get(chave) ?? { unidadeNome, salaNome, alunos: [] };
      grupo.alunos.push(item);
      grupos.set(chave, grupo);
    });

    return Array.from(grupos.values())
      .map((grupo) => ({
        ...grupo,
        alunos: [...grupo.alunos].sort((a, b) => a.beneficiario_nome.localeCompare(b.beneficiario_nome, "pt-BR"))
      }))
      .sort((a, b) => {
        const unidade = a.unidadeNome.localeCompare(b.unidadeNome, "pt-BR");
        if (unidade !== 0) return unidade;
        return a.salaNome.localeCompare(b.salaNome, "pt-BR");
      });
  }, [inscricoesListagem]);
  const podeAdicionarInscricao = useMemo(() => {
    const nome = formatarTextoPadrao(novaInscricao.beneficiario_nome);
    if (nome.length < 3) return false;
    const cpf = somenteDigitos(novaInscricao.cpf);
    return !cpf || validarCpf(cpf);
  }, [novaInscricao.beneficiario_nome, novaInscricao.cpf]);
  const horariosDisponiveisInscricao = useMemo(() => {
    if (!ehAtendimentoSelecionado || !controleHorarioAtendimento || !horariosAtendimento.length) return [];
    const dataSelecionada = normalizarDataIso(novaInscricao.data_agendada);
    const ocupados = new Set(
      inscricoes
        .filter((item, index) => index !== inscricaoEditandoIndex && (item.status ?? "ATIVO").trim().toUpperCase() === "ATIVO")
        .filter((item) => !dataSelecionada || normalizarDataIso(item.data_agendada) === dataSelecionada)
        .map((item) => String(item.hora_agendada ?? "").trim())
        .filter(Boolean)
    );
    const horarioAtual = String(novaInscricao.hora_agendada ?? "").trim();
    return horariosAtendimento.filter((hora) => !ocupados.has(hora) || hora === horarioAtual);
  }, [controleHorarioAtendimento, ehAtendimentoSelecionado, horariosAtendimento, inscricaoEditandoIndex, inscricoes, novaInscricao.data_agendada, novaInscricao.hora_agendada]);
  const profissionaisDisponiveisInscricao = useMemo(() => {
    const mapa = new Map<string, { nome: string; categoria?: string; id_profissional?: string }>();
    const adicionar = (nome?: string, categoria?: string, idProfissional?: string) => {
      const nomeFormatado = formatarTextoPadrao(nome ?? "");
      if (!nomeFormatado) return;
      if (!mapa.has(nomeFormatado)) {
        mapa.set(nomeFormatado, {
          nome: nomeFormatado,
          categoria: categoria ? formatarTextoPadrao(categoria) : undefined,
          id_profissional: idProfissional
        });
      }
    };

    normalizarListaProfissionais(cursoSelecionadoInscricao?.profissional).forEach((nome) => adicionar(nome, "Curso"));
    profissionaisCatalogo.forEach((item) => adicionar(item.nome_completo, item.categoria, item.id_profissional));
    adicionar(novaInscricao.profissional_nome, novaInscricao.profissional_tipo, novaInscricao.profissional_id);

    return Array.from(mapa.values());
  }, [
    cursoSelecionadoInscricao?.profissional,
    profissionaisCatalogo,
    novaInscricao.profissional_nome,
    novaInscricao.profissional_tipo,
    novaInscricao.profissional_id
  ]);
  const podeAdicionarFilaEspera = useMemo(() => {
    const nome = formatarTextoPadrao(novoFilaEspera.beneficiario_nome);
    if (nome.length < 3) return false;
    const cpf = somenteDigitos(novoFilaEspera.cpf);
    return !cpf || validarCpf(cpf);
  }, [novoFilaEspera.beneficiario_nome, novoFilaEspera.cpf]);
  const vagasOferecidasInscricao = useMemo(() => {
    const cursoIdSelecionado = idSelecionado ?? matriculaIdFormulario;
    const vagasTotaisCurso = Number(
      matriculas.find((item) => item.id_matricula === cursoIdSelecionado)?.vagas_totais ?? vagasTotaisFormulario ?? 0
    );
    return Math.max(vagasTotaisCurso, 0);
  }, [idSelecionado, matriculaIdFormulario, matriculas, vagasTotaisFormulario]);
  const vagasDisponiveisInscricao = useMemo(() => {
    const cursoIdSelecionado = idSelecionado ?? matriculaIdFormulario;
    const vagasTotaisCurso = Number(
      matriculas.find((item) => item.id_matricula === cursoIdSelecionado)?.vagas_totais ?? vagasTotaisFormulario ?? 0
    );
    const totalInscritosAtivos = inscricoes.filter((item) => (item.status ?? "ATIVO").trim().toUpperCase() === "ATIVO").length;
    const vagaLiberadaParaEdicao = inscricaoEditandoIndex !== null ? 1 : 0;
    return Math.max(vagasTotaisCurso - totalInscritosAtivos + vagaLiberadaParaEdicao, 0);
  }, [idSelecionado, matriculaIdFormulario, matriculas, vagasTotaisFormulario, inscricaoEditandoIndex, inscricoes]);
  const inscricoesAgendaCatalogo = useMemo(() => {
    const termo = formatarTextoPadrao(termoAgendaBeneficiario);
    const termoNome = normalizarNomeComparacaoTexto(termo);
    const termoCpf = somenteDigitos(termo);

    return inscricoesAtivas
      .map((item, index) => ({
        chave: obterChaveInscricao(item, index),
        item
      }))
      .filter(({ item }) => {
        if (!termoNome && !termoCpf) return true;

        const nome = normalizarNomeComparacaoTexto(item.beneficiario_nome);
        const cpf = somenteDigitos(item.cpf);
        const telefone = somenteDigitos(item.telefone);

        return (
          (termoNome && nome.includes(termoNome)) ||
          (termoCpf && !!cpf && cpf.includes(termoCpf)) ||
          (termoCpf && !!telefone && telefone.includes(termoCpf))
        );
      })
      .sort((a, b) => a.item.beneficiario_nome.localeCompare(b.item.beneficiario_nome, "pt-BR"));
  }, [inscricoesAtivas, termoAgendaBeneficiario]);
  const todasInscricoesAgendaSelecionadas =
    inscricoesAgendaCatalogo.length > 0 &&
    inscricoesAgendaCatalogo.every(({ chave }) => inscricoesAgendaSelecionadas.includes(chave));
  const inscricaoAgendaSelecionada = useMemo(
    () =>
      inscricoesAtivas
        .map((item, index) => ({
          chave: obterChaveInscricao(item, index),
          item
        }))
        .find((item) => item.chave === agendaForm.chave_inscricao) ?? null,
    [agendaForm.chave_inscricao, inscricoesAtivas]
  );

  useEffect(() => {
    if (!controleHorarioAtendimento || !ehTipoAtendimento || horariosAtendimento.length === 0) return;
    const totalVagas = horariosAtendimento.length;
    const totalInscritosAtivos = inscricoes.filter((item) => (item.status ?? "ATIVO").trim().toUpperCase() === "ATIVO").length;
    const vagasDisponiveis = Math.max(totalVagas - totalInscritosAtivos, 0);
    if (Number(getValues("vagas_totais") ?? 0) !== totalVagas) {
      setValue("vagas_totais", totalVagas, { shouldDirty: true, shouldValidate: true });
    }
    if (Number(getValues("vagas_disponiveis") ?? 0) !== vagasDisponiveis) {
      setValue("vagas_disponiveis", vagasDisponiveis, { shouldDirty: true, shouldValidate: true });
    }
  }, [controleHorarioAtendimento, ehTipoAtendimento, getValues, horariosAtendimento, inscricoes, setValue]);

  useEffect(() => {
    if (!detalhesData?.matricula) return;
    const formValues = mapMatriculaParaFormulario(detalhesData.matricula);
    reset(formValues);
    setSnapshot(formValues);
    setImagemCursoArquivo(null);
    setSalvandoImagemCurso(false);
    setInscricoes(detalhesData.matricula.matriculas ?? []);
    setFilaEspera(detalhesData.matricula.fila_espera ?? []);
    setTermoCatalogoProfissionalResponsavel("");
    setMostrarSugestoesProfissionalResponsavel(false);
  }, [detalhesData, reset]);

  useEffect(() => {
    if (!salaIdFormulario) return;
    const salaSelecionada = salasCatalogo.find((sala) => sala.id_sala === salaIdFormulario);
    const unidadeId = String(salaSelecionada?.unidade_id ?? "").trim();
    if (!unidadeId || unidadeId === unidadeIdFormulario) return;
    setValue("unidade_id", unidadeId, { shouldDirty: false, shouldValidate: true });
  }, [salaIdFormulario, salasCatalogo, setValue, unidadeIdFormulario]);

  useEffect(() => {
    if (!ehTipoAtendimento) {
      setProfissionaisAtendimentoSelecionados([]);
      return;
    }
    setProfissionaisAtendimentoSelecionados(normalizarListaProfissionais(profissionalResponsavelValor));
  }, [ehTipoAtendimento, profissionalResponsavelValor]);

  useEffect(() => {
    if (abaAtiva !== "presenca") return;
    if (!idSelecionado && !getValues("id_matricula")) return;
    void carregarPresencaDatas();
  }, [abaAtiva, idSelecionado, getValues]);

  useEffect(() => {
    if (!horaPadraoAgenda) return;
    setAgendaForm((atual) => {
      if (String(atual.hora_agendada ?? "").trim()) {
        return atual;
      }

      return {
        ...atual,
        hora_agendada: horaPadraoAgenda
      };
    });
  }, [horaPadraoAgenda]);

  function aplicarFormatacaoCampo(campo: keyof MatriculaFormValues) {
    const valorAtual = getValues(campo);
    const valorFormatado = formatarTextoPorCampo(campo, valorAtual, mapaCamposTextoMatriculaForm);
    if (typeof valorAtual === "string" && typeof valorFormatado === "string" && valorAtual !== valorFormatado) {
      setValue(campo, valorFormatado as MatriculaFormValues[typeof campo], {
        shouldDirty: true,
        shouldValidate: true
      });
    }
  }

  function alternarLista(campo: "dias_semana" | "faixa_etaria", item: string) {
    const atual = getValues(campo) ?? [];
    const proximo = atual.includes(item) ? atual.filter((valor) => valor !== item) : [...atual, item];
    setValue(campo, proximo, { shouldDirty: true, shouldValidate: true });
  }

  function alternarTodasFaixasEtarias() {
    const atual = getValues("faixa_etaria") ?? [];
    const todasSelecionadas = faixaEtariaOptions.every((faixa) => atual.includes(faixa));
    setValue("faixa_etaria", todasSelecionadas ? [] : [...faixaEtariaOptions], {
      shouldDirty: true,
      shouldValidate: true
    });
  }

  function selecionarMatricula(matriculaId: string) {
    const cursoSelecionado = matriculas.find((item) => item.id_matricula === matriculaId);
    setImagemCursoArquivo(null);
    setIdSelecionado(matriculaId);
    setTermoAgendaBeneficiario("");
    setMostrarSugestoesAgendaBeneficiario(false);
    setAgendaForm({
      chave_inscricao: "",
      data_agendada: obterDataAtualIso(),
      hora_agendada: String(cursoSelecionado?.horario_inicial ?? "").trim(),
      profissional_nome: "",
      status_agendamento: "AGUARDANDO"
    });
    setAbaAtiva("dados");
  }

  function selecionarCursoParaInscricao(matriculaId: string) {
    if (!matriculaId) {
      return;
    }
    const cursoSelecionado = matriculas.find((item) => item.id_matricula === matriculaId);
    const profissionalPadrao = obterProfissionalUnico(cursoSelecionado?.profissional);

    setNovaInscricao((atual) => ({
      ...atual,
      profissional_nome: profissionalPadrao,
      profissional_id: undefined,
      profissional_tipo: undefined,
      data_agendada: "",
      hora_agendada: String(cursoSelecionado?.horario_inicial ?? "").trim(),
      status_agendamento: ""
    }));
    setIdSelecionado(matriculaId);
    setTermoAgendaBeneficiario("");
    setMostrarSugestoesAgendaBeneficiario(false);
    setAgendaForm({
      chave_inscricao: "",
      data_agendada: obterDataAtualIso(),
      hora_agendada: String(cursoSelecionado?.horario_inicial ?? "").trim(),
      profissional_nome: profissionalPadrao,
      status_agendamento: "AGUARDANDO"
    });
    setAbaAtiva("inscricoes");
  }

  function selecionarCursoParaAgendamento(matriculaId: string) {
    if (!matriculaId) {
      setIdSelecionado(undefined);
      setInscricoes([]);
      setAgendaForm((atual) => ({ ...atual, chave_inscricao: "", profissional_nome: "" }));
      return;
    }

    const cursoSelecionado = matriculas.find((item) => item.id_matricula === matriculaId);
    const profissionalPadrao = obterProfissionalUnico(cursoSelecionado?.profissional);

    setIdSelecionado(matriculaId);
    setTermoAgendaBeneficiario("");
    setMostrarSugestoesAgendaBeneficiario(false);
    setInscricoesAgendaSelecionadas([]);
    setAgendaForm({
      chave_inscricao: "",
      data_agendada: obterDataAtualIso(),
      hora_agendada: String(cursoSelecionado?.horario_inicial ?? "").trim(),
      profissional_nome: profissionalPadrao,
      status_agendamento: "AGUARDANDO"
    });
  }

  function buscar() {
    setFiltros({ ...filtroDraft });
    setAbaAtiva("listagem");
  }

  function normalizarNomeComparacao(valor?: string) {
    return normalizarNomeComparacaoTexto(valor);
  }

  function onFiltroEnter(event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    buscar();
  }

  function limparFiltros() {
    const base = { nome: "", tipo: "", status: "", profissional: "", beneficiario: "", unidade_id: "", sala_id: "" };
    setFiltroDraft(base);
    setFiltros(base);
    setFiltroStatusAgendamentoRapido("");
  }

  function novo() {
    setIdSelecionado(undefined);
    setSnapshot(null);
    setImagemCursoArquivo(null);
    setSalvandoImagemCurso(false);
    reset(matriculaDefaultValues);
    setTermoCatalogoProfissionalResponsavel("");
    setMostrarSugestoesProfissionalResponsavel(false);
    setTermoCatalogoBeneficiario("");
    setMostrarSugestoesBeneficiarioInscricao(false);
    setTermoCatalogoFilaEspera("");
    setMostrarSugestoesFilaEspera(false);
    setTermoCatalogoAgendaProfissional("");
    setMostrarSugestoesAgendaProfissional(false);
    setTermoAgendaBeneficiario("");
    setMostrarSugestoesAgendaBeneficiario(false);
    setInscricoesAgendaSelecionadas([]);
    setInscricoes([]);
    setFilaEspera([]);
    setNovaInscricao({
      beneficiario_nome: "",
      cpf: "",
      email: "",
      status: "ATIVO",
      data_agendada: "",
      hora_agendada: "",
      status_agendamento: "",
      profissional_nome: "",
      confirmacao_presenca: false
    });
    setNovoFilaEspera({ beneficiario_nome: "", cpf: "", telefone: "" });
    setAgendaDataSelecionada("");
    setAgendaStatusFiltro("");
    setAgendaProfissionalFiltro("");
    setAgendaCopiaOrigem("");
    setAgendaCopiaDestino("");
    setAgendaForm({
      chave_inscricao: "",
      data_agendada: obterDataAtualIso(),
      hora_agendada: "",
      profissional_nome: "",
      status_agendamento: "AGUARDANDO"
    });
    setPresencaDatas([]);
    setPresencaDataSelecionada(null);
    setPresencaListaAutorizada(null);
    setSenhaConfirmacaoPresenca("");
    setPresencaAlteracaoPendente(null);
    setPresencasPorMatricula({});
    setPresencasSalvasPorMatricula({});
    setDataPresencaSelecionada(obterDataAtualIso());
    setPresencaObservacoes("");
    setPresencaPendente(false);
    setAbaAtiva("dados");
  }

  function cancelar() {
    setImagemCursoArquivo(null);
    setSalvandoImagemCurso(false);
    if (!snapshot) {
      reset(matriculaDefaultValues);
      setTermoCatalogoProfissionalResponsavel("");
      setMostrarSugestoesProfissionalResponsavel(false);
      setTermoCatalogoBeneficiario("");
      setMostrarSugestoesBeneficiarioInscricao(false);
      setTermoCatalogoFilaEspera("");
      setMostrarSugestoesFilaEspera(false);
      setTermoCatalogoAgendaProfissional("");
      setMostrarSugestoesAgendaProfissional(false);
      setTermoAgendaBeneficiario("");
      setMostrarSugestoesAgendaBeneficiario(false);
      setInscricoes([]);
      setFilaEspera([]);
      setAgendaCopiaOrigem("");
      setAgendaCopiaDestino("");
      return;
    }
    reset(snapshot);
    setTermoCatalogoProfissionalResponsavel("");
    setMostrarSugestoesProfissionalResponsavel(false);
    setTermoCatalogoBeneficiario("");
    setMostrarSugestoesBeneficiarioInscricao(false);
    setTermoCatalogoFilaEspera("");
    setMostrarSugestoesFilaEspera(false);
    setTermoCatalogoAgendaProfissional("");
    setMostrarSugestoesAgendaProfissional(false);
    setTermoAgendaBeneficiario("");
    setMostrarSugestoesAgendaBeneficiario(false);
    setInscricoes(detalhesData?.matricula?.matriculas ?? []);
    setFilaEspera(detalhesData?.matricula?.fila_espera ?? []);
    setAgendaDataSelecionada("");
    setAgendaStatusFiltro("");
    setAgendaProfissionalFiltro("");
    setAgendaCopiaOrigem("");
    setAgendaCopiaDestino("");
    setAgendaForm({
      chave_inscricao: "",
      data_agendada: obterDataAtualIso(),
      hora_agendada: String(detalhesData?.matricula?.horario_inicial ?? snapshot?.horario_inicial ?? "").trim(),
      profissional_nome: "",
      status_agendamento: "AGUARDANDO"
    });
    setPresencaDataSelecionada(null);
    setPresencaListaAutorizada(null);
    setSenhaConfirmacaoPresenca("");
    setPresencaAlteracaoPendente(null);
    setPresencasPorMatricula({});
    setDataPresencaSelecionada(obterDataAtualIso());
    setPresencaObservacoes("");
    setPresencaPendente(false);
  }

  function excluir() {
    const id = getValues("id_matricula");
    if (!id) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Selecione uma inscrição para excluir."
      });
      return;
    }
    setPopupExcluirAberto(true);
  }

  async function confirmarExclusao() {
    const id = getValues("id_matricula");
    if (!id) return;

    try {
      await removerMutation.mutateAsync(id);
      setPopupExcluirAberto(false);
      novo();
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Inscrição excluída com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir a inscrição."
      });
    }
  }

  async function imprimir() {
    try {
      const blob = await reportsService.gerarRelacaoMatriculas({
        ...filtros,
        usuarioEmissor: usuario?.nomeUsuario
      });
      abrirRelatorioPdf(blob);
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.message ?? "Não foi possível gerar o relatório."
      });
    }
  }

  async function imprimirListaPresenca() {
    const cursoId = idSelecionado ?? getValues("id_matricula");
    if (!cursoId) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Selecione uma inscrição para imprimir a lista de presença."
      });
      return;
    }

    try {
      const datasOrdenadas = [...presencaDatas].sort((a, b) => a.data_aula.localeCompare(b.data_aula));
      const blob = await reportsService.gerarListaPresencaMatricula({
        matriculaId: cursoId,
        dataAula: (presencaDataSelecionada?.data_aula ?? dataPresencaSelecionada) || undefined,
        periodoInicio: datasOrdenadas[0]?.data_aula,
        periodoFim: datasOrdenadas[datasOrdenadas.length - 1]?.data_aula,
        exibirCpf: presencaExibirCpf,
        usuarioEmissor: usuario?.nomeUsuario
      });
      abrirRelatorioPdf(blob);
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.message ?? "Não foi possível gerar a lista de presença."
      });
    }
  }

  function obterDadosCursoComprovante(cursoId?: string) {
    const curso =
      matriculas.find((item) => item.id_matricula === cursoId) ??
      matriculas.find((item) => item.id_matricula === (idSelecionado ?? getValues("id_matricula"))) ??
      cursoSelecionadoInscricao ??
      null;

    const horario =
      curso?.horario_inicial && curso?.duracao_horas
        ? `${curso.horario_inicial} (${curso.duracao_horas} min)`
        : curso?.horario_inicial ?? "---";

    return {
      cursoNome: curso?.nome ?? "---",
      cursoTipo: curso?.tipo ?? "---",
      cursoStatus: curso?.status ?? "---",
      cursoProfissional: curso?.profissional ?? "---",
      cursoSala: curso?.sala_nome ?? "---",
      cursoHorario: horario,
      cursoDias: curso?.dias_semana?.length ? curso.dias_semana.join(", ") : "---",
      cursoPeriodo: formatarPeriodoCurso(curso?.data_triagem, curso?.data_conclusao),
      cursoInstituicao: curso?.instituicao_parceira ?? "---"
    };
  }

  async function imprimirComprovanteMatricula(args: {
    cursoId?: string;
    beneficiarioNome: string;
    cpf?: string;
    telefone?: string;
    dataRegistro?: string;
  }) {
    try {
      const curso = obterDadosCursoComprovante(args.cursoId);
      const blob = await reportsService.gerarComprovanteMatricula({
        ...curso,
        beneficiarioNome: args.beneficiarioNome,
        cpf: args.cpf,
        telefone: args.telefone,
        dataRegistro: args.dataRegistro ?? obterDataAtualIso(),
        usuarioEmissor: usuario?.nomeUsuario
      });
      abrirRelatorioPdf(blob);
    } catch (error: any) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto:
          error?.message ??
          "Inscrição registrada, mas não foi possível abrir o comprovante de inscrição para impressão."
      });
    }
  }

  async function imprimirComprovantePreMatricula(args: {
    cursoId?: string;
    beneficiarioNome: string;
    cpf?: string;
    telefone?: string;
    dataEntradaFila?: string;
    posicaoFila?: number;
  }) {
    try {
      const curso = obterDadosCursoComprovante(args.cursoId);
      const blob = await reportsService.gerarComprovantePreMatriculaListaEspera({
        ...curso,
        beneficiarioNome: args.beneficiarioNome,
        cpf: args.cpf,
        telefone: args.telefone,
        dataEntradaFila: args.dataEntradaFila ?? obterDataAtualIso(),
        posicaoFila: args.posicaoFila ? String(args.posicaoFila) : undefined,
        usuarioEmissor: usuario?.nomeUsuario
      });
      abrirRelatorioPdf(blob);
    } catch (error: any) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto:
          error?.message ??
          "Pré-matrícula registrada, mas não foi possível abrir o comprovante de lista de espera para impressão."
      });
    }
  }

  function fechar() {
    navigate("/dashboard/visao-geral");
  }

  function preencherInscricaoComBeneficiario(item: MatriculaBeneficiarioCatalogo) {
    setNovaInscricao((atual) => ({
      ...atual,
      beneficiario_nome: item.nome_completo,
      cpf: item.cpf ?? "",
      telefone: item.telefone ?? "",
      email: item.email ?? ""
    }));
    setTermoCatalogoBeneficiario("");
    setMostrarSugestoesBeneficiarioInscricao(false);
  }

  function preencherFilaEsperaComBeneficiario(item: MatriculaBeneficiarioCatalogo) {
    setNovoFilaEspera((atual) => ({
      ...atual,
      beneficiario_nome: item.nome_completo,
      cpf: item.cpf ?? "",
      telefone: item.telefone ?? ""
    }));
    setTermoCatalogoFilaEspera("");
    setMostrarSugestoesFilaEspera(false);
  }

  function preencherInscricaoComProfissional(item: MatriculaProfissionalCatalogo) {
    setNovaInscricao((atual) => ({
      ...atual,
      profissional_nome: item.nome_completo,
      profissional_id: item.id_profissional,
      profissional_tipo: item.categoria
    }));
  }

  function atualizarProfissionaisAtendimento(lista: string[]) {
    const listaNormalizada = normalizarListaProfissionais(lista.join("; "));
    setProfissionaisAtendimentoSelecionados(listaNormalizada);
    setValue("profissional", listaNormalizada.join("; "), {
      shouldDirty: true,
      shouldValidate: true
    });
  }

  function adicionarProfissionalAtendimento(nome: string) {
    const nomeFormatado = formatarTextoPadrao(nome);
    if (nomeFormatado.length < 3) return;

    const listaAtual = normalizarListaProfissionais(profissionalResponsavelValor);
    const jaExiste = listaAtual.some(
      (item) => item.toLocaleLowerCase("pt-BR") === nomeFormatado.toLocaleLowerCase("pt-BR")
    );

    if (jaExiste) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Profissional já adicionado para este atendimento."
      });
      setTermoCatalogoProfissionalResponsavel("");
      setMostrarSugestoesProfissionalResponsavel(false);
      return;
    }

    atualizarProfissionaisAtendimento([...listaAtual, nomeFormatado]);
    setTermoCatalogoProfissionalResponsavel("");
    setMostrarSugestoesProfissionalResponsavel(false);
  }

  function removerProfissionalAtendimento(nome: string) {
    const listaAtual = normalizarListaProfissionais(profissionalResponsavelValor);
    const proximaLista = listaAtual.filter(
      (item) => item.toLocaleLowerCase("pt-BR") !== nome.toLocaleLowerCase("pt-BR")
    );
    atualizarProfissionaisAtendimento(proximaLista);
  }

  function preencherProfissionalResponsavel(item: MatriculaProfissionalCatalogo) {
    if (ehTipoAtendimento) {
      adicionarProfissionalAtendimento(item.nome_completo);
      return;
    }

    setValue("profissional", item.nome_completo, {
      shouldDirty: true,
      shouldValidate: true
    });
    setTermoCatalogoProfissionalResponsavel("");
    setMostrarSugestoesProfissionalResponsavel(false);
  }

  function obterChaveInscricao(item: MatriculaInscricao, index: number) {
    return item.id_matricula_item ?? `nova-${index}`;
  }

  function atualizarInscricaoPorChave(
    chave: string,
    atualizador: (inscricao: MatriculaInscricao) => MatriculaInscricao
  ) {
    setInscricoes((atual) =>
      atual.map((item, index) => (obterChaveInscricao(item, index) === chave ? atualizador(item) : item))
    );
  }

  function obterAgendamentosDoDia() {
    return inscricoes
      .map((item, index) => ({
        chave: obterChaveInscricao(item, index),
        item
      }))
      .filter(({ item }) => !!item.data_agendada)
      .filter(({ item }) => {
        if (!agendaDataSelecionada) return true;
        return normalizarDataIso(item.data_agendada) === agendaDataSelecionada;
      })
      .filter(({ item }) => {
        if (!agendaStatusFiltro) return true;
        return (item.status_agendamento ?? "AGUARDANDO") === agendaStatusFiltro;
      })
      .filter(({ item }) => {
        if (!agendaProfissionalFiltro.trim()) return true;
        return (item.profissional_nome ?? "").toLowerCase().includes(agendaProfissionalFiltro.trim().toLowerCase());
      });
  }

  function preencherAgendaPorInscricao(chave: string) {
    const selecionado = inscricoes
      .map((item, index) => ({ chave: obterChaveInscricao(item, index), item }))
      .find((item) => item.chave === chave);

    if (!selecionado) return;

    const horaPadraoAgenda =
      selecionado.item.hora_agendada ||
      cursoSelecionadoInscricao?.horario_inicial ||
      String(getValues("horario_inicial") ?? "").trim() ||
      "";
    const profissionalPadraoAgenda =
      formatarTextoPadrao(selecionado.item.profissional_nome ?? "") ||
      formatarTextoPadrao(agendaForm.profissional_nome ?? "") ||
      obterProfissionalUnico(cursoSelecionadoInscricao?.profissional);

    setAgendaForm((atual) => ({
      ...atual,
      chave_inscricao: chave,
      data_agendada: selecionado.item.data_agendada || agendaDataSelecionada || obterDataAtualIso(),
      hora_agendada: horaPadraoAgenda,
      profissional_nome: profissionalPadraoAgenda,
      status_agendamento: selecionado.item.status_agendamento ?? "AGUARDANDO"
    }));
    setTermoAgendaBeneficiario(formatarTextoPadrao(selecionado.item.beneficiario_nome));
    setMostrarSugestoesAgendaBeneficiario(false);
  }

  function preencherAgendaComProfissional(item: MatriculaProfissionalCatalogo) {
    setAgendaForm((atual) => ({
      ...atual,
      profissional_nome: item.nome_completo
    }));
    setTermoCatalogoAgendaProfissional("");
    setMostrarSugestoesAgendaProfissional(false);
  }

  function copiarOuMoverAgendaEntreDatas(modo: "copiar" | "mover") {
    const dataOrigem = normalizarDataIso(agendaCopiaOrigem);
    const dataDestino = normalizarDataIso(agendaCopiaDestino);

    if (!dataOrigem || !dataDestino) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe as datas de origem e destino para copiar ou mover a agenda."
      });
      return;
    }

    if (dataOrigem === dataDestino) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "A data de origem e a data de destino não podem ser iguais."
      });
      return;
    }

    const itensOrigem = inscricoes.filter((item) => normalizarDataIso(item.data_agendada) === dataOrigem);
    const totalOrigem = itensOrigem.length;

    if (totalOrigem === 0) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Não há agendamentos na data de origem informada."
      });
      return;
    }

    const chavesDestino = new Set(
      inscricoes
        .filter((item) => normalizarDataIso(item.data_agendada) === dataDestino)
        .map((item) => montarChaveAgenda(item, dataDestino))
    );

    let totalProcessados = 0;
    let totalIgnorados = 0;
    let proximaLista: MatriculaInscricao[] = [];

    if (modo === "copiar") {
      const novosItens: MatriculaInscricao[] = [];
      itensOrigem.forEach((item) => {
        const chaveDestino = montarChaveAgenda(item, dataDestino);
        if (chavesDestino.has(chaveDestino)) {
          totalIgnorados += 1;
          return;
        }
        chavesDestino.add(chaveDestino);
        totalProcessados += 1;
        novosItens.push({
          ...item,
          id_matricula_item: undefined,
          data_agendada: dataDestino,
          confirmacao_presenca: false,
          status_agendamento: normalizarStatusAgendamentoParaReagendar(item.status_agendamento)
        });
      });
      proximaLista = [...inscricoes, ...novosItens];
    } else {
      proximaLista = inscricoes.map((item) => {
        if (normalizarDataIso(item.data_agendada) !== dataOrigem) return item;
        const chaveDestino = montarChaveAgenda(item, dataDestino);
        if (chavesDestino.has(chaveDestino)) {
          totalIgnorados += 1;
          return item;
        }
        chavesDestino.add(chaveDestino);
        totalProcessados += 1;
        return {
          ...item,
          data_agendada: dataDestino,
          confirmacao_presenca: false,
          status_agendamento: normalizarStatusAgendamentoParaReagendar(item.status_agendamento)
        };
      });
    }

    if (totalProcessados === 0) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto:
          modo === "copiar"
            ? "Nenhum agendamento foi copiado. Os itens de destino já existem na data informada."
            : "Nenhum agendamento foi movido. Os itens de destino já existem na data informada."
      });
      return;
    }

    setInscricoes(proximaLista);
    if (modo === "mover") {
      setAgendaDataSelecionada(dataDestino);
    } else {
      setAgendaDataSelecionada("");
    }
    setPopupMensagem({
      tipo: totalIgnorados > 0 ? "aviso" : "sucesso",
      titulo: totalIgnorados > 0 ? "Atenção" : "Confirmação",
      texto:
        modo === "copiar"
          ? `Agenda copiada com sucesso. ${totalProcessados} agendamento(s) enviados para ${formatarData(dataDestino)}.`
          : `Agenda movida com sucesso. ${totalProcessados} agendamento(s) transferidos para ${formatarData(dataDestino)}.${
              totalIgnorados > 0
                ? ` ${totalIgnorados} item(ns) permaneceram na origem por já existirem no destino.`
                : ""
            }`
    });
  }

  function copiarAgendaEntreDatas() {
    copiarOuMoverAgendaEntreDatas("copiar");
  }

  function moverAgendaEntreDatas() {
    copiarOuMoverAgendaEntreDatas("mover");
  }

  function montarMensagemLembreteAgendamento(item: MatriculaInscricao, dataAgenda: string) {
    const nomeAtividade = formatarTextoPadrao(cursoSelecionadoInscricao?.nome ?? "atendimento");
    const tipoAtividade = formatarTextoPadrao(cursoSelecionadoInscricao?.tipo ?? "Atendimento");
    const hora = item.hora_agendada ?? cursoSelecionadoInscricao?.horario_inicial ?? "a definir";
    const profissional = formatarTextoPadrao(item.profissional_nome ?? cursoSelecionadoInscricao?.profissional ?? "");
    const sala = formatarTextoPadrao(cursoSelecionadoInscricao?.sala_nome ?? "");

    return [
      `Olá, ${item.beneficiario_nome}.`,
      "",
      `Lembrete do seu agendamento de ${tipoAtividade}: ${nomeAtividade}.`,
      `Data: ${formatarData(dataAgenda)}.`,
      `Hora: ${hora}.`,
      profissional ? `Profissional responsável: ${profissional}.` : undefined,
      sala ? `Local/Sala: ${sala}.` : undefined,
      "",
      "Mensagem automática do Sistema G3-Next."
    ]
      .filter(Boolean)
      .join("\n");
  }

  function enviarLembreteWhatsappDia(dataAgenda: string, itens: Array<{ chave: string; item: MatriculaInscricao }>) {
    const itensComWhatsapp = itens
      .map(({ item }) => ({
        item,
        telefone: normalizarTelefoneWhatsapp(item.telefone)
      }))
      .filter((entrada) => !!entrada.telefone) as Array<{ item: MatriculaInscricao; telefone: string }>;

    if (!itensComWhatsapp.length) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Nenhum beneficiário deste dia possui telefone válido para WhatsApp."
      });
      return;
    }

    const urlsWhatsapp = itensComWhatsapp.map((entrada) => {
      const texto = encodeURIComponent(montarMensagemLembreteAgendamento(entrada.item, dataAgenda));
      return `https://wa.me/${entrada.telefone}?text=${texto}`;
    });

    let totalAbertos = 0;
    urlsWhatsapp.forEach((url) => {
      const janela = window.open(url, "_blank", "noopener,noreferrer");
      if (janela) totalAbertos += 1;
    });

    const totalBloqueados = urlsWhatsapp.length - totalAbertos;
    if (totalBloqueados > 0 && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(urlsWhatsapp.join("\n")).catch(() => undefined);
    }

    setPopupMensagem({
      tipo: totalBloqueados > 0 ? "aviso" : "sucesso",
      titulo: totalBloqueados > 0 ? "Atenção" : "Confirmação",
      texto:
        totalBloqueados > 0
          ? `Foram abertas ${totalAbertos} conversa(s) no WhatsApp. ${totalBloqueados} conversa(s) foram bloqueadas pelo navegador; os links foram copiados para a área de transferência.`
          : `WhatsApp aberto para ${itensComWhatsapp.length} beneficiário(s) da agenda do dia.`
    });
  }

  async function enviarLembreteEmailDia(dataAgenda: string, itens: Array<{ chave: string; item: MatriculaInscricao }>) {
    const destinatarios = itens
      .map(({ item }) => ({
        nome: item.beneficiario_nome,
        email: item.email?.trim() ?? "",
        item
      }))
      .filter((entrada) => emailValido(entrada.email));

    if (!destinatarios.length) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Nenhum beneficiário deste dia possui e-mail válido para envio do lembrete."
      });
      return;
    }

    const assuntoBase = `Lembrete de agendamento - ${formatarTextoPadrao(cursoSelecionadoInscricao?.nome ?? "Atendimento")}`;

    try {
      setDataEnviandoLembreteEmail(dataAgenda);
      const resultados = await Promise.allSettled(
        destinatarios.map((destinatario) =>
          matriculasService.enviarLembreteEmail({
            destinatario: destinatario.email,
            assunto: assuntoBase,
            mensagem: montarMensagemLembreteAgendamento(destinatario.item, dataAgenda)
          })
        )
      );

      const totalEnviados = resultados.filter((item) => item.status === "fulfilled").length;
      const totalFalhas = resultados.length - totalEnviados;

      setPopupMensagem({
        tipo: totalFalhas > 0 ? "aviso" : "sucesso",
        titulo: totalFalhas > 0 ? "Atenção" : "Confirmação",
        texto:
          totalFalhas > 0
            ? `Lembretes enviados por e-mail: ${totalEnviados}. Falhas: ${totalFalhas}.`
            : `Lembretes enviados por e-mail para ${totalEnviados} beneficiário(s).`
      });
    } catch {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: "Não foi possível enviar os lembretes por e-mail."
      });
    } finally {
      setDataEnviandoLembreteEmail(null);
    }
  }

  function agendarAtendimento() {
    const chavesSelecionadas = inscricoesAgendaSelecionadas.length
      ? inscricoesAgendaSelecionadas
      : agendaForm.chave_inscricao
        ? [agendaForm.chave_inscricao]
        : [];

    if (chavesSelecionadas.length === 0) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Selecione um ou mais beneficiários inscritos para agendar."
      });
      return;
    }
    if (!agendaForm.data_agendada || !agendaForm.hora_agendada) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe data e hora do agendamento."
      });
      return;
    }
    if (!agendaForm.profissional_nome.trim()) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe o profissional responsável pelo atendimento."
      });
      return;
    }

    if (controleHorarioAtendimento && chavesSelecionadas.length > 1) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Seleção de horário",
        texto: "Em atendimento por horário, agende um beneficiário por vez para evitar duplicidade no mesmo horário."
      });
      return;
    }

    setInscricoes((atual) =>
      atual.map((item, index) => {
        const chave = obterChaveInscricao(item, index);
        return chavesSelecionadas.includes(chave)
          ? {
              ...item,
              data_agendada: agendaForm.data_agendada,
              hora_agendada: agendaForm.hora_agendada,
              profissional_nome: agendaForm.profissional_nome.trim(),
              status_agendamento: agendaForm.status_agendamento
            }
          : item;
      })
    );

    setPopupMensagem({
      tipo: "sucesso",
      titulo: "Confirmação",
      texto: `${chavesSelecionadas.length} beneficiário(s) agendado(s) com sucesso.`
    });
  }

  function alternarConfirmacaoPresencaAgendamento(chave: string) {
    atualizarInscricaoPorChave(chave, (item) => {
      const confirmada = !!item.confirmacao_presenca;
      return {
        ...item,
        confirmacao_presenca: !confirmada,
        status_agendamento: !confirmada
          ? "CONFIRMADO"
          : (item.status_agendamento ?? "AGUARDANDO") === "CONFIRMADO"
            ? "AGUARDANDO"
            : item.status_agendamento
      };
    });
  }

  async function carregarPresencaDatas() {
    const cursoId = idSelecionado ?? getValues("id_matricula");
    if (!cursoId) {
      setPresencaDatas([]);
      setPresencaDataSelecionada(null);
      setPresencaListaAutorizada(null);
      setSenhaConfirmacaoPresenca("");
      setPresencaErroSenha("");
      setPresencaAlteracaoPendente(null);
      setPresencasPorMatricula({});
      setPresencasSalvasPorMatricula({});
      setPresencasObservacoesPorMatricula({});
      return;
    }

    setPresencaCarregando(true);
    try {
      const response = await matriculasService.listarPresencaDatas(cursoId, false);
      const datas = response.datas ?? [];
      setPresencaDatas(datas);

      if (!datas.length) {
        setPresencaDataSelecionada(null);
        setPresencaListaAutorizada(null);
        setSenhaConfirmacaoPresenca("");
        setPresencaAlteracaoPendente(null);
        setDataPresencaSelecionada("");
        setPresencasPorMatricula({});
        setPresencasSalvasPorMatricula({});
        setPresencasObservacoesPorMatricula({});
        setPresencaObservacoes("");
        setPresencaPendente(false);
        return;
      }

      const selecionadaAtual = presencaDataSelecionada
        ? datas.find((item) => item.id === presencaDataSelecionada.id) ?? null
        : null;

      if (selecionadaAtual ?? datas[0]) {
        await selecionarPresencaData(selecionadaAtual ?? datas[0]);
      }
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível carregar as datas de presença."
      });
      setPresencaDatas([]);
      setPresencaDataSelecionada(null);
      setPresencaListaAutorizada(null);
      setSenhaConfirmacaoPresenca("");
      setPresencaErroSenha("");
      setPresencaAlteracaoPendente(null);
      setDataPresencaSelecionada("");
      setPresencasPorMatricula({});
      setPresencasSalvasPorMatricula({});
      setPresencasObservacoesPorMatricula({});
    } finally {
      setPresencaCarregando(false);
    }
  }

  async function selecionarPresencaData(data: MatriculaPresencaData) {
    const cursoId = idSelecionado ?? getValues("id_matricula");
    if (!cursoId) return;

    const chaveLista = `${cursoId}:${data.id}`;
    const chaveListaAtual = presencaDataSelecionada ? `${cursoId}:${presencaDataSelecionada.id}` : null;
    if (chaveListaAtual !== chaveLista) {
      setPresencaListaAutorizada(null);
      setSenhaConfirmacaoPresenca("");
      setPresencaErroSenha("");
      setPresencaAlteracaoPendente(null);
    }

    setPresencaDataSelecionada(data);
    setDataPresencaSelecionada(data.data_aula);
    setPresencaObservacoes(data.observacoes ?? "");
    setPresencaCarregando(true);

    try {
      const response = await matriculasService.listarPresencasPorData(cursoId, data.id);
      const mapa: Record<string, MatriculaPresencaStatus> = {};
      const mapaObservacoes: Record<string, string> = {};
      response.presencas.forEach((item) => {
        const chave = chavePresenca(item.matricula_id);
        if (!chave) return;
        mapa[chave] = item.status;
        if (item.observacao?.trim()) {
          mapaObservacoes[chave] = item.observacao.trim();
        }
      });
      setPresencasPorMatricula(mapa);
      setPresencasSalvasPorMatricula(mapa);
      setPresencasObservacoesPorMatricula(mapaObservacoes);
      setPresencaPendente(false);
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível carregar as presenças da data."
      });
      setPresencasPorMatricula({});
    } finally {
      setPresencaCarregando(false);
    }
  }

  function solicitarAtualizacaoPresenca(matriculaId: string, status: MatriculaPresencaStatus, beneficiarioNome: string) {
    const statusSalvo = presencasSalvasPorMatricula[matriculaId];
    const chaveListaAtual = presencaDataSelecionada
      ? `${idSelecionado ?? getValues("id_matricula")}:${presencaDataSelecionada.id}`
      : null;
    const listaJaAutorizada = chaveListaAtual && presencaListaAutorizada === chaveListaAtual;
    if (statusSalvo && statusSalvo !== status && !listaJaAutorizada) {
      setPresencaAlteracaoPendente({ matriculaId, status, beneficiarioNome });
      setSenhaConfirmacaoPresenca("");
      setPresencaErroSenha("");
      return;
    }
    atualizarPresenca(matriculaId, status);
  }

  function atualizarPresenca(matriculaId: string, status: MatriculaPresencaStatus) {
    setPresencasPorMatricula((atual) => ({
      ...atual,
      [matriculaId]: status
    }));
    setPresencaPendente(true);
  }

  async function confirmarAlteracaoPresenca() {
    if (!presencaAlteracaoPendente || !senhaConfirmacaoPresenca.trim()) {
      setPresencaErroSenha("Informe a senha do usuário logado para confirmar a alteração.");
      return;
    }
    const cursoId = idSelecionado ?? getValues("id_matricula");
    if (!cursoId || !presencaDataSelecionada) return;

    setPresencaValidandoSenha(true);
    try {
      await matriculasService.validarSenhaPresenca(
        cursoId,
        presencaDataSelecionada.id,
        senhaConfirmacaoPresenca.trim()
      );
      atualizarPresenca(presencaAlteracaoPendente.matriculaId, presencaAlteracaoPendente.status);
      setPresencaListaAutorizada(`${cursoId}:${presencaDataSelecionada.id}`);
      setPresencaAlteracaoPendente(null);
    } catch (error: any) {
      setPresencaErroSenha(error?.response?.data?.message ?? "A senha informada está incorreta. A alteração não foi aplicada.");
    } finally {
      setPresencaValidandoSenha(false);
    }
  }

  function alternarInscricaoAgenda(chave: string, selecionada: boolean) {
    if (selecionada) preencherAgendaPorInscricao(chave);
    setInscricoesAgendaSelecionadas((atual) =>
      selecionada ? (atual.includes(chave) ? atual : [...atual, chave]) : atual.filter((item) => item !== chave)
    );
  }

  function alternarTodasInscricoesAgenda(selecionadas: boolean) {
    const chaves = inscricoesAgendaCatalogo.map(({ chave }) => chave);
    if (selecionadas && chaves[0]) {
      preencherAgendaPorInscricao(chaves[0]);
      setTermoAgendaBeneficiario("");
      setMostrarSugestoesAgendaBeneficiario(false);
    }
    setInscricoesAgendaSelecionadas(selecionadas ? chaves : []);
  }

  function atualizarObservacaoPresenca(matriculaId: string, observacao: string) {
    setPresencasObservacoesPorMatricula((atual) => ({
      ...atual,
      [matriculaId]: observacao
    }));
    setPresencaPendente(true);
  }

  function excluirDataPresenca() {
    if (!presencaDataSelecionada) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Selecione uma data de presença para excluir."
      });
      return;
    }

    setPopupExcluirPresencaAberto(true);
  }

  async function confirmarExclusaoDataPresenca() {
    const cursoId = idSelecionado ?? getValues("id_matricula");
    if (!cursoId || !presencaDataSelecionada) return;

    setPresencaExcluindo(true);
    try {
      await matriculasService.removerPresencaData(cursoId, presencaDataSelecionada.id);
      setPopupExcluirPresencaAberto(false);
      setPresencaDataSelecionada(null);
      setPresencaListaAutorizada(null);
      setSenhaConfirmacaoPresenca("");
      setPresencaAlteracaoPendente(null);
      setPresencasPorMatricula({});
      setPresencasSalvasPorMatricula({});
      setPresencasObservacoesPorMatricula({});
      setPresencaObservacoes("");
      setDataPresencaSelecionada("");
      setPresencaPendente(false);
      await carregarPresencaDatas();
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Data de presença excluída com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir a data de presença."
      });
    } finally {
      setPresencaExcluindo(false);
    }
  }

  async function salvarPresencas() {
    const cursoId = idSelecionado ?? getValues("id_matricula");
    if (!cursoId || !presencaDataSelecionada) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Selecione uma data de presença."
      });
      return;
    }

    const presencas = inscricoesAtivas
      .filter((item): item is MatriculaInscricao & { id_matricula_item: string } => !!item.id_matricula_item)
      .map((item) => ({
        matricula_id: chavePresenca(item.id_matricula_item),
        status: (presencasPorMatricula[chavePresenca(item.id_matricula_item)] ?? "NAO_INFORMADO") as MatriculaPresencaStatus,
        observacao: presencasObservacoesPorMatricula[chavePresenca(item.id_matricula_item)]?.trim() || undefined
      }));

    setPresencaSalvando(true);
    try {
      const response = await matriculasService.salvarPresencasPorData(cursoId, presencaDataSelecionada.id, {
        data_aula: presencaDataSelecionada.data_aula,
        observacoes: presencaObservacoes || undefined,
        senha_confirmacao: senhaConfirmacaoPresenca.trim() || undefined,
        presencas
      });
      const mapa: Record<string, MatriculaPresencaStatus> = {};
      const mapaObservacoes: Record<string, string> = {};
      response.presencas.forEach((item) => {
        const chave = chavePresenca(item.matricula_id);
        if (!chave) return;
        mapa[chave] = item.status;
        if (item.observacao?.trim()) {
          mapaObservacoes[chave] = item.observacao.trim();
        }
      });
      setPresencasPorMatricula(mapa);
      setPresencasSalvasPorMatricula(mapa);
      setPresencasObservacoesPorMatricula(mapaObservacoes);
      setPresencaPendente(false);
      await carregarPresencaDatas();
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Presenças salvas com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar as presenças."
      });
    } finally {
      setPresencaSalvando(false);
    }
  }

  function adicionarInscricao() {
    const cursoIdSelecionado = idSelecionado ?? getValues("id_matricula");
    if (!cursoIdSelecionado) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Selecione o curso/atendimento na aba de inscrições antes de adicionar beneficiários."
      });
      return;
    }

    const nome = formatarTextoPadrao(novaInscricao.beneficiario_nome);
    const nomeComparacao = normalizarNomeComparacao(nome);
    const cpf = somenteDigitos(novaInscricao.cpf);
    if (nome.length < 3) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe o nome do beneficiário para adicionar a inscrição."
      });
      return;
    }
    if (cpf && !validarCpf(cpf)) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe um CPF válido na inscrição."
      });
      return;
    }

    const inscricaoDuplicada = inscricoes.some((item, index) => {
      if (index === inscricaoEditandoIndex) return false;
      const cpfItem = somenteDigitos(item.cpf);
      const nomeItem = normalizarNomeComparacao(item.beneficiario_nome);
      if (cpf && cpfItem && cpf === cpfItem) return true;
      return nomeComparacao.length >= 3 && nomeItem === nomeComparacao;
    });

    if (inscricaoDuplicada) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Beneficiário já adicionado na lista de inscrições."
      });
      return;
    }

    const ehAtendimento = (cursoSelecionadoInscricao?.tipo ?? "").trim().toUpperCase() === "ATENDIMENTO";
    const statusInscricao = ehAtendimento ? (novaInscricao.status ?? "ATIVO").trim().toUpperCase() : "ATIVO";
    const profissionalDoCurso = obterProfissionalUnico(cursoSelecionadoInscricao?.profissional);
    const profissionalSelecionado = formatarTextoPadrao(novaInscricao.profissional_nome ?? "");
    const profissionalInscricao = profissionalSelecionado || profissionalDoCurso || "";
    const vagasTotaisCurso = Number(
      matriculas.find((item) => item.id_matricula === cursoIdSelecionado)?.vagas_totais ?? getValues("vagas_totais") ?? 0
    );
    const totalInscritosAtivos = inscricoes.filter((item) => (item.status ?? "ATIVO").trim().toUpperCase() === "ATIVO").length;
    const vagasDisponiveis = Math.max(vagasTotaisCurso - totalInscritosAtivos, 0);
    const horariosOcupados = new Set(
      inscricoes
        .filter((item, index) => index !== inscricaoEditandoIndex && (item.status ?? "ATIVO").trim().toUpperCase() === "ATIVO")
        .filter((item) => !novaInscricao.data_agendada || normalizarDataIso(item.data_agendada) === normalizarDataIso(novaInscricao.data_agendada))
        .map((item) => String(item.hora_agendada ?? "").trim())
        .filter(Boolean)
    );
    const horaSolicitada = String(novaInscricao.hora_agendada ?? "").trim();
    const horariosLivres = horariosAtendimento.filter((hora) => !horariosOcupados.has(hora));
    if (ehAtendimento && controleHorarioAtendimento) {
      if (!novaInscricao.data_agendada) {
        setPopupMensagem({ tipo: "aviso", titulo: "Horário", texto: "Informe a data para consultar os horários disponíveis." });
        return;
      }
      if (horaSolicitada && !horariosLivres.includes(horaSolicitada)) {
        setPopupMensagem({ tipo: "aviso", titulo: "Horário indisponível", texto: "Esse horário já foi utilizado ou não pertence ao período configurado. Escolha um horário disponível." });
        return;
      }
    }
    const horaAgendadaAtendimento = ehAtendimento && controleHorarioAtendimento ? (horaSolicitada || horariosLivres[0] || "") : horaSolicitada;

    if (statusInscricao === "ATIVO" && vagasDisponiveis <= 0) {
      const filaDuplicada = filaEspera.some((item) => {
        const cpfItem = somenteDigitos(item.cpf);
        const nomeItem = normalizarNomeComparacao(item.beneficiario_nome);
        if (cpf && cpfItem && cpf === cpfItem) return true;
        return nomeComparacao.length >= 3 && nomeItem === nomeComparacao;
      });

      if (filaDuplicada) {
        setPopupMensagem({
          tipo: "aviso",
          titulo: "Validação",
          texto: "Não há vagas disponíveis e esse beneficiário já está na lista de espera."
        });
      } else {
        setFilaEspera((atual) => [
          ...atual,
            {
              beneficiario_nome: nome,
              cpf: cpf || undefined,
              data_entrada: obterDataAtualIso()
            }
          ]);
        setPopupMensagem({
          tipo: "aviso",
          titulo: "Lista de espera",
          texto: "Vagas encerradas para este curso/atendimento. Beneficiário enviado automaticamente para a lista de espera."
        });
      }

      setNovaInscricao({
        beneficiario_nome: "",
        cpf: "",
        email: "",
        status: "ATIVO",
        data_agendada: "",
        hora_agendada: "",
        status_agendamento: "",
        profissional_nome: "",
        confirmacao_presenca: false
      });
      setTermoCatalogoBeneficiario("");
      setTermoCatalogoProfissional("");
      return;
    }

    const inscricaoAtualizada: MatriculaInscricao = {
        ...novaInscricao,
        id_matricula_item: cursoIdSelecionado,
        beneficiario_nome: nome,
        cpf: cpf || undefined,
        email: novaInscricao.email?.trim() || undefined,
        status: statusInscricao || "ATIVO",
        data_agendada: ehAtendimento ? normalizarDataIso(novaInscricao.data_agendada) : undefined,
        hora_agendada: ehAtendimento ? horaAgendadaAtendimento || undefined : undefined,
        status_agendamento: ehAtendimento ? novaInscricao.status_agendamento?.trim() || undefined : undefined,
        profissional_nome: profissionalInscricao || undefined,
        data_matricula: inscricaoEditandoIndex !== null ? inscricoes[inscricaoEditandoIndex]?.data_matricula : obterDataAtualIso()
      };
    setInscricoes((atual) => inscricaoEditandoIndex === null
      ? [...atual, inscricaoAtualizada]
      : atual.map((item, index) => index === inscricaoEditandoIndex ? { ...item, ...inscricaoAtualizada } : item));

    const horariosOcupadosAposInclusao = new Set([...horariosOcupados, horaAgendadaAtendimento]);
    const proximoHorario =
      ehAtendimento && controleHorarioAtendimento
        ? horariosAtendimento.find((hora) => !horariosOcupadosAposInclusao.has(hora)) ?? ""
        : "";
    setNovaInscricao({
      beneficiario_nome: "",
      cpf: "",
      email: "",
      status: "ATIVO",
      data_agendada: "",
      hora_agendada: proximoHorario,
      status_agendamento: "",
      profissional_nome: "",
      confirmacao_presenca: false
    });
    setInscricaoEditandoIndex(null);
    setTermoCatalogoBeneficiario("");
    setTermoCatalogoProfissional("");
  }

  function editarInscricao(index: number) {
    const inscricao = inscricoes[index];
    if (!inscricao) return;
    setInscricaoEditandoIndex(index);
    setNovaInscricao({ ...inscricao });
    setTermoCatalogoBeneficiario(inscricao.beneficiario_nome);
    setTermoCatalogoProfissional(inscricao.profissional_nome ?? "");
    setPopupMensagem({ tipo: "aviso", titulo: "Edição de inscrição", texto: "Altere os dados e escolha somente um horário disponível. Depois clique em Atualizar inscrição." });
  }

  function removerInscricao(index: number) {
    const inscricaoRemovida = inscricoes[index];
    if (!inscricaoRemovida) return;

    const proximaLista = inscricoes.filter((_, indice) => indice !== index);
    const statusRemovido = (inscricaoRemovida.status ?? "ATIVO").trim().toUpperCase();
    setInscricoes(proximaLista);

    if (statusRemovido === "ATIVO" && filaEspera.length > 0) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Lista de espera",
        texto: "Uma vaga foi liberada. Use o botão Matricular para subir manualmente um beneficiário da lista de espera."
      });
    }
  }

  function adicionarFilaEspera() {
    const cursoIdSelecionado = idSelecionado ?? getValues("id_matricula");
    if (!cursoIdSelecionado) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Selecione o curso/atendimento na aba de inscrições antes de adicionar na fila de espera."
      });
      return;
    }

    const nome = formatarTextoPadrao(novoFilaEspera.beneficiario_nome);
    const nomeComparacao = normalizarNomeComparacao(nome);
    const cpf = somenteDigitos(novoFilaEspera.cpf);
    if (nome.length < 3) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe o nome do beneficiário para adicionar na fila de espera."
      });
      return;
    }
    if (cpf && !validarCpf(cpf)) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe um CPF válido para a fila de espera."
      });
      return;
    }

    const jaInscrito = inscricoes.some((item) => {
      const cpfItem = somenteDigitos(item.cpf);
      const nomeItem = normalizarNomeComparacao(item.beneficiario_nome);
      if (cpf && cpfItem && cpf === cpfItem) return true;
      return nomeComparacao.length >= 3 && nomeItem === nomeComparacao;
    });

    if (jaInscrito) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Esse beneficiário já está inscrito. Não é necessório incluir em lista de espera."
      });
      return;
    }

    const filaDuplicada = filaEspera.some((item) => {
      const cpfItem = somenteDigitos(item.cpf);
      const nomeItem = normalizarNomeComparacao(item.beneficiario_nome);
      if (cpf && cpfItem && cpf === cpfItem) return true;
      return nomeComparacao.length >= 3 && nomeItem === nomeComparacao;
    });

    if (filaDuplicada) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Beneficiário já incluído na lista de espera."
      });
      return;
    }

    setFilaEspera((atual) => [
      ...atual,
      {
        beneficiario_nome: nome,
        cpf: cpf || undefined,
        telefone: novoFilaEspera.telefone ? somenteDigitos(novoFilaEspera.telefone) : undefined,
        data_entrada: obterDataAtualIso()
      }
    ]);

    setNovoFilaEspera({ beneficiario_nome: "", cpf: "", telefone: "" });
    setTermoCatalogoFilaEspera("");
    setMostrarSugestoesFilaEspera(false);
  }

  function removerFilaEspera(index: number) {
    setFilaEspera((atual) => atual.filter((_, indice) => indice !== index));
  }

  function matricularFilaEspera(index: number) {
    const candidatoFila = filaEspera[index];
    if (!candidatoFila) return;

    const cursoIdSelecionado = idSelecionado ?? getValues("id_matricula");
    if (!cursoIdSelecionado) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Selecione o curso/atendimento na aba de inscrições antes de matricular pela lista de espera."
      });
      return;
    }

    if (vagasDisponiveisInscricao <= 0) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Não há vagas disponíveis para este curso/atendimento."
      });
      return;
    }

    const nome = formatarTextoPadrao(candidatoFila.beneficiario_nome);
    const nomeComparacao = normalizarNomeComparacao(nome);
    const cpf = somenteDigitos(candidatoFila.cpf);
    const inscricaoDuplicada = inscricoes.some((item) => {
      const cpfItem = somenteDigitos(item.cpf);
      const nomeItem = normalizarNomeComparacao(item.beneficiario_nome);
      if (cpf && cpfItem && cpf === cpfItem) return true;
      return nomeComparacao.length >= 3 && nomeItem === nomeComparacao;
    });

    if (inscricaoDuplicada) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Esse beneficiário já está na lista de inscrições."
      });
      return;
    }

    const horariosOcupados = new Set(
      inscricoes
        .filter((item) => (item.status ?? "ATIVO").trim().toUpperCase() === "ATIVO")
        .map((item) => String(item.hora_agendada ?? "").trim())
        .filter(Boolean)
    );
    const horarioFila =
      controleHorarioAtendimento && horariosAtendimento.length > 0
        ? horariosAtendimento.find((hora) => !horariosOcupados.has(hora))
        : undefined;

    setInscricoes((atual) => [
      ...atual,
      {
        beneficiario_nome: nome,
        cpf: cpf || undefined,
        telefone: candidatoFila.telefone ? somenteDigitos(candidatoFila.telefone) : undefined,
        status: "ATIVO",
        data_matricula: obterDataAtualIso(),
        hora_agendada: horarioFila,
        profissional_nome: obterProfissionalUnico(cursoSelecionadoInscricao?.profissional) || undefined,
        id_matricula_item: cursoIdSelecionado
      }
    ]);
    setFilaEspera((atual) => atual.filter((_, indice) => indice !== index));
    setPopupMensagem({
      tipo: "sucesso",
      titulo: "Confirmação",
      texto: `${nome} foi matriculado manualmente a partir da lista de espera.`
    });
  }

  async function carregarImagemCurso(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";

    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: "Selecione um arquivo de imagem válido."
      });
      return;
    }
    if (arquivo.size > fotoMaximaBytes) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: "A imagem deve ter no máximo 5 MB."
      });
      return;
    }

    try {
      const dataUrl = await lerArquivoComoDataUrl(arquivo);
      setImagemCursoArquivo(arquivo);
      setValue("imagem", dataUrl, { shouldDirty: true, shouldValidate: true });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.message ?? "Não foi possível processar a imagem enviada."
      });
    }
  }

  function removerImagemCurso() {
    setImagemCursoArquivo(null);
    setValue("imagem", "", { shouldDirty: true, shouldValidate: true });
  }

  async function uploadImagemCurso(arquivo: File, cursoId: string) {
    const upload = await arquivosService.uploadPorEntidade({
      scope: "curso_imagem",
      entidadeTipo: "curso",
      entidadeId: cursoId,
      arquivo,
      observacao: "Foto do curso, oficina ou atendimento"
    });

    return upload.caminhoArquivo;
  }

  async function salvar(values: MatriculaFormValues) {
    try {
      let payload = mapFormularioParaPayload(
        {
          ...values,
          imagem: imagemCursoArquivo ? snapshot?.imagem ?? "" : values.imagem
        },
        inscricoes,
        filaEspera
      );

      if (imagemCursoArquivo && payload.id_matricula) {
        setSalvandoImagemCurso(true);
        payload = {
          ...payload,
          imagem: await uploadImagemCurso(imagemCursoArquivo, payload.id_matricula)
        };
      }

      let response = await salvarMutation.mutateAsync(payload);

      if (imagemCursoArquivo && !payload.id_matricula && response.matricula.id_matricula) {
        setSalvandoImagemCurso(true);
        const caminhoImagem = await uploadImagemCurso(imagemCursoArquivo, response.matricula.id_matricula);
        response = await salvarMutation.mutateAsync({
          ...mapFormularioParaPayload(
            {
              ...values,
              id_matricula: response.matricula.id_matricula,
              imagem: caminhoImagem
            },
            inscricoes,
            filaEspera
          )
        });
      }

      setImagemCursoArquivo(null);
      const formValues = mapMatriculaParaFormulario(response.matricula);
      reset(formValues);
      setSnapshot(formValues);
      setIdSelecionado(response.matricula.id_matricula);
      setInscricoes(response.matricula.matriculas ?? []);
      setFilaEspera(response.matricula.fila_espera ?? []);
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Inscrição salva com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar a inscrição."
      });
    } finally {
      setSalvandoImagemCurso(false);
    }
  }

  const acoesPorAba: Record<AbaId, AcaoCrud[]> = {
    listagem: [
      { label: "Buscar inscrições", icon: Search, onClick: buscar, variant: "outline" },
      { label: "Nova inscrição", icon: Plus, onClick: novo, variant: "default", disabled: acaoEmAndamento },
      { label: "Imprimir inscrições", icon: Printer, onClick: () => void imprimir(), variant: "outline", disabled: acaoEmAndamento },
      { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
    ],
    dados: [
      { label: "Nova inscrição", icon: Plus, onClick: novo, variant: "default", disabled: acaoEmAndamento },
      { label: "Salvar dados da inscrição", icon: Save, onClick: () => void handleSubmit(salvar)(), variant: "default", disabled: acaoEmAndamento },
      { label: "Cancelar edição", icon: Undo2, onClick: cancelar, variant: "outline", disabled: acaoEmAndamento },
      { label: "Excluir inscrição", icon: Trash2, onClick: excluir, variant: "danger", disabled: acaoEmAndamento || !possuiMatriculaSelecionada },
      { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
    ],
    catalogo: [
      { label: "Nova inscrição", icon: Plus, onClick: novo, variant: "default", disabled: acaoEmAndamento },
      { label: "Salvar catálogo e vagas", icon: Save, onClick: () => void handleSubmit(salvar)(), variant: "default", disabled: acaoEmAndamento },
      { label: "Cancelar edição", icon: Undo2, onClick: cancelar, variant: "outline", disabled: acaoEmAndamento },
      { label: "Excluir inscrição", icon: Trash2, onClick: excluir, variant: "danger", disabled: acaoEmAndamento || !possuiMatriculaSelecionada },
      { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
    ],
    inscricoes: [
      { label: "Nova inscrição", icon: Plus, onClick: novo, variant: "default", disabled: acaoEmAndamento },
      { label: "Salvar inscrições e fila", icon: Save, onClick: () => void handleSubmit(salvar)(), variant: "default", disabled: acaoEmAndamento },
      { label: "Cancelar edição", icon: Undo2, onClick: cancelar, variant: "outline", disabled: acaoEmAndamento },
      { label: "Excluir inscrição", icon: Trash2, onClick: excluir, variant: "danger", disabled: acaoEmAndamento || !possuiMatriculaSelecionada },
      { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
    ],
    "pre-inscricoes": [],
    presenca: [
      { label: "Nova inscrição", icon: Plus, onClick: novo, variant: "default", disabled: acaoEmAndamento },
      {
        label: "Salvar presenças",
        icon: Save,
        onClick: () => void salvarPresencas(),
        variant: "default",
        disabled: acaoEmAndamento || !presencaDataSelecionada || !presencaPendente
      },
      {
        label: "Excluir data de presença",
        icon: Trash2,
        onClick: excluirDataPresenca,
        variant: "danger",
        disabled: acaoEmAndamento || !presencaDataSelecionada || !usuario?.permissoes?.includes("ADMINISTRADOR")
      },
      { label: "Imprimir Frequência", icon: Printer, onClick: () => void imprimirListaPresenca(), variant: "outline", disabled: acaoEmAndamento },
      { label: "Cancelar edição", icon: Undo2, onClick: cancelar, variant: "outline", disabled: acaoEmAndamento },
      { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
    ]
  };
  const acoes = acoesPorAba[abaAtiva];

  return (
    <section className="w-full min-h-[calc(100vh-3.5rem)] px-2 py-2 sm:px-3 lg:px-4">
      <div className={`${classesTelaPadraoBeneficiario.container} !mx-0 !max-w-none !px-2 !pb-3 !pt-2 sm:!px-3 lg:!px-4`}>
        <Card className={classesTelaPadraoBeneficiario.barraAcoes} data-print="toolbar">
          <CardContent className="p-0">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                  {secaoTela}
                </p>
                <h1 className="text-sm font-semibold tracking-tight text-[var(--g3-foreground)] sm:text-base">
                  {tituloTela}
                </h1>
              </div>

              <div className={classesTelaPadraoBeneficiario.gradeAcoes}>
                {acoes.map((acao) => {
                  const Icone = acao.icon;
                  return (
                    <Button
                      key={`${abaAtiva}-${acao.label}`}
                      type="button"
                      variant={acao.variant}
                      onClick={acao.onClick}
                      disabled={acao.disabled}
                      className={`${classesTelaPadraoBeneficiario.botaoAcao} h-8 px-3 py-1 text-xs`}
                    >
                      <Icone className="h-3.5 w-3.5" />
                      {acao.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div
          className={`${classesTelaPadraoBeneficiario.gradePrincipal} lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]`}
          data-print="layout-grid"
        >
          <Card className={classesTelaPadraoBeneficiario.cardAbas} data-print="tabs">
            <CardContent className={classesTelaPadraoBeneficiario.conteudoAbas}>
              {abas.map((aba, indice) => (
                <button
                  key={aba.id}
                  type="button"
                  className={classeBotaoAbaLateral(abaAtiva === aba.id)}
                  onClick={() => setAbaAtiva(aba.id)}
                >
                  <span className={classeNumeroAbaLateral(abaAtiva === aba.id)}>{indice + 1}</span>
                  <span className="min-w-0 break-words">{aba.label}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className={classesTelaPadraoBeneficiario.cardConteudo}>
            <CardHeader className={classesTelaPadraoBeneficiario.cabecalhoConteudo}>
              <CardTitle className={classesTelaPadraoBeneficiario.tituloAba}>
                {abaAtual?.icon ? <abaAtual.icon className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
                <span className={classesTelaPadraoBeneficiario.tituloAbaTexto}>
                  {abaAtual?.id === "listagem" ? "Listagem" : abaAtual?.label ?? tituloTela}
                </span>
              </CardTitle>
              <span className="rounded-full border border-[var(--g3-border)] bg-[var(--g3-card)] px-2 py-1 text-xs text-[var(--g3-muted)]">
                Código: {getValues("id_matricula") ?? "---"}
              </span>
            </CardHeader>

            <CardContent className="space-y-4 p-3">
              {abaAtiva === "pre-inscricoes" && <PreInscricoesPage embutida />}

              {abaAtiva === "listagem" && (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-2xl border border-emerald-200 bg-[linear-gradient(180deg,#f5fff7_0%,#def7e6_100%)] p-4 text-center shadow-[0_18px_40px_rgba(22,101,52,0.12)]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700/80">
                        Cursos/atendimentos
                      </p>
                      <p className="mt-3 text-3xl font-black text-emerald-950">
                        {resumoListagem.totalCursos}
                      </p>
                      <p className="mt-2 text-sm text-emerald-800/80">
                        Opções ativas para inscrição e acompanhamento.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-[linear-gradient(180deg,#f6fff8_0%,#e3f8e9_100%)] p-4 text-center shadow-[0_18px_40px_rgba(22,101,52,0.12)]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700/80">
                        Vagas totais
                      </p>
                      <p className="mt-3 text-3xl font-black text-emerald-950">
                        {resumoListagem.totalVagas}
                      </p>
                      <p className="mt-2 text-sm text-emerald-800/80">
                        Capacidade cadastrada em todos os cursos e atendimentos.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-[linear-gradient(180deg,#f8fffa_0%,#dcfce6_100%)] p-4 text-center shadow-[0_18px_40px_rgba(22,101,52,0.14)]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700/80">
                        Vagas disponíveis
                      </p>
                      <p className="mt-3 text-3xl font-black text-emerald-700">
                        {resumoListagem.totalDisponiveis}
                      </p>
                      <p className="mt-2 text-sm text-emerald-800/80">
                        Quantidade liberada para novas inscrições no momento.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-[linear-gradient(180deg,#f5fff7_0%,#ddf6e5_100%)] p-4 text-center shadow-[0_18px_40px_rgba(22,101,52,0.12)]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700/80">
                        Inscrições
                      </p>
                      <p className="mt-3 text-3xl font-black text-emerald-950">
                        {resumoListagem.totalInscritos}
                      </p>
                      <p className="mt-2 text-sm text-emerald-800/80">
                        Inscrições registradas considerando todos os status ativos.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-[linear-gradient(180deg,#f7fff9_0%,#dff7e7_100%)] p-4 text-center shadow-[0_18px_40px_rgba(22,101,52,0.12)]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700/80">
                        Fila de espera
                      </p>
                      <p className="mt-3 text-3xl font-black text-emerald-950">
                        {resumoListagem.totalFila}
                      </p>
                      <p className="mt-2 text-sm text-emerald-800/80">
                        Ocupação atual do quadro: {resumoListagem.ocupacao}%.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
                    <div className="space-y-1">
                      <Label htmlFor="filtro-nome">Nome</Label>
                      <Input
                        id="filtro-nome"
                        value={filtroDraft.nome}
                        onChange={(event) => setFiltroDraft((atual) => ({ ...atual, nome: event.target.value }))}
                        onKeyDown={onFiltroEnter}
                        placeholder="Nome da inscrição"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="filtro-tipo">Tipo</Label>
                      <Select
                        id="filtro-tipo"
                        value={filtroDraft.tipo}
                        onChange={(event) => setFiltroDraft((atual) => ({ ...atual, tipo: event.target.value }))}
                        onKeyDown={onFiltroEnter}
                      >
                        <option value="">Todos</option>
                        {matriculaTipoOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="filtro-status">Status</Label>
                      <Select
                        id="filtro-status"
                        value={filtroDraft.status}
                        onChange={(event) => setFiltroDraft((atual) => ({ ...atual, status: event.target.value }))}
                        onKeyDown={onFiltroEnter}
                      >
                        <option value="">Todos</option>
                        {matriculaStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="filtro-profissional">Profissional</Label>
                      <Input
                        id="filtro-profissional"
                        value={filtroDraft.profissional}
                        onChange={(event) =>
                          setFiltroDraft((atual) => ({ ...atual, profissional: event.target.value }))
                        }
                        onKeyDown={onFiltroEnter}
                        placeholder="Nome do profissional"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="filtro-beneficiario">Beneficiário</Label>
                      <Input
                        id="filtro-beneficiario"
                        value={filtroDraft.beneficiario}
                        onChange={(event) =>
                          setFiltroDraft((atual) => ({ ...atual, beneficiario: event.target.value }))
                        }
                        onKeyDown={onFiltroEnter}
                        placeholder="Nome do beneficiário"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="filtro-unidade">Unidade</Label>
                      <Select
                        id="filtro-unidade"
                        value={filtroDraft.unidade_id ?? ""}
                        onChange={(event) =>
                          setFiltroDraft((atual) => ({
                            ...atual,
                            unidade_id: event.target.value,
                            sala_id: ""
                          }))
                        }
                        onKeyDown={onFiltroEnter}
                      >
                        <option value="">Todas</option>
                        {unidadesListagem.map((unidade) => (
                          <option key={unidade.id} value={unidade.id}>
                            {unidade.nome}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="filtro-sala">Sala</Label>
                      <Select
                        id="filtro-sala"
                        value={filtroDraft.sala_id ?? ""}
                        onChange={(event) => setFiltroDraft((atual) => ({ ...atual, sala_id: event.target.value }))}
                        onKeyDown={onFiltroEnter}
                        disabled={!salasListagem.length}
                      >
                        <option value="">Todas</option>
                        {salasListagem.map((sala) => (
                          <option key={sala.id} value={sala.id}>
                            {sala.nome}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-[var(--g3-active)] bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"
                      onClick={limparFiltros}
                    >
                      Limpar filtros
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "", label: "Todos" },
                      { value: "AGENDADO", label: "Agendado" },
                      { value: "PENDENTE", label: "Pendente" },
                      { value: "CANCELADA", label: "Cancelada" },
                      { value: "FINALIZADA", label: "Finalizada" }
                    ].map((item) => (
                      <Button
                        key={item.label}
                        type="button"
                        variant={filtroStatusAgendamentoRapido === item.value ? "default" : "outline"}
                        className={filtroStatusAgendamentoRapido === item.value ? "" : "bg-white"}
                        onClick={() => setFiltroStatusAgendamentoRapido(item.value as typeof filtroStatusAgendamentoRapido)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[var(--g3-foreground)]">Alunos por unidade e sala</h3>
                      <span className="text-xs text-[var(--g3-muted)]">
                        {alunosPorUnidadeSala.length} sala(s) com alunos vinculados
                      </span>
                    </div>
                    {carregandoLista ? (
                      <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-4 text-sm text-[var(--g3-muted)]">
                        Carregando alunos por sala...
                      </div>
                    ) : alunosPorUnidadeSala.length ? (
                      <div className="grid gap-3 xl:grid-cols-2">
                        {alunosPorUnidadeSala.map((grupo) => (
                          <div
                            key={`${grupo.unidadeNome}-${grupo.salaNome}`}
                            className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--g3-border)] pb-2">
                              <div>
                                <p className="text-sm font-semibold text-[var(--g3-foreground)]">{grupo.unidadeNome}</p>
                                <p className="text-xs text-[var(--g3-muted)]">{grupo.salaNome}</p>
                              </div>
                              <span className="rounded-full bg-[var(--g3-primary-soft)] px-2 py-1 text-xs font-semibold text-[var(--g3-active)]">
                                {grupo.alunos.length} aluno(s)
                              </span>
                            </div>
                            <div className="mt-2 max-h-56 overflow-y-auto">
                              <table className="min-w-full text-xs">
                                <thead className="text-[var(--g3-muted)]">
                                  <tr>
                                    <th className="px-2 py-1 text-left font-semibold">Aluno</th>
                                    <th className="px-2 py-1 text-left font-semibold">Curso / atendimento</th>
                                    <th className="px-2 py-1 text-left font-semibold">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {grupo.alunos.map((aluno, alunoIndex) => (
                                    <tr
                                      key={`${aluno.id_matricula_item ?? aluno.beneficiario_nome}-${alunoIndex}`}
                                      className="border-t border-[var(--g3-border)]"
                                    >
                                      <td className="px-2 py-1 align-top font-medium text-[var(--g3-foreground)]">
                                        {aluno.beneficiario_nome}
                                      </td>
                                      <td className="px-2 py-1 align-top text-[var(--g3-muted)]">{aluno.curso_nome}</td>
                                      <td className="px-2 py-1 align-top text-[var(--g3-muted)]">{aluno.status ?? "---"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-4 text-sm text-[var(--g3-muted)]">
                        Nenhum aluno vinculado a unidade e sala com os filtros atuais.
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
                    <table className="min-w-full table-fixed text-xs">
                      <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                        <tr>
                          <th className="w-[22%] px-2 py-2 text-left font-semibold">Beneficiário</th>
                          <th className="w-[14%] px-2 py-2 text-left font-semibold">CPF</th>
                          <th className="w-[27%] px-2 py-2 text-left font-semibold">Curso / atendimento</th>
                          <th className="w-[14%] px-2 py-2 text-left font-semibold">Data da inscrição</th>
                          <th className="w-[14%] px-2 py-2 text-left font-semibold">Agendamento</th>
                          <th className="w-[9%] px-2 py-2 text-left font-semibold">Profissional</th>
                        </tr>
                      </thead>
                      <tbody>
                        {carregandoLista ? (
                          <tr>
                            <td className="px-2 py-4 text-center text-[var(--g3-muted)]" colSpan={6}>
                              Carregando inscrições...
                            </td>
                          </tr>
                        ) : inscricoesListagem.length ? (
                          inscricoesListagem.map((item, index) => {
                            const possuiAgendamento = Boolean(normalizarDataIso(item.data_agendada) || String(item.hora_agendada ?? "").trim());
                            const agendamento = item.data_agendada
                              ? `${formatarData(item.data_agendada)}${item.hora_agendada ? ` às ${item.hora_agendada}` : ""}`
                              : "---";
                              return (
                              <tr
                                key={`${item.curso_id ?? "sem-curso"}-${item.id_matricula_item ?? index}`}
                                className={`cursor-pointer border-t border-[var(--g3-border)] ${
                                  item.curso_id && item.curso_id === idSelecionado
                                    ? "bg-[var(--g3-primary-soft-hover)]"
                                    : index % 2 === 0
                                      ? "bg-[var(--g3-card)]"
                                      : "bg-[var(--g3-primary-soft)]/35"
                                } hover:bg-[var(--g3-primary-soft-hover)]`}
                                onClick={() => item.curso_id && selecionarMatricula(item.curso_id)}
                              >
                                <td className="px-2 py-2 align-top">
                                  <div className="space-y-0.5 break-words">
                                    <p className="font-medium text-[var(--g3-foreground)]">{item.beneficiario_nome}</p>
                                    <p className="text-[11px] text-[var(--g3-muted)]">
                                      {item.telefone ? `Tel.: ${formatarTelefone(item.telefone)}` : "Tel.: ---"}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-2 py-2 align-top whitespace-nowrap">{formatarCpf(item.cpf)}</td>
                                <td className="px-2 py-2 align-top break-words">{item.curso_nome}</td>
                                <td className="px-2 py-2 align-top whitespace-nowrap">{formatarData(item.data_matricula)}</td>
                                <td className="px-2 py-2 align-top">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[11px] text-[var(--g3-muted)]">{agendamento}</span>
                                  </div>
                                </td>
                                <td className="px-2 py-2 align-top break-words">
                                  {obterPrimeiroNome(item.profissional_nome)}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td className="px-2 py-4 text-center text-[var(--g3-muted)]" colSpan={6}>
                              Nenhuma inscrição encontrada.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {abaAtiva === "dados" && (
                <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-1">
                      <Label htmlFor="tipo">Tipo *</Label>
                      <Select id="tipo" {...register("tipo")}>
                        {matriculaTipoOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                      {errors.tipo && <p className="text-xs text-rose-600">{errors.tipo.message}</p>}
                    </div>

                    <div className="space-y-1 xl:col-span-2">
                      <Label htmlFor="nome">Nome do Curso/Atendimento *</Label>
                      <Input
                        id="nome"
                        {...register("nome")}
                        onBlur={() => aplicarFormatacaoCampo("nome")}
                        placeholder="Informe o nome do curso ou atendimento"
                      />
                      {errors.nome && <p className="text-xs text-rose-600">{errors.nome.message}</p>}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="status">Status *</Label>
                      <Select id="status" {...register("status")}>
                        {matriculaStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                      {errors.status && <p className="text-xs text-rose-600">{errors.status.message}</p>}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="horario_inicial">Horário inicial *</Label>
                      <Input id="horario_inicial" type="time" {...register("horario_inicial")} />
                      {errors.horario_inicial && <p className="text-xs text-rose-600">{errors.horario_inicial.message}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="duracao_horas">Duração (minutos) *</Label>
                      <Input id="duracao_horas" type="number" min={0} {...register("duracao_horas")} />
                      {errors.duracao_horas && <p className="text-xs text-rose-600">{errors.duracao_horas.message}</p>}
                    </div>
                    {ehTipoAtendimento && (
                      <div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50/70 p-3 xl:col-span-4">
                        <div>
                          <div>
                            <Label>Como deseja controlar as vagas?</Label>
                            <p className="text-[11px] text-sky-800/80">
                              Escolha horário para criar vagas como 19:00, 19:30 e 20:00, ou período para usar uma quantidade total.
                            </p>
                          </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${controleHorarioSelecionado ? "border-emerald-400 bg-emerald-50" : "border-sky-200 bg-white"}`}>
                            <input type="radio" name="modo-vagas-atendimento" checked={controleHorarioSelecionado} onChange={() => setValue("controle_horario_atendimento", true, { shouldDirty: true, shouldValidate: true })} className="mt-1" />
                            <span><strong className="block text-sm text-slate-800">Controlar por horário</strong><span className="text-xs text-slate-600">Uma vaga por intervalo de atendimento.</span></span>
                          </label>
                          <label className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${!controleHorarioSelecionado ? "border-emerald-400 bg-emerald-50" : "border-sky-200 bg-white"}`}>
                            <input type="radio" name="modo-vagas-atendimento" checked={!controleHorarioSelecionado} onChange={() => setValue("controle_horario_atendimento", false, { shouldDirty: true, shouldValidate: true })} className="mt-1" />
                            <span><strong className="block text-sm text-slate-800">Controlar por período</strong><span className="text-xs text-slate-600">Uma quantidade total de vagas no período.</span></span>
                          </label>
                        </div>
                        {controleHorarioAtendimento ? <p className="text-xs font-medium text-emerald-800">As vagas totais serão calculadas automaticamente a partir do horário inicial, final e duração.</p> : <p className="text-xs font-medium text-slate-700">Informe manualmente a quantidade de vagas totais e disponíveis abaixo.</p>}
                        <div className="space-y-1">
                          <Label htmlFor="horario_final_atendimento">Horário final *</Label>
                          <Input id="horario_final_atendimento" type="time" {...register("horario_final_atendimento")} />
                          {errors.horario_final_atendimento && (
                            <p className="text-xs text-rose-600">{errors.horario_final_atendimento.message}</p>
                          )}
                        </div>
                        <div className="rounded-md border border-sky-200 bg-white px-3 py-2 text-xs text-sky-900">
                          {horariosAtendimento.length > 0 ? (
                            <>
                              <p className="font-semibold">
                                {horariosAtendimento.length} vaga(s) calculada(s) para o período
                              </p>
                              <p className="mt-1">Horários preparados: {horariosAtendimento.join(", ")}</p>
                            </>
                          ) : (
                            <p>Informe horários válidos e uma duração em minutos maior que zero para calcular as vagas.</p>
                          )}
                        </div>
                        {errors.controle_horario_atendimento && (
                          <p className="text-xs text-rose-600">{errors.controle_horario_atendimento.message}</p>
                        )}
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label htmlFor="carga_horaria">Carga horária total (horas)</Label>
                      <Input id="carga_horaria" type="number" min={0} {...register("carga_horaria")} />
                      {errors.carga_horaria && <p className="text-xs text-rose-600">{errors.carga_horaria.message}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="vagas_totais">Quantidade de vagas totais *</Label>
                      <Input id="vagas_totais" type="number" min={0} readOnly={controleHorarioAtendimento} {...register("vagas_totais")} />
                      {errors.vagas_totais && <p className="text-xs text-rose-600">{errors.vagas_totais.message}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="vagas_disponiveis">Vagas disponíveis</Label>
                      <Input
                        id="vagas_disponiveis"
                        type="number"
                        min={0}
                        readOnly={controleHorarioAtendimento}
                        {...register("vagas_disponiveis")}
                      />
                      {errors.vagas_disponiveis && <p className="text-xs text-rose-600">{errors.vagas_disponiveis.message}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="unidade_id">Unidade *</Label>
                      <Select
                        id="unidade_id"
                        {...register("unidade_id")}
                        onChange={(event) => {
                          setValue("unidade_id", event.target.value, { shouldDirty: true, shouldValidate: true });
                          setValue("sala_id", "", { shouldDirty: true, shouldValidate: true });
                        }}
                      >
                        <option value="">Selecione a unidade</option>
                        {unidadesCatalogo.map((unidade) => (
                          <option key={unidade.id} value={unidade.id}>
                            {unidade.nome}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="sala_id">Sala *</Label>
                      <Select id="sala_id" {...register("sala_id")} disabled={!unidadeIdFormulario && unidadesCatalogo.length > 0}>
                        <option value="">
                          {unidadeIdFormulario || !unidadesCatalogo.length ? "Selecione a sala" : "Selecione a unidade primeiro"}
                        </option>
                        {salasFormulario.map((sala: MatriculaSalaCatalogo) => (
                          <option key={sala.id_sala} value={sala.id_sala}>
                            {sala.nome}
                          </option>
                        ))}
                      </Select>
                      {errors.sala_id && <p className="text-xs text-rose-600">{errors.sala_id.message}</p>}
                    </div>
                  </div>

                  <div className="grid gap-3 xl:grid-cols-12">
                    <div className="space-y-1 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3 xl:col-span-3">
                      <input type="hidden" {...register("imagem")} />
                      <Label>Foto do curso/atendimento</Label>
                      <div className="mt-2 flex aspect-[4/3] w-full max-w-[260px] items-center justify-center overflow-hidden rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)]">
                        {imagemAtual ? (
                          <ImagemAutenticada
                            valor={imagemAtual}
                            alt="Foto do curso ou atendimento"
                            className="h-full w-full object-cover"
                            placeholder="Sem foto"
                          />
                        ) : (
                          <span className="px-3 text-center text-xs text-[var(--g3-muted)]">Sem foto</span>
                        )}
                      </div>
                      <input
                        ref={inputImagemRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => void carregarImagemCurso(event)}
                      />
                      <div className="mt-2 flex w-full max-w-[260px] gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => inputImagemRef.current?.click()}
                        >
                          <Upload className="mr-1.5 h-3.5 w-3.5" />
                          Enviar foto
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={removerImagemCurso}
                          disabled={!imagemAtual}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Remover
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3 xl:col-span-9">
                      <input type="hidden" {...register("profissional")} />
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
                        <div className="space-y-1 xl:col-span-6">
                          <Label htmlFor="profissional">
                            {ehTipoAtendimento ? "Profissionais de atendimento" : "Profissional responsável"}
                          </Label>
                          <Input
                            id="profissional"
                            value={ehTipoAtendimento ? termoCatalogoProfissionalResponsavel : profissionalResponsavelValor}
                            onChange={(event) => {
                              const valor = event.target.value;
                              if (ehTipoAtendimento) {
                                setTermoCatalogoProfissionalResponsavel(valor);
                                setMostrarSugestoesProfissionalResponsavel(true);
                                return;
                              }
                              setValue("profissional", valor, {
                                shouldDirty: true,
                                shouldValidate: true
                              });
                              setTermoCatalogoProfissionalResponsavel(valor);
                              setMostrarSugestoesProfissionalResponsavel(true);
                            }}
                            onFocus={() => {
                              const valorAtual = ehTipoAtendimento
                                ? termoCatalogoProfissionalResponsavel
                                : String(getValues("profissional") ?? "");
                              setTermoCatalogoProfissionalResponsavel(valorAtual);
                              setMostrarSugestoesProfissionalResponsavel(true);
                            }}
                            onBlur={() => {
                              if (!ehTipoAtendimento) {
                                aplicarFormatacaoCampo("profissional");
                              }
                              setTimeout(() => setMostrarSugestoesProfissionalResponsavel(false), 120);
                            }}
                            placeholder={
                              ehTipoAtendimento
                                ? "Busque e selecione um ou mais profissionais"
                                : "Digite o nome do profissional ou voluntário"
                            }
                          />
                          {ehTipoAtendimento && (
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {profissionaisAtendimentoSelecionados.length ? (
                                profissionaisAtendimentoSelecionados.map((nome) => (
                                  <button
                                    key={nome}
                                    type="button"
                                    className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800"
                                    onClick={() => removerProfissionalAtendimento(nome)}
                                    title="Remover profissional"
                                  >
                                    {nome}
                                    <X className="h-3 w-3" />
                                  </button>
                                ))
                              ) : (
                                <p className="text-[11px] text-[var(--g3-muted)]">
                                  Nenhum profissional selecionado.
                                </p>
                              )}
                            </div>
                          )}
                          {mostrarSugestoesProfissionalResponsavel &&
                            termoCatalogoProfissionalResponsavel.trim().length > 0 &&
                            termoCatalogoProfissionalResponsavel.trim().length < 2 && (
                              <p className="text-[11px] text-[var(--g3-muted)]">
                                Digite pelo menos 2 caracteres para buscar.
                              </p>
                            )}
                          {mostrarSugestoesProfissionalResponsavel &&
                            (carregandoProfissionaisResponsavelCatalogo || profissionaisResponsavelCatalogo.length > 0) &&
                            termoCatalogoProfissionalResponsavel.trim().length >= 2 && (
                              <div className="max-h-32 overflow-y-auto rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] p-1">
                                {carregandoProfissionaisResponsavelCatalogo ? (
                                  <p className="px-2 py-1 text-xs text-[var(--g3-muted)]">
                                    Buscando profissionais e voluntários...
                                  </p>
                                ) : (
                                  profissionaisResponsavelCatalogo.map((item) => (
                                    <button
                                      key={`${item.id_profissional}-${item.categoria}`}
                                      type="button"
                                      className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-[var(--g3-primary-soft)]"
                                      onMouseDown={(event) => event.preventDefault()}
                                      onClick={() => preencherProfissionalResponsavel(item)}
                                    >
                                      {item.nome_completo} ({item.categoria})
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                        </div>

                        <div className="space-y-1 xl:col-span-4">
                          <Label htmlFor="instituicao_parceira">Instituição parceira</Label>
                          <Input
                            id="instituicao_parceira"
                            {...register("instituicao_parceira")}
                            onBlur={() => aplicarFormatacaoCampo("instituicao_parceira")}
                            placeholder="Ex.: Faculdade/Instituição parceira"
                          />
                        </div>

                        <div className="space-y-1 xl:col-span-2">
                          <Label htmlFor="sexo_permitido">Sexo permitido</Label>
                          <Select id="sexo_permitido" {...register("sexo_permitido")}>
                            {matriculaSexoPermitidoOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </div>

                      <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-1">
                          <Label htmlFor="data_triagem" className="whitespace-nowrap">Data de triagem</Label>
                          <Input id="data_triagem" type="date" {...register("data_triagem")} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="data_encaminhamento" className="whitespace-nowrap">Encaminhamento</Label>
                          <Input id="data_encaminhamento" type="date" {...register("data_encaminhamento")} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="data_conclusao" className="whitespace-nowrap">Data de conclusão</Label>
                          <Input id="data_conclusao" type="date" {...register("data_conclusao")} />
                        </div>
                        <div className="space-y-1">
                          <Label className="whitespace-nowrap">
                            Vaga para idosos
                          </Label>
                          <label className="flex h-10 items-center gap-2 rounded-md border border-[var(--g3-border)] bg-white px-3 text-sm text-[var(--g3-foreground)]">
                            <Checkbox
                              checked={watch("vaga_preferencial_idosos")}
                              onChange={(event) =>
                                setValue("vaga_preferencial_idosos", event.target.checked, {
                                  shouldDirty: true,
                                  shouldValidate: true
                                })
                              }
                            />
                            Sim
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                    <p className="text-sm font-semibold text-[var(--g3-foreground)]">Dias da semana</p>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      {diasSemanaOptions.map((dia) => (
                        <label
                          key={dia}
                          className="flex items-center gap-2 rounded border border-[var(--g3-border)] px-2 py-1 text-sm"
                        >
                          <Checkbox
                            checked={diasSemanaSelecionados.includes(dia)}
                            onChange={() => alternarLista("dias_semana", dia)}
                          />
                          {dia}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                    <p className="text-sm font-semibold text-[var(--g3-foreground)]">Faixa etária</p>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      <label className="flex items-center gap-2 rounded border border-sky-200 bg-sky-50 px-2 py-1 text-sm font-medium text-sky-900">
                        <Checkbox
                          checked={faixaEtariaOptions.every((faixa) => faixaEtariaSelecionada.includes(faixa))}
                          onChange={alternarTodasFaixasEtarias}
                        />
                        Todas as idades
                      </label>
                      {faixaEtariaOptions.map((faixa) => (
                        <label
                          key={faixa}
                          className="flex items-center gap-2 rounded border border-[var(--g3-border)] px-2 py-1 text-sm"
                        >
                          <Checkbox
                            checked={faixaEtariaSelecionada.includes(faixa)}
                            onChange={() => alternarLista("faixa_etaria", faixa)}
                          />
                          {faixa}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 xl:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="descricao">Descrição / Objetivo</Label>
                      <Textarea
                        id="descricao"
                        rows={4}
                        {...register("descricao")}
                        onBlur={() => aplicarFormatacaoCampo("descricao")}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="restricoes">Restrições e público indicado</Label>
                      <Textarea
                        id="restricoes"
                        rows={4}
                        {...register("restricoes")}
                        onBlur={() => aplicarFormatacaoCampo("restricoes")}
                      />
                    </div>
                  </div>
                </form>
              )}

              {abaAtiva === "catalogo" && (
                <div className="space-y-4">
                  {carregandoCatalogo ? (
                    <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-8 text-center text-sm text-[var(--g3-muted)]">
                      Carregando catálogo de cursos e vagas...
                    </div>
                  ) : matriculas.length ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {matriculas.map((item) => {
                        const vagasTotais = item.vagas_totais ?? 0;
                        const vagasDisponiveis = item.vagas_disponiveis ?? 0;
                        const vagasOcupadas = Math.max(0, vagasTotais - vagasDisponiveis);
                        const percentualOcupacao =
                          vagasTotais > 0 ? Math.min(100, Math.round((vagasOcupadas / vagasTotais) * 100)) : 0;
                        const possuiVagas = vagasDisponiveis > 0;
                        const diasCurso = item.dias_semana?.length ? item.dias_semana.join(", ") : "---";
                        const idadePermitida = item.faixa_etaria?.length ? item.faixa_etaria.join(", ") : "---";
                        const horarioAulas =
                          item.horario_inicial && item.duracao_horas
                            ? `${item.horario_inicial} (${item.duracao_horas} min)`
                            : item.horario_inicial ?? "---";
                        const periodoCurso =
                          item.data_triagem || item.data_conclusao
                            ? `${formatarData(item.data_triagem)} a ${formatarData(item.data_conclusao)}`
                            : "---";
                        const faseAtendimento =
                          item.data_triagem && !item.data_encaminhamento ? "Triagem" : "Andamento";

                        return (
                          <div
                            key={item.id_matricula}
                            role="button"
                            tabIndex={0}
                            className="space-y-3 rounded-xl border border-[var(--g3-border)] bg-gradient-to-br from-[var(--g3-card)] via-[var(--g3-primary-soft)]/45 to-[var(--g3-card)] p-3 text-left shadow-md transition hover:-translate-y-0.5 hover:border-[var(--g3-active)] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--g3-active)]"
                            onClick={() => item.id_matricula && selecionarMatricula(item.id_matricula)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                if (item.id_matricula) selecionarMatricula(item.id_matricula);
                              }
                            }}
                          >
                            <div className="flex flex-col items-center gap-2 text-center">
                              <div className="relative mb-5 flex aspect-[4/3] w-full max-w-[220px] items-center justify-center overflow-visible rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] shadow-sm">
                                {item.imagem_thumbnail || item.imagem ? (
                                  <ImagemAutenticada
                                    valor={item.imagem_thumbnail}
                                    fallbackValor={item.imagem}
                                    alt={`Foto de ${item.nome}`}
                                    className="h-full w-full rounded-md object-cover"
                                    placeholder="Sem foto"
                                  />
                                ) : (
                                  <span className="px-2 text-center text-[10px] text-[var(--g3-muted)]">Sem foto</span>
                                )}
                                <div className="pointer-events-none absolute inset-x-2 bottom-0 flex translate-y-1/2 items-center justify-between gap-2">
                                  <span
                                    className={`rounded-full border px-2 py-1 text-[11px] font-semibold shadow-md ring-1 ring-black/10 ${
                                      possuiVagas
                                        ? "border-emerald-200 bg-emerald-100/95 text-emerald-700"
                                        : "border-rose-200 bg-rose-100/95 text-rose-700"
                                    }`}
                                  >
                                    {possuiVagas ? "Inscrições abertas" : "Esgotado"}
                                  </span>
                                  <span
                                    className={`rounded-full border px-2 py-1 text-[11px] font-semibold shadow-md ring-1 ring-black/10 ${
                                      faseAtendimento === "Triagem"
                                        ? "border-amber-200 bg-amber-100/95 text-amber-700"
                                        : "border-sky-200 bg-sky-100/95 text-sky-700"
                                    }`}
                                  >
                                    {faseAtendimento}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                                {`${formatarTextoPadrao(item.tipo ?? "Curso")}: ${formatarTextoPadrao(item.nome ?? "---")}`}
                              </p>
                              <p className="text-xs text-[var(--g3-muted)]">Profissional: {item.profissional ?? "---"}</p>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                              <div className="rounded-md border border-emerald-200 bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100/70 p-2 shadow-sm">
                                <p className="text-[11px] font-medium text-emerald-800/80">Vagas</p>
                                <p className="font-semibold text-[var(--g3-foreground)]">
                                  {vagasDisponiveis}/{vagasTotais}
                                </p>
                              </div>
                              <div className="rounded-md border border-emerald-200 bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100/70 p-2 shadow-sm">
                                <p className="text-[11px] font-medium text-emerald-800/80">Inscritos</p>
                                <p className="font-semibold text-[var(--g3-foreground)]">{item.total_matriculas ?? 0}</p>
                              </div>
                              <div className="rounded-md border border-emerald-200 bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100/70 p-2 shadow-sm">
                                <p className="text-[11px] font-medium text-emerald-800/80">Fila</p>
                                <p className="font-semibold text-[var(--g3-foreground)]">{item.total_fila_espera ?? 0}</p>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="h-2 overflow-hidden rounded-full bg-[var(--g3-primary-soft)]">
                                <div
                                  className="h-full bg-[var(--g3-active)]"
                                  style={{ width: `${percentualOcupacao}%` }}
                                />
                              </div>
                              <p className="text-[11px] text-[var(--g3-muted)]">
                                Ocupação: {percentualOcupacao}% ({vagasOcupadas} de {vagasTotais})
                              </p>
                            </div>

                            <div className="space-y-1 text-xs text-[var(--g3-foreground)]">
                              <p>
                                <span className="text-[var(--g3-muted)]">Horário das aulas:</span> {horarioAulas}
                              </p>
                              <p>
                                <span className="text-[var(--g3-muted)]">Período do curso:</span> {periodoCurso}
                              </p>
                              <p>
                                <span className="text-[var(--g3-muted)]">Idade:</span> {idadePermitida}
                              </p>
                              <p>
                                <span className="text-[var(--g3-muted)]">Dias:</span> {diasCurso}
                              </p>
                              <p>
                                <span className="text-[var(--g3-muted)]">Vagas restantes:</span> {vagasDisponiveis}
                              </p>
                              <p>
                                <span className="text-[var(--g3-muted)]">Sala:</span> {item.sala_nome ?? "---"}
                              </p>
                              <p>
                                <span className="text-[var(--g3-muted)]">Unidade:</span> {item.unidade_nome ?? "---"}
                              </p>
                              <p>
                                <span className="text-[var(--g3-muted)]">Instituição:</span>{" "}
                                {item.instituicao_parceira ?? "---"}
                              </p>
                            </div>
                            <div className="pt-1">
                              <Button
                                type="button"
                                className="w-full shadow-sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (item.id_matricula) selecionarCursoParaInscricao(item.id_matricula);
                                }}
                                disabled={!item.id_matricula}
                              >
                                Inscrever beneficiário
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-8 text-center text-sm text-[var(--g3-muted)]">
                      Nenhum curso encontrado no catálogo.
                    </div>
                  )}
                </div>
              )}
              {abaAtiva === "inscricoes" && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[var(--g3-foreground)]">Inscrições e lista de espera</p>
                        <p className="text-xs text-[var(--g3-muted)]">
                          Consulte e gerencie os beneficiários inscritos e a fila de espera deste curso ou atendimento.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-[var(--g3-border)] p-3">
                    <p className="mb-3 text-sm font-semibold text-[var(--g3-foreground)]">
                      Seleção de curso/atendimento
                    </p>
                    <div className="grid gap-3 xl:grid-cols-12">
                      <div className="xl:col-span-9 space-y-1">
                        <Label htmlFor="inscricao-curso">Curso/atendimento *</Label>
                        <Select
                          id="inscricao-curso"
                          value={idSelecionado ?? getValues("id_matricula") ?? ""}
                          onChange={(event) => selecionarCursoParaInscricao(event.target.value)}
                        >
                          <option value="">Selecione</option>
                          {matriculas
                            .filter((item) => !!item.id_matricula)
                            .map((item) => (
                              <option key={item.id_matricula} value={item.id_matricula}>
                                {item.tipo} - {item.nome} ({item.vagas_disponiveis ?? 0}/{item.vagas_totais} vagas)
                              </option>
                            ))}
                        </Select>
                      </div>
                      <div className="xl:col-span-3 flex items-end">
                        <Button type="button" variant="outline" className="w-full" onClick={() => setAbaAtiva("catalogo")}>
                          Ver catálogo
                        </Button>
                      </div>
                    </div>
                    {!idSelecionado && !getValues("id_matricula") && (
                      <p className="mt-2 text-[11px] text-[var(--g3-muted)]">
                        Selecione um curso/atendimento para liberar inscrições e lista de espera.
                      </p>
                    )}
                    {cursoSelecionadoInscricao && (
                      <div className="mt-3 grid gap-2 md:grid-cols-3">
                        <div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-2">
                          <p className="text-[11px] font-semibold text-[var(--g3-muted)]">Horário do curso</p>
                          <p className="text-xs text-[var(--g3-foreground)]">
                            {cursoSelecionadoInscricao.horario_inicial
                              ? `${cursoSelecionadoInscricao.horario_inicial} (${cursoSelecionadoInscricao.duracao_horas} min)`
                              : "Não informado"}
                          </p>
                        </div>
                        <div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-2">
                          <p className="text-[11px] font-semibold text-[var(--g3-muted)]">Datas / dias do curso</p>
                          <p className="text-xs text-[var(--g3-foreground)]">
                            {cursoSelecionadoInscricao.dias_semana?.length
                              ? cursoSelecionadoInscricao.dias_semana.join(", ")
                              : "Não informado"}
                          </p>
                        </div>
                        <div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-2">
                          <p className="text-[11px] font-semibold text-[var(--g3-muted)]">Período do curso</p>
                          <p className="text-xs text-[var(--g3-foreground)]">
                            {cursoSelecionadoInscricao.data_triagem || cursoSelecionadoInscricao.data_conclusao
                              ? `${formatarData(cursoSelecionadoInscricao.data_triagem)} a ${formatarData(
                                  cursoSelecionadoInscricao.data_conclusao
                                )}`
                              : "Não informado"}
                          </p>
                        </div>
                      </div>
                    )}
                    <p className="mt-2 text-[11px] text-[var(--g3-muted)]">
                      Nesta etapa, o beneficiário inscrito participa de todas as datas disponíveis do curso.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-lg border border-emerald-900/70 bg-emerald-800 px-3 py-2 shadow-sm">
                      <p className="text-sm font-semibold text-white">Inscrição</p>
                    </div>
                    <div className="rounded-lg border border-[var(--g3-border)] p-3">
                    <div className="grid gap-3 xl:grid-cols-12">
                      <div className="space-y-1 xl:col-span-6">
                        <Label htmlFor="inscricao-nome">Nome do beneficiário *</Label>
                        <Input
                          id="inscricao-nome"
                          value={novaInscricao.beneficiario_nome ?? ""}
                          onChange={(event) => {
                            const valor = event.target.value;
                            setNovaInscricao((atual) => ({ ...atual, beneficiario_nome: valor }));
                            setTermoCatalogoBeneficiario(valor);
                            setMostrarSugestoesBeneficiarioInscricao(true);
                          }}
                          onFocus={() => {
                            const valorAtual = novaInscricao.beneficiario_nome ?? "";
                            setTermoCatalogoBeneficiario(valorAtual);
                            setMostrarSugestoesBeneficiarioInscricao(true);
                          }}
                          onBlur={(event) => {
                            setNovaInscricao((atual) => ({
                              ...atual,
                              beneficiario_nome: formatarTextoPadrao(event.target.value)
                            }));
                            setTimeout(() => setMostrarSugestoesBeneficiarioInscricao(false), 120);
                          }}
                          placeholder="Nome completo"
                        />
                        {mostrarSugestoesBeneficiarioInscricao &&
                          termoCatalogoBeneficiario.trim().length > 0 &&
                          termoCatalogoBeneficiario.trim().length < 2 && (
                            <p className="text-[11px] text-[var(--g3-muted)]">
                              Digite pelo menos 2 caracteres para buscar.
                            </p>
                          )}
                        {mostrarSugestoesBeneficiarioInscricao &&
                          (carregandoBeneficiariosCatalogo || beneficiariosCatalogo.length > 0) &&
                          termoCatalogoBeneficiario.trim().length >= 2 && (
                            <div className="max-h-28 overflow-y-auto rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] p-1">
                              {carregandoBeneficiariosCatalogo ? (
                                <p className="px-2 py-1 text-xs text-[var(--g3-muted)]">Buscando beneficiários...</p>
                              ) : (
                                beneficiariosCatalogo.map((item) => (
                                  <button
                                    key={item.id_beneficiario}
                                    type="button"
                                    className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-[var(--g3-primary-soft)]"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => preencherInscricaoComBeneficiario(item)}
                                  >
                                    {item.nome_completo} {item.cpf ? `(${formatarCpf(item.cpf)})` : ""}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                      </div>

                      <div className="space-y-1 xl:col-span-2">
                        <Label htmlFor="inscricao-cpf">CPF</Label>
                        <Input
                          id="inscricao-cpf"
                          value={novaInscricao.cpf ?? ""}
                          onChange={(event) => setNovaInscricao((atual) => ({ ...atual, cpf: event.target.value }))}
                          placeholder="000.000.000-00"
                        />
                      </div>

                      {ehInscricaoAtendimento && (
                        <>
                          <div className="space-y-1 xl:col-span-2">
                            <Label htmlFor="inscricao-status">Status</Label>
                            <Select
                              id="inscricao-status"
                              value={novaInscricao.status ?? "ATIVO"}
                              onChange={(event) => setNovaInscricao((atual) => ({ ...atual, status: event.target.value }))}
                            >
                              {statusInscricaoOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </Select>
                          </div>

                          <div className="space-y-1 xl:col-span-2">
                            <Label htmlFor="inscricao-data-agendada">Data agendada</Label>
                            <Input
                              id="inscricao-data-agendada"
                              type="date"
                              value={novaInscricao.data_agendada ?? ""}
                              onChange={(event) =>
                                setNovaInscricao((atual) => ({ ...atual, data_agendada: event.target.value }))
                              }
                            />
                          </div>

                          <div className="space-y-1 xl:col-span-2">
                            <Label htmlFor="inscricao-hora-agendada">Hora agendada</Label>
                            {ehAtendimentoSelecionado && controleHorarioAtendimento ? (
                              <Select
                                id="inscricao-hora-agendada"
                                value={novaInscricao.hora_agendada ?? ""}
                                disabled={!horariosDisponiveisInscricao.length}
                                onChange={(event) =>
                                  setNovaInscricao((atual) => ({ ...atual, hora_agendada: event.target.value }))
                                }
                              >
                                <option value="">{horariosDisponiveisInscricao.length ? "Selecione um horário disponível" : "Não há horários disponíveis"}</option>
                                {horariosDisponiveisInscricao.map((hora) => (
                                  <option key={hora} value={hora}>
                                    {hora}
                                  </option>
                                ))}
                              </Select>
                            ) : (
                              <Input
                                id="inscricao-hora-agendada"
                                type="time"
                                value={novaInscricao.hora_agendada ?? ""}
                                onChange={(event) =>
                                  setNovaInscricao((atual) => ({ ...atual, hora_agendada: event.target.value }))
                                }
                              />
                            )}
                          </div>

                          <div className="space-y-1 xl:col-span-2">
                            <Label htmlFor="inscricao-status-agendamento">Status</Label>
                            <Select
                              id="inscricao-status-agendamento"
                              value={novaInscricao.status_agendamento ?? ""}
                              onChange={(event) =>
                                setNovaInscricao((atual) => ({
                                  ...atual,
                                  status_agendamento: event.target.value
                                }))
                              }
                            >
                              <option value="">Selecione</option>
                              {statusAgendamentoOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </Select>
                          </div>

                          <div className="space-y-1 xl:col-span-3">
                            <Label htmlFor="inscricao-profissional">Profissional</Label>
                            <Select
                              id="inscricao-profissional"
                              value={novaInscricao.profissional_nome ?? ""}
                              onChange={(event) => {
                                const nomeSelecionado = event.target.value;
                                if (!nomeSelecionado) {
                                  setNovaInscricao((atual) => ({
                                    ...atual,
                                    profissional_nome: "",
                                    profissional_id: undefined,
                                    profissional_tipo: undefined
                                  }));
                                  return;
                                }

                                const profissionalCatalogado = profissionaisCatalogo.find(
                                  (item) => formatarTextoPadrao(item.nome_completo) === nomeSelecionado
                                );
                                if (profissionalCatalogado) {
                                  preencherInscricaoComProfissional(profissionalCatalogado);
                                  return;
                                }

                                const profissionalDisponivel = profissionaisDisponiveisInscricao.find(
                                  (item) => item.nome === nomeSelecionado
                                );
                                setNovaInscricao((atual) => ({
                                  ...atual,
                                  profissional_nome: nomeSelecionado,
                                  profissional_id: profissionalDisponivel?.id_profissional,
                                  profissional_tipo: profissionalDisponivel?.categoria
                                }));
                              }}
                            >
                              <option value="">Selecione</option>
                              {profissionaisDisponiveisInscricao.map((item) => (
                                <option key={`${item.nome}-${item.id_profissional ?? "manual"}`} value={item.nome}>
                                  {item.categoria ? `${item.nome} (${item.categoria})` : item.nome}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </>
                      )}

                      <div className="grid items-end gap-2 xl:col-span-4 md:grid-cols-3">
                        <div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/45 px-2 py-2 text-center shadow-sm">
                          <p className="text-[11px] text-[var(--g3-muted)]">Vagas</p>
                          <p className="text-sm font-semibold text-[var(--g3-foreground)]">{vagasOferecidasInscricao}</p>
                        </div>
                        <div className="rounded-md border border-[var(--g3-border)] bg-emerald-50 px-2 py-2 text-center shadow-sm">
                          <p className="text-[11px] text-[var(--g3-muted)]">Disponíveis</p>
                          <p className="text-sm font-semibold text-emerald-700">{vagasDisponiveisInscricao}</p>
                        </div>
                        <Button
                          type="button"
                          variant="default"
                          onClick={adicionarInscricao}
                          className="h-full min-h-[56px] w-full shadow-sm hover:shadow-md"
                          disabled={!podeAdicionarInscricao}
                        >
                          {inscricaoEditandoIndex === null ? "Inscrição" : "Atualizar inscrição"}
                        </Button>
                      </div>

                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-lg border border-[var(--g3-border)] p-3">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[var(--g3-foreground)]">Inscritos</p>
                          <p className="text-xs text-[var(--g3-muted)]">
                            Beneficiários vinculados ao curso ou atendimento selecionado.
                          </p>
                        </div>
                        <div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-2 text-right">
                          <p className="text-[11px] text-[var(--g3-muted)]">Total</p>
                          <p className="text-lg font-semibold text-[var(--g3-foreground)]">
                            {inscricoesAtivas.length}
                          </p>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
                        <table className="min-w-full text-sm">
                          <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">Beneficiário</th>
                              <th className="px-3 py-2 text-left font-semibold">CPF</th>
                              <th className="px-3 py-2 text-left font-semibold">Telefone</th>
                              <th className="px-3 py-2 text-left font-semibold">Inscrição</th>
                              <th className="px-3 py-2 text-left font-semibold">Agendamento</th>
                              <th className="px-3 py-2 text-left font-semibold">Profissional</th>
                              <th className="px-3 py-2 text-right font-semibold">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inscricoesAtivas.length ? (
                              inscricoesAtivas.map((inscricao, index) => (
                                <tr
                                  key={obterChaveInscricao(inscricao, index)}
                                  className={`border-t border-[var(--g3-border)] ${
                                    index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                                  }`}
                                >
                                  <td className="px-3 py-2">{inscricao.beneficiario_nome}</td>
                                  <td className="px-3 py-2">{formatarCpf(inscricao.cpf)}</td>
                                  <td className="px-3 py-2">{formatarTelefone(inscricao.telefone)}</td>
                                  <td className="px-3 py-2">{formatarData(inscricao.data_matricula)}</td>
                                  <td className="px-3 py-2">
                                    {inscricao.data_agendada
                                      ? `${formatarData(inscricao.data_agendada)} ${inscricao.hora_agendada ?? ""}`.trim()
                                      : "---"}
                                  </td>
                                  <td className="px-3 py-2">{obterPrimeiroNome(inscricao.profissional_nome)}</td>
                                  <td className="px-3 py-2 text-right">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="danger"
                                      onClick={() => removerInscricao(index)}
                                    >
                                      Remover
                                    </Button>
                                    <Button type="button" size="sm" variant="outline" onClick={() => editarInscricao(index)}>
                                      Editar horário
                                    </Button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={7} className="px-3 py-4 text-center text-[var(--g3-muted)]">
                                  Nenhum inscrito listado para o curso ou atendimento selecionado.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-lg border border-[var(--g3-border)] p-3">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-[var(--g3-foreground)]">Lista de espera</p>
                            <p className="text-xs text-[var(--g3-muted)]">
                              Cadastre beneficiários quando não houver vagas disponíveis.
                            </p>
                          </div>
                          <div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-2 text-right">
                            <p className="text-[11px] text-[var(--g3-muted)]">Fila</p>
                            <p className="text-lg font-semibold text-[var(--g3-foreground)]">
                              {filaEspera.length}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="fila-nome">Nome do beneficiário *</Label>
                            <Input
                              id="fila-nome"
                              value={novoFilaEspera.beneficiario_nome ?? ""}
                              onChange={(event) => {
                                const valor = event.target.value;
                                setNovoFilaEspera((atual) => ({ ...atual, beneficiario_nome: valor }));
                                setTermoCatalogoFilaEspera(valor);
                                setMostrarSugestoesFilaEspera(true);
                              }}
                              onFocus={() => {
                                setTermoCatalogoFilaEspera(novoFilaEspera.beneficiario_nome ?? "");
                                setMostrarSugestoesFilaEspera(true);
                              }}
                              onBlur={(event) => {
                                const valorFormatado = formatarTextoPadrao(event.target.value);
                                setNovoFilaEspera((atual) => ({
                                  ...atual,
                                  beneficiario_nome: valorFormatado
                                }));
                                setTermoCatalogoFilaEspera(valorFormatado);
                                setTimeout(() => setMostrarSugestoesFilaEspera(false), 120);
                              }}
                              placeholder="Nome completo"
                            />
                            {mostrarSugestoesFilaEspera &&
                              termoCatalogoFilaEspera.trim().length > 0 &&
                              termoCatalogoFilaEspera.trim().length < 2 && (
                                <p className="text-[11px] text-[var(--g3-muted)]">
                                  Digite pelo menos 2 caracteres para buscar.
                                </p>
                              )}
                            {mostrarSugestoesFilaEspera &&
                              (carregandoBeneficiariosFilaCatalogo || beneficiariosFilaCatalogo.length > 0) &&
                              termoCatalogoFilaEspera.trim().length >= 2 && (
                                <div className="max-h-28 overflow-y-auto rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] p-1">
                                  {carregandoBeneficiariosFilaCatalogo ? (
                                    <p className="px-2 py-1 text-xs text-[var(--g3-muted)]">
                                      Buscando beneficiários...
                                    </p>
                                  ) : (
                                    beneficiariosFilaCatalogo.map((item) => (
                                      <button
                                        key={item.id_beneficiario}
                                        type="button"
                                        className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-[var(--g3-primary-soft)]"
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => preencherFilaEsperaComBeneficiario(item)}
                                      >
                                        {item.nome_completo} {item.cpf ? `(${formatarCpf(item.cpf)})` : ""}
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-1">
                              <Label htmlFor="fila-cpf">CPF</Label>
                              <Input
                                id="fila-cpf"
                                value={novoFilaEspera.cpf ?? ""}
                                onChange={(event) =>
                                  setNovoFilaEspera((atual) => ({ ...atual, cpf: event.target.value }))
                                }
                                placeholder="000.000.000-00"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="fila-telefone">Telefone</Label>
                              <Input
                                id="fila-telefone"
                                value={novoFilaEspera.telefone ?? ""}
                                onChange={(event) =>
                                  setNovoFilaEspera((atual) => ({ ...atual, telefone: event.target.value }))
                                }
                                placeholder="(00) 00000-0000"
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={adicionarFilaEspera}
                            disabled={!podeAdicionarFilaEspera}
                          >
                            Adicionar à lista de espera
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-lg border border-[var(--g3-border)] p-3">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                            Pessoas aguardando vaga
                          </p>
                          <p className="text-xs text-[var(--g3-muted)]">
                            {filaEspera.length ? "Use Matricular quando surgir vaga." : "Sem fila registrada."}
                          </p>
                        </div>

                        <div className="space-y-2">
                          {filaEspera.length ? (
                            filaEspera.map((item, index) => (
                              <div
                                key={item.id_fila_espera ?? `${item.beneficiario_nome}-${index}`}
                                className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                                      {item.beneficiario_nome}
                                    </p>
                                    <p className="text-xs text-[var(--g3-muted)]">
                                      CPF: {formatarCpf(item.cpf)} - Entrada: {formatarData(item.data_entrada)}
                                    </p>
                                    <p className="text-xs text-[var(--g3-muted)]">
                                      Telefone: {formatarTelefone(item.telefone)}
                                    </p>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => matricularFilaEspera(index)}
                                      disabled={vagasDisponiveisInscricao <= 0}
                                    >
                                      Matricular
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="danger"
                                      onClick={() => removerFilaEspera(index)}
                                    >
                                      Remover
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-lg border border-dashed border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-4 text-sm text-[var(--g3-muted)]">
                              Nenhum beneficiário aguardando vaga neste curso ou atendimento.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              )}

              {abaAtiva === "presenca" && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-[var(--g3-border)] p-3">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
                      <div className="space-y-1 xl:col-span-5">
                        <Label htmlFor="presenca-data-aula">Data da aula</Label>
                        <Select
                          id="presenca-data-aula"
                          value={presencaDataSelecionada?.id ?? ""}
                          onChange={(event) => {
                            const selecionada = presencaDatasOrdenadas.find((item) => item.id === event.target.value);
                            if (selecionada) {
                              void selecionarPresencaData(selecionada);
                            }
                          }}
                          disabled={presencaCarregando || !presencaDatasOrdenadas.length}
                        >
                          <option value="">Selecione uma data real</option>
                          {presencaDatasOrdenadas.map((data) => (
                            <option key={data.id} value={data.id}>
                              {formatarData(data.data_aula)} - {data.status}
                            </option>
                          ))}
                        </Select>
                        <p className="text-xs text-[var(--g3-muted)]">
                          Para gerar as datas desta lista, gere a agenda na data selecionada no menu Agendamentos.<br />
                          Para selecionar a data da aula, primeiro você deve selecionar o curso ou atendimento na aba Catálogo e vagas.
                        </p>
                      </div>
                      <div className="space-y-1 xl:col-span-3">
                        <Label>Título</Label>
                        <div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-primary-soft)] px-3 py-2 text-sm font-semibold text-[var(--g3-active)]">
                          {presencaTitulo}
                        </div>
                      </div>
                      <label className="xl:col-span-2 flex items-end gap-2 pb-2 text-sm">
                        <Checkbox checked={presencaExibirCpf} onChange={() => setPresencaExibirCpf((atual) => !atual)} />
                        Exibir CPF na lista
                      </label>
                    </div>
                  </div>

                  {presencaCarregando ? (
                    <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-4 text-sm text-[var(--g3-muted)]">
                      Carregando presença...
                    </div>
                  ) : !presencaDatasOrdenadas.length ? (
                    <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-4 text-sm text-[var(--g3-muted)]">
                      Nenhuma data real de atividade foi encontrada para esta inscrição.
                    </div>
                  ) : null}

                  {presencaDataSelecionada && (
                    <div className="space-y-3 rounded-lg border border-[var(--g3-border)] p-3">
                      <div className="grid gap-3 md:grid-cols-2 md:items-stretch">
                        <div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--g3-muted)]">
                            {cursoSelecionadoInscricao?.tipo ?? "Atividade"}
                          </p>
                          <p className="text-sm font-semibold text-[var(--g3-foreground)]">{cursoSelecionadoInscricao?.nome ?? "Atividade"}</p>
                          <p className="text-xs text-[var(--g3-muted)]">
                            {formatarData(presencaDataSelecionada.data_aula)} • {presencaDataSelecionada.status}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="presenca-observacoes">Observações da data</Label>
                          <Textarea
                            id="presenca-observacoes"
                            rows={2}
                            className="min-h-0"
                            value={presencaObservacoes}
                            onChange={(event) => {
                              setPresencaObservacoes(event.target.value);
                              setPresencaPendente(true);
                            }}
                          />
                        </div>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
                        <table className="min-w-full text-sm">
                          <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">Beneficiário</th>
                              {presencaExibirCpf && <th className="px-3 py-2 text-left font-semibold">CPF</th>}
                              <th className="px-3 py-2 text-left font-semibold">Telefone</th>
                              <th className="px-3 py-2 text-left font-semibold">Confirmação</th>
                              <th className="px-3 py-2 text-left font-semibold">Observação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inscricoesAtivas.length ? (
                              inscricoesAtivas.map((inscricao, index) => {
                                const matriculaId = chavePresenca(inscricao.id_matricula_item);
                                const statusAtual = matriculaId ? presencasPorMatricula[matriculaId] ?? "NAO_INFORMADO" : "NAO_INFORMADO";
                                const observacaoAtual = matriculaId ? presencasObservacoesPorMatricula[matriculaId] ?? "" : "";
                                return (
                                  <tr
                                    key={obterChaveInscricao(inscricao, index)}
                                    className={`border-t border-[var(--g3-border)] ${
                                      index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                                    }`}
                                  >
                                    <td className="px-3 py-2">{inscricao.beneficiario_nome}</td>
                                    {presencaExibirCpf && <td className="px-3 py-2">{formatarCpf(inscricao.cpf)}</td>}
                                    <td className="px-3 py-2">{formatarTelefone(inscricao.telefone)}</td>
                                    <td className="px-3 py-2">
                                      <div className="flex flex-wrap gap-3">
                                        <label className="inline-flex items-center gap-2 text-sm text-[var(--g3-foreground)]">
                                          <Checkbox
                                            checked={statusAtual === "PRESENTE"}
                                            onChange={(event) =>
                                              matriculaId &&
                                              solicitarAtualizacaoPresenca(
                                                matriculaId,
                                                event.target.checked ? "PRESENTE" : "NAO_INFORMADO",
                                                inscricao.beneficiario_nome
                                              )
                                            }
                                            disabled={!matriculaId || presencaDataSelecionada.status === "CANCELADA"}
                                          />
                                          Presença
                                        </label>
                                        <label className="inline-flex items-center gap-2 text-sm text-[var(--g3-foreground)]">
                                          <Checkbox
                                            checked={statusAtual === "AUSENTE"}
                                            onChange={(event) =>
                                              matriculaId &&
                                              solicitarAtualizacaoPresenca(
                                                matriculaId,
                                                event.target.checked ? "AUSENTE" : "NAO_INFORMADO",
                                                inscricao.beneficiario_nome
                                              )
                                            }
                                            disabled={!matriculaId || presencaDataSelecionada.status === "CANCELADA"}
                                          />
                                          Ausência
                                        </label>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <Input
                                        value={observacaoAtual}
                                        onChange={(event) =>
                                          matriculaId && atualizarObservacaoPresenca(matriculaId, event.target.value)
                                        }
                                        disabled={!matriculaId || presencaDataSelecionada.status === "CANCELADA"}
                                        placeholder="Observação opcional"
                                      />
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td
                                  className="px-3 py-4 text-center text-[var(--g3-muted)]"
                                  colSpan={presencaExibirCpf ? 5 : 4}
                                >
                                  Nenhuma inscrição ativa para registrar presença.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {presencaAlteracaoPendente && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 px-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] shadow-2xl">
            <div className="border-b border-[var(--g3-border)] px-5 py-4">
              <h3 className="text-base font-semibold text-[var(--g3-foreground)]">Confirmar alteração de presença</h3>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm text-[var(--g3-muted)]">
              <p>
                A presença ou ausência de <strong className="text-[var(--g3-foreground)]">{presencaAlteracaoPendente.beneficiarioNome}</strong> já foi salva.
                Deseja realmente alterar para <strong className="text-[var(--g3-foreground)]">{formatarStatus(presencaAlteracaoPendente.status)}</strong>?
              </p>
              <div className="space-y-1">
                <Label htmlFor="senha-confirmacao-presenca">Senha do usuário logado</Label>
                <Input
                  id="senha-confirmacao-presenca"
                  type="password"
                  autoComplete="current-password"
                  value={senhaConfirmacaoPresenca}
                  onChange={(event) => {
                    setSenhaConfirmacaoPresenca(event.target.value);
                    setPresencaErroSenha("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") confirmarAlteracaoPresenca();
                  }}
                />
                {presencaErroSenha && <p className="text-sm font-medium text-rose-700">{presencaErroSenha}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--g3-border)] px-5 py-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPresencaAlteracaoPendente(null);
                  setPresencaErroSenha("");
                }}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={() => void confirmarAlteracaoPresenca()} disabled={presencaValidandoSenha}>
                {presencaValidandoSenha ? "Validando senha..." : "Confirmar alteração"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {popupMensagem && <PopupMensagem popup={popupMensagem} onClose={() => setPopupMensagem(null)} />}

      <PopupConfirmacao
        aberto={popupExcluirAberto}
        titulo="Confirmar exclusão"
        texto="Esta ação exclui todo o curso configurado. Deseja continuar? Essa ação é irreversível."
        processando={removerMutation.isPending}
        onCancel={() => setPopupExcluirAberto(false)}
        onConfirm={() => void confirmarExclusao()}
        confirmarTexto="Excluir"
      />

      <PopupConfirmacao
        aberto={popupExcluirPresencaAberto}
        titulo="Excluir data de presença"
        texto="Se você continuar, todos os registros de presença e ausência desta data serão excluídos. Essa ação afetará todos os beneficiários vinculados a esta aula."
        processando={presencaExcluindo}
        onCancel={() => setPopupExcluirPresencaAberto(false)}
        onConfirm={() => void confirmarExclusaoDataPresenca()}
        confirmarTexto="Sim, excluir presenças"
      />
    </section>
  );
}





