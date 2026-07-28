import { useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiService } from "../ai.service";

type AiFieldSuggestionButtonProps = {
  prompt: string;
  onApply: (suggestion: string) => void;
  disabled?: boolean;
};

export function AiFieldSuggestionButton({
  prompt,
  onApply,
  disabled = false
}: AiFieldSuggestionButtonProps) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);

  async function sugerir() {
    if (carregando || disabled) return;
    setCarregando(true);
    setErro(false);
    try {
      const resposta = await aiService.perguntar(
        `${prompt}\n\nEscreva somente o texto sugerido, em português do Brasil, sem introdução, sem aspas e sem inventar números, nomes ou resultados não informados.`,
        { pathname: "field-suggestion", pageTitle: "Sugestão de texto para campo", mode: "field_suggestion" }
      );
      const sugestao = resposta.answer?.trim();
      const iaIndisponivel = /IA generativa não está configurada|IA generativa nao esta configurada/i.test(sugestao);
      if (sugestao && !iaIndisponivel) onApply(sugestao);
      else setErro(true);
    } catch {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => void sugerir()} disabled={disabled || carregando}>
        {carregando ? <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
        {carregando ? "Gerando sugestão..." : "Sugerir com IA"}
      </Button>
      {erro ? <span className="text-xs text-red-600">Não foi possível gerar a sugestão.</span> : null}
    </span>
  );
}
