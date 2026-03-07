import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

type RodapeRender = {
  linha1: string;
  linha2?: string;
  linha3?: string;
};

function mmToPt(mm: number): number {
  return mm * 2.83464567;
}

export class HtmlPdfRenderer {
  async render(html: string, rodape: RodapeRender): Promise<Buffer> {
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
        const footerY = doc.page.height - mmToPt(24);
        doc.fontSize(9).fillColor("#374151");
        doc.text(rodape.linha1 || "", doc.page.margins.left, footerY, {
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right
        });
        doc.text(rodape.linha2 || "", doc.page.margins.left, footerY + 10, {
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right
        });
        doc.text(rodape.linha3 || "", doc.page.margins.left, footerY + 20, {
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right
        });
        doc.text(`Pagina ${index + 1} de ${pageRange.count}`, doc.page.margins.left, footerY + 20, {
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
          align: "right"
        });
      }

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      doc.end();
    });
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
      .replace(/&quot;/g, "\"")
      .replace(/&#039;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
}
