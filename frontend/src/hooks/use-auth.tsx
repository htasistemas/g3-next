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
import type { LoginAuthResult, UsuarioAutenticado } from "@/types/auth";

type AuthContextValue = {
  usuario: UsuarioAutenticado | null;
  carregando: boolean;
  autenticado: boolean;
  login: (input: {
    cnpj?: string;
    codigoInstituicao?: string;
    slug?: string;
    email?: string;
    nomeUsuario?: string;
    senha: string;
  }) => Promise<LoginAuthResult>;
  verificarMfa: (input: { challengeId: string; codigo: string }) => Promise<void>;
  loginGoogle: (input: {
    idToken: string;
    cnpj?: string;
    slug?: string;
    codigoInstituicao?: string;
  }) => Promise<LoginAuthResult>;
  selecionarAmbiente: (input: { loginTicket: string; acessoId: string }) => Promise<LoginAuthResult>;
  listarAmbientes: () => Promise<import("@/types/auth").AmbienteAutorizado[]>;
  trocarAmbiente: (acessoId: string) => Promise<void>;
  logout: () => Promise<void>;
  atualizarPerfil: () => Promise<void>;
  obterOpcoesContexto: () => Promise<import("@/types/auth").OpcoesContexto>;
  trocarContexto: (input: { unidadeId?: string | null; projetoId?: string | null }) => Promise<void>;
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

  const login = useCallback(async (input: {
    cnpj?: string;
    codigoInstituicao?: string;
    slug?: string;
    email?: string;
    nomeUsuario?: string;
    senha: string;
  }) => {
    const resultado = await authService.login(input);
    if ("usuario" in resultado) setUsuario(resultado.usuario);
    return resultado;
  }, []);

  const verificarMfa = useCallback(async (input: { challengeId: string; codigo: string }) => {
    const perfil = await authService.verificarMfa(input);
    setUsuario(perfil);
  }, []);

  const loginGoogle = useCallback(async (input: {
    idToken: string;
    cnpj?: string;
    slug?: string;
    codigoInstituicao?: string;
  }) => {
    const resultado = await authService.loginGoogle(input);
    if ("token" in resultado) setUsuario(resultado.usuario);
    return resultado;
  }, []);

  const selecionarAmbiente = useCallback(async (input: { loginTicket: string; acessoId: string }) => {
    const perfil = await authService.selecionarAmbiente(input);
    if ("token" in perfil) setUsuario(perfil.usuario);
    return perfil;
  }, []);

  const listarAmbientes = useCallback(() => authService.listarAmbientes(), []);
  const trocarAmbiente = useCallback(async (acessoId: string) => {
    const perfil = await authService.trocarAmbiente(acessoId);
    setUsuario(perfil);
  }, []);
  const obterOpcoesContexto = useCallback(() => authService.obterOpcoesContexto(), []);
  const trocarContexto = useCallback(async (input: { unidadeId?: string | null; projetoId?: string | null }) => {
    setUsuario(await authService.trocarContexto(input));
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
      verificarMfa,
      loginGoogle,
      selecionarAmbiente,
      listarAmbientes,
      trocarAmbiente,
      obterOpcoesContexto,
      trocarContexto,
      logout,
      atualizarPerfil
    }),
    [usuario, carregando, login, verificarMfa, loginGoogle, selecionarAmbiente, listarAmbientes, trocarAmbiente, obterOpcoesContexto, trocarContexto, logout, atualizarPerfil]
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
