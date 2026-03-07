import { config } from "dotenv";
import { z } from "zod";
config();
const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    API_PORT: z.coerce.number().int().positive().default(3333),
    API_HOST: z.string().min(1).default("0.0.0.0"),
    CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL nao configurada"),
    APP_AUTH_TOKEN_SECRET: z.string().min(16).default("g3-next-dev-token-secret-2026"),
    APP_AUTH_TOKEN_EXPIRATION_MINUTES: z.coerce.number().int().positive().default(480)
});
export const env = envSchema.parse(process.env);
