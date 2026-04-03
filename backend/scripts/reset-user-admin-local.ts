import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { env } from "../src/config/env.js";

const prisma = new PrismaClient({
  datasourceUrl: env.DATABASE_URL
});

const TARGET_EMAIL = "htasistemas@gmail.com";
const NEW_PASSWORD = "Hta@2026!";
const REQUIRED_PERMISSIONS = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"];

async function ensurePermissions(): Promise<bigint[]> {
  const ids: bigint[] = [];

  for (const nome of REQUIRED_PERMISSIONS) {
    let permissao = await prisma.permissao.findFirst({ where: { nome } });

    if (!permissao) {
      permissao = await prisma.permissao.create({ data: { nome } });
    }

    ids.push(permissao.id);
  }

  return ids;
}

async function main() {
  const usuario = await prisma.usuario.findFirst({
    where: {
      email: {
        equals: TARGET_EMAIL,
        mode: "insensitive"
      }
    }
  });

  if (!usuario) {
    throw new Error(`Usuario com e-mail ${TARGET_EMAIL} nao encontrado.`);
  }

  const senhaHash = await bcrypt.hash(NEW_PASSWORD, 10);
  const agora = new Date();

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      senhaHash,
      atualizadoEm: agora
    }
  });

  await prisma.$executeRawUnsafe(
    `
      UPDATE usuarios
      SET
        status = 'ATIVO',
        tentativas_login_invalidas = 0,
        ultimo_login_invalido_em = NULL,
        exigir_troca_senha = FALSE,
        atualizado_em = NOW()
      WHERE id = $1
    `,
    usuario.id
  );

  const permissaoIds = await ensurePermissions();

  for (const permissaoId of permissaoIds) {
    await prisma.usuarioPermissao.upsert({
      where: {
        usuarioId_permissaoId: {
          usuarioId: usuario.id,
          permissaoId
        }
      },
      update: {},
      create: {
        usuarioId: usuario.id,
        permissaoId
      }
    });
  }

  console.log("[reset-user-admin-local] Usuario atualizado com sucesso.");
  console.log(`- email: ${TARGET_EMAIL}`);
  console.log(`- id: ${usuario.id.toString()}`);
  console.log(`- senha: ${NEW_PASSWORD}`);
  console.log(`- permissoes garantidas: ${REQUIRED_PERMISSIONS.join(", ")}`);
}

main()
  .catch((error) => {
    console.error("[reset-user-admin-local] Falha ao atualizar usuario.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
