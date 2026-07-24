import type { NextFunction, Request, RequestHandler, Response } from "express";

type RateLimitOptions = {
  max: number;
  windowMs: number;
  message: string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function obterIdentificador(request: Request) {
  const body = request.body as Record<string, unknown> | undefined;
  const identificador = [body?.email, body?.nomeUsuario, body?.cnpj, body?.slug, body?.codigoInstituicao]
    .find((item) => typeof item === "string" && item.trim()) as string | undefined;
  return identificador?.trim().toLowerCase() || "sem-identificador";
}

function limparBucketsAgora(agora: number) {
  for (const [chave, bucket] of buckets) {
    if (bucket.resetAt <= agora) buckets.delete(chave);
  }
}

export function criarAuthRateLimit(options: RateLimitOptions): RequestHandler {
  return (request: Request, response: Response, next: NextFunction) => {
    const agora = Date.now();
    limparBucketsAgora(agora);

    const chave = `${request.path}:${request.ip}:${obterIdentificador(request)}`;
    const atual = buckets.get(chave);
    const bucket = atual && atual.resetAt > agora
      ? atual
      : { count: 0, resetAt: agora + options.windowMs };

    bucket.count += 1;
    buckets.set(chave, bucket);

    if (buckets.size > 10_000) {
      limparBucketsAgora(agora);
    }

    if (bucket.count > options.max) {
      response.setHeader("Retry-After", Math.max(1, Math.ceil((bucket.resetAt - agora) / 1000)));
      response.status(429).json({ message: options.message });
      return;
    }

    next();
  };
}

export const authLoginRateLimit = criarAuthRateLimit({
  max: 10,
  windowMs: 15 * 60 * 1000,
  message: "Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente."
});

export const authRecoveryRateLimit = criarAuthRateLimit({
  max: 5,
  windowMs: 15 * 60 * 1000,
  message: "Muitas solicitações de recuperação. Aguarde alguns minutos e tente novamente."
});

export const publicPortalRateLimit = criarAuthRateLimit({
  max: 10,
  windowMs: 15 * 60 * 1000,
  message: "Muitas tentativas de acesso ao portal. Aguarde alguns minutos e tente novamente."
});

export const publicContextRateLimit = criarAuthRateLimit({
  max: 30,
  windowMs: 15 * 60 * 1000,
  message: "Muitas consultas de contexto. Aguarde alguns minutos e tente novamente."
});
