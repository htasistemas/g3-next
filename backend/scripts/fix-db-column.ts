import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config();

const prisma = new PrismaClient();

async function main() {
  console.log("DATABASE_URL encontrada:", !!process.env.DATABASE_URL);
  
  const comandos = [
    // Correções na tabela unidade_assistencial (já feitas, mas bom manter)
    'ALTER TABLE unidade_assistencial ADD COLUMN IF NOT EXISTS raio_ponto_metros INTEGER DEFAULT 100;',
    'ALTER TABLE unidade_assistencial ADD COLUMN IF NOT EXISTS accuracy_max_ponto_metros INTEGER DEFAULT 80;',
    'ALTER TABLE unidade_assistencial ADD COLUMN IF NOT EXISTS ip_validacao_ponto VARCHAR(45);',
    'ALTER TABLE unidade_assistencial ADD COLUMN IF NOT EXISTS ips_publicos_ponto TEXT;',
    'ALTER TABLE unidade_assistencial ADD COLUMN IF NOT EXISTS redes_locais_ponto TEXT;',
    'ALTER TABLE unidade_assistencial ADD COLUMN IF NOT EXISTS modo_validacao_ponto VARCHAR(30) DEFAULT \'IP_OU_REDE\';',
    'ALTER TABLE unidade_assistencial ADD COLUMN IF NOT EXISTS ping_timeout_ms INTEGER DEFAULT 2000;',
    
    // Correções na tabela usuarios (para permitir o login)
    'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_id VARCHAR(80);',
    'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url VARCHAR(255);',
    'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha_hash VARCHAR(255);',
    'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nome_usuario VARCHAR(120);',
    
    // Garantir que as colunas de data existam se necessário
    'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW();',
    'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW();'
  ];

  console.log("Iniciando atualização cirúrgica do banco de dados...");

  for (const sql of comandos) {
    try {
      await prisma.$executeRawUnsafe(sql);
      const tableName = sql.split(' ')[2];
      const columnName = sql.split('IF NOT EXISTS ')[1].split(' ')[0];
      console.log(`[${tableName}] Coluna garantida: ${columnName}`);
    } catch (error: any) {
      // Ignora erros comuns como a tabela não existir ainda
      console.error(`Aviso ao executar SQL: ${error.message}`);
    }
  }

  console.log("\nSincronização concluída!");
  await prisma.$disconnect();
}

main().catch(console.error);
