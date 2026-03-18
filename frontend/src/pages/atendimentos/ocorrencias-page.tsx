import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  FileText,
  List,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  Undo2,
  User,
  UserSearch,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { useBeneficiario, useBeneficiarios } from "@/features/beneficiarios/use-beneficiarios";
import {
  useAdicionarAnexoOcorrenciaCrianca,
  useAnexosOcorrenciaCrianca,
  useOcorrenciasCrianca,
  useRemoverAnexoOcorrenciaCrianca,
  useRemoverOcorrenciaCrianca,
  useSalvarOcorrenciaCrianca
} from "@/features/ocorrencias-crianca/use-ocorrencias-crianca";
import { calcularIdade, formatarTelefone } from "@/lib/br-utils";
import { somenteDigitos } from "@/lib/validators";
import { ocorrenciasCriancaService } from "@/services/ocorrencias-crianca.service";
import type { Beneficiario } from "@/types/beneficiario";
import type { OcorrenciaCriancaPayload } from "@/types/ocorrencia-crianca";

type AbaId = "ocorrencia" | "vitima" | "autor" | "classificacao" | "relato";
type CampoLista =
  | "violenciaMotivadaPor"
  | "violenciaPraticadaPor"
  | "outrasViolacoes"
  | "tipificacaoViolencia"
  | "tipificacaoPsicologica"
  | "tipificacaoSexual"
  | "violenciaAutoprovocada"
  | "denunciaOrigem";
type Opcao = {
  value: string;
  label: string;
};

const abas: AdminTab[] = [
  { id: "vitima", label: "Vítima", icon: User },
  { id: "ocorrencia", label: "Ocorrência", icon: AlertTriangle },
  { id: "autor", label: "Possível autor", icon: UserSearch },
  { id: "classificacao", label: "Classificação", icon: List },
  { id: "relato", label: "Relato e encaminhamento", icon: FileText }
];

const tituloTela = "Ocorrências";

const opcoesLocalViolencia: Opcao[] = [
  { value: "Na escola", label: "Na escola" },
  { value: "No ambito familiar", label: "No âmbito familiar" },
  { value: "Outros espacos", label: "Outros espaços" }
];

const opcoesViolenciaMotivada: Opcao[] = [
  { value: "Sexismo", label: "Sexismo" },
  { value: "LGBTfobia", label: "LGBTfobia" },
  { value: "Racismo", label: "Racismo" },
  { value: "Intolerancia religiosa", label: "Intolerância religiosa" },
  { value: "Xenofobia", label: "Xenofobia" },
  { value: "Conflito geracional", label: "Conflito geracional" },
  { value: "Capacitismo", label: "Capacitismo" },
  { value: "Condicao economica", label: "Condição econômica" },
  { value: "Outros", label: "Outros" }
];

const opcoesViolenciaPraticada: Opcao[] = [
  { value: "crianca", label: "Criança" },
  { value: "adolescente", label: "Adolescente" },
  { value: "pai", label: "Pai" },
  { value: "mae", label: "Mãe" },
  { value: "responsavel", label: "Responsável" },
  { value: "professor/a", label: "Professor(a)" },
  { value: "gestor/a", label: "Gestor(a)" },
  { value: "funcionario", label: "Funcionário" },
  { value: "outro", label: "Outro" }
];

const opcoesOutrasViolacoes: Opcao[] = [
  { value: "Abandono escolar", label: "Abandono escolar" },
  { value: "Evasao escolar", label: "Evasão escolar" },
  { value: "Gravidez na adolescencia", label: "Gravidez na adolescência" },
  { value: "Trabalho Infantil", label: "Trabalho infantil" }
];

const opcoesRacaCor: Opcao[] = [
  { value: "Branca", label: "Branca" },
  { value: "Preta", label: "Preta" },
  { value: "Parda", label: "Parda" },
  { value: "Indigena", label: "Indígena" },
  { value: "Amarela", label: "Amarela" }
];

const opcoesSexo: Opcao[] = [
  { value: "Feminino", label: "Feminino" },
  { value: "Masculino", label: "Masculino" },
  { value: "Outro", label: "Outro" }
];

const opcoesIdentidadeGenero: Opcao[] = [
  { value: "Masculino Cisgenero", label: "Masculino cisgênero" },
  { value: "Feminino Cisgenero", label: "Feminino cisgênero" },
  { value: "Masculino Transexual", label: "Masculino transexual" },
  { value: "Feminino Transexual", label: "Feminino transexual" },
  { value: "Nao binario", label: "Não binário" }
];

const opcoesOrientacaoSexual: Opcao[] = [
  { value: "Heterossexual", label: "Heterossexual" },
  { value: "Homossexual", label: "Homossexual" },
  { value: "Bissexual", label: "Bissexual" },
  { value: "Pansexual", label: "Pansexual" },
  { value: "Assexual", label: "Assexual" },
  { value: "Outro", label: "Outro" }
];

const opcoesEscolaridade: Opcao[] = [
  { value: "Creche (0-3)", label: "Creche (0-3)" },
  { value: "Pre-escola (4-5)", label: "Pré-escola (4-5)" },
  { value: "1º EF", label: "1º EF" },
  { value: "2º EF", label: "2º EF" },
  { value: "3º EF", label: "3º EF" },
  { value: "4º EF", label: "4º EF" },
  { value: "5º EF", label: "5º EF" },
  { value: "6º EF", label: "6º EF" },
  { value: "7º EF", label: "7º EF" },
  { value: "8º EF", label: "8º EF" },
  { value: "9º EF", label: "9º EF" },
  { value: "1º EM", label: "1º EM" },
  { value: "2º EM", label: "2º EM" },
  { value: "3º EM", label: "3º EM" }
];

const opcoesResponsavelVitima: Opcao[] = [
  { value: "Mae", label: "Mãe" },
  { value: "Pai", label: "Pai" },
  { value: "Outro", label: "Outro" }
];

const opcoesParentesco: Opcao[] = [
  { value: "Sim", label: "Sim" },
  { value: "Nao", label: "Não" },
  { value: "Nao consta", label: "Não consta" }
];

const opcoesResponsavelAutor: Opcao[] = [
  { value: "Mae", label: "Mãe" },
  { value: "Outro", label: "Outro" }
];

const opcoesTipificacaoViolencia: Opcao[] = [
  { value: "Violencia fisica", label: "Violência física" },
  { value: "Violencia psicologica", label: "Violência psicológica" },
  {
    value: "Exposicao da crianca/adolescente a crime violento contra membro da familia ou rede de apoio",
    label: "Exposição da criança/adolescente a crime violento contra membro da família ou rede de apoio"
  },
  { value: "Violencia sexual", label: "Violência sexual" },
  { value: "Negligencia", label: "Negligência" },
  { value: "Maus tratos", label: "Maus-tratos" },
  { value: "Violencia institucional", label: "Violência institucional" }
];

const opcoesTipificacaoPsicologica: Opcao[] = [
  { value: "ameaca", label: "Ameaça" },
  { value: "constrangimento", label: "Constrangimento" },
  { value: "humilhacao", label: "Humilhação" },
  { value: "manipulacao", label: "Manipulação" },
  { value: "isolamento", label: "Isolamento" },
  { value: "agressao verbal e xingamento", label: "Agressão verbal e xingamento" },
  { value: "bullying", label: "Bullying" },
  { value: "alienacao parental", label: "Alienação parental" }
];

const opcoesTipificacaoSexual: Opcao[] = [
  { value: "abuso sexual", label: "Abuso sexual" },
  { value: "exploracao sexual", label: "Exploração sexual" },
  { value: "trafico de pessoas", label: "Tráfico de pessoas" },
  { value: "violencia mediada por TICS", label: "Violência mediada por TICS" }
];

const opcoesViolenciaAutoprovocada: Opcao[] = [
  { value: "Suicidio consumado", label: "Suicídio consumado" },
  { value: "Tentativa de suicidio", label: "Tentativa de suicídio" },
  { value: "Automutilacao", label: "Automutilação" },
  { value: "Ideacao suicida", label: "Ideação suicida" }
];

const opcoesDenunciaOrigem: Opcao[] = [
  { value: "Denuncia espontanea", label: "Denúncia espontânea" },
  { value: "Suspeita por observacao", label: "Suspeita por observação" },
  { value: "Relato de outros alunos", label: "Relato de outros alunos" },
  { value: "Familiares", label: "Familiares" },
  { value: "Denuncia anonima", label: "Denúncia anônima" },
  { value: "Comunidade", label: "Comunidade" },
  { value: "Outro", label: "Outro" }
];

function criarFormularioPadrao(): OcorrenciaCriancaPayload {
  return {
    dataPreenchimento: new Date().toISOString().slice(0, 10),
    vitimaNome: "",
    vitimaIdade: null,
    resumoViolencia: "",
    violenciaMotivadaPor: [],
    violenciaPraticadaPor: [],
    outrasViolacoes: [],
    tipificacaoViolencia: [],
    tipificacaoPsicologica: [],
    tipificacaoSexual: [],
    violenciaAutoprovocada: [],
    denunciaOrigem: []
  };
}

function trimToUndefined(valor?: string | null) {
  const texto = String(valor ?? "").trim();
  return texto ? texto : undefined;
}

function normalizarTextoBusca(valor?: string | null) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function adicionarOpcaoAtual(opcoes: Opcao[], valor?: string | null) {
  const texto = trimToUndefined(valor);
  if (!texto) return opcoes;

  const valorNormalizado = normalizarTextoBusca(texto);
  if (opcoes.some((opcao) => normalizarTextoBusca(opcao.value) === valorNormalizado)) {
    return opcoes;
  }

  return [...opcoes, { value: texto, label: texto }];
}

function mapearOpcaoPorTexto(valor: string | undefined, opcoes: Opcao[]) {
  const texto = normalizarTextoBusca(valor);
  if (!texto) return undefined;

  return (
    opcoes.find((opcao) => normalizarTextoBusca(opcao.value) === texto)?.value ??
    opcoes.find((opcao) => normalizarTextoBusca(opcao.label) === texto)?.value ??
    opcoes.find((opcao) => {
      const opcaoNormalizada = normalizarTextoBusca(opcao.value);
      return texto.includes(opcaoNormalizada) || opcaoNormalizada.includes(texto);
    })?.value
  );
}

function mapearSexoBeneficiario(valor?: string | null) {
  const texto = normalizarTextoBusca(valor);
  if (!texto) return undefined;
  if (texto.includes("femin")) return "Feminino";
  if (texto.includes("mascul")) return "Masculino";
  return "Outro";
}

function mapearEscolaridadeBeneficiario(valor?: string | null) {
  const texto = normalizarTextoBusca(valor);
  if (!texto) return undefined;

  const opcaoDireta = mapearOpcaoPorTexto(valor ?? undefined, opcoesEscolaridade);
  if (opcaoDireta) return opcaoDireta;
  if (texto.includes("creche")) return "Creche (0-3)";
  if (texto.includes("pre escola") || texto.includes("prescola")) return "Pre-escola (4-5)";

  const anoMatch = texto.match(/\b([1-9])\b/);
  const ano = anoMatch?.[1];
  if (!ano) return trimToUndefined(valor);

  if (texto.includes("medio") || texto.includes("médio") || texto.includes("em")) {
    return `${ano}º EM`;
  }
  if (texto.includes("fundamental") || texto.includes("ef")) {
    return `${ano}º EF`;
  }

  return trimToUndefined(valor);
}

function mapearIdentidadeGeneroBeneficiario(beneficiario: Beneficiario) {
  const identidade = mapearOpcaoPorTexto(beneficiario.identidade_genero, opcoesIdentidadeGenero);
  if (identidade) return identidade;

  const sexo = mapearSexoBeneficiario(beneficiario.sexo_biologico);
  if (sexo === "Masculino") return "Masculino Cisgenero";
  if (sexo === "Feminino") return "Feminino Cisgenero";
  return undefined;
}

function obterNomeResponsavelBeneficiario(beneficiario: Beneficiario | null, tipo?: string | null) {
  if (!beneficiario) return undefined;
  if (tipo === "Mae") return trimToUndefined(beneficiario.nome_mae);
  if (tipo === "Pai") return trimToUndefined(beneficiario.nome_pai);
  return undefined;
}

function montarLogradouroVitima(beneficiario: Beneficiario) {
  return trimToUndefined([beneficiario.logradouro, beneficiario.numero].filter(Boolean).join(", "));
}

async function arquivoParaBase64(arquivo: File) {
  const buffer = await arquivo.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function BlocoFormulario({
  titulo,
  descricao,
  children
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3 shadow-sm">
      <div className="mb-3">
        <p className="text-sm font-semibold text-[var(--g3-foreground)]">{titulo}</p>
        {descricao ? <p className="mt-1 text-xs text-[var(--g3-muted)]">{descricao}</p> : null}
      </div>
      {children}
    </section>
  );
}

function GrupoEscolhaUnica({
  label,
  value,
  options,
  onChange,
  columns = "sm:grid-cols-2 xl:grid-cols-3"
}: {
  label: string;
  value?: string | null;
  options: Opcao[];
  onChange: (value?: string) => void;
  columns?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className={`grid gap-2 ${columns}`}>
        {options.map((option) => {
          const selecionado = value === option.value;
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm transition ${
                selecionado
                  ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"
                  : "border-[var(--g3-border)] bg-[var(--g3-card-soft)] text-[var(--g3-foreground)]"
              }`}
            >
              <Checkbox
                checked={selecionado}
                onChange={() => onChange(selecionado ? undefined : option.value)}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function GrupoMultiplaEscolha({
  label,
  values,
  options,
  onToggle,
  columns = "sm:grid-cols-2 xl:grid-cols-3"
}: {
  label: string;
  values?: string[];
  options: Opcao[];
  onToggle: (value: string) => void;
  columns?: string;
}) {
  const selecionados = values ?? [];

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className={`grid gap-2 ${columns}`}>
        {options.map((option) => {
          const selecionado = selecionados.includes(option.value);
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm transition ${
                selecionado
                  ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"
                  : "border-[var(--g3-border)] bg-[var(--g3-card-soft)] text-[var(--g3-foreground)]"
              }`}
            >
              <Checkbox checked={selecionado} onChange={() => onToggle(option.value)} />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function OcorrenciasPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("vitima");
  const [form, setForm] = useState<OcorrenciaCriancaPayload>(() => criarFormularioPadrao());
  const [snapshot, setSnapshot] = useState<OcorrenciaCriancaPayload>(() => criarFormularioPadrao());
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const [abrirBusca, setAbrirBusca] = useState(false);
  const [termoBusca, setTermoBusca] = useState("");
  const [abrirImpressao, setAbrirImpressao] = useState(false);
  const [termoBuscaVitima, setTermoBuscaVitima] = useState("");
  const [mostrarSugestoesVitima, setMostrarSugestoesVitima] = useState(false);
  const [beneficiarioVitimaSelecionado, setBeneficiarioVitimaSelecionado] = useState<Beneficiario | null>(null);

  const ocorrenciasQuery = useOcorrenciasCrianca();
  const salvarMutation = useSalvarOcorrenciaCrianca();
  const removerMutation = useRemoverOcorrenciaCrianca();
  const anexosQuery = useAnexosOcorrenciaCrianca(form.id);
  const adicionarAnexoMutation = useAdicionarAnexoOcorrenciaCrianca(form.id);
  const removerAnexoMutation = useRemoverAnexoOcorrenciaCrianca(form.id);
  const anexos = anexosQuery.data ?? [];
  const buscaVitimaHabilitada = termoBuscaVitima.trim().length >= 2;
  const beneficiariosVitimaQuery = useBeneficiarios(
    {
      nome: termoBuscaVitima.trim()
    },
    {
      enabled: buscaVitimaHabilitada
    }
  );
  const beneficiarioVitimaDetalheQuery = useBeneficiario(form.vitimaBeneficiarioId);
  const beneficiarioVitimaAtual = beneficiarioVitimaSelecionado ?? beneficiarioVitimaDetalheQuery.data?.beneficiario ?? null;

  const carregandoAcoes =
    salvarMutation.isPending ||
    removerMutation.isPending ||
    adicionarAnexoMutation.isPending ||
    removerAnexoMutation.isPending;

  const ocorrenciasFiltradas = useMemo(() => {
    const termo = termoBusca.toLowerCase().trim();
    return (ocorrenciasQuery.data ?? []).filter((item) =>
      `${item.vitimaNome} ${item.dataPreenchimento}`.toLowerCase().includes(termo)
    );
  }, [ocorrenciasQuery.data, termoBusca]);
  const beneficiariosVitima = useMemo(() => {
    const termoNome = normalizarTextoBusca(termoBuscaVitima);
    const termoDigitos = somenteDigitos(termoBuscaVitima);

    return (beneficiariosVitimaQuery.data?.beneficiarios ?? [])
      .filter((item) => {
        if (!termoNome && !termoDigitos) return true;

        const nome = normalizarTextoBusca(item.nome_completo);
        const codigo = normalizarTextoBusca(item.codigo);
        const cpf = somenteDigitos(item.cpf);

        return (
          (termoNome && (nome.includes(termoNome) || codigo.includes(termoNome))) ||
          (termoDigitos && !!cpf && cpf.includes(termoDigitos))
        );
      })
      .slice(0, 8);
  }, [beneficiariosVitimaQuery.data?.beneficiarios, termoBuscaVitima]);
  const opcoesSexoVitima = useMemo(() => adicionarOpcaoAtual(opcoesSexo, form.vitimaSexo), [form.vitimaSexo]);
  const opcoesRacaCorVitima = useMemo(() => adicionarOpcaoAtual(opcoesRacaCor, form.vitimaRacaCor), [form.vitimaRacaCor]);
  const opcoesIdentidadeGeneroVitima = useMemo(
    () => adicionarOpcaoAtual(opcoesIdentidadeGenero, form.vitimaIdentidadeGenero),
    [form.vitimaIdentidadeGenero]
  );
  const opcoesEscolaridadeVitima = useMemo(
    () => adicionarOpcaoAtual(opcoesEscolaridade, form.vitimaEscolaridade),
    [form.vitimaEscolaridade]
  );

  useEffect(() => {
    const beneficiario = beneficiarioVitimaDetalheQuery.data?.beneficiario;
    if (!beneficiario || !form.vitimaBeneficiarioId) return;
    if (beneficiario.id_beneficiario !== form.vitimaBeneficiarioId) return;
    setBeneficiarioVitimaSelecionado(beneficiario);
  }, [beneficiarioVitimaDetalheQuery.data?.beneficiario, form.vitimaBeneficiarioId]);

  function atualizarCampo<K extends keyof OcorrenciaCriancaPayload>(
    campo: K,
    valor: OcorrenciaCriancaPayload[K]
  ) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function sincronizarBuscaVitima(payload: OcorrenciaCriancaPayload) {
    setTermoBuscaVitima(payload.vitimaNome ?? "");
    setMostrarSugestoesVitima(false);
    if (!payload.vitimaBeneficiarioId || beneficiarioVitimaSelecionado?.id_beneficiario !== payload.vitimaBeneficiarioId) {
      setBeneficiarioVitimaSelecionado(null);
    }
  }

  function preencherVitimaComBeneficiario(beneficiario: Beneficiario) {
    setBeneficiarioVitimaSelecionado(beneficiario);
    setTermoBuscaVitima(beneficiario.nome_completo ?? "");
    setMostrarSugestoesVitima(false);

    setForm((atual) => {
      const responsavelTipoAtual =
        atual.vitimaResponsavelTipo ?? (beneficiario.nome_mae ? "Mae" : beneficiario.nome_pai ? "Pai" : undefined);
      const telefoneResponsavel = formatarTelefone(beneficiario.telefone_principal || beneficiario.telefone_secundario);

      return {
        ...atual,
        vitimaBeneficiarioId: beneficiario.id_beneficiario,
        vitimaNome: beneficiario.nome_completo ?? atual.vitimaNome,
        vitimaIdade: calcularIdade(beneficiario.data_nascimento) ?? atual.vitimaIdade,
        vitimaSexo: mapearSexoBeneficiario(beneficiario.sexo_biologico) ?? atual.vitimaSexo,
        vitimaRacaCor: mapearOpcaoPorTexto(beneficiario.cor_raca, opcoesRacaCor) ?? atual.vitimaRacaCor,
        vitimaIdentidadeGenero:
          mapearIdentidadeGeneroBeneficiario(beneficiario) ?? atual.vitimaIdentidadeGenero,
        vitimaEscolaridade:
          mapearEscolaridadeBeneficiario(beneficiario.nivel_escolaridade) ?? atual.vitimaEscolaridade,
        vitimaResponsavelTipo: responsavelTipoAtual,
        vitimaResponsavelNome:
          responsavelTipoAtual === "Outro"
            ? atual.vitimaResponsavelNome ?? ""
            : obterNomeResponsavelBeneficiario(beneficiario, responsavelTipoAtual) ?? atual.vitimaResponsavelNome,
        vitimaTelefoneResponsavel: telefoneResponsavel || atual.vitimaTelefoneResponsavel,
        vitimaEnderecoLogradouro: montarLogradouroVitima(beneficiario) ?? atual.vitimaEnderecoLogradouro,
        vitimaEnderecoComplemento: trimToUndefined(beneficiario.complemento) ?? atual.vitimaEnderecoComplemento,
        vitimaEnderecoBairro: trimToUndefined(beneficiario.bairro) ?? atual.vitimaEnderecoBairro,
        vitimaEnderecoMunicipio: trimToUndefined(beneficiario.municipio) ?? atual.vitimaEnderecoMunicipio,
        vitimaEnderecoUf: trimToUndefined(beneficiario.uf) ?? atual.vitimaEnderecoUf
      };
    });
  }

  function atualizarNomeVitima(valor: string) {
    const nomeBeneficiarioAtual = normalizarTextoBusca(beneficiarioVitimaAtual?.nome_completo);
    const mudouSelecao = !!nomeBeneficiarioAtual && normalizarTextoBusca(valor) !== nomeBeneficiarioAtual;

    if (mudouSelecao) {
      setBeneficiarioVitimaSelecionado(null);
    }

    setTermoBuscaVitima(valor);
    setMostrarSugestoesVitima(true);
    setForm((atual) => ({
      ...atual,
      vitimaNome: valor,
      vitimaBeneficiarioId: mudouSelecao ? undefined : atual.vitimaBeneficiarioId
    }));
  }

  function atualizarResponsavelVitima(tipo?: string) {
    setForm((atual) => {
      const nomeResponsavel = obterNomeResponsavelBeneficiario(beneficiarioVitimaAtual, tipo);
      const telefoneResponsavel = formatarTelefone(
        beneficiarioVitimaAtual?.telefone_principal || beneficiarioVitimaAtual?.telefone_secundario
      );

      return {
        ...atual,
        vitimaResponsavelTipo: tipo,
        vitimaResponsavelNome:
          tipo === "Outro" ? "" : nomeResponsavel ?? atual.vitimaResponsavelNome,
        vitimaTelefoneResponsavel: telefoneResponsavel || atual.vitimaTelefoneResponsavel
      };
    });
  }

  function alternarLista(campo: CampoLista, valor: string) {
    setForm((atual) => {
      const listaAtual = atual[campo] ?? [];
      const proximaLista = listaAtual.includes(valor)
        ? listaAtual.filter((item) => item !== valor)
        : [...listaAtual, valor];

      return {
        ...atual,
        [campo]: proximaLista
      };
    });
  }

  function novo() {
    const base = criarFormularioPadrao();
    setForm(base);
    setSnapshot(base);
    setBeneficiarioVitimaSelecionado(null);
    sincronizarBuscaVitima(base);
    setAbaAtiva("vitima");
  }

  function cancelar() {
    setForm(snapshot);
    sincronizarBuscaVitima(snapshot);
  }

  function selecionar(item: OcorrenciaCriancaPayload) {
    setForm(item);
    setSnapshot(item);
    sincronizarBuscaVitima(item);
    setAbaAtiva("vitima");
    setAbrirBusca(false);
  }

  function normalizarParaSalvar(payload: OcorrenciaCriancaPayload): OcorrenciaCriancaPayload {
    return {
      ...payload,
      localViolenciaOutro:
        payload.localViolencia === "Outros espacos" ? trimToUndefined(payload.localViolenciaOutro) : undefined,
      violenciaMotivadaPor: (payload.violenciaMotivadaPor ?? []).filter(Boolean),
      violenciaMotivadaOutro:
        payload.violenciaMotivadaPor?.includes("Outros")
          ? trimToUndefined(payload.violenciaMotivadaOutro)
          : undefined,
      violenciaPraticadaPor: (payload.violenciaPraticadaPor ?? []).filter(Boolean),
      violenciaPraticadaOutro:
        payload.violenciaPraticadaPor?.includes("outro")
          ? trimToUndefined(payload.violenciaPraticadaOutro)
          : undefined,
      outrasViolacoes: (payload.outrasViolacoes ?? []).filter(Boolean),
      vitimaBeneficiarioId: trimToUndefined(payload.vitimaBeneficiarioId),
      vitimaNome: payload.vitimaNome.trim(),
      vitimaSexo: trimToUndefined(payload.vitimaSexo),
      vitimaRacaCor: trimToUndefined(payload.vitimaRacaCor),
      vitimaIdentidadeGenero: trimToUndefined(payload.vitimaIdentidadeGenero),
      vitimaOrientacaoSexual: trimToUndefined(payload.vitimaOrientacaoSexual),
      vitimaOrientacaoOutro:
        payload.vitimaOrientacaoSexual === "Outro" ? trimToUndefined(payload.vitimaOrientacaoOutro) : undefined,
      vitimaEscolaridade: trimToUndefined(payload.vitimaEscolaridade),
      vitimaResponsavelTipo: trimToUndefined(payload.vitimaResponsavelTipo),
      vitimaResponsavelNome: trimToUndefined(payload.vitimaResponsavelNome),
      vitimaTelefoneResponsavel: trimToUndefined(somenteDigitos(payload.vitimaTelefoneResponsavel)),
      vitimaEnderecoLogradouro: trimToUndefined(payload.vitimaEnderecoLogradouro),
      vitimaEnderecoComplemento: trimToUndefined(payload.vitimaEnderecoComplemento),
      vitimaEnderecoBairro: trimToUndefined(payload.vitimaEnderecoBairro),
      vitimaEnderecoMunicipio: trimToUndefined(payload.vitimaEnderecoMunicipio),
      vitimaEnderecoUf: trimToUndefined(payload.vitimaEnderecoUf),
      autorNome: payload.autorNaoConsta ? undefined : trimToUndefined(payload.autorNome),
      autorIdade: payload.autorNaoConsta ? null : payload.autorIdade ?? null,
      autorParentesco: trimToUndefined(payload.autorParentesco),
      autorParentescoGrau:
        payload.autorParentesco === "Sim" ? trimToUndefined(payload.autorParentescoGrau) : undefined,
      autorResponsavelTipo: payload.autorResponsavelNaoConsta ? undefined : trimToUndefined(payload.autorResponsavelTipo),
      autorResponsavelNome: payload.autorResponsavelNaoConsta ? undefined : trimToUndefined(payload.autorResponsavelNome),
      autorResponsavelTelefone: payload.autorResponsavelNaoConsta
        ? undefined
        : trimToUndefined(somenteDigitos(payload.autorResponsavelTelefone)),
      autorEnderecoLogradouro: payload.autorEnderecoNaoConsta ? undefined : trimToUndefined(payload.autorEnderecoLogradouro),
      autorEnderecoComplemento: payload.autorEnderecoNaoConsta ? undefined : trimToUndefined(payload.autorEnderecoComplemento),
      autorEnderecoBairro: payload.autorEnderecoNaoConsta ? undefined : trimToUndefined(payload.autorEnderecoBairro),
      autorEnderecoMunicipio: payload.autorEnderecoNaoConsta ? undefined : trimToUndefined(payload.autorEnderecoMunicipio),
      tipificacaoViolencia: (payload.tipificacaoViolencia ?? []).filter(Boolean),
      tipificacaoPsicologica: (payload.tipificacaoPsicologica ?? []).filter(Boolean),
      tipificacaoSexual: (payload.tipificacaoSexual ?? []).filter(Boolean),
      violenciaAutoprovocada: (payload.violenciaAutoprovocada ?? []).filter(Boolean),
      outroTipoViolenciaDescricao: trimToUndefined(payload.outroTipoViolenciaDescricao),
      resumoViolencia: payload.resumoViolencia.trim(),
      encaminharMotivo:
        payload.encaminharConselho === false ? trimToUndefined(payload.encaminharMotivo) : undefined,
      dataEnvioConselho:
        payload.encaminharConselho === true ? trimToUndefined(payload.dataEnvioConselho) : undefined,
      denunciaOrigem: (payload.denunciaOrigem ?? []).filter(Boolean),
      denunciaOrigemOutro:
        payload.denunciaOrigem?.includes("Outro") ? trimToUndefined(payload.denunciaOrigemOutro) : undefined
    };
  }

  async function salvar() {
    const payload = normalizarParaSalvar(form);

    if (!payload.dataPreenchimento || !payload.vitimaNome || payload.vitimaIdade == null || !payload.resumoViolencia) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Preencha data, nome da vítima, idade e resumo da ocorrência."
      });
      return;
    }

    if (payload.localViolencia === "Outros espacos" && !payload.localViolenciaOutro) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe o local quando selecionar outros espaços."
      });
      return;
    }

    if (payload.vitimaOrientacaoSexual === "Outro" && !payload.vitimaOrientacaoOutro) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe a orientação sexual quando selecionar outro."
      });
      return;
    }

    if (payload.autorParentesco === "Sim" && !payload.autorParentescoGrau) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe o grau de parentesco."
      });
      return;
    }

    if (payload.encaminharConselho === false && !payload.encaminharMotivo) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe o motivo quando a ocorrência não for encaminhada ao Conselho Tutelar."
      });
      return;
    }

    try {
      const response = await salvarMutation.mutateAsync({ id: form.id, payload });
      setForm(response);
      setSnapshot(response);
      sincronizarBuscaVitima(response);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Ocorrência salva com sucesso." });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar."
      });
    }
  }

  async function confirmarExclusao() {
    if (!form.id) return;

    try {
      await removerMutation.mutateAsync(form.id);
      setConfirmarExcluir(false);
      novo();
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Ocorrência excluída com sucesso." });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir."
      });
    }
  }

  async function anexarArquivo(arquivo: File) {
    if (!form.id) {
      setPopup({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Salve a ocorrência antes de anexar arquivos."
      });
      return;
    }

    if (anexos.length >= 10) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "O limite é de 10 anexos por ocorrência."
      });
      return;
    }

    if (!["application/pdf", "image/jpeg", "image/png"].includes(arquivo.type)) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Envie apenas PDF, JPG ou PNG."
      });
      return;
    }

    if (arquivo.size > 10 * 1024 * 1024) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Arquivo acima de 10MB."
      });
      return;
    }

    try {
      await adicionarAnexoMutation.mutateAsync({
        nomeArquivo: arquivo.name,
        tipoMime: arquivo.type,
        conteudoBase64: await arquivoParaBase64(arquivo),
        ordem: anexos.length + 1
      });
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Anexo adicionado com sucesso." });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível anexar arquivo."
      });
    }
  }

  const acoes: AdminAction[] = [
    { label: "Buscar", icon: Search, onClick: () => setAbrirBusca(true), variant: "outline" },
    { label: "Novo", icon: Plus, onClick: novo, variant: "default", disabled: carregandoAcoes },
    {
      label: salvarMutation.isPending ? "Salvando..." : "Salvar",
      icon: Save,
      onClick: () => void salvar(),
      variant: "default",
      disabled: carregandoAcoes
    },
    { label: "Cancelar", icon: Undo2, onClick: cancelar, variant: "outline", disabled: carregandoAcoes },
    {
      label: "Excluir",
      icon: Trash2,
      onClick: () => setConfirmarExcluir(true),
      variant: "danger",
      disabled: !form.id || carregandoAcoes
    },
    { label: "Imprimir", icon: Printer, onClick: () => setAbrirImpressao(true), variant: "outline", disabled: !form.id },
    { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
  ];

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        sectionLabel="Atendimentos"
        pageTitle={tituloTela}
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={form.id ? `Código: ${form.id}` : "Novo"}
      >
        {abaAtiva === "ocorrencia" ? (
          <div className="space-y-3">
            <BlocoFormulario titulo="Dados da ocorrência" descricao="Preencha a data e o local principal do registro.">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="data-preenchimento">Data de preenchimento *</Label>
                  <Input
                    id="data-preenchimento"
                    type="date"
                    value={form.dataPreenchimento}
                    onChange={(event) => atualizarCampo("dataPreenchimento", event.target.value)}
                  />
                </div>
              </div>

              <div className="mt-3 space-y-3">
                <GrupoEscolhaUnica
                  label="Violência praticada contra criança/adolescente"
                  value={form.localViolencia}
                  options={opcoesLocalViolencia}
                  onChange={(value) => atualizarCampo("localViolencia", value)}
                />
                {form.localViolencia === "Outros espacos" ? (
                  <div className="space-y-1">
                    <Label htmlFor="local-violencia-outro">Outros espaços</Label>
                    <Input
                      id="local-violencia-outro"
                      value={form.localViolenciaOutro ?? ""}
                      onChange={(event) => atualizarCampo("localViolenciaOutro", event.target.value)}
                      placeholder="Informe o local"
                    />
                  </div>
                ) : null}
              </div>
            </BlocoFormulario>

            <BlocoFormulario titulo="Violência motivada por">
              <GrupoMultiplaEscolha
                label="Motivação"
                values={form.violenciaMotivadaPor}
                options={opcoesViolenciaMotivada}
                onToggle={(value) => alternarLista("violenciaMotivadaPor", value)}
              />
              {form.violenciaMotivadaPor?.includes("Outros") ? (
                <div className="mt-3 space-y-1">
                  <Label htmlFor="violencia-motivada-outro">Outros motivos</Label>
                  <Input
                    id="violencia-motivada-outro"
                    value={form.violenciaMotivadaOutro ?? ""}
                    onChange={(event) => atualizarCampo("violenciaMotivadaOutro", event.target.value)}
                    placeholder="Descreva"
                  />
                </div>
              ) : null}
            </BlocoFormulario>

            <BlocoFormulario titulo="Violência praticada por">
              <GrupoMultiplaEscolha
                label="Autores indicados"
                values={form.violenciaPraticadaPor}
                options={opcoesViolenciaPraticada}
                onToggle={(value) => alternarLista("violenciaPraticadaPor", value)}
              />
              {form.violenciaPraticadaPor?.includes("outro") ? (
                <div className="mt-3 space-y-1">
                  <Label htmlFor="violencia-praticada-outro">Outro autor</Label>
                  <Input
                    id="violencia-praticada-outro"
                    value={form.violenciaPraticadaOutro ?? ""}
                    onChange={(event) => atualizarCampo("violenciaPraticadaOutro", event.target.value)}
                    placeholder="Descreva"
                  />
                </div>
              ) : null}
            </BlocoFormulario>

            <BlocoFormulario titulo="Outras violações de direitos">
              <GrupoMultiplaEscolha
                label="Ocorrências relacionadas"
                values={form.outrasViolacoes}
                options={opcoesOutrasViolacoes}
                onToggle={(value) => alternarLista("outrasViolacoes", value)}
                columns="sm:grid-cols-2"
              />
            </BlocoFormulario>
          </div>
        ) : null}

        {abaAtiva === "vitima" ? (
          <div className="space-y-3">
            <BlocoFormulario
              titulo="Identificação da vítima"
              descricao="Busque o nome no cadastro de beneficiário para preencher automaticamente os dados já cadastrados."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="vitima-nome">Nome *</Label>
                  <Input
                    id="vitima-nome"
                    value={termoBuscaVitima}
                    onChange={(event) => atualizarNomeVitima(event.target.value)}
                    onFocus={() => setMostrarSugestoesVitima(true)}
                    onBlur={(event) => {
                      setTermoBuscaVitima(event.target.value);
                      setTimeout(() => setMostrarSugestoesVitima(false), 120);
                    }}
                    placeholder="Digite para buscar no cadastro de beneficiário"
                    autoComplete="off"
                  />
                  {mostrarSugestoesVitima ? (
                    <div className="max-h-48 overflow-y-auto rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] p-1">
                      {buscaVitimaHabilitada ? (
                        beneficiariosVitimaQuery.isFetching ? (
                          <p className="px-2 py-1 text-xs text-[var(--g3-muted)]">Buscando beneficiários...</p>
                        ) : beneficiariosVitima.length ? (
                          beneficiariosVitima.map((beneficiario) => (
                            <button
                              key={beneficiario.id_beneficiario}
                              type="button"
                              className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-[var(--g3-primary-soft)]"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => preencherVitimaComBeneficiario(beneficiario)}
                            >
                              <span className="font-medium text-[var(--g3-foreground)]">
                                {beneficiario.nome_completo}
                              </span>
                              <span className="block text-[11px] text-[var(--g3-muted)]">
                                {beneficiario.codigo ? `Código ${beneficiario.codigo}` : "Sem código"}
                                {beneficiario.cpf ? ` • CPF ${beneficiario.cpf}` : ""}
                              </span>
                            </button>
                          ))
                        ) : (
                          <p className="px-2 py-1 text-xs text-[var(--g3-muted)]">
                            Nenhum beneficiário encontrado.
                          </p>
                        )
                      ) : (
                        <p className="px-2 py-1 text-xs text-[var(--g3-muted)]">
                          Digite pelo menos 2 caracteres para buscar.
                        </p>
                      )}
                    </div>
                  ) : null}
                  {beneficiarioVitimaAtual?.id_beneficiario ? (
                    <p className="text-[11px] text-emerald-700">
                      Beneficiário selecionado: {beneficiarioVitimaAtual.nome_completo}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vitima-idade">Idade *</Label>
                  <Input
                    id="vitima-idade"
                    type="number"
                    min={0}
                    value={form.vitimaIdade ?? ""}
                    onChange={(event) =>
                      atualizarCampo("vitimaIdade", event.target.value ? Number(event.target.value) : null)
                    }
                  />
                </div>
              </div>
            </BlocoFormulario>

            <BlocoFormulario titulo="Perfil da vítima">
              <div className="space-y-3">
                <GrupoEscolhaUnica
                  label="Sexo"
                  value={form.vitimaSexo}
                  options={opcoesSexoVitima}
                  onChange={(value) => atualizarCampo("vitimaSexo", value)}
                  columns="sm:grid-cols-3"
                />
                <GrupoEscolhaUnica
                  label="Raça/cor"
                  value={form.vitimaRacaCor}
                  options={opcoesRacaCorVitima}
                  onChange={(value) => atualizarCampo("vitimaRacaCor", value)}
                  columns="sm:grid-cols-2 xl:grid-cols-5"
                />
                <GrupoEscolhaUnica
                  label="Identidade de gênero"
                  value={form.vitimaIdentidadeGenero}
                  options={opcoesIdentidadeGeneroVitima}
                  onChange={(value) => atualizarCampo("vitimaIdentidadeGenero", value)}
                />
                <GrupoEscolhaUnica
                  label="Orientação sexual"
                  value={form.vitimaOrientacaoSexual}
                  options={opcoesOrientacaoSexual}
                  onChange={(value) => atualizarCampo("vitimaOrientacaoSexual", value)}
                />
                {form.vitimaOrientacaoSexual === "Outro" ? (
                  <div className="space-y-1">
                    <Label htmlFor="vitima-orientacao-outro">Outra orientação sexual</Label>
                    <Input
                      id="vitima-orientacao-outro"
                      value={form.vitimaOrientacaoOutro ?? ""}
                      onChange={(event) => atualizarCampo("vitimaOrientacaoOutro", event.target.value)}
                      placeholder="Descreva"
                    />
                  </div>
                ) : null}
                <GrupoEscolhaUnica
                  label="Escolaridade"
                  value={form.vitimaEscolaridade}
                  options={opcoesEscolaridadeVitima}
                  onChange={(value) => atualizarCampo("vitimaEscolaridade", value)}
                  columns="sm:grid-cols-2 xl:grid-cols-4"
                />
              </div>
            </BlocoFormulario>

            <BlocoFormulario titulo="Responsável">
              <div className="space-y-3">
                <GrupoEscolhaUnica
                  label="Responsável"
                  value={form.vitimaResponsavelTipo}
                  options={opcoesResponsavelVitima}
                  onChange={(value) => atualizarResponsavelVitima(value)}
                  columns="sm:grid-cols-3"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="vitima-responsavel-nome">Nome do responsável</Label>
                    <Input
                      id="vitima-responsavel-nome"
                      value={form.vitimaResponsavelNome ?? ""}
                      onChange={(event) => atualizarCampo("vitimaResponsavelNome", event.target.value)}
                      readOnly={
                        !!beneficiarioVitimaAtual &&
                        !!form.vitimaResponsavelTipo &&
                        form.vitimaResponsavelTipo !== "Outro"
                      }
                      placeholder={
                        form.vitimaResponsavelTipo === "Outro"
                          ? "Informe o nome do responsável"
                          : "Selecione mãe, pai ou outro"
                      }
                    />
                    {!!beneficiarioVitimaAtual &&
                    !!form.vitimaResponsavelTipo &&
                    form.vitimaResponsavelTipo !== "Outro" ? (
                      <p className="text-[11px] text-[var(--g3-muted)]">
                        Nome preenchido automaticamente pelo cadastro do beneficiário.
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="vitima-responsavel-telefone">Telefone do responsável</Label>
                    <Input
                      id="vitima-responsavel-telefone"
                      value={form.vitimaTelefoneResponsavel ?? ""}
                      onChange={(event) => atualizarCampo("vitimaTelefoneResponsavel", event.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                    {!!beneficiarioVitimaAtual ? (
                      <p className="text-[11px] text-[var(--g3-muted)]">
                        Telefone sugerido automaticamente a partir do cadastro do beneficiário.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </BlocoFormulario>

            <BlocoFormulario titulo="Endereço da vítima">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="vitima-logradouro">Logradouro</Label>
                  <Input
                    id="vitima-logradouro"
                    value={form.vitimaEnderecoLogradouro ?? ""}
                    onChange={(event) => atualizarCampo("vitimaEnderecoLogradouro", event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vitima-complemento">Complemento</Label>
                  <Input
                    id="vitima-complemento"
                    value={form.vitimaEnderecoComplemento ?? ""}
                    onChange={(event) => atualizarCampo("vitimaEnderecoComplemento", event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vitima-bairro">Bairro</Label>
                  <Input
                    id="vitima-bairro"
                    value={form.vitimaEnderecoBairro ?? ""}
                    onChange={(event) => atualizarCampo("vitimaEnderecoBairro", event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vitima-municipio">Município</Label>
                  <Input
                    id="vitima-municipio"
                    value={form.vitimaEnderecoMunicipio ?? ""}
                    onChange={(event) => atualizarCampo("vitimaEnderecoMunicipio", event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vitima-uf">UF</Label>
                  <Input
                    id="vitima-uf"
                    value={form.vitimaEnderecoUf ?? ""}
                    onChange={(event) => atualizarCampo("vitimaEnderecoUf", event.target.value)}
                  />
                </div>
              </div>
            </BlocoFormulario>
          </div>
        ) : null}

        {abaAtiva === "autor" ? (
          <div className="space-y-3">
            <BlocoFormulario titulo="Identificação">
              <div className="mb-3 flex items-center gap-2 rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-2 text-sm">
                <Checkbox
                  checked={!!form.autorNaoConsta}
                  onChange={(event) => atualizarCampo("autorNaoConsta", event.target.checked)}
                />
                <span>Não consta</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="autor-nome">Nome</Label>
                  <Input
                    id="autor-nome"
                    value={form.autorNome ?? ""}
                    onChange={(event) => atualizarCampo("autorNome", event.target.value)}
                    disabled={!!form.autorNaoConsta}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="autor-idade">Idade</Label>
                  <Input
                    id="autor-idade"
                    type="number"
                    min={0}
                    value={form.autorIdade ?? ""}
                    onChange={(event) =>
                      atualizarCampo("autorIdade", event.target.value ? Number(event.target.value) : null)
                    }
                    disabled={!!form.autorNaoConsta}
                  />
                </div>
              </div>
            </BlocoFormulario>

            <BlocoFormulario titulo="Vínculo de parentesco">
              <div className="space-y-3">
                <GrupoEscolhaUnica
                  label="Possui vínculo de parentesco?"
                  value={form.autorParentesco}
                  options={opcoesParentesco}
                  onChange={(value) => atualizarCampo("autorParentesco", value)}
                  columns="sm:grid-cols-3"
                />
                <div className="space-y-1">
                  <Label htmlFor="autor-parentesco-grau">Grau de parentesco</Label>
                  <Input
                    id="autor-parentesco-grau"
                    value={form.autorParentescoGrau ?? ""}
                    onChange={(event) => atualizarCampo("autorParentescoGrau", event.target.value)}
                    disabled={form.autorParentesco !== "Sim"}
                  />
                </div>
              </div>
            </BlocoFormulario>

            <BlocoFormulario titulo="Responsável do possível autor">
              <div className="mb-3 flex items-center gap-2 rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-2 text-sm">
                <Checkbox
                  checked={!!form.autorResponsavelNaoConsta}
                  onChange={(event) => atualizarCampo("autorResponsavelNaoConsta", event.target.checked)}
                />
                <span>Não consta</span>
              </div>
              <div className="space-y-3">
                <GrupoEscolhaUnica
                  label="Nome do responsável (quando criança/adolescente)"
                  value={form.autorResponsavelTipo}
                  options={opcoesResponsavelAutor}
                  onChange={(value) => {
                    atualizarCampo("autorResponsavelTipo", value);
                    atualizarCampo("autorResponsavelNaoConsta", false);
                  }}
                  columns="sm:grid-cols-2"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="autor-responsavel-nome">Nome do responsável</Label>
                    <Input
                      id="autor-responsavel-nome"
                      value={form.autorResponsavelNome ?? ""}
                      onChange={(event) => atualizarCampo("autorResponsavelNome", event.target.value)}
                      disabled={!!form.autorResponsavelNaoConsta}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="autor-responsavel-telefone">Telefone do responsável</Label>
                    <Input
                      id="autor-responsavel-telefone"
                      value={form.autorResponsavelTelefone ?? ""}
                      onChange={(event) => atualizarCampo("autorResponsavelTelefone", event.target.value)}
                      disabled={!!form.autorResponsavelNaoConsta}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>
            </BlocoFormulario>

            <BlocoFormulario titulo="Endereço do possível autor">
              <div className="mb-3 flex items-center gap-2 rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-2 text-sm">
                <Checkbox
                  checked={!!form.autorEnderecoNaoConsta}
                  onChange={(event) => atualizarCampo("autorEnderecoNaoConsta", event.target.checked)}
                />
                <span>Não consta</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="autor-logradouro">Logradouro</Label>
                  <Input
                    id="autor-logradouro"
                    value={form.autorEnderecoLogradouro ?? ""}
                    onChange={(event) => atualizarCampo("autorEnderecoLogradouro", event.target.value)}
                    disabled={!!form.autorEnderecoNaoConsta}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="autor-complemento">Complemento</Label>
                  <Input
                    id="autor-complemento"
                    value={form.autorEnderecoComplemento ?? ""}
                    onChange={(event) => atualizarCampo("autorEnderecoComplemento", event.target.value)}
                    disabled={!!form.autorEnderecoNaoConsta}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="autor-bairro">Bairro</Label>
                  <Input
                    id="autor-bairro"
                    value={form.autorEnderecoBairro ?? ""}
                    onChange={(event) => atualizarCampo("autorEnderecoBairro", event.target.value)}
                    disabled={!!form.autorEnderecoNaoConsta}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="autor-municipio">Município</Label>
                  <Input
                    id="autor-municipio"
                    value={form.autorEnderecoMunicipio ?? ""}
                    onChange={(event) => atualizarCampo("autorEnderecoMunicipio", event.target.value)}
                    disabled={!!form.autorEnderecoNaoConsta}
                  />
                </div>
              </div>
            </BlocoFormulario>
          </div>
        ) : null}

        {abaAtiva === "classificacao" ? (
          <div className="space-y-3">
            <BlocoFormulario titulo="Tipificação da violência">
              <GrupoMultiplaEscolha
                label="Tipos principais"
                values={form.tipificacaoViolencia}
                options={opcoesTipificacaoViolencia}
                onToggle={(value) => alternarLista("tipificacaoViolencia", value)}
              />
            </BlocoFormulario>

            <BlocoFormulario titulo="Violência psicológica">
              <GrupoMultiplaEscolha
                label="Detalhamentos"
                values={form.tipificacaoPsicologica}
                options={opcoesTipificacaoPsicologica}
                onToggle={(value) => alternarLista("tipificacaoPsicologica", value)}
              />
            </BlocoFormulario>

            <BlocoFormulario titulo="Violência sexual">
              <GrupoMultiplaEscolha
                label="Detalhamentos"
                values={form.tipificacaoSexual}
                options={opcoesTipificacaoSexual}
                onToggle={(value) => alternarLista("tipificacaoSexual", value)}
              />
            </BlocoFormulario>

            <BlocoFormulario titulo="Violência autoprovocada">
              <GrupoMultiplaEscolha
                label="Situações"
                values={form.violenciaAutoprovocada}
                options={opcoesViolenciaAutoprovocada}
                onToggle={(value) => alternarLista("violenciaAutoprovocada", value)}
                columns="sm:grid-cols-2"
              />
            </BlocoFormulario>

            <BlocoFormulario titulo="Outro tipo de violência">
              <div className="space-y-1">
                <Label htmlFor="outro-tipo-violencia">Descrição</Label>
                <Textarea
                  id="outro-tipo-violencia"
                  rows={4}
                  value={form.outroTipoViolenciaDescricao ?? ""}
                  onChange={(event) => atualizarCampo("outroTipoViolenciaDescricao", event.target.value)}
                />
              </div>
            </BlocoFormulario>
          </div>
        ) : null}
        
        {abaAtiva === "relato" ? (
          <div className="space-y-3">
            <BlocoFormulario titulo="Resumo da violência">
              <div className="space-y-1">
                <Label htmlFor="resumo-violencia">Resumo da violência (ou suspeita) *</Label>
                <Textarea
                  id="resumo-violencia"
                  rows={6}
                  value={form.resumoViolencia}
                  onChange={(event) => atualizarCampo("resumoViolencia", event.target.value)}
                  disabled={carregandoAcoes}
                />
              </div>
            </BlocoFormulario>

            <BlocoFormulario titulo="Encaminhamento ao Conselho Tutelar">
              <div className="space-y-3">
                <GrupoEscolhaUnica
                  label="Encaminhamento"
                  value={
                    form.encaminharConselho === true
                      ? "sim"
                      : form.encaminharConselho === false
                        ? "nao"
                        : undefined
                  }
                  options={[
                    { value: "sim", label: "Sim" },
                    { value: "nao", label: "Não" }
                  ]}
                  onChange={(value) =>
                    atualizarCampo(
                      "encaminharConselho",
                      value === "sim" ? true : value === "nao" ? false : null
                    )
                  }
                  columns="sm:grid-cols-2"
                />

                {form.encaminharConselho === false ? (
                  <div className="space-y-1">
                    <Label htmlFor="encaminhar-motivo">Motivo do não encaminhamento</Label>
                    <Textarea
                      id="encaminhar-motivo"
                      rows={3}
                      value={form.encaminharMotivo ?? ""}
                      onChange={(event) => atualizarCampo("encaminharMotivo", event.target.value)}
                    />
                  </div>
                ) : null}

                {form.encaminharConselho === true ? (
                  <div className="space-y-1">
                    <Label htmlFor="data-envio-conselho">Data de envio da ficha ao Conselho Tutelar</Label>
                    <Input
                      id="data-envio-conselho"
                      type="date"
                      value={form.dataEnvioConselho ?? ""}
                      onChange={(event) => atualizarCampo("dataEnvioConselho", event.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            </BlocoFormulario>

            <BlocoFormulario titulo="Como a denúncia chegou à ADRA">
              <GrupoMultiplaEscolha
                label="Origem da denúncia"
                values={form.denunciaOrigem}
                options={opcoesDenunciaOrigem}
                onToggle={(value) => alternarLista("denunciaOrigem", value)}
              />
              {form.denunciaOrigem?.includes("Outro") ? (
                <div className="mt-3 space-y-1">
                  <Label htmlFor="denuncia-origem-outro">Outra origem</Label>
                  <Input
                    id="denuncia-origem-outro"
                    value={form.denunciaOrigemOutro ?? ""}
                    onChange={(event) => atualizarCampo("denunciaOrigemOutro", event.target.value)}
                  />
                </div>
              ) : null}
            </BlocoFormulario>

            <BlocoFormulario titulo="Anexos" descricao="Até 10 anexos (PDF, JPG ou PNG) de até 10MB cada.">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    type="file"
                    accept=".pdf,image/png,image/jpeg"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void anexarArquivo(file);
                      }
                      event.target.value = "";
                    }}
                    disabled={carregandoAcoes}
                  />
                  <span className="text-xs text-[var(--g3-muted)]">{anexos.length}/10 anexos</span>
                </div>
                {adicionarAnexoMutation.isPending ? (
                  <p className="text-sm text-[var(--g3-muted)]">Enviando anexo...</p>
                ) : null}
                <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                      <tr>
                        <th className="px-3 py-2 text-left">Arquivo</th>
                        <th className="px-3 py-2 text-left">Tipo</th>
                        <th className="px-3 py-2 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {anexos.length ? (
                        anexos.map((anexo, index) => (
                          <tr
                            key={anexo.id ?? index}
                            className={`border-t border-[var(--g3-border)] ${
                              index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                            }`}
                          >
                            <td className="px-3 py-2">{anexo.nomeArquivo}</td>
                            <td className="px-3 py-2">{anexo.tipoMime}</td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => (anexo.id ? void removerAnexoMutation.mutateAsync(anexo.id) : undefined)}
                                disabled={adicionarAnexoMutation.isPending || removerAnexoMutation.isPending}
                              >
                                {removerAnexoMutation.isPending ? "Removendo..." : "Remover"}
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-3 py-4 text-center">
                            Nenhum anexo adicionado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </BlocoFormulario>
          </div>
        ) : null}
      </AdminPageLayout>

      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}

      <PopupConfirmacao
        aberto={confirmarExcluir}
        titulo="Confirmar exclusão"
        texto="Esta ação é irreversível. Deseja continuar?"
        processando={removerMutation.isPending}
        onCancel={() => setConfirmarExcluir(false)}
        onConfirm={() => void confirmarExclusao()}
        confirmarTexto="Excluir"
      />

      {abrirBusca ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 p-4"
          onClick={() => setAbrirBusca(false)}
        >
          <div
            className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Buscar ocorrência</h3>
              <Button variant="outline" size="sm" onClick={() => setAbrirBusca(false)}>
                Fechar
              </Button>
            </div>
            <Input
              placeholder="Buscar por nome da vítima ou data"
              value={termoBusca}
              onChange={(event) => setTermoBusca(event.target.value)}
            />
            <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Vítima</th>
                  </tr>
                </thead>
                <tbody>
                  {ocorrenciasFiltradas.length ? (
                    ocorrenciasFiltradas.map((item, index) => (
                      <tr
                        key={item.id ?? index}
                        className={`cursor-pointer border-t border-[var(--g3-border)] ${
                          index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                        }`}
                        onClick={() => selecionar(item)}
                      >
                        <td className="px-3 py-2">{item.dataPreenchimento}</td>
                        <td className="px-3 py-2">{item.vitimaNome}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="px-3 py-4 text-center">
                        {ocorrenciasQuery.isLoading ? "Carregando ocorrências..." : "Nenhum registro encontrado."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {abrirImpressao && form.id ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 p-4"
          onClick={() => setAbrirImpressao(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-3 text-base font-semibold">Opções de impressão</h3>
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() =>
                  window.open(
                    ocorrenciasCriancaService.obterPdfDenunciaUrl(form.id as string),
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
              >
                Ficha completa da denúncia
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() =>
                  window.open(
                    ocorrenciasCriancaService.obterPdfConselhoTutelarUrl(form.id as string),
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
              >
                Ficha ao Conselho Tutelar
              </Button>
            </div>
            <div className="mt-3 flex justify-end">
              <Button variant="outline" onClick={() => setAbrirImpressao(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
