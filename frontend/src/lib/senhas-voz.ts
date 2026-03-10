import type { SenhaChamadaResponse } from "@/types/senhas";

export const FRASE_FALA_PADRAO =
  "Beneficiário {beneficiario} dirija-se a {sala} para atendimento.";

const AUDIO_LIBERADO_KEY = "g3-painel-audio-habilitado";
const EVENTO_CHAMADA_KEY = "g3-senhas-ultima-chamada";
const HEARTBEAT_PAINEL_KEY = "g3-senhas-painel-heartbeat";
const ULTIMA_FALA_KEY = "g3-senhas-ultima-fala";
const CANAL_PAINEL = "g3-senhas-painel";
const HEARTBEAT_TTL_MS = 12000;

type HeartbeatPainel = {
  atualizadoEm: number;
  audioHabilitado: boolean;
};

type ChamadaPainelEvento = SenhaChamadaResponse & {
  emitidoEm: number;
};

type UltimaFalaPayload = {
  chamadaId: string;
  iniciadaEm: number;
};

function temSinteseVoz() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function obterCanalPainel() {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }

  return new BroadcastChannel(CANAL_PAINEL);
}

function selecionarVozPtBr(synth: SpeechSynthesis) {
  const vozes = synth.getVoices();

  return (
    vozes.find(
      (voz) =>
        voz.lang?.toLowerCase().startsWith("pt") &&
        voz.name?.toLowerCase().includes("google")
    ) ??
    vozes.find((voz) => voz.lang?.toLowerCase().startsWith("pt-br")) ??
    vozes.find((voz) => voz.lang?.toLowerCase().startsWith("pt")) ??
    null
  );
}

function lerHeartbeatPainel(): HeartbeatPainel | null {
  if (typeof window === "undefined") {
    return null;
  }

  const bruto = window.localStorage.getItem(HEARTBEAT_PAINEL_KEY);

  if (!bruto) {
    return null;
  }

  try {
    const heartbeat = JSON.parse(bruto) as HeartbeatPainel;
    if (!heartbeat?.atualizadoEm) {
      return null;
    }
    return heartbeat;
  } catch {
    return null;
  }
}

function lerUltimaFala(): UltimaFalaPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  const bruto = window.localStorage.getItem(ULTIMA_FALA_KEY);

  if (!bruto) {
    return null;
  }

  try {
    const payload = JSON.parse(bruto) as UltimaFalaPayload;
    if (!payload?.chamadaId || !payload?.iniciadaEm) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function montarMensagemFala(frase: string, beneficiario: string, sala: string) {
  return (frase || FRASE_FALA_PADRAO)
    .replace("{beneficiario}", beneficiario || "não identificado")
    .replace("{sala}", sala || "atendimento");
}

export function audioPainelJaLiberado() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(AUDIO_LIBERADO_KEY) === "1";
}

export function registrarAudioLiberado() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(AUDIO_LIBERADO_KEY, "1");
  window.localStorage.setItem(AUDIO_LIBERADO_KEY, "1");
}

export function destravarSinteseVoz() {
  if (!temSinteseVoz()) {
    return;
  }

  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(" ");

  utter.lang = "pt-BR";
  utter.volume = 0;

  synth.cancel();
  synth.resume();
  synth.speak(utter);
  registrarAudioLiberado();

  window.setTimeout(() => {
    synth.cancel();
  }, 80);
}

export function falarChamadaNavegador({
  frase,
  beneficiario,
  sala,
  onStart,
  onError,
  aguardarVozesMs = 400
}: {
  frase: string;
  beneficiario: string;
  sala: string;
  onStart?: () => void;
  onError?: () => void;
  aguardarVozesMs?: number;
}) {
  if (!temSinteseVoz()) {
    onError?.();
    return false;
  }

  const synth = window.speechSynthesis;
  // Fluxo deliberadamente conservador: uma chamada deve ser falada uma vez, sem
  // retries agressivos que possam cortar a frase. Ajustes aqui exigem reteste real.
  const executarFala = () => {
    const utter = new SpeechSynthesisUtterance(
      montarMensagemFala(frase || FRASE_FALA_PADRAO, beneficiario, sala)
    );
    const voz = selecionarVozPtBr(synth);
    let iniciou = false;

    const confirmarInicio = () => {
      if (iniciou) {
        return;
      }

      iniciou = true;
      registrarAudioLiberado();
      onStart?.();
    };

    utter.lang = "pt-BR";
    if (voz) {
      utter.voice = voz;
    }
    utter.rate = 0.95;
    utter.pitch = 1;
    utter.onstart = confirmarInicio;
    utter.onerror = () => {
      if (iniciou) {
        return;
      }
      onError?.();
    };

    synth.cancel();
    window.setTimeout(() => {
      synth.resume();
      synth.speak(utter);

      [180, 600, 1200].forEach((delay) => {
        window.setTimeout(() => {
          if (!iniciou && (synth.speaking || synth.pending)) {
            confirmarInicio();
          }
        }, delay);
      });
    }, 80);
  };

  if (synth.getVoices().length === 0) {
    window.setTimeout(executarFala, aguardarVozesMs);
    return true;
  }

  executarFala();

  return true;
}

export function emitirEventoPainelChamada(chamada: SenhaChamadaResponse) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: ChamadaPainelEvento = {
    ...chamada,
    emitidoEm: Date.now()
  };
  const canal = obterCanalPainel();

  if (canal) {
    canal.postMessage(payload);
    canal.close();
  }

  window.localStorage.setItem(EVENTO_CHAMADA_KEY, JSON.stringify(payload));
}

export function ouvirEventoPainelChamada(onEvento: (chamada: SenhaChamadaResponse) => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const canal = obterCanalPainel();
  const aoReceberCanal = (event: MessageEvent<ChamadaPainelEvento>) => {
    if (event.data?.id) {
      onEvento(event.data);
    }
  };
  const aoReceberStorage = (event: StorageEvent) => {
    if (event.key !== EVENTO_CHAMADA_KEY || !event.newValue) {
      return;
    }

    try {
      const payload = JSON.parse(event.newValue) as ChamadaPainelEvento;
      if (payload?.id) {
        onEvento(payload);
      }
    } catch {
      return;
    }
  };

  canal?.addEventListener("message", aoReceberCanal);
  window.addEventListener("storage", aoReceberStorage);

  return () => {
    canal?.removeEventListener("message", aoReceberCanal);
    canal?.close();
    window.removeEventListener("storage", aoReceberStorage);
  };
}

export function atualizarHeartbeatPainel(audioHabilitado: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: HeartbeatPainel = {
    atualizadoEm: Date.now(),
    audioHabilitado
  };

  window.localStorage.setItem(HEARTBEAT_PAINEL_KEY, JSON.stringify(payload));
}

export function painelAtivoComVoz() {
  const heartbeat = lerHeartbeatPainel();

  if (!heartbeat) {
    return false;
  }

  return Date.now() - heartbeat.atualizadoEm < HEARTBEAT_TTL_MS && heartbeat.audioHabilitado;
}

export function registrarChamadaFalando(chamadaId: string) {
  if (typeof window === "undefined" || !chamadaId) {
    return;
  }

  const payload: UltimaFalaPayload = {
    chamadaId,
    iniciadaEm: Date.now()
  };

  window.localStorage.setItem(ULTIMA_FALA_KEY, JSON.stringify(payload));
}

export function painelJaFalouChamada(chamadaId: string) {
  const ultimaFala = lerUltimaFala();

  if (!ultimaFala?.chamadaId) {
    return false;
  }

  return (
    ultimaFala.chamadaId === chamadaId &&
    Date.now() - ultimaFala.iniciadaEm < HEARTBEAT_TTL_MS
  );
}
