import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { identificador: string; nome: string; gestao: string };

function escaparHtml(valor: string) {
  return valor.replace(/[&<>"']/gu, (caractere) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caractere] ?? caractere);
}

export function CipaDivulgacaoEleicao({ identificador, nome, gestao }: Props) {
  const [qrSvg, setQrSvg] = useState("");
  const link = useMemo(() => `${window.location.origin}/cipa/eleicao/${encodeURIComponent(identificador)}`, [identificador]);

  useEffect(() => {
    let ativo = true;
    void QRCode.toString(link, { type: "svg", margin: 1, width: 220, color: { dark: "#0f172a", light: "#ffffff" } })
      .then((svg) => { if (ativo) setQrSvg(svg); })
      .catch(() => { if (ativo) setQrSvg(""); });
    return () => { ativo = false; };
  }, [link]);

  async function copiarLink() {
    await navigator.clipboard?.writeText(link);
  }

  function imprimirCartaz() {
    const janela = window.open("", "_blank", "noopener,noreferrer");
    if (!janela) return;
    janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Divulgação da eleição da CIPA</title><style>body{font-family:Arial,sans-serif;color:#0f172a;text-align:center;padding:36px}h1{font-size:28px;margin-bottom:8px}p{font-size:18px}svg{margin:24px auto;display:block;width:280px;height:280px}.url{font-size:14px;word-break:break-all}</style></head><body><h1>ELEIÇÃO DA CIPA</h1><p>${escaparHtml(nome)} — Gestão ${escaparHtml(gestao)}</p>${qrSvg}<p>Escaneie o QR Code para acessar o portal da eleição.</p><p class="url">${escaparHtml(link)}</p><script>window.onload=()=>window.print();</script></body></html>`);
    janela.document.close();
  }

  function compartilhar() {
    const texto = `Participe da eleição da CIPA — Gestão ${gestao}. Acesse: ${link}`;
    if (navigator.share) void navigator.share({ title: "Eleição da CIPA", text: texto, url: link });
    else void copiarLink();
  }

  return <Card><CardHeader><CardTitle>Divulgação da eleição</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center"><div className="space-y-2"><p className="text-sm text-[var(--g3-muted)]">Compartilhe o acesso oficial da eleição. O link abre o portal público e não expõe dados pessoais.</p><p className="break-all rounded-md bg-[var(--g3-card-soft)] p-3 text-sm font-medium">{link}</p><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => void copiarLink()}>Copiar link</Button><Button size="sm" variant="outline" onClick={compartilhar}>Compartilhar</Button><Button size="sm" variant="outline" onClick={imprimirCartaz} disabled={!qrSvg}>Imprimir cartaz</Button></div></div><div className="rounded-xl border border-[var(--g3-border)] bg-white p-3" aria-label="QR Code da eleição" dangerouslySetInnerHTML={{ __html: qrSvg || "<p>Gerando QR Code...</p>" }} /></CardContent></Card>;
}
