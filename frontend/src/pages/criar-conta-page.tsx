import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CriarContaPage() {
  return (
    <main className="g3-container flex min-h-screen items-center justify-center py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Criar conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <p>
            O fluxo de cadastro de novos usuários será integrado em breve ao backend Node com
            validações e regras de segurança.
          </p>
          <p>
            Nesta fase, para acesso local de homologação da migração, utilize o usuário de teste
            disponibilizado no login.
          </p>
          <Button asChild>
            <Link to="/login">Voltar para login</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
