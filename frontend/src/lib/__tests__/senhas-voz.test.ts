import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  audioPainelJaLiberado,
  atualizarHeartbeatPainel,
  falarChamadaNavegador,
  montarMensagemFala,
  painelAtivoComVoz,
  painelJaFalouChamada,
  registrarAudioLiberado,
  registrarChamadaFalando
} from "../senhas-voz";

class MockStorage {
  private readonly valores = new Map<string, string>();

  clear() {
    this.valores.clear();
  }

  getItem(chave: string) {
    return this.valores.has(chave) ? this.valores.get(chave) ?? null : null;
  }

  removeItem(chave: string) {
    this.valores.delete(chave);
  }

  setItem(chave: string, valor: string) {
    this.valores.set(chave, String(valor));
  }
}

class MockSpeechSynthesisUtterance {
  text: string;
  lang = "";
  volume = 1;
  voice: SpeechSynthesisVoice | null = null;
  rate = 1;
  pitch = 1;
  onstart: null | (() => void) = null;
  onerror: null | (() => void) = null;

  constructor(text: string) {
    this.text = text;
  }
}

describe("senhas-voz", () => {
  const windowOriginal = Object.getOwnPropertyDescriptor(globalThis, "window");
  const utteranceOriginal = Object.getOwnPropertyDescriptor(
    globalThis,
    "SpeechSynthesisUtterance"
  );

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-09T10:00:00.000Z"));
    const localStorage = new MockStorage();
    const sessionStorage = new MockStorage();

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage,
        sessionStorage,
        setTimeout: globalThis.setTimeout.bind(globalThis),
        clearTimeout: globalThis.clearTimeout.bind(globalThis)
      }
    });

    window.localStorage.clear();
    window.sessionStorage.clear();
    Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
      configurable: true,
      value: MockSpeechSynthesisUtterance
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();

    if (windowOriginal) {
      Object.defineProperty(globalThis, "window", windowOriginal);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }

    if (utteranceOriginal) {
      Object.defineProperty(globalThis, "SpeechSynthesisUtterance", utteranceOriginal);
    } else {
      Reflect.deleteProperty(globalThis, "SpeechSynthesisUtterance");
    }
  });

  it("monta a frase com beneficiario e sala", () => {
    expect(
      montarMensagemFala(
        "Beneficiario {beneficiario} dirija-se a {sala} para atendimento.",
        "Maria Silva",
        "Sala 03"
      )
    ).toBe("Beneficiario Maria Silva dirija-se a Sala 03 para atendimento.");
  });

  it("registra a liberacao de audio na aba atual", () => {
    expect(audioPainelJaLiberado()).toBe(false);
    registrarAudioLiberado();
    expect(audioPainelJaLiberado()).toBe(true);
  });

  it("controla heartbeat ativo do painel", () => {
    atualizarHeartbeatPainel(true);
    expect(painelAtivoComVoz()).toBe(true);

    vi.advanceTimersByTime(12001);
    expect(painelAtivoComVoz()).toBe(false);
  });

  it("registra a ultima chamada falada no painel", () => {
    registrarChamadaFalando("senha-123");
    expect(painelJaFalouChamada("senha-123")).toBe(true);
    expect(painelJaFalouChamada("senha-999")).toBe(false);

    vi.advanceTimersByTime(12001);
    expect(painelJaFalouChamada("senha-123")).toBe(false);
  });

  it("dispara a fala uma unica vez e confirma inicio sem retry agressivo", () => {
    const synth = {
      speaking: false,
      pending: false,
      getVoices: vi.fn(() => [{ lang: "pt-BR", name: "Google portugues Brasil" }]),
      cancel: vi.fn(() => {
        synth.speaking = false;
        synth.pending = false;
      }),
      resume: vi.fn(),
      speak: vi.fn((utter: MockSpeechSynthesisUtterance) => {
        synth.pending = true;
        window.setTimeout(() => {
          synth.pending = false;
          synth.speaking = true;
          utter.onstart?.();
        }, 10);
      })
    };

    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: synth
    });

    const onStart = vi.fn();
    const onError = vi.fn();

    expect(
      falarChamadaNavegador({
        frase: "Beneficiario {beneficiario} dirija-se a {sala} para atendimento.",
        beneficiario: "Maria Silva",
        sala: "Sala 03",
        onStart,
        onError
      })
    ).toBe(true);

    vi.advanceTimersByTime(120);

    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
    expect(audioPainelJaLiberado()).toBe(true);
  });
});
