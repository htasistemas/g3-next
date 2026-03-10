import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSenhaAtual, useSenhaPainel, useSenhasConfig } from "@/features/senhas/use-senhas";
import { Button } from "@/components/ui/button";
import { unidadesAssistenciaisService } from "@/services/unidades-assistenciais.service";

const FRASE_FALA_PADRAO = "Beneficiário {beneficiario} dirija-se a {sala} para atendimento.";

function montarMensagemFala(frase: string, beneficiario: string, sala: string) {
  return frase
    .replace("{beneficiario}", beneficiario || "não identificado")
    .replace("{sala}", sala || "atendimento");
}

export function PainelSenhasPage() {
  const [searchParams] = useSearchParams();
  const [agora, setAgora] = useState(() => new Date());
  const [tokenVozes, setTokenVozes] = useState(0);
  const [logomarcaUnidade, setLogomarcaUnidade] = useState("");
  const [audioHabilitado, setAudioHabilitado] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return (
      window.sessionStorage.getItem("g3-painel-audio-habilitado") === "1" ||
      window.localStorage.getItem("g3-painel-audio-habilitado") === "1"
    );
  });
  const [mostrarAtivacaoAudio, setMostrarAtivacaoAudio] = useState(false);
  const ultimaChamadaIdRef = useRef<string | null>(null);
  const unidadeId = Number(searchParams.get("unidadeId") ?? 0) || undefined;
  const configQuery = useSenhasConfig();
  const limite = configQuery.data?.quantidadeUltimasChamadas ?? 4;
  const painelQuery = useSenhaPainel(unidadeId, limite, 4000);
  const senhaAtualQuery = useSenhaAtual(unidadeId);
  const chamadas = painelQuery.data ?? [];
  const chamadaAtual = senhaAtualQuery.data ?? chamadas[0] ?? null;
  const fraseFala = configQuery.data?.fraseFala?.trim() || FRASE_FALA_PADRAO;

  const noticias = useMemo(() => {
    const texto = configQuery.data?.noticiasManuais ?? "";
    const lista = texto
      .split(/[\n;]/)
      .map((item) => item.trim())
      .filter(Boolean);

    return lista.length ? lista : ["Aguardando novas notícias da assistência social."];
  }, [configQuery.data?.noticiasManuais]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setAgora(new Date());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const unidadePainelId =
      unidadeId ?? (Number(configQuery.data?.unidadePainelId ?? 0) || undefined);

    const carregarLogomarca = async () => {
      try {
        const resposta = unidadePainelId
          ? await unidadesAssistenciaisService.buscarPorId(String(unidadePainelId))
          : await unidadesAssistenciaisService.buscarAtual();
        const logo = resposta.unidade?.logomarca?.trim() || "";
        setLogomarcaUnidade(logo);
      } catch {
        setLogomarcaUnidade("");
      }
    };

    void carregarLogomarca();
  }, [configQuery.data?.unidadePainelId, unidadeId]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    const synth = window.speechSynthesis;
    const atualizarVozes = () => {
      setTokenVozes((atual) => atual + 1);
    };
    const timeoutId = window.setTimeout(() => {
      synth.getVoices();
      atualizarVozes();
    }, 300);

    synth.getVoices();
    synth.addEventListener("voiceschanged", atualizarVozes);

    return () => {
      window.clearTimeout(timeoutId);
      synth.removeEventListener("voiceschanged", atualizarVozes);
    };
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    const habilitarAudio = () => {
      const synth = window.speechSynthesis;
      const utter = new SpeechSynthesisUtterance(" ");

      utter.lang = "pt-BR";
      utter.volume = 0;

      synth.cancel();
      synth.resume();
      synth.speak(utter);

      window.setTimeout(() => {
        synth.cancel();
      }, 80);

      setAudioHabilitado(true);
      setMostrarAtivacaoAudio(false);
      window.sessionStorage.setItem("g3-painel-audio-habilitado", "1");
      window.localStorage.setItem("g3-painel-audio-habilitado", "1");
    };

    window.addEventListener("pointerdown", habilitarAudio, { once: true });
    window.addEventListener("keydown", habilitarAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", habilitarAudio);
      window.removeEventListener("keydown", habilitarAudio);
    };
  }, []);

  useEffect(() => {
    if (!chamadaAtual?.id || ultimaChamadaIdRef.current === chamadaAtual.id) {
      return;
    }

    if (!("speechSynthesis" in window)) {
      return;
    }

    const mensagem = montarMensagemFala(
      fraseFala,
      chamadaAtual.nomeBeneficiario,
      chamadaAtual.localAtendimento
    );
    const synth = window.speechSynthesis;
    const vozes = synth.getVoices();

    if (vozes.length === 0) {
      const timeoutId = window.setTimeout(() => {
        synth.getVoices();
        setTokenVozes((atual) => atual + 1);
      }, 350);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    const vozGooglePt = vozes.find(
      (voz) =>
        voz.lang?.toLowerCase().startsWith("pt") &&
        voz.name?.toLowerCase().includes("google")
    );
    const vozPt = vozes.find((voz) => voz.lang?.toLowerCase().startsWith("pt"));
    const utter = new SpeechSynthesisUtterance(mensagem);
    let iniciouFala = false;
    const timeoutFalhaId = window.setTimeout(() => {
      if (!iniciouFala) {
        ultimaChamadaIdRef.current = null;
        const audioJaLiberado =
          window.sessionStorage.getItem("g3-painel-audio-habilitado") === "1" ||
          window.localStorage.getItem("g3-painel-audio-habilitado") === "1";
        if (!audioJaLiberado) {
          setMostrarAtivacaoAudio(true);
        }
      }
    }, 1500);

    utter.lang = "pt-BR";
    utter.voice = vozGooglePt ?? vozPt ?? null;
    utter.rate = 0.95;
    utter.pitch = 1;
    utter.onerror = () => {
      window.clearTimeout(timeoutFalhaId);
      if (ultimaChamadaIdRef.current === chamadaAtual.id) {
        ultimaChamadaIdRef.current = null;
      }
      const audioJaLiberado =
        window.sessionStorage.getItem("g3-painel-audio-habilitado") === "1" ||
        window.localStorage.getItem("g3-painel-audio-habilitado") === "1";
      if (!audioJaLiberado) {
        setMostrarAtivacaoAudio(true);
      }
    };
    utter.onstart = () => {
      iniciouFala = true;
      window.clearTimeout(timeoutFalhaId);
      ultimaChamadaIdRef.current = chamadaAtual.id;
      setAudioHabilitado(true);
      setMostrarAtivacaoAudio(false);
      window.sessionStorage.setItem("g3-painel-audio-habilitado", "1");
      window.localStorage.setItem("g3-painel-audio-habilitado", "1");
    };

    synth.cancel();
    synth.resume();
    synth.speak(utter);

    return () => {
      window.clearTimeout(timeoutFalhaId);
    };
  }, [audioHabilitado, chamadaAtual, fraseFala, tokenVozes]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1f8f66_0%,#0f5a43_30%,#072c21_100%)] px-3 py-3 text-white sm:px-4 lg:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1600px] flex-col gap-4">
        <header className="rounded-[28px] border border-white/20 bg-white/10 px-4 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 text-center lg:text-left">
              <p className="text-xs uppercase tracking-[0.24em] text-white/70">Sistema G3</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                {configQuery.data?.tituloTela ?? "Painel de senhas"}
              </h1>
              <p className="mt-2 text-sm text-white/80 sm:text-base">
                {configQuery.data?.descricaoTela ?? "Controle de atendimento"}
              </p>
            </div>

            {logomarcaUnidade ? (
              <div className="flex justify-center lg:flex-1">
                <img
                  src={logomarcaUnidade}
                  alt="Logomarca da unidade"
                  className="max-h-20 w-auto object-contain sm:max-h-24 lg:max-h-28"
                />
              </div>
            ) : null}

            <div className="grid gap-3 text-center sm:grid-cols-2 lg:min-w-[360px] lg:text-right">
              <div className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/65">Atualizado em</p>
                <p className="mt-1 text-base font-semibold sm:text-lg">
                  {agora.toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/65">Horário</p>
                <p className="mt-1 text-base font-semibold sm:text-lg">
                  {agora.toLocaleTimeString("pt-BR")}
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid flex-1 gap-4 xl:min-h-0 xl:grid-cols-[minmax(0,2.45fr)_380px]">
          <article className="relative flex min-h-[54vh] flex-col items-center justify-center overflow-hidden rounded-[34px] border border-white/20 bg-[linear-gradient(155deg,rgba(255,255,255,0.20),rgba(255,255,255,0.07))] px-5 py-8 text-center shadow-[0_30px_90px_rgba(0,0,0,0.28)] backdrop-blur sm:px-8 lg:px-12 xl:min-h-full">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-200 via-emerald-400 to-teal-200" />
            <span className="rounded-full border border-white/20 bg-white/12 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">
              Chamada atual
            </span>

            {chamadaAtual ? (
              <div className="mt-8 flex w-full max-w-5xl flex-col items-center">
                <p className="max-w-5xl text-5xl font-black leading-[0.95] tracking-tight text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)] sm:text-6xl lg:text-7xl xl:text-[6.5rem]">
                  {chamadaAtual.nomeBeneficiario}
                </p>
                <p className="mt-6 rounded-full bg-amber-300/16 px-6 py-3 text-2xl font-black text-amber-100 shadow-[0_14px_40px_rgba(245,158,11,0.18)] sm:text-3xl lg:text-5xl xl:text-6xl">
                  Dirija-se a {chamadaAtual.localAtendimento}
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <span className="rounded-full border border-emerald-200/25 bg-emerald-300/15 px-4 py-2 text-sm font-medium text-emerald-50">
                    {new Date(chamadaAtual.dataHoraChamada).toLocaleString("pt-BR")}
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/80">
                    Atualização automática a cada 4 segundos
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-8 flex flex-col items-center">
                <p className="text-2xl font-bold text-white/90 sm:text-3xl lg:text-4xl">
                  Aguardando chamada
                </p>
                <p className="mt-3 max-w-xl text-sm text-white/70 sm:text-base">
                  Assim que uma senha for chamada, o nome do beneficiário aparecerá centralizado
                  neste painel e será anunciado em voz alta.
                </p>
              </div>
            )}
          </article>

          <div className="flex flex-col gap-4 xl:min-h-0">
            <article className="rounded-[30px] border border-white/20 bg-black/20 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.22)] backdrop-blur sm:p-5 xl:flex-1">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
                    Acompanhamento
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white">Últimas chamadas</h2>
                </div>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/75">
                  {chamadas.length} registro(s)
                </span>
              </div>

              <ul className="space-y-3">
                {chamadas.slice(0, limite).map((item, index) => (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-white/15 bg-white/7 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-300/20 text-sm font-bold text-emerald-100">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-white">
                          {item.nomeBeneficiario}
                        </p>
                        <p className="text-sm text-emerald-100">{item.localAtendimento}</p>
                        <p className="mt-1 text-xs text-white/55">
                          {new Date(item.dataHoraChamada).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
                {!chamadas.length ? (
                  <li className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-6 text-center text-sm text-white/70">
                    Sem chamadas recentes.
                  </li>
                ) : null}
              </ul>
            </article>
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-white/20 bg-black/20 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
          <div
            className="whitespace-nowrap py-3 text-xs font-medium sm:text-sm [animation:marquee_28s_linear_infinite]"
            style={{
              animationDuration: `${Math.max(
                10,
                Number(configQuery.data?.velocidadeTicker ?? 60) / 2
              )}s`
            }}
          >
            {[...noticias, ...noticias].map((item, index) => (
              <span key={`${item}-${index}`} className="mx-6 inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                {item}
              </span>
            ))}
          </div>
        </section>
      </div>

      {mostrarAtivacaoAudio ? (
        <div className="fixed bottom-4 right-4 z-50 w-[min(92vw,360px)] rounded-2xl border border-emerald-200 bg-white p-4 text-[var(--g3-foreground)] shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
          <p className="text-sm font-semibold text-emerald-900">Ativar voz do painel</p>
          <p className="mt-1 text-sm text-[var(--g3-muted)]">
            O navegador bloqueou a primeira fala. Clique abaixo uma vez para habilitar os
            anúncios por voz.
          </p>
          <Button
            className="mt-3 w-full"
            onClick={() => {
              if (!("speechSynthesis" in window)) {
                return;
              }

              const synth = window.speechSynthesis;
              const utter = new SpeechSynthesisUtterance(" ");

              utter.lang = "pt-BR";
              utter.volume = 0;

              synth.cancel();
              synth.resume();
              synth.speak(utter);

              window.setTimeout(() => {
                synth.cancel();
              }, 80);

              setAudioHabilitado(true);
              setMostrarAtivacaoAudio(false);
              window.sessionStorage.setItem("g3-painel-audio-habilitado", "1");
              window.localStorage.setItem("g3-painel-audio-habilitado", "1");
              setTokenVozes((atual) => atual + 1);
            }}
          >
            Habilitar voz
          </Button>
        </div>
      ) : null}

      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </main>
  );
}
