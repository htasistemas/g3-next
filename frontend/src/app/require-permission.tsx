import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

type RequirePermissionProps = {
  permissions: string[];
  children: ReactElement;
};

export function RequirePermission({ permissions, children }: RequirePermissionProps) {
  const { usuario, carregando } = useAuth();
  const navigate = useNavigate();

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
    return (
      <div className="flex min-h-[420px] items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-7 text-center shadow-sm">
          <h1 className="text-xl font-bold text-[var(--g3-foreground)]">Acesso não autorizado</h1>
          <p className="mt-2 text-sm text-[var(--g3-muted)]">Você não possui permissão para acessar esta funcionalidade. Caso necessite deste acesso, entre em contato com o administrador da instituição.</p>
          <button type="button" className="mt-5 rounded-md bg-[var(--g3-primary-button)] px-4 py-2 text-sm font-medium text-white" onClick={() => navigate(-1)}>Voltar</button>
        </div>
      </div>
    );
  }

  return children;
}
