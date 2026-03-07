import { config } from "dotenv";
import { z } from "zod";

config();

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(3333),
  API_HOST: z.string().min(1).default("0.0.0.0"),
  CORS_ORIGIN: z
    .string()
    .min(1)
    .default(
      "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4200,http://127.0.0.1:4200"
    ),
  DATABASE_URL: z.string().min(1, "DATABASE_URL nao configurada"),
  APP_AUTH_TOKEN_SECRET: z.string().min(16).default("g3-next-dev-token-secret-2026"),
  APP_AUTH_TOKEN_EXPIRATION_MINUTES: z.coerce.number().int().positive().default(480),
  APP_GOOGLE_CLIENT_ID: z.string().trim().min(1).optional(),
  APP_EMAIL_HABILITADO: booleanFromEnv.default(true),
  APP_EMAIL_REMETENTE: z.string().min(1).default("htasistemas@gmail.com"),
  APP_EMAIL_NOME: z.string().min(1).default("HTA Sistemas"),
  MAIL_HOST: z.string().min(1).default("smtp.gmail.com"),
  MAIL_PORT: z.coerce.number().int().positive().default(587),
  MAIL_USER: z.string().min(1).default("htasistemas@gmail.com"),
  MAIL_PASS: z.string().min(1, "MAIL_PASS nao configurada")
});

const parsedEnv = envSchema.parse(process.env);

const corsOrigins = parsedEnv.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

export const env = {
  ...parsedEnv,
  CORS_ORIGINS: corsOrigins
};
