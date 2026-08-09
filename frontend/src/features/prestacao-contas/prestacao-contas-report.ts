import type { PrestacaoContasPayload, StatusPrestacaoContas, StatusWorkflowPrestacao } from "@/types/prestacao-contas";

export type RelatorioPrestacaoContasResumo = {
  status: StatusPrestacaoContas;
  totalRecebimentos: number;
  totalDestinacoesPercentual: number;
  totalChecklistConcluido: number;
  totalChecklistPendente: number;
  totalComprovantes: number;
  totalDespesas: number;
  diferencaConciliacao: number;
  percentualChecklist: number;
  saldoCalculado?: number;
  pendencias: string[];
};

export type RelatorioPrestacaoContasInput = {
  registros: PrestacaoContasPayload[];
  resumoPorRegistro: (registro: PrestacaoContasPayload) => RelatorioPrestacaoContasResumo;
  titulo?: string;
  geradoPor?: string;
  filtros?: {
    busca?: string;
    situacao?: string;
    apenasPendencias?: boolean;
  };
  dataGeracao?: Date;
};

const workflowLabels: Record<StatusWorkflowPrestacao, string> = {
  RASCUNHO: "Rascunho",
  EM_ANALISE: "Em análise",
  EM_DILIGENCIA: "Em diligência",
  APROVADA: "Aprovada",
  APROVADA_RESSALVAS: "Aprovada com ressalvas",
  REJEITADA: "Rejeitada",
  ENCERRADA: "Encerrada"
};

const parecerLabels: Record<string, string> = {
  APROVAR: "Aprovar",
  APROVAR_RESSALVAS: "Aprovar com ressalvas",
  REJEITAR: "Rejeitar"
};

export function gerarHtmlRelatorioPrestacaoContas({
  registros,
  resumoPorRegistro,
  titulo = "Relatório de prestação de contas",
  geradoPor = "Sistema G3N",
  filtros,
  dataGeracao = new Date()
}: RelatorioPrestacaoContasInput) {
  const resumos = registros.map((registro) => ({ registro, resumo: resumoPorRegistro(registro) }));
  const totalRecebido = resumos.reduce((acc, item) => acc + numero(item.registro.totalRecebido), 0);
  const totalAplicado = resumos.reduce((acc, item) => acc + numero(item.registro.totalAplicado), 0);
  const totalPrestadoMes = resumos.reduce((acc, item) => acc + numero(item.registro.prestadoMes), 0);
  const totalDespesas = resumos.reduce((acc, item) => acc + item.resumo.totalDespesas, 0);
  const registrosComPendencias = resumos.filter((item) => item.resumo.pendencias.length > 0).length;
  const saldo = totalRecebido - totalAplicado;

  return `
    <style>
      .prestacao-relatorio { color: #1f2937; font-family: Arial, sans-serif; }
      .prestacao-relatorio * { box-sizing: border-box; }
      .prestacao-topo { border-bottom: 3px solid #0f766e; padding-bottom: 14px; margin-bottom: 18px; }
      .prestacao-topo h1 { color: #0f766e; font-size: 26px; margin: 0; }
      .prestacao-topo p { margin: 6px 0 0; color: #475569; font-size: 12px; }
      .prestacao-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 14px 0; }
      .prestacao-grid.duas { grid-template-columns: repeat(2, 1fr); }
      .prestacao-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #f8fafc; min-height: 54px; }
      .prestacao-label { display: block; color: #64748b; font-size: 10px; margin-bottom: 4px; text-transform: uppercase; }
      .prestacao-valor { font-size: 14px; font-weight: 700; color: #0f172a; }
      .prestacao-relatorio h2 { border-bottom: 1px solid #cbd5e1; border-top: 1px solid #cbd5e1; font-size: 16px; margin: 22px 0 10px; padding: 6px 0; }
      .prestacao-relatorio h3 { color: #0f766e; font-size: 14px; margin: 18px 0 8px; }
      .prestacao-relatorio p, .prestacao-relatorio li { font-size: 12px; line-height: 1.55; }
      .prestacao-relatorio table { border-collapse: collapse; margin-top: 8px; width: 100%; }
      .prestacao-relatorio th, .prestacao-relatorio td { border: 1px solid #cbd5e1; font-size: 11px; padding: 6px 8px; vertical-align: top; }
      .prestacao-relatorio th { background: #e2f4f2; color: #0f172a; text-align: left; }
      .prestacao-relatorio tr { page-break-inside: avoid; }
      .prestacao-relatorio thead { display: table-header-group; }
      .prestacao-chip { border-radius: 999px; display: inline-block; font-size: 10px; font-weight: 700; padding: 3px 8px; text-transform: uppercase; }
      .prestacao-chip.ok { background: #dcfce7; color: #166534; }
      .prestacao-chip.aviso { background: #fef3c7; color: #92400e; }
      .prestacao-chip.pendente { background: #fee2e2; color: #991b1b; }
      .prestacao-registro { page-break-inside: avoid; margin-top: 18px; }
      .prestacao-quebra { page-break-before: always; }
      .prestacao-assinaturas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; margin-top: 34px; }
      .prestacao-assinatura { border-top: 1px solid #475569; padding-top: 8px; text-align: center; font-size: 11px; }
      .prestacao-rodape { border-top: 2px solid #0f766e; color: #475569; font-size: 11px; margin-top: 24px; padding-top: 10px; }
      @media print {
        .prestacao-grid { break-inside: avoid; }
        .prestacao-registro + .prestacao-registro { page-break-before: always; }
      }
    </style>
    <article class="prestacao-relatorio">
      <header class="prestacao-topo">
        <h1>${escapeHtml(titulo)}</h1>
        <p>Documento gerado pelo sistema G3N em ${escapeHtml(formatarDataHora(dataGeracao))}</p>
        <p>Emitido por: ${escapeHtml(geradoPor || "Sistema G3N")}</p>
      </header>

      <section>
        <h2>Resumo executivo</h2>
        <div class="prestacao-grid">
          ${box("Registros", registros.length.toString())}
          ${box("Total recebido", formatarMoeda(totalRecebido))}
          ${box("Total aplicado", formatarMoeda(totalAplicado))}
          ${box("Saldo calculado", formatarMoeda(saldo))}
          ${box("Prestado no mês", formatarMoeda(totalPrestadoMes))}
          ${box("Despesas lançadas", formatarMoeda(totalDespesas))}
          ${box("Com pendências", registrosComPendencias.toString())}
          ${box("Sem pendências", Math.max(registros.length - registrosComPendencias, 0).toString())}
        </div>
        <div class="prestacao-grid duas">
          ${boxHtml("Filtros utilizados", montarFiltros(filtros))}
          ${box("Critério de emissão", registros.length === 1 ? "Registro selecionado" : "Listagem filtrada")}
        </div>
      </section>

      <section>
        <h2>Registros contemplados</h2>
        ${tabela(
          ["Código", "Instrumento", "Tipo", "Workflow", "Período", "Recebido", "Aplicado", "Saldo", "Pendências"],
          resumos.map(({ registro, resumo }) => [
            registro.id ?? "-",
            registro.instrumento ?? "-",
            formatarTipo(registro.tipoPrestacao),
            formatarWorkflow(registro.statusWorkflow),
            `${formatarData(registro.periodoInicio)} a ${formatarData(registro.periodoFim)}`,
            formatarMoeda(registro.totalRecebido),
            formatarMoeda(registro.totalAplicado),
            formatarMoeda(registro.saldoDisponivel ?? resumo.saldoCalculado),
            resumo.pendencias.length ? resumo.pendencias.length.toString() : "Nenhuma"
          ])
        )}
      </section>

      ${resumos.map((item, index) => montarRegistroDetalhado(item.registro, item.resumo, index)).join("")}

      <section>
        <h2>Assinaturas</h2>
        <div class="prestacao-assinaturas">
          <div class="prestacao-assinatura">Responsável pela elaboração</div>
          <div class="prestacao-assinatura">Responsável pela conferência</div>
          <div class="prestacao-assinatura">Representante legal</div>
        </div>
      </section>

      <footer class="prestacao-rodape">
        Relatório emitido para conferência documental, financeira e administrativa da prestação de contas.
      </footer>
    </article>
  `;
}

function montarRegistroDetalhado(
  registro: PrestacaoContasPayload,
  resumo: RelatorioPrestacaoContasResumo,
  index: number
) {
  return `
    <section class="prestacao-registro ${index > 0 ? "prestacao-quebra" : ""}">
      <h2>Prestação ${escapeHtml(registro.instrumento || registro.id || `${index + 1}`)}</h2>
      <div class="prestacao-grid">
        ${box("Código", registro.id ?? "-")}
        ${box("Instrumento/parceria", registro.instrumento ?? "-")}
        ${box("Tipo", formatarTipo(registro.tipoPrestacao))}
        ${box("Workflow", formatarWorkflow(registro.statusWorkflow))}
        ${box("Período inicial", formatarData(registro.periodoInicio))}
        ${box("Período final", formatarData(registro.periodoFim))}
        ${boxHtml("Situação de conferência", chipStatus(resumo.status))}
        ${box("Checklist concluído", `${resumo.totalChecklistConcluido} de ${resumo.totalChecklistConcluido + resumo.totalChecklistPendente}`)}
      </div>

      <h3>Objeto</h3>
      <p>${escapeHtml(registro.objeto || "Objeto não informado.")}</p>

      <h3>Resumo financeiro</h3>
      <div class="prestacao-grid">
        ${box("Total recebido", formatarMoeda(registro.totalRecebido))}
        ${box("Total aplicado", formatarMoeda(registro.totalAplicado))}
        ${box("Saldo disponível", formatarMoeda(registro.saldoDisponivel ?? resumo.saldoCalculado))}
        ${box("Prestado no mês", formatarMoeda(registro.prestadoMes))}
        ${box("Receitas detalhadas", formatarMoeda(resumo.totalRecebimentos))}
        ${box("Despesas detalhadas", formatarMoeda(resumo.totalDespesas))}
        ${box("Diferença de conciliação", formatarMoeda(resumo.diferencaConciliacao))}
        ${box("Aplicação percentual", formatarPercentual(resumo.totalDestinacoesPercentual))}
      </div>
      ${paragrafoResumo("Resumo do total recebido", registro.totalRecebidoHelper)}
      ${paragrafoResumo("Resumo do total aplicado", registro.totalAplicadoHelper)}
      ${paragrafoResumo("Resumo do saldo disponível", registro.saldoDisponivelHelper)}
      ${paragrafoResumo("Resumo do prestado no mês", registro.prestadoMesHelper)}

      <h3>Recebimentos</h3>
      ${tabela(
        ["Fonte", "Valor", "Periodicidade", "Situação"],
        (registro.recebimentos ?? []).map((item) => [
          item.fonte,
          formatarMoeda(item.valor),
          item.periodicidade ?? "-",
          item.status ?? "-"
        ]),
        "Nenhum recebimento detalhado."
      )}

      <h3>Aplicação dos recursos</h3>
      ${tabela(
        ["Aplicação", "Descrição", "Percentual"],
        (registro.destinacoes ?? []).map((item) => [
          item.titulo,
          item.descricao ?? "-",
          formatarPercentual(item.percentual)
        ]),
        "Nenhuma aplicação detalhada."
      )}

      <h3>Despesas e pagamentos</h3>
      ${tabela(
        ["Descrição", "Fornecedor", "Documento fiscal", "Data", "Categoria", "Situação", "Valor"],
        (registro.despesas ?? []).map((item) => [
          item.descricao,
          item.fornecedor ?? "-",
          item.documentoFiscal ?? "-",
          formatarData(item.dataPagamento),
          item.categoria ?? "-",
          item.status ?? "-",
          formatarMoeda(item.valor)
        ]),
        "Nenhuma despesa detalhada."
      )}

      <h3>Comprovantes e documentos</h3>
      ${tabela(
        ["Título", "Descrição", "Arquivo"],
        (registro.comprovantes ?? []).map((item) => [
          item.titulo,
          item.descricao ?? "-",
          item.arquivoNome ?? item.arquivoUrl ?? "-"
        ]),
        "Nenhum comprovante cadastrado."
      )}

      <h3>Timeline da prestação</h3>
      ${tabela(
        ["Evento", "Detalhe", "Situação"],
        (registro.timelines ?? []).map((item) => [
          item.titulo,
          item.detalhe ?? "-",
          formatarStatusLivre(item.status)
        ]),
        "Nenhum evento registrado na timeline."
      )}

      <h3>Checklist de conferência</h3>
      ${tabela(
        ["Item", "Descrição", "Situação"],
        (registro.checklist ?? []).map((item) => [
          item.titulo,
          item.descricao ?? "-",
          formatarStatusLivre(item.status)
        ]),
        "Nenhum item de checklist cadastrado."
      )}

      <h3>Pendências apontadas pelo sistema</h3>
      ${lista(resumo.pendencias, "Nenhuma pendência identificada.")}

      <h3>Parecer técnico</h3>
      <div class="prestacao-grid duas">
        ${box("Conclusão", formatarParecer(registro.parecerConclusao))}
        ${box("Responsável e data", `${registro.parecerResponsavel || "-"} · ${formatarData(registro.parecerData)}`)}
      </div>
      <p>${escapeHtml(registro.parecerTexto || "Parecer técnico não informado.")}</p>
      ${paragrafoResumo("Ressalvas", registro.parecerRessalvas)}
      ${paragrafoResumo("Recomendações", registro.parecerRecomendacoes)}

      <h3>Histórico de pareceres</h3>
      ${tabela(
        ["Versão", "Conclusão", "Responsável", "Data", "Parecer", "Ressalvas"],
        (registro.parecerHistorico ?? []).map((item) => [
          String(item.versao),
          formatarParecer(item.conclusao),
          item.responsavel || item.usuarioNome || "-",
          formatarData(item.dataParecer || item.criadoEm),
          item.parecerTexto || "-",
          item.ressalvas || "-"
        ]),
        "Nenhuma versão anterior de parecer registrada."
      )}
    </section>
  `;
}

function box(label: string, valor: string) {
  return `<div class="prestacao-box"><span class="prestacao-label">${escapeHtml(label)}</span><span class="prestacao-valor">${escapeHtml(valor)}</span></div>`;
}

function boxHtml(label: string, valorHtml: string) {
  return `<div class="prestacao-box"><span class="prestacao-label">${escapeHtml(label)}</span><span class="prestacao-valor">${valorHtml}</span></div>`;
}

function tabela(headers: string[], rows: string[][], empty = "Nenhum registro encontrado.") {
  const colSpan = headers.length;
  const cabecalho = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const linhas = rows.length
    ? rows
        .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell ?? "-"))}</td>`).join("")}</tr>`)
        .join("")
    : `<tr><td colspan="${colSpan}">${escapeHtml(empty)}</td></tr>`;

  return `
    <table>
      <thead><tr>${cabecalho}</tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  `;
}

function lista(items: string[], empty: string) {
  if (!items.length) return `<p>${escapeHtml(empty)}</p>`;
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function paragrafoResumo(titulo: string, texto?: string) {
  if (!texto?.trim()) return "";
  return `<p><strong>${escapeHtml(titulo)}:</strong> ${escapeHtml(texto.trim())}</p>`;
}

function montarFiltros(filtros?: RelatorioPrestacaoContasInput["filtros"]) {
  const busca = filtros?.busca?.trim() || "Sem busca textual";
  const situacao = filtros?.situacao && filtros.situacao !== "todos" ? formatarStatusLivre(filtros.situacao) : "Todas";
  const pendencias = filtros?.apenasPendencias ? "Somente com pendências" : "Todos os registros";
  return `Busca: ${escapeHtml(busca)}<br/>Situação: ${escapeHtml(situacao)}<br/>Pendências: ${escapeHtml(pendencias)}`;
}

function chipStatus(status: StatusPrestacaoContas) {
  const classe = status === "concluido" ? "ok" : status === "andamento" ? "aviso" : "pendente";
  return `<span class="prestacao-chip ${classe}">${escapeHtml(formatarStatusLivre(status))}</span>`;
}

function formatarStatusLivre(status?: string) {
  if (!status) return "-";
  const normalizado = status.toLowerCase();
  if (normalizado === "concluido") return "Concluído";
  if (normalizado === "andamento") return "Em andamento";
  if (normalizado === "pendente") return "Pendente";
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letra) => letra.toUpperCase());
}

function formatarWorkflow(status?: StatusWorkflowPrestacao) {
  return workflowLabels[status ?? "RASCUNHO"];
}

function formatarTipo(tipo?: string) {
  if (tipo === "PARCIAL") return "Parcial";
  if (tipo === "ANUAL") return "Anual";
  if (tipo === "FINAL") return "Final";
  return "-";
}

function formatarParecer(valor?: string) {
  return parecerLabels[valor ?? ""] ?? "-";
}

function formatarMoeda(valor?: number) {
  return numero(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarPercentual(valor?: number) {
  if (valor == null || Number.isNaN(valor)) return "-";
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
}

function formatarData(valor?: string) {
  if (!valor) return "-";
  const data = valor.includes("T") ? valor.slice(0, 10) : valor;
  const [ano, mes, dia] = data.split("-");
  if (!ano || !mes || !dia) return valor;
  return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(valor: Date) {
  return valor.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function numero(valor?: number) {
  return valor != null && Number.isFinite(valor) ? valor : 0;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
