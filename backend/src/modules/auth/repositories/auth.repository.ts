import { prisma } from "../../../database/prisma.js";
import { ensureUsuariosGestaoEstrutura } from "../../usuarios/repositories/usuario-estrutura.repository.js";

type UsuarioControleAcesso = {
  status: string | null;
  exigir_troca_senha: boolean | null;
  tentativas_login_invalidas: number | bigint | null;
};

type UsuarioRecuperacaoSenha = {
  id: bigint;
  nome_usuario: string;
  nome: string | null;
  email: string;
};

export class AuthRepository {
  async buscarUsuarioPorLogin(login: string) {
    await this.ensureEstruturaUsuarios();
    const valor = login.trim();
    const valorLower = valor.toLowerCase();

    return prisma.usuario.findFirst({
      where: {
        OR: [
          { nomeUsuario: { equals: valor, mode: "insensitive" } },
          { email: { equals: valorLower, mode: "insensitive" } }
        ]
      },
      include: {
        permissoes: {
          include: {
            permissao: true
          }
        }
      }
    });
  }

  async buscarUsuarioPorGoogleId(googleId: string) {
    await this.ensureEstruturaUsuarios();
    return prisma.usuario.findFirst({
      where: { googleId },
      include: {
        permissoes: {
          include: {
            permissao: true
          }
        }
      }
    });
  }

  async buscarUsuarioPorEmail(email: string) {
    await this.ensureEstruturaUsuarios();
    const emailNormalizado = email.trim().toLowerCase();
    return prisma.usuario.findFirst({
      where: {
        email: {
          equals: emailNormalizado,
          mode: "insensitive"
        }
      },
      include: {
        permissoes: {
          include: {
            permissao: true
          }
        }
      }
    });
  }

  async vincularGooglePorUsuarioId(
    usuarioId: bigint,
    googleId: string,
    fotoUrl?: string | null
  ) {
    await this.ensureEstruturaUsuarios();
    return prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        googleId,
        fotoUrl: fotoUrl ?? undefined,
        atualizadoEm: new Date()
      },
      include: {
        permissoes: {
          include: {
            permissao: true
          }
        }
      }
    });
  }

  async buscarUsuarioPorId(id: bigint) {
    await this.ensureEstruturaUsuarios();
    return prisma.usuario.findUnique({
      where: { id },
      include: {
        permissoes: {
          include: {
            permissao: true
          }
        }
      }
    });
  }

  async buscarControleAcessoPorUsuarioId(id: bigint): Promise<UsuarioControleAcesso | null> {
    await this.ensureEstruturaUsuarios();
    const rows = await prisma.$queryRawUnsafe<UsuarioControleAcesso[]>(
      `
        SELECT
          status,
          exigir_troca_senha,
          tentativas_login_invalidas
        FROM usuarios
        WHERE id = $1
        LIMIT 1
      `,
      id
    );

    return rows[0] ?? null;
  }

  async registrarFalhaLogin(id: bigint) {
    await this.ensureEstruturaUsuarios();

    const rows = await prisma.$queryRawUnsafe<UsuarioControleAcesso[]>(
      `
        UPDATE usuarios
        SET
          tentativas_login_invalidas = COALESCE(tentativas_login_invalidas, 0) + 1,
          ultimo_login_invalido_em = NOW(),
          status = CASE
            WHEN COALESCE(tentativas_login_invalidas, 0) + 1 >= 5 THEN 'BLOQUEADO'
            ELSE COALESCE(status, 'ATIVO')
          END,
          atualizado_em = NOW()
        WHERE id = $1
        RETURNING status, exigir_troca_senha, tentativas_login_invalidas
      `,
      id
    );

    return rows[0] ?? null;
  }

  async registrarLoginSucesso(id: bigint) {
    await this.ensureEstruturaUsuarios();
    await prisma.$executeRawUnsafe(
      `
        UPDATE usuarios
        SET
          ultimo_acesso_em = NOW(),
          tentativas_login_invalidas = 0,
          ultimo_login_invalido_em = NULL,
          atualizado_em = NOW()
        WHERE id = $1
      `,
      id
    );
  }

  async redefinirSenhaPorEmail(email: string, senhaHash: string): Promise<UsuarioRecuperacaoSenha | null> {
    await this.ensureEstruturaUsuarios();

    const usuario = await prisma.usuario.findFirst({
      where: {
        email: {
          equals: email.trim().toLowerCase(),
          mode: "insensitive"
        }
      },
      select: {
        id: true,
        nomeUsuario: true,
        nome: true,
        email: true
      }
    });

    if (!usuario || !usuario.email) {
      return null;
    }

    const atualizado = await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senhaHash,
        atualizadoEm: new Date()
      },
      select: {
        id: true,
        nomeUsuario: true,
        nome: true,
        email: true
      }
    });

    await prisma.$executeRawUnsafe(
      `
        UPDATE usuarios
        SET
          exigir_troca_senha = TRUE,
          tentativas_login_invalidas = 0,
          ultimo_login_invalido_em = NULL,
          atualizado_em = NOW()
        WHERE id = $1
      `,
      atualizado.id
    );

    return {
      id: atualizado.id,
      nome_usuario: atualizado.nomeUsuario,
      nome: atualizado.nome,
      email: atualizado.email ?? usuario.email
    };
  }

  private async ensureEstruturaUsuarios() {
    await ensureUsuariosGestaoEstrutura(prisma);
  }
}
