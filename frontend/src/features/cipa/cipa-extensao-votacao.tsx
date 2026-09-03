import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cipaService } from "@/services/cipa.service";
export function CipaExtensaoVotacao({ eleicaoId, aberta, onConcluido }: { eleicaoId: string; aberta: boolean; onConcluido: () => void }) {
  const [carregando, setCarregando] = useState(false); const [mensagem, setMensagem] = useState("");
  async function estender() { if (!window.confirm("A votação será prorrogada por 2 dias. Deseja registrar essa extensão?")) return; setCarregando(true); try { await cipaService.estenderVotacao(eleicaoId, 2); setMensagem("Votação prorrogada por 2 dias e registrada na auditoria."); onConcluido(); } catch { setMensagem("Não foi possível prorrogar a votação nesta etapa."); } finally { setCarregando(false); } }
  if (!aberta) return null; return <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm"><p className="font-medium text-amber-900">Participação mínima</p><p className="mt-1 text-amber-800">Se a participação não atingir o mínimo aplicável, prorrogue a votação antes de encerrá-la.</p><Button className="mt-3" size="sm" variant="outline" disabled={carregando} onClick={() => void estender()}>{carregando ? "Registrando..." : "Prorrogar por 2 dias"}</Button>{mensagem ? <p role="status" className="mt-2 text-amber-900">{mensagem}</p> : null}</div>;
}
