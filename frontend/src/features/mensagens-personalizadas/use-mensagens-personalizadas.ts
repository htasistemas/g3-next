import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { mensagensPersonalizadasService } from "@/services/mensagens-personalizadas.service";
import type {
  MensagemHistoricoFiltros,
  MensagemModeloFiltros,
  MensagemModeloForm,
  MensagemTaxonomiaTipo
} from "@/types/mensagens-personalizadas";

export function useMensagensPersonalizadasSuporte() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["mensagens-personalizadas", usuario?.tenant_id ?? "sem-tenant", "suporte"],
    queryFn: () => mensagensPersonalizadasService.obterSuporte()
  });
}

export function useMensagensPersonalizadasModelos(filtros: MensagemModeloFiltros) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["mensagens-personalizadas", usuario?.tenant_id ?? "sem-tenant", "modelos", filtros],
    queryFn: () => mensagensPersonalizadasService.listarModelos(filtros)
  });
}

export function useMensagensPersonalizadasTaxonomias() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["mensagens-personalizadas", usuario?.tenant_id ?? "sem-tenant", "taxonomias"],
    queryFn: () => mensagensPersonalizadasService.listarTaxonomias()
  });
}

export function useMensagensPersonalizadasHistorico(filtros: MensagemHistoricoFiltros, enabled = true) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["mensagens-personalizadas", usuario?.tenant_id ?? "sem-tenant", "historico", filtros],
    queryFn: () => mensagensPersonalizadasService.listarHistorico(filtros),
    enabled
  });
}

export function useSalvarMensagemPersonalizada() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: MensagemModeloForm }) => {
      if (id) return mensagensPersonalizadasService.atualizarModelo(id, payload);
      return mensagensPersonalizadasService.criarModelo(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mensagens-personalizadas", tenantKey, "modelos"] });
      await queryClient.invalidateQueries({ queryKey: ["mensagens-personalizadas", tenantKey, "taxonomias"] });
    }
  });
}

export function useDuplicarMensagemPersonalizada() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (id: string) => mensagensPersonalizadasService.duplicarModelo(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mensagens-personalizadas", tenantKey, "modelos"] });
    }
  });
}

export function useAtualizarStatusMensagemPersonalizada() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ATIVA" | "INATIVA" }) =>
      mensagensPersonalizadasService.atualizarStatusModelo(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mensagens-personalizadas", tenantKey, "modelos"] });
    }
  });
}

export function useRemoverMensagemPersonalizada() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (id: string) => mensagensPersonalizadasService.removerModelo(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mensagens-personalizadas", tenantKey, "modelos"] });
      await queryClient.invalidateQueries({ queryKey: ["mensagens-personalizadas", tenantKey, "historico"] });
    }
  });
}

export function useSalvarTaxonomiaMensagem() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: ({
      id,
      payload
    }: {
      id?: string;
      payload: {
        tipo: MensagemTaxonomiaTipo;
        nome: string;
        descricao?: string;
        status?: "ATIVA" | "INATIVA";
      };
    }) => {
      if (id) return mensagensPersonalizadasService.atualizarTaxonomia(id, payload);
      return mensagensPersonalizadasService.criarTaxonomia(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mensagens-personalizadas", tenantKey, "taxonomias"] });
      await queryClient.invalidateQueries({ queryKey: ["mensagens-personalizadas", tenantKey, "modelos"] });
    }
  });
}

export function useRemoverTaxonomiaMensagem() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (id: string) => mensagensPersonalizadasService.removerTaxonomia(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mensagens-personalizadas", tenantKey, "taxonomias"] });
      await queryClient.invalidateQueries({ queryKey: ["mensagens-personalizadas", tenantKey, "modelos"] });
    }
  });
}

export function useBuscarDestinatariosMensagem() {
  return useMutation({
    mutationFn: ({ tipo, termo, somenteAtivos = true }: { tipo: string; termo?: string; somenteAtivos?: boolean }) =>
      mensagensPersonalizadasService.buscarDestinatarios(tipo, termo, somenteAtivos)
  });
}

export function useGerarPreviewMensagem() {
  return useMutation({
    mutationFn: (payload: {
      modeloId?: string;
      canal: "WHATSAPP" | "EMAIL";
      destinatarioTipo: string;
      destinatarioId: string;
      assuntoEditado?: string;
      mensagemEditada?: string;
      contextoExtra?: Record<string, unknown>;
    }) => mensagensPersonalizadasService.gerarPreview(payload)
  });
}

export function useEnviarMensagemPersonalizada() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: mensagensPersonalizadasService.enviar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mensagens-personalizadas", tenantKey, "historico"] });
    }
  });
}
