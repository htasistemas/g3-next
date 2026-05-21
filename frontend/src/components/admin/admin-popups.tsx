import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";

export type PopupMensagemState = {
  tipo: "sucesso" | "erro" | "aviso";
  titulo: string;
  texto: string;
};

export function PopupMensagem({
  popup,
  onClose
}: {
  popup: PopupMensagemState;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <h3
            className={`text-base font-semibold ${
              popup.tipo === "sucesso"
                ? "text-emerald-800"
                : popup.tipo === "erro"
                  ? "text-rose-700"
                  : "text-amber-700"
            }`}
          >
            {popup.titulo}
          </h3>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-slate-700">{popup.texto}</p>
        </div>
        <div className="flex justify-end border-t border-slate-100 px-5 py-3">
          <Button type="button" onClick={onClose}>
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PopupConfirmacao({
  aberto,
  titulo,
  texto,
  processando,
  onCancel,
  onConfirm,
  confirmarTexto = "Confirmar",
  cancelarTexto = "Cancelar",
  confirmarVariant = "danger",
  children
}: {
  aberto: boolean;
  titulo: string;
  texto: string;
  processando?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmarTexto?: string;
  cancelarTexto?: string;
  confirmarVariant?: ButtonProps["variant"];
  children?: ReactNode;
}) {
  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4"
      onClick={() => {
        if (!processando) onCancel();
      }}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">{titulo}</h3>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-slate-700">{texto}</p>
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <Button type="button" variant="outline" disabled={processando} onClick={onCancel}>
            {cancelarTexto}
          </Button>
          <Button type="button" variant={confirmarVariant} disabled={processando} onClick={onConfirm}>
            {processando ? "Processando..." : confirmarTexto}
          </Button>
        </div>
      </div>
    </div>
  );
}
