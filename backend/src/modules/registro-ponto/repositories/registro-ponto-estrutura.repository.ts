import type { Prisma, PrismaClient } from "@prisma/client";

type DatabaseLike = PrismaClient | Prisma.TransactionClient;

const sqlEstruturaRegistroPonto: string[] = [
  "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS horario_entrada_1 TIME",
  "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS horario_saida_1 TIME",
  "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS horario_entrada_2 TIME",
  "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS horario_saida_2 TIME",
  "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS face_hash VARCHAR(255)",
  "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS face_foto_url TEXT",
  "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS face_cadastrada_em TIMESTAMP",
  `
  CREATE TABLE IF NOT EXISTS registro_ponto (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    unidade_id BIGINT,
    data_referencia DATE NOT NULL,
    entrada_1 TIME,
    saida_1 TIME,
    entrada_2 TIME,
    saida_2 TIME,
    horas_extras_minutos INTEGER NOT NULL DEFAULT 0,
    banco_horas_minutos INTEGER NOT NULL DEFAULT 0,
    faltas_minutos INTEGER NOT NULL DEFAULT 0,
    atrasos_minutos INTEGER NOT NULL DEFAULT 0,
    observacoes TEXT,
    alterado_manualmente BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT registro_ponto_usuario_fk FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    CONSTRAINT registro_ponto_unidade_fk FOREIGN KEY (unidade_id) REFERENCES unidade_assistencial(id)
  )
  `,
  "ALTER TABLE registro_ponto ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "CREATE UNIQUE INDEX IF NOT EXISTS registro_ponto_usuario_data_unique ON registro_ponto(usuario_id, data_referencia)",
  "CREATE INDEX IF NOT EXISTS registro_ponto_tenant_data_idx ON registro_ponto(tenant_id, data_referencia)",
  "CREATE INDEX IF NOT EXISTS registro_ponto_data_idx ON registro_ponto(data_referencia)",
  "CREATE INDEX IF NOT EXISTS registro_ponto_unidade_idx ON registro_ponto(unidade_id)",
  "CREATE INDEX IF NOT EXISTS registro_ponto_alterado_idx ON registro_ponto(alterado_manualmente)",
  `
  CREATE TABLE IF NOT EXISTS registro_ponto_batida (
    id BIGSERIAL PRIMARY KEY,
    registro_ponto_id BIGINT NOT NULL,
    sequencia SMALLINT NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    horario_servidor TIMESTAMP NOT NULL DEFAULT NOW(),
    ip_origem VARCHAR(45),
    user_agent VARCHAR(300),
    origem_validada BOOLEAN NOT NULL DEFAULT FALSE,
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    accuracy_metros INTEGER,
    origem_json JSONB,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT registro_ponto_batida_registro_fk FOREIGN KEY (registro_ponto_id) REFERENCES registro_ponto(id) ON DELETE CASCADE,
    CONSTRAINT registro_ponto_batida_sequencia_ck CHECK (sequencia BETWEEN 1 AND 4)
  )
  `,
  "ALTER TABLE registro_ponto_batida ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "CREATE UNIQUE INDEX IF NOT EXISTS registro_ponto_batida_unique ON registro_ponto_batida(registro_ponto_id, sequencia)",
  "CREATE INDEX IF NOT EXISTS registro_ponto_batida_tenant_idx ON registro_ponto_batida(tenant_id, registro_ponto_id)",
  "CREATE INDEX IF NOT EXISTS registro_ponto_batida_horario_idx ON registro_ponto_batida(horario_servidor)",
  "CREATE INDEX IF NOT EXISTS registro_ponto_batida_ip_idx ON registro_ponto_batida(ip_origem)",
  `
  CREATE TABLE IF NOT EXISTS registro_ponto_ocorrencia (
    id BIGSERIAL PRIMARY KEY,
    registro_ponto_id BIGINT NOT NULL,
    tipo VARCHAR(40) NOT NULL,
    descricao TEXT,
    origem VARCHAR(20) NOT NULL DEFAULT 'SISTEMA',
    criado_por_id BIGINT,
    criado_por_nome VARCHAR(120),
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT registro_ponto_ocorrencia_registro_fk FOREIGN KEY (registro_ponto_id) REFERENCES registro_ponto(id) ON DELETE CASCADE
  )
  `,
  "ALTER TABLE registro_ponto_ocorrencia ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "CREATE INDEX IF NOT EXISTS registro_ponto_ocorrencia_tenant_idx ON registro_ponto_ocorrencia(tenant_id, registro_ponto_id)",
  "CREATE INDEX IF NOT EXISTS registro_ponto_ocorrencia_registro_idx ON registro_ponto_ocorrencia(registro_ponto_id)",
  "CREATE INDEX IF NOT EXISTS registro_ponto_ocorrencia_tipo_idx ON registro_ponto_ocorrencia(tipo)",
  `
  CREATE TABLE IF NOT EXISTS registro_ponto_auditoria (
    id BIGSERIAL PRIMARY KEY,
    registro_ponto_id BIGINT,
    registro_ponto_batida_id BIGINT,
    acao VARCHAR(50) NOT NULL,
    usuario_id BIGINT,
    usuario_nome VARCHAR(120),
    ip_origem VARCHAR(45),
    justificativa TEXT,
    observacao TEXT,
    dados_antes JSONB,
    dados_depois JSONB,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT registro_ponto_auditoria_registro_fk FOREIGN KEY (registro_ponto_id) REFERENCES registro_ponto(id) ON DELETE SET NULL,
    CONSTRAINT registro_ponto_auditoria_batida_fk FOREIGN KEY (registro_ponto_batida_id) REFERENCES registro_ponto_batida(id) ON DELETE SET NULL
  )
  `,
  "ALTER TABLE registro_ponto_auditoria ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "CREATE INDEX IF NOT EXISTS registro_ponto_auditoria_tenant_idx ON registro_ponto_auditoria(tenant_id, registro_ponto_id)",
  "CREATE INDEX IF NOT EXISTS registro_ponto_auditoria_registro_idx ON registro_ponto_auditoria(registro_ponto_id)",
  "CREATE INDEX IF NOT EXISTS registro_ponto_auditoria_acao_idx ON registro_ponto_auditoria(acao)",
  "CREATE INDEX IF NOT EXISTS registro_ponto_auditoria_criado_idx ON registro_ponto_auditoria(criado_em)"
];

let estruturaInicializada = false;
let estruturaInicializando: Promise<void> | null = null;

export async function ensureRegistroPontoEstrutura(db: DatabaseLike) {
  if (estruturaInicializada) return;
  if (!estruturaInicializando) {
    estruturaInicializando = (async () => {
      for (const sql of sqlEstruturaRegistroPonto) {
        await db.$executeRawUnsafe(sql);
      }
      await db.$executeRawUnsafe(`
        UPDATE registro_ponto r
        SET tenant_id = u.tenant_id
        FROM usuarios u
        WHERE r.tenant_id IS NULL
          AND u.id = r.usuario_id
          AND u.tenant_id IS NOT NULL
      `);
      await db.$executeRawUnsafe(`
        UPDATE registro_ponto_batida b
        SET tenant_id = r.tenant_id
        FROM registro_ponto r
        WHERE b.tenant_id IS NULL
          AND r.id = b.registro_ponto_id
          AND r.tenant_id IS NOT NULL
      `);
      await db.$executeRawUnsafe(`
        UPDATE registro_ponto_ocorrencia o
        SET tenant_id = r.tenant_id
        FROM registro_ponto r
        WHERE o.tenant_id IS NULL
          AND r.id = o.registro_ponto_id
          AND r.tenant_id IS NOT NULL
      `);
      await db.$executeRawUnsafe(`
        UPDATE registro_ponto_auditoria a
        SET tenant_id = r.tenant_id
        FROM registro_ponto r
        WHERE a.tenant_id IS NULL
          AND r.id = a.registro_ponto_id
          AND r.tenant_id IS NOT NULL
      `);
      estruturaInicializada = true;
    })().catch((error) => {
      estruturaInicializando = null;
      throw error;
    });
  }

  await estruturaInicializando;
}
