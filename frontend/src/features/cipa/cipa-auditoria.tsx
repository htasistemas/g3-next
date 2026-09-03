import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cipaService } from "@/services/cipa.service";
export function CipaAuditoria({ eleicaoId }: { eleicaoId: string }) {
  const query = useQuery({ queryKey: ["cipa", "auditoria", eleicaoId], queryFn: () => cipaService.listarAuditoria(eleicaoId) });
  return <Card><CardHeader><CardTitle>Trilha de auditoria</CardTitle></CardHeader><CardContent>{query.isLoading ? <p className="text-sm text-[var(--g3-muted)]">Carregando histórico...</p> : query.isError ? <p role="alert" className="text-sm text-red-700">Não foi possível carregar o histórico.</p> : !query.data?.auditoria.length ? <p className="text-sm text-[var(--g3-muted)]">Ainda não há eventos registrados.</p> : <div className="max-h-72 overflow-auto"><table className="min-w-full text-left text-sm"><thead><tr><th className="px-2 py-2">Data</th><th className="px-2 py-2">Ação</th><th className="px-2 py-2">Resultado</th></tr></thead><tbody>{query.data.auditoria.map((item) => <tr key={item.id} className="border-t border-[var(--g3-border)]"><td className="px-2 py-2">{new Date(item.criadoEm).toLocaleString("pt-BR")}</td><td className="px-2 py-2">{item.acao}</td><td className="px-2 py-2">{item.resultado}</td></tr>)}</tbody></table></div>}</CardContent></Card>;
}
