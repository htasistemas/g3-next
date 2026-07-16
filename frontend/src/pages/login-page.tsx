import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Building2, Eye, EyeOff, HandHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useSystemVersion } from "@/hooks/use-system-version";
import { formatarCnpj, normalizarCnpj } from "@/lib/br-utils";
import { precarregarRota } from "@/routes/route-modules";
import { authService } from "@/services/auth.service";
import type { TenantContextoLogin } from "@/types/auth";

const FOTO_LATERAL_URL = "/images/loguim.jpg";
const LEMBRAR_ACESSO_STORAGE_KEY = "g3n_login_lembrar_acesso";
const CNPJ_STORAGE_KEY = "g3n_login_cnpj";
const EMAIL_MASTER_SEM_TENANT = "htasistemas@gmail.com";

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

function BandeiraBrasilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <rect width="24" height="24" fill="#009B3A" />
      <polygon points="12,3 22,12 12,21 2,12" fill="#FFDF00" />
      <circle cx="12" cy="12" r="4.5" fill="#002776" />
    </svg>
  );
}

function extrairSlugSubdominio() {
  if (typeof window === "undefined") return undefined;
  const hostname = window.location.hostname.trim().toLowerCase();
  if (!hostname || hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return undefined;
  }

  const partes = hostname.split(".").filter(Boolean);
  if (partes.length < 3) return undefined;

  const primeiroSegmento = partes[0];
  if (!primeiroSegmento || ["www", "app", "g3n"].includes(primeiroSegmento)) {
    return undefined;
  }

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
    return "Não localizamos um usuário para este CNPJ e e-mail. Confirme a instituição e o login cadastrados.";
  }

  if (normalizada.includes("vinculado a outra instituicao")) {
    return "O e-mail informado está vinculado a outra instituição. Verifique o CNPJ e a Administração inicial.";
  }

  return mensagem;
}

function ehEmailMasterSemTenant(email: string) {
  return email.trim().toLowerCase() === EMAIL_MASTER_SEM_TENANT;
}

export function LoginPage() {
  const [modalAberto, setModalAberto] = useState<"termos" | "politica" | "acesso" | null>(null);
  const [popupEsqueciSenhaAberto, setPopupEsqueciSenhaAberto] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginGoogle } = useAuth();
  const slugSubdominio = useMemo(() => extrairSlugSubdominio(), []);
  const cnpjSalvo =
    typeof window !== "undefined" ? window.localStorage.getItem(CNPJ_STORAGE_KEY) ?? "" : "";
  const lembrarSalvo =
    typeof window !== "undefined" ? window.localStorage.getItem(LEMBRAR_ACESSO_STORAGE_KEY) === "1" : false;
  const [cnpj, setCnpj] = useState(cnpjSalvo);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [emailRecuperacao, setEmailRecuperacao] = useState("");
  const [lembrarAcesso, setLembrarAcesso] = useState(lembrarSalvo);
  const [instituicaoContexto, setInstituicaoContexto] = useState<TenantContextoLogin | null>(null);
  const [carregandoInstituicao, setCarregandoInstituicao] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [carregandoGoogle, setCarregandoGoogle] = useState(false);
  const [carregandoRecuperacao, setCarregandoRecuperacao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [mensagemRecuperacao, setMensagemRecuperacao] = useState<string | null>(null);
  const [googleBotaoPronto, setGoogleBotaoPronto] = useState(false);
  const { version: versaoSistema } = useSystemVersion();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const origemAtual = typeof window === "undefined" ? "" : window.location.origin;
  const googleAviso = !GOOGLE_CLIENT_ID
    ? "Login com Google indisponível: client ID não configurado."
    : GOOGLE_CONFIGURED_ORIGINS.size > 0 && !GOOGLE_CONFIGURED_ORIGINS.has(origemAtual)
      ? "Login com Google indisponível neste ambiente."
      : null;
  const googleDisponivel = googleAviso === null;
  const tituloInstituicao = instituicaoContexto?.nome_fantasia || instituicaoContexto?.razao_social;

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

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setAviso(null);

    const cnpjNormalizado = normalizarCnpj(cnpj);
    const emailNormalizado = email.trim().toLowerCase();
    const dispensarInstituicao = !slugSubdominio && ehEmailMasterSemTenant(emailNormalizado);
    if (!dispensarInstituicao && !slugSubdominio && !emailNormalizado && cnpjNormalizado.length !== 14) {
      setErro("Informe o CNPJ da instituição para continuar.");
      return;
    }

    if (!email.trim()) {
      setErro("Informe o e-mail de acesso.");
      return;
    }

    if (!senha.trim()) {
      setErro("Informe a senha.");
      return;
    }

    setCarregando(true);
    try {
      const from = (location.state as { from?: string } | null)?.from;
      const destino = from || "/cadastros/beneficiarios";
      await login({
        cnpj: slugSubdominio || dispensarInstituicao ? undefined : cnpjNormalizado,
        slug: slugSubdominio,
        email: emailNormalizado,
        senha
      });
      void precarregarRota(destino).catch(() => {});

      if (typeof window !== "undefined") {
        if (lembrarAcesso && cnpjNormalizado) {
          window.localStorage.setItem(CNPJ_STORAGE_KEY, cnpjNormalizado);
          window.localStorage.setItem(LEMBRAR_ACESSO_STORAGE_KEY, "1");
        } else {
          window.localStorage.removeItem(CNPJ_STORAGE_KEY);
          window.localStorage.removeItem(LEMBRAR_ACESSO_STORAGE_KEY);
        }
      }

      navigate(destino, { replace: true });
    } catch (error: any) {
      setErro(obterMensagemErroLogin(error));
    } finally {
      setCarregando(false);
    }
  }

  async function autenticarComGoogle(idToken: string) {
    setErro(null);
    setAviso(null);
    setCarregandoGoogle(true);
    try {
      const from = (location.state as { from?: string } | null)?.from;
      const destino = from || "/cadastros/beneficiarios";
      const cnpjNormalizado = normalizarCnpj(cnpj);

      await loginGoogle({
        idToken,
        cnpj: slugSubdominio ? undefined : cnpjNormalizado || undefined,
        slug: slugSubdominio
      });
      void precarregarRota(destino).catch(() => {});
      navigate(destino, { replace: true });
    } catch (error: any) {
      setErro(obterMensagemErro(error, "Não foi possível autenticar com Google."));
    } finally {
      setCarregandoGoogle(false);
    }
  }

  useEffect(() => {
    if (!googleDisponivel) {
      setGoogleBotaoPronto(false);
      setAviso(googleAviso);
      return;
    }

    setAviso(null);

    function inicializarGoogle() {
      if (!window.google?.accounts?.id || !googleButtonRef.current) {
        return;
      }

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
      scriptExistente.addEventListener("load", inicializarGoogle, { once: true });
      return () => {
        scriptExistente.removeEventListener("load", inicializarGoogle);
      };
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = inicializarGoogle;
    script.onerror = () => {
      setErro("Não foi possível carregar o login com Google.");
    };
    document.head.appendChild(script);
  }, [googleAviso, googleDisponivel, location.state, navigate, slugSubdominio, cnpj]);

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
      setMensagemRecuperacao(
        obterMensagemErro(error, "Não foi possível enviar a recuperação de senha.")
      );
    } finally {
      setCarregandoRecuperacao(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-emerald-100 px-4 py-8">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#d9f7e5_0%,#bdeed1_100%)]" />
      <section className="relative z-10 w-full max-w-6xl overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl shadow-emerald-300/35">
        <div className="grid min-h-[620px] lg:grid-cols-[1.05fr_1fr]">
          <aside className="hidden bg-[linear-gradient(180deg,#064e3b_0%,#022c22_100%)] lg:order-2 lg:flex lg:flex-col">
            <div className="px-8 pt-6">
              <div className="overflow-hidden rounded-[28px] border border-emerald-800 bg-emerald-900 shadow-xl shadow-emerald-950/30">
                <img
                  src={FOTO_LATERAL_URL}
                  alt="Crianças brincando"
                  className="h-64 w-full object-cover xl:h-72"
                />
              </div>
            </div>
            <div className="px-8 pt-2">
              <div className="rounded-[24px] border border-emerald-800 bg-emerald-950/90 px-5 py-4 text-white shadow-2xl shadow-emerald-950/30">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-emerald-100">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">
                      {slugSubdominio ? "Instituição identificada pelo endereço" : "Instituição do acesso"}
                    </p>
                    {carregandoInstituicao ? (
                      <p className="text-xs leading-5 text-emerald-50/90">Carregando dados da instituição...</p>
                    ) : tituloInstituicao ? (
                      <>
                        <p className="truncate text-sm font-semibold text-white">{tituloInstituicao}</p>
                        <p className="text-xs text-emerald-50/80">
                          CNPJ {formatarCnpj(instituicaoContexto?.cnpj)} â€¢ Plano {instituicaoContexto?.plano}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs leading-5 text-emerald-50/90">
                        Informe o CNPJ da instituição para localizar o ambiente correto.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-8 pb-6 pt-0">
              <div className="space-y-2 rounded-[24px] border border-emerald-800 bg-emerald-950 px-5 py-5 text-white shadow-2xl shadow-emerald-950/30">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100">Sistema G3</p>
                <h1 className="text-2xl font-semibold leading-tight">
                  Gestão social moderna, organizada e preparada para crescer.
                </h1>
                <p className="text-xs leading-5 text-emerald-50/90">
                  Plataforma integrada para cadastro, acompanhamento e atendimento de beneficiários.
                </p>
              </div>
            </div>
            <div className="mt-auto px-8 pb-6">
              <p className="text-center text-xs text-emerald-100/80">Versão do sistema: {versaoSistema}</p>
            </div>
          </aside>

          <section className="flex items-center lg:order-1">
            <div className="w-full space-y-6 bg-white px-5 py-7 shadow-[inset_0_0_80px_rgba(16,185,129,0.04)] sm:px-10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Acesso ao sistema</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                      <HandHeart className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h2 className="text-2xl font-semibold text-slate-900">Entrar no G3 Next</h2>
                  </div>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                  <span className="inline-flex h-5 w-5 overflow-hidden rounded-full ring-1 ring-slate-200">
                    <BandeiraBrasilIcon />
                  </span>
                  Português (Brasil)
                </span>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 lg:hidden">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                      {slugSubdominio ? "Instituição identificada pelo endereço" : "Instituição do acesso"}
                    </p>
                    {carregandoInstituicao ? (
                      <p className="text-sm text-slate-600">Carregando dados da instituição...</p>
                    ) : tituloInstituicao ? (
                      <>
                        <p className="truncate text-base font-semibold text-slate-900">{tituloInstituicao}</p>
                        <p className="text-xs text-slate-600">
                          CNPJ {formatarCnpj(instituicaoContexto?.cnpj)} • Plano {instituicaoContexto?.plano}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-600">
                        Informe o CNPJ da instituição para localizar o ambiente correto.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <form className="space-y-4" onSubmit={onSubmit}>
                {!slugSubdominio && (
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
                )}

                <div>
                  <Label htmlFor="email">E-mail de acesso</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="voce@instituicao.org.br"
                    autoComplete="username"
                    disabled={carregando || carregandoGoogle}
                  />
                </div>
                <div>
                  <Label htmlFor="senha">Senha</Label>
                  <div className="relative">
                    <Input
                      id="senha"
                      type={senhaVisivel ? "text" : "password"}
                      value={senha}
                      onChange={(event) => setSenha(event.target.value)}
                      placeholder="Digite sua senha"
                      autoComplete="current-password"
                      disabled={carregando || carregandoGoogle}
                      className="pr-11"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-slate-500 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => setSenhaVisivel((atual) => !atual)}
                      disabled={carregando || carregandoGoogle}
                      aria-label={senhaVisivel ? "Ocultar senha" : "Visualizar senha"}
                      title={senhaVisivel ? "Ocultar senha" : "Visualizar senha"}
                    >
                      {senhaVisivel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                    checked={lembrarAcesso}
                    onChange={(event) => setLembrarAcesso(event.target.checked)}
                    disabled={carregando || carregandoGoogle}
                  />
                  Lembrar identificação da instituição neste dispositivo
                </label>

                <div className="flex justify-center">
                  <button
                    type="button"
                    className="text-center text-xs font-medium leading-relaxed text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
                    onClick={() => {
                      setPopupEsqueciSenhaAberto(true);
                      setMensagemRecuperacao(null);
                    }}
                  >
                    Esqueceu sua senha? Clique aqui para recuperar.
                  </button>
                </div>

                {erro && (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
                )}
                {aviso && (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">{aviso}</p>
                )}

                <Button type="submit" className="w-full" disabled={carregando || carregandoGoogle}>
                  {carregando ? "Entrando..." : "Entrar"}
                </Button>
              </form>

              <div className="space-y-2">
                {googleDisponivel ? (
                  <>
                    <div
                      ref={googleButtonRef}
                      className="flex min-h-11 w-full items-center justify-center"
                      aria-label="Login com Google"
                    />
                    {!googleBotaoPronto && (
                      <p className="text-center text-xs text-slate-500">Preparando login com Google...</p>
                    )}
                    {carregandoGoogle && (
                      <p className="text-center text-xs text-emerald-700">Autenticando com Google...</p>
                    )}
                  </>
                ) : (
                  <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs text-slate-600">
                    Login com Google disponível apenas em ambientes configurados.
                  </p>
                )}
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-4 text-center text-sm">
                <p className="text-slate-700">Precisa de acesso?</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mx-auto"
                  onClick={() => setModalAberto("acesso")}
                >
                  Solicitar acesso
                </Button>
                <div className="space-y-1 text-xs text-slate-600 sm:text-sm">
                  <p className="whitespace-nowrap">Ao acessar, você concorda com os</p>
                  <p className="whitespace-nowrap">
                    <button
                      type="button"
                      className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:text-emerald-700"
                      onClick={() => setModalAberto("termos")}
                    >
                      termos de uso
                    </button>{" "}
                    e a{" "}
                    <button
                      type="button"
                      className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:text-emerald-700"
                      onClick={() => setModalAberto("politica")}
                    >
                      política de privacidade
                    </button>
                    .
                  </p>
                </div>
              </div>

              <p className="text-center text-xs text-slate-500 lg:hidden">Versão do sistema: {versaoSistema}</p>
            </div>
          </section>
        </div>
      </section>

      {modalAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setModalAberto(null)}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                {modalAberto === "acesso"
                  ? "Solicitar acesso"
                  : modalAberto === "termos"
                    ? "Termos de uso"
                    : "Política de privacidade"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setModalAberto(null)}>
                Fechar
              </Button>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm text-slate-700">
              {modalAberto === "acesso" ? (
                <>
                  <p>O acesso ao G3 Next é administrado pela equipe responsável pelo sistema.</p>
                  <p>
                    Novos usuários devem solicitar liberação de conta e permissões ao administrador
                    institucional.
                  </p>
                  <p>O cadastro público direto não fica disponível nesta tela.</p>
                </>
              ) : modalAberto === "termos" ? (
                <>
                  <p>Este sistema é destinado ao uso institucional da equipe autorizada para gestão social.</p>
                  <p>
                    O usuário deve manter sigilo das credenciais, respeitar perfis de acesso e utilizar os
                    dados apenas para finalidades administrativas e assistenciais.
                  </p>
                  <p>As ações podem ser registradas para auditoria, segurança e conformidade legal.</p>
                </>
              ) : (
                <>
                  <p>
                    O G3 trata dados pessoais com base na LGPD, aplicando controles de acesso, rastreabilidade e
                    proteção de informações sensíveis.
                  </p>
                  <p>
                    Os dados são utilizados para execução das atividades de atendimento e gestão institucional,
                    respeitando finalidade, necessidade e segurança.
                  </p>
                  <p>Solicitações relacionadas à privacidade devem ser encaminhadas ao responsável institucional.</p>
                </>
              )}
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <Button variant="outline" onClick={() => setModalAberto(null)}>
                Entendi
              </Button>
            </div>
          </div>
        </div>
      )}

      {popupEsqueciSenhaAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (carregandoRecuperacao) return;
            setPopupEsqueciSenhaAberto(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Recuperar senha</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPopupEsqueciSenhaAberto(false)}
                disabled={carregandoRecuperacao}
              >
                Fechar
              </Button>
            </div>

            <form className="space-y-3 px-5 py-4" onSubmit={onEnviarRecuperacaoSenha}>
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

              {mensagemRecuperacao && (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {mensagemRecuperacao}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPopupEsqueciSenhaAberto(false)}
                  disabled={carregandoRecuperacao}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={carregandoRecuperacao}>
                  {carregandoRecuperacao ? "Enviando..." : "Enviar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
