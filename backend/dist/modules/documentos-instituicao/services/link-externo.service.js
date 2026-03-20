import { prisma } from "../../../database/prisma.js";
const sqlEstruturaLinksExternos = `
  CREATE TABLE IF NOT EXISTS "link_externo_documento" (
    "id" SERIAL PRIMARY KEY,
    "nome" VARCHAR(200) NOT NULL,
    "url" TEXT NOT NULL,
    "tipos_relacionados" TEXT,
    "observacao" TEXT,
    "criado_em" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "atualizado_em" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
`;
const linksPadrao = [
    [
        "1º Ofício de Registro de Pessoas Jurídicas (Uberlândia)",
        "https://1oficioudi.com.br/",
        "Estatuto social, Ata de fundação, Ata de eleição da diretoria, Ata de posse da diretoria, Regimento interno",
        "Consulta e registro de documentos cartoriais"
    ],
    [
        "Cadastro Nacional de Entidades Sociais (CNEAS)",
        "https://aplicacoes.mds.gov.br/cneas/",
        "Qualificação OSCIP, Certificado CEBAS",
        "Mantenha seus dados atualizados no MDS"
    ],
    [
        "CAGEF - Cadastro de Fornecedores (MG)",
        "https://www.compras.mg.gov.br/fornecedor/cagef",
        "Certidões e regularidade",
        "Essencial para contratar com o Estado de MG"
    ],
    [
        "Certidão Comprobatória de Atividade (CCA - Uberlândia)",
        "http://portalsiat.uberlandia.mg.gov.br/dsf_udi_portal/inicial.do?evento=montaMenu&acronym=MOB_CCA",
        "Comprovante de inscrição municipal",
        "Número de inscrição é 261.300-00"
    ],
    [
        "Certidão Cível Negativa (TJMG)",
        "https://rupe.tjmg.jus.br/rupe/justica/publico/certidoes/criarSolicitacaoCertidao.rupe?solicitacaoPublica=true",
        "Certidões e regularidade, Jurídica",
        "Sempre tentar pelo Microsoft Edge"
    ],
    [
        "Certidão de Débitos Federais (União)",
        "https://www.gov.br/pt-br/servicos/emitir-certidao-de-regularidade-fiscal",
        "Certidão negativa federal",
        ""
    ],
    [
        "Certidão de Débitos Trabalhistas (CNDT)",
        "https://www.tst.jus.br/certidao1",
        "Certidão trabalhista",
        ""
    ],
    [
        "Certidão de Situação Cadastral (Uberlândia)",
        "http://portalsiat.uberlandia.mg.gov.br/dsf_udi_portal/inicial.do?evento=montaMenu&acronym=MOB_SITCAD",
        "Certidão negativa municipal",
        ""
    ],
    [
        "Certidão Extrajudiciais e/ou Administrativos (MPMG)",
        "https://aplicacao.mpmg.mp.br/ouvidoria/service/cidadao/certidao",
        "Certidões e regularidade",
        ""
    ],
    [
        "Certidão Municipal Negativa Pessoa (Uberlândia)",
        "http://portalsiat.uberlandia.mg.gov.br/dsf_udi_portal/inicial.do?evento=montaMenu&acronym=CERT_NEG",
        "Certidão negativa municipal, Alvará de funcionamento",
        ""
    ],
    [
        "Certidão Negativa Estadual (MG)",
        "https://www2.fazenda.mg.gov.br/sol/ctrl/SOL/CDT/SERVICO_829?ACAO=INICIAR#",
        "Certidão negativa estadual",
        ""
    ],
    [
        "Certificado de Regularidade do FGTS (CRF)",
        "https://consulta-crf.caixa.gov.br/consultacrf/pages/impressao.jsf",
        "Certidão do FGTS",
        ""
    ],
    [
        "Junta Comercial de Minas Gerais (JUCEMG)",
        "https://www.jucemg.mg.gov.br/",
        "Estatuto social",
        "Registro de sociedades empresárias e cooperativas"
    ],
    [
        "Parcerias Municipais (Prefeitura Uberlândia)",
        "https://www.uberlandia.mg.gov.br/transparencia/parcerias-e-convenios/",
        "Termo de fomento ou colaboração, Prestação de contas",
        "Portal da Transparência local"
    ],
    [
        "Portal e-CAC (Receita Federal)",
        "https://cav.receita.fazenda.gov.br/autenticacao/login",
        "Procuração, Cartão do CNPJ",
        "Acesso via Certificado Digital ou conta gov.br"
    ],
    [
        "Portal Transferegov (Governo Federal)",
        "https://www.gov.br/transferegov/pt-br",
        "Plano de trabalho, Termo de fomento ou colaboração, Prestação de contas",
        "Gestão de convênios federais"
    ]
];
let estruturaInicializada = false;
async function ensureLinkExternoEstrutura() {
    if (estruturaInicializada)
        return;
    await prisma.$executeRawUnsafe(sqlEstruturaLinksExternos);
    const totalRegistros = await prisma.$queryRawUnsafe('SELECT COUNT(*)::bigint AS count FROM "link_externo_documento"');
    const total = Number(totalRegistros[0]?.count ?? 0);
    if (total === 0) {
        for (const [nome, url, tiposRelacionados, observacao] of linksPadrao) {
            await prisma.$executeRawUnsafe('INSERT INTO "link_externo_documento" (nome, url, tipos_relacionados, observacao) VALUES ($1, $2, $3, $4)', nome, url, tiposRelacionados ?? null, observacao ?? null);
        }
    }
    estruturaInicializada = true;
}
export class LinkExternoService {
    async listar() {
        await ensureLinkExternoEstrutura();
        return prisma.$queryRawUnsafe('SELECT * FROM "link_externo_documento" ORDER BY nome ASC');
    }
    async salvar(payload, id) {
        await ensureLinkExternoEstrutura();
        if (id) {
            return prisma.$executeRawUnsafe('UPDATE "link_externo_documento" SET nome = $1, url = $2, tipos_relacionados = $3, observacao = $4, atualizado_em = NOW() WHERE id = $5', payload.nome, payload.url, payload.tiposRelacionados, payload.observacao, id);
        }
        return prisma.$executeRawUnsafe('INSERT INTO "link_externo_documento" (nome, url, tipos_relacionados, observacao) VALUES ($1, $2, $3, $4)', payload.nome, payload.url, payload.tiposRelacionados, payload.observacao);
    }
    async excluir(id) {
        await ensureLinkExternoEstrutura();
        return prisma.$executeRawUnsafe('DELETE FROM "link_externo_documento" WHERE id = $1', id);
    }
}
