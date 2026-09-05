import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { pessoasService } from "@/services/pessoas.service";

export function usePessoas(params: { search?: string; tipoVinculo?: string; page?: number; pageSize?: number }) {
  const { usuario } = useAuth();
  return useQuery({ queryKey: ["pessoas", usuario?.tenant_id ?? "sem-tenant", params], queryFn: () => pessoasService.listar(params), enabled: Boolean(usuario?.tenant_id) });
}

export function usePessoaVinculos(id?: string) {
  const { usuario } = useAuth();
  return useQuery({ queryKey: ["pessoa-vinculos", usuario?.tenant_id ?? "sem-tenant", id], queryFn: () => pessoasService.listarVinculos(id as string), enabled: Boolean(usuario?.tenant_id && id) });
}

export function usePessoasDuplicidades() {
  const { usuario } = useAuth();
  return useQuery({ queryKey: ["pessoas-duplicidades", usuario?.tenant_id ?? "sem-tenant"], queryFn: () => pessoasService.listarDuplicidades(), enabled: Boolean(usuario?.tenant_id) });
}

export function usePessoaAuditoria(id?: string) {
  const { usuario } = useAuth();
  return useQuery({ queryKey: ["pessoa-vinculos-auditoria", usuario?.tenant_id ?? "sem-tenant", id], queryFn: () => pessoasService.listarAuditoria(id as string), enabled: Boolean(usuario?.tenant_id && id) });
}
