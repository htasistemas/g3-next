import type { NextFunction, Response } from "express";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { ensureAuthenticated, type AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { ensureLicencaUsoEstrutura } from "../repositories/licenca-uso.repository.js";
import type { LicencaUsoPlano } from "../licenca-uso.types.js";

const ordemPlanos: Record<LicencaUsoPlano, number> = { essencial: 0, profissional: 1, premium: 2, enterprise: 3 };

const rotasPublicas = [
  "/auth",
  "/portais-externos",
  "/portal-inscricoes/publico",
  "/rh/cipa/portal",
  "/configuracoes/licenca-uso/webhook",
  "/configuracoes/licenca-uso/checkout/confirmar-retorno"
];

const rotasEssenciais = [
  "/beneficiarios", "/pessoas", "/familias", "/unidades-assistenciais", "/unidades-atendimento",
  "/profissionais", "/voluntarios", "/arquivos", "/documentos-instituicao", "/reports", "/configuracoes/licenca-uso"
];
const rotasProfissionais = [
  "/agendamentos", "/central-atendimentos", "/matriculas", "/prontuario", "/registro-doacao",
  "/registro-ponto", "/almoxarifado", "/controle-veiculos", "/patrimonios", "/biblioteca", "/dashboard",
  "/senhas", "/emprestimos-eventos", "/fotos-eventos", "/visitas-domiciliares", "/ocorrencias-crianca", "/usuarios"
];
const rotasPremium = [
  "/doacoes-realizadas", "/doacoes-planejadas", "/captacao-recursos", "/transparencias", "/financeiro/prestacao-contas",
  "/planos-trabalho", "/juridico/planos-trabalho", "/termos-fomento", "/juridico/termos-fomento", "/juridico/termos-parceria",
  "/banco-empregos", "/administrativo/projetos", "/educacional", "/rh/contratacao", "/rh/cipa", "/ai", "/carteira-evento"
];

function caminhoApi(request: AuthenticatedRequest) {
  return request.originalUrl.split("?")[0].replace(/^\/api/, "") || "/";
}

function rotaPublica(caminho: string) { return rotasPublicas.some((prefixo) => caminho === prefixo || caminho.startsWith(`${prefixo}/`)); }
export function planoMinimo(caminho: string): LicencaUsoPlano {
  if (rotasEssenciais.some((prefixo) => caminho === prefixo || caminho.startsWith(`${prefixo}/`))) return "essencial";
  if (rotasProfissionais.some((prefixo) => caminho === prefixo || caminho.startsWith(`${prefixo}/`))) return "profissional";
  if (rotasPremium.some((prefixo) => caminho === prefixo || caminho.startsWith(`${prefixo}/`))) return "premium";
  return "enterprise";
}

async function obterPlanoAtual(tenantId: string, planoToken?: string) {
  await ensureLicencaUsoEstrutura();
  const licencas = await prisma.$queryRaw<Array<{ plano_id: string }>>`SELECT plano_id FROM licenca_uso_configuracoes WHERE tenant_id = ${tenantId}::uuid LIMIT 1`;
  const plano = String(licencas[0]?.plano_id ?? planoToken ?? "profissional").toLowerCase();
  return (plano === "avancado" ? "premium" : plano) as LicencaUsoPlano;
}

async function verificarPlano(request: AuthenticatedRequest, _response: Response, next: NextFunction) {
  try {
    if (rotaPublica(caminhoApi(request))) return next();
    const usuario = request.authUser;
    if (!usuario) throw new AppError("Não autenticado.", 401);
    if (usuario.is_superadmin) return next();
    const tenantId = String(usuario.tenant_id ?? "").trim();
    if (!tenantId) throw new AppError("Instituição da sessão não identificada.", 403);
    const atual = await obterPlanoAtual(tenantId, usuario.plano);
    const exigido = planoMinimo(caminhoApi(request));
    if (!(atual in ordemPlanos) || ordemPlanos[atual] < ordemPlanos[exigido]) {
      throw new AppError(`Esta função está disponível a partir do plano ${exigido}. Faça upgrade para continuar.`, 403);
    }
    return next();
  } catch (error) { return next(error); }
}

export function ensurePlanoAcessoPorRota(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  if (rotaPublica(caminhoApi(request))) return next();
  return ensureAuthenticated(request, response, () => void verificarPlano(request, response, next));
}
