import { prisma } from "../../../database/prisma.js";

export class AuthRepository {
  async buscarUsuarioPorLogin(login: string) {
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
}
