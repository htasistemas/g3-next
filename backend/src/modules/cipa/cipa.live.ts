import { EventEmitter } from "node:events";

export type CipaAtualizacao = { tenantId: string; eleicaoId: string; motivo: "VOTO_REGISTRADO" | "STATUS_ALTERADO" };
export const cipaLiveEvents = new EventEmitter();
cipaLiveEvents.setMaxListeners(0);
export function emitirCipaAtualizacao(atualizacao: CipaAtualizacao) { cipaLiveEvents.emit("atualizacao", atualizacao); }
