import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

type RequirePermissionProps = {
  permissions: string[];
  children: ReactElement;
};

export function RequirePermission({ permissions, children }: RequirePermissionProps) {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Carregando permissões...
      </div>
    );
  }

  const permissoesUsuario = usuario?.permissoes ?? [];
  const autorizado = permissions.some((permission) => permissoesUsuario.includes(permission));

  if (!autorizado) {
    return <Navigate to="/" replace />;
  }

  return children;
}
