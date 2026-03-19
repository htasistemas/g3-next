import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { captacaoAcaoDoacaoSchema } from "../captacao-recursos.schema.js";
import { CaptacaoRecursosService } from "../services/captacao-recursos.service.js";

const service = new CaptacaoRecursosService();

function obterUsuarioId(request: Request) {
  return (request as AuthenticatedRequest).authUser?.id;
}

export class CaptacaoRecursosController {
  async dashboard(request: Request, response: Response) {
    return response.json(await service.getDashboard(request.query));
  }

  async listarDoadores(request: Request, response: Response) {
    return response.json(await service.listDoadores(request.query));
  }

  async buscarDoador(request: Request, response: Response) {
    return response.json(await service.getDoador(request.params.id));
  }

  async salvarDoador(request: Request, response: Response) {
    const resultado = await service.saveDoador(request.body, obterUsuarioId(request), request.params.id);
    return response.status(request.params.id ? 200 : 201).json(resultado);
  }

  async inativarDoador(request: Request, response: Response) {
    return response.json(await service.inativarDoador(request.params.id, obterUsuarioId(request)));
  }

  async listarCampanhas(request: Request, response: Response) {
    return response.json(await service.listCampanhas(request.query));
  }

  async buscarCampanha(request: Request, response: Response) {
    return response.json(await service.getCampanha(request.params.id));
  }

  async salvarCampanha(request: Request, response: Response) {
    const resultado = await service.saveCampanha(request.body, obterUsuarioId(request), request.params.id);
    return response.status(request.params.id ? 200 : 201).json(resultado);
  }

  async alterarStatusCampanha(request: Request, response: Response) {
    return response.json(
      await service.alterarStatusCampanha(
        request.params.id,
        String(request.body?.status ?? request.params.status ?? ""),
        obterUsuarioId(request)
      )
    );
  }

  async listarDoacoes(request: Request, response: Response) {
    return response.json(await service.listDoacoes(request.query));
  }

  async buscarDoacao(request: Request, response: Response) {
    return response.json(await service.getDoacao(request.params.id));
  }

  async salvarDoacao(request: Request, response: Response) {
    const resultado = await service.saveDoacao(request.body, obterUsuarioId(request), request.params.id);
    return response.status(request.params.id ? 200 : 201).json(resultado);
  }

  async gerarCobranca(request: Request, response: Response) {
    return response.json(await service.gerarCobranca(request.params.id, obterUsuarioId(request)));
  }

  async confirmarDoacao(request: Request, response: Response) {
    return response.json(await service.confirmarDoacao(request.params.id, obterUsuarioId(request)));
  }

  async cancelarDoacao(request: Request, response: Response) {
    const payload = captacaoAcaoDoacaoSchema.parse(request.body ?? {});
    return response.json(await service.cancelarDoacao(request.params.id, obterUsuarioId(request), payload.observacao));
  }

  async estornarDoacao(request: Request, response: Response) {
    const payload = captacaoAcaoDoacaoSchema.parse(request.body ?? {});
    return response.json(await service.estornarDoacao(request.params.id, obterUsuarioId(request), payload.observacao));
  }

  async emitirComprovante(request: Request, response: Response) {
    return response.json(await service.emitirComprovante(request.params.id, obterUsuarioId(request)));
  }

  async listarComprovantes(request: Request, response: Response) {
    return response.json(await service.listComprovantes(request.query));
  }

  async reenviarComprovante(request: Request, response: Response) {
    return response.json(await service.reenviarComprovante(request.params.id, obterUsuarioId(request)));
  }

  async configuracoes(_request: Request, response: Response) {
    return response.json(await service.getConfiguracoes());
  }

  async salvarConfiguracoes(request: Request, response: Response) {
    return response.json(await service.saveConfiguracoes(request.body, obterUsuarioId(request)));
  }

  async logs(_request: Request, response: Response) {
    return response.json(await service.listLogs());
  }

  async exportar(request: Request, response: Response) {
    const formato = request.query.formato === "pdf" ? "pdf" : "excel";
    const arquivo = await service.exportarRelatorio(request.query, formato);
    response.setHeader("Content-Type", arquivo.contentType);
    response.setHeader("Content-Disposition", `attachment; filename="${arquivo.filename}"`);
    return response.send(arquivo.buffer);
  }

  async portalLogin(request: Request, response: Response) {
    const resultado = await service.portalLogin(request.body, {
      ip: request.ip,
      userAgent: request.headers["user-agent"]
    });
    return response.json(resultado);
  }

  async portalPainel(request: Request, response: Response) {
    return response.json(await service.obterPainelPortal(String(request.query.token ?? "")));
  }

  async portalAtualizarDados(request: Request, response: Response) {
    return response.json(await service.atualizarPortalDoador(String(request.query.token ?? ""), request.body));
  }

  async portalCriarDoacao(request: Request, response: Response) {
    return response.status(201).json(await service.criarDoacaoPortal(String(request.query.token ?? ""), request.body));
  }

  async portalCancelarRecorrencia(request: Request, response: Response) {
    return response.json(await service.cancelarRecorrenciaPortal(String(request.query.token ?? ""), request.params.id));
  }
}
