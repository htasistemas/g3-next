import { DocumentosInstituicaoService } from "./documentos-instituicao.service.js";
let schedulerInicializado = false;
let intervaloScheduler = null;
export function iniciarDocumentosInstituicaoScheduler(intervaloMs = 60 * 60 * 1000) {
    if (schedulerInicializado)
        return;
    schedulerInicializado = true;
    const service = new DocumentosInstituicaoService();
    const executar = async () => {
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
