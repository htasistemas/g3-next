import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mensagensPersonalizadasService } from "@/services/mensagens-personalizadas.service";
import type {
  MensagemHistoricoFiltros,
  MensagemModeloFiltros,
  MensagemModeloForm,
  MensagemTaxonomiaTipo
} from "@/types/mensagens-personalizadas";

export function useMensagensPersonalizadasSuporte() {
  return useQuery({
    queryKey: ["mensagens-personalizadas", "suporte"],
    queryFn: () => mensagensPersonalizadasService.obterSuporte()
  });
}

export function useMensagensPersonalizadasModelos(filtros: MensagemModeloFiltros) {
  return useQuery({
    queryKey: ["mensagens-personalizadas", "modelos", filtros],
    queryFn: () => mensagensPersonalizadasService.listarModelos(filtros)
  });
}

export function useMensagensPersonalizadasTaxonomias() {
  return useQuery({
    queryKey: ["mensagens-personalizadas", "taxonomias"],
    queryFn: () => mensagensPersonalizadasService.listarTaxonomias()
  });
}

export function useMensagensPersonalizadasHistorico(filtros: MensagemHistoricoFiltros, enabled = true) {
  return useQuery({
    queryKey: ["mensagens-personalizadas", "historico", filtros],
    queryFn: () => mensagensPersonalizadasService.listarHistorico(filtros),
    enabled
  });
}

export function useSalvarMensagemPersonalizada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: MensagemModeloForm }) => {
      if (id) return mensagensPersonalizadasService.atualizarModelo(id, payload);
      return mensagensPersonalizadasService.criarModelo(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mensagens-personalizadas", "modelos"] });
      await queryClient.invalidateQueries({ queryKey: ["mensagens-personalizadas", "taxonomias"] });
    }
  });
}

export function useDuplicarMensagemPersonalizada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mensagensPersonalizadasService.duplicarModelo(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mensagens-personalizadas", "modelos"] });
    }
  });
}

export function useAtualizarStatusMensagemPersonalizada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ATIVA" | "INATIVA" }) =>
      mensagensPersonalizadasService.atualizarStatusModelo(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mensagens-personalizadas", "modelos"] });
    }
  });
}

export function useRemoverMensagemPersonalizada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mensagensPersonalizadasService.removerModelo(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mensagens-personalizadas", "modelos"] });
      await queryClient.invalidateQueries({ queryKey: ["mensagens-personalizadas", "historico"] });
    }
  });
}

export function useSalvarTaxonomiaMensagem() {
  const queryClient = useQueryClient();
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
      await queryClient.invalidateQueries({ queryKey: ["mensagens-personalizadas", "taxonomias"] });
      await queryClient.invalidateQueries({ queryKey: ["mensagens-personalizadas", "modelos"] });
    }
  });
}

export function useRemoverTaxonomiaMensagem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mensagensPersonalizadasService.removerTaxonomia(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mensagens-personalizadas", "taxonomias"] });
      await queryClient.invalidateQueries({ queryKey: ["mensagens-personalizadas", "modelos"] });
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mensagensPersonalizadasService.enviar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mensagens-personalizadas", "historico"] });
    }
  });
}
