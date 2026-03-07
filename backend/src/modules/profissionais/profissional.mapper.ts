import type { Prisma } from "@prisma/client";
import { splitSemicolonList, toIsoDate, toStringId } from "../../utils/string-utils.js";

export type ProfissionalDbRecord = Prisma.CadastroProfissionalGetPayload<{
  include: { endereco: true };
}>;

export function mapProfissionalToResponse(record: ProfissionalDbRecord) {
  return {
    id_profissional: toStringId(record.id),
    nome_completo: record.nomeCompleto,
    cpf: record.cpf ?? undefined,
    nome_social: record.nomeSocial ?? undefined,
    apelido: record.apelido ?? undefined,
    data_nascimento: toIsoDate(record.dataNascimento),
    foto_3x4: record.foto3x4 ?? undefined,
    sexo_biologico: record.sexoBiologico ?? undefined,
    identidade_genero: record.identidadeGenero ?? undefined,
    cor_raca: record.corRaca ?? undefined,
    estado_civil: record.estadoCivil ?? undefined,
    nacionalidade: record.nacionalidade ?? undefined,
    naturalidade_cidade: record.naturalidadeCidade ?? undefined,
    naturalidade_uf: record.naturalidadeUf ?? undefined,
    nome_mae: record.nomeMae ?? undefined,
    nome_pai: record.nomePai ?? undefined,
    vinculo: record.vinculo ?? undefined,
    categoria: record.categoria,
    registro_conselho: record.registroConselho ?? undefined,
    especialidade: record.especialidade ?? undefined,
    email: record.email ?? undefined,
    telefone: record.telefone ?? undefined,
    unidade: record.unidade ?? undefined,
    sala_atendimento: record.salaAtendimento ?? undefined,
    carga_horaria: record.cargaHoraria ?? undefined,
    disponibilidade: splitSemicolonList(record.disponibilidade),
    canais_atendimento: splitSemicolonList(record.canaisAtendimento),
    status: record.status ?? "EM_ANALISE",
    tags: splitSemicolonList(record.tags),
    resumo: record.resumo ?? undefined,
    observacoes: record.observacoes ?? undefined,
    cep: record.endereco?.cep ?? undefined,
    logradouro: record.endereco?.logradouro ?? undefined,
    numero: record.endereco?.numero ?? undefined,
    complemento: record.endereco?.complemento ?? undefined,
    bairro: record.endereco?.bairro ?? undefined,
    ponto_referencia: record.endereco?.pontoReferencia ?? undefined,
    municipio: record.endereco?.cidade ?? undefined,
    zona: record.endereco?.zona ?? undefined,
    subzona: record.endereco?.subzona ?? undefined,
    uf: record.endereco?.estado ?? undefined,
    data_cadastro: record.criadoEm.toISOString(),
    data_atualizacao: record.atualizadoEm.toISOString()
  };
}
