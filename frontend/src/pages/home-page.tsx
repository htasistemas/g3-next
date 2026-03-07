import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function HomePage() {
  return (
    <main className="g3-container">
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>Migracao G3 - Base React/Node</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Esta base inicia a migracao do sistema G3 para a nova arquitetura.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/cadastros/beneficiarios">Abrir Cadastro de Beneficiario</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/cadastros/vinculo-familiar">Abrir Vinculo Familiar</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
