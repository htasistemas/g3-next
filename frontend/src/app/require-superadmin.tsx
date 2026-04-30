import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

type RequireSuperadminProps = {
  children: ReactElement;
};

export function RequireSuperadmin({ children }: RequireSuperadminProps) {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Carregando permissões...
      </div>
    );
  }

  const emailAdminPadrao = usuario?.nomeUsuario?.trim().toLowerCase() === "htasistemas@gmail.com";

  if (!usuario?.is_superadmin && !emailAdminPadrao) {
    return <Navigate to="/" replace />;
  }

  return children;
}
