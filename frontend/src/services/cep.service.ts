import { somenteDigitos } from "@/lib/validators";
import { httpClient } from "./http-client";

export type EnderecoPorCep = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
};

export type SugestaoZonaSubzona = {
  zona?: string;
  subzona?: string;
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

export async function buscarSugestaoZonaSubzona(
  municipio?: string,
  bairro?: string
): Promise<SugestaoZonaSubzona | null> {
  const municipioNormalizado = municipio?.trim();
  if (!municipioNormalizado) {
    return null;
  }

  const { data } = await httpClient.get<{ sugestao: SugestaoZonaSubzona | null }>(
    "/api/beneficiarios/sugestao-endereco",
    {
      params: {
        municipio: municipioNormalizado,
        bairro: bairro?.trim() || undefined
      }
    }
  );

  return data.sugestao ?? null;
}
