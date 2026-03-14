import PDFDocument from "pdfkit";
import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toStringId, trimOrUndefined } from "../../../utils/string-utils.js";
import { StorageService } from "../../arquivos/services/storage.service.js";
import { EmailService } from "../../email/services/email.service.js";
import {
  chamadoTecnicoComentarioInputSchema,
  chamadoTecnicoFiltroSalvoInputSchema,
  chamadoTecnicoInputSchema,
  chamadoTecnicoListaFiltrosSchema,
  chamadoTecnicoParametroInputSchema,
  chamadoTecnicoStatusInputSchema,
  chamadoTecnicoVinculoInputSchema
} from "../chamado-tecnico.schema.js";
import { chamadoParametroTipoValues } from "../chamado-tecnico.types.js";
import { ChamadoTecnicoRepository } from "../repositories/chamado-tecnico.repository.js";

type CatalogoContexto = {
  parametrosById: Map<string, any>;
  usuariosById: Map<string, any>;
  parametrosAgrupados: Record<string, any[]>;
  usuarios: any[];
};

type AuthUserContext = {
  id: string;
  nomeUsuario?: string;
  permissoes?: string[];
};

const transicoesPermitidas: Record<string, string[]> = {
  ABERTO: ["EM_ANALISE", "CANCELADO", "NAO_SERA_IMPLEMENTADO"],
  EM_ANALISE: ["AGUARDANDO_RETORNO_SOLICITANTE", "EM_DESENVOLVIMENTO", "CANCELADO", "RESOLVIDO", "NAO_SERA_IMPLEMENTADO"],
  AGUARDANDO_RETORNO_SOLICITANTE: ["EM_ANALISE", "CANCELADO", "RESOLVIDO", "NAO_SERA_IMPLEMENTADO"],
  EM_DESENVOLVIMENTO: ["EM_TESTES", "AGUARDANDO_RETORNO_SOLICITANTE", "CANCELADO", "NAO_SERA_IMPLEMENTADO"],
  EM_TESTES: ["RESOLVIDO", "EM_DESENVOLVIMENTO", "REABERTO", "NAO_SERA_IMPLEMENTADO"],
  RESOLVIDO: ["FECHADO", "REABERTO"],
  NAO_SERA_IMPLEMENTADO: ["FECHADO", "REABERTO"],
  FECHADO: ["REABERTO"],
  REABERTO: ["EM_ANALISE", "EM_DESENVOLVIMENTO", "EM_TESTES"],
  CANCELADO: ["REABERTO"]
};

export class ChamadoTecnicoService {
  private readonly repository = new ChamadoTecnicoRepository();
  private readonly storageService = new StorageService();
  private readonly emailService = new EmailService();

  async listar(rawFilters: unknown, authUser?: AuthUserContext) {
    const filters = chamadoTecnicoListaFiltrosSchema.parse(rawFilters);
    const usuarioId = this.parseId(authUser?.id);
    const contexto = await this.carregarCatalogos();
    const resultado = await this.repository.listar(filters, usuarioId);

    return {
      pagina: filters.pagina ?? 1,
      limite: filters.limite ?? 20,
      total: resultado.total,
      resumo: resultado.resumo,
      chamados: resultado.rows.map((item) => this.mapChamadoListagem(item, contexto))
    };
  }

  async exportar(rawFilters: unknown, formato: "excel" | "pdf", authUser?: AuthUserContext) {
    const filters = chamadoTecnicoListaFiltrosSchema.parse(rawFilters);
    const usuarioId = this.parseId(authUser?.id);
    const contexto = await this.carregarCatalogos();
    const rows = await this.repository.listarExportacao(filters, usuarioId);
    const chamados = rows.map((item) => this.mapChamadoListagem(item, contexto));
    const baseFilename = `chamados-tecnicos-${new Date().toISOString().slice(0, 10)}`;

    if (formato === "pdf") {
      const buffer = await this.gerarPdfExportacao(chamados);
      return {
        filename: `${baseFilename}.pdf`,
        contentType: "application/pdf",
        buffer
      };
    }

    const csv = this.gerarCsvExportacao(chamados);
    return {
      filename: `${baseFilename}.csv`,
      contentType: "text/csv; charset=utf-8",
      buffer: Buffer.from(`\uFEFF${csv}`, "utf8")
    };
  }

  async buscarPorId(rawId: string, authUser?: AuthUserContext) {
    const id = this.parseId(rawId);
    const usuarioId = this.parseId(authUser?.id);
    const contexto = await this.carregarCatalogos();
    const [chamado, comentarios, historico, vinculos, anexos] = await Promise.all([
      this.repository.buscarPorIdOuFalhar(id),
      this.repository.listarComentarios(id),
      this.repository.listarHistorico(id),
      this.repository.listarVinculos(id),
      this.repository.listarAnexos(id)
    ]);

    await this.repository.marcarAcesso(id, usuarioId);

    return {
      chamado: this.mapChamadoDetalhe(chamado, contexto),
      comentarios: comentarios.map((item) => ({
        id: toStringId(item.id),
        comentario: item.comentario,
        interno: item.interno,
        visivelSolicitante: item.visivel_solicitante,
        mencaoUsuario: this.mapUsuario(item.mencao_usuario_id, contexto),
        autor: this.mapUsuario(item.criado_por_usuario_id, contexto),
        criadoEm: item.criado_em.toISOString(),
        atualizadoEm: item.atualizado_em.toISOString()
      })),
      historico: historico.map((item) => ({
        id: toStringId(item.id),
        tipoEvento: item.tipo_evento,
        campo: item.campo ?? undefined,
        descricao: item.descricao,
        valorAnterior: item.valor_anterior ?? undefined,
        valorNovo: item.valor_novo ?? undefined,
        usuario: this.mapUsuario(item.usuario_id, contexto),
        criadoEm: item.criado_em.toISOString()
      })),
      vinculos: vinculos.map((item) => ({
        id: toStringId(item.id),
        tipoVinculo: item.tipo_vinculo,
        referenciaId: item.referencia_id ?? undefined,
        referenciaDescricao: item.referencia_descricao,
        criadoPor: this.mapUsuario(item.criado_por_usuario_id, contexto),
        criadoEm: item.criado_em.toISOString()
      })),
      anexos: anexos.map((item) => ({
        id: toStringId(item.id),
        nomeOriginal: item.nome_original,
        nomeArquivo: item.nome_arquivo,
        caminhoArquivo: item.caminho_arquivo,
        thumbnailCaminho: item.thumbnail_caminho ?? undefined,
        mimeType: item.mime_type,
        tamanhoBytes: Number(item.tamanho_bytes),
        dataUpload: item.data_upload.toISOString(),
        usuarioUpload: this.mapUsuario(item.usuario_upload_id, contexto),
        urlVisualizacao: `/api/arquivos/${item.id.toString()}/conteudo`
      }))
    };
  }

  async listarCatalogo() {
    const contexto = await this.carregarCatalogos();
    return {
      parametros: contexto.parametrosAgrupados,
      tipos: this.listarParametrosCatalogoPorTipo(contexto, "TIPO"),
      prioridades: this.listarParametrosCatalogoPorTipo(contexto, "PRIORIDADE"),
      usuarios: contexto.usuarios
    };
  }

  async salvarParametro(rawInput: unknown, rawId?: string) {
    const input = chamadoTecnicoParametroInputSchema.parse(rawInput);
    const id = rawId ? this.parseId(rawId) : undefined;
    const parametro = await this.repository.salvarParametro(input, id);
    return {
      id: toStringId(parametro.id),
      tipo: parametro.tipo,
      chave: parametro.chave,
      nome: parametro.nome,
      descricao: parametro.descricao ?? undefined,
      cor: parametro.cor ?? undefined,
      ordem: parametro.ordem,
      padrao: parametro.padrao,
      slaHoras: parametro.sla_horas ?? undefined,
      ativo: parametro.ativo
    };
  }

  async criar(rawInput: unknown, authUser?: AuthUserContext) {
    const input = await this.normalizarEntrada(chamadoTecnicoInputSchema.parse(rawInput));
    const usuarioId = this.parseId(authUser?.id);
    const { situacao, prioridade } = await this.validarCamposBase(input);
    const chamado = await this.repository.criar(
      {
        ...input,
        sla_prazo_horas: input.sla_prazo_horas ?? prioridade.sla_horas ?? undefined
      },
      usuarioId,
      situacao.id
    );
    await this.repository.registrarHistorico(chamado.id, {
      tipo_evento: "CRIACAO",
      descricao: "Chamado tecnico criado.",
      usuario_id: usuarioId
    });
    await this.notificarNovoChamado(chamado, authUser);
    return this.buscarPorId(toStringId(chamado.id), authUser);
  }

  async atualizar(rawId: string, rawInput: unknown, authUser?: AuthUserContext) {
    const id = this.parseId(rawId);
    const input = await this.normalizarEntrada(chamadoTecnicoInputSchema.parse(rawInput));
    const usuarioId = this.parseId(authUser?.id);
    const atual = await this.repository.buscarPorIdOuFalhar(id);
    const { situacao } = await this.validarCamposBase(input);

    const atualizado = await this.repository.atualizar(id, input, situacao.id);
    await this.registrarHistoricoComparativo(atual, atualizado, usuarioId);
    return this.buscarPorId(toStringId(id), authUser);
  }

  async remover(rawId: string, authUser?: AuthUserContext) {
    const id = this.parseId(rawId);
    const usuarioId = this.parseId(authUser?.id);
    await this.repository.desativar(id);
    await this.repository.registrarHistorico(id, {
      tipo_evento: "EXCLUSAO_LOGICA",
      descricao: "Chamado tecnico desativado.",
      usuario_id: usuarioId
    });
  }

  async alterarSituacao(rawId: string, rawInput: unknown, authUser?: AuthUserContext) {
    const id = this.parseId(rawId);
    const input = chamadoTecnicoStatusInputSchema.parse(rawInput);
    const usuarioId = this.parseId(authUser?.id);
    const atual = await this.repository.buscarPorIdOuFalhar(id);
    const atualSituacao = await this.obterParametroOuFalhar(atual.situacao_id, "SITUACAO");
    const novaSituacao = await this.obterParametroOuFalhar(BigInt(input.situacao_id), "SITUACAO");

    const permitidas = transicoesPermitidas[atualSituacao.chave] ?? [];
    if (atualSituacao.chave !== novaSituacao.chave && !permitidas.includes(novaSituacao.chave)) {
      throw new AppError("Transicao de situacao nao permitida para este chamado.", 422);
    }

    const usuarioPodeDesenvolver = this.usuarioPodeDesenvolver(authUser);
    const usuarioPodeEncerrar = this.usuarioPodeEncerrarChamado(authUser, atual);
    const situacoesRestritasDesenvolvimento = new Set([
      "EM_ANALISE",
      "AGUARDANDO_RETORNO_SOLICITANTE",
      "EM_DESENVOLVIMENTO",
      "EM_TESTES",
      "RESOLVIDO",
      "NAO_SERA_IMPLEMENTADO",
      "CANCELADO"
    ]);

    if (situacoesRestritasDesenvolvimento.has(novaSituacao.chave) && !usuarioPodeDesenvolver) {
      throw new AppError("Somente usuarios com acesso de desenvolvimento podem alterar para esta situacao.", 403);
    }

    if (novaSituacao.chave === "FECHADO" && !usuarioPodeDesenvolver && !usuarioPodeEncerrar) {
      throw new AppError("Somente o solicitante do chamado ou um usuario de desenvolvimento pode fechar este chamado.", 403);
    }

    if (novaSituacao.chave === "REABERTO" && !usuarioPodeDesenvolver && !usuarioPodeEncerrar) {
      throw new AppError("Somente o solicitante do chamado ou um usuario de desenvolvimento pode reabrir este chamado.", 403);
    }

    if ((novaSituacao.chave === "RESOLVIDO" || novaSituacao.chave === "NAO_SERA_IMPLEMENTADO") && !trimOrUndefined(input.resolucao)) {
      throw new AppError("Informe a resolução para concluir este chamado.", 422);
    }

    if (novaSituacao.chave === "REABERTO" && !trimOrUndefined(input.justificativa_reabertura)) {
      throw new AppError("Informe a justificativa para reabrir o chamado.", 422);
    }

    const atualizado = await this.repository.registrarResolucao(id, novaSituacao.id, {
      resolucao: trimOrUndefined(input.resolucao) ?? atual.resolucao,
      justificativa_reabertura: trimOrUndefined(input.justificativa_reabertura) ?? atual.justificativa_reabertura,
      motivo_reabertura_id: input.motivo_reabertura_id ? BigInt(input.motivo_reabertura_id) : null,
      responsavel_usuario_id: input.responsavel_usuario_id ? BigInt(input.responsavel_usuario_id) : null,
      resolvido_em: novaSituacao.chave === "RESOLVIDO" ? new Date() : novaSituacao.chave === "REABERTO" ? null : atual.resolvido_em,
      fechado_em: novaSituacao.chave === "FECHADO" ? new Date() : novaSituacao.chave === "REABERTO" ? null : atual.fechado_em,
      fechado_por_usuario_id: novaSituacao.chave === "FECHADO" ? usuarioId : novaSituacao.chave === "REABERTO" ? null : atual.fechado_por_usuario_id
    });

    await this.repository.registrarHistorico(id, {
      tipo_evento: "ALTERACAO_SITUACAO",
      campo: "situacao",
      descricao: `Situacao alterada de ${atualSituacao.nome} para ${novaSituacao.nome}.`,
      valor_anterior: atualSituacao.nome,
      valor_novo: novaSituacao.nome,
      usuario_id: usuarioId
    });

    return this.buscarPorId(toStringId(atualizado.id), authUser);
  }

  async adicionarComentario(rawId: string, rawInput: unknown, authUser?: AuthUserContext) {
    const id = this.parseId(rawId);
    const usuarioId = this.parseId(authUser?.id);
    const input = chamadoTecnicoComentarioInputSchema.parse(rawInput);
    const comentario = await this.repository.salvarComentario(id, input, usuarioId);
    await this.repository.registrarHistorico(id, {
      tipo_evento: "COMENTARIO",
      descricao: "Comentario adicionado ao chamado.",
      usuario_id: usuarioId
    });
    return comentario;
  }

  async adicionarVinculo(rawId: string, rawInput: unknown, authUser?: AuthUserContext) {
    const id = this.parseId(rawId);
    const usuarioId = this.parseId(authUser?.id);
    const input = chamadoTecnicoVinculoInputSchema.parse(rawInput);
    const vinculo = await this.repository.salvarVinculo(id, input, usuarioId);
    await this.repository.registrarHistorico(id, {
      tipo_evento: "VINCULO",
      descricao: `Vinculo adicionado: ${input.tipo_vinculo}.`,
      usuario_id: usuarioId
    });
    return vinculo;
  }

  async removerVinculo(rawId: string, rawVinculoId: string, authUser?: AuthUserContext) {
    const id = this.parseId(rawId);
    const vinculoId = this.parseId(rawVinculoId);
    const usuarioId = this.parseId(authUser?.id);
    await this.repository.removerVinculo(id, vinculoId);
    await this.repository.registrarHistorico(id, {
      tipo_evento: "VINCULO",
      descricao: "Vinculo removido do chamado.",
      usuario_id: usuarioId
    });
  }

  async listarFiltrosSalvos(authUser?: AuthUserContext) {
    const usuarioId = this.parseId(authUser?.id);
    const filtros = await this.repository.listarFiltrosSalvos(usuarioId);
    return filtros.map((item) => ({
      id: toStringId(item.id),
      nome: item.nome,
      filtros: item.filtro_json ?? {},
      padrao: item.padrao,
      criadoEm: item.criado_em.toISOString(),
      atualizadoEm: item.atualizado_em.toISOString()
    }));
  }

  async salvarFiltro(rawInput: unknown, authUser?: AuthUserContext, rawId?: string) {
    const input = chamadoTecnicoFiltroSalvoInputSchema.parse(rawInput);
    const usuarioId = this.parseId(authUser?.id);
    const filtro = await this.repository.salvarFiltroSalvo(
      usuarioId,
      input,
      rawId ? this.parseId(rawId) : undefined
    );
    if (!filtro) {
      throw new AppError("Nao foi possivel salvar o filtro.", 500);
    }
    return {
      id: toStringId(filtro.id),
      nome: filtro.nome,
      filtros: filtro.filtro_json ?? {},
      padrao: filtro.padrao,
      criadoEm: filtro.criado_em.toISOString(),
      atualizadoEm: filtro.atualizado_em.toISOString()
    };
  }

  async removerFiltro(rawId: string, authUser?: AuthUserContext) {
    const usuarioId = this.parseId(authUser?.id);
    await this.repository.removerFiltroSalvo(usuarioId, this.parseId(rawId));
  }

  async adicionarAnexos(rawId: string, files: Express.Multer.File[] | undefined, authUser?: AuthUserContext) {
    const id = this.parseId(rawId);
    const usuarioId = this.parseId(authUser?.id);
    if (!files?.length) {
      throw new AppError("Nenhum arquivo foi enviado.", 400);
    }

    for (const file of files) {
      await this.storageService.salvarUpload(file, {
        scope: "chamado_tecnico_anexo",
        entidadeId: id,
        usuarioUploadId: usuarioId,
        observacao: "Anexo de chamado tecnico"
      });
    }

    await this.repository.registrarHistorico(id, {
      tipo_evento: "ANEXO",
      descricao: `${files.length} anexo(s) adicionado(s) ao chamado.`,
      usuario_id: usuarioId
    });

    return this.buscarPorId(rawId, authUser);
  }

  async removerAnexo(rawId: string, rawArquivoId: string, authUser?: AuthUserContext) {
    const id = this.parseId(rawId);
    const usuarioId = this.parseId(authUser?.id);
    const anexo = await this.repository.buscarAnexoPorId(id, this.parseId(rawArquivoId));
    if (!anexo) {
      throw new AppError("Anexo do chamado nao encontrado.", 404);
    }

    await this.storageService.excluirLogico(rawArquivoId, usuarioId);
    await this.repository.registrarHistorico(id, {
      tipo_evento: "ANEXO",
      descricao: "Anexo removido do chamado.",
      usuario_id: usuarioId
    });
  }

  private parseId(rawId?: string | null) {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador invalido.", 400);
    }
    return BigInt(parsed);
  }

  private async carregarCatalogos(): Promise<CatalogoContexto> {
    const [parametros, usuarios] = await Promise.all([
      this.repository.listarParametros(),
      this.repository.listarUsuariosCatalogo()
    ]);

    const parametrosById = new Map(
      parametros.map((item) => [
        toStringId(item.id),
        {
          id: toStringId(item.id),
          tipo: item.tipo,
          chave: item.chave,
          nome: item.nome,
          cor: item.cor ?? undefined,
          ordem: item.ordem,
          padrao: item.padrao,
          slaHoras: item.sla_horas ?? undefined,
          ativo: item.ativo
        }
      ])
    );

    const parametrosAgrupados = chamadoParametroTipoValues.reduce<Record<string, any[]>>((acc, tipo) => {
      acc[tipo.trim().toLowerCase()] = [];
      return acc;
    }, {});

    parametros.forEach((item) => {
      const chave = item.tipo.trim().toLowerCase();
      const atual = parametrosAgrupados[chave] ?? [];
      const parametro = parametrosById.get(toStringId(item.id));
      if (parametro) {
        atual.push(parametro);
      }
      parametrosAgrupados[chave] = atual;
    });

    const usuariosMapeados = usuarios.map((item) => ({
      id: toStringId(item.id),
      nome:
        trimOrUndefined(item.nome_exibicao) ??
        trimOrUndefined(item.nome_completo) ??
        item.nome_usuario,
      email: item.email ?? undefined,
      status: item.status ?? undefined
    }));

    return {
      parametrosById,
      usuariosById: new Map(usuariosMapeados.map((item) => [item.id, item])),
      parametrosAgrupados,
      usuarios: usuariosMapeados
    };
  }

  private listarParametrosCatalogoPorTipo(contexto: CatalogoContexto, tipo: string) {
    const chave = tipo.trim().toLowerCase();
    const listaDireta = (contexto.parametrosAgrupados[chave] ?? []).filter(Boolean);
    if (listaDireta.length > 0) {
      return [...listaDireta].sort((itemA, itemB) => {
        if (itemA.ordem !== itemB.ordem) return itemA.ordem - itemB.ordem;
        return itemA.nome.localeCompare(itemB.nome, "pt-BR");
      });
    }

    return [...contexto.parametrosById.values()]
      .filter((item) => String(item.tipo ?? "").trim().toUpperCase() === tipo.trim().toUpperCase())
      .sort((itemA, itemB) => {
        if (itemA.ordem !== itemB.ordem) return itemA.ordem - itemB.ordem;
        return itemA.nome.localeCompare(itemB.nome, "pt-BR");
      });
  }

  private mapParametro(id: bigint | null, contexto: CatalogoContexto) {
    return id ? (contexto.parametrosById.get(toStringId(id)) ?? null) : null;
  }

  private mapUsuario(id: bigint | null, contexto: CatalogoContexto) {
    return id ? (contexto.usuariosById.get(toStringId(id)) ?? null) : null;
  }

  private mapChamadoListagem(item: any, contexto: CatalogoContexto) {
    return {
      id: toStringId(item.id),
      codigo: item.codigo,
      resumo: item.resumo,
      solicitante: item.solicitante,
      cliente: item.cliente ?? undefined,
      dataCriacao: item.data_criacao.toISOString(),
      ultimaAtualizacao: item.ultima_atualizacao.toISOString(),
      situacao: this.mapParametro(item.situacao_id, contexto),
      prioridade: this.mapParametro(item.prioridade_id, contexto),
      tipo: this.mapParametro(item.tipo_id, contexto),
      categoria: this.mapParametro(item.categoria_id, contexto),
      sistema: this.mapParametro(item.sistema_id, contexto),
      projeto: this.mapParametro(item.projeto_id, contexto),
      sprint: this.mapParametro(item.sprint_id, contexto),
      criador: this.mapUsuario(item.criador_usuario_id, contexto),
      responsavel: this.mapUsuario(item.responsavel_usuario_id, contexto),
      urlTela: item.url_tela ?? undefined,
      moduloAfetado: item.modulo_afetado ?? undefined,
      anexosQuantidade: Number(item.anexos_quantidade ?? 0),
      comentariosNaoLidos: Number(item.comentarios_nao_lidos ?? 0),
      slaVencimentoEm: item.sla_vencimento_em?.toISOString?.() ?? undefined,
      resolvidoEm: item.resolvido_em?.toISOString?.() ?? undefined,
      fechadoEm: item.fechado_em?.toISOString?.() ?? undefined
    };
  }

  private mapChamadoDetalhe(item: any, contexto: CatalogoContexto) {
    return {
      ...this.mapChamadoListagem(item, contexto),
      interessado: item.interessado ?? undefined,
      origem: this.mapParametro(item.origem_id, contexto),
      motivoReabertura: this.mapParametro(item.motivo_reabertura_id, contexto),
      chamadoRelacionadoId: item.chamado_relacionado_id ? toStringId(item.chamado_relacionado_id) : undefined,
      fechadoPor: this.mapUsuario(item.fechado_por_usuario_id, contexto),
      slaPrazoHoras: item.sla_prazo_horas ?? undefined,
      descricao: item.descricao,
      passosReproduzir: item.passos_reproduzir ?? undefined,
      resultadoEsperado: item.resultado_esperado ?? undefined,
      resultadoObtido: item.resultado_obtido ?? undefined,
      ambiente: item.ambiente ?? undefined,
      navegadorDispositivo: item.navegador_dispositivo ?? undefined,
      menuNome: item.modulo_afetado ?? undefined,
      submenuRota: item.url_tela ?? undefined,
      urlTela: item.url_tela ?? undefined,
      moduloAfetado: item.modulo_afetado ?? undefined,
      impactoUso: item.impacto_uso ?? undefined,
      quantidadeUsuariosAfetados: item.quantidade_usuarios_afetados ?? undefined,
      versaoSistema: item.versao_sistema ?? undefined,
      numeroRelease: item.numero_release ?? undefined,
      resolucao: item.resolucao ?? undefined,
      justificativaReabertura: item.justificativa_reabertura ?? undefined,
      tags: String(item.tags_texto ?? "")
        .split(";")
        .map((tag) => tag.trim())
        .filter(Boolean)
    };
  }

  private async obterParametroOuFalhar(rawId: bigint | null, tipoEsperado: string) {
    if (!rawId) throw new AppError("Parametro nao informado.", 422);
    const parametro = await this.repository.buscarParametroPorId(rawId);
    if (!parametro || parametro.tipo !== tipoEsperado) {
      throw new AppError(`Parametro de ${tipoEsperado.toLowerCase()} invalido.`, 422);
    }
    return parametro;
  }

  private async validarCamposBase(input: any) {
    await this.obterParametroOuFalhar(BigInt(input.tipo_id), "TIPO");
    if (input.categoria_id) {
      await this.obterParametroOuFalhar(BigInt(input.categoria_id), "CATEGORIA");
    }
    const prioridade = await this.obterParametroOuFalhar(BigInt(input.prioridade_id), "PRIORIDADE");
    await this.obterParametroOuFalhar(BigInt(input.sistema_id), "SISTEMA");
    const situacao = input.situacao_id
      ? await this.obterParametroOuFalhar(BigInt(input.situacao_id), "SITUACAO")
      : await this.repository.buscarParametroPorChave("SITUACAO", "ABERTO");

    if (!situacao) throw new AppError("Situacao inicial nao encontrada.", 500);
    return { prioridade, situacao };
  }

  private async registrarHistoricoComparativo(atual: any, proximo: any, usuarioId: bigint) {
    const campos: Array<[string, string, unknown, unknown]> = [
      ["resumo", "Resumo", atual.resumo, proximo.resumo],
      ["cliente", "Cliente", atual.cliente, proximo.cliente],
      ["solicitante", "Solicitante", atual.solicitante, proximo.solicitante],
      ["modulo_afetado", "Menu", atual.modulo_afetado, proximo.modulo_afetado],
      ["url_tela", "Submenu", atual.url_tela, proximo.url_tela],
      ["prioridade_id", "Prioridade", atual.prioridade_id, proximo.prioridade_id],
      ["situacao_id", "Situação", atual.situacao_id, proximo.situacao_id]
    ];

    for (const [campo, label, valorAnterior, valorNovo] of campos) {
      if (String(valorAnterior ?? "") === String(valorNovo ?? "")) continue;
      await this.repository.registrarHistorico(atual.id, {
        tipo_evento: "EDICAO",
        campo,
        descricao: `${label} atualizado(a).`,
        valor_anterior: valorAnterior ? String(valorAnterior) : null,
        valor_novo: valorNovo ? String(valorNovo) : null,
        usuario_id: usuarioId
      });
    }
  }

  private async normalizarEntrada(input: any) {
    const categoriaPadrao =
      input.categoria_id ?? (await this.repository.buscarParametroPorChave("CATEGORIA", "REGRAS_NEGOCIO"))?.id;

    return {
      ...input,
      categoria_id: categoriaPadrao ? Number(categoriaPadrao) : undefined,
      modulo_afetado: trimOrUndefined(input.menu_nome) ?? trimOrUndefined(input.modulo_afetado),
      url_tela: trimOrUndefined(input.submenu_rota) ?? trimOrUndefined(input.url_tela)
    };
  }

  private usuarioPodeDesenvolver(authUser?: AuthUserContext) {
    const permissoes = authUser?.permissoes ?? [];
    return permissoes.includes("ADMINISTRADOR") || permissoes.includes("CHAMADO_TECNICO_DESENVOLVIMENTO");
  }

  private usuarioPodeEncerrarChamado(authUser: AuthUserContext | undefined, chamado: any) {
    if (!authUser?.id) return false;
    return toStringId(chamado.criador_usuario_id) === authUser.id;
  }

  private async notificarNovoChamado(chamado: any, authUser?: AuthUserContext) {
    if (!env.APP_EMAIL_HABILITADO) return;

    const assunto = `Novo chamado técnico ${chamado.codigo}`;
    const mensagem = [
      "Um novo chamado técnico foi aberto no G3-Next Terceiro Setor.",
      "",
      `Código: ${chamado.codigo}`,
      `Solicitante: ${chamado.solicitante}`,
      `Resumo: ${chamado.resumo}`,
      `Cliente: ${chamado.cliente ?? "Não informado"}`,
      `Menu: ${chamado.modulo_afetado ?? "Não informado"}`,
      `Rota: ${chamado.url_tela ?? "Não informada"}`,
      `Criado por: ${authUser?.nomeUsuario ?? authUser?.id ?? "Sistema"}`,
      "",
      "Acesse o módulo Chamado técnico para dar andamento."
    ].join("\n");

    try {
      await this.emailService.enviarEmailSimples({
        destinatario: env.APP_EMAIL_DESTINO_CHAMADOS,
        assunto,
        mensagem
      });
    } catch (error) {
      console.error("[chamado-tecnico] falha ao enviar email administrativo", error);
    }
  }

  private gerarCsvExportacao(chamados: Array<ReturnType<ChamadoTecnicoService["mapChamadoListagem"]>>) {
    const linhas = [
      [
        "Código",
        "Data criação",
        "Última atualização",
        "Resumo",
        "Situação",
        "Prioridade",
        "Tipo",
        "Categoria",
        "Sistema",
        "Projeto",
        "Cliente",
        "Criador",
        "Responsável",
        "SLA",
        "Anexos",
        "Comentários não lidos"
      ],
      ...chamados.map((item) => [
        item.codigo,
        this.formatarDataExportacao(item.dataCriacao),
        this.formatarDataExportacao(item.ultimaAtualizacao),
        item.resumo,
        item.situacao?.nome ?? "",
        item.prioridade?.nome ?? "",
        item.tipo?.nome ?? "",
        item.categoria?.nome ?? "",
        item.sistema?.nome ?? "",
        item.projeto?.nome ?? "",
        item.cliente ?? "",
        item.criador?.nome ?? "",
        item.responsavel?.nome ?? "",
        item.slaVencimentoEm ? this.formatarDataExportacao(item.slaVencimentoEm) : "",
        String(item.anexosQuantidade),
        String(item.comentariosNaoLidos)
      ])
    ];

    return linhas
      .map((linha) => linha.map((coluna) => `"${String(coluna ?? "").replaceAll('"', '""')}"`).join(";"))
      .join("\r\n");
  }

  private async gerarPdfExportacao(
    chamados: Array<ReturnType<ChamadoTecnicoService["mapChamadoListagem"]>>
  ) {
    const doc = new PDFDocument({ size: "A4", margin: 36 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));

    const finalizado = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    doc.fontSize(16).text("Chamados técnicos", { align: "left" });
    doc
      .moveDown(0.25)
      .fontSize(9)
      .fillColor("#475569")
      .text(`Emissão em ${this.formatarDataExportacao(new Date().toISOString())}`);

    doc.moveDown(0.75).fillColor("#0f172a");

    chamados.forEach((item, index) => {
      if (index > 0) {
        doc.moveDown(0.5);
      }

      if (doc.y > 730) {
        doc.addPage();
      }

      doc.fontSize(10).font("Helvetica-Bold").text(`${item.codigo} • ${item.resumo}`);
      doc.font("Helvetica").fontSize(9).fillColor("#334155");
      doc.text(
        [
          `Situação: ${item.situacao?.nome ?? "---"}`,
          `Prioridade: ${item.prioridade?.nome ?? "---"}`,
          `Responsável: ${item.responsavel?.nome ?? "Não atribuído"}`,
          `Cliente: ${item.cliente ?? item.solicitante}`,
          `Última atualização: ${this.formatarDataExportacao(item.ultimaAtualizacao)}`,
          `SLA: ${item.slaVencimentoEm ? this.formatarDataExportacao(item.slaVencimentoEm) : "Sem prazo"}`
        ].join(" | ")
      );
      doc.fillColor("#0f172a");
    });

    doc.end();
    return finalizado;
  }

  private formatarDataExportacao(valor?: string) {
    if (!valor) return "";
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? valor : data.toLocaleString("pt-BR");
  }
}
