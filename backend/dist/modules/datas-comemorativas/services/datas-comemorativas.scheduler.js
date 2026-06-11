import { DatasComemorativasRepository } from "../repositories/datas-comemorativas.repository.js";
import { HolidaySyncService } from "./holiday-sync.service.js";
let schedulerInicializado = false;
let intervaloScheduler = null;
function precisaExecutarNovamente(frequencia, ultimaExecucao) {
    if (frequencia === "manual")
        return false;
    if (!ultimaExecucao)
        return true;
    const agora = Date.now();
    const diff = agora - ultimaExecucao.getTime();
    if (frequencia === "diaria")
        return diff >= 24 * 60 * 60 * 1000;
    if (frequencia === "semanal")
        return diff >= 7 * 24 * 60 * 60 * 1000;
    return diff >= 30 * 24 * 60 * 60 * 1000;
}
export function iniciarDatasComemorativasScheduler(intervaloMs = 60 * 60 * 1000) {
    if (schedulerInicializado)
        return;
    schedulerInicializado = true;
    const repository = new DatasComemorativasRepository();
    const syncService = new HolidaySyncService();
    const executar = async () => {
        try {
            const configuracoes = await repository.buscarConfiguracoes();
            if (!configuracoes.ativo || !configuracoes.sincronizacaoAutomatica) {
                return;
            }
            const logs = await repository.listarSyncLogs();
            const ultimoLog = logs.find((item) => item.tipo_sync === "feriados" && item.status_execucao !== "erro");
            if (!precisaExecutarNovamente(configuracoes.frequenciaSincronizacao, ultimoLog?.iniciado_em)) {
                return;
            }
            await syncService.syncCurrentAndNextYear();
        }
        catch (error) {
            console.error("[g3n-backend-node] falha no scheduler de datas comemorativas", error);
        }
    };
    void executar();
    intervaloScheduler = setInterval(() => {
        void executar();
    }, intervaloMs);
}
export function pararDatasComemorativasScheduler() {
    if (intervaloScheduler) {
        clearInterval(intervaloScheduler);
        intervaloScheduler = null;
    }
    schedulerInicializado = false;
}
