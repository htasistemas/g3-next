import type { TermoFomentoPayload } from "@/types/termo-fomento";
import { formatarDataTermo } from "./termo-fomento-utils";

function formatarMoeda(valor?: number) {
  return (valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

export function gerarHtmlTermoFomento(termo: TermoFomentoPayload) {
  const documentosRelacionados = (termo.documentosRelacionados ?? [])
    .map(
      (documento) => `
        <tr>
          <td>${documento.nome || "-"}</td>
          <td>${documento.tipo || "outro"}</td>
          <td>${documento.dataUrl || "-"}</td>
        </tr>`
    )
    .join("");

  const aditivos = (termo.aditivos ?? [])
    .map(
      (item) => `
        <tr>
          <td>${item.tipoAditivo || "-"}</td>
          <td>${formatarDataTermo(item.dataAditivo)}</td>
          <td>${formatarDataTermo(item.novaDataFim)}</td>
          <td>${item.novoValor != null ? formatarMoeda(item.novoValor) : "-"}</td>
          <td>${item.observacoes || "-"}</td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>Termo de fomento</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 28px; color: #1f2937; }
        .page { max-width: 794px; margin: 0 auto; }
        .topo { border-bottom: 3px solid #0f766e; padding-bottom: 14px; margin-bottom: 18px; }
        h1 { margin: 0; font-size: 26px; color: #0f766e; }
        h2 { margin: 22px 0 10px; font-size: 16px; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding: 6px 0; }
        p, li { font-size: 12px; line-height: 1.55; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #f8fafc; }
        .label { display: block; font-size: 10px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; vertical-align: top; }
        th { background: #e2f4f2; text-align: left; }
        .rodape { margin-top: 24px; border-top: 2px solid #0f766e; padding-top: 10px; font-size: 11px; color: #475569; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="topo">
          <h1>Termo de fomento</h1>
          <p style="margin:6px 0 0;">${termo.numeroTermo || "-"}</p>
        </div>

        <div class="grid">
          <div class="box"><span class="label">Tipo do termo</span>${termo.tipoTermo || "-"}</div>
          <div class="box"><span class="label">Situação</span>${termo.situacao || "-"}</div>
          <div class="box"><span class="label">Órgão concedente</span>${termo.orgaoConcedente || "-"}</div>
          <div class="box"><span class="label">Valor global</span>${termo.valorGlobal != null ? formatarMoeda(termo.valorGlobal) : "-"}</div>
          <div class="box"><span class="label">Assinatura</span>${formatarDataTermo(termo.dataAssinatura)}</div>
          <div class="box"><span class="label">Vigência</span>${formatarDataTermo(termo.dataInicioVigencia)} a ${formatarDataTermo(termo.dataFimVigencia)}</div>
        </div>

        <h2>Dados gerais</h2>
        <p><strong>Responsável interno:</strong> ${termo.responsavelInterno || "-"}</p>
        <p><strong>Descrição do objeto:</strong> ${termo.descricaoObjeto || "-"}</p>

        <h2>Documento principal</h2>
        <div class="grid">
          <div class="box"><span class="label">Nome</span>${termo.termoDocumento?.nome || "-"}</div>
          <div class="box"><span class="label">Tipo</span>${termo.termoDocumento?.tipo || "-"}</div>
          <div class="box"><span class="label">Arquivo / URL</span>${termo.termoDocumento?.dataUrl || "-"}</div>
        </div>

        <h2>Documentos relacionados</h2>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Arquivo / URL</th>
            </tr>
          </thead>
          <tbody>
            ${documentosRelacionados || "<tr><td colspan='3'>Nenhum documento relacionado cadastrado.</td></tr>"}
          </tbody>
        </table>

        <h2>Aditivos</h2>
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Data</th>
              <th>Nova data de fim</th>
              <th>Novo valor</th>
              <th>Observações</th>
            </tr>
          </thead>
          <tbody>
            ${aditivos || "<tr><td colspan='5'>Nenhum aditivo cadastrado.</td></tr>"}
          </tbody>
        </table>

        <div class="rodape">
          Relatório gerado para emissão do termo de fomento.
        </div>
      </div>
      <script>window.onload = () => window.print();</script>
    </body>
  </html>`;
}
