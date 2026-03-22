import { Router } from "express";
import { authRoutes } from "../modules/auth/routes/auth.routes.js";
import { beneficiarioRoutes } from "../modules/beneficiarios/routes/beneficiario.routes.js";
import { familiaRoutes } from "../modules/familias/routes/familia.routes.js";
import { emailRoutes } from "../modules/email/routes/email.routes.js";
import {
  ensureAuthenticated,
  ensurePermissions
} from "../modules/auth/middlewares/auth.middleware.js";
import { reportsRoutes } from "../modules/reports/routes/reports.routes.js";
import { unidadeAssistencialRoutes } from "../modules/unidades-assistenciais/routes/unidade-assistencial.routes.js";
import { parametrosSistemaRoutes } from "../modules/configuracoes-gerais/routes/parametros-sistema.routes.js";
import { dashboardRoutes } from "../modules/dashboard/routes/dashboard.routes.js";
import { profissionalRoutes } from "../modules/profissionais/routes/profissional.routes.js";
import { voluntarioRoutes } from "../modules/voluntarios/routes/voluntario.routes.js";
import { usuarioRoutes } from "../modules/usuarios/routes/usuario.routes.js";
import { matriculaRoutes } from "../modules/matriculas/routes/matricula.routes.js";
import { registroDoacaoRoutes } from "../modules/registro-doacao/routes/registro-doacao.routes.js";
import { doacaoRealizadaRoutes } from "../modules/doacoes-realizadas/routes/doacao-realizada.routes.js";
import { doacaoPlanejadaRoutes } from "../modules/doacoes-planejadas/routes/doacao-planejada.routes.js";
import { registroPontoRoutes } from "../modules/registro-ponto/routes/registro-ponto.routes.js";
import { almoxarifadoRoutes } from "../modules/almoxarifado/routes/almoxarifado.routes.js";
import { controleVeiculosRoutes } from "../modules/controle-veiculos/routes/controle-veiculos.routes.js";
import { tarefaAdministrativaRoutes } from "../modules/tarefas-administrativas/routes/tarefa-administrativa.routes.js";
import { lembreteDiarioRoutes } from "../modules/lembretes-diarios/routes/lembrete-diario.routes.js";
import { patrimonioRoutes } from "../modules/patrimonios/routes/patrimonio.routes.js";
import { emprestimosEventosRoutes } from "../modules/emprestimos-eventos/routes/emprestimos-eventos.routes.js";
import { fotosEventosRoutes } from "../modules/fotos-eventos/routes/fotos-eventos.routes.js";
import { documentosInstituicaoRoutes } from "../modules/documentos-instituicao/routes/documentos-instituicao.routes.js";
import { linksExternosRoutes } from "../modules/documentos-instituicao/links-externos.routes.js";
import { oficiosRoutes } from "../modules/oficios/routes/oficios.routes.js";
import { bancoEmpregosRoutes } from "../modules/banco-empregos/routes/banco-empregos.routes.js";
import { bibliotecaRoutes } from "../modules/biblioteca/routes/biblioteca.routes.js";
import { visitasDomiciliaresRoutes } from "../modules/visitas-domiciliares/routes/visitas-domiciliares.routes.js";
import { ocorrenciasCriancaRoutes } from "../modules/ocorrencias-crianca/routes/ocorrencias-crianca.routes.js";
import { senhasRoutes } from "../modules/senhas/routes/senhas.routes.js";
import { planosTrabalhoRoutes } from "../modules/planos-trabalho/routes/planos-trabalho.routes.js";
import { termosFomentoRoutes } from "../modules/termos-fomento/routes/termos-fomento.routes.js";
import { autorizacaoComprasRoutes } from "../modules/autorizacao-compras/routes/autorizacao-compras.routes.js";
import { contabilidadeRoutes } from "../modules/contabilidade/routes/contabilidade.routes.js";
import { transparenciasRoutes } from "../modules/transparencias/routes/transparencias.routes.js";
import { rhContratacaoRoutes } from "../modules/rh-contratacao/routes/rh-contratacao.routes.js";
import { mensagensPersonalizadasRoutes } from "../modules/mensagens-personalizadas/routes/mensagens-personalizadas.routes.js";
import { arquivosRoutes } from "../modules/arquivos/routes/arquivos.routes.js";
import { chamadoTecnicoRoutes } from "../modules/chamados-tecnicos/routes/chamado-tecnico.routes.js";
import { atualizacaoSistemaRoutes } from "../modules/atualizacao-sistema/routes/atualizacao-sistema.routes.js";
import { datasComemorativasRoutes } from "../modules/datas-comemorativas/routes/datas-comemorativas.routes.js";
import { captacaoRecursosRoutes } from "../modules/captacao-recursos/routes/captacao-recursos.routes.js";
import { aiRoutes } from "../modules/ai/routes/ai.routes.js";
import { sementeRoutes } from "../modules/semente/routes/semente.routes.js";
import { centralAtendimentosRoutes } from "../modules/central-atendimentos/routes/central-atendimentos.routes.js";
import { licencaUsoRoutes } from "../modules/licenca-uso/routes/licenca-uso.routes.js";

export const appRoutes = Router();

appRoutes.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "g3-backend-node" });
});

appRoutes.use("/api/auth", authRoutes);
appRoutes.use("/api/ai", ensureAuthenticated, aiRoutes);
appRoutes.use("/api/semente", ensureAuthenticated, sementeRoutes);
appRoutes.use("/api/central-atendimentos", centralAtendimentosRoutes);
appRoutes.use("/api/beneficiarios", beneficiarioRoutes);
appRoutes.use("/api/familias", familiaRoutes);
appRoutes.use("/api/unidades-assistenciais", unidadeAssistencialRoutes);
appRoutes.use("/api/profissionais", profissionalRoutes);
appRoutes.use("/api/voluntarios", voluntarioRoutes);
appRoutes.use("/api/matriculas", matriculaRoutes);
appRoutes.use("/api/registro-doacao", registroDoacaoRoutes);
appRoutes.use("/api/doacoes-realizadas", doacaoRealizadaRoutes);
appRoutes.use("/api/doacoes-planejadas", doacaoPlanejadaRoutes);
appRoutes.use("/api/registro-ponto", registroPontoRoutes);
appRoutes.use("/api/almoxarifado", almoxarifadoRoutes);
appRoutes.use("/api/controle-veiculos", controleVeiculosRoutes);
appRoutes.use("/api/patrimonios", patrimonioRoutes);
appRoutes.use("/api/administrativo/tarefas", tarefaAdministrativaRoutes);
appRoutes.use("/api/lembretes-diarios", lembreteDiarioRoutes);
appRoutes.use("/api/emprestimos-eventos", emprestimosEventosRoutes);
appRoutes.use("/api/fotos-eventos", fotosEventosRoutes);
appRoutes.use("/api/documentos-instituicao", documentosInstituicaoRoutes);
appRoutes.use("/api/links-externos", linksExternosRoutes);
appRoutes.use("/api/oficios", oficiosRoutes);
appRoutes.use("/api/banco-empregos", bancoEmpregosRoutes);
appRoutes.use("/api/biblioteca", bibliotecaRoutes);
appRoutes.use("/api/visitas-domiciliares", visitasDomiciliaresRoutes);
appRoutes.use("/api/ocorrencias-crianca", ocorrenciasCriancaRoutes);
appRoutes.use("/api/senhas", senhasRoutes);
appRoutes.use("/api/planos-trabalho", planosTrabalhoRoutes);
appRoutes.use("/api/juridico/planos-trabalho", planosTrabalhoRoutes);
appRoutes.use("/api/termos-fomento", termosFomentoRoutes);
appRoutes.use("/api/juridico/termos-fomento", termosFomentoRoutes);
appRoutes.use("/api/autorizacao-compras", autorizacaoComprasRoutes);
appRoutes.use("/api/financeiro/autorizacao-compras", autorizacaoComprasRoutes);
appRoutes.use("/api/contabilidade", contabilidadeRoutes);
appRoutes.use("/api/financeiro/contabilidade", contabilidadeRoutes);
appRoutes.use("/api/transparencias", transparenciasRoutes);
appRoutes.use("/api/financeiro/prestacao-contas", transparenciasRoutes);
appRoutes.use("/api/rh/contratacao", rhContratacaoRoutes);
appRoutes.use("/api/arquivos", arquivosRoutes);
appRoutes.use("/api/dashboard", dashboardRoutes);
appRoutes.use("/api/chamados-tecnicos", chamadoTecnicoRoutes);
appRoutes.use("/api/datas-comemorativas", datasComemorativasRoutes);
appRoutes.use("/api/captacao-recursos", captacaoRecursosRoutes);
appRoutes.use("/api/configuracoes/parametros", parametrosSistemaRoutes);
appRoutes.use("/api/configuracoes/licenca-uso", licencaUsoRoutes);
appRoutes.use("/api/configuracoes/atualizar-sistema", atualizacaoSistemaRoutes);
appRoutes.use("/api/usuarios", usuarioRoutes);
appRoutes.use("/api/mensagens-personalizadas", mensagensPersonalizadasRoutes);
appRoutes.use(
  "/api/email",
  ensureAuthenticated,
  ensurePermissions(["ADMINISTRADOR", "OPERADOR"]),
  emailRoutes
);
appRoutes.use(
  "/api/reports",
  ensureAuthenticated,
  ensurePermissions(["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"]),
  reportsRoutes
);
