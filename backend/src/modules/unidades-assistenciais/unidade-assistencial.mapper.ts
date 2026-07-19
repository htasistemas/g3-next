import type { Prisma } from "@prisma/client";
import { toStringId } from "../../utils/string-utils.js";

export type UnidadeAssistencialDbRecord = Prisma.UnidadeAssistencialGetPayload<{
  include: {
    endereco: true;
    imagemUnidade: true;
    diretoria: {
      orderBy: {
        nomeCompleto: "asc";
      };
    };
    salas: {
      orderBy: {
        nome: "asc";
      };
    };
  };
}>;

export function mapUnidadeAssistencialToResponse(record: UnidadeAssistencialDbRecord) {
  return {
    id_unidade: toStringId(record.id),
    nome_fantasia: record.nomeFantasia,
    tipo_unidade: record.tipoUnidade,
    razao_social: record.razaoSocial ?? undefined,
    cnpj: record.cnpj ?? undefined,
    telefone: record.telefone ?? undefined,
    email: record.email ?? undefined,
    site: record.site ?? undefined,
    horario_funcionamento: record.horarioFuncionamento ?? undefined,
    observacoes: record.observacoes ?? undefined,
    unidade_principal: record.unidadePrincipal,
    cep: record.endereco?.cep ?? undefined,
    logradouro: record.endereco?.logradouro ?? undefined,
    numero: record.endereco?.numero ?? undefined,
    complemento: record.endereco?.complemento ?? undefined,
    bairro: record.endereco?.bairro ?? undefined,
    ponto_referencia: record.endereco?.pontoReferencia ?? undefined,
    cidade: record.endereco?.cidade ?? undefined,
    estado: record.endereco?.estado ?? undefined,
    zona: record.endereco?.zona ?? undefined,
    subzona: record.endereco?.subzona ?? undefined,
    latitude: record.endereco?.latitude?.toString() ?? undefined,
    longitude: record.endereco?.longitude?.toString() ?? undefined,
    raio_ponto_metros: record.raioPontoMetros,
    accuracy_max_ponto_metros: record.accuracyMaxPontoMetros,
    ip_validacao_ponto: record.ipValidacaoPonto ?? undefined,
    ips_publicos_ponto: record.ipsPublicosPonto ?? undefined,
    redes_locais_ponto: record.redesLocaisPonto ?? undefined,
    modo_validacao_ponto: record.modoValidacaoPonto,
    ping_timeout_ms: record.pingTimeoutMs,
    logomarca: record.imagemUnidade?.logomarca ?? undefined,
    logomarca_relatorio: record.imagemUnidade?.logomarcaRelatorio ?? undefined,
    diretoria: record.diretoria.map((membro) => ({
      id: toStringId(membro.id),
      nome_completo: membro.nomeCompleto,
      documento: membro.documento,
      funcao: membro.funcao,
      mandato_inicio: membro.mandatoInicio ?? undefined,
      mandato_fim: membro.mandatoFim ?? undefined
    })),
    salas: record.salas.map((sala) => ({
      id: toStringId(sala.id),
      nome: sala.nome,
      ativo: (sala as any).ativo ?? true
    })),
    data_cadastro: record.criadoEm.toISOString(),
    data_atualizacao: record.atualizadoEm.toISOString()
  };
}
