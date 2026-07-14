import type { ArquivoMetadata } from "@/types/arquivo";
import type { PlanoCronogramaExecucaoItem, PlanoTrabalhoPayload } from "@/types/plano-trabalho";
import { formatarCep, formatarCnpj, formatarCpf, formatarMoeda, mascararTelefoneInput } from "./plano-trabalho-utils";

function formatarDataPtBr(valor?: string) {
  if (!valor) return "---";
  const [ano, mes, dia] = valor.split("-");
  if (!ano || !mes || !dia) return valor;
  return `${dia}/${mes}/${ano}`;
}

function montarLinhaEndereco(plano: PlanoTrabalhoPayload) {
  return [plano.logradouro, plano.numero, plano.complemento].filter(Boolean).join(", ") || "-";
}

function montarLinhaCidade(plano: PlanoTrabalhoPayload) {
  return [plano.cidade, plano.uf].filter(Boolean).join(" / ") || "-";
}

export function gerarHtmlPlanoTrabalho(
  plano: PlanoTrabalhoPayload,
  cronograma: PlanoCronogramaExecucaoItem[],
  anexos: ArquivoMetadata[]
) {
  const linhasMetas = (plano.metas ?? [])
    .map(
      (meta) => `
        <tr>
          <td>${meta.numeroMeta || "-"}</td>
          <td>${meta.descricao || "-"}</td>
          <td>${meta.indicadorResultado || "-"}</td>
          <td>${meta.unidadeMedida || "-"}</td>
          <td>${meta.quantidadePrevista ?? "-"}</td>
          <td>${meta.meioVerificacao || "-"}</td>
          <td>${formatarDataPtBr(meta.dataInicio)}</td>
          <td>${formatarDataPtBr(meta.dataFim)}</td>
        </tr>`
    )
    .join("");

  const linhasEtapas = (plano.metas ?? [])
    .flatMap((meta) =>
      (meta.etapas ?? []).map(
        (etapa) => `
          <tr>
            <td>${meta.numeroMeta || "-"}</td>
            <td>${etapa.nome || "-"}</td>
            <td>${etapa.acaoExecutar || etapa.descricaoDetalhada || meta.descricao || "-"}</td>
            <td>${etapa.unidade || meta.unidadeMedida || "-"}</td>
            <td>${etapa.quantidade ?? meta.quantidadePrevista ?? "-"}</td>
            <td>${formatarMoeda(etapa.valorEstimado ?? 0)}</td>
            <td>${formatarDataPtBr(etapa.dataInicio || meta.dataInicio)}</td>
            <td>${formatarDataPtBr(etapa.dataFim || meta.dataFim)}</td>
          </tr>`
      )
    )
    .join("");

  const linhasCronograma = cronograma
    .map(
      (item) => `
        <tr>
          <td>${item.metaNumero || "-"}</td>
          <td>${item.etapaNome || "-"}</td>
          <td>${item.especificacao || "-"}</td>
          <td>${item.unidade || "-"}</td>
          <td>${item.quantidade ?? "-"}</td>
          <td>${formatarDataPtBr(item.inicio)}</td>
          <td>${formatarDataPtBr(item.termino)}</td>
          <td>${item.responsavel || "-"}</td>
          <td>${item.status || "-"}</td>
        </tr>`
    )
    .join("");

  const linhasAplicacao = (plano.aplicacaoRecursos ?? [])
    .map(
      (item) => `
        <tr>
          <td>${item.categoriaDespesa || "-"}</td>
          <td>${item.item || "-"}</td>
          <td>${item.descricao || "-"}</td>
          <td>${item.quantidade ?? "-"}</td>
          <td>${item.unidade || "-"}</td>
          <td>${formatarMoeda(item.valorUnitario ?? 0)}</td>
          <td>${formatarMoeda(item.valorTotal ?? 0)}</td>
          <td>${item.fonteRecurso || "-"}</td>
        </tr>`
    )
    .join("");

  const linhasDesembolso = (plano.desembolso ?? [])
    .map(
      (item) => `
        <tr>
          <td>${item.mesAno || "-"}</td>
          <td>${formatarMoeda(item.valorPrevisto ?? 0)}</td>
          <td>${item.fonteRecurso || "-"}</td>
          <td>${item.metaNumero || "-"}</td>
          <td>${item.observacao || "-"}</td>
        </tr>`
    )
    .join("");

  const listaObjetivos = (plano.objetivosEspecificos ?? [])
    .map((item) => `<li><strong>${item.descricao}</strong><br/>${item.resultadoEsperado || "-"}</li>`)
    .join("");

  const listaAnexos = anexos.map((item) => `<li>${item.nomeOriginal}</li>`).join("");

  return `<!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>Plano de trabalho</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; color: #1f2937; margin: 0; padding: 28px; }
        .page { max-width: 794px; margin: 0 auto; }
        .topo { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0f766e; padding-bottom: 16px; }
        .logo { width: 120px; height: 72px; border: 1px dashed #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #64748b; }
        h1 { margin: 0; font-size: 26px; }
        h2 { font-size: 16px; margin: 24px 0 10px; padding: 6px 0; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
        p, li { font-size: 12px; line-height: 1.55; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .box { border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; background: #f8fafc; }
        .label { display: block; font-size: 10px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; vertical-align: top; }
        th { background: #e2f4f2; text-align: left; }
        ul { margin: 8px 0 0 18px; padding: 0; }
        .rodape { margin-top: 24px; font-size: 11px; color: #475569; border-top: 2px solid #0f766e; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="topo">
          <div>
            <p style="margin:0; color:#0f766e; font-weight:700;">${plano.razaoSocial || "Instituição"}</p>
            <p style="margin:4px 0 0;">CNPJ ${formatarCnpj(plano.cnpj)}</p>
          </div>
          <div class="logo">Logomarca da instituição</div>
        </div>
        <h1 style="text-align:center; margin:18px 0 6px;">Plano de trabalho</h1>
        <div style="height:1px; background:#cbd5e1; margin-bottom:18px;"></div>

        <div class="grid">
          <div class="box"><span class="label">Título</span>${plano.titulo || "-"}</div>
          <div class="box"><span class="label">Tipo</span>${plano.tipoParceria || "-"}</div>
          <div class="box"><span class="label">Órgão parceiro</span>${plano.orgaoParceiro || "-"}</div>
          <div class="box"><span class="label">Período</span>${formatarDataPtBr(plano.periodoInicio)} a ${formatarDataPtBr(plano.periodoFim)}</div>
        </div>

        <h2>Dados da instituição</h2>
        <div class="grid">
          <div class="box"><span class="label">Razão social</span>${plano.razaoSocial || "-"}</div>
          <div class="box"><span class="label">Nome fantasia</span>${plano.nomeFantasia || "-"}</div>
          <div class="box"><span class="label">CNPJ</span>${formatarCnpj(plano.cnpj)}</div>
          <div class="box"><span class="label">E-mail</span>${plano.email || "-"}</div>
          <div class="box"><span class="label">Telefone</span>${mascararTelefoneInput(plano.telefone || "") || "-"}</div>
          <div class="box"><span class="label">Endereço</span>${montarLinhaEndereco(plano)}</div>
          <div class="box"><span class="label">Bairro</span>${plano.bairro || "-"}</div>
          <div class="box"><span class="label">Cidade / UF</span>${montarLinhaCidade(plano)}</div>
          <div class="box"><span class="label">Representante legal</span>${plano.representanteLegal || "-"}</div>
          <div class="box"><span class="label">CPF</span>${formatarCpf(plano.representanteCpf)}</div>
          <div class="box"><span class="label">Cargo / função</span>${plano.representanteCargo || "-"}</div>
          <div class="box"><span class="label">CEP</span>${formatarCep(plano.cep)}</div>
        </div>

        <h2>Dados bancários</h2>
        <div class="grid">
          <div class="box"><span class="label">Banco</span>${plano.bancoNome || "-"}</div>
          <div class="box"><span class="label">Agência</span>${plano.bancoAgencia || "-"}</div>
          <div class="box"><span class="label">Conta</span>${plano.bancoConta || "-"}</div>
          <div class="box"><span class="label">Operação</span>${plano.bancoOperacao || "-"}</div>
          <div class="box"><span class="label">Chave PIX</span>${plano.bancoPix || "-"}</div>
          <div class="box"><span class="label">Observação</span>${plano.bancoObservacao || "-"}</div>
        </div>

        <h2>Apresentação e histórico</h2>
        <p>${plano.historicoOsc || "-"}</p>
        <p><strong>Finalidade institucional:</strong> ${plano.finalidadeInstitucional || "-"}</p>
        <p><strong>Capacidade técnica e operacional:</strong> ${plano.capacidadeTecnicaOperacional || "-"}</p>

        <h2>Objeto e justificativa</h2>
        <p><strong>Objeto:</strong> ${plano.descricaoObjeto || "-"}</p>
        <p><strong>Público-alvo:</strong> ${plano.publicoAlvo || "-"}</p>
        <p><strong>Problema social:</strong> ${plano.problemaSocial || "-"}</p>
        <p><strong>Dados e indicadores:</strong> ${plano.dadosIndicadores || "-"}</p>
        <p><strong>Impacto esperado:</strong> ${plano.impactoEsperado || "-"}</p>

        <h2>Objetivos</h2>
        <p><strong>Objetivo geral:</strong> ${plano.objetivoGeral || "-"}</p>
        <ul>${listaObjetivos || "<li>Nenhum objetivo específico cadastrado.</li>"}</ul>

        <h2>Metas</h2>
        <table>
          <thead><tr><th>Meta</th><th>Descrição</th><th>Indicador</th><th>Unidade</th><th>Quantidade</th><th>Meio de verificação</th><th>Início</th><th>Fim</th></tr></thead>
          <tbody>${linhasMetas || "<tr><td colspan='8'>Nenhuma meta cadastrada.</td></tr>"}</tbody>
        </table>

        <h2>Etapas e fases</h2>
        <table>
          <thead><tr><th>Meta</th><th>Etapa</th><th>Ação</th><th>Unidade</th><th>Quantidade</th><th>Valor</th><th>Início</th><th>Fim</th></tr></thead>
          <tbody>${linhasEtapas || "<tr><td colspan='8'>Nenhuma etapa cadastrada.</td></tr>"}</tbody>
        </table>

        <h2>Cronograma de execução</h2>
        <table>
          <thead><tr><th>Meta</th><th>Etapa</th><th>Especificação</th><th>Unidade</th><th>Quantidade</th><th>Início</th><th>Término</th><th>Responsável</th><th>Status</th></tr></thead>
          <tbody>${linhasCronograma || "<tr><td colspan='9'>Nenhum item gerado.</td></tr>"}</tbody>
        </table>

        <h2>Plano de aplicação dos recursos</h2>
        <table>
          <thead><tr><th>Categoria</th><th>Item</th><th>Descrição</th><th>Quantidade</th><th>Unidade</th><th>Valor unitário</th><th>Valor total</th><th>Fonte</th></tr></thead>
          <tbody>${linhasAplicacao || "<tr><td colspan='8'>Nenhuma despesa cadastrada.</td></tr>"}</tbody>
        </table>

        <h2>Cronograma de desembolso</h2>
        <table>
          <thead><tr><th>Mês/ano</th><th>Valor previsto</th><th>Fonte</th><th>Meta</th><th>Observação</th></tr></thead>
          <tbody>${linhasDesembolso || "<tr><td colspan='5'>Nenhum desembolso cadastrado.</td></tr>"}</tbody>
        </table>

        <h2>Monitoramento, prestação de contas e anexos</h2>
        <p><strong>Forma de acompanhamento:</strong> ${plano.formaAcompanhamento || "-"}</p>
        <p><strong>Periodicidade de monitoramento:</strong> ${plano.periodicidadeMonitoramento || "-"}</p>
        <p><strong>Periodicidade da prestação de contas:</strong> ${plano.periodicidadePrestacao || "-"}</p>
        <p><strong>Documentos exigidos:</strong> ${plano.documentosExigidos || "-"}</p>
        <ul>${listaAnexos || "<li>Nenhum anexo registrado.</li>"}</ul>

        <div class="rodape">
          ${plano.razaoSocial || "-"} | CNPJ ${formatarCnpj(plano.cnpj)} | ${montarLinhaEndereco(plano)} | ${mascararTelefoneInput(plano.telefone || "") || "-"} | ${plano.email || "-"}
        </div>
      </div>
      <script>window.onload = () => window.print();</script>
    </body>
  </html>`;
}
