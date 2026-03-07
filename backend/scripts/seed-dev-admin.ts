import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { env } from "../src/config/env.js";

const prisma = new PrismaClient({
  datasourceUrl: env.DATABASE_URL
});

const ADMIN_USERNAME = "admin";
const ADMIN_EMAIL = "admin@g3-next.local";
const ADMIN_PASSWORD = "admin123";
const ADMIN_PERMISSIONS = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"];

async function obterOuCriarPermissoes(): Promise<bigint[]> {
  const ids: bigint[] = [];

  for (const nome of ADMIN_PERMISSIONS) {
    let permissao = await prisma.permissao.findFirst({
      where: { nome }
    });

    if (!permissao) {
      permissao = await prisma.permissao.create({
        data: { nome }
      });
    }

    ids.push(permissao.id);
  }

  return ids;
}

async function main() {
  const senhaHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const agora = new Date();

  let usuario = await prisma.usuario.findFirst({
    where: { nomeUsuario: { equals: ADMIN_USERNAME, mode: "insensitive" } }
  });

  if (!usuario) {
    usuario = await prisma.usuario.create({
      data: {
        nomeUsuario: ADMIN_USERNAME,
        nome: "Administrador Local",
        email: ADMIN_EMAIL,
        senhaHash,
        criadoEm: agora,
        atualizadoEm: agora
      }
    });
  } else {
    usuario = await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senhaHash,
        atualizadoEm: agora
      }
    });
  }

  const permissaoIds = await obterOuCriarPermissoes();

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

  console.log("[seed-admin] Usuario pronto para login local:");
  console.log(`- usuario: ${ADMIN_USERNAME}`);
  console.log(`- senha: ${ADMIN_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("[seed-admin] Falha ao preparar usuario local.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
