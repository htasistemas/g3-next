import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, ClipboardList, FileText, GraduationCap, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { educacionalService, type PendenciaEducacionalTipo, type PendenciasEducacionaisResponse } from "@/services/educacional.service";

const tipos: Array<{ tipo: PendenciaEducacionalTipo; label: string }> = [
  { tipo: "documentos", label: "Documentos" },
  { tipo: "chamadas", label: "Chamadas" },
  { tipo: "baixa-frequencia", label: "Baixa frequência" },
  { tipo: "turmas-sem-professor", label: "Turmas sem professor" },
  { tipo: "capacidade", label: "Capacidade" }
];

const icones: Record<PendenciaEducacionalTipo, ReactNode> = {
  documentos: <FileText className="h-5 w-5" />,
  chamadas: <ClipboardList className="h-5 w-5" />,
  "baixa-frequencia": <AlertTriangle className="h-5 w-5" />,
  "turmas-sem-professor": <UsersRound className="h-5 w-5" />,
  capacidade: <GraduationCap className="h-5 w-5" />
};

function texto(valor: unknown) {
  return valor === null || valor === undefined || String(valor).trim() === "" ? "Não informado" : String(valor);
}

function tipoValido(valor: string | null): PendenciaEducacionalTipo {
  return tipos.some((item) => item.tipo === valor) ? valor as PendenciaEducacionalTipo : "documentos";
}

function detalhes(item: Record<string, unknown>, tipo: PendenciaEducacionalTipo) {
  if (tipo === "chamadas") return `${texto(item.data_aula)} · ${texto(item.disciplina_nome)} · ${texto(item.turma_nome)}`;
  if (tipo === "baixa-frequencia") return `Matrícula ${texto(item.numero_matricula)} · ${texto(item.percentual_faltas)}% de faltas · ${texto(item.turma_nome)}`;
  if (tipo === "turmas-sem-professor") return `${texto(item.turma_nome)} · ${texto(item.etapa_nome)} · ${texto(item.serie_nome)} · ${texto(item.turno)}`;
  if (tipo === "capacidade") return `${texto(item.turma_nome)} · ${texto(item.matriculados)} matriculados · ${texto(item.vagas)} vaga(s) · ${texto(item.ocupacao_percentual)}% ocupada`;
  return `${texto(item.aluno_nome)} · Matrícula ${texto(item.numero_matricula)} · ${texto(item.turma_nome)}`;
}

function tituloItem(item: Record<string, unknown>, tipo: PendenciaEducacionalTipo) {
  if (tipo === "chamadas") return `Aula #${texto(item.diario_id)}`;
  if (tipo === "turmas-sem-professor" || tipo === "capacidade") return texto(item.turma_nome);
  return texto(item.aluno_nome);
}

function destinoOperacional(tipo: PendenciaEducacionalTipo, item: Record<string, unknown>) {
  if (tipo === "documentos") return `/educacional?grupo=vida-escolar&aba=documentos&aluno_id=${texto(item.aluno_id)}&matricula_id=${texto(item.matricula_id)}`;
  if (tipo === "chamadas") return `/educacional?grupo=professores&aba=frequencias&diario_aula_id=${texto(item.diario_id)}`;
  if (tipo === "baixa-frequencia") return `/educacional?grupo=alunos&aba=vida-academica&aluno_id=${texto(item.aluno_id)}`;
  return `/educacional?grupo=estrutura&aba=estrutura&recurso=turmas&turma_id=${texto(item.turma_id)}`;
}

export function EducacionalPendenciasPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const parametros = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const tipo = tipoValido(parametros.get("pendencia"));
  const [dados, setDados] = useState<PendenciasEducacionaisResponse | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const filtros = Object.fromEntries(["unidade_id", "ano_letivo_id", "etapa_id", "turma_id", "turno"].map((chave) => [chave, parametros.get(chave) ?? undefined]).filter(([, valor]) => valor));
    setCarregando(true);
    setErro("");
    educacionalService.listarPendenciasEducacionais(tipo, filtros)
      .then(setDados)
      .catch((error) => setErro(error instanceof Error ? error.message : "Não foi possível carregar as pendências educacionais."))
      .finally(() => setCarregando(false));
  }, [parametros, tipo]);

  return <div className="space-y-4">
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>{dados?.titulo ?? "Pendências educacionais"}</CardTitle>
            <p className="mt-1 text-sm text-[var(--g3-muted)]">{dados?.descricao ?? "Selecione uma pendência para consultar os registros relacionados."}</p>
          </div>
          <div className="flex items-center gap-2 text-emerald-700">{icones[tipo]}<strong>{dados?.total ?? 0}</strong></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
          {tipos.map((item) => <Button key={item.tipo} type="button" variant={item.tipo === tipo ? "default" : "outline"} onClick={() => navigate(`/educacional?aba=pendencias&pendencia=${item.tipo}`)}>{item.label}</Button>)}
        </div>
        {carregando ? <p className="text-sm text-[var(--g3-muted)]">Carregando pendências...</p> : null}
        {erro ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</p> : null}
        {!carregando && !erro && dados && !dados.itens.length ? <p className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-sm text-[var(--g3-muted)]">Nenhuma pendência encontrada para os filtros atuais.</p> : null}
        <div className="space-y-2">
          {dados?.itens.map((item, index) => <div key={`${tipo}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-sm">
            <div>
              <strong>{tituloItem(item, tipo)}</strong>
              <p className="mt-1 text-xs text-[var(--g3-muted)]">{detalhes(item, tipo)}</p>
              <p className="mt-1 text-xs text-amber-700">{texto(item.motivo)}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => navigate(destinoOperacional(tipo, item))}>Abrir fluxo</Button>
          </div>)}
        </div>
      </CardContent>
    </Card>
  </div>;
}
