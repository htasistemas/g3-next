import { isValidCep, isValidCpf, isValidPhone } from "../../utils/validators.js";
import { normalizeDigits, trimOrUndefined } from "../../utils/string-utils.js";
import { AppError } from "../../shared/errors/app-error.js";
import { beneficiarioInputSchema } from "../beneficiarios/beneficiario.schema.js";
import { BeneficiarioService } from "../beneficiarios/services/beneficiario.service.js";
import { prisma } from "../../database/prisma.js";
import { ImportacaoDadosRepository } from "./importacao-dados.repository.js";
import { lerArquivoImportacao } from "./importacao-dados.parser.js";
import type { ImportacaoLinha } from "./importacao-dados.types.js";

const CAMPOS = new Set([
  "nome_completo", "nome_social", "apelido", "data_nascimento", "foto_3x4", "sexo_biologico", "identidade_genero", "cor_raca", "estado_civil", "nacionalidade", "naturalidade_cidade", "naturalidade_uf", "nome_mae", "nome_pai", "opta_receber_cesta_basica", "apto_receber_cesta_basica", "cep", "logradouro", "numero", "complemento", "bairro", "ponto_referencia", "municipio", "uf", "latitude", "longitude", "zona", "subzona", "telefone_principal", "telefone_principal_whatsapp", "telefone_secundario", "telefone_recado_nome", "telefone_recado_numero", "email", "permite_contato_tel", "permite_contato_whatsapp", "permite_contato_sms", "permite_contato_email", "horario_preferencial_contato", "cpf", "senha_portal", "rg_numero", "rg_orgao_emissor", "rg_uf", "rg_data_emissao", "nis", "certidao_tipo", "certidao_livro", "certidao_folha", "certidao_termo", "certidao_cartorio", "certidao_municipio", "certidao_uf", "titulo_eleitor", "cnh", "cartao_sus", "mora_com_familia", "responsavel_legal", "vinculo_familiar", "situacao_vulnerabilidade", "composicao_familiar", "criancas_adolescentes", "idosos", "acompanhamento_cras", "acompanhamento_saude", "participa_comunidade", "rede_apoio", "sabe_ler_escrever", "nivel_escolaridade", "estuda_atualmente", "ocupacao", "situacao_trabalho", "local_trabalho", "renda_mensal", "fonte_renda", "possui_deficiencia", "tipo_deficiencia", "cid_principal", "usa_medicacao_continua", "descricao_medicacao", "servico_saude_referencia", "recebe_beneficio", "beneficios_descricao", "valor_total_beneficios", "beneficios_recebidos", "aceite_lgpd", "data_aceite_lgpd", "observacoes", "documentos_obrigatorios"
]);
const ALIASES: Record<string, string> = {
  nome: "nome_completo", "nome completo": "nome_completo", "nomecompleto": "nome_completo", "nome_completo": "nome_completo", "beneficiario": "nome_completo",
  cpf: "cpf", "documento": "cpf", "nascimento": "data_nascimento", "data nascimento": "data_nascimento", "datanascimento": "data_nascimento", "data_nascimento": "data_nascimento",
  mae: "nome_mae", "mãe": "nome_mae", "nome da mae": "nome_mae", "nome da mãe": "nome_mae", "nomemae": "nome_mae", "nome_mae": "nome_mae",
  telefone: "telefone_principal", "celular": "telefone_principal", "telefone principal": "telefone_principal", "telefoneprincipal": "telefone_principal", "telefone_principal": "telefone_principal",
  email: "email", "e-mail": "email", "cep": "cep", "endereco": "logradouro", "endereço": "logradouro", "logradouro": "logradouro",
  numero: "numero", "bairro": "bairro", "cidade": "municipio", "municipio": "municipio", "município": "municipio", "estado": "uf", "uf": "uf", "pais": "nacionalidade", "país": "nacionalidade", "sexo": "sexo_biologico", "sexo biologico": "sexo_biologico", "estado civil": "estado_civil", "estadocivil": "estado_civil", "cpfcnpj": "cpf", "status": "status", "aceite lgpd": "aceite_lgpd", "aceitelgpd": "aceite_lgpd", "aceite_lgpd": "aceite_lgpd"
};

function chave(valor: string) { return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[._-]+/g, " ").replace(/\s+/g, " "); }
function valorTexto(valor: unknown) { return valor === null || valor === undefined ? "" : String(valor).trim(); }
function removerAcentos(valor: unknown) {
  return typeof valor === "string" ? valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : valor;
}
function normalizarTextoImportado(dados: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(dados).map(([campo, valor]) => [campo, removerAcentos(valor)]));
}
function normalizarData(valor: unknown) {
  const texto = valorTexto(valor);
  if (!texto) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
  const br = texto.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  return texto;
}
function normalizarBool(valor: unknown) { return ["sim", "s", "true", "1", "yes"].includes(chave(valorTexto(valor))); }
function cadastroEstaCompleto(dados: Record<string, unknown>) {
  return ["nome_completo", "data_nascimento", "nome_mae", "cep", "telefone_principal", "cpf"].every((campo) => Boolean(trimOrUndefined(valorTexto(dados[campo])))) && dados.aceite_lgpd === true;
}
function sugestaoMapeamento(colunas: string[]) { return Object.fromEntries(colunas.map((coluna) => [coluna, ALIASES[chave(coluna)] ?? ""])); }
function nomeInstituicao(instituicao: { razao_social: string; nome_fantasia?: string }) { return instituicao.nome_fantasia?.trim() || instituicao.razao_social; }

export class ImportacaoDadosService {
  private readonly repository = new ImportacaoDadosRepository();
  private readonly beneficiarioService = new BeneficiarioService();

  listarInstituicoes(busca?: string) { return this.repository.listarInstituicoes(busca); }
  listarHistorico() { return this.repository.listarHistorico(); }

  async validarArquivo(input: { buffer: Buffer; nomeArquivo: string; tamanhoBytes: number; instituicaoId: string; usuarioId: string; usuarioNome: string; mapeamento?: Record<string, string> }) {
    const instituicao = await this.repository.obterInstituicao(input.instituicaoId);
    if (!instituicao) throw new AppError("Instituição de destino não encontrada.", 404);
    if (!['ativo', 'ATIVA', 'ativa'].includes(instituicao.status)) throw new AppError("A instituição de destino não está ativa.", 422);
    const parsed = lerArquivoImportacao(input.buffer, input.nomeArquivo);
    const mapeamento = input.mapeamento ?? sugestaoMapeamento(parsed.colunas);
    const linhas: ImportacaoLinha[] = [];
    const cpfsNoArquivo = new Set<string>();
    for (let index = 0; index < parsed.linhas.length; index += 1) {
      const original = parsed.linhas[index] ?? {};
      const dados: Record<string, unknown> = { status: "EM_ANALISE", aceite_lgpd: undefined };
      for (const [coluna, campo] of Object.entries(mapeamento)) {
        if (campo && CAMPOS.has(campo)) dados[campo] = valorTexto(original[coluna]);
      }
      dados.data_nascimento = normalizarData(dados.data_nascimento);
      if (dados.cpf) dados.cpf = normalizeDigits(valorTexto(dados.cpf));
      if (dados.cep) dados.cep = normalizeDigits(valorTexto(dados.cep));
      for (const campo of ["telefone_principal", "telefone_secundario", "telefone_recado_numero"]) if (dados[campo]) dados[campo] = normalizeDigits(valorTexto(dados[campo]));
      for (const campo of ["opta_receber_cesta_basica", "apto_receber_cesta_basica", "telefone_principal_whatsapp", "permite_contato_tel", "permite_contato_whatsapp", "permite_contato_sms", "permite_contato_email", "mora_com_familia", "responsavel_legal", "acompanhamento_cras", "acompanhamento_saude", "sabe_ler_escrever", "estuda_atualmente", "possui_deficiencia", "usa_medicacao_continua", "recebe_beneficio", "aceite_lgpd"]) if (dados[campo] !== undefined && dados[campo] !== "") dados[campo] = normalizarBool(dados[campo]);
      for (const campo of ["criancas_adolescentes", "idosos"]) if (dados[campo] !== undefined && dados[campo] !== "") dados[campo] = Number(valorTexto(dados[campo]).replace(",", "."));
      if (typeof dados.beneficios_recebidos === "string") dados.beneficios_recebidos = valorTexto(dados.beneficios_recebidos).split(/[;,]/).map((item) => item.trim()).filter(Boolean);
      if (typeof dados.aceite_lgpd === "string") dados.aceite_lgpd = normalizarBool(dados.aceite_lgpd);
      const problemas: ImportacaoLinha["problemas"] = [];
      const camposObrigatorios = [["nome_completo", "Nome completo"], ["data_nascimento", "Data de nascimento"], ["nome_mae", "Nome da mãe"], ["cep", "CEP"], ["telefone_principal", "Telefone principal"], ["cpf", "CPF"]] as const;
      for (const [campo, rotulo] of camposObrigatorios) if (!trimOrUndefined(valorTexto(dados[campo]))) problemas.push({ campo, mensagem: `${rotulo} não informado.`, orientacao: `Mapeie ou informe o campo ${rotulo}.` });
      if (dados.cpf && !isValidCpf(valorTexto(dados.cpf))) problemas.push({ campo: "cpf", valor: valorTexto(dados.cpf), mensagem: "CPF inválido.", orientacao: "Informe 11 dígitos válidos." });
      if (dados.cep && !isValidCep(valorTexto(dados.cep))) problemas.push({ campo: "cep", valor: valorTexto(dados.cep), mensagem: "CEP inválido.", orientacao: "Informe 8 dígitos." });
      if (dados.telefone_principal && !isValidPhone(valorTexto(dados.telefone_principal))) problemas.push({ campo: "telefone_principal", valor: valorTexto(dados.telefone_principal), mensagem: "Telefone inválido.", orientacao: "Informe DDD e número com 10 ou 11 dígitos." });
      const parsedInput = beneficiarioInputSchema.safeParse(dados);
      if (!parsedInput.success) for (const issue of parsedInput.error.issues) if (issue.message !== "Required" && !problemas.some((item) => item.campo === issue.path[0])) problemas.push({ campo: String(issue.path[0] ?? ""), valor: valorTexto(dados[String(issue.path[0] ?? "")]), mensagem: issue.message, orientacao: "Revise o valor ou o mapeamento da coluna." });
      // Na importação, uma inconsistência não impede a criação do cadastro:
      // ela deixa o registro pendente para correção posterior no G3N.
      let status: ImportacaoLinha["status"] = problemas.length ? "INCOMPLETO" : "PRONTO";
      dados.status = problemas.length ? "INCOMPLETO" : cadastroEstaCompleto(dados) ? "COMPLETO" : "INCOMPLETO";
      let beneficiarioId: string | undefined;
      const cpfNormalizado = normalizeDigits(valorTexto(dados.cpf));
      if (cpfNormalizado && isValidCpf(cpfNormalizado)) {
        if (cpfsNoArquivo.has(cpfNormalizado)) {
          status = "DUPLICIDADE";
          problemas.push({ campo: "cpf", valor: cpfNormalizado, mensagem: "CPF repetido no próprio arquivo.", orientacao: "Mantenha apenas um registro por CPF; esta linha será ignorada." });
        }
        cpfsNoArquivo.add(cpfNormalizado);
        const encontrados = await prisma.$queryRaw<Array<{ id: bigint }>>`
          SELECT b.id
          FROM cadastro_beneficiario b
          WHERE b.tenant_id = ${instituicao.tenant_id}::uuid
            AND EXISTS (SELECT 1 FROM documentos d WHERE d.beneficiario_id = b.id AND upper(coalesce(d.tipo_documento, '')) = 'CPF' AND regexp_replace(coalesce(d.numero_documento, ''), '[^0-9]', '', 'g') = ${cpfNormalizado})
          LIMIT 2
        `;
        if (encontrados.length) { status = "EXISTENTE"; beneficiarioId = String(encontrados[0].id); }
      }
      const nomeParaDuplicidade = trimOrUndefined(valorTexto(dados.nome_completo));
      const dataParaDuplicidade = valorTexto(dados.data_nascimento);
      if (!beneficiarioId && nomeParaDuplicidade && /^\d{4}-\d{2}-\d{2}$/.test(dataParaDuplicidade)) {
        const possiveis = await prisma.$queryRaw<Array<{ id: bigint }>>`
          SELECT id FROM cadastro_beneficiario
          WHERE tenant_id = ${instituicao.tenant_id}::uuid
            AND lower(trim(nome_completo)) = lower(trim(${nomeParaDuplicidade}))
            AND data_nascimento = ${dataParaDuplicidade}::date
          LIMIT 2
        `;
        if (possiveis.length) { status = "DUPLICIDADE"; beneficiarioId = String(possiveis[0].id); }
      }
      linhas.push({ linha: index + 2, original, dados, status, problemas, beneficiarioId });
    }
    const id = await this.repository.criar({ tenantId: instituicao.tenant_id, instituicaoId: instituicao.id, instituicaoNome: nomeInstituicao(instituicao), cnpj: instituicao.cnpj, usuarioId: input.usuarioId, usuarioNome: input.usuarioNome, nomeArquivo: input.nomeArquivo, tamanhoBytes: input.tamanhoBytes, linhas, mapeamento });
    return { id, instituicao, colunas: parsed.colunas, mapeamento, linhas, resumo: this.resumo(linhas) };
  }

  async confirmar(id: string, rawAcoes: unknown, rawCorrecoes: unknown, usuarioId: string) {
    const registro = await this.repository.obter(id);
    if (!registro) throw new AppError("Importação não encontrada.", 404);
    if (registro.usuario_master_id && String(registro.usuario_master_id) !== usuarioId) throw new AppError("Somente o MASTER responsável pode confirmar esta importação.", 403);
    const statusAtual = String(registro.status ?? "");
    if (statusAtual === "PROCESSANDO") return { id, status: statusAtual, resumo: this.resumo(registro.linhas as ImportacaoLinha[]), linhas: registro.linhas };
    await this.repository.atualizar(id, "PROCESSANDO", registro.linhas as ImportacaoLinha[], this.resumo(registro.linhas as ImportacaoLinha[]));
    void this.processarConfirmacao(id, rawAcoes, rawCorrecoes, usuarioId).catch(async (error) => {
      const linhas = (await this.repository.obter(id))?.linhas as ImportacaoLinha[] | undefined;
      if (linhas) await this.repository.atualizar(id, "FALHOU", linhas, this.resumo(linhas));
      console.error("Falha no processamento assíncrono da importação", error);
    });
    return { id, status: "PROCESSANDO", resumo: this.resumo(registro.linhas as ImportacaoLinha[]), linhas: registro.linhas };
  }

  private async processarConfirmacao(id: string, rawAcoes: unknown, rawCorrecoes: unknown, usuarioId: string) {
    const registro = await this.repository.obter(id);
    if (!registro) throw new AppError("Importação não encontrada.", 404);
    if (registro.usuario_master_id && String(registro.usuario_master_id) !== usuarioId) throw new AppError("Somente o MASTER responsável pode confirmar esta importação.", 403);
    const instituicao = await this.repository.obterInstituicao(String(registro.instituicao_id));
    if (!instituicao || instituicao.tenant_id !== String(registro.tenant_id)) throw new AppError("A instituição da importação não é válida.", 422);
    const acoes = rawAcoes && typeof rawAcoes === "object" ? rawAcoes as Record<string, string> : {};
    const correcoes = rawCorrecoes && typeof rawCorrecoes === "object" ? rawCorrecoes as Record<string, Record<string, unknown>> : {};
    const linhas = (registro.linhas as ImportacaoLinha[]).map((linha) => ({ ...linha, dados: { ...linha.dados, ...(correcoes[String(linha.linha)] ?? {}) }, acao: acoes[String(linha.linha)] as ImportacaoLinha["acao"] | undefined, alteradoManualmente: Boolean(correcoes[String(linha.linha)]) }));
    await this.repository.atualizar(id, "PROCESSANDO", linhas, this.resumo(linhas));
    let importados = 0; let atualizados = 0; let ignorados = 0;
    for (let inicio = 0; inicio < linhas.length; inicio += 50) {
      const lote = linhas.slice(inicio, inicio + 50);
      for (const linha of lote) {
        if (linha.acao === "IGNORAR" || linha.status === "DUPLICIDADE" || linha.status === "EXISTENTE" && linha.acao !== "ATUALIZAR") { linha.status = "IGNORADO"; ignorados += 1; continue; }
        try {
          if (["INCOMPLETO", "INVALIDO"].includes(linha.status)) {
            await this.beneficiarioService.criarPendenteImportacao(normalizarTextoImportado({ ...linha.dados, nome_completo: valorTexto(linha.dados.nome_completo) || `Importacao - linha ${linha.linha}` }), instituicao.tenant_id);
            linha.status = "IMPORTADO";
            importados += 1;
          } else if (["PRONTO", "EXISTENTE", "DUPLICIDADE"].includes(linha.status)) {
            const parsed = beneficiarioInputSchema.parse(normalizarTextoImportado(linha.dados));
            if (linha.acao === "ATUALIZAR" && linha.beneficiarioId) { await this.beneficiarioService.atualizar(linha.beneficiarioId, parsed, usuarioId, instituicao.tenant_id); linha.status = "ATUALIZADO"; atualizados += 1; }
            else { await this.beneficiarioService.criar(parsed, usuarioId, instituicao.tenant_id); linha.status = "IMPORTADO"; importados += 1; }
          }
        } catch (error) {
          linha.status = "ERRO"; linha.problemas = [{ mensagem: error instanceof Error ? error.message : "Falha ao processar a linha." }];
        }
      }
      await this.repository.atualizar(id, "PROCESSANDO", linhas, this.resumo(linhas));
    }
    const resumo = this.resumo(linhas); const status = resumo.erros ? (importados || atualizados ? "CONCLUIDA_COM_PENDENCIAS" : "FALHOU") : "CONCLUIDA";
    await this.repository.atualizar(id, status, linhas, { ...resumo, ignorados });
    return { id, status, resumo: { ...resumo, importados, atualizados, ignorados }, linhas };
  }

  async obter(id: string) { const registro = await this.repository.obter(id); if (!registro) throw new AppError("Importação não encontrada.", 404); return registro; }
  private resumo(linhas: ImportacaoLinha[]) { return { prontos: linhas.filter((l) => l.status === "PRONTO").length, existentes: linhas.filter((l) => l.status === "EXISTENTE").length, duplicidades: linhas.filter((l) => l.status === "DUPLICIDADE").length, erros: linhas.filter((l) => ["ERRO", "INVALIDO", "INCOMPLETO"].includes(l.status)).length, ignorados: linhas.filter((l) => l.status === "IGNORADO").length }; }
}
