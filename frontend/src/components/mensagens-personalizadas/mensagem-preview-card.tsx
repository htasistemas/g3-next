import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MensagemCanalEnvio, MensagemPreview } from "@/types/mensagens-personalizadas";

export function MensagemPreviewCard({
  canal,
  preview
}: {
  canal: MensagemCanalEnvio;
  preview: MensagemPreview | null;
}) {
  if (!preview) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-sm text-[var(--g3-muted)]">
          Selecione a mensagem e o destinatário para visualizar a prévia.
        </CardContent>
      </Card>
    );
  }

  if (canal === "WHATSAPP") {
    return (
      <Card className="border-emerald-200 bg-emerald-50/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-emerald-900">Pré-visualização do WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
              {preview.destinatario.nome}
            </p>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
              {preview.whatsapp.textoCompleto}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-sky-200 bg-sky-50/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-sky-900">Pré-visualização do e-mail</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-xl border border-sky-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">Assunto</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{preview.email.assunto}</p>
        </div>
        <div className="rounded-xl border border-sky-100 bg-white p-4 shadow-sm">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
            {[preview.email.saudacao, "", preview.email.corpo, "", "Atenciosamente,", preview.email.assinatura].join(
              "\n"
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
