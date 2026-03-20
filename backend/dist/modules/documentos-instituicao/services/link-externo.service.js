import { prisma } from "../../../database/prisma.js";
export class LinkExternoService {
    async listar() {
        return prisma.$queryRawUnsafe('SELECT * FROM "link_externo_documento" ORDER BY nome ASC');
    }
    async salvar(payload, id) {
        if (id) {
            return prisma.$executeRawUnsafe('UPDATE "link_externo_documento" SET nome = $1, url = $2, tipos_relacionados = $3, observacao = $4, atualizado_em = NOW() WHERE id = $5', payload.nome, payload.url, payload.tiposRelacionados, payload.observacao, id);
        }
        return prisma.$executeRawUnsafe('INSERT INTO "link_externo_documento" (nome, url, tipos_relacionados, observacao) VALUES ($1, $2, $3, $4)', payload.nome, payload.url, payload.tiposRelacionados, payload.observacao);
    }
    async excluir(id) {
        return prisma.$executeRawUnsafe('DELETE FROM "link_externo_documento" WHERE id = $1', id);
    }
}
