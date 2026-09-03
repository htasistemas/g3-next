import { AppError } from "../../../shared/errors/app-error.js";
import { CipaRepository } from "../repositories/cipa.repository.js";
import { cipaCancelamentoSchema, cipaCandidaturaInputSchema, cipaCandidaturaStatusSchema, cipaColaboradorFiltersSchema, cipaColaboradorInputSchema, cipaComissaoMembroSchema, cipaDesempateSchema, cipaEleicaoInputSchema, cipaPortalAuthSchema, cipaPortalCandidaturaInputSchema, cipaVotoSchema } from "../cipa.schema.js";
import { lerCipaImportacao } from "../cipa.import-parser.js";
import { gerarDocumentoCipa, listarDocumentosCipa, obterConteudoDocumentoCipa, type CipaDocumentoTipo } from "../cipa.documents.js";
import { gerarRelatorioCipa, type CipaRelatorioTipo } from "../cipa.reports.js";
import { storageService } from "../../arquivos/services/storage-instance.js";

const repository = new CipaRepository();

function contexto(tenantId?: string, instituicaoId?: string, usuarioId?: string) {
  if (!tenantId || !instituicaoId || !usuarioId) throw new AppError("O contexto institucional da sessão não está completo.", 403);
  return { tenantId, instituicaoId, usuarioId };
}

export class CipaService {
  listarColaboradores(tenantId: string | undefined, query: unknown) {
    const filtros = cipaColaboradorFiltersSchema.parse(query ?? {});
    if (!tenantId) throw new AppError("O contexto institucional da sessão não está completo.", 403);
    return repository.listarColaboradores(tenantId, filtros);
  }

  buscarColaborador(tenantId: string | undefined, colaboradorId: string) {
    if (!tenantId) throw new AppError("O contexto institucional da sessão não está completo.", 403);
    return repository.buscarColaborador(tenantId, colaboradorId).then((item) => {
      if (!item) throw new AppError("Colaborador não encontrado no ambiente atual.", 404);
      return item;
    });
  }

  criarColaborador(rawTenantId: string | undefined, rawInstituicaoId: string | undefined, rawUsuarioId: string | undefined, body: unknown) {
    const c = contexto(rawTenantId, rawInstituicaoId, rawUsuarioId);
    return repository.criarColaborador(c.tenantId, c.instituicaoId, cipaColaboradorInputSchema.parse(body ?? {}), c.usuarioId);
  }

  listarEleicoes(tenantId: string | undefined) {
    if (!tenantId) throw new AppError("O contexto institucional da sessão não está completo.", 403);
    return repository.listarEleicoes(tenantId);
  }

  buscarEleicao(tenantId: string | undefined, eleicaoId: string) {
    if (!tenantId) throw new AppError("O contexto institucional da sessão não está completo.", 403);
    return repository.buscarEleicao(tenantId, eleicaoId).then((item) => {
      if (!item) throw new AppError("Eleição não encontrada no ambiente atual.", 404);
      return item;
    });
  }

  criarEleicao(rawTenantId: string | undefined, rawInstituicaoId: string | undefined, rawUsuarioId: string | undefined, body: unknown) {
    const c = contexto(rawTenantId, rawInstituicaoId, rawUsuarioId);
    return repository.criarEleicao(c.tenantId, c.instituicaoId, cipaEleicaoInputSchema.parse(body ?? {}), c.usuarioId);
  }

  editarEleicao(rawTenantId: string | undefined, rawUsuarioId: string | undefined, eleicaoId: string, body: unknown) {
    if (!rawTenantId || !rawUsuarioId) throw new AppError("O contexto institucional da sessão não está completo.", 403);
    return repository.editarEleicao(rawTenantId, eleicaoId, cipaEleicaoInputSchema.parse(body ?? {}), rawUsuarioId);
  }

  listarEleitores(tenantId: string | undefined, eleicaoId: string) { if (!tenantId) throw new AppError("O contexto institucional da sessão não está completo.", 403); return repository.listarEleitores(tenantId, eleicaoId); }
  adicionarEleitor(rawTenantId: string | undefined, rawUsuarioId: string | undefined, eleicaoId: string, colaboradorId: string) { if (!rawTenantId || !rawUsuarioId) throw new AppError("O contexto institucional da sessão não está completo.", 403); return repository.adicionarEleitor(rawTenantId, eleicaoId, colaboradorId, rawUsuarioId); }
  removerEleitor(rawTenantId: string | undefined, rawUsuarioId: string | undefined, eleicaoId: string, eleitorId: string) { if (!rawTenantId || !rawUsuarioId) throw new AppError("O contexto institucional da sessão não está completo.", 403); return repository.removerEleitor(rawTenantId, eleicaoId, eleitorId, rawUsuarioId); }
  importarEleitores(rawTenantId: string | undefined, rawUsuarioId: string | undefined, eleicaoId: string, arquivo: { buffer: Buffer; originalname: string }) { if (!rawTenantId || !rawUsuarioId) throw new AppError("O contexto institucional da sessão não está completo.", 403); const rows = lerCipaImportacao(arquivo.buffer, arquivo.originalname); const normalized = rows.map((row) => ({ ...row, dataNascimento: normalizarDataImportada(row.dataNascimento), dataAdmissao: normalizarDataImportada(row.dataAdmissao) })); return repository.importarEleitores(rawTenantId, eleicaoId, normalized, rawUsuarioId); }
  listarCandidaturas(tenantId: string | undefined, eleicaoId: string) { if (!tenantId) throw new AppError("O contexto institucional da sessão não está completo.", 403); return repository.listarCandidaturas(tenantId, eleicaoId); }
  criarCandidatura(rawTenantId: string | undefined, rawUsuarioId: string | undefined, eleicaoId: string, body: unknown) { if (!rawTenantId || !rawUsuarioId) throw new AppError("O contexto institucional da sessão não está completo.", 403); return repository.criarCandidatura(rawTenantId, eleicaoId, cipaCandidaturaInputSchema.parse(body ?? {}), rawUsuarioId); }
  alterarStatusCandidatura(rawTenantId: string | undefined, rawUsuarioId: string | undefined, eleicaoId: string, candidaturaId: string, body: unknown) { if (!rawTenantId || !rawUsuarioId) throw new AppError("O contexto institucional da sessão não está completo.", 403); const input = cipaCandidaturaStatusSchema.parse(body ?? {}); return repository.alterarStatusCandidatura(rawTenantId, eleicaoId, candidaturaId, input.status, input.motivo ?? null, rawUsuarioId); }
  abrirInscricoes(rawTenantId: string | undefined, rawUsuarioId: string | undefined, eleicaoId: string) { if (!rawTenantId || !rawUsuarioId) throw new AppError("O contexto institucional da sessão não está completo.", 403); return repository.alterarStatusEleicao(rawTenantId, eleicaoId, "CONFIGURACAO", "INSCRICOES_ABERTAS", rawUsuarioId); }
  encerrarInscricoes(rawTenantId: string | undefined, rawUsuarioId: string | undefined, eleicaoId: string) { if (!rawTenantId || !rawUsuarioId) throw new AppError("O contexto institucional da sessão não está completo.", 403); return repository.alterarStatusEleicao(rawTenantId, eleicaoId, "INSCRICOES_ABERTAS", "INSCRICOES_ENCERRADAS", rawUsuarioId); }
  cancelarEleicao(rawTenantId: string | undefined, rawUsuarioId: string | undefined, eleicaoId: string, body: unknown) { if (!rawTenantId || !rawUsuarioId) throw new AppError("O contexto institucional da sessão não está completo.", 403); const input = cipaCancelamentoSchema.parse(body ?? {}); return repository.cancelarEleicao(rawTenantId, eleicaoId, input.motivo, rawUsuarioId); }
  obterDashboard(tenantId: string | undefined, eleicaoId: string) { if (!tenantId) throw new AppError("O contexto institucional da sessão não está completo.", 403); return repository.obterDashboard(tenantId, eleicaoId); }
  listarComissao(tenantId: string | undefined, eleicaoId: string) { if (!tenantId) throw new AppError("O contexto institucional da sessão não está completo.", 403); return repository.listarComissao(tenantId, eleicaoId); }
  listarAuditoria(tenantId: string | undefined, eleicaoId: string) { if (!tenantId) throw new AppError("O contexto institucional da sessão não está completo.", 403); return repository.listarAuditoria(tenantId, eleicaoId); }
  adicionarComissao(rawTenantId: string | undefined, rawUsuarioId: string | undefined, eleicaoId: string, body: unknown) { if (!rawTenantId || !rawUsuarioId) throw new AppError("O contexto institucional da sessão não está completo.", 403); const input = cipaComissaoMembroSchema.parse(body ?? {}); return repository.adicionarComissao(rawTenantId, eleicaoId, input.nome, input.funcao, input.colaboradorId ?? undefined, rawUsuarioId); }
  removerComissao(rawTenantId: string | undefined, rawUsuarioId: string | undefined, eleicaoId: string, membroId: string) { if (!rawTenantId || !rawUsuarioId) throw new AppError("O contexto institucional da sessão não está completo.", 403); return repository.removerComissao(rawTenantId, eleicaoId, membroId, rawUsuarioId); }
  publicarEleicao(rawTenantId: string | undefined, rawUsuarioId: string | undefined, eleicaoId: string) { if (!rawTenantId || !rawUsuarioId) throw new AppError("O contexto institucional da sessão não está completo.", 403); return repository.publicarEleicao(rawTenantId, eleicaoId, rawUsuarioId); }
  gerarZeresima(rawTenantId: string | undefined, rawUsuarioId: string | undefined, eleicaoId: string) { if (!rawTenantId || !rawUsuarioId) throw new AppError("O contexto institucional da sessão não está completo.", 403); return repository.gerarZeresima(rawTenantId, eleicaoId, rawUsuarioId); }
  abrirVotacao(rawTenantId: string | undefined, rawUsuarioId: string | undefined, eleicaoId: string) { if (!rawTenantId || !rawUsuarioId) throw new AppError("O contexto institucional da sessão não está completo.", 403); return repository.abrirVotacao(rawTenantId, eleicaoId, rawUsuarioId); }
  encerrarVotacao(rawTenantId: string | undefined, rawUsuarioId: string | undefined, eleicaoId: string) { if (!rawTenantId || !rawUsuarioId) throw new AppError("O contexto institucional da sessão não está completo.", 403); return repository.encerrarVotacao(rawTenantId, eleicaoId, rawUsuarioId); }
  estenderVotacao(rawTenantId: string | undefined, rawUsuarioId: string | undefined, eleicaoId: string, dias: number) { if (!rawTenantId || !rawUsuarioId) throw new AppError("O contexto institucional da sessão não está completo.", 403); return repository.estenderVotacao(rawTenantId, eleicaoId, rawUsuarioId, dias); }
  apurar(rawTenantId: string | undefined, rawUsuarioId: string | undefined, eleicaoId: string) { if (!rawTenantId || !rawUsuarioId) throw new AppError("O contexto institucional da sessão não está completo.", 403); return repository.apurar(rawTenantId, eleicaoId, rawUsuarioId); }
  buscarApuracao(tenantId: string | undefined, eleicaoId: string) { if (!tenantId) throw new AppError("O contexto institucional da sessão não está completo.", 403); return repository.buscarApuracao(tenantId, eleicaoId); }
  publicarResultado(rawTenantId: string | undefined, rawUsuarioId: string | undefined, eleicaoId: string) { if (!rawTenantId || !rawUsuarioId) throw new AppError("O contexto institucional da sessão não está completo.", 403); return repository.publicarResultado(rawTenantId, eleicaoId, rawUsuarioId); }
  registrarDesempate(rawTenantId: string | undefined, rawUsuarioId: string | undefined, eleicaoId: string, body: unknown) { if (!rawTenantId || !rawUsuarioId) throw new AppError("O contexto institucional da sessão não está completo.", 403); const input = cipaDesempateSchema.parse(body ?? {}); return repository.registrarDesempate(rawTenantId, eleicaoId, input.itens, rawUsuarioId); }
  gerarDocumento(rawTenantId: string | undefined, rawUsuarioId: string | undefined, eleicaoId: string, tipo: string) { if (!rawTenantId || !rawUsuarioId) throw new AppError("O contexto institucional da sessão não está completo.", 403); if (!["EDITAL", "COMUNICADO", "RELACAO_CANDIDATOS", "ZERESIMA", "APURACAO", "RESULTADO_OFICIAL", "ATA_ELEICAO", "ATA_POSSE"].includes(tipo)) throw new AppError("Tipo de documento não permitido.", 422); return gerarDocumentoCipa(rawTenantId, eleicaoId, tipo as CipaDocumentoTipo, rawUsuarioId); }
  listarDocumentos(tenantId: string | undefined, eleicaoId: string) { if (!tenantId) throw new AppError("O contexto institucional da sessão não está completo.", 403); return listarDocumentosCipa(tenantId, eleicaoId); }
  obterConteudoDocumento(rawTenantId: string | undefined, rawUsuarioId: string | undefined, eleicaoId: string, documentoId: string) { if (!rawTenantId || !rawUsuarioId) throw new AppError("O contexto institucional da sessão não está completo.", 403); return obterConteudoDocumentoCipa(rawTenantId, eleicaoId, documentoId, rawUsuarioId); }
  gerarRelatorio(rawTenantId: string | undefined, eleicaoId: string, tipo: string) { if (!rawTenantId) throw new AppError("O contexto institucional da sessão não está completo.", 403); const tipos: CipaRelatorioTipo[] = ["ELEITORES_APTOS", "ELEITORES_VOTARAM", "ELEITORES_PENDENTES", "CANDIDATOS", "PARTICIPACAO", "APURACAO", "RESULTADO_FINAL", "AUDITORIA", "HISTORICO"]; if (!tipos.includes(tipo as CipaRelatorioTipo)) throw new AppError("Tipo de relatório não permitido.", 422); return gerarRelatorioCipa(rawTenantId, eleicaoId, tipo as CipaRelatorioTipo); }
  autenticarPortal(body: unknown, identificador: string, finalidade: "CANDIDATURA" | "VOTACAO") { const input = cipaPortalAuthSchema.parse(body ?? {}); return repository.autenticarPortal(identificador, input.cpf, input.dataNascimento, finalidade); }
  obterUrna(token: string, identificador: string) { if (!token) throw new AppError("Seu acesso expirou. Inicie a votação novamente.", 401); return repository.obterUrna(token, identificador); }
  obterFotoCandidaturaPortal(identificador: string, candidaturaId: string) { return repository.obterContextoFotoCandidaturaPortal(identificador, candidaturaId).then((contexto) => storageService.obterConteudoPorCaminho(contexto.caminho, undefined, contexto.tenantId, false)); }
  registrarVoto(token: string, identificador: string, body: unknown) { if (!token) throw new AppError("Seu acesso expirou. Inicie a votação novamente.", 401); const input = cipaVotoSchema.parse(body ?? {}); return repository.registrarVoto(token, identificador, input.tipo, input.candidaturaIds?.length ? input.candidaturaIds : input.candidaturaId ? [input.candidaturaId] : []); }
  obterPortalPublico(identificador: string) { return repository.obterPortalPublico(identificador); }
  criarCandidaturaPortal(token: string, identificador: string, body: unknown) { if (!token) throw new AppError("Seu acesso expirou. Inicie a candidatura novamente.", 401); return repository.criarCandidaturaPortal(token, identificador, cipaPortalCandidaturaInputSchema.parse(body ?? {})); }
  async enviarFotoCandidaturaPortal(token: string, identificador: string, arquivo: Express.Multer.File | undefined) {
    if (!token) throw new AppError("Seu acesso expirou. Inicie a candidatura novamente.", 401);
    if (!arquivo) throw new AppError("Selecione uma foto para enviar.", 400);
    const contexto = await repository.buscarContextoFotoCandidaturaPortal(token, identificador);
    const upload = await storageService.salvarUpload(arquivo, { scope: "colaborador_foto", entidadeId: BigInt(contexto.colaboradorId), entidadeTipo: "rh_colaborador", tenantId: contexto.tenantId, observacao: `Foto da candidatura da eleição ${contexto.eleicaoId}` });
    try {
      const anterior = await repository.atualizarFotoColaborador(contexto.tenantId, contexto.colaboradorId, upload.caminhoArquivo);
      if (anterior && anterior !== upload.caminhoArquivo) await storageService.desativarPorCaminho(anterior, undefined, contexto.tenantId);
      return { caminhoLogico: upload.caminhoArquivo, nomeArquivo: upload.registro.nome_arquivo };
    } catch (error) {
      await storageService.rollbackArquivos([upload.caminhoArquivo], contexto.tenantId);
      throw error;
    }
  }
}

function normalizarDataImportada(value: string) {
  const match = value.trim().match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/u);
  if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  return value.trim().slice(0, 10);
}
