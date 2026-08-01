import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CadastroSucessoModal({
  aberto,
  titulo = "Cadastro realizado com sucesso",
  rotuloNumero = "Número do cadastro",
  numero,
  onClose
}: {
  aberto: boolean;
  titulo?: string;
  rotuloNumero?: string;
  numero?: string | number | null;
  onClose: () => void;
}) {
  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-900/45 px-4 py-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white px-6 pb-6 pt-8 shadow-2xl sm:px-8"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Fechar confirmação do cadastro"
          className="absolute right-4 top-4 rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="h-20 w-20 stroke-[1.8] text-[var(--g3-primary)]" aria-hidden="true" />
          <h3 className="mt-5 text-xl font-semibold text-slate-800">{titulo}</h3>
          <p className="mt-3 text-sm text-slate-500">
            {rotuloNumero}: <span className="font-semibold text-slate-700">{numero || "—"}</span>
          </p>
        </div>
        <div className="mt-7">
          <Button
            type="button"
            className="h-12 w-full rounded-lg bg-[var(--g3-primary-button)] text-base font-semibold text-white shadow-sm hover:bg-[var(--g3-primary-button-hover)]"
            onClick={onClose}
          >
            Finalizar cadastro
          </Button>
        </div>
      </div>
    </div>
  );
}
