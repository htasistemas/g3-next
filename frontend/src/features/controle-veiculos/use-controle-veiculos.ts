import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { controleVeiculosService } from "@/services/controle-veiculos.service";
import type {
  DisponibilidadeVeiculoConsulta,
  DisponibilidadeVeiculoRegistro,
  LocalDestinoVeiculo,
  MotoristaAutorizado,
  RegistroDiarioBordo,
  VeiculoCadastro
} from "@/types/controle-veiculos";

export function useVeiculos() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["controle-veiculos", "veiculos", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => controleVeiculosService.listarVeiculos()
  });
}

export function useDiarioBordo() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["controle-veiculos", "diario-bordo", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => controleVeiculosService.listarDiario()
  });
}

export function useLocaisDestinoVeiculo() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["controle-veiculos", "locais-destino", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => controleVeiculosService.listarLocaisDestino()
  });
}

export function useMotoristasAutorizados(veiculoId?: number | null) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: [
      "controle-veiculos",
      "motoristas-autorizados",
      usuario?.tenant_id ?? "sem-tenant",
      veiculoId ?? "todos"
    ],
    queryFn: () => controleVeiculosService.listarMotoristasAutorizados(veiculoId)
  });
}

export function useMotoristasDisponiveis(nome?: string) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: [
      "controle-veiculos",
      "motoristas-disponiveis",
      usuario?.tenant_id ?? "sem-tenant",
      nome ?? ""
    ],
    queryFn: () => controleVeiculosService.listarMotoristasDisponiveis(nome),
    enabled: (nome?.trim().length ?? 0) >= 2
  });
}

export function useSalvarVeiculo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: VeiculoCadastro) => {
      if (payload.id) return controleVeiculosService.atualizarVeiculo(payload.id, payload);
      return controleVeiculosService.criarVeiculo(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["controle-veiculos", "veiculos"] });
    }
  });
}

export function useRemoverVeiculo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => controleVeiculosService.removerVeiculo(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["controle-veiculos"] });
    }
  });
}

export function useSalvarDiarioBordo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RegistroDiarioBordo) => {
      if (payload.id) return controleVeiculosService.atualizarDiario(payload.id, payload);
      return controleVeiculosService.criarDiario(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["controle-veiculos", "diario-bordo"] });
    }
  });
}

export function useRemoverDiarioBordo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => controleVeiculosService.removerDiario(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["controle-veiculos", "diario-bordo"] });
    }
  });
}

export function useSalvarLocalDestinoVeiculo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: LocalDestinoVeiculo) => {
      if (payload.id) {
        return controleVeiculosService.atualizarLocalDestino(payload.id, payload);
      }
      return controleVeiculosService.criarLocalDestino(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["controle-veiculos", "locais-destino"] });
    }
  });
}

export function useRemoverLocalDestinoVeiculo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => controleVeiculosService.removerLocalDestino(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["controle-veiculos", "locais-destino"] });
      await queryClient.invalidateQueries({ queryKey: ["controle-veiculos", "diario-bordo"] });
    }
  });
}

export function useSalvarMotoristaAutorizado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MotoristaAutorizado) => {
      if (payload.id) {
        return controleVeiculosService.atualizarMotoristaAutorizado(payload.id, payload);
      }
      return controleVeiculosService.criarMotoristaAutorizado(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["controle-veiculos", "motoristas-autorizados"] });
    }
  });
}

export function useRemoverMotoristaAutorizado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => controleVeiculosService.removerMotoristaAutorizado(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["controle-veiculos", "motoristas-autorizados"] });
    }
  });
}

export function useDisponibilidades() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["controle-veiculos", "disponibilidades", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => controleVeiculosService.listarDisponibilidades()
  });
}

export function useConsultaDisponibilidade(params: DisponibilidadeVeiculoConsulta) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: [
      "controle-veiculos",
      "consulta-disponibilidade",
      usuario?.tenant_id ?? "sem-tenant",
      params
    ],
    queryFn: () => controleVeiculosService.consultarDisponibilidade(params)
  });
}

export function useResumoDisponibilidade(params: DisponibilidadeVeiculoConsulta) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["controle-veiculos", "resumo-disponibilidade", usuario?.tenant_id ?? "sem-tenant", params],
    queryFn: () => controleVeiculosService.resumirDisponibilidade(params)
  });
}

export function useVeiculosDisponibilidade() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["controle-veiculos", "veiculos-disponibilidade", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => controleVeiculosService.listarVeiculosDisponibilidade()
  });
}

export function useAgendaVeiculoDisponibilidade(veiculoId?: number | null, params?: DisponibilidadeVeiculoConsulta) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: [
      "controle-veiculos",
      "agenda-disponibilidade",
      usuario?.tenant_id ?? "sem-tenant",
      veiculoId ?? "todos",
      params
    ],
    queryFn: () => controleVeiculosService.obterAgendaVeiculo(veiculoId as number, params as DisponibilidadeVeiculoConsulta),
    enabled: Boolean(veiculoId && params)
  });
}

export function useSalvarDisponibilidadeVeiculo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: DisponibilidadeVeiculoRegistro) => {
      if (payload.id) {
        return controleVeiculosService.atualizarDisponibilidade(
          payload.id,
          payload as Omit<
            DisponibilidadeVeiculoRegistro,
            "id" | "tenantId" | "version" | "bloqueios" | "proximaLiberacao" | "situacao" | "ativo"
          >
        );
      }
      return controleVeiculosService.criarDisponibilidade(
        payload as Omit<
          DisponibilidadeVeiculoRegistro,
          "id" | "tenantId" | "version" | "bloqueios" | "proximaLiberacao" | "situacao" | "ativo"
        >
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["controle-veiculos"] });
    }
  });
}

export function useCancelarDisponibilidadeVeiculo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivoCancelamento }: { id: number; motivoCancelamento: string }) =>
      controleVeiculosService.cancelarDisponibilidade(id, motivoCancelamento),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["controle-veiculos"] });
    }
  });
}

export function useEncerrarDisponibilidadeVeiculo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => controleVeiculosService.encerrarDisponibilidade(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["controle-veiculos"] });
    }
  });
}

export function useExcluirDisponibilidadeVeiculo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => controleVeiculosService.excluirDisponibilidade(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["controle-veiculos"] });
    }
  });
}
