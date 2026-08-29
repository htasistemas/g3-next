import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import {
  BadgeCheck,
  Bot,
  Building2,
  Camera,
  CheckCircle2,
  ChevronLeft,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useSystemVersion } from "@/hooks/use-system-version";
import { formatarCnpj, normalizarCnpj } from "@/lib/br-utils";
import { precarregarRota } from "@/routes/route-modules";
import { authService } from "@/services/auth.service";
import type { AmbienteAutorizado, LoginMfaRequired, TenantContextoLogin } from "@/types/auth";

const LEMBRAR_ACESSO_STORAGE_KEY = "g3n_login_lembrar_acesso";
const CNPJ_STORAGE_KEY = "g3n_login_cnpj";
const EMAIL_MASTER_SEM_TENANT = "htasistemas@gmail.com";

type EtapaLogin = "instituicao" | "credenciais" | "mfa" | "ambientes";
type ModalLogin = "termos" | "politica" | "acesso" | "assistente" | "passkey" | null;

function normalizarValorAmbiente(valor: string | undefined) {
  const normalizado = valor?.trim();
  if (!normalizado) return undefined;
  if (normalizado.startsWith("__ENV_") && normalizado.endsWith("__")) return undefined;
  return normalizado;
}

const GOOGLE_CLIENT_ID =
  normalizarValorAmbiente(import.meta.env.VITE_GOOGLE_CLIENT_ID) ??
  normalizarValorAmbiente(window.__env?.googleClientId);
const GOOGLE_ALLOWED_ORIGINS =
  normalizarValorAmbiente(import.meta.env.VITE_GOOGLE_ALLOWED_ORIGINS) ??
  normalizarValorAmbiente(window.__env?.googleAllowedOrigins) ??
  "";
const GOOGLE_CONFIGURED_ORIGINS = new Set(
  GOOGLE_ALLOWED_ORIGINS.split(",")
    .map((origem: string) => origem.trim())
    .filter(Boolean)
);

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdConfiguration = {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  ux_mode?: "popup" | "redirect";
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
};

type GoogleRenderButtonConfiguration = {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  size?: "large" | "medium" | "small";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (configuration: GoogleIdConfiguration) => void;
          renderButton: (
            element: HTMLElement,
            configuration: GoogleRenderButtonConfiguration
          ) => void;
        };
      };
    };
  }
}

function extrairSlugSubdominio() {
  if (typeof window === "undefined") return undefined;
  const hostname = window.location.hostname.trim().toLowerCase();
  if (!hostname || hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return undefined;
  const partes = hostname.split(".").filter(Boolean);
  if (partes.length < 3) return undefined;
  const primeiroSegmento = partes[0];
  if (!primeiroSegmento || ["www", "app", "g3n"].includes(primeiroSegmento)) return undefined;
  return primeiroSegmento;
}

function obterMensagemErro(error: any, fallback: string) {
  return error?.response?.data?.message ?? error?.response?.data?.mensagem ?? fallback;
}

function obterMensagemErroLogin(error: any) {
  const mensagem = obterMensagemErro(error, "Não foi possível autenticar.");
  const normalizada = mensagem.toLowerCase();
  if (normalizada.includes("senha invalida")) {
    return "Senha incorreta para este usuário. Verifique a credencial cadastrada ou redefina o acesso.";
  }
  if (normalizada.includes("nao foi possivel localizar o usuario informado")) {
    return "Não localizamos um usuário para esta instituição e este e-mail.";
  }
  if (normalizada.includes("vinculado a outra instituicao")) {
    return "O e-mail informado está vinculado a outra instituição. Verifique o CNPJ e a Administração inicial.";
  }
  if (normalizada.includes("rota nao encontrada") || normalizada.includes("rota não encontrada")) {
    return "Não foi possível conectar ao serviço de autenticação. Atualize a página e tente novamente.";
  }
  return mensagem;
}

function ehEmailMasterSemTenant(email: string) {
  return email.trim().toLowerCase() === EMAIL_MASTER_SEM_TENANT;
}

function suportaPasskey() {
  return typeof window !== "undefined" && "PublicKeyCredential" in window;
}

function destinoLogin(locationState: unknown) {
  return (locationState as { from?: string } | null)?.from || "/cadastros/beneficiarios";
}

function BandeiraBrasilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <rect width="24" height="24" fill="#009B3A" />
      <polygon points="12,3 22,12 12,21 2,12" fill="#FFDF00" />
      <circle cx="12" cy="12" r="4.5" fill="#002776" />
    </svg>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginGoogle, verificarMfa, selecionarAmbiente, atualizarPerfil } = useAuth();
  const slugSubdominio = useMemo(() => extrairSlugSubdominio(), []);
  const cnpjSalvo = typeof window !== "undefined" ? window.localStorage.getItem(CNPJ_STORAGE_KEY) ?? "" : "";
  const lembrarSalvo =
    typeof window !== "undefined" ? window.localStorage.getItem(LEMBRAR_ACESSO_STORAGE_KEY) === "1" : false;
  const [etapa, setEtapa] = useState<EtapaLogin>("credenciais");
  const [ambientes, setAmbientes] = useState<AmbienteAutorizado[]>([]);
  const [loginTicket, setLoginTicket] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState<ModalLogin>(null);
  const [popupEsqueciSenhaAberto, setPopupEsqueciSenhaAberto] = useState(false);
  const [cnpj, setCnpj] = useState(cnpjSalvo);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigoMfa, setCodigoMfa] = useState("");
  const [mfaPendente, setMfaPendente] = useState<LoginMfaRequired | null>(null);
  const [popupFaceAberto, setPopupFaceAberto] = useState(false);
  const [cameraFaceAberta, setCameraFaceAberta] = useState(false);
  const [capturandoFace, setCapturandoFace] = useState(false);
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [emailRecuperacao, setEmailRecuperacao] = useState("");
  const [lembrarAcesso, setLembrarAcesso] = useState(lembrarSalvo);
  const [instituicaoContexto, setInstituicaoContexto] = useState<TenantContextoLogin | null>(null);
  const [carregandoInstituicao, setCarregandoInstituicao] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [carregandoGoogle, setCarregandoGoogle] = useState(false);
  const [carregandoPasskey, setCarregandoPasskey] = useState(false);
  const [carregandoRecuperacao, setCarregandoRecuperacao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [mensagemRecuperacao, setMensagemRecuperacao] = useState<string | null>(null);
  const [googleBotaoPronto, setGoogleBotaoPronto] = useState(false);
  const [assistenteResposta, setAssistenteResposta] = useState(
    "Escolha uma dúvida para receber orientação de acesso sem expor dados sensíveis."
  );
  const [passkeyMensagem, setPasskeyMensagem] = useState("");
  const { version: versaoSistema } = useSystemVersion();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const videoFaceRef = useRef<HTMLVideoElement | null>(null);
  const streamFaceRef = useRef<MediaStream | null>(null);
  const origemAtual = typeof window === "undefined" ? "" : window.location.origin;
  const googleAviso = !GOOGLE_CLIENT_ID
    ? "Login com Google indisponível: client ID não configurado."
    : GOOGLE_CONFIGURED_ORIGINS.size > 0 && !GOOGLE_CONFIGURED_ORIGINS.has(origemAtual)
      ? "Login com Google indisponível neste ambiente."
      : null;
  const googleDisponivel = googleAviso === null;
  const deveRenderizarGoogle = googleDisponivel && etapa === "credenciais";
  const tituloInstituicao = instituicaoContexto?.nome_fantasia || instituicaoContexto?.razao_social;
  const passkeyDisponivel = suportaPasskey();

  async function carregarContextoInstituicao(parametros: {
    cnpj?: string;
    slug?: string;
    codigoInstituicao?: string;
  }) {
    if (!parametros.slug && !parametros.cnpj && !parametros.codigoInstituicao) {
      setInstituicaoContexto(null);
      return;
    }
    setCarregandoInstituicao(true);
    try {
      const contexto = await authService.obterTenantContexto(parametros);
      setInstituicaoContexto(contexto);
    } catch {
      setInstituicaoContexto(null);
    } finally {
      setCarregandoInstituicao(false);
    }
  }

  function salvarLembrancaInstituicao(cnpjNormalizado: string) {
    if (typeof window === "undefined") return;
    if (lembrarAcesso && cnpjNormalizado) {
      window.localStorage.setItem(CNPJ_STORAGE_KEY, cnpjNormalizado);
      window.localStorage.setItem(LEMBRAR_ACESSO_STORAGE_KEY, "1");
    } else {
      window.localStorage.removeItem(CNPJ_STORAGE_KEY);
      window.localStorage.removeItem(LEMBRAR_ACESSO_STORAGE_KEY);
    }
  }

  function irParaDestino() {
    const destino = destinoLogin(location.state);
    void precarregarRota(destino).catch(() => {});
    navigate(destino, { replace: true });
  }

  function validarInstituicao() {
    setErro(null);
    const cnpjNormalizado = normalizarCnpj(cnpj);
    if (!slugSubdominio && cnpjNormalizado.length !== 14) {
      setErro("Informe o CNPJ da instituição para continuar.");
      return;
    }
    setEtapa("credenciais");
  }

  function iniciarAcessoMaster() {
    setErro(null);
    setAviso(null);
    setCnpj("");
    setInstituicaoContexto(null);
    setEmail(EMAIL_MASTER_SEM_TENANT);
    setEtapa("credenciais");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (etapa === "instituicao") {
      validarInstituicao();
      return;
    }
    if (etapa === "mfa") {
      await confirmarMfa();
      return;
    }
    if (etapa === "ambientes") return;
    await autenticarComSenha();
  }

  async function autenticarComSenha() {
    setErro(null);
    setAviso(null);
    const cnpjNormalizado = normalizarCnpj(cnpj);
    const emailNormalizado = email.trim().toLowerCase();
    if (!emailNormalizado) {
      setErro("Informe o e-mail de acesso.");
      return;
    }
    if (!senha.trim()) {
      setErro("Informe a senha.");
      return;
    }

    setCarregando(true);
    try {
      const resultado = await login({
        cnpj: cnpjNormalizado || undefined,
        slug: slugSubdominio || undefined,
        email: emailNormalizado,
        senha
      });
      if ("selecaoAmbienteRequired" in resultado) {
        setAmbientes(resultado.ambientes);
        setLoginTicket(resultado.loginTicket);
        setEtapa("ambientes");
        setAviso("Selecione o ambiente de trabalho para continuar.");
        return;
      }
      if ("mfaRequired" in resultado) {
        setMfaPendente(resultado);
        setEtapa("mfa");
        if (resultado.method === "face") {
          setPopupFaceAberto(true);
        }
        setAviso(
          resultado.method === "passkey"
            ? "Confirme sua identidade com a passkey cadastrada neste usuário."
            : resultado.method === "face"
              ? "Confirme sua identidade com a biometria facial cadastrada."
            : resultado.devCode
              ? `Código de desenvolvimento: ${resultado.devCode}`
              : `Enviamos um código de segurança para ${resultado.maskedEmail}.`
        );
        return;
      }
      salvarLembrancaInstituicao(cnpjNormalizado);
      abrirOfertaPasskeyOuEntrar();
    } catch (error: any) {
      setErro(obterMensagemErroLogin(error));
    } finally {
      setCarregando(false);
    }
  }

  async function entrarNoAmbiente(acessoId: string) {
    if (!loginTicket) return;
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await selecionarAmbiente({ loginTicket, acessoId });
      if ("mfaRequired" in resultado) {
        setMfaPendente(resultado);
        setEtapa("mfa");
        setAviso(resultado.devCode ? `Código de desenvolvimento: ${resultado.devCode}` : `Enviamos um código de segurança para ${resultado.maskedEmail}.`);
        return;
      }
      setLoginTicket(null);
      setAmbientes([]);
      abrirOfertaPasskeyOuEntrar();
    } catch (error: any) {
      setErro(obterMensagemErro(error, "Não foi possível abrir o ambiente selecionado."));
    } finally {
      setCarregando(false);
    }
  }

  async function confirmarMfa() {
    if (!mfaPendente) return;
    setErro(null);
    if (mfaPendente.method === "face") {
      abrirPopupFaceLogin();
      return;
    }
    if (mfaPendente.method === "passkey") {
      if (!mfaPendente.options) {
        setErro("Não foi possível iniciar a confirmação por passkey.");
        return;
      }
      if (!passkeyDisponivel) {
        setErro("Este navegador não oferece suporte a passkeys.");
        return;
      }
      setCarregando(true);
      try {
        const response = await startAuthentication({ optionsJSON: mfaPendente.options });
        await authService.concluirLoginPasskey({ challengeId: mfaPendente.challengeId, response });
        await atualizarPerfil();
        salvarLembrancaInstituicao(normalizarCnpj(cnpj));
        irParaDestino();
      } catch (error: any) {
        setErro(obterMensagemErro(error, "Não foi possível confirmar a passkey."));
      } finally {
        setCarregando(false);
      }
      return;
    }
    if (!/^\d{6}$/.test(codigoMfa.trim())) {
      setErro("Informe o código de 6 dígitos.");
      return;
    }
    setCarregando(true);
    try {
      await verificarMfa({ challengeId: mfaPendente.challengeId, codigo: codigoMfa.trim() });
      salvarLembrancaInstituicao(normalizarCnpj(cnpj));
      abrirOfertaPasskeyOuEntrar();
    } catch (error: any) {
      setErro(obterMensagemErro(error, "Não foi possível confirmar o código."));
    } finally {
      setCarregando(false);
    }
  }

  function abrirPopupFaceLogin() {
    setErro(null);
    setPopupFaceAberto(true);
  }

  function fecharPopupFaceLogin() {
    pararCameraFaceLogin();
    setPopupFaceAberto(false);
  }

  async function iniciarCameraFaceLogin() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setErro("Este dispositivo não permite captura de câmera para validação facial.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      streamFaceRef.current = stream;
      setCameraFaceAberta(true);
      window.setTimeout(() => {
        if (videoFaceRef.current) {
          videoFaceRef.current.srcObject = stream;
          void videoFaceRef.current.play().catch(() => undefined);
        }
      }, 0);
    } catch (error: any) {
      setErro(obterMensagemErro(error, "Não foi possível acessar a câmera para validação facial."));
    }
  }

  function pararCameraFaceLogin() {
    streamFaceRef.current?.getTracks().forEach((track) => track.stop());
    streamFaceRef.current = null;
    if (videoFaceRef.current) {
      videoFaceRef.current.srcObject = null;
    }
    setCameraFaceAberta(false);
  }

  async function confirmarFaceLogin() {
    if (!mfaPendente || mfaPendente.method !== "face") return;
    const video = videoFaceRef.current;
    if (!cameraFaceAberta || !video || !video.videoWidth || !video.videoHeight) {
      await iniciarCameraFaceLogin();
      return;
    }

    setCapturandoFace(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Não foi possível preparar a captura facial.");
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const faceImagem = canvas.toDataURL("image/jpeg", 0.86);
      await authService.verificarFace({
        challengeId: mfaPendente.challengeId,
        face_imagem: faceImagem
      });
      pararCameraFaceLogin();
      salvarLembrancaInstituicao(normalizarCnpj(cnpj));
      irParaDestino();
    } catch (error: any) {
      setErro(obterMensagemErro(error, "Não foi possível validar a biometria facial."));
    } finally {
      setCapturandoFace(false);
    }
  }

  function abrirOfertaPasskeyOuEntrar() {
    if (passkeyDisponivel) {
      setPasskeyMensagem("Acesso confirmado. Você pode cadastrar uma passkey neste dispositivo para entrar com biometria ou PIN nas próximas vezes.");
      setModalAberto("passkey");
      return;
    }
    irParaDestino();
  }

  async function cadastrarPasskey() {
    setErro(null);
    setPasskeyMensagem("");
    setCarregandoPasskey(true);
    try {
      const inicio = await authService.iniciarCadastroPasskey();
      const response = await startRegistration({ optionsJSON: inicio.options });
      await authService.concluirCadastroPasskey({
        challengeId: inicio.challengeId,
        response,
        nome: "Passkey do dispositivo"
      });
      setPasskeyMensagem("Passkey cadastrada com sucesso. Nas próximas entradas, use Entrar com passkey.");
      window.setTimeout(() => irParaDestino(), 900);
    } catch (error: any) {
      setPasskeyMensagem(obterMensagemErro(error, "Não foi possível cadastrar a passkey neste dispositivo."));
    } finally {
      setCarregandoPasskey(false);
    }
  }

  async function autenticarComPasskey() {
    setErro(null);
    setAviso(null);
    if (!passkeyDisponivel) {
      setErro("Este navegador não oferece suporte a passkeys.");
      return;
    }
    const cnpjNormalizado = normalizarCnpj(cnpj);
    const emailNormalizado = email.trim().toLowerCase();
    if (!emailNormalizado) {
      setErro("Informe o e-mail antes de entrar com passkey.");
      return;
    }
    if (!slugSubdominio && !ehEmailMasterSemTenant(emailNormalizado) && cnpjNormalizado.length !== 14) {
      setErro("Informe o CNPJ da instituição antes de entrar com passkey.");
      setEtapa("instituicao");
      return;
    }

    setCarregandoPasskey(true);
    try {
      const inicio = await authService.iniciarLoginPasskey({
        email: emailNormalizado,
        cnpj: slugSubdominio || ehEmailMasterSemTenant(emailNormalizado) ? undefined : cnpjNormalizado,
        slug: slugSubdominio
      });
      const response = await startAuthentication({ optionsJSON: inicio.options });
      await authService.concluirLoginPasskey({ challengeId: inicio.challengeId, response });
      salvarLembrancaInstituicao(cnpjNormalizado);
      irParaDestino();
    } catch (error: any) {
      setErro(obterMensagemErro(error, "Não foi possível entrar com passkey."));
    } finally {
      setCarregandoPasskey(false);
    }
  }

  async function autenticarComGoogle(idToken: string) {
    setErro(null);
    setAviso(null);
    setCarregandoGoogle(true);
    try {
      const cnpjNormalizado = normalizarCnpj(cnpj);
      const resultado = await loginGoogle({
        idToken,
        cnpj: slugSubdominio ? undefined : cnpjNormalizado || undefined,
        slug: slugSubdominio
      });
      if ("mfaRequired" in resultado) {
        setMfaPendente(resultado);
        setEtapa("mfa");
        setAviso(
          resultado.devCode
            ? `Código de desenvolvimento: ${resultado.devCode}`
            : `Enviamos um código de segurança para ${resultado.maskedEmail}.`
        );
        return;
      }
      salvarLembrancaInstituicao(cnpjNormalizado);
      irParaDestino();
    } catch (error: any) {
      setErro(obterMensagemErro(error, "Não foi possível autenticar com Google."));
    } finally {
      setCarregandoGoogle(false);
    }
  }

  useEffect(() => {
    if (!deveRenderizarGoogle) {
      setGoogleBotaoPronto(false);
      if (!googleDisponivel) {
        setAviso(googleAviso);
      }
      return;
    }
    setAviso(null);
    function inicializarGoogle() {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID!,
        ux_mode: "popup",
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: (response) => {
          if (!response.credential) {
            setErro("Falha ao obter credencial do Google.");
            return;
          }
          void autenticarComGoogle(response.credential);
        }
      });
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        type: "standard",
        text: "continue_with",
        logo_alignment: "left",
        width: 320
      });
      setGoogleBotaoPronto(true);
    }
    if (window.google?.accounts?.id) {
      inicializarGoogle();
      return;
    }
    const scriptId = "google-identity-script";
    const scriptExistente = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (scriptExistente) {
      if (scriptExistente.dataset.loaded === "true") {
        inicializarGoogle();
        return;
      }
      scriptExistente.addEventListener("load", inicializarGoogle, { once: true });
      return () => scriptExistente.removeEventListener("load", inicializarGoogle);
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      inicializarGoogle();
    };
    script.onerror = () => {
      setGoogleBotaoPronto(false);
      setAviso("Login com Google indisponível no momento. Use e-mail e senha ou tente novamente em instantes.");
    };
    document.head.appendChild(script);
  }, [deveRenderizarGoogle, googleAviso, googleDisponivel, location.state, navigate, slugSubdominio, cnpj, etapa]);

  useEffect(() => {
    if (mfaPendente?.method !== "face") {
      pararCameraFaceLogin();
      setPopupFaceAberto(false);
    }
    return () => {
      pararCameraFaceLogin();
    };
  }, [mfaPendente?.method]);

  useEffect(() => {
    if (!popupFaceAberto || mfaPendente?.method !== "face" || cameraFaceAberta) {
      return;
    }
    const timer = window.setTimeout(() => {
      void iniciarCameraFaceLogin();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [cameraFaceAberta, mfaPendente?.method, popupFaceAberto]);

  useEffect(() => {
    if (slugSubdominio) {
      void carregarContextoInstituicao({ slug: slugSubdominio });
      return;
    }
    const cnpjNormalizado = normalizarCnpj(cnpj);
    if (cnpjNormalizado.length === 14) {
      void carregarContextoInstituicao({ cnpj: cnpjNormalizado });
      return;
    }
    setInstituicaoContexto(null);
  }, [cnpj, slugSubdominio]);

  async function onEnviarRecuperacaoSenha(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensagemRecuperacao(null);
    setCarregandoRecuperacao(true);
    try {
      const emailRecuperacaoNormalizado = emailRecuperacao.trim().toLowerCase();
      const dispensarInstituicao = !slugSubdominio && ehEmailMasterSemTenant(emailRecuperacaoNormalizado);
      const resultado = await authService.esqueciSenha({
        email: emailRecuperacaoNormalizado,
        cnpj: slugSubdominio || dispensarInstituicao ? undefined : normalizarCnpj(cnpj) || undefined,
        slug: slugSubdominio
      });
      setMensagemRecuperacao(resultado.message);
    } catch (error: any) {
      setMensagemRecuperacao(obterMensagemErro(error, "Não foi possível enviar a recuperação de senha."));
    } finally {
      setCarregandoRecuperacao(false);
    }
  }

  function responderAssistente(tipo: "cnpj" | "email" | "perfil" | "seguranca") {
    const respostas = {
      cnpj:
        "Peça ao administrador o CNPJ, código ou link da instituição. Se a instituição usa subdomínio próprio, o sistema identifica o ambiente automaticamente.",
      email:
        "Use o e-mail cadastrado pelo administrador inicial. Quando o mesmo e-mail existir em mais de uma instituição, informe também o CNPJ.",
      perfil:
        "Gestores acessam o G3 Next por esta tela. Beneficiários, famílias, voluntários e parceiros usam portais próprios quando liberados.",
      seguranca:
        "A autenticação segura é definida no cadastro do usuário. Quando estiver marcada, o acesso exige a contrassenha enviada por e-mail após a senha."
    };
    setAssistenteResposta(respostas[tipo]);
  }

  const etapaNumero = etapa === "instituicao" ? 1 : etapa === "credenciais" ? 2 : 3;

  return (
    <main className="relative h-dvh overflow-hidden bg-[#071b2d] text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(20,184,166,0.28),transparent_32%),linear-gradient(135deg,#071b2d_0%,#0f3a3a_48%,#f8fafc_48%,#ffffff_100%)]" />
      <section className="relative z-10 grid h-full min-h-0 lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="relative hidden h-full min-h-0 flex-col justify-center gap-3 p-5 text-white lg:flex xl:gap-4 xl:p-6">
          <div className="-translate-y-16 space-y-3 xl:-translate-y-[4.5rem] xl:space-y-4">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm">
              <Sparkles className="h-4 w-4 text-cyan-200" />
              Login inteligente G3 Next
            </div>
            <div className="max-w-xl space-y-4 xl:space-y-5">
              <h1 className="text-4xl font-semibold leading-tight xl:text-5xl">Tecnologia que fortalece quem transforma vidas.</h1>
              <p className="max-w-lg text-base leading-7 text-slate-200">
                Acesso inteligente e protegido, com múltiplas formas de autenticação em uma experiência
                moderna, segura e preparada para o futuro.
              </p>
            </div>
            <div className="grid max-w-xl gap-3 sm:grid-cols-2">
              {[
                { label: "Acesso seguro", description: "Senha, código e permissões.", Icon: ShieldCheck },
                { label: "Dados protegidos", description: "Cada instituição vê seus dados.", Icon: LockKeyhole },
                { label: "Entrada inteligente", description: "CNPJ, e-mail, Google ou passkey.", Icon: Fingerprint }
              ].map(({ label, description, Icon }, index) => (
                <div key={String(label)} className={`min-h-28 rounded-lg border border-white/15 bg-white/10 p-3 ${index === 2 ? "sm:col-start-1" : ""}`}>
                  <Icon className="h-5 w-5 text-cyan-200" />
                  <p className="mt-3 text-sm font-medium">{label}</p>
                  <p className="mt-1 text-xs leading-4 text-slate-200">{description}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="absolute right-5 top-6 text-xs text-slate-300 xl:right-6">Versão do sistema: {versaoSistema}</p>
        </aside>

        <section className="flex h-full min-h-0 items-center justify-center px-3 py-2 sm:px-5 sm:py-3 lg:px-8">
          <div className="g3-login-card flex w-full max-w-xl flex-col gap-3 overflow-visible rounded-xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-950/20 sm:gap-4 sm:p-5 xl:p-6">
            <header className="g3-login-header space-y-2 sm:space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Acesso ao sistema</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-950">Entrar no G3 Next</h2>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                  <span className="inline-flex h-5 w-5 overflow-hidden rounded-full ring-1 ring-slate-200">
                    <BandeiraBrasilIcon />
                  </span>
                  pt-BR
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {["Instituição", "Usuário", "Segurança"].map((item, index) => {
                  const ativo = etapaNumero >= index + 1;
                  return (
                    <div
                      key={item}
                      className={`min-w-0 rounded-lg border px-2 py-2 text-center text-[0.7rem] font-medium sm:px-3 sm:text-xs ${
                        ativo
                          ? "border-[var(--g3-primary)] bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      <span className="mr-0.5 sm:mr-1">{index + 1}.</span>
                      {item}
                    </div>
                  );
                })}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[var(--g3-active)] shadow-sm">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {slugSubdominio ? "Instituição identificada pelo endereço" : "Instituição do acesso"}
                    </p>
                    {carregandoInstituicao ? (
                      <p className="mt-1 text-sm text-slate-600">Carregando dados da instituição...</p>
                    ) : tituloInstituicao ? (
                      <>
                        <p className="mt-1 truncate text-base font-semibold text-slate-950">{tituloInstituicao}</p>
                        <p className="text-xs text-slate-600">
                          CNPJ {formatarCnpj(instituicaoContexto?.cnpj)} • Plano {instituicaoContexto?.plano}
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-slate-600">
                        Informe o CNPJ para localizar o ambiente correto.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </header>

            <form className="g3-login-form space-y-3 sm:space-y-4" onSubmit={onSubmit}>
              {etapa === "instituicao" ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="cnpj">CNPJ da instituição</Label>
                    <Input
                      id="cnpj"
                      inputMode="numeric"
                      value={formatarCnpj(cnpj)}
                      onChange={(event) => setCnpj(normalizarCnpj(event.target.value).slice(0, 14))}
                      placeholder="00.000.000/0000-00"
                      disabled={carregando || carregandoGoogle}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-[var(--g3-primary)]"
                      checked={lembrarAcesso}
                      onChange={(event) => setLembrarAcesso(event.target.checked)}
                    />
                    Lembrar instituição neste dispositivo
                  </label>
                </div>
              ) : null}

              {etapa === "credenciais" ? (
                <div className="space-y-4">
                  {!slugSubdominio ? (
                    <Button type="button" variant="ghost" size="sm" className="px-0" onClick={() => setEtapa("instituicao")}>
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Trocar instituição
                    </Button>
                  ) : null}

                  <div>
                    <Label htmlFor="email">E-mail de acesso</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="voce@instituicao.org.br"
                        autoComplete="username"
                        disabled={carregando || carregandoGoogle || carregandoPasskey}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="senha">Senha</Label>
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="senha"
                        type={senhaVisivel ? "text" : "password"}
                        value={senha}
                        onChange={(event) => setSenha(event.target.value)}
                        placeholder="Digite sua senha"
                        autoComplete="current-password"
                        disabled={carregando || carregandoGoogle || carregandoPasskey}
                        className="pl-10 pr-11"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-slate-500 transition hover:text-slate-700"
                        onClick={() => setSenhaVisivel((atual) => !atual)}
                        disabled={carregando || carregandoGoogle}
                        aria-label={senhaVisivel ? "Ocultar senha" : "Visualizar senha"}
                        title={senhaVisivel ? "Ocultar senha" : "Visualizar senha"}
                      >
                        {senhaVisivel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-full text-center text-xs font-medium text-[var(--g3-active)] underline decoration-[var(--g3-primary)]/40 underline-offset-2"
                    onClick={() => {
                      setPopupEsqueciSenhaAberto(true);
                      setMensagemRecuperacao(null);
                    }}
                  >
                    Esqueceu sua senha? Clique aqui para recuperar.
                  </button>
                </div>
              ) : null}

              {etapa === "mfa" ? (
                <div className="space-y-3">
                  <Button type="button" variant="ghost" size="sm" className="px-0" onClick={() => setEtapa("credenciais")}>
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Voltar para credenciais
                  </Button>
                  <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-950">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 h-4 w-4" />
                      {mfaPendente?.method === "passkey" ? (
                        <p>
                          Este usuário exige verificação adicional. Use a passkey cadastrada para confirmar este acesso.
                        </p>
                      ) : mfaPendente?.method === "face" ? (
                        <p>
                          Este usuário exige biometria facial. Autorize a câmera e centralize o rosto antes de confirmar.
                        </p>
                      ) : (
                        <p>
                          Este usuário exige verificação adicional. Informe o código enviado para{" "}
                          <strong>{mfaPendente?.maskedEmail}</strong>.
                        </p>
                      )}
                    </div>
                  </div>
                  {mfaPendente?.method === "passkey" ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                      A confirmação abre a biometria, PIN ou chave de segurança do dispositivo.
                    </div>
                  ) : mfaPendente?.method === "face" ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <div className="flex items-start gap-2">
                        <Camera className="mt-0.5 h-4 w-4 text-[var(--g3-active)]" />
                        <div className="space-y-2">
                          <p>A validação facial será feita em uma janela sobre esta tela.</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={abrirPopupFaceLogin}
                            disabled={carregando || capturandoFace}
                          >
                            Abrir biometria facial
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="codigo_mfa">Código de segurança</Label>
                      <Input
                        id="codigo_mfa"
                        inputMode="numeric"
                        value={codigoMfa}
                        onChange={(event) => setCodigoMfa(event.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        disabled={carregando}
                      />
                    </div>
                  )}
                </div>
              ) : null}

              {erro ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p> : null}
              {aviso ? <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">{aviso}</p> : null}

              <Button type="submit" className="w-full" disabled={carregando || carregandoGoogle || carregandoPasskey}>
                {carregando || capturandoFace ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : etapa === "instituicao" ? (
                  "Continuar"
                ) : etapa === "mfa" ? (
                  mfaPendente?.method === "passkey"
                    ? "Confirmar com passkey"
                    : mfaPendente?.method === "face"
                      ? "Abrir biometria facial"
                      : "Confirmar código"
                ) : (
                  "Entrar com senha"
                )}
              </Button>
            </form>

            {etapa === "ambientes" ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="selecao-ambiente-titulo">
                <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--g3-active)]">Acesso autorizado</p>
                    <h3 id="selecao-ambiente-titulo" className="mt-1 text-xl font-semibold text-slate-950">Selecione a instituição</h3>
                    <p className="mt-1 text-sm text-slate-600">Este e-mail possui mais de um ambiente autorizado. Escolha onde deseja trabalhar.</p>
                  </div>
                  <div className="max-h-[min(60vh,28rem)] space-y-3 overflow-y-auto">
                    {ambientes.map((ambiente) => (
                      <div key={ambiente.acesso_id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="font-semibold text-slate-950">{ambiente.nome_fantasia || ambiente.nome_instituicao}</p>
                        {ambiente.cnpj ? <p className="text-sm text-slate-600">CNPJ {formatarCnpj(ambiente.cnpj)}</p> : null}
                        {ambiente.unidade_nome ? <p className="text-sm text-slate-600">Unidade: {ambiente.unidade_nome}</p> : null}
                        <p className="text-sm text-slate-600">Perfil: {ambiente.perfil || "Usuário"}</p>
                        <Button type="button" className="mt-3 w-full" onClick={() => void entrarNoAmbiente(ambiente.acesso_id)} disabled={carregando}>
                          {carregando ? "Abrindo..." : "Entrar nesta instituição"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {etapa === "credenciais" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void autenticarComPasskey()}
                  disabled={carregando || carregandoGoogle || carregandoPasskey || !passkeyDisponivel}
                >
                  {carregandoPasskey ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Fingerprint className="mr-2 h-4 w-4" />}
                  Entrar com passkey
                </Button>
                <Button type="button" variant="outline" onClick={() => setModalAberto("assistente")}>
                  <Bot className="mr-2 h-4 w-4" />
                  Assistente de acesso
                </Button>
              </div>
            ) : null}

            {etapa === "credenciais" ? (
              <div className="space-y-2 border-t border-slate-100 pt-4">
                {googleDisponivel ? (
                  <>
                    <div ref={googleButtonRef} className="flex min-h-11 w-full items-center justify-center" aria-label="Login com Google" />
                    {!googleBotaoPronto ? <p className="text-center text-xs text-slate-500">Preparando login com Google...</p> : null}
                    {carregandoGoogle ? <p className="text-center text-xs text-[var(--g3-active)]">Autenticando com Google...</p> : null}
                  </>
                ) : (
                  <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs text-slate-600">
                    Login com Google disponível apenas em ambientes configurados.
                  </p>
                )}
              </div>
            ) : null}

            <footer className="space-y-3 border-t border-slate-100 pt-4 text-center text-sm">
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalAberto("acesso")}>
                  Solicitar acesso
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setModalAberto("termos")}>
                  Termos de uso
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setModalAberto("politica")}>
                  Política de privacidade
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 px-0"
                  onClick={iniciarAcessoMaster}
                  disabled={carregando || carregandoGoogle}
                  aria-label="Acessar como master"
                  title="Acessar como master"
                >
                  <ShieldCheck className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500 lg:hidden">Versão do sistema: {versaoSistema}</p>
            </footer>
          </div>
        </section>
      </section>

      {modalAberto === "assistente" ? (
        <ModalBase titulo="Assistente inteligente de acesso" onClose={() => setModalAberto(null)}>
          <div className="space-y-3">
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{assistenteResposta}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" onClick={() => responderAssistente("cnpj")}>Não sei meu CNPJ</Button>
              <Button type="button" variant="outline" onClick={() => responderAssistente("email")}>Não sei meu e-mail</Button>
              <Button type="button" variant="outline" onClick={() => responderAssistente("perfil")}>Qual portal usar?</Button>
              <Button type="button" variant="outline" onClick={() => responderAssistente("seguranca")}>Como funciona a segurança?</Button>
            </div>
          </div>
        </ModalBase>
      ) : null}

      {modalAberto === "passkey" ? (
        <ModalBase titulo="Acesso confirmado" onClose={irParaDestino}>
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <div className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4" />
                <p>{passkeyMensagem}</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={irParaDestino} disabled={carregandoPasskey}>
                Entrar agora
              </Button>
              <Button type="button" onClick={() => void cadastrarPasskey()} disabled={carregandoPasskey}>
                {carregandoPasskey ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Fingerprint className="mr-2 h-4 w-4" />}
                Cadastrar passkey
              </Button>
            </div>
          </div>
        </ModalBase>
      ) : null}

      {modalAberto === "acesso" || modalAberto === "termos" || modalAberto === "politica" ? (
        <ModalBase
          titulo={modalAberto === "acesso" ? "Solicitar acesso" : modalAberto === "termos" ? "Termos de uso" : "Política de privacidade"}
          onClose={() => setModalAberto(null)}
        >
          <div className="space-y-3 text-sm text-slate-700">
            {modalAberto === "acesso" ? (
              <>
                <p>O acesso ao G3 Next é administrado pela equipe responsável pelo sistema.</p>
                <p>Novos usuários devem solicitar liberação de conta e permissões ao administrador institucional.</p>
                <p>O cadastro público direto não fica disponível nesta tela.</p>
              </>
            ) : modalAberto === "termos" ? (
              <>
                <p>Este sistema é destinado ao uso institucional da equipe autorizada para gestão social.</p>
                <p>O usuário deve manter sigilo das credenciais, respeitar perfis de acesso e utilizar os dados apenas para finalidades administrativas e assistenciais.</p>
                <p>As ações podem ser registradas para auditoria, segurança e conformidade legal.</p>
              </>
            ) : (
              <>
                <p>O G3 trata dados pessoais com base na LGPD, aplicando controles de acesso, rastreabilidade e proteção de informações sensíveis.</p>
                <p>Os dados são utilizados para execução das atividades de atendimento e gestão institucional, respeitando finalidade, necessidade e segurança.</p>
                <p>Solicitações relacionadas à privacidade devem ser encaminhadas ao responsável institucional.</p>
              </>
            )}
          </div>
        </ModalBase>
      ) : null}

      {popupFaceAberto && mfaPendente?.method === "face" ? (
        <ModalBase titulo="Biometria facial" onClose={() => !capturandoFace && fecharPopupFaceLogin()}>
          <div className="space-y-4">
            <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-950">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4" />
                <p>Centralize o rosto no enquadramento e confirme a captura para liberar o acesso.</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
              {cameraFaceAberta ? (
                <video ref={videoFaceRef} className="aspect-[4/3] max-h-[52vh] w-full object-cover" muted playsInline />
              ) : (
                <div className="flex aspect-[4/3] max-h-[52vh] items-center justify-center px-4 text-center text-sm text-slate-300">
                  Aguardando autorização da câmera.
                </div>
              )}
            </div>

            {erro ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p> : null}

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={fecharPopupFaceLogin} disabled={capturandoFace}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => void confirmarFaceLogin()} disabled={carregando || capturandoFace}>
                {capturandoFace ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                {cameraFaceAberta ? "Capturar e validar face" : "Abrir câmera"}
              </Button>
            </div>
          </div>
        </ModalBase>
      ) : null}

      {popupEsqueciSenhaAberto ? (
        <ModalBase titulo="Recuperar senha" onClose={() => !carregandoRecuperacao && setPopupEsqueciSenhaAberto(false)}>
          <form className="space-y-3" onSubmit={onEnviarRecuperacaoSenha}>
            <div>
              <Label>E-mail cadastrado</Label>
              <Input
                type="email"
                value={emailRecuperacao}
                onChange={(event) => setEmailRecuperacao(event.target.value)}
                placeholder="Digite seu e-mail"
                required
                disabled={carregandoRecuperacao}
              />
            </div>
            {mensagemRecuperacao ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {mensagemRecuperacao}
              </p>
            ) : null}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button type="button" variant="outline" onClick={() => setPopupEsqueciSenhaAberto(false)} disabled={carregandoRecuperacao}>
                Cancelar
              </Button>
              <Button type="submit" disabled={carregandoRecuperacao}>
                {carregandoRecuperacao ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </form>
        </ModalBase>
      ) : null}
    </main>
  );
}

function ModalBase({
  titulo,
  children,
  onClose
}: {
  titulo: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-[var(--g3-active)]" />
            <h3 className="text-base font-semibold text-slate-900">{titulo}</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
