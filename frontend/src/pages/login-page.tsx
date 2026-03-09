import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { authService } from "@/services/auth.service";

const FOTO_LATERAL_URL = "/images/loguim.jpg";
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ??
  "1026369251340-2eskbj74ierlra1i9fm0aas29ucvnudf.apps.googleusercontent.com";

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

export function LoginPage() {
  const [modalAberto, setModalAberto] = useState<"termos" | "politica" | null>(null);
  const [popupEsqueciSenhaAberto, setPopupEsqueciSenhaAberto] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginGoogle } = useAuth();
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [emailRecuperacao, setEmailRecuperacao] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [carregandoGoogle, setCarregandoGoogle] = useState(false);
  const [carregandoRecuperacao, setCarregandoRecuperacao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [mensagemRecuperacao, setMensagemRecuperacao] = useState<string | null>(null);
  const [googleBotaoPronto, setGoogleBotaoPronto] = useState(false);
  const versaoSistema = import.meta.env.VITE_APP_VERSION ?? "1.00.12";
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setAviso(null);
    setCarregando(true);
    try {
      await login(nomeUsuario, senha);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from || "/cadastros/beneficiarios", { replace: true });
    } catch (error: any) {
      setErro(error?.response?.data?.message ?? "Não foi possível autenticar.");
    } finally {
      setCarregando(false);
    }
  }

  async function autenticarComGoogle(idToken: string) {
    setErro(null);
    setAviso(null);
    setCarregandoGoogle(true);
    try {
      await loginGoogle(idToken);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from || "/cadastros/beneficiarios", { replace: true });
    } catch (error: any) {
      setErro(error?.response?.data?.message ?? "Não foi possível autenticar com Google.");
    } finally {
      setCarregandoGoogle(false);
    }
  }

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setAviso("Login com Google indisponível: client id não configurado.");
      return;
    }

    function inicializarGoogle() {
      if (!window.google?.accounts?.id || !googleButtonRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
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
  }, [location.state, loginGoogle, navigate]);

  async function onEnviarRecuperacaoSenha(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensagemRecuperacao(null);
    setCarregandoRecuperacao(true);

    try {
      const resultado = await authService.esqueciSenha(emailRecuperacao);
      setMensagemRecuperacao(resultado.message);
    } catch (error: any) {
      setMensagemRecuperacao(
        error?.response?.data?.message ?? "Não foi possível enviar a recuperação de senha."
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
          <aside className="relative hidden lg:block">
            <img src={FOTO_LATERAL_URL} alt="Crianças brincando" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/50 via-emerald-900/35 to-emerald-950/75" />
            <div className="absolute inset-x-0 bottom-0 space-y-3 p-8 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100">Sistema G3</p>
              <h1 className="text-3xl font-semibold leading-tight">
                Gestão social moderna, organizada e preparada para crescer.
              </h1>
              <p className="text-sm text-emerald-50/90">
                Plataforma integrada para cadastro, acompanhamento e atendimento de beneficiários.
              </p>
            </div>
          </aside>

          <section className="flex items-center">
            <div className="w-full space-y-6 bg-white px-5 py-7 shadow-[inset_0_0_80px_rgba(16,185,129,0.04)] sm:px-10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Acesso ao sistema</p>
                  <h2 className="text-2xl font-semibold text-slate-900">Entrar no G3 Next</h2>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                  <span className="inline-flex h-5 w-5 overflow-hidden rounded-full ring-1 ring-slate-200">
                    <BandeiraBrasilIcon />
                  </span>
                  Português (Brasil)
                </span>
              </div>

              <form className="space-y-4" onSubmit={onSubmit}>
                <div>
                  <Label>Usuário</Label>
                  <Input
                    value={nomeUsuario}
                    onChange={(event) => setNomeUsuario(event.target.value)}
                    placeholder="Usuário ou e-mail"
                  />
                </div>
                <div>
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    value={senha}
                    onChange={(event) => setSenha(event.target.value)}
                    placeholder="Senha"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-xs font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
                    onClick={() => {
                      setPopupEsqueciSenhaAberto(true);
                      setMensagemRecuperacao(null);
                    }}
                  >
                    Esqueci minha senha
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
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-4 text-center text-sm">
                <p className="text-slate-700">Não possui conta?</p>
                <Button asChild variant="outline" size="sm" className="mx-auto">
                  <Link to="/criar-conta">Criar conta</Link>
                </Button>
                <p className="text-slate-600">
                  Ao continuar, você concorda com os {" "}
                  <button
                    type="button"
                    className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:text-emerald-700"
                    onClick={() => setModalAberto("termos")}
                  >
                    Termos de uso
                  </button>{" "}
                  e a {" "}
                  <button
                    type="button"
                    className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:text-emerald-700"
                    onClick={() => setModalAberto("politica")}
                  >
                    Política de privacidade
                  </button>
                  .
                </p>
              </div>

              <p className="text-center text-xs text-slate-500">Versão do sistema: {versaoSistema}</p>
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
                {modalAberto === "termos" ? "Termos de uso" : "Política de privacidade"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setModalAberto(null)}>
                Fechar
              </Button>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm text-slate-700">
              {modalAberto === "termos" ? (
                <>
                  <p>Este sistema é destinado ao uso institucional da equipe autorizada para gestão social.</p>
                  <p>
                    O usuário deve manter sigilo das credenciais, respeitar perfis de acesso e utilizar os dados apenas
                    para finalidades administrativas e assistenciais.
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
