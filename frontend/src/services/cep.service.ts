import { somenteDigitos } from "@/lib/validators";

export type EnderecoPorCep = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
};

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

export async function buscarEnderecoPorCep(cepInformado: string): Promise<EnderecoPorCep | null> {
  const cep = somenteDigitos(cepInformado);
  if (cep.length !== 8) {
    return null;
  }

  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
    method: "GET"
  });

  if (!response.ok) {
    throw new Error("Não foi possível consultar o CEP informado.");
  }

  const data = (await response.json()) as ViaCepResponse;
  if (data.erro) {
    return null;
  }

  return {
    cep: somenteDigitos(data.cep),
    logradouro: data.logradouro?.trim() ?? "",
    complemento: data.complemento?.trim() ?? "",
    bairro: data.bairro?.trim() ?? "",
    municipio: data.localidade?.trim() ?? "",
    uf: data.uf?.trim() ?? ""
  };
}
