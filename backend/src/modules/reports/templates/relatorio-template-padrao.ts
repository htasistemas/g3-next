export type RelatorioCabecalhoTemplate = {
  razaoSocial: string;
  logoUrl?: string;
};

export type RelatorioMetaTopo = {
  rotulo: string;
  valor: string;
};

export type RodapeTemplate = {
  linha1: string;
  linha2?: string;
  linha3?: string;
};

export type ColunaRelatorio = {
  titulo: string;
  largura?: string;
  classe?: string;
  semQuebra?: boolean;
  fonteTamanho?: number;
  fonteTamanhoCabecalho?: number;
};

export type RelatorioTabelaCelula = {
  valor: string;
  classe?: string;
  html?: boolean;
};

export type RelatorioTabela = {
  colunas: ColunaRelatorio[];
  linhas: Array<Array<string | RelatorioTabelaCelula>>;
};

export type RelatorioBlocoCampo = {
  rotulo: string;
  valor: string;
};

export type RelatorioBloco = {
  titulo: string;
  colunas?: 1 | 2 | 3;
  destaque?: boolean;
  campos: RelatorioBlocoCampo[];
};

export type RelatorioHtmlInput = {
  titulo: string;
  subtitulo?: string;
  descricao?: string;
  tabela?: RelatorioTabela;
  secoes?: Array<{ titulo: string; conteudo: string }>;
  metadadosTopo?: RelatorioMetaTopo[];
  blocos?: RelatorioBloco[];
  fotoUrl?: string;
  fotoAjuste?: "contain" | "cover";
  cabecalho: RelatorioCabecalhoTemplate;
  rodape: RodapeTemplate;
};

export class RelatorioTemplatePadrao {
  private extrairLinhasEspacoSecao(valor: string): number | null {
    const match = valor.trim().match(/^\[\[espaco:(\d+(?:\.\d+)?)\]\]$/i);
    if (!match) return null;

    const linhas = Number(match[1]);
    if (!Number.isFinite(linhas) || linhas <= 0) return null;
    return linhas;
  }

  private renderizarConteudoSecao(conteudo: string): string {
    return conteudo
      .split(/\r?\n/)
      .map((linha) => {
        const linhasEspaco = this.extrairLinhasEspacoSecao(linha);
        if (linhasEspaco) {
          return `<div class="secao-espaco" style="height:${(linhasEspaco * 12).toFixed(1)}px;"></div>`;
        }

        if (!linha.trim()) {
          return '<div class="secao-linha">&nbsp;</div>';
        }

        return `<div class="secao-linha">${this.escapeHtml(linha)}</div>`;
      })
      .join("");
  }

  private montarClasseColuna(coluna?: ColunaRelatorio, classesExtras: Array<string | undefined> = []): string {
    if (!coluna) return "";
    const classes = [coluna.classe, coluna.semQuebra ? "coluna-sem-quebra" : "", ...classesExtras].filter(Boolean).join(" ");
    return classes ? ` class="${this.escapeHtml(classes)}"` : "";
  }

  private montarEstiloColuna(coluna?: ColunaRelatorio, cabecalho = false): string {
    const fonteTamanho = cabecalho ? coluna?.fonteTamanhoCabecalho : coluna?.fonteTamanho;
    return fonteTamanho ? ` style="font-size:${fonteTamanho}px;"` : "";
  }

  montarHtml(input: RelatorioHtmlInput) {
    const colgroupHtml =
      input.tabela?.colunas
        .map((coluna) => `<col style="width:${coluna.largura ?? "auto"};" />`)
        .join("") ?? "";
    const headerCols =
      input.tabela?.colunas
          .map((coluna) => `<th${this.montarClasseColuna(coluna)}${this.montarEstiloColuna(coluna, true)}>${this.escapeHtml(coluna.titulo)}</th>`)
        .join("") ?? "";
    const bodyRows =
      input.tabela?.linhas
        .map(
          (linha) =>
            `<tr>${linha
              .map((celula, index) => {
                const coluna = input.tabela?.colunas[index];
                const valor = typeof celula === "string" ? celula : celula.valor;
                const classeCelula = typeof celula === "string" ? "" : celula.classe ?? "";
                const conteudo = typeof celula === "string" || !celula.html ? this.escapeHtml(valor) : valor;
                return `<td${this.montarClasseColuna(coluna, [classeCelula])}${this.montarEstiloColuna(coluna)}>${conteudo}</td>`;
              })
              .join("")}</tr>`
        )
        .join("") ?? "";

    const secoesHtml =
      input.secoes
        ?.map(
          (secao) => `
        <section class="secao">
          <h2>${this.escapeHtml(secao.titulo)}</h2>
          <div class="secao-conteudo">${this.renderizarConteudoSecao(secao.conteudo)}</div>
        </section>
      `
        )
        .join("") ?? "";

    const metadadosTopoHtml =
      input.metadadosTopo
        ?.filter((item) => item.rotulo && item.valor)
        .map(
          (item) =>
            `<span class="cabecalho-meta-item"><strong>${this.escapeHtml(item.rotulo)}:</strong> ${this.escapeHtml(item.valor)}</span>`
        )
        .join("") ?? "";

    const blocosHtml =
      input.blocos
        ?.filter((bloco) => bloco.campos.length > 0)
        .map((bloco) => {
          const colunas = Math.min(3, Math.max(1, bloco.colunas ?? 2));
          const camposHtml = bloco.campos
            .filter((campo) => campo.rotulo && campo.valor)
            .map(
              (campo) => `
                <div class="bloco-campo">
                  <span class="bloco-campo-rotulo">${this.escapeHtml(campo.rotulo)}:</span>
                  <span class="bloco-campo-valor">${this.escapeHtml(campo.valor)}</span>
                </div>
              `
            )
            .join("");

          return `
            <article class="bloco ${bloco.destaque ? "bloco-destaque" : ""}">
              <h2 class="bloco-titulo">${this.escapeHtml(bloco.titulo)}</h2>
              <div class="bloco-corpo bloco-colunas-${colunas}">
                ${camposHtml}
              </div>
            </article>
          `;
        })
        .join("") ?? "";

    const fotoObjectFit = input.fotoAjuste === "cover" ? "cover" : "contain";
    const fotoHtml = input.fotoUrl
      ? `
        <section class="foto-destaque">
          <div class="foto-destaque__box">
            <img src="${this.escapeHtml(input.fotoUrl)}" alt="Foto 4x3 do beneficiário" style="object-fit:${fotoObjectFit};" />
          </div>
        </section>
      `
      : "";
    const conteudoCorpoHtml = fotoHtml
      ? `
        <section class="corpo-com-foto">
          ${fotoHtml}
          <div class="corpo-com-foto__blocos">
            ${blocosHtml}
          </div>
        </section>
      `
      : blocosHtml;

    const logoHtml = input.cabecalho.logoUrl
      ? `<img src="${this.escapeHtml(input.cabecalho.logoUrl)}" alt="Logomarca da instituição" />`
      : "";

    return `
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>${this.escapeHtml(input.titulo)}</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; }
            body {
              font-family: Arial, sans-serif;
              color: #111827;
              font-size: 11px;
              line-height: 1.4;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .container { width: 100%; }
            .cabecalho { margin-bottom: 10px; }
            .cabecalho-topo {
              display: grid;
              grid-template-columns: 74px 1fr 74px;
              align-items: center;
              gap: 8px;
              min-height: 64px;
            }
            .cabecalho-logo {
              width: 64px;
              height: 64px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .cabecalho-logo img {
              max-width: 64px;
              max-height: 64px;
              width: auto;
              height: auto;
              object-fit: contain;
            }
            .cabecalho-razao-social {
              text-align: center;
              font-weight: 700;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 0.2px;
              line-height: 1.25;
              white-space: normal;
              overflow-wrap: anywhere;
              padding: 0 8px;
            }
            .cabecalho-centro {
              min-width: 0;
              text-align: center;
            }
            .linha-separadora {
              border: 0;
              border-top: 1px solid #111827;
              margin: 6px 0;
            }
            .cabecalho-titulo {
              text-align: center;
              font-weight: 800;
              font-size: 15px;
              margin: 4px 0 2px 0;
            }
            .cabecalho-meta {
              display: flex;
              flex-wrap: wrap;
              justify-content: center;
              gap: 10px 14px;
              margin-top: 4px;
              margin-bottom: 0;
              color: #334155;
              font-size: 10px;
            }
            .cabecalho-meta-item {
              white-space: nowrap;
            }
            .corpo { margin-top: 10px; }
            .descricao { margin: 0 0 10px 0; font-size: 11px; color: #1f2937; }
            .corpo-com-foto {
              display: grid;
              grid-template-columns: 128px minmax(0, 1fr);
              align-items: start;
              gap: 12px;
            }
            .corpo-com-foto__blocos {
              min-width: 0;
            }
            .corpo-com-foto__blocos .bloco:first-child {
              margin-top: 0;
            }
            .foto-destaque {
              display: flex;
              justify-content: flex-start;
              margin: 0;
            }
            .foto-destaque__box {
              width: 132px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 0;
              overflow: hidden;
              text-align: center;
              background: #fff;
            }
            .foto-destaque__box img {
              width: 100%;
              height: 172px;
              object-fit: contain;
              border-radius: 0;
            }
            .bloco {
              margin-top: 10px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              overflow: hidden;
              page-break-inside: avoid;
              break-inside: avoid;
              background: #ffffff;
            }
            .bloco-destaque {
              border-color: #22c55e;
              box-shadow: 0 0 0 1px #bbf7d0 inset;
            }
            .bloco-destaque .bloco-titulo {
              background: #dcfce7;
              color: #065f46;
              font-size: 12px;
            }
            .bloco-destaque .bloco-campo {
              background: #f0fdf4;
              border-color: #bbf7d0;
            }
            .bloco-destaque .bloco-campo-valor {
              font-size: 12px;
              font-weight: 700;
              color: #065f46;
            }
            .bloco-titulo {
              margin: 0;
              padding: 7px 10px;
              background: #ecfdf5;
              border-bottom: 1px solid #cbd5e1;
              color: #065f46;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
            }
            .bloco-corpo {
              display: grid;
              gap: 6px 10px;
              padding: 8px 10px;
            }
            .bloco-colunas-1 { grid-template-columns: 1fr; }
            .bloco-colunas-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .bloco-colunas-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            .bloco-campo {
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 5px 7px;
              background: #f8fafc;
            }
            .bloco-campo-rotulo {
              display: inline;
              font-weight: 700;
              color: #1f2937;
              margin-right: 4px;
            }
            .bloco-campo-valor {
              display: inline;
              color: #111827;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 6px;
              font-size: 10px;
              table-layout: fixed;
            }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 6px 7px;
              text-align: left;
              vertical-align: top;
              overflow-wrap: anywhere;
              word-break: break-word;
            }
            th.coluna-sem-quebra,
            td.coluna-sem-quebra {
              white-space: nowrap;
              overflow-wrap: normal;
              word-break: normal;
              padding-left: 4px;
              padding-right: 4px;
            }
            th.coluna-ocorrencia,
            td.coluna-ocorrencia {
              padding: 4px;
            }
            td.coluna-ocorrencia {
              white-space: normal;
              overflow-wrap: anywhere;
              word-break: break-word;
              line-height: 1.15;
            }
            .chip-ocorrencia {
              display: inline-block;
              padding: 2px 6px;
              margin: 1px 4px 1px 0;
              border-radius: 9999px;
              font-size: 8.5px;
              font-weight: 700;
              line-height: 1.4;
              border: 1px solid transparent;
              white-space: nowrap;
            }
            .chip-ocorrencia--ok {
              background: #dcfce7;
              color: #166534;
              border-color: #86efac;
            }
            .chip-ocorrencia--alerta {
              background: #ffedd5;
              color: #9a3412;
              border-color: #fdba74;
            }
            .chip-ocorrencia--info {
              background: #dbeafe;
              color: #1d4ed8;
              border-color: #93c5fd;
            }
            .chip-ocorrencia--neutro {
              background: #e2e8f0;
              color: #334155;
              border-color: #cbd5e1;
            }
            tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            th {
              background: #f1f5f9;
              text-transform: uppercase;
              font-size: 9px;
              letter-spacing: 0.3px;
            }
            .secao {
              margin-top: 10px;
              page-break-inside: avoid;
              break-inside: avoid;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 8px 10px;
              background: #ffffff;
            }
            .secao h2 {
              font-size: 11px;
              margin: 0 0 5px 0;
              text-transform: uppercase;
              color: #065f46;
            }
            .secao-conteudo {
              font-size: 11px;
            }
            .secao-linha {
              min-height: 14px;
              white-space: pre-wrap;
            }
            .secao-espaco {
              display: block;
              width: 100%;
            }
            .rodape {
              margin-top: 14px;
              font-size: 10px;
              color: #374151;
              line-height: 1.45;
            }
            @media (max-width: 720px) {
              .corpo-com-foto {
                grid-template-columns: 1fr;
              }
            }
          </style>
        </head>
        <body>
          <main class="container">
            <header class="cabecalho">
              <div class="cabecalho-topo">
                <div class="cabecalho-logo">${logoHtml}</div>
                <div class="cabecalho-centro">
                  <div class="cabecalho-razao-social">${this.escapeHtml(input.cabecalho.razaoSocial)}</div>
                  <h1 class="cabecalho-titulo">${this.escapeHtml(input.titulo)}</h1>
                  ${metadadosTopoHtml ? `<div class="cabecalho-meta">${metadadosTopoHtml}</div>` : ""}
                </div>
                <div></div>
              </div>
              <hr class="linha-separadora" />
            </header>

            <section class="corpo">
              ${input.descricao ? `<p class="descricao">${this.escapeHtml(input.descricao)}</p>` : ""}
              ${conteudoCorpoHtml}

              ${
                input.tabela
                  ? `
                <table>
                  <colgroup>${colgroupHtml}</colgroup>
                  <thead><tr>${headerCols}</tr></thead>
                  <tbody>${bodyRows}</tbody>
                </table>
              `
                  : ""
              }

              ${secoesHtml}
            </section>

            <footer class="rodape">
              <hr class="linha-separadora" />
              <div>${this.escapeHtml(input.rodape.linha1)}</div>
              <div>${this.escapeHtml(input.rodape.linha2 ?? "")}</div>
              <div>${this.escapeHtml(input.rodape.linha3 ?? "")}</div>
            </footer>
          </main>
        </body>
      </html>
    `;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
