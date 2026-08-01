import { prisma } from "../../database/prisma.js";
import type { ImportacaoInstituicao, ImportacaoLinha, StatusImportacao } from "./importacao-dados.types.js";

export class ImportacaoDadosRepository {
  private estruturaPromise: Promise<void> | null = null;

  private async garantirEstrutura() {
    if (!this.estruturaPromise) {
      this.estruturaPromise = (async () => {
        await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS pgcrypto");
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS importacao_dados (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tipo VARCHAR(40) NOT NULL,
          tenant_id UUID NOT NULL, instituicao_id UUID NOT NULL, instituicao_nome VARCHAR(200) NOT NULL,
          instituicao_cnpj VARCHAR(20) NOT NULL, usuario_master_id BIGINT, usuario_master_nome VARCHAR(200) NOT NULL,
          nome_arquivo VARCHAR(255) NOT NULL, tamanho_bytes BIGINT NOT NULL DEFAULT 0, status VARCHAR(40) NOT NULL,
          total_registros INTEGER NOT NULL DEFAULT 0, prontos INTEGER NOT NULL DEFAULT 0, existentes INTEGER NOT NULL DEFAULT 0,
          duplicidades INTEGER NOT NULL DEFAULT 0, erros INTEGER NOT NULL DEFAULT 0, ignorados INTEGER NOT NULL DEFAULT 0,
          mapeamento JSONB NOT NULL DEFAULT '{}'::jsonb, linhas JSONB NOT NULL DEFAULT '[]'::jsonb,
          criado_em TIMESTAMP NOT NULL DEFAULT NOW(), atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(), processado_em TIMESTAMP
        )`);
        await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS importacao_dados_tenant_idx ON importacao_dados(tenant_id, criado_em DESC)");
        await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS importacao_dados_status_idx ON importacao_dados(status, criado_em DESC)");
      })().catch((error) => { this.estruturaPromise = null; throw error; });
    }
    await this.estruturaPromise;
  }

  async listarInstituicoes(busca?: string): Promise<ImportacaoInstituicao[]> {
    await this.garantirEstrutura();
    const termo = busca?.trim() ?? "";
    const termoNormalizado = termo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const cnpjBusca = termo.replace(/\D/g, "");
    return prisma.$queryRaw<ImportacaoInstituicao[]>`
      SELECT id::text, tenant_id::text, razao_social, nome_fantasia, cnpj, status
      FROM instituicoes
      WHERE (${termoNormalizado} = ''
        OR lower(translate(coalesce(razao_social, ''), 'áàãâäéèêëíìîïóòõôöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')) LIKE ${`%${termoNormalizado}%`}
        OR lower(translate(coalesce(nome_fantasia, ''), 'áàãâäéèêëíìîïóòõôöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')) LIKE ${`%${termoNormalizado}%`}
        OR (${cnpjBusca} <> '' AND regexp_replace(coalesce(cnpj, ''), '[^0-9]', '', 'g') LIKE ${`%${cnpjBusca}%`}))
      ORDER BY coalesce(nome_fantasia, razao_social)
      LIMIT 100
    `;
  }

  async obterInstituicao(id: string): Promise<ImportacaoInstituicao | undefined> {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<ImportacaoInstituicao[]>`
      SELECT id::text, tenant_id::text, razao_social, nome_fantasia, cnpj, status FROM instituicoes WHERE id = ${id}::uuid LIMIT 1
    `;
    return rows[0];
  }

  async criar(input: { tenantId: string; instituicaoId: string; instituicaoNome: string; cnpj: string; usuarioId: string; usuarioNome: string; nomeArquivo: string; tamanhoBytes: number; linhas: ImportacaoLinha[]; mapeamento: Record<string, string> }) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO importacao_dados (tipo, tenant_id, instituicao_id, instituicao_nome, instituicao_cnpj, usuario_master_id, usuario_master_nome, nome_arquivo, tamanho_bytes, status, total_registros, prontos, existentes, duplicidades, erros, linhas, mapeamento)
      VALUES ('BENEFICIARIOS', ${input.tenantId}::uuid, ${input.instituicaoId}::uuid, ${input.instituicaoNome}, ${input.cnpj}, ${input.usuarioId}::bigint, ${input.usuarioNome}, ${input.nomeArquivo}, ${input.tamanhoBytes}, 'AGUARDANDO_CONFIRMACAO', ${input.linhas.length}, ${input.linhas.filter((l) => l.status === 'PRONTO').length}, ${input.linhas.filter((l) => l.status === 'EXISTENTE').length}, ${input.linhas.filter((l) => l.status === 'DUPLICIDADE').length}, ${input.linhas.filter((l) => ['ERRO', 'INVALIDO', 'INCOMPLETO'].includes(l.status)).length}, ${JSON.stringify(input.linhas)}::jsonb, ${JSON.stringify(input.mapeamento)}::jsonb)
      RETURNING id::text
    `;
    return rows[0]?.id;
  }

  async obter(id: string) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<any[]>`SELECT *, id::text FROM importacao_dados WHERE id = ${id}::uuid LIMIT 1`;
    return rows[0];
  }

  async atualizar(id: string, status: StatusImportacao, linhas: ImportacaoLinha[], counts: { prontos: number; existentes: number; duplicidades: number; erros: number; ignorados: number }) {
    await this.garantirEstrutura();
    await prisma.$executeRaw`
      UPDATE importacao_dados SET status = ${status}, linhas = ${JSON.stringify(linhas)}::jsonb, prontos = ${counts.prontos}, existentes = ${counts.existentes}, duplicidades = ${counts.duplicidades}, erros = ${counts.erros}, ignorados = ${counts.ignorados}, atualizado_em = NOW(), processado_em = CASE WHEN ${status} IN ('CONCLUIDA', 'CONCLUIDA_COM_PENDENCIAS', 'FALHOU') THEN NOW() ELSE processado_em END WHERE id = ${id}::uuid
    `;
  }

  async listarHistorico() {
    await this.garantirEstrutura();
    return prisma.$queryRaw<any[]>`SELECT id::text, tipo, instituicao_nome, instituicao_cnpj, usuario_master_nome, nome_arquivo, total_registros, prontos, existentes, duplicidades, erros, ignorados, status, criado_em, processado_em FROM importacao_dados ORDER BY criado_em DESC LIMIT 100`;
  }
}
