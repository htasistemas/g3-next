import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { maintenanceModeMiddleware } from "./middlewares/maintenance-mode.js";
import { notFoundHandler } from "./middlewares/not-found.js";
import { appRoutes } from "./routes/index.js";

export const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(
  cors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) {
        return callback(null, true);
      }

      if (env.CORS_ORIGINS.includes(requestOrigin)) {
        return callback(null, true);
      }

      console.warn(`[cors] origem nao permitida: ${requestOrigin}`);
      return callback(null, false);
    },
    credentials: true
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use((request, response, next) => {
  const metodoAlteraEstado = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
  const possuiCookieAutenticado = Boolean(request.cookies?.[env.APP_AUTH_COOKIE_NAME]);
  const origem = request.headers.origin;

  if (
    metodoAlteraEstado &&
    possuiCookieAutenticado &&
    origem &&
    !env.CORS_ORIGINS.includes(origem)
  ) {
    response.status(403).json({ message: "Origem da requisição não autorizada." });
    return;
  }

  next();
});
app.use(morgan("dev"));
app.use(maintenanceModeMiddleware);

app.use(appRoutes);
app.use(notFoundHandler);
app.use(errorHandler);
