import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { authService } from "@/services/auth.service";
import type { UsuarioAutenticado } from "@/types/auth";

type AuthContextValue = {
  usuario: UsuarioAutenticado | null;
  carregando: boolean;
  autenticado: boolean;
  login: (nomeUsuario: string, senha: string) => Promise<void>;
  loginGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  atualizarPerfil: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);
  const [carregando, setCarregando] = useState(true);

  const atualizarPerfil = useCallback(async () => {
    try {
      const perfil = await authService.me();
      setUsuario(perfil);
    } catch {
      setUsuario(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const perfil = await authService.me();
        if (mounted) setUsuario(perfil);
      } catch {
        if (mounted) setUsuario(null);
      } finally {
        if (mounted) setCarregando(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (nomeUsuario: string, senha: string) => {
    const perfil = await authService.login(nomeUsuario, senha);
    setUsuario(perfil);
  }, []);

  const loginGoogle = useCallback(async (idToken: string) => {
    const perfil = await authService.loginGoogle(idToken);
    setUsuario(perfil);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUsuario(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      usuario,
      carregando,
      autenticado: !!usuario,
      login,
      loginGoogle,
      logout,
      atualizarPerfil
    }),
    [usuario, carregando, login, loginGoogle, logout, atualizarPerfil]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }
  return context;
}
