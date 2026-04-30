import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
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
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["banco-empregos", tenantKey, "dashboard", filtros],
    queryFn: () => bancoEmpregosService.dashboard(filtros),
    enabled: !!usuario
  });
}

export function useVagasBancoEmpregos(filtros: BancoEmpregosVagaFiltros) {
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["banco-empregos", tenantKey, "vagas", filtros],
    queryFn: () => bancoEmpregosService.listarVagas(filtros),
    enabled: !!usuario
  });
}

export function useVagaBancoEmpregos(id?: string) {
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["banco-empregos", tenantKey, "vaga", id],
    queryFn: () => bancoEmpregosService.buscarVaga(id as string),
    enabled: !!usuario && !!id
  });
}

export function useSalvarVagaBancoEmpregos() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: BancoEmpregosVagaPayload }) => {
      if (id) return bancoEmpregosService.atualizarVaga(id, payload);
      return bancoEmpregosService.criarVaga(payload);
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["banco-empregos", tenantKey] });
      if (variables.id) {
        await queryClient.invalidateQueries({ queryKey: ["banco-empregos", tenantKey, "vaga", variables.id] });
      }
    }
  });
}

export function useRemoverVagaBancoEmpregos() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (id: string) => bancoEmpregosService.removerVaga(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["banco-empregos", tenantKey] });
    }
  });
}

export function useCandidatosBancoEmpregos(filtros: BancoEmpregosCandidatoFiltros) {
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["banco-empregos", tenantKey, "candidatos", filtros],
    queryFn: () => bancoEmpregosService.listarCandidatos(filtros),
    enabled: !!usuario
  });
}

export function useCandidatoBancoEmpregos(id?: string) {
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["banco-empregos", tenantKey, "candidato", id],
    queryFn: () => bancoEmpregosService.buscarCandidato(id as string),
    enabled: !!usuario && !!id
  });
}

export function useSalvarCandidatoBancoEmpregos() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: BancoEmpregosCandidatoPayload }) => {
      if (id) return bancoEmpregosService.atualizarCandidato(id, payload);
      return bancoEmpregosService.criarCandidato(payload);
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["banco-empregos", tenantKey] });
      if (variables.id) {
        await queryClient.invalidateQueries({ queryKey: ["banco-empregos", tenantKey, "candidato", variables.id] });
      }
    }
  });
}

export function useInativarCandidatoBancoEmpregos() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (id: string) => bancoEmpregosService.inativarCandidato(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["banco-empregos", tenantKey] });
    }
  });
}

export function useUploadDocumentoBancoEmpregos(candidatoId?: string) {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (payload: {
      categoria: "CURRICULO" | "CERTIFICADO" | "DOCUMENTO_COMPLEMENTAR";
      descricao?: string;
      textoExtraido?: string;
      arquivo: File;
    }) => bancoEmpregosService.uploadDocumento(candidatoId as string, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["banco-empregos", tenantKey] });
      if (candidatoId) {
        await queryClient.invalidateQueries({ queryKey: ["banco-empregos", tenantKey, "candidato", candidatoId] });
      }
    }
  });
}

export function useRemoverDocumentoBancoEmpregos(candidatoId?: string) {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (documentoId: string) => bancoEmpregosService.removerDocumento(documentoId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["banco-empregos", tenantKey] });
      if (candidatoId) {
        await queryClient.invalidateQueries({ queryKey: ["banco-empregos", tenantKey, "candidato", candidatoId] });
      }
    }
  });
}

export function useProcessosBancoEmpregos(filtros: BancoEmpregosProcessoFiltros) {
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["banco-empregos", tenantKey, "processos", filtros],
    queryFn: () => bancoEmpregosService.listarProcessos(filtros),
    enabled: !!usuario
  });
}

export function useProcessoBancoEmpregos(id?: string) {
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["banco-empregos", tenantKey, "processo", id],
    queryFn: () => bancoEmpregosService.buscarProcesso(id as string),
    enabled: !!usuario && !!id
  });
}

export function useSalvarProcessoBancoEmpregos() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: BancoEmpregosProcessoPayload }) => {
      if (id) return bancoEmpregosService.atualizarProcesso(id, payload);
      return bancoEmpregosService.criarProcesso(payload);
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["banco-empregos", tenantKey] });
      if (variables.id) {
        await queryClient.invalidateQueries({ queryKey: ["banco-empregos", tenantKey, "processo", variables.id] });
      }
    }
  });
}

export function useSalvarAvaliacaoBancoEmpregos() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: ({ processoId, payload }: { processoId: string; payload: BancoEmpregosAvaliacaoPayload }) =>
      bancoEmpregosService.salvarAvaliacao(processoId, payload),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["banco-empregos", tenantKey] });
      await queryClient.invalidateQueries({ queryKey: ["banco-empregos", tenantKey, "processo", variables.processoId] });
    }
  });
}

export function useHistoricoBancoEmpregos(filtros: BancoEmpregosHistoricoFiltros) {
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["banco-empregos", tenantKey, "historico", filtros],
    queryFn: () => bancoEmpregosService.listarHistorico(filtros),
    enabled: !!usuario
  });
}
