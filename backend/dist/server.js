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
import { ensureAtualizacaoSistemaEstrutura } from "./modules/atualizacao-sistema/repositories/atualizacao-sistema.repository.js";
import { iniciarAtualizacaoSistemaScheduler } from "./modules/atualizacao-sistema/services/atualizacao-sistema.scheduler.js";
import { ensureDatasComemorativasEstrutura } from "./modules/datas-comemorativas/repositories/datas-comemorativas.repository.js";
import { CommemorativeImportService } from "./modules/datas-comemorativas/services/commemorative-import.service.js";
import { iniciarDatasComemorativasScheduler } from "./modules/datas-comemorativas/services/datas-comemorativas.scheduler.js";
import { iniciarDocumentosInstituicaoScheduler } from "./modules/documentos-instituicao/services/documentos-instituicao.scheduler.js";
import { ensureCaptacaoRecursosEstrutura } from "./modules/captacao-recursos/repositories/captacao-recursos.repository.js";
import { ensureLicencaUsoEstrutura } from "./modules/licenca-uso/repositories/licenca-uso.repository.js";
import { iniciarLicencaUsoScheduler } from "./modules/licenca-uso/services/licenca-uso.scheduler.js";
import { iniciarBackupImagensScheduler } from "./modules/backup-imagens/services/backup-imagens.scheduler.js";
import { iniciarBackupArquivosScheduler } from "./modules/backup-arquivos/services/backup-arquivos.scheduler.js";
import { ensureUsuariosGestaoEstrutura } from "./modules/usuarios/repositories/usuario-estrutura.repository.js";
import { ensureVisitasDomiciliaresEstrutura } from "./modules/visitas-domiciliares/repositories/visitas-domiciliares.repository.js";
import { ensureAgendamentosEstrutura } from "./modules/agendamentos/repositories/agendamentos.repository.js";
import { ensureMultiTenantStructure } from "./modules/multi-tenant/tenant-estrutura.service.js";
async function aquecerEstruturasDeTela() {
    const commemorativeImportService = new CommemorativeImportService();
    const tenantsMensagens = await prisma.$queryRaw `
    SELECT DISTINCT tenant_id::text AS tenant_id
    FROM unidade_assistencial
    WHERE tenant_id IS NOT NULL
  `;
    const aquecimentos = [
        { nome: "arquivos", promise: ensureArquivosEstrutura(prisma) },
        { nome: "parametros-sistema", promise: ensureParametrosSistemaEstrutura() },
        { nome: "atualizacao-sistema", promise: ensureAtualizacaoSistemaEstrutura() },
        { nome: "datas-comemorativas", promise: ensureDatasComemorativasEstrutura() },
        { nome: "datas-comemorativas-seed", promise: commemorativeImportService.ensureSeedBase() },
        { nome: "captacao-recursos", promise: ensureCaptacaoRecursosEstrutura() },
        { nome: "licenca-uso", promise: ensureLicencaUsoEstrutura() },
        { nome: "contabilidade", promise: ensureContabilidadeEstrutura() },
        { nome: "autorizacao-compras", promise: ensureAutorizacaoComprasEstrutura() },
        { nome: "banco-empregos", promise: ensureBancoEmpregosEstrutura() },
        { nome: "biblioteca", promise: ensureBibliotecaEstrutura() },
        { nome: "ocorrencias-crianca", promise: ensureOcorrenciasCriancaEstrutura() },
        { nome: "visitas-domiciliares", promise: ensureVisitasDomiciliaresEstrutura() },
        { nome: "agendamentos", promise: ensureAgendamentosEstrutura() },
        { nome: "senhas", promise: ensureSenhasEstrutura() },
        { nome: "chamados-tecnicos", promise: ensureChamadoTecnicoParametrosIniciais() },
        ...tenantsMensagens
            .map((item) => String(item.tenant_id ?? "").trim())
            .filter(Boolean)
            .map((tenantId) => ({
            nome: `mensagens-personalizadas:${tenantId}`,
            promise: ensureMensagensPersonalizadasBase(tenantId)
        }))
    ];
    const resultados = await Promise.allSettled(aquecimentos.map((item) => item.promise));
    resultados.forEach((resultado, indice) => {
        if (resultado.status === "rejected") {
            console.error(`[g3n-backend-node] falha ao aquecer modulo ${aquecimentos[indice]?.nome}`, resultado.reason);
        }
    });
}
async function bootstrap() {
    await ensureMultiTenantStructure(prisma);
    await Promise.all([
        ensureUsuariosGestaoEstrutura(prisma),
        ensureRegistroPontoEstrutura(prisma)
    ]);
    app.listen(env.API_PORT, env.API_HOST, () => {
        console.log(`[g3n-backend-node] executando em http://${env.API_HOST}:${env.API_PORT}`);
        if (env.IA_PROVIDER === "gemini") {
            if (!env.APP_GEMINI_API_KEY) {
                console.warn("[g3n-backend-node] assistente de IA indisponivel: defina GEMINI_API_KEY no ambiente do backend.");
            }
            else {
                console.log(`[g3n-backend-node] assistente de IA configurado com provider=${env.IA_PROVIDER} model=${env.IA_MODEL}`);
            }
        }
        void aquecerEstruturasDeTela();
        iniciarAtualizacaoSistemaScheduler();
        iniciarDatasComemorativasScheduler();
        iniciarDocumentosInstituicaoScheduler();
        iniciarLicencaUsoScheduler();
        iniciarBackupImagensScheduler();
        iniciarBackupArquivosScheduler();
    });
}
bootstrap().catch((error) => {
    console.error("[g3n-backend-node] falha ao inicializar estruturas de runtime", error);
    process.exit(1);
});
