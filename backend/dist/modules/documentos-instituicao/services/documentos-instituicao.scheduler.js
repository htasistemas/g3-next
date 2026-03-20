import { DocumentosInstituicaoService } from "./documentos-instituicao.service.js";
import { env } from "../../../config/env.js";
let schedulerInicializado = false;
let intervaloScheduler = null;
export function iniciarDocumentosInstituicaoScheduler(intervaloMs = 60 * 60 * 1000) {
    if (schedulerInicializado)
        return;
    schedulerInicializado = true;
    const service = new DocumentosInstituicaoService();
    const executar = async () => {
        // Se o envio de e-mail estiver desabilitado no servidor, 
        // não tenta processar os alertas para evitar erros de 503/Indisponível no terminal.
        if (!env.APP_EMAIL_HABILITADO) {
            return;
        }
        try {
            await service.processarAlertasEmailPendentes();
        }
        catch (error) {
            console.error("[g3-backend-node] falha no scheduler de documentos institucionais", error);
        }
    };
    void executar();
    intervaloScheduler = setInterval(() => {
        void executar();
    }, intervaloMs);
}
export function pararDocumentosInstituicaoScheduler() {
    if (intervaloScheduler) {
        clearInterval(intervaloScheduler);
        intervaloScheduler = null;
    }
    schedulerInicializado = false;
}
