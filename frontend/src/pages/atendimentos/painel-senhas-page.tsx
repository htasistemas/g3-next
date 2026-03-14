import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSenhaAtual, useSenhaPainel, useSenhasConfig } from "@/features/senhas/use-senhas";
import {
  audioPainelJaLiberado,
  atualizarHeartbeatPainel,
  destravarSinteseVoz,
  falarChamadaNavegador,
  FRASE_FALA_PADRAO,
  registrarChamadaFalando,
  ouvirEventoPainelChamada
} from "@/lib/senhas-voz";
import { resolverUrlArquivo } from "@/lib/arquivos";
import { unidadesAssistenciaisService } from "@/services/unidades-assistenciais.service";
import type { SenhaChamadaResponse } from "@/types/senhas";

function criarAudioContext(): AudioContext | null {
  if (!("AudioContext" in window || "webkitAudioContext" in window)) return null;
  const AudioCtx =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new AudioCtx();
}

function tocarArquivoAviso(url: string) {
  return new Promise<void>((resolve, reject) => {
    const audio = new Audio(url);
    audio.preload = "auto";
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error("Falha ao reproduzir aviso sonoro."));
    void audio.play().catch(reject);
  });
}

const NoticiasTicker = memo(function NoticiasTicker({
  noticias,
  velocidadeTicker
}: {
  noticias: string[];
  velocidadeTicker: number;
}) {
  const itensTicker = useMemo(() => [...noticias, ...noticias], [noticias]);
  const duracao = `${Math.max(18, Number(velocidadeTicker || 60) / 1.35)}s`;

  return (
    <section className="overflow-hidden rounded-[24px] border border-white/20 bg-black/20 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
      <div className="relative overflow-hidden py-4">
        <div
          className="flex min-w-max items-center gap-10 whitespace-nowrap pr-10 text-sm font-semibold tracking-[0.01em] text-emerald-50 will-change-transform [animation-iteration-count:infinite] [animation-name:marquee] [animation-timing-function:linear] sm:text-base lg:text-lg"
          style={{
            animationDuration: duracao
          }}
        >
          {itensTicker.map((item, index) => (
            <span key={`${item}-${index}`} className="inline-flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.85)]" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
});

export function PainelSenhasPage() {
  const [searchParams] = useSearchParams();
  const [agora, setAgora] = useState(() => new Date());
  const [logomarcaUnidade, setLogomarcaUnidade] = useState("");
  const [audioHabilitado, setAudioHabilitado] = useState(() => audioPainelJaLiberado());
  const audioContextRef = useRef<AudioContext | null>(null);
  const [chamadaRecebida, setChamadaRecebida] = useState<SenhaChamadaResponse | null>(null);
  const ultimaChamadaIdRef = useRef<string | null>(null);
  const chamadaEmAndamentoRef = useRef<string | null>(null);
  const ultimoEventoRecebidoRef = useRef<{ id: string; em: number } | null>(null);
  const unidadeId = Number(searchParams.get("unidadeId") ?? 0) || undefined;
  const configQuery = useSenhasConfig();
  const limite = configQuery.data?.quantidadeUltimasChamadas ?? 4;
  const painelQuery = useSenhaPainel(unidadeId, limite, 4000);
  const senhaAtualQuery = useSenhaAtual(unidadeId);
  const chamadas = painelQuery.data ?? [];
  const chamadaAtual = senhaAtualQuery.data ?? chamadas[0] ?? null;
  const chamadaParaAnunciar = chamadaRecebida ?? chamadaAtual;
  const fraseFala = configQuery.data?.fraseFala?.trim() || FRASE_FALA_PADRAO;

  const noticias = useMemo(() => {
    const texto = configQuery.data?.noticiasManuais ?? "";
    const lista = texto
      .split(/[\n;]/)
      .map((item) => item.trim())
      .filter(Boolean);

    return lista.length ? lista : ["Aguardando novas noticias da assistencia social."];
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
    const habilitarAudio = () => {
      destravarSinteseVoz();
      if (!audioContextRef.current) {
        audioContextRef.current = criarAudioContext();
      }
      if (audioContextRef.current?.state === "suspended") {
        void audioContextRef.current.resume();
      }
      setAudioHabilitado(true);
    };

    window.addEventListener("pointerdown", habilitarAudio, { once: true });
    window.addEventListener("keydown", habilitarAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", habilitarAudio);
      window.removeEventListener("keydown", habilitarAudio);
    };
  }, []);

  const tocarAvisoSonoroPadrao = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = criarAudioContext();
      }
      const context = audioContextRef.current;
      if (!context) return;
      if (context.state === "suspended") {
        void context.resume();
      }

      const now = context.currentTime;
      const beepDuration = 0.55;
      const gap = 0.22;

      const agendarBeep = (start: number, baseFreq: number) => {
        const gain = context.createGain();
        const osc1 = context.createOscillator();
        const osc2 = context.createOscillator();

        gain.gain.value = 0.0001;
        osc1.type = "sine";
        osc2.type = "sine";
        osc1.frequency.value = baseFreq;
        osc2.frequency.value = baseFreq * 1.5;

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(context.destination);

        gain.gain.exponentialRampToValueAtTime(0.16, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + beepDuration);

        osc1.start(start);
        osc2.start(start + 0.03);
        osc1.stop(start + beepDuration);
        osc2.stop(start + beepDuration);
      };

      agendarBeep(now, 960);
      agendarBeep(now + beepDuration + gap, 840);
      agendarBeep(now + (beepDuration + gap) * 2, 720);
    } catch {
      // Sem audio disponivel ou bloqueado.
    }
  };

  async function tocarAvisoSonoro() {
    const avisosSonoros = configQuery.data?.avisosSonoros ?? [];
    const avisoAtivo =
      avisosSonoros.find((item) => item.id === configQuery.data?.avisoSonoroAtivoId) ??
      avisosSonoros[0];

    if (avisoAtivo?.url) {
      try {
        await tocarArquivoAviso(avisoAtivo.url);
        return;
      } catch {
        // Cai para o aviso padrao.
      }
    }

    tocarAvisoSonoroPadrao();
    await new Promise((resolve) => window.setTimeout(resolve, 1900));
  }

  useEffect(() => {
    atualizarHeartbeatPainel(audioHabilitado);
    const intervalId = window.setInterval(() => {
      atualizarHeartbeatPainel(audioHabilitado);
    }, 4000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [audioHabilitado]);

  useEffect(() => {
    return ouvirEventoPainelChamada((payload) => {
      const ultimoEvento = ultimoEventoRecebidoRef.current;
      if (ultimoEvento && ultimoEvento.id === payload.id && Date.now() - ultimoEvento.em < 1500) {
        return;
      }

      ultimoEventoRecebidoRef.current = {
        id: payload.id,
        em: Date.now()
      };
      setChamadaRecebida(payload);
      void senhaAtualQuery.refetch();
      void painelQuery.refetch();
    });
  }, [painelQuery.refetch, senhaAtualQuery.refetch]);

  useEffect(() => {
    if (!chamadaRecebida?.id) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setChamadaRecebida((atual) => (atual?.id === chamadaRecebida.id ? null : atual));
    }, 6000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [chamadaRecebida]);

  useEffect(() => {
    if (
      !chamadaParaAnunciar?.id ||
      ultimaChamadaIdRef.current === chamadaParaAnunciar.id ||
      chamadaEmAndamentoRef.current === chamadaParaAnunciar.id
    ) {
      return;
    }

    let cancelado = false;
    ultimaChamadaIdRef.current = chamadaParaAnunciar.id;
    chamadaEmAndamentoRef.current = chamadaParaAnunciar.id;

    const executar = async () => {
      await tocarAvisoSonoro();
      if (cancelado) return;

      falarChamadaNavegador({
        frase: fraseFala,
        beneficiario: chamadaParaAnunciar.nomeBeneficiario,
        sala: chamadaParaAnunciar.localAtendimento,
        onStart: () => {
          chamadaEmAndamentoRef.current = null;
          registrarChamadaFalando(chamadaParaAnunciar.id);
          setAudioHabilitado(true);
        },
        onError: () => {
          chamadaEmAndamentoRef.current = null;
        }
      });
    };

    void executar();

    return () => {
      cancelado = true;
    };
  }, [chamadaParaAnunciar, fraseFala, configQuery.data?.avisoSonoroAtivoId, configQuery.data?.avisosSonoros]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    const synth = window.speechSynthesis;
    const atualizarVozes = () => {
      void senhaAtualQuery.refetch();
    };

    synth.getVoices();
    synth.addEventListener("voiceschanged", atualizarVozes);

    return () => {
      synth.removeEventListener("voiceschanged", atualizarVozes);
    };
  }, [senhaAtualQuery.refetch]);

  return (
    <main className="h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top,#1f8f66_0%,#0f5a43_30%,#072c21_100%)] px-3 py-2 text-white sm:px-4 lg:px-6">
      <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col gap-3">
        <header className="rounded-[28px] border border-white/20 bg-white/10 px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur sm:px-6">
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
                  src={resolverUrlArquivo(logomarcaUnidade)}
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

        <section className="grid flex-1 min-h-0 gap-3 xl:grid-cols-[minmax(0,2.45fr)_380px]">
          <article className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-[34px] border border-white/20 bg-[linear-gradient(155deg,rgba(255,255,255,0.20),rgba(255,255,255,0.07))] px-5 py-6 text-center shadow-[0_30px_90px_rgba(0,0,0,0.28)] backdrop-blur sm:px-8 lg:px-10">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-200 via-emerald-400 to-teal-200" />
            <span className="rounded-full border border-white/20 bg-white/12 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">
              Chamada atual
            </span>

            {chamadaAtual ? (
              <div className="mt-8 flex w-full max-w-5xl flex-col items-center">
                <p className="max-w-5xl text-5xl font-black leading-[0.95] tracking-tight text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)] sm:text-6xl lg:text-7xl xl:text-[6.5rem]">
                  {chamadaAtual.nomeBeneficiario}
                </p>
                <p className="mt-6 rounded-full bg-amber-300/16 px-6 py-3 text-2xl font-black text-amber-100 sm:text-3xl lg:text-5xl xl:text-6xl">
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

          <div className="flex min-h-0 flex-col gap-3">
            <article className="flex min-h-0 flex-1 flex-col rounded-[30px] border border-white/20 bg-black/20 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.22)] backdrop-blur sm:p-5">
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

              <ul className="min-h-0 flex-1 space-y-3 overflow-hidden">
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

        <NoticiasTicker
          noticias={noticias}
          velocidadeTicker={Number(configQuery.data?.velocidadeTicker ?? 60)}
        />
      </div>

      <style>{`@keyframes marquee { from { transform: translate3d(0,0,0); } to { transform: translate3d(-50%,0,0); } }`}</style>
    </main>
  );
}
