import type { Response } from "express";
import { ParametrosSistemaService } from "../services/parametros-sistema.service.js";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";

const service = new ParametrosSistemaService();

export class ParametrosSistemaController {
  async obterPersonalizacao(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.obterPersonalizacao(request.authUser?.tenant_id);
    return response.json(resultado);
  }

  async atualizarPersonalizacao(request: AuthenticatedRequest, response: Response) {
    const usuario = request.authUser?.nomeUsuario ?? "sistema";
    const resultado = await service.atualizarPersonalizacao(
      request.body,
      usuario,
      request.authUser?.tenant_id ?? ""
    );
    return response.json(resultado);
  }

  async obterCarenciaDoacaoRealizada(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.obterCarenciaDoacaoRealizada(request.authUser?.tenant_id);
    return response.json(resultado);
  }

  async atualizarCarenciaDoacaoRealizada(request: AuthenticatedRequest, response: Response) {
    const usuario = request.authUser?.nomeUsuario ?? "sistema";
    const resultado = await service.atualizarCarenciaDoacaoRealizada(
      request.body,
      usuario,
      request.authUser?.tenant_id ?? ""
    );
    return response.json(resultado);
  }

  async obterObrigatoriedadeDocumentosBeneficiario(
    request: AuthenticatedRequest,
    response: Response
  ) {
    const resultado = await service.obterObrigatoriedadeDocumentosBeneficiario(
      request.authUser?.tenant_id
    );
    return response.json(resultado);
  }

  async atualizarObrigatoriedadeDocumentosBeneficiario(
    request: AuthenticatedRequest,
    response: Response
  ) {
    const usuario = request.authUser?.nomeUsuario ?? "sistema";
    const resultado = await service.atualizarObrigatoriedadeDocumentosBeneficiario(
      request.body,
      usuario,
      request.authUser?.tenant_id ?? ""
    );
    return response.json(resultado);
  }

  async obterAlertasCentralAtendimentos(
    request: AuthenticatedRequest,
    response: Response
  ) {
    const resultado = await service.obterAlertasCentralAtendimentos(request.authUser?.tenant_id);
    return response.json(resultado);
  }

  async atualizarAlertasCentralAtendimentos(
    request: AuthenticatedRequest,
    response: Response
  ) {
    const usuario = request.authUser?.nomeUsuario ?? "sistema";
    const resultado = await service.atualizarAlertasCentralAtendimentos(
      request.body,
      usuario,
      request.authUser?.tenant_id ?? ""
    );
    return response.json(resultado);
  }

  async obterConfiguracaoCadastroBeneficiario(
    request: AuthenticatedRequest,
    response: Response
  ) {
    const resultado = await service.obterConfiguracaoCadastroBeneficiario(request.authUser?.tenant_id);
    return response.json(resultado);
  }

  async atualizarConfiguracaoCadastroBeneficiario(
    request: AuthenticatedRequest,
    response: Response
  ) {
    const usuario = request.authUser?.nomeUsuario ?? "sistema";
    const resultado = await service.atualizarConfiguracaoCadastroBeneficiario(
      request.body,
      usuario,
      request.authUser?.tenant_id ?? ""
    );
    return response.json(resultado);
  }

  async listarIntegracoes(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.listarIntegracoes(request.authUser?.tenant_id);
    return response.json(resultado);
  }

  async salvarIntegracao(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.salvarIntegracao(
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id ?? ""
    );
    return response.json(resultado);
  }

  async testarIntegracao(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.testarIntegracao(
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id ?? ""
    );
    return response.json(resultado);
  }
}
