import { AppError } from "../errors/app-error.js";
const buckets = new Map();
function limparBucketsExpirados(agora) {
    for (const [key, entry] of buckets.entries()) {
        if (entry.resetAt <= agora) {
            buckets.delete(key);
        }
    }
}
function normalizarParteChave(valor) {
    return valor?.trim().toLowerCase().slice(0, 160) || "anonimo";
}
export function rateLimit(options) {
    return (request, _response, next) => {
        const agora = Date.now();
        limparBucketsExpirados(agora);
        const ip = normalizarParteChave(request.ip || request.socket.remoteAddress);
        const extra = normalizarParteChave(options.key?.(request));
        const key = `${options.keyPrefix}:${ip}:${extra}`;
        const atual = buckets.get(key);
        const entry = atual && atual.resetAt > agora
            ? atual
            : { count: 0, resetAt: agora + options.windowMs };
        entry.count += 1;
        buckets.set(key, entry);
        if (entry.count > options.max) {
            throw new AppError("Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.", 429);
        }
        return next();
    };
}
