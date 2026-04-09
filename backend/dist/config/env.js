import { z } from "zod";
import { loadBackendEnvFiles, normalizeRuntimeEnv } from "./env-runtime.js";
import { parseGoogleClientIds } from "./google-client-ids.js";
loadBackendEnvFiles();
const booleanFromEnv = z.preprocess((value) => {
    if (typeof value === "boolean")
        return value;
    if (typeof value !== "string")
        return value;
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes")
        return true;
    if (normalized === "false" || normalized === "0" || normalized === "no")
        return false;
    return value;
}, z.boolean());
const optionalTrimmedStringFromEnv = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
}, z.string().min(1).optional());
const envSchema = z
    .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    API_PORT: z.coerce.number().int().positive().default(3333),
    API_HOST: z.string().min(1).default("0.0.0.0"),
    APP_STORAGE_DRIVER: z.enum(["local"]).default("local"),
    APP_STORAGE_ROOT: z.string().trim().min(1).default("storage"),
    APP_MAINTENANCE_FLAG_PATH: z.string().trim().min(1).default("/var/run/g3n/maintenance.enable"),
    APP_GEOCODING_USER_AGENT: z.string().trim().min(1).default("G3-Next/1.0"),
    APP_EMAIL_DESTINO_CHAMADOS: z.string().trim().min(1).default("htasistemas@gmail.com"),
    CORS_ORIGIN: z
        .string()
        .min(1)
        .default("https://g3n.htasistemas.com.br,http://localhost:5173,http://127.0.0.1:5173,http://0.0.0.0:5173,http://localhost:4200,http://127.0.0.1:4200,http://0.0.0.0:4200"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL nao configurada"),
    APP_AUTH_TOKEN_SECRET: z.string().min(16).default("g3-next-dev-token-secret-2026"),
    APP_AUTH_TOKEN_EXPIRATION_MINUTES: z.coerce.number().int().positive().default(480),
    APP_AUTH_COOKIE_NAME: z.string().trim().min(1).default("g3n_auth_token"),
    APP_AUTH_COOKIE_DOMAIN: optionalTrimmedStringFromEnv,
    APP_GOOGLE_CLIENT_ID: optionalTrimmedStringFromEnv,
    GOOGLE_CLIENT_ID: optionalTrimmedStringFromEnv,
    APP_GEMINI_API_KEY: optionalTrimmedStringFromEnv,
    GEMINI_API_KEY: optionalTrimmedStringFromEnv,
    GOOGLE_GEMINI_API_KEY: optionalTrimmedStringFromEnv,
    GOOGLE_API_KEY: optionalTrimmedStringFromEnv,
    IA_PROVIDER: z.enum(["gemini"]).default("gemini"),
    IA_MODEL: z.string().trim().min(1).default("gemini-2.5-flash"),
    APP_EMAIL_HABILITADO: booleanFromEnv.default(true),
    APP_EMAIL_REMETENTE: z.string().min(1).default("htasistemas@gmail.com"),
    APP_EMAIL_NOME: z.string().min(1).default("HTA Sistemas"),
    MAIL_HOST: z.string().min(1).default("smtp.gmail.com"),
    MAIL_PORT: z.coerce.number().int().positive().default(587),
    MAIL_USER: z.string().min(1).default("htasistemas@gmail.com"),
    MAIL_PASS: optionalTrimmedStringFromEnv
})
    .superRefine((env, ctx) => {
    if (env.APP_EMAIL_HABILITADO && !env.MAIL_PASS) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["MAIL_PASS"],
            message: "MAIL_PASS nao configurada"
        });
    }
});
const parsedEnv = envSchema.parse(normalizeRuntimeEnv(process.env));
const corsOrigins = parsedEnv.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
const googleClientIds = parseGoogleClientIds(parsedEnv.APP_GOOGLE_CLIENT_ID, parsedEnv.GOOGLE_CLIENT_ID);
const geminiApiKey = parsedEnv.APP_GEMINI_API_KEY ??
    parsedEnv.GEMINI_API_KEY ??
    parsedEnv.GOOGLE_GEMINI_API_KEY ??
    parsedEnv.GOOGLE_API_KEY;
export const env = {
    ...parsedEnv,
    APP_GOOGLE_CLIENT_ID: googleClientIds[0],
    APP_GOOGLE_CLIENT_IDS: googleClientIds,
    APP_GEMINI_API_KEY: geminiApiKey,
    CORS_ORIGINS: corsOrigins
};
