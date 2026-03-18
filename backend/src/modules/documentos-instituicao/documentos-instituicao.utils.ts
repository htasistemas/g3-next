import { trimOrUndefined } from "../../utils/string-utils.js";
import { extrairExtensao, mimeToExt } from "../arquivos/services/storage-utils.js";

type TipoAnexoInput = {
  tipo?: string | null;
  nomeArquivo?: string | null;
  tipoMime?: string | null;
};

export function normalizarTipoAnexoDocumento(input: TipoAnexoInput) {
  const extensao =
    extrairExtensao(input.nomeArquivo) ??
    mimeToExt(input.tipoMime) ??
    mimeToExt(input.tipo);

  if (extensao) {
    return extensao.toUpperCase().slice(0, 30);
  }

  const valorBase = trimOrUndefined(input.tipo) ?? trimOrUndefined(input.tipoMime) ?? "Arquivo";
  const valorNormalizado = valorBase
    .replace(/^(application|image|text|audio|video)\//i, "")
    .replace(/[\s./_-]+/g, " ")
    .replace(/[^a-zA-Z0-9 ]+/g, "")
    .trim();

  return (valorNormalizado || "Arquivo").slice(0, 30);
}
