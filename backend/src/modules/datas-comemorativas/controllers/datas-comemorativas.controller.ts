import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import {
  dataComemorativaPopupRegistroSchema,
  dataComemorativaSyncRangeSchema,
  dataComemorativaSyncSchema
} from "../datas-comemorativas.schema.js";
import { DatasComemorativasRepository } from "../repositories/datas-comemorativas.repository.js";
import { CommemorativeImportService } from "../services/commemorative-import.service.js";
import { DailyPopupService } from "../services/daily-popup.service.js";
import { DateCommemorativeService } from "../services/date-commemorative.service.js";
import { HolidaySyncService } from "../services/holiday-sync.service.js";
import { SettingsCommemorativeService } from "../services/settings-commemorative.service.js";

const dateService = new DateCommemorativeService();
const holidaySyncService = new HolidaySyncService();
const importService = new CommemorativeImportService();
const popupService = new DailyPopupService();
const settingsService = new SettingsCommemorativeService();
const repository = new DatasComemorativasRepository();

function obterContexto(request: Request) {
  return {
    uf:
      typeof request.query.uf === "string"
        ? request.query.uf
        : typeof request.body?.uf === "string"
          ? request.body.uf
          : undefined,
    municipio:
      typeof request.query.municipio === "string"
        ? request.query.municipio
        : typeof request.body?.municipio === "string"
          ? request.body.municipio
          : undefined
  };
}

export class DatasComemorativasController {
  async listar(request: Request, response: Response) {
    const resultado = await dateService.list(request.query);
    return response.json(resultado);
  }

  async criar(request: Request, response: Response) {
    const usuarioId = (request as AuthenticatedRequest).authUser?.id;
    const resultado = await dateService.create(request.body, usuarioId);
    return response.status(201).json(resultado);
  }

  async buscarPorId(request: Request, response: Response) {
    const resultado = await dateService.getById(request.params.id);
    return response.json(resultado);
  }

  async atualizar(request: Request, response: Response) {
    const usuarioId = (request as AuthenticatedRequest).authUser?.id;
    const resultado = await dateService.update(request.params.id, request.body, usuarioId);
    return response.json(resultado);
  }

  async excluir(request: Request, response: Response) {
    const usuarioId = (request as AuthenticatedRequest).authUser?.id;
    await dateService.deleteLogical(request.params.id, usuarioId);
    return response.status(204).send();
  }

  async ativar(request: Request, response: Response) {
    const usuarioId = (request as AuthenticatedRequest).authUser?.id;
    const resultado = await dateService.activate(request.params.id, usuarioId);
    return response.json(resultado);
  }

  async inativar(request: Request, response: Response) {
    const usuarioId = (request as AuthenticatedRequest).authUser?.id;
    const resultado = await dateService.deactivate(request.params.id, usuarioId);
    return response.json(resultado);
  }

  async duplicar(request: Request, response: Response) {
    const usuarioId = (request as AuthenticatedRequest).authUser?.id;
    const resultado = await dateService.duplicate(request.params.id, usuarioId);
    return response.status(201).json(resultado);
  }

  async calendario(request: Request, response: Response) {
    const ano = Number(request.query.ano);
    const mes = Number(request.query.mes);
    const resultado = await dateService.getCalendarMatrix(
      ano,
      mes,
      request.query,
      obterContexto(request)
    );
    return response.json(resultado);
  }

  async doDia(request: Request, response: Response) {
    const data = String(request.query.data ?? "");
    const resultado = await dateService.getEventsByDate(data, obterContexto(request));
    return response.json(resultado);
  }

  async exportar(request: Request, response: Response) {
    const formato = request.query.formato === "pdf" ? "pdf" : "excel";
    const arquivo = await dateService.export(request.query, formato);
    response.setHeader("Content-Type", arquivo.contentType);
    response.setHeader("Content-Disposition", `attachment; filename="${arquivo.filename}"`);
    return response.send(arquivo.buffer);
  }

  async sincronizarFeriados(request: Request, response: Response) {
    const usuarioId = (request as AuthenticatedRequest).authUser?.id;
    const payload = dataComemorativaSyncSchema.parse(request.body ?? {});
    const resultado = await holidaySyncService.syncYear(
      payload.ano,
      payload.provider,
      usuarioId
    );
    return response.json(resultado);
  }

  async sincronizarIntervalo(request: Request, response: Response) {
    const usuarioId = (request as AuthenticatedRequest).authUser?.id;
    const payload = dataComemorativaSyncRangeSchema.parse(request.body ?? {});
    const resultado = await holidaySyncService.syncRange(
      payload.inicio,
      payload.fim,
      payload.provider,
      usuarioId
    );
    return response.json(resultado);
  }

  async importar(request: Request, response: Response) {
    const usuarioId = (request as AuthenticatedRequest).authUser?.id;
    const resultado = await importService.importar(request.body, usuarioId);
    return response.json(resultado);
  }

  async listarSyncLogs(_request: Request, response: Response) {
    const logs = await repository.listarSyncLogs();
    return response.json({
      logs: logs.map((item) => ({
        id: item.id.toString(),
        providerNome: item.provider_nome,
        tipoSync: item.tipo_sync,
        parametrosExecucao: item.parametros_execucao,
        quantidadeLidos: Number(item.quantidade_lidos ?? 0),
        quantidadeInseridos: Number(item.quantidade_inseridos ?? 0),
        quantidadeAtualizados: Number(item.quantidade_atualizados ?? 0),
        quantidadeIgnorados: Number(item.quantidade_ignorados ?? 0),
        quantidadeErros: Number(item.quantidade_erros ?? 0),
        statusExecucao: item.status_execucao,
        detalhesErro: item.detalhes_erro ?? undefined,
        iniciadoEm: item.iniciado_em.toISOString(),
        finalizadoEm: item.finalizado_em?.toISOString()
      }))
    });
  }

  async configuracoes(_request: Request, response: Response) {
    const resultado = await settingsService.get();
    return response.json(resultado);
  }

  async salvarConfiguracoes(request: Request, response: Response) {
    const usuarioId = (request as AuthenticatedRequest).authUser?.id;
    const resultado = await settingsService.save(request.body, usuarioId);
    return response.json(resultado);
  }

  async popupHoje(request: Request, response: Response) {
    const usuarioId = (request as AuthenticatedRequest).authUser?.id;
    if (!usuarioId) {
      return response.status(401).json({ message: "Nao autenticado." });
    }

    const data =
      typeof request.query.data === "string"
        ? request.query.data
        : new Date().toISOString().slice(0, 10);

    const resultado = await popupService.getPopupData(
      usuarioId,
      data,
      obterContexto(request)
    );
    return response.json(resultado);
  }

  async registrarVisualizacao(request: Request, response: Response) {
    const usuarioId = (request as AuthenticatedRequest).authUser?.id;
    if (!usuarioId) {
      return response.status(401).json({ message: "Nao autenticado." });
    }

    const payload = dataComemorativaPopupRegistroSchema.parse(request.body ?? {});
    await popupService.registerPopupView(
      usuarioId,
      payload.data,
      payload.eventIds ?? [],
      payload.acao ?? null
    );
    return response.status(204).send();
  }

  async dispensarHoje(request: Request, response: Response) {
    const usuarioId = (request as AuthenticatedRequest).authUser?.id;
    if (!usuarioId) {
      return response.status(401).json({ message: "Nao autenticado." });
    }

    const payload = dataComemorativaPopupRegistroSchema.parse(request.body ?? {});
    await popupService.dismissForToday(usuarioId, payload.data);
    return response.status(204).send();
  }

  async logs(_request: Request, response: Response) {
    const logs = await repository.listarLogsConsolidados();
    return response.json({ logs });
  }
}
