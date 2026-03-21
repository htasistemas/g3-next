import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { centralAtendimentosService } from "@/services/central-atendimentos.service";
import type {
  CentralAtendimentoForm,
  CentralBeneficioForm,
  CentralBuscaBeneficiarioFiltro,
  CentralEncaminhamentoForm,
  CentralRelatorioTipo
} from "@/types/central-atendimentos";

function invalidarCentral(queryClient: ReturnType<typeof useQueryClient>, beneficiarioId?: string) {
  return queryClient.invalidateQueries({ queryKey: ["central-atendimentos", "visao-geral", beneficiarioId] });
}

export function useCentralBuscaBeneficiarios(filtros: CentralBuscaBeneficiarioFiltro) {
  return useQuery({
    queryKey: ["central-atendimentos", "busca", filtros],
    queryFn: () => centralAtendimentosService.buscarBeneficiarios(filtros)
  });
}

export function useCentralVisaoGeral(beneficiarioId?: string) {
  return useQuery({
    queryKey: ["central-atendimentos", "visao-geral", beneficiarioId],
    queryFn: () => centralAtendimentosService.obterVisaoGeral(String(beneficiarioId)),
    enabled: Boolean(beneficiarioId)
  });
}

export function useCriarAtendimentoCentral(beneficiarioId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CentralAtendimentoForm) =>
      centralAtendimentosService.criarAtendimento(String(beneficiarioId), payload),
    onSuccess: async () => invalidarCentral(queryClient, beneficiarioId)
  });
}

export function useAtualizarAtendimentoCentral(beneficiarioId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CentralAtendimentoForm }) =>
      centralAtendimentosService.atualizarAtendimento(String(beneficiarioId), id, payload),
    onSuccess: async () => invalidarCentral(queryClient, beneficiarioId)
  });
}

export function useExcluirAtendimentoCentral(beneficiarioId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => centralAtendimentosService.excluirAtendimento(String(beneficiarioId), id),
    onSuccess: async () => invalidarCentral(queryClient, beneficiarioId)
  });
}

export function useCriarBeneficioCentral(beneficiarioId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CentralBeneficioForm) =>
      centralAtendimentosService.criarBeneficio(String(beneficiarioId), payload),
    onSuccess: async () => invalidarCentral(queryClient, beneficiarioId)
  });
}

export function useAtualizarBeneficioCentral(beneficiarioId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CentralBeneficioForm }) =>
      centralAtendimentosService.atualizarBeneficio(String(beneficiarioId), id, payload),
    onSuccess: async () => invalidarCentral(queryClient, beneficiarioId)
  });
}

export function useExcluirBeneficioCentral(beneficiarioId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => centralAtendimentosService.excluirBeneficio(String(beneficiarioId), id),
    onSuccess: async () => invalidarCentral(queryClient, beneficiarioId)
  });
}

export function useCriarEncaminhamentoCentral(beneficiarioId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CentralEncaminhamentoForm) =>
      centralAtendimentosService.criarEncaminhamento(String(beneficiarioId), payload),
    onSuccess: async () => invalidarCentral(queryClient, beneficiarioId)
  });
}

export function useAtualizarEncaminhamentoCentral(beneficiarioId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CentralEncaminhamentoForm }) =>
      centralAtendimentosService.atualizarEncaminhamento(String(beneficiarioId), id, payload),
    onSuccess: async () => invalidarCentral(queryClient, beneficiarioId)
  });
}

export function useExcluirEncaminhamentoCentral(beneficiarioId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      centralAtendimentosService.excluirEncaminhamento(String(beneficiarioId), id),
    onSuccess: async () => invalidarCentral(queryClient, beneficiarioId)
  });
}

export function useGerarRelatorioCentralPdf(beneficiarioId?: string) {
  return useMutation({
    mutationFn: (tipo: CentralRelatorioTipo) =>
      centralAtendimentosService.gerarRelatorioPdf(String(beneficiarioId), tipo)
  });
}
