import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LucideIcon } from "lucide-react";
import {
  Search,
  Plus,
  Save,
  Undo2,
  Trash2,
  Printer,
  X,
  ListFilter,
  IdCard,
  MapPinned,
  Phone,
  Handshake,
  GraduationCap,
  HeartPulse,
  HandCoins,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  beneficiarioDefaultValues,
  beneficiarioFormSchema,
  beneficiarioStatusOptions
} from "@/features/beneficiarios/beneficiario.schema";
import {
  useBeneficiario,
  useBeneficiarios,
  useProximoCodigo,
  useRemoverBeneficiario,
  useSalvarBeneficiario
} from "@/features/beneficiarios/use-beneficiarios";
import { reportsService } from "@/services/reports.service";
import type { Beneficiario, BeneficiarioFiltro, BeneficiarioStatus } from "@/types/beneficiario";

const abas = [
  { id: "listagem", label: "Listagem de beneficiários", icon: ListFilter },
  { id: "dados", label: "Dados pessoais", icon: IdCard },
  { id: "endereco", label: "Endereço", icon: MapPinned },
  { id: "contato", label: "Contato", icon: Phone },
  { id: "social", label: "Situação social", icon: Handshake },
  { id: "escolaridade", label: "Escolaridade e trabalho", icon: GraduationCap },
  { id: "saude", label: "Saúde", icon: HeartPulse },
  { id: "beneficios", label: "Benefícios", icon: HandCoins },
  { id: "observacoes", label: "Observações", icon: FileText }
] as const;

const tituloTela = "Cadastro de beneficiários";

function formatarStatus(status?: string) {
  if (!status) return "Em análise";
  const texto = status.toLowerCase().replaceAll("_", " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function statusVariant(status?: BeneficiarioStatus) {
  switch (status) {
    case "ATIVO":
      return "success" as const;
    case "BLOQUEADO":
      return "danger" as const;
    case "INCOMPLETO":
    case "DESATUALIZADO":
      return "warning" as const;
    default:
      return "info" as const;
  }
}

const fotoLarguraPx = 300;
const fotoAlturaPx = 400;
const fotoMaximaBytes = 5 * 1024 * 1024;

type AcaoCrud = {
  label: string;
  onClick: () => void;
  variant: "default" | "outline" | "danger" | "ghost";
  icon: LucideIcon;
};

function lerArquivoComoDataUrl(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem enviada."));
    reader.readAsDataURL(arquivo);
  });
}

function carregarImagem(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => reject(new Error("Não foi possível processar a imagem."));
    imagem.src = dataUrl;
  });
}

async function ajustarParaFotoTresPorQuatro(dataUrl: string): Promise<string> {
  const imagem = await carregarImagem(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = fotoLarguraPx;
  canvas.height = fotoAlturaPx;

  const contexto = canvas.getContext("2d");
  if (!contexto) {
    throw new Error("Não foi possível preparar a área de edição da foto.");
  }

  const proporcaoDestino = fotoLarguraPx / fotoAlturaPx;
  const proporcaoOrigem = imagem.width / imagem.height;

  let origemX = 0;
  let origemY = 0;
  let origemLargura = imagem.width;
  let origemAltura = imagem.height;

  if (proporcaoOrigem > proporcaoDestino) {
    origemLargura = imagem.height * proporcaoDestino;
    origemX = (imagem.width - origemLargura) / 2;
  } else if (proporcaoOrigem < proporcaoDestino) {
    origemAltura = imagem.width / proporcaoDestino;
    origemY = (imagem.height - origemAltura) / 2;
  }

  contexto.drawImage(
    imagem,
    origemX,
    origemY,
    origemLargura,
    origemAltura,
    0,
    0,
    fotoLarguraPx,
    fotoAlturaPx
  );

  return canvas.toDataURL("image/jpeg", 0.92);
}

export function CadastroBeneficiarioPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<(typeof abas)[number]["id"]>("listagem");
  const [filtroDraft, setFiltroDraft] = useState<BeneficiarioFiltro>({
    nome: "",
    codigo: "",
    cpf: "",
    status: "",
    data_nascimento: ""
  });
  const [filtros, setFiltros] = useState<BeneficiarioFiltro>(filtroDraft);
  const [beneficiarioSelecionadoId, setBeneficiarioSelecionadoId] = useState<string | undefined>();
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [webcamAberta, setWebcamAberta] = useState(false);
  const [carregandoWebcam, setCarregandoWebcam] = useState(false);
  const inputArquivoRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamWebcamRef = useRef<MediaStream | null>(null);

  const { data: listaData, isLoading: carregandoLista } = useBeneficiarios(filtros);
  const { data: detalhesData, isLoading: carregandoDetalhes } = useBeneficiario(beneficiarioSelecionadoId);
  const { data: proximoCodigoData, refetch: refetchProximoCodigo } = useProximoCodigo();
  const salvarMutation = useSalvarBeneficiario();
  const removerMutation = useRemoverBeneficiario();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(beneficiarioFormSchema),
    defaultValues: beneficiarioDefaultValues
  });

  const foto3x4Atual = watch("foto_3x4") || "";

  useEffect(() => {
    if (!detalhesData?.beneficiario) return;
    const item = detalhesData.beneficiario;
    reset({
      ...beneficiarioDefaultValues,
      ...item,
      status: item.status ?? "EM_ANALISE",
      aceite_lgpd: item.aceite_lgpd ?? true
    });
    setMensagem(null);
  }, [detalhesData, reset]);

  useEffect(() => {
    if (beneficiarioSelecionadoId) return;
    const codigo = proximoCodigoData?.codigo;
    reset({
      ...beneficiarioDefaultValues,
      codigo: codigo ?? beneficiarioDefaultValues.codigo
    });
  }, [beneficiarioSelecionadoId, proximoCodigoData, reset]);

  useEffect(() => {
    if (!webcamAberta) return;
    const video = videoRef.current;
    const stream = streamWebcamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play();
  }, [webcamAberta]);

  useEffect(() => {
    return () => {
      const stream = streamWebcamRef.current;
      if (!stream) return;
      for (const track of stream.getTracks()) {
        track.stop();
      }
      streamWebcamRef.current = null;
    };
  }, []);

  const beneficiarios = listaData?.beneficiarios ?? [];
  const abaAtual = abas.find((aba) => aba.id === abaAtiva);
  const tituloAbaAtiva = abaAtual?.label ?? tituloTela;
  const IconeAbaAtiva = abaAtual?.icon ?? ListFilter;

  const dadosGrafico = useMemo(() => {
    const agrupado = new Map<string, number>();
    for (const item of beneficiarios) {
      const chave = item.status ?? "EM_ANALISE";
      agrupado.set(chave, (agrupado.get(chave) ?? 0) + 1);
    }
    return [...agrupado.entries()].map(([status, total]) => ({
      status: formatarStatus(status),
      total
    }));
  }, [beneficiarios]);

  const bloqueadoAcao = salvarMutation.isPending || removerMutation.isPending || carregandoDetalhes;

  const onSubmit = handleSubmit(
    async (values) => {
      setMensagem(null);
      const payload = {
        ...values,
        id_beneficiario: beneficiarioSelecionadoId,
        codigo: values.codigo || proximoCodigoData?.codigo,
        data_aceite_lgpd: values.data_aceite_lgpd || new Date().toISOString().slice(0, 10)
      } as unknown as Beneficiario;

      try {
        const response = await salvarMutation.mutateAsync(payload);
        const id = response.beneficiario.id_beneficiario;
        setBeneficiarioSelecionadoId(id);
        setMensagem({ tipo: "sucesso", texto: "Beneficiário salvo com sucesso." });
        setFiltros((prev) => ({ ...prev }));
        await refetchProximoCodigo();
      } catch (error: any) {
        setMensagem({
          tipo: "erro",
          texto: error?.response?.data?.message ?? "Não foi possível salvar o beneficiário."
        });
      }
    },
    () => {
      setAbaAtiva("dados");
      setMensagem({
        tipo: "erro",
        texto: "Preencha os campos obrigatórios antes de salvar."
      });
    }
  );

  function acaoBuscar() {
    setMensagem(null);
    setFiltros({ ...filtroDraft });
    setAbaAtiva("listagem");
  }

  async function acaoNovo() {
    encerrarWebcam();
    setBeneficiarioSelecionadoId(undefined);
    setAbaAtiva("dados");
    await refetchProximoCodigo();
    reset({
      ...beneficiarioDefaultValues,
      codigo: proximoCodigoData?.codigo
    });
    setMensagem(null);
  }

  function acaoCancelar() {
    encerrarWebcam();
    if (detalhesData?.beneficiario) {
      reset({
        ...beneficiarioDefaultValues,
        ...detalhesData.beneficiario,
        status: detalhesData.beneficiario.status ?? "EM_ANALISE",
        aceite_lgpd: detalhesData.beneficiario.aceite_lgpd ?? true
      });
      setMensagem(null);
      return;
    }
    void acaoNovo();
  }

  async function acaoExcluir() {
    if (!beneficiarioSelecionadoId) {
      setMensagem({ tipo: "erro", texto: "Selecione um beneficiário para excluir." });
      return;
    }
    const confirmou = window.confirm("Deseja excluir o beneficiário selecionado?");
    if (!confirmou) return;

    try {
      await removerMutation.mutateAsync(beneficiarioSelecionadoId);
      await acaoNovo();
      setMensagem({ tipo: "sucesso", texto: "Beneficiário excluído com sucesso." });
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir o beneficiário."
      });
    }
  }

  async function acaoImprimir() {
    const item = detalhesData?.beneficiario;
    if (!item) {
      setMensagem({ tipo: "erro", texto: "Selecione um beneficiário para imprimir a ficha." });
      return;
    }
    try {
      const blob = await reportsService.gerarFichaBeneficiario({
        beneficiarioId: item.id_beneficiario as string,
        usuarioEmissor: "sistema-g3-next"
      });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.response?.data?.message ?? "Não foi possível gerar o relatório."
      });
    }
  }

  function acaoFechar() {
    navigate("/");
  }

  function encerrarWebcam() {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }

    const stream = streamWebcamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
    streamWebcamRef.current = null;
    setWebcamAberta(false);
  }

  async function abrirWebcam() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMensagem({
        tipo: "erro",
        texto: "Este navegador não permite captura por webcam."
      });
      return;
    }

    setMensagem(null);
    setCarregandoWebcam(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
      });
      streamWebcamRef.current = stream;
      setWebcamAberta(true);
    } catch {
      setMensagem({
        tipo: "erro",
        texto: "Não foi possível acessar a webcam. Verifique as permissões."
      });
    } finally {
      setCarregandoWebcam(false);
    }
  }

  async function definirFotoPorDataUrl(dataUrl: string) {
    const fotoTratada = await ajustarParaFotoTresPorQuatro(dataUrl);
    setValue("foto_3x4", fotoTratada, { shouldDirty: true, shouldValidate: true });
  }

  async function onSelecionarArquivoFoto(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      setMensagem({ tipo: "erro", texto: "Selecione um arquivo de imagem válido." });
      return;
    }

    if (arquivo.size > fotoMaximaBytes) {
      setMensagem({
        tipo: "erro",
        texto: "A foto deve ter no máximo 5 MB."
      });
      return;
    }

    try {
      const dataUrl = await lerArquivoComoDataUrl(arquivo);
      await definirFotoPorDataUrl(dataUrl);
      setMensagem({ tipo: "sucesso", texto: "Foto 3x4 atualizada com sucesso." });
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.message ?? "Não foi possível processar a foto enviada."
      });
    }
  }

  async function capturarFotoWebcam() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setMensagem({
        tipo: "erro",
        texto: "A webcam ainda não esta pronta para captura."
      });
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = fotoLarguraPx;
    canvas.height = fotoAlturaPx;
    const contexto = canvas.getContext("2d");

    if (!contexto) {
      setMensagem({
        tipo: "erro",
        texto: "Não foi possível capturar a imagem da webcam."
      });
      return;
    }

    const proporcaoDestino = fotoLarguraPx / fotoAlturaPx;
    const proporcaoOrigem = video.videoWidth / video.videoHeight;
    let origemX = 0;
    let origemY = 0;
    let origemLargura = video.videoWidth;
    let origemAltura = video.videoHeight;

    if (proporcaoOrigem > proporcaoDestino) {
      origemLargura = video.videoHeight * proporcaoDestino;
      origemX = (video.videoWidth - origemLargura) / 2;
    } else if (proporcaoOrigem < proporcaoDestino) {
      origemAltura = video.videoWidth / proporcaoDestino;
      origemY = (video.videoHeight - origemAltura) / 2;
    }

    contexto.drawImage(
      video,
      origemX,
      origemY,
      origemLargura,
      origemAltura,
      0,
      0,
      fotoLarguraPx,
      fotoAlturaPx
    );

    try {
      await definirFotoPorDataUrl(canvas.toDataURL("image/jpeg", 0.92));
      encerrarWebcam();
      setMensagem({ tipo: "sucesso", texto: "Foto capturada com sucesso." });
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.message ?? "Não foi possível concluir a captura da foto."
      });
    }
  }

  function removerFoto() {
    setValue("foto_3x4", "", { shouldDirty: true, shouldValidate: true });
    setMensagem(null);
  }

  function acaoSalvar() {
    void onSubmit();
  }

  const acoes: AcaoCrud[] = [
    { label: "Buscar", onClick: acaoBuscar, variant: "outline", icon: Search },
    { label: "Novo", onClick: () => void acaoNovo(), variant: "outline", icon: Plus },
    { label: "Salvar", onClick: acaoSalvar, variant: "default", icon: Save },
    { label: "Cancelar", onClick: acaoCancelar, variant: "outline", icon: Undo2 },
    { label: "Excluir", onClick: () => void acaoExcluir(), variant: "danger", icon: Trash2 },
    { label: "Imprimir", onClick: () => void acaoImprimir(), variant: "outline", icon: Printer },
    { label: "Fechar", onClick: acaoFechar, variant: "ghost", icon: X }
  ];

  return (
    <main className="g3-container space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-2">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          {acoes.map((acao) => (
            <Button
              key={acao.label}
              type="button"
              variant={acao.variant}
              size="sm"
              className="w-full shadow-sm shadow-slate-300/45 transition-shadow hover:shadow-md hover:shadow-slate-300/55 sm:w-auto"
              onClick={acao.onClick}
              disabled={bloqueadoAcao || (acao.label === "Excluir" && !beneficiarioSelecionadoId)}
            >
              <acao.icon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {acao.label}
            </Button>
          ))}
        </div>
      </section>

      {mensagem && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            mensagem.tipo === "sucesso"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
        <Card className="h-fit min-w-0">
          <CardHeader>
            <CardTitle>{tituloTela}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {abas.map((aba, indice) => (
              <button
                key={aba.id}
                type="button"
                onClick={() => setAbaAtiva(aba.id)}
                className={`flex w-full items-center rounded-md border px-3 py-2 text-left text-sm font-semibold ${
                  abaAtiva === aba.id
                    ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
                >
                <span
                  className={`mr-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold text-white ${
                    abaAtiva === aba.id ? "bg-emerald-700" : "bg-emerald-600"
                  }`}
                  aria-hidden="true"
                >
                  {indice + 1}
                </span>
                <span>{aba.label}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between gap-2 border-b-2 border-emerald-400 px-3 py-2">
            <div
              className={`inline-flex items-center gap-2 rounded-md px-2 py-1 ${
                abaAtiva === "listagem"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              <IconeAbaAtiva className="h-4 w-4" aria-hidden="true" />
              <CardTitle className="text-xs sm:text-sm">{tituloAbaAtiva}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {detalhesData?.beneficiario?.status && (
                <Badge variant={statusVariant(detalhesData.beneficiario.status)}>
                  {formatarStatus(detalhesData.beneficiario.status)}
                </Badge>
              )}
              <Badge variant="default">Código {detalhesData?.beneficiario?.codigo ?? proximoCodigoData?.codigo ?? "---"}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {abaAtiva === "listagem" ? (
              <section className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <Label>Nome</Label>
                    <Input
                      value={filtroDraft.nome ?? ""}
                      onChange={(event) =>
                        setFiltroDraft((prev) => ({ ...prev, nome: event.target.value }))
                      }
                      placeholder="Buscar por nome"
                    />
                  </div>
                  <div>
                    <Label>Código</Label>
                    <Input
                      value={filtroDraft.codigo ?? ""}
                      onChange={(event) =>
                        setFiltroDraft((prev) => ({ ...prev, codigo: event.target.value }))
                      }
                      placeholder="0001"
                    />
                  </div>
                  <div>
                    <Label>CPF</Label>
                    <Input
                      value={filtroDraft.cpf ?? ""}
                      onChange={(event) =>
                        setFiltroDraft((prev) => ({ ...prev, cpf: event.target.value }))
                      }
                      placeholder="00000000000"
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={filtroDraft.status ?? ""}
                      onChange={(event) =>
                        setFiltroDraft((prev) => ({ ...prev, status: event.target.value }))
                      }
                    >
                      <option value="">Todos</option>
                      {beneficiarioStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {formatarStatus(status)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Nascimento</Label>
                    <Input
                      type="date"
                      value={filtroDraft.data_nascimento ?? ""}
                      onChange={(event) =>
                        setFiltroDraft((prev) => ({ ...prev, data_nascimento: event.target.value }))
                      }
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    setFiltroDraft({
                      nome: "",
                      codigo: "",
                      cpf: "",
                      status: "",
                      data_nascimento: ""
                    })
                  }
                >
                  Limpar filtros
                </Button>

                <div className="max-h-[420px] overflow-auto rounded-md border border-slate-200">
                  {carregandoLista ? (
                    <p className="p-3 text-sm text-slate-500">Carregando beneficiários...</p>
                  ) : beneficiarios.length === 0 ? (
                    <p className="p-3 text-sm text-slate-500">Nenhum beneficiário encontrado.</p>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="px-2 py-2">Nome</th>
                          <th className="px-2 py-2">Código</th>
                          <th className="px-2 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {beneficiarios.map((item) => (
                          <tr
                            key={item.id_beneficiario}
                            className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 ${
                              item.id_beneficiario === beneficiarioSelecionadoId ? "bg-emerald-50" : ""
                            }`}
                            onClick={() => {
                              setBeneficiarioSelecionadoId(item.id_beneficiario);
                              setAbaAtiva("dados");
                            }}
                          >
                            <td className="px-2 py-2">{item.nome_completo}</td>
                            <td className="px-2 py-2">{item.codigo ?? "---"}</td>
                            <td className="px-2 py-2">
                              <Badge variant={statusVariant(item.status)}>
                                {formatarStatus(item.status)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="h-52 rounded-md border border-slate-200 bg-slate-50 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosGrafico}>
                      <XAxis dataKey="status" hide />
                      <YAxis allowDecimals={false} width={24} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#047857" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            ) : (
              <form className="min-w-0 space-y-4" onSubmit={onSubmit}>
                {abaAtiva === "dados" && (
                  <section className="grid gap-3 sm:grid-cols-2">
                    <input type="hidden" {...register("foto_3x4")} />
                    <div className="sm:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="mx-auto flex aspect-[3/4] w-36 items-center justify-center overflow-hidden rounded-md border border-emerald-200 bg-white">
                          {foto3x4Atual ? (
                            <img
                              src={foto3x4Atual}
                              alt="Foto 3x4 do beneficiário"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="px-2 text-center text-xs font-medium text-slate-500">
                              Foto 3x4
                            </span>
                          )}
                        </div>

                        <div className="flex-1 space-y-3">
                          <Label>Foto 3x4 do beneficiário</Label>
                          <input
                            ref={inputArquivoRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={onSelecionarArquivoFoto}
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => inputArquivoRef.current?.click()}
                            >
                              Enviar Foto
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void abrirWebcam()}
                              disabled={carregandoWebcam}
                            >
                              {carregandoWebcam ? "Abrindo Webcam..." : "Capturar Pela Webcam"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={removerFoto}
                              disabled={!foto3x4Atual}
                            >
                              Remover Foto
                            </Button>
                          </div>
                          <p className="text-xs text-slate-600">
                            A Foto Será Ajustada Automaticamente No Formato 3x4.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <Label>Nome completo*</Label>
                      <Input {...register("nome_completo")} />
                      {errors.nome_completo && (
                        <p className="mt-1 text-xs text-red-600">{errors.nome_completo.message}</p>
                      )}
                    </div>
                    <div>
                      <Label>Nome social</Label>
                      <Input {...register("nome_social")} />
                    </div>
                    <div>
                      <Label>Apelido</Label>
                      <Input {...register("apelido")} />
                    </div>
                    <div>
                      <Label>Data de nascimento*</Label>
                      <Input type="date" {...register("data_nascimento")} />
                      {errors.data_nascimento && (
                        <p className="mt-1 text-xs text-red-600">{errors.data_nascimento.message}</p>
                      )}
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select {...register("status")}>
                        {beneficiarioStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {formatarStatus(status)}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label>Nome da mãe*</Label>
                      <Input {...register("nome_mae")} />
                      {errors.nome_mae && (
                        <p className="mt-1 text-xs text-red-600">{errors.nome_mae.message}</p>
                      )}
                    </div>
                    <div>
                      <Label>Nome do pai</Label>
                      <Input {...register("nome_pai")} />
                    </div>
                    <div>
                      <Label>CPF*</Label>
                      <Input {...register("cpf")} />
                      {errors.cpf && <p className="mt-1 text-xs text-red-600">{errors.cpf.message}</p>}
                    </div>
                    <div>
                      <Label>RG</Label>
                      <Input {...register("rg_numero")} />
                    </div>
                  </section>
                )}

                {abaAtiva === "endereco" && (
                  <section className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>CEP*</Label>
                      <Input {...register("cep")} />
                      {errors.cep && <p className="mt-1 text-xs text-red-600">{errors.cep.message}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Logradouro</Label>
                      <Input {...register("logradouro")} />
                    </div>
                    <div>
                      <Label>Número</Label>
                      <Input {...register("numero")} />
                    </div>
                    <div>
                      <Label>Complemento</Label>
                      <Input {...register("complemento")} />
                    </div>
                    <div>
                      <Label>Bairro</Label>
                      <Input {...register("bairro")} />
                    </div>
                    <div>
                      <Label>Município</Label>
                      <Input {...register("municipio")} />
                    </div>
                    <div>
                      <Label>UF</Label>
                      <Input maxLength={2} {...register("uf")} />
                    </div>
                    <div>
                      <Label>Zona</Label>
                      <Select {...register("zona")}>
                        <option value="URBANA">Urbana</option>
                        <option value="RURAL">Rural</option>
                      </Select>
                    </div>
                  </section>
                )}

                {abaAtiva === "contato" && (
                  <section className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Telefone principal*</Label>
                      <Input {...register("telefone_principal")} />
                      {errors.telefone_principal && (
                        <p className="mt-1 text-xs text-red-600">{errors.telefone_principal.message}</p>
                      )}
                    </div>
                    <div>
                      <Label>Telefone secundário</Label>
                      <Input {...register("telefone_secundario")} />
                    </div>
                    <div>
                      <Label>Telefone recado</Label>
                      <Input {...register("telefone_recado_numero")} />
                    </div>
                    <div>
                      <Label>Nome recado</Label>
                      <Input {...register("telefone_recado_nome")} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>E-mail</Label>
                      <Input type="email" {...register("email")} />
                      {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                    </div>
                    <div className="sm:col-span-2 grid grid-cols-2 gap-3 rounded-md border border-slate-200 p-3">
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <Controller
                          name="permite_contato_tel"
                          control={control}
                          render={({ field }) => (
                            <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                          )}
                        />
                        Permite ligação
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <Controller
                          name="permite_contato_whatsapp"
                          control={control}
                          render={({ field }) => (
                            <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                          )}
                        />
                        Permite WhatsApp
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <Controller
                          name="permite_contato_sms"
                          control={control}
                          render={({ field }) => (
                            <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                          )}
                        />
                        Permite SMS
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <Controller
                          name="permite_contato_email"
                          control={control}
                          render={({ field }) => (
                            <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                          )}
                        />
                        Permite e-mail
                      </label>
                    </div>
                  </section>
                )}

                {abaAtiva === "social" && (
                  <section className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label>Composição familiar</Label>
                      <Textarea {...register("composicao_familiar")} />
                    </div>
                    <div>
                      <Label>Crianças/adolescentes</Label>
                      <Input
                        type="number"
                        min={0}
                        {...register("criancas_adolescentes", {
                          setValueAs: (value) => (value === "" ? undefined : Number(value))
                        })}
                      />
                    </div>
                    <div>
                      <Label>Idosos</Label>
                      <Input
                        type="number"
                        min={0}
                        {...register("idosos", {
                          setValueAs: (value) => (value === "" ? undefined : Number(value))
                        })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Situação de vulnerabilidade</Label>
                      <Textarea {...register("situacao_vulnerabilidade")} />
                    </div>
                  </section>
                )}

                {abaAtiva === "escolaridade" && (
                  <section className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Nível de escolaridade</Label>
                      <Input {...register("nivel_escolaridade")} />
                    </div>
                    <div>
                      <Label>Ocupação</Label>
                      <Input {...register("ocupacao")} />
                    </div>
                    <div>
                      <Label>Situação de trabalho</Label>
                      <Input {...register("situacao_trabalho")} />
                    </div>
                    <div>
                      <Label>Local de trabalho</Label>
                      <Input {...register("local_trabalho")} />
                    </div>
                    <div>
                      <Label>Renda mensal</Label>
                      <Input {...register("renda_mensal")} />
                    </div>
                    <div>
                      <Label>Fonte de renda</Label>
                      <Input {...register("fonte_renda")} />
                    </div>
                  </section>
                )}

                {abaAtiva === "saude" && (
                  <section className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <Controller
                        name="possui_deficiencia"
                        control={control}
                        render={({ field }) => (
                          <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                        )}
                      />
                      Possui deficiência
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <Controller
                        name="usa_medicacao_continua"
                        control={control}
                        render={({ field }) => (
                          <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                        )}
                      />
                      Usa medicação contínua
                    </label>
                    <div>
                      <Label>Tipo de deficiência</Label>
                      <Input {...register("tipo_deficiencia")} />
                    </div>
                    <div>
                      <Label>Serviço de saúde de referência</Label>
                      <Input {...register("servico_saude_referencia")} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Descrição de medicação</Label>
                      <Textarea {...register("descricao_medicacao")} />
                    </div>
                  </section>
                )}

                {abaAtiva === "beneficios" && (
                  <section className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                      <Controller
                        name="recebe_beneficio"
                        control={control}
                        render={({ field }) => (
                          <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                        )}
                      />
                      Recebe benefício social
                    </label>
                    <div className="sm:col-span-2">
                      <Label>Descrição dos benefícios</Label>
                      <Textarea {...register("beneficios_descricao")} />
                    </div>
                    <div>
                      <Label>Valor total dos benefícios</Label>
                      <Input {...register("valor_total_beneficios")} />
                    </div>
                  </section>
                )}

                {abaAtiva === "observacoes" && (
                  <section className="space-y-3">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <Controller
                        name="aceite_lgpd"
                        control={control}
                        render={({ field }) => (
                          <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                        )}
                      />
                      Aceite LGPD*
                    </label>
                    {errors.aceite_lgpd && (
                      <p className="text-xs text-red-600">{errors.aceite_lgpd.message}</p>
                    )}
                    <div>
                      <Label>Data de aceite LGPD</Label>
                      <Input type="date" {...register("data_aceite_lgpd")} />
                    </div>
                    <div>
                      <Label>Observações</Label>
                      <Textarea {...register("observacoes")} />
                    </div>
                  </section>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {webcamAberta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
          role="dialog"
          aria-modal="true"
          onClick={encerrarWebcam}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Capturar Foto 3x4</h3>
              <Button type="button" variant="ghost" size="sm" onClick={encerrarWebcam}>
                Fechar
              </Button>
            </div>

            <div className="space-y-3 px-5 py-4">
              <div className="mx-auto w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
                <video
                  ref={videoRef}
                  className="aspect-[3/4] w-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
              </div>
              <p className="text-center text-xs text-slate-600">
                Posicione o rosto no centro e clique em Capturar.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button type="button" variant="outline" onClick={encerrarWebcam}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => void capturarFotoWebcam()}>
                Capturar
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}



