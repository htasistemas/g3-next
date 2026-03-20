import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config();

const prisma = new PrismaClient();

async function main() {
  const novosLinks = [
    [
      "1º Ofício de Registro de Pessoas Jurídicas (Uberlândia)",
      "https://1oficioudi.com.br/",
      "Estatuto social, Ata de fundação, Ata de eleição da diretoria, Ata de posse da diretoria, Regimento interno",
      "Consulta e registro de documentos cartoriais"
    ],
    [
      "Junta Comercial de Minas Gerais (JUCEMG)",
      "https://www.jucemg.mg.gov.br/",
      "Estatuto social",
      "Registro de sociedades empresárias e cooperativas"
    ],
    [
      "Portal Transferegov (Governo Federal)",
      "https://www.gov.br/transferegov/pt-br",
      "Plano de trabalho, Termo de fomento ou colaboração, Prestação de contas",
      "Gestão de convênios federais"
    ],
    [
      "Portal e-CAC (Receita Federal)",
      "https://cav.receita.fazenda.gov.br/autenticacao/login",
      "Procuração, Cartão do CNPJ",
      "Acesso via Certificado Digital ou conta gov.br"
    ],
    [
      "Cadastro Nacional de Entidades Sociais (CNEAS)",
      "https://aplicacoes.mds.gov.br/cneas/",
      "Qualificação OSCIP, Certificado CEBAS",
      "Mantenha seus dados atualizados no MDS"
    ],
    [
      "Parcerias Municipais (Prefeitura Uberlândia)",
      "https://www.uberlandia.mg.gov.br/transparencia/parcerias-e-convenios/",
      "Termo de fomento ou colaboração, Prestação de contas",
      "Portal da Transparência local"
    ],
    [
      "CAGEF - Cadastro de Fornecedores (MG)",
      "https://www.compras.mg.gov.br/fornecedor/cagef",
      "Certidões e regularidade",
      "Essencial para contratar com o Estado de MG"
    ]
  ];

  console.log("Iniciando inclusão dos links restantes...");

  for (const link of novosLinks) {
    try {
      const existe = await prisma.$queryRawUnsafe<any[]>(
        'SELECT id FROM "link_externo_documento" WHERE nome = $1',
        link[0]
      );

      if (existe.length === 0) {
        await prisma.$executeRawUnsafe(
          'INSERT INTO "link_externo_documento" (nome, url, tipos_relacionados, observacao) VALUES ($1, $2, $3, $4)',
          link[0],
          link[1],
          link[2],
          link[3]
        );
        console.log(`Link adicionado: ${link[0]}`);
      } else {
        console.log(`Link já existe: ${link[0]}`);
      }
    } catch (error: any) {
      console.error(`Erro ao inserir link ${link[0]}:`, error.message);
    }
  }

  console.log("\nTodos os links foram processados!");
  await prisma.$disconnect();
}

main();
