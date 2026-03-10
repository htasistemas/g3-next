export function abrirRelatorioPdf(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const novaAba = window.open(url, "_blank", "noopener,noreferrer");

  if (!novaAba) {
    URL.revokeObjectURL(url);
    throw new Error("O navegador bloqueou a abertura do relatório em nova guia.");
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

type ImprimirConteudoOptions = {
  titulo?: string;
  seletor?: string;
};

export function imprimirConteudoAtual(options?: ImprimirConteudoOptions) {
  const titulo = options?.titulo ?? document.title;
  const seletor = options?.seletor ?? "main";
  const elemento = document.querySelector<HTMLElement>(seletor);

  if (!elemento) {
    throw new Error("Não foi possível localizar o conteúdo para impressão.");
  }

  const janela = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900");
  if (!janela) {
    throw new Error("O navegador bloqueou a abertura da janela de impressão.");
  }

  const estilos = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join("\n");

  janela.document.write(`<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(titulo)}</title>
        ${estilos}
        <style>
          @page {
            margin: 12mm;
          }

          body {
            margin: 0;
            background: #fff;
            color: #0f172a;
          }

          .g3-print-root {
            padding: 24px;
          }

          [data-print="toolbar"],
          [data-print="tabs"],
          [data-print-hidden="true"],
          button {
            display: none !important;
          }

          [data-print="layout-grid"] {
            display: block !important;
          }

          input,
          select,
          textarea {
            min-height: auto !important;
            border: 1px solid #cbd5e1 !important;
            background: #fff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            padding: 0.35rem 0.5rem !important;
          }

          input[type="checkbox"],
          input[type="radio"] {
            display: inline-block !important;
            width: auto !important;
            height: auto !important;
          }

          textarea {
            white-space: pre-wrap !important;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th,
          td {
            vertical-align: top;
          }

          img {
            max-width: 100%;
            height: auto;
          }
        </style>
      </head>
      <body>
        <div class="g3-print-root">${serializarConteudoParaImpressao(elemento)}</div>
      </body>
    </html>`);
  janela.document.close();

  janela.addEventListener("load", () => {
    janela.focus();
    janela.print();
  });

  janela.addEventListener("afterprint", () => {
    janela.close();
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function serializarConteudoParaImpressao(elemento: HTMLElement) {
  const clone = elemento.cloneNode(true) as HTMLElement;
  sincronizarControlesFormulario(elemento, clone);
  return clone.innerHTML;
}

function sincronizarControlesFormulario(origemRaiz: HTMLElement, cloneRaiz: HTMLElement) {
  const origemControles = origemRaiz.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    "input, textarea, select"
  );
  const cloneControles = cloneRaiz.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    "input, textarea, select"
  );

  origemControles.forEach((origemControle, index) => {
    const cloneControle = cloneControles[index];
    if (!cloneControle) return;

    if (origemControle instanceof HTMLTextAreaElement && cloneControle instanceof HTMLTextAreaElement) {
      cloneControle.value = origemControle.value;
      cloneControle.textContent = origemControle.value;
      return;
    }

    if (origemControle instanceof HTMLSelectElement && cloneControle instanceof HTMLSelectElement) {
      Array.from(cloneControle.options).forEach((option, optionIndex) => {
        option.selected = origemControle.options[optionIndex]?.selected ?? false;
      });
      cloneControle.value = origemControle.value;
      return;
    }

    if (!(origemControle instanceof HTMLInputElement) || !(cloneControle instanceof HTMLInputElement)) {
      return;
    }

    if (origemControle.type === "checkbox" || origemControle.type === "radio") {
      cloneControle.checked = origemControle.checked;
      if (origemControle.checked) {
        cloneControle.setAttribute("checked", "checked");
      } else {
        cloneControle.removeAttribute("checked");
      }
      return;
    }

    if (origemControle.type === "file") {
      cloneControle.setAttribute("data-print-hidden", "true");
      return;
    }

    cloneControle.value = origemControle.value;
    cloneControle.setAttribute("value", origemControle.value);
  });
}
