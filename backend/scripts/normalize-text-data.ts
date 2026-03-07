import { PrismaClient } from "@prisma/client";
import { env } from "../src/config/env.js";
import { formatarTextoPorTipo, normalizarEspacos } from "../src/utils/text-formatter.js";
import type { TipoFormatacaoTexto } from "../src/utils/text-format-config.js";

type TableConfig = {
  table: string;
  idColumn: string;
  columns: Record<string, TipoFormatacaoTexto>;
  batchSize?: number;
};

type TableSummary = {
  table: string;
  lidos: number;
  atualizados: number;
  camposAtualizados: number;
  ignorada: boolean;
};

const prisma = new PrismaClient({
  datasourceUrl: env.DATABASE_URL
});

const tableConfigs: TableConfig[] = [
  {
    table: "cadastro_beneficiario",
    idColumn: "id",
    columns: {
      nome_completo: "nomePessoa",
      nome_social: "nomePessoa",
      apelido: "nomePessoa",
      nome_mae: "nomePessoa",
      nome_pai: "nomePessoa",
      nacionalidade: "endereco",
      naturalidade_cidade: "endereco"
    }
  },
  {
    table: "contato_beneficiario",
    idColumn: "id",
    columns: {
      telefone_recado_nome: "nomePessoa",
      horario_preferencial_contato: "textoCurto"
    }
  },
  {
    table: "documentos",
    idColumn: "id",
    columns: {
      orgao_emissor: "instituicao",
      cartorio: "instituicao",
      municipio: "endereco",
      nome_documento: "textoCurto"
    }
  },
  {
    table: "situacao_social",
    idColumn: "id",
    columns: {
      vinculo_familiar: "textoCurto",
      situacao_vulnerabilidade: "textoCurto",
      composicao_familiar: "textoCurto",
      participa_comunidade: "textoCurto",
      rede_apoio: "textoCurto"
    }
  },
  {
    table: "escolaridade_beneficiario",
    idColumn: "id",
    columns: {
      nivel_escolaridade: "textoCurto",
      ocupacao: "instituicao",
      situacao_trabalho: "textoCurto",
      local_trabalho: "instituicao",
      fonte_renda: "textoCurto"
    }
  },
  {
    table: "saude_beneficiario",
    idColumn: "id",
    columns: {
      tipo_deficiencia: "textoCurto",
      descricao_medicacao: "textoCurto",
      servico_saude_referencia: "instituicao"
    }
  },
  {
    table: "beneficios_beneficiario",
    idColumn: "id",
    columns: {
      beneficios_descricao: "textoCurto",
      beneficios_recebidos: "textoCurto"
    }
  },
  {
    table: "observacoes_beneficiario",
    idColumn: "id",
    columns: {
      observacoes: "textoCurto"
    }
  },
  {
    table: "endereco",
    idColumn: "id",
    columns: {
      logradouro: "endereco",
      complemento: "endereco",
      bairro: "endereco",
      ponto_referencia: "endereco",
      cidade: "endereco",
      zona: "textoCurto",
      subzona: "textoCurto"
    }
  },
  {
    table: "vinculo_familiar",
    idColumn: "id",
    columns: {
      nome_familia: "instituicao",
      logradouro: "endereco",
      complemento: "endereco",
      bairro: "endereco",
      ponto_referencia: "endereco",
      municipio: "endereco",
      situacao_imovel: "textoCurto",
      tipo_moradia: "textoCurto",
      esgoto_tipo: "textoCurto",
      coleta_lixo: "textoCurto",
      arranjo_familiar: "textoCurto",
      faixa_renda_per_capita: "textoCurto",
      principais_fontes_renda: "textoCurto",
      situacao_inseguranca_alimentar: "textoCurto",
      descricao_dividas: "textoCurto",
      vulnerabilidades_familia: "textoCurto",
      servicos_acompanhamento: "textoCurto",
      tecnico_responsavel: "nomePessoa"
    }
  },
  {
    table: "vinculo_familiar_membro",
    idColumn: "id",
    columns: {
      parentesco: "textoCurto",
      observacoes: "textoCurto"
    }
  },
  {
    table: "unidade_assistencial",
    idColumn: "id",
    columns: {
      nome_fantasia: "instituicao",
      razao_social: "instituicao",
      horario_funcionamento: "textoCurto",
      observacoes: "textoCurto"
    }
  },
  {
    table: "salas_unidade",
    idColumn: "id",
    columns: {
      nome: "instituicao"
    }
  },
  {
    table: "diretoria_unidade",
    idColumn: "id",
    columns: {
      nome_completo: "nomePessoa",
      funcao: "instituicao"
    }
  },
  {
    table: "usuarios",
    idColumn: "id",
    columns: {
      nome: "nomePessoa"
    }
  }
];

const dryRun = process.argv.includes("--dry-run");

async function tabelaExiste(tabela: string) {
  const rows = await prisma.$queryRawUnsafe<{ existe: boolean }[]>(
    "SELECT to_regclass($1) IS NOT NULL AS existe",
    `public.${tabela}`
  );
  return !!rows[0]?.existe;
}

async function colunaExiste(tabela: string, coluna: string) {
  const rows = await prisma.$queryRawUnsafe<{ existe: boolean }[]>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
    ) AS existe
    `,
    tabela,
    coluna
  );
  return !!rows[0]?.existe;
}

async function processarTabela(config: TableConfig): Promise<TableSummary> {
  const summary: TableSummary = {
    table: config.table,
    lidos: 0,
    atualizados: 0,
    camposAtualizados: 0,
    ignorada: false
  };

  const existe = await tabelaExiste(config.table);
  if (!existe) {
    summary.ignorada = true;
    return summary;
  }

  const colunasValidas: Array<[string, TipoFormatacaoTexto]> = [];
  for (const [coluna, tipo] of Object.entries(config.columns)) {
    if (await colunaExiste(config.table, coluna)) {
      colunasValidas.push([coluna, tipo]);
    }
  }

  if (!colunasValidas.length) {
    summary.ignorada = true;
    return summary;
  }

  let ultimoId: bigint | number = 0;
  const batchSize = config.batchSize ?? 300;

  while (true) {
    const selectColumns = [config.idColumn, ...colunasValidas.map(([coluna]) => coluna)].join(", ");
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `
      SELECT ${selectColumns}
      FROM ${config.table}
      WHERE ${config.idColumn} > $1
      ORDER BY ${config.idColumn} ASC
      LIMIT $2
      `,
      ultimoId,
      batchSize
    );

    if (!rows.length) break;

    summary.lidos += rows.length;

    for (const row of rows) {
      const id = row[config.idColumn] as bigint | number;
      ultimoId = id;

      const updates: Record<string, string> = {};
      for (const [coluna, tipo] of colunasValidas) {
        const valorAtual = row[coluna];
        if (typeof valorAtual !== "string") continue;

        const valorFormatado = formatarTextoPorTipo(valorAtual, tipo);
        const valorNormalizadoAtual = normalizarEspacos(valorAtual);

        if (valorFormatado !== valorNormalizadoAtual) {
          updates[coluna] = valorFormatado;
        }
      }

      const colunasAlteradas = Object.keys(updates);
      if (!colunasAlteradas.length) continue;

      summary.atualizados += 1;
      summary.camposAtualizados += colunasAlteradas.length;

      if (dryRun) continue;

      const setSql = colunasAlteradas
        .map((coluna, index) => `${coluna} = $${index + 1}`)
        .join(", ");
      const params = [...colunasAlteradas.map((coluna) => updates[coluna]), id];

      await prisma.$executeRawUnsafe(
        `
        UPDATE ${config.table}
        SET ${setSql}
        WHERE ${config.idColumn} = $${colunasAlteradas.length + 1}
        `,
        ...params
      );
    }
  }

  return summary;
}

async function main() {
  console.log(`[normalize-text] Modo: ${dryRun ? "dry-run" : "aplicacao"}`);
  const summaries: TableSummary[] = [];

  for (const config of tableConfigs) {
    const summary = await processarTabela(config);
    summaries.push(summary);
    if (summary.ignorada) {
      console.log(`[normalize-text] ${summary.table}: ignorada (tabela/colunas nao encontradas).`);
      continue;
    }
    console.log(
      `[normalize-text] ${summary.table}: lidos=${summary.lidos}, atualizados=${summary.atualizados}, campos=${summary.camposAtualizados}`
    );
  }

  const totalLidos = summaries.reduce((acc, item) => acc + item.lidos, 0);
  const totalAtualizados = summaries.reduce((acc, item) => acc + item.atualizados, 0);
  const totalCampos = summaries.reduce((acc, item) => acc + item.camposAtualizados, 0);

  console.log("[normalize-text] Resumo final:");
  console.log(`- Registros lidos: ${totalLidos}`);
  console.log(`- Registros atualizados: ${totalAtualizados}`);
  console.log(`- Campos alterados: ${totalCampos}`);
  console.log(`- Tabelas ignoradas: ${summaries.filter((item) => item.ignorada).length}`);
}

main()
  .catch((error) => {
    console.error("[normalize-text] Falha durante a normalizacao textual.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
