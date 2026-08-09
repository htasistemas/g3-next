import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/database/prisma.js";
import { ensureChecklistDiarioEstrutura } from "../src/modules/checklist-diario/repositories/checklist-diario-estrutura.repository.js";
import { ensureCarteiraEventoEstrutura } from "../src/modules/carteira-evento/repositories/carteira-evento-estrutura.repository.js";

const DEMO = "DEMO_TORRESOFT";
const CNPJ_FORMATADO = "32.004.110/0001-18";
const CNPJ_LIMPO = "32004110000118";
const LOGIN = "torresoftbrasil@gmail.com";
const SENHA_INICIAL = "Admin@123";
const NOME_ADMIN = "Administrador Demonstração Torresoft";

type IdRow = { id: bigint };
type UuidRow = { id: string; tenant_id: string };
type CountRow = { total: bigint };

const nomes = [
  "Amanda Vieira Monteiro", "Bruno Martins Valença", "Carolina Nogueira Prado", "Daniel Campos Ferreira",
  "Elisa Moreira Vasconcelos", "Felipe Nunes Albuquerque", "Gabriela Rocha Mendonça", "Henrique Tavares Lima",
  "Isabela Costa Meireles", "João Pedro Valverde", "Lívia Andrade Caminha", "Marcos Vinícius Tavares",
  "Natália Campos Duarte", "Otávio Ribeiro Farias", "Paula Martins Azevedo", "Rafael Teixeira Lemos",
  "Sofia Cardoso Nunes", "Thiago Almeida Prado", "Valentina Moraes Falcão", "Yasmin Duarte Reis",
  "Arthur Moreira Braga", "Beatriz Nogueira Ramos", "Caio Henrique Silveira", "Davi Costa Almeida",
  "Emanuelly Rocha Mendes", "Fernanda Batista Paiva", "Gustavo Pires Albuquerque", "Helena Tavares Duarte",
  "Igor Fernandes Lima", "Júlia Martins Valença", "Kevin Augusto Prado", "Larissa Monteiro Campos",
  "Miguel Nunes Farias", "Nicole Ribeiro Barros", "Pedro Henrique Meireles", "Quitéria Vasconcelos Moura",
  "Raquel Lima Cardoso", "Samuel Rocha Teixeira", "Tainá Prado Albuquerque", "Victor Nogueira Duarte",
  "Alice Campos Ferreira", "Bernardo Vieira Ramos", "Clara Martins Falcão", "Diego Almeida Nunes",
  "Eduarda Meireles Prado", "Fábio Ribeiro Batista", "Giovana Costa Valverde", "Hugo Tavares Lemos",
  "Ingrid Rocha Caminha", "José Augusto Moraes", "Karen Duarte Silveira", "Leonardo Prado Martins",
  "Marina Nogueira Farias", "Noah Henrique Paiva", "Olívia Cardoso Braga", "Pietro Almeida Reis",
  "Rebeca Monteiro Lima", "Sara Valença Campos", "Tomás Nunes Duarte", "Vitória Moreira Tavares"
];

const bairros = ["Jardim Aurora", "Nova Esperança", "Vila Harmonia", "Parque das Flores", "Residencial Horizonte", "Centro", "Jardim Vitória", "Bela Vista"];
const unidades = [
  { nome: "Unidade Social Horizonte", tipo: "ASSISTENCIAL", salas: ["Recepção social", "Atendimento social", "Sala multiuso"] },
  { nome: "Centro Comunitário Nova Esperança", tipo: "ASSISTENCIAL", salas: ["Sala de oficinas", "Sala de psicologia", "Auditório comunitário"] },
  { nome: "Unidade Educacional Caminhos", tipo: "ENSINO", salas: ["Sala Maternal", "Sala Pré I", "Sala Pré II", "Sala 1º Ano", "Sala 2º Ano", "Sala 3º Ano", "Sala 4º Ano", "Sala 5º Ano"] },
  { nome: "Núcleo de Atendimento Bem Viver", tipo: "ASSISTENCIAL", salas: ["Sala saúde", "Sala família", "Sala convivência"] },
  { nome: "Centro de Desenvolvimento Integração", tipo: "ASSISTENCIAL", salas: ["Laboratório digital", "Sala de música", "Sala de artes"] }
];
const categoriasProfissionais = ["Assistente social", "Psicólogo", "Pedagogo", "Professor", "Coordenador pedagógico", "Educador social", "Nutricionista", "Administrativo"];
const projetosDemo = ["Projeto Futuro em Movimento", "Projeto Aprender Mais", "Projeto Família Presente", "Projeto Esporte e Cidadania", "Projeto Conexão Jovem", "Projeto Vida Ativa", "Projeto Inclusão Digital", "Projeto Caminhos do Saber", "Projeto Primeira Infância", "Projeto Alimentar Bem"];
const disciplinas = ["Língua Portuguesa", "Matemática", "Ciências", "História", "Geografia", "Arte", "Educação Física"];

function normalizarCnpj(value: string) {
  return value.replace(/\D/g, "");
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function moeda(index: number, base = 850) {
  return Number((base + (index % 17) * 137.43 + Math.floor(index / 5) * 28.5).toFixed(2));
}

function gerarCpfValido(seed: number) {
  const base = String(700000000 + seed * 37).padStart(9, "0").slice(0, 9);
  const calc = (digits: string, fatorInicial: number) => {
    const soma = digits.split("").reduce((acc, digito, idx) => acc + Number(digito) * (fatorInicial - idx), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = calc(base, 10);
  const d2 = calc(`${base}${d1}`, 11);
  return `${base}${d1}${d2}`;
}

function bigintToString(value: unknown) {
  return typeof value === "bigint" ? value.toString() : value;
}

async function tableExists(tx: typeof prisma, table: string) {
  const rows = await tx.$queryRawUnsafe<Array<{ exists: boolean }>>(
    "SELECT to_regclass($1) IS NOT NULL AS exists",
    `public.${table}`
  );
  return Boolean(rows[0]?.exists);
}

async function count(tx: typeof prisma, table: string, tenantId: string) {
  if (!(await tableExists(tx, table))) return 0;
  const compraChildFk: Record<string, string> = {
    autorizacao_compras_item: "autorizacao_compra_id",
    autorizacao_compras_cotacoes: "autorizacao_compra_id",
    autorizacao_compras_aprovacao: "autorizacao_compra_id",
    autorizacao_compras_reserva_bancaria: "autorizacao_compra_id",
    autorizacao_compras_historico: "autorizacao_compra_id",
    autorizacao_compras_integracao: "autorizacao_compra_id"
  };
  if (compraChildFk[table]) {
    const rows = await tx.$queryRawUnsafe<CountRow[]>(
      `
      SELECT COUNT(*)::bigint AS total
      FROM "${table}" filho
      INNER JOIN autorizacao_compras compra ON compra.id = filho."${compraChildFk[table]}"
      WHERE compra.tenant_id::text = $1
      `,
      tenantId
    );
    return Number(rows[0]?.total ?? 0n);
  }
  const carteiraChildFk: Record<string, string> = {
    carteira_evento_participante: "evento_id",
    carteira_evento_barraca: "evento_id",
    carteira_evento_item: "evento_id",
    carteira_evento_venda: "evento_id",
    carteira_evento_movimentacao: "evento_id"
  };
  if (carteiraChildFk[table]) {
    const rows = await tx.$queryRawUnsafe<CountRow[]>(
      `
      SELECT COUNT(*)::bigint AS total
      FROM "${table}" filho
      INNER JOIN carteira_evento evento ON evento.id = filho."${carteiraChildFk[table]}"
      WHERE evento.tenant_id::text = $1
      `,
      tenantId
    );
    return Number(rows[0]?.total ?? 0n);
  }
  if (table === "carteira_evento_venda_item") {
    const rows = await tx.$queryRawUnsafe<CountRow[]>(
      `
      SELECT COUNT(*)::bigint AS total
      FROM carteira_evento_venda_item item
      INNER JOIN carteira_evento_venda venda ON venda.id = item.venda_id
      INNER JOIN carteira_evento evento ON evento.id = venda.evento_id
      WHERE evento.tenant_id::text = $1
      `,
      tenantId
    );
    return Number(rows[0]?.total ?? 0n);
  }
  const tenantColumn = await tx.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = 'tenant_id'
    ) AS exists
    `,
    table
  );
  if (!tenantColumn[0]?.exists) {
    const rows = await tx.$queryRawUnsafe<CountRow[]>(`SELECT COUNT(*)::bigint AS total FROM "${table}"`);
    return Number(rows[0]?.total ?? 0n);
  }
  const rows = await tx.$queryRawUnsafe<CountRow[]>(
    `SELECT COUNT(*)::bigint AS total FROM "${table}" WHERE tenant_id::text = $1`,
    tenantId
  );
  return Number(rows[0]?.total ?? 0n);
}

async function getInstituicao(tx: typeof prisma) {
  const rows = await tx.$queryRawUnsafe<UuidRow[]>(
    `
    SELECT id::text AS id, tenant_id::text AS tenant_id
    FROM instituicoes
    WHERE regexp_replace(cnpj, '\\D', '', 'g') = $1
    LIMIT 1
    `,
    CNPJ_LIMPO
  );
  if (rows[0]) return rows[0];

  const id = randomUUID();
  const tenantId = randomUUID();
  await tx.$executeRawUnsafe(
    `
    INSERT INTO instituicoes (
      id, tenant_id, codigo, cnpj, razao_social, nome_fantasia, slug, email, telefone, endereco,
      plano, status, logo_url, cor_tema, storage_limit_mb, usuarios_limit, database_mode,
      database_key, criado_em, atualizado_em
    )
    VALUES (
      $1::uuid, $2::uuid, 'TORRESOFT', $3, 'TORRESOFT', 'Torresoft', 'torresoft',
      $4, '(34) 3000-0000', 'Endereço fictício de demonstração',
      'DEMO', 'ATIVO', NULL, '#0f8b4c', 10240, 50, 'shared', 'torresoft', NOW(), NOW()
    )
    `,
    id,
    tenantId,
    CNPJ_FORMATADO,
    LOGIN
  );
  return { id, tenant_id: tenantId };
}

async function garantirUsuario(tx: typeof prisma, tenantId: string, instituicaoId: string) {
  const senhaHash = await bcrypt.hash(SENHA_INICIAL, 10);
  const usuarioRows = await tx.$queryRawUnsafe<IdRow[]>(
    `
    SELECT id
    FROM usuarios
    WHERE tenant_id::text = $1
      AND lower(coalesce(email, '')) = $2
      AND deletado_em IS NULL
    LIMIT 1
    `,
    tenantId,
    LOGIN
  );

  let usuarioId = usuarioRows[0]?.id;
  if (usuarioId) {
    await tx.$executeRawUnsafe(
      `
      UPDATE usuarios
      SET nome_usuario = $2,
          nome = $3,
          nome_exibicao = $3,
          email = $2,
          senha_hash = $4,
          status = 'ATIVO',
          perfil_acesso = 'ADMINISTRADOR',
          is_superadmin = FALSE,
          exigir_troca_senha = FALSE,
          exigir_autenticacao_segura = FALSE,
          permitir_biometria_facial_login = FALSE,
          exigir_biometria_facial_login = FALSE,
          tentativas_login_invalidas = 0,
          ultimo_login_invalido_em = NULL,
          instituicao_id = $5::uuid,
          ultimo_tenant_id = $1::uuid,
          atualizado_em = NOW()
      WHERE id = $6
        AND tenant_id::text = $1
      `,
      tenantId,
      LOGIN,
      NOME_ADMIN,
      senhaHash,
      instituicaoId,
      usuarioId
    );
  } else {
    const created = await tx.$queryRawUnsafe<IdRow[]>(
      `
      INSERT INTO usuarios (
        nome_usuario, nome, nome_exibicao, email, senha_hash, criado_em, atualizado_em,
        status, exigir_troca_senha, tentativas_login_invalidas, tenant_id, instituicao_id,
        perfil_acesso, is_superadmin, ultimo_tenant_id, exigir_autenticacao_segura,
        permitir_biometria_facial_login, exigir_biometria_facial_login
      )
      VALUES ($1, $2, $2, $1, $3, NOW(), NOW(), 'ATIVO', FALSE, 0, $4::uuid, $5::uuid,
              'ADMINISTRADOR', FALSE, $4::uuid, FALSE, FALSE, FALSE)
      RETURNING id
      `,
      LOGIN,
      NOME_ADMIN,
      senhaHash,
      tenantId,
      instituicaoId
    );
    usuarioId = created[0].id;
  }

  const permissao = await tx.$queryRawUnsafe<IdRow[]>(
    `
    INSERT INTO permissao (nome)
    SELECT 'ADMINISTRADOR'
    WHERE NOT EXISTS (SELECT 1 FROM permissao WHERE nome = 'ADMINISTRADOR')
    RETURNING id
    `
  );
  const permissaoId =
    permissao[0]?.id ??
    (await tx.$queryRawUnsafe<IdRow[]>("SELECT id FROM permissao WHERE nome = 'ADMINISTRADOR' LIMIT 1"))[0].id;

  await tx.$executeRawUnsafe(
    `
    INSERT INTO usuario_permissao (usuario_id, permissao_id)
    SELECT $1, $2
    WHERE NOT EXISTS (
      SELECT 1 FROM usuario_permissao WHERE usuario_id = $1 AND permissao_id = $2
    )
    `,
    usuarioId,
    permissaoId
  );
  return usuarioId;
}

async function criarEndereco(tx: typeof prisma, index: number) {
  const rows = await tx.$queryRawUnsafe<IdRow[]>(
    `
    INSERT INTO endereco (cep, logradouro, numero, complemento, bairro, cidade, estado, criado_em, atualizado_em)
    VALUES ($1, $2, $3, $4, $5, 'Uberlândia', 'MG', NOW(), NOW())
    RETURNING id
    `,
    `3840${String(index % 1000).padStart(3, "0")}`,
    `Rua Demonstração ${index}`,
    String(100 + index),
    `${DEMO}`,
    bairros[index % bairros.length]
  );
  return rows[0].id;
}

async function garantirUnidades(tx: typeof prisma, tenantId: string) {
  const resultado: Array<{ id: bigint; nome: string; tipo: string; salas: bigint[] }> = [];
  for (let i = 0; i < unidades.length; i += 1) {
    const unidade = unidades[i];
    const existing = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM unidade_assistencial WHERE tenant_id::text = $1 AND nome_fantasia = $2 LIMIT 1",
      tenantId,
      unidade.nome
    );
    const enderecoId = existing[0] ? undefined : await criarEndereco(tx, 900 + i);
    const id =
      existing[0]?.id ??
      (
        await tx.$queryRawUnsafe<IdRow[]>(
          `
          INSERT INTO unidade_assistencial (
            nome_fantasia, razao_social, cnpj, email, telefone, horario_funcionamento, observacoes,
            criado_em, atualizado_em, unidade_principal, endereco_id, tenant_id, tipo_unidade
          )
          VALUES ($1, $1, $2, $3, '(34) 3000-0000', '08:00 às 17:00',
                  $4, NOW(), NOW(), $5, $6, $7::uuid, $8)
          RETURNING id
          `,
          unidade.nome,
          i === 0 ? CNPJ_FORMATADO : null,
          `unidade${i + 1}@exemplo.com.br`,
          `${DEMO} - unidade fictícia para apresentação comercial.`,
          i === 0,
          enderecoId,
          tenantId,
          unidade.tipo
        )
      )[0].id;

    const salasIds: bigint[] = [];
    for (let j = 0; j < unidade.salas.length; j += 1) {
      const salaNome = unidade.salas[j];
      const salaExistente = await tx.$queryRawUnsafe<IdRow[]>(
        "SELECT id FROM salas_unidade WHERE unidade_id = $1 AND nome = $2 LIMIT 1",
        id,
        salaNome
      );
      const salaId =
        salaExistente[0]?.id ??
        (
          await tx.$queryRawUnsafe<IdRow[]>(
            `
            INSERT INTO salas_unidade (unidade_id, nome, capacidade_maxima, ativo, criado_em, atualizado_em)
            VALUES ($1, $2, $3, TRUE, NOW(), NOW())
            RETURNING id
            `,
            id,
            salaNome,
            unidade.tipo === "ENSINO" ? 28 : 18 + j * 4
          )
        )[0].id;
      salasIds.push(salaId);
    }
    resultado.push({ id, nome: unidade.nome, tipo: unidade.tipo, salas: salasIds });
  }
  return resultado;
}

async function garantirBeneficiarios(tx: typeof prisma, tenantId: string) {
  await tx.$executeRawUnsafe("ALTER TABLE IF EXISTS cadastro_beneficiario ADD COLUMN IF NOT EXISTS status_cadastral VARCHAR(40)");
  await tx.$executeRawUnsafe("ALTER TABLE IF EXISTS cadastro_beneficiario ADD COLUMN IF NOT EXISTS modo_cadastro VARCHAR(40)");
  await tx.$executeRawUnsafe("ALTER TABLE IF EXISTS cadastro_beneficiario ADD COLUMN IF NOT EXISTS percentual_completude NUMERIC(5,2)");
  await tx.$executeRawUnsafe("ALTER TABLE IF EXISTS cadastro_beneficiario ADD COLUMN IF NOT EXISTS completude_calculada_em TIMESTAMP");
  await tx.$executeRawUnsafe("ALTER TABLE IF EXISTS cadastro_beneficiario ADD COLUMN IF NOT EXISTS ultima_revisao_cadastral DATE");
  await tx.$executeRawUnsafe("ALTER TABLE IF EXISTS cadastro_beneficiario ADD COLUMN IF NOT EXISTS proxima_revisao_cadastral DATE");

  const ids: bigint[] = [];
  for (let i = 0; i < 129; i += 1) {
    const codigo = `DEMO-TS-BEN-${String(i + 1).padStart(4, "0")}`;
    const nome = nomes[i % nomes.length] + (i >= nomes.length ? ` ${Math.floor(i / nomes.length) + 1}` : "");
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM cadastro_beneficiario WHERE tenant_id::text = $1 AND codigo = $2 LIMIT 1",
      tenantId,
      codigo
    );
    let id = existente[0]?.id;
    if (!id) {
      const nascimento = addDays(new Date("1948-01-01T00:00:00Z"), i * 71);
      const enderecoId = await criarEndereco(tx, i + 1);
      id = (
        await tx.$queryRawUnsafe<IdRow[]>(
          `
          INSERT INTO cadastro_beneficiario (
            codigo, nome_completo, data_nascimento, sexo_biologico, cor_raca, estado_civil,
            nacionalidade, naturalidade_cidade, naturalidade_uf, nome_mae, nome_pai,
            criado_em, atualizado_em, endereco_id, status, opta_receber_cesta_basica,
            apto_receber_cesta_basica, tenant_id, status_cadastral, modo_cadastro,
            percentual_completude, completude_calculada_em, ultima_revisao_cadastral,
            proxima_revisao_cadastral
          )
          VALUES (
            $1, $2, $3::date, $4, $5, $6, 'Brasileira', 'Uberlândia', 'MG',
            $7, $8, NOW(), NOW(), $9, 'ATIVO', $10, $11, $12::uuid,
            'COMPLETO', 'DEMONSTRACAO', $13, NOW(), $14::date, $15::date
          )
          RETURNING id
          `,
          codigo,
          nome,
          dateOnly(nascimento),
          i % 2 === 0 ? "FEMININO" : "MASCULINO",
          ["Parda", "Branca", "Preta", "Amarela"][i % 4],
          i < 35 ? "Solteiro(a)" : i % 3 === 0 ? "Casado(a)" : "Solteiro(a)",
          `Mãe Fictícia ${i + 1}`,
          `Pai Fictício ${i + 1}`,
          enderecoId,
          i % 5 === 0,
          i % 4 === 0,
          tenantId,
          78 + (i % 21),
          dateOnly(addDays(new Date(), -30 - (i % 90))),
          dateOnly(addDays(new Date(), 120 + (i % 180)))
        )
      )[0].id;
      await tx.$executeRawUnsafe(
        `
        INSERT INTO contato_beneficiario (
          beneficiario_id, telefone_principal, telefone_principal_whatsapp, telefone_secundario,
          email, permite_contato_tel, permite_contato_whatsapp, permite_contato_sms,
          permite_contato_email, horario_preferencial_contato, criado_em, atualizado_em, tenant_id
        )
        VALUES ($1, $2, TRUE, $3, $4, TRUE, TRUE, FALSE, TRUE, 'Manhã', NOW(), NOW(), $5::uuid)
        `,
        id,
        `349${String(80000000 + i).slice(0, 8)}`,
        `3432${String(100000 + i).slice(0, 6)}`,
        `beneficiario${String(i + 1).padStart(3, "0")}@exemplo.com.br`,
        tenantId
      );
      await tx.$executeRawUnsafe(
        `
        INSERT INTO documentos (
          beneficiario_id, tipo_documento, numero_documento, orgao_emissor, uf_emissor,
          data_emissao, nome_documento, obrigatorio, criado_em, atualizado_em, tenant_id,
          categoria, documento_principal, ativo, versao, observacao
        )
        VALUES ($1, 'CPF', $2, 'SSP', 'MG', $3::date, 'Documento fictício de demonstração',
                TRUE, NOW(), NOW(), $4::uuid, 'IDENTIFICACAO', TRUE, TRUE, 1, $5)
        `,
        id,
        gerarCpfValido(i + 1),
        dateOnly(addDays(new Date(), -1000 - i)),
        tenantId,
        `${DEMO} - documento fictício.`
      );
      await tx.$executeRawUnsafe(
        `
        INSERT INTO situacao_social (
          beneficiario_id, mora_com_familia, responsavel_legal, vinculo_familiar,
          situacao_vulnerabilidade, composicao_familiar, criancas_adolescentes, idosos,
          acompanhamento_cras, acompanhamento_saude, participa_comunidade, rede_apoio,
          criado_em, atualizado_em, tenant_id
        )
        VALUES ($1, TRUE, $2, $3, $4, $5, $6, $7, $8, $9, 'Participa de atividades comunitárias',
                'Rede familiar e serviços locais', NOW(), NOW(), $10::uuid)
        `,
        id,
        i % 4 === 0,
        i < 52 ? "Filho(a)" : "Responsável",
        ["Baixa", "Média", "Em acompanhamento", "Sem vulnerabilidade crítica"][i % 4],
        `Composição familiar fictícia ${i + 1}`,
        i % 5,
        i % 7 === 0 ? 1 : 0,
        i % 3 === 0,
        i % 4 === 0,
        tenantId
      );
      await tx.$executeRawUnsafe(
        `
        INSERT INTO escolaridade_beneficiario (
          beneficiario_id, sabe_ler_escrever, nivel_escolaridade, estuda_atualmente,
          ocupacao, situacao_trabalho, renda_mensal, fonte_renda, criado_em, atualizado_em, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), $9::uuid)
        `,
        id,
        i > 12,
        i < 52 ? "Educação básica" : ["Ensino fundamental", "Ensino médio", "Ensino superior", "Não informado"][i % 4],
        i < 52,
        i < 52 ? "Estudante" : categoriasProfissionais[i % categoriasProfissionais.length],
        i < 52 ? "Não se aplica" : ["Formal", "Autônomo", "Desempregado", "Aposentado"][i % 4],
        i < 52 ? "0,00" : String(moeda(i, 900)).replace(".", ","),
        i < 52 ? "Responsável familiar" : "Renda própria",
        tenantId
      );
      await tx.$executeRawUnsafe(
        `
        INSERT INTO observacoes_beneficiario (
          beneficiario_id, aceite_lgpd, data_aceite_lgpd, observacoes, criado_em, atualizado_em, tenant_id
        )
        VALUES ($1, TRUE, $2::date, $3, NOW(), NOW(), $4::uuid)
        `,
        id,
        dateOnly(addDays(new Date(), -120 - (i % 300))),
        `${DEMO} - cadastro fictício para navegação comercial. Beneficiário acompanhado conforme planejamento institucional.`,
        tenantId
      );
    }
    ids.push(id);
  }
  return ids;
}

async function garantirFamilias(tx: typeof prisma, tenantId: string, beneficiarios: bigint[]) {
  const ids: bigint[] = [];
  const beneficiariosBaseFamilias = beneficiarios.slice(0, 105);
  for (let i = 0; i < 38; i += 1) {
    const nomeFamilia = `Família Demo Torresoft ${String(i + 1).padStart(2, "0")}`;
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM vinculo_familiar WHERE tenant_id::text = $1 AND nome_familia = $2 LIMIT 1",
      tenantId,
      nomeFamilia
    );
    const referenciaId = beneficiariosBaseFamilias[(i * 2) % beneficiariosBaseFamilias.length];
    const id =
      existente[0]?.id ??
      (
        await tx.$queryRawUnsafe<IdRow[]>(
          `
          INSERT INTO vinculo_familiar (
            nome_familia, id_referencia_familiar, status, cep, logradouro, numero, bairro,
            municipio, uf, situacao_imovel, tipo_moradia, agua_encanada, esgoto_tipo,
            coleta_lixo, energia_eletrica, internet, arranjo_familiar, qtd_membros,
            qtd_criancas, qtd_adolescentes, qtd_idosos, renda_familiar_total, renda_per_capita,
            faixa_renda_per_capita, principais_fontes_renda, situacao_inseguranca_alimentar,
            tecnico_responsavel, periodicidade_atendimento, proxima_visita_prevista,
            observacoes, criado_em, atualizado_em, tenant_id
          )
          VALUES ($1, $2, 'ATIVO', '38400000', 'Rua Família Demonstrativa', $3, $4,
                  'Uberlândia', 'MG', 'Alugado', 'Casa', TRUE, 'Rede pública', 'Regular',
                  TRUE, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                  'Trabalho e benefícios sociais', $14, 'Equipe social Torresoft',
                  'Mensal', $15::date, $16, NOW(), NOW(), $17::uuid)
          RETURNING id
          `,
          nomeFamilia,
          referenciaId,
          String(200 + i),
          bairros[i % bairros.length],
          i % 3 !== 0,
          ["Nuclear", "Monoparental", "Extensa"][i % 3],
          3 + (i % 4),
          1 + (i % 3),
          i % 2,
          i % 6 === 0 ? 1 : 0,
          String(moeda(i, 1800)).replace(".", ","),
          String(moeda(i, 450)).replace(".", ","),
          ["Até 1/2 salário mínimo", "Entre 1/2 e 1 salário mínimo", "Acima de 1 salário mínimo"][i % 3],
          ["Leve", "Moderada", "Sem insegurança informada"][i % 3],
          dateOnly(addDays(new Date(), 20 + i * 3)),
          `${DEMO} - família fictícia com histórico suficiente para apresentação.`,
          tenantId
        )
      )[0].id;
    ids.push(id);

    const quantidadeMembros = await tx.$queryRawUnsafe<CountRow[]>(
      `
      SELECT COUNT(*)::bigint AS total
      FROM vinculo_familiar_membro
      WHERE tenant_id::text = $1
        AND vinculo_familiar_id = $2
      `,
      tenantId,
      id
    );
    for (let j = Number(quantidadeMembros[0]?.total ?? 0); j < 3; j += 1) {
      const beneficiarioId = beneficiariosBaseFamilias[(i * 3 + j) % beneficiariosBaseFamilias.length];
      await tx.$executeRawUnsafe(
        `
        INSERT INTO vinculo_familiar_membro (
          vinculo_familiar_id, beneficiario_id, parentesco, responsavel_familiar,
          contribui_renda, renda_individual, participa_servicos, observacoes,
          usa_endereco_familia, criado_em, atualizado_em, tenant_id
        )
        SELECT $1, $2, $3, $4, $5, $6, TRUE, $7, TRUE, NOW(), NOW(), $8::uuid
        WHERE NOT EXISTS (
          SELECT 1 FROM vinculo_familiar_membro
          WHERE tenant_id::text = $8 AND vinculo_familiar_id = $1 AND beneficiario_id = $2
        )
        `,
        id,
        beneficiarioId,
        j === 0 ? "Responsável legal" : j === 1 ? "Filho(a)" : "Irmão(ã)",
        j === 0,
        j === 0,
        j === 0 ? String(moeda(i, 1200)).replace(".", ",") : "0,00",
        `${DEMO} - vínculo familiar fictício.`,
        tenantId
      );
    }
  }
  return ids;
}

async function popularFamiliasVinculos(tx: typeof prisma, tenantId: string, beneficiarios: bigint[], familias: bigint[]) {
  type MembroFamiliaRow = {
    id: bigint;
    vinculo_familiar_id: bigint;
    beneficiario_id: bigint;
    responsavel_familiar: boolean | null;
  };

  const membros = await tx.$queryRawUnsafe<MembroFamiliaRow[]>(
    `
    SELECT m.id, m.vinculo_familiar_id, m.beneficiario_id, m.responsavel_familiar
    FROM vinculo_familiar_membro m
    INNER JOIN vinculo_familiar f ON f.id = m.vinculo_familiar_id
    WHERE m.tenant_id::text = $1
      AND f.tenant_id::text = $1
      AND f.nome_familia LIKE 'Fam%Demo Torresoft %'
      AND f.status = 'ATIVO'
    ORDER BY m.id
    `,
    tenantId
  );

  const usados = new Set<string>();
  const duplicados: MembroFamiliaRow[] = [];
  for (const membro of membros) {
    const beneficiarioKey = String(membro.beneficiario_id);
    if (usados.has(beneficiarioKey)) {
      duplicados.push(membro);
    } else {
      usados.add(beneficiarioKey);
    }
  }

  const livres = beneficiarios.filter((beneficiarioId) => !usados.has(String(beneficiarioId)));
  for (const membro of duplicados) {
    const novoBeneficiarioId = livres.shift();
    if (!novoBeneficiarioId) break;
    await tx.$executeRawUnsafe(
      `
      UPDATE vinculo_familiar_membro
      SET beneficiario_id = $1,
          parentesco = CASE WHEN responsavel_familiar THEN 'Responsável familiar' ELSE parentesco END,
          observacoes = $2,
          atualizado_em = NOW()
      WHERE id = $3
        AND tenant_id::text = $4
      `,
      novoBeneficiarioId,
      `${DEMO} - vínculo familiar fictício realocado para evitar beneficiário duplicado em famílias ativas.`,
      membro.id,
      tenantId
    );
    usados.add(String(novoBeneficiarioId));
  }

  for (let i = 0; i < familias.length; i += 1) {
    const familiaId = familias[i];
    const membrosFamilia = await tx.$queryRawUnsafe<MembroFamiliaRow[]>(
      `
      SELECT id, vinculo_familiar_id, beneficiario_id, responsavel_familiar
      FROM vinculo_familiar_membro
      WHERE tenant_id::text = $1
        AND vinculo_familiar_id = $2
      ORDER BY id
      `,
      tenantId,
      familiaId
    );
    if (!membrosFamilia.length) continue;

    const responsavel = membrosFamilia.find((membro) => membro.responsavel_familiar) ?? membrosFamilia[0];
    await tx.$executeRawUnsafe(
      `
      UPDATE vinculo_familiar_membro
      SET responsavel_familiar = CASE WHEN id = $1 THEN TRUE ELSE FALSE END,
          parentesco = CASE WHEN id = $1 THEN 'Responsável familiar' ELSE COALESCE(parentesco, 'Membro familiar') END,
          contribui_renda = CASE WHEN id = $1 THEN TRUE ELSE COALESCE(contribui_renda, FALSE) END,
          participa_servicos = TRUE,
          usa_endereco_familia = COALESCE(usa_endereco_familia, TRUE),
          atualizado_em = NOW()
      WHERE tenant_id::text = $2
        AND vinculo_familiar_id = $3
      `,
      responsavel.id,
      tenantId,
      familiaId
    );

    await tx.$executeRawUnsafe(
      `
      UPDATE vinculo_familiar
      SET id_referencia_familiar = $1,
          qtd_membros = $2,
          servicos_acompanhamento = $3,
          vulnerabilidades_familia = $4,
          possui_dividas_relevantes = $5,
          descricao_dividas = $6,
          qtd_pessoas_deficiencia = COALESCE(qtd_pessoas_deficiencia, 0),
          atualizado_em = NOW()
      WHERE id = $7
        AND tenant_id::text = $8
      `,
      responsavel.beneficiario_id,
      membrosFamilia.length,
      ["PAIF, convivência comunitária e acompanhamento escolar", "Orientação familiar e benefícios eventuais", "Acompanhamento social preventivo"][i % 3],
      ["Baixa renda e necessidade de acompanhamento periódico", "Rede de apoio familiar reduzida", "Sem vulnerabilidade crítica registrada"][i % 3],
      i % 5 === 0,
      i % 5 === 0 ? "Parcelas domésticas em acompanhamento pela equipe social." : null,
      familiaId,
      tenantId
    );

    const eventos = [
      {
        tipo: "familia_criada",
        descricao: `${DEMO} - família cadastrada a partir dos beneficiários já existentes na tenant Torresoft.`,
        dias: -540 - i,
        dados: { origem: "cadastro_beneficiario", membros: membrosFamilia.length }
      },
      {
        tipo: "composicao_atualizada",
        descricao: `${DEMO} - composição familiar revisada com responsável, parentescos e vínculos ativos.`,
        dias: -180 - i,
        dados: { responsavel_beneficiario_id: String(responsavel.beneficiario_id), membros: membrosFamilia.length }
      },
      {
        tipo: "acompanhamento_social",
        descricao: `${DEMO} - acompanhamento familiar registrado para demonstração da linha do tempo.`,
        dias: -30 - (i % 20),
        dados: { periodicidade: "Mensal", equipe: "Equipe social Torresoft" }
      }
    ];

    for (const evento of eventos) {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO familia_historico (
          tenant_id, familia_id, tipo_evento, descricao, dados_novos,
          justificativa, usuario_nome, data_evento
        )
        SELECT $1::uuid, $2, $3, $4, $5::jsonb, $6, 'Administrador Demonstração Torresoft', $7::timestamp
        WHERE NOT EXISTS (
          SELECT 1
          FROM familia_historico
          WHERE tenant_id::text = $1
            AND familia_id = $2
            AND tipo_evento = $3
            AND descricao = $4
        )
        `,
        tenantId,
        familiaId,
        evento.tipo,
        evento.descricao,
        JSON.stringify(evento.dados),
        "Registro fictício para demonstração comercial.",
        `${dateOnly(addDays(new Date(), evento.dias))} 10:00:00`
      );
    }
  }
}

async function garantirProfissionais(tx: typeof prisma, tenantId: string, unidadesCriadas: Awaited<ReturnType<typeof garantirUnidades>>) {
  const ids: bigint[] = [];
  for (let i = 0; i < 24; i += 1) {
    const nome = `Profissional Demonstração ${String(i + 1).padStart(2, "0")}`;
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM cadastro_profissionais WHERE tenant_id::text = $1 AND email = $2 LIMIT 1",
      tenantId,
      `profissional${i + 1}@exemplo.com.br`
    );
    const id =
      existente[0]?.id ??
      (
        await tx.$queryRawUnsafe<IdRow[]>(
          `
          INSERT INTO cadastro_profissionais (
            nome_completo, categoria, registro_conselho, especialidade, email, telefone,
            unidade, carga_horaria, disponibilidade, canais_atendimento, status, tags,
            resumo, observacoes, criado_em, atualizado_em, data_nascimento, sexo_biologico,
            nacionalidade, naturalidade_cidade, naturalidade_uf, cpf, vinculo,
            sala_atendimento, tenant_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Segunda a sexta',
                  'Presencial e remoto', 'ATIVO', $9, $10, $11, NOW(), NOW(),
                  $12::date, $13, 'Brasileira', 'Uberlândia', 'MG', $14,
                  'CLT', $15, $16::uuid)
          RETURNING id
          `,
          nome,
          categoriasProfissionais[i % categoriasProfissionais.length],
          `REG-DEMO-${String(i + 1).padStart(3, "0")}`,
          ["Famílias", "Educação", "Projetos", "Atendimento"][i % 4],
          `profissional${i + 1}@exemplo.com.br`,
          `349${String(91000000 + i).slice(0, 8)}`,
          unidadesCriadas[i % unidadesCriadas.length].nome,
          30 + (i % 4) * 5,
          `${DEMO}; demonstração; equipe`,
          "Profissional fictício para apresentação comercial.",
          `${DEMO} - agenda e atendimentos fictícios vinculados.`,
          dateOnly(addDays(new Date("1980-01-01T00:00:00Z"), i * 410)),
          i % 2 === 0 ? "FEMININO" : "MASCULINO",
          gerarCpfValido(500 + i),
          unidadesCriadas[i % unidadesCriadas.length].salas[0] ? unidadesCriadas[i % unidadesCriadas.length].salas[0].toString() : null,
          tenantId
        )
      )[0].id;
    ids.push(id);
  }
  return ids;
}

async function popularVoluntariado(
  tx: typeof prisma,
  tenantId: string,
  profissionais: bigint[]
) {
  await tx.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS voluntario_escala (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      voluntario_id BIGINT NOT NULL REFERENCES cadastro_voluntario(id) ON DELETE CASCADE,
      sala_id BIGINT NOT NULL REFERENCES salas_unidade(id) ON DELETE RESTRICT,
      atividade_tipo VARCHAR(120) NOT NULL,
      titulo VARCHAR(180),
      dias_semana TEXT NOT NULL,
      hora_inicio TIME NOT NULL,
      hora_fim TIME NOT NULL,
      carga_horaria_semanal NUMERIC(6,2) NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'ATIVA',
      observacoes TEXT,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await tx.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS voluntario_escala_tenant_idx ON voluntario_escala (tenant_id, voluntario_id, criado_em DESC)");
  await tx.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS voluntario_escala_sala_idx ON voluntario_escala (tenant_id, sala_id)");

  const salas = await tx.$queryRawUnsafe<Array<{ id: bigint; nome: string }>>(
    `
    SELECT s.id, s.nome
    FROM salas_unidade s
    INNER JOIN unidade_assistencial u ON u.id = s.unidade_id
    WHERE u.tenant_id::text = $1
    ORDER BY s.id
    LIMIT 18
    `,
    tenantId
  );
  if (!salas.length) return;

  const voluntarios = [
    { nome: "Camila Torres Valverde", profissao: "Instrutora de informática", area: "Inclusão digital", dias: "SEGUNDA;QUARTA", periodos: "Tarde", horas: "6", status: "ATIVO" },
    { nome: "Renato Lima Azevedo", profissao: "Educador físico", area: "Esporte e recreação", dias: "TERCA;QUINTA", periodos: "Manhã", horas: "8", status: "ATIVO" },
    { nome: "Bianca Prado Monteiro", profissao: "Contadora", area: "Educação financeira", dias: "SEXTA", periodos: "Tarde", horas: "4", status: "ATIVO" },
    { nome: "Eduardo Moreira Falcão", profissao: "Músico", area: "Oficina de música", dias: "SEGUNDA;SEXTA", periodos: "Noite", horas: "5", status: "ATIVO" },
    { nome: "Mariana Duarte Pires", profissao: "Psicopedagoga", area: "Apoio pedagógico", dias: "TERCA;QUARTA", periodos: "Manhã;Tarde", horas: "10", status: "ATIVO" },
    { nome: "Gustavo Ribeiro Campos", profissao: "Analista administrativo", area: "Organização de eventos", dias: "SABADO", periodos: "Manhã", horas: "4", status: "ATIVO" },
    { nome: "Helena Rocha Nogueira", profissao: "Artesã", area: "Oficina de artes", dias: "QUARTA", periodos: "Tarde", horas: "3", status: "ATIVO" },
    { nome: "Paulo Henrique Batista", profissao: "Motorista", area: "Apoio logístico", dias: "SEGUNDA;TERCA;QUINTA", periodos: "Manhã", horas: "9", status: "ATIVO" },
    { nome: "Larissa Martins Teixeira", profissao: "Estudante de pedagogia", area: "Reforço escolar", dias: "TERCA;QUINTA", periodos: "Tarde", horas: "6", status: "ATIVO" },
    { nome: "André Valença Prado", profissao: "Designer gráfico", area: "Comunicação institucional", dias: "SEXTA", periodos: "Remoto", horas: "4", status: "ATIVO" },
    { nome: "Sabrina Albuquerque Dias", profissao: "Nutricionista", area: "Educação alimentar", dias: "QUARTA", periodos: "Manhã", horas: "3", status: "ATIVO" },
    { nome: "Fábio Nunes Cardoso", profissao: "Técnico em manutenção", area: "Manutenção preventiva", dias: "SABADO", periodos: "Tarde", horas: "4", status: "ATIVO" },
    { nome: "Cláudia Meireles Ramos", profissao: "Bibliotecária", area: "Mediação de leitura", dias: "SEGUNDA;QUARTA", periodos: "Tarde", horas: "6", status: "ATIVO" },
    { nome: "Rogério Campos Silveira", profissao: "Professor aposentado", area: "Mentoria escolar", dias: "TERCA", periodos: "Manhã", horas: "3", status: "ATIVO" },
    { nome: "Vanessa Costa Lemos", profissao: "Advogada", area: "Orientação cidadã", dias: "QUINTA", periodos: "Noite", horas: "2", status: "ATIVO" },
    { nome: "Marcelo Vieira Reis", profissao: "Fotógrafo", area: "Registro de eventos", dias: "SABADO", periodos: "Manhã;Tarde", horas: "6", status: "ATIVO" },
    { nome: "Patrícia Moura Freitas", profissao: "Assistente social", area: "Acolhimento familiar", dias: "SEGUNDA;QUINTA", periodos: "Manhã", horas: "8", status: "INATIVO" },
    { nome: "Diego Tavares Morais", profissao: "Instrutor de robótica", area: "Tecnologia educacional", dias: "SEXTA", periodos: "Tarde", horas: "4", status: "BLOQUEADO" }
  ];

  const voluntarioIds: bigint[] = [];
  for (let i = 0; i < voluntarios.length; i += 1) {
    const voluntario = voluntarios[i];
    const email = `voluntario.demo.${String(i + 1).padStart(2, "0")}@exemplo.com.br`;
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM cadastro_voluntario WHERE tenant_id::text = $1 AND email = $2 LIMIT 1",
      tenantId,
      email
    );
    const enderecoId =
      (
        await tx.$queryRawUnsafe<IdRow[]>(
          `
          INSERT INTO endereco (
            cep, logradouro, numero, complemento, bairro, ponto_referencia,
            cidade, estado, zona, subzona, criado_em, atualizado_em
          )
          SELECT '38400000', 'Rua do Voluntariado', $1, $2, $3, 'Próximo à unidade de atendimento',
                 'Uberlândia', 'MG', 'Urbana', $4, NOW(), NOW()
          WHERE NOT EXISTS (
            SELECT 1
            FROM cadastro_voluntario
            WHERE tenant_id::text = $5
              AND email = $6
              AND endereco_id IS NOT NULL
          )
          RETURNING id
          `,
          String(500 + i),
          i % 2 === 0 ? "Casa" : "Apartamento",
          bairros[i % bairros.length],
          i % 3 === 0 ? "Região leste" : "Região central",
          tenantId,
          email
        )
      )[0]?.id ??
      (
        await tx.$queryRawUnsafe<IdRow[]>(
          "SELECT endereco_id AS id FROM cadastro_voluntario WHERE tenant_id::text = $1 AND email = $2 AND endereco_id IS NOT NULL LIMIT 1",
          tenantId,
          email
        )
      )[0]?.id;

    const id =
      existente[0]?.id ??
      (
        await tx.$queryRawUnsafe<IdRow[]>(
          `
          INSERT INTO cadastro_voluntario (
            profissional_id, nome_completo, cpf, rg, data_nascimento, genero,
            profissao, motivacao, telefone, email, cidade, estado, area_interesse,
            habilidades, idiomas, linkedin, disponibilidade_dias, disponibilidade_periodos,
            carga_horaria_semanal, presencial, remoto, inicio_previsto, observacoes,
            documento_identificacao, comprovante_endereco, aceite_voluntariado, aceite_imagem,
            assinatura_digital, criado_em, atualizado_em, status, foto_3x4, endereco_id, tenant_id
          )
          VALUES (
            $1, $2, $3, $4, $5::date, $6, $7, $8, $9, $10, 'Uberlândia', 'MG', $11,
            $12, $13, $14, $15, $16, $17, $18, $19, $20::date, $21,
            $22, $23, TRUE, $24, $25, NOW(), NOW(), $26, $27, $28, $29::uuid
          )
          RETURNING id
          `,
          i % 4 === 0 ? profissionais[i % profissionais.length] : null,
          voluntario.nome,
          gerarCpfValido(3000 + i),
          `MG-${String(4100000 + i * 17)}`,
          dateOnly(addDays(new Date(), -9200 - i * 210)),
          i % 2 === 0 ? "Feminino" : "Masculino",
          voluntario.profissao,
          `${DEMO} - deseja contribuir com ${voluntario.area.toLowerCase()} e fortalecer as ações da instituição.`,
          `3499${String(1000000 + i * 317).slice(0, 7)}`,
          email,
          voluntario.area,
          ["Comunicação com famílias", "Organização de grupos", "Planejamento de atividades", "Apoio em eventos"][i % 4],
          i % 5 === 0 ? "Português; Inglês básico" : "Português",
          `https://linkedin.example.com/in/voluntario-demo-${i + 1}`,
          voluntario.dias,
          voluntario.periodos,
          voluntario.horas,
          i !== 9,
          i === 9,
          dateOnly(addDays(new Date(), -330 + i * 12)),
          `${DEMO} - cadastro fictício de voluntariado para demonstração comercial.`,
          `/storage/colaboradores/documentos/voluntarios/demo-torresoft-${String(i + 1).padStart(2, "0")}-documento.pdf`,
          `/storage/colaboradores/documentos/voluntarios/demo-torresoft-${String(i + 1).padStart(2, "0")}-endereco.pdf`,
          i % 3 !== 0,
          `Assinatura digital fictícia ${DEMO} ${String(i + 1).padStart(2, "0")}`,
          voluntario.status,
          `/storage/colaboradores/fotos/voluntario-demo-torresoft-${String(i + 1).padStart(2, "0")}.jpg`,
          enderecoId,
          tenantId
        )
      )[0].id;
    voluntarioIds.push(id);

    await tx.$executeRawUnsafe(
      `
      UPDATE cadastro_voluntario
      SET profissional_id = $1,
          nome_completo = $2,
          profissao = $3,
          area_interesse = $4,
          disponibilidade_dias = $5,
          disponibilidade_periodos = $6,
          carga_horaria_semanal = $7,
          status = $8,
          endereco_id = COALESCE(endereco_id, $9),
          atualizado_em = NOW()
      WHERE id = $10
        AND tenant_id::text = $11
      `,
      i % 4 === 0 ? profissionais[i % profissionais.length] : null,
      voluntario.nome,
      voluntario.profissao,
      voluntario.area,
      voluntario.dias,
      voluntario.periodos,
      voluntario.horas,
      voluntario.status,
      enderecoId,
      id,
      tenantId
    );
  }

  const escalas = [
    { atividade: "Apoio pedagógico", titulo: "Reforço escolar acompanhado", dias: "SEGUNDA;QUARTA", inicio: "13:30", fim: "16:30", status: "ATIVA" },
    { atividade: "Oficina", titulo: "Oficina de informática básica", dias: "TERCA;QUINTA", inicio: "08:00", fim: "10:00", status: "ATIVA" },
    { atividade: "Evento", titulo: "Apoio em eventos comunitários", dias: "SABADO", inicio: "09:00", fim: "13:00", status: "ATIVA" },
    { atividade: "Acolhimento", titulo: "Recepção e orientação inicial", dias: "SEGUNDA;QUINTA", inicio: "08:30", fim: "11:30", status: "ATIVA" },
    { atividade: "Comunicação", titulo: "Produção de materiais institucionais", dias: "SEXTA", inicio: "14:00", fim: "18:00", status: "PAUSADA" },
    { atividade: "Leitura", titulo: "Mediação de leitura", dias: "QUARTA", inicio: "14:00", fim: "17:00", status: "ATIVA" }
  ];

  for (let i = 0; i < voluntarioIds.length; i += 1) {
    const escala = escalas[i % escalas.length];
    const sala = salas[i % salas.length];
    const dias = escala.dias.split(";");
    const [ih, im] = escala.inicio.split(":").map(Number);
    const [fh, fm] = escala.fim.split(":").map(Number);
    const carga = Number((((fh * 60 + fm) - (ih * 60 + im)) / 60 * dias.length).toFixed(2));
    await tx.$executeRawUnsafe(
      `
      INSERT INTO voluntario_escala (
        tenant_id, voluntario_id, sala_id, atividade_tipo, titulo, dias_semana,
        hora_inicio, hora_fim, carga_horaria_semanal, status, observacoes,
        criado_em, atualizado_em
      )
      SELECT $1::uuid, $2, $3, $4, $5, $6, $7::time, $8::time, $9, $10, $11, NOW(), NOW()
      WHERE NOT EXISTS (
        SELECT 1
        FROM voluntario_escala
        WHERE tenant_id::text = $1
          AND voluntario_id = $2
          AND sala_id = $3
          AND titulo = $5
      )
      `,
      tenantId,
      voluntarioIds[i],
      sala.id,
      escala.atividade,
      escala.titulo,
      escala.dias,
      escala.inicio,
      escala.fim,
      carga,
      escala.status,
      `${DEMO} - escala fictícia vinculada ao cadastro do voluntário e à sala ${sala.nome}.`
    );
  }
}

async function popularAtendimentosAgenda(tx: typeof prisma, tenantId: string, beneficiarios: bigint[], familias: bigint[], profissionais: bigint[], unidadesCriadas: Awaited<ReturnType<typeof garantirUnidades>>) {
  for (let i = 0; i < 650; i += 1) {
    const data = addDays(new Date(), -540 + i);
    const beneficiarioId = beneficiarios[i % beneficiarios.length];
    const familiaId = familias[i % familias.length];
    const codigoResumo = `${DEMO} atendimento ${String(i + 1).padStart(4, "0")}`;
    const existe = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM central_atendimento WHERE tenant_id::text = $1 AND resumo = $2 LIMIT 1",
      tenantId,
      codigoResumo
    );
    if (!existe[0]) {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO central_atendimento (
          beneficiario_id, familia_id, data_hora, tipo_atendimento, setor,
          profissional_responsavel, prioridade, status, classificacao,
          necessidade_identificada, resumo, observacoes, retorno_previsto,
          criado_por_nome, criado_em, atualizado_em, tenant_id
        )
        VALUES ($1, $2, $3::timestamp, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13::date, 'Seed demonstração Torresoft', NOW(), NOW(), $14::uuid)
        `,
        beneficiarioId,
        familiaId,
        data.toISOString(),
        ["Atendimento social", "Acompanhamento familiar", "Orientação pedagógica", "Encaminhamento"][i % 4],
        ["Serviço social", "Psicologia", "Educação", "Projetos"][i % 4],
        `Profissional Demonstração ${String((i % 24) + 1).padStart(2, "0")}`,
        ["BAIXA", "MEDIA", "ALTA"][i % 3],
        ["CONCLUIDO", "CONCLUIDO", "CANCELADO", "AGENDADO"][i % 4],
        ["Individual", "Familiar", "Coletivo"][i % 3],
        "Acompanhamento demonstrativo de rotina institucional.",
        codigoResumo,
        "Beneficiário participou da atividade conforme planejamento e recebeu orientações sobre próximos passos.",
        dateOnly(addDays(data, 30)),
        tenantId
      );
    }
  }

  for (let i = 0; i < 90; i += 1) {
    const data = addDays(new Date(), -35 + i);
    const chave = `${DEMO} agenda ${String(i + 1).padStart(3, "0")}`;
    const existe = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM agendamento WHERE tenant_id::text = $1 AND observacao_curta = $2 LIMIT 1",
      tenantId,
      chave
    );
    if (existe[0]) continue;
    const unidade = unidadesCriadas[i % unidadesCriadas.length];
    await tx.$executeRawUnsafe(
      `
      INSERT INTO agendamento (
        beneficiario_id, beneficiario_nome, responsavel_nome, telefone, email,
        forma_contato_preferencial, unidade, setor, tipo_atendimento, profissional_id,
        profissional_nome, equipe_apoio, data_agendamento, hora_inicial, hora_final,
        duracao_minutos, sala, modalidade, prioridade, status, objetivo,
        observacao_interna, observacao_curta, coletivo, participantes, primeira_vez,
        retorno, urgencia, documentos_pendentes, autorizacao_pendente, criado_por_nome,
        criado_em, atualizado_em, tenant_id
      )
      VALUES ($1, $2, 'Responsável fictício', $3, $4, 'WhatsApp', $5, $6, $7,
              $8, $9, $22::jsonb, $10::date, $11::time, $12::time, 50, $13,
              'Presencial', $14, $15, 'Atendimento de demonstração', $16, $17,
              FALSE, $23::jsonb, $18, $19, $20, FALSE, FALSE, 'Seed demonstração Torresoft',
              NOW(), NOW(), $21::uuid)
      `,
      beneficiarios[i % beneficiarios.length],
      nomes[i % nomes.length],
      `349${String(88000000 + i).slice(0, 8)}`,
      `agenda${i + 1}@exemplo.com.br`,
      unidade.nome,
      ["Serviço social", "Psicologia", "Educação"][i % 3],
      ["Atendimento inicial", "Retorno", "Orientação familiar"][i % 3],
      profissionais[i % profissionais.length],
      `Profissional Demonstração ${String((i % 24) + 1).padStart(2, "0")}`,
      dateOnly(data),
      `${String(8 + (i % 8)).padStart(2, "0")}:00`,
      `${String(8 + (i % 8)).padStart(2, "0")}:50`,
      unidade.salas[0]?.toString() ?? "Sala demonstrativa",
      ["BAIXA", "MEDIA", "ALTA"][i % 3],
      i < 35 ? "CONCLUIDO" : i < 70 ? "AGENDADO" : "CANCELADO",
      "Registro fictício para apresentação da agenda.",
      chave,
      i % 5 === 0,
      i % 4 === 0,
      i % 7 === 0,
      tenantId,
      JSON.stringify(["Equipe de demonstração"]),
      JSON.stringify([{ tipo: "beneficiario", nome: nomes[i % nomes.length] }])
    );
  }

  await tx.$executeRawUnsafe(
    `
    UPDATE agendamento
    SET status = 'Atendido',
        comparecimento = 'Presente',
        status_chegada = 'Finalizado',
        horario_chegada_real = COALESCE(horario_chegada_real, hora_inicial),
        horario_inicio_real = COALESCE(horario_inicio_real, hora_inicial),
        horario_fim_real = COALESCE(horario_fim_real, hora_final),
        concluido_resumo = COALESCE(concluido_resumo, 'Atendimento demonstrativo realizado e registrado.'),
        desfecho = COALESCE(desfecho, 'Orientações registradas para acompanhamento.'),
        atualizado_em = NOW()
    WHERE tenant_id::text = $1
      AND observacao_curta LIKE 'DEMO_TORRESOFT agenda%'
      AND data_agendamento <= CURRENT_DATE
      AND status <> 'Cancelado'
    `,
    tenantId
  );
}

async function popularChamadaSenhas(
  tx: typeof prisma,
  tenantId: string,
  beneficiarios: bigint[],
  unidadesCriadas: Awaited<ReturnType<typeof garantirUnidades>>,
  usuarioId: bigint
) {
  await tx.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS senhas_fila (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      beneficiario_id BIGINT NOT NULL,
      nome_beneficiario TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'AGUARDANDO',
      prioridade INTEGER NOT NULL DEFAULT 1,
      data_hora_entrada TIMESTAMP NOT NULL DEFAULT NOW(),
      unidade_id BIGINT,
      sala_atendimento TEXT,
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await tx.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS senhas_chamadas (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      fila_id BIGINT NOT NULL REFERENCES senhas_fila(id) ON DELETE CASCADE,
      beneficiario_id BIGINT NOT NULL,
      nome_beneficiario TEXT NOT NULL,
      local_atendimento TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'CHAMADO',
      data_hora_chamada TIMESTAMP NOT NULL DEFAULT NOW(),
      unidade_id BIGINT,
      chamado_por TEXT NOT NULL DEFAULT 'Sistema'
    )
  `);
  await tx.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS senhas_config (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      frase_fala TEXT NOT NULL DEFAULT 'Beneficiario {beneficiario} dirija-se a {sala} para atendimento.',
      rss_url TEXT NOT NULL DEFAULT 'https://www.gov.br/pt-br/noticias/assistencia-social/RSS',
      velocidade_ticker INTEGER NOT NULL DEFAULT 60,
      modo_noticias TEXT,
      noticias_manuais TEXT,
      quantidade_ultimas_chamadas INTEGER NOT NULL DEFAULT 4,
      unidade_painel_id BIGINT,
      titulo_tela TEXT,
      descricao_tela TEXT,
      avisos_sonoros_json TEXT,
      aviso_sonoro_ativo_id TEXT,
      aviso_sonoro_url TEXT,
      aviso_sonoro_nome TEXT,
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await tx.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS senhas_fila_tenant_idx ON senhas_fila(tenant_id, status, data_hora_entrada)");
  await tx.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS senhas_chamadas_tenant_idx ON senhas_chamadas(tenant_id, data_hora_chamada DESC)");
  await tx.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS senhas_config_tenant_idx ON senhas_config(tenant_id)");

  const unidadeRows = await tx.$queryRawUnsafe<IdRow[]>(
    "SELECT id FROM unidade_assistencial WHERE tenant_id::text = $1 ORDER BY id LIMIT 5",
    tenantId
  );
  const unidades = unidadeRows.map((row) => row.id);
  if (!unidades.length) {
    for (const unidade of unidadesCriadas) {
      const rows = await tx.$queryRawUnsafe<IdRow[]>(
        "SELECT id FROM unidade_assistencial WHERE tenant_id::text = $1 AND nome_fantasia = $2 LIMIT 1",
        tenantId,
        unidade.nome
      );
      if (rows[0]?.id) unidades.push(rows[0].id);
    }
  }
  if (!unidades.length) return;

  const beneficiariosSelecionados = beneficiarios.slice(0, 34);
  const nomesBeneficiarios = await tx.$queryRawUnsafe<Array<{ id: bigint; nome_completo: string | null; nome_social: string | null }>>(
    `
    SELECT id, nome_completo, nome_social
    FROM cadastro_beneficiario
    WHERE tenant_id::text = $1
      AND id = ANY($2::bigint[])
    ORDER BY id
    `,
    tenantId,
    beneficiariosSelecionados
  );
  const nomePorId = new Map(nomesBeneficiarios.map((item) => [String(item.id), item.nome_completo ?? item.nome_social ?? "Beneficiário demonstração"]));
  const salas = ["Recepção social", "Atendimento social", "Sala multiuso", "Sala de psicologia", "Guichê 01", "Guichê 02", "Coordenação"];
  const hoje = new Date();
  const dataReferencia = dateOnly(hoje);

  await tx.$executeRawUnsafe(
    `
    DELETE FROM senhas_chamadas chamada
    USING senhas_chamadas manter
    WHERE chamada.tenant_id::text = $1
      AND manter.tenant_id = chamada.tenant_id
      AND chamada.id > manter.id
      AND chamada.fila_id = manter.fila_id
      AND chamada.local_atendimento = manter.local_atendimento
      AND chamada.chamado_por LIKE 'Administrador Demonstração Torresoft%'
    `,
    tenantId
  );
  await tx.$executeRawUnsafe(
    `
    DELETE FROM senhas_fila fila
    USING senhas_fila manter
    WHERE fila.tenant_id::text = $1
      AND manter.tenant_id = fila.tenant_id
      AND fila.id > manter.id
      AND fila.beneficiario_id = manter.beneficiario_id
      AND fila.sala_atendimento = manter.sala_atendimento
      AND fila.data_hora_entrada::date = manter.data_hora_entrada::date
      AND fila.beneficiario_id = ANY($2::bigint[])
      AND fila.sala_atendimento = ANY($3::text[])
    `,
    tenantId,
    beneficiariosSelecionados,
    salas
  );

  const filas: Array<{ id: bigint; status: string; unidadeId: bigint; local: string; beneficiarioId: bigint; nome: string }> = [];
  for (let i = 0; i < 22; i += 1) {
    const beneficiarioId = beneficiariosSelecionados[i % beneficiariosSelecionados.length];
    const nome = nomePorId.get(String(beneficiarioId)) ?? `Beneficiário demonstração ${i + 1}`;
    const unidadeId = unidades[i % unidades.length];
    const status = i < 10 ? "AGUARDANDO" : i < 17 ? "CHAMADO" : i < 21 ? "FINALIZADO" : "CANCELADO";
    const sala = salas[i % salas.length];
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      `
      SELECT id
      FROM senhas_fila
      WHERE tenant_id::text = $1
        AND beneficiario_id = $2
        AND sala_atendimento = $3
        AND data_hora_entrada::date = $4::date
      LIMIT 1
      `,
      tenantId,
      beneficiarioId,
      sala,
      dataReferencia
    );
    const filaId =
      existente[0]?.id ??
      (
        await tx.$queryRawUnsafe<IdRow[]>(
          `
          INSERT INTO senhas_fila (
            tenant_id, beneficiario_id, nome_beneficiario, status, prioridade,
            data_hora_entrada, unidade_id, sala_atendimento, atualizado_em
          )
          VALUES ($1::uuid, $2, $3, $4, $5, $6::timestamp, $7, $8, NOW())
          RETURNING id
          `,
          tenantId,
          beneficiarioId,
          nome,
          status,
          i % 5 === 0 ? 5 : i % 3 === 0 ? 3 : 1,
          `${dataReferencia} ${String(8 + Math.floor(i / 3)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}:00`,
          unidadeId,
          sala
        )
      )[0].id;
    filas.push({ id: filaId, status, unidadeId, local: sala, beneficiarioId, nome });
  }

  for (let i = 0; i < filas.length; i += 1) {
    const fila = filas[i];
    if (!["CHAMADO", "FINALIZADO"].includes(fila.status)) continue;
    const chamadaStatus = fila.status === "FINALIZADO" ? "FINALIZADO" : "CHAMADO";
    await tx.$executeRawUnsafe(
      `
      INSERT INTO senhas_chamadas (
        tenant_id, fila_id, beneficiario_id, nome_beneficiario, local_atendimento,
        status, data_hora_chamada, unidade_id, chamado_por
      )
      SELECT $1::uuid, $2, $3, $4, $5, $6, $7::timestamp, $8, $9
      WHERE NOT EXISTS (
        SELECT 1
        FROM senhas_chamadas
        WHERE tenant_id::text = $1
          AND fila_id = $2
          AND local_atendimento = $5
      )
      `,
      tenantId,
      fila.id,
      fila.beneficiarioId,
      fila.nome,
      fila.local,
      chamadaStatus,
      `${dataReferencia} ${String(9 + Math.floor(i / 4)).padStart(2, "0")}:${String((i * 11) % 60).padStart(2, "0")}:00`,
      fila.unidadeId,
      `Administrador Demonstração Torresoft (${usuarioId})`
    );
  }

  const noticias = [
    "Bem-vindo ao atendimento Torresoft.",
    "Tenha em mãos seus documentos para agilizar o atendimento.",
    "Acompanhe sua senha no painel e aguarde a chamada sonora."
  ].join("\n");
  await tx.$executeRawUnsafe(
    `
    INSERT INTO senhas_config (
      tenant_id, frase_fala, rss_url, velocidade_ticker, modo_noticias,
      noticias_manuais, quantidade_ultimas_chamadas, unidade_painel_id,
      titulo_tela, descricao_tela, avisos_sonoros_json, aviso_sonoro_ativo_id,
      atualizado_em
    )
    SELECT $1::uuid, $2, $3, 45, 'manual', $4, 6, $5,
           'Painel de atendimento Torresoft',
           'Acompanhe as chamadas de senha e dirija-se ao local indicado.',
           $6, 'padrao', NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM senhas_config WHERE tenant_id::text = $1
    )
    `,
    tenantId,
    "Senha {beneficiario}, dirija-se a {sala} para atendimento.",
    "https://www.gov.br/pt-br/noticias/assistencia-social/RSS",
    noticias,
    unidades[0],
    JSON.stringify([
      { id: "padrao", nome: "Chamada padrão", url: "/storage/geral/outros/senhas/chamada-padrao.mp3" },
      { id: "suave", nome: "Aviso suave", url: "/storage/geral/outros/senhas/aviso-suave.mp3" }
    ])
  );
  await tx.$executeRawUnsafe(
    `
    UPDATE senhas_config
    SET frase_fala = $2,
        modo_noticias = 'manual',
        noticias_manuais = $3,
        quantidade_ultimas_chamadas = 6,
        unidade_painel_id = COALESCE(unidade_painel_id, $4),
        titulo_tela = 'Painel de atendimento Torresoft',
        descricao_tela = 'Acompanhe as chamadas de senha e dirija-se ao local indicado.',
        atualizado_em = NOW()
    WHERE tenant_id::text = $1
    `,
    tenantId,
    "Senha {beneficiario}, dirija-se a {sala} para atendimento.",
    noticias,
    unidades[0]
  );
}

async function popularProntuarioEletronico(
  tx: typeof prisma,
  tenantId: string,
  beneficiarios: bigint[],
  profissionais: bigint[],
  unidadesCriadas: Awaited<ReturnType<typeof garantirUnidades>>,
  usuarioId: bigint
) {
  await tx.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS prontuario (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      beneficiario_id BIGINT NOT NULL,
      numero_prontuario VARCHAR(40) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'ATIVO',
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, beneficiario_id),
      UNIQUE (tenant_id, numero_prontuario)
    )
  `);
  await tx.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS prontuario_atendimento (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      prontuario_id BIGINT NOT NULL REFERENCES prontuario(id) ON DELETE CASCADE,
      beneficiario_id BIGINT NOT NULL,
      profissional_id BIGINT,
      usuario_id BIGINT,
      unidade_id BIGINT,
      profissional_nome VARCHAR(200) NOT NULL,
      profissional_categoria VARCHAR(160),
      unidade_nome VARCHAR(200),
      especialidade VARCHAR(160) NOT NULL,
      tipo_atendimento VARCHAR(160) NOT NULL,
      data_atendimento DATE NOT NULL DEFAULT CURRENT_DATE,
      hora_inicio TIMESTAMP,
      hora_fim TIMESTAMP,
      duracao_minutos INTEGER,
      status VARCHAR(30) NOT NULL DEFAULT 'RASCUNHO',
      motivo TEXT,
      demanda_principal TEXT,
      avaliacao TEXT,
      evolucao TEXT,
      intervencoes JSONB NOT NULL DEFAULT '[]'::jsonb,
      conduta TEXT,
      retorno_data DATE,
      observacoes TEXT,
      campos_especificos JSONB NOT NULL DEFAULT '{}'::jsonb,
      restrito BOOLEAN NOT NULL DEFAULT FALSE,
      finalizado_em TIMESTAMP,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await tx.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS prontuario_adendo (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      atendimento_id BIGINT NOT NULL REFERENCES prontuario_atendimento(id) ON DELETE CASCADE,
      conteudo TEXT NOT NULL,
      motivo TEXT,
      usuario_id BIGINT,
      usuario_nome VARCHAR(200) NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await tx.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS prontuario_auditoria (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      prontuario_id BIGINT,
      atendimento_id BIGINT,
      acao VARCHAR(60) NOT NULL,
      descricao TEXT NOT NULL,
      usuario_id BIGINT,
      usuario_nome VARCHAR(200),
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await tx.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS prontuario_tenant_beneficiario_idx ON prontuario(tenant_id, beneficiario_id)");
  await tx.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS prontuario_atendimento_tenant_beneficiario_idx ON prontuario_atendimento(tenant_id, beneficiario_id, data_atendimento DESC)");
  await tx.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS prontuario_atendimento_status_idx ON prontuario_atendimento(tenant_id, status)");
  await tx.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS prontuario_adendo_atendimento_idx ON prontuario_adendo(tenant_id, atendimento_id, criado_em DESC)");
  await tx.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS prontuario_auditoria_atendimento_idx ON prontuario_auditoria(tenant_id, atendimento_id, criado_em DESC)");

  const unidades = await tx.$queryRawUnsafe<Array<{ id: bigint; nome_fantasia: string }>>(
    "SELECT id, nome_fantasia FROM unidade_assistencial WHERE tenant_id::text = $1 ORDER BY id LIMIT 5",
    tenantId
  );
  if (!unidades.length) return;

  const profissionaisRows = await tx.$queryRawUnsafe<Array<{ id: bigint; nome_completo: string; categoria: string | null }>>(
    `
    SELECT id, nome_completo, categoria
    FROM cadastro_profissionais
    WHERE tenant_id::text = $1
      AND id = ANY($2::bigint[])
    ORDER BY id
    `,
    tenantId,
    profissionais
  );
  if (!profissionaisRows.length) return;

  const especialidades = ["Serviço Social", "Psicologia", "Nutrição", "Atendimento multiprofissional", "Enfermagem"];
  const tipos = [
    "Atendimento Programado (Acompanhamento)",
    "Demanda espontânea",
    "Demanda referenciada",
    "Atividades Coletivas e Comunitárias",
    "Atendimento Proativo (Busca Ativa)"
  ];
  const motivos = [
    "Atualização de acompanhamento familiar",
    "Orientação sobre benefícios e documentação",
    "Acompanhamento de frequência em atividades",
    "Escuta qualificada e encaminhamento de rede",
    "Retorno programado pela equipe técnica"
  ];
  const beneficiariosSelecionadosRows = await tx.$queryRawUnsafe<IdRow[]>(
    `
    SELECT id
    FROM cadastro_beneficiario
    WHERE tenant_id::text = $1
      AND codigo LIKE 'DEMO-TS-%'
    ORDER BY nome_completo ASC, id ASC
    LIMIT 60
    `,
    tenantId
  );
  const beneficiariosSelecionados = beneficiariosSelecionadosRows.map((row) => row.id);

  for (let i = 0; i < beneficiariosSelecionados.length; i += 1) {
    const beneficiarioId = beneficiariosSelecionados[i];
    const numeroProntuario = `P-${beneficiarioId.toString().padStart(8, "0")}`;
    const prontuarioId =
      (
        await tx.$queryRawUnsafe<IdRow[]>(
          `
          INSERT INTO prontuario (tenant_id, beneficiario_id, numero_prontuario, status, criado_em, atualizado_em)
          VALUES ($1::uuid, $2, $3, 'ATIVO', NOW(), NOW())
          ON CONFLICT (tenant_id, beneficiario_id)
          DO UPDATE SET atualizado_em = NOW()
          RETURNING id
          `,
          tenantId,
          beneficiarioId,
          numeroProntuario
        )
      )[0].id;

    for (let j = 0; j < 3; j += 1) {
      const profissional = profissionaisRows[(i + j) % profissionaisRows.length];
      const unidade = unidades[(i + j) % unidades.length];
      const data = addDays(new Date(), -150 + i * 3 + j * 28);
      const horaInicio = `${dateOnly(data)} ${String(8 + ((i + j) % 6)).padStart(2, "0")}:00:00`;
      const horaFim = `${dateOnly(data)} ${String(8 + ((i + j) % 6)).padStart(2, "0")}:45:00`;
      const especialidade = especialidades[(i + j) % especialidades.length];
      const tipo = tipos[(i + j) % tipos.length];
      const status = j === 2 && i % 4 === 0 ? "EM_ATENDIMENTO" : j === 2 && i % 5 === 0 ? "RASCUNHO" : "FINALIZADO";
      const restrito = especialidade === "Psicologia" && i % 3 === 0;
      const atendimentoRows = await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO prontuario_atendimento (
          tenant_id, prontuario_id, beneficiario_id, profissional_id, usuario_id, unidade_id,
          profissional_nome, profissional_categoria, unidade_nome, especialidade, tipo_atendimento,
          data_atendimento, hora_inicio, hora_fim, duracao_minutos, status, motivo,
          demanda_principal, avaliacao, evolucao, intervencoes, conduta, retorno_data,
          observacoes, campos_especificos, restrito, finalizado_em, criado_em, atualizado_em
        )
        SELECT $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
               $12::date, $13::timestamp, $14::timestamp, $15, $16, $17,
               $18, $19, $20, $21::jsonb, $22, $23::date, $24, $25::jsonb, $26,
               CASE WHEN $16 = 'FINALIZADO' THEN $14::timestamp ELSE NULL END, NOW(), NOW()
        WHERE NOT EXISTS (
          SELECT 1
          FROM prontuario_atendimento
          WHERE tenant_id::text = $1
            AND prontuario_id = $2
            AND data_atendimento = $12::date
            AND especialidade = $10
            AND tipo_atendimento = $11
        )
        RETURNING id
        `,
        tenantId,
        prontuarioId,
        beneficiarioId,
        profissional.id,
        usuarioId,
        unidade.id,
        profissional.nome_completo,
        profissional.categoria ?? especialidade,
        unidade.nome_fantasia,
        especialidade,
        tipo,
        dateOnly(data),
        horaInicio,
        horaFim,
        45,
        status,
        motivos[(i + j) % motivos.length],
        "Família acompanhada pela equipe com demanda demonstrativa para navegação do prontuário.",
        "Beneficiário compareceu ao atendimento, apresentou participação adequada e informações compatíveis com o acompanhamento.",
        "Registro fictício de evolução com orientações realizadas e acompanhamento pactuado com a equipe técnica.",
        JSON.stringify(["Acolhimento", "Orientação", "Encaminhamento monitorado"].slice(0, 1 + ((i + j) % 3))),
        "Manter acompanhamento e reavaliar necessidades no retorno programado.",
        dateOnly(addDays(data, 30 + j * 7)),
        `${DEMO} - atendimento de prontuário fictício para demonstração comercial.`,
        JSON.stringify(
          especialidade === "Psicologia"
            ? { estado_emocional: "Estável e colaborativo", avaliacao_risco: "Não identificado", motivo_frequente: "Acompanhamento" }
            : especialidade === "Nutrição" || especialidade === "Enfermagem"
              ? { pressao_arterial: "120/80", temperatura: "36,5", peso: String(54 + (i % 20)), altura: "1,62", avaliacao_especifica: "Orientações preventivas registradas." }
              : { informacoes: "Informações específicas registradas conforme atendimento demonstrativo." }
        ),
        restrito
      );
      const atendimentoId =
        atendimentoRows[0]?.id ??
        (
          await tx.$queryRawUnsafe<IdRow[]>(
            `
            SELECT id
            FROM prontuario_atendimento
            WHERE tenant_id::text = $1
              AND prontuario_id = $2
              AND data_atendimento = $3::date
              AND especialidade = $4
              AND tipo_atendimento = $5
            LIMIT 1
            `,
            tenantId,
            prontuarioId,
            dateOnly(data),
            especialidade,
            tipo
          )
        )[0]?.id;
      if (!atendimentoId) continue;

      const auditorias = [
        { acao: "CRIAR", descricao: "Prontuário iniciado pela carga demonstrativa." },
        { acao: status === "FINALIZADO" ? "FINALIZAR" : "ATUALIZAR", descricao: status === "FINALIZADO" ? "Atendimento finalizado pela carga demonstrativa." : "Rascunho mantido para demonstração de continuidade." }
      ];
      for (const auditoria of auditorias) {
        await tx.$executeRawUnsafe(
          `
          INSERT INTO prontuario_auditoria (
            tenant_id, prontuario_id, atendimento_id, acao, descricao, usuario_id, usuario_nome, criado_em
          )
          SELECT $1::uuid, $2, $3, $4, $5, $6, 'Administrador Demonstração Torresoft', NOW()
          WHERE NOT EXISTS (
            SELECT 1
            FROM prontuario_auditoria
            WHERE tenant_id::text = $1
              AND atendimento_id = $3
              AND acao = $4
          )
          `,
          tenantId,
          prontuarioId,
          atendimentoId,
          auditoria.acao,
          auditoria.descricao,
          usuarioId
        );
      }

      if (status === "FINALIZADO" && (i + j) % 3 === 0) {
        await tx.$executeRawUnsafe(
          `
          INSERT INTO prontuario_adendo (
            tenant_id, atendimento_id, conteudo, motivo, usuario_id, usuario_nome, criado_em
          )
          SELECT $1::uuid, $2, $3, $4, $5, 'Administrador Demonstração Torresoft', NOW()
          WHERE NOT EXISTS (
            SELECT 1
            FROM prontuario_adendo
            WHERE tenant_id::text = $1
              AND atendimento_id = $2
              AND motivo = $4
          )
          `,
          tenantId,
          atendimentoId,
          "Adendo demonstrativo registrando complementação de informação após finalização do atendimento.",
          "Complemento de informação",
          usuarioId
        );
      }
    }
  }
}

async function garantirItensAlmoxarifado(tx: typeof prisma, tenantId: string) {
  const itens = [
    ["DEMO-TS-ALM-001", "Cesta básica demonstrativa", "Alimentos", "un"],
    ["DEMO-TS-ALM-002", "Kit higiene familiar", "Higiene", "kit"],
    ["DEMO-TS-ALM-003", "Material escolar completo", "Educação", "kit"],
    ["DEMO-TS-ALM-004", "Cobertor social", "Vestuário", "un"],
    ["DEMO-TS-ALM-005", "Livro paradidático", "Educação", "un"],
    ["DEMO-TS-ALM-006", "Kit oficina de artes", "Oficinas", "kit"]
  ];
  const ids: bigint[] = [];
  for (let i = 0; i < itens.length; i += 1) {
    const [codigo, descricao, categoria, unidade] = itens[i];
    const rows = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM almoxarifado_item WHERE tenant_id::text = $1 AND codigo = $2 LIMIT 1",
      tenantId,
      codigo
    );
    const id = rows[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO almoxarifado_item (
          tenant_id, codigo, descricao, categoria, unidade, localizacao,
          localizacao_interna, estoque_atual, estoque_minimo, valor_unitario,
          is_kit, situacao, ignorar_validade, observacoes, criado_em, atualizado_em
        )
        VALUES ($1::uuid, $2, $3, $4, $5, 'Almoxarifado Torresoft',
                'Prateleira demonstração', $6, 10, $7, FALSE, 'ATIVO', TRUE, $8, NOW(), NOW())
        RETURNING id
        `,
        tenantId,
        codigo,
        descricao,
        categoria,
        unidade,
        220 + i * 30,
        moeda(i, 18),
        `${DEMO} - item fictício para doações.`
      )
    )[0].id;
    ids.push(id);
  }
  return ids;
}

async function ensureVendaSetorEstrutura(tx: typeof prisma) {
  await tx.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS venda_setor (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      cliente_nome VARCHAR(200),
      cliente_documento VARCHAR(40),
      forma_pagamento VARCHAR(30) NOT NULL,
      valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
      observacoes TEXT,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await tx.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS venda_setor_item (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      venda_id BIGINT NOT NULL REFERENCES venda_setor(id) ON DELETE CASCADE,
      almoxarifado_item_id BIGINT REFERENCES almoxarifado_item(id) ON DELETE SET NULL,
      codigo_item VARCHAR(80) NOT NULL,
      descricao_item VARCHAR(255) NOT NULL,
      quantidade NUMERIC(14,3) NOT NULL,
      valor_unitario NUMERIC(14,2) NOT NULL,
      valor_total NUMERIC(14,2) NOT NULL
    )
  `);
  await tx.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS venda_setor_tenant_idx ON venda_setor(tenant_id, criado_em DESC)");
  await tx.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS venda_setor_item_tenant_idx ON venda_setor_item(tenant_id, venda_id)");
}

async function popularFrenteCaixaHistorico(tx: typeof prisma, tenantId: string, itensAlmoxarifado: bigint[]) {
  await ensureVendaSetorEstrutura(tx);
  const itens = await tx.$queryRawUnsafe<Array<{
    id: bigint;
    codigo: string;
    descricao: string;
    valor_unitario: number | string | null;
  }>>(
    `
    SELECT id, codigo, descricao, valor_unitario
    FROM almoxarifado_item
    WHERE tenant_id::text = $1
      AND id = ANY($2::bigint[])
    ORDER BY codigo
    `,
    tenantId,
    itensAlmoxarifado.map((id) => id.toString())
  );
  if (itens.length === 0) return;

  const clientes = [
    "Camila Prado Nogueira", "Renato Monteiro Alves", "Sueli Cardoso Ferreira", "Vitor Almeida Duarte",
    "Larissa Campos Valverde", "Rafael Nunes Tavares", "Priscila Moreira Lima", "Anderson Costa Reis",
    "Marta Batista Falcao", "Igor Henrique Paiva", "Aline Rocha Silveira", "Tiago Martins Caminha"
  ];
  const formas = ["DINHEIRO", "PIX", "DEBITO", "CREDITO"];
  const hoje = new Date();

  for (let i = 0; i < 42; i += 1) {
    const chave = `${DEMO} - venda frente caixa ${String(i + 1).padStart(3, "0")}`;
    const criadoEm = `${dateOnly(addDays(hoje, -84 + i * 2))} ${String(8 + (i % 9)).padStart(2, "0")}:${i % 2 === 0 ? "15" : "45"}:00`;
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM venda_setor WHERE tenant_id::text = $1 AND observacoes = $2 LIMIT 1",
      tenantId,
      chave
    );
    if (existente[0]?.id) {
      await tx.$executeRawUnsafe(
        `
        UPDATE venda_setor
        SET criado_em = $3::timestamp,
            atualizado_em = $3::timestamp
        WHERE tenant_id::text = $1
          AND id = $2
        `,
        tenantId,
        existente[0].id,
        criadoEm
      );
      continue;
    }

    const qtdItens = 1 + (i % 3);
    const itensVenda: Array<{
      item: (typeof itens)[number];
      quantidade: number;
      valorUnitario: number;
      valorTotal: number;
    }> = [];
    let total = 0;
    for (let j = 0; j < qtdItens; j += 1) {
      const item = itens[(i + j) % itens.length];
      const quantidade = 1 + ((i + j) % 2);
      const valorUnitario = Number(item.valor_unitario ?? moeda(i + j, 12));
      const valorTotal = Number((valorUnitario * quantidade).toFixed(2));
      total += valorTotal;
      itensVenda.push({ item, quantidade, valorUnitario, valorTotal });
    }

    const venda = await tx.$queryRawUnsafe<IdRow[]>(
      `
      INSERT INTO venda_setor (
        tenant_id, cliente_nome, cliente_documento, forma_pagamento,
        valor_total, observacoes, criado_em, atualizado_em
      )
      VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::timestamp, $7::timestamp)
      RETURNING id
      `,
      tenantId,
      clientes[i % clientes.length],
      gerarCpfValido(9100 + i),
      formas[i % formas.length],
      Number(total.toFixed(2)),
      chave,
      criadoEm
    );
    const vendaId = venda[0]?.id;
    if (!vendaId) continue;

    for (const vendaItem of itensVenda) {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO venda_setor_item (
          tenant_id, venda_id, almoxarifado_item_id, codigo_item, descricao_item,
          quantidade, valor_unitario, valor_total
        )
        VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)
        `,
        tenantId,
        vendaId,
        vendaItem.item.id,
        vendaItem.item.codigo,
        vendaItem.item.descricao,
        vendaItem.quantidade,
        vendaItem.valorUnitario,
        vendaItem.valorTotal
      );
    }
  }
}

async function popularCarteiraDigitalEvento(tx: typeof prisma, tenantId: string, beneficiarios: bigint[], usuarioId: bigint) {
  await ensureCarteiraEventoEstrutura(tx);
  const hoje = new Date();
  const eventos = [
    {
      nome: "Festa comunitaria Torresoft 2026",
      tipo: "FESTA_BARRACAS",
      inicio: dateOnly(addDays(hoje, -8)),
      fim: dateOnly(addDays(hoje, 2)),
      status: "ATIVO",
      centro: "Eventos e bazares"
    },
    {
      nome: "Bazar solidario Torresoft 2026",
      tipo: "BAZAR",
      inicio: dateOnly(addDays(hoje, -72)),
      fim: dateOnly(addDays(hoje, -70)),
      status: "FINALIZADO",
      centro: "Bazar beneficente"
    }
  ];

  const beneficiariosRows = await tx.$queryRawUnsafe<Array<{ nome_completo: string; cpf: string | null; celular: string | null }>>(
    `
    SELECT nome_completo, NULL::text AS cpf, NULL::text AS celular
    FROM cadastro_beneficiario
    WHERE tenant_id::text = $1
      AND id = ANY($2::bigint[])
    ORDER BY nome_completo ASC
    LIMIT 36
    `,
    tenantId,
    beneficiarios.map((id) => id.toString())
  );
  const nomesCarteira = beneficiariosRows.length > 0
    ? beneficiariosRows
    : Array.from({ length: 30 }, (_, i) => ({
        nome_completo: `Participante Demo Torresoft ${String(i + 1).padStart(2, "0")}`,
        cpf: gerarCpfValido(9600 + i),
        celular: `34988${String(100000 + i).slice(0, 6)}`
      }));

  for (let eventoIndex = 0; eventoIndex < eventos.length; eventoIndex += 1) {
    const eventoDemo = eventos[eventoIndex];
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM carteira_evento WHERE tenant_id::text = $1 AND nome_evento = $2 LIMIT 1",
      tenantId,
      eventoDemo.nome
    );
    const eventoId = existente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO carteira_evento (
          tenant_id, nome_evento, tipo_evento, data_inicio, data_fim, status,
          permite_recarga, permite_transferencia, permite_estorno, validade_credito,
          centro_receita, modo_financeiro, observacoes, permite_saldo_negativo_adm,
          criado_em, atualizado_em
        )
        VALUES (
          $1::uuid, $2, $3, $4::date, $5::date, $6,
          TRUE, TRUE, TRUE, $7::date, $8, 'SIMPLES', $9, FALSE, NOW(), NOW()
        )
        RETURNING id
        `,
        tenantId,
        eventoDemo.nome,
        eventoDemo.tipo,
        eventoDemo.inicio,
        eventoDemo.fim,
        eventoDemo.status,
        dateOnly(addDays(new Date(eventoDemo.fim), 10)),
        eventoDemo.centro,
        `${DEMO} - evento ficticio com carteira digital, recargas, barracas e consumo.`
      )
    )[0].id;

    await tx.$executeRawUnsafe(
      `
      UPDATE carteira_evento
      SET tipo_evento = $3,
          data_inicio = $4::date,
          data_fim = $5::date,
          status = $6,
          permite_recarga = TRUE,
          permite_transferencia = TRUE,
          permite_estorno = TRUE,
          validade_credito = $7::date,
          centro_receita = $8,
          modo_financeiro = 'SIMPLES',
          observacoes = $9,
          permite_saldo_negativo_adm = FALSE,
          atualizado_em = NOW()
      WHERE id = $2
        AND tenant_id::text = $1
      `,
      tenantId,
      eventoId,
      eventoDemo.tipo,
      eventoDemo.inicio,
      eventoDemo.fim,
      eventoDemo.status,
      dateOnly(addDays(new Date(eventoDemo.fim), 10)),
      eventoDemo.centro,
      `${DEMO} - evento ficticio com carteira digital, recargas, barracas e consumo.`
    );

    const barracasBase = [
      ["Cantina solidaria", "ALIMENTO", "Marina Duarte", "Operador cantina"],
      ["Bebidas e sucos", "BEBIDA", "Rafael Campos", "Operador bebidas"],
      ["Doces da comunidade", "DOCE", "Sofia Monteiro", "Operador doces"],
      ["Brincadeiras educativas", "BRINCADEIRA", "Gustavo Prado", "Operador brincadeiras"]
    ];
    const barracas: Record<string, bigint> = {};
    for (const [nomeBarraca, tipoBarraca, responsavel, operador] of barracasBase) {
      const barracaExistente = await tx.$queryRawUnsafe<IdRow[]>(
        "SELECT id FROM carteira_evento_barraca WHERE evento_id = $1 AND nome_barraca = $2 LIMIT 1",
        eventoId,
        nomeBarraca
      );
      const barracaId = barracaExistente[0]?.id ?? (
        await tx.$queryRawUnsafe<IdRow[]>(
          `
          INSERT INTO carteira_evento_barraca (
            evento_id, nome_barraca, responsavel, tipo_barraca, operador,
            status, impressora, observacoes, criado_em, atualizado_em
          )
          VALUES ($1, $2, $3, $4, $5, 'ATIVA', $6, $7, NOW(), NOW())
          RETURNING id
          `,
          eventoId,
          nomeBarraca,
          responsavel,
          tipoBarraca,
          operador,
          `Impressora ${nomeBarraca.slice(0, 12)}`,
          `${DEMO} - barraca ficticia para operacao com carteira digital.`
        )
      )[0].id;
      barracas[nomeBarraca] = barracaId;
      await tx.$executeRawUnsafe(
        `
        UPDATE carteira_evento_barraca
        SET responsavel = $3,
            tipo_barraca = $4,
            operador = $5,
            status = 'ATIVA',
            observacoes = $6,
            atualizado_em = NOW()
        WHERE id = $2
        `,
        tenantId,
        barracaId,
        responsavel,
        tipoBarraca,
        operador,
        `${DEMO} - barraca ficticia para operacao com carteira digital.`
      );
    }

    const itensBase = [
      ["Cantina solidaria", "Sanduiche natural", "ALIMENTO", 12.5, 95],
      ["Cantina solidaria", "Pastel assado", "ALIMENTO", 8.0, 120],
      ["Bebidas e sucos", "Suco natural", "BEBIDA", 6.5, 160],
      ["Bebidas e sucos", "Agua mineral", "BEBIDA", 4.0, 210],
      ["Doces da comunidade", "Bolo de pote", "DOCE", 9.5, 90],
      ["Doces da comunidade", "Brigadeiro", "DOCE", 3.5, 220],
      ["Brincadeiras educativas", "Pescaria educativa", "BRINCADEIRA", 5.0, 180],
      ["Brincadeiras educativas", "Oficina criativa", "BRINCADEIRA", 7.0, 70]
    ] as const;
    const itensEvento: Array<{ id: bigint; nome: string; preco: number; barracaId: bigint }> = [];
    for (let itemIndex = 0; itemIndex < itensBase.length; itemIndex += 1) {
      const [nomeBarraca, nomeItem, categoria, preco, estoque] = itensBase[itemIndex];
      const itemExistente = await tx.$queryRawUnsafe<IdRow[]>(
        "SELECT id FROM carteira_evento_item WHERE evento_id = $1 AND nome_item = $2 LIMIT 1",
        eventoId,
        nomeItem
      );
      const itemId = itemExistente[0]?.id ?? (
        await tx.$queryRawUnsafe<IdRow[]>(
          `
          INSERT INTO carteira_evento_item (
            evento_id, barraca_id, nome_item, categoria, preco, estoque, ativo,
            foto_url, ordem_exibicao, criado_em, atualizado_em
          )
          VALUES ($1, $2, $3, $4, $5, $6, TRUE, NULL, $7, NOW(), NOW())
          RETURNING id
          `,
          eventoId,
          barracas[nomeBarraca],
          nomeItem,
          categoria,
          preco,
          estoque,
          itemIndex + 1
        )
      )[0].id;
      await tx.$executeRawUnsafe(
        `
        UPDATE carteira_evento_item
        SET barraca_id = $2,
            categoria = $3,
            preco = $4,
            estoque = GREATEST(COALESCE(estoque, 0), $5),
            ativo = TRUE,
            ordem_exibicao = $6,
            atualizado_em = NOW()
        WHERE id = $1
        `,
        itemId,
        barracas[nomeBarraca],
        categoria,
        preco,
        estoque,
        itemIndex + 1
      );
      itensEvento.push({ id: itemId, nome: nomeItem, preco, barracaId: barracas[nomeBarraca] });
    }

    const participantes: Array<{ id: bigint; nome: string; token: string; numero: string }> = [];
    const totalParticipantes = eventoIndex === 0 ? 30 : 18;
    for (let i = 0; i < totalParticipantes; i += 1) {
      const base = nomesCarteira[i % nomesCarteira.length];
      const numero = `TS-EVT-${eventoIndex + 1}-${String(i + 1).padStart(4, "0")}`;
      const token = `${DEMO}-CARTEIRA-${eventoIndex + 1}-${String(i + 1).padStart(4, "0")}`;
      const participanteExistente = await tx.$queryRawUnsafe<IdRow[]>(
        "SELECT id FROM carteira_evento_participante WHERE evento_id = $1 AND numero_carteira = $2 LIMIT 1",
        eventoId,
        numero
      );
      const participanteId = participanteExistente[0]?.id ?? (
        await tx.$queryRawUnsafe<IdRow[]>(
          `
          INSERT INTO carteira_evento_participante (
            evento_id, nome, telefone, cpf, foto_url, responsavel, numero_carteira,
            status, qr_code_token_unico, saldo_atual, observacoes, criado_em, atualizado_em
          )
          VALUES ($1, $2, $3, $4, NULL, $5, $6, 'ATIVO', $7, 0, $8, NOW(), NOW())
          RETURNING id
          `,
          eventoId,
          base.nome_completo,
          base.celular ?? `34988${String(100000 + i).slice(0, 6)}`,
          base.cpf ?? gerarCpfValido(9700 + i + eventoIndex * 100),
          i % 3 === 0 ? "Responsavel familiar presente no evento" : null,
          numero,
          token,
          `${DEMO} - participante ficticio para demonstracao da carteira digital.`
        )
      )[0].id;
      await tx.$executeRawUnsafe(
        `
        UPDATE carteira_evento_participante
        SET nome = $2,
            telefone = $3,
            cpf = $4,
            responsavel = $5,
            status = 'ATIVO',
            qr_code_token_unico = $6,
            observacoes = $7,
            atualizado_em = NOW()
        WHERE id = $1
        `,
        participanteId,
        base.nome_completo,
        base.celular ?? `34988${String(100000 + i).slice(0, 6)}`,
        base.cpf ?? gerarCpfValido(9700 + i + eventoIndex * 100),
        i % 3 === 0 ? "Responsavel familiar presente no evento" : null,
        token,
        `${DEMO} - participante ficticio para demonstracao da carteira digital.`
      );
      participantes.push({ id: participanteId, nome: base.nome_completo, token, numero });
    }

    for (let i = 0; i < participantes.length; i += 1) {
      const participante = participantes[i];
      const valorRecarga = 35 + (i % 6) * 10;
      const referencia = `${DEMO}-RECARGA-CARTEIRA-${eventoIndex + 1}-${String(i + 1).padStart(4, "0")}`;
      await tx.$executeRawUnsafe(
        `
        INSERT INTO carteira_evento_movimentacao (
          evento_id, participante_id, tipo_movimentacao, forma_pagamento, valor,
          saldo_anterior, saldo_posterior, descricao, motivo, referencia_externa,
          operador_usuario_id, operador_nome, criado_em
        )
        SELECT $1, $2, 'RECARGA', $3, $4, 0, $4, 'Recarga demonstrativa', $5, $6, $7, $8, $9::timestamp
        WHERE NOT EXISTS (
          SELECT 1
          FROM carteira_evento_movimentacao
          WHERE evento_id = $1
            AND participante_id = $2
            AND referencia_externa = $6
        )
        `,
        eventoId,
        participante.id,
        ["PIX", "DINHEIRO", "CARTAO"][i % 3],
        valorRecarga,
        `${DEMO} - credito inicial para uso no evento.`,
        referencia,
        usuarioId,
        NOME_ADMIN,
        `${dateOnly(addDays(new Date(eventoDemo.inicio), Math.min(i % 3, 2)))} ${String(9 + (i % 8)).padStart(2, "0")}:00:00`
      );
    }

    const totalVendas = eventoIndex === 0 ? 44 : 22;
    for (let i = 0; i < totalVendas; i += 1) {
      const participante = participantes[i % participantes.length];
      const itemPrincipal = itensEvento[i % itensEvento.length];
      const itemExtra = itensEvento[(i + 3) % itensEvento.length];
      const quantidadePrincipal = 1 + (i % 2);
      const quantidadeExtra = i % 4 === 0 ? 1 : 0;
      const total = Number((itemPrincipal.preco * quantidadePrincipal + itemExtra.preco * quantidadeExtra).toFixed(2));
      const saldoAntes = 999;
      const saldoDepois = Number((saldoAntes - total).toFixed(2));
      const chaveOperacao = `${DEMO}-VENDA-CARTEIRA-${eventoIndex + 1}-${String(i + 1).padStart(4, "0")}`;
      const existenteVenda = await tx.$queryRawUnsafe<IdRow[]>(
        "SELECT id FROM carteira_evento_venda WHERE chave_operacao = $1 LIMIT 1",
        chaveOperacao
      );
      let vendaId = existenteVenda[0]?.id;
      if (!vendaId) {
        vendaId = (
          await tx.$queryRawUnsafe<IdRow[]>(
            `
            INSERT INTO carteira_evento_venda (
              evento_id, barraca_id, participante_id, chave_operacao, valor_total,
              saldo_antes, saldo_depois, observacao, operador_usuario_id, operador_nome, criado_em
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::timestamp)
            RETURNING id
            `,
            eventoId,
            itemPrincipal.barracaId,
            participante.id,
            chaveOperacao,
            total,
            saldoAntes,
            saldoDepois,
            `${DEMO} - consumo ficticio registrado pela carteira digital.`,
            usuarioId,
            NOME_ADMIN,
            `${dateOnly(addDays(new Date(eventoDemo.inicio), 1 + (i % 3)))} ${String(10 + (i % 9)).padStart(2, "0")}:${i % 2 === 0 ? "10" : "40"}:00`
          )
        )[0]?.id;
      }
      if (!vendaId) continue;

      const itensJaCriados = await tx.$queryRawUnsafe<CountRow[]>(
        "SELECT COUNT(*)::bigint AS total FROM carteira_evento_venda_item WHERE venda_id = $1",
        vendaId
      );
      if (Number(itensJaCriados[0]?.total ?? 0n) === 0) {
        await tx.$executeRawUnsafe(
          `
          INSERT INTO carteira_evento_venda_item (
            venda_id, item_id, nome_item, quantidade, valor_unitario, valor_total
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          vendaId,
          itemPrincipal.id,
          itemPrincipal.nome,
          quantidadePrincipal,
          itemPrincipal.preco,
          Number((itemPrincipal.preco * quantidadePrincipal).toFixed(2))
        );
        if (quantidadeExtra > 0) {
          await tx.$executeRawUnsafe(
            `
            INSERT INTO carteira_evento_venda_item (
              venda_id, item_id, nome_item, quantidade, valor_unitario, valor_total
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            `,
            vendaId,
            itemExtra.id,
            itemExtra.nome,
            quantidadeExtra,
            itemExtra.preco,
            Number((itemExtra.preco * quantidadeExtra).toFixed(2))
          );
        }
      }

      await tx.$executeRawUnsafe(
        `
        INSERT INTO carteira_evento_movimentacao (
          evento_id, participante_id, barraca_id, venda_id, tipo_movimentacao,
          valor, saldo_anterior, saldo_posterior, descricao, motivo,
          referencia_externa, operador_usuario_id, operador_nome, criado_em
        )
        SELECT $1, $2, $3, $4, 'VENDA', $5, $6, $7, $8, $9, $10, $11, $12, $13::timestamp
        WHERE NOT EXISTS (
          SELECT 1
          FROM carteira_evento_movimentacao
          WHERE evento_id = $1
            AND venda_id = $4
            AND referencia_externa = $10
        )
        `,
        eventoId,
        participante.id,
        itemPrincipal.barracaId,
        vendaId,
        total,
        saldoAntes,
        saldoDepois,
        `Compra demonstrativa na barraca ${itemPrincipal.nome}`,
        `${DEMO} - baixa de saldo por venda ficticia.`,
        `${chaveOperacao}-MOV`,
        usuarioId,
        NOME_ADMIN,
        `${dateOnly(addDays(new Date(eventoDemo.inicio), 1 + (i % 3)))} ${String(10 + (i % 9)).padStart(2, "0")}:${i % 2 === 0 ? "10" : "40"}:30`
      );
    }

    await tx.$executeRawUnsafe(
      `
      UPDATE carteira_evento_participante p
      SET saldo_atual = COALESCE(saldo.saldo_calculado, 0),
          atualizado_em = NOW()
      FROM (
        SELECT
          participante_id,
          SUM(
            CASE
              WHEN tipo_movimentacao IN ('RECARGA', 'TRANSFERENCIA_RECEBIDA', 'AJUSTE_CREDITO', 'ESTORNO') THEN valor
              WHEN tipo_movimentacao IN ('VENDA', 'TRANSFERENCIA_ENVIADA', 'AJUSTE_DEBITO') THEN valor * -1
              ELSE 0
            END
          ) AS saldo_calculado
        FROM carteira_evento_movimentacao
        WHERE evento_id = $1
        GROUP BY participante_id
      ) saldo
      WHERE p.evento_id = $1
        AND p.id = saldo.participante_id
      `,
      eventoId
    );
  }
}

async function popularBiblioteca(tx: typeof prisma, tenantId: string) {
  const titulos = [
    "A Ponte dos Saberes", "Caminhos da Leitura", "Matemática em Ação", "Histórias do Bairro",
    "Ciências no Cotidiano", "Pequenos Inventores", "Arte e Imaginação", "Mundo das Palavras",
    "Projeto Leitor Jovem", "Geografia para Descobrir", "Memórias da Comunidade", "Primeiros Contos",
    "Educação Financeira para Jovens", "Aprender com Jogos", "Cidadania em Movimento",
    "O Clube da Pesquisa", "Leitura em Família", "Biblioteca Viva", "Narrativas Brasileiras",
    "Tecnologia sem Mistério", "Oficinas Criativas", "Infância e Natureza", "O Livro das Perguntas",
    "Pequeno Atlas Social", "Histórias para Pensar", "Rodas de Conversa", "Jovens Protagonistas",
    "Poemas da Escola", "Descobertas no Laboratório", "Aprender Mais Todo Dia", "Mundo Digital",
    "Coleção Valores", "Letras e Sons", "A Turma do Projeto", "Meu Primeiro Diário"
  ];
  for (let i = 0; i < titulos.length; i += 1) {
    const codigo = `TS-LIV-${String(i + 1).padStart(4, "0")}`;
    await tx.$executeRawUnsafe(
      `
      INSERT INTO biblioteca_livro (
        tenant_id, codigo, titulo, autor, isbn, editora, ano_publicacao,
        categoria, quantidade_total, quantidade_disponivel, localizacao,
        status, estado_livro, observacoes, criado_em, atualizado_em
      )
      SELECT $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
             'ATIVO', $12, $13, NOW(), NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM biblioteca_livro WHERE tenant_id::text = $1 AND codigo = $2
      )
      `,
      tenantId,
      codigo,
      titulos[i],
      `Autor Fictício ${i + 1}`,
      `97885${String(100000000 + i).slice(0, 9)}`,
      ["Editora Horizonte", "Editora Caminhos", "Editora Saber"][i % 3],
      2015 + (i % 10),
      ["Infantil", "Juvenil", "Pedagógico", "Comunidade"][i % 4],
      2 + (i % 5),
      1 + (i % 4),
      `Estante ${String.fromCharCode(65 + (i % 5))}-${i + 1}`,
      ["Novo", "Bom", "Regular"][i % 3],
      `${DEMO} - livro fictício disponível para apresentação.`
    );
  }
}

async function popularBancoEmpregos(tx: typeof prisma, tenantId: string, beneficiarios: bigint[], usuarioId: bigint) {
  const vagas: bigint[] = [];
  const cargos = [
    "Auxiliar administrativo", "Assistente de atendimento", "Monitor de oficina", "Jovem aprendiz administrativo",
    "Auxiliar de cozinha", "Recepcionista", "Operador de computador", "Ajudante de serviços gerais",
    "Cuidador social", "Instrutor de informática", "Auxiliar de estoque", "Atendente comercial"
  ];
  for (let i = 0; i < cargos.length; i += 1) {
    const titulo = `${cargos[i]} - ${DEMO}`;
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM banco_empregos_vaga WHERE tenant_id::text = $1 AND titulo = $2 LIMIT 1",
      tenantId,
      titulo
    );
    const id = existente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO banco_empregos_vaga (
          tenant_id, titulo, empresa_nome, area, quantidade_vagas, requisitos,
          escolaridade_minima, experiencia_minima, bairro, cidade, tipo_contratacao,
          jornada, faixa_salarial, beneficios, observacoes, data_abertura,
          data_limite, situacao, projeto_servico, unidade_referencia,
          criterios_json, ativo, criado_em, atualizado_em
        )
        VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, 'Uberlândia',
                $10, $11, $12, $13, $14, $15::date, $16::date, $17, $18, $19,
                $20::jsonb, TRUE, NOW(), NOW())
        RETURNING id
        `,
        tenantId,
        titulo,
        `Empresa Fictícia ${i + 1} Ltda`,
        ["Administrativo", "Atendimento", "Educação", "Operacional"][i % 4],
        1 + (i % 3),
        "Boa comunicação, pontualidade e disponibilidade para capacitação.",
        ["Ensino fundamental", "Ensino médio", "Curso técnico"][i % 3],
        i % 2 === 0 ? "Desejável" : "Não exigida",
        bairros[i % bairros.length],
        ["CLT", "Aprendiz", "Temporário"][i % 3],
        ["Meio período", "Comercial", "Escala 6x1"][i % 3],
        `R$ ${String(1320 + i * 145)},00 a R$ ${String(1680 + i * 160)},00`,
        "Vale transporte, alimentação e capacitação inicial.",
        `${DEMO} - vaga fictícia para demonstração do banco de empregos.`,
        dateOnly(addDays(new Date(), -90 + i * 4)),
        dateOnly(addDays(new Date(), 20 + i * 5)),
        ["ABERTA", "EM_TRIAGEM", "ENCERRADA"][i % 3],
        "Banco de empregos Torresoft",
        "Unidade Social Horizonte",
        JSON.stringify([{ criterio: "Experiência", peso: 2 }, { criterio: "Disponibilidade", peso: 1 }])
      )
    )[0].id;
    vagas.push(id);
  }

  const candidatos: bigint[] = [];
  for (let i = 0; i < 28; i += 1) {
    const email = `candidato.demo${String(i + 1).padStart(2, "0")}@exemplo.com.br`;
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM banco_empregos_candidato WHERE tenant_id::text = $1 AND email = $2 LIMIT 1",
      tenantId,
      email
    );
    const id = existente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO banco_empregos_candidato (
          tenant_id, beneficiario_id, nome_completo, cpf, rg, data_nascimento,
          sexo, estado_civil, telefone, whatsapp, email, cep, endereco, bairro,
          cidade, uf, escolaridade, cursos, formacao_complementar, area_interesse,
          cargo_pretendido, pretensao_salarial, disponibilidade, possui_experiencia,
          ultima_empresa, funcao_exercida, tempo_experiencia, resumo_profissional,
          observacoes, situacao, ativo, experiencias_json, formacoes_json,
          habilidades_json, curriculo_extraido_json, data_envio_curriculo,
          criado_em, atualizado_em
        )
        VALUES ($1::uuid, $2, $3, $4, $5, $6::date, $7, $8, $9, $9, $10,
                '38400000', $11, $12, 'Uberlândia', 'MG', $13, $14, $15,
                $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
                TRUE, $27::jsonb, $28::jsonb, $29::jsonb, $30::jsonb,
                NOW(), NOW(), NOW())
        RETURNING id
        `,
        tenantId,
        beneficiarios[(i + 55) % beneficiarios.length],
        `Candidato Demonstração ${String(i + 1).padStart(2, "0")}`,
        gerarCpfValido(900 + i),
        `MG-DEMO-${i + 1}`,
        dateOnly(addDays(new Date("1990-01-01T00:00:00Z"), i * 210)),
        i % 2 === 0 ? "Feminino" : "Masculino",
        ["Solteiro(a)", "Casado(a)"][i % 2],
        `349${String(96000000 + i).slice(0, 8)}`,
        email,
        `Rua Emprego ${i + 1}, ${100 + i}`,
        bairros[i % bairros.length],
        ["Ensino médio completo", "Ensino fundamental completo", "Curso técnico"][i % 3],
        "Informática básica; atendimento ao público",
        "Curso fictício de preparação para o trabalho.",
        ["Administrativo", "Atendimento", "Operacional"][i % 3],
        cargos[i % cargos.length],
        moeda(i, 1500),
        "Manhã e tarde",
        i % 2 === 0,
        i % 2 === 0 ? `Empresa Demo ${i}` : null,
        i % 2 === 0 ? cargos[i % cargos.length] : null,
        i % 2 === 0 ? "1 ano" : null,
        "Perfil fictício com interesse em inserção produtiva.",
        `${DEMO} - candidato fictício para apresentação.`,
        ["ATIVO", "EM_PROCESSO", "ENCAMINHADO"][i % 3],
        JSON.stringify([{ empresa: "Empresa fictícia", funcao: cargos[i % cargos.length], periodo: "2024-2025" }]),
        JSON.stringify([{ curso: "Ensino médio", instituicao: "Escola fictícia" }]),
        JSON.stringify(["Comunicação", "Pontualidade", "Informática básica"]),
        JSON.stringify({ origem: DEMO, resumo: "Currículo demonstrativo." })
      )
    )[0].id;
    candidatos.push(id);
  }

  for (let i = 0; i < 36; i += 1) {
    const vagaId = vagas[i % vagas.length];
    const candidatoId = candidatos[i % candidatos.length];
    await tx.$executeRawUnsafe(
      `
      INSERT INTO banco_empregos_processo (
        tenant_id, vaga_id, candidato_id, etapa, status, observacoes,
        responsavel_id, responsavel_nome, data_movimentacao, data_entrevista,
        data_encaminhamento, selecionado, contratado, ativo, criado_em, atualizado_em
      )
      SELECT $1::uuid, $2, $3, $4, $5, $6, $7, $8, NOW(), $9::date, $10::date,
             $11, $12, TRUE, NOW(), NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM banco_empregos_processo WHERE tenant_id::text = $1 AND vaga_id = $2 AND candidato_id = $3
      )
      `,
      tenantId,
      vagaId,
      candidatoId,
      ["TRIAGEM_INICIAL", "ENTREVISTA", "ENCAMINHADO", "CONCLUIDO"][i % 4],
      ["EM_ANALISE", "ENTREVISTA_AGENDADA", "ENCAMINHADO", "APROVADO", "NAO_SELECIONADO"][i % 5],
      `${DEMO} - processo seletivo fictício.`,
      usuarioId,
      NOME_ADMIN,
      dateOnly(addDays(new Date(), -30 + (i % 20))),
      i % 3 === 0 ? dateOnly(addDays(new Date(), -20 + i)) : null,
      i % 5 === 0,
      i % 9 === 0
    );
  }
}

async function popularContratacaoRh(tx: typeof prisma, tenantId: string, usuarioId: bigint) {
  if (!(await tableExists(tx, "rh_candidato"))) return;

  const vagas = [
    "Assistente administrativo", "Educador social", "Auxiliar de serviços gerais", "Recepcionista",
    "Instrutor de informática", "Auxiliar de biblioteca", "Analista de projetos", "Cuidador social",
    "Assistente financeiro", "Monitor de oficinas", "Pedagogo", "Assistente de RH"
  ];
  const statuses = ["TRIAGEM", "ENTREVISTA", "DOCUMENTACAO", "ADMITIDO", "REPROVADO", "BANCO_TALENTOS"];

  for (let i = 0; i < vagas.length; i += 1) {
    const email = `contratacao.demo${String(i + 1).padStart(2, "0")}@exemplo.com.br`;
    const nome = `Candidato RH Demonstração ${String(i + 1).padStart(2, "0")}`;
    const cpf = gerarCpfValido(1200 + i);
    const dataBase = addDays(new Date(), -80 + i * 5);
    const candidatoExistente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM rh_candidato WHERE tenant_id::text = $1 AND cpf = $2 LIMIT 1",
      tenantId,
      cpf
    );
    const candidatoId = candidatoExistente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO rh_candidato (
          tenant_id, nome_completo, cpf, rg, pis, data_nascimento, naturalidade,
          estado_civil, nome_mae, nome_conjuge, vaga_pretendida, data_preenchimento,
          filhos_possui, filhos_json, deficiencia_possui, deficiencia_tipo,
          deficiencia_descricao, endereco_json, telefone, whatsapp, anexos_json,
          ativo, criado_em, atualizado_em
        )
        VALUES (
          $1::uuid, $2, $3, $4, $5, $6::date, 'Uberlândia/MG',
          $7, $8, $9, $10, $11::date, $12, $13, $14, $15, $16,
          $17, $18, $18, $19, TRUE, NOW(), NOW()
        )
        RETURNING id
        `,
        tenantId,
        nome,
        cpf,
        `MG-RH-DEMO-${String(i + 1).padStart(3, "0")}`,
        `12${String(300000000 + i).slice(0, 9)}`,
        dateOnly(addDays(new Date("1987-01-01T00:00:00Z"), i * 390)),
        ["Solteiro(a)", "Casado(a)", "Divorciado(a)"][i % 3],
        `Mãe fictícia ${i + 1}`,
        i % 3 === 0 ? `Cônjuge fictício ${i + 1}` : null,
        vagas[i],
        dateOnly(dataBase),
        i % 4 === 0,
        JSON.stringify(i % 4 === 0 ? [{ nome: `Dependente ${i + 1}`, idade: 6 + (i % 8) }] : []),
        i === 7,
        i === 7 ? "Deficiência física" : null,
        i === 7 ? "Necessita adaptação ergonômica demonstrativa." : null,
        JSON.stringify({
          cep: "38400000",
          endereco: `Rua Seleção Demonstrativa, ${140 + i}`,
          bairro: bairros[i % bairros.length],
          cidade: "Uberlândia",
          uf: "MG"
        }),
        `349${String(97000000 + i).slice(0, 8)}`,
        JSON.stringify([{ nome: "Currículo demonstrativo", origem: DEMO, caminho: `/storage/colaboradores/documentos/${DEMO.toLowerCase()}-curriculo-${i + 1}.pdf` }])
      )
    )[0].id;

    const processoExistente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM rh_processo_contratacao WHERE tenant_id::text = $1 AND candidato_id = $2 LIMIT 1",
      tenantId,
      candidatoId
    );
    const processoId = processoExistente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO rh_processo_contratacao (
          tenant_id, candidato_id, status, responsavel_id, gestor_id,
          criado_em, atualizado_em, ultima_movimentacao_em
        )
        VALUES ($1::uuid, $2, $3, $4, $4, NOW(), NOW(), NOW())
        RETURNING id
        `,
        tenantId,
        candidatoId,
        statuses[i % statuses.length],
        usuarioId
      )
    )[0].id;

    await tx.$executeRawUnsafe(
      "UPDATE rh_processo_contratacao SET status = $3, responsavel_id = $4, gestor_id = $4, atualizado_em = NOW(), ultima_movimentacao_em = NOW() WHERE tenant_id::text = $1 AND id = $2",
      tenantId,
      processoId,
      statuses[i % statuses.length],
      usuarioId
    );

    const documentos = ["RG", "CPF", "Comprovante de endereço", "Carteira de trabalho", "PIS", "Atestado admissional"];
    for (let d = 0; d < documentos.length; d += 1) {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO rh_documento_item (
          tenant_id, processo_id, tipo_documento, obrigatorio, status,
          observacao, atualizado_por, criado_em, atualizado_em
        )
        VALUES ($1::uuid, $2, $3, TRUE, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (processo_id, tipo_documento)
        DO UPDATE SET status = EXCLUDED.status, observacao = EXCLUDED.observacao,
                      atualizado_por = EXCLUDED.atualizado_por, atualizado_em = NOW()
        `,
        tenantId,
        processoId,
        documentos[d],
        d < 4 || i % 5 === 0 ? "conferido" : "pendente",
        `${DEMO} - documento fictício de contratação.`,
        usuarioId
      );
    }

    await tx.$executeRawUnsafe(
      `
      INSERT INTO rh_entrevista (
        tenant_id, processo_id, tipo_roteiro, perguntas_json, respostas_json,
        parecer, observacoes, data_entrevista, criado_por, criado_em
      )
      SELECT $1::uuid, $2, 'PADRAO', $3, $4, $5, $6, $7::timestamp, $8, NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM rh_entrevista
        WHERE tenant_id::text = $1 AND processo_id = $2 AND tipo_roteiro = 'PADRAO'
      )
      `,
      tenantId,
      processoId,
      JSON.stringify(["Experiência anterior", "Disponibilidade", "Conhecimento da função"]),
      JSON.stringify({
        experiencia: "Experiência fictícia compatível com a vaga.",
        disponibilidade: i % 2 === 0 ? "Integral" : "Meio período",
        observacao: "Resposta demonstrativa para apresentação comercial."
      }),
      i % 5 === 4 ? "Não recomendado neste momento" : "Recomendado para próxima etapa",
      `${DEMO} - entrevista fictícia preenchida.`,
      dateOnly(addDays(dataBase, 3)),
      usuarioId
    );

    await tx.$executeRawUnsafe(
      `
      INSERT INTO rh_ficha_admissao (
        tenant_id, processo_id, dados_pessoais_json, dependentes_json,
        dados_internos_json, criado_em, atualizado_em
      )
      VALUES ($1::uuid, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (processo_id)
      DO UPDATE SET dados_pessoais_json = EXCLUDED.dados_pessoais_json,
                    dependentes_json = EXCLUDED.dependentes_json,
                    dados_internos_json = EXCLUDED.dados_internos_json,
                    atualizado_em = NOW()
      `,
      tenantId,
      processoId,
      JSON.stringify({ nome, cpf, telefone: `349${String(97000000 + i).slice(0, 8)}`, email }),
      JSON.stringify(i % 4 === 0 ? [{ nome: `Dependente ${i + 1}`, parentesco: "Filho(a)" }] : []),
      JSON.stringify({
        cargo: vagas[i],
        setor: ["Administrativo", "Educação", "Projetos", "Operacional"][i % 4],
        salario: moeda(i, 1800),
        dataPrevistaAdmissao: dateOnly(addDays(dataBase, 15)),
        tipoContrato: i % 3 === 0 ? "Experiência" : "CLT"
      })
    );

    for (const tipo of ["TERMO_CONFIDENCIALIDADE", "TERMO_ADMISSAO"]) {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO rh_termo (
          tenant_id, processo_id, tipo, dados_json, status_assinatura,
          data_assinatura, responsavel, criado_em, atualizado_em
        )
        VALUES ($1::uuid, $2, $3, $4, $5, $6::date, $7, NOW(), NOW())
        ON CONFLICT (processo_id, tipo)
        DO UPDATE SET dados_json = EXCLUDED.dados_json,
                      status_assinatura = EXCLUDED.status_assinatura,
                      data_assinatura = EXCLUDED.data_assinatura,
                      responsavel = EXCLUDED.responsavel,
                      atualizado_em = NOW()
        `,
        tenantId,
        processoId,
        tipo,
        JSON.stringify({ origem: DEMO, candidato: nome, vaga: vagas[i] }),
        i % 5 === 4 ? "PENDENTE" : "ASSINADO",
        i % 5 === 4 ? null : dateOnly(addDays(dataBase, 12)),
        NOME_ADMIN
      );
    }

    await tx.$executeRawUnsafe(
      `
      INSERT INTO rh_carta_banco (tenant_id, processo_id, dados_json, criado_em, atualizado_em)
      VALUES ($1::uuid, $2, $3, NOW(), NOW())
      ON CONFLICT (processo_id)
      DO UPDATE SET dados_json = EXCLUDED.dados_json, atualizado_em = NOW()
      `,
      tenantId,
      processoId,
      JSON.stringify({
        banco: "Banco demonstrativo",
        agencia: `00${i + 1}`,
        conta: `12345-${i}`,
        finalidade: "Abertura de conta salário fictícia."
      })
    );

    await tx.$executeRawUnsafe(
      `
      INSERT INTO rh_ppd (
        tenant_id, processo_id, cabecalho_json, lado_a_json, lado_b_json,
        criado_em, atualizado_em
      )
      VALUES ($1::uuid, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (processo_id)
      DO UPDATE SET cabecalho_json = EXCLUDED.cabecalho_json,
                    lado_a_json = EXCLUDED.lado_a_json,
                    lado_b_json = EXCLUDED.lado_b_json,
                    atualizado_em = NOW()
      `,
      tenantId,
      processoId,
      JSON.stringify({ origem: DEMO, candidato: nome, vaga: vagas[i], preenchidoEm: dateOnly(addDays(dataBase, 10)) }),
      JSON.stringify({
        documentosConferidos: i % 5 !== 4,
        entrevistaRealizada: true,
        exameAdmissional: i % 4 !== 1,
        observacao: "Lado A preenchido com dados fictícios para demonstração."
      }),
      JSON.stringify({
        autorizacaoContratacao: i % 5 !== 4,
        integracaoAgendada: i % 3 !== 1,
        responsavelRh: NOME_ADMIN,
        observacao: "Lado B preenchido para demonstrar conferência final do processo."
      })
    );

    for (const arquivo of [
      ["DOCUMENTO", "Currículo", `curriculo-${cpf}.pdf`],
      ["DOCUMENTO", "Comprovante de endereço", `comprovante-endereco-${cpf}.pdf`],
      ["TERMO", "Termo de admissão", `termo-admissao-${cpf}.pdf`]
    ]) {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO rh_arquivo (
          tenant_id, processo_id, categoria, tipo_documento, nome_arquivo,
          mime_type, tamanho_bytes, caminho_arquivo, versao, criado_por, criado_em
        )
        SELECT $1::uuid, $2, $3, $4, $5, 'application/pdf', $6,
               $7, 1, $8, NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM rh_arquivo
          WHERE tenant_id::text = $1 AND processo_id = $2 AND nome_arquivo = $5
        )
        `,
        tenantId,
        processoId,
        arquivo[0],
        arquivo[1],
        arquivo[2],
        120000 + i * 950,
        `/storage/colaboradores/documentos/${DEMO.toLowerCase()}-${arquivo[2]}`,
        usuarioId
      );
    }

    await tx.$executeRawUnsafe(
      `
      INSERT INTO rh_auditoria_contratacao (tenant_id, processo_id, ator_id, acao, detalhes, criado_em)
      SELECT $1::uuid, $2, $3, 'SEED_DEMO_TORRESOFT', $4, NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM rh_auditoria_contratacao
        WHERE tenant_id::text = $1 AND processo_id = $2 AND acao = 'SEED_DEMO_TORRESOFT'
      )
      `,
      tenantId,
      processoId,
      usuarioId,
      `${DEMO} - processo de contratação fictício populado para demonstração.`
    );
  }
}

async function garantirUsuariosPonto(tx: typeof prisma, tenantId: string, instituicaoId: string) {
  const senhaHash = await bcrypt.hash(SENHA_INICIAL, 10);
  const funcionarios = [
    ["Marina Alves Demo", "Auxiliar administrativo", "Administrativo"],
    ["Rogério Nunes Demo", "Educador social", "Projetos"],
    ["Camila Torres Demo", "Recepcionista", "Atendimento"],
    ["Leandro Prado Demo", "Instrutor de informática", "Educação"],
    ["Patrícia Lima Demo", "Assistente financeiro", "Financeiro"],
    ["Renato Campos Demo", "Auxiliar de serviços gerais", "Operacional"],
    ["Sabrina Moreira Demo", "Bibliotecária", "Biblioteca"],
    ["Daniel Valença Demo", "Monitor de oficinas", "Projetos"]
  ];
  const ids: bigint[] = [];

  for (let i = 0; i < funcionarios.length; i += 1) {
    const [nome, cargo, setor] = funcionarios[i];
    const email = `ponto.demo${String(i + 1).padStart(2, "0")}@exemplo.com.br`;
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM usuarios WHERE tenant_id::text = $1 AND lower(email) = $2 AND deletado_em IS NULL LIMIT 1",
      tenantId,
      email
    );
    const id = existente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO usuarios (
          nome_usuario, nome, nome_exibicao, email, senha_hash, criado_em, atualizado_em,
          status, exigir_troca_senha, tentativas_login_invalidas, tenant_id, instituicao_id,
          perfil_acesso, is_superadmin, ultimo_tenant_id, exigir_autenticacao_segura,
          permitir_biometria_facial_login, exigir_biometria_facial_login, telefone, cpf,
          matricula, setor, unidade, cargo, criado_por
        )
        VALUES ($1, $2, $2, $1, $3, NOW(), NOW(), 'ATIVO', FALSE, 0, $4::uuid, $5::uuid,
                'OPERADOR', FALSE, $4::uuid, FALSE, FALSE, FALSE, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
        `,
        email,
        nome,
        senhaHash,
        tenantId,
        instituicaoId,
        `349${String(98000000 + i).slice(0, 8)}`,
        gerarCpfValido(1400 + i),
        `DEMO-PONTO-${String(i + 1).padStart(3, "0")}`,
        setor,
        "Unidade Social Horizonte",
        cargo,
        DEMO
      )
    )[0].id;

    await tx.$executeRawUnsafe(
      `
      UPDATE usuarios
      SET nome = $3,
          nome_exibicao = $3,
          status = 'ATIVO',
          telefone = $4,
          cpf = $5,
          matricula = $6,
          setor = $7,
          unidade = 'Unidade Social Horizonte',
          cargo = $8,
          horario_entrada_1 = '08:00',
          horario_saida_1 = '12:00',
          horario_entrada_2 = '13:00',
          horario_saida_2 = '17:00',
          atualizado_em = NOW()
      WHERE tenant_id::text = $1 AND id = $2
      `,
      tenantId,
      id,
      nome,
      `349${String(98000000 + i).slice(0, 8)}`,
      gerarCpfValido(1400 + i),
      `DEMO-PONTO-${String(i + 1).padStart(3, "0")}`,
      setor,
      cargo
    );
    ids.push(id);
  }

  return ids;
}

async function popularRegistroPonto(
  tx: typeof prisma,
  tenantId: string,
  instituicaoId: string,
  unidadesCriadas: Awaited<ReturnType<typeof garantirUnidades>>,
  usuarioGestorId: bigint
) {
  if (!(await tableExists(tx, "registro_ponto"))) return;

  const usuariosPonto = await garantirUsuariosPonto(tx, tenantId, instituicaoId);
  const unidadeId = unidadesCriadas[0]?.id ?? null;

  await tx.$executeRawUnsafe(
    `
    INSERT INTO registro_ponto_configuracao (
      tenant_id, tolerancia_entrada_antecipada_minutos,
      exigir_autorizacao_hora_extra_antecipada, limite_hora_extra_diaria_minutos,
      permitir_solicitacao_hora_extra_pelo_funcionario, mensagem_ciencia_hora_extra,
      criado_em, atualizado_em
    )
    VALUES ($1::uuid, 10, TRUE, 120, TRUE,
            'Declaro ciência de que a realização de hora extra depende de autorização da instituição.',
            NOW(), NOW())
    ON CONFLICT (tenant_id)
    DO UPDATE SET tolerancia_entrada_antecipada_minutos = EXCLUDED.tolerancia_entrada_antecipada_minutos,
                  exigir_autorizacao_hora_extra_antecipada = EXCLUDED.exigir_autorizacao_hora_extra_antecipada,
                  limite_hora_extra_diaria_minutos = EXCLUDED.limite_hora_extra_diaria_minutos,
                  permitir_solicitacao_hora_extra_pelo_funcionario = EXCLUDED.permitir_solicitacao_hora_extra_pelo_funcionario,
                  mensagem_ciencia_hora_extra = EXCLUDED.mensagem_ciencia_hora_extra,
                  atualizado_em = NOW()
    `,
    tenantId
  );

  const diasUteis: Date[] = [];
  for (let offset = 34; offset >= 1; offset -= 1) {
    const data = addDays(new Date(), -offset);
    const diaSemana = data.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) diasUteis.push(data);
  }

  for (let userIndex = 0; userIndex < usuariosPonto.length; userIndex += 1) {
    const usuarioId = usuariosPonto[userIndex];
    for (let diaIndex = 0; diaIndex < Math.min(diasUteis.length, 22); diaIndex += 1) {
      const data = diasUteis[diaIndex];
      const dataRef = dateOnly(data);
      const pattern = (userIndex + diaIndex) % 11;
      const falta = pattern === 7;
      const atraso = pattern === 3 ? 18 : pattern === 8 ? 9 : 0;
      const extra = pattern === 5 ? 35 : pattern === 9 ? 20 : 0;
      const ajusteManual = pattern === 4;
      const entrada1 = falta ? null : `08:${String(atraso).padStart(2, "0")}`;
      const saida1 = falta ? null : "12:00";
      const entrada2 = falta ? null : "13:00";
      const saida2 = falta ? null : extra ? `17:${String(extra).padStart(2, "0")}` : "17:00";
      const horasExtras = extra;
      const horasExtrasPendentes = pattern === 5 ? extra : 0;
      const horasExtrasAutorizadas = pattern === 9 ? extra : 0;
      const bancoHoras = pattern === 9 ? extra : 0;
      const faltas = falta ? 480 : 0;
      const observacoes = falta
        ? `${DEMO} - falta fictícia registrada para demonstrar ocorrência.`
        : ajusteManual
          ? `${DEMO} - ajuste administrativo fictício para demonstração.`
          : `${DEMO} - jornada fictícia registrada para demonstração.`;

      const registroRows = await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO registro_ponto (
          tenant_id, usuario_id, unidade_id, data_referencia, entrada_1, saida_1,
          entrada_2, saida_2, horas_extras_minutos, horas_extras_pendentes_minutos,
          horas_extras_autorizadas_minutos, horas_extras_negadas_minutos,
          horas_extras_compensadas_minutos, horas_extras_pagas_minutos,
          banco_horas_minutos, faltas_minutos, atrasos_minutos, observacoes,
          alterado_manualmente, criado_em, atualizado_em
        )
        VALUES (
          $1::uuid, $2, $3, $4::date, $5::time, $6::time, $7::time, $8::time,
          $9, $10, $11, 0, 0, 0, $12, $13, $14, $15, $16, NOW(), NOW()
        )
        ON CONFLICT (usuario_id, data_referencia)
        DO UPDATE SET tenant_id = EXCLUDED.tenant_id,
                      unidade_id = EXCLUDED.unidade_id,
                      entrada_1 = EXCLUDED.entrada_1,
                      saida_1 = EXCLUDED.saida_1,
                      entrada_2 = EXCLUDED.entrada_2,
                      saida_2 = EXCLUDED.saida_2,
                      horas_extras_minutos = EXCLUDED.horas_extras_minutos,
                      horas_extras_pendentes_minutos = EXCLUDED.horas_extras_pendentes_minutos,
                      horas_extras_autorizadas_minutos = EXCLUDED.horas_extras_autorizadas_minutos,
                      banco_horas_minutos = EXCLUDED.banco_horas_minutos,
                      faltas_minutos = EXCLUDED.faltas_minutos,
                      atrasos_minutos = EXCLUDED.atrasos_minutos,
                      observacoes = EXCLUDED.observacoes,
                      alterado_manualmente = EXCLUDED.alterado_manualmente,
                      atualizado_em = NOW()
        RETURNING id
        `,
        tenantId,
        usuarioId,
        unidadeId,
        dataRef,
        entrada1,
        saida1,
        entrada2,
        saida2,
        horasExtras,
        horasExtrasPendentes,
        horasExtrasAutorizadas,
        bancoHoras,
        faltas,
        atraso,
        observacoes,
        ajusteManual
      );
      const registroId = registroRows[0].id;

      const batidas = [
        ["ENTRADA_1", entrada1],
        ["SAIDA_1", saida1],
        ["ENTRADA_2", entrada2],
        ["SAIDA_2", saida2]
      ];
      for (let seq = 0; seq < batidas.length; seq += 1) {
        const [tipo, horario] = batidas[seq];
        if (!horario) continue;
        const batidaRows = await tx.$queryRawUnsafe<IdRow[]>(
          `
          INSERT INTO registro_ponto_batida (
            tenant_id, registro_ponto_id, sequencia, tipo, horario_servidor,
            ip_origem, user_agent, origem_validada, latitude, longitude,
            accuracy_metros, origem_json, criado_em
          )
          VALUES ($1::uuid, $2, $3, $4, ($5::date + $6::time), '192.168.10.25',
                  'G3N Seed Demo Torresoft', TRUE, -18.9186, -48.2772, 18,
                  $7::jsonb, NOW())
          ON CONFLICT (registro_ponto_id, sequencia)
          DO UPDATE SET tenant_id = EXCLUDED.tenant_id,
                        tipo = EXCLUDED.tipo,
                        horario_servidor = EXCLUDED.horario_servidor,
                        ip_origem = EXCLUDED.ip_origem,
                        user_agent = EXCLUDED.user_agent,
                        origem_validada = EXCLUDED.origem_validada,
                        latitude = EXCLUDED.latitude,
                        longitude = EXCLUDED.longitude,
                        accuracy_metros = EXCLUDED.accuracy_metros,
                        origem_json = EXCLUDED.origem_json
          RETURNING id
          `,
          tenantId,
          registroId,
          seq + 1,
          tipo,
          dataRef,
          horario,
          JSON.stringify({ origem: DEMO, modo: "IP_OU_REDE", validado: true })
        );

        if (seq === 3 && extra > 0) {
          const statusExtra = pattern === 5 ? "EXTRA_PENDENTE_AUTORIZACAO" : "EXTRA_COMPENSADA_BANCO";
          await tx.$executeRawUnsafe(
            `
            INSERT INTO registro_ponto_hora_extra (
              tenant_id, registro_ponto_id, registro_ponto_batida_id, usuario_id,
              data_referencia, campo_batida, horario_previsto, horario_real,
              minutos_excedentes, status, justificativa_funcionario,
              ciencia_registrada, ciencia_em, ciencia_usuario_id, ciencia_usuario_nome,
              gestor_id, gestor_nome, gestor_justificativa, minutos_aprovados,
              minutos_negados, criado_em, atualizado_em
            )
            VALUES ($1::uuid, $2, $3, $4, $5::date, 'saida_2', '17:00', $6::time,
                    $7, $8, $9, TRUE, NOW(), $4, 'Funcionário demonstração',
                    $10, $11, $12, $13, 0, NOW(), NOW())
            ON CONFLICT (registro_ponto_batida_id)
            DO UPDATE SET status = EXCLUDED.status,
                          justificativa_funcionario = EXCLUDED.justificativa_funcionario,
                          ciencia_registrada = EXCLUDED.ciencia_registrada,
                          gestor_id = EXCLUDED.gestor_id,
                          gestor_nome = EXCLUDED.gestor_nome,
                          gestor_justificativa = EXCLUDED.gestor_justificativa,
                          minutos_aprovados = EXCLUDED.minutos_aprovados,
                          minutos_negados = EXCLUDED.minutos_negados,
                          atualizado_em = NOW()
            `,
            tenantId,
            registroId,
            batidaRows[0].id,
            usuarioId,
            dataRef,
            saida2,
            extra,
            statusExtra,
            `${DEMO} - permanência para fechamento de atividade demonstrativa.`,
            statusExtra === "EXTRA_COMPENSADA_BANCO" ? usuarioGestorId : null,
            statusExtra === "EXTRA_COMPENSADA_BANCO" ? NOME_ADMIN : null,
            statusExtra === "EXTRA_COMPENSADA_BANCO" ? "Hora extra fictícia aprovada para banco de horas." : null,
            statusExtra === "EXTRA_COMPENSADA_BANCO" ? extra : 0
          );
        }
      }

      if (falta || atraso > 0 || ajusteManual || extra > 0) {
        const tipoOcorrencia = falta ? "FALTA" : atraso > 0 ? "ATRASO" : ajusteManual ? "AJUSTE_MANUAL" : "HORA_EXTRA";
        await tx.$executeRawUnsafe(
          `
          INSERT INTO registro_ponto_ocorrencia (
            tenant_id, registro_ponto_id, tipo, descricao, origem,
            criado_por_id, criado_por_nome, criado_em
          )
          SELECT $1::uuid, $2, $3, $4, 'SISTEMA', $5, $6, NOW()
          WHERE NOT EXISTS (
            SELECT 1 FROM registro_ponto_ocorrencia
            WHERE tenant_id::text = $1 AND registro_ponto_id = $2 AND tipo = $3
          )
          `,
          tenantId,
          registroId,
          tipoOcorrencia,
          `${DEMO} - ocorrência fictícia para demonstrar filtros e espelho de ponto.`,
          usuarioGestorId,
          NOME_ADMIN
        );
      }

      await tx.$executeRawUnsafe(
        `
        INSERT INTO registro_ponto_auditoria (
          tenant_id, registro_ponto_id, acao, usuario_id, usuario_nome,
          ip_origem, justificativa, observacao, dados_depois, criado_em
        )
        SELECT $1::uuid, $2, 'SEED_DEMO_TORRESOFT', $3, $4, '192.168.10.25',
               'Carga demonstrativa Torresoft', $5, $6::jsonb, NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM registro_ponto_auditoria
          WHERE tenant_id::text = $1 AND registro_ponto_id = $2 AND acao = 'SEED_DEMO_TORRESOFT'
        )
        `,
        tenantId,
        registroId,
        usuarioGestorId,
        NOME_ADMIN,
        `${DEMO} - registro criado para demonstração comercial.`,
        JSON.stringify({ data: dataRef, entrada1, saida1, entrada2, saida2, atraso, extra, falta })
      );
    }
  }
}

async function garantirContaBancariaDemo(tx: typeof prisma, tenantId: string) {
  const existente = await tx.$queryRawUnsafe<IdRow[]>(
    "SELECT id FROM conta_bancaria WHERE tenant_id::text = $1 AND nome_conta = $2 LIMIT 1",
    tenantId,
    "Conta demonstração Torresoft"
  );
  if (existente[0]?.id) return existente[0].id;

  const rows = await tx.$queryRawUnsafe<IdRow[]>(
    `
    INSERT INTO conta_bancaria (
      tenant_id, banco, agencia, numero, digito, nome_conta, titular,
      tipo, saldo, saldo_inicial, data_saldo_inicial, data_atualizacao,
      limite_minimo_alerta, status, permite_movimentacao, pix_vinculado,
      tipo_chave_pix, chave_pix, recebimento_local, fonte_pagamento,
      observacao, ativo, criado_em, atualizado_em
    )
    VALUES (
      $1::uuid, 'Banco demonstração', '0001', '123456', '7',
      'Conta demonstração Torresoft', 'TORRESOFT', 'Conta corrente',
      185000.00, 185000.00, CURRENT_DATE - INTERVAL '18 months',
      CURRENT_DATE, 5000.00, 'ATIVA', TRUE, TRUE, 'EMAIL',
      'financeiro.demo@exemplo.com.br', TRUE, 'Recursos demonstrativos Torresoft',
      $2, TRUE, NOW(), NOW()
    )
    RETURNING id
    `,
    tenantId,
    `${DEMO} - conta bancária fictícia para compras, reservas e captação.`
  );
  return rows[0].id;
}

async function popularAutorizacaoCompras(tx: typeof prisma, tenantId: string, usuarioId: bigint) {
  if (!(await tableExists(tx, "autorizacao_compras"))) return;

  const contaId = await garantirContaBancariaDemo(tx, tenantId);
  const niveis = [
    ["N1", "Coordenação", 1, 0, 5000, "AUTORIZACAO_COMPRAS_APROVAR"],
    ["N2", "Direção", 2, 5000.01, 25000, "AUTORIZACAO_COMPRAS_APROVAR"],
    ["N3", "Presidência", 3, 25000.01, null, "AUTORIZACAO_COMPRAS_APROVAR"]
  ];
  const nivelIds: bigint[] = [];
  for (const nivel of niveis) {
    const rows = await tx.$queryRawUnsafe<IdRow[]>(
      `
      INSERT INTO autorizacao_compras_aprovacao_nivel (
        tenant_id, codigo, nome, ordem, valor_minimo, valor_maximo,
        permissao_requerida, ativo, criado_em, atualizado_em
      )
      VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, TRUE, NOW(), NOW())
      ON CONFLICT (tenant_id, codigo)
      DO UPDATE SET nome = EXCLUDED.nome,
                    ordem = EXCLUDED.ordem,
                    valor_minimo = EXCLUDED.valor_minimo,
                    valor_maximo = EXCLUDED.valor_maximo,
                    permissao_requerida = EXCLUDED.permissao_requerida,
                    ativo = TRUE,
                    atualizado_em = NOW()
      RETURNING id
      `,
      tenantId,
      nivel[0],
      nivel[1],
      nivel[2],
      nivel[3],
      nivel[4],
      nivel[5]
    );
    nivelIds.push(rows[0].id);
  }

  const compras = [
    {
      numero: "AC-DEMO-2026-001",
      titulo: "Kits pedagógicos para oficinas",
      tipo: "Material de consumo",
      setor: "Educação",
      centro: "Projeto Aprender Mais",
      prioridade: "normal",
      status: "FINALIZADO",
      valor: 8420,
      patrimonio: false,
      almoxarifado: true
    },
    {
      numero: "AC-DEMO-2026-002",
      titulo: "Notebooks para laboratório digital",
      tipo: "Bens patrimoniais",
      setor: "Tecnologia",
      centro: "Inclusão Digital",
      prioridade: "urgente",
      status: "RESERVA_EFETUADA",
      valor: 32400,
      patrimonio: true,
      almoxarifado: false
    },
    {
      numero: "AC-DEMO-2026-003",
      titulo: "Serviço de manutenção predial",
      tipo: "Serviços",
      setor: "Administração",
      centro: "Manutenção",
      prioridade: "normal",
      status: "PAGAMENTO_AUTORIZADO",
      valor: 12800,
      patrimonio: false,
      almoxarifado: false
    },
    {
      numero: "AC-DEMO-2026-004",
      titulo: "Mobiliário para sala de atendimento",
      tipo: "Bens patrimoniais",
      setor: "Atendimento",
      centro: "Estrutura física",
      prioridade: "baixa",
      status: "COTACAO_CONCLUIDA",
      valor: 18650,
      patrimonio: true,
      almoxarifado: false
    },
    {
      numero: "AC-DEMO-2026-005",
      titulo: "Materiais de limpeza e higiene",
      tipo: "Material de consumo",
      setor: "Operacional",
      centro: "Unidade Social Horizonte",
      prioridade: "normal",
      status: "AGUARDANDO_APROVACAO",
      valor: 3960,
      patrimonio: false,
      almoxarifado: true
    },
    {
      numero: "AC-DEMO-2026-006",
      titulo: "Contratação de formação para equipe",
      tipo: "Serviços",
      setor: "Recursos humanos",
      centro: "Capacitação",
      prioridade: "normal",
      status: "EM_COTACAO",
      valor: 15400,
      patrimonio: false,
      almoxarifado: false
    },
    {
      numero: "AC-DEMO-2026-007",
      titulo: "Compra emergencial de alimentos",
      tipo: "Material de consumo",
      setor: "Serviço social",
      centro: "Atendimento familiar",
      prioridade: "urgente",
      status: "FORA_DO_ORCAMENTO",
      valor: 22600,
      patrimonio: false,
      almoxarifado: true
    },
    {
      numero: "AC-DEMO-2026-008",
      titulo: "Impressora multifuncional",
      tipo: "Bens patrimoniais",
      setor: "Administração",
      centro: "Equipamentos",
      prioridade: "baixa",
      status: "REPROVADO",
      valor: 5200,
      patrimonio: true,
      almoxarifado: false
    }
  ];

  for (let i = 0; i < compras.length; i += 1) {
    const compra = compras[i];
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM autorizacao_compras WHERE tenant_id::text = $1 AND numero_solicitacao = $2 LIMIT 1",
      tenantId,
      compra.numero
    );
    const orcamentoPrevisto = compra.valor < 20000 ? compra.valor + 9000 : compra.valor - 2500;
    const extrapola = compra.valor > orcamentoPrevisto;
    const id = existente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO autorizacao_compras (
          tenant_id, titulo, tipo, area, responsavel, data_prevista,
          data_solicitacao, valor, valor_total_itens, quantidade_itens,
          justificativa, observacoes, centro_custo, prioridade, status,
          solicitante, setor_solicitante, natureza_compra, dispensar_cotacao,
          motivo_dispensa, registro_patrimonio, registro_almoxarifado,
          orcamento_previsto, orcamento_utilizado, orcamento_saldo,
          valor_solicitacao, extrapola_orcamento, autorizacao_especial_orcamento,
          justificativa_orcamento, ativo, numero_solicitacao, numero_termo,
          criado_em, atualizado_em
        )
        VALUES (
          $1::uuid, $2, $3, $4, $5, $6::date, $7::date, $8, $8, 3,
          $9, $10, $11, $12, $13, $5, $4, $14, FALSE, NULL, $15, $16,
          $17, $18, $19, $8, $20, $21, $22, TRUE, $23, $24, NOW(), NOW()
        )
        RETURNING id
        `,
        tenantId,
        compra.titulo,
        compra.tipo,
        compra.setor,
        `Solicitante demonstração ${i + 1}`,
        dateOnly(addDays(new Date(), 10 + i * 3)),
        dateOnly(addDays(new Date(), -45 + i * 4)),
        compra.valor,
        `${DEMO} - justificativa fictícia para processo de compra.`,
        "Processo preenchido para apresentação comercial com itens, cotações, aprovação e histórico.",
        compra.centro,
        compra.prioridade,
        compra.status,
        ["Rotina institucional", "Compra emergencial", "Reposição de estoque"][i % 3],
        compra.patrimonio,
        compra.almoxarifado,
        orcamentoPrevisto,
        Number((compra.valor * 0.32).toFixed(2)),
        Number((orcamentoPrevisto - compra.valor).toFixed(2)),
        extrapola,
        compra.status !== "FORA_DO_ORCAMENTO",
        extrapola ? "Compra demonstrativa autorizada para exceção orçamentária." : null,
        compra.numero,
        `TERMO-DEMO-${String(i + 1).padStart(3, "0")}`
      )
    )[0].id;

    await tx.$executeRawUnsafe(
      `
      UPDATE autorizacao_compras
      SET titulo = $3,
          tipo = $4,
          area = $5,
          responsavel = $6,
          data_prevista = $7::date,
          data_solicitacao = $8::date,
          valor = $9,
          valor_total_itens = $9,
          quantidade_itens = 3,
          centro_custo = $10,
          prioridade = $11,
          status = $12,
          solicitante = $6,
          setor_solicitante = $5,
          registro_patrimonio = $13,
          registro_almoxarifado = $14,
          orcamento_previsto = $15,
          orcamento_saldo = $16,
          valor_solicitacao = $9,
          extrapola_orcamento = $17,
          autorizacao_especial_orcamento = $18,
          justificativa_orcamento = $19,
          ativo = TRUE,
          finalizado_em = CASE WHEN $12 = 'FINALIZADO' THEN NOW() ELSE NULL END,
          atualizado_em = NOW()
      WHERE tenant_id::text = $1 AND id = $2
      `,
      tenantId,
      id,
      compra.titulo,
      compra.tipo,
      compra.setor,
      `Solicitante demonstração ${i + 1}`,
      dateOnly(addDays(new Date(), 10 + i * 3)),
      dateOnly(addDays(new Date(), -45 + i * 4)),
      compra.valor,
      compra.centro,
      compra.prioridade,
      compra.status,
      compra.patrimonio,
      compra.almoxarifado,
      orcamentoPrevisto,
      Number((orcamentoPrevisto - compra.valor).toFixed(2)),
      extrapola,
      compra.status !== "FORA_DO_ORCAMENTO",
      extrapola ? "Compra demonstrativa autorizada para exceção orçamentária." : null
    );

    const itens = [
      [`${compra.titulo} - item principal`, 1 + (i % 3), "un", Number((compra.valor * 0.55).toFixed(2)), "Principal"],
      ["Frete, instalação ou apoio operacional", 1, "serv", Number((compra.valor * 0.18).toFixed(2)), "Serviço"],
      ["Materiais complementares", 2 + i, "un", Number((compra.valor * 0.27).toFixed(2)), "Complementar"]
    ];
    for (let item = 0; item < itens.length; item += 1) {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO autorizacao_compras_item (
          autorizacao_compra_id, descricao, quantidade, unidade, valor_estimado,
          categoria, tipo_item, ordem, ativo, criado_em, atualizado_em
        )
        SELECT $1, $2, $3, $4, $5, $6, $7, $8, TRUE, NOW(), NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM autorizacao_compras_item
          WHERE autorizacao_compra_id = $1 AND descricao = $2
        )
        `,
        id,
        itens[item][0],
        itens[item][1],
        itens[item][2],
        itens[item][3],
        itens[item][4],
        compra.tipo === "Bens patrimoniais" ? "bem" : compra.tipo === "Serviços" ? "servico" : "material",
        item
      );
    }

    const cotacoes: bigint[] = [];
    for (let c = 0; c < 3; c += 1) {
      const fornecedor = `Fornecedor compra demo ${i + 1}.${c + 1}`;
      const rows = await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO autorizacao_compras_cotacoes (
          autorizacao_compra_id, fornecedor, razao_social, cnpj, valor,
          prazo_entrega, validade, conformidade, observacoes, contato,
          telefone, email, forma_pagamento, data_cotacao, ativo,
          criado_em, atualizado_em
        )
        SELECT $1, $2, $3, $4, $5, $6::date, $7::date, $8, $9,
               $10, $11, $12, $13, $14::date, TRUE, NOW(), NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM autorizacao_compras_cotacoes
          WHERE autorizacao_compra_id = $1 AND fornecedor = $2
        )
        RETURNING id
        `,
        id,
        fornecedor,
        `${fornecedor} Ltda`,
        `12.345.${String(100 + i).padStart(3, "0")}/000${c + 1}-90`,
        Number((compra.valor * (0.92 + c * 0.08)).toFixed(2)),
        dateOnly(addDays(new Date(), 7 + c * 4)),
        dateOnly(addDays(new Date(), 25 + c * 4)),
        c === 2 && i % 4 === 0 ? "Com ressalva" : "Conforme",
        `${DEMO} - cotação fictícia anexada ao processo.`,
        `Contato ${c + 1}`,
        `349${String(99000000 + i * 10 + c).slice(0, 8)}`,
        `compras.demo${i + 1}.${c + 1}@exemplo.com.br`,
        ["PIX", "Boleto", "Transferência"][c % 3],
        dateOnly(addDays(new Date(), -30 + i + c))
      );
      const cotacaoId = rows[0]?.id ?? (
        await tx.$queryRawUnsafe<IdRow[]>(
          "SELECT id FROM autorizacao_compras_cotacoes WHERE autorizacao_compra_id = $1 AND fornecedor = $2 LIMIT 1",
          id,
          fornecedor
        )
      )[0].id;
      cotacoes.push(cotacaoId);
    }

    await tx.$executeRawUnsafe(
      `
      UPDATE autorizacao_compras
      SET menor_preco_cotacao_id = $3,
          cotacao_vencedora_id = CASE WHEN $4 THEN $5 ELSE $3 END,
          menor_preco_fornecedor = $6,
          menor_preco_valor = $7,
          vencedor = $8,
          flag_excecao_menor_preco = $4,
          justificativa_excecao_menor_preco = CASE WHEN $4 THEN 'Fornecedor escolhido por prazo de entrega e suporte local demonstrativo.' ELSE NULL END,
          numero_reserva = CASE WHEN $9 THEN $10 ELSE numero_reserva END,
          autorizacao_pagamento_numero = CASE WHEN $11 THEN $12 ELSE autorizacao_pagamento_numero END,
          autorizacao_pagamento_autor = CASE WHEN $11 THEN $13 ELSE autorizacao_pagamento_autor END,
          autorizacao_pagamento_data = CASE WHEN $11 THEN CURRENT_DATE ELSE autorizacao_pagamento_data END,
          autorizacao_pagamento_observacoes = CASE WHEN $11 THEN 'Autorização fictícia de pagamento para demonstração.' ELSE autorizacao_pagamento_observacoes END,
          pagamento_autorizado_valor = CASE WHEN $11 THEN valor_solicitacao ELSE pagamento_autorizado_valor END,
          pagamento_vencimento = CASE WHEN $11 THEN CURRENT_DATE + INTERVAL '12 days' ELSE pagamento_vencimento END,
          pagamento_forma = CASE WHEN $11 THEN 'PIX' ELSE pagamento_forma END,
          conta_pagadora_id = CASE WHEN $11 THEN $14 ELSE conta_pagadora_id END,
          documento_referencia = CASE WHEN $11 THEN $15 ELSE documento_referencia END,
          documento_fiscal = CASE WHEN $11 THEN $16 ELSE documento_fiscal END,
          atualizado_em = NOW()
      WHERE tenant_id::text = $1 AND id = $2
      `,
      tenantId,
      id,
      cotacoes[0],
      i % 4 === 1,
      cotacoes[1],
      `Fornecedor compra demo ${i + 1}.1`,
      Number((compra.valor * 0.92).toFixed(2)),
      i % 4 === 1 ? `Fornecedor compra demo ${i + 1}.2` : `Fornecedor compra demo ${i + 1}.1`,
      ["RESERVA_EFETUADA", "PAGAMENTO_AUTORIZADO", "DESPESA_LANCADA", "FINALIZADO"].includes(compra.status),
      `RES-DEMO-${String(i + 1).padStart(4, "0")}`,
      ["PAGAMENTO_AUTORIZADO", "DESPESA_LANCADA", "FINALIZADO"].includes(compra.status),
      `AP-DEMO-${String(i + 1).padStart(4, "0")}`,
      NOME_ADMIN,
      contaId,
      compra.numero,
      `NF-DEMO-COMPRA-${String(i + 1).padStart(4, "0")}`
    );

    if (["RESERVA_EFETUADA", "PAGAMENTO_AUTORIZADO", "DESPESA_LANCADA", "FINALIZADO"].includes(compra.status)) {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO autorizacao_compras_reserva_bancaria (
          autorizacao_compra_id, conta_bancaria_id, valor, status,
          observacao, usuario_responsavel, criado_em
        )
        SELECT $1, $2, $3, 'ATIVA', $4, $5, NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM autorizacao_compras_reserva_bancaria
          WHERE autorizacao_compra_id = $1 AND conta_bancaria_id = $2 AND status = 'ATIVA'
        )
        `,
        id,
        contaId,
        compra.valor,
        `${DEMO} - reserva financeira fictícia vinculada à compra.`,
        NOME_ADMIN
      );
    }

    const nivelId = compra.valor > 25000 ? nivelIds[2] : compra.valor > 5000 ? nivelIds[1] : nivelIds[0];
    if (["APROVADO", "EM_COTACAO", "COTACAO_CONCLUIDA", "FORNECEDOR_DEFINIDO", "RESERVA_EFETUADA", "PAGAMENTO_AUTORIZADO", "DESPESA_LANCADA", "FINALIZADO", "REPROVADO"].includes(compra.status)) {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO autorizacao_compras_aprovacao (
          autorizacao_compra_id, nivel_id, decisao, parecer, observacao,
          motivo, usuario_id, usuario_nome, permissoes_json, ip, maquina, criado_em
        )
        SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9::text, '192.168.10.25', 'DEMO-TORRESOFT', NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM autorizacao_compras_aprovacao
          WHERE autorizacao_compra_id = $1 AND nivel_id = $2
        )
        `,
        id,
        nivelId,
        compra.status === "REPROVADO" ? "REPROVAR" : "APROVAR",
        compra.status === "REPROVADO" ? "Reprovado para revisão orçamentária demonstrativa." : "Aprovado conforme necessidade institucional demonstrativa.",
        `${DEMO} - aprovação fictícia registrada.`,
        compra.status === "REPROVADO" ? "Valor e prioridade devem ser reavaliados." : null,
        usuarioId,
        NOME_ADMIN,
        JSON.stringify(["ADMINISTRADOR", "AUTORIZACAO_COMPRAS_APROVAR"])
      );
    }

    for (const [ordem, evento] of ["Solicitação criada", "Enviada para aprovação", "Cotações registradas", "Fornecedor definido", "Reserva financeira", "Autorização de pagamento"].entries()) {
      if (ordem > 1 && ["SOLICITADO", "AGUARDANDO_APROVACAO"].includes(compra.status)) continue;
      if (ordem > 3 && ["EM_COTACAO", "COTACAO_CONCLUIDA", "REPROVADO", "FORA_DO_ORCAMENTO"].includes(compra.status)) continue;
      await tx.$executeRawUnsafe(
        `
        INSERT INTO autorizacao_compras_historico (
          autorizacao_compra_id, acao, aba, status_anterior, status_novo,
          observacao, justificativa, usuario_id, usuario_nome, perfil, ip, maquina, criado_em
        )
        SELECT $1, $2, $3, NULL, $4, $5, $6, $7, $8, 'Administrador', '192.168.10.25', 'DEMO-TORRESOFT', NOW() - ($9 || ' days')::interval
        WHERE NOT EXISTS (
          SELECT 1 FROM autorizacao_compras_historico
          WHERE autorizacao_compra_id = $1 AND acao = $2
        )
        `,
        id,
        evento,
        ["Solicitação", "Aprovações", "Cotações", "Fornecedor", "Reserva", "Pagamento"][ordem],
        compra.status,
        `${DEMO} - histórico fictício do processo de compra.`,
        "Carga demonstrativa Torresoft.",
        usuarioId,
        NOME_ADMIN,
        10 - ordem
      );
    }

    if (["DESPESA_LANCADA", "FINALIZADO"].includes(compra.status)) {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO autorizacao_compras_integracao (
          autorizacao_compra_id, tipo, referencia_id, status, detalhe,
          usuario_id, usuario_nome, criado_em
        )
        SELECT $1, 'FINANCEIRO', $2, 'CONCLUIDA', $3, $4, $5, NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM autorizacao_compras_integracao
          WHERE autorizacao_compra_id = $1 AND tipo = 'FINANCEIRO'
        )
        `,
        id,
        `FIN-DEMO-${compra.numero}`,
        `${DEMO} - integração financeira fictícia concluída.`,
        usuarioId,
        NOME_ADMIN
      );
    }

    await tx.$executeRawUnsafe(
      `
      INSERT INTO arquivos (
        tenant_id, entidade_tipo, entidade_id, categoria, nome_original, nome_arquivo,
        caminho_arquivo, mime_type, extensao, tamanho_bytes, data_upload,
        usuario_upload_id, ativo, observacao, metadados_json, criado_em, atualizado_em
      )
      SELECT $1::uuid, 'autorizacao_compra', $2, 'documento', $3, $4, $5,
             'application/pdf', 'pdf', 145000, NOW(), $6, TRUE, $7, $8::jsonb, NOW(), NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM arquivos
        WHERE tenant_id::text = $1 AND entidade_tipo = 'autorizacao_compra'
          AND entidade_id = $2 AND nome_arquivo = $4
      )
      `,
      tenantId,
      id,
      `Processo de compra ${compra.numero}.pdf`,
      `${compra.numero.toLowerCase()}-processo.pdf`,
      `/storage/instituicoes/documentos/${DEMO.toLowerCase()}-${compra.numero.toLowerCase()}-processo.pdf`,
      usuarioId,
      `${DEMO} - anexo fictício de autorização de compras.`,
      JSON.stringify({ origem: DEMO, numeroSolicitacao: compra.numero })
    );
  }
}

async function popularCaptacaoRecursos(tx: typeof prisma, tenantId: string, usuarioId: bigint) {
  if (!(await tableExists(tx, "captacao_doadores"))) return;

  const doadores: bigint[] = [];
  for (let i = 0; i < 24; i += 1) {
    const documento = i % 4 === 0 ? `55000${String(100000000 + i).slice(0, 9)}` : gerarCpfValido(1700 + i);
    const email = `captacao.doador${String(i + 1).padStart(2, "0")}@exemplo.com.br`;
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM captacao_doadores WHERE tenant_id::text = $1 AND email_principal_norm = $2 AND deleted_at IS NULL LIMIT 1",
      tenantId,
      email
    );
    const id = existente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO captacao_doadores (
          uuid, tenant_id, tipo_doador, nome, nome_fantasia, cpf_cnpj,
          cpf_cnpj_norm, data_nascimento_fundacao, email_principal,
          email_principal_norm, telefone, telefone_norm, whatsapp, whatsapp_norm,
          endereco_completo, bairro, cidade, uf, cep, cep_norm, observacoes,
          origem_cadastro, status, aceitou_lgpd, data_aceite_lgpd,
          aceita_email, aceita_whatsapp, aceita_receber_campanhas, categoria_doador,
          segmento_relacionamento, status_retencao, motivo_risco,
          proxima_acao_sugerida, score_relacionamento, responsavel_relacionamento,
          observacoes_internas, portal_ativo, anexo_principal_caminho,
          created_at, updated_at, created_by, updated_by
        )
        VALUES (
          $1, $2::uuid, $3, $4, $5, $6, $7, $8::date, $9, $9,
          $10, $11, $10, $11, $12, $13, 'Uberlândia', 'MG', '38400000',
          '38400000', $14, 'Demonstração Torresoft', $15, TRUE, CURRENT_DATE,
          TRUE, TRUE, TRUE, $16, $17, $18, $19, $20, $21, $22, $23,
          TRUE, $24, NOW(), NOW(), $25, $25
        )
        RETURNING id
        `,
        randomUUID(),
        tenantId,
        i % 4 === 0 ? "juridica" : "fisica",
        i % 4 === 0 ? `Empresa apoiadora fictícia ${i + 1}` : `Doador captação demonstração ${i + 1}`,
        i % 4 === 0 ? `Apoiadora ${i + 1}` : null,
        documento,
        documento.replace(/\D/g, ""),
        dateOnly(addDays(new Date("1985-01-01T00:00:00Z"), i * 340)),
        email,
        `349${String(96500000 + i).slice(0, 8)}`,
        `349${String(96500000 + i).slice(0, 8)}`,
        `Rua Captação Demo, ${200 + i}`,
        bairros[i % bairros.length],
        `${DEMO} - doador fictício cadastrado para captação de recursos.`,
        ["ativo", "ativo", "inativo", "prospect"][i % 4],
        ["recorrente", "pontual", "empresa", "major_donor"][i % 4],
        ["novo", "recorrente", "alto_valor", "reativacao"][i % 4],
        ["saudavel", "atencao", "risco"][i % 3],
        i % 3 === 2 ? "Sem doação nos últimos 90 dias." : null,
        ["Enviar agradecimento", "Agendar ligação", "Convidar para campanha", "Atualizar cadastro"][i % 4],
        55 + (i % 9) * 5,
        NOME_ADMIN,
        `${DEMO} - observação interna fictícia para relacionamento.`,
        `/storage/geral/outros/${DEMO.toLowerCase()}-doador-${i + 1}.pdf`,
        usuarioId
      )
    )[0].id;
    doadores.push(id);

    await tx.$executeRawUnsafe(
      `
      INSERT INTO captacao_preferencias_comunicacao (
        uuid, tenant_id, doador_id, aceita_email, aceita_whatsapp,
        aceita_campanhas, aceite_lgpd, data_aceite_lgpd,
        created_at, updated_at, created_by, updated_by
      )
      VALUES ($1, $2::uuid, $3, TRUE, TRUE, TRUE, TRUE, CURRENT_DATE, NOW(), NOW(), $4, $4)
      ON CONFLICT (doador_id)
      DO UPDATE SET aceita_email = TRUE,
                    aceita_whatsapp = TRUE,
                    aceita_campanhas = TRUE,
                    aceite_lgpd = TRUE,
                    data_aceite_lgpd = CURRENT_DATE,
                    tenant_id = EXCLUDED.tenant_id,
                    updated_at = NOW()
      `,
      randomUUID(),
      tenantId,
      id,
      usuarioId
    );

    for (let t = 0; t < 2; t += 1) {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO captacao_tarefas_relacionamento (
          uuid, tenant_id, doador_id, titulo, descricao, status, prioridade,
          tipo, responsavel, data_prevista, concluida_em, origem,
          created_at, updated_at, created_by, updated_by
        )
        SELECT $1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10::date,
               CASE WHEN $6 = 'concluida' THEN NOW() - INTERVAL '3 days' ELSE NULL END,
               'seed_demo', NOW(), NOW(), $11, $11
        WHERE NOT EXISTS (
          SELECT 1 FROM captacao_tarefas_relacionamento
          WHERE tenant_id::text = $2 AND doador_id = $3 AND titulo = $4
        )
        `,
        randomUUID(),
        tenantId,
        id,
        t === 0 ? "Agradecer contribuição" : "Follow-up de relacionamento",
        `${DEMO} - tarefa fictícia de relacionamento com doador.`,
        (i + t) % 3 === 0 ? "concluida" : "pendente",
        t === 0 ? "alta" : "media",
        t === 0 ? "agradecimento" : "follow_up",
        NOME_ADMIN,
        dateOnly(addDays(new Date(), -5 + i + t * 7)),
        usuarioId
      );
    }
  }

  const campanhas: bigint[] = [];
  const nomesCampanhas = [
    "Campanha Volta às Aulas Torresoft", "Inverno Solidário Torresoft", "Biblioteca Viva Torresoft",
    "Fundo Primeira Infância", "Natal Comunitário", "Conexão Digital"
  ];
  for (let i = 0; i < nomesCampanhas.length; i += 1) {
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM captacao_campanhas WHERE tenant_id::text = $1 AND nome = $2 AND deleted_at IS NULL LIMIT 1",
      tenantId,
      nomesCampanhas[i]
    );
    const meta = 25000 + i * 12500;
    const id = existente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO captacao_campanhas (
          uuid, tenant_id, nome, descricao_curta, descricao_completa, objetivo,
          meta_financeira, valor_arrecadado, percentual_atingido, data_inicial,
          data_final, status, imagem_banner, cor_destaque, tipo, responsavel,
          destaque_no_portal, visivel_ao_publico, url_publica, qr_code_publico,
          mensagem_agradecimento, created_at, updated_at, created_by, updated_by
        )
        VALUES (
          $1, $2::uuid, $3, $4, $5, $6, $7, 0, 0, $8::date, $9::date,
          $10, $11, $12, $13, $14, $15, TRUE, $16, $17, $18, NOW(), NOW(), $19, $19
        )
        RETURNING id
        `,
        randomUUID(),
        tenantId,
        nomesCampanhas[i],
        "Campanha fictícia para apresentação comercial.",
        `${DEMO} - campanha preenchida com meta, doações, recorrência e comprovantes.`,
        ["Material escolar", "Acolhimento no inverno", "Livros e leitura", "Primeira infância", "Cestas especiais", "Inclusão digital"][i],
        meta,
        dateOnly(addDays(new Date(), -210 + i * 25)),
        dateOnly(addDays(new Date(), 60 + i * 20)),
        ["ativa", "ativa", "encerrada", "ativa", "rascunho", "ativa"][i],
        `/storage/geral/outros/${DEMO.toLowerCase()}-campanha-${i + 1}.jpg`,
        ["#0f766e", "#2563eb", "#be123c", "#7c3aed", "#ca8a04", "#15803d"][i],
        ["pontual", "recorrente", "evento", "projeto"][i % 4],
        NOME_ADMIN,
        i < 4,
        `/portal/campanhas/demo-torresoft-${i + 1}`,
        `QR-DEMO-TORRESOFT-${i + 1}`,
        "Obrigado por apoiar esta campanha demonstrativa da Torresoft.",
        usuarioId
      )
    )[0].id;
    campanhas.push(id);
  }

  for (let i = 0; i < 12; i += 1) {
    await tx.$executeRawUnsafe(
      `
      INSERT INTO captacao_recorrencias (
        uuid, tenant_id, doador_id, campanha_id, valor_recorrente,
        periodicidade, forma_pagamento, data_proxima_cobranca,
        quantidade_ciclos, ciclos_pagos, sem_previsao_termino, status,
        referencia_externa, created_at, updated_at, created_by, updated_by
      )
      SELECT $1, $2::uuid, $3, $4, $5, $6, $7, $8::date, $9, $10,
             $11, $12, $13, NOW(), NOW(), $14, $14
      WHERE NOT EXISTS (
        SELECT 1 FROM captacao_recorrencias
        WHERE tenant_id::text = $2 AND referencia_externa = $13 AND deleted_at IS NULL
      )
      `,
      randomUUID(),
      tenantId,
      doadores[i % doadores.length],
      campanhas[i % campanhas.length],
      moeda(i, 80),
      ["mensal", "bimestral", "trimestral"][i % 3],
      ["pix", "cartao", "boleto"][i % 3],
      dateOnly(addDays(new Date(), 10 + i * 3)),
      i % 4 === 0 ? null : 12,
      2 + (i % 6),
      i % 4 === 0,
      i % 5 === 0 ? "pausada" : "ativa",
      `REC-DEMO-TORRESOFT-${String(i + 1).padStart(3, "0")}`,
      usuarioId
    );
  }

  for (let i = 0; i < 84; i += 1) {
    const numero = `CAP-DEMO-${String(i + 1).padStart(5, "0")}`;
    const valor = moeda(i, 65);
    const forma = ["pix", "cartao", "boleto"][i % 3];
    const situacao = ["confirmado", "pago", "pendente", "aguardando_pagamento", "cancelado", "estornado"][i % 6];
    const doadorId = doadores[i % doadores.length];
    const campanhaId = campanhas[i % campanhas.length];
    const doacaoRows = await tx.$queryRawUnsafe<IdRow[]>(
      `
      INSERT INTO captacao_doacoes (
        uuid, tenant_id, numero_doacao, data_hora, doador_id, campanha_id,
        valor, valor_liquido, valor_taxas, tipo_doacao, forma_pagamento,
        situacao, origem, identificador_externo, txid, link_pagamento,
        data_vencimento, observacoes_internas, usuario_responsavel,
        comprovante_gerado, created_at, updated_at, created_by, updated_by
      )
      VALUES (
        $1, $2::uuid, $3, $4::timestamp, $5, $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17::date, $18, $19, $20, NOW(), NOW(), $21, $21
      )
      ON CONFLICT (numero_doacao)
      DO UPDATE SET tenant_id = EXCLUDED.tenant_id,
                    data_hora = EXCLUDED.data_hora,
                    doador_id = EXCLUDED.doador_id,
                    campanha_id = EXCLUDED.campanha_id,
                    valor = EXCLUDED.valor,
                    valor_liquido = EXCLUDED.valor_liquido,
                    valor_taxas = EXCLUDED.valor_taxas,
                    tipo_doacao = EXCLUDED.tipo_doacao,
                    forma_pagamento = EXCLUDED.forma_pagamento,
                    situacao = EXCLUDED.situacao,
                    origem = EXCLUDED.origem,
                    comprovante_gerado = EXCLUDED.comprovante_gerado,
                    updated_at = NOW()
      RETURNING id
      `,
      randomUUID(),
      tenantId,
      numero,
      addDays(new Date(), -360 + i * 4).toISOString(),
      doadorId,
      campanhaId,
      valor,
      Number((valor * 0.974).toFixed(2)),
      Number((valor * 0.026).toFixed(2)),
      ["financeira", "recorrente", "campanha"][i % 3],
      forma,
      situacao,
      ["administrativo", "portal", "campanha_publica"][i % 3],
      `EXT-${numero}`,
      forma === "pix" ? `TXID-${numero}` : null,
      situacao === "pendente" ? `https://pagamento-demo.exemplo.com.br/${numero}` : null,
      dateOnly(addDays(new Date(), 10 + i)),
      `${DEMO} - doação fictícia de captação.`,
      NOME_ADMIN,
      ["confirmado", "pago"].includes(situacao),
      usuarioId
    );
    const doacaoId = doacaoRows[0].id;

    await tx.$executeRawUnsafe(
      `
      INSERT INTO captacao_doacoes_eventos (
        uuid, tenant_id, doacao_id, tipo_evento, descricao, payload_json,
        created_at, created_by
      )
      SELECT $1, $2::uuid, $3, 'SEED_DEMO_TORRESOFT', $4, $5::jsonb, NOW(), $6
      WHERE NOT EXISTS (
        SELECT 1 FROM captacao_doacoes_eventos
        WHERE tenant_id::text = $2 AND doacao_id = $3 AND tipo_evento = 'SEED_DEMO_TORRESOFT'
      )
      `,
      randomUUID(),
      tenantId,
      doacaoId,
      `${DEMO} - evento fictício da doação.`,
      JSON.stringify({ numero, situacao, formaPagamento: forma }),
      usuarioId
    );

    if (forma === "pix") {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO captacao_transacoes_pix (
          uuid, tenant_id, doacao_id, txid, payload_pix, qr_code_svg, status,
          data_criacao, data_expiracao, data_liquidacao, provider_nome,
          payload_json, created_at, updated_at, created_by, updated_by
        )
        VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, NOW(), NOW() + INTERVAL '1 day',
                CASE WHEN $7 IN ('pago', 'confirmado') THEN NOW() ELSE NULL END,
                'provedor-demo', $8::jsonb, NOW(), NOW(), $9, $9)
        ON CONFLICT (doacao_id)
        DO UPDATE SET status = EXCLUDED.status, payload_json = EXCLUDED.payload_json, updated_at = NOW()
        `,
        randomUUID(),
        tenantId,
        doacaoId,
        `TXID-${numero}`,
        `PIX-DEMO-${numero}`,
        `<svg><text>${numero}</text></svg>`,
        situacao,
        JSON.stringify({ origem: DEMO, ambiente: "sandbox" }),
        usuarioId
      );
    } else if (forma === "cartao") {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO captacao_transacoes_cartao (
          uuid, tenant_id, doacao_id, referencia_externa, autorizacao_codigo,
          captura_codigo, status, provider_nome, payload_json, historico_json,
          created_at, updated_at, created_by, updated_by
        )
        VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, 'provedor-demo',
                $8::jsonb, $9::jsonb, NOW(), NOW(), $10, $10)
        ON CONFLICT (doacao_id)
        DO UPDATE SET status = EXCLUDED.status, historico_json = EXCLUDED.historico_json, updated_at = NOW()
        `,
        randomUUID(),
        tenantId,
        doacaoId,
        `CARD-${numero}`,
        `AUTH-${numero}`,
        `CAP-${numero}`,
        situacao,
        JSON.stringify({ origem: DEMO, ambiente: "sandbox" }),
        JSON.stringify([{ status: situacao, data: new Date().toISOString() }]),
        usuarioId
      );
    } else {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO captacao_transacoes_boleto (
          uuid, tenant_id, doacao_id, numero_documento, nosso_numero,
          linha_digitavel, codigo_barras, data_emissao, data_vencimento,
          data_pagamento, status, provider_nome, retorno_processamento,
          payload_json, created_at, updated_at, created_by, updated_by
        )
        VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, CURRENT_DATE - INTERVAL '5 days',
                CURRENT_DATE + INTERVAL '7 days',
                CASE WHEN $8 IN ('pago', 'confirmado') THEN CURRENT_DATE ELSE NULL END,
                $8, 'provedor-demo', 'Retorno fictício de boleto.', $9::jsonb, NOW(), NOW(), $10, $10)
        ON CONFLICT (doacao_id)
        DO UPDATE SET status = EXCLUDED.status, data_pagamento = EXCLUDED.data_pagamento, updated_at = NOW()
        `,
        randomUUID(),
        tenantId,
        doacaoId,
        `BOL-${numero}`,
        `NN-${numero}`,
        `00190.00009 01234.567890 12345.678901 1 ${String(10000000000000 + i)}`,
        `001${String(10000000000000000000n + BigInt(i))}`,
        situacao,
        JSON.stringify({ origem: DEMO, ambiente: "sandbox" }),
        usuarioId
      );
    }

    if (["confirmado", "pago"].includes(situacao)) {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO captacao_comprovantes (
          uuid, tenant_id, doacao_id, doador_id, campanha_id, numero_comprovante,
          codigo_validacao, arquivo_caminho, enviado_email, data_envio_email,
          mensagem_agradecimento, created_at, updated_at, created_by, updated_by
        )
        VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, TRUE, NOW(), $9, NOW(), NOW(), $10, $10)
        ON CONFLICT (doacao_id)
        DO UPDATE SET numero_comprovante = EXCLUDED.numero_comprovante,
                      codigo_validacao = EXCLUDED.codigo_validacao,
                      arquivo_caminho = EXCLUDED.arquivo_caminho,
                      enviado_email = TRUE,
                      data_envio_email = NOW(),
                      updated_at = NOW()
        `,
        randomUUID(),
        tenantId,
        doacaoId,
        doadorId,
        campanhaId,
        `COMP-${numero}`,
        `VAL-${numero}`,
        `/storage/doacoes/comprovantes/${DEMO.toLowerCase()}-${numero.toLowerCase()}.pdf`,
        "Obrigado por apoiar as ações demonstrativas da Torresoft.",
        usuarioId
      );
    }
  }

  for (const campanhaId of campanhas) {
    await tx.$executeRawUnsafe(
      `
      INSERT INTO captacao_campanhas_metricas (
        uuid, tenant_id, campanha_id, total_arrecadado, total_doacoes,
        total_doadores, percentual_atingido, atualizado_em, created_at,
        updated_at, created_by, updated_by
      )
      SELECT $1, $2::uuid, $3,
             COALESCE(SUM(d.valor_liquido), 0),
             COUNT(d.id)::integer,
             COUNT(DISTINCT d.doador_id)::integer,
             CASE WHEN c.meta_financeira > 0 THEN ROUND((COALESCE(SUM(d.valor_liquido), 0) / c.meta_financeira) * 100, 2) ELSE 0 END,
             NOW(), NOW(), NOW(), $4, $4
      FROM captacao_campanhas c
      LEFT JOIN captacao_doacoes d ON d.campanha_id = c.id AND d.deleted_at IS NULL
      WHERE c.id = $3
      GROUP BY c.id
      ON CONFLICT (campanha_id)
      DO UPDATE SET total_arrecadado = EXCLUDED.total_arrecadado,
                    total_doacoes = EXCLUDED.total_doacoes,
                    total_doadores = EXCLUDED.total_doadores,
                    percentual_atingido = EXCLUDED.percentual_atingido,
                    tenant_id = EXCLUDED.tenant_id,
                    atualizado_em = NOW(),
                    updated_at = NOW()
      `,
      randomUUID(),
      tenantId,
      campanhaId,
      usuarioId
    );
    await tx.$executeRawUnsafe(
      `
      UPDATE captacao_campanhas c
      SET valor_arrecadado = m.total_arrecadado,
          percentual_atingido = m.percentual_atingido,
          updated_at = NOW()
      FROM captacao_campanhas_metricas m
      WHERE c.id = m.campanha_id
        AND c.id = $1
        AND c.tenant_id::text = $2
      `,
      campanhaId,
      tenantId
    );
  }

  await tx.$executeRawUnsafe(
    `
    INSERT INTO captacao_configuracoes (
      tenant_id, modulo_habilitado, portal_doador_habilitado,
      campanhas_publicas_habilitadas, doacoes_recorrentes_habilitadas,
      envio_automatico_comprovantes, pix_chave, pix_recebedor, pix_cidade,
      pix_ambiente, pix_webhook_url, pix_expiracao_minutos, pix_provider,
      cartao_provider, cartao_ambiente, cartao_chave_publica,
      cartao_chave_privada_ref, cartao_tentativas_falha, boleto_provider,
      boleto_ambiente, boleto_prazo_vencimento_dias, boleto_instrucao,
      mensagem_agradecimento, modelo_comprovante, modelo_email_cobranca,
      modelo_lembrete, modelo_campanha, lgpd_termo_consentimento,
      lgpd_politica_privacidade, lgpd_base_legal, created_at, updated_at,
      created_by, updated_by
    )
    SELECT $1::uuid, TRUE, TRUE, TRUE, TRUE, TRUE,
           'financeiro.demo@exemplo.com.br', 'TORRESOFT', 'UBERLANDIA',
           'sandbox', 'https://webhook-demo.exemplo.com.br/captacao', 1440,
           'provedor-demo', 'provedor-demo', 'sandbox', 'pk_demo_torresoft',
           'secret-ref-demo-torresoft', 2, 'provedor-demo', 'sandbox', 7,
           'Boleto demonstrativo sem valor fiscal.', 'Obrigado por contribuir com a Torresoft.',
           'Modelo demonstrativo de comprovante.', 'Modelo demonstrativo de cobrança.',
           'Modelo demonstrativo de lembrete.', 'Modelo demonstrativo de campanha.',
           'Termo de consentimento fictício para demonstração.',
           'Política de privacidade demonstrativa.',
           'Consentimento e legítimo interesse conforme operação demonstrativa.',
           NOW(), NOW(), $2, $2
    WHERE NOT EXISTS (SELECT 1 FROM captacao_configuracoes WHERE tenant_id::text = $1)
    `,
    tenantId,
    usuarioId
  );

  await tx.$executeRawUnsafe(
    `
    INSERT INTO captacao_logs (
      uuid, tenant_id, entidade_tipo, acao, descricao, detalhes_json,
      created_at, created_by
    )
    SELECT $1, $2::uuid, 'captacao_demo', 'SEED_DEMO_TORRESOFT', $3, $4::jsonb, NOW(), $5
    WHERE NOT EXISTS (
      SELECT 1 FROM captacao_logs
      WHERE tenant_id::text = $2 AND entidade_tipo = 'captacao_demo' AND acao = 'SEED_DEMO_TORRESOFT'
    )
    `,
    randomUUID(),
    tenantId,
    `${DEMO} - captação de recursos populada para demonstração comercial.`,
    JSON.stringify({ doadores: 24, campanhas: 6, doacoes: 84 }),
    usuarioId
  );
}

async function popularProjetosPatrimonioFinanceiro(tx: typeof prisma, tenantId: string, unidadesCriadas: Awaited<ReturnType<typeof garantirUnidades>>) {
  for (let i = 0; i < projetosDemo.length; i += 1) {
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM projetos WHERE tenant_id::text = $1 AND nome = $2 LIMIT 1",
      tenantId,
      projetosDemo[i]
    );
    if (!existente[0]) {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO projetos (
          tenant_id, nome, descricao_completa, objetivo_geral, publico_alvo,
          unidade_assistencial_id, responsavel, equipe_envolvida, data_inicio,
          prazo_previsto, data_termino_real, prioridade, status, area_projeto,
          fonte_recurso, observacoes, ativo, created_at, updated_at
        )
          VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::date, $10::date,
                $11::date, $12, $13, $14, $15, $16, TRUE, NOW(), NOW())
        `,
        tenantId,
        projetosDemo[i],
        `${DEMO} - projeto fictício com metas, atividades e histórico para apresentação.`,
        "Ampliar oportunidades de desenvolvimento social, educacional e familiar.",
        ["Crianças e adolescentes", "Famílias acompanhadas", "Jovens", "Idosos"][i % 4],
        unidadesCriadas[i % unidadesCriadas.length].id,
        `Profissional Demonstração ${String((i % 24) + 1).padStart(2, "0")}`,
        JSON.stringify(["Coordenação", "Serviço social", "Educação"]),
        dateOnly(addDays(new Date(), -650 + i * 30)),
        dateOnly(addDays(new Date(), 90 + i * 20)),
        i % 4 === 0 ? dateOnly(addDays(new Date(), -60 + i)) : null,
        ["BAIXA", "MEDIA", "ALTA"][i % 3],
        ["EM_EXECUCAO", "PLANEJAMENTO", "CONCLUIDO", "SUSPENSO"][i % 4],
        ["Educação", "Assistência social", "Esporte", "Cultura"][i % 4],
        ["Recursos próprios", "Parceria pública", "Doações"][i % 3],
        "Dados fictícios coerentes para demonstração comercial."
      );
    }
  }

  const categorias = ["Informática", "Mobiliário", "Equipamentos pedagógicos", "Veículos", "Eletrodomésticos"];
  for (const categoria of categorias) {
    await tx.$executeRawUnsafe(
      `
      INSERT INTO patrimonio_categoria (tenant_id, nome, taxa_depreciacao, subcategorias, ativo, criado_em, atualizado_em)
      SELECT $1::uuid, $2, 10, '[]'::jsonb, TRUE, NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM patrimonio_categoria WHERE tenant_id::text = $1 AND nome = $2)
      `,
      tenantId,
      categoria
    );
  }
  for (let i = 0; i < 42; i += 1) {
    const numero = `TS-DEMO-${String(i + 1).padStart(5, "0")}`;
    await tx.$executeRawUnsafe(
      `
      INSERT INTO patrimonio_item (
        numero_patrimonio, nome, categoria, subcategoria, conservacao, status,
        data_aquisicao, valor_aquisicao, origem, responsavel, unidade, sala,
        taxa_depreciacao, observacoes, criado_em, atualizado_em, tenant_id, unidade_id
      )
      SELECT $1, $2, $3, $4, $5, $6, $7::date, $8, $9, $10, $11, $12, 10, $13,
             NOW(), NOW(), $14::uuid, $15
      WHERE NOT EXISTS (SELECT 1 FROM patrimonio_item WHERE tenant_id::text = $14 AND numero_patrimonio = $1)
      `,
      numero,
      ["Notebook educacional", "Projetor multimídia", "Mesa administrativa", "Cadeira escolar", "Armário de aço", "Impressora"][i % 6],
      categorias[i % categorias.length],
      "Demonstração",
      ["Ótimo", "Bom", "Regular"][i % 3],
      ["ATIVO", "EM_USO", "MANUTENCAO"][i % 3],
      dateOnly(addDays(new Date(), -720 + i * 12)),
      moeda(i, 650),
      ["Compra", "Doação", "Convênio"][i % 3],
      `Responsável Demo ${i + 1}`,
      unidadesCriadas[i % unidadesCriadas.length].nome,
      unidadesCriadas[i % unidadesCriadas.length].salas[0]?.toString() ?? null,
      `${DEMO} - patrimônio fictício.`,
      tenantId,
      unidadesCriadas[i % unidadesCriadas.length].id
    );
  }

  for (let i = 0; i < 6; i += 1) {
    const placa = `TSD${String(1000 + i)}`;
    await tx.$executeRawUnsafe(
      `
      INSERT INTO controle_veiculos (
        placa, modelo, marca, ano, tipo_combustivel, capacidade_tanque_litros,
        observacoes, ativo, criado_em, atualizado_em, cor, tenant_id
      )
      SELECT $1, $2, $3, $4, $5, 55, $6, TRUE, NOW(), NOW(), $7, $8::uuid
      WHERE NOT EXISTS (SELECT 1 FROM controle_veiculos WHERE tenant_id::text = $8 AND placa = $1)
      `,
      placa,
      ["Van escolar", "Fiat Doblò", "Micro-ônibus", "Veículo utilitário"][i % 4],
      ["Demo Motors", "Fictícia Veículos"][i % 2],
      2018 + (i % 6),
      ["Flex", "Diesel"][i % 2],
      `${DEMO} - veículo fictício.`,
      ["Branco", "Prata", "Azul"][i % 3],
      tenantId
    );
  }

  for (let i = 0; i < 240; i += 1) {
    const descricao = `${DEMO} lançamento financeiro ${String(i + 1).padStart(4, "0")}`;
    await tx.$executeRawUnsafe(
      `
      INSERT INTO lancamento_financeiro (
        tipo, descricao, contraparte, vencimento, valor, situacao, criado_em,
        atualizado_em, data_lancamento, natureza, setor, documento, historico,
        forma_pagamento, origem, observacao, data_baixa, responsavel, projeto,
        conciliado, bloqueado_origem, ativo, tenant_id
      )
      SELECT $1, $2, $3, $4::date, $5, $6, NOW(), NOW(), $7::date, $8, $9, $10,
             $11, $12, 'DEMONSTRACAO', $13, $14::date, $15, $16, $17, FALSE, TRUE, $18::uuid
      WHERE NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE tenant_id::text = $18 AND descricao = $2)
      `,
      i % 3 === 0 ? "DESPESA" : "RECEITA",
      descricao,
      i % 3 === 0 ? "Fornecedor fictício" : "Parceiro fictício",
      dateOnly(addDays(new Date(), -365 + i * 2)),
      moeda(i, i % 3 === 0 ? 420 : 900),
      i % 5 === 0 ? "ABERTO" : "BAIXADO",
      dateOnly(addDays(new Date(), -370 + i * 2)),
      i % 3 === 0 ? "Despesa operacional" : "Receita institucional",
      ["Administração", "Projetos", "Educação"][i % 3],
      `DOC-DEMO-${i + 1}`,
      "Movimentação fictícia para demonstração de relatórios financeiros.",
      ["PIX", "Boleto", "Transferência"][i % 3],
      "Registro gerado por seed de demonstração.",
      i % 5 === 0 ? null : dateOnly(addDays(new Date(), -360 + i * 2)),
      "Administrador Demonstração",
      projetosDemo[i % projetosDemo.length],
      i % 5 !== 0,
      tenantId
    );
  }
}

async function popularDoacoes(tx: typeof prisma, tenantId: string, beneficiarios: bigint[], familias: bigint[], itensAlmoxarifado: bigint[]) {
  const doadores: bigint[] = [];
  for (let i = 0; i < 16; i += 1) {
    const nome = `Doador Fictício Torresoft ${String(i + 1).padStart(2, "0")}`;
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM doador WHERE tenant_id::text = $1 AND nome = $2 LIMIT 1",
      tenantId,
      nome
    );
    const id = existente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO doador (
          tenant_id, nome, tipo_pessoa, documento, responsavel_empresa, email,
          telefone, logradouro, numero, bairro, cidade, uf, cep, observacoes,
          criado_em, atualizado_em
        )
        VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, 'Rua dos Doadores', $8,
                $9, 'Uberlândia', 'MG', '38400000', $10, NOW(), NOW())
        RETURNING id
        `,
        tenantId,
        nome,
        i % 3 === 0 ? "JURIDICA" : "FISICA",
        i % 3 === 0 ? `99123${String(450000000 + i).slice(0, 9)}` : gerarCpfValido(1200 + i),
        i % 3 === 0 ? `Responsável Demo ${i + 1}` : null,
        `doador.demo${i + 1}@exemplo.com.br`,
        `349${String(97000000 + i).slice(0, 8)}`,
        String(300 + i),
        bairros[i % bairros.length],
        `${DEMO} - doador fictício.`
      )
    )[0].id;
    doadores.push(id);
  }

  for (let i = 0; i < 72; i += 1) {
    const numeroRecibo = `REC-TS-DEMO-${String(i + 1).padStart(4, "0")}`;
    const recebimentoExistente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM recebimento_doacao WHERE tenant_id::text = $1 AND numero_recibo = $2 LIMIT 1",
      tenantId,
      numeroRecibo
    );
    const recebimentoId = recebimentoExistente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO recebimento_doacao (
          tenant_id, doador_id, numero_recibo, tipo_doacao, descricao,
          quantidade_itens, valor_medio, valor_total, valor, data_recebimento,
          forma_recebimento, recorrente, periodicidade, proxima_cobranca,
          status, observacoes, criado_em, atualizado_em
        )
        VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $8, $9::date,
                $10, $11, $12, $13::date, $14, $15, NOW(), NOW())
        RETURNING id
        `,
        tenantId,
        doadores[i % doadores.length],
        numeroRecibo,
        ["Doação financeira", "Doação de alimentos", "Doação de bens de consumo", "Doação de materiais escolares"][i % 4],
        `Recebimento fictício Torresoft ${i + 1}`,
        2 + (i % 8),
        moeda(i, 35),
        moeda(i, 180),
        dateOnly(addDays(new Date(), -360 + i * 5)),
        ["PIX", "Transferência", "Entrega presencial"][i % 3],
        i % 10 === 0,
        i % 10 === 0 ? "Mensal" : null,
        i % 10 === 0 ? dateOnly(addDays(new Date(), 30 + i)) : null,
        ["Recebida", "Conferida", "Disponível"][i % 3],
        `${DEMO} - doação recebida fictícia para apresentação.`
      )
    )[0].id;

    await tx.$executeRawUnsafe(
      `
      INSERT INTO recebimento_doacao_item (
        tenant_id, recebimento_doacao_id, descricao, quantidade, unidade,
        valor_unitario, valor_total, marca, modelo, conservacao, observacoes, criado_em
      )
      SELECT $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM recebimento_doacao_item WHERE tenant_id::text = $1 AND recebimento_doacao_id = $2 AND descricao = $3
      )
      `,
      tenantId,
      recebimentoId,
      ["Cesta básica", "Kit higiene", "Material escolar", "Cobertor", "Recurso financeiro"][i % 5],
      1 + (i % 6),
      ["un", "kit", "pct"][i % 3],
      moeda(i, 22),
      moeda(i, 120),
      "Marca fictícia",
      "Modelo demonstração",
      ["Novo", "Bom", "Regular"][i % 3],
      `${DEMO} - item recebido fictício.`
    );
  }

  for (let i = 0; i < 95; i += 1) {
    const marcadorDoacao = `${DEMO} - doação realizada fictícia ${String(i + 1).padStart(4, "0")}`;
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM doacao_realizada WHERE tenant_id::text = $1 AND observacoes = $2 LIMIT 1",
      tenantId,
      marcadorDoacao
    );
    const doacaoId = existente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO doacao_realizada (
          tenant_id, beneficiario_id, vinculo_familiar_id,
          tipo_doacao, situacao, responsavel, observacoes, data_doacao,
          criado_em, atualizado_em
        )
        VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8::date, NOW(), NOW())
        RETURNING id
        `,
        tenantId,
        i % 4 === 0 ? null : beneficiarios[i % beneficiarios.length],
        i % 4 === 0 ? familias[i % familias.length] : null,
        ["Cesta básica", "Kit higiene", "Material escolar", "Cobertor social"][i % 4],
        ["Entregue", "Entregue", "Cancelada", "Pendente"][i % 4],
        `Profissional Demonstração ${String((i % 24) + 1).padStart(2, "0")}`,
        marcadorDoacao,
        dateOnly(addDays(new Date(), -300 + i * 3))
      )
    )[0].id;

    await tx.$executeRawUnsafe(
      `
      INSERT INTO doacao_realizada_item (
        tenant_id, doacao_realizada_id, almoxarifado_item_id, quantidade,
        observacoes, fora_carencia, criado_em
      )
      SELECT $1::uuid, $2, $3, $4, $5, FALSE, NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM doacao_realizada_item
        WHERE tenant_id::text = $1 AND doacao_realizada_id = $2 AND almoxarifado_item_id = $3
      )
      `,
      tenantId,
      doacaoId,
      itensAlmoxarifado[i % itensAlmoxarifado.length],
      1 + (i % 3),
      `${DEMO} - item entregue fictício.`
    );
  }
}

async function popularVisitasDomiciliares(tx: typeof prisma, tenantId: string, beneficiarios: bigint[], unidadesCriadas: Awaited<ReturnType<typeof garantirUnidades>>) {
  for (let i = 0; i < 85; i += 1) {
    const beneficiarioId = beneficiarios[i % beneficiarios.length];
    const chave = `${DEMO} visita ${String(i + 1).padStart(4, "0")}`;
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM visita_domiciliar WHERE tenant_id::text = $1 AND observacoes_iniciais = $2 LIMIT 1",
      tenantId,
      chave
    );
    if (existente[0]) continue;
    const nomeRow = await tx.$queryRawUnsafe<Array<{ nome_completo: string }>>(
      "SELECT nome_completo FROM cadastro_beneficiario WHERE tenant_id::text = $1 AND id = $2 LIMIT 1",
      tenantId,
      beneficiarioId
    );
    await tx.$executeRawUnsafe(
      `
      INSERT INTO visita_domiciliar (
        tenant_id, beneficiario_id, beneficiario_nome, unidade, responsavel,
        data_visita, horario_inicial, horario_final, tipo_visita, situacao,
        usar_endereco_beneficiario, endereco, observacoes_iniciais, condicoes,
        situacao_social, registro, anexos, criado_em, atualizado_em
      )
      VALUES ($1::uuid, $2, $3, $4, $5, $6::date, $7::time, $8::time, $9, $10,
              TRUE, $11::jsonb, $12, $13::jsonb, $14::jsonb, $15::jsonb,
              '[]'::jsonb, NOW(), NOW())
      `,
      tenantId,
      beneficiarioId,
      nomeRow[0]?.nome_completo ?? `Beneficiário demonstração ${i + 1}`,
      unidadesCriadas[i % unidadesCriadas.length].nome,
      `Profissional Demonstração ${String((i % 24) + 1).padStart(2, "0")}`,
      dateOnly(addDays(new Date(), -240 + i * 2)),
      `${String(8 + (i % 7)).padStart(2, "0")}:00`,
      `${String(9 + (i % 7)).padStart(2, "0")}:00`,
      ["Acompanhamento familiar", "Busca ativa", "Revisão cadastral", "Orientação social"][i % 4],
      ["Realizada", "Realizada", "Reagendada", "Concluída"][i % 4],
      JSON.stringify({ bairro: bairros[i % bairros.length], cidade: "Uberlândia", uf: "MG" }),
      chave,
      JSON.stringify({ moradia: "Condição estável", acessoServicos: "Acompanhado pela rede local" }),
      JSON.stringify({ renda: "Informação fictícia atualizada", composição: "Família acompanhada" }),
      JSON.stringify({ resumo: "Visita fictícia realizada com orientação à família.", encaminhamentos: ["Atualização cadastral", "Retorno programado"] })
    );
  }
}

async function popularEducacional(tx: typeof prisma, tenantId: string, beneficiarios: bigint[], profissionais: bigint[], unidadesCriadas: Awaited<ReturnType<typeof garantirUnidades>>, usuarioId: bigint) {
  const unidadeEscolar = unidadesCriadas.find((item) => item.tipo === "ENSINO") ?? unidadesCriadas[0];
  const anoRows = await Promise.all([2025, 2026, 2027].map(async (ano) => {
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM educacional_ano_letivo WHERE tenant_id::text = $1 AND ano = $2 LIMIT 1",
      tenantId,
      ano
    );
    return existente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO educacional_ano_letivo (
          tenant_id, ano, descricao, data_inicial, data_final, status, periodos, criado_em, atualizado_em
        )
        VALUES ($1::uuid, $2, $3, $4::date, $5::date, $6, $7::jsonb, NOW(), NOW())
        RETURNING id
        `,
        tenantId,
        ano,
        `Ano letivo ${ano}`,
        `${ano}-02-01`,
        `${ano}-12-20`,
        ano === 2026 ? "ABERTO" : ano < 2026 ? "ENCERRADO" : "PLANEJADO",
        JSON.stringify(["1º bimestre", "2º bimestre", "3º bimestre", "4º bimestre"])
      )
    )[0].id;
  }));

  const etapasSeries = [
    ["Educação infantil", ["Maternal II", "Pré I", "Pré II"]],
    ["Ensino fundamental", ["1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"]]
  ];
  const seriesIds: Array<{ etapaId: bigint; serieId: bigint; etapa: string; serie: string }> = [];
  for (const [etapa, series] of etapasSeries) {
    const etapaId = (await tx.$queryRawUnsafe<IdRow[]>(
      `
      INSERT INTO educacional_etapa (tenant_id, nome, descricao, status, criado_em, atualizado_em)
      SELECT $1::uuid, $2, $3, 'ATIVO', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM educacional_etapa WHERE tenant_id::text = $1 AND nome = $2)
      RETURNING id
      `,
      tenantId,
      etapa,
      `${DEMO} - etapa educacional.`
    ))[0]?.id ?? (await tx.$queryRawUnsafe<IdRow[]>("SELECT id FROM educacional_etapa WHERE tenant_id::text = $1 AND nome = $2 LIMIT 1", tenantId, etapa))[0].id;
    for (const serie of series) {
      const serieId = (await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO educacional_serie (tenant_id, etapa_id, nome, descricao, status, criado_em, atualizado_em)
        SELECT $1::uuid, $2, $3, $4, 'ATIVO', NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM educacional_serie WHERE tenant_id::text = $1 AND etapa_id = $2 AND nome = $3)
        RETURNING id
        `,
        tenantId,
        etapaId,
        serie,
        `${DEMO} - série escolar.`
      ))[0]?.id ?? (await tx.$queryRawUnsafe<IdRow[]>("SELECT id FROM educacional_serie WHERE tenant_id::text = $1 AND etapa_id = $2 AND nome = $3 LIMIT 1", tenantId, etapaId, serie))[0].id;
      seriesIds.push({ etapaId, serieId, etapa, serie });
    }
  }

  const disciplinaIds: bigint[] = [];
  for (let i = 0; i < disciplinas.length; i += 1) {
    const nome = disciplinas[i];
    const id = (await tx.$queryRawUnsafe<IdRow[]>(
      `
      INSERT INTO educacional_disciplina (tenant_id, codigo, nome, area, carga_horaria, status, criado_em, atualizado_em)
      SELECT $1::uuid, $2, $3, $4, $5, 'ATIVA', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM educacional_disciplina WHERE tenant_id::text = $1 AND nome = $3)
      RETURNING id
      `,
      tenantId,
      `DISC-${String(i + 1).padStart(2, "0")}`,
      nome,
      ["Linguagens", "Matemática", "Ciências da natureza", "Ciências humanas"][i % 4],
      80
    ))[0]?.id ?? (await tx.$queryRawUnsafe<IdRow[]>("SELECT id FROM educacional_disciplina WHERE tenant_id::text = $1 AND nome = $2 LIMIT 1", tenantId, nome))[0].id;
      disciplinaIds.push(id);
  }
  await tx.$executeRawUnsafe("UPDATE educacional_disciplina SET status = 'ATIVA', atualizado_em = NOW() WHERE tenant_id::text = $1", tenantId);

  const turmas = ["Maternal II A", "Pré I A", "Pré II A", "1º Ano A", "2º Ano A", "3º Ano A", "4º Ano A", "5º Ano A"];
  const turmaIds: Array<{ id: bigint; serie: string; etapaId: bigint; serieId: bigint; salaId: bigint }> = [];
  for (let i = 0; i < turmas.length; i += 1) {
    const serie = seriesIds[i];
    const id = (await tx.$queryRawUnsafe<IdRow[]>(
      `
      INSERT INTO educacional_turma (
        tenant_id, ano_letivo_id, unidade_id, etapa_id, serie_id, sala_id, nome, turno,
        capacidade_maxima, professor_responsavel_id, professor_responsavel_nome, status,
        criado_em, atualizado_em
      )
      SELECT $1::uuid, $2, $3, $4, $5, $6, $7, $8, 28, $9, $10, 'ATIVA', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM educacional_turma WHERE tenant_id::text = $1 AND ano_letivo_id = $2 AND nome = $7)
      RETURNING id
      `,
      tenantId,
      anoRows[1],
      unidadeEscolar.id,
      serie.etapaId,
      serie.serieId,
      unidadeEscolar.salas[i % unidadeEscolar.salas.length],
      turmas[i],
      i % 2 === 0 ? "MATUTINO" : "VESPERTINO",
      profissionais[i % profissionais.length],
      `Profissional Demonstração ${String((i % 24) + 1).padStart(2, "0")}`
    ))[0]?.id ?? (await tx.$queryRawUnsafe<IdRow[]>("SELECT id FROM educacional_turma WHERE tenant_id::text = $1 AND ano_letivo_id = $2 AND nome = $3 LIMIT 1", tenantId, anoRows[1], turmas[i]))[0].id;
    turmaIds.push({ id, serie: turmas[i], etapaId: serie.etapaId, serieId: serie.serieId, salaId: unidadeEscolar.salas[i % unidadeEscolar.salas.length] });
  }

  for (let i = 0; i < 52; i += 1) {
    const alunoId = (await tx.$queryRawUnsafe<IdRow[]>(
      `
      INSERT INTO educacional_aluno (tenant_id, beneficiario_id, numero_aluno, observacoes, status, criado_em, atualizado_em)
      SELECT $1::uuid, $2, $3, $4, 'ATIVO', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM educacional_aluno WHERE tenant_id::text = $1 AND beneficiario_id = $2)
      RETURNING id
      `,
      tenantId,
      beneficiarios[i],
      `ALU-${String(i + 1).padStart(5, "0")}`,
      `${DEMO} - aluno vinculado ao cadastro único de beneficiário.`
    ))[0]?.id ?? (await tx.$queryRawUnsafe<IdRow[]>("SELECT id FROM educacional_aluno WHERE tenant_id::text = $1 AND beneficiario_id = $2 LIMIT 1", tenantId, beneficiarios[i]))[0].id;
    const turma = turmaIds[i % turmaIds.length];
    const numeroMatricula = String(i + 1).padStart(5, "0");
    const matriculaId = (await tx.$queryRawUnsafe<IdRow[]>(
      `
      INSERT INTO educacional_matricula (
        tenant_id, aluno_id, ano_letivo_id, unidade_id, etapa_id, serie_id, turma_id,
        sala_id, numero_matricula, data_matricula, situacao, criado_em, atualizado_em,
        data_inicio, turno, observacoes, usuario_responsavel_id, usuario_responsavel_nome,
        ativo, origem, responsavel_nome, transporte_escolar, documentacao, informacoes_complementares
      )
      SELECT $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10::date, $11, NOW(), NOW(),
             $10::date, $12, $13, $14, $15, TRUE, 'INICIAL', $16, $17, $18::jsonb, $19
      WHERE NOT EXISTS (SELECT 1 FROM educacional_matricula WHERE tenant_id::text = $1 AND numero_matricula = $9)
      RETURNING id
      `,
      tenantId,
      alunoId,
      anoRows[1],
      unidadeEscolar.id,
      turma.etapaId,
      turma.serieId,
      turma.id,
      turma.salaId,
      numeroMatricula,
      dateOnly(addDays(new Date("2026-02-01T00:00:00Z"), i % 20)),
      i === 7 ? "TRANSFERIDO" : i === 13 ? "CANCELADO" : "ATIVA",
      i % 2 === 0 ? "MATUTINO" : "VESPERTINO",
      `${DEMO} - matrícula escolar fictícia.`,
      usuarioId,
      NOME_ADMIN,
      `Responsável fictício ${i + 1}`,
      i % 6 === 0,
      JSON.stringify({ rg: true, cpf: true, comprovante_residencia: i % 5 !== 0 }),
      "Informações complementares de demonstração."
    ))[0]?.id ?? (await tx.$queryRawUnsafe<IdRow[]>("SELECT id FROM educacional_matricula WHERE tenant_id::text = $1 AND numero_matricula = $2 LIMIT 1", tenantId, numeroMatricula))[0].id;

    if (i < 40) {
      const disciplinaId = disciplinaIds[i % disciplinaIds.length];
      for (let aula = 0; aula < 6; aula += 1) {
        const dataAula = dateOnly(addDays(new Date("2026-03-01T00:00:00Z"), aula * 14 + (i % 5)));
        const diarioId = (await tx.$queryRawUnsafe<IdRow[]>(
          `
          INSERT INTO educacional_diario_aula (
            tenant_id, turma_id, disciplina_id, professor_id, data_aula, conteudo,
            objetivos, metodologia, atividades, observacoes, status, criado_em, atualizado_em
          )
          SELECT $1::uuid, $2, $3, $4, $5::date, $6, $7, $8, $9, $10, 'REGISTRADO', NOW(), NOW()
          WHERE NOT EXISTS (
            SELECT 1 FROM educacional_diario_aula
            WHERE tenant_id::text = $1 AND turma_id = $2 AND disciplina_id = $3 AND data_aula = $5::date
          )
          RETURNING id
          `,
          tenantId,
          turma.id,
          disciplinaId,
          profissionais[i % profissionais.length],
          dataAula,
          "Conteúdo demonstrativo do componente curricular.",
          "Desenvolver participação, autonomia e aprendizagem progressiva.",
          "Aula dialogada com atividade prática.",
          "Atividade em grupo e registro individual.",
          `${DEMO} - diário fictício.`
        ))[0]?.id ?? (await tx.$queryRawUnsafe<IdRow[]>("SELECT id FROM educacional_diario_aula WHERE tenant_id::text = $1 AND turma_id = $2 AND disciplina_id = $3 AND data_aula = $4::date LIMIT 1", tenantId, turma.id, disciplinaId, dataAula))[0].id;

        await tx.$executeRawUnsafe(
          `
          INSERT INTO educacional_frequencia (
            tenant_id, diario_aula_id, matricula_id, situacao, justificativa, observacao, criado_em, atualizado_em
          )
          SELECT $1::uuid, $2, $3, $4, $5, $6, NOW(), NOW()
          WHERE NOT EXISTS (
            SELECT 1 FROM educacional_frequencia WHERE tenant_id::text = $1 AND diario_aula_id = $2 AND matricula_id = $3
          )
          `,
          tenantId,
          diarioId,
          matriculaId,
          i % 11 === 0 && aula % 2 === 0 ? "AUSENTE" : i % 13 === 0 ? "JUSTIFICADO" : "PRESENTE",
          i % 13 === 0 ? "Justificativa fictícia apresentada pelo responsável." : null,
          `${DEMO} - frequência fictícia.`
        );
      }

      for (let av = 0; av < 2; av += 1) {
        const avaliacaoId = (await tx.$queryRawUnsafe<IdRow[]>(
          `
          INSERT INTO educacional_avaliacao (
            tenant_id, turma_id, disciplina_id, periodo, tipo, data_avaliacao,
            valor_maximo, peso, descricao, status, criado_em, atualizado_em
          )
          SELECT $1::uuid, $2, $3, $4, $5, $6::date, 10, 1, $7, 'PUBLICADA', NOW(), NOW()
          WHERE NOT EXISTS (
            SELECT 1 FROM educacional_avaliacao
            WHERE tenant_id::text = $1 AND turma_id = $2 AND disciplina_id = $3 AND periodo = $4 AND tipo = $5
          )
          RETURNING id
          `,
          tenantId,
          turma.id,
          disciplinaId,
          `${av + 1}º bimestre`,
          av === 0 ? "Avaliação diagnóstica" : "Avaliação bimestral",
          dateOnly(addDays(new Date("2026-04-01T00:00:00Z"), av * 45 + (i % 6))),
          `${DEMO} - avaliação fictícia.`
        ))[0]?.id ?? (await tx.$queryRawUnsafe<IdRow[]>("SELECT id FROM educacional_avaliacao WHERE tenant_id::text = $1 AND turma_id = $2 AND disciplina_id = $3 AND periodo = $4 AND tipo = $5 LIMIT 1", tenantId, turma.id, disciplinaId, `${av + 1}º bimestre`, av === 0 ? "Avaliação diagnóstica" : "Avaliação bimestral"))[0].id;
        const nota = Number((5.2 + ((i + av) % 10) * 0.47).toFixed(2));
        await tx.$executeRawUnsafe(
          `
          INSERT INTO educacional_nota (
            tenant_id, avaliacao_id, matricula_id, valor, conceito, observacao, criado_em, atualizado_em
          )
          SELECT $1::uuid, $2, $3, $4, $5, $6, NOW(), NOW()
          WHERE NOT EXISTS (
            SELECT 1 FROM educacional_nota WHERE tenant_id::text = $1 AND avaliacao_id = $2 AND matricula_id = $3
          )
          `,
          tenantId,
          avaliacaoId,
          matriculaId,
          nota,
          nota >= 7 ? "Satisfatório" : "Em acompanhamento",
          `${DEMO} - nota fictícia.`
        );
      }
    }

    const media = Number((5.8 + (i % 9) * 0.42).toFixed(2));
    const frequencia = i % 11 === 0 ? 78 : i % 13 === 0 ? 86 : 94;
    await tx.$executeRawUnsafe(
      `
      INSERT INTO educacional_boletim (
        tenant_id, matricula_id, ano_letivo_id, periodo, media, frequencia,
        resultado, observacoes, emitido_em, criado_em, atualizado_em
      )
      SELECT $1::uuid, $2, $3, '2º bimestre', $4, $5, $6, $7, NOW(), NOW(), NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM educacional_boletim WHERE tenant_id::text = $1 AND matricula_id = $2 AND periodo = '2º bimestre'
      )
      `,
      tenantId,
      matriculaId,
      anoRows[1],
      media,
      frequencia,
      media >= 7 && frequencia >= 75 ? "APROVADO_PARCIAL" : "EM_ACOMPANHAMENTO",
      `${DEMO} - boletim gerado com dados fictícios.`
    );
    await tx.$executeRawUnsafe(
      `
      INSERT INTO educacional_historico_escolar (
        tenant_id, aluno_id, ano_letivo_id, escola_descricao, etapa_descricao,
        serie_descricao, media, frequencia, resultado, observacoes, criado_em, atualizado_em
      )
      SELECT $1::uuid, $2, $3, 'Unidade Educacional Caminhos', $4, $5, $6, $7, $8, $9, NOW(), NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM educacional_historico_escolar WHERE tenant_id::text = $1 AND aluno_id = $2 AND ano_letivo_id = $3
      )
      `,
      tenantId,
      alunoId,
      anoRows[1],
      "Demonstração educacional",
      turma.serie,
      media,
      frequencia,
      i === 7 ? "TRANSFERIDO" : media >= 6 && frequencia >= 75 ? "APROVADO" : "EM_RECUPERACAO",
      `${DEMO} - histórico escolar fictício preservado.`
    );
    await tx.$executeRawUnsafe(
      `
      INSERT INTO educacional_documento (
        tenant_id, aluno_id, matricula_id, tipo, titulo, data_emissao,
        caminho_arquivo, mime_type, observacoes, status, criado_em, atualizado_em
      )
      SELECT $1::uuid, $2, $3, 'DECLARACAO_MATRICULA', $4, $5::date,
             $6, 'application/pdf', $7, 'EMITIDO', NOW(), NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM educacional_documento WHERE tenant_id::text = $1 AND matricula_id = $3 AND tipo = 'DECLARACAO_MATRICULA'
      )
      `,
      tenantId,
      alunoId,
      matriculaId,
      `Declaração de matrícula ${numeroMatricula}`,
      dateOnly(addDays(new Date("2026-02-10T00:00:00Z"), i % 30)),
      `/storage/educacional/documentos/${DEMO.toLowerCase()}-${numeroMatricula}.pdf`,
      `${DEMO} - metadado de documento acadêmico fictício.`
    );
  }
}

async function popularPrestacaoContas(tx: typeof prisma, tenantId: string, unidadesCriadas: Awaited<ReturnType<typeof garantirUnidades>>, usuarioId: bigint) {
  if (!(await tableExists(tx, "prestacao_contas_instrumento"))) return;

  const marcador = `${DEMO}_PRESTACAO`;
  const concedentesBase = [
    {
      razao: "Fundo Municipal de Desenvolvimento Social Ficticio",
      fantasia: "Fundo Social Demonstrativo",
      documento: "21544783000190",
      esfera: "MUNICIPAL",
      tipo: "Fundo publico",
      orgao: "Secretaria Municipal de Desenvolvimento Social",
      gestora: "Unidade gestora de parcerias sociais"
    },
    {
      razao: "Secretaria Estadual de Educacao Demonstrativa",
      fantasia: "SEE Demonstrativa",
      documento: "33709862000107",
      esfera: "ESTADUAL",
      tipo: "Orgao publico",
      orgao: "Secretaria Estadual de Educacao",
      gestora: "Diretoria de parcerias educacionais"
    },
    {
      razao: "Conselho Municipal dos Direitos Ficticios",
      fantasia: "Conselho Municipal Demonstrativo",
      documento: "60786194000142",
      esfera: "MUNICIPAL",
      tipo: "Conselho de direitos",
      orgao: "Conselho Municipal",
      gestora: "Comissao de monitoramento"
    }
  ];

  const concedentes: bigint[] = [];
  for (let i = 0; i < concedentesBase.length; i += 1) {
    const item = concedentesBase[i];
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM prestacao_contas_concedente WHERE tenant_id::text = $1 AND cpf_cnpj = $2 AND excluido_em IS NULL LIMIT 1",
      tenantId,
      item.documento
    );
    const id = existente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO prestacao_contas_concedente (
          tenant_id, razao_social, nome_fantasia, cpf_cnpj, esfera, tipo_entidade,
          endereco, municipio, estado, cep, telefone, email, site, responsavel,
          cargo, orgao, unidade_gestora, dados_bancarios, observacoes, situacao,
          ativo, criado_em, criado_por, atualizado_em, atualizado_por, versao
        )
        VALUES (
          $1::uuid, $2, $3, $4, $5, $6, $7, 'Uberlandia', 'MG', '38400000',
          $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16, 'ATIVO',
          TRUE, NOW(), $17, NOW(), $17, 1
        )
        RETURNING id
        `,
        tenantId,
        item.razao,
        item.fantasia,
        item.documento,
        item.esfera,
        item.tipo,
        `Avenida Demonstracao ${100 + i}, Centro`,
        `349${String(93000000 + i).slice(0, 8)}`,
        `prestacao.concedente${i + 1}@exemplo.com.br`,
        `https://prestacao-demo-${i + 1}.exemplo.com.br`,
        `Gestor Concedente Demo ${i + 1}`,
        ["Diretor de parcerias", "Coordenador de convenios", "Presidente do conselho"][i],
        item.orgao,
        item.gestora,
        JSON.stringify({
          banco: "001",
          agencia: `12${i + 3}4`,
          conta: `4500${i + 1}-9`,
          finalidade: "Conta demonstrativa de repasses publicos"
        }),
        `${marcador} - concedente ficticio para apresentacao de prestacao de contas.`,
        usuarioId.toString()
      )
    )[0].id;
    concedentes.push(id);
  }

  for (let i = 0; i < concedentes.length; i += 1) {
    const nome = `Modelo demonstrativo ${i + 1} - ${marcador}`;
    await tx.$executeRawUnsafe(
      `
      INSERT INTO prestacao_contas_modelo (
        tenant_id, concedente_id, nome, esfera, tipo_instrumento, legislacao_aplicavel,
        configuracao, instrucoes_especificas, situacao, ativo, criado_em, criado_por,
        atualizado_em, atualizado_por, versao
      )
      SELECT $1::uuid, $2, $3, $4, $5, $6, $7::jsonb, $8, 'ATIVO', TRUE, NOW(), $9, NOW(), $9, 1
      WHERE NOT EXISTS (
        SELECT 1 FROM prestacao_contas_modelo
        WHERE tenant_id::text = $1 AND nome = $3 AND excluido_em IS NULL
      )
      `,
      tenantId,
      concedentes[i],
      nome,
      concedentesBase[i].esfera,
      ["Termo de fomento", "Convenio", "Termo de colaboracao"][i],
      "Marco regulatorio das organizacoes da sociedade civil e normas demonstrativas do concedente.",
      JSON.stringify({
        secoes: ["Identificacao", "Metas", "Execucao financeira", "Documentos", "Auditoria final"],
        exigeConciliacao: true,
        exigePublicacao: true,
        anexosObrigatorios: ["Extrato bancario", "Notas fiscais", "Relatorio de execucao"]
      }),
      "Preencher todas as etapas, validar saldos e anexar comprovantes antes da aprovacao final.",
      usuarioId.toString()
    );
  }

  const projetos = await tx.$queryRawUnsafe<IdRow[]>(
    "SELECT id FROM projetos WHERE tenant_id::text = $1 AND nome LIKE 'Projeto %' ORDER BY id LIMIT 10",
    tenantId
  );
  const instrumentosInfo: Array<{ id: bigint; numero: string; valor: number; conta: string }> = [];
  const instrumentos = [
    {
      numero: "TF-DEMO-2025-001",
      tipo: "Termo de fomento",
      objeto: "Execucao de oficinas socioeducativas, acompanhamento familiar e atividades de convivencia comunitaria.",
      situacao: "EM_EXECUCAO",
      valor: 248500,
      repasse: 220000,
      inicio: "2025-02-01",
      fim: "2026-01-31"
    },
    {
      numero: "TC-DEMO-2025-014",
      tipo: "Termo de colaboracao",
      objeto: "Atendimento educacional complementar para criancas e adolescentes em contraturno escolar.",
      situacao: "PRESTACAO_PARCIAL",
      valor: 186300,
      repasse: 170000,
      inicio: "2025-08-01",
      fim: "2026-07-31"
    },
    {
      numero: "CV-DEMO-2026-003",
      tipo: "Convenio",
      objeto: "Fortalecimento da rede de protecao social com visitas, atendimentos e acoes de busca ativa.",
      situacao: "EM_ANALISE_FINAL",
      valor: 132750,
      repasse: 120000,
      inicio: "2026-01-10",
      fim: "2026-12-20"
    },
    {
      numero: "TF-DEMO-2026-009",
      tipo: "Termo de fomento",
      objeto: "Manutencao de biblioteca comunitaria, banco de empregos e atividades formativas para familias.",
      situacao: "APROVADA",
      valor: 96500,
      repasse: 85000,
      inicio: "2026-03-01",
      fim: "2026-11-30"
    }
  ];

  for (let i = 0; i < instrumentos.length; i += 1) {
    const item = instrumentos[i];
    const conta = `Banco 001 - Agencia 12${i + 3}4 - Conta 4500${i + 1}-9`;
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM prestacao_contas_instrumento WHERE tenant_id::text = $1 AND numero_instrumento = $2 AND excluido_em IS NULL LIMIT 1",
      tenantId,
      item.numero
    );
    const id = existente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO prestacao_contas_instrumento (
          tenant_id, concedente_id, transparencia_id, plano_trabalho_id, projeto_id, unidade_id,
          tipo_instrumento, numero_instrumento, numero_processo, numero_proposta, numero_programa,
          numero_edital, unidade_gestora, orgao_responsavel, gestor_parceria, fiscal_parceria,
          responsavel_organizacao, objeto, justificativa, publico_alvo, territorio, data_assinatura,
          inicio_vigencia, termino_vigencia, prazo_prestacao_parcial, prazo_prestacao_final,
          valor_global, valor_repasse, contrapartida_financeira, contrapartida_bens_servicos,
          recursos_proprios, quantidade_parcelas, conta_bancaria_exclusiva, legislacao_aplicavel,
          regulamento, fonte_recurso, situacao, observacoes, ativo, criado_em, criado_por,
          atualizado_em, atualizado_por, versao
        )
        VALUES (
          $1::uuid, $2, NULL, NULL, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18, $19, $20::date, $21::date, $22::date,
          90, 60, $23, $24, $25, $26, $27, 4, $28, $29, $30, $31, $32, $33,
          TRUE, NOW(), $34, NOW(), $34, 1
        )
        RETURNING id
        `,
        tenantId,
        concedentes[i % concedentes.length],
        projetos[i % Math.max(projetos.length, 1)]?.id ?? null,
        unidadesCriadas[i % unidadesCriadas.length].id,
        item.tipo,
        item.numero,
        `PROC-DEMO-${2025 + (i % 2)}-${String(i + 11).padStart(4, "0")}`,
        `PROP-DEMO-${String(i + 1).padStart(4, "0")}`,
        `PROG-DEMO-${String(i + 4).padStart(3, "0")}`,
        `EDITAL-DEMO-${String(i + 8).padStart(3, "0")}`,
        concedentesBase[i % concedentesBase.length].gestora,
        concedentesBase[i % concedentesBase.length].orgao,
        `Gestor da parceria demo ${i + 1}`,
        `Fiscal da parceria demo ${i + 1}`,
        "Administrador Demonstracao Torresoft",
        item.objeto,
        "Demonstrar uma prestacao de contas completa com identificacao, execucao fisica, financeira, documentos e auditoria.",
        ["Criancas, adolescentes e familias acompanhadas", "Alunos e responsaveis da unidade educacional", "Familias em acompanhamento territorial", "Jovens e adultos atendidos"][i],
        "Uberlandia/MG - territorios ficticios de demonstracao",
        item.inicio,
        item.inicio,
        item.fim,
        item.valor,
        item.repasse,
        Number((item.valor * 0.06).toFixed(2)),
        Number((item.valor * 0.04).toFixed(2)),
        Number((item.valor - item.repasse).toFixed(2)),
        conta,
        "Lei federal 13.019/2014 e normas internas ficticias do concedente.",
        "Regulamento demonstrativo de compras, pagamentos, documentos e transparencia.",
        ["Fundo municipal", "Recurso estadual", "Emenda parlamentar demonstrativa", "Recursos vinculados"][i],
        item.situacao,
        `${marcador} - instrumento preenchido do inicio da identificacao ate a auditoria final.`,
        usuarioId.toString()
      )
    )[0].id;
    instrumentosInfo.push({ id, numero: item.numero, valor: item.valor, conta });
  }

  for (let i = 0; i < instrumentosInfo.length; i += 1) {
    const instrumento = instrumentosInfo[i];
    const metas: bigint[] = [];
    for (let m = 0; m < 4; m += 1) {
      const codigo = `META-${i + 1}.${m + 1}`;
      const existente = await tx.$queryRawUnsafe<IdRow[]>(
        "SELECT id FROM prestacao_contas_meta WHERE tenant_id::text = $1 AND instrumento_id = $2 AND codigo = $3 AND excluido_em IS NULL LIMIT 1",
        tenantId,
        instrumento.id,
        codigo
      );
      const previsto = 80 + m * 25 + i * 10;
      const realizado = m === 3 && i % 2 === 0 ? previsto - 8 : previsto;
      const id = existente[0]?.id ?? (
        await tx.$queryRawUnsafe<IdRow[]>(
          `
          INSERT INTO prestacao_contas_meta (
            tenant_id, instrumento_id, codigo, descricao, indicador, unidade_medida,
            quantidade_prevista, quantidade_realizada, data_inicial, data_final,
            responsavel, publico_estimado, localidade, situacao, percentual_alcancado,
            justificativa, observacoes, ativo, criado_em, criado_por, atualizado_em,
            atualizado_por, versao
          )
          VALUES (
            $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9::date, $10::date,
            $11, $12, $13, $14, $15, $16, $17, TRUE, NOW(), $18, NOW(), $18, 1
          )
          RETURNING id
          `,
          tenantId,
          instrumento.id,
          codigo,
          [
            "Realizar oficinas e encontros com registro de frequencia.",
            "Executar atendimentos individuais e familiares acompanhados.",
            "Produzir relatorios tecnicos e documentos comprobatórios.",
            "Concluir a prestacao com conciliacao, publicacao e auditoria."
          ][m],
          ["Participantes atendidos", "Atendimentos registrados", "Documentos validados", "Prestacao finalizada"][m],
          ["participantes", "atendimentos", "documentos", "etapas"][m],
          previsto,
          realizado,
          instrumentos[i].inicio,
          instrumentos[i].fim,
          `Responsavel pela meta demo ${m + 1}`,
          previsto,
          "Unidades demonstrativas Torresoft",
          realizado >= previsto ? "CONCLUIDA" : "EM_ANDAMENTO",
          Number(((realizado / previsto) * 100).toFixed(2)),
          realizado >= previsto ? "Meta executada conforme planejamento demonstrativo." : "Saldo de atendimento em execucao no ciclo demonstrativo.",
          `${marcador} - meta preenchida com indicador, periodo, responsavel e resultado.`,
          usuarioId.toString()
        )
      )[0].id;
      metas.push(id);
    }

    const rubricas: bigint[] = [];
    for (let r = 0; r < 5; r += 1) {
      const codigo = `RUB-${i + 1}.${r + 1}`;
      const total = Number((instrumento.valor * [0.28, 0.18, 0.16, 0.22, 0.16][r]).toFixed(2));
      const existente = await tx.$queryRawUnsafe<IdRow[]>(
        "SELECT id FROM prestacao_contas_rubrica WHERE tenant_id::text = $1 AND instrumento_id = $2 AND codigo = $3 AND excluido_em IS NULL LIMIT 1",
        tenantId,
        instrumento.id,
        codigo
      );
      const id = existente[0]?.id ?? (
        await tx.$queryRawUnsafe<IdRow[]>(
          `
          INSERT INTO prestacao_contas_rubrica (
            tenant_id, instrumento_id, meta_id, codigo, grupo, categoria, descricao,
            unidade_medida, quantidade, valor_unitario, valor_total, fonte_recurso,
            etapa, atividade, periodo_previsto, valor_reservado, valor_comprometido,
            valor_pago, ativo, criado_em, criado_por, atualizado_em, atualizado_por, versao
          )
          VALUES (
            $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
            $13, $14, $15, $16, $17, $18, TRUE, NOW(), $19, NOW(), $19, 1
          )
          RETURNING id
          `,
          tenantId,
          instrumento.id,
          metas[r % metas.length],
          codigo,
          ["Pessoal", "Material de consumo", "Servicos de terceiros", "Equipamentos", "Administrativo"][r],
          ["Recursos humanos", "Consumo", "Servicos", "Bens permanentes", "Custos indiretos"][r],
          [
            "Equipe tecnica vinculada ao plano de trabalho.",
            "Materiais pedagogicos e sociais consumidos nas atividades.",
            "Servicos de apoio, manutencao e comunicacao.",
            "Equipamentos utilizados na execucao do objeto.",
            "Custos administrativos permitidos pelo instrumento."
          ][r],
          ["mes", "kit", "servico", "unidade", "mes"][r],
          [12, 40, 8, 6, 12][r],
          Number((total / [12, 40, 8, 6, 12][r]).toFixed(2)),
          total,
          ["Fundo municipal", "Recurso estadual", "Emenda parlamentar demonstrativa", "Recursos vinculados"][i],
          ["Planejamento", "Execucao", "Monitoramento", "Aquisicao", "Prestacao"][r],
          ["Gestao de equipe", "Atividades diretas", "Servicos de suporte", "Estrutura operacional", "Administracao"][r],
          "Vigencia integral",
          total,
          Number((total * 0.94).toFixed(2)),
          Number((total * 0.9).toFixed(2)),
          usuarioId.toString()
        )
      )[0].id;
      rubricas.push(id);
    }

    const receitas: bigint[] = [];
    for (let p = 0; p < 4; p += 1) {
      const parcela = `${p + 1}/4`;
      const valor = Number((instrumento.valor / 4).toFixed(2));
      const existente = await tx.$queryRawUnsafe<IdRow[]>(
        "SELECT id FROM prestacao_contas_receita WHERE tenant_id::text = $1 AND instrumento_id = $2 AND parcela = $3 AND excluido_em IS NULL LIMIT 1",
        tenantId,
        instrumento.id,
        parcela
      );
      const id = existente[0]?.id ?? (
        await tx.$queryRawUnsafe<IdRow[]>(
          `
          INSERT INTO prestacao_contas_receita (
            tenant_id, instrumento_id, parcela, competencia, data_prevista, data_recebida,
            valor_previsto, valor_recebido, conta_bancaria, documento, origem, tipo_receita,
            comprovante_arquivo_id, observacoes, situacao, ativo, criado_em, criado_por,
            atualizado_em, atualizado_por, versao
          )
          VALUES (
            $1::uuid, $2, $3, $4, $5::date, $6::date, $7, $8, $9, $10,
            $11, $12, NULL, $13, $14, TRUE, NOW(), $15, NOW(), $15, 1
          )
          RETURNING id
          `,
          tenantId,
          instrumento.id,
          parcela,
          `${2025 + (i % 2)}-${String(p + 1).padStart(2, "0")}`,
          dateOnly(addDays(new Date(instrumentos[i].inicio), p * 85)),
          dateOnly(addDays(new Date(instrumentos[i].inicio), p * 85 + 3)),
          valor,
          p === 3 && i === 2 ? Number((valor * 0.92).toFixed(2)) : valor,
          instrumento.conta,
          `REP-DEMO-${instrumento.numero}-${p + 1}`,
          concedentesBase[i % concedentesBase.length].razao,
          p === 3 && i === 2 ? "RENDIMENTO" : "REPASSE",
          `${marcador} - receita com comprovante demonstrativo registrado por metadados.`,
          p === 3 && i === 2 ? "PARCIAL" : "RECEBIDA",
          usuarioId.toString()
        )
      )[0].id;
      receitas.push(id);
    }

    const despesas: bigint[] = [];
    for (let d = 0; d < 12; d += 1) {
      const sequencial = `DESP-${i + 1}-${String(d + 1).padStart(3, "0")}`;
      const bruto = moeda(d + i * 12, 950);
      const retencoes = d % 4 === 0 ? Number((bruto * 0.045).toFixed(2)) : 0;
      const tributos = d % 5 === 0 ? Number((bruto * 0.025).toFixed(2)) : 0;
      const desconto = d % 7 === 0 ? 25 : 0;
      const liquido = Number((bruto - retencoes - tributos - desconto).toFixed(2));
      const existente = await tx.$queryRawUnsafe<IdRow[]>(
        "SELECT id FROM prestacao_contas_despesa WHERE tenant_id::text = $1 AND instrumento_id = $2 AND numero_sequencial = $3 AND excluido_em IS NULL LIMIT 1",
        tenantId,
        instrumento.id,
        sequencial
      );
      const id = existente[0]?.id ?? (
        await tx.$queryRawUnsafe<IdRow[]>(
          `
          INSERT INTO prestacao_contas_despesa (
            tenant_id, instrumento_id, projeto_id, meta_id, rubrica_id, numero_sequencial,
            competencia, data_emissao, data_pagamento, fornecedor, fornecedor_documento,
            tipo_documento, numero_documento, serie, chave_nfe, descricao, itens, fonte_recurso,
            forma_pagamento, conta_origem, banco, valor_bruto, desconto, retencoes, tributos,
            valor_liquido, centro_custo, favorecido, responsavel_lancamento, observacoes,
            situacao, inconsistencias, ativo, criado_em, criado_por, atualizado_em,
            atualizado_por, versao
          )
          VALUES (
            $1::uuid, $2, $3, $4, $5, $6, $7, $8::date, $9::date, $10, $11,
            $12, $13, $14, $15, $16, $17::jsonb, $18, $19, $20, $21, $22,
            $23, $24, $25, $26, $27, $28, $29, $30, $31, '[]'::jsonb,
            TRUE, NOW(), $32, NOW(), $32, 1
          )
          RETURNING id
          `,
          tenantId,
          instrumento.id,
          projetos[(i + d) % Math.max(projetos.length, 1)]?.id ?? null,
          metas[d % metas.length],
          rubricas[d % rubricas.length],
          sequencial,
          `${2025 + (i % 2)}-${String((d % 12) + 1).padStart(2, "0")}`,
          dateOnly(addDays(new Date(instrumentos[i].inicio), 12 + d * 18)),
          dateOnly(addDays(new Date(instrumentos[i].inicio), 18 + d * 18)),
          `Fornecedor Demonstrativo ${String(d + 1).padStart(2, "0")} Ltda`,
          `45566${String(100000000 + d + i * 20).slice(0, 9)}`,
          ["Nota fiscal", "Recibo", "Fatura"][d % 3],
          `NF-DEMO-${i + 1}-${String(d + 1).padStart(4, "0")}`,
          "1",
          `NFEDEMO${i + 1}${String(d + 1).padStart(6, "0")}000000000000000000000000000000000000`,
          ["Pagamento de equipe tecnica", "Compra de materiais", "Servico de manutencao", "Locacao de equipamento"][d % 4],
          JSON.stringify([
            {
              descricao: ["Horas tecnicas", "Kit de material", "Servico prestado", "Equipamento de apoio"][d % 4],
              quantidade: 1 + (d % 4),
              valorUnitario: Number((bruto / (1 + (d % 4))).toFixed(2)),
              valorTotal: bruto
            }
          ]),
          ["Fundo municipal", "Recurso estadual", "Emenda parlamentar demonstrativa", "Recursos vinculados"][i],
          ["Transferencia bancaria", "PIX", "Boleto"][d % 3],
          instrumento.conta,
          "Banco do Brasil",
          bruto,
          desconto,
          retencoes,
          tributos,
          liquido,
          ["Projeto", "Educacional", "Assistencia social", "Administrativo"][d % 4],
          `Fornecedor Demonstrativo ${String(d + 1).padStart(2, "0")} Ltda`,
          NOME_ADMIN,
          `${marcador} - despesa paga com documento fiscal, rubrica e meta vinculados.`,
          d % 10 === 0 ? "PENDENTE_VALIDACAO" : "PAGA",
          usuarioId.toString()
        )
      )[0].id;
      despesas.push(id);
    }

    for (let doc = 0; doc < 18; doc += 1) {
      const nomeOriginal = `${instrumento.numero.toLowerCase()}-documento-${String(doc + 1).padStart(2, "0")}.pdf`;
      await tx.$executeRawUnsafe(
        `
        INSERT INTO prestacao_contas_documento (
          tenant_id, instrumento_id, despesa_id, meta_id, categoria, tipo, descricao,
          competencia, arquivo_id, nome_original, hash_arquivo, validade, versao_documento,
          situacao, etiquetas, observacoes, ativo, criado_em, criado_por, atualizado_em,
          atualizado_por, versao
        )
        SELECT $1::uuid, $2, $3, $4, $5, $6, $7, $8, NULL, $9, $10, $11::date,
               1, $12, $13::jsonb, $14, TRUE, NOW(), $15, NOW(), $15, 1
        WHERE NOT EXISTS (
          SELECT 1 FROM prestacao_contas_documento
          WHERE tenant_id::text = $1 AND instrumento_id = $2 AND nome_original = $9 AND excluido_em IS NULL
        )
        `,
        tenantId,
        instrumento.id,
        doc < despesas.length ? despesas[doc] : null,
        metas[doc % metas.length],
        ["Identificacao", "Execucao financeira", "Execucao fisica", "Conciliacao", "Auditoria"][doc % 5],
        ["Plano aprovado", "Nota fiscal", "Relatorio tecnico", "Extrato bancario", "Parecer final"][doc % 5],
        "DOCUMENTO FICTICIO - AMBIENTE DE DEMONSTRACAO. Metadados utilizados para apresentacao comercial.",
        `${2025 + (i % 2)}-${String((doc % 12) + 1).padStart(2, "0")}`,
        nomeOriginal,
        `hash-demo-${instrumento.numero}-${doc + 1}`,
        dateOnly(addDays(new Date(instrumentos[i].fim), 180 + doc)),
        doc % 9 === 0 ? "PENDENTE_REVISAO" : "ATIVO",
        JSON.stringify([marcador, "documento_ficticio", doc % 2 === 0 ? "financeiro" : "tecnico"]),
        `${marcador} - documento de prestacao preenchido com categoria, tipo, validade e etiquetas.`,
        usuarioId.toString()
      );
    }

    for (let c = 0; c < 16; c += 1) {
      const valor = c < receitas.length ? Number((instrumento.valor / 4).toFixed(2)) : moeda(c + i * 8, 900);
      await tx.$executeRawUnsafe(
        `
        INSERT INTO prestacao_contas_conciliacao (
          tenant_id, instrumento_id, conta_bancaria, competencia, transacao_bancaria,
          despesa_id, receita_id, valor, data_movimento, descricao, situacao, sugestao,
          observacoes, ativo, criado_em, criado_por, atualizado_em, atualizado_por, versao
        )
        SELECT $1::uuid, $2, $3, $4, $5::jsonb, $6, $7, $8, $9::date, $10, $11,
               $12::jsonb, $13, TRUE, NOW(), $14, NOW(), $14, 1
        WHERE NOT EXISTS (
          SELECT 1 FROM prestacao_contas_conciliacao
          WHERE tenant_id::text = $1 AND instrumento_id = $2 AND descricao = $10 AND excluido_em IS NULL
        )
        `,
        tenantId,
        instrumento.id,
        instrumento.conta,
        `${2025 + (i % 2)}-${String((c % 12) + 1).padStart(2, "0")}`,
        JSON.stringify({
          nsu: `NSU-DEMO-${i + 1}-${String(c + 1).padStart(4, "0")}`,
          historico: c < receitas.length ? "Credito de repasse" : "Pagamento de despesa",
          origem: marcador
        }),
        c >= receitas.length ? despesas[(c - receitas.length) % despesas.length] : null,
        c < receitas.length ? receitas[c] : null,
        valor,
        dateOnly(addDays(new Date(instrumentos[i].inicio), 25 + c * 17)),
        `${marcador} conciliacao ${instrumento.numero} ${String(c + 1).padStart(2, "0")}`,
        c % 7 === 0 ? "PENDENTE_CONFERENCIA" : c % 2 === 0 ? "CONCILIADO_AUTOMATICAMENTE" : "CONCILIADO_MANUALMENTE",
        JSON.stringify({
          confianca: c % 7 === 0 ? 72 : 96,
          regra: c < receitas.length ? "valor e parcela correspondentes" : "valor, documento e fornecedor correspondentes"
        }),
        "Conferencia bancaria ficticia vinculada aos movimentos da prestacao.",
        usuarioId.toString()
      );
    }

    for (let d = 0; d < 3; d += 1) {
      const numero = `DIL-${instrumento.numero}-${d + 1}`;
      await tx.$executeRawUnsafe(
        `
        INSERT INTO prestacao_contas_diligencia (
          tenant_id, instrumento_id, numero, data_recebimento, prazo, descricao,
          itens_solicitados, responsavel, prioridade, resposta, protocolo, situacao,
          data_envio, parecer_recebido, ativo, criado_em, criado_por, atualizado_em,
          atualizado_por, versao
        )
        SELECT $1::uuid, $2, $3, $4::date, $5::date, $6, $7::jsonb, $8, $9, $10,
               $11, $12, $13::date, $14, TRUE, NOW(), $15, NOW(), $15, 1
        WHERE NOT EXISTS (
          SELECT 1 FROM prestacao_contas_diligencia
          WHERE tenant_id::text = $1 AND instrumento_id = $2 AND numero = $3 AND excluido_em IS NULL
        )
        `,
        tenantId,
        instrumento.id,
        numero,
        dateOnly(addDays(new Date(instrumentos[i].fim), 12 + d * 8)),
        dateOnly(addDays(new Date(instrumentos[i].fim), 27 + d * 8)),
        ["Solicitacao de comprovantes complementares.", "Conferencia de saldo bancario.", "Ajuste de relatorio fisico-financeiro."][d],
        JSON.stringify([
          { item: "Documento solicitado", detalhe: "Anexo demonstrativo vinculado ao instrumento" },
          { item: "Justificativa", detalhe: "Texto ficticio para demonstracao" }
        ]),
        `Responsavel pela diligencia demo ${d + 1}`,
        ["BAIXA", "MEDIA", "ALTA"][d],
        "Resposta demonstrativa registrada com documentos e esclarecimentos.",
        `PROTO-DEMO-${instrumento.numero}-${d + 1}`,
        d === 0 ? "ACEITA" : d === 1 ? "RESPONDIDA" : "EM_ANALISE",
        dateOnly(addDays(new Date(instrumentos[i].fim), 20 + d * 8)),
        d === 0 ? "Parecer aceito no ambiente demonstrativo." : "Parecer em acompanhamento demonstrativo.",
        usuarioId.toString()
      );
    }

    const etapas = ["Analise tecnica", "Analise financeira", "Controle interno", "Auditoria final"];
    for (let a = 0; a < etapas.length; a += 1) {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO prestacao_contas_aprovacao (
          tenant_id, instrumento_id, etapa, usuario_id, usuario_nome, cargo, decisao,
          parecer, pendencias, assinatura_hash, ip, observacoes, criado_em, criado_por,
          atualizado_em, atualizado_por, versao
        )
        SELECT $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12,
               NOW(), $4, NOW(), $4, 1
        WHERE NOT EXISTS (
          SELECT 1 FROM prestacao_contas_aprovacao
          WHERE tenant_id::text = $1 AND instrumento_id = $2 AND etapa = $3 AND excluido_em IS NULL
        )
        `,
        tenantId,
        instrumento.id,
        etapas[a],
        usuarioId.toString(),
        NOME_ADMIN,
        ["Analista tecnico", "Analista financeiro", "Controlador interno", "Auditor final"][a],
        a === 3 && i === 2 ? "APROVADO_RESSALVAS" : a === 2 && i === 1 ? "AGUARDANDO_AJUSTE" : "APROVADO",
        "Parecer ficticio preenchido para demonstrar o fluxo completo de aprovacao e auditoria.",
        JSON.stringify(a === 2 && i === 1 ? [{ pendencia: "Revisar uma conciliacao pendente", prazo: "5 dias" }] : []),
        `assinatura-demo-${instrumento.numero}-${a + 1}`,
        "127.0.0.1",
        `${marcador} - etapa de aprovacao preenchida.`,
      );
    }

    await tx.$executeRawUnsafe(
      `
      UPDATE prestacao_contas_aprovacao
      SET decisao = 'APROVADO_RESSALVAS',
          atualizado_em = NOW(),
          atualizado_por = $3
      WHERE tenant_id::text = $1
        AND instrumento_id = $2
        AND etapa = 'Auditoria final'
        AND decisao = 'APROVADO_COM_RESSALVAS'
      `,
      tenantId,
      instrumento.id,
      usuarioId.toString()
    );

    await tx.$executeRawUnsafe(
      `
      INSERT INTO prestacao_contas_transparencia_publica (
        tenant_id, instrumento_id, publicar_valor, publicar_metas, publicar_documentos,
        dados_publicos, situacao, atualizado_em, atualizado_por, criado_em, criado_por, versao
      )
      SELECT $1::uuid, $2, TRUE, TRUE, TRUE, $3::jsonb, $4, NOW(), $5, NOW(), $5, 1
      WHERE NOT EXISTS (
        SELECT 1 FROM prestacao_contas_transparencia_publica
        WHERE tenant_id::text = $1 AND instrumento_id = $2 AND excluido_em IS NULL
      )
      `,
      tenantId,
      instrumento.id,
      JSON.stringify({
        resumoPublico: "Prestacao de contas ficticia para demonstracao comercial do G3N.",
        instrumento: instrumento.numero,
        valorGlobal: instrumento.valor,
        statusPortal: "Publicado para demonstracao",
        dataPublicacao: dateOnly(new Date())
      }),
      i === 1 ? "RASCUNHO_VALIDACAO" : "PUBLICADO",
      usuarioId.toString()
    );

    await tx.$executeRawUnsafe(
      `
      INSERT INTO prestacao_contas_auditoria (
        tenant_id, instrumento_id, entidade, entidade_id, acao, campo, valor_anterior,
        valor_novo, justificativa, usuario_id, usuario_nome, ip, request_id, criado_em
      )
      SELECT $1::uuid, $2, 'instrumento', $3, 'AUDITORIA_FINAL_DEMO', 'situacao',
             'EM_ANALISE', $4, $5, $6, $7, '127.0.0.1', $8, NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM prestacao_contas_auditoria
        WHERE tenant_id::text = $1 AND instrumento_id = $2 AND request_id = $8
      )
      `,
      tenantId,
      instrumento.id,
      instrumento.id.toString(),
      instrumentos[i].situacao,
      `${marcador} - auditoria final ficticia registra conclusao do fluxo completo.`,
      usuarioId.toString(),
      NOME_ADMIN,
      `REQ-${marcador}-${instrumento.numero}`
    );
  }

  for (const tipo of ["IA", "OCR"]) {
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM prestacao_contas_configuracao_ia WHERE tenant_id::text = $1 AND tipo = $2 AND excluido_em IS NULL LIMIT 1",
      tenantId,
      tipo
    );
    if (existente[0]) {
      await tx.$executeRawUnsafe(
        `
        UPDATE prestacao_contas_configuracao_ia
        SET provedor = 'provedor demonstrativo',
            url_api = 'https://api-demo.exemplo.com.br/prestacao-contas',
            modelo = $3,
            ambiente = 'HOMOLOGACAO',
            limite_uso = 250,
            timeout_ms = 30000,
            ativo = FALSE,
            credencial_criptografada = NULL,
            credencial_mascarada = 'demo-sem-credencial',
            ultimo_teste_em = NOW(),
            ultimo_sucesso_em = NULL,
            ultimo_erro = 'Configuracao ficticia sem chamada externa.',
            observacoes = $4,
            atualizado_em = NOW(),
            atualizado_por = $5,
            versao = versao + 1
        WHERE id = $1
          AND tenant_id::text = $2
        `,
        existente[0].id,
        tenantId,
        tipo === "IA" ? "assistente-demo-prestacao" : "ocr-demo-documentos",
        `${marcador} - configuracao demonstrativa sem credenciais reais.`,
        usuarioId.toString()
      );
    } else {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO prestacao_contas_configuracao_ia (
          tenant_id, tipo, provedor, url_api, modelo, ambiente, limite_uso,
          timeout_ms, ativo, credencial_criptografada, credencial_mascarada,
          ultimo_teste_em, ultimo_sucesso_em, ultimo_erro, observacoes,
          criado_em, criado_por, atualizado_em, atualizado_por, versao
        )
        VALUES (
          $1::uuid, $2, 'provedor demonstrativo', 'https://api-demo.exemplo.com.br/prestacao-contas',
          $3, 'HOMOLOGACAO', 250, 30000, FALSE, NULL, 'demo-sem-credencial',
          NOW(), NULL, 'Configuracao ficticia sem chamada externa.', $4, NOW(), $5, NOW(), $5, 1
        )
        `,
        tenantId,
        tipo,
        tipo === "IA" ? "assistente-demo-prestacao" : "ocr-demo-documentos",
        `${marcador} - configuracao demonstrativa sem credenciais reais.`,
        usuarioId.toString()
      );
    }
  }
}

async function popularTermosPlanosTransparencia(tx: typeof prisma, tenantId: string, unidadesCriadas: Awaited<ReturnType<typeof garantirUnidades>>, usuarioId: bigint) {
  const marcador = `${DEMO}_PRESTACAO`;
  const unidadePrincipal = unidadesCriadas[0]?.id ?? null;
  for (const tabela of [
    "transparencia_recebimentos",
    "transparencia_destinacoes",
    "transparencia_comprovantes",
    "transparencia_timelines",
    "transparencia_checklist"
  ]) {
    await tx.$executeRawUnsafe(`ALTER TABLE IF EXISTS ${tabela} ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 0`);
  }
  const termosBase = [
    {
      numero: "TF-DEMO-2025-001",
      tipo: "Termo de fomento",
      referencia: "Termo de fomento - oficinas socioeducativas",
      indicacao: "Vereadora ficticia Helena Prado",
      orgao: "Fundo Municipal de Desenvolvimento Social Ficticio",
      inicio: "2025-02-01",
      fim: "2026-01-31",
      valor: 248500,
      status: "EM_EXECUCAO",
      objeto: "Execucao de oficinas socioeducativas, acompanhamento familiar e atividades de convivencia comunitaria."
    },
    {
      numero: "TC-DEMO-2025-014",
      tipo: "Termo de colaboracao",
      referencia: "Termo de colaboracao - contraturno escolar",
      indicacao: "Deputado ficticio Rafael Monteiro",
      orgao: "Secretaria Estadual de Educacao Demonstrativa",
      inicio: "2025-08-01",
      fim: "2026-07-31",
      valor: 186300,
      status: "EM_PRESTACAO",
      objeto: "Atendimento educacional complementar para criancas e adolescentes em contraturno escolar."
    },
    {
      numero: "CV-DEMO-2026-003",
      tipo: "Convenio",
      referencia: "Convenio - rede de protecao social",
      indicacao: "Conselho Municipal ficticio",
      orgao: "Conselho Municipal dos Direitos Ficticios",
      inicio: "2026-01-10",
      fim: "2026-12-20",
      valor: 132750,
      status: "EM_ANALISE",
      objeto: "Fortalecimento da rede de protecao social com visitas, atendimentos e acoes de busca ativa."
    },
    {
      numero: "TF-DEMO-2026-009",
      tipo: "Termo de fomento",
      referencia: "Termo de fomento - biblioteca, empregos e familias",
      indicacao: "Vereador ficticio Daniel Campos",
      orgao: "Fundo Municipal de Desenvolvimento Social Ficticio",
      inicio: "2026-03-01",
      fim: "2026-11-30",
      valor: 96500,
      status: "APROVADO",
      objeto: "Manutencao de biblioteca comunitaria, banco de empregos e atividades formativas para familias."
    }
  ];

  const termos: Array<{ id: bigint; numero: string; valor: number; inicio: string; fim: string; orgao: string; objeto: string; indicacao: string; tipo: string }> = [];
  if (await tableExists(tx, "termo_fomento")) {
    for (let i = 0; i < termosBase.length; i += 1) {
      const item = termosBase[i];
      const existente = await tx.$queryRawUnsafe<IdRow[]>(
        "SELECT id FROM termo_fomento WHERE tenant_id::text = $1 AND numero_termo = $2 LIMIT 1",
        tenantId,
        item.numero
      );
      const id = existente[0]?.id ?? (
        await tx.$queryRawUnsafe<IdRow[]>(
          `
          INSERT INTO termo_fomento (
            tenant_id, numero_termo, tipo_termo, referencia_termo, responsavel_indicacao,
            orgao_concedente, data_assinatura, data_inicio_vigencia, data_fim_vigencia,
            situacao, descricao_objeto, valor_global, responsavel_interno, criado_em, atualizado_em
          )
          VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::date, $8::date, $9::date,
                  $10, $11, $12, $13, NOW(), NOW())
          RETURNING id
          `,
          tenantId,
          item.numero,
          item.tipo,
          `${item.referencia} - ${marcador}`,
          item.indicacao,
          item.orgao,
          item.inicio,
          item.inicio,
          item.fim,
          item.status,
          `${item.objeto} ${marcador}.`,
          item.valor,
          NOME_ADMIN
        )
      )[0].id;
      await tx.$executeRawUnsafe(
        `
        UPDATE termo_fomento
        SET tipo_termo = $3,
            referencia_termo = $4,
            responsavel_indicacao = $5,
            orgao_concedente = $6,
            data_assinatura = $7::date,
            data_inicio_vigencia = $8::date,
            data_fim_vigencia = $9::date,
            situacao = $10,
            descricao_objeto = $11,
            valor_global = $12,
            responsavel_interno = $13,
            atualizado_em = NOW()
        WHERE id = $1
          AND tenant_id::text = $2
        `,
        id,
        tenantId,
        item.tipo,
        `${item.referencia} - ${marcador}`,
        item.indicacao,
        item.orgao,
        item.inicio,
        item.inicio,
        item.fim,
        item.status,
        `${item.objeto} ${marcador}.`,
        item.valor,
        NOME_ADMIN
      );
      await tx.$executeRawUnsafe("DELETE FROM termo_fomento_documentos WHERE tenant_id::text = $1 AND termo_fomento_id = $2", tenantId, id);
      await tx.$executeRawUnsafe("DELETE FROM termo_fomento_aditivos WHERE tenant_id::text = $1 AND termo_fomento_id = $2", tenantId, id);
      for (let a = 0; a < 2; a += 1) {
        const aditivoId = (await tx.$queryRawUnsafe<IdRow[]>(
          `
          INSERT INTO termo_fomento_aditivos (
            tenant_id, termo_fomento_id, tipo_aditivo, data_aditivo, nova_data_fim,
            novo_valor, observacoes, criado_em, atualizado_em
          )
          VALUES ($1::uuid, $2, $3, $4::date, $5::date, $6, $7, NOW(), NOW())
          RETURNING id
          `,
          tenantId,
          id,
          a === 0 ? "Prorrogacao de vigencia" : "Ajuste de plano de aplicacao",
          dateOnly(addDays(new Date(item.inicio), 120 + a * 90)),
          a === 0 ? dateOnly(addDays(new Date(item.fim), 30)) : null,
          a === 1 ? Number((item.valor * 1.04).toFixed(2)) : null,
          `${marcador} - aditivo ficticio preenchido para demonstracao.`
        ))[0].id;
        await tx.$executeRawUnsafe(
          `
          INSERT INTO termo_fomento_documentos (
            tenant_id, termo_fomento_id, aditivo_id, tipo_documento, nome, data_url, criado_em
          )
          VALUES ($1::uuid, $2, $3, 'aditivo', $4, $5, NOW())
          `,
          tenantId,
          id,
          aditivoId,
          `Aditivo ${a + 1} - ${item.numero}.pdf`,
          `/storage/instituicoes/documentos/${marcador.toLowerCase()}-${item.numero.toLowerCase()}-aditivo-${a + 1}.pdf`
        );
      }
      const docs = ["Termo assinado", "Plano de trabalho aprovado", "Publicacao oficial", "Parecer juridico"];
      for (let doc = 0; doc < docs.length; doc += 1) {
        await tx.$executeRawUnsafe(
          `
          INSERT INTO termo_fomento_documentos (
            tenant_id, termo_fomento_id, aditivo_id, tipo_documento, nome, data_url, criado_em
          )
          VALUES ($1::uuid, $2, NULL, $3, $4, $5, NOW())
          `,
          tenantId,
          id,
          doc === 0 ? "termo" : "outro",
          `${docs[doc]} - ${item.numero}.pdf`,
          `/storage/instituicoes/documentos/${marcador.toLowerCase()}-${item.numero.toLowerCase()}-${doc + 1}.pdf`
        );
      }
      termos.push({ id, numero: item.numero, valor: item.valor, inicio: item.inicio, fim: item.fim, orgao: item.orgao, objeto: item.objeto, indicacao: item.indicacao, tipo: item.tipo });
    }
  }

  const planos: Array<{ id: bigint; termo: typeof termos[number] }> = [];
  if ((await tableExists(tx, "plano_trabalho")) && termos.length) {
    for (let i = 0; i < termos.length; i += 1) {
      const termo = termos[i];
      const codigo = `PLN-DEMO-${String(i + 1).padStart(4, "0")}`;
      const existente = await tx.$queryRawUnsafe<IdRow[]>(
        "SELECT id FROM plano_trabalho WHERE tenant_id::text = $1 AND codigo_interno = $2 LIMIT 1",
        tenantId,
        codigo
      );
      const titulo = `Plano de trabalho demonstrativo ${i + 1} - ${termo.tipo}`;
      const id = existente[0]?.id ?? (
        await tx.$queryRawUnsafe<IdRow[]>(
          `
          INSERT INTO plano_trabalho (
            tenant_id, codigo_interno, titulo, descricao_geral, status, orgao_concedente,
            area_programa, data_elaboracao, data_aprovacao, vigencia_inicio, vigencia_fim,
            termo_fomento_id, numero_processo, modalidade, observacoes_vinculacao, arquivo_formato,
            tipo_parceria, orgao_parceiro, edital_chamamento, periodo_inicio, periodo_fim,
            responsavel_tecnico, responsavel_legal, razao_social, nome_fantasia, cnpj,
            cep, logradouro, numero, complemento, bairro, cidade, uf, telefone, email,
            representante_legal, representante_cpf, representante_cargo, banco_nome, banco_agencia,
            banco_conta, banco_operacao, banco_pix, banco_observacao, historico_osc,
            finalidade_institucional, experiencia_anterior, conselhos_certificacoes, publico_atendido_atual,
            capacidade_tecnica_operacional, descricao_objeto, area_atuacao, local_execucao,
            abrangencia_territorial, publico_alvo, quantidade_beneficiarios, criterios_selecao,
            problema_social, causas_consequencias, dados_indicadores, capacidade_execucao,
            impacto_esperado, objetivo_geral, forma_acompanhamento, indicadores_monitoramento,
            periodicidade_monitoramento, responsavel_coleta_dados, instrumentos_monitoramento,
            resultado_esperado_monitoramento, evidencias_obrigatorias, periodicidade_prestacao,
            data_limite_prestacao, documentos_exigidos, responsavel_prestacao, observacoes_prestacao,
            local_declaracao, data_declaracao, nome_representante_declaracao,
            cpf_representante_declaracao, cargo_representante_declaracao, declaracao_veracidade,
            aprovacao_interna, situacao_aprovacao, observacao_aprovador, criado_em, atualizado_em
          )
          VALUES (
            $1::uuid, $2, $3, $4, $5, $6, $7, $8::date, $9::date, $10::date, $11::date,
            $12, $13, $14, $15, 'PDF', $14, $6, $16, $10::date, $11::date, $17, $18,
            'TORRESOFT', 'Torresoft', $19, '38400000', 'Avenida Demonstracao', '100',
            'Sala demonstrativa', 'Centro', 'Uberlandia', 'MG', '34930000000',
            'torresoftbrasil@gmail.com', 'Administrador Demonstracao Torresoft', $20,
            'Administrador', 'Banco do Brasil', '1234', $21, '001', 'torresoftbrasil@gmail.com',
            $22, $23, $24, $25, $26, $27, $4, $7, $28, 'Uberlandia/MG',
            $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
            'Mensal', 'Coordenacao demonstrativa',
            'Lista de presenca|Relatorio tecnico|Notas fiscais|Extratos bancarios',
            $41, $42, 'Mensal', $43::date, $44, 'Administrador Demonstracao Torresoft',
            $45, 'Uberlandia', $46::date, 'Administrador Demonstracao Torresoft', $20,
            'Administrador', TRUE, 'APROVADO', $47, $48, NOW(), NOW()
          )
          RETURNING id
          `,
          tenantId,
          codigo,
          titulo,
          termo.objeto,
          ["APROVADO", "EM_EXECUCAO", "EM_ANALISE", "CONCLUIDO"][i % 4],
          termo.orgao,
          ["Assistencia social", "Educacao", "Protecao social", "Trabalho e renda"][i % 4],
          dateOnly(addDays(new Date(termo.inicio), -35)),
          dateOnly(addDays(new Date(termo.inicio), -10)),
          termo.inicio,
          termo.fim,
          termo.id,
          `PROC-PLANO-DEMO-${String(i + 1).padStart(4, "0")}`,
          termo.tipo,
          `${marcador} - plano vinculado ao termo ${termo.numero}.`,
          `EDITAL-DEMO-PT-${String(i + 1).padStart(3, "0")}`,
          `Responsavel tecnico demo ${i + 1}`,
          NOME_ADMIN,
          CNPJ_LIMPO,
          gerarCpfValido(1800 + i),
          `4500${i + 1}-9`,
          "Conta exclusiva demonstrativa para execucao e prestacao de contas.",
          "A organizacao demonstrativa atua em projetos sociais, educacionais e comunitarios com registros ficticios para apresentacao.",
          "Promover atendimento qualificado e transparente, com foco em protecao social, educacao e desenvolvimento comunitario.",
          "Experiencia demonstrativa em oficinas, atendimento familiar, visitas e atividades de convivencia.",
          "Registros e conselhos ficticios utilizados apenas para apresentacao comercial.",
          "Criancas, adolescentes, jovens, adultos e familias acompanhadas pela rede demonstrativa.",
          "Equipe multiprofissional ficticia, unidades de atendimento, controles financeiros e rotinas de monitoramento.",
          "Unidades demonstrativas Torresoft",
          "Publico priorizado por vulnerabilidade social, frequencia nas atividades e acompanhamento territorial.",
          80 + i * 20,
          "Cadastro ativo, avaliacao tecnica demonstrativa e disponibilidade de vagas.",
          "Necessidade ficticia de ampliar atividades preventivas, educacionais e comunitarias.",
          "Baixa oferta de atividades no territorio e necessidade de acompanhamento continuado.",
          "Indicadores ficticios de atendimento, frequencia, encaminhamentos e execucao financeira.",
          "A instituicao possui estrutura demonstrativa para cumprir metas, registrar evidencias e prestar contas.",
          "Ampliação de acesso, frequencia em atividades e melhora do acompanhamento familiar.",
          "Executar atividades previstas com controle de metas, recursos, documentos e resultados.",
          "Acompanhamento mensal com reunioes, relatorios, listas e indicadores.",
          "Participantes atendidos, frequencia, documentos validados, execucao financeira e saldo conciliado.",
          "Resultados mensais consolidados e evidencias organizadas para prestacao de contas.",
          "Listas de presenca, fotos autorizadas, relatorios tecnicos, notas fiscais, extratos e pareceres.",
          dateOnly(addDays(new Date(termo.fim), 45)),
          "Relatorio de execucao, notas fiscais, extratos, conciliacao bancaria, documentos de despesa e parecer tecnico.",
          `${marcador} - orientacoes ficticias para prestacao completa do plano.`,
          dateOnly(new Date()),
          "Plano demonstrativo declarado verdadeiro para fins comerciais.",
          ["Aprovado pela diretoria", "Em validacao tecnica", "Aprovado com ressalvas", "Concluido e arquivado"][i % 4],
          `${marcador} - observacao do aprovador ficticia.`
        )
      )[0].id;
      await tx.$executeRawUnsafe(
        "UPDATE plano_trabalho SET titulo = $3, descricao_geral = $4, status = $5, orgao_concedente = $6, orgao_parceiro = $6, termo_fomento_id = $7, atualizado_em = NOW() WHERE id = $1 AND tenant_id::text = $2",
        id,
        tenantId,
        titulo,
        termo.objeto,
        ["APROVADO", "EM_EXECUCAO", "EM_ANALISE", "CONCLUIDO"][i % 4],
        termo.orgao,
        termo.id
      );
      await tx.$executeRawUnsafe("DELETE FROM plano_trabalho_checklist_prestacao WHERE tenant_id::text = $1 AND plano_trabalho_id = $2", tenantId, id);
      await tx.$executeRawUnsafe("DELETE FROM plano_trabalho_desembolso WHERE tenant_id::text = $1 AND plano_trabalho_id = $2", tenantId, id);
      await tx.$executeRawUnsafe("DELETE FROM plano_trabalho_aplicacao_recursos WHERE tenant_id::text = $1 AND plano_trabalho_id = $2", tenantId, id);
      await tx.$executeRawUnsafe("DELETE FROM plano_trabalho_objetivos WHERE tenant_id::text = $1 AND plano_trabalho_id = $2", tenantId, id);
      await tx.$executeRawUnsafe("DELETE FROM plano_trabalho_atividades a USING plano_trabalho_metas m WHERE a.meta_id = m.id AND m.plano_trabalho_id = $2 AND a.tenant_id::text = $1", tenantId, id);
      await tx.$executeRawUnsafe("DELETE FROM plano_trabalho_metas WHERE tenant_id::text = $1 AND plano_trabalho_id = $2", tenantId, id);
      for (let obj = 0; obj < 3; obj += 1) {
        await tx.$executeRawUnsafe(
          "INSERT INTO plano_trabalho_objetivos (plano_trabalho_id, tenant_id, descricao, resultado_esperado, metas_vinculadas, ordem, criado_em) VALUES ($1, $2::uuid, $3, $4, $5, $6, NOW())",
          id,
          tenantId,
          ["Ampliar atendimento direto ao publico alvo.", "Fortalecer acompanhamento tecnico e familiar.", "Organizar evidencias e prestacao de contas."][obj],
          ["Mais participantes atendidos.", "Encaminhamentos acompanhados.", "Documentos completos para auditoria."][obj],
          `META-${obj + 1}`,
          obj
        );
      }
      const metasIds: bigint[] = [];
      for (let meta = 0; meta < 4; meta += 1) {
        const metaId = (await tx.$queryRawUnsafe<IdRow[]>(
          `
          INSERT INTO plano_trabalho_metas (
            plano_trabalho_id, tenant_id, codigo, numero_meta, descricao, indicador,
            indicador_resultado, unidade_medida, quantidade_prevista, resultado_esperado,
            meio_verificacao, data_inicio, data_fim, responsavel, situacao, ordem, criado_em
          )
          VALUES ($1, $2::uuid, $3, $3, $4, $5, $5, $6, $7, $8, $9, $10::date, $11::date, $12, $13, $14, NOW())
          RETURNING id
          `,
          id,
          tenantId,
          `META-${meta + 1}`,
          ["Realizar oficinas socioeducativas.", "Registrar atendimentos e visitas.", "Executar plano financeiro.", "Entregar prestacao de contas final."][meta],
          ["Participantes", "Atendimentos", "Percentual financeiro", "Documentos"][meta],
          ["pessoas", "registros", "%", "itens"][meta],
          50 + meta * 20,
          "Resultado esperado ficticio e mensuravel.",
          "Relatorios, listas, documentos fiscais e extratos.",
          termo.inicio,
          termo.fim,
          `Responsavel meta ${meta + 1}`,
          meta === 3 ? "EM_ANDAMENTO" : "CONCLUIDA",
          meta
        ))[0].id;
        metasIds.push(metaId);
        for (let etapa = 0; etapa < 2; etapa += 1) {
          await tx.$executeRawUnsafe(
            `
            INSERT INTO plano_trabalho_atividades (
              meta_id, tenant_id, descricao, justificativa, publico_alvo, local_execucao,
              produto_esperado, nome_etapa, acao_executar, descricao_detalhada,
              publico_atendido, quantidade, unidade, data_inicio, data_fim,
              valor_estimado, documento_comprobatorio, responsavel, situacao, ordem, criado_em
            )
            VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                    $14::date, $15::date, $16, $17, $18, $19, $20, NOW())
            `,
            metaId,
            tenantId,
            `Atividade demonstrativa ${meta + 1}.${etapa + 1}`,
            "Justificativa ficticia vinculada a meta do plano.",
            "Publico acompanhado pela Torresoft",
            "Unidade demonstrativa",
            "Produto esperado registrado no relatorio de execucao.",
            `Etapa ${etapa + 1}`,
            "Executar, registrar e comprovar a atividade planejada.",
            "Descricao detalhada ficticia com responsavel, periodo e evidencia esperada.",
            "Beneficiarios e familias demonstrativas",
            20 + etapa * 10,
            "atendimentos",
            dateOnly(addDays(new Date(termo.inicio), etapa * 45)),
            dateOnly(addDays(new Date(termo.inicio), 40 + etapa * 45)),
            moeda(meta * 3 + etapa, 1800),
            "Lista de presenca, relatorio e registro fotografico autorizado.",
            `Responsavel etapa ${etapa + 1}`,
            etapa === 0 ? "CONCLUIDA" : "EM_ANDAMENTO",
            etapa
          );
        }
      }
      for (let app = 0; app < 5; app += 1) {
        const total = Number((termo.valor * [0.32, 0.18, 0.16, 0.2, 0.14][app]).toFixed(2));
        await tx.$executeRawUnsafe(
          `
          INSERT INTO plano_trabalho_aplicacao_recursos (
            plano_trabalho_id, tenant_id, categoria_despesa, item, descricao,
            quantidade, unidade, valor_unitario, valor_total, fonte_recurso,
            meta_numero, etapa_nome, natureza_despesa, observacao, ordem, criado_em
          )
          VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
          `,
          id,
          tenantId,
          ["Recursos humanos", "Material de consumo", "Servicos", "Equipamentos", "Administrativo"][app],
          ["Equipe tecnica", "Material das atividades", "Servicos de apoio", "Equipamentos", "Custos indiretos"][app],
          "Aplicacao ficticia detalhada para demonstracao.",
          [12, 40, 6, 4, 12][app],
          ["mes", "kit", "servico", "unidade", "mes"][app],
          Number((total / [12, 40, 6, 4, 12][app]).toFixed(2)),
          total,
          termo.orgao,
          `META-${(app % 4) + 1}`,
          `Etapa ${(app % 2) + 1}`,
          ["Custeio", "Consumo", "Terceiros", "Capital", "Administrativo"][app],
          `${marcador} - aplicacao de recurso ficticia.`,
          app
        );
      }
      for (let mes = 0; mes < 6; mes += 1) {
        await tx.$executeRawUnsafe(
          "INSERT INTO plano_trabalho_desembolso (plano_trabalho_id, tenant_id, mes_ano, valor_previsto, fonte_recurso, meta_numero, observacao, ordem, criado_em) VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, NOW())",
          id,
          tenantId,
          `${new Date(termo.inicio).getFullYear()}-${String(mes + 1).padStart(2, "0")}`,
          Number((termo.valor / 6).toFixed(2)),
          termo.orgao,
          `META-${(mes % 4) + 1}`,
          `${marcador} - parcela demonstrativa de desembolso.`,
          mes
        );
      }
      for (let chk = 0; chk < 6; chk += 1) {
        await tx.$executeRawUnsafe(
          "INSERT INTO plano_trabalho_checklist_prestacao (plano_trabalho_id, tenant_id, descricao, obrigatorio, concluido, ordem, criado_em) VALUES ($1, $2::uuid, $3, TRUE, $4, $5, NOW())",
          id,
          tenantId,
          ["Relatorio de execucao", "Notas fiscais", "Extrato bancario", "Conciliacao", "Comprovantes de atividades", "Parecer final"][chk],
          chk < 5,
          chk
        );
      }
      planos.push({ id, termo });
    }
  }

  if (await tableExists(tx, "transparencia")) {
    for (let i = 0; i < termos.length; i += 1) {
      const termo = termos[i];
      const instrumentoRows = await tx.$queryRawUnsafe<IdRow[]>(
        "SELECT id FROM prestacao_contas_instrumento WHERE tenant_id::text = $1 AND numero_instrumento = $2 LIMIT 1",
        tenantId,
        termo.numero
      );
      const instrumentoProfissionalId = instrumentoRows[0]?.id ?? null;
      const aplicado = Number((termo.valor * [0.72, 0.58, 0.46, 0.91][i]).toFixed(2));
      const saldo = Number((termo.valor - aplicado).toFixed(2));
      const existente = await tx.$queryRawUnsafe<IdRow[]>(
        "SELECT id FROM transparencia WHERE tenant_id::text = $1 AND instrumento = $2 LIMIT 1",
        tenantId,
        termo.numero
      );
      const transparenciaId = existente[0]?.id ?? (
        await tx.$queryRawUnsafe<IdRow[]>(
          `
          INSERT INTO transparencia (
            tenant_id, unidade_id, prestacao_instrumento_id, percentual_preenchimento,
            proxima_prestacao_em, instrumento, objeto, periodo_inicio, periodo_fim,
            tipo_prestacao, status_workflow, total_recebido, total_recebido_helper,
            total_aplicado, total_aplicado_helper, saldo_disponivel, saldo_disponivel_helper,
            prestado_mes, prestado_mes_helper, parecer_conclusao, parecer_texto,
            parecer_ressalvas, parecer_recomendacoes, parecer_responsavel, parecer_data,
            criado_em, atualizado_em
          )
          VALUES (
            $1::uuid, $2, $3, 100, $4::date, $5, $6, $7::date, $8::date, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24::date,
            NOW(), NOW()
          )
          RETURNING id
          `,
          tenantId,
          unidadePrincipal,
          instrumentoProfissionalId,
          dateOnly(addDays(new Date(termo.fim), 30)),
          termo.numero,
          `${termo.objeto} ${marcador}.`,
          termo.inicio,
          termo.fim,
          i === 0 ? "FINAL" : i === 1 ? "PARCIAL" : "ANUAL",
          ["APROVADA", "EM_ANALISE", "EM_DILIGENCIA", "APROVADA_RESSALVAS"][i],
          termo.valor,
          "Total recebido conforme repasses ficticios vinculados ao termo.",
          aplicado,
          "Total aplicado conforme despesas demonstrativas detalhadas.",
          saldo,
          "Saldo conciliado na conta demonstrativa.",
          Number((aplicado / 6).toFixed(2)),
          "Valor prestado no mes de referencia ficticio.",
          i === 3 ? "APROVAR_RESSALVAS" : "APROVAR",
          "Parecer tecnico ficticio: documentos, despesas, metas e conciliacao conferidos para demonstracao.",
          i === 3 ? "Ressalva ficticia sobre conciliacao complementar." : null,
          "Manter arquivo digital organizado e atualizar evidencias quando houver nova parcela.",
          NOME_ADMIN,
          dateOnly(new Date())
        )
      )[0].id;
      await tx.$executeRawUnsafe(
        `
        UPDATE transparencia
        SET unidade_id = $3,
            prestacao_instrumento_id = $4,
            percentual_preenchimento = 100,
            proxima_prestacao_em = $5::date,
            objeto = $6,
            periodo_inicio = $7::date,
            periodo_fim = $8::date,
            total_recebido = $9,
            total_aplicado = $10,
            saldo_disponivel = $11,
            atualizado_em = NOW()
        WHERE id = $1
          AND tenant_id::text = $2
        `,
        transparenciaId,
        tenantId,
        unidadePrincipal,
        instrumentoProfissionalId,
        dateOnly(addDays(new Date(termo.fim), 30)),
        `${termo.objeto} ${marcador}.`,
        termo.inicio,
        termo.fim,
        termo.valor,
        aplicado,
        saldo
      );
      if (instrumentoProfissionalId) {
        await tx.$executeRawUnsafe(
          "UPDATE prestacao_contas_instrumento SET transparencia_id = $3, atualizado_em = NOW(), atualizado_por = $4 WHERE tenant_id::text = $1 AND id = $2",
          tenantId,
          instrumentoProfissionalId,
          transparenciaId,
          usuarioId.toString()
        );
      }
      await tx.$executeRawUnsafe("DELETE FROM transparencia_recebimentos WHERE tenant_id::text = $1 AND transparencia_id = $2", tenantId, transparenciaId);
      await tx.$executeRawUnsafe("DELETE FROM transparencia_destinacoes WHERE tenant_id::text = $1 AND transparencia_id = $2", tenantId, transparenciaId);
      await tx.$executeRawUnsafe("DELETE FROM transparencia_comprovantes WHERE tenant_id::text = $1 AND transparencia_id = $2", tenantId, transparenciaId);
      await tx.$executeRawUnsafe("DELETE FROM transparencia_timelines WHERE tenant_id::text = $1 AND transparencia_id = $2", tenantId, transparenciaId);
      await tx.$executeRawUnsafe("DELETE FROM transparencia_checklist WHERE tenant_id::text = $1 AND transparencia_id = $2", tenantId, transparenciaId);
      await tx.$executeRawUnsafe("DELETE FROM transparencia_despesas WHERE tenant_id::text = $1 AND transparencia_id = $2", tenantId, transparenciaId);
      await tx.$executeRawUnsafe("DELETE FROM transparencia_parecer_historico WHERE tenant_id::text = $1 AND transparencia_id = $2", tenantId, transparenciaId);
      for (let r = 0; r < 4; r += 1) {
        await tx.$executeRawUnsafe("INSERT INTO transparencia_recebimentos (tenant_id, transparencia_id, fonte, valor, periodicidade, status, ordem, criado_em) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, NOW())", tenantId, transparenciaId, ["Repasse principal", "Rendimento bancario", "Contrapartida", "Recursos proprios"][r], Number((termo.valor * [0.82, 0.02, 0.1, 0.06][r]).toFixed(2)), r === 0 ? "Parcelado" : "Eventual", r === 0 ? "Recebido" : "Conferido", r);
      }
      for (let d = 0; d < 5; d += 1) {
        await tx.$executeRawUnsafe("INSERT INTO transparencia_destinacoes (tenant_id, transparencia_id, titulo, descricao, percentual, ordem, criado_em) VALUES ($1::uuid, $2, $3, $4, $5, $6, NOW())", tenantId, transparenciaId, ["Equipe tecnica", "Materiais", "Servicos", "Equipamentos", "Administrativo"][d], "Destinacao ficticia demonstrativa vinculada ao objeto da parceria.", [32, 18, 16, 20, 14][d], d);
      }
      for (let c = 0; c < 6; c += 1) {
        await tx.$executeRawUnsafe("INSERT INTO transparencia_comprovantes (tenant_id, transparencia_id, titulo, descricao, arquivo_nome, arquivo_url, ordem, criado_em) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, NOW())", tenantId, transparenciaId, ["Extrato bancario", "Notas fiscais", "Relatorio de execucao", "Lista de presenca", "Conciliacao bancaria", "Parecer tecnico"][c], "DOCUMENTO FICTICIO - AMBIENTE DE DEMONSTRACAO.", `${termo.numero.toLowerCase()}-comprovante-${c + 1}.pdf`, `/storage/instituicoes/documentos/${marcador.toLowerCase()}-${termo.numero.toLowerCase()}-comprovante-${c + 1}.pdf`, c);
      }
      for (let tl = 0; tl < 5; tl += 1) {
        await tx.$executeRawUnsafe("INSERT INTO transparencia_timelines (tenant_id, transparencia_id, titulo, detalhe, status, ordem, criado_em) VALUES ($1::uuid, $2, $3, $4, $5, $6, NOW())", tenantId, transparenciaId, ["Instrumento assinado", "Primeira parcela recebida", "Execucao iniciada", "Documentos conferidos", "Auditoria final"][tl], "Evento ficticio da linha do tempo da prestacao.", ["concluido", "concluido", "concluido", "em_andamento", "concluido"][tl], tl);
      }
      for (let ck = 0; ck < 7; ck += 1) {
        await tx.$executeRawUnsafe("INSERT INTO transparencia_checklist (tenant_id, transparencia_id, titulo, descricao, status, ordem, criado_em) VALUES ($1::uuid, $2, $3, $4, $5, $6, NOW())", tenantId, transparenciaId, ["Identificacao", "Recebimentos", "Despesas", "Comprovantes", "Conciliacao", "Parecer", "Auditoria final"][ck], "Item ficticio preenchido para demonstracao do fluxo completo.", ck < 6 || i !== 1 ? "concluido" : "pendente", ck);
      }
      for (let desp = 0; desp < 8; desp += 1) {
        await tx.$executeRawUnsafe("INSERT INTO transparencia_despesas (tenant_id, transparencia_id, descricao, fornecedor, documento_fiscal, data_pagamento, categoria, valor, status, ordem) VALUES ($1::uuid, $2, $3, $4, $5, $6::date, $7, $8, $9, $10)", tenantId, transparenciaId, ["Equipe tecnica", "Material pedagogico", "Servico de apoio", "Equipamento", "Administrativo", "Transporte", "Comunicacao", "Manutencao"][desp], `Fornecedor demonstrativo ${desp + 1}`, `NF-TRANS-DEMO-${i + 1}-${desp + 1}`, dateOnly(addDays(new Date(termo.inicio), 20 + desp * 22)), ["Pessoal", "Consumo", "Servicos", "Capital"][desp % 4], Number((aplicado / 8).toFixed(2)), desp % 6 === 0 ? "Pendente validacao" : "Pago", desp);
      }
      await tx.$executeRawUnsafe("INSERT INTO transparencia_parecer_historico (tenant_id, transparencia_id, versao, conclusao, parecer_texto, ressalvas, recomendacoes, responsavel, data_parecer, usuario_id, usuario_nome, criado_em) VALUES ($1::uuid, $2, 1, $3, $4, $5, $6, $7, $8::date, $9, $10, NOW())", tenantId, transparenciaId, i === 3 ? "APROVAR_RESSALVAS" : "APROVAR", "Parecer historico ficticio preenchido para a prestacao de contas.", i === 3 ? "Ressalvas demonstrativas registradas." : null, "Recomendacao ficticia de manutencao do arquivo digital.", NOME_ADMIN, dateOnly(new Date()), usuarioId.toString(), NOME_ADMIN);
    }
  }
}

function inicioSemana(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

async function popularChecklistDiario(tx: typeof prisma, tenantId: string, unidadesCriadas: Awaited<ReturnType<typeof garantirUnidades>>, usuarioId: bigint) {
  if (await tableExists(tx, "checklist_configuracoes")) {
    await tx.$executeRawUnsafe("ALTER TABLE checklist_configuracoes ADD COLUMN IF NOT EXISTS tenant_id UUID");
  }
  if (await tableExists(tx, "checklist_modelos")) {
    await tx.$executeRawUnsafe("ALTER TABLE checklist_modelos ADD COLUMN IF NOT EXISTS tenant_id UUID");
  }
  if (await tableExists(tx, "checklist_modelo_itens")) {
    await tx.$executeRawUnsafe("ALTER TABLE checklist_modelo_itens ADD COLUMN IF NOT EXISTS tenant_id UUID");
  }
  if (await tableExists(tx, "checklist_execucoes")) {
    await tx.$executeRawUnsafe("ALTER TABLE checklist_execucoes ADD COLUMN IF NOT EXISTS tenant_id UUID");
  }
  if (await tableExists(tx, "checklist_execucao_historico")) {
    await tx.$executeRawUnsafe("ALTER TABLE checklist_execucao_historico ADD COLUMN IF NOT EXISTS tenant_id UUID");
  }

  await ensureChecklistDiarioEstrutura(tx);

  if (!(await tableExists(tx, "checklist_modelos"))) return;

  for (const tabela of [
    "checklist_configuracoes",
    "checklist_modelos",
    "checklist_modelo_itens",
    "checklist_execucoes",
    "checklist_execucao_historico"
  ]) {
    await tx.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('${tabela}', 'id'), COALESCE((SELECT MAX(id) FROM ${tabela}), 0) + 1, false)`
    );
  }

  const unidadePadrao =
    unidadesCriadas.find((unidade) => unidade.nome.includes("Horizonte"))?.id ??
    unidadesCriadas[0]?.id ??
    null;

  const usuarios = await tx.$queryRawUnsafe<Array<{ id: bigint; nome: string | null; email: string | null }>>(
    `
    SELECT id, nome, email
    FROM usuarios
    WHERE tenant_id::text = $1
    ORDER BY CASE WHEN id::text = $2 THEN 0 ELSE 1 END, id
    LIMIT 6
    `,
    tenantId,
    usuarioId.toString()
  );
  const usuariosChecklist = usuarios.length > 0 ? usuarios : [{ id: usuarioId, nome: NOME_ADMIN, email: LOGIN }];

  const configRows = await tx.$queryRawUnsafe<IdRow[]>(
    "SELECT id FROM checklist_configuracoes WHERE tenant_id::text = $1 ORDER BY id LIMIT 1",
    tenantId
  );
  if (configRows[0]?.id) {
    await tx.$executeRawUnsafe(
      "UPDATE checklist_configuracoes SET sabado_ativo = FALSE, domingo_ativo = FALSE, atualizado_em = NOW() WHERE id = $1 AND tenant_id::text = $2",
      configRows[0].id,
      tenantId
    );
  } else {
    await tx.$executeRawUnsafe(
      "INSERT INTO checklist_configuracoes (tenant_id, sabado_ativo, domingo_ativo, criado_em, atualizado_em) VALUES ($1::uuid, FALSE, FALSE, NOW(), NOW())",
      tenantId
    );
  }

  const modeloCodigo = `${DEMO}_CHECKLIST_DIARIO`;
  const modeloExistente = await tx.$queryRawUnsafe<IdRow[]>(
    "SELECT id FROM checklist_modelos WHERE codigo = $1 AND tenant_id::text = $2 LIMIT 1",
    modeloCodigo,
    tenantId
  );
  const modeloId = modeloExistente[0]?.id ?? (
    await tx.$queryRawUnsafe<IdRow[]>(
      `
      INSERT INTO checklist_modelos (
        tenant_id, codigo, nome, descricao, tipo, unidade_id, setor, cargo,
        ativo, criado_por_usuario_id, atualizado_por_usuario_id, criado_em, atualizado_em
      )
      VALUES (
        $1::uuid, $2, 'Checklist diário - demonstração Torresoft',
        'Modelo fictício para acompanhamento das rotinas administrativas, operacionais e de fechamento diário.',
        'INSTITUCIONAL', $3, 'Administração', 'Equipe administrativa',
        TRUE, $4, $4, NOW(), NOW()
      )
      RETURNING id
      `,
      tenantId,
      modeloCodigo,
      unidadePadrao,
      usuarioId
    )
  )[0].id;

  await tx.$executeRawUnsafe(
    `
    UPDATE checklist_modelos
    SET nome = 'Checklist diário - demonstração Torresoft',
        descricao = 'Modelo fictício para acompanhamento das rotinas administrativas, operacionais e de fechamento diário.',
        tipo = 'INSTITUCIONAL',
        unidade_id = $3,
        setor = 'Administração',
        cargo = 'Equipe administrativa',
        ativo = TRUE,
        atualizado_por_usuario_id = $4,
        atualizado_em = NOW()
    WHERE id = $1
      AND tenant_id::text = $2
    `,
    modeloId,
    tenantId,
    unidadePadrao,
    usuarioId
  );

  const atividades = [
    { dia: 1, titulo: "Conferir agenda institucional", descricao: "Verificar compromissos, reuniões e atendimentos previstos para o dia.", hora: "08:00", prioridade: "ALTA", alerta: "07:45", obrigatoria: false, critica: true },
    { dia: 1, titulo: "Validar pendências da semana anterior", descricao: "Revisar tarefas remanescentes e registrar encaminhamentos necessários.", hora: "09:00", prioridade: "ALTA", alerta: "08:40", obrigatoria: true, critica: true },
    { dia: 2, titulo: "Atualizar atendimentos e visitas", descricao: "Conferir se atendimentos, visitas e retornos foram lançados corretamente.", hora: "10:00", prioridade: "MEDIA", alerta: null, obrigatoria: false, critica: false },
    { dia: 2, titulo: "Checar documentos recebidos", descricao: "Validar documentos de beneficiários, doações, prestação de contas e cadastros internos.", hora: "14:00", prioridade: "ALTA", alerta: "13:40", obrigatoria: true, critica: true },
    { dia: 3, titulo: "Conferir movimentações financeiras", descricao: "Revisar receitas, despesas, doações e comprovantes pendentes de validação.", hora: "08:30", prioridade: "CRITICA", alerta: "08:10", obrigatoria: true, critica: true },
    { dia: 3, titulo: "Acompanhar processos de compra", descricao: "Verificar autorizações, cotações, aprovações e reservas vinculadas às compras.", hora: "11:00", prioridade: "MEDIA", alerta: null, obrigatoria: false, critica: false },
    { dia: 4, titulo: "Revisar indicadores operacionais", descricao: "Conferir painéis de atendimentos, educação, captação, doações e frequência.", hora: "09:30", prioridade: "MEDIA", alerta: null, obrigatoria: false, critica: false },
    { dia: 4, titulo: "Organizar documentos de prestação", descricao: "Separar comprovantes, conciliações e evidências para futuras prestações de contas.", hora: "15:00", prioridade: "ALTA", alerta: "14:30", obrigatoria: true, critica: true },
    { dia: 5, titulo: "Fechar checklist semanal", descricao: "Registrar conclusões, pendências transferidas e pontos de atenção para a próxima semana.", hora: "16:00", prioridade: "CRITICA", alerta: "15:40", obrigatoria: true, critica: true },
    { dia: 5, titulo: "Enviar resumo gerencial", descricao: "Preparar síntese fictícia de indicadores e pendências para acompanhamento da diretoria.", hora: "17:00", prioridade: "ALTA", alerta: "16:40", obrigatoria: true, critica: false }
  ];

  const itens: Array<{ id: bigint; atividade: (typeof atividades)[number] }> = [];
  for (let index = 0; index < atividades.length; index += 1) {
    const atividade = atividades[index];
    const itemExistente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM checklist_modelo_itens WHERE modelo_id = $1 AND dia_semana = $2 AND titulo = $3 LIMIT 1",
      modeloId,
      atividade.dia,
      atividade.titulo
    );
    const itemId = itemExistente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO checklist_modelo_itens (
          tenant_id, modelo_id, dia_semana, titulo, descricao_detalhada, horario_previsto,
          prioridade, alerta_ativo, horario_alerta, observacao_obrigatoria, atividade_critica,
          ordem, ativo, criado_em, atualizado_em
        )
        VALUES ($1::uuid, $2, $3, $4, $5, CAST($6 AS TIME), $7, $8, CAST($9 AS TIME), $10, $11, $12, TRUE, NOW(), NOW())
        RETURNING id
        `,
        tenantId,
        modeloId,
        atividade.dia,
        atividade.titulo,
        atividade.descricao,
        atividade.hora,
        atividade.prioridade,
        Boolean(atividade.alerta),
        atividade.alerta,
        atividade.obrigatoria,
        atividade.critica,
        index + 1
      )
    )[0].id;
    await tx.$executeRawUnsafe(
      `
      UPDATE checklist_modelo_itens
      SET tenant_id = $2::uuid,
          descricao_detalhada = $3,
          horario_previsto = CAST($4 AS TIME),
          prioridade = $5,
          alerta_ativo = $6,
          horario_alerta = CAST($7 AS TIME),
          observacao_obrigatoria = $8,
          atividade_critica = $9,
          ordem = $10,
          ativo = TRUE,
          atualizado_em = NOW()
      WHERE id = $1
      `,
      itemId,
      tenantId,
      atividade.descricao,
      atividade.hora,
      atividade.prioridade,
      Boolean(atividade.alerta),
      atividade.alerta,
      atividade.obrigatoria,
      atividade.critica,
      index + 1
    );
    itens.push({ id: itemId, atividade });
  }

  const semanaBase = inicioSemana(new Date());
  const semanas = [-2, -1, 0, 1];
  for (const deslocamento of semanas) {
    const semanaInicio = addDays(semanaBase, deslocamento * 7);
    for (let usuarioIndex = 0; usuarioIndex < usuariosChecklist.length; usuarioIndex += 1) {
      const usuario = usuariosChecklist[usuarioIndex];
      const unidadeId = unidadesCriadas[(usuarioIndex + deslocamento + unidadesCriadas.length) % Math.max(unidadesCriadas.length, 1)]?.id ?? unidadePadrao;
      for (const { id: itemId, atividade } of itens) {
        const referencia = addDays(semanaInicio, atividade.dia - 1);
        const chave = `${DEMO}-CHECKLIST-${usuario.id.toString()}-${dateOnly(referencia)}-${itemId.toString()}`;
        const futuro = referencia > new Date();
        const status =
          futuro ? "PENDENTE" :
          deslocamento < 0 && (atividade.prioridade === "CRITICA" || atividade.titulo.includes("Fechar")) ? "CONCLUIDO" :
          deslocamento === 0 && atividade.prioridade === "CRITICA" ? "ATRASADO" :
          (usuarioIndex + atividade.dia) % 9 === 0 ? "DISPENSADO" :
          (usuarioIndex + atividade.dia) % 7 === 0 ? "NAO_SE_APLICA" :
          deslocamento < 0 || (atividade.dia <= new Date().getDay() && !futuro) ? "CONCLUIDO" : "PENDENTE";
        const concluidoEm = status === "CONCLUIDO" ? `${dateOnly(referencia)} ${atividade.hora}:00` : null;
        const dispensadoEm = status === "DISPENSADO" || status === "NAO_SE_APLICA" ? `${dateOnly(referencia)} 15:30:00` : null;
        const observacao =
          status === "CONCLUIDO"
            ? "Atividade fictícia concluída e conferida para demonstração do checklist diário."
            : status === "ATRASADO"
              ? "Pendência fictícia mantida para demonstrar alerta de atraso e prioridade crítica."
              : status === "PENDENTE"
                ? "Atividade fictícia aguardando execução conforme rotina planejada."
                : "Atividade fictícia dispensada por não se aplicar ao dia demonstrativo.";

        const execucaoExistente = await tx.$queryRawUnsafe<IdRow[]>(
          "SELECT id FROM checklist_execucoes WHERE chave_geracao = $1 AND tenant_id::text = $2 LIMIT 1",
          chave,
          tenantId
        );
        const execucaoId = execucaoExistente[0]?.id ?? (
          await tx.$queryRawUnsafe<IdRow[]>(
            `
            INSERT INTO checklist_execucoes (
              tenant_id, modelo_id, modelo_item_id, usuario_id, unidade_id, setor, cargo,
              referencia_data, semana_inicio, dia_semana, titulo_atividade, descricao_detalhada,
              horario_previsto, prioridade, alerta_ativo, horario_alerta, observacao_obrigatoria,
              atividade_critica, status, observacao_usuario, concluido_em, concluido_por_usuario_id,
              dispensado_em, dispensado_por_usuario_id, motivo_dispensa, nao_aplicavel_motivo,
              ativo, gerado_automaticamente, origem, chave_geracao, criado_em, atualizado_em
            )
            VALUES (
              $1::uuid, $2, $3, $4, $5, 'Administração', 'Equipe administrativa',
              $6::date, $7::date, $8, $9, $10, CAST($11 AS TIME), $12, $13, CAST($14 AS TIME),
              $15, $16, $17, $18, $19::timestamp, $20, $21::timestamp, $22, $23, $24,
              TRUE, TRUE, $25, $26, NOW(), NOW()
            )
            RETURNING id
            `,
            tenantId,
            modeloId,
            itemId,
            usuario.id,
            unidadeId,
            dateOnly(referencia),
            dateOnly(semanaInicio),
            atividade.dia,
            atividade.titulo,
            atividade.descricao,
            atividade.hora,
            atividade.prioridade,
            Boolean(atividade.alerta),
            atividade.alerta,
            atividade.obrigatoria,
            atividade.critica,
            status,
            observacao,
            concluidoEm,
            status === "CONCLUIDO" ? usuario.id : null,
            dispensadoEm,
            status === "DISPENSADO" || status === "NAO_SE_APLICA" ? usuario.id : null,
            status === "DISPENSADO" ? "Dispensa fictícia registrada para demonstração." : null,
            status === "NAO_SE_APLICA" ? "Não se aplica ao dia demonstrativo." : null,
            DEMO,
            chave
          )
        )[0].id;

        await tx.$executeRawUnsafe(
          `
          UPDATE checklist_execucoes
          SET modelo_id = $3,
              modelo_item_id = $4,
              usuario_id = $5,
              unidade_id = $6,
              setor = 'Administração',
              cargo = 'Equipe administrativa',
              referencia_data = $7::date,
              semana_inicio = $8::date,
              dia_semana = $9,
              titulo_atividade = $10,
              descricao_detalhada = $11,
              horario_previsto = CAST($12 AS TIME),
              prioridade = $13,
              alerta_ativo = $14,
              horario_alerta = CAST($15 AS TIME),
              observacao_obrigatoria = $16,
              atividade_critica = $17,
              status = $18,
              observacao_usuario = $19,
              concluido_em = $20::timestamp,
              concluido_por_usuario_id = $21,
              dispensado_em = $22::timestamp,
              dispensado_por_usuario_id = $23,
              motivo_dispensa = $24,
              nao_aplicavel_motivo = $25,
              ativo = TRUE,
              gerado_automaticamente = TRUE,
              origem = $26,
              atualizado_em = NOW()
          WHERE id = $1
            AND tenant_id::text = $2
          `,
          execucaoId,
          tenantId,
          modeloId,
          itemId,
          usuario.id,
          unidadeId,
          dateOnly(referencia),
          dateOnly(semanaInicio),
          atividade.dia,
          atividade.titulo,
          atividade.descricao,
          atividade.hora,
          atividade.prioridade,
          Boolean(atividade.alerta),
          atividade.alerta,
          atividade.obrigatoria,
          atividade.critica,
          status,
          observacao,
          concluidoEm,
          status === "CONCLUIDO" ? usuario.id : null,
          dispensadoEm,
          status === "DISPENSADO" || status === "NAO_SE_APLICA" ? usuario.id : null,
          status === "DISPENSADO" ? "Dispensa fictícia registrada para demonstração." : null,
          status === "NAO_SE_APLICA" ? "Não se aplica ao dia demonstrativo." : null,
          DEMO
        );

        await tx.$executeRawUnsafe(
          "DELETE FROM checklist_execucao_historico WHERE tenant_id::text = $1 AND execucao_id = $2 AND origem = $3",
          tenantId,
          execucaoId,
          DEMO
        );
        await tx.$executeRawUnsafe(
          `
          INSERT INTO checklist_execucao_historico (
            tenant_id, referencia_tipo, execucao_id, modelo_id, modelo_item_id,
            acao, status_anterior, status_novo, usuario_responsavel_id,
            observacao, motivo, origem, dados_json, criado_em
          )
          VALUES ($1::uuid, 'EXECUCAO', $2, $3, $4, 'CARGA_DEMONSTRATIVA', NULL, $5, $6, $7, NULL, $8, $9::jsonb, NOW())
          `,
          tenantId,
          execucaoId,
          modeloId,
          itemId,
          status,
          usuarioId,
          observacao,
          DEMO,
          JSON.stringify({ demo: DEMO, referenciaData: dateOnly(referencia), chave })
        );
      }
    }
  }
}

async function popularDocumentosInstituicao(tx: typeof prisma, tenantId: string, usuarioId: bigint) {
  if (!(await tableExists(tx, "documentos_instituicao"))) return;

  await tx.$executeRawUnsafe("ALTER TABLE documentos_instituicao ADD COLUMN IF NOT EXISTS tenant_id UUID");
  if (await tableExists(tx, "documentos_instituicao_historico")) {
    await tx.$executeRawUnsafe("ALTER TABLE documentos_instituicao_historico ADD COLUMN IF NOT EXISTS tenant_id UUID");
  }
  if (await tableExists(tx, "documentos_instituicao_anexos")) {
    await tx.$executeRawUnsafe("ALTER TABLE documentos_instituicao_anexos ADD COLUMN IF NOT EXISTS tenant_id UUID");
    await tx.$executeRawUnsafe("ALTER TABLE documentos_instituicao_anexos ADD COLUMN IF NOT EXISTS tipo_mime VARCHAR(120)");
    await tx.$executeRawUnsafe("ALTER TABLE documentos_instituicao_anexos ADD COLUMN IF NOT EXISTS caminho_arquivo TEXT");
    await tx.$executeRawUnsafe("ALTER TABLE documentos_instituicao_anexos ADD COLUMN IF NOT EXISTS arquivo_id BIGINT");
  }

  for (const tabela of ["documentos_instituicao", "documentos_instituicao_historico", "documentos_instituicao_anexos"]) {
    if (await tableExists(tx, tabela)) {
      await tx.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('${tabela}', 'id'), COALESCE((SELECT MAX(id) FROM ${tabela}), 0) + 1, false)`
      );
    }
  }

  const hoje = new Date();
  const documentos = [
    {
      tipo: "Alvará de funcionamento municipal",
      orgao: "Prefeitura municipal fictícia",
      categoria: "Regularidade institucional",
      emissao: -420,
      validade: 260,
      responsavel: "Administração",
      renovacao: "Renovação anual junto à prefeitura",
      situacao: "valido",
      alerta: [90, 60, 30, 15],
      descricao: "Documento fictício que demonstra autorização municipal de funcionamento da instituição."
    },
    {
      tipo: "Auto de vistoria do Corpo de Bombeiros",
      orgao: "Corpo de Bombeiros fictício",
      categoria: "Segurança predial",
      emissao: -700,
      validade: 18,
      responsavel: "Coordenação administrativa",
      renovacao: "Providenciar vistoria preventiva antes do vencimento",
      situacao: "vence_em_breve",
      alerta: [60, 30, 15, 7],
      descricao: "Documento fictício para demonstrar controle de vencimento próximo."
    },
    {
      tipo: "Certidão negativa municipal",
      orgao: "Secretaria municipal de fazenda fictícia",
      categoria: "Regularidade fiscal",
      emissao: -210,
      validade: -15,
      responsavel: "Financeiro",
      renovacao: "Emitir nova certidão no portal municipal",
      situacao: "vencido",
      alerta: [30, 15, 7],
      descricao: "Documento fictício vencido para alimentar alertas da tela de visão geral."
    },
    {
      tipo: "Certificação CEBAS demonstrativa",
      orgao: "Órgão certificador fictício",
      categoria: "Certificações",
      emissao: -360,
      validade: null,
      responsavel: "Diretoria",
      renovacao: "Acompanhar revalidação conforme calendário administrativo",
      situacao: "sem_vencimento",
      alerta: [],
      semVencimento: true,
      descricao: "Certificação fictícia sem data de vencimento cadastrada para demonstração."
    },
    {
      tipo: "Licença sanitária",
      orgao: "Vigilância sanitária fictícia",
      categoria: "Saúde e segurança",
      emissao: -300,
      validade: 45,
      responsavel: "Nutrição e serviços gerais",
      renovacao: "Checklist de renovação em andamento com documentos complementares",
      situacao: "em_renovacao",
      emRenovacao: true,
      alerta: [90, 60, 30, 15],
      descricao: "Documento fictício em renovação para demonstrar acompanhamento administrativo."
    },
    {
      tipo: "Ata de eleição da diretoria",
      orgao: "Cartório de registro civil fictício",
      categoria: "Governança",
      emissao: -180,
      validade: 650,
      responsavel: "Secretaria executiva",
      renovacao: "Atualizar após nova assembleia estatutária",
      situacao: "valido",
      alerta: [120, 90, 30],
      descricao: "Ata fictícia vinculada à governança institucional."
    },
    {
      tipo: "Estatuto social consolidado",
      orgao: "Cartório de registro civil fictício",
      categoria: "Governança",
      emissao: -850,
      validade: null,
      responsavel: "Diretoria",
      renovacao: "Atualizar somente quando houver alteração estatutária",
      situacao: "sem_vencimento",
      semVencimento: true,
      alerta: [],
      descricao: "Documento estatutário fictício sem vencimento determinado."
    },
    {
      tipo: "Certificado de regularidade do FGTS",
      orgao: "Caixa Econômica Federal fictícia",
      categoria: "Regularidade trabalhista",
      emissao: -23,
      validade: 7,
      responsavel: "RH e financeiro",
      renovacao: "Emitir nova certidão antes de encaminhar prestações",
      situacao: "vence_em_breve",
      alerta: [15, 7, 3],
      descricao: "Certificado fictício com vencimento muito próximo."
    },
    {
      tipo: "Certidão negativa federal",
      orgao: "Receita federal fictícia",
      categoria: "Regularidade fiscal",
      emissao: -60,
      validade: 120,
      responsavel: "Financeiro",
      renovacao: "Emitir nova certidão no portal federal",
      situacao: "valido",
      alerta: [60, 30, 15],
      descricao: "Certidão fictícia válida para demonstração da documentação fiscal."
    },
    {
      tipo: "Plano de trabalho anual",
      orgao: "Diretoria Torresoft",
      categoria: "Planejamento",
      emissao: -35,
      validade: 300,
      responsavel: "Coordenação de projetos",
      renovacao: "Revisão anual junto ao planejamento institucional",
      situacao: "valido",
      alerta: [90, 45, 15],
      descricao: "Plano anual fictício utilizado em demonstrações comerciais."
    },
    {
      tipo: "Termo de colaboração demonstrativo",
      orgao: "Secretaria pública fictícia",
      categoria: "Parcerias públicas",
      emissao: -100,
      validade: 200,
      responsavel: "Prestação de contas",
      renovacao: "Acompanhar vigência e aditivos do instrumento",
      situacao: "valido",
      alerta: [90, 60, 30],
      descricao: "Termo fictício vinculado à rotina de documentos de parcerias."
    },
    {
      tipo: "Apólice de seguro patrimonial",
      orgao: "Seguradora demonstrativa",
      categoria: "Patrimônio",
      emissao: -345,
      validade: 20,
      responsavel: "Patrimônio",
      renovacao: "Solicitar cotação de renovação antes do vencimento",
      situacao: "vence_em_breve",
      alerta: [60, 30, 15, 7],
      descricao: "Apólice fictícia para controle de documentos com vencimento próximo."
    }
  ];

  for (let index = 0; index < documentos.length; index += 1) {
    const doc = documentos[index];
    const emissao = dateOnly(addDays(hoje, doc.emissao));
    const validade = typeof doc.validade === "number" ? dateOnly(addDays(hoje, doc.validade)) : null;
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM documentos_instituicao WHERE tenant_id::text = $1 AND tipo_documento = $2 AND descricao LIKE $3 LIMIT 1",
      tenantId,
      doc.tipo,
      `%${DEMO}%`
    );
    const documentoId = existente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO documentos_instituicao (
          tenant_id, tipo_documento, orgao_emissor, descricao, categoria, emissao,
          validade, responsavel_interno, modo_renovacao, observacao_renovacao,
          gerar_alerta, dias_antecedencia, forma_alerta, em_renovacao, sem_vencimento,
          vencimento_indeterminado, situacao, criado_em, atualizado_em
        )
        VALUES (
          $1::uuid, $2, $3, $4, $5, $6::date, $7::date, $8, $9, $10,
          TRUE, $11::jsonb, 'E-mail e painel do sistema', $12, $13, $14, $15,
          NOW(), NOW()
        )
        RETURNING id
        `,
        tenantId,
        doc.tipo,
        doc.orgao,
        `${doc.descricao} ${DEMO}.`,
        doc.categoria,
        emissao,
        validade,
        doc.responsavel,
        "Controle interno",
        `${doc.renovacao}. Documento fictício criado para demonstração comercial da Torresoft. ${DEMO}.`,
        JSON.stringify(doc.alerta),
        Boolean(doc.emRenovacao),
        Boolean(doc.semVencimento),
        Boolean(doc.semVencimento),
        doc.situacao
      )
    )[0].id;

    await tx.$executeRawUnsafe(
      `
      UPDATE documentos_instituicao
      SET orgao_emissor = $3,
          descricao = $4,
          categoria = $5,
          emissao = $6::date,
          validade = $7::date,
          responsavel_interno = $8,
          modo_renovacao = $9,
          observacao_renovacao = $10,
          gerar_alerta = TRUE,
          dias_antecedencia = $11::jsonb,
          forma_alerta = 'E-mail e painel do sistema',
          em_renovacao = $12,
          sem_vencimento = $13,
          vencimento_indeterminado = $14,
          situacao = $15,
          atualizado_em = NOW()
      WHERE id = $1
        AND tenant_id::text = $2
      `,
      documentoId,
      tenantId,
      doc.orgao,
      `${doc.descricao} ${DEMO}.`,
      doc.categoria,
      emissao,
      validade,
      doc.responsavel,
      "Controle interno",
      `${doc.renovacao}. Documento fictício criado para demonstração comercial da Torresoft. ${DEMO}.`,
      JSON.stringify(doc.alerta),
      Boolean(doc.emRenovacao),
      Boolean(doc.semVencimento),
      Boolean(doc.semVencimento),
      doc.situacao
    );

    if (await tableExists(tx, "documentos_instituicao_anexos")) {
      await tx.$executeRawUnsafe(
        "DELETE FROM documentos_instituicao_anexos WHERE tenant_id::text = $1 AND documento_id = $2 AND nome_arquivo LIKE $3",
        tenantId,
        documentoId,
        "DEMO_TORRESOFT-%"
      );
      const slug = doc.tipo
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      for (let anexo = 0; anexo < 2; anexo += 1) {
        await tx.$executeRawUnsafe(
          `
          INSERT INTO documentos_instituicao_anexos (
            tenant_id, documento_id, nome_arquivo, tipo, tipo_mime, tamanho,
            caminho_arquivo, data_upload, usuario, criado_em
          )
          VALUES ($1::uuid, $2, $3, $4, 'application/pdf', $5, $6, $7::date, $8, NOW())
          `,
          tenantId,
          documentoId,
          `DEMO_TORRESOFT-${slug}-${anexo + 1}.pdf`,
          anexo === 0 ? "documento_principal" : "comprovante",
          anexo === 0 ? "248 KB" : "96 KB",
          `/storage/tenants/${tenantId}/instituicoes/documentos/DEMO_TORRESOFT-${slug}-${anexo + 1}.pdf`,
          dateOnly(addDays(new Date(emissao), anexo + 1)),
          NOME_ADMIN
        );
      }
    }

    if (await tableExists(tx, "documentos_instituicao_historico")) {
      await tx.$executeRawUnsafe(
        "DELETE FROM documentos_instituicao_historico WHERE tenant_id::text = $1 AND documento_id = $2 AND observacao LIKE $3",
        tenantId,
        documentoId,
        `%${DEMO}%`
      );
      const historicos = [
        { tipo: "Cadastro", dias: 0, obs: "Documento fictício cadastrado para demonstração da tela." },
        { tipo: "Anexo", dias: 1, obs: "Anexos fictícios vinculados por caminho de storage, sem arquivo binário no banco." },
        { tipo: doc.situacao === "vencido" ? "Alerta de vencimento" : "Conferência", dias: 3, obs: "Situação conferida para alimentar listagem, filtros e indicadores." }
      ];
      for (const item of historicos) {
        await tx.$executeRawUnsafe(
          `
          INSERT INTO documentos_instituicao_historico (
            tenant_id, documento_id, data_hora, usuario, tipo_alteracao, observacao, criado_em
          )
          VALUES ($1::uuid, $2, $3::timestamp, $4, $5, $6, NOW())
          `,
          tenantId,
          documentoId,
          `${dateOnly(addDays(new Date(emissao), item.dias))} 09:00:00`,
          NOME_ADMIN,
          item.tipo,
          `${item.obs} ${DEMO}.`
        );
      }
    }
  }

  await tx.$executeRawUnsafe(
    "INSERT INTO documentos_instituicao_historico (tenant_id, documento_id, data_hora, usuario, tipo_alteracao, observacao, criado_em) SELECT $1::uuid, id, NOW(), $2, 'Validação', $3, NOW() FROM documentos_instituicao WHERE tenant_id::text = $1 AND descricao LIKE $4 AND NOT EXISTS (SELECT 1 FROM documentos_instituicao_historico h WHERE h.documento_id = documentos_instituicao.id AND h.tipo_alteracao = 'Validação' AND h.observacao LIKE $4)",
    tenantId,
    NOME_ADMIN,
    `Carga demonstrativa revisada e validada para a tenant Torresoft. ${DEMO}.`,
    `%${DEMO}%`
  );
}

async function popularEmprestimosEventos(tx: typeof prisma, tenantId: string, unidadesCriadas: Awaited<ReturnType<typeof garantirUnidades>>, usuarioId: bigint) {
  if (!(await tableExists(tx, "emprestimos_eventos")) || !(await tableExists(tx, "eventos_emprestimos"))) return;

  const comandosEstrutura = [
    "ALTER TABLE IF EXISTS emprestimos_eventos ADD COLUMN IF NOT EXISTS responsavel_nome VARCHAR(200)",
    "ALTER TABLE IF EXISTS emprestimos_eventos ADD COLUMN IF NOT EXISTS responsavel_cadastro_id BIGINT",
    "ALTER TABLE IF EXISTS emprestimos_eventos ADD COLUMN IF NOT EXISTS tenant_id UUID",
    "ALTER TABLE IF EXISTS eventos_emprestimos ADD COLUMN IF NOT EXISTS tenant_id UUID",
    "ALTER TABLE IF EXISTS eventos_emprestimos ADD COLUMN IF NOT EXISTS promovido_por VARCHAR(200)",
    "ALTER TABLE IF EXISTS emprestimos_eventos_itens ADD COLUMN IF NOT EXISTS tenant_id UUID",
    "ALTER TABLE IF EXISTS emprestimos_eventos_movimentacoes ADD COLUMN IF NOT EXISTS tenant_id UUID",
    `CREATE TABLE IF NOT EXISTS emprestimos_eventos_responsaveis (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      nome VARCHAR(200) NOT NULL,
      documento VARCHAR(40),
      telefone VARCHAR(40),
      email VARCHAR(160),
      observacoes TEXT,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )`
  ];
  for (const comando of comandosEstrutura) {
    await tx.$executeRawUnsafe(comando);
  }

  for (const tabela of [
    "eventos_emprestimos",
    "emprestimos_eventos_responsaveis",
    "emprestimos_eventos",
    "emprestimos_eventos_itens",
    "emprestimos_eventos_movimentacoes"
  ]) {
    if (await tableExists(tx, tabela)) {
      await tx.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('${tabela}', 'id'), COALESCE((SELECT MAX(id) FROM ${tabela}), 0) + 1, false)`
      );
    }
  }

  const patrimonios = await tx.$queryRawUnsafe<Array<{ id: bigint; nome: string; numero_patrimonio: string | null }>>(
    "SELECT id, nome, numero_patrimonio FROM patrimonio_item WHERE tenant_id::text = $1 ORDER BY id LIMIT 24",
    tenantId
  );
  const almoxarifado = await tx.$queryRawUnsafe<Array<{ id: bigint; descricao: string; codigo: string | null }>>(
    "SELECT id, descricao, codigo FROM almoxarifado_item WHERE tenant_id::text = $1 ORDER BY id LIMIT 6",
    tenantId
  );
  if (!patrimonios.length && !almoxarifado.length) return;

  const responsaveis = [
    { nome: "Aline Moura Demonstrativa", documento: gerarCpfValido(610), telefone: "11987010001", email: "aline.eventos@exemplo.com.br" },
    { nome: "Bruno Prado Demonstrativo", documento: gerarCpfValido(611), telefone: "11987010002", email: "bruno.eventos@exemplo.com.br" },
    { nome: "Carla Menezes Demonstrativa", documento: gerarCpfValido(612), telefone: "11987010003", email: "carla.eventos@exemplo.com.br" },
    { nome: "Diego Torres Demonstrativo", documento: gerarCpfValido(613), telefone: "11987010004", email: "diego.eventos@exemplo.com.br" },
    { nome: "Elisa Rocha Demonstrativa", documento: gerarCpfValido(614), telefone: "11987010005", email: "elisa.eventos@exemplo.com.br" },
    { nome: "Fernando Lima Demonstrativo", documento: gerarCpfValido(615), telefone: "11987010006", email: "fernando.eventos@exemplo.com.br" }
  ];
  const responsavelIds: bigint[] = [];
  for (const resp of responsaveis) {
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM emprestimos_eventos_responsaveis WHERE tenant_id::text = $1 AND email = $2 LIMIT 1",
      tenantId,
      resp.email
    );
    const id = existente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO emprestimos_eventos_responsaveis (
          tenant_id, nome, documento, telefone, email, observacoes, criado_em, atualizado_em
        )
        VALUES ($1::uuid, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id
        `,
        tenantId,
        resp.nome,
        resp.documento,
        resp.telefone,
        resp.email,
        `Responsável fictício para empréstimos de eventos. ${DEMO}.`
      )
    )[0].id;
    await tx.$executeRawUnsafe(
      "UPDATE emprestimos_eventos_responsaveis SET nome = $3, documento = $4, telefone = $5, observacoes = $6, atualizado_em = NOW() WHERE id = $1 AND tenant_id::text = $2",
      id,
      tenantId,
      resp.nome,
      resp.documento,
      resp.telefone,
      `Responsável fictício para empréstimos de eventos. ${DEMO}.`
    );
    responsavelIds.push(id);
  }

  const hoje = new Date();
  const eventos = [
    { titulo: "Feira comunitária demonstração", local: "Centro Comunitário Nova Esperança", inicio: -28, fim: -28, status: "REALIZADO", promovido: "Equipe de projetos" },
    { titulo: "Oficina de tecnologia para jovens", local: "Centro de Desenvolvimento Integração", inicio: -12, fim: -12, status: "REALIZADO", promovido: "Coordenação pedagógica" },
    { titulo: "Encontro das famílias", local: "Unidade Social Horizonte", inicio: -3, fim: -3, status: "REALIZADO", promovido: "Serviço social" },
    { titulo: "Semana da cidadania", local: "Unidade Educacional Caminhos", inicio: 4, fim: 6, status: "PLANEJADO", promovido: "Diretoria Torresoft" },
    { titulo: "Ação comunitária de inverno", local: "Núcleo de Atendimento Bem Viver", inicio: 11, fim: 11, status: "PLANEJADO", promovido: "Captação de recursos" },
    { titulo: "Formação de educadores", local: "Unidade Educacional Caminhos", inicio: 20, fim: 21, status: "PLANEJADO", promovido: "Coordenação educacional" },
    { titulo: "Mostra cultural demonstrativa", local: "Centro Comunitário Nova Esperança", inicio: 35, fim: 35, status: "PLANEJADO", promovido: "Equipe de eventos" },
    { titulo: "Mutirão de atendimento social", local: "Unidade Social Horizonte", inicio: -45, fim: -45, status: "CANCELADO", promovido: "Administração" }
  ];

  const eventoIds: bigint[] = [];
  for (const evento of eventos) {
    const inicio = `${dateOnly(addDays(hoje, evento.inicio))} 09:00:00`;
    const fim = `${dateOnly(addDays(hoje, evento.fim))} 18:00:00`;
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM eventos_emprestimos WHERE tenant_id::text = $1 AND titulo = $2 AND descricao LIKE $3 LIMIT 1",
      tenantId,
      evento.titulo,
      `%${DEMO}%`
    );
    const id = existente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO eventos_emprestimos (
          tenant_id, titulo, descricao, local, promovido_por, data_inicio, data_fim, status, criado_em, atualizado_em
        )
        VALUES ($1::uuid, $2, $3, $4, $5, $6::timestamp, $7::timestamp, $8, NOW(), NOW())
        RETURNING id
        `,
        tenantId,
        evento.titulo,
        `Evento fictício vinculado à tela de empréstimos para eventos. ${DEMO}.`,
        evento.local,
        evento.promovido,
        inicio,
        fim,
        evento.status
      )
    )[0].id;
    await tx.$executeRawUnsafe(
      `
      UPDATE eventos_emprestimos
      SET descricao = $3,
          local = $4,
          promovido_por = $5,
          data_inicio = $6::timestamp,
          data_fim = $7::timestamp,
          status = $8,
          atualizado_em = NOW()
      WHERE id = $1
        AND tenant_id::text = $2
      `,
      id,
      tenantId,
      `Evento fictício vinculado à tela de empréstimos para eventos. ${DEMO}.`,
      evento.local,
      evento.promovido,
      inicio,
      fim,
      evento.status
    );
    eventoIds.push(id);
  }

  const statusEmprestimos = ["DEVOLVIDO", "DEVOLVIDO", "RETIRADO", "AGENDADO", "AGENDADO", "RASCUNHO", "AGENDADO", "CANCELADO"];
  for (let i = 0; i < eventoIds.length; i += 1) {
    const evento = eventos[i];
    const retiradaPrevista = `${dateOnly(addDays(hoje, evento.inicio - 1))} 14:00:00`;
    const devolucaoPrevista = `${dateOnly(addDays(hoje, evento.fim + 1))} 10:00:00`;
    const status = statusEmprestimos[i] ?? "AGENDADO";
    const retiradaReal = ["RETIRADO", "DEVOLVIDO"].includes(status) ? `${dateOnly(addDays(hoje, evento.inicio - 1))} 14:20:00` : null;
    const devolucaoReal = status === "DEVOLVIDO" ? `${dateOnly(addDays(hoje, evento.fim + 1))} 09:45:00` : null;
    const unidadeId = unidadesCriadas[i % Math.max(unidadesCriadas.length, 1)]?.id ?? null;
    const responsavelId = responsavelIds[i % responsavelIds.length] ?? null;

    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM emprestimos_eventos WHERE tenant_id::text = $1 AND evento_id = $2 AND observacoes LIKE $3 LIMIT 1",
      tenantId,
      eventoIds[i],
      `%${DEMO}%`
    );
    const emprestimoId = existente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO emprestimos_eventos (
          tenant_id, evento_id, unidade_id, responsavel_cadastro_id, responsavel_nome,
          data_retirada_prevista, data_devolucao_prevista, data_retirada_real, data_devolucao_real,
          status, observacoes, criado_em, atualizado_em
        )
        VALUES ($1::uuid, $2, $3, $4, $5, $6::timestamp, $7::timestamp, $8::timestamp, $9::timestamp, $10, $11, NOW(), NOW())
        RETURNING id
        `,
        tenantId,
        eventoIds[i],
        unidadeId,
        responsavelId,
        responsaveis[i % responsaveis.length]?.nome,
        retiradaPrevista,
        devolucaoPrevista,
        retiradaReal,
        devolucaoReal,
        status,
        `Empréstimo fictício para demonstração com agenda, responsável, itens e movimentações. ${DEMO}.`
      )
    )[0].id;
    await tx.$executeRawUnsafe(
      `
      UPDATE emprestimos_eventos
      SET unidade_id = $3,
          responsavel_cadastro_id = $4,
          responsavel_nome = $5,
          data_retirada_prevista = $6::timestamp,
          data_devolucao_prevista = $7::timestamp,
          data_retirada_real = $8::timestamp,
          data_devolucao_real = $9::timestamp,
          status = $10,
          observacoes = $11,
          atualizado_em = NOW()
      WHERE id = $1
        AND tenant_id::text = $2
      `,
      emprestimoId,
      tenantId,
      unidadeId,
      responsavelId,
      responsaveis[i % responsaveis.length]?.nome,
      retiradaPrevista,
      devolucaoPrevista,
      retiradaReal,
      devolucaoReal,
      status,
      `Empréstimo fictício para demonstração com agenda, responsável, itens e movimentações. ${DEMO}.`
    );

    await tx.$executeRawUnsafe("DELETE FROM emprestimos_eventos_itens WHERE tenant_id::text = $1 AND emprestimo_id = $2", tenantId, emprestimoId);
    await tx.$executeRawUnsafe("DELETE FROM emprestimos_eventos_movimentacoes WHERE tenant_id::text = $1 AND emprestimo_id = $2 AND descricao LIKE $3", tenantId, emprestimoId, `%${DEMO}%`);

    const itemPatrimonio = patrimonios[i % patrimonios.length];
    const itemPatrimonioExtra = patrimonios[(i + 8) % patrimonios.length];
    const itemAlmox = almoxarifado[i % Math.max(almoxarifado.length, 1)];
    const itens = [
      itemPatrimonio ? { id: itemPatrimonio.id, tipo: "PATRIMONIO", quantidade: 1, statusItem: status === "DEVOLVIDO" ? "DEVOLVIDO" : status === "CANCELADO" ? "CANCELADO" : "RESERVADO", obs: `Patrimônio ${itemPatrimonio.numero_patrimonio ?? itemPatrimonio.id.toString()} reservado para o evento.` } : null,
      itemPatrimonioExtra ? { id: itemPatrimonioExtra.id, tipo: "PATRIMONIO", quantidade: 1, statusItem: status === "DEVOLVIDO" ? "DEVOLVIDO" : status === "RETIRADO" ? "RETIRADO" : "RESERVADO", obs: `Item complementar vinculado ao termo de empréstimo.` } : null,
      itemAlmox ? { id: itemAlmox.id, tipo: "ALMOXARIFADO", quantidade: 8 + (i % 4) * 3, statusItem: status === "CANCELADO" ? "CANCELADO" : "RESERVADO", obs: `Material de consumo/controlado para apoio ao evento.` } : null
    ].filter(Boolean) as Array<{ id: bigint; tipo: string; quantidade: number; statusItem: string; obs: string }>;

    for (const item of itens) {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO emprestimos_eventos_itens (
          tenant_id, emprestimo_id, item_id, tipo_item, quantidade, status_item, observacao_item, criado_em, atualizado_em
        )
        VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `,
        tenantId,
        emprestimoId,
        item.id,
        item.tipo,
        item.quantidade,
        item.statusItem,
        `${item.obs} ${DEMO}.`
      );
    }

    const movimentacoes = [
      { acao: "CRIACAO", data: `${dateOnly(addDays(hoje, evento.inicio - 10))} 09:00:00`, desc: "Empréstimo demonstrativo criado com itens iniciais." },
      { acao: "CONFIRMACAO_RESERVA", data: `${dateOnly(addDays(hoje, evento.inicio - 7))} 10:30:00`, desc: status === "RASCUNHO" ? "Reserva ainda em rascunho para demonstração." : "Reserva fictícia conferida pela equipe administrativa." },
      { acao: "RETIRADA", data: retiradaReal, desc: "Retirada fictícia registrada pelo responsável." },
      { acao: "DEVOLUCAO", data: devolucaoReal, desc: "Devolução fictícia concluída com conferência dos itens." },
      { acao: "CANCELAMENTO", data: status === "CANCELADO" ? `${dateOnly(addDays(hoje, evento.inicio - 4))} 16:00:00` : null, desc: "Empréstimo fictício cancelado por alteração de agenda." }
    ].filter((mov) => mov.data);

    for (const mov of movimentacoes) {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO emprestimos_eventos_movimentacoes (
          tenant_id, emprestimo_id, acao, descricao, usuario_id, criado_em
        )
        VALUES ($1::uuid, $2, $3, $4, $5, $6::timestamp)
        `,
        tenantId,
        emprestimoId,
        mov.acao,
        `${mov.desc} ${DEMO}.`,
        usuarioId,
        mov.data
      );
    }
  }
}

async function popularFotosEventos(tx: typeof prisma, tenantId: string, unidadesCriadas: Awaited<ReturnType<typeof garantirUnidades>>, usuarioId: bigint) {
  if (!(await tableExists(tx, "fotos_eventos"))) return;

  const comandosEstrutura = [
    "ALTER TABLE IF EXISTS fotos_eventos ADD COLUMN IF NOT EXISTS tenant_id UUID",
    "ALTER TABLE IF EXISTS fotos_eventos ADD COLUMN IF NOT EXISTS foto_principal_id BIGINT",
    "ALTER TABLE IF EXISTS fotos_eventos ADD COLUMN IF NOT EXISTS criado_por BIGINT",
    "ALTER TABLE IF EXISTS fotos_eventos_itens ADD COLUMN IF NOT EXISTS tenant_id UUID",
    "ALTER TABLE IF EXISTS fotos_eventos_itens ADD COLUMN IF NOT EXISTS nome_arquivo VARCHAR(255)",
    "ALTER TABLE IF EXISTS fotos_eventos_itens ADD COLUMN IF NOT EXISTS mime_type VARCHAR(120)",
    "ALTER TABLE IF EXISTS fotos_eventos_itens ADD COLUMN IF NOT EXISTS tamanho_bytes BIGINT",
    "ALTER TABLE IF EXISTS fotos_eventos_itens ADD COLUMN IF NOT EXISTS largura INTEGER",
    "ALTER TABLE IF EXISTS fotos_eventos_itens ADD COLUMN IF NOT EXISTS altura INTEGER",
    "ALTER TABLE IF EXISTS fotos_eventos_itens ADD COLUMN IF NOT EXISTS creditos VARCHAR(200)",
    "ALTER TABLE IF EXISTS fotos_eventos_itens ADD COLUMN IF NOT EXISTS tags TEXT",
    "ALTER TABLE IF EXISTS fotos_eventos_itens ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()",
    "ALTER TABLE IF EXISTS fotos_eventos_tags ADD COLUMN IF NOT EXISTS tenant_id UUID"
  ];
  for (const comando of comandosEstrutura) {
    await tx.$executeRawUnsafe(comando);
  }

  for (const tabela of ["fotos_eventos", "fotos_eventos_itens", "fotos_eventos_tags"]) {
    if (await tableExists(tx, tabela)) {
      await tx.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('${tabela}', 'id'), COALESCE((SELECT MAX(id) FROM ${tabela}), 0) + 1, false)`
      );
    }
  }

  const hoje = new Date();
  const albuns = [
    {
      titulo: "Feira comunitária demonstração",
      data: -28,
      local: "Centro Comunitário Nova Esperança",
      status: "PUBLICADO",
      tags: ["comunidade", "feira", "cidadania"],
      fotos: ["Abertura da feira com recepção das famílias", "Estande de orientação social", "Atividade cultural com participantes", "Equipe registrando encerramento"]
    },
    {
      titulo: "Oficina de tecnologia para jovens",
      data: -12,
      local: "Centro de Desenvolvimento Integração",
      status: "PUBLICADO",
      tags: ["tecnologia", "jovens", "oficina"],
      fotos: ["Jovens em atividade de inclusão digital", "Monitor orientando grupo demonstrativo", "Entrega fictícia de certificados"]
    },
    {
      titulo: "Encontro das famílias",
      data: -3,
      local: "Unidade Social Horizonte",
      status: "EM_REVISAO",
      tags: ["famílias", "convivência", "assistência"],
      fotos: ["Roda de conversa com responsáveis", "Atividade coletiva demonstrativa", "Registro da equipe de acolhimento"]
    },
    {
      titulo: "Semana da cidadania",
      data: 4,
      local: "Unidade Educacional Caminhos",
      status: "PLANEJADO",
      tags: ["educação", "cidadania", "parceria"],
      fotos: ["Arte de divulgação do evento", "Preparação dos kits de apoio", "Organização do espaço de atendimento"]
    },
    {
      titulo: "Ação comunitária de inverno",
      data: 11,
      local: "Núcleo de Atendimento Bem Viver",
      status: "PLANEJADO",
      tags: ["doações", "inverno", "voluntariado"],
      fotos: ["Separação de itens demonstrativos", "Equipe conferindo logística", "Materiais organizados para entrega"]
    },
    {
      titulo: "Formação de educadores",
      data: 20,
      local: "Unidade Educacional Caminhos",
      status: "RASCUNHO",
      tags: ["formação", "educadores", "pedagógico"],
      fotos: ["Sala preparada para formação", "Material pedagógico organizado"]
    },
    {
      titulo: "Mostra cultural demonstrativa",
      data: 35,
      local: "Centro Comunitário Nova Esperança",
      status: "PLANEJADO",
      tags: ["cultura", "arte", "evento"],
      fotos: ["Painel visual da mostra cultural", "Ensaios e preparação das oficinas", "Espaço reservado para exposição"]
    }
  ];

  for (let i = 0; i < albuns.length; i += 1) {
    const album = albuns[i];
    const unidadeId = unidadesCriadas[i % Math.max(unidadesCriadas.length, 1)]?.id ?? null;
    const dataEvento = dateOnly(addDays(hoje, album.data));
    const tagsTexto = album.tags.join(",");
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM fotos_eventos WHERE tenant_id::text = $1 AND titulo = $2 AND descricao LIKE $3 LIMIT 1",
      tenantId,
      album.titulo,
      `%${DEMO}%`
    );
    const eventoId = existente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO fotos_eventos (
          tenant_id, unidade_id, titulo, descricao, data_evento, local, tags,
          status, criado_por, criado_em, atualizado_em
        )
        VALUES ($1::uuid, $2, $3, $4, $5::date, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id
        `,
        tenantId,
        unidadeId,
        album.titulo,
        `Álbum fictício para demonstração da tela de fotos de eventos. ${DEMO}.`,
        dataEvento,
        album.local,
        tagsTexto,
        album.status,
        usuarioId
      )
    )[0].id;

    await tx.$executeRawUnsafe(
      `
      UPDATE fotos_eventos
      SET unidade_id = $3,
          descricao = $4,
          data_evento = $5::date,
          local = $6,
          tags = $7,
          status = $8,
          criado_por = $9,
          atualizado_em = NOW()
      WHERE id = $1
        AND tenant_id::text = $2
      `,
      eventoId,
      tenantId,
      unidadeId,
      `Álbum fictício para demonstração da tela de fotos de eventos. ${DEMO}.`,
      dataEvento,
      album.local,
      tagsTexto,
      album.status,
      usuarioId
    );

    await tx.$executeRawUnsafe("DELETE FROM fotos_eventos_itens WHERE tenant_id::text = $1 AND evento_id = $2", tenantId, eventoId);
    await tx.$executeRawUnsafe("DELETE FROM fotos_eventos_tags WHERE tenant_id::text = $1 AND evento_id = $2", tenantId, eventoId);

    for (const tag of album.tags) {
      await tx.$executeRawUnsafe(
        "INSERT INTO fotos_eventos_tags (tenant_id, evento_id, tag) VALUES ($1::uuid, $2, $3)",
        tenantId,
        eventoId,
        tag
      );
    }

    const fotoIds: bigint[] = [];
    const slug = album.titulo
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    for (let fotoIndex = 0; fotoIndex < album.fotos.length; fotoIndex += 1) {
      const nomeArquivo = `DEMO_TORRESOFT-${slug}-${fotoIndex + 1}.jpg`;
      const caminho = `/storage/imagens/eventos/${tenantId}/DEMO_TORRESOFT/${nomeArquivo}`;
      const inserted = await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO fotos_eventos_itens (
          tenant_id, evento_id, arquivo, nome_arquivo, mime_type, tamanho_bytes,
          largura, altura, legenda, creditos, tags, ordem, criado_em, atualizado_em
        )
        VALUES ($1::uuid, $2, $3, $4, 'image/jpeg', $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING id
        `,
        tenantId,
        eventoId,
        caminho,
        nomeArquivo,
        420000 + fotoIndex * 38500 + i * 12000,
        fotoIndex % 2 === 0 ? 1600 : 1280,
        fotoIndex % 2 === 0 ? 1067 : 853,
        `${album.fotos[fotoIndex]}. Imagem fictícia para demonstração comercial.`,
        "Equipe Torresoft demonstração",
        album.tags.join(","),
        fotoIndex + 1
      );
      if (inserted[0]?.id) fotoIds.push(inserted[0].id);
    }

    const capaId = fotoIds[0] ?? null;
    if (capaId) {
      await tx.$executeRawUnsafe(
        "UPDATE fotos_eventos SET foto_principal_id = $3, atualizado_em = NOW() WHERE id = $1 AND tenant_id::text = $2",
        eventoId,
        tenantId,
        capaId
      );
    }
  }
}

async function popularLembretesDiarios(tx: typeof prisma, tenantId: string, usuarioId: bigint) {
  if (!(await tableExists(tx, "lembretes_diarios"))) return;

  await tx.$executeRawUnsafe("ALTER TABLE lembretes_diarios ADD COLUMN IF NOT EXISTS tenant_id UUID");
  await tx.$executeRawUnsafe(
    "SELECT setval(pg_get_serial_sequence('lembretes_diarios', 'id'), COALESCE((SELECT MAX(id) FROM lembretes_diarios), 0) + 1, false)"
  );

  const usuarios = await tx.$queryRawUnsafe<Array<{ id: bigint; nome: string | null; email: string | null }>>(
    `
    SELECT id, nome, email
    FROM usuarios
    WHERE tenant_id::text = $1
    ORDER BY CASE WHEN id::text = $2 THEN 0 ELSE 1 END, id
    LIMIT 8
    `,
    tenantId,
    usuarioId.toString()
  );
  const usuariosDemo = usuarios.length > 0 ? usuarios : [{ id: usuarioId, nome: NOME_ADMIN, email: LOGIN }];

  const hoje = new Date();
  const lembretes = [
    {
      titulo: "Conferir documentos vencidos",
      descricao: "Verificar documentos institucionais vencidos ou próximos do vencimento antes do fechamento administrativo.",
      dias: -2,
      hora: "08:00",
      status: "PENDENTE",
      todos: true
    },
    {
      titulo: "Revisar agenda de atendimentos",
      descricao: "Validar horários do dia, faltas, visitas e reagendamentos cadastrados na agenda institucional.",
      dias: 0,
      hora: "08:30",
      status: "PENDENTE",
      usuarioIndex: 0
    },
    {
      titulo: "Atualizar retorno de doações recebidas",
      descricao: "Registrar conferência de doações recebidas e separar pendências de comprovantes.",
      dias: 0,
      hora: "10:00",
      status: "PENDENTE",
      usuarioIndex: 1
    },
    {
      titulo: "Enviar resumo da captação",
      descricao: "Preparar resumo diário das campanhas, recorrências e doadores para acompanhamento da diretoria.",
      dias: 1,
      hora: "09:15",
      status: "PENDENTE",
      usuarioIndex: 2
    },
    {
      titulo: "Checar empréstimos para eventos",
      descricao: "Conferir reservas de patrimônio e almoxarifado vinculadas aos próximos eventos.",
      dias: 2,
      hora: "14:00",
      status: "PENDENTE",
      usuarioIndex: 3
    },
    {
      titulo: "Revisar prestação de contas em análise",
      descricao: "Atualizar pendências, documentos e conciliações dos instrumentos demonstrativos.",
      dias: -1,
      hora: "11:00",
      status: "PENDENTE",
      usuarioIndex: 4
    },
    {
      titulo: "Conferir checklist diário",
      descricao: "Validar atividades críticas do checklist antes do encerramento do expediente.",
      dias: 0,
      hora: "16:00",
      status: "PENDENTE",
      todos: true
    },
    {
      titulo: "Fechar registro de ponto",
      descricao: "Analisar ocorrências, horas extras e batidas incompletas do dia anterior.",
      dias: -3,
      hora: "09:00",
      status: "CONCLUIDO",
      usuarioIndex: 5,
      concluidoOffsetHoras: 2
    },
    {
      titulo: "Separar fotos dos eventos recentes",
      descricao: "Revisar álbuns, capas e legendas para publicação no mural de eventos.",
      dias: 3,
      hora: "15:30",
      status: "PENDENTE",
      usuarioIndex: 6
    },
    {
      titulo: "Atualizar relatório de banco de empregos",
      descricao: "Conferir vagas, candidatos encaminhados e processos com retorno pendente.",
      dias: 5,
      hora: "10:45",
      status: "PENDENTE",
      usuarioIndex: 7
    },
    {
      titulo: "Adiar contato com parceiro fictício",
      descricao: "Lembrete adiado para demonstrar controle de nova execução no painel.",
      dias: -1,
      hora: "13:00",
      status: "PENDENTE",
      usuarioIndex: 0,
      adiadoDias: 4,
      adiadoHora: "13:30"
    },
    {
      titulo: "Publicar conferência semanal",
      descricao: "Lembrete já concluído para demonstrar histórico de tarefas finalizadas.",
      dias: -6,
      hora: "17:00",
      status: "CONCLUIDO",
      todos: true,
      concluidoOffsetHoras: 1
    }
  ];

  for (let index = 0; index < lembretes.length; index += 1) {
    const item = lembretes[index];
    const usuario = item.todos ? null : usuariosDemo[(item.usuarioIndex ?? index) % usuariosDemo.length]?.id ?? usuarioId;
    const dataInicial = dateOnly(addDays(hoje, item.dias));
    const proximaBase = item.adiadoDias !== undefined
      ? `${dateOnly(addDays(hoje, item.adiadoDias))} ${item.adiadoHora ?? item.hora}:00`
      : `${dataInicial} ${item.hora}:00`;
    const concluidoEm = item.status === "CONCLUIDO"
      ? `${dataInicial} ${String(Number(item.hora.slice(0, 2)) + (item.concluidoOffsetHoras ?? 1)).padStart(2, "0")}${item.hora.slice(2)}:00`
      : null;
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM lembretes_diarios WHERE tenant_id::text = $1 AND titulo = $2 AND descricao LIKE $3 LIMIT 1",
      tenantId,
      item.titulo,
      `%${DEMO}%`
    );
    const id = existente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO lembretes_diarios (
          tenant_id, titulo, descricao, data_inicial, recorrencia, hora_aviso,
          status, proxima_execucao_em, adiado_ate, concluido_em, deletado_em,
          usuario_id, todos_usuarios, criado_em, atualizado_em
        )
        VALUES ($1::uuid, $2, $3, $4::date, 'DIARIO', CAST($5 AS TIME), $6, $7::timestamp, $8::timestamp, $9::timestamp, NULL, $10, $11, NOW(), NOW())
        RETURNING id
        `,
        tenantId,
        item.titulo,
        `${item.descricao} ${DEMO}.`,
        dataInicial,
        item.hora,
        item.status,
        proximaBase,
        item.adiadoDias !== undefined ? proximaBase : null,
        concluidoEm,
        usuario,
        Boolean(item.todos)
      )
    )[0].id;

    await tx.$executeRawUnsafe(
      `
      UPDATE lembretes_diarios
      SET descricao = $3,
          data_inicial = $4::date,
          recorrencia = 'DIARIO',
          hora_aviso = CAST($5 AS TIME),
          status = $6,
          proxima_execucao_em = $7::timestamp,
          adiado_ate = $8::timestamp,
          concluido_em = $9::timestamp,
          deletado_em = NULL,
          usuario_id = $10,
          todos_usuarios = $11,
          atualizado_em = NOW()
      WHERE id = $1
        AND tenant_id::text = $2
      `,
      id,
      tenantId,
      `${item.descricao} ${DEMO}.`,
      dataInicial,
      item.hora,
      item.status,
      proximaBase,
      item.adiadoDias !== undefined ? proximaBase : null,
      concluidoEm,
      usuario,
      Boolean(item.todos)
    );
  }
}

async function popularOficiosProtocolos(tx: typeof prisma, tenantId: string, unidadesCriadas: Awaited<ReturnType<typeof garantirUnidades>>, usuarioId: bigint) {
  if (!(await tableExists(tx, "oficios"))) return;

  const comandosEstrutura = [
    "ALTER TABLE oficios ADD COLUMN IF NOT EXISTS tenant_id UUID",
    "ALTER TABLE IF EXISTS oficios_tramites ADD COLUMN IF NOT EXISTS tenant_id UUID",
    "ALTER TABLE IF EXISTS oficios_imagens ADD COLUMN IF NOT EXISTS tenant_id UUID",
    "ALTER TABLE oficios ADD COLUMN IF NOT EXISTS pdf_assinado_nome VARCHAR(255)",
    "ALTER TABLE oficios ADD COLUMN IF NOT EXISTS pdf_assinado_tipo VARCHAR(100)",
    "ALTER TABLE oficios ADD COLUMN IF NOT EXISTS pdf_assinado_conteudo TEXT",
    "ALTER TABLE oficios ADD COLUMN IF NOT EXISTS criado_por BIGINT",
    "ALTER TABLE oficios ADD COLUMN IF NOT EXISTS unidade_id BIGINT",
    "ALTER TABLE oficios ADD COLUMN IF NOT EXISTS para VARCHAR(200)",
    "ALTER TABLE oficios ADD COLUMN IF NOT EXISTS cargo_para VARCHAR(200)"
  ];
  for (const comando of comandosEstrutura) {
    await tx.$executeRawUnsafe(comando);
  }

  for (const tabela of ["oficios", "oficios_tramites", "oficios_imagens"]) {
    if (await tableExists(tx, tabela)) {
      await tx.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('${tabela}', 'id'), COALESCE((SELECT MAX(id) FROM ${tabela}), 0) + 1, false)`
      );
    }
  }

  const hoje = new Date();
  const oficios = [
    {
      tipo: "emissao",
      numero: `DEMO-OF-0001/${hoje.getFullYear()}`,
      dias: -45,
      setor: "Diretoria",
      responsavel: "Administrador Demonstração Torresoft",
      destinatario: "Secretaria Municipal de Assistência Social fictícia",
      para: "Coordenação de parcerias",
      cargoPara: "Coordenadoria demonstrativa",
      meio: "E-mail institucional",
      prazo: "10 dias úteis",
      classificacao: "Parceria pública",
      assunto: "Encaminhamento de relatório demonstrativo de atividades",
      status: "Recebido",
      protocoloEnvio: "ENV-DEMO-2026-001",
      dataEnvioOffset: -44,
      protocoloRecebimento: "REC-DEMO-2026-001",
      dataRecebimentoOffset: -42,
      proximoDestino: "Arquivo administrativo",
      anexarPdf: true
    },
    {
      tipo: "recebimento",
      numero: `DEMO-REC-0002/${hoje.getFullYear()}`,
      dias: -36,
      setor: "Prestação de contas",
      responsavel: "Equipe de prestação de contas",
      destinatario: "Prefeitura municipal fictícia",
      para: "Torresoft",
      cargoPara: "Administração",
      meio: "Portal de protocolos",
      prazo: "5 dias úteis",
      classificacao: "Diligência",
      assunto: "Solicitação fictícia de documentos complementares",
      status: "Em analise",
      protocoloRecebimento: "REC-DEMO-2026-002",
      dataRecebimentoOffset: -35,
      proximoDestino: "Setor financeiro",
      anexarPdf: true
    },
    {
      tipo: "emissao",
      numero: `DEMO-OF-0003/${hoje.getFullYear()}`,
      dias: -28,
      setor: "Coordenação educacional",
      responsavel: "Coordenação pedagógica demonstrativa",
      destinatario: "Unidade escolar parceira fictícia",
      para: "Direção escolar",
      cargoPara: "Diretoria",
      meio: "Entrega presencial",
      prazo: "Sem prazo",
      classificacao: "Educacional",
      assunto: "Solicitação de cessão de espaço para atividade pedagógica",
      status: "Enviado",
      protocoloEnvio: "ENV-DEMO-2026-003",
      dataEnvioOffset: -27,
      proximoDestino: "Aguardando resposta externa",
      anexarImagem: true
    },
    {
      tipo: "emissao",
      numero: `DEMO-OF-0004/${hoje.getFullYear()}`,
      dias: -18,
      setor: "Captação de recursos",
      responsavel: "Coordenação de captação",
      destinatario: "Instituto apoiador fictício",
      para: "Gerência de projetos",
      cargoPara: "Gerente demonstrativo",
      meio: "E-mail institucional",
      prazo: "15 dias",
      classificacao: "Captação",
      assunto: "Apresentação de proposta institucional demonstrativa",
      status: "Em preparacao",
      proximoDestino: "Revisão da diretoria",
      anexarImagem: true
    },
    {
      tipo: "recebimento",
      numero: `DEMO-REC-0005/${hoje.getFullYear()}`,
      dias: -12,
      setor: "Administração",
      responsavel: "Secretaria executiva",
      destinatario: "Conselho Municipal fictício",
      para: "Torresoft",
      cargoPara: "Diretoria",
      meio: "Protocolo físico",
      prazo: "20 dias",
      classificacao: "Regularidade institucional",
      assunto: "Comunicado fictício de atualização cadastral",
      status: "Arquivado",
      protocoloRecebimento: "REC-DEMO-2026-005",
      dataRecebimentoOffset: -11,
      proximoDestino: "Arquivo permanente",
      anexarPdf: true
    },
    {
      tipo: "emissao",
      numero: `DEMO-OF-0006/${hoje.getFullYear()}`,
      dias: -4,
      setor: "RH",
      responsavel: "Departamento pessoal demonstrativo",
      destinatario: "Fornecedor de benefícios fictício",
      para: "Atendimento corporativo",
      cargoPara: "Analista responsável",
      meio: "Sistema externo",
      prazo: "7 dias",
      classificacao: "Administrativo",
      assunto: "Solicitação de conferência de dados contratuais",
      status: "Rascunho",
      proximoDestino: "Conferência interna",
      anexarImagem: false
    },
    {
      tipo: "emissao",
      numero: `DEMO-OF-0007/${hoje.getFullYear()}`,
      dias: 0,
      setor: "Patrimônio",
      responsavel: "Gestão patrimonial demonstrativa",
      destinatario: "Seguradora demonstrativa",
      para: "Setor de apólices",
      cargoPara: "Analista de seguros",
      meio: "E-mail institucional",
      prazo: "3 dias úteis",
      classificacao: "Patrimônio",
      assunto: "Comunicação de empréstimos de itens para eventos",
      status: "Enviado",
      protocoloEnvio: "ENV-DEMO-2026-007",
      dataEnvioOffset: 0,
      proximoDestino: "Aguardar retorno",
      anexarPdf: false
    },
    {
      tipo: "recebimento",
      numero: `DEMO-REC-0008/${hoje.getFullYear()}`,
      dias: 2,
      setor: "Projetos",
      responsavel: "Gestão de projetos demonstrativa",
      destinatario: "Parceiro institucional fictício",
      para: "Torresoft",
      cargoPara: "Coordenação de projetos",
      meio: "E-mail institucional",
      prazo: "12 dias",
      classificacao: "Projetos",
      assunto: "Convite fictício para reunião de alinhamento",
      status: "Recebido",
      protocoloRecebimento: "REC-DEMO-2026-008",
      dataRecebimentoOffset: 2,
      proximoDestino: "Agenda institucional",
      anexarImagem: true
    }
  ];

  for (let index = 0; index < oficios.length; index += 1) {
    const item = oficios[index];
    const data = dateOnly(addDays(hoje, item.dias));
    const unidadeId = unidadesCriadas[index % Math.max(unidadesCriadas.length, 1)]?.id ?? null;
    const corpo = [
      `Este ofício é fictício e foi criado exclusivamente para demonstração comercial da tenant Torresoft.`,
      `O assunto "${item.assunto}" demonstra o preenchimento do conteúdo, protocolo e trâmites da tela.`,
      `Nenhuma informação deste registro representa comunicação real com órgãos, parceiros ou pessoas. ${DEMO}.`
    ].join("\n\n");
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM oficios WHERE tenant_id::text = $1 AND numero = $2 LIMIT 1",
      tenantId,
      item.numero
    );
    const oficioId = existente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO oficios (
          tenant_id, tipo, numero, data, setor_origem, responsavel, destinatario,
          meio_envio, prazo_resposta, classificacao, razao_social, logo_url, titulo,
          saudacao, assunto, corpo, finalizacao, assinatura_nome, assinatura_cargo,
          rodape, status, protocolo_envio, data_envio, protocolo_recebimento,
          data_recebimento, proximo_destino, observacoes, unidade_id, criado_por,
          para, cargo_para, pdf_assinado_nome, pdf_assinado_tipo, pdf_assinado_conteudo,
          criado_em, atualizado_em
        )
        VALUES (
          $1::uuid, $2, $3, $4::date, $5, $6, $7, $8, $9, $10,
          'TORRESOFT', '/storage/instituicoes/documentos/torresoft-logo-demo.png',
          'Ofício demonstrativo', 'Prezados(as),', $11, $12,
          'Atenciosamente,', $13, $14, $15, $16, $17, $18::date, $19, $20::date,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, NOW(), NOW()
        )
        RETURNING id
        `,
        tenantId,
        item.tipo,
        item.numero,
        data,
        item.setor,
        item.responsavel,
        item.destinatario,
        item.meio,
        item.prazo,
        item.classificacao,
        item.assunto,
        corpo,
        item.responsavel,
        item.setor,
        "DOCUMENTO FICTÍCIO - AMBIENTE DE DEMONSTRAÇÃO.",
        item.status,
        item.protocoloEnvio ?? null,
        item.dataEnvioOffset !== undefined ? dateOnly(addDays(hoje, item.dataEnvioOffset)) : null,
        item.protocoloRecebimento ?? null,
        item.dataRecebimentoOffset !== undefined ? dateOnly(addDays(hoje, item.dataRecebimentoOffset)) : null,
        item.proximoDestino,
        `Registro fictício para demonstrar controle de ofícios e protocolos. ${DEMO}.`,
        unidadeId,
        usuarioId,
        item.para,
        item.cargoPara,
        item.anexarPdf ? `${item.numero.replace("/", "-")}-assinado-demo.pdf` : null,
        item.anexarPdf ? "application/pdf" : null,
        item.anexarPdf ? `/storage/oficios/documentos/${tenantId}/${item.numero.replace("/", "-")}-assinado-demo.pdf` : null
      )
    )[0].id;

    await tx.$executeRawUnsafe(
      `
      UPDATE oficios
      SET tipo = $3,
          data = $4::date,
          setor_origem = $5,
          responsavel = $6,
          destinatario = $7,
          meio_envio = $8,
          prazo_resposta = $9,
          classificacao = $10,
          razao_social = 'TORRESOFT',
          logo_url = '/storage/instituicoes/documentos/torresoft-logo-demo.png',
          titulo = 'Ofício demonstrativo',
          saudacao = 'Prezados(as),',
          assunto = $11,
          corpo = $12,
          finalizacao = 'Atenciosamente,',
          assinatura_nome = $13,
          assinatura_cargo = $14,
          rodape = 'DOCUMENTO FICTÍCIO - AMBIENTE DE DEMONSTRAÇÃO.',
          status = $15,
          protocolo_envio = $16,
          data_envio = $17::date,
          protocolo_recebimento = $18,
          data_recebimento = $19::date,
          proximo_destino = $20,
          observacoes = $21,
          unidade_id = $22,
          criado_por = $23,
          para = $24,
          cargo_para = $25,
          pdf_assinado_nome = $26,
          pdf_assinado_tipo = $27,
          pdf_assinado_conteudo = $28,
          atualizado_em = NOW()
      WHERE id = $1
        AND tenant_id::text = $2
      `,
      oficioId,
      tenantId,
      item.tipo,
      data,
      item.setor,
      item.responsavel,
      item.destinatario,
      item.meio,
      item.prazo,
      item.classificacao,
      item.assunto,
      corpo,
      item.responsavel,
      item.setor,
      item.status,
      item.protocoloEnvio ?? null,
      item.dataEnvioOffset !== undefined ? dateOnly(addDays(hoje, item.dataEnvioOffset)) : null,
      item.protocoloRecebimento ?? null,
      item.dataRecebimentoOffset !== undefined ? dateOnly(addDays(hoje, item.dataRecebimentoOffset)) : null,
      item.proximoDestino,
      `Registro fictício para demonstrar controle de ofícios e protocolos. ${DEMO}.`,
      unidadeId,
      usuarioId,
      item.para,
      item.cargoPara,
      item.anexarPdf ? `${item.numero.replace("/", "-")}-assinado-demo.pdf` : null,
      item.anexarPdf ? "application/pdf" : null,
      item.anexarPdf ? `/storage/oficios/documentos/${tenantId}/${item.numero.replace("/", "-")}-assinado-demo.pdf` : null
    );

    if (await tableExists(tx, "oficios_tramites")) {
      await tx.$executeRawUnsafe("DELETE FROM oficios_tramites WHERE tenant_id::text = $1 AND oficio_id = $2", tenantId, oficioId);
      const tramites = [
        { dias: item.dias, origem: item.setor, destino: "Secretaria executiva", acao: "Cadastro", obs: "Ofício demonstrativo cadastrado e numerado." },
        { dias: item.dias + 1, origem: "Secretaria executiva", destino: item.proximoDestino, acao: item.tipo === "emissao" ? "Encaminhamento" : "Recebimento", obs: "Protocolo fictício registrado para demonstração." },
        { dias: item.dias + 3, origem: item.proximoDestino, destino: "Arquivo administrativo", acao: item.status === "Arquivado" ? "Arquivamento" : "Acompanhamento", obs: "Trâmite fictício para demonstrar rastreabilidade." }
      ];
      for (const tramite of tramites) {
        await tx.$executeRawUnsafe(
          `
          INSERT INTO oficios_tramites (
            tenant_id, oficio_id, data, origem, destino, responsavel, acao, observacoes, criado_em, atualizado_em
          )
          VALUES ($1::uuid, $2, $3::date, $4, $5, $6, $7, $8, NOW(), NOW())
          `,
          tenantId,
          oficioId,
          dateOnly(addDays(hoje, tramite.dias)),
          tramite.origem,
          tramite.destino,
          item.responsavel,
          tramite.acao,
          `${tramite.obs} ${DEMO}.`
        );
      }
    }

    if (item.anexarImagem && await tableExists(tx, "oficios_imagens")) {
      await tx.$executeRawUnsafe("DELETE FROM oficios_imagens WHERE tenant_id::text = $1 AND oficio_id = $2", tenantId, oficioId);
      for (let imagem = 0; imagem < 2; imagem += 1) {
        await tx.$executeRawUnsafe(
          `
          INSERT INTO oficios_imagens (
            tenant_id, oficio_id, nome_arquivo, tipo_mime, conteudo_base64, ordem, criado_em, atualizado_em
          )
          VALUES ($1::uuid, $2, $3, 'image/jpeg', $4, $5, NOW(), NOW())
          `,
          tenantId,
          oficioId,
          `${item.numero.replace("/", "-")}-imagem-${imagem + 1}-demo.jpg`,
          `/storage/oficios/documentos/${tenantId}/${item.numero.replace("/", "-")}-imagem-${imagem + 1}-demo.jpg`,
          imagem + 1
        );
      }
    }
  }
}

async function popularTarefasPendencias(tx: typeof prisma, tenantId: string) {
  if (!(await tableExists(tx, "tarefas_pendencias"))) return;

  const comandosEstrutura = [
    "ALTER TABLE tarefas_pendencias ADD COLUMN IF NOT EXISTS tenant_id UUID",
    "ALTER TABLE IF EXISTS tarefas_pendencias_checklist ADD COLUMN IF NOT EXISTS tenant_id UUID",
    "ALTER TABLE IF EXISTS tarefas_pendencias_historico ADD COLUMN IF NOT EXISTS tenant_id UUID"
  ];
  for (const comando of comandosEstrutura) {
    await tx.$executeRawUnsafe(comando);
  }

  for (const tabela of ["tarefas_pendencias", "tarefas_pendencias_checklist", "tarefas_pendencias_historico"]) {
    if (await tableExists(tx, tabela)) {
      await tx.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('${tabela}', 'id'), COALESCE((SELECT MAX(id) FROM ${tabela}), 0) + 1, false)`
      );
    }
  }

  const hoje = new Date();
  const tarefas = [
    {
      titulo: "Regularizar certidão municipal vencida",
      descricao: "Emitir nova certidão municipal fictícia e atualizar a tela de documentos da instituição.",
      responsavel: "Financeiro",
      prioridade: "Alta",
      prazo: -2,
      status: "Em atraso",
      checklist: ["Consultar portal municipal", "Emitir certidão atualizada", "Anexar comprovante no documento institucional"],
      concluidos: 1
    },
    {
      titulo: "Conferir reservas de patrimônio para eventos",
      descricao: "Validar itens reservados na tela de empréstimos para eventos e confirmar datas de retirada.",
      responsavel: "Patrimônio",
      prioridade: "Alta",
      prazo: 1,
      status: "Em andamento",
      checklist: ["Revisar eventos agendados", "Conferir itens vinculados", "Confirmar responsável pela retirada"],
      concluidos: 2
    },
    {
      titulo: "Revisar prestação de contas em análise",
      descricao: "Conferir receitas, despesas, comprovantes, checklist e parecer antes do envio fictício.",
      responsavel: "Prestação de contas",
      prioridade: "Alta",
      prazo: -1,
      status: "Em atraso",
      checklist: ["Validar identificação", "Conferir despesas", "Registrar parecer técnico", "Revisar auditoria final"],
      concluidos: 2
    },
    {
      titulo: "Publicar fotos dos eventos recentes",
      descricao: "Selecionar capa, revisar legendas e validar tags dos álbuns demonstrativos.",
      responsavel: "Comunicação",
      prioridade: "Media",
      prazo: 3,
      status: "Aberta",
      checklist: ["Selecionar capa dos álbuns", "Revisar legendas", "Publicar mural"],
      concluidos: 0
    },
    {
      titulo: "Atualizar retorno de banco de empregos",
      descricao: "Registrar andamento dos candidatos encaminhados e atualizar pendências das vagas fictícias.",
      responsavel: "Serviço social",
      prioridade: "Media",
      prazo: 5,
      status: "Aberta",
      checklist: ["Contatar empresas parceiras", "Atualizar candidatos", "Registrar histórico de processo"],
      concluidos: 1
    },
    {
      titulo: "Validar fechamento do registro de ponto",
      descricao: "Conferir ocorrências, horas extras e batidas incompletas antes da exportação mensal.",
      responsavel: "RH",
      prioridade: "Alta",
      prazo: 0,
      status: "Em andamento",
      checklist: ["Revisar ocorrências", "Conferir horas extras", "Aprovar relatório do período"],
      concluidos: 2
    },
    {
      titulo: "Arquivar ofícios recebidos",
      descricao: "Conferir protocolos recebidos, trâmites e arquivar documentos já finalizados.",
      responsavel: "Secretaria executiva",
      prioridade: "Baixa",
      prazo: 7,
      status: "Aberta",
      checklist: ["Conferir protocolo", "Registrar trâmite final", "Arquivar documento"],
      concluidos: 1
    },
    {
      titulo: "Preparar reunião de captação",
      descricao: "Organizar indicadores de campanhas, doadores e recorrências para reunião fictícia de captação.",
      responsavel: "Captação de recursos",
      prioridade: "Media",
      prazo: 2,
      status: "Em andamento",
      checklist: ["Separar indicadores", "Revisar campanhas", "Enviar pauta aos participantes"],
      concluidos: 2
    },
    {
      titulo: "Conferir relatório de visitas realizadas",
      descricao: "Validar registros de visitas domiciliares, responsáveis e encaminhamentos lançados.",
      responsavel: "Coordenação social",
      prioridade: "Media",
      prazo: -4,
      status: "Concluida",
      checklist: ["Conferir visitas", "Atualizar encaminhamentos", "Finalizar relatório"],
      concluidos: 3
    },
    {
      titulo: "Revisar documentos de contratação",
      descricao: "Checar documentos da tela de contratação e pendências dos colaboradores fictícios.",
      responsavel: "RH",
      prioridade: "Alta",
      prazo: -6,
      status: "Concluida",
      checklist: ["Validar ficha de admissão", "Conferir termo", "Arquivar documento"],
      concluidos: 3
    },
    {
      titulo: "Atualizar manual operacional interno",
      descricao: "Registrar ajustes de uso das telas demonstrativas no manual interno do sistema.",
      responsavel: "Administração",
      prioridade: "Baixa",
      prazo: 10,
      status: "Aberta",
      checklist: ["Revisar telas novas", "Atualizar orientação", "Validar publicação"],
      concluidos: 0
    },
    {
      titulo: "Auditar isolamento da base demonstrativa",
      descricao: "Conferir se os dados DEMO_TORRESOFT permanecem vinculados somente ao tenant correto.",
      responsavel: "Administrador Demonstração Torresoft",
      prioridade: "Alta",
      prazo: 1,
      status: "Em andamento",
      checklist: ["Consultar registros demo", "Validar tenant", "Registrar resultado"],
      concluidos: 2
    }
  ];

  for (const tarefa of tarefas) {
    const prazo = dateOnly(addDays(hoje, tarefa.prazo));
    const existente = await tx.$queryRawUnsafe<IdRow[]>(
      "SELECT id FROM tarefas_pendencias WHERE tenant_id::text = $1 AND titulo = $2 AND descricao LIKE $3 LIMIT 1",
      tenantId,
      tarefa.titulo,
      `%${DEMO}%`
    );
    const tarefaId = existente[0]?.id ?? (
      await tx.$queryRawUnsafe<IdRow[]>(
        `
        INSERT INTO tarefas_pendencias (
          tenant_id, titulo, descricao, responsavel, prioridade, prazo, status, criado_em, atualizado_em
        )
        VALUES ($1::uuid, $2, $3, $4, $5, $6::date, $7, NOW(), NOW())
        RETURNING id
        `,
        tenantId,
        tarefa.titulo,
        `${tarefa.descricao} ${DEMO}.`,
        tarefa.responsavel,
        tarefa.prioridade,
        prazo,
        tarefa.status
      )
    )[0].id;

    await tx.$executeRawUnsafe(
      `
      UPDATE tarefas_pendencias
      SET descricao = $3,
          responsavel = $4,
          prioridade = $5,
          prazo = $6::date,
          status = $7,
          atualizado_em = NOW()
      WHERE id = $1
        AND tenant_id::text = $2
      `,
      tarefaId,
      tenantId,
      `${tarefa.descricao} ${DEMO}.`,
      tarefa.responsavel,
      tarefa.prioridade,
      prazo,
      tarefa.status
    );

    if (await tableExists(tx, "tarefas_pendencias_checklist")) {
      await tx.$executeRawUnsafe("DELETE FROM tarefas_pendencias_checklist WHERE tenant_id::text = $1 AND tarefa_id = $2", tenantId, tarefaId);
      for (let index = 0; index < tarefa.checklist.length; index += 1) {
        const concluido = index < tarefa.concluidos;
        await tx.$executeRawUnsafe(
          `
          INSERT INTO tarefas_pendencias_checklist (
            tenant_id, tarefa_id, titulo, concluido, concluido_em, ordem, criado_em, atualizado_em
          )
          VALUES ($1::uuid, $2, $3, $4, $5::timestamp, $6, NOW(), NOW())
          `,
          tenantId,
          tarefaId,
          tarefa.checklist[index],
          concluido,
          concluido ? `${dateOnly(addDays(hoje, Math.min(tarefa.prazo, -1)))} 10:00:00` : null,
          index
        );
      }
    }

    if (await tableExists(tx, "tarefas_pendencias_historico")) {
      await tx.$executeRawUnsafe("DELETE FROM tarefas_pendencias_historico WHERE tenant_id::text = $1 AND tarefa_id = $2 AND mensagem LIKE $3", tenantId, tarefaId, `%${DEMO}%`);
      const historicos = [
        { dias: -8, mensagem: "Tarefa demonstrativa criada para acompanhamento operacional." },
        { dias: -4, mensagem: tarefa.status === "Concluida" ? "Checklist concluído e tarefa finalizada." : "Atualização demonstrativa registrada no histórico." },
        { dias: -1, mensagem: tarefa.status === "Em atraso" ? "Prazo vencido sinalizado para validação do alerta." : "Responsável manteve acompanhamento da pendência." }
      ];
      for (const historico of historicos) {
        await tx.$executeRawUnsafe(
          `
          INSERT INTO tarefas_pendencias_historico (
            tenant_id, tarefa_id, mensagem, criado_em
          )
          VALUES ($1::uuid, $2, $3, $4::timestamp)
          `,
          tenantId,
          tarefaId,
          `${historico.mensagem} ${DEMO}.`,
          `${dateOnly(addDays(hoje, historico.dias))} 09:00:00`
        );
      }
    }
  }
}

async function gerarResumo(tenantId: string) {
  const tabelas = [
    "unidade_assistencial", "cadastro_beneficiario", "vinculo_familiar", "vinculo_familiar_membro", "familia_historico",
    "cadastro_profissionais", "cadastro_voluntario", "voluntario_escala", "central_atendimento",
    "agendamento", "senhas_fila", "senhas_chamadas", "senhas_config",
    "prontuario", "prontuario_atendimento", "prontuario_adendo", "prontuario_auditoria",
    "venda_setor", "venda_setor_item", "carteira_evento", "carteira_evento_participante",
    "carteira_evento_barraca", "carteira_evento_item", "carteira_evento_venda",
    "carteira_evento_venda_item", "carteira_evento_movimentacao",
    "biblioteca_livro", "banco_empregos_vaga", "banco_empregos_candidato",
    "banco_empregos_processo", "doador", "recebimento_doacao", "doacao_realizada",
    "visita_domiciliar", "almoxarifado_item", "projetos", "patrimonio_item", "controle_veiculos", "lancamento_financeiro",
    "eventos_emprestimos", "emprestimos_eventos_responsaveis", "emprestimos_eventos",
    "emprestimos_eventos_itens", "emprestimos_eventos_movimentacoes",
    "fotos_eventos", "fotos_eventos_itens", "fotos_eventos_tags",
    "lembretes_diarios",
    "oficios", "oficios_tramites", "oficios_imagens",
    "tarefas_pendencias", "tarefas_pendencias_checklist", "tarefas_pendencias_historico",
    "conta_bancaria", "autorizacao_compras", "autorizacao_compras_item",
    "autorizacao_compras_cotacoes", "autorizacao_compras_aprovacao_nivel",
    "autorizacao_compras_aprovacao", "autorizacao_compras_reserva_bancaria",
    "autorizacao_compras_historico", "autorizacao_compras_integracao",
    "rh_candidato", "rh_processo_contratacao", "rh_entrevista", "rh_ficha_admissao",
    "rh_documento_item", "rh_arquivo", "rh_termo", "rh_ppd", "rh_carta_banco",
    "rh_auditoria_contratacao", "registro_ponto", "registro_ponto_batida",
    "registro_ponto_ocorrencia", "registro_ponto_auditoria", "registro_ponto_hora_extra",
    "captacao_doadores", "captacao_tarefas_relacionamento", "captacao_campanhas",
    "captacao_campanhas_metricas", "captacao_recorrencias", "captacao_doacoes",
    "captacao_doacoes_eventos", "captacao_transacoes_pix", "captacao_transacoes_cartao",
    "captacao_transacoes_boleto", "captacao_comprovantes", "captacao_configuracoes",
    "captacao_logs", "captacao_preferencias_comunicacao",
    "documentos_instituicao", "documentos_instituicao_anexos", "documentos_instituicao_historico",
    "educacional_aluno", "educacional_disciplina", "educacional_turma", "educacional_matricula",
    "educacional_frequencia", "educacional_avaliacao", "educacional_nota", "educacional_boletim",
    "educacional_historico_escolar", "educacional_documento", "prestacao_contas_concedente",
    "prestacao_contas_instrumento", "prestacao_contas_modelo", "prestacao_contas_meta",
    "prestacao_contas_rubrica", "prestacao_contas_receita", "prestacao_contas_despesa",
    "prestacao_contas_documento", "prestacao_contas_conciliacao", "prestacao_contas_diligencia",
    "prestacao_contas_aprovacao", "prestacao_contas_transparencia_publica",
    "prestacao_contas_configuracao_ia", "prestacao_contas_auditoria",
    "transparencia", "transparencia_recebimentos", "transparencia_destinacoes",
    "transparencia_comprovantes", "transparencia_timelines", "transparencia_checklist",
    "transparencia_despesas", "transparencia_parecer_historico", "termo_fomento",
    "termo_fomento_aditivos", "termo_fomento_documentos", "plano_trabalho",
    "plano_trabalho_objetivos", "plano_trabalho_metas", "plano_trabalho_atividades",
    "plano_trabalho_aplicacao_recursos", "plano_trabalho_desembolso",
    "plano_trabalho_checklist_prestacao", "checklist_configuracoes",
    "checklist_modelos", "checklist_modelo_itens", "checklist_execucoes",
    "checklist_execucao_historico"
  ];
  const resumo: Record<string, number> = {};
  for (const tabela of tabelas) {
    resumo[tabela] = await count(prisma, tabela, tenantId);
  }
  return resumo;
}

async function main() {
  const instituicao = await prisma.$transaction(async (tx) => {
    const inst = await getInstituicao(tx as typeof prisma);
    if (normalizarCnpj(CNPJ_FORMATADO) !== CNPJ_LIMPO) {
      throw new Error("CNPJ alvo invalido.");
    }
    await tx.$executeRawUnsafe(
      `
      UPDATE instituicoes
      SET codigo = COALESCE(NULLIF(codigo, ''), 'TORRESOFT'),
          razao_social = 'TORRESOFT',
          nome_fantasia = 'Torresoft',
          slug = 'torresoft',
          email = COALESCE(NULLIF(email, ''), $2),
          status = 'ATIVO',
          atualizado_em = NOW()
      WHERE id::text = $1
        AND regexp_replace(cnpj, '\\D', '', 'g') = $3
      `,
      inst.id,
      LOGIN,
      CNPJ_LIMPO
    );
    const usuarioId = await garantirUsuario(tx as typeof prisma, inst.tenant_id, inst.id);
    const unidadesCriadas = await garantirUnidades(tx as typeof prisma, inst.tenant_id);
    const beneficiarios = await garantirBeneficiarios(tx as typeof prisma, inst.tenant_id);
    const familias = await garantirFamilias(tx as typeof prisma, inst.tenant_id, beneficiarios);
    await popularFamiliasVinculos(tx as typeof prisma, inst.tenant_id, beneficiarios, familias);
    const profissionais = await garantirProfissionais(tx as typeof prisma, inst.tenant_id, unidadesCriadas);
    await popularVoluntariado(tx as typeof prisma, inst.tenant_id, profissionais);
    const itensAlmoxarifado = await garantirItensAlmoxarifado(tx as typeof prisma, inst.tenant_id);
    await popularFrenteCaixaHistorico(tx as typeof prisma, inst.tenant_id, itensAlmoxarifado);
    await popularCarteiraDigitalEvento(tx as typeof prisma, inst.tenant_id, beneficiarios, usuarioId);
    await popularAtendimentosAgenda(tx as typeof prisma, inst.tenant_id, beneficiarios, familias, profissionais, unidadesCriadas);
    await popularChamadaSenhas(tx as typeof prisma, inst.tenant_id, beneficiarios, unidadesCriadas, usuarioId);
    await popularProntuarioEletronico(tx as typeof prisma, inst.tenant_id, beneficiarios, profissionais, unidadesCriadas, usuarioId);
    await popularBiblioteca(tx as typeof prisma, inst.tenant_id);
    await popularBancoEmpregos(tx as typeof prisma, inst.tenant_id, beneficiarios, usuarioId);
    await popularContratacaoRh(tx as typeof prisma, inst.tenant_id, usuarioId);
    await popularRegistroPonto(tx as typeof prisma, inst.tenant_id, inst.id, unidadesCriadas, usuarioId);
    await popularAutorizacaoCompras(tx as typeof prisma, inst.tenant_id, usuarioId);
    await popularCaptacaoRecursos(tx as typeof prisma, inst.tenant_id, usuarioId);
    await popularProjetosPatrimonioFinanceiro(tx as typeof prisma, inst.tenant_id, unidadesCriadas);
    await popularDoacoes(tx as typeof prisma, inst.tenant_id, beneficiarios, familias, itensAlmoxarifado);
    await popularVisitasDomiciliares(tx as typeof prisma, inst.tenant_id, beneficiarios, unidadesCriadas);
    await popularEmprestimosEventos(tx as typeof prisma, inst.tenant_id, unidadesCriadas, usuarioId);
    await popularFotosEventos(tx as typeof prisma, inst.tenant_id, unidadesCriadas, usuarioId);
    await popularLembretesDiarios(tx as typeof prisma, inst.tenant_id, usuarioId);
    await popularOficiosProtocolos(tx as typeof prisma, inst.tenant_id, unidadesCriadas, usuarioId);
    await popularTarefasPendencias(tx as typeof prisma, inst.tenant_id);
    await popularEducacional(tx as typeof prisma, inst.tenant_id, beneficiarios, profissionais, unidadesCriadas, usuarioId);
    await popularDocumentosInstituicao(tx as typeof prisma, inst.tenant_id, usuarioId);
    await popularPrestacaoContas(tx as typeof prisma, inst.tenant_id, unidadesCriadas, usuarioId);
    await popularTermosPlanosTransparencia(tx as typeof prisma, inst.tenant_id, unidadesCriadas, usuarioId);
    await popularChecklistDiario(tx as typeof prisma, inst.tenant_id, unidadesCriadas, usuarioId);
    return inst;
  }, { timeout: 180000, maxWait: 15000 });

  const resumo = await gerarResumo(instituicao.tenant_id);
  const vazamento = await prisma.$queryRawUnsafe<CountRow[]>(
    `
    SELECT COUNT(*)::bigint AS total
    FROM cadastro_beneficiario
    WHERE codigo LIKE 'DEMO-TS-%'
      AND (tenant_id IS NULL OR tenant_id::text <> $1)
    `,
    instituicao.tenant_id
  );

  console.log(JSON.stringify({
    tenant: {
      instituicao: "TORRESOFT",
      cnpj: CNPJ_FORMATADO,
      tenant_id: instituicao.tenant_id,
      instituicao_id: instituicao.id
    },
    usuario: {
      login: LOGIN,
      nome: NOME_ADMIN,
      perfil: "ADMINISTRADOR"
    },
    resumo,
    validacao: {
      beneficiarios_demo_fora_do_tenant: Number(vazamento[0]?.total ?? 0n)
    }
  }, (_, value) => bigintToString(value), 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
