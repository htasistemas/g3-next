export type UsuarioAutenticado = {
  id: string;
  nomeUsuario: string;
  nome?: string;
  email?: string;
  permissoes: string[];
};

export type JwtPayload = {
  sub: string;
  nomeUsuario: string;
  permissoes: string[];
};
