import multer from "multer";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../auth/middlewares/auth.middleware.js";
import { AppError } from "../../shared/errors/app-error.js";
import { gerarRelatorioCsv } from "./importacao-dados.parser.js";
import { ImportacaoDadosService } from "./importacao-dados.service.js";

const service = new ImportacaoDadosService();
export const importacaoDadosUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 1 } });

export class ImportacaoDadosController {
  async instituicoes(request: AuthenticatedRequest, response: Response) { return response.json({ instituicoes: await service.listarInstituicoes(typeof request.query.busca === "string" ? request.query.busca : undefined) }); }
  async validar(request: AuthenticatedRequest, response: Response) {
    if (!request.file) throw new AppError("Selecione um arquivo para validar.", 400);
    const resultado = await service.validarArquivo({ buffer: request.file.buffer, nomeArquivo: request.file.originalname, tamanhoBytes: request.file.size, instituicaoId: String(request.body.instituicao_id ?? ""), usuarioId: request.authUser?.id ?? "", usuarioNome: request.authUser?.nome ?? request.authUser?.nomeUsuario ?? "MASTER", mapeamento: request.body.mapeamento ? JSON.parse(String(request.body.mapeamento)) : undefined });
    return response.status(201).json(resultado);
  }
  async obter(request: AuthenticatedRequest, response: Response) { return response.json({ importacao: await service.obter(request.params.id) }); }
  async confirmar(request: AuthenticatedRequest, response: Response) { return response.json(await service.confirmar(request.params.id, request.body.acoes, request.body.correcoes, request.authUser?.id ?? "")); }
  async historico(_request: AuthenticatedRequest, response: Response) { return response.json({ importacoes: await service.listarHistorico() }); }
  async relatorio(request: AuthenticatedRequest, response: Response) { const registro = await service.obter(request.params.id); const csv = gerarRelatorioCsv(registro.linhas); response.setHeader("Content-Type", "text/csv; charset=utf-8"); response.setHeader("Content-Disposition", `attachment; filename="relatorio-importacao-${request.params.id}.csv"`); return response.send(csv); }
}
