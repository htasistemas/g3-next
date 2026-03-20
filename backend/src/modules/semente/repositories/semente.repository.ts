import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { ensureSementeEstrutura } from "./semente-estrutura.repository.js";

type MemoriaSementeRow = {
  id: bigint;
  usuario_id: bigint;
  conteudo: string;
  data_criacao: Date;
};

export class SementeRepository {
  async listarMemorias(usuarioId: string) {
    await ensureSementeEstrutura(prisma);

    const rows = await prisma.$queryRaw<MemoriaSementeRow[]>(Prisma.sql`
      SELECT id, usuario_id, conteudo, data_criacao
      FROM memorias_semente
      WHERE usuario_id = ${BigInt(usuarioId)}
      ORDER BY data_criacao ASC, id ASC
    `);

    return rows.map((row) => ({
      id: row.id.toString(),
      usuarioId: row.usuario_id.toString(),
      conteudo: row.conteudo,
      dataCriacao: row.data_criacao.toISOString()
    }));
  }

  async adicionarMemoria(usuarioId: string, conteudo: string) {
    await ensureSementeEstrutura(prisma);

    const [row] = await prisma.$queryRaw<Array<{ id: bigint; data_criacao: Date }>>(Prisma.sql`
      INSERT INTO memorias_semente (usuario_id, conteudo, data_criacao)
      VALUES (${BigInt(usuarioId)}, ${conteudo}, NOW())
      RETURNING id, data_criacao
    `);

    return {
      id: row?.id.toString() ?? "",
      dataCriacao: row?.data_criacao?.toISOString() ?? new Date().toISOString()
    };
  }
}
