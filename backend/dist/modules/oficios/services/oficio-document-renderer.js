import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
function mmToPt(mm) {
    return mm * 2.83464567;
}
function toSafeText(value) {
    return (value ?? "").replace(/\s+/g, " ").trim();
}
function toParagraphs(value) {
    return (value ?? "")
        .split(/\r?\n\s*\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);
}
function joinNonEmpty(parts) {
    return parts.map((item) => toSafeText(item)).filter(Boolean).join(" | ");
}
function truncateText(value, maxLength) {
    if (value.length <= maxLength)
        return value;
    return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}
function fitTextToWidth(doc, value, maxWidth) {
    const texto = toSafeText(value);
    if (!texto)
        return "";
    if (doc.widthOfString(texto) <= maxWidth)
        return texto;
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
        }
        else {
            fim = meio - 1;
        }
    }
    if (melhor <= 0)
        return sufixo;
    return `${texto.slice(0, melhor).trimEnd()}${sufixo}`;
}
function drawCenteredSingleLine(doc, value, xStart, availableWidth, y) {
    const texto = toSafeText(value);
    if (!texto)
        return;
    const larguraTexto = doc.widthOfString(texto);
    const x = xStart + Math.max(0, (availableWidth - larguraTexto) / 2);
    doc.text(texto, x, y, { lineBreak: false });
}
export class OficioDocumentRenderer {
    async render(layout) {
        const logoBuffer = await this.carregarImagem(layout.instituicao.logoUrl);
        return new Promise((resolve, reject) => {
            const chunks = [];
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
            const fonteCabecalho = fs.existsSync(arialPath) ? arialPath : "Helvetica";
            const fonteCabecalhoNegrito = fs.existsSync(arialBoldPath) ? arialBoldPath : "Helvetica-Bold";
            const fonteCorpo = "Times-Roman";
            const fonteCorpoNegrito = "Times-Bold";
            const larguraPagina = () => doc.page.width - doc.page.margins.left - doc.page.margins.right;
            const left = () => doc.page.margins.left;
            const right = () => doc.page.width - doc.page.margins.right;
            const alturaRodape = 30;
            const topoRodape = () => doc.page.height - doc.page.margins.bottom - alturaRodape;
            const limiteInferior = () => topoRodape() - 8;
            const garantirEspaco = (alturaNecessaria) => {
                if (doc.y + alturaNecessaria <= limiteInferior())
                    return;
                doc.addPage();
            };
            const desenharCabecalhoPadrao = () => {
                const topo = doc.page.margins.top;
                const logoBox = mmToPt(22);
                const razaoSocial = toSafeText(layout.instituicao.nomeCompleto);
                const temLogo = !!logoBuffer;
                if (temLogo) {
                    try {
                        doc.image(logoBuffer, left(), topo + 1, { fit: [logoBox, logoBox] });
                    }
                    catch {
                        // Mantem o layout mesmo sem logo valida.
                    }
                }
                const reservaLateral = temLogo ? logoBox + mmToPt(4) : 0;
                const areaTextoX = left() + reservaLateral;
                const areaTextoW = Math.max(mmToPt(60), larguraPagina() - reservaLateral * 2);
                doc.font(fonteCabecalhoNegrito).fontSize(12).fillColor("#111827");
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
                const baseTopo = Math.max(topo + logoBox, topo + mmToPt(1) + alturaRazao);
                const primeiraLinhaY = baseTopo + mmToPt(1.5);
                doc
                    .moveTo(left(), primeiraLinhaY)
                    .lineTo(right(), primeiraLinhaY)
                    .lineWidth(1)
                    .strokeColor("#111827")
                    .stroke();
                const tituloY = primeiraLinhaY + mmToPt(2);
                doc.font(fonteCabecalhoNegrito).fontSize(14).fillColor("#111827");
                const alturaTitulo = doc.heightOfString("Ofício", {
                    width: larguraPagina(),
                    align: "center"
                });
                doc.text("Ofício", left(), tituloY, {
                    width: larguraPagina(),
                    align: "center"
                });
                const segundaLinhaY = tituloY + alturaTitulo + mmToPt(2);
                doc
                    .moveTo(left(), segundaLinhaY)
                    .lineTo(right(), segundaLinhaY)
                    .lineWidth(1)
                    .strokeColor("#111827")
                    .stroke();
                return segundaLinhaY + mmToPt(5);
            };
            const escreverParagrafo = (texto, alinhamento = "justify") => {
                const valor = texto.trim();
                if (!valor)
                    return;
                doc.font(fonteCorpo).fontSize(12).fillColor("#111111");
                const altura = doc.heightOfString(valor, {
                    width: larguraPagina(),
                    align: alinhamento,
                    lineGap: 2
                });
                garantirEspaco(altura + 4);
                doc.text(valor, left(), doc.y, {
                    width: larguraPagina(),
                    align: alinhamento,
                    lineGap: 2,
                    paragraphGap: 0
                });
                doc.moveDown(0.55);
            };
            const escreverBlocoDestinatario = () => {
                const instituicao = toSafeText(layout.destinatarioInstituicao);
                const tratamento = toSafeText(layout.destinatarioTratamento);
                const nome = toSafeText(layout.destinatarioNome);
                const cargo = toSafeText(layout.destinatarioCargo);
                const nomeComposto = [tratamento, nome].filter(Boolean).join(" ").trim();
                const linhas = [instituicao, nomeComposto, cargo].filter(Boolean);
                if (!linhas.length)
                    return;
                garantirEspaco(56);
                doc.moveDown(1.1);
                doc.font(fonteCorpoNegrito).fontSize(12).fillColor("#111111");
                if (instituicao) {
                    doc.text(instituicao, left(), doc.y, { width: larguraPagina(), align: "left" });
                }
                if (nomeComposto) {
                    doc.font(fonteCorpo).fontSize(12);
                    doc.text(nomeComposto, left(), doc.y + 2, { width: larguraPagina(), align: "left" });
                }
                if (cargo) {
                    doc.text(cargo, left(), doc.y + 2, { width: larguraPagina(), align: "left" });
                }
            };
            const desenharComplementares = () => {
                const items = (layout.informacoesComplementares ?? []).filter((item) => toSafeText(item.rotulo) && toSafeText(item.valor));
                if (!items.length)
                    return;
                doc.font(fonteCorpo).fontSize(11);
                const alturas = items.map((item) => doc.heightOfString(`${toSafeText(item.rotulo)}: ${toSafeText(item.valor)}`, {
                    width: larguraPagina() - 24,
                    align: "left",
                    lineGap: 1
                }));
                const alturaBox = 22 + alturas.reduce((acc, value) => acc + value + 5, 0) + 8;
                garantirEspaco(alturaBox + 10);
                const topo = doc.y + 4;
                doc
                    .roundedRect(left(), topo, larguraPagina(), alturaBox, 4)
                    .lineWidth(0.8)
                    .strokeColor("#cbd5e1")
                    .stroke();
                doc.font(fonteCabecalhoNegrito).fontSize(10.5).fillColor("#111111");
                doc.text("Informações complementares", left() + 10, topo + 8, {
                    width: larguraPagina() - 20,
                    align: "left"
                });
                let currentY = topo + 24;
                for (const item of items) {
                    const text = `${toSafeText(item.rotulo)}: ${toSafeText(item.valor)}`;
                    doc.font(fonteCorpo).fontSize(11).fillColor("#111111");
                    doc.text(text, left() + 10, currentY, {
                        width: larguraPagina() - 20,
                        align: "left",
                        lineGap: 1
                    });
                    currentY = doc.y + 4;
                }
                doc.y = topo + alturaBox + 8;
            };
            const desenharAssinatura = () => {
                const nome = toSafeText(layout.responsavelNome);
                const cargo = toSafeText(layout.responsavelCargo);
                if (!nome && !cargo)
                    return;
                garantirEspaco(96);
                doc.moveDown(1.4);
                const larguraAssinatura = Math.min(mmToPt(70), larguraPagina() * 0.55);
                const centerX = left() + larguraPagina() / 2;
                const lineY = doc.y + 26;
                doc
                    .moveTo(centerX - larguraAssinatura / 2, lineY)
                    .lineTo(centerX + larguraAssinatura / 2, lineY)
                    .lineWidth(0.7)
                    .strokeColor("#111111")
                    .stroke();
                doc.font(fonteCorpoNegrito).fontSize(12).fillColor("#111111");
                if (nome) {
                    doc.text(nome, left(), lineY + 6, {
                        width: larguraPagina(),
                        align: "center"
                    });
                }
                if (cargo) {
                    doc.font(fonteCorpo).fontSize(11);
                    doc.text(cargo, left(), doc.y + 2, {
                        width: larguraPagina(),
                        align: "center"
                    });
                }
            };
            doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            doc.on("error", reject);
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("pageAdded", () => {
                doc.y = desenharCabecalhoPadrao();
            });
            doc.y = desenharCabecalhoPadrao();
            const textoTopoDireito = [toSafeText(layout.cidadeUf), toSafeText(layout.dataExtenso)]
                .filter(Boolean)
                .join(", ");
            doc.font(fonteCorpoNegrito).fontSize(12).fillColor("#111111");
            doc.text(`Ofício nº ${toSafeText(layout.numeroOficio) || "---"}`, left(), doc.y, {
                width: larguraPagina() * 0.56,
                align: "left"
            });
            doc.font(fonteCorpo).fontSize(11);
            doc.text(textoTopoDireito || "---", left(), doc.y - 14, {
                width: larguraPagina(),
                align: "right"
            });
            doc.moveDown(0.8);
            escreverBlocoDestinatario();
            const assunto = toSafeText(layout.assunto);
            if (assunto) {
                garantirEspaco(34);
                doc.moveDown(1.1);
                doc.font(fonteCorpoNegrito).fontSize(12).fillColor("#111111");
                doc.text(`Assunto: ${assunto}`, left(), doc.y, {
                    width: larguraPagina(),
                    align: "left"
                });
            }
            desenharComplementares();
            const corpo = toParagraphs(layout.corpoTexto);
            if (corpo.length) {
                doc.moveDown(1.2);
                for (const paragraph of corpo) {
                    escreverParagrafo(paragraph, "justify");
                }
            }
            const fechamento = toParagraphs(layout.fechamento);
            if (fechamento.length) {
                doc.moveDown(0.8);
                for (const paragraph of fechamento) {
                    escreverParagrafo(paragraph, "left");
                }
            }
            desenharAssinatura();
            const pageRange = doc.bufferedPageRange();
            for (let index = 0; index < pageRange.count; index += 1) {
                doc.switchToPage(index);
                const top = topoRodape();
                const rodape = layout.instituicao.rodapePadrao;
                const linha1 = toSafeText(rodape?.linha1 || layout.instituicao.nomeCompleto);
                const linha2 = toSafeText(rodape?.linha2 ||
                    joinNonEmpty([
                        layout.instituicao.cnpj ? `CNPJ: ${layout.instituicao.cnpj}` : undefined,
                        layout.instituicao.endereco
                    ]));
                const linha3 = toSafeText(rodape?.linha3 ||
                    joinNonEmpty([
                        layout.instituicao.telefone ? `Telefone: ${layout.instituicao.telefone}` : undefined,
                        layout.instituicao.email ? `E-mail: ${layout.instituicao.email}` : undefined,
                        layout.instituicao.site ? `Site: ${layout.instituicao.site}` : undefined
                    ]));
                doc
                    .moveTo(left(), top - 4)
                    .lineTo(right(), top - 4)
                    .lineWidth(0.8)
                    .strokeColor("#111827")
                    .stroke();
                doc.font(fonteCabecalho).fontSize(8.5).fillColor("#334155");
                const larguraRodape = larguraPagina();
                drawCenteredSingleLine(doc, fitTextToWidth(doc, truncateText(linha1, 260), larguraRodape), left(), larguraRodape, top);
                drawCenteredSingleLine(doc, fitTextToWidth(doc, truncateText(linha2, 320), larguraRodape), left(), larguraRodape, top + 10);
                drawCenteredSingleLine(doc, fitTextToWidth(doc, truncateText(linha3, 320), larguraRodape), left(), larguraRodape, top + 20);
            }
            doc.end();
        });
    }
    async carregarImagem(url) {
        const valor = toSafeText(url);
        if (!valor)
            return undefined;
        if (valor.startsWith("data:image/")) {
            const partes = valor.split(",");
            if (partes.length === 2) {
                try {
                    return Buffer.from(partes[1], "base64");
                }
                catch {
                    return undefined;
                }
            }
            return undefined;
        }
        if (/^https?:\/\//i.test(valor)) {
            try {
                const response = await fetch(valor);
                if (!response.ok)
                    return undefined;
                const arrayBuffer = await response.arrayBuffer();
                return Buffer.from(arrayBuffer);
            }
            catch {
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
                }
                catch {
                    // Tenta o próximo caminho.
                }
            }
        }
        return undefined;
    }
}
