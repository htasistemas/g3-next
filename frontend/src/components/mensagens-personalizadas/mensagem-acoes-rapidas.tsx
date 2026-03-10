import { useState } from "react";
import { Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MensagemEnvioDialog } from "@/components/mensagens-personalizadas/mensagem-envio-dialog";
import type { MensagemDestinatario, MensagemDestinatarioTipo } from "@/types/mensagens-personalizadas";

type Props = {
  titulo?: string;
  destinatarioTipo: MensagemDestinatarioTipo;
  destinatario?: {
    id?: string;
    nome?: string;
    email?: string;
    telefone?: string;
    documento?: string;
    detalhe?: string;
  };
  contextoExtra?: Record<string, unknown>;
  onFeedback?: (retorno: { tipo: "sucesso" | "erro" | "aviso"; texto: string }) => void;
};

export function MensagemAcoesRapidas({
  titulo = "Comunicação rápida",
  destinatarioTipo,
  destinatario,
  contextoExtra,
  onFeedback
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [canalInicial, setCanalInicial] = useState<"WHATSAPP" | "EMAIL">("WHATSAPP");

  const destinatarioValido =
    destinatario?.id && destinatario.nome
      ? [
          {
            tipo: destinatarioTipo,
            id: destinatario.id,
            nome: destinatario.nome,
            email: destinatario.email,
            telefone: destinatario.telefone,
            documento: destinatario.documento,
            detalhe: destinatario.detalhe
          } satisfies MensagemDestinatario
        ]
      : [];

  return (
    <>
      <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{titulo}</p>
            <p className="text-xs text-[var(--g3-muted)]">
              Use modelos prontos para WhatsApp ou e-mail deste cadastro.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCanalInicial("WHATSAPP");
                setAberto(true);
              }}
              disabled={!destinatarioValido.length}
            >
              <MessageCircle className="mr-1.5 h-3.5 w-3.5 text-emerald-700" />
              WhatsApp
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCanalInicial("EMAIL");
                setAberto(true);
              }}
              disabled={!destinatarioValido.length}
            >
              <Mail className="mr-1.5 h-3.5 w-3.5 text-sky-700" />
              E-mail
            </Button>
          </div>
        </div>
      </div>

      <MensagemEnvioDialog
        aberto={aberto}
        onClose={() => setAberto(false)}
        onFeedback={onFeedback}
        tipoDestinatarioInicial={destinatarioTipo}
        canalInicial={canalInicial}
        destinatariosFixos={destinatarioValido}
        contextoExtra={contextoExtra}
      />
    </>
  );
}
