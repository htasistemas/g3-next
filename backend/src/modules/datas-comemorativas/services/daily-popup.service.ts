import { AppError } from "../../../shared/errors/app-error.js";
import { mapDataComemorativaToResponse } from "../datas-comemorativas.mapper.js";
import { deduplicateDataComemorativaList } from "../datas-comemorativas.utils.js";
import type {
  DataComemorativaContexto,
  DataComemorativaPopupPayload
} from "../datas-comemorativas.types.js";
import { DatasComemorativasRepository } from "../repositories/datas-comemorativas.repository.js";
import { CommemorativeImportService } from "./commemorative-import.service.js";

export class DailyPopupService {
  private readonly repository = new DatasComemorativasRepository();
  private readonly importService = new CommemorativeImportService();

  async shouldShowPopup(
    usuarioId: string,
    data: string,
    contexto: DataComemorativaContexto = {}
  ) {
    const configuracoes = await this.repository.buscarConfiguracoes();
    if (!configuracoes.ativo || !configuracoes.popupHabilitado) {
      return false;
    }

    if (configuracoes.popupUmaVezPorDia) {
      return !(await this.repository.jaRegistrouPopupNoDia(BigInt(usuarioId), data));
    }

    const eventos = await this.repository.listarPorData(data, contexto, true);
    return eventos.length > 0;
  }

  async getPopupData(
    usuarioId: string,
    data: string,
    contexto: DataComemorativaContexto = {}
  ): Promise<DataComemorativaPopupPayload> {
    await this.importService.ensureSeedBase();
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(data)) {
      throw new AppError("Data invalida para popup.", 400);
    }

    const configuracoes = await this.repository.buscarConfiguracoes();
    const exibirPopup = await this.shouldShowPopup(usuarioId, data, contexto);

    if (!exibirPopup) {
      return {
        exibirPopup: false,
        dataReferencia: data,
        titulo: "Comemorações de hoje",
        subtitulo: this.formatarDataExtensa(data),
        limiteItens: configuracoes.popupLimiteItens,
        eventos: []
      };
    }

    const eventosBase = await this.repository.listarPorData(data, contexto, true);
    const ano = Number(data.slice(0, 4));
    const eventos = deduplicateDataComemorativaList(
      eventosBase.map((item) => mapDataComemorativaToResponse(item, ano))
    )
      .filter((evento) => {
        if (!evento.ativo || !evento.exibirNoPopup) return false;
        if (!configuracoes.popupMostrarFeriados && evento.tipoEvento.startsWith("feriado_")) {
          return false;
        }
        if (
          !configuracoes.popupMostrarEventosInternos &&
          (evento.tipoEvento === "institucional" || evento.abrangencia === "interna")
        ) {
          return false;
        }
        if (!configuracoes.popupMostrarComemorativas && evento.tipoEvento === "comemorativa") {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (
          configuracoes.popupOrdenarPorPrioridade &&
          a.prioridadePopup !== b.prioridadePopup
        ) {
          return (b.prioridadePopup ?? 0) - (a.prioridadePopup ?? 0);
        }
        return a.titulo.localeCompare(b.titulo, "pt-BR");
      })
      .slice(0, configuracoes.popupLimiteItens)
      .map((evento) => ({
        id: evento.id,
        dataEvento: evento.dataVisual,
        titulo: evento.titulo,
        descricao: evento.descricao,
        tipoEvento: evento.tipoEvento,
        abrangencia: evento.abrangencia,
        uf: evento.uf,
        municipio: evento.municipio,
        corExibicao: evento.corExibicao,
        icone: evento.icone,
        origem: evento.fonteOrigem ?? "manual",
        prioridadePopup: evento.prioridadePopup ?? 0,
        destaqueFeriado: evento.tipoEvento.startsWith("feriado_")
      }));

    return {
      exibirPopup: eventos.length > 0,
      dataReferencia: data,
      titulo: "Comemorações de hoje",
      subtitulo: this.formatarDataExtensa(data),
      limiteItens: configuracoes.popupLimiteItens,
      eventos
    };
  }

  async registerPopupView(
    usuarioId: string,
    data: string,
    eventIds: string[] = [],
    acao?: string | null
  ) {
    await this.repository.registrarPopupVisualizacao(
      BigInt(usuarioId),
      data,
      eventIds,
      acao ?? "fechado",
      false
    );
  }

  async dismissForToday(usuarioId: string, data: string) {
    await this.repository.registrarPopupVisualizacao(
      BigInt(usuarioId),
      data,
      [],
      "nao_mostrar_hoje",
      true
    );
  }

  private formatarDataExtensa(dataIso: string) {
    const [ano, mes, dia] = dataIso.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(new Date(ano, mes - 1, dia));
  }
}
