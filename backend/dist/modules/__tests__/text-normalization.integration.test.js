import assert from "node:assert/strict";
import test from "node:test";
import { mapBeneficiarioToResponse } from "../beneficiarios/beneficiario.mapper.js";
import { BeneficiarioService } from "../beneficiarios/services/beneficiario.service.js";
import { FamiliaService } from "../familias/services/familia.service.js";
import { UnidadeAssistencialService } from "../unidades-assistenciais/services/unidade-assistencial.service.js";
import { unidadeAssistencialInputSchema } from "../unidades-assistenciais/unidade-assistencial.schema.js";
test("BeneficiarioService normaliza payload textual antes de persistir", () => {
    const service = new BeneficiarioService();
    const normalizado = service.normalizarPayload({
        nome_completo: "  ADRIANO   DA   SILVA OLIVEIRA  ",
        nome_mae: "MARIA DE SOUZA LIMA",
        logradouro: "RUA DAS FLORES",
        observacoes: "ATENDIMENTO NO CRAS",
        email: "email@example.com",
        cpf: "12345678900",
        documentos_obrigatorios: [{ nome: "CARTEIRA SUS", numeroDocumento: "  123  " }]
    });
    assert.equal(normalizado.nome_completo, "Adriano da Silva Oliveira");
    assert.equal(normalizado.nome_mae, "Maria de Souza Lima");
    assert.equal(normalizado.logradouro, "Rua das Flores");
    assert.equal(normalizado.observacoes, "Atendimento no CRAS");
    assert.equal(normalizado.email, "email@example.com");
    assert.equal(normalizado.cpf, "12345678900");
    assert.equal(normalizado.documentos_obrigatorios[0].nome, "Carteira SUS");
    assert.equal(normalizado.documentos_obrigatorios[0].numeroDocumento, "  123  ");
});
test("FamiliaService normaliza familia e membros", () => {
    const service = new FamiliaService();
    const normalizado = service.normalizarPayload({
        nome_familia: "SECRETARIA DE ASSISTENCIA SOCIAL",
        municipio: "UBERLANDIA",
        tecnico_responsavel: "JOSE DOS SANTOS",
        observacoes: "ATENDIMENTO NO CRAS",
        membros: [
            {
                parentesco: "RESPONSAVEL FAMILIAR",
                observacoes: "MORA NA RUA DAS FLORES"
            }
        ]
    });
    assert.equal(normalizado.nome_familia, "Secretaria de Assistencia Social");
    assert.equal(normalizado.municipio, "Uberlandia");
    assert.equal(normalizado.tecnico_responsavel, "Jose dos Santos");
    assert.equal(normalizado.observacoes, "Atendimento no CRAS");
    assert.equal(normalizado.membros[0].parentesco, "Responsavel Familiar");
    assert.equal(normalizado.membros[0].observacoes, "Mora na Rua das Flores");
});
test("UnidadeAssistencialService normaliza unidade e diretoria", () => {
    const service = new UnidadeAssistencialService();
    const normalizado = service.normalizarPayload({
        nome_fantasia: "ASSOCIACAO BENEFICENTE VIDA NOVA",
        razao_social: "PREFEITURA MUNICIPAL DE UBERLANDIA",
        bairro: "JARDIM BRASIL",
        observacoes: "ATENDIMENTO NO CRAS",
        diretoria: [
            {
                nome_completo: "MARIA DE SOUZA LIMA",
                funcao: "SECRETARIA DE ASSISTENCIA SOCIAL"
            }
        ]
    });
    assert.equal(normalizado.nome_fantasia, "Associacao Beneficente Vida Nova");
    assert.equal(normalizado.razao_social, "Prefeitura Municipal de Uberlandia");
    assert.equal(normalizado.bairro, "Jardim Brasil");
    assert.equal(normalizado.observacoes, "Atendimento no CRAS");
    assert.equal(normalizado.diretoria[0].nome_completo, "Maria de Souza Lima");
    assert.equal(normalizado.diretoria[0].funcao, "Secretaria de Assistencia Social");
});
test("unidadeAssistencialInputSchema preserva capacidade das salas", () => {
    const parsed = unidadeAssistencialInputSchema.parse({
        nome_fantasia: "Escola teste",
        tipo_unidade: "ENSINO",
        salas: [
            {
                nome: "Sala 01",
                capacidade_maxima: "30",
                ativo: "true"
            }
        ]
    });
    assert.equal(parsed.salas?.[0]?.capacidade_maxima, 30);
    assert.equal(parsed.salas?.[0]?.ativo, true);
});
test("mapBeneficiarioToResponse formata nomes legados em caixa alta", () => {
    const response = mapBeneficiarioToResponse({
        id: 1n,
        codigo: "0001",
        nomeCompleto: "MARIA DE SOUZA LIMA",
        nomeSocial: "MARIA DA PAZ",
        apelido: "MARIINHA",
        dataNascimento: new Date("1990-01-02T00:00:00.000Z"),
        foto3x4: null,
        sexoBiologico: null,
        identidadeGenero: null,
        corRaca: null,
        estadoCivil: null,
        nacionalidade: null,
        naturalidadeCidade: null,
        naturalidadeUf: null,
        nomeMae: "ANA DOS SANTOS",
        nomePai: "JOAO DE LIMA",
        status: "ATIVO",
        optaReceberCestaBasica: null,
        aptoReceberCestaBasica: null,
        enderecoId: null,
        criadoEm: new Date("2026-03-18T12:00:00.000Z"),
        atualizadoEm: new Date("2026-03-18T12:00:00.000Z"),
        endereco: null,
        contatos: [
            {
                telefonePrincipal: null,
                telefonePrincipalWhatsapp: null,
                telefoneSecundario: null,
                telefoneRecadoNome: "CARLOS DOS ANJOS",
                telefoneRecadoNumero: null,
                email: null,
                permiteContatoTel: null,
                permiteContatoWhatsapp: null,
                permiteContatoSms: null,
                permiteContatoEmail: null,
                horarioPreferencial: null
            }
        ],
        documentos: [],
        situacoesSociais: [],
        escolaridades: [],
        saudes: [],
        beneficios: [],
        observacoes: [],
        familiasReferencia: [],
        familiasMembro: []
    });
    assert.equal(response.nome_completo, "Maria de Souza Lima");
    assert.equal(response.nome_social, "Maria da Paz");
    assert.equal(response.apelido, "Mariinha");
    assert.equal(response.nome_mae, "Ana dos Santos");
    assert.equal(response.nome_pai, "Joao de Lima");
    assert.equal(response.telefone_recado_nome, "Carlos dos Anjos");
});
