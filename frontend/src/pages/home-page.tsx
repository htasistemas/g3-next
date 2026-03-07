import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function HomePage() {
  return (
    <main className="g3-container">
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>Migração G3 - Base React/Node</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Esta base inicia a migração do sistema G3 para a nova arquitetura.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/cadastros/beneficiarios">Abrir cadastro de beneficiário</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/cadastros/unidades-assistenciais">Abrir cadastro de unidade assistencial</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/cadastros/vinculo-familiar">Abrir cadastro de vínculo familiar</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/configuracoes/parametros-sistema">Abrir parâmetros do sistema</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
