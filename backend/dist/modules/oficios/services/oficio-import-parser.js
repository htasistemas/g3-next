import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { pdf } from "pdf-to-img";
import sharp from "sharp";
import Tesseract from "tesseract.js";
import { AppError } from "../../../shared/errors/app-error.js";
const MESES_PT_BR = {
    janeiro: "01",
    fevereiro: "02",
    marco: "03",
    março: "03",
    abril: "04",
    maio: "05",
    junho: "06",
    julho: "07",
    agosto: "08",
    setembro: "09",
    outubro: "10",
    novembro: "11",
    dezembro: "12"
};
const PREFIXOS_TRATAMENTO = [
    "Exmo. Sr.",
    "Exma. Sra.",
    "Exmo. Sra.",
    "Exma. Sr.",
    "Exmo.",
    "Exma.",
    "Ilmo. Sr.",
    "Ilma. Sra.",
    "Ilmo.",
    "Ilma.",
    "Ao Senhor",
    "A Senhora",
    "À Senhora",
    "Prezado Sr.",
    "Prezada Sra.",
    "Prezado",
    "Prezada",
    "Sr.",
    "Sra.",
    "Dr.",
    "Dra."
];
const FECHAMENTOS_PADRAO = [
    /^sem outro particular/i,
    /^sem mais/i,
    /^sendo o que se apresenta/i,
    /^atenciosamente/i,
    /^cordialmente/i,
    /^respeitosamente/i
];
const ROTULOS_COMPLEMENTARES = [
    { aliases: ["denominacao do evento"], rotulo: "Denominação do evento" },
    { aliases: ["estimativa de publico"], rotulo: "Estimativa de público" },
    { aliases: ["cronograma"], rotulo: "Cronograma" },
    {
        aliases: ["datas e horarios", "data e horario", "datas e horario", "data e horarios"],
        rotulo: "Datas e horários"
    }
];
const TERMOS_RODAPE_INSTITUCIONAL = [
    "associacao",
    "associação",
    "fundacao",
    "fundação",
    "instituicao",
    "instituição",
    "instituto",
    "secretaria",
    "prefeitura",
    "governo",
    "ministerio",
    "ministério",
    "hospital",
    "igreja",
    "adra"
];
const TERMOS_ENDERECO_RODAPE = [
    "rua",
    "avenida",
    "av.",
    "travessa",
    "alameda",
    "praca",
    "praça",
    "rodovia",
    "bairro",
    "quadra",
    "lote",
    "bloco",
    "sala"
];
const OCR_CACHE_DIR = path.resolve(process.cwd(), "storage", "geral", "outros", "ocr-cache");
const OCR_MAX_PAGINAS = 5;
const PDF_TEXTO_UTIL_MINIMO = 80;
let ocrWorkerPromise;
let filaOcr = Promise.resolve();
function normalizarBusca(valor) {
    return (valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}
function normalizarTextoDocumento(valor) {
    return (valor ?? "")
        .replace(/\u00a0/g, " ")
        .replace(/\r/g, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
function limparMarcadoresPagina(valor) {
    return normalizarTextoDocumento(valor)
        .replace(/(?:^|\n)--\s*\d+\s+of\s+\d+\s*--(?:\n|$)/gi, "\n")
        .replace(/(?:^|\n)\d+\s*(?:\n|$)/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
function tamanhoTextoUtil(valor) {
    return limparMarcadoresPagina(valor).replace(/\s+/g, "").length;
}
function quebrarLinhas(texto) {
    return normalizarTextoDocumento(texto)
        .split("\n")
        .map((item) => item.replace(/[ \t]+/g, " ").trim())
        .filter(Boolean)
        .map((item) => ({
        raw: item,
        normalized: normalizarBusca(item)
    }));
}
function quebrarParagrafos(texto) {
    return normalizarTextoDocumento(texto)
        .split(/\n{2,}/)
        .map((item) => item.replace(/\n+/g, " ").replace(/\s+/g, " ").trim())
        .filter(Boolean);
}
function extrairExtensao(nomeArquivo) {
    const correspondencia = nomeArquivo.toLowerCase().match(/\.([a-z0-9]+)$/i);
    return correspondencia?.[1] ?? "";
}
function parseDataIso(valor) {
    const texto = valor?.trim();
    if (!texto)
        return undefined;
    const matchNumerico = texto.match(/\b(\d{2})[\/\-](\d{2})[\/\-](\d{4})\b/);
    if (matchNumerico) {
        const [, dia, mes, ano] = matchNumerico;
        return `${ano}-${mes}-${dia}`;
    }
    const matchExtenso = texto.match(/\b(\d{1,2})\s+de\s+([a-zçãõáéíóú]+)\s+de\s+(\d{4})\b/i);
    if (!matchExtenso) {
        return undefined;
    }
    const [, diaBruto, mesBruto, ano] = matchExtenso;
    const mes = MESES_PT_BR[normalizarBusca(mesBruto)];
    if (!mes) {
        return undefined;
    }
    return `${ano}-${mes}-${diaBruto.padStart(2, "0")}`;
}
function extrairNumeroOficio(linhas) {
    const linha = linhas.find((item) => item.normalized.includes("oficio"));
    if (!linha)
        return undefined;
    const match = linha.raw.match(/of[ií]cio\s*(?:n[ºo°.]?\s*)?(.+)/i) ??
        linha.raw.match(/n[ºo°.]?\s*(.+)/i);
    return match?.[1]?.trim() || undefined;
}
function extrairCidadeUfEData(linhas) {
    for (const linha of linhas.slice(0, 6)) {
        const partes = linha.raw.split(",");
        if (partes.length < 2) {
            continue;
        }
        const dataIso = parseDataIso(partes.slice(1).join(","));
        if (!dataIso) {
            continue;
        }
        return {
            cidadeUf: partes[0]?.trim() || undefined,
            dataIso
        };
    }
    return {
        cidadeUf: undefined,
        dataIso: undefined
    };
}
function extrairTratamentoENome(valor) {
    const texto = valor?.trim();
    if (!texto) {
        return { saudacao: undefined, para: undefined };
    }
    const prefixo = PREFIXOS_TRATAMENTO.find((item) => normalizarBusca(texto).startsWith(normalizarBusca(item)));
    if (!prefixo) {
        return { saudacao: undefined, para: texto };
    }
    const para = texto.slice(prefixo.length).trim();
    return {
        saudacao: prefixo,
        para: para || undefined
    };
}
function extrairValorPorRotulo(linhas, rotulos) {
    const rotulosNormalizados = rotulos.map((item) => normalizarBusca(item));
    for (const linha of linhas) {
        const separador = linha.raw.search(/[:\-]/);
        if (separador <= 0) {
            continue;
        }
        const chave = normalizarBusca(linha.raw.slice(0, separador));
        if (!rotulosNormalizados.includes(chave)) {
            continue;
        }
        const valor = linha.raw.slice(separador + 1).trim();
        if (valor) {
            return valor;
        }
    }
    return undefined;
}
function ehLinhaRodape(valor) {
    const texto = normalizarBusca(valor);
    if (!texto)
        return false;
    return (texto.startsWith("cnpj") ||
        texto.startsWith("cep") ||
        texto.startsWith("telefone") ||
        texto.startsWith("tel") ||
        texto.startsWith("site") ||
        texto.startsWith("e-mail") ||
        texto.startsWith("email") ||
        texto.includes("http://") ||
        texto.includes("https://") ||
        texto.includes("www.") ||
        (texto.includes("@") && !texto.includes("assunto")));
}
function ehLinhaEnderecoRodape(valor) {
    const texto = normalizarBusca(valor);
    if (!texto)
        return false;
    return TERMOS_ENDERECO_RODAPE.some((termo) => texto.includes(termo));
}
function pareceLinhaInstitucionalRodape(valor) {
    const texto = normalizarBusca(valor);
    if (!texto)
        return false;
    return (texto.startsWith("unidade ") ||
        texto.startsWith("unidade assistencial") ||
        texto.startsWith("nucleo") ||
        texto.startsWith("núcleo") ||
        TERMOS_RODAPE_INSTITUCIONAL.some((termo) => texto.includes(termo)));
}
function ehSiglaInstitucionalCurta(valor) {
    const texto = (valor ?? "").trim();
    if (!texto || texto.length > 30)
        return false;
    return /^[A-Z0-9.&/\- ]+$/.test(texto) && texto.split(/\s+/).length <= 4;
}
function ehLinhaAssinaturaDecorativa(valor) {
    const texto = (valor ?? "").trim();
    return /^[_\-=\s]{3,}$/.test(texto);
}
function pareceNomePessoa(valor) {
    const texto = (valor ?? "").trim();
    if (!texto || texto.length < 6 || texto.length > 80)
        return false;
    if (/[,:;]/.test(texto) || /\d/.test(texto))
        return false;
    const palavras = texto.split(/\s+/).filter(Boolean);
    if (palavras.length < 2 || palavras.length > 6)
        return false;
    const textoNormalizado = normalizarBusca(texto);
    if (/(secretari|diretor|coordenador|assistente|supervisor|presidente|prefeito|gerente|procurador|assessor|tecnic|analista|professor|psicolog|enfermeir)/.test(textoNormalizado)) {
        return false;
    }
    const palavrasComLetras = palavras.filter((item) => /[A-Za-zÀ-ÿ]/.test(item));
    return palavrasComLetras.length >= 2;
}
function pareceCargoAssinatura(valor) {
    const texto = normalizarBusca(valor);
    if (!texto || texto.length < 6)
        return false;
    if (/\d{4,}/.test(texto))
        return false;
    return /(secretari|diretor|coordenador|assistente|supervisor|presidente|prefeito|gerente|procurador|assessor|tecnic|analista|professor|psicolog|enfermeir|desenvolvimento social|cidadania)/.test(texto);
}
function encontrarInicioRodape(linhas) {
    const inicioJanela = Math.max(linhas.length - 12, 0);
    const candidatos = linhas
        .map((item, index) => ({ item, index }))
        .filter(({ item, index }) => index >= inicioJanela && (ehLinhaRodape(item.raw) || ehLinhaEnderecoRodape(item.raw)))
        .map(({ index }) => index);
    if (!candidatos.length) {
        return linhas.length;
    }
    let indice = Math.min(...candidatos);
    while (indice > inicioJanela) {
        const anterior = linhas[indice - 1]?.raw;
        const atual = linhas[indice]?.raw;
        if (pareceLinhaInstitucionalRodape(anterior) ||
            (ehSiglaInstitucionalCurta(anterior) &&
                (pareceLinhaInstitucionalRodape(atual) || ehLinhaRodape(atual) || ehLinhaEnderecoRodape(atual)))) {
            indice -= 1;
            continue;
        }
        break;
    }
    return indice;
}
function extrairAssinatura(bloco) {
    const candidatos = bloco
        .map((raw, index) => ({ raw: raw.trim(), index }))
        .filter(({ raw }) => {
        if (!raw)
            return false;
        if (ehLinhaAssinaturaDecorativa(raw))
            return false;
        if (ehLinhaRodape(raw) || ehLinhaEnderecoRodape(raw) || pareceLinhaInstitucionalRodape(raw))
            return false;
        if (FECHAMENTOS_PADRAO.some((regex) => regex.test(raw)))
            return false;
        return true;
    });
    for (let index = candidatos.length - 1; index >= 1; index -= 1) {
        const cargo = candidatos[index];
        const nome = candidatos[index - 1];
        if (pareceCargoAssinatura(cargo?.raw) && pareceNomePessoa(nome?.raw)) {
            return {
                assinaturaNome: nome.raw,
                assinaturaCargo: cargo.raw,
                indicesSelecionados: [nome.index, cargo.index]
            };
        }
    }
    const selecionados = candidatos.slice(-2);
    return {
        assinaturaNome: selecionados[0]?.raw,
        assinaturaCargo: selecionados.length >= 2 ? selecionados[1]?.raw : undefined,
        indicesSelecionados: selecionados.map((item) => item.index)
    };
}
function juntarLinhasComoParagrafos(linhas) {
    const paragrafos = [];
    let atual = "";
    for (const linha of linhas) {
        if (!atual) {
            atual = linha;
            continue;
        }
        const encerraParagrafo = /[.!?:;]$/.test(atual);
        const proximoPareceBloco = /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9]/.test(linha);
        if (encerraParagrafo && proximoPareceBloco) {
            paragrafos.push(atual.trim());
            atual = linha;
            continue;
        }
        atual = `${atual} ${linha}`.replace(/\s+/g, " ").trim();
    }
    if (atual) {
        paragrafos.push(atual.trim());
    }
    return paragrafos.join("\n\n");
}
function extrairComplementares(bloco) {
    const campos = [];
    const linhasConsumidas = new Set();
    for (let index = 0; index < bloco.length; index += 1) {
        const linha = bloco[index];
        const separador = linha.raw.indexOf(":");
        if (separador <= 0) {
            continue;
        }
        const chave = normalizarBusca(linha.raw.slice(0, separador));
        const configuracao = ROTULOS_COMPLEMENTARES.find((item) => item.aliases.includes(chave));
        if (!configuracao || campos.some((item) => item.rotulo === configuracao.rotulo)) {
            continue;
        }
        let valor = linha.raw.slice(separador + 1).trim();
        if (!valor && bloco[index + 1] && !bloco[index + 1]?.raw.includes(":")) {
            valor = bloco[index + 1]?.raw.trim() ?? "";
            linhasConsumidas.add(index + 1);
        }
        if (!valor) {
            continue;
        }
        campos.push({ rotulo: configuracao.rotulo, valor });
        linhasConsumidas.add(index);
    }
    return { campos, linhasConsumidas };
}
async function executarOcrSerial(tarefa) {
    const execucao = filaOcr.then(tarefa, tarefa);
    filaOcr = execucao.then(() => undefined, () => undefined);
    return execucao;
}
async function obterWorkerOcr() {
    if (!ocrWorkerPromise) {
        ocrWorkerPromise = (async () => {
            await fs.mkdir(OCR_CACHE_DIR, { recursive: true });
            const worker = await Tesseract.createWorker("por+eng", 1, {
                cachePath: OCR_CACHE_DIR
            });
            await worker.setParameters({
                preserve_interword_spaces: "1"
            });
            return worker;
        })();
    }
    return ocrWorkerPromise;
}
async function silenciarAvisosPdf(tarefa) {
    const consoleWarnOriginal = console.warn;
    console.warn = (...args) => {
        const mensagem = typeof args[0] === "string" ? args[0] : "";
        if (mensagem.includes("decodeScan - unexpected MCU data")) {
            return;
        }
        consoleWarnOriginal(...args);
    };
    try {
        return await tarefa();
    }
    finally {
        console.warn = consoleWarnOriginal;
    }
}
async function prepararImagemParaOcr(buffer) {
    return sharp(buffer)
        .grayscale()
        .normalize()
        .sharpen()
        .png()
        .toBuffer();
}
async function extrairTextoPdfPorOcr(arquivo) {
    const avisos = [
        "O PDF foi lido por OCR porque o conteudo veio escaneado ou com pouco texto selecionavel. Revise os campos antes de salvar."
    ];
    const documento = await silenciarAvisosPdf(() => pdf(arquivo.buffer, { scale: 3 }));
    const totalPaginas = documento.length;
    const paginasProcessadas = Math.min(totalPaginas, OCR_MAX_PAGINAS);
    if (totalPaginas > OCR_MAX_PAGINAS) {
        avisos.push(`O OCR processou as ${OCR_MAX_PAGINAS} primeiras paginas de ${totalPaginas}. Revise se o oficio continua depois disso.`);
    }
    const worker = await obterWorkerOcr();
    const partes = [];
    for (let pagina = 1; pagina <= paginasProcessadas; pagina += 1) {
        const imagemPagina = await silenciarAvisosPdf(() => documento.getPage(pagina));
        const imagemPreparada = await prepararImagemParaOcr(imagemPagina);
        const resultado = await executarOcrSerial(() => worker.recognize(imagemPreparada, { rotateAuto: true }));
        const textoPagina = limparMarcadoresPagina(resultado.data.text ?? "");
        if (textoPagina) {
            partes.push(textoPagina);
            if (paginaConcluiDocumento(textoPagina)) {
                break;
            }
        }
    }
    return {
        texto: normalizarTextoDocumento(partes.join("\n\n")),
        avisos
    };
}
async function extrairTextoArquivo(arquivo) {
    const extensao = extrairExtensao(arquivo.nomeArquivo);
    if (arquivo.tipoMime === "application/pdf" || extensao === "pdf") {
        const parser = new PDFParse({ data: new Uint8Array(arquivo.buffer) });
        try {
            const resultado = await parser.getText();
            const textoPdf = limparMarcadoresPagina(resultado.text ?? "");
            if (tamanhoTextoUtil(textoPdf) >= PDF_TEXTO_UTIL_MINIMO) {
                return {
                    texto: textoPdf,
                    avisos: []
                };
            }
            try {
                const ocr = await extrairTextoPdfPorOcr(arquivo);
                if (tamanhoTextoUtil(ocr.texto) > tamanhoTextoUtil(textoPdf)) {
                    return {
                        texto: ocr.texto,
                        avisos: ocr.avisos
                    };
                }
                return {
                    texto: textoPdf,
                    avisos: [
                        "O PDF tem pouco texto selecionavel e o OCR nao conseguiu melhorar a leitura. Revise os campos importados.",
                        ...ocr.avisos
                    ]
                };
            }
            catch {
                return {
                    texto: textoPdf,
                    avisos: [
                        "O PDF parece escaneado e o OCR nao conseguiu concluir a leitura automatica. Revise os campos importados."
                    ]
                };
            }
        }
        finally {
            await parser.destroy();
        }
    }
    if (arquivo.tipoMime ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        extensao === "docx") {
        const resultado = await mammoth.extractRawText({ buffer: arquivo.buffer });
        return {
            texto: normalizarTextoDocumento(resultado.value ?? ""),
            avisos: (resultado.messages ?? []).map((item) => item.message).filter(Boolean)
        };
    }
    if (arquivo.tipoMime === "application/msword" || extensao === "doc") {
        throw new AppError("Arquivo Word antigo (.doc) ainda nao suportado. Salve como .docx e envie novamente.", 400);
    }
    throw new AppError("Envie um arquivo PDF ou Word (.docx).", 400);
}
function extrairAssunto(linhas) {
    for (let index = 0; index < linhas.length; index += 1) {
        const linha = linhas[index]?.raw ?? "";
        if (!/\bassunto\b/i.test(linha)) {
            continue;
        }
        const linhaSemRotulo = linha.replace(/^.*?\bassunto\b\s*[:\-]?\s*/i, "").trim();
        if (linhaSemRotulo) {
            return {
                indexAssunto: index,
                assunto: linhaSemRotulo,
                indiceInicioCorpo: index + 1
            };
        }
        const proximaLinha = linhas[index + 1]?.raw?.trim() ?? "";
        if (proximaLinha) {
            return {
                indexAssunto: index,
                assunto: proximaLinha,
                indiceInicioCorpo: index + 2
            };
        }
        return {
            indexAssunto: index,
            assunto: undefined,
            indiceInicioCorpo: index + 1
        };
    }
    return {
        indexAssunto: -1,
        assunto: undefined,
        indiceInicioCorpo: 0
    };
}
function inferirAssuntoPeloCorpo(linhasCorpo) {
    const linhasFiltradas = linhasCorpo
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => item.length >= 10)
        .filter((item) => !/^(de|para)\s*:/i.test(item))
        .filter((item) => !/^(of[ií]cio|comunica[cç][aã]o interna)\b/i.test(item))
        .filter((item) => !/(prefeitura|desenvolvimento|social e cidadania)$/i.test(item))
        .filter((item) => !/^[A-ZÀ-Ý\s]{8,}$/.test(item));
    const indiceBase = Math.max(0, linhasFiltradas.findIndex((item) => /(venho|encaminh|solicit|inform|comunico|requer)/i.test(item)));
    const linhaBase = linhasFiltradas.slice(indiceBase, indiceBase + 3).join(" ").trim() || linhasFiltradas[0];
    if (!linhaBase) {
        return undefined;
    }
    const semIntroducao = linhaBase
        .replace(/^cumprimentando[^,]*,\s*/i, "")
        .replace(/^venho\s+por\s+meio\s+deste,\s*/i, "")
        .replace(/^venho\s+por\s+meio\s+do\s+presente,\s*/i, "")
        .trim();
    const primeiraFrase = semIntroducao.split(/(?<=[.!?;])\s+/)[0]?.trim() || semIntroducao;
    const assunto = primeiraFrase.replace(/\s+/g, " ").trim();
    if (assunto.length < 20) {
        return undefined;
    }
    return assunto.slice(0, 180).trim();
}
function paginaConcluiDocumento(textoPagina) {
    const linhas = quebrarLinhas(textoPagina);
    const indiceFechamento = linhas.findIndex((item) => FECHAMENTOS_PADRAO.some((regex) => regex.test(item.raw)));
    if (indiceFechamento < 0) {
        return false;
    }
    const posteriores = linhas.slice(indiceFechamento + 1).map((item) => item.raw);
    return posteriores.some((item) => pareceCargoAssinatura(item)) && posteriores.some((item) => pareceNomePessoa(item));
}
export class OficioImportParser {
    async importar(arquivo) {
        if (!arquivo?.buffer?.length) {
            throw new AppError("Selecione um arquivo Word ou PDF para importar.", 400);
        }
        const extraido = await extrairTextoArquivo(arquivo);
        const avisos = [...extraido.avisos];
        const texto = extraido.texto;
        if (!texto) {
            throw new AppError("Nao foi possivel ler texto util do arquivo enviado. Verifique se o PDF possui texto selecionavel.", 400);
        }
        if ((arquivo.tipoMime === "application/pdf" || extrairExtensao(arquivo.nomeArquivo) === "pdf") &&
            texto.replace(/\s+/g, "").length < 80) {
            avisos.push("O PDF parece conter pouco texto. Se for arquivo escaneado, a leitura pode ficar incompleta.");
        }
        const linhas = quebrarLinhas(texto);
        const numeroOficio = extrairNumeroOficio(linhas);
        const { cidadeUf, dataIso } = extrairCidadeUfEData(linhas);
        const assuntoExtraido = extrairAssunto(linhas);
        const indexAssunto = assuntoExtraido.indexAssunto;
        const assunto = assuntoExtraido.assunto;
        let indiceInicioCorpo = assuntoExtraido.indiceInicioCorpo;
        const indicesCabecalho = [
            numeroOficio
                ? linhas.findIndex((item) => normalizarBusca(item.raw).includes(normalizarBusca(numeroOficio)))
                : -1,
            cidadeUf
                ? linhas.findIndex((item) => normalizarBusca(item.raw).includes(normalizarBusca(cidadeUf)))
                : -1
        ].filter((item) => item >= 0);
        const maiorCabecalho = indicesCabecalho.length ? Math.max(...indicesCabecalho) : -1;
        const blocoDestinatario = linhas
            .slice(maiorCabecalho + 1, indexAssunto >= 0 ? indexAssunto : maiorCabecalho + 4)
            .filter((item) => !item.normalized.startsWith("assunto"))
            .slice(0, 3);
        const destinatarioRotulo = extrairValorPorRotulo(linhas, ["para", "destinatario", "destinatário"]);
        const destinatarioInstituicaoBruto = blocoDestinatario[0]?.raw?.trim() || undefined;
        const destinatarioInstituicao = destinatarioInstituicaoBruto && destinatarioInstituicaoBruto.length >= 4
            ? destinatarioInstituicaoBruto
            : destinatarioRotulo;
        const tratamentoNome = extrairTratamentoENome(blocoDestinatario[1]?.raw);
        const destinatarioCargo = blocoDestinatario[2]?.raw?.trim() || undefined;
        const indiceFimRodape = encontrarInicioRodape(linhas);
        let indiceFechamento = -1;
        for (let index = indiceFimRodape - 1; index >= indiceInicioCorpo; index -= 1) {
            if (FECHAMENTOS_PADRAO.some((regex) => regex.test(linhas[index]?.raw ?? ""))) {
                indiceFechamento = index;
            }
        }
        const blocoCorpo = linhas.slice(indiceInicioCorpo, indiceFechamento >= 0 ? indiceFechamento : indiceFimRodape);
        const complementares = extrairComplementares(blocoCorpo);
        const linhasCorpo = blocoCorpo
            .filter((_, index) => !complementares.linhasConsumidas.has(index))
            .map((item) => item.raw);
        const blocoAssinaturaBruto = indiceFechamento >= 0 ? linhas.slice(indiceFechamento + 1, indiceFimRodape).map((item) => item.raw) : [];
        const assinatura = extrairAssinatura(blocoAssinaturaBruto);
        const indicesAssinatura = new Set(assinatura.indicesSelecionados);
        const fechamentoLinhas = indiceFechamento >= 0
            ? [
                linhas[indiceFechamento]?.raw,
                ...blocoAssinaturaBruto.filter((item, index) => !indicesAssinatura.has(index) &&
                    !ehLinhaAssinaturaDecorativa(item) &&
                    !ehLinhaRodape(item) &&
                    !ehLinhaEnderecoRodape(item) &&
                    !pareceLinhaInstitucionalRodape(item))
            ].filter(Boolean)
            : [];
        const fechamento = juntarLinhasComoParagrafos(fechamentoLinhas);
        const corpo = juntarLinhasComoParagrafos(linhasCorpo) || juntarLinhasComoParagrafos(blocoCorpo.map((item) => item.raw));
        const observacoesComplementares = complementares.campos.map((item) => `${item.rotulo}: ${item.valor}`).join("\n");
        const assuntoFinal = assunto || inferirAssuntoPeloCorpo(linhasCorpo);
        if (!assuntoFinal) {
            avisos.push("O assunto nao foi identificado com clareza. Revise esse campo apos a importacao.");
        }
        else if (!assunto) {
            avisos.push("O assunto foi inferido automaticamente a partir do texto. Revise esse campo apos a importacao.");
        }
        if (!corpo) {
            avisos.push("O corpo principal do oficio nao foi identificado com clareza. Revise a redacao apos a importacao.");
        }
        return {
            nomeArquivo: arquivo.nomeArquivo,
            tipoMime: arquivo.tipoMime,
            avisos,
            referencia: {
                numeroOficio,
                cidadeUf
            },
            conteudo: {
                identificacao: {
                    data: dataIso,
                    destinatario: destinatarioInstituicao,
                    destinatarioResponsavel: tratamentoNome.para,
                    destinatarioCargo
                },
                conteudo: {
                    razaoSocial: destinatarioInstituicao,
                    saudacao: tratamentoNome.saudacao,
                    para: tratamentoNome.para,
                    cargoPara: destinatarioCargo,
                    assunto: assuntoFinal,
                    corpo: corpo || undefined,
                    finalizacao: fechamento || undefined,
                    assinaturaNome: assinatura.assinaturaNome,
                    assinaturaCargo: assinatura.assinaturaCargo
                },
                protocolo: {
                    observacoes: observacoesComplementares || undefined
                }
            }
        };
    }
}
