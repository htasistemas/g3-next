import { useAcaoEleicaoCipa } from "@/features/cipa/use-cipa";
import { Button } from "@/components/ui/button";

type Props = { eleicaoId: string; status: string };

export function CipaTransicoesEleicao({ eleicaoId, status }: Props) {
  const acao = useAcaoEleicaoCipa();
  const executar = (tipo: "abrirInscricoes" | "encerrarInscricoes") => {
    void acao.mutateAsync({ acao: tipo, eleicaoId });
  };

  if (status === "CONFIGURACAO") return <Button size="sm" onClick={() => executar("abrirInscricoes")} disabled={acao.isPending}>Abrir inscrições</Button>;
  if (status === "INSCRICOES_ABERTAS") return <Button size="sm" variant="outline" onClick={() => executar("encerrarInscricoes")} disabled={acao.isPending}>Encerrar inscrições</Button>;
  return null;
}
