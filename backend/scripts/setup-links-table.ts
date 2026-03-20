import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config();

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando criação da tabela link_externo_documento...");

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "link_externo_documento" (
        "id" SERIAL PRIMARY KEY,
        "nome" VARCHAR(200) NOT NULL,
        "url" TEXT NOT NULL,
        "tipos_relacionados" TEXT,
        "observacao" TEXT,
        "criado_em" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "atualizado_em" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("Sucesso! Tabela link_externo_documento pronta.");
    
    // Inserir os links padrão se a tabela estiver vazia
    const count = await prisma.$queryRawUnsafe<any[]>('SELECT count(*) FROM "link_externo_documento"');
    if (parseInt(count[0].count) === 0) {
      console.log("Populando com links iniciais...");
      const linksIniciais = [
        ['Certidão Negativa Estadual (MG)', 'https://www2.fazenda.mg.gov.br/sol/ctrl/SOL/CDT/SERVICO_829?ACAO=INICIAR#', 'Certidão negativa estadual', ''],
        ['Certidão de Débitos Federais (União)', 'https://www.gov.br/pt-br/servicos/emitir-certidao-de-regularidade-fiscal', 'Certidão negativa federal', ''],
        ['Certificado de Regularidade do FGTS (CRF)', 'https://consulta-crf.caixa.gov.br/consultacrf/pages/impressao.jsf', 'Certidão do FGTS', ''],
        ['Certidão de Débitos Trabalhistas (CNDT)', 'https://www.tst.jus.br/certidao1', 'Certidão trabalhista', ''],
        ['Certidão Comprobatória de Atividade (CCA - Uberlândia)', 'http://portalsiat.uberlandia.mg.gov.br/dsf_udi_portal/inicial.do?evento=montaMenu&acronym=MOB_CCA', 'Comprovante de inscrição municipal', 'Número de inscrição é 261.300-00'],
        ['Certidão de Situação Cadastral (Uberlândia)', 'http://portalsiat.uberlandia.mg.gov.br/dsf_udi_portal/inicial.do?evento=montaMenu&acronym=MOB_SITCAD', 'Certidão negativa municipal', ''],
        ['Certidão Municipal Negativa Pessoa (Uberlândia)', 'http://portalsiat.uberlandia.mg.gov.br/dsf_udi_portal/inicial.do?evento=montaMenu&acronym=CERT_NEG', 'Certidão negativa municipal, Alvará de funcionamento', ''],
        ['Certidão Cível Negativa (TJMG)', 'https://rupe.tjmg.jus.br/rupe/justica/publico/certidoes/criarSolicitacaoCertidao.rupe?solicitacaoPublica=true', 'Certidões e regularidade, Jurídica', 'Sempre tentar pelo Microsoft Edge'],
        ['Certidão Extrajudiciais e/ou Administrativos (MPMG)', 'https://aplicacao.mpmg.mp.br/ouvidoria/service/cidadao/certidao', 'Certidões e regularidade', '']
      ];

      for (const link of linksIniciais) {
        await prisma.$executeRawUnsafe(
          'INSERT INTO "link_externo_documento" (nome, url, tipos_relacionados, observacao) VALUES ($1, $2, $3, $4)',
          link[0], link[1], link[2], link[3]
        );
      }
      console.log("Links iniciais inseridos!");
    }
  } catch (error: any) {
    console.error("Erro ao preparar banco:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
