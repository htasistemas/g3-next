import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { identificador: string; nome: string; gestao: string; instituicaoNome?: string; instituicaoCnpj?: string; unidadeNome?: string; inscricoesInicio?: string; inscricoesFim?: string; votacaoInicio?: string; votacaoFim?: string };

function escaparHtml(valor: string) {
  return valor.replace(/[&<>"']/gu, (caractere) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caractere] ?? caractere);
}

function dataPt(valor?: string) { return valor ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(valor)) : "Não informado"; }

export function CipaDivulgacaoEleicao({ identificador, nome, gestao, instituicaoNome, instituicaoCnpj, unidadeNome, inscricoesInicio, inscricoesFim, votacaoInicio, votacaoFim }: Props) {
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
    const infoInstituicao = instituicaoNome || "Instituição responsável";
    janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cartaz — eleição da CIPA</title><style>@page{size:A4 portrait;margin:0}*{box-sizing:border-box}body{margin:0;background:#e8f2ed;font-family:Arial,sans-serif;color:#12352a;-webkit-print-color-adjust:exact;print-color-adjust:exact}.cartaz{width:210mm;min-height:297mm;margin:0 auto;overflow:hidden;background:#fff;position:relative}.faixa{height:72mm;background:linear-gradient(135deg,#075b38,#0b8f5a);color:#fff;padding:19mm 17mm;position:relative}.faixa:after{content:"";position:absolute;width:80mm;height:80mm;border-radius:50%;background:rgba(255,255,255,.1);right:-25mm;top:-25mm}.marca{font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:.85}.faixa h1{font-size:32px;line-height:1.05;margin:15mm 0 3mm;max-width:150mm}.faixa p{font-size:15px;margin:0}.corpo{padding:13mm 17mm}.chamada{font-size:24px;font-weight:800;color:#075b38;margin:0 0 4mm}.sub{font-size:14px;color:#49675b;margin:0 0 10mm}.grade{display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-bottom:10mm}.box{border:1px solid #cbe1d5;border-radius:5mm;padding:6mm;background:#f5fbf7}.box small{display:block;color:#638072;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:2mm}.box strong{font-size:14px}.qr{border:1px solid #cbe1d5;border-radius:6mm;padding:6mm;text-align:center;background:#fff}.qr svg{width:60mm;height:60mm;display:block;margin:0 auto 4mm}.qr strong{font-size:15px}.passos{display:flex;gap:4mm;margin:9mm 0}.passo{flex:1;text-align:center;background:#eaf6ef;border-radius:4mm;padding:5mm 3mm;font-size:12px;font-weight:700}.numero{display:block;color:#0b8f5a;font-size:22px;margin-bottom:2mm}.url{font-size:10px;word-break:break-all;color:#49675b;margin-top:4mm}.rodape{position:absolute;bottom:0;left:0;right:0;background:#12352a;color:#fff;padding:7mm 17mm;font-size:10px;display:flex;justify-content:space-between;gap:8mm}.rodape span:last-child{text-align:right}</style></head><body><main class="cartaz"><section class="faixa"><div class="marca">${escaparHtml(infoInstituicao)}</div><h1>Eleição da CIPA</h1><p>${escaparHtml(nome)} · Gestão ${escaparHtml(gestao)}</p></section><section class="corpo"><h2 class="chamada">Sua participação faz a diferença</h2><p class="sub">Participe da escolha dos representantes dos empregados. A votação é simples, segura e pode ser feita pelo celular.</p><div class="grade"><div class="box"><small>Período de inscrições</small><strong>${dataPt(inscricoesInicio)}<br>até ${dataPt(inscricoesFim)}</strong></div><div class="box"><small>Período de votação</small><strong>${dataPt(votacaoInicio)}<br>até ${dataPt(votacaoFim)}</strong></div><div class="box"><small>Estabelecimento / unidade</small><strong>${escaparHtml(unidadeNome || "Não informado")}</strong></div><div class="box"><small>CNPJ</small><strong>${escaparHtml(instituicaoCnpj || "Não informado")}</strong></div></div><div class="qr">${qrSvg}<strong>Aponte a câmera do celular para votar</strong><div class="url">${escaparHtml(link)}</div></div><div class="passos"><div class="passo"><span class="numero">1</span>Escaneie o QR Code</div><div class="passo"><span class="numero">2</span>Informe CPF e nascimento</div><div class="passo"><span class="numero">3</span>Escolha e confirme</div></div></section><footer class="rodape"><span>ELEIÇÃO DA CIPA</span><span>Em caso de dúvidas, procure o RH ou a comissão eleitoral.</span></footer></main><script>window.onload=()=>{window.focus();window.print()}</script></body></html>`);
    janela.document.close();
  }

  function compartilhar() {
    const texto = `Participe da eleição da CIPA — Gestão ${gestao}. Acesse: ${link}`;
    if (navigator.share) void navigator.share({ title: "Eleição da CIPA", text: texto, url: link });
    else void copiarLink();
  }

  return <Card><CardHeader><CardTitle>Divulgação da eleição</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center"><div className="space-y-2"><p className="text-sm text-[var(--g3-muted)]">Compartilhe o acesso oficial da eleição. O link abre o portal público e não expõe dados pessoais.</p><p className="break-all rounded-md bg-[var(--g3-card-soft)] p-3 text-sm font-medium">{link}</p><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => void copiarLink()}>Copiar link</Button><Button size="sm" variant="outline" onClick={compartilhar}>Compartilhar</Button><Button size="sm" variant="outline" onClick={imprimirCartaz} disabled={!qrSvg}>Imprimir cartaz</Button></div></div><div className="rounded-xl border border-[var(--g3-border)] bg-white p-3" aria-label="QR Code da eleição" dangerouslySetInnerHTML={{ __html: qrSvg || "<p>Gerando QR Code...</p>" }} /></CardContent></Card>;
}
