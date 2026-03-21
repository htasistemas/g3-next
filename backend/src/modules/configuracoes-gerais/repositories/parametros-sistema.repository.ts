import { prisma } from "../../../database/prisma.js";
import type {
  AlertasCentralAtendimentosSistema,
  CarenciaDoacaoRealizadaSistema,
  ObrigatoriedadeDocumentosBeneficiarioSistema,
  PersonalizacaoSistema
} from "../parametros-sistema.types.js";

const CHAVE_PERSONALIZACAO = "PERSONALIZACAO_VISUAL";
const CHAVE_CARENCIA_DOACAO_REALIZADA = "DOACAO_REALIZADA_CARENCIA";
const CHAVE_OBRIGATORIEDADE_DOCUMENTOS_BENEFICIARIO =
  "BENEFICIARIO_DOCUMENTOS_OBRIGATORIEDADE";
const CHAVE_ALERTAS_CENTRAL_ATENDIMENTOS = "CENTRAL_ATENDIMENTOS_ALERTAS";

type RegistroParametroSistema = {
  valor_json: unknown;
  atualizado_em: Date;
};

const criarTabelaSql = `
  CREATE TABLE IF NOT EXISTS parametros_sistema (
    id BIGSERIAL PRIMARY KEY,
    chave VARCHAR(100) NOT NULL UNIQUE,
    valor_json JSONB NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_por VARCHAR(120)
  );
`;

let estruturaPromise: Promise<void> | null = null;

export class ParametrosSistemaRepository {
  async buscarPersonalizacao() {
    return this.buscarPorChave<PersonalizacaoSistema>(CHAVE_PERSONALIZACAO);
  }

  async salvarPersonalizacao(valor: PersonalizacaoSistema, usuarioAtualizacao: string) {
    return this.salvarPorChave(CHAVE_PERSONALIZACAO, valor, usuarioAtualizacao);
  }

  async buscarCarenciaDoacaoRealizada() {
    return this.buscarPorChave<CarenciaDoacaoRealizadaSistema>(CHAVE_CARENCIA_DOACAO_REALIZADA);
  }

  async salvarCarenciaDoacaoRealizada(
    valor: CarenciaDoacaoRealizadaSistema,
    usuarioAtualizacao: string
  ) {
    return this.salvarPorChave(CHAVE_CARENCIA_DOACAO_REALIZADA, valor, usuarioAtualizacao);
  }

  async buscarObrigatoriedadeDocumentosBeneficiario() {
    return this.buscarPorChave<ObrigatoriedadeDocumentosBeneficiarioSistema>(
      CHAVE_OBRIGATORIEDADE_DOCUMENTOS_BENEFICIARIO
    );
  }

  async salvarObrigatoriedadeDocumentosBeneficiario(
    valor: ObrigatoriedadeDocumentosBeneficiarioSistema,
    usuarioAtualizacao: string
  ) {
    return this.salvarPorChave(
      CHAVE_OBRIGATORIEDADE_DOCUMENTOS_BENEFICIARIO,
      valor,
      usuarioAtualizacao
    );
  }

  async buscarAlertasCentralAtendimentos() {
    return this.buscarPorChave<AlertasCentralAtendimentosSistema>(
      CHAVE_ALERTAS_CENTRAL_ATENDIMENTOS
    );
  }

  async salvarAlertasCentralAtendimentos(
    valor: AlertasCentralAtendimentosSistema,
    usuarioAtualizacao: string
  ) {
    return this.salvarPorChave(CHAVE_ALERTAS_CENTRAL_ATENDIMENTOS, valor, usuarioAtualizacao);
  }

  private async ensureEstrutura() {
    await ensureParametrosSistemaEstrutura();
  }

  private async buscarPorChave<T>(chave: string) {
    await this.ensureEstrutura();

    const rows = await prisma.$queryRawUnsafe<RegistroParametroSistema[]>(
      `
        SELECT valor_json, atualizado_em
        FROM parametros_sistema
        WHERE chave = $1
        LIMIT 1
      `,
      chave
    );

    if (!rows.length) return null;

    return {
      valor: rows[0].valor_json as T,
      atualizado_em: rows[0].atualizado_em
    };
  }

  private async salvarPorChave<T>(chave: string, valor: T, usuarioAtualizacao: string) {
    await this.ensureEstrutura();

    const rows = await prisma.$queryRawUnsafe<RegistroParametroSistema[]>(
      `
        INSERT INTO parametros_sistema (chave, valor_json, atualizado_por, criado_em, atualizado_em)
        VALUES ($1, $2::jsonb, $3, NOW(), NOW())
        ON CONFLICT (chave)
        DO UPDATE SET
          valor_json = EXCLUDED.valor_json,
          atualizado_por = EXCLUDED.atualizado_por,
          atualizado_em = NOW()
        RETURNING valor_json, atualizado_em
      `,
      chave,
      JSON.stringify(valor),
      usuarioAtualizacao
    );

    return {
      valor: rows[0].valor_json as T,
      atualizado_em: rows[0].atualizado_em
    };
  }
}

export async function ensureParametrosSistemaEstrutura() {
  if (!estruturaPromise) {
    estruturaPromise = prisma.$executeRawUnsafe(criarTabelaSql).then(() => undefined);
  }

  await estruturaPromise;
}
