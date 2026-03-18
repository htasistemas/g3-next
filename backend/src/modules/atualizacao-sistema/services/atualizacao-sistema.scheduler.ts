import { AtualizacaoSistemaService } from "./atualizacao-sistema.service.js";

let schedulerInicializado = false;
let intervaloScheduler: NodeJS.Timeout | null = null;

export function iniciarAtualizacaoSistemaScheduler(intervaloMs = 5 * 60 * 1000) {
  if (schedulerInicializado) return;
  schedulerInicializado = true;

  const service = new AtualizacaoSistemaService();

  const executar = async () => {
    try {
      await service.verificarEAplicarAutomaticamente();
    } catch (error) {
      console.error("[g3-backend-node] falha no scheduler de atualizacao do sistema", error);
    }
  };

  void executar();
  intervaloScheduler = setInterval(() => {
    void executar();
  }, intervaloMs);
}

export function pararAtualizacaoSistemaScheduler() {
  if (intervaloScheduler) {
    clearInterval(intervaloScheduler);
    intervaloScheduler = null;
  }
  schedulerInicializado = false;
}
