import { prisma } from "./database/prisma.js";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { ensureRegistroPontoEstrutura } from "./modules/registro-ponto/repositories/registro-ponto-estrutura.repository.js";
import { ensureUsuariosGestaoEstrutura } from "./modules/usuarios/repositories/usuario-estrutura.repository.js";

async function bootstrap() {
  await Promise.all([
    ensureUsuariosGestaoEstrutura(prisma),
    ensureRegistroPontoEstrutura(prisma)
  ]);

  app.listen(env.API_PORT, env.API_HOST, () => {
    console.log(
      `[g3-backend-node] executando em http://${env.API_HOST}:${env.API_PORT}`
    );
  });
}

bootstrap().catch((error) => {
  console.error("[g3-backend-node] falha ao inicializar estruturas de runtime", error);
  process.exit(1);
});
