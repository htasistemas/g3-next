import { prisma } from "../../../database/prisma.js";
export class AuthRepository {
    async buscarUsuarioPorLogin(login) {
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
    async buscarUsuarioPorId(id) {
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
