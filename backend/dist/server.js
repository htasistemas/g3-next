import { prisma } from "./database/prisma.js";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { ensureArquivosEstrutura } from "./modules/arquivos/repositories/arquivos-estrutura.repository.js";
import { ensureAutorizacaoComprasEstrutura } from "./modules/autorizacao-compras/repositories/autorizacao-compras.repository.js";
import { ensureBancoEmpregosEstrutura } from "./modules/banco-empregos/repositories/banco-empregos.repository.js";
import { ensureBibliotecaEstrutura } from "./modules/biblioteca/repositories/biblioteca.repository.js";
import { ensureChamadoTecnicoParametrosIniciais } from "./modules/chamados-tecnicos/repositories/chamado-tecnico.repository.js";
import { ensureContabilidadeEstrutura } from "./modules/contabilidade/repositories/contabilidade.repository.js";
import { ensureParametrosSistemaEstrutura } from "./modules/configuracoes-gerais/repositories/parametros-sistema.repository.js";
import { ensureMensagensPersonalizadasBase } from "./modules/mensagens-personalizadas/services/mensagens-personalizadas.service.js";
import { ensureOcorrenciasCriancaEstrutura } from "./modules/ocorrencias-crianca/repositories/ocorrencias-crianca.repository.js";
import { ensureRegistroPontoEstrutura } from "./modules/registro-ponto/repositories/registro-ponto-estrutura.repository.js";
import { ensureSenhasEstrutura } from "./modules/senhas/repositories/senhas.repository.js";
import { ensureUsuariosGestaoEstrutura } from "./modules/usuarios/repositories/usuario-estrutura.repository.js";
import { ensureVisitasDomiciliaresEstrutura } from "./modules/visitas-domiciliares/repositories/visitas-domiciliares.repository.js";
async function aquecerEstruturasDeTela() {
    const aquecimentos = [
        { nome: "arquivos", promise: ensureArquivosEstrutura(prisma) },
        { nome: "parametros-sistema", promise: ensureParametrosSistemaEstrutura() },
        { nome: "contabilidade", promise: ensureContabilidadeEstrutura() },
        { nome: "autorizacao-compras", promise: ensureAutorizacaoComprasEstrutura() },
        { nome: "banco-empregos", promise: ensureBancoEmpregosEstrutura() },
        { nome: "biblioteca", promise: ensureBibliotecaEstrutura() },
        { nome: "ocorrencias-crianca", promise: ensureOcorrenciasCriancaEstrutura() },
        { nome: "visitas-domiciliares", promise: ensureVisitasDomiciliaresEstrutura() },
        { nome: "senhas", promise: ensureSenhasEstrutura() },
        { nome: "chamados-tecnicos", promise: ensureChamadoTecnicoParametrosIniciais() },
        { nome: "mensagens-personalizadas", promise: ensureMensagensPersonalizadasBase() }
    ];
    const resultados = await Promise.allSettled(aquecimentos.map((item) => item.promise));
    resultados.forEach((resultado, indice) => {
        if (resultado.status === "rejected") {
            console.error(`[g3-backend-node] falha ao aquecer modulo ${aquecimentos[indice]?.nome}`, resultado.reason);
        }
    });
}
async function bootstrap() {
    await Promise.all([
        ensureUsuariosGestaoEstrutura(prisma),
        ensureRegistroPontoEstrutura(prisma)
    ]);
    app.listen(env.API_PORT, env.API_HOST, () => {
        console.log(`[g3-backend-node] executando em http://${env.API_HOST}:${env.API_PORT}`);
        void aquecerEstruturasDeTela();
    });
}
bootstrap().catch((error) => {
    console.error("[g3-backend-node] falha ao inicializar estruturas de runtime", error);
    process.exit(1);
});
