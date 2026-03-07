export class RelatorioTemplatePadrao {
    montarHtml(input) {
        const dataGeracao = new Date().toLocaleString("pt-BR");
        const colgroupHtml = input.tabela?.colunas
            .map((coluna) => `<col style="width:${coluna.largura ?? "auto"};" />`)
            .join("") ?? "";
        const headerCols = input.tabela?.colunas.map((coluna) => `<th>${this.escapeHtml(coluna.titulo)}</th>`).join("") ??
            "";
        const bodyRows = input.tabela?.linhas
            .map((linha) => `<tr>${linha.map((valor) => `<td>${this.escapeHtml(valor)}</td>`).join("")}</tr>`)
            .join("") ?? "";
        const secoesHtml = input.secoes
            ?.map((secao) => `
        <section class="secao">
          <h2>${this.escapeHtml(secao.titulo)}</h2>
          <p>${this.escapeHtml(secao.conteudo)}</p>
        </section>
      `)
            .join("") ?? "";
        return `
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>${this.escapeHtml(input.titulo)}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #111827; margin: 0; padding: 0; }
            .container { padding: 24px; }
            h1 { margin: 0 0 4px 0; font-size: 20px; }
            .subtitulo { margin: 0; color: #4b5563; font-size: 12px; }
            .descricao { margin: 12px 0 16px 0; font-size: 12px; color: #374151; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
            th { background: #f1f5f9; text-transform: uppercase; font-size: 10px; letter-spacing: 0.3px; }
            .secao { margin-top: 14px; }
            .secao h2 { font-size: 13px; margin: 0 0 6px 0; }
            .secao p { margin: 0; white-space: pre-wrap; font-size: 12px; }
            .rodape { margin-top: 20px; font-size: 10px; color: #4b5563; line-height: 1.4; }
          </style>
        </head>
        <body>
          <main class="container">
            <h1>${this.escapeHtml(input.titulo)}</h1>
            ${input.subtitulo ? `<p class="subtitulo">${this.escapeHtml(input.subtitulo)}</p>` : ""}
            <p class="subtitulo">Gerado em ${dataGeracao}</p>
            ${input.descricao ? `<p class="descricao">${this.escapeHtml(input.descricao)}</p>` : ""}
            ${input.tabela
            ? `
              <table>
                <colgroup>${colgroupHtml}</colgroup>
                <thead><tr>${headerCols}</tr></thead>
                <tbody>${bodyRows}</tbody>
              </table>
            `
            : ""}
            ${secoesHtml}
            <footer class="rodape">
              <div>${this.escapeHtml(input.rodape.linha1)}</div>
              <div>${this.escapeHtml(input.rodape.linha2 ?? "")}</div>
              <div>${this.escapeHtml(input.rodape.linha3 ?? "")}</div>
            </footer>
          </main>
        </body>
      </html>
    `;
    }
    escapeHtml(value) {
        return value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}
