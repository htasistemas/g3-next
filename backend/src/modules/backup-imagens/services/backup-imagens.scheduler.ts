import { BackupImagensService } from "./backup-imagens.service.js";
import { env } from "../../../config/env.js";

let schedulerInicializado = false;
let intervaloScheduler: NodeJS.Timeout | null = null;
let executando = false;

function milissegundosAteProximaExecucao(horaConfig = "02:00") {
  const [horaTexto, minutoTexto] = horaConfig.split(":");
  const hora = Number(horaTexto);
  const minuto = Number(minutoTexto);
  const agora = new Date();
  const proxima = new Date(agora);
  proxima.setHours(Number.isFinite(hora) ? hora : 2, Number.isFinite(minuto) ? minuto : 0, 0, 0);

  if (proxima.getTime() <= agora.getTime()) {
    proxima.setDate(proxima.getDate() + 1);
  }

  return proxima.getTime() - agora.getTime();
}

export function iniciarBackupImagensScheduler() {
  if (schedulerInicializado) return;
  schedulerInicializado = true;

  const service = new BackupImagensService();

  const executar = async () => {
    if (executando) return;
    executando = true;
    try {
      const resultado = await service.executar();
      if (resultado.executado) {
        console.log("[g3n-backend-node] backup diario de imagens concluido", resultado);
      }
    } catch (error) {
      console.error("[g3n-backend-node] falha no backup diario de imagens", error);
    } finally {
      executando = false;
    }
  };

  const atrasoInicial = milissegundosAteProximaExecucao(env.APP_BACKUP_IMAGES_HORA);
  intervaloScheduler = setTimeout(() => {
    void executar();
    intervaloScheduler = setInterval(() => {
      void executar();
    }, 24 * 60 * 60 * 1000);
  }, atrasoInicial);
}

export function pararBackupImagensScheduler() {
  if (intervaloScheduler) {
    clearTimeout(intervaloScheduler);
    clearInterval(intervaloScheduler);
    intervaloScheduler = null;
  }
  schedulerInicializado = false;
  executando = false;
}
