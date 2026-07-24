import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { TtlCache } from "../../../shared/cache/ttl-cache.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { UnidadeAssistencialRepository } from "../../unidades-assistenciais/repositories/unidade-assistencial.repository.js";
import {
  dashboardGeorreferenciamentoBuscaVinculoSchema,
  dashboardGeorreferenciamentoConsultaSchema,
  dashboardGeorreferenciamentoGeocodingSchema,
  dashboardGeorreferenciamentoMarcacaoSchema
} from "../dashboard-georreferenciamento.schema.js";
import {
  GeoEntityType,
  type GeoDetailResponse,
  type GeoLinkSearchItem,
  type GeoMapPoint,
  type GeoPendingGeocodingResponse,
  type GeoPointRecord,
  type GeoQueryFilters,
  type GeoQueryResponse
} from "../dashboard-georreferenciamento.types.js";
import {
  DashboardGeorreferenciamentoRepository,
  type ManualPointRow,
  type PendingAddressRow,
  type TerritorialLocationRow
} from "../repositories/dashboard-georreferenciamento.repository.js";
import { DashboardGeocodingService } from "./dashboard-geocoding.service.js";
import {
  agruparPorBairro,
  aplicarBBox,
  calcularIdade,
  clusterizarMarcadores,
  gerarHeatmap,
  limitarMarcadores,
  resolverEstrategiaConsulta,
  resolverFaixaEtaria,
  resumirIndicadores
} from "../dashboard-georreferenciamento.utils.js";

type AuthUser = {
  id?: string;
  nomeUsuario?: string;
  permissoes?: string[];
  tenant_id?: string;
};

type InternalGeoPoint = Omit<GeoPointRecord, "latitude" | "longitude"> & {
  latitude?: number;
  longitude?: number;
};

type LayerDataset = {
  todos: InternalGeoPoint[];
  geolocalizados: GeoPointRecord[];
};

type ResolvedLocation = {
  latitude?: number;
  longitude?: number;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  regiao?: string;
  enderecoResumo?: string;
};

const labelPorCamada = {
  beneficiarios: "Beneficiário",
  familias: "Família",
  voluntarios: "Voluntário",
  profissionais: "Profissional",
  instituicoes: "Instituição",
  doadores: "Doador",
  pontos_distribuicao: "Ponto de distribuição",
  demandas_territoriais: "Demanda territorial",
  vulnerabilidade: "Vulnerabilidade",
  violencia: "Violência"
} as const;

function normalizarTexto(value?: string | null) {
  return value
    ?.normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim() ?? "";
}

function montarEnderecoResumo(...partes: Array<string | null | undefined>) {
  return partes
    .map((item) => item?.trim())
    .filter(Boolean)
    .join(", ");
}

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) return undefined;
  const numero = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numero) ? numero : undefined;
}

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const data = new Date(value);
  return Number.isNaN(data.getTime()) ? String(value) : data.toISOString();
}

function montarRegiao(zona?: string | null, subzona?: string | null, fallback?: string | null) {
  const composto = [zona?.trim(), subzona?.trim()].filter(Boolean).join(" / ");
  return composto || fallback?.trim() || undefined;
}

function possuiCoordenada(item: InternalGeoPoint): item is GeoPointRecord {
  return Number.isFinite(item.latitude) && Number.isFinite(item.longitude);
}

function montarId(entidadeTipo: GeoEntityType, id: bigint | number | string) {
  return `${entidadeTipo}:${String(id)}`;
}

function tenantCondition(alias: string, tenantId: string) {
  return Prisma.sql`${Prisma.raw(alias)}.tenant_id::text = ${tenantId}`;
}

function quebrarIdComposto(id: string) {
  const [entidadeTipo, valor] = id.split(":");
  if (!entidadeTipo || !valor) {
    throw new AppError("Identificador territorial inválido.", 400);
  }

  return {
    entidadeTipo: entidadeTipo as GeoEntityType,
    entidadeId: BigInt(valor)
  };
}

function criarMapaLocalizacoes(localizacoes: TerritorialLocationRow[]) {
  return new Map(
    localizacoes.map((item) => [
      `${item.entidade_tipo}:${item.entidade_id.toString()}`,
      item
    ])
  );
}

function resolverLocalizacao(
  localizacoes: Map<string, TerritorialLocationRow>,
  entidadeTipo: GeoEntityType,
  entidadeId: bigint | string | number,
  fallback: {
    latitude?: number;
    longitude?: number;
    logradouro?: string | null;
    numero?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    uf?: string | null;
    regiao?: string | null;
  }
): ResolvedLocation {
  const chave = `${entidadeTipo}:${String(entidadeId)}`;
  const manual = localizacoes.get(chave);

  const latitude = toNumber(manual?.latitude) ?? fallback.latitude;
  const longitude = toNumber(manual?.longitude) ?? fallback.longitude;
  const logradouro = manual?.logradouro ?? fallback.logradouro ?? undefined;
  const numero = manual?.numero ?? fallback.numero ?? undefined;
  const bairro = manual?.bairro ?? fallback.bairro ?? undefined;
  const cidade = manual?.cidade ?? fallback.cidade ?? undefined;
  const uf = manual?.uf ?? fallback.uf ?? undefined;
  const regiao = manual?.regiao ?? fallback.regiao ?? undefined;

  return {
    latitude,
    longitude,
    logradouro,
    numero,
    bairro,
    cidade,
    uf,
    regiao,
    enderecoResumo: montarEnderecoResumo(logradouro, bairro, cidade, uf) || undefined
  };
}

function filtrarTelefone(telefone: string | null | undefined, authUser?: AuthUser) {
  const podeVer = (authUser?.permissoes ?? []).some((permissao) =>
    ["ADMINISTRADOR", "OPERADOR"].includes(permissao)
  );
  return podeVer ? telefone ?? undefined : undefined;
}

function correspondeLista(valor: string | undefined, filtro: string[]) {
  if (!filtro.length) return true;
  const valorNormalizado = normalizarTexto(valor);
  return filtro.some((item) => {
    const filtroNormalizado = normalizarTexto(item);
    return (
      valorNormalizado === filtroNormalizado ||
      valorNormalizado.includes(filtroNormalizado) ||
      filtroNormalizado.includes(valorNormalizado)
    );
  });
}

function correspondeTermo(item: InternalGeoPoint, termo?: string) {
  if (!termo?.trim()) return true;
  const termoNormalizado = normalizarTexto(termo);
  return [
    item.titulo,
    item.codigo,
    item.subtitulo,
    item.bairro,
    item.cidade,
    item.situacaoResumo,
    item.programaServico
  ].some((valor) => normalizarTexto(valor).includes(termoNormalizado));
}

function correspondePeriodo(data: string | undefined, inicio?: string, fim?: string) {
  if (!inicio && !fim) return true;
  if (!data) return false;
  const valor = data.slice(0, 10);
  if (inicio && valor < inicio) return false;
  if (fim && valor > fim) return false;
  return true;
}

function correspondeFaixaEtaria(
  idade: number | undefined,
  faixaEtaria: InternalGeoPoint["faixaEtaria"],
  filtros: GeoQueryFilters
) {
  if (filtros.idadeExata !== undefined) {
    return idade === filtros.idadeExata;
  }

  if (!filtros.faixaEtaria.length) return true;
  if (!faixaEtaria) return false;
  return filtros.faixaEtaria.includes(faixaEtaria);
}

function aplicarFiltros(item: InternalGeoPoint, filtros: GeoQueryFilters) {
  if (!correspondeLista(item.bairro, filtros.bairro)) return false;
  if (!correspondeLista(item.regiao, filtros.microterritorio)) return false;
  if (!correspondeLista(item.status, filtros.status)) return false;
  if (!correspondeLista(item.sexo, filtros.sexo)) return false;
  if (!correspondeLista(item.unidadeReferencia, filtros.unidadeReferencia)) return false;
  if (!correspondeFaixaEtaria(item.idade, item.faixaEtaria, filtros)) return false;
  if (!correspondeTermo(item, filtros.termo)) return false;

  if (filtros.projetoServico && !normalizarTexto(item.programaServico).includes(normalizarTexto(filtros.projetoServico))) {
    return false;
  }

  if (filtros.situacaoVulnerabilidade.length) {
    if (!item.situacaoResumo) return false;
    const situacaoNormalizada = normalizarTexto(item.situacaoResumo);
    const possui = filtros.situacaoVulnerabilidade.some((valor) =>
      situacaoNormalizada.includes(normalizarTexto(valor))
    );
    if (!possui) return false;
  }

  if (filtros.receberCestaBasica !== undefined && Boolean(item.receberCestaBasica) !== filtros.receberCestaBasica) {
    return false;
  }

  if (filtros.necessidadeCesta !== undefined && Boolean(item.necessidadeCesta) !== filtros.necessidadeCesta) {
    return false;
  }

  if (filtros.ocorrenciaViolencia !== undefined && Boolean(item.ocorrenciaViolencia) !== filtros.ocorrenciaViolencia) {
    return false;
  }

  const dataReferencia =
    filtros.periodoTipo === "atendimento" ? item.dataAtendimento ?? item.dataReferencia : item.dataCadastro ?? item.dataReferencia;
  if (!correspondePeriodo(dataReferencia, filtros.periodoInicio, filtros.periodoFim)) {
    return false;
  }

  return true;
}

function rotaCadastroPorEntidade(entidadeTipo: GeoEntityType) {
  switch (entidadeTipo) {
    case "BENEFICIARIO":
      return "/cadastros/beneficiarios";
    case "FAMILIA":
      return "/cadastros/vinculo-familiar";
    case "PROFISSIONAL":
      return "/cadastros/profissionais";
    case "VOLUNTARIO":
      return "/cadastros/voluntariado";
    case "INSTITUICAO":
      return "/cadastros/unidades-assistenciais";
    default:
      return undefined;
  }
}

function formatarDataCurta(data?: string) {
  if (!data) return undefined;
  const iso = data.slice(0, 10);
  const [ano, mes, dia] = iso.split("-");
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

function montarHistoricoResumo(ponto: InternalGeoPoint) {
  const dataAtualizacao = formatarDataCurta(ponto.dataReferencia);
  const partes = [
    ponto.status ? `Status: ${ponto.status}` : undefined,
    ponto.programaServico ? `Programa/serviço: ${ponto.programaServico}` : undefined,
    ponto.situacaoResumo ? `Situação: ${ponto.situacaoResumo}` : undefined,
    dataAtualizacao ? `Atualizado em ${dataAtualizacao}` : undefined
  ].filter(Boolean);

  return partes.length ? partes.join(" | ") : undefined;
}

function montarDetalheTerritorial(ponto: InternalGeoPoint): GeoDetailResponse {
  return {
    id: ponto.id,
    camada: ponto.camada,
    entidadeTipo: ponto.entidadeTipo,
    titulo: ponto.titulo,
    codigo: ponto.codigo,
    tipoLabel: ponto.tipoLabel,
    bairro: ponto.bairro,
    cidade: ponto.cidade,
    uf: ponto.uf,
    regiao: ponto.regiao,
    enderecoResumo: ponto.enderecoResumo,
    telefone: ponto.telefone,
    situacaoResumo: ponto.situacaoResumo,
    programaServico: ponto.programaServico,
    unidadeReferencia: ponto.unidadeReferencia,
    historicoResumo: montarHistoricoResumo(ponto),
    status: ponto.status,
    dataReferencia: ponto.dataReferencia,
    latitude: ponto.latitude,
    longitude: ponto.longitude,
    rotaCadastro: rotaCadastroPorEntidade(ponto.entidadeTipo)
  };
}

export class DashboardGeorreferenciamentoService {
  private readonly unidadeRepository = new UnidadeAssistencialRepository();
  private readonly repository = new DashboardGeorreferenciamentoRepository();
  private readonly geocodingService = new DashboardGeocodingService();
  private readonly optionsCache = new TtlCache<Awaited<ReturnType<DashboardGeorreferenciamentoRepository["listarOpcoesFiltros"]>>>(300_000, 4);
  private readonly queryCache = new TtlCache<GeoQueryResponse>(25_000, 16);

  private async filtrarEntidadesPorTenant<T extends { id: bigint }>(
    rows: T[],
    tabela: string,
    tenantId: string
  ) {
    if (!rows.length) return rows;

    const ids = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM ${Prisma.raw(tabela)}
      WHERE tenant_id::text = ${tenantId}
    `);
    const permitidos = new Set(ids.map((item) => item.id.toString()));
    return rows.filter((item) => permitidos.has(item.id.toString()));
  }

  private async filtrarPontosManuaisPorTenant(
    pontos: ManualPointRow[],
    tenantId: string
  ) {
    const tabelas: Partial<Record<GeoEntityType, string>> = {
      BENEFICIARIO: "cadastro_beneficiario",
      FAMILIA: "vinculo_familiar",
      PROFISSIONAL: "cadastro_profissionais",
      VOLUNTARIO: "cadastro_voluntario",
      INSTITUICAO: "unidade_assistencial",
      DOADOR: "doador",
      DISTRIBUICAO: "doacao_realizada"
    };
    const permitidos = new Set<string>();

    for (const [tipo, tabela] of Object.entries(tabelas)) {
      const ids = pontos
        .filter((item) => item.entidade_tipo === tipo && item.entidade_id)
        .map((item) => item.entidade_id as bigint);
      if (!ids.length || !tabela) continue;

      const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        SELECT id
        FROM ${Prisma.raw(tabela)}
        WHERE tenant_id::text = ${tenantId}
          AND id IN (${Prisma.join(ids)})
      `);
      rows.forEach((row) => permitidos.add(`${tipo}:${row.id.toString()}`));
    }

    return pontos.filter((item) =>
      item.entidade_tipo && item.entidade_id
        ? permitidos.has(`${item.entidade_tipo}:${item.entidade_id.toString()}`)
        : false
    );
  }

  private async filtrarLocalizacoesPorTenant(
    localizacoes: TerritorialLocationRow[],
    tenantId: string
  ) {
    const tabelas: Partial<Record<GeoEntityType, string>> = {
      BENEFICIARIO: "cadastro_beneficiario",
      FAMILIA: "vinculo_familiar",
      PROFISSIONAL: "cadastro_profissionais",
      VOLUNTARIO: "cadastro_voluntario",
      INSTITUICAO: "unidade_assistencial",
      DOADOR: "doador",
      DISTRIBUICAO: "doacao_realizada"
    };
    const permitidos = new Set<string>();

    for (const [tipo, tabela] of Object.entries(tabelas)) {
      const ids = localizacoes
        .filter((item) => item.entidade_tipo === tipo)
        .map((item) => item.entidade_id);
      if (!ids.length || !tabela) continue;

      const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        SELECT id
        FROM ${Prisma.raw(tabela)}
        WHERE tenant_id::text = ${tenantId}
          AND id IN (${Prisma.join(ids)})
      `);
      rows.forEach((row) => permitidos.add(`${tipo}:${row.id.toString()}`));
    }

    return localizacoes.filter((item) =>
      permitidos.has(`${item.entidade_tipo}:${item.entidade_id.toString()}`)
    );
  }

  async listarOpcoesFiltros(authUser?: AuthUser) {
    const tenantId = this.parseTenant(authUser);
    return this.optionsCache.getOrSet(`opcoes:${tenantId}`, async () => this.repository.listarOpcoesFiltros(tenantId));
  }

  async consultar(rawInput: unknown, authUser?: AuthUser): Promise<GeoQueryResponse> {
    const filtros = dashboardGeorreferenciamentoConsultaSchema.parse(rawInput);
    const tenantId = this.parseTenant(authUser);
    const cacheKey = JSON.stringify({
      tenantId,
      filtros,
      perfil: [...(authUser?.permissoes ?? [])].sort()
    });

    return this.queryCache.getOrSet(cacheKey, async () => {
      const [unidade, diagnostico, localizacoesAtivas, pontosManuais] = await Promise.all([
        this.unidadeRepository.buscarAtual(tenantId),
        this.repository.buscarDiagnostico(tenantId),
        this.repository.listarLocalizacoesAtivas(),
        filtros.camadas.some((camada) =>
          ["pontos_distribuicao", "demandas_territoriais", "vulnerabilidade", "violencia"].includes(camada)
        )
          ? this.repository.listarPontosManuaisAtivos()
          : Promise.resolve([] as ManualPointRow[])
      ]);

      const pontosManuaisDoTenant = await this.filtrarPontosManuaisPorTenant(pontosManuais, tenantId);
      const localizacoesDoTenant = await this.filtrarLocalizacoesPorTenant(localizacoesAtivas, tenantId);
      const mapaLocalizacoes = criarMapaLocalizacoes(localizacoesDoTenant);
      const precisaBeneficiarios = filtros.camadas.some((camada) =>
        ["beneficiarios", "vulnerabilidade"].includes(camada)
      );
      const precisaFamilias = filtros.camadas.some((camada) =>
        ["familias", "vulnerabilidade"].includes(camada)
      );
      const precisaProfissionais = filtros.camadas.includes("profissionais");
      const precisaVoluntarios = filtros.camadas.includes("voluntarios");
      const precisaInstituicoes = filtros.camadas.includes("instituicoes");
      const precisaDoadores = filtros.camadas.includes("doadores");
      const precisaDistribuicoes = filtros.camadas.includes("pontos_distribuicao");
      const precisaOcorrencias = filtros.camadas.includes("violencia");

      const [
        beneficiarios,
        familias,
        profissionais,
        voluntarios,
        instituicoes,
        doadores,
        distribuicoes,
        ocorrencias
      ] = await Promise.all([
        precisaBeneficiarios
          ? this.carregarBeneficiarios(tenantId)
          : Promise.resolve([] as Awaited<ReturnType<DashboardGeorreferenciamentoService["carregarBeneficiarios"]>>),
        precisaFamilias
          ? this.carregarFamilias(tenantId)
          : Promise.resolve([] as Awaited<ReturnType<DashboardGeorreferenciamentoService["carregarFamilias"]>>),
        precisaProfissionais
          ? this.carregarProfissionais(tenantId)
          : Promise.resolve(
              [] as Awaited<ReturnType<DashboardGeorreferenciamentoService["carregarProfissionais"]>>
            ),
        precisaVoluntarios
          ? this.carregarVoluntarios(tenantId)
          : Promise.resolve(
              [] as Awaited<ReturnType<DashboardGeorreferenciamentoService["carregarVoluntarios"]>>
            ),
        precisaInstituicoes
          ? this.carregarInstituicoes(tenantId)
          : Promise.resolve(
              [] as Awaited<ReturnType<DashboardGeorreferenciamentoService["carregarInstituicoes"]>>
            ),
        precisaDoadores ? this.carregarDoadores(mapaLocalizacoes, authUser, tenantId) : Promise.resolve([]),
        precisaDistribuicoes ? this.carregarDistribuicoes(mapaLocalizacoes, authUser, tenantId) : Promise.resolve([]),
        precisaOcorrencias ? this.carregarOcorrencias(mapaLocalizacoes, authUser, tenantId) : Promise.resolve([])
      ]);

      const dadosCamadasBase: Record<string, InternalGeoPoint[]> = {
        beneficiarios: this.mapearBeneficiarios(beneficiarios, mapaLocalizacoes, authUser),
        familias: this.mapearFamilias(familias, mapaLocalizacoes, authUser),
        profissionais: this.mapearProfissionais(profissionais, mapaLocalizacoes, authUser),
        voluntarios: this.mapearVoluntarios(voluntarios, mapaLocalizacoes, authUser),
        instituicoes: this.mapearInstituicoes(instituicoes, mapaLocalizacoes, authUser),
        doadores: doadores,
        pontos_distribuicao: [
          ...distribuicoes,
          ...this.mapearPontosManuais(pontosManuaisDoTenant, "pontos_distribuicao", authUser)
        ],
        violencia: [...ocorrencias, ...this.mapearPontosManuais(pontosManuaisDoTenant, "violencia", authUser)],
        demandas_territoriais: this.mapearPontosManuais(pontosManuaisDoTenant, "demandas_territoriais", authUser),
        vulnerabilidade: []
      };

      dadosCamadasBase.vulnerabilidade = [
        ...dadosCamadasBase.beneficiarios.filter((item) => Boolean(item.situacaoResumo)),
        ...dadosCamadasBase.familias.filter((item) => Boolean(item.situacaoResumo)),
        ...this.mapearPontosManuais(pontosManuaisDoTenant, "vulnerabilidade", authUser)
      ];

      const camadasSelecionadas = filtros.camadas;
      const datasets = camadasSelecionadas.reduce<Record<string, LayerDataset>>((acc, camada) => {
        const filtrados = (dadosCamadasBase[camada] ?? []).filter((item) => aplicarFiltros(item, filtros));
        const geolocalizados = filtrados.filter(possuiCoordenada);
        const visiveis = aplicarBBox(geolocalizados, filtros.bbox);
        acc[camada] = {
          todos: filtrados,
          geolocalizados: visiveis
        };
        return acc;
      }, {});

      const pontosVisiveis = camadasSelecionadas.flatMap((camada) => datasets[camada]?.geolocalizados ?? []);
      const estrategia = resolverEstrategiaConsulta(filtros.modo, filtros.zoom);
      const resumoCamadas = camadasSelecionadas.map((camada) => ({
        camada,
        total: datasets[camada]?.todos.length ?? 0,
        geolocalizados: (dadosCamadasBase[camada] ?? []).filter((item) => possuiCoordenada(item) && aplicarFiltros(item, filtros)).length,
        visiveis: datasets[camada]?.geolocalizados.length ?? 0
      }));

      const limiteMarcadores = filtros.modo === "marcadores";
      const marcadores =
        filtros.modo === "heatmap" || estrategia === "agregada"
          ? []
          : filtros.modo === "cluster"
            ? clusterizarMarcadores(pontosVisiveis, filtros.zoom)
            : limitarMarcadores(pontosVisiveis, 400).marcadores;

      const agregados = estrategia === "agregada" ? agruparPorBairro(pontosVisiveis) : [];
      const heatmap = filtros.modo === "heatmap" ? gerarHeatmap(pontosVisiveis, filtros.zoom) : [];
      const limiteIndividualAtingido =
        limiteMarcadores && filtros.modo === "marcadores" ? pontosVisiveis.length > marcadores.length : false;

      return {
        estrategia,
        modo: filtros.modo,
        bboxAplicada: filtros.bbox,
        totalEncontrado: camadasSelecionadas.reduce((acc, camada) => acc + (datasets[camada]?.todos.length ?? 0), 0),
        totalGeolocalizado: pontosVisiveis.length,
        limiteIndividualAtingido,
        unidadePrincipal: unidade
          ? {
              id: unidade.id.toString(),
              nome: unidade.nomeFantasia,
              latitude: unidade.endereco?.latitude ? Number(unidade.endereco.latitude) : undefined,
              longitude: unidade.endereco?.longitude ? Number(unidade.endereco.longitude) : undefined,
              cidade: unidade.endereco?.cidade ?? undefined,
              uf: unidade.endereco?.estado ?? undefined
            }
          : null,
        diagnostico: {
          ...diagnostico,
          problemasAtuais: [
            "Famílias antigas dependiam apenas da referência familiar para aparecer no mapa.",
            "Beneficiários não estavam expostos como camada própria na API antiga.",
            "A nova consulta usa filtros, bbox, agregação e cluster antes da renderização."
          ]
        },
        camadasResumo: resumoCamadas,
        marcadores,
        agregados,
        heatmap,
        indicadores: resumirIndicadores(pontosVisiveis)
      };
    });
  }

  async obterDetalhe(idComposto: string, authUser?: AuthUser): Promise<GeoDetailResponse> {
    const tenantId = this.parseTenant(authUser);
    const { entidadeTipo, entidadeId } = quebrarIdComposto(idComposto);
    if (entidadeTipo === "PONTO_MANUAL") {
      const detalhe = await this.repository.montarDetalhePontoManual(entidadeId);
      if (!detalhe || !(await this.pontoManualPertenceAoTenant(entidadeId, tenantId))) {
        throw new AppError("Ponto territorial não encontrado.", 404);
      }
      return detalhe;
    }

    throw new AppError("Detalhe territorial ainda não implementado para esta entidade.", 501);
  }

  async obterDetalheCompleto(
    idComposto: string,
    authUser?: AuthUser
  ): Promise<GeoDetailResponse> {
    const tenantId = this.parseTenant(authUser);
    const { entidadeTipo, entidadeId } = quebrarIdComposto(idComposto);
    if (entidadeTipo === "PONTO_MANUAL") {
      const detalhe = await this.repository.montarDetalhePontoManual(entidadeId);
      if (detalhe && !(await this.pontoManualPertenceAoTenant(entidadeId, tenantId))) {
        throw new AppError("Ponto territorial não encontrado.", 404);
      }
      if (!detalhe) throw new AppError("Ponto territorial nÃ£o encontrado.", 404);
      return detalhe;
    }

    const localizacoesAtivas = await this.repository.listarLocalizacoesAtivas();
    const localizacoesDoTenant = await this.filtrarLocalizacoesPorTenant(localizacoesAtivas, tenantId);
    const mapaLocalizacoes = criarMapaLocalizacoes(localizacoesDoTenant);
    const idProcurado = montarId(entidadeTipo, entidadeId);

    switch (entidadeTipo) {
      case "BENEFICIARIO": {
        const ponto = this
          .mapearBeneficiarios(await this.carregarBeneficiarios(tenantId), mapaLocalizacoes, authUser)
          .find((item) => item.id === idProcurado);
        if (ponto) return montarDetalheTerritorial(ponto);
        break;
      }
      case "FAMILIA": {
        const ponto = this
          .mapearFamilias(await this.carregarFamilias(tenantId), mapaLocalizacoes, authUser)
          .find((item) => item.id === idProcurado);
        if (ponto) return montarDetalheTerritorial(ponto);
        break;
      }
      case "PROFISSIONAL": {
        const ponto = this
          .mapearProfissionais(await this.carregarProfissionais(tenantId), mapaLocalizacoes, authUser)
          .find((item) => item.id === idProcurado);
        if (ponto) return montarDetalheTerritorial(ponto);
        break;
      }
      case "VOLUNTARIO": {
        const ponto = this
          .mapearVoluntarios(await this.carregarVoluntarios(tenantId), mapaLocalizacoes, authUser)
          .find((item) => item.id === idProcurado);
        if (ponto) return montarDetalheTerritorial(ponto);
        break;
      }
      case "INSTITUICAO": {
        const ponto = this
          .mapearInstituicoes(await this.carregarInstituicoes(tenantId), mapaLocalizacoes, authUser)
          .find((item) => item.id === idProcurado);
        if (ponto) return montarDetalheTerritorial(ponto);
        break;
      }
      case "DOADOR": {
        const ponto = (await this.carregarDoadores(mapaLocalizacoes, authUser, tenantId)).find(
          (item) => item.id === idProcurado
        );
        if (ponto) return montarDetalheTerritorial(ponto);
        break;
      }
      case "DISTRIBUICAO": {
        const ponto = (await this.carregarDistribuicoes(mapaLocalizacoes, authUser, tenantId)).find(
          (item) => item.id === idProcurado
        );
        if (ponto) return montarDetalheTerritorial(ponto);
        break;
      }
      case "OCORRENCIA_VIOLENCIA": {
        const ponto = (await this.carregarOcorrencias(mapaLocalizacoes, authUser, tenantId)).find(
          (item) => item.id === idProcurado
        );
        if (ponto) return montarDetalheTerritorial(ponto);
        break;
      }
      default:
        break;
    }

    throw new AppError("Registro territorial nÃ£o encontrado.", 404);
  }

  async buscarVinculos(rawInput: unknown, authUser?: AuthUser): Promise<GeoLinkSearchItem[]> {
    const input = dashboardGeorreferenciamentoBuscaVinculoSchema.parse(rawInput);
    const tenantId = this.parseTenant(authUser);
    const termo = input.termo.trim();
    const resultados: GeoLinkSearchItem[] = [];

    if (input.tipos.includes("BENEFICIARIO")) {
      const like = `%${termo}%`;
      const rows = await prisma.$queryRaw<Array<{ id: bigint; nome_completo: string; codigo: string | null }>>(Prisma.sql`
        SELECT id, nome_completo, codigo
        FROM cadastro_beneficiario
        WHERE tenant_id::text = ${tenantId}
          AND (
            nome_completo ILIKE ${like}
            OR codigo ILIKE ${like}
          )
        ORDER BY nome_completo ASC
        LIMIT 8
      `);
      resultados.push(
        ...rows.map((item) => ({
          entidadeTipo: "BENEFICIARIO" as const,
          id: item.id.toString(),
          titulo: item.nome_completo,
          subtitulo: item.codigo ?? undefined
        }))
      );
    }

    if (input.tipos.includes("FAMILIA")) {
      const like = `%${termo}%`;
      const rows = await prisma.$queryRaw<Array<{ id: bigint; nome_familia: string }>>(Prisma.sql`
        SELECT id, nome_familia
        FROM vinculo_familiar
        WHERE tenant_id::text = ${tenantId}
          AND nome_familia ILIKE ${like}
        ORDER BY nome_familia ASC
        LIMIT 8
      `);
      resultados.push(
        ...rows.map((item) => ({
          entidadeTipo: "FAMILIA" as const,
          id: item.id.toString(),
          titulo: item.nome_familia
        }))
      );
    }

    if (input.tipos.includes("PROFISSIONAL")) {
      const like = `%${termo}%`;
      const rows = await prisma.$queryRaw<Array<{ id: bigint; nome_completo: string; categoria: string | null }>>(Prisma.sql`
        SELECT id, nome_completo, categoria
        FROM cadastro_profissional
        WHERE tenant_id::text = ${tenantId}
          AND nome_completo ILIKE ${like}
        ORDER BY nome_completo ASC
        LIMIT 8
      `);
      resultados.push(
        ...rows.map((item) => ({
          entidadeTipo: "PROFISSIONAL" as const,
          id: item.id.toString(),
          titulo: item.nome_completo,
          subtitulo: item.categoria ?? undefined
        }))
      );
    }

    if (input.tipos.includes("VOLUNTARIO")) {
      const like = `%${termo}%`;
      const rows = await prisma.$queryRaw<Array<{ id: bigint; nome_completo: string; area_interesse: string | null }>>(Prisma.sql`
        SELECT id, nome_completo, area_interesse
        FROM cadastro_voluntario
        WHERE tenant_id::text = ${tenantId}
          AND nome_completo ILIKE ${like}
        ORDER BY nome_completo ASC
        LIMIT 8
      `);
      resultados.push(
        ...rows.map((item) => ({
          entidadeTipo: "VOLUNTARIO" as const,
          id: item.id.toString(),
          titulo: item.nome_completo,
          subtitulo: item.area_interesse ?? undefined
        }))
      );
    }

    if (input.tipos.includes("INSTITUICAO")) {
      const like = `%${termo}%`;
      const rows = await prisma.$queryRaw<Array<{ id: bigint; nome_fantasia: string }>>(Prisma.sql`
        SELECT id, nome_fantasia
        FROM unidade_assistencial
        WHERE tenant_id::text = ${tenantId}
          AND nome_fantasia ILIKE ${like}
        ORDER BY nome_fantasia ASC
        LIMIT 8
      `);
      resultados.push(
        ...rows.map((item) => ({
          entidadeTipo: "INSTITUICAO" as const,
          id: item.id.toString(),
          titulo: item.nome_fantasia
        }))
      );
    }

    if (input.tipos.includes("DOADOR")) {
      const like = `%${termo}%`;
      const rows = await prisma.$queryRaw<Array<{ id: bigint; nome: string; cidade: string | null }>>(Prisma.sql`
        SELECT id, nome, cidade
        FROM doador
        WHERE tenant_id::text = ${tenantId}
          AND nome ILIKE ${like}
        ORDER BY nome ASC
        LIMIT 8
      `);
      resultados.push(
        ...rows.map((item) => ({
          entidadeTipo: "DOADOR" as const,
          id: item.id.toString(),
          titulo: item.nome,
          subtitulo: item.cidade ?? undefined
        }))
      );
    }

    return resultados.slice(0, 20);
  }

  private parseTenant(authUser?: AuthUser) {
    const tenantId = authUser?.tenant_id?.trim();
    if (!tenantId) {
      throw new AppError("Tenant da sessao nao identificado.", 401);
    }
    return tenantId;
  }

  private async pontoManualPertenceAoTenant(
    pontoManualId: bigint,
    tenantId: string
  ) {
    const pontos = await prisma.$queryRaw<Array<{ entidade_tipo: GeoEntityType | null; entidade_id: bigint | null }>>(Prisma.sql`
      SELECT entidade_tipo, entidade_id
      FROM territorial_ponto_manual
      WHERE id = ${pontoManualId}
      LIMIT 1
    `);
    const entidadeTipo = pontos[0]?.entidade_tipo;
    const entidadeId = pontos[0]?.entidade_id;
    const tabelaPorEntidade: Partial<Record<GeoEntityType, string>> = {
      BENEFICIARIO: "cadastro_beneficiario",
      FAMILIA: "vinculo_familiar",
      PROFISSIONAL: "cadastro_profissionais",
      VOLUNTARIO: "cadastro_voluntario",
      INSTITUICAO: "unidade_assistencial",
      DOADOR: "doador",
      DISTRIBUICAO: "doacao_realizada"
    };
    const tabela = entidadeTipo ? tabelaPorEntidade[entidadeTipo] : undefined;
    if (!tabela || !entidadeId) return false;

    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM ${Prisma.raw(tabela)}
      WHERE id = ${entidadeId}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    return rows.length > 0;
  }

  private async entidadePertenceAoTenant(
    entidadeTipo: GeoEntityType,
    entidadeId: string,
    tenantId: string
  ) {
    const tabelaPorEntidade: Partial<Record<GeoEntityType, string>> = {
      BENEFICIARIO: "cadastro_beneficiario",
      FAMILIA: "vinculo_familiar",
      PROFISSIONAL: "cadastro_profissionais",
      VOLUNTARIO: "cadastro_voluntario",
      INSTITUICAO: "unidade_assistencial",
      DOADOR: "doador",
      DISTRIBUICAO: "doacao_realizada"
    };
    const tabela = tabelaPorEntidade[entidadeTipo];
    if (!tabela) return false;

    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM ${Prisma.raw(tabela)}
      WHERE id = ${BigInt(entidadeId)}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    return rows.length > 0;
  }

  async salvarMarcacao(rawInput: unknown, authUser?: AuthUser) {
    const input = dashboardGeorreferenciamentoMarcacaoSchema.parse(rawInput);
    const tenantId = this.parseTenant(authUser);
    if (input.entidadeTipo && input.entidadeId) {
      const pertence = await this.entidadePertenceAoTenant(input.entidadeTipo, input.entidadeId, tenantId);
      if (!pertence) throw new AppError("Entidade territorial não pertence ao tenant autenticado.", 404);
    } else if (input.acao === "PONTO_TERRITORIAL") {
      throw new AppError("Ponto territorial sem entidade vinculada não pode ser criado com segurança nesta versão.", 422);
    }
    const resultado =
      input.acao === "LOCALIZACAO_VINCULADA"
        ? await this.repository.salvarMarcacaoVinculada(input, authUser)
        : await this.repository.criarPontoManual(input, authUser);

    this.queryCache.clear();
    this.optionsCache.clear();
    return resultado;
  }

  async geocodificarPendentes(rawInput: unknown, authUser?: AuthUser): Promise<GeoPendingGeocodingResponse> {
    this.parseTenant(authUser);
    throw new AppError(
      "A geocodificação em lote está temporariamente bloqueada até que as pendências territoriais tenham isolamento por tenant.",
      501
    );

    /* istanbul ignore next */
    const input = dashboardGeorreferenciamentoGeocodingSchema.parse(rawInput);
    const totalAntes = await this.repository.contarPendenciasGeocodificacao();
    const pendencias = await this.repository.listarPendenciasGeocodificacao(input.limite);

    let processados = 0;
    let atualizados = 0;
    let naoEncontrados = 0;
    let falhas = 0;
    const detalhesMap = new Map<string, { processados: number; atualizados: number; naoEncontrados: number }>();

    for (const pendencia of pendencias) {
      processados += 1;
      const chave = pendencia.tipo;
      const detalheAtual = detalhesMap.get(chave) ?? { processados: 0, atualizados: 0, naoEncontrados: 0 };
      detalheAtual.processados += 1;

      const enderecoReferencia = montarEnderecoResumo(
        pendencia.logradouro,
        pendencia.numero,
        pendencia.bairro,
        pendencia.cidade,
        pendencia.uf
      );

      try {
        const coordenadas = await this.geocodingService.geocodificar({
          id: pendencia.endereco_id ?? pendencia.entidade_id,
          cep: pendencia.cep,
          logradouro: pendencia.logradouro,
          numero: pendencia.numero,
          bairro: pendencia.bairro,
          cidade: pendencia.cidade,
          estado: pendencia.uf
        });

        if (!coordenadas) {
          naoEncontrados += 1;
          detalheAtual.naoEncontrados += 1;
          await this.repository.registrarLogGeocoding(
            pendencia.entidade_tipo,
            pendencia.entidade_id,
            pendencia.origem,
            enderecoReferencia,
            "NAO_ENCONTRADO"
          );
          detalhesMap.set(chave, detalheAtual);
          await this.geocodingService.aguardarJanelaRateLimit();
          continue;
        }

        await this.repository.aplicarCoordenadasGeocodificadas(
          pendencia,
          coordenadas!.latitude,
          coordenadas!.longitude,
          authUser
        );
        await this.repository.registrarLogGeocoding(
          pendencia.entidade_tipo,
          pendencia.entidade_id,
          pendencia.origem,
          enderecoReferencia,
          "SUCESSO"
        );
        atualizados += 1;
        detalheAtual.atualizados += 1;
      } catch (error) {
        falhas += 1;
        await this.repository.registrarLogGeocoding(
          pendencia.entidade_tipo,
          pendencia.entidade_id,
          pendencia.origem,
          enderecoReferencia,
          "FALHA",
          String(error)
        );
      }

      detalhesMap.set(chave, detalheAtual);
      await this.geocodingService.aguardarJanelaRateLimit();
    }

    this.queryCache.clear();
    this.optionsCache.clear();

    return {
      processados,
      atualizados,
      naoEncontrados,
      falhas,
      restanteEstimado: Math.max(0, totalAntes - atualizados),
      detalhesPorTipo: [...detalhesMap.entries()].map(([tipo, detalhe]) => ({
        tipo,
        processados: detalhe.processados,
        atualizados: detalhe.atualizados,
        naoEncontrados: detalhe.naoEncontrados
      }))
    };
  }

  private mapearBeneficiarios(
    rows: Awaited<ReturnType<DashboardGeorreferenciamentoService["carregarBeneficiarios"]>>,
    localizacoes: Map<string, TerritorialLocationRow>,
    authUser?: AuthUser
  ): InternalGeoPoint[] {
    return rows.map((item) => {
      const localizacao = resolverLocalizacao(localizacoes, "BENEFICIARIO", item.id, {
        latitude: toNumber(item.endereco?.latitude),
        longitude: toNumber(item.endereco?.longitude),
        logradouro: item.endereco?.logradouro,
        numero: item.endereco?.numero,
        bairro: item.endereco?.bairro,
        cidade: item.endereco?.cidade,
        uf: item.endereco?.estado,
        regiao: montarRegiao(item.endereco?.zona, item.endereco?.subzona)
      });
      const idade = calcularIdade(toIsoDate(item.dataNascimento));
      const telefone = filtrarTelefone(item.contatos[0]?.telefonePrincipal ?? item.contatos[0]?.telefoneSecundario, authUser);
      const situacao = item.situacoesSociais[0]?.situacaoVulnerabilidade ?? undefined;

      return {
        id: montarId("BENEFICIARIO", item.id),
        camada: "beneficiarios",
        entidadeTipo: "BENEFICIARIO",
        titulo: item.nomeSocial ?? item.nomeCompleto,
        codigo: item.codigo ?? undefined,
        subtitulo: situacao ?? item.status ?? undefined,
        tipoLabel: labelPorCamada.beneficiarios,
        bairro: localizacao.bairro,
        cidade: localizacao.cidade,
        uf: localizacao.uf,
        regiao: localizacao.regiao,
        enderecoResumo: localizacao.enderecoResumo,
        telefone,
        situacaoResumo: situacao,
        status: item.status ?? undefined,
        sexo: item.sexoBiologico ?? undefined,
        idade,
        faixaEtaria: resolverFaixaEtaria(idade),
        dataCadastro: toIsoDate(item.criadoEm),
        dataReferencia: toIsoDate(item.atualizadoEm),
        receberCestaBasica: Boolean(item.aptoReceberCestaBasica ?? item.optaReceberCestaBasica),
        necessidadeCesta: Boolean(situacao),
        ocorrenciaViolencia: false,
        latitude: localizacao.latitude,
        longitude: localizacao.longitude
      };
    });
  }

  private async carregarBeneficiarios(tenantId: string) {
    const rows = await prisma.cadastroBeneficiario.findMany({
      orderBy: { nomeCompleto: "asc" },
      select: {
        id: true,
        codigo: true,
        nomeCompleto: true,
        nomeSocial: true,
        dataNascimento: true,
        sexoBiologico: true,
        status: true,
        optaReceberCestaBasica: true,
        aptoReceberCestaBasica: true,
        criadoEm: true,
        atualizadoEm: true,
        endereco: {
          select: {
            logradouro: true,
            numero: true,
            bairro: true,
            cidade: true,
            estado: true,
            zona: true,
            subzona: true,
            latitude: true,
            longitude: true
          }
        },
        contatos: {
          orderBy: { id: "asc" },
          take: 1,
          select: {
            telefonePrincipal: true,
            telefoneSecundario: true
          }
        },
        situacoesSociais: {
          orderBy: { id: "desc" },
          take: 1,
          select: {
            situacaoVulnerabilidade: true
          }
        }
      }
    });
    return this.filtrarEntidadesPorTenant(rows, "cadastro_beneficiario", tenantId);
  }

  private mapearFamilias(
    rows: Awaited<ReturnType<DashboardGeorreferenciamentoService["carregarFamilias"]>>,
    localizacoes: Map<string, TerritorialLocationRow>,
    authUser?: AuthUser
  ): InternalGeoPoint[] {
    return rows.map((item) => {
      const referencia = item.referenciaFamiliar;
      const localizacaoReferencia = referencia
        ? resolverLocalizacao(localizacoes, "BENEFICIARIO", referencia.id, {
            latitude: toNumber(referencia.endereco?.latitude),
            longitude: toNumber(referencia.endereco?.longitude),
            logradouro: referencia.endereco?.logradouro,
            numero: referencia.endereco?.numero,
            bairro: referencia.endereco?.bairro,
            cidade: referencia.endereco?.cidade,
            uf: referencia.endereco?.estado,
            regiao: montarRegiao(referencia.endereco?.zona, referencia.endereco?.subzona)
          })
        : {};

      const localizacao = resolverLocalizacao(localizacoes, "FAMILIA", item.id, {
        latitude: localizacaoReferencia.latitude,
        longitude: localizacaoReferencia.longitude,
        logradouro: item.logradouro ?? localizacaoReferencia.logradouro,
        numero: item.numero ?? localizacaoReferencia.numero,
        bairro: item.bairro ?? localizacaoReferencia.bairro,
        cidade: item.municipio ?? localizacaoReferencia.cidade,
        uf: item.uf ?? localizacaoReferencia.uf,
        regiao: item.zona ?? localizacaoReferencia.regiao
      });

      const idade = calcularIdade(toIsoDate(referencia?.dataNascimento));
      const situacaoResumo =
        item.vulnerabilidadesFamilia ??
        item.situacaoInsegurancaAlimentar ??
        undefined;

      return {
        id: montarId("FAMILIA", item.id),
        camada: "familias",
        entidadeTipo: "FAMILIA",
        titulo: item.nomeFamilia,
        codigo: referencia?.codigo ?? undefined,
        subtitulo: referencia?.nomeCompleto ?? undefined,
        tipoLabel: labelPorCamada.familias,
        bairro: localizacao.bairro,
        cidade: localizacao.cidade,
        uf: localizacao.uf,
        regiao: localizacao.regiao,
        enderecoResumo: localizacao.enderecoResumo,
        telefone: filtrarTelefone(referencia?.contatos[0]?.telefonePrincipal, authUser),
        situacaoResumo,
        status: item.status ?? undefined,
        sexo: referencia?.sexoBiologico ?? undefined,
        idade,
        faixaEtaria: resolverFaixaEtaria(idade),
        dataCadastro: toIsoDate(item.criadoEm),
        dataReferencia: toIsoDate(item.atualizadoEm),
        receberCestaBasica: false,
        necessidadeCesta: Boolean(item.situacaoInsegurancaAlimentar || item.vulnerabilidadesFamilia),
        ocorrenciaViolencia: false,
        latitude: localizacao.latitude,
        longitude: localizacao.longitude
      };
    });
  }

  private async carregarFamilias(tenantId: string) {
    const rows = await prisma.vinculoFamiliar.findMany({
      orderBy: { nomeFamilia: "asc" },
      select: {
        id: true,
        nomeFamilia: true,
        status: true,
        logradouro: true,
        numero: true,
        bairro: true,
        municipio: true,
        uf: true,
        zona: true,
        vulnerabilidadesFamilia: true,
        situacaoInsegurancaAlimentar: true,
        criadoEm: true,
        atualizadoEm: true,
        referenciaFamiliar: {
          select: {
            id: true,
            codigo: true,
            nomeCompleto: true,
            dataNascimento: true,
            sexoBiologico: true,
            contatos: {
              orderBy: { id: "asc" },
              take: 1,
              select: { telefonePrincipal: true }
            },
            endereco: {
              select: {
                logradouro: true,
                numero: true,
                bairro: true,
                cidade: true,
                estado: true,
                zona: true,
                subzona: true,
                latitude: true,
                longitude: true
              }
            }
          }
        }
      }
    });
    return this.filtrarEntidadesPorTenant(rows, "vinculo_familiar", tenantId);
  }

  private mapearProfissionais(
    rows: Awaited<ReturnType<DashboardGeorreferenciamentoService["carregarProfissionais"]>>,
    localizacoes: Map<string, TerritorialLocationRow>,
    authUser?: AuthUser
  ): InternalGeoPoint[] {
    return rows.map((item) => {
      const localizacao = resolverLocalizacao(localizacoes, "PROFISSIONAL", item.id, {
        latitude: toNumber(item.endereco?.latitude),
        longitude: toNumber(item.endereco?.longitude),
        logradouro: item.endereco?.logradouro,
        numero: item.endereco?.numero,
        bairro: item.endereco?.bairro,
        cidade: item.endereco?.cidade,
        uf: item.endereco?.estado,
        regiao: montarRegiao(item.endereco?.zona, item.endereco?.subzona)
      });
      const idade = calcularIdade(toIsoDate(item.dataNascimento));

      return {
        id: montarId("PROFISSIONAL", item.id),
        camada: "profissionais",
        entidadeTipo: "PROFISSIONAL",
        titulo: item.nomeCompleto,
        codigo: item.cpf ?? undefined,
        subtitulo: item.categoria ?? item.especialidade ?? undefined,
        tipoLabel: labelPorCamada.profissionais,
        bairro: localizacao.bairro,
        cidade: localizacao.cidade,
        uf: localizacao.uf,
        regiao: localizacao.regiao,
        enderecoResumo: localizacao.enderecoResumo,
        telefone: filtrarTelefone(item.telefone, authUser),
        situacaoResumo: item.resumo ?? undefined,
        programaServico: item.categoria ?? item.especialidade ?? undefined,
        unidadeReferencia: item.unidade ?? undefined,
        status: item.status ?? undefined,
        sexo: item.sexoBiologico ?? undefined,
        idade,
        faixaEtaria: resolverFaixaEtaria(idade),
        dataCadastro: toIsoDate(item.criadoEm),
        dataReferencia: toIsoDate(item.atualizadoEm),
        receberCestaBasica: false,
        necessidadeCesta: false,
        ocorrenciaViolencia: false,
        latitude: localizacao.latitude,
        longitude: localizacao.longitude
      };
    });
  }

  private async carregarProfissionais(tenantId: string) {
    const rows = await prisma.cadastroProfissional.findMany({
      orderBy: { nomeCompleto: "asc" },
      select: {
        id: true,
        nomeCompleto: true,
        cpf: true,
        categoria: true,
        especialidade: true,
        unidade: true,
        telefone: true,
        dataNascimento: true,
        sexoBiologico: true,
        status: true,
        resumo: true,
        criadoEm: true,
        atualizadoEm: true,
        endereco: {
          select: {
            logradouro: true,
            numero: true,
            bairro: true,
            cidade: true,
            estado: true,
            zona: true,
            subzona: true,
            latitude: true,
            longitude: true
          }
        }
      }
    });
    return this.filtrarEntidadesPorTenant(rows, "cadastro_profissionais", tenantId);
  }

  private mapearVoluntarios(
    rows: Awaited<ReturnType<DashboardGeorreferenciamentoService["carregarVoluntarios"]>>,
    localizacoes: Map<string, TerritorialLocationRow>,
    authUser?: AuthUser
  ): InternalGeoPoint[] {
    return rows.map((item) => {
      const localizacao = resolverLocalizacao(localizacoes, "VOLUNTARIO", item.id, {
        latitude: toNumber(item.endereco?.latitude),
        longitude: toNumber(item.endereco?.longitude),
        logradouro: item.endereco?.logradouro,
        numero: item.endereco?.numero,
        bairro: item.endereco?.bairro,
        cidade: item.endereco?.cidade ?? item.cidade,
        uf: item.endereco?.estado ?? item.estado,
        regiao: montarRegiao(item.endereco?.zona, item.endereco?.subzona)
      });
      const idade = calcularIdade(toIsoDate(item.dataNascimento));

      return {
        id: montarId("VOLUNTARIO", item.id),
        camada: "voluntarios",
        entidadeTipo: "VOLUNTARIO",
        titulo: item.nomeCompleto,
        codigo: item.cpf ?? undefined,
        subtitulo: item.areaInteresse ?? item.profissao ?? undefined,
        tipoLabel: labelPorCamada.voluntarios,
        bairro: localizacao.bairro,
        cidade: localizacao.cidade,
        uf: localizacao.uf,
        regiao: localizacao.regiao,
        enderecoResumo: localizacao.enderecoResumo,
        telefone: filtrarTelefone(item.telefone, authUser),
        programaServico: item.areaInteresse ?? item.profissao ?? undefined,
        status: item.status ?? undefined,
        sexo: item.genero ?? undefined,
        idade,
        faixaEtaria: resolverFaixaEtaria(idade),
        dataCadastro: toIsoDate(item.criadoEm),
        dataReferencia: toIsoDate(item.atualizadoEm),
        receberCestaBasica: false,
        necessidadeCesta: false,
        ocorrenciaViolencia: false,
        latitude: localizacao.latitude,
        longitude: localizacao.longitude
      };
    });
  }

  private async carregarVoluntarios(tenantId: string) {
    const rows = await prisma.cadastroVoluntario.findMany({
      orderBy: { nomeCompleto: "asc" },
      select: {
        id: true,
        nomeCompleto: true,
        cpf: true,
        genero: true,
        profissao: true,
        areaInteresse: true,
        telefone: true,
        dataNascimento: true,
        status: true,
        cidade: true,
        estado: true,
        criadoEm: true,
        atualizadoEm: true,
        endereco: {
          select: {
            logradouro: true,
            numero: true,
            bairro: true,
            cidade: true,
            estado: true,
            zona: true,
            subzona: true,
            latitude: true,
            longitude: true
          }
        }
      }
    });
    return this.filtrarEntidadesPorTenant(rows, "cadastro_voluntario", tenantId);
  }

  private mapearInstituicoes(
    rows: Awaited<ReturnType<DashboardGeorreferenciamentoService["carregarInstituicoes"]>>,
    localizacoes: Map<string, TerritorialLocationRow>,
    authUser?: AuthUser
  ): InternalGeoPoint[] {
    return rows.map((item) => {
      const localizacao = resolverLocalizacao(localizacoes, "INSTITUICAO", item.id, {
        latitude: toNumber(item.endereco?.latitude),
        longitude: toNumber(item.endereco?.longitude),
        logradouro: item.endereco?.logradouro,
        numero: item.endereco?.numero,
        bairro: item.endereco?.bairro,
        cidade: item.endereco?.cidade,
        uf: item.endereco?.estado,
        regiao: montarRegiao(item.endereco?.zona, item.endereco?.subzona)
      });

      return {
        id: montarId("INSTITUICAO", item.id),
        camada: "instituicoes",
        entidadeTipo: "INSTITUICAO",
        titulo: item.nomeFantasia,
        tipoLabel: labelPorCamada.instituicoes,
        bairro: localizacao.bairro,
        cidade: localizacao.cidade,
        uf: localizacao.uf,
        regiao: localizacao.regiao,
        enderecoResumo: localizacao.enderecoResumo,
        telefone: filtrarTelefone(item.telefone, authUser),
        situacaoResumo: item.observacoes ?? undefined,
        unidadeReferencia: item.nomeFantasia,
        dataCadastro: toIsoDate(item.criadoEm),
        dataReferencia: toIsoDate(item.atualizadoEm),
        receberCestaBasica: false,
        necessidadeCesta: false,
        ocorrenciaViolencia: false,
        latitude: localizacao.latitude,
        longitude: localizacao.longitude
      };
    });
  }

  private async carregarInstituicoes(tenantId: string) {
    const rows = await prisma.unidadeAssistencial.findMany({
      orderBy: { nomeFantasia: "asc" },
      select: {
        id: true,
        nomeFantasia: true,
        telefone: true,
        observacoes: true,
        criadoEm: true,
        atualizadoEm: true,
        endereco: {
          select: {
            logradouro: true,
            numero: true,
            bairro: true,
            cidade: true,
            estado: true,
            zona: true,
            subzona: true,
            latitude: true,
            longitude: true
          }
        }
      }
    });
    return this.filtrarEntidadesPorTenant(rows, "unidade_assistencial", tenantId);
  }

  private async carregarDoadores(
    localizacoes: Map<string, TerritorialLocationRow>,
    authUser: AuthUser | undefined,
    tenantId: string
  ): Promise<InternalGeoPoint[]> {
    const rows = await prisma.$queryRaw<
      Array<{
        id: bigint;
        nome: string;
        documento: string | null;
        telefone: string | null;
        email: string | null;
        logradouro: string | null;
        numero: string | null;
        bairro: string | null;
        cidade: string | null;
        uf: string | null;
        observacoes: string | null;
        criado_em: Date | string;
        atualizado_em: Date | string;
      }>
    >(Prisma.sql`
      SELECT
        id,
        nome,
        documento,
        telefone,
        email,
        logradouro,
        numero,
        bairro,
        cidade,
        uf,
        observacoes,
        criado_em,
        atualizado_em
      FROM doador d
      WHERE ${tenantCondition("d", tenantId)}
      ORDER BY nome ASC
    `);

    return rows.map((item) => {
      const localizacao = resolverLocalizacao(localizacoes, "DOADOR", item.id, {
        logradouro: item.logradouro,
        numero: item.numero,
        bairro: item.bairro,
        cidade: item.cidade,
        uf: item.uf
      });

      return {
        id: montarId("DOADOR", item.id),
        camada: "doadores",
        entidadeTipo: "DOADOR",
        titulo: item.nome,
        codigo: item.documento ?? undefined,
        subtitulo: item.email ?? undefined,
        tipoLabel: labelPorCamada.doadores,
        bairro: localizacao.bairro,
        cidade: localizacao.cidade,
        uf: localizacao.uf,
        regiao: localizacao.regiao,
        enderecoResumo: localizacao.enderecoResumo,
        telefone: filtrarTelefone(item.telefone, authUser),
        situacaoResumo: item.observacoes ?? undefined,
        dataCadastro: toIsoDate(item.criado_em),
        dataReferencia: toIsoDate(item.atualizado_em),
        receberCestaBasica: false,
        necessidadeCesta: false,
        ocorrenciaViolencia: false,
        latitude: localizacao.latitude,
        longitude: localizacao.longitude
      };
    });
  }

  private async carregarDistribuicoes(
    localizacoes: Map<string, TerritorialLocationRow>,
    authUser: AuthUser | undefined,
    tenantId: string
  ): Promise<InternalGeoPoint[]> {
    const rows = await prisma.$queryRaw<
      Array<{
        id: bigint;
        beneficiario_id: bigint | null;
        vinculo_familiar_id: bigint | null;
        titulo: string | null;
        referencia: string | null;
        tipo_doacao: string | null;
        situacao: string | null;
        responsavel: string | null;
        observacoes: string | null;
        data_doacao: Date | string | null;
        logradouro: string | null;
        numero: string | null;
        bairro: string | null;
        cidade: string | null;
        uf: string | null;
        zona: string | null;
        subzona: string | null;
        latitude: Prisma.Decimal | number | null;
        longitude: Prisma.Decimal | number | null;
        eh_cesta_basica: boolean;
      }>
    >(Prisma.sql`
      SELECT
        d.id,
        d.beneficiario_id,
        d.vinculo_familiar_id,
        COALESCE(b.nome_completo, vf.nome_familia, 'Distribuição territorial') AS titulo,
        COALESCE(vf.nome_familia, b.nome_completo) AS referencia,
        d.tipo_doacao,
        d.situacao,
        d.responsavel,
        d.observacoes,
        d.data_doacao,
        COALESCE(vf.logradouro, be.logradouro, re.logradouro) AS logradouro,
        COALESCE(vf.numero, be.numero, re.numero) AS numero,
        COALESCE(vf.bairro, be.bairro, re.bairro) AS bairro,
        COALESCE(vf.municipio, be.cidade, re.cidade) AS cidade,
        COALESCE(vf.uf, be.estado, re.estado) AS uf,
        COALESCE(vf.zona, be.zona, re.zona) AS zona,
        COALESCE(be.subzona, re.subzona) AS subzona,
        COALESCE(be.latitude, re.latitude) AS latitude,
        COALESCE(be.longitude, re.longitude) AS longitude,
        (
          d.tipo_doacao ILIKE '%cesta%'
          OR EXISTS (
            SELECT 1
            FROM doacao_realizada_item di
            INNER JOIN almoxarifado_item ai ON ai.id = di.almoxarifado_item_id
            WHERE di.doacao_realizada_id = d.id
              AND ai.descricao ILIKE '%cesta%'
          )
        ) AS eh_cesta_basica
      FROM doacao_realizada d
      LEFT JOIN cadastro_beneficiario b ON b.id = d.beneficiario_id
      LEFT JOIN endereco be ON be.id = b.endereco_id
      LEFT JOIN vinculo_familiar vf ON vf.id = d.vinculo_familiar_id
      LEFT JOIN cadastro_beneficiario ref_b ON ref_b.id = vf.id_referencia_familiar
      LEFT JOIN endereco re ON re.id = ref_b.endereco_id
      WHERE ${tenantCondition("d", tenantId)}
      ORDER BY d.data_doacao DESC, d.id DESC
    `);

    return rows.map((item) => {
      const entidadeTipo = item.vinculo_familiar_id ? "FAMILIA" : "BENEFICIARIO";
      const entidadeId = item.vinculo_familiar_id ?? item.beneficiario_id ?? item.id;
      const localizacao = resolverLocalizacao(localizacoes, entidadeTipo, entidadeId, {
        logradouro: item.logradouro,
        numero: item.numero,
        bairro: item.bairro,
        cidade: item.cidade,
        uf: item.uf,
        regiao: montarRegiao(item.zona, item.subzona),
        latitude: toNumber(item.latitude),
        longitude: toNumber(item.longitude)
      });

      return {
        id: montarId("DISTRIBUICAO", item.id),
        camada: "pontos_distribuicao",
        entidadeTipo: "DISTRIBUICAO",
        titulo: item.titulo ?? "Distribuição",
        subtitulo: item.referencia ?? undefined,
        tipoLabel: labelPorCamada.pontos_distribuicao,
        bairro: localizacao.bairro,
        cidade: localizacao.cidade,
        uf: localizacao.uf,
        regiao: localizacao.regiao,
        enderecoResumo: localizacao.enderecoResumo,
        telefone: undefined,
        situacaoResumo: item.situacao ?? item.responsavel ?? undefined,
        programaServico: item.tipo_doacao ?? undefined,
        dataCadastro: toIsoDate(item.data_doacao),
        dataReferencia: toIsoDate(item.data_doacao),
        receberCestaBasica: item.eh_cesta_basica,
        necessidadeCesta: false,
        ocorrenciaViolencia: false,
        latitude: localizacao.latitude,
        longitude: localizacao.longitude
      };
    });
  }

  private async carregarOcorrencias(
    localizacoes: Map<string, TerritorialLocationRow>,
    _authUser: AuthUser | undefined,
    tenantId: string
  ): Promise<InternalGeoPoint[]> {
    const rows = await prisma.$queryRaw<
      Array<{
        id: bigint;
        beneficiario_id: bigint | null;
        vitima_nome: string | null;
        resumo: string | null;
        data_referencia: string | null;
        logradouro: string | null;
        numero: string | null;
        bairro: string | null;
        cidade: string | null;
        uf: string | null;
        zona: string | null;
        subzona: string | null;
        latitude: Prisma.Decimal | number | null;
        longitude: Prisma.Decimal | number | null;
      }>
    >(Prisma.sql`
      SELECT
        o.id,
        end_b.beneficiario_id,
        o.payload->>'vitimaNome' AS vitima_nome,
        o.payload->>'resumoViolencia' AS resumo,
        o.payload->>'dataPreenchimento' AS data_referencia,
        e.logradouro,
        e.numero,
        COALESCE(e.bairro, o.payload->>'vitimaEnderecoBairro') AS bairro,
        COALESCE(e.cidade, o.payload->>'vitimaEnderecoMunicipio') AS cidade,
        COALESCE(e.estado, o.payload->>'vitimaEnderecoUf') AS uf,
        e.zona,
        e.subzona,
        e.latitude,
        e.longitude
      FROM ocorrencias_crianca o
      LEFT JOIN LATERAL (
        SELECT b.id AS beneficiario_id, b.endereco_id
        FROM cadastro_beneficiario b
        WHERE b.tenant_id::text = ${tenantId}
          AND (lower(trim(coalesce(b.nome_completo, ''))) = lower(trim(coalesce(o.payload->>'vitimaNome', '')))
           OR lower(trim(coalesce(b.nome_social, ''))) = lower(trim(coalesce(o.payload->>'vitimaNome', ''))))
        ORDER BY b.atualizado_em DESC
        LIMIT 1
      ) end_b ON TRUE
      LEFT JOIN endereco e ON e.id = end_b.endereco_id
      WHERE end_b.beneficiario_id IS NOT NULL
      ORDER BY o.id DESC
    `);

    return rows.map((item) => {
      const localizacao =
        item.beneficiario_id
          ? resolverLocalizacao(localizacoes, "BENEFICIARIO", item.beneficiario_id, {
              logradouro: item.logradouro,
              numero: item.numero,
              bairro: item.bairro,
              cidade: item.cidade,
              uf: item.uf,
              regiao: montarRegiao(item.zona, item.subzona),
              latitude: toNumber(item.latitude),
              longitude: toNumber(item.longitude)
            })
          : {
              logradouro: item.logradouro ?? undefined,
              numero: item.numero ?? undefined,
              bairro: item.bairro ?? undefined,
              cidade: item.cidade ?? undefined,
              uf: item.uf ?? undefined,
              regiao: montarRegiao(item.zona, item.subzona),
              enderecoResumo:
                montarEnderecoResumo(item.logradouro, item.bairro, item.cidade, item.uf) || undefined,
              latitude: toNumber(item.latitude),
              longitude: toNumber(item.longitude)
            };

      return {
        id: montarId("OCORRENCIA_VIOLENCIA", item.id),
        camada: "violencia",
        entidadeTipo: "OCORRENCIA_VIOLENCIA",
        titulo: item.vitima_nome ?? "Ocorrência",
        subtitulo: item.resumo ?? undefined,
        tipoLabel: labelPorCamada.violencia,
        bairro: localizacao.bairro,
        cidade: localizacao.cidade,
        uf: localizacao.uf,
        regiao: localizacao.regiao,
        enderecoResumo: localizacao.enderecoResumo,
        situacaoResumo: item.resumo ?? undefined,
        dataCadastro: item.data_referencia ?? undefined,
        dataReferencia: item.data_referencia ?? undefined,
        receberCestaBasica: false,
        necessidadeCesta: false,
        ocorrenciaViolencia: true,
        latitude: localizacao.latitude,
        longitude: localizacao.longitude
      };
    });
  }

  private mapearPontosManuais(
    rows: ManualPointRow[],
    camada: "violencia" | "vulnerabilidade" | "demandas_territoriais" | "pontos_distribuicao",
    authUser?: AuthUser
  ): InternalGeoPoint[] {
    return rows
      .filter((item) => {
        if (camada === "pontos_distribuicao") return item.ponto_distribuicao;
        if (camada === "violencia") return item.ocorrencia_violencia;
        if (camada === "vulnerabilidade") return item.situacao_vulnerabilidade;
        return !item.ponto_distribuicao && !item.ocorrencia_violencia && !item.situacao_vulnerabilidade;
      })
      .map((item) => ({
        id: montarId("PONTO_MANUAL", item.id),
        camada,
        entidadeTipo: item.entidade_tipo ?? "PONTO_MANUAL",
        titulo: item.titulo,
        tipoLabel: labelPorCamada[camada],
        bairro: item.bairro ?? undefined,
        cidade: item.cidade ?? undefined,
        uf: item.uf ?? undefined,
        regiao: item.regiao ?? undefined,
        enderecoResumo:
          montarEnderecoResumo(item.logradouro, item.bairro, item.cidade, item.uf) || undefined,
        telefone: filtrarTelefone(item.telefone, authUser),
        situacaoResumo: item.situacao_resumo ?? item.descricao ?? undefined,
        programaServico: item.programa_servico ?? undefined,
        unidadeReferencia: item.unidade_referencia ?? undefined,
        status: item.status ?? undefined,
        dataCadastro: toIsoDate(item.criado_em),
        dataReferencia: toIsoDate(item.atualizado_em),
        receberCestaBasica: item.ponto_distribuicao,
        necessidadeCesta: item.necessidade_cesta,
        ocorrenciaViolencia: item.ocorrencia_violencia,
        latitude: toNumber(item.latitude),
        longitude: toNumber(item.longitude)
      }));
  }
}
