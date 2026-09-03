import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cipaService } from "@/services/cipa.service";
import { useColaboradoresCipa, useEleitoresCipa } from "@/features/cipa/use-cipa";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

type Props = { eleicaoId: string; unidadeId: string; permitir: boolean };

export function CipaSelecaoEleitores({ eleicaoId, unidadeId, permitir }: Props) {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const [termo, setTermo] = useState("");
  const colaboradores = useColaboradoresCipa(unidadeId, termo);
  const eleitores = useEleitoresCipa(eleicaoId);
  const adicionar = useMutation({
    mutationFn: (colaboradorId: string) => cipaService.adicionarEleitor(eleicaoId, colaboradorId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cipa", usuario?.tenant_id ?? "sem-tenant", "eleitores", eleicaoId] });
      void queryClient.invalidateQueries({ queryKey: ["cipa", usuario?.tenant_id ?? "sem-tenant", "dashboard", eleicaoId] });
    }
  });
  const remover = useMutation({
    mutationFn: (eleitorId: string) => cipaService.removerEleitor(eleicaoId, eleitorId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cipa", usuario?.tenant_id ?? "sem-tenant", "eleitores", eleicaoId] });
      void queryClient.invalidateQueries({ queryKey: ["cipa", usuario?.tenant_id ?? "sem-tenant", "dashboard", eleicaoId] });
    }
  });
  const idsIncluidos = useMemo(() => new Set((eleitores.data?.eleitores ?? []).filter((item) => item.status === "APTO").map((item) => item.colaboradorId)), [eleitores.data]);
  const disponiveis = useMemo(() => (colaboradores.data?.colaboradores ?? []).filter((item) => !idsIncluidos.has(item.id)), [colaboradores.data, idsIncluidos]);
  return <Card><CardHeader><CardTitle>Selecionar eleitores do cadastro de RH</CardTitle></CardHeader><CardContent className="space-y-3">
    <p className="text-sm text-[var(--g3-muted)]">Escolha colaboradores ativos deste estabelecimento. O servidor validará novamente o tenant, a unidade, o status e a duplicidade antes de incluir.</p>
    <Input aria-label="Buscar colaborador para eleitor" placeholder="Buscar por nome ou matrícula" value={termo} onChange={(event) => setTermo(event.target.value)} />
    {!permitir ? <p className="text-sm text-amber-700">A lista está congelada nesta etapa da eleição.</p> : null}
    {colaboradores.isLoading || eleitores.isLoading ? <p className="text-sm text-[var(--g3-muted)]">Carregando colaboradores...</p> : null}
    {colaboradores.isError || eleitores.isError ? <p role="alert" className="text-sm text-red-700">Não foi possível carregar a lista de eleitores.</p> : null}
    <div className="space-y-2">{disponiveis.slice(0, 30).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--g3-border)] p-3"><div><p className="font-medium">{item.nomeCompleto}</p><p className="text-xs text-[var(--g3-muted)]">Matrícula {item.matricula} · CPF {item.cpfMascarado}</p></div><Button size="sm" disabled={!permitir || adicionar.isPending} onClick={() => void adicionar.mutateAsync(item.id)}>Adicionar como eleitor</Button></div>)}</div>
    {!disponiveis.length && !colaboradores.isLoading ? <p className="text-sm text-[var(--g3-muted)]">Nenhum colaborador disponível para esta seleção. Você também pode importar uma planilha.</p> : null}
    {eleitores.data?.eleitores.length ? <div className="space-y-2"><p className="text-xs font-medium text-[var(--g3-muted)]">Eleitores incluídos ({eleitores.data.eleitores.filter((item) => item.status === "APTO").length})</p>{eleitores.data.eleitores.filter((item) => item.status === "APTO").slice(0, 30).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--g3-card-soft)] p-2 text-sm"><span>{item.nomeCompleto} · matrícula {item.matricula}</span><Button size="sm" variant="ghost" disabled={!permitir || remover.isPending} onClick={() => { if (window.confirm("Remover este colaborador da lista de eleitores desta eleição?")) void remover.mutateAsync(item.id); }}>Remover</Button></div>)}{eleitores.data.eleitores.some((item) => item.status === "REMOVIDO") ? <p className="text-xs text-[var(--g3-muted)]">Eleitores removidos permanecem no histórico e podem ser reativados pela lista acima.</p> : null}</div> : null}
  </CardContent></Card>;
}
