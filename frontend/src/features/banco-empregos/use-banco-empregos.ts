import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bancoEmpregosService } from "@/services/banco-empregos.service";
import type {
  BancoEmpregosAvaliacaoPayload,
  BancoEmpregosCandidatoFiltros,
  BancoEmpregosCandidatoPayload,
  BancoEmpregosHistoricoFiltros,
  BancoEmpregosProcessoFiltros,
  BancoEmpregosProcessoPayload,
  BancoEmpregosVagaFiltros,
  BancoEmpregosVagaPayload
} from "@/types/banco-empregos";

export function useDashboardBancoEmpregos(filtros: BancoEmpregosCandidatoFiltros) {
  return useQuery({
    queryKey: ["banco-empregos", "dashboard", filtros],
    queryFn: () => bancoEmpregosService.dashboard(filtros)
  });
}

export function useVagasBancoEmpregos(filtros: BancoEmpregosVagaFiltros) {
  return useQuery({
    queryKey: ["banco-empregos", "vagas", filtros],
    queryFn: () => bancoEmpregosService.listarVagas(filtros)
  });
}

export function useVagaBancoEmpregos(id?: string) {
  return useQuery({
    queryKey: ["banco-empregos", "vaga", id],
    queryFn: () => bancoEmpregosService.buscarVaga(id as string),
    enabled: !!id
  });
}

export function useSalvarVagaBancoEmpregos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: BancoEmpregosVagaPayload }) => {
      if (id) return bancoEmpregosService.atualizarVaga(id, payload);
      return bancoEmpregosService.criarVaga(payload);
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["banco-empregos"] });
      if (variables.id) {
        await queryClient.invalidateQueries({ queryKey: ["banco-empregos", "vaga", variables.id] });
      }
    }
  });
}

export function useRemoverVagaBancoEmpregos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bancoEmpregosService.removerVaga(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["banco-empregos"] });
    }
  });
}

export function useCandidatosBancoEmpregos(filtros: BancoEmpregosCandidatoFiltros) {
  return useQuery({
    queryKey: ["banco-empregos", "candidatos", filtros],
    queryFn: () => bancoEmpregosService.listarCandidatos(filtros)
  });
}

export function useCandidatoBancoEmpregos(id?: string) {
  return useQuery({
    queryKey: ["banco-empregos", "candidato", id],
    queryFn: () => bancoEmpregosService.buscarCandidato(id as string),
    enabled: !!id
  });
}

export function useSalvarCandidatoBancoEmpregos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: BancoEmpregosCandidatoPayload }) => {
      if (id) return bancoEmpregosService.atualizarCandidato(id, payload);
      return bancoEmpregosService.criarCandidato(payload);
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["banco-empregos"] });
      if (variables.id) {
        await queryClient.invalidateQueries({ queryKey: ["banco-empregos", "candidato", variables.id] });
      }
    }
  });
}

export function useInativarCandidatoBancoEmpregos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bancoEmpregosService.inativarCandidato(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["banco-empregos"] });
    }
  });
}

export function useUploadDocumentoBancoEmpregos(candidatoId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      categoria: "CURRICULO" | "CERTIFICADO" | "DOCUMENTO_COMPLEMENTAR";
      descricao?: string;
      textoExtraido?: string;
      arquivo: File;
    }) => bancoEmpregosService.uploadDocumento(candidatoId as string, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["banco-empregos"] });
      if (candidatoId) {
        await queryClient.invalidateQueries({ queryKey: ["banco-empregos", "candidato", candidatoId] });
      }
    }
  });
}

export function useRemoverDocumentoBancoEmpregos(candidatoId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentoId: string) => bancoEmpregosService.removerDocumento(documentoId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["banco-empregos"] });
      if (candidatoId) {
        await queryClient.invalidateQueries({ queryKey: ["banco-empregos", "candidato", candidatoId] });
      }
    }
  });
}

export function useProcessosBancoEmpregos(filtros: BancoEmpregosProcessoFiltros) {
  return useQuery({
    queryKey: ["banco-empregos", "processos", filtros],
    queryFn: () => bancoEmpregosService.listarProcessos(filtros)
  });
}

export function useProcessoBancoEmpregos(id?: string) {
  return useQuery({
    queryKey: ["banco-empregos", "processo", id],
    queryFn: () => bancoEmpregosService.buscarProcesso(id as string),
    enabled: !!id
  });
}

export function useSalvarProcessoBancoEmpregos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: BancoEmpregosProcessoPayload }) => {
      if (id) return bancoEmpregosService.atualizarProcesso(id, payload);
      return bancoEmpregosService.criarProcesso(payload);
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["banco-empregos"] });
      if (variables.id) {
        await queryClient.invalidateQueries({ queryKey: ["banco-empregos", "processo", variables.id] });
      }
    }
  });
}

export function useSalvarAvaliacaoBancoEmpregos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ processoId, payload }: { processoId: string; payload: BancoEmpregosAvaliacaoPayload }) =>
      bancoEmpregosService.salvarAvaliacao(processoId, payload),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["banco-empregos"] });
      await queryClient.invalidateQueries({ queryKey: ["banco-empregos", "processo", variables.processoId] });
    }
  });
}

export function useHistoricoBancoEmpregos(filtros: BancoEmpregosHistoricoFiltros) {
  return useQuery({
    queryKey: ["banco-empregos", "historico", filtros],
    queryFn: () => bancoEmpregosService.listarHistorico(filtros)
  });
}
