import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CriarContaPage() {
  return (
    <main className="g3-container flex min-h-screen items-center justify-center py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Solicitar acesso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <p>
            O acesso ao G3 Next é administrado pela equipe responsável pelo sistema.
          </p>
          <p>
            Novos usuários devem solicitar liberação de conta e permissões ao administrador
            institucional. O cadastro público direto não fica disponível nesta tela.
          </p>
          <Button asChild>
            <Link to="/login">Voltar para login</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
