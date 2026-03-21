import PDFDocument from "pdfkit";
import { AppError } from "../../../shared/errors/app-error.js";
import {
  centralAtendimentoInputSchema,
  centralAtendimentosBuscaFiltersSchema,
  centralBeneficioInputSchema,
  centralEncaminhamentoInputSchema
} from "../central-atendimentos.schema.js";
import { CentralAtendimentosRepository } from "../repositories/central-atendimentos.repository.js";
import type { CentralRelatorioTipo } from "../central-atendimentos.types.js";

type AuthUser = { id?: string; nome?: string; nomeUsuario?: string };

export class CentralAtendimentosService {
  private readonly repository = new CentralAtendimentosRepository();

  async buscarBeneficiarios(rawFilters: unknown) {
    const filters = centralAtendimentosBuscaFiltersSchema.parse(rawFilters ?? {});
    return this.repository.buscarBeneficiarios(filters);
  }

  async obterVisaoGeral(rawBeneficiarioId: string) {
    return this.repository.obterVisaoGeral(this.parseId(rawBeneficiarioId, "beneficiário"));
  }

  async listarAtendimentos(rawBeneficiarioId: string) {
    return this.repository.listarAtendimentos(this.parseId(rawBeneficiarioId, "beneficiário"));
  }

  async criarAtendimento(rawBeneficiarioId: string, rawInput: unknown, authUser?: AuthUser) {
    return this.repository.criarAtendimento(
      this.parseId(rawBeneficiarioId, "beneficiário"),
      centralAtendimentoInputSchema.parse(rawInput),
      authUser
    );
  }

  async atualizarAtendimento(
    rawBeneficiarioId: string,
    rawAtendimentoId: string,
    rawInput: unknown,
    authUser?: AuthUser
  ) {
    return this.repository.atualizarAtendimento(
      this.parseId(rawAtendimentoId, "atendimento"),
      this.parseId(rawBeneficiarioId, "beneficiário"),
      centralAtendimentoInputSchema.parse(rawInput),
      authUser
    );
  }

  async removerAtendimento(rawBeneficiarioId: string, rawAtendimentoId: string, authUser?: AuthUser) {
    await this.repository.removerAtendimento(
      this.parseId(rawAtendimentoId, "atendimento"),
      this.parseId(rawBeneficiarioId, "beneficiário"),
      authUser
    );
  }

  async listarBeneficios(rawBeneficiarioId: string) {
    return this.repository.listarBeneficios(this.parseId(rawBeneficiarioId, "beneficiário"));
  }

  async criarBeneficio(rawBeneficiarioId: string, rawInput: unknown, authUser?: AuthUser) {
    return this.repository.criarBeneficio(
      this.parseId(rawBeneficiarioId, "beneficiário"),
      centralBeneficioInputSchema.parse(rawInput),
      authUser
    );
  }

  async atualizarBeneficio(
    rawBeneficiarioId: string,
    rawBeneficioId: string,
    rawInput: unknown,
    authUser?: AuthUser
  ) {
    return this.repository.atualizarBeneficio(
      this.parseId(rawBeneficioId, "benefício"),
      this.parseId(rawBeneficiarioId, "beneficiário"),
      centralBeneficioInputSchema.parse(rawInput),
      authUser
    );
  }

  async removerBeneficio(rawBeneficiarioId: string, rawBeneficioId: string, authUser?: AuthUser) {
    await this.repository.removerBeneficio(
      this.parseId(rawBeneficioId, "benefício"),
      this.parseId(rawBeneficiarioId, "beneficiário"),
      authUser
    );
  }

  async listarEncaminhamentos(rawBeneficiarioId: string) {
    return this.repository.listarEncaminhamentos(this.parseId(rawBeneficiarioId, "beneficiário"));
  }

  async criarEncaminhamento(rawBeneficiarioId: string, rawInput: unknown, authUser?: AuthUser) {
    return this.repository.criarEncaminhamento(
      this.parseId(rawBeneficiarioId, "beneficiário"),
      centralEncaminhamentoInputSchema.parse(rawInput),
      authUser
    );
  }

  async atualizarEncaminhamento(
    rawBeneficiarioId: string,
    rawEncaminhamentoId: string,
    rawInput: unknown,
    authUser?: AuthUser
  ) {
    return this.repository.atualizarEncaminhamento(
      this.parseId(rawEncaminhamentoId, "encaminhamento"),
      this.parseId(rawBeneficiarioId, "beneficiário"),
      centralEncaminhamentoInputSchema.parse(rawInput),
      authUser
    );
  }

  async removerEncaminhamento(
    rawBeneficiarioId: string,
    rawEncaminhamentoId: string,
    authUser?: AuthUser
  ) {
    await this.repository.removerEncaminhamento(
      this.parseId(rawEncaminhamentoId, "encaminhamento"),
      this.parseId(rawBeneficiarioId, "beneficiário"),
      authUser
    );
  }

  async listarHistorico(rawBeneficiarioId: string) {
    return this.repository.listarHistorico(this.parseId(rawBeneficiarioId, "beneficiário"));
  }

  async listarCustos(rawBeneficiarioId: string) {
    return this.repository.listarCustos(this.parseId(rawBeneficiarioId, "beneficiário"));
  }

  async listarGrupoFamiliar(rawBeneficiarioId: string) {
    return this.repository.listarGrupoFamiliar(this.parseId(rawBeneficiarioId, "beneficiário"));
  }

  async listarAlertas(rawBeneficiarioId: string) {
    return this.repository.listarAlertas(this.parseId(rawBeneficiarioId, "beneficiário"));
  }

  async gerarRelatorio(rawBeneficiarioId: string, rawTipo: string) {
    const tipo = this.parseTipoRelatorio(rawTipo);
    return this.repository.gerarRelatorio(this.parseId(rawBeneficiarioId, "beneficiário"), tipo);
  }

  async gerarRelatorioPdf(rawBeneficiarioId: string, rawTipo: string) {
    const tipo = this.parseTipoRelatorio(rawTipo);
    const beneficiarioId = this.parseId(rawBeneficiarioId, "beneficiário");
    const visao = await this.repository.obterVisaoGeral(beneficiarioId);
    const relatorio = await this.repository.gerarRelatorio(beneficiarioId, tipo);
    return this.renderizarPdf(visao.beneficiario.nomeCompleto, relatorio, tipo);
  }

  private renderizarPdf(nomeBeneficiario: string, relatorio: any, tipo: CentralRelatorioTipo) {
    const doc = new PDFDocument({ size: "A4", margin: 36 });
    const buffers: Buffer[] = [];

    return new Promise<{ nomeArquivo: string; buffer: Buffer }>((resolve, reject) => {
      doc.on("data", (chunk) => buffers.push(Buffer.from(chunk)));
      doc.on("end", () => {
        resolve({
          nomeArquivo: `Central-atendimentos-${this.slugificar(nomeBeneficiario || "beneficiario")}-${tipo}.pdf`,
          buffer: Buffer.concat(buffers)
        });
      });
      doc.on("error", reject);

      doc.fontSize(18).text("Central de Atendimentos", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor("#475569").text(`Relatório: ${this.nomeRelatorio(tipo)}`, { align: "center" });
      doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, { align: "center" });
      doc.moveDown(1.5);
      doc.fillColor("#0f172a");

      const linhas = this.gerarLinhasRelatorio(relatorio);
      linhas.forEach((linha) => {
        if (linha.tipo === "titulo") {
          doc.moveDown(0.8);
          doc.fontSize(13).fillColor("#0f766e").text(linha.texto);
          doc.moveDown(0.2);
          doc.fillColor("#0f172a");
          return;
        }
        doc.fontSize(10.5).text(linha.texto || "-", {
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right
        });
      });

      doc.end();
    });
  }

  private gerarLinhasRelatorio(relatorio: Record<string, unknown>) {
    const linhas: Array<{ tipo: "titulo" | "texto"; texto: string }> = [];
    const visitar = (valor: unknown, chave?: string) => {
      if (valor === null || valor === undefined || valor === "") return;
      if (Array.isArray(valor)) {
        if (!valor.length) return;
        if (chave) linhas.push({ tipo: "titulo", texto: this.humanizarChave(chave) });
        valor.forEach((item, index) => {
          if (typeof item === "object" && item !== null) {
            linhas.push({ tipo: "texto", texto: `${index + 1}.` });
            visitar(item);
          } else {
            linhas.push({ tipo: "texto", texto: `• ${String(item)}` });
          }
        });
        return;
      }
      if (typeof valor === "object") {
        const entries = Object.entries(valor);
        if (!entries.length) return;
        if (chave) linhas.push({ tipo: "titulo", texto: this.humanizarChave(chave) });
        entries.forEach(([entryKey, entryValue]) => visitar(entryValue, entryKey));
        return;
      }
      const prefixo = chave ? `${this.humanizarChave(chave)}: ` : "";
      linhas.push({ tipo: "texto", texto: `${prefixo}${String(valor)}` });
    };
    visitar(relatorio);
    return linhas;
  }

  private parseTipoRelatorio(rawTipo: string) {
    const tipo = rawTipo.trim() as CentralRelatorioTipo;
    if (!["individual", "familiar", "financeiro-social", "social"].includes(tipo)) {
      throw new AppError("Tipo de relatório inválido.", 400);
    }
    return tipo;
  }

  private parseId(rawId: string, label: string) {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(`Identificador de ${label} inválido.`, 400);
    }
    return BigInt(id);
  }

  private nomeRelatorio(tipo: CentralRelatorioTipo) {
    if (tipo === "financeiro-social") return "Financeiro-social";
    if (tipo === "social") return "Social";
    if (tipo === "familiar") return "Familiar";
    return "Individual";
  }

  private humanizarChave(chave: string) {
    return chave
      .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
      .replaceAll("_", " ")
      .replaceAll("-", " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^./, (letra) => letra.toUpperCase());
  }

  private slugificar(valor: string) {
    return valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  }
}
