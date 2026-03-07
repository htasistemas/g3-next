import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TermosUsoPage() {
  return (
    <main className="g3-container flex min-h-screen items-center justify-center py-8">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Termos de uso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>
            Este sistema é destinado ao uso institucional da equipe autorizada para gestão social.
          </p>
          <p>
            O usuário deve manter sigilo sobre credenciais, respeitar perfis de acesso e utilizar os
            dados apenas para finalidades administrativas e assistenciais.
          </p>
          <p>
            Todas as ações podem ser registradas para auditoria, segurança e conformidade legal.
          </p>
          <Button asChild variant="outline">
            <Link to="/login">Voltar para login</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
