import { env } from "../../../config/env.js";
import { LicencaUsoService } from "./licenca-uso.service.js";

let schedulerInicializado = false;
let intervaloScheduler: NodeJS.Timeout | null = null;

export function iniciarLicencaUsoScheduler(intervaloMs = 12 * 60 * 60 * 1000) {
  if (schedulerInicializado) return;
  schedulerInicializado = true;

  const service = new LicencaUsoService();

  const executar = async () => {
    if (!env.APP_EMAIL_HABILITADO) return;

    try {
      await service.processarAlertasEmailPendentes();
    } catch (error) {
      console.error("[g3n-backend-node] falha no scheduler de licenca de uso", error);
    }
  };

  void executar();
  intervaloScheduler = setInterval(() => {
    void executar();
  }, intervaloMs);
}

export function pararLicencaUsoScheduler() {
  if (intervaloScheduler) {
    clearInterval(intervaloScheduler);
    intervaloScheduler = null;
  }
  schedulerInicializado = false;
}
