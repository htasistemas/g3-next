import { UnidadeAssistencialRepository } from "../../unidades-assistenciais/repositories/unidade-assistencial.repository.js";
import { TtlCache } from "../../../shared/cache/ttl-cache.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { DashboardVulnerabilidadeRepository } from "../repositories/dashboard-vulnerabilidade.repository.js";
import { DashboardGeocodingService } from "./dashboard-geocoding.service.js";

function mapPontos(
  rows: Array<{
    id: bigint;
    nome?: string | null;
    nome_familia?: string | null;
    vitima_nome?: string | null;
    referencia?: string | null;
    referencia_nome?: string | null;
    resumo?: string | null;
    vulnerabilidades?: string | null;
    bairro: string | null;
    cidade: string | null;
    latitude: any;
    longitude: any;
    data_referencia?: Date | string | null;
  }>,
  camada: string
) {
  const pontos = rows.map((item) => ({
    id: item.id.toString(),
    camada,
    titulo: item.nome ?? item.nome_familia ?? item.vitima_nome ?? "Registro",
    subtitulo:
      item.referencia ??
      item.referencia_nome ??
      item.resumo ??
      item.vulnerabilidades ??
      item.bairro ??
      undefined,
    bairro: item.bairro ?? undefined,
    cidade: item.cidade ?? undefined,
    latitude: item.latitude ? Number(item.latitude) : undefined,
    longitude: item.longitude ? Number(item.longitude) : undefined,
    dataReferencia:
      item.data_referencia instanceof Date
        ? item.data_referencia.toISOString()
        : item.data_referencia ?? undefined
  }));

  const geolocalizados = pontos.filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
  return {
    total: pontos.length,
    geolocalizados: geolocalizados.length,
    pendentesGeolocalizacao: pontos.length - geolocalizados.length,
    pontos
  };
}

export class DashboardVulnerabilidadeService {
  private readonly unidadeRepository = new UnidadeAssistencialRepository();
  private readonly repository = new DashboardVulnerabilidadeRepository();
  private readonly geocodingService = new DashboardGeocodingService();
  private readonly cache = new TtlCache<ReturnType<DashboardVulnerabilidadeService["montarMapa"]> extends Promise<infer T> ? T : never>(90_000, 4);

  async obterMapa(rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    return this.cache.getOrSet(`mapa:${tenantId}`, async () => this.montarMapa(tenantId));
  }

  private async montarMapa(tenantId: string) {
    const unidade = await this.unidadeRepository.buscarAtual(tenantId);
    const [cestaBasica, familias, violencia] = await Promise.all([
      this.repository.listarCestaBasica(tenantId),
      this.repository.listarFamiliasCadastradas(tenantId),
      this.repository.listarSituacoesViolencia(tenantId)
    ]);

    return {
      unidadePrincipal: unidade
        ? {
            id: unidade.id.toString(),
            nome: unidade.nomeFantasia,
            cidade: unidade.endereco?.cidade ?? undefined,
            estado: unidade.endereco?.estado ?? undefined,
            latitude: unidade.endereco?.latitude ? Number(unidade.endereco.latitude) : undefined,
            longitude: unidade.endereco?.longitude ? Number(unidade.endereco.longitude) : undefined,
            raioMetros: unidade.raioPontoMetros ?? undefined
          }
        : null,
      camadas: {
        cestaBasica: mapPontos(cestaBasica, "cesta_basica"),
        familiasCadastradas: mapPontos(familias, "familias_cadastradas"),
        situacaoViolencia: mapPontos(violencia, "situacao_violencia")
      },
      sugestoes: [
        {
          id: "inseguranca_alimentar",
          titulo: "Insegurança alimentar",
          descricao: "Mostrar famílias com insegurança alimentar grave ou moderada."
        },
        {
          id: "visitas_domiciliares",
          titulo: "Visitas domiciliares",
          descricao: "Exibir concentração de visitas por território e reincidência."
        },
        {
          id: "renda_critica",
          titulo: "Renda per capita crítica",
          descricao: "Destacar famílias com renda per capita em faixa de risco."
        },
        {
          id: "pcd_idosos",
          titulo: "Pessoas idosas e PCD",
          descricao: "Cruzar presença de idosos e pessoas com deficiência com território."
        }
      ]
    };
  }

  async geocodificarPendentes(limit = 15, rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    const totalAntes = await this.repository.contarEnderecosPendentes(tenantId);
    const enderecos = await this.repository.listarEnderecosPendentes(tenantId, limit);
    let processados = 0;
    let atualizados = 0;
    let naoEncontrados = 0;

    for (const endereco of enderecos) {
      processados += 1;
      const coordenadas = await this.geocodingService.geocodificar(endereco);
      if (!coordenadas) {
        naoEncontrados += 1;
        await this.geocodingService.aguardarJanelaRateLimit();
        continue;
      }

      await this.repository.atualizarCoordenadasEndereco(
        endereco.id,
        coordenadas.latitude,
        coordenadas.longitude
      );
      atualizados += 1;
      await this.geocodingService.aguardarJanelaRateLimit();
    }

    this.cache.clear();

    return {
      processados,
      atualizados,
      naoEncontrados,
      restanteEstimado: Math.max(0, totalAntes - atualizados)
    };
  }

  private parseTenant(rawTenantId?: string) {
    const tenantId = rawTenantId?.trim();
    if (!tenantId) {
      throw new AppError("Tenant da sessao nao identificado.", 401);
    }
    return tenantId;
  }
}
