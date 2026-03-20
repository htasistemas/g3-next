import { prisma } from "../../../database/prisma.js";

export type LinkExternoPayload = {
  nome: string;
  url: string;
  tiposRelacionados?: string;
  observacao?: string;
};

export class LinkExternoService {
  async listar() {
    return prisma.$queryRawUnsafe<any[]>('SELECT * FROM "link_externo_documento" ORDER BY nome ASC');
  }

  async salvar(payload: LinkExternoPayload, id?: number) {
    if (id) {
      return prisma.$executeRawUnsafe(
        'UPDATE "link_externo_documento" SET nome = $1, url = $2, tipos_relacionados = $3, observacao = $4, atualizado_em = NOW() WHERE id = $5',
        payload.nome, payload.url, payload.tiposRelacionados, payload.observacao, id
      );
    }

    return prisma.$executeRawUnsafe(
      'INSERT INTO "link_externo_documento" (nome, url, tipos_relacionados, observacao) VALUES ($1, $2, $3, $4)',
      payload.nome, payload.url, payload.tiposRelacionados, payload.observacao
    );
  }

  async excluir(id: number) {
    return prisma.$executeRawUnsafe('DELETE FROM "link_externo_documento" WHERE id = $1', id);
  }
}
