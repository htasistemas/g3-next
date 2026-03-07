import assert from "node:assert/strict";
import test from "node:test";
import { BeneficiarioService } from "../beneficiarios/services/beneficiario.service.js";
import { FamiliaService } from "../familias/services/familia.service.js";
import { UnidadeAssistencialService } from "../unidades-assistenciais/services/unidade-assistencial.service.js";

test("BeneficiarioService normaliza payload textual antes de persistir", () => {
  const service = new BeneficiarioService() as any;
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
  const service = new FamiliaService() as any;
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
  const service = new UnidadeAssistencialService() as any;
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
