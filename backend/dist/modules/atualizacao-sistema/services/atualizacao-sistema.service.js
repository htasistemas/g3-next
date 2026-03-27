import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { appendFile, copyFile, cp, lstat, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { aplicarAtualizacaoSistemaSchema, atualizarConfigAtualizacaoSistemaSchema, atualizacaoSistemaChangelogSchema, atualizacaoSistemaManifestoSchema, rollbackAtualizacaoSistemaSchema } from "../atualizacao-sistema.schema.js";
import { AtualizacaoSistemaRepository } from "../repositories/atualizacao-sistema.repository.js";
import { obterAtualizacaoSistemaPaths } from "./atualizacao-sistema.paths.js";
import { calcularSha256Arquivo, compararVersoes, existeNovaVersao, formatarDuracaoHumana } from "./atualizacao-sistema.utils.js";
const execFileAsync = promisify(execFile);
const STATUS_DISPONIVEL = "DISPONIVEL";
const STATUS_ATUALIZADO = "ATUALIZADO";
const STATUS_PROCESSANDO = "PROCESSANDO";
const STATUS_CONCLUIDO = "CONCLUIDO";
const STATUS_FALHA = "FALHA";
const STATUS_ROLLBACK = "ROLLBACK";
function normalizarDataIso(valor) {
    if (!valor?.trim())
        return new Date().toISOString().slice(0, 10);
    return valor.trim().slice(0, 10);
}
function escapePowerShell(valor) {
    return valor.replaceAll("'", "''");
}
export function sanitizarConteudoJson(conteudo) {
    return conteudo.charCodeAt(0) === 0xfeff ? conteudo.slice(1) : conteudo;
}
async function carregarJson(arquivo) {
    const conteudo = await readFile(arquivo, "utf-8");
    return JSON.parse(sanitizarConteudoJson(conteudo));
}
function garantirDestinoSeguro(raiz, relativePath) {
    const destino = path.resolve(raiz, relativePath);
    const raizNormalizada = path.resolve(raiz) + path.sep;
    if (!destino.startsWith(raizNormalizada) && destino !== path.resolve(raiz)) {
        throw new AppError("Pacote de atualização contém caminho inválido.", 422);
    }
    return destino;
}
async function coletarArquivosRecursivos(diretorio, raizBase = diretorio) {
    const entradas = await readdir(diretorio, { withFileTypes: true });
    const arquivos = [];
    for (const entrada of entradas) {
        const caminhoEntrada = path.join(diretorio, entrada.name);
        const info = await lstat(caminhoEntrada);
        if (info.isSymbolicLink()) {
            throw new AppError("Pacotes com links simbólicos não são permitidos.", 422);
        }
        if (info.isDirectory()) {
            arquivos.push(...(await coletarArquivosRecursivos(caminhoEntrada, raizBase)));
            continue;
        }
        if (info.isFile()) {
            const relativePath = path.relative(raizBase, caminhoEntrada);
            if (!relativePath || relativePath.startsWith("..")) {
                throw new AppError("Pacote de atualização contém estrutura inválida.", 422);
            }
            arquivos.push(relativePath);
        }
    }
    return arquivos.sort((a, b) => a.localeCompare(b));
}
function filtrarArquivosPayload(arquivos) {
    return arquivos.filter((relativePath) => {
        const partes = relativePath.split(path.sep).filter(Boolean);
        const primeiraParte = partes[0]?.toLowerCase();
        if (!primeiraParte)
            return false;
        if (primeiraParte === "migrations" || primeiraParte === "rollback")
            return false;
        if (primeiraParte === "metadata.json" || primeiraParte === "manifest.json")
            return false;
        return true;
    });
}
export class AtualizacaoSistemaService {
    repository = new AtualizacaoSistemaRepository();
    paths = obterAtualizacaoSistemaPaths();
    async garantirEstruturaArquivos() {
        const versaoInstalada = await this.obterVersaoInstalada();
        await Promise.all([
            mkdir(this.paths.diretorioUpdates, { recursive: true }),
            mkdir(this.paths.diretorioPackages, { recursive: true }),
            mkdir(this.paths.diretorioBackups, { recursive: true }),
            mkdir(this.paths.diretorioLogs, { recursive: true }),
            mkdir(path.dirname(this.paths.arquivoVersaoInstalada), { recursive: true })
        ]);
        if (!existsSync(this.paths.arquivoVersaoInstalada)) {
            await writeFile(this.paths.arquivoVersaoInstalada, `${versaoInstalada}\n`, "utf-8");
        }
        if (!existsSync(this.paths.arquivoManifesto)) {
            const manifestoPadrao = {
                latestVersion: versaoInstalada,
                releaseDate: normalizarDataIso(),
                description: "Versão atualmente instalada nesta instância.",
                packageName: "",
                checksum: "",
                minCompatibleVersion: versaoInstalada,
                releaseType: "stable"
            };
            await writeFile(this.paths.arquivoManifesto, `${JSON.stringify(manifestoPadrao, null, 2)}\n`, "utf-8");
        }
        if (!existsSync(this.paths.arquivoChangelog)) {
            const changelogPadrao = {
                entries: [
                    {
                        version: versaoInstalada,
                        releaseDate: normalizarDataIso(),
                        title: "Base atual",
                        description: "Estrutura inicial do mecanismo de atualização do sistema.",
                        changes: ["Manifesto e changelog inicial criados automaticamente."],
                        releaseType: "stable"
                    }
                ]
            };
            await writeFile(this.paths.arquivoChangelog, `${JSON.stringify(changelogPadrao, null, 2)}\n`, "utf-8");
        }
    }
    async obterVersaoInstalada() {
        try {
            const conteudo = await readFile(this.paths.arquivoVersaoInstalada, "utf-8");
            const versao = conteudo.trim();
            return versao || "0.0.0";
        }
        catch {
            return "0.0.0";
        }
    }
    async gravarVersaoInstalada(versao) {
        await mkdir(path.dirname(this.paths.arquivoVersaoInstalada), { recursive: true });
        await writeFile(this.paths.arquivoVersaoInstalada, `${versao.trim()}\n`, "utf-8");
    }
    async lerManifesto() {
        await this.garantirEstruturaArquivos();
        const manifesto = await carregarJson(this.paths.arquivoManifesto);
        return atualizacaoSistemaManifestoSchema.parse(manifesto);
    }
    async obterVersaoAtual() {
        await this.garantirEstruturaArquivos();
        return {
            versaoInstalada: await this.obterVersaoInstalada()
        };
    }
    async obterVersaoPublicada() {
        const [versaoInstalada, manifesto] = await Promise.all([
            this.obterVersaoInstalada(),
            this.lerManifesto()
        ]);
        return {
            versaoInstalada,
            versaoPublicada: manifesto.latestVersion,
            atualizacaoDisponivel: existeNovaVersao(versaoInstalada, manifesto.latestVersion),
            manifesto
        };
    }
    async verificarAtualizacao() {
        const [statusAtual, config, publicado] = await Promise.all([
            this.repository.obterStatus(),
            this.repository.obterConfig(),
            this.obterVersaoPublicada()
        ]);
        if (!statusAtual.emExecucao) {
            await this.repository.atualizarStatus({
                versaoInstalada: publicado.versaoInstalada,
                versaoPublicada: publicado.versaoPublicada,
                atualizacaoDisponivel: publicado.atualizacaoDisponivel,
                ultimaVerificacaoEm: new Date(),
                status: publicado.atualizacaoDisponivel ? STATUS_DISPONIVEL : STATUS_ATUALIZADO,
                mensagem: publicado.atualizacaoDisponivel
                    ? `Nova versão disponível: ${publicado.versaoPublicada}.`
                    : `Versão instalada: ${publicado.versaoInstalada}.`
            });
        }
        else {
            await this.repository.atualizarStatus({
                versaoInstalada: publicado.versaoInstalada,
                versaoPublicada: publicado.versaoPublicada,
                atualizacaoDisponivel: publicado.atualizacaoDisponivel,
                ultimaVerificacaoEm: new Date()
            });
        }
        return {
            modo: config.modo,
            ...publicado,
            status: await this.repository.obterStatus()
        };
    }
    async obterChangelog() {
        await this.garantirEstruturaArquivos();
        const changelog = await carregarJson(this.paths.arquivoChangelog);
        const parseado = atualizacaoSistemaChangelogSchema.parse(changelog);
        return {
            entries: Array.isArray(parseado) ? parseado : parseado.entries
        };
    }
    async obterStatus() {
        await this.verificarAtualizacao();
        return this.repository.obterStatus();
    }
    async obterConfig() {
        await this.garantirEstruturaArquivos();
        return this.repository.obterConfig();
    }
    async salvarConfig(rawPayload, usuarioAtualizacao) {
        const payload = atualizarConfigAtualizacaoSistemaSchema.parse(rawPayload);
        const config = await this.repository.salvarConfig(payload.modo, usuarioAtualizacao);
        await this.repository.atualizarStatus({
            mensagem: `Modo atual: ${config.modo === "AUTOMATICO" ? "Automático" : "Manual"}.`
        });
        if (config.modo === "AUTOMATICO") {
            void this.verificarEAplicarAutomaticamente();
        }
        return config;
    }
    async listarHistorico() {
        return {
            items: await this.repository.listarHistorico()
        };
    }
    async listarLogs(rawFilters) {
        const limite = rawFilters.limite ? Number(rawFilters.limite) : 100;
        return {
            items: await this.repository.listarLogs({
                execucaoId: rawFilters.execucaoId?.trim() || undefined,
                limite: Number.isFinite(limite) ? limite : 100
            })
        };
    }
    async baixarAtualizacao() {
        const manifesto = await this.lerManifesto();
        if (!manifesto.packageName?.trim()) {
            throw new AppError("Não há um pacote de atualização configurado no arquivo version.json.", 400);
        }
        const caminhoPacote = await this.localizarOuBaixarPacote(manifesto);
        const checksum = await calcularSha256Arquivo(caminhoPacote);
        return {
            packageName: manifesto.packageName,
            packagePath: caminhoPacote,
            checksum,
            validado: checksum === manifesto.checksum
        };
    }
    async aplicarAtualizacao(rawPayload, usuarioExecucao, modoForcado) {
        const payload = aplicarAtualizacaoSistemaSchema.parse(rawPayload ?? {});
        const [manifesto, config, versaoInstalada] = await Promise.all([
            this.lerManifesto(),
            this.repository.obterConfig(),
            this.obterVersaoInstalada()
        ]);
        if (!manifesto.packageName.trim()) {
            throw new AppError("Nenhum pacote publicado foi informado no manifesto version.json.", 409);
        }
        if (manifesto.minCompatibleVersion &&
            compararVersoes(versaoInstalada, manifesto.minCompatibleVersion) < 0) {
            throw new AppError(`A versão instalada ${versaoInstalada} não atende a compatibilidade mínima ${manifesto.minCompatibleVersion}.`, 409);
        }
        if (!payload.forcar && !existeNovaVersao(versaoInstalada, manifesto.latestVersion)) {
            throw new AppError("Não existe nova versão publicada para esta instância.", 409);
        }
        const execucaoId = randomUUID();
        const modo = modoForcado ?? config.modo;
        const iniciou = await this.repository.iniciarExecucao({
            execucaoId,
            versaoInstalada,
            versaoPublicada: manifesto.latestVersion,
            mensagem: `Iniciando atualização ${manifesto.latestVersion}.`,
            usuarioExecucao
        });
        if (!iniciou) {
            throw new AppError("Já existe uma atualização ou rollback em execução.", 409);
        }
        await this.registrarLog(execucaoId, "INFO", "INICIO", "Fluxo de atualização iniciado.", {
            modo,
            versaoInstalada,
            versaoPublicada: manifesto.latestVersion
        });
        void this.executarFluxoAtualizacao({
            execucaoId,
            usuarioExecucao,
            modo,
            manifesto,
            versaoInstaladaAntes: versaoInstalada
        });
        return {
            accepted: true,
            execucaoId,
            status: STATUS_PROCESSANDO
        };
    }
    async rollback(rawPayload, usuarioExecucao) {
        const payload = rollbackAtualizacaoSistemaSchema.parse(rawPayload ?? {});
        const historicoBase = await this.repository.buscarHistoricoParaRollback(payload.historicoId);
        if (!historicoBase?.backupDiretorio) {
            throw new AppError("Não existe backup disponível para rollback.", 409);
        }
        const versaoInstaladaAntes = await this.obterVersaoInstalada();
        const execucaoId = randomUUID();
        const iniciou = await this.repository.iniciarExecucao({
            execucaoId,
            versaoInstalada: versaoInstaladaAntes,
            versaoPublicada: historicoBase.versaoAnterior ?? null,
            mensagem: "Iniciando rollback da atualização.",
            usuarioExecucao
        });
        if (!iniciou) {
            throw new AppError("Já existe uma atualização ou rollback em execução.", 409);
        }
        await this.registrarLog(execucaoId, "INFO", STATUS_ROLLBACK, "Fluxo de rollback iniciado.", {
            historicoId: historicoBase.id,
            versaoAtual: versaoInstaladaAntes,
            versaoRetorno: historicoBase.versaoAnterior
        });
        void this.executarFluxoRollback({
            execucaoId,
            usuarioExecucao,
            historicoBase,
            versaoInstaladaAntes
        });
        return {
            accepted: true,
            execucaoId,
            status: STATUS_PROCESSANDO
        };
    }
    async verificarEAplicarAutomaticamente() {
        const [config, resumo, status] = await Promise.all([
            this.repository.obterConfig(),
            this.verificarAtualizacao(),
            this.repository.obterStatus()
        ]);
        if (config.modo !== "AUTOMATICO" || status.emExecucao || !resumo.atualizacaoDisponivel) {
            return status;
        }
        try {
            await this.aplicarAtualizacao({ forcar: false }, "sistema", "AUTOMATICO");
        }
        catch (error) {
            const mensagem = error instanceof Error ? error.message : "Falha ao iniciar atualização automática.";
            await this.repository.atualizarStatus({
                status: STATUS_DISPONIVEL,
                mensagem,
                versaoInstalada: resumo.versaoInstalada,
                versaoPublicada: resumo.versaoPublicada,
                atualizacaoDisponivel: resumo.atualizacaoDisponivel
            });
        }
        return this.repository.obterStatus();
    }
    async executarFluxoAtualizacao(contexto) {
        const inicioMs = Date.now();
        let backupDiretorio = null;
        try {
            await this.atualizarProgresso(contexto.execucaoId, "VALIDANDO", "Validando manifesto e compatibilidade.", 10);
            const caminhoPacote = await this.localizarOuBaixarPacote(contexto.manifesto, contexto.execucaoId);
            await this.atualizarProgresso(contexto.execucaoId, "VALIDANDO", "Validando checksum do pacote publicado.", 20);
            const checksumPacote = await calcularSha256Arquivo(caminhoPacote);
            if (checksumPacote !== contexto.manifesto.checksum) {
                throw new AppError("Checksum do pacote não confere com o manifesto publicado.", 422);
            }
            const diretorioTemporario = await mkdtemp(path.join(os.tmpdir(), "g3-update-"));
            try {
                const diretorioPacote = await this.prepararPacoteExtraido(caminhoPacote, diretorioTemporario);
                const diretorioPayload = await this.resolverDiretorioPayload(diretorioPacote);
                const diretorioMigrations = path.join(diretorioPacote, "migrations");
                const diretorioRollback = path.join(diretorioPacote, "rollback");
                await this.atualizarProgresso(contexto.execucaoId, "BACKUP", "Gerando backup dos arquivos impactados.", 35);
                backupDiretorio = await this.gerarBackup({
                    execucaoId: contexto.execucaoId,
                    versaoAnterior: contexto.versaoInstaladaAntes,
                    versaoNova: contexto.manifesto.latestVersion,
                    packageName: contexto.manifesto.packageName,
                    diretorioPayload,
                    diretorioRollback
                });
                await this.atualizarProgresso(contexto.execucaoId, "APLICANDO", "Aplicando arquivos do pacote versionado.", 55);
                await this.aplicarPayload(diretorioPayload);
                await this.atualizarProgresso(contexto.execucaoId, "MIGRANDO", "Executando migrações SQL do pacote.", 75);
                await this.executarSqls(diretorioMigrations, contexto.execucaoId, "MIGRACAO");
                await this.gravarVersaoInstalada(contexto.manifesto.latestVersion);
                const duracaoMs = Date.now() - inicioMs;
                await this.registrarLog(contexto.execucaoId, "INFO", "FINALIZACAO", `Atualização concluída em ${formatarDuracaoHumana(duracaoMs)}.`, {
                    backupDiretorio,
                    versaoAnterior: contexto.versaoInstaladaAntes,
                    versaoNova: contexto.manifesto.latestVersion
                });
                await this.repository.registrarHistorico({
                    execucaoId: contexto.execucaoId,
                    versaoAnterior: contexto.versaoInstaladaAntes,
                    versaoNova: contexto.manifesto.latestVersion,
                    modo: contexto.modo,
                    usuarioResponsavel: contexto.usuarioExecucao,
                    duracaoMs,
                    status: STATUS_CONCLUIDO,
                    detalhes: {
                        packageName: contexto.manifesto.packageName,
                        checksum: contexto.manifesto.checksum
                    },
                    backupDiretorio,
                    rollbackDisponivel: Boolean(backupDiretorio)
                });
                await this.repository.finalizarExecucao({
                    execucaoId: contexto.execucaoId,
                    status: STATUS_CONCLUIDO,
                    mensagem: "Atualização concluída.",
                    progresso: 100,
                    versaoInstalada: contexto.manifesto.latestVersion,
                    versaoPublicada: contexto.manifesto.latestVersion,
                    atualizacaoDisponivel: false,
                    usuarioExecucao: contexto.usuarioExecucao,
                    responsavelUltimaAtualizacao: contexto.usuarioExecucao,
                    registrarUltimaAtualizacao: true
                });
            }
            finally {
                await rm(diretorioTemporario, { recursive: true, force: true });
            }
        }
        catch (error) {
            const mensagem = error instanceof Error ? error.message : "Falha ao aplicar a atualização.";
            await this.registrarLog(contexto.execucaoId, "ERROR", "ERRO", mensagem, {
                backupDiretorio
            });
            await this.repository.registrarHistorico({
                execucaoId: contexto.execucaoId,
                versaoAnterior: contexto.versaoInstaladaAntes,
                versaoNova: contexto.manifesto.latestVersion,
                modo: contexto.modo,
                usuarioResponsavel: contexto.usuarioExecucao,
                duracaoMs: Date.now() - inicioMs,
                status: STATUS_FALHA,
                detalhes: {
                    erro: mensagem,
                    backupDiretorio
                },
                backupDiretorio,
                rollbackDisponivel: Boolean(backupDiretorio)
            });
            await this.repository.finalizarExecucao({
                execucaoId: contexto.execucaoId,
                status: STATUS_FALHA,
                mensagem,
                progresso: 100,
                versaoInstalada: contexto.versaoInstaladaAntes,
                versaoPublicada: contexto.manifesto.latestVersion,
                atualizacaoDisponivel: existeNovaVersao(contexto.versaoInstaladaAntes, contexto.manifesto.latestVersion),
                usuarioExecucao: contexto.usuarioExecucao,
                responsavelUltimaAtualizacao: null,
                registrarUltimaAtualizacao: false
            });
        }
    }
    async executarFluxoRollback(contexto) {
        const inicioMs = Date.now();
        try {
            await this.atualizarProgresso(contexto.execucaoId, STATUS_ROLLBACK, "Restaurando backup da atualização.", 25);
            await this.restaurarBackup(contexto.historicoBase.backupDiretorio);
            await this.atualizarProgresso(contexto.execucaoId, STATUS_ROLLBACK, "Aplicando scripts de rollback do pacote, quando existentes.", 70);
            await this.executarSqls(path.join(contexto.historicoBase.backupDiretorio, "rollback"), contexto.execucaoId, "ROLLBACK_SQL");
            const versaoRetorno = contexto.historicoBase.versaoAnterior ?? "0.0.0";
            await this.gravarVersaoInstalada(versaoRetorno);
            await this.repository.marcarRollbackExecutado(contexto.historicoBase.id);
            const duracaoMs = Date.now() - inicioMs;
            await this.registrarLog(contexto.execucaoId, "INFO", STATUS_ROLLBACK, `Rollback concluído em ${formatarDuracaoHumana(duracaoMs)}.`, {
                historicoBaseId: contexto.historicoBase.id,
                versaoRetorno
            });
            await this.repository.registrarHistorico({
                execucaoId: contexto.execucaoId,
                versaoAnterior: contexto.versaoInstaladaAntes,
                versaoNova: versaoRetorno,
                modo: "MANUAL",
                usuarioResponsavel: contexto.usuarioExecucao,
                duracaoMs,
                status: STATUS_ROLLBACK,
                detalhes: {
                    historicoBaseId: contexto.historicoBase.id,
                    observacao: "Rollback restaurou arquivos versionados e executou apenas SQLs presentes na pasta rollback."
                },
                backupDiretorio: contexto.historicoBase.backupDiretorio,
                rollbackDisponivel: false
            });
            await this.repository.finalizarExecucao({
                execucaoId: contexto.execucaoId,
                status: STATUS_ROLLBACK,
                mensagem: "Rollback concluído.",
                progresso: 100,
                versaoInstalada: versaoRetorno,
                versaoPublicada: contexto.historicoBase.versaoNova ?? versaoRetorno,
                atualizacaoDisponivel: existeNovaVersao(versaoRetorno, contexto.historicoBase.versaoNova ?? versaoRetorno),
                usuarioExecucao: contexto.usuarioExecucao,
                responsavelUltimaAtualizacao: contexto.usuarioExecucao,
                registrarUltimaAtualizacao: true
            });
        }
        catch (error) {
            const mensagem = error instanceof Error ? error.message : "Falha ao executar rollback.";
            await this.registrarLog(contexto.execucaoId, "ERROR", STATUS_ROLLBACK, mensagem, {
                historicoBaseId: contexto.historicoBase.id
            });
            await this.repository.registrarHistorico({
                execucaoId: contexto.execucaoId,
                versaoAnterior: contexto.versaoInstaladaAntes,
                versaoNova: contexto.historicoBase.versaoAnterior ?? null,
                modo: "MANUAL",
                usuarioResponsavel: contexto.usuarioExecucao,
                duracaoMs: Date.now() - inicioMs,
                status: STATUS_FALHA,
                detalhes: {
                    historicoBaseId: contexto.historicoBase.id,
                    erro: mensagem
                },
                backupDiretorio: contexto.historicoBase.backupDiretorio,
                rollbackDisponivel: false
            });
            await this.repository.finalizarExecucao({
                execucaoId: contexto.execucaoId,
                status: STATUS_FALHA,
                mensagem,
                progresso: 100,
                versaoInstalada: contexto.versaoInstaladaAntes,
                versaoPublicada: contexto.historicoBase.versaoNova ?? null,
                atualizacaoDisponivel: false,
                usuarioExecucao: contexto.usuarioExecucao,
                responsavelUltimaAtualizacao: null,
                registrarUltimaAtualizacao: false
            });
        }
    }
    async atualizarProgresso(execucaoId, status, mensagem, progresso) {
        await this.repository.atualizarStatus({
            execucaoId,
            status,
            mensagem,
            progresso
        });
        await this.registrarLog(execucaoId, "INFO", status, mensagem);
    }
    async registrarLog(execucaoId, nivel, etapa, mensagem, detalhes) {
        await this.repository.registrarLog({
            execucaoId,
            nivel,
            etapa,
            mensagem,
            detalhes
        });
        await appendFile(path.join(this.paths.diretorioLogs, `${execucaoId}.log`), `${new Date().toISOString()} [${nivel}] [${etapa}] ${mensagem}${detalhes ? ` ${JSON.stringify(detalhes)}` : ""}\n`, "utf-8");
    }
    async localizarOuBaixarPacote(manifesto, execucaoId) {
        const nomePacote = manifesto.packageName.trim();
        const caminhoPacote = path.join(this.paths.diretorioPackages, nomePacote);
        if (existsSync(caminhoPacote)) {
            return caminhoPacote;
        }
        if (!manifesto.downloadUrl?.trim()) {
            throw new AppError(`Pacote ${nomePacote} não localizado em /updates/packages e o manifesto não possui downloadUrl.`, 409);
        }
        await this.registrarLog(execucaoId ?? "download-manual", "INFO", "DOWNLOAD", `Baixando pacote ${nomePacote} a partir da origem publicada.`, {
            downloadUrl: manifesto.downloadUrl
        });
        const resposta = await fetch(manifesto.downloadUrl);
        if (!resposta.ok) {
            throw new AppError("Não foi possível baixar o pacote publicado.", 502);
        }
        const conteudo = Buffer.from(await resposta.arrayBuffer());
        await mkdir(path.dirname(caminhoPacote), { recursive: true });
        await writeFile(caminhoPacote, conteudo);
        return caminhoPacote;
    }
    async prepararPacoteExtraido(caminhoPacote, destino) {
        const info = await stat(caminhoPacote);
        if (info.isDirectory()) {
            return caminhoPacote;
        }
        const extensao = path.extname(caminhoPacote).toLowerCase();
        if (extensao === ".zip") {
            if (process.platform === "win32") {
                await execFileAsync("powershell.exe", [
                    "-NoProfile",
                    "-Command",
                    `Expand-Archive -LiteralPath '${escapePowerShell(caminhoPacote)}' -DestinationPath '${escapePowerShell(destino)}' -Force`
                ]);
            }
            else {
                await execFileAsync("unzip", ["-oq", caminhoPacote, "-d", destino]);
            }
        }
        else if (extensao === ".tgz" || caminhoPacote.endsWith(".tar.gz")) {
            await execFileAsync("tar", ["-xzf", caminhoPacote, "-C", destino]);
        }
        else if (extensao === ".tar") {
            await execFileAsync("tar", ["-xf", caminhoPacote, "-C", destino]);
        }
        else {
            throw new AppError("Formato de pacote não suportado. Use .zip, .tar ou .tar.gz.", 422);
        }
        const entradas = await readdir(destino, { withFileTypes: true });
        if (entradas.length === 1 && entradas[0]?.isDirectory()) {
            return path.join(destino, entradas[0].name);
        }
        return destino;
    }
    async resolverDiretorioPayload(diretorioPacote) {
        const candidato = path.join(diretorioPacote, "payload");
        if (existsSync(candidato)) {
            return candidato;
        }
        return diretorioPacote;
    }
    async gerarBackup(input) {
        const diretorioBackup = path.join(this.paths.diretorioBackups, input.execucaoId);
        const diretorioArquivos = path.join(diretorioBackup, "files");
        const arquivosPayload = filtrarArquivosPayload(await coletarArquivosRecursivos(input.diretorioPayload));
        const arquivos = [];
        await mkdir(diretorioArquivos, { recursive: true });
        for (const relativePath of arquivosPayload) {
            const origemAtual = garantirDestinoSeguro(this.paths.raizRepositorio, relativePath);
            const arquivoExiste = existsSync(origemAtual);
            arquivos.push({ relativePath, existedBefore: arquivoExiste });
            if (arquivoExiste) {
                const destinoBackup = garantirDestinoSeguro(diretorioArquivos, relativePath);
                await mkdir(path.dirname(destinoBackup), { recursive: true });
                await copyFile(origemAtual, destinoBackup);
            }
        }
        const relativeVersionPath = path.relative(this.paths.raizRepositorio, this.paths.arquivoVersaoInstalada);
        arquivos.push({
            relativePath: relativeVersionPath,
            existedBefore: existsSync(this.paths.arquivoVersaoInstalada)
        });
        if (existsSync(this.paths.arquivoVersaoInstalada)) {
            const destinoVersao = garantirDestinoSeguro(diretorioArquivos, relativeVersionPath);
            await mkdir(path.dirname(destinoVersao), { recursive: true });
            await copyFile(this.paths.arquivoVersaoInstalada, destinoVersao);
        }
        if (existsSync(input.diretorioRollback)) {
            await cp(input.diretorioRollback, path.join(diretorioBackup, "rollback"), {
                recursive: true
            });
        }
        const metadata = {
            execucaoId: input.execucaoId,
            versaoAnterior: input.versaoAnterior,
            versaoNova: input.versaoNova,
            packageName: input.packageName,
            arquivos
        };
        await writeFile(path.join(diretorioBackup, "metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf-8");
        return diretorioBackup;
    }
    async aplicarPayload(diretorioPayload) {
        const arquivos = filtrarArquivosPayload(await coletarArquivosRecursivos(diretorioPayload));
        for (const relativePath of arquivos) {
            const origem = path.join(diretorioPayload, relativePath);
            const destino = garantirDestinoSeguro(this.paths.raizRepositorio, relativePath);
            await mkdir(path.dirname(destino), { recursive: true });
            await copyFile(origem, destino);
        }
    }
    async restaurarBackup(diretorioBackup) {
        const metadataPath = path.join(diretorioBackup, "metadata.json");
        if (!existsSync(metadataPath)) {
            throw new AppError("Metadata do backup não encontrado para rollback.", 409);
        }
        const metadata = await carregarJson(metadataPath);
        for (const arquivo of metadata.arquivos) {
            const destinoFinal = garantirDestinoSeguro(this.paths.raizRepositorio, arquivo.relativePath);
            const origemBackup = path.join(diretorioBackup, "files", arquivo.relativePath);
            if (arquivo.existedBefore && existsSync(origemBackup)) {
                await mkdir(path.dirname(destinoFinal), { recursive: true });
                await copyFile(origemBackup, destinoFinal);
            }
            else {
                await rm(destinoFinal, { force: true });
            }
        }
    }
    async executarSqls(diretorioSql, execucaoId, etapa) {
        if (!existsSync(diretorioSql)) {
            await this.registrarLog(execucaoId, "INFO", etapa, "Nenhum script SQL encontrado.");
            return;
        }
        const arquivos = (await readdir(diretorioSql))
            .filter((item) => item.toLowerCase().endsWith(".sql"))
            .sort((a, b) => a.localeCompare(b));
        for (const arquivo of arquivos) {
            const conteudoSql = (await readFile(path.join(diretorioSql, arquivo), "utf-8")).trim();
            if (!conteudoSql)
                continue;
            await prisma.$executeRawUnsafe(conteudoSql);
            await this.registrarLog(execucaoId, "INFO", etapa, `Script executado: ${arquivo}`);
        }
    }
}
