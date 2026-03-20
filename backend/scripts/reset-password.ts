import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import bcrypt from "bcryptjs";

config();

const prisma = new PrismaClient();

async function main() {
  const login = "admin";
  const novaSenha = "admin123";
  
  console.log(`Iniciando RESET E DESBLOQUEIO para o usuário: ${login}`);

  try {
    // 1. Procura o usuário
    const usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { nomeUsuario: { equals: login, mode: 'insensitive' } },
          { email: { equals: login, mode: 'insensitive' } }
        ]
      }
    });

    if (!usuario) {
      console.log("Usuário 'admin' não encontrado. Criando novo administrador...");
      const hash = await bcrypt.hash(novaSenha, 10);
      const novoUsuario = await prisma.usuario.create({
        data: {
          nomeUsuario: login,
          nome: "Administrador do Sistema",
          email: "admin@localhost",
          senhaHash: hash,
          criadoEm: new Date(),
          atualizadoEm: new Date()
        }
      });
      
      // Força o status ATIVO
      await prisma.$executeRawUnsafe(
        `UPDATE usuarios SET status = 'ATIVO', tentativas_login_invalidas = 0 WHERE id = $1`,
        novoUsuario.id
      );
      
      console.log(`Sucesso! Usuário "${login}" criado e ATIVADO.`);
    } else {
      console.log(`Usuário encontrado (ID: ${usuario.id}). Resetando senha e desbloqueando...`);
      const hash = await bcrypt.hash(novaSenha, 10);
      
      // Atualiza senha pelo Prisma
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { 
          senhaHash: hash,
          atualizadoEm: new Date()
        }
      });

      // Desbloqueia status e limpa tentativas
      await prisma.$executeRawUnsafe(
        `UPDATE usuarios 
         SET status = 'ATIVO', 
             tentativas_login_invalidas = 0, 
             ultimo_login_invalido_em = NULL,
             exigir_troca_senha = FALSE
         WHERE id = $1`,
        usuario.id
      );
      
      console.log(`Sucesso! Usuário "${usuario.nomeUsuario || login}" DESBLOQUEADO e ATIVADO.`);
    }

    console.log(`\nCREDENCIAIS DE ACESSO:\nLogin: ${login}\nSenha: ${novaSenha}\nStatus: ATIVO`);
  } catch (error: any) {
    console.error("Erro ao processar:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
