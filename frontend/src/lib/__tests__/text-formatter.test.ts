import { describe, expect, it } from "vitest";
import {
  formatarEndereco,
  formatarNomeInstituicao,
  formatarNomePessoa,
  formatarTextoCurto,
  formatarTextoPorCampo,
  normalizarEspacos
} from "../text-formatter";
import { mapaCamposTextoBeneficiarioForm } from "../text-format-config";

describe("text-formatter", () => {
  it("normaliza nomes de pessoa", () => {
    expect(formatarNomePessoa("ADRIANO DA SILVA OLIVEIRA")).toBe("Adriano da Silva Oliveira");
    expect(formatarNomePessoa("maria de souza lima")).toBe("Maria de Souza Lima");
    expect(formatarNomePessoa("  JOSE   DOS   SANTOS")).toBe("Jose dos Santos");
  });

  it("normaliza endereco e instituicao", () => {
    expect(formatarEndereco("RUA DAS FLORES")).toBe("Rua das Flores");
    expect(formatarEndereco("AVENIDA JOAO PESSOA")).toBe("Avenida Joao Pessoa");
    expect(formatarNomeInstituicao("PREFEITURA MUNICIPAL DE UBERLANDIA")).toBe(
      "Prefeitura Municipal de Uberlandia"
    );
  });

  it("preserva siglas conhecidas", () => {
    expect(formatarNomeInstituicao("CARTEIRA SUS")).toBe("Carteira SUS");
    expect(formatarNomeInstituicao("NUMERO DO CPF")).toBe("Numero do CPF");
    expect(formatarNomeInstituicao("ATENDIMENTO NO CRAS")).toBe("Atendimento no CRAS");
  });

  it("nao altera campos tecnicos", () => {
    const mapaTeste = {
      email: "textoCurto",
      username: "textoCurto",
      url: "textoCurto",
      cpf: "textoCurto"
    } as const;

    expect(formatarTextoPorCampo("email", "email@example.com", mapaTeste)).toBe("email@example.com");
    expect(formatarTextoPorCampo("username", "admin_master", mapaTeste)).toBe("admin_master");
    expect(formatarTextoPorCampo("url", "https://site.com.br", mapaTeste)).toBe("https://site.com.br");
    expect(formatarTextoPorCampo("cpf", "12345678900", mapaTeste)).toBe("12345678900");
  });

  it("normaliza espacos e casos especiais", () => {
    expect(normalizarEspacos("  ADRIANO   DA   SILVA  ")).toBe("ADRIANO DA SILVA");
    expect(formatarNomePessoa("JOAO PAULO II")).toBe("Joao Paulo II");
    expect(formatarEndereco("SALA 02 BLOCO A")).toBe("Sala 02 Bloco A");
  });

  it("nao força title case em texto livre complexo", () => {
    const texto = "OBSERVACAO GERAL: manter protocolo interno e URL https://site.com.br para auditoria.";
    expect(formatarTextoCurto(texto)).toBe(texto);
  });

  it("aplica mapa de normalizacao no payload de beneficiario", () => {
    const entrada = {
      nome_completo: "  MARIA   DE   SOUZA LIMA ",
      nome_mae: " ANA   DOS SANTOS ",
      logradouro: " RUA DAS FLORES ",
      email: "email@example.com",
      cpf: "12345678900"
    };

    const nome = formatarTextoPorCampo(
      "nome_completo",
      entrada.nome_completo,
      mapaCamposTextoBeneficiarioForm
    );
    const mae = formatarTextoPorCampo("nome_mae", entrada.nome_mae, mapaCamposTextoBeneficiarioForm);
    const logradouro = formatarTextoPorCampo(
      "logradouro",
      entrada.logradouro,
      mapaCamposTextoBeneficiarioForm
    );
    const email = formatarTextoPorCampo("email", entrada.email, mapaCamposTextoBeneficiarioForm);
    const cpf = formatarTextoPorCampo("cpf", entrada.cpf, mapaCamposTextoBeneficiarioForm);

    expect(nome).toBe("Maria de Souza Lima");
    expect(mae).toBe("Ana dos Santos");
    expect(logradouro).toBe("Rua das Flores");
    expect(email).toBe("email@example.com");
    expect(cpf).toBe("12345678900");
  });
});
