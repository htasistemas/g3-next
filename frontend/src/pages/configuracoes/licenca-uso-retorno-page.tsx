import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { licencaUsoService } from "@/services/licenca-uso.service";

export function LicencaUsoRetornoPage() {
  const [searchParams] = useSearchParams();
  const [estado, setEstado] = useState<"carregando" | "sucesso" | "erro">("carregando");
  const [mensagem, setMensagem] = useState("Confirmando pagamento da licença...");

  useEffect(() => {
    let ativo = true;

    void (async () => {
      try {
        const data = await licencaUsoService.confirmarRetornoCheckout({
          order_nsu: searchParams.get("order_nsu") ?? undefined,
          transaction_nsu: searchParams.get("transaction_nsu") ?? undefined,
          slug: searchParams.get("slug") ?? undefined,
          receipt_url: searchParams.get("receipt_url") ?? undefined
        });
        if (!ativo) return;
        setEstado(data.pago ? "sucesso" : "erro");
        setMensagem(
          data.pago
            ? "Pagamento confirmado com sucesso. A licença do G3N foi atualizada."
            : "O retorno foi recebido, mas o pagamento ainda não está aprovado."
        );
      } catch (error: any) {
        if (!ativo) return;
        setEstado("erro");
        setMensagem(
          error?.response?.data?.message ?? "Não foi possível confirmar o pagamento da licença."
        );
      }
    })();

    return () => {
      ativo = false;
    };
  }, [searchParams]);

  const Icone =
    estado === "carregando" ? LoaderCircle : estado === "sucesso" ? CheckCircle2 : CircleAlert;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-10">
      <Card className="w-full border-[var(--g3-border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icone
              className={`h-5 w-5 ${
                estado === "sucesso"
                  ? "text-emerald-600"
                  : estado === "erro"
                    ? "text-rose-600"
                    : "animate-spin text-[var(--g3-active)]"
              }`}
            />
            Retorno do pagamento da licença
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>{mensagem}</p>
          <div className="flex flex-wrap gap-3">
            <Link className="text-[var(--g3-active)] underline" to="/configuracoes/licenca-uso">
              Voltar para Licença de uso
            </Link>
            <Link className="text-[var(--g3-active)] underline" to="/login">
              Ir para login
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
