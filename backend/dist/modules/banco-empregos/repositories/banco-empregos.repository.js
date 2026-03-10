import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
const estruturaSql = [
    `
  CREATE TABLE IF NOT EXISTS banco_empregos (
    id BIGSERIAL PRIMARY KEY,
    dados_vaga JSONB NOT NULL DEFAULT '{}'::jsonb,
    empresa_local JSONB,
    requisitos JSONB,
    encaminhamentos JSONB NOT NULL DEFAULT '[]'::jsonb,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
    `
  CREATE TABLE IF NOT EXISTS banco_empregos_encaminhamentos (
    id BIGSERIAL PRIMARY KEY,
    emprego_id BIGINT NOT NULL REFERENCES banco_empregos(id) ON DELETE CASCADE,
    beneficiario_id BIGINT,
    beneficiario_nome VARCHAR(200),
    data_encaminhamento DATE NOT NULL,
    status VARCHAR(40) NOT NULL,
    observacoes TEXT
  )
  `,
    `
  CREATE TABLE IF NOT EXISTS banco_empregos_candidatos (
    id BIGSERIAL PRIMARY KEY,
    emprego_id BIGINT NOT NULL REFERENCES banco_empregos(id) ON DELETE CASCADE,
    beneficiario_id BIGINT REFERENCES cadastro_beneficiario(id) ON DELETE SET NULL,
    beneficiario_nome VARCHAR(200) NOT NULL,
    necessidades_profissionais TEXT,
    status VARCHAR(40) NOT NULL DEFAULT 'EM_ANALISE',
    curriculo_nome VARCHAR(255),
    curriculo_tipo VARCHAR(120),
    curriculo_conteudo TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `
];
export class BancoEmpregosRepository {
    estruturaGarantida = false;
    estruturaBanco = null;
    async garantirEstrutura() {
        if (this.estruturaGarantida)
            return;
        for (const comando of estruturaSql) {
            await prisma.$executeRawUnsafe(comando);
        }
        await prisma.$executeRawUnsafe("ALTER TABLE banco_empregos_candidatos ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()");
        const estrutura = await this.detectarEstruturaBanco();
        if (estrutura === "json") {
            await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS banco_empregos_dados_vaga_gin_idx ON banco_empregos USING GIN (dados_vaga)");
        }
        else {
            await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS banco_empregos_status_idx ON banco_empregos (status)");
            await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS banco_empregos_encaminhamentos_emprego_idx ON banco_empregos_encaminhamentos (emprego_id)");
        }
        this.estruturaBanco = estrutura;
        this.estruturaGarantida = true;
    }
    async detectarEstruturaBanco() {
        if (this.estruturaBanco) {
            return this.estruturaBanco;
        }
        const colunas = await prisma.$queryRaw(Prisma.sql `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'banco_empregos'
    `);
        const nomesColunas = new Set(colunas.map((coluna) => coluna.column_name));
        this.estruturaBanco = nomesColunas.has("dados_vaga") ? "json" : "legacy";
        return this.estruturaBanco;
    }
    normalizarBeneficiarioId(rawId) {
        if (!rawId) {
            return null;
        }
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Beneficiario invalido para a vaga.", 400);
        }
        return BigInt(parsed);
    }
    async listarJson() {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        dados_vaga,
        empresa_local,
        requisitos,
        encaminhamentos,
        criado_em,
        atualizado_em
      FROM banco_empregos
      ORDER BY id DESC
    `);
    }
    async listarLegacy() {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        b.id,
        jsonb_build_object(
          'titulo', b.titulo,
          'area', b.area,
          'tipo', b.tipo,
          'nivel', b.nivel,
          'modelo', b.modelo,
          'status', b.status,
          'dataAbertura', CASE WHEN b.data_abertura IS NOT NULL THEN TO_CHAR(b.data_abertura, 'YYYY-MM-DD') END,
          'dataEncerramento', CASE WHEN b.data_encerramento IS NOT NULL THEN TO_CHAR(b.data_encerramento, 'YYYY-MM-DD') END,
          'tipoContrato', b.tipo_contrato,
          'cargaHoraria', b.carga_horaria,
          'salario', b.salario,
          'beneficios', b.beneficios
        ) AS dados_vaga,
        CASE
          WHEN b.nome_empresa IS NULL
            AND b.cnpj IS NULL
            AND b.responsavel IS NULL
            AND b.telefone IS NULL
            AND b.email IS NULL
            AND b.endereco IS NULL
            AND b.bairro IS NULL
            AND b.cidade IS NULL
            AND b.uf IS NULL
          THEN '{}'::jsonb
          ELSE jsonb_build_object(
            'nomeEmpresa', b.nome_empresa,
            'cnpj', b.cnpj,
            'responsavel', b.responsavel,
            'telefone', b.telefone,
            'email', b.email,
            'endereco', b.endereco,
            'bairro', b.bairro,
            'cidade', b.cidade,
            'uf', b.uf
          )
        END AS empresa_local,
        CASE
          WHEN b.escolaridade IS NULL
            AND b.experiencia IS NULL
            AND b.habilidades IS NULL
            AND b.requisitos IS NULL
            AND b.descricao IS NULL
            AND b.observacoes IS NULL
          THEN '{}'::jsonb
          ELSE jsonb_build_object(
            'escolaridade', b.escolaridade,
            'experiencia', b.experiencia,
            'habilidades', b.habilidades,
            'requisitos', b.requisitos,
            'descricao', b.descricao,
            'observacoes', b.observacoes
          )
        END AS requisitos,
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', enc.id,
                'beneficiarioId', enc.beneficiario_id,
                'beneficiarioNome', enc.beneficiario_nome,
                'data', TO_CHAR(enc.data_encaminhamento, 'YYYY-MM-DD'),
                'status', enc.status,
                'observacoes', enc.observacoes
              )
              ORDER BY enc.id DESC
            )
            FROM banco_empregos_encaminhamentos enc
            WHERE enc.emprego_id = b.id
          ),
          '[]'::jsonb
        ) AS encaminhamentos,
        b.criado_em,
        b.atualizado_em
      FROM banco_empregos b
      ORDER BY b.id DESC
    `);
    }
    async obterJson(id) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        dados_vaga,
        empresa_local,
        requisitos,
        encaminhamentos,
        criado_em,
        atualizado_em
      FROM banco_empregos
      WHERE id = ${id}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async obterLegacy(id) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        b.id,
        jsonb_build_object(
          'titulo', b.titulo,
          'area', b.area,
          'tipo', b.tipo,
          'nivel', b.nivel,
          'modelo', b.modelo,
          'status', b.status,
          'dataAbertura', CASE WHEN b.data_abertura IS NOT NULL THEN TO_CHAR(b.data_abertura, 'YYYY-MM-DD') END,
          'dataEncerramento', CASE WHEN b.data_encerramento IS NOT NULL THEN TO_CHAR(b.data_encerramento, 'YYYY-MM-DD') END,
          'tipoContrato', b.tipo_contrato,
          'cargaHoraria', b.carga_horaria,
          'salario', b.salario,
          'beneficios', b.beneficios
        ) AS dados_vaga,
        CASE
          WHEN b.nome_empresa IS NULL
            AND b.cnpj IS NULL
            AND b.responsavel IS NULL
            AND b.telefone IS NULL
            AND b.email IS NULL
            AND b.endereco IS NULL
            AND b.bairro IS NULL
            AND b.cidade IS NULL
            AND b.uf IS NULL
          THEN '{}'::jsonb
          ELSE jsonb_build_object(
            'nomeEmpresa', b.nome_empresa,
            'cnpj', b.cnpj,
            'responsavel', b.responsavel,
            'telefone', b.telefone,
            'email', b.email,
            'endereco', b.endereco,
            'bairro', b.bairro,
            'cidade', b.cidade,
            'uf', b.uf
          )
        END AS empresa_local,
        CASE
          WHEN b.escolaridade IS NULL
            AND b.experiencia IS NULL
            AND b.habilidades IS NULL
            AND b.requisitos IS NULL
            AND b.descricao IS NULL
            AND b.observacoes IS NULL
          THEN '{}'::jsonb
          ELSE jsonb_build_object(
            'escolaridade', b.escolaridade,
            'experiencia', b.experiencia,
            'habilidades', b.habilidades,
            'requisitos', b.requisitos,
            'descricao', b.descricao,
            'observacoes', b.observacoes
          )
        END AS requisitos,
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', enc.id,
                'beneficiarioId', enc.beneficiario_id,
                'beneficiarioNome', enc.beneficiario_nome,
                'data', TO_CHAR(enc.data_encaminhamento, 'YYYY-MM-DD'),
                'status', enc.status,
                'observacoes', enc.observacoes
              )
              ORDER BY enc.id DESC
            )
            FROM banco_empregos_encaminhamentos enc
            WHERE enc.emprego_id = b.id
          ),
          '[]'::jsonb
        ) AS encaminhamentos,
        b.criado_em,
        b.atualizado_em
      FROM banco_empregos b
      WHERE b.id = ${id}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async substituirEncaminhamentosLegacy(empregoId, encaminhamentos = []) {
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM banco_empregos_encaminhamentos
      WHERE emprego_id = ${empregoId}
    `);
        for (const item of encaminhamentos) {
            await prisma.$executeRaw(Prisma.sql `
        INSERT INTO banco_empregos_encaminhamentos (
          emprego_id,
          beneficiario_id,
          beneficiario_nome,
          data_encaminhamento,
          status,
          observacoes
        ) VALUES (
          ${empregoId},
          ${item.beneficiarioId ? BigInt(item.beneficiarioId) : null},
          ${item.beneficiarioNome || null},
          CAST(${item.data || null} AS DATE),
          ${item.status || null},
          ${item.observacoes ?? null}
        )
      `);
        }
    }
    async listar() {
        await this.garantirEstrutura();
        return (await this.detectarEstruturaBanco()) === "json" ? this.listarJson() : this.listarLegacy();
    }
    async obter(id) {
        await this.garantirEstrutura();
        return (await this.detectarEstruturaBanco()) === "json" ? this.obterJson(id) : this.obterLegacy(id);
    }
    async obterOuFalhar(id) {
        const registro = await this.obter(id);
        if (!registro) {
            throw new AppError("Vaga nao encontrada.", 404);
        }
        return registro;
    }
    async criar(input) {
        await this.garantirEstrutura();
        if ((await this.detectarEstruturaBanco()) === "json") {
            const inserted = await prisma.$queryRaw(Prisma.sql `
        INSERT INTO banco_empregos (
          dados_vaga,
          empresa_local,
          requisitos,
          encaminhamentos,
          criado_em,
          atualizado_em
        ) VALUES (
          ${input.dadosVaga},
          ${(input.empresaLocal ?? null)},
          ${(input.requisitos ?? null)},
          ${(input.encaminhamentos ?? [])},
          NOW(),
          NOW()
        )
        RETURNING id
      `);
            const id = inserted[0]?.id;
            if (!id) {
                throw new AppError("Nao foi possivel criar vaga.", 500);
            }
            return this.obterOuFalhar(id);
        }
        const inserted = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO banco_empregos (
        titulo,
        area,
        tipo,
        nivel,
        modelo,
        status,
        data_abertura,
        data_encerramento,
        tipo_contrato,
        carga_horaria,
        salario,
        beneficios,
        nome_empresa,
        cnpj,
        responsavel,
        telefone,
        email,
        endereco,
        bairro,
        cidade,
        uf,
        escolaridade,
        experiencia,
        habilidades,
        requisitos,
        descricao,
        observacoes,
        criado_em,
        atualizado_em
      ) VALUES (
        ${input.dadosVaga.titulo},
        ${input.dadosVaga.area ?? null},
        ${input.dadosVaga.tipo ?? null},
        ${input.dadosVaga.nivel ?? null},
        ${input.dadosVaga.modelo ?? null},
        ${input.dadosVaga.status},
        CAST(${input.dadosVaga.dataAbertura ?? null} AS DATE),
        CAST(${input.dadosVaga.dataEncerramento ?? null} AS DATE),
        ${input.dadosVaga.tipoContrato ?? null},
        ${input.dadosVaga.cargaHoraria ?? null},
        ${input.dadosVaga.salario ?? null},
        ${input.dadosVaga.beneficios ?? null},
        ${input.empresaLocal?.nomeEmpresa ?? null},
        ${input.empresaLocal?.cnpj ?? null},
        ${input.empresaLocal?.responsavel ?? null},
        ${input.empresaLocal?.telefone ?? null},
        ${input.empresaLocal?.email ?? null},
        ${input.empresaLocal?.endereco ?? null},
        ${input.empresaLocal?.bairro ?? null},
        ${input.empresaLocal?.cidade ?? null},
        ${input.empresaLocal?.uf ?? null},
        ${input.requisitos?.escolaridade ?? null},
        ${input.requisitos?.experiencia ?? null},
        ${input.requisitos?.habilidades ?? null},
        ${input.requisitos?.requisitos ?? null},
        ${input.requisitos?.descricao ?? null},
        ${input.requisitos?.observacoes ?? null},
        NOW(),
        NOW()
      )
      RETURNING id
    `);
        const id = inserted[0]?.id;
        if (!id) {
            throw new AppError("Nao foi possivel criar vaga.", 500);
        }
        await this.substituirEncaminhamentosLegacy(id, input.encaminhamentos ?? []);
        return this.obterOuFalhar(id);
    }
    async atualizar(id, input) {
        await this.garantirEstrutura();
        await this.obterOuFalhar(id);
        if ((await this.detectarEstruturaBanco()) === "json") {
            await prisma.$executeRaw(Prisma.sql `
        UPDATE banco_empregos
        SET
          dados_vaga = ${input.dadosVaga},
          empresa_local = ${(input.empresaLocal ?? null)},
          requisitos = ${(input.requisitos ?? null)},
          encaminhamentos = ${(input.encaminhamentos ?? [])},
          atualizado_em = NOW()
        WHERE id = ${id}
      `);
            return this.obterOuFalhar(id);
        }
        await prisma.$executeRaw(Prisma.sql `
      UPDATE banco_empregos
      SET
        titulo = ${input.dadosVaga.titulo},
        area = ${input.dadosVaga.area ?? null},
        tipo = ${input.dadosVaga.tipo ?? null},
        nivel = ${input.dadosVaga.nivel ?? null},
        modelo = ${input.dadosVaga.modelo ?? null},
        status = ${input.dadosVaga.status},
        data_abertura = CAST(${input.dadosVaga.dataAbertura ?? null} AS DATE),
        data_encerramento = CAST(${input.dadosVaga.dataEncerramento ?? null} AS DATE),
        tipo_contrato = ${input.dadosVaga.tipoContrato ?? null},
        carga_horaria = ${input.dadosVaga.cargaHoraria ?? null},
        salario = ${input.dadosVaga.salario ?? null},
        beneficios = ${input.dadosVaga.beneficios ?? null},
        nome_empresa = ${input.empresaLocal?.nomeEmpresa ?? null},
        cnpj = ${input.empresaLocal?.cnpj ?? null},
        responsavel = ${input.empresaLocal?.responsavel ?? null},
        telefone = ${input.empresaLocal?.telefone ?? null},
        email = ${input.empresaLocal?.email ?? null},
        endereco = ${input.empresaLocal?.endereco ?? null},
        bairro = ${input.empresaLocal?.bairro ?? null},
        cidade = ${input.empresaLocal?.cidade ?? null},
        uf = ${input.empresaLocal?.uf ?? null},
        escolaridade = ${input.requisitos?.escolaridade ?? null},
        experiencia = ${input.requisitos?.experiencia ?? null},
        habilidades = ${input.requisitos?.habilidades ?? null},
        requisitos = ${input.requisitos?.requisitos ?? null},
        descricao = ${input.requisitos?.descricao ?? null},
        observacoes = ${input.requisitos?.observacoes ?? null},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
        await this.substituirEncaminhamentosLegacy(id, input.encaminhamentos ?? []);
        return this.obterOuFalhar(id);
    }
    async remover(id) {
        await this.garantirEstrutura();
        await this.obterOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM banco_empregos
      WHERE id = ${id}
    `);
    }
    async listarCandidatos(empregoId) {
        await this.garantirEstrutura();
        await this.obterOuFalhar(empregoId);
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        emprego_id,
        beneficiario_id::text AS beneficiario_id,
        beneficiario_nome,
        necessidades_profissionais,
        status,
        curriculo_nome,
        curriculo_tipo,
        curriculo_conteudo,
        criado_em
      FROM banco_empregos_candidatos
      WHERE emprego_id = ${empregoId}
      ORDER BY id DESC
    `);
    }
    async criarCandidato(empregoId, input) {
        await this.garantirEstrutura();
        await this.obterOuFalhar(empregoId);
        const beneficiarioId = this.normalizarBeneficiarioId(input.beneficiarioId);
        const inserted = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO banco_empregos_candidatos (
        emprego_id,
        beneficiario_id,
        beneficiario_nome,
        necessidades_profissionais,
        status,
        curriculo_nome,
        curriculo_tipo,
        curriculo_conteudo,
        criado_em,
        atualizado_em
      ) VALUES (
        ${empregoId},
        ${beneficiarioId},
        ${input.beneficiarioNome},
        ${input.necessidadesProfissionais ?? null},
        ${input.status ?? "EM_ANALISE"},
        ${input.curriculoNome ?? null},
        ${input.curriculoTipo ?? null},
        ${input.curriculoConteudo ?? null},
        NOW(),
        NOW()
      )
      RETURNING id
    `);
        const id = inserted[0]?.id;
        if (!id) {
            throw new AppError("Nao foi possivel criar candidato.", 500);
        }
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        emprego_id,
        beneficiario_id::text AS beneficiario_id,
        beneficiario_nome,
        necessidades_profissionais,
        status,
        curriculo_nome,
        curriculo_tipo,
        curriculo_conteudo,
        criado_em
      FROM banco_empregos_candidatos
      WHERE id = ${id}
      LIMIT 1
    `);
        const registro = rows[0];
        if (!registro) {
            throw new AppError("Candidato nao encontrado apos criacao.", 500);
        }
        return registro;
    }
    async removerCandidato(id) {
        await this.garantirEstrutura();
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM banco_empregos_candidatos
      WHERE id = ${id}
    `);
    }
}
