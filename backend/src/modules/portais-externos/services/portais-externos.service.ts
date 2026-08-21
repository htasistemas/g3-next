import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { CentralAtendimentosRepository } from "../../central-atendimentos/repositories/central-atendimentos.repository.js";
import { obterBeneficiariosPortalPorCpf } from "../../beneficiarios/repositories/beneficiario.repository.js";
import { ParametrosSistemaService } from "../../configuracoes-gerais/services/parametros-sistema.service.js";
import { storageService } from "../../arquivos/services/storage-instance.js";

export type PortalTipo = "voluntario" | "beneficiario" | "transparencia" | "parceiro";

type IndicadorPortal = {
  label: string;
  valor: string;
};

type CardPortal = {
  titulo: string;
  texto: string;
};

type TimelinePortal = {
  titulo: string;
  detalhe: string;
};

type InstituicaoPortal = {
  id: string;
  tenantId: string;
  nome: string;
  razaoSocial: string;
  cnpj: string;
  slug: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  logoUrl?: string;
};

type AtendimentoPortal = {
  id: string;
  dataHora: string;
  tipoAtendimento: string;
  setor: string;
  profissionalResponsavel: string;
  status?: string;
  resumo: string;
  observacoes?: string;
  retornoPrevisto?: string;
};

type BeneficioPortal = {
  id: string;
  origem?: string;
  data: string;
  tipo: string;
  item: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  origemRecurso?: string;
  projetoPrograma?: string;
  profissionalResponsavel?: string;
  observacoes?: string;
  cienteAlertas?: boolean;
};

type AgendamentoPortal = {
  id: string;
  data: string;
  horaInicial: string;
  horaFinal?: string;
  tipoAtendimento?: string;
  setor?: string;
  profissionalNome?: string;
  sala?: string;
  status?: string;
  prioridade?: string;
  modalidade?: string;
  observacaoCurta?: string;
  documentosPendentes?: boolean;
};

type DocumentoPendentePortal = {
  id: string;
  nome: string;
  tipo?: string;
  numeroDocumento?: string;
  obrigatorio: boolean;
  caminhoArquivo?: string;
  contentType?: string;
};

type InscricaoPortal = {
  id: string;
  nome: string;
  tipo?: string;
  dataInicio?: string;
  dataFinal?: string;
  situacao?: string;
  responsavel?: string;
  local?: string;
  dataInscricao?: string;
};

type EncaminhamentoPortal = {
  id: string;
  data?: string;
  tipo: string;
  destino: string;
  motivo: string;
  retornoEsperado?: string;
  status?: string;
  observacoes?: string;
};

type AlertaPortal = {
  prioridade?: string;
  titulo: string;
  descricao: string;
};

type MembroFamiliaPortal = {
  id: string;
  nomeCompleto: string;
  parentesco?: string;
  responsavelFamiliar?: boolean;
  situacaoCadastral?: string;
  telefone?: string;
};

type GrupoFamiliarPortal = {
  id: string;
  nome: string;
  responsavelFamiliar?: string;
  enderecoPrincipal?: string;
  situacaoFamiliar?: string;
  status?: string;
  membros: MembroFamiliaPortal[];
  custoMes: number;
  custoAno: number;
  custoHistorico: number;
  alertas: string[];
};

type CestaPendentePortal = {
  id: string;
  item: string;
  quantidade: number;
  dataPrevista: string;
  status: string;
  observacoes?: string;
};

type FaltaCursoPortal = {
  id: string;
  curso: string;
  dataAula: string;
  status: string;
  observacao?: string;
};

type PortalPainel = {
  tipo: PortalTipo;
  token?: string;
  instituicao?: InstituicaoPortal;
  instituicoesDisponiveis?: Array<{ slug: string; nome: string; cnpj: string }>;
  instituicoesBeneficiario?: Array<{ tenantId: string; instituicaoId?: string; nome: string; cnpj?: string }>;
  checklistTransparencia?: Array<{
    codigo: string;
    titulo: string;
    status: "PUBLICADO" | "PENDENTE";
    sugestao: string;
  }>;
  parcerias?: Array<{
    id: string;
    numero: string;
    tipo: string;
    orgaoConcedente?: string;
    dataAssinatura?: string;
    objeto?: string;
    valorGlobal: number;
    situacao: string;
  }>;
  tema?: {
    modo: "CLARO" | "ESCURO" | "AUTOMATICO";
    preset?: string;
    paleta: {
      cor_primaria: string;
      cor_secundaria: string;
      cor_destaque: string;
      cor_botao_primario: string;
      cor_link: string;
      cor_elemento_ativo: string;
      background: string;
      foreground: string;
      border: string;
      muted: string;
      card: string;
      dashboard_card: string;
      dashboard_card_soft: string;
      danger: string;
      warning: string;
      success: string;
      info: string;
    };
  };
  pessoa?: {
    id?: string;
    nome?: string;
    documento?: string;
    email?: string;
    telefone?: string;
    dataNascimento?: string;
    idade?: number;
    endereco?: string;
    bairro?: string;
    familiaNome?: string;
    situacaoCadastral?: string;
    tenantId?: string;
  };
  atendimentos?: AtendimentoPortal[];
  beneficios?: BeneficioPortal[];
  agendamentos?: AgendamentoPortal[];
  documentosPendentes?: DocumentoPendentePortal[];
  inscricoes?: InscricaoPortal[];
  encaminhamentos?: EncaminhamentoPortal[];
  alertas?: AlertaPortal[];
  grupoFamiliar?: GrupoFamiliarPortal | null;
  cestasPendentes?: CestaPendentePortal[];
  faltasCursos?: FaltaCursoPortal[];
  movimentacoes?: Array<Record<string, unknown>>;
  indicadores: IndicadorPortal[];
  cards: CardPortal[];
  linhaDoTempo: TimelinePortal[];
  itens: Array<Record<string, unknown>>;
};

const parametrosSistemaService = new ParametrosSistemaService();
const centralAtendimentosRepository = new CentralAtendimentosRepository();

function normalizarTexto(valor: unknown) {
  return String(valor ?? "").trim();
}

function normalizarEmail(valor: unknown) {
  return normalizarTexto(valor).toLowerCase();
}

function somenteDigitos(valor: unknown) {
  return normalizarTexto(valor).replace(/\D/g, "");
}

function bigintToString(valor: unknown) {
  return typeof valor === "bigint" ? valor.toString() : String(valor ?? "");
}

function formatarValor(valor: unknown) {
  const numero = Number(valor ?? 0);
  if (!Number.isFinite(numero)) return "0";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(numero);
}

function formatarMoeda(valor: unknown) {
  const numero = Number(valor ?? 0);
  if (!Number.isFinite(numero)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numero);
}

function filtroTenant(alias: string, tenantId?: string) {
  return tenantId
    ? Prisma.sql`AND ${Prisma.raw(alias)}.tenant_id::text = ${tenantId}`
    : Prisma.empty;
}

function montarToken(tipo: PortalTipo, id: string, tenantId?: string) {
  return Buffer.from(
    JSON.stringify({
      tipo,
      id,
      tenantId,
      nonce: randomUUID(),
      criadoEm: new Date().toISOString()
    })
  ).toString("base64url");
}

export class PortaisExternosService {
  async obterLogoInstituicao(rawSlug: string) {
    const slug = normalizarTexto(rawSlug).toLowerCase();
    const rows = await prisma.$queryRaw<Array<{ logo_url: string | null; tenant_id: string }>>`
      SELECT i.tenant_id::text, COALESCE(
        (
          SELECT COALESCE(
            NULLIF(TRIM(im.logomarca), ''),
            NULLIF(TRIM(im.logomarca_relatorio), '')
          )
          FROM unidade_assistencial ua
          LEFT JOIN imagens_unidade im ON im.unidade_id = ua.id
          WHERE ua.tenant_id = i.tenant_id
          ORDER BY ua.unidade_principal DESC NULLS LAST, ua.id
          LIMIT 1
        ),
        NULLIF(TRIM(i.logo_url), '')
      ) AS logo_url
      FROM instituicoes i
      WHERE LOWER(i.slug) = ${slug}
        AND LOWER(i.status) = 'ativo'
      LIMIT 1
    `;
    const logoUrl = rows[0]?.logo_url?.trim();
    if (!logoUrl) throw new AppError("Logomarca não cadastrada para esta instituição.", 404);
    if (/^https?:\/\//i.test(logoUrl) || logoUrl.startsWith("data:")) return { url: logoUrl };
    try {
      return await storageService.obterConteudoPorCaminhoBruto(logoUrl);
    } catch (error) {
      try {
        return await storageService.obterConteudoPorCaminhoBruto(`tenants/${rows[0].tenant_id}/${logoUrl}`);
      } catch {
        throw error;
      }
    }
  }

  async acessar(tipo: PortalTipo, input: Record<string, unknown>): Promise<PortalPainel> {
    if (tipo === "transparencia") {
      return this.obterTransparencia(normalizarTexto(input.tenantId));
    }

    const identificador = normalizarTexto(input.identificador);
    const senha = normalizarTexto(input.senha);

    if (!identificador || !senha) {
      throw new AppError("Informe os dados de acesso para entrar no portal.", 400);
    }

    if (tipo === "voluntario") return this.acessarVoluntario(identificador);
    if (tipo === "beneficiario") return this.acessarBeneficiarioFamilia(identificador, senha, normalizarTexto(input.tenantId) || undefined);
    if (tipo === "parceiro") return this.acessarParceiro(identificador);

    throw new AppError("Portal externo nao reconhecido.", 404);
  }

  async obterTransparencia(rawTenantId?: string, rawSlug?: string): Promise<PortalPainel> {
    const slug = normalizarTexto(rawSlug).toLowerCase() || undefined;
    const instituicao = slug
      ? (
          await prisma.$queryRaw<
            Array<{
              id: string;
              tenant_id: string;
              razao_social: string;
              nome_fantasia: string | null;
              cnpj: string;
              slug: string;
              email: string | null;
              telefone: string | null;
              endereco: string | null;
              logo_url: string | null;
              status: string;
            }>
          >`
            SELECT
              i.id::text,
              i.tenant_id::text,
              i.razao_social,
              i.nome_fantasia,
              i.cnpj,
              i.slug,
              i.email,
              i.telefone,
              i.endereco,
              COALESCE(
                i.logo_url,
                (
                  SELECT COALESCE(im.logomarca_relatorio, im.logomarca)
                  FROM unidade_assistencial ua
                  LEFT JOIN imagens_unidade im ON im.unidade_id = ua.id
                  WHERE ua.tenant_id = i.tenant_id
                  ORDER BY ua.unidade_principal DESC NULLS LAST, ua.id
                  LIMIT 1
                )
              ) AS logo_url,
              i.status
            FROM instituicoes i
            WHERE LOWER(i.slug) = ${slug}
              AND LOWER(i.status) = 'ativo'
            LIMIT 1
          `
        )[0]
      : undefined;

    if (slug && !instituicao) {
      throw new AppError("Instituição não encontrada ou não está disponível para consulta pública.", 404);
    }

    const tenantId = instituicao?.tenant_id ?? normalizarTexto(rawTenantId) ?? undefined;
    if (!tenantId) {
      const instituicoes = await prisma.$queryRaw<
        Array<{ slug: string; nome: string; cnpj: string }>
      >`
        SELECT slug, COALESCE(nome_fantasia, razao_social) AS nome, cnpj
        FROM instituicoes
        WHERE LOWER(status) = 'ativo'
        ORDER BY COALESCE(nome_fantasia, razao_social)
      `;
      return {
        tipo: "transparencia" as const,
        instituicoesDisponiveis: instituicoes,
        indicadores: [
          { label: "Projetos publicados", valor: "0" },
          { label: "Documentos públicos", valor: "0" },
          { label: "Recursos prestados", valor: "R$ 0,00" }
        ],
        cards: [],
        linhaDoTempo: [],
        itens: []
      };
    }

    const personalizacao = await parametrosSistemaService.obterPersonalizacao(tenantId);
    const [projetos, prestacoes, documentos, campanhas, unidades, parcerias] = await Promise.all([
      prisma.$queryRaw<Array<{ id: bigint; nome: string; status: string | null; percentual: unknown; publico_alvo: string | null }>>(Prisma.sql`
        SELECT p.id, p.nome, p.status, COALESCE(p.percentual_evolucao, 0) AS percentual, p.publico_alvo
        FROM (
          SELECT
            p.id,
            p.nome,
            p.status,
            p.publico_alvo,
            p.tenant_id,
            CASE
              WHEN COUNT(t.id) = 0 AND p.status = 'CONCLUIDO' THEN 100
              WHEN COUNT(t.id) = 0 THEN 0
              ELSE ROUND((COUNT(t.id) FILTER (WHERE t.status = 'CONCLUIDO')::numeric / NULLIF(COUNT(t.id), 0)::numeric) * 100, 0)
            END AS percentual_evolucao
          FROM projetos p
          LEFT JOIN projeto_tarefas t ON t.projeto_id = p.id AND t.tenant_id = p.tenant_id
          WHERE COALESCE(p.ativo, TRUE) = TRUE
            ${filtroTenant("p", tenantId)}
          GROUP BY p.id, p.nome, p.status, p.publico_alvo, p.tenant_id
          ORDER BY p.updated_at DESC, p.id DESC
          LIMIT 6
        ) p
      `),
      prisma.$queryRaw<Array<{ total_recebido: unknown; total_aplicado: unknown; saldo_disponivel: unknown }>>(Prisma.sql`
        SELECT
          COALESCE(SUM(total_recebido), 0) AS total_recebido,
          COALESCE(SUM(total_aplicado), 0) AS total_aplicado,
          COALESCE(SUM(saldo_disponivel), 0) AS saldo_disponivel
        FROM transparencia t
        WHERE 1 = 1
          ${filtroTenant("t", tenantId)}
      `),
      prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM documentos_instituicao d
        WHERE COALESCE(d.status, 'ATIVO') <> 'EXCLUIDO'
          ${filtroTenant("d", tenantId)}
      `).catch(() => [{ total: 0n }]),
      prisma.$queryRaw<Array<{ total: bigint; arrecadado: unknown }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total, COALESCE(SUM(valor_arrecadado), 0) AS arrecadado
        FROM captacao_campanhas c
        WHERE COALESCE(c.visivel_ao_publico, FALSE) = TRUE
          AND c.deleted_at IS NULL
          ${filtroTenant("c", tenantId)}
      `),
      prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM unidade_assistencial u
        WHERE 1 = 1
          ${filtroTenant("u", tenantId)}
      `),
      prisma
        .$queryRaw<
          Array<{
            id: bigint;
            numero_termo: string;
            tipo_termo: string;
            orgao_concedente: string | null;
            data_assinatura: Date | null;
            descricao_objeto: string | null;
            valor_global: unknown;
            situacao: string;
          }>
        >(Prisma.sql`
          SELECT id, numero_termo, tipo_termo, orgao_concedente, data_assinatura, descricao_objeto, valor_global, situacao
          FROM termo_fomento
          WHERE tenant_id::text = ${tenantId}
          ORDER BY atualizado_em DESC, id DESC
          LIMIT 100
        `)
        .catch(() => [])
    ]);

    const prestacao = prestacoes[0] ?? { total_recebido: 0, total_aplicado: 0, saldo_disponivel: 0 };
    const campanhasResumo = campanhas[0] ?? { total: 0n, arrecadado: 0 };
    const checklistTransparencia: NonNullable<PortalPainel["checklistTransparencia"]> = [
      {
        codigo: "parcerias",
        titulo: "Parcerias celebradas e planos de trabalho",
        status: parcerias.length ? "PUBLICADO" : "PENDENTE",
        sugestao: parcerias.length
          ? "Dados carregados dos termos de fomento cadastrados."
          : "Cadastre o termo de fomento, o instrumento, órgão concedente, objeto, valores e plano de trabalho."
      },
      {
        codigo: "identificacao",
        titulo: "Identificação da organização e CNPJ",
        status: instituicao && instituicao.cnpj ? "PUBLICADO" : "PENDENTE",
        sugestao: "Mantenha razão social, nome fantasia, CNPJ, endereço e canais de contato atualizados no cadastro da instituição."
      },
      {
        codigo: "objeto-resultados",
        titulo: "Objeto, metas, atividades e resultados",
        status: projetos.length ? "PUBLICADO" : "PENDENTE",
        sugestao: projetos.length
          ? "Projetos e evolução das tarefas publicados a partir dos registros do sistema."
          : "Cadastre o projeto, metas, público-alvo, indicadores, evidências e resultados alcançados."
      },
      {
        codigo: "valores-contas",
        titulo: "Valores recebidos, aplicados e prestação de contas",
        status: Number(prestacao.total_recebido ?? 0) > 0 || Number(prestacao.total_aplicado ?? 0) > 0 ? "PUBLICADO" : "PENDENTE",
        sugestao: "Registre recebimentos, despesas, saldo, conciliação bancária e documentos da prestação de contas."
      },
      {
        codigo: "documentos",
        titulo: "Documentos comprobatórios e relatórios",
        status: Number(documentos[0]?.total ?? 0) > 0 ? "PUBLICADO" : "PENDENTE",
        sugestao: "Anexe relatórios de execução, listas de presença, fotos, vídeos, notas e demais evidências permitidas."
      }
    ];

    return {
      tipo: "transparencia",
      instituicao: instituicao
        ? {
            id: instituicao.id,
            tenantId: instituicao.tenant_id,
            nome: instituicao.nome_fantasia || instituicao.razao_social,
            razaoSocial: instituicao.razao_social,
            cnpj: instituicao.cnpj,
            slug: instituicao.slug,
            email: instituicao.email ?? undefined,
            telefone: instituicao.telefone ?? undefined,
            endereco: instituicao.endereco ?? undefined,
            logoUrl: instituicao.logo_url ?? undefined
          }
        : undefined,
      tema: personalizacao.personalizacao,
      checklistTransparencia,
      parcerias: parcerias.map((item) => ({
        id: bigintToString(item.id),
        numero: item.numero_termo,
        tipo: item.tipo_termo,
        orgaoConcedente: item.orgao_concedente ?? undefined,
        dataAssinatura: item.data_assinatura?.toISOString().slice(0, 10),
        objeto: item.descricao_objeto ?? undefined,
        valorGlobal: Number(item.valor_global ?? 0),
        situacao: item.situacao
      })),
      indicadores: [
        { label: "Projetos publicados", valor: formatarValor(projetos.length) },
        { label: "Documentos públicos", valor: formatarValor(documentos[0]?.total ?? 0) },
        { label: "Recursos prestados", valor: formatarMoeda(prestacao.total_aplicado) }
      ],
      cards: [
        { titulo: "Projetos e resultados", texto: `${projetos.length} projeto(s) com informações públicas disponíveis.` },
        { titulo: "Prestação de contas pública", texto: `${formatarMoeda(prestacao.total_recebido)} recebidos e ${formatarMoeda(prestacao.total_aplicado)} aplicados.` },
        { titulo: "Mapa de atuação", texto: `${formatarValor(unidades[0]?.total ?? 0)} unidade(s) cadastrada(s) na base institucional.` }
      ],
      linhaDoTempo: [
        { titulo: "Projetos ativos", detalhe: projetos[0]?.nome ?? "Nenhum projeto publicado até o momento." },
        { titulo: "Campanhas públicas", detalhe: `${formatarValor(campanhasResumo.total)} campanha(s), ${formatarMoeda(campanhasResumo.arrecadado)} arrecadados.` },
        { titulo: "Saldo disponível", detalhe: `${formatarMoeda(prestacao.saldo_disponivel)} em saldo informado na prestação.` }
      ],
      itens: projetos.map((projeto) => ({
        id: bigintToString(projeto.id),
        titulo: projeto.nome,
        subtitulo: projeto.publico_alvo ?? "Projeto institucional",
        status: projeto.status ?? "ATIVO",
        percentual: Number(projeto.percentual ?? 0)
      }))
    };
  }

  private async acessarVoluntario(identificador: string): Promise<PortalPainel> {
    const cpf = somenteDigitos(identificador);
    const email = normalizarEmail(identificador);
    const rows = await prisma.$queryRaw<
      Array<{
        id: bigint;
        tenant_id: string | null;
        nome_completo: string;
        cpf: string | null;
        email: string | null;
        telefone: string | null;
        area_interesse: string | null;
        habilidades: string | null;
        status: string | null;
        disponibilidade_dias: string | null;
        carga_horaria_semanal: string | null;
      }>
    >(Prisma.sql`
      SELECT id, tenant_id::text AS tenant_id, nome_completo, cpf, email, telefone, area_interesse, habilidades, status, disponibilidade_dias, carga_horaria_semanal
      FROM cadastro_voluntario v
      WHERE COALESCE(v.status, 'ATIVO') <> 'INATIVO'
        AND (
          ${cpf || ""} <> '' AND REGEXP_REPLACE(COALESCE(v.cpf, ''), '\\D', '', 'g') = ${cpf}
          OR ${email} <> '' AND LOWER(COALESCE(v.email, '')) = ${email}
        )
      ORDER BY atualizado_em DESC, id DESC
      LIMIT 1
    `);

    const voluntario = rows[0];
    if (!voluntario) throw new AppError("Voluntario nao encontrado para os dados informados.", 404);

    return {
      tipo: "voluntario",
      token: montarToken("voluntario", bigintToString(voluntario.id), voluntario.tenant_id ?? undefined),
      pessoa: {
        id: bigintToString(voluntario.id),
        nome: voluntario.nome_completo,
        documento: voluntario.cpf ?? undefined,
        email: voluntario.email ?? undefined,
        telefone: voluntario.telefone ?? undefined,
        tenantId: voluntario.tenant_id ?? undefined
      },
      indicadores: [
        { label: "Horas registradas", valor: voluntario.carga_horaria_semanal ?? "0h" },
        { label: "Escalas futuras", valor: "0" },
        { label: "Certificados", valor: voluntario.status === "ATIVO" ? "1" : "0" }
      ],
      cards: [
        { titulo: "Oportunidades disponíveis", texto: voluntario.area_interesse ?? "Área de interesse ainda não informada." },
        { titulo: "Escalas e check-in", texto: voluntario.disponibilidade_dias ?? "Disponibilidade ainda não informada." },
        { titulo: "Certificados e termos", texto: voluntario.habilidades ?? "Histórico pronto para receber certificados reais." }
      ],
      linhaDoTempo: [
        { titulo: "Cadastro localizado", detalhe: `Status atual: ${voluntario.status ?? "ATIVO"}.` },
        { titulo: "Disponibilidade", detalhe: voluntario.disponibilidade_dias ?? "Sem disponibilidade registrada." },
        { titulo: "Próximo passo", detalhe: "Escalas e certificados serão exibidos conforme registros do módulo de voluntariado." }
      ],
      itens: []
    };
  }

  private async acessarBeneficiarioFamilia(identificador: string, senha: string, tenantSelecionado?: string): Promise<PortalPainel> {
    const documento = somenteDigitos(identificador);
    if (documento.length !== 11) {
      throw new AppError("Informe um CPF valido para acessar o portal.", 400);
    }

    const registros = await obterBeneficiariosPortalPorCpf(documento);
    if (!registros.length) {
      throw new AppError("Beneficiario nao encontrado para os dados informados.", 404);
    }

    const candidatos = Array.from(
      new Map(
        registros
          .filter((item) => item.tenant_id && (!tenantSelecionado || item.tenant_id === tenantSelecionado))
          .map((item) => [item.tenant_id as string, item])
      ).values()
    );
    const validos = [];
    for (const candidato of candidatos) {
      if (candidato.senha_hash && await bcrypt.compare(senha, candidato.senha_hash)) validos.push(candidato);
    }
    if (!validos.length) {
      throw new AppError("CPF ou senha invalidos para acessar o portal.", 401);
    }

    if (!tenantSelecionado && validos.length > 1) {
      return {
        tipo: "beneficiario",
        instituicoesBeneficiario: validos.map((item) => ({
          tenantId: item.tenant_id as string,
          instituicaoId: item.instituicao_id ?? undefined,
          nome: item.instituicao_nome || "Instituição vinculada",
          cnpj: item.instituicao_cnpj ?? undefined
        })),
        indicadores: [
          { label: "Instituições vinculadas", valor: formatarValor(validos.length) },
          { label: "Atendimentos", valor: "-" },
          { label: "Agendamentos", valor: "-" }
        ],
        cards: [
          { titulo: "Escolha a instituição", texto: "Selecione uma instituição para abrir seu acompanhamento." }
        ],
        linhaDoTempo: [],
        itens: []
      };
    }

    const beneficiario = validos[0];

    const tenantId = beneficiario.tenant_id;
    if (!tenantId) {
      throw new AppError("Tenant do beneficiario nao identificado.", 404);
    }
    const visaoGeral = await centralAtendimentosRepository.obterVisaoGeral(
      beneficiario.beneficiario_id,
      tenantId
    );
    const [agendamentos, documentosPendentes, cestasPendentes, faltasCursos] = await Promise.all([
      this.listarAgendamentosPortal(beneficiario.beneficiario_id, beneficiario.familia_id, tenantId),
      this.listarDocumentosPendentesPortal(beneficiario.beneficiario_id, tenantId),
      this.listarCestasPendentesPortal(beneficiario.beneficiario_id, beneficiario.familia_id, tenantId),
      this.listarFaltasCursosPortal(beneficiario.cpf, beneficiario.nome_completo, tenantId)
    ]);
    const atendimentos = visaoGeral.atendimentos;
    const beneficios = visaoGeral.beneficios.map((item) => ({
      ...item,
      data: item.data ?? ""
    })) as BeneficioPortal[];
    const movimentacoes = visaoGeral.historico;

    return {
      tipo: "beneficiario",
      token: montarToken("beneficiario", bigintToString(beneficiario.beneficiario_id), tenantId),
      tema: (await parametrosSistemaService.obterPersonalizacao(tenantId)).personalizacao,
      pessoa: {
        id: bigintToString(beneficiario.beneficiario_id),
        nome: beneficiario.nome_completo,
        documento: beneficiario.cpf ?? undefined,
        email: beneficiario.email ?? undefined,
        telefone: beneficiario.telefone ?? undefined,
        dataNascimento: visaoGeral.beneficiario.dataNascimento,
        idade: visaoGeral.beneficiario.idade,
        endereco: visaoGeral.beneficiario.endereco,
        bairro: visaoGeral.beneficiario.bairro,
        familiaNome: visaoGeral.beneficiario.familiaNome,
        situacaoCadastral: visaoGeral.beneficiario.situacaoCadastral,
        tenantId
      },
      indicadores: [
        { label: "Atendimentos", valor: formatarValor(atendimentos.length) },
        { label: "Pendências", valor: formatarValor((visaoGeral.alertas?.length ?? 0) + documentosPendentes.length + visaoGeral.encaminhamentos.filter((item: any) => String(item.status ?? "").toLowerCase() !== "concluído").length) },
        { label: "Cestas a retirar", valor: formatarValor(cestasPendentes.length) },
        { label: "Cursos ativos", valor: formatarValor(visaoGeral.inscricoes.length) },
        { label: "Faltas em cursos", valor: formatarValor(faltasCursos.length) }
      ],
      cards: [
        { titulo: "Próximos compromissos", texto: `${formatarValor(agendamentos.filter((item) => String(item.status ?? "").toUpperCase() !== "CANCELADO").length)} compromisso(s) no acompanhamento da família.` },
        { titulo: "Benefícios e cesta básica", texto: cestasPendentes.length ? `${formatarValor(cestasPendentes.length)} cesta(s) aguardando retirada.` : "Nenhuma cesta básica pendente para retirada." },
        { titulo: "Cursos e frequência", texto: `${formatarValor(visaoGeral.inscricoes.length)} curso(s) ativo(s) e ${formatarValor(faltasCursos.length)} falta(s) registrada(s).` },
        { titulo: "Pendências importantes", texto: `${formatarValor(documentosPendentes.length)} documento(s) pendente(s) e ${formatarValor(visaoGeral.encaminhamentos.filter((item: any) => String(item.status ?? "").toLowerCase() !== "concluído").length)} encaminhamento(s) em acompanhamento.` }
      ],
      linhaDoTempo: [
        { titulo: "Cadastro familiar", detalhe: beneficiario.nome_familia ?? "Família ainda não vinculada." },
        { titulo: "Acompanhamento ativo", detalhe: `Beneficiário: ${beneficiario.nome_completo}.` },
        { titulo: "Agenda compartilhada", detalhe: "Compromissos aparecem conforme registros de agendamento." }
      ],
      atendimentos,
      beneficios,
      agendamentos,
      documentosPendentes,
      inscricoes: visaoGeral.inscricoes,
      encaminhamentos: visaoGeral.encaminhamentos,
      alertas: visaoGeral.alertas,
      grupoFamiliar: visaoGeral.grupoFamiliar as GrupoFamiliarPortal | null,
      cestasPendentes,
      faltasCursos,
      movimentacoes,
      itens: []
    };
  }

  private async listarCestasPendentesPortal(
    beneficiarioId: bigint,
    familiaId: bigint | null,
    tenantId: string
  ): Promise<CestaPendentePortal[]> {
    try {
      const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT dp.id, ai.descricao AS item, dp.quantidade, dp.data_prevista, dp.status, dp.observacoes
        FROM doacao_planejada dp
        INNER JOIN almoxarifado_item ai ON ai.id = dp.almoxarifado_item_id
        WHERE dp.tenant_id::text = ${tenantId}
          AND (dp.beneficiario_id = ${beneficiarioId} OR (${familiaId ? Prisma.sql`${familiaId}` : Prisma.sql`NULL`} IS NOT NULL AND dp.vinculo_familiar_id = ${familiaId}))
          AND (LOWER(COALESCE(ai.descricao, '')) LIKE '%cesta%' OR LOWER(COALESCE(dp.observacoes, '')) LIKE '%cesta%')
          AND UPPER(COALESCE(dp.status, '')) NOT IN ('ENTREGUE', 'FINALIZADO', 'CANCELADO')
        ORDER BY dp.data_prevista ASC, dp.id DESC
      `);
      return rows.map((row) => ({
        id: bigintToString(row.id),
        item: String(row.item ?? "Cesta básica"),
        quantidade: Number(row.quantidade ?? 0),
        dataPrevista: row.data_prevista instanceof Date ? row.data_prevista.toISOString().slice(0, 10) : String(row.data_prevista ?? "").slice(0, 10),
        status: String(row.status ?? "Pendente"),
        observacoes: row.observacoes ? String(row.observacoes) : undefined
      }));
    } catch {
      return [];
    }
  }

  private async listarFaltasCursosPortal(cpf: string | null, nomeCompleto: string, tenantId: string): Promise<FaltaCursoPortal[]> {
    try {
      const cpfNormalizado = somenteDigitos(cpf);
      const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT p.id, c.nome AS curso, p.data_aula, p.status, p.observacao
        FROM cursos_atendimentos_presencas p
        INNER JOIN cursos_atendimentos_matriculas m ON m.id = p.matricula_id AND m.tenant_id::text = ${tenantId}
        INNER JOIN cursos_atendimentos c ON c.id = p.curso_id AND c.tenant_id::text = ${tenantId}
        WHERE p.tenant_id::text = ${tenantId}
          AND UPPER(COALESCE(p.status, '')) IN ('FALTA', 'AUSENTE', 'AUSENCIA', 'NAO_COMPARECEU', 'NÃO_COMPARECEU', 'JUSTIFICADO', 'FALTA_JUSTIFICADA')
          AND (${cpfNormalizado} <> '' AND regexp_replace(COALESCE(m.cpf, ''), '\\D', '', 'g') = ${cpfNormalizado}
            OR LOWER(TRIM(COALESCE(m.beneficiario_nome, ''))) = LOWER(TRIM(${nomeCompleto})))
        ORDER BY p.data_aula DESC, p.id DESC
      `);
      return rows.map((row) => ({
        id: bigintToString(row.id),
        curso: String(row.curso ?? "Curso"),
        dataAula: row.data_aula instanceof Date ? row.data_aula.toISOString().slice(0, 10) : String(row.data_aula ?? "").slice(0, 10),
        status: String(row.status ?? "Falta"),
        observacao: row.observacao ? String(row.observacao) : undefined
      }));
    } catch {
      return [];
    }
  }

  private async listarAgendamentosPortal(
    beneficiarioId: bigint,
    familiaId: bigint | null,
    tenantId: string
  ): Promise<AgendamentoPortal[]> {
    const rows = await prisma.$queryRaw<
      Array<{
        id: bigint;
        data_agendamento: Date | string;
        hora_inicial: string;
        hora_final: string | null;
        tipo_atendimento: string | null;
        setor: string | null;
        profissional_nome: string | null;
        sala: string | null;
        status: string | null;
        prioridade: string | null;
        modalidade: string | null;
        observacao_curta: string | null;
        documentos_pendentes: boolean | null;
      }>
    >(Prisma.sql`
      SELECT
        a.id,
        a.data_agendamento,
        a.hora_inicial,
        a.hora_final,
        a.tipo_atendimento,
        a.setor,
        a.profissional_nome,
        a.sala,
        a.status,
        a.prioridade,
        a.modalidade,
        a.observacao_curta,
        a.documentos_pendentes
      FROM agendamento a
      WHERE a.tenant_id::text = ${tenantId}
        AND (
          a.beneficiario_id = ${beneficiarioId}
          OR (${familiaId ? Prisma.sql`${familiaId}` : Prisma.sql`NULL`} IS NOT NULL AND a.familia_id = ${familiaId})
        )
      ORDER BY a.data_agendamento DESC, a.hora_inicial DESC, a.id DESC
    `);

    return rows.map((row) => ({
      id: bigintToString(row.id),
      data: row.data_agendamento instanceof Date
        ? row.data_agendamento.toISOString().slice(0, 10)
        : String(row.data_agendamento).slice(0, 10),
      horaInicial: String(row.hora_inicial ?? ""),
      horaFinal: row.hora_final ? String(row.hora_final).slice(0, 5) : undefined,
      tipoAtendimento: row.tipo_atendimento ? String(row.tipo_atendimento) : undefined,
      setor: row.setor ? String(row.setor) : undefined,
      profissionalNome: row.profissional_nome ? String(row.profissional_nome) : undefined,
      sala: row.sala ? String(row.sala) : undefined,
      status: row.status ? String(row.status) : undefined,
      prioridade: row.prioridade ? String(row.prioridade) : undefined,
      modalidade: row.modalidade ? String(row.modalidade) : undefined,
      observacaoCurta: row.observacao_curta ? String(row.observacao_curta) : undefined,
      documentosPendentes: row.documentos_pendentes ?? undefined
    }));
  }

  private async listarDocumentosPendentesPortal(
    beneficiarioId: bigint,
    tenantId: string
  ): Promise<DocumentoPendentePortal[]> {
    const rows = await prisma.$queryRaw<
      Array<{
        id: bigint;
        nome_documento: string | null;
        tipo_documento: string | null;
        numero_documento: string | null;
        obrigatorio: boolean | null;
        caminho_arquivo: string | null;
        content_type: string | null;
      }>
    >(Prisma.sql`
      SELECT
        d.id,
        d.nome_documento,
        d.tipo_documento,
        d.numero_documento,
        d.obrigatorio,
        d.caminho_arquivo,
        d.content_type
      FROM documentos d
      WHERE d.beneficiario_id = ${beneficiarioId}
        AND d.tenant_id::text = ${tenantId}
        AND COALESCE(d.obrigatorio, FALSE) = TRUE
        AND COALESCE(d.ignorado, FALSE) = FALSE
        AND (d.caminho_arquivo IS NULL OR TRIM(d.caminho_arquivo) = '')
      ORDER BY d.id DESC
    `);

    return rows.map((row) => ({
      id: bigintToString(row.id),
      nome: row.nome_documento ?? row.tipo_documento ?? "Documento",
      tipo: row.tipo_documento ?? undefined,
      numeroDocumento: row.numero_documento ?? undefined,
      obrigatorio: row.obrigatorio ?? true,
      caminhoArquivo: row.caminho_arquivo ?? undefined,
      contentType: row.content_type ?? undefined
    }));
  }

  private async acessarParceiro(identificador: string): Promise<PortalPainel> {
    const termo = `%${identificador}%`;
    const projetos = await prisma.$queryRaw<
      Array<{ id: bigint; tenant_id: string | null; nome: string; status: string | null; fonte_recurso: string | null; percentual: unknown; responsavel: string | null }>
    >(Prisma.sql`
      SELECT
        p.id,
        p.tenant_id::text AS tenant_id,
        p.nome,
        p.status,
        p.fonte_recurso,
        p.responsavel,
        CASE
          WHEN COUNT(t.id) = 0 AND p.status = 'CONCLUIDO' THEN 100
          WHEN COUNT(t.id) = 0 THEN 0
          ELSE ROUND((COUNT(t.id) FILTER (WHERE t.status = 'CONCLUIDO')::numeric / NULLIF(COUNT(t.id), 0)::numeric) * 100, 0)
        END AS percentual
      FROM projetos p
      LEFT JOIN projeto_tarefas t ON t.projeto_id = p.id AND t.tenant_id = p.tenant_id
      WHERE COALESCE(p.ativo, TRUE) = TRUE
        AND (
          COALESCE(p.fonte_recurso, '') ILIKE ${termo}
          OR COALESCE(p.responsavel, '') ILIKE ${termo}
          OR COALESCE(p.nome, '') ILIKE ${termo}
        )
      GROUP BY p.id, p.tenant_id, p.nome, p.status, p.fonte_recurso, p.responsavel
      ORDER BY p.updated_at DESC, p.id DESC
      LIMIT 12
    `);

    if (!projetos.length) throw new AppError("Nenhum projeto de parceiro encontrado para os dados informados.", 404);

    const tenantId = projetos[0]?.tenant_id ?? undefined;
    const media = projetos.reduce((total, item) => total + Number(item.percentual ?? 0), 0) / projetos.length;

    return {
      tipo: "parceiro",
      token: montarToken("parceiro", identificador, tenantId),
      pessoa: {
        nome: identificador,
        email: identificador.includes("@") ? identificador : undefined,
        tenantId
      },
      indicadores: [
        { label: "Projetos apoiados", valor: formatarValor(projetos.length) },
        { label: "Metas acompanhadas", valor: formatarValor(projetos.length) },
        { label: "Relatórios disponíveis", valor: formatarValor(projetos.filter((item) => item.status === "CONCLUIDO").length) }
      ],
      cards: [
        { titulo: "Projetos financiados", texto: `${projetos.length} projeto(s) relacionado(s) ao parceiro.` },
        { titulo: "Relatórios e documentos", texto: `${formatarValor(media)}% de evolução média dos projetos localizados.` },
        { titulo: "Comunicação com a equipe", texto: `Responsável principal: ${projetos[0]?.responsavel ?? "não informado"}.` }
      ],
      linhaDoTempo: projetos.slice(0, 3).map((projeto) => ({
        titulo: projeto.nome,
        detalhe: `${projeto.status ?? "ATIVO"} • ${formatarValor(projeto.percentual)}% de evolução.`
      })),
      itens: projetos.map((projeto) => ({
        id: bigintToString(projeto.id),
        titulo: projeto.nome,
        subtitulo: projeto.fonte_recurso ?? "Fonte de recurso não informada",
        status: projeto.status ?? "ATIVO",
        percentual: Number(projeto.percentual ?? 0)
      }))
    };
  }
}
