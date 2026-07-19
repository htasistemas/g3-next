import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { prontuarioService } from "@/services/prontuario.service";
import type { ProntuarioAtendimentoForm } from "@/types/prontuario";

export function useBuscaProntuario(busca: string) {
  return useQuery({ queryKey: ["prontuario", "busca", busca], queryFn: () => prontuarioService.buscarBeneficiarios(busca), enabled: busca.trim().length >= 2 });
}
export function useContextoProntuario(id?: string) {
  return useQuery({ queryKey: ["prontuario", "contexto", id], queryFn: () => prontuarioService.obterContexto(id!), enabled: Boolean(id) });
}
export function useSalvarProntuario(beneficiarioId: string, atendimentoId?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProntuarioAtendimentoForm) => atendimentoId ? prontuarioService.atualizar(atendimentoId, payload) : prontuarioService.criar(beneficiarioId, payload),
    onSuccess: () => client.invalidateQueries({ queryKey: ["prontuario", "contexto", beneficiarioId] })
  });
}
export function useFinalizarProntuario(beneficiarioId: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => prontuarioService.finalizar(id), onSuccess: () => client.invalidateQueries({ queryKey: ["prontuario", "contexto", beneficiarioId] }) });
}
export function useAdendoProntuario(beneficiarioId: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ id, conteudo, motivo }: { id: string; conteudo: string; motivo?: string }) => prontuarioService.adendo(id, conteudo, motivo), onSuccess: () => client.invalidateQueries({ queryKey: ["prontuario", "contexto", beneficiarioId] }) });
}
