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
  const [erro, setErro] = useState("");

  async function sugerir() {
    if (carregando || disabled) return;
    setCarregando(true);
    setErro("");
    try {
      const resposta = await aiService.perguntar(
        `${prompt}\n\nEscreva somente o texto sugerido, em português do Brasil, sem introdução, sem aspas e sem inventar números, nomes ou resultados não informados.`,
        { pathname: "field-suggestion", pageTitle: "Sugestão de texto para campo", mode: "field_suggestion" }
      );
      const sugestao = resposta.answer?.trim();
      const iaIndisponivel = /IA generativa não está configurada|IA generativa nao esta configurada/i.test(sugestao);
      if (sugestao && !iaIndisponivel) onApply(sugestao);
      else setErro(sugestao || "Não foi possível gerar a sugestão.");
    } catch (error: any) {
      setErro(
        error?.response?.data?.answer ??
          error?.response?.data?.message ??
          error?.response?.data?.mensagem ??
          error?.message ??
          "Não foi possível gerar a sugestão."
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => void sugerir()}
        disabled={disabled || carregando}
        aria-label={carregando ? "Gerando sugestão com IA" : "Sugerir com IA"}
        title={carregando ? "Gerando sugestão com IA" : "Sugerir com IA"}
      >
        {carregando ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      </Button>
      {erro ? <span className="text-xs text-red-600">{erro}</span> : null}
    </span>
  );
}
