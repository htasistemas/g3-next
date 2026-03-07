import { BeneficiarioService } from "../../beneficiarios/services/beneficiario.service.js";
import { ReportsRepository } from "../repositories/reports.repository.js";
import { RelatorioTemplatePadrao } from "../templates/relatorio-template-padrao.js";
import { HtmlPdfRenderer } from "./html-pdf-renderer.js";
import { beneficiarioFichaRequestSchema, beneficiarioRelacaoRequestSchema, termoAutorizacaoRequestSchema } from "../reports.schema.js";
export class ReportsService {
    beneficiarioService = new BeneficiarioService();
    repository = new ReportsRepository();
    template = new RelatorioTemplatePadrao();
    renderer = new HtmlPdfRenderer();
    async gerarRelacaoBeneficiarios(rawPayload) {
        const payload = beneficiarioRelacaoRequestSchema.parse(rawPayload);
        const beneficiarios = await this.beneficiarioService.listar({
            nome: payload.nome,
            cpf: payload.cpf,
            codigo: payload.codigo,
            status: payload.status,
            data_nascimento: payload.dataNascimento
        });
        const listaOrdenada = [...beneficiarios].sort((a, b) => {
            const nomeA = (a.nome_completo || "").toLowerCase();
            const nomeB = (b.nome_completo || "").toLowerCase();
            return nomeA.localeCompare(nomeB);
        });
        const rodape = await this.repository.obterInstituicaoRodape();
        const html = this.template.montarHtml({
            titulo: "Relatorio de Beneficiarios",
            subtitulo: payload.usuarioEmissor ? `Emitido por: ${payload.usuarioEmissor}` : undefined,
            descricao: "Relacao de beneficiarios cadastrados no sistema G3 Next.",
            tabela: {
                colunas: [
                    { titulo: "Codigo", largura: "12%" },
                    { titulo: "Nome", largura: "34%" },
                    { titulo: "CPF", largura: "18%" },
                    { titulo: "Nascimento", largura: "16%" },
                    { titulo: "Status", largura: "20%" }
                ],
                linhas: listaOrdenada.map((item) => [
                    item.codigo || "---",
                    item.nome_completo || "---",
                    item.cpf || "---",
                    item.data_nascimento || "---",
                    (item.status || "EM_ANALISE").replaceAll("_", " ")
                ])
            },
            rodape
        });
        const pdf = await this.renderer.render(html, rodape);
        return { html, pdf, filename: "relacao-beneficiarios.pdf" };
    }
    async gerarFichaBeneficiario(rawPayload) {
        const payload = beneficiarioFichaRequestSchema.parse(rawPayload);
        const beneficiario = await this.beneficiarioService.buscarPorId(payload.beneficiarioId);
        const rodape = await this.repository.obterInstituicaoRodape();
        const html = this.template.montarHtml({
            titulo: "Ficha Cadastral de Beneficiario",
            subtitulo: payload.usuarioEmissor ? `Emitido por: ${payload.usuarioEmissor}` : undefined,
            secoes: [
                {
                    titulo: "Identificacao",
                    conteudo: [
                        `Codigo: ${beneficiario.codigo || "---"}`,
                        `Nome completo: ${beneficiario.nome_completo || "---"}`,
                        `Nome social: ${beneficiario.nome_social || "---"}`,
                        `Status: ${(beneficiario.status || "EM_ANALISE").replaceAll("_", " ")}`
                    ].join("\n")
                },
                {
                    titulo: "Documentos",
                    conteudo: [
                        `CPF: ${beneficiario.cpf || "---"}`,
                        `RG: ${beneficiario.rg_numero || "---"}`,
                        `NIS: ${beneficiario.nis || "---"}`,
                        `Cartao SUS: ${beneficiario.cartao_sus || "---"}`
                    ].join("\n")
                },
                {
                    titulo: "Contato e Endereco",
                    conteudo: [
                        `Telefone principal: ${beneficiario.telefone_principal || "---"}`,
                        `Telefone secundario: ${beneficiario.telefone_secundario || "---"}`,
                        `Email: ${beneficiario.email || "---"}`,
                        `Endereco: ${[
                            beneficiario.logradouro,
                            beneficiario.numero,
                            beneficiario.bairro,
                            beneficiario.municipio,
                            beneficiario.uf
                        ]
                            .filter(Boolean)
                            .join(", ") || "---"}`
                    ].join("\n")
                },
                {
                    titulo: "Situacao social e observacoes",
                    conteudo: [
                        `Composicao familiar: ${beneficiario.composicao_familiar || "---"}`,
                        `Vulnerabilidade: ${beneficiario.situacao_vulnerabilidade || "---"}`,
                        `Observacoes: ${beneficiario.observacoes || "---"}`
                    ].join("\n")
                }
            ],
            rodape
        });
        const pdf = await this.renderer.render(html, rodape);
        return { html, pdf, filename: "ficha-beneficiario.pdf" };
    }
    async gerarTermoAutorizacao(rawPayload) {
        const payload = termoAutorizacaoRequestSchema.parse(rawPayload);
        const rodape = await this.repository.obterInstituicaoRodape();
        const html = this.template.montarHtml({
            titulo: "Termo de Autorizacao de Uso de Dados e Imagem",
            subtitulo: payload.issuedBy ? `Emitido por: ${payload.issuedBy}` : undefined,
            secoes: [
                {
                    titulo: "Beneficiario",
                    conteudo: [
                        `Nome: ${payload.beneficiarioNome}`,
                        `RG: ${payload.rg || "---"}`,
                        `CPF: ${payload.cpf || "---"}`,
                        `Endereco: ${payload.enderecoCompleto || "---"}`,
                        `Cidade/UF: ${[payload.cidade, payload.uf].filter(Boolean).join("/") || "---"}`
                    ].join("\n")
                },
                {
                    titulo: "Finalidade",
                    conteudo: [
                        `Dados pessoais: ${payload.finalidadeDados || "Conforme autorizacao institucional."}`,
                        `Uso de imagem: ${payload.finalidadeImagem || "Conforme autorizacao institucional."}`,
                        `Vigencia: ${payload.vigencia || "---"}`
                    ].join("\n")
                },
                {
                    titulo: "Assinatura",
                    conteudo: [
                        `Local: ${payload.localAssinatura || "---"}`,
                        `Data: ${payload.dataAssinatura || "---"}`,
                        `Responsavel: ${payload.responsavelNome || "---"}`,
                        `CPF do responsavel: ${payload.responsavelCpf || "---"}`,
                        `Relacao com beneficiario: ${payload.responsavelRelacao || "---"}`,
                        `Representante institucional: ${payload.representanteNome || "---"}`,
                        `Cargo: ${payload.representanteCargo || "---"}`
                    ].join("\n")
                }
            ],
            rodape
        });
        const pdf = await this.renderer.render(html, rodape);
        return { html, pdf, filename: "termo-autorizacao.pdf" };
    }
}
