import { AtualizacaoSistemaService } from "./atualizacao-sistema.service.js";

let schedulerInicializado = false;
let intervaloScheduler: NodeJS.Timeout | null = null;
let executando = false;

export function iniciarAtualizacaoSistemaScheduler(intervaloMs = 5 * 60 * 1000) {
  if (schedulerInicializado) return;
  schedulerInicializado = true;

  const service = new AtualizacaoSistemaService();

  const executar = async () => {
    if (executando) return;
    executando = true;
    try {
      await service.verificarEAplicarAutomaticamente();
    } catch (error) {
      console.error("[g3n-backend-node] falha no scheduler de atualizacao do sistema", error);
    } finally {
      executando = false;
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
  executando = false;
}
