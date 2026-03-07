import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PoliticaPrivacidadePage() {
  return (
    <main className="g3-container flex min-h-screen items-center justify-center py-8">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Política de privacidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>
            O G3 trata dados pessoais com base na LGPD, aplicando controles de acesso, rastreabilidade
            e proteção de informações sensíveis.
          </p>
          <p>
            Os dados são utilizados para execução das atividades de atendimento e gestão institucional,
            respeitando finalidade, necessidade e segurança.
          </p>
          <p>
            Solicitações relacionadas à privacidade devem ser encaminhadas ao responsável institucional.
          </p>
          <Button asChild variant="outline">
            <Link to="/login">Voltar para login</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
