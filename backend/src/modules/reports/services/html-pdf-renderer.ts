import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { RelatorioHtmlInput } from "../templates/relatorio-template-padrao.js";

type RodapeRender = {
  linha1: string;
  linha2?: string;
  linha3?: string;
};

function mmToPt(mm: number): number {
  return mm * 2.83464567;
}

function toSafeText(value: string | undefined | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function fitTextToWidth(doc: PDFKit.PDFDocument, value: string, maxWidth: number): string {
  const texto = toSafeText(value);
  if (!texto) return "";
  if (doc.widthOfString(texto) <= maxWidth) return texto;

  const sufixo = "...";
  let inicio = 0;
  let fim = texto.length;
  let melhor = 0;

  while (inicio <= fim) {
    const meio = Math.floor((inicio + fim) / 2);
    const candidato = `${texto.slice(0, meio).trimEnd()}${sufixo}`;
    if (doc.widthOfString(candidato) <= maxWidth) {
      melhor = meio;
      inicio = meio + 1;
    } else {
      fim = meio - 1;
    }
  }

  if (melhor <= 0) return sufixo;
  return `${texto.slice(0, melhor).trimEnd()}${sufixo}`;
}

function drawCenteredSingleLine(
  doc: PDFKit.PDFDocument,
  value: string,
  xStart: number,
  availableWidth: number,
  y: number
): void {
  const texto = toSafeText(value);
  if (!texto) return;

  const larguraTexto = doc.widthOfString(texto);
  const x = xStart + Math.max(0, (availableWidth - larguraTexto) / 2);
  doc.text(texto, x, y, { lineBreak: false });
}

export class HtmlPdfRenderer {
  async render(html: string, rodape: RodapeRender, layout?: RelatorioHtmlInput): Promise<Buffer> {
    if (!layout) {
      return this.renderLegado(html, rodape);
    }
    return this.renderEstruturado(layout, rodape);
  }

  private async renderEstruturado(layout: RelatorioHtmlInput, rodape: RodapeRender): Promise<Buffer> {
    const logoBuffer = await this.carregarImagem(layout.cabecalho.logoUrl);
    const fotoBuffer = await this.carregarImagem(layout.fotoUrl);

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: "A4",
        margins: {
          top: mmToPt(20),
          left: mmToPt(20),
          right: mmToPt(20),
          bottom: mmToPt(30)
        },
        bufferPages: true
      });

      const arialPath = path.join("C:", "Windows", "Fonts", "arial.ttf");
      const arialBoldPath = path.join("C:", "Windows", "Fonts", "arialbd.ttf");
      const fonteRegular = fs.existsSync(arialPath) ? arialPath : "Helvetica";
      const fonteNegrito = fs.existsSync(arialBoldPath) ? arialBoldPath : "Helvetica-Bold";
      doc.font(fonteRegular);

      const pageWidth = () => doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const left = () => doc.page.margins.left;
      const right = () => doc.page.width - doc.page.margins.right;
      const alturaRodape = 30;
      const topoRodape = () => doc.page.height - doc.page.margins.bottom - alturaRodape;
      const bottomLimite = () => topoRodape() - 8;

      const garantirEspaco = (alturaNecessaria: number) => {
        if (doc.y + alturaNecessaria <= bottomLimite()) return;
        doc.addPage();
      };

      const desenharCabecalho = () => {
        const topo = doc.page.margins.top;
        const logoBox = mmToPt(22);
        const razaoSocial = toSafeText(layout.cabecalho.razaoSocial);

        const temLogo = !!logoBuffer;
        if (temLogo) {
          try {
            doc.image(logoBuffer, left(), topo + 1, {
              fit: [logoBox, logoBox]
            });
          } catch {
            // Mantem fluxo de geracao mesmo sem logo valida.
          }
        }

        const reservaLateral = temLogo ? logoBox + mmToPt(4) : 0;
        const areaTextoX = left() + reservaLateral;
        const areaTextoW = Math.max(mmToPt(60), pageWidth() - reservaLateral * 2);

        doc.font(fonteNegrito).fontSize(12).fillColor("#111827");
        const alturaRazao = doc.heightOfString(razaoSocial, {
          width: areaTextoW,
          align: "center",
          lineGap: 1
        });

        doc.text(razaoSocial, areaTextoX, topo + mmToPt(1), {
          width: areaTextoW,
          align: "center",
          lineGap: 1
        });

        const metadados = (layout.metadadosTopo ?? [])
          .map((item) => ({ rotulo: toSafeText(item.rotulo), valor: toSafeText(item.valor) }))
          .filter((item) => item.rotulo && item.valor);

        let cursorY = topo + mmToPt(1) + alturaRazao + mmToPt(1.5);
        if (metadados.length) {
          const textoMetadados = metadados
            .map((item) => `${item.rotulo}: ${item.valor}`)
            .join("   |   ");

          doc.font(fonteRegular).fontSize(9).fillColor("#334155");
          const alturaMeta = doc.heightOfString(textoMetadados, {
            width: pageWidth(),
            align: "center"
          });
          doc.text(textoMetadados, left(), cursorY, {
            width: pageWidth(),
            align: "center"
          });
          cursorY += alturaMeta + mmToPt(1.5);
        }

        const baseTopo = Math.max(topo + logoBox, cursorY);
        const primeiraLinhaY = baseTopo + mmToPt(1.5);
        doc
          .moveTo(left(), primeiraLinhaY)
          .lineTo(right(), primeiraLinhaY)
          .lineWidth(1)
          .strokeColor("#111827")
          .stroke();

        const titulo = toSafeText(layout.titulo);
        const tituloY = primeiraLinhaY + mmToPt(2);
        doc.font(fonteNegrito).fontSize(14).fillColor("#111827");
        const alturaTitulo = doc.heightOfString(titulo, {
          width: pageWidth(),
          align: "center"
        });
        doc.text(titulo, left(), tituloY, {
          width: pageWidth(),
          align: "center"
        });

        const segundaLinhaY = tituloY + alturaTitulo + mmToPt(2);

        doc
          .moveTo(left(), segundaLinhaY)
          .lineTo(right(), segundaLinhaY)
          .lineWidth(1)
          .strokeColor("#111827")
          .stroke();

        return segundaLinhaY + mmToPt(3);
      };

      const escreverParagrafo = (texto: string, config?: PDFKit.Mixins.TextOptions) => {
        const valor = toSafeText(texto);
        if (!valor) return;
        doc.font(fonteRegular).fontSize(10).fillColor("#1f2937");
        const altura = doc.heightOfString(valor, { width: pageWidth(), ...(config ?? {}) }) + 2;
        garantirEspaco(altura);
        doc.text(valor, left(), doc.y, { width: pageWidth(), ...(config ?? {}) });
      };

      const desenharBlocos = () => {
        if (!layout.blocos?.length) return;

        let fotoAcoplada = false;

        for (let indice = 0; indice < layout.blocos.length; indice += 1) {
          const bloco = layout.blocos[indice];
          const titulo = toSafeText(bloco.titulo);
          const destaque = !!bloco.destaque;
          const campos = bloco.campos
            .map((campo) => ({ rotulo: toSafeText(campo.rotulo), valor: toSafeText(campo.valor) }))
            .filter((campo) => campo.rotulo && campo.valor);

          if (!titulo || !campos.length) continue;

          const colunas = Math.max(1, Math.min(3, bloco.colunas ?? (destaque ? 2 : 2)));
          const blocoIdentificacao = destaque && indice === 0 && campos.length === 2;
          const acoplarFoto = !!fotoBuffer && !fotoAcoplada && indice === 0;
          const larguraFoto = acoplarFoto ? mmToPt(32) : 0;
          // Foto em proporção fixa 3x4 (retrato), sem esticar ou cortar.
          const alturaFoto = acoplarFoto ? (larguraFoto * 4) / 3 : 0;
          const gapFoto = acoplarFoto ? 8 : 0;
          const larguraBloco = Math.max(mmToPt(80), pageWidth() - larguraFoto - gapFoto);
          const paddingX = destaque ? 8 : 6;
          const gapX = destaque ? 8 : 6;
          const gapY = destaque ? 4 : 3;
          const tituloH = destaque ? 20 : 15;
          const corpoTop = destaque ? 8 : 6;
          const corpoBottom = destaque ? 8 : 6;

          const conteudoW = larguraBloco - paddingX * 2;
          const colunaW = (conteudoW - gapX * (colunas - 1)) / colunas;

          doc.font(fonteRegular).fontSize(destaque ? (blocoIdentificacao ? 9 : 9.5) : 8.5);
          const linhas: Array<Array<{ rotulo: string; valor: string }>> = [];
          for (let i = 0; i < campos.length; i += colunas) {
            linhas.push(campos.slice(i, i + colunas));
          }

          const alturasLinhas = linhas.map((linha, linhaIndex) => {
            if (blocoIdentificacao && linhaIndex === 0 && linha.length === 2) {
              return 20;
            }

            const alturas = linha.map((campo) => {
              const texto = `${campo.rotulo}: ${campo.valor}`;
              return doc.heightOfString(texto, {
                width: Math.max(20, colunaW - 8),
                align: "left"
              }) + (destaque ? 8 : 6);
            });
            return Math.max(destaque ? 18 : 15, ...alturas);
          });

          const alturaConteudo = alturasLinhas.reduce((acc, atual) => acc + atual, 0) +
            gapY * Math.max(0, alturasLinhas.length - 1);
          const alturaBloco = tituloH + corpoTop + alturaConteudo + corpoBottom;
          const alturaCombinada = acoplarFoto ? Math.max(alturaBloco, alturaFoto) : alturaBloco;

          garantirEspaco(alturaCombinada + 4);

          const xBloco = left();
          const yBloco = doc.y;
          const xFoto = xBloco + larguraBloco + gapFoto;

          doc
            .rect(xBloco, yBloco, larguraBloco, alturaBloco)
            .lineWidth(0.8)
            .strokeColor(destaque ? "#22c55e" : "#cbd5e1")
            .fillAndStroke(destaque ? "#f0fdf4" : "#ffffff", destaque ? "#22c55e" : "#cbd5e1");

          doc
            .rect(xBloco, yBloco, larguraBloco, tituloH)
            .lineWidth(0.8)
            .strokeColor(destaque ? "#22c55e" : "#cbd5e1")
            .fillAndStroke(destaque ? "#dcfce7" : "#ecfdf5", destaque ? "#22c55e" : "#cbd5e1");

          doc.font(fonteNegrito).fontSize(destaque ? 10.5 : 9).fillColor("#065f46").text(titulo, xBloco + 7, yBloco + (destaque ? 5 : 4), {
            width: larguraBloco - 14,
            align: "left"
          });

          if (acoplarFoto) {
            doc
              .rect(xFoto, yBloco, larguraFoto, alturaFoto)
              .lineWidth(0.8)
              .strokeColor("#cbd5e1")
              .fillAndStroke("#ffffff", "#cbd5e1");

            const margemFoto = 4;
            const areaImagemLargura = Math.max(20, larguraFoto - margemFoto * 2);
            const areaImagemAltura = Math.max(20, alturaFoto - margemFoto * 2);

            try {
              doc.image(fotoBuffer, xFoto + margemFoto, yBloco + margemFoto, {
                fit: [areaImagemLargura, areaImagemAltura],
                align: "center",
                valign: "center"
              });
            } catch {
              // Mantem o fluxo mesmo sem imagem valida.
            }

            fotoAcoplada = true;
          }

          let yCursor = yBloco + tituloH + corpoTop;
          for (let linhaIndex = 0; linhaIndex < linhas.length; linhaIndex += 1) {
            const linha = linhas[linhaIndex];
            const alturaLinha = alturasLinhas[linhaIndex] ?? 18;
            const usarLayoutIdentificacao = blocoIdentificacao && linhaIndex === 0 && linha.length === 2;
            const larguraNomeIdentificacao = usarLayoutIdentificacao
              ? Math.max(120, (conteudoW - gapX) * 0.76)
              : 0;
            const larguraCodigoIdentificacao = usarLayoutIdentificacao
              ? Math.max(56, conteudoW - larguraNomeIdentificacao - gapX)
              : 0;

            for (let colunaIndex = 0; colunaIndex < linha.length; colunaIndex += 1) {
              const campo = linha[colunaIndex];
              const larguraCampo = usarLayoutIdentificacao
                ? colunaIndex === 0
                  ? larguraNomeIdentificacao
                  : larguraCodigoIdentificacao
                : colunaW;
              const xCampo = usarLayoutIdentificacao
                ? xBloco + paddingX + (colunaIndex === 0 ? 0 : larguraNomeIdentificacao + gapX)
                : xBloco + paddingX + colunaIndex * (colunaW + gapX);
              const textoCampo = `${campo.rotulo}: ${campo.valor}`;
              const larguraTexto = Math.max(20, larguraCampo - 8);
              const textoRender = usarLayoutIdentificacao
                ? fitTextToWidth(doc, textoCampo, larguraTexto)
                : textoCampo;

              doc
                .rect(xCampo, yCursor, larguraCampo, alturaLinha)
                .lineWidth(0.6)
                .strokeColor(destaque ? "#bbf7d0" : "#e2e8f0")
                .fillAndStroke(destaque ? "#f0fdf4" : "#f8fafc", destaque ? "#bbf7d0" : "#e2e8f0");

              doc
                .font(destaque ? fonteNegrito : fonteRegular)
                .fontSize(destaque ? (blocoIdentificacao ? 9.5 : 10.5) : 8.5)
                .fillColor(destaque ? "#065f46" : "#111827")
                .text(textoRender, xCampo + 4, yCursor + 2, {
                width: larguraTexto,
                align: "left",
                lineBreak: !usarLayoutIdentificacao
              });
            }

            yCursor += alturaLinha + gapY;
          }

          doc.y = yBloco + alturaBloco + 4;
        }
      };

      const desenharTabela = () => {
        const tabela = layout.tabela;
        if (!tabela || tabela.colunas.length === 0) return;

        const paddingX = 6;
        const paddingY = 4;
        const totalWidth = pageWidth();
        const larguras = tabela.colunas.map((coluna) => {
          const largura = (coluna.largura ?? "").trim();
          if (largura.endsWith("%")) {
            const percentual = Number(largura.replace("%", ""));
            if (Number.isFinite(percentual) && percentual > 0) {
              return (totalWidth * percentual) / 100;
            }
          }
          return totalWidth / tabela.colunas.length;
        });

        const desenharCabecalhoTabela = () => {
          const titulos = tabela.colunas.map((coluna) => coluna.titulo);
          desenharLinhaTabela(titulos, true);
        };

        const desenharLinhaTabela = (cels: string[], cabecalho = false) => {
          const textos = cels.map((cel) => toSafeText(cel));
          const alturas = textos.map((texto, index) =>
            doc.heightOfString(texto || " ", {
              width: Math.max(20, larguras[index] - paddingX * 2),
              align: "left"
            }) + paddingY * 2
          );
          const alturaLinha = Math.max(18, ...alturas);

          if (doc.y + alturaLinha > bottomLimite()) {
            doc.addPage();
            desenharCabecalhoTabela();
          }

          let cursorX = left();
          const topoLinha = doc.y;

          for (let index = 0; index < larguras.length; index += 1) {
            const largura = larguras[index];
            doc
              .rect(cursorX, topoLinha, largura, alturaLinha)
              .lineWidth(0.6)
              .strokeColor("#cbd5e1")
              .fillAndStroke(cabecalho ? "#f1f5f9" : "#ffffff", "#cbd5e1");

            doc
              .fillColor("#111827")
              .font(cabecalho ? fonteNegrito : fonteRegular)
              .fontSize(cabecalho ? 9 : 10)
              .text(textos[index] || "---", cursorX + paddingX, topoLinha + paddingY, {
                width: largura - paddingX * 2,
                align: "left"
              });

            cursorX += largura;
          }

          doc.y = topoLinha + alturaLinha;
        };

        desenharCabecalhoTabela();
        for (const linha of tabela.linhas) {
          desenharLinhaTabela(linha, false);
        }
      };

      const desenharSecoes = () => {
        if (!layout.secoes?.length) return;

        for (const secao of layout.secoes) {
          const tituloSecao = toSafeText(secao.titulo);
          const linhas = secao.conteudo
            .split(/\r?\n/)
            .map((linha) => linha.trim())
            .filter(Boolean);

          if (!tituloSecao || !linhas.length) continue;

          const alturaTitulo = 16;
          const alturaLinhas = linhas.reduce(
            (acc, linha) => acc + doc.heightOfString(linha, { width: pageWidth() - 20 }),
            0
          );
          const alturaSecao = alturaTitulo + alturaLinhas + 16;

          garantirEspaco(alturaSecao);

          const x = left();
          const y = doc.y;

          doc
            .rect(x, y, pageWidth(), alturaSecao)
            .lineWidth(0.8)
            .strokeColor("#cbd5e1")
            .fillAndStroke("#ffffff", "#cbd5e1");

          doc
            .rect(x, y, pageWidth(), alturaTitulo)
            .lineWidth(0.8)
            .strokeColor("#cbd5e1")
            .fillAndStroke("#ecfdf5", "#cbd5e1");

          doc.font(fonteNegrito).fontSize(9.5).fillColor("#065f46").text(tituloSecao, x + 8, y + 4, {
            width: pageWidth() - 16,
            align: "left"
          });

          let yTexto = y + alturaTitulo + 6;
          for (const linha of linhas) {
            doc.font(fonteRegular).fontSize(9.5).fillColor("#111827").text(linha, x + 8, yTexto, {
              width: pageWidth() - 16,
              align: "left"
            });
            yTexto = doc.y + 1;
          }

          doc.y = y + alturaSecao + 6;
        }
      };

      doc.on("pageAdded", () => {
        const inicioCorpo = desenharCabecalho();
        doc.y = inicioCorpo;
      });

      const inicioPrimeiraPagina = desenharCabecalho();
      doc.y = inicioPrimeiraPagina;

      if (layout.descricao) {
        escreverParagrafo(layout.descricao);
        doc.moveDown(0.2);
      }

      if (layout.blocos?.length) {
        desenharBlocos();
      }

      if (layout.tabela) {
        doc.moveDown(0.2);
        desenharTabela();
      }

      if (layout.secoes?.length) {
        doc.moveDown(0.2);
        desenharSecoes();
      }

      const pageRange = doc.bufferedPageRange();
      for (let index = 0; index < pageRange.count; index += 1) {
        doc.switchToPage(index);
        const footerTop = topoRodape();
        const width = pageWidth();
        const topoPaginacao = Math.max(8, doc.page.margins.top - 14);

        doc.font(fonteRegular).fontSize(9).fillColor("#334155");
        doc.text(`Pagina ${index + 1} de ${pageRange.count}`, left(), topoPaginacao, {
          width,
          align: "right",
          lineBreak: false
        });

        doc
          .moveTo(left(), footerTop - 4)
          .lineTo(right(), footerTop - 4)
          .lineWidth(0.8)
          .strokeColor("#111827")
          .stroke();

        doc.font(fonteRegular).fontSize(9).fillColor("#374151");
        const larguraRodape = Math.max(80, width - 24);
        const linha1 = fitTextToWidth(doc, truncateText(toSafeText(rodape.linha1), 260), larguraRodape);
        const linha2 = fitTextToWidth(doc, truncateText(toSafeText(rodape.linha2), 320), larguraRodape);
        const linha3 = fitTextToWidth(doc, truncateText(toSafeText(rodape.linha3), 320), larguraRodape);
        drawCenteredSingleLine(doc, linha1, left(), width, footerTop);
        drawCenteredSingleLine(doc, linha2, left(), width, footerTop + 10);
        drawCenteredSingleLine(doc, linha3, left(), width, footerTop + 20);
      }

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      doc.end();
    });
  }

  private async renderLegado(html: string, rodape: RodapeRender): Promise<Buffer> {
    const text = this.htmlToText(html);

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: "A4",
        margins: {
          top: mmToPt(20),
          left: mmToPt(20),
          right: mmToPt(20),
          bottom: mmToPt(35)
        },
        bufferPages: true
      });

      const arialPath = path.join("C:", "Windows", "Fonts", "arial.ttf");
      if (fs.existsSync(arialPath)) {
        doc.font(arialPath);
      }

      doc.fontSize(10).text(text, {
        align: "left",
        lineGap: 2
      });

      const pageRange = doc.bufferedPageRange();
      for (let index = 0; index < pageRange.count; index += 1) {
        doc.switchToPage(index);
        const footerY = doc.page.height - doc.page.margins.bottom - 30;
        const largura = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const topoPaginacao = Math.max(8, doc.page.margins.top - 14);

        doc.fontSize(9).fillColor("#334155");
        doc.text(`Pagina ${index + 1} de ${pageRange.count}`, doc.page.margins.left, topoPaginacao, {
          width: largura,
          align: "right",
          lineBreak: false
        });

        doc.fontSize(9).fillColor("#374151");
        const larguraRodape = Math.max(80, largura - 24);
        const linha1 = fitTextToWidth(doc, truncateText(toSafeText(rodape.linha1), 260), larguraRodape);
        const linha2 = fitTextToWidth(doc, truncateText(toSafeText(rodape.linha2), 320), larguraRodape);
        const linha3 = fitTextToWidth(doc, truncateText(toSafeText(rodape.linha3), 320), larguraRodape);
        drawCenteredSingleLine(doc, linha1, doc.page.margins.left, largura, footerY);
        drawCenteredSingleLine(doc, linha2, doc.page.margins.left, largura, footerY + 10);
        drawCenteredSingleLine(doc, linha3, doc.page.margins.left, largura, footerY + 20);
      }

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      doc.end();
    });
  }

  private async carregarImagem(url?: string): Promise<Buffer | undefined> {
    const valor = toSafeText(url);
    if (!valor) return undefined;

    if (valor.startsWith("data:image/")) {
      const partes = valor.split(",");
      if (partes.length === 2) {
        try {
          return Buffer.from(partes[1], "base64");
        } catch {
          return undefined;
        }
      }
      return undefined;
    }

    if (/^https?:\/\//i.test(valor)) {
      try {
        const response = await fetch(valor);
        if (!response.ok) return undefined;
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch {
        return undefined;
      }
    }

    const caminhoNormalizado = valor.replace(/^file:\/\//i, "");
    const candidatos = [
      caminhoNormalizado,
      path.resolve(process.cwd(), caminhoNormalizado),
      path.resolve(process.cwd(), "..", caminhoNormalizado),
      path.resolve(process.cwd(), "..", "frontend", "public", caminhoNormalizado.replace(/^[/\\]/, ""))
    ];

    for (const candidato of candidatos) {
      if (fs.existsSync(candidato)) {
        try {
          return fs.readFileSync(candidato);
        } catch {
          // Tenta o proximo caminho.
        }
      }
    }

    return undefined;
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<\/(h1|h2|h3|p|div|section|article|tr|table|li|footer|main)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
}
