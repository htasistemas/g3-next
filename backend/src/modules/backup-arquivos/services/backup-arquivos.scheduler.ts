import { env } from "../../../config/env.js";
import { BackupArquivosService } from "./backup-arquivos.service.js";

let schedulerInicializado = false;
let intervaloScheduler: NodeJS.Timeout | null = null;

function milissegundosAteProximaExecucao(horaConfig = "23:40") {
  const [horaTexto, minutoTexto] = horaConfig.split(":");
  const hora = Number(horaTexto);
  const minuto = Number(minutoTexto);
  const agora = new Date();
  const proxima = new Date(agora);
  proxima.setHours(Number.isFinite(hora) ? hora : 23, Number.isFinite(minuto) ? minuto : 40, 0, 0);

  if (proxima.getTime() <= agora.getTime()) {
    proxima.setDate(proxima.getDate() + 1);
  }

  return proxima.getTime() - agora.getTime();
}

export function iniciarBackupArquivosScheduler() {
  if (schedulerInicializado) return;
  schedulerInicializado = true;

  const service = new BackupArquivosService();

  const executar = async () => {
    try {
      const resultado = await service.executar();
      if (resultado.executado) {
        console.log("[g3n-backend-node] backup diario de arquivos concluido", resultado);
      }
    } catch (error) {
      console.error("[g3n-backend-node] falha no backup diario de arquivos", error);
    }
  };

  const atrasoInicial = milissegundosAteProximaExecucao(env.APP_BACKUP_ARQUIVOS_HORA);
  intervaloScheduler = setTimeout(() => {
    void executar();
    intervaloScheduler = setInterval(() => {
      void executar();
    }, 24 * 60 * 60 * 1000);
  }, atrasoInicial);
}

export function pararBackupArquivosScheduler() {
  if (intervaloScheduler) {
    clearTimeout(intervaloScheduler);
    clearInterval(intervaloScheduler);
    intervaloScheduler = null;
  }
  schedulerInicializado = false;
}
