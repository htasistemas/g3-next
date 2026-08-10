import { useEffect, useLayoutEffect, useState } from "react";
import { ArrowLeft, ArrowRight, GraduationCap, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type CadastroBeneficiarioTourProps = {
  aberto: boolean;
  onClose: () => void;
  onNavigate: (aba: "dados") => void;
};

type TourStep = {
  id: string;
  titulo: string;
  descricao: string;
  seletor: string;
  aba?: "dados";
};

const passos: TourStep[] = [
  {
    id: "novo",
    titulo: "Comece por um novo cadastro",
    descricao: "Clique em Novo para abrir um formulário limpo e iniciar o cadastro do beneficiário.",
    seletor: '[data-tour="beneficiario-novo"]'
  },
  {
    id: "dados",
    titulo: "Preencha os dados pessoais",
    descricao: "A aba Dados pessoais reúne as informações principais. Comece pelo nome completo e avance pelas demais abas.",
    seletor: '[data-tour="beneficiario-aba-dados"]',
    aba: "dados"
  },
  {
    id: "nome",
    titulo: "Informe o nome completo",
    descricao: "Digite o nome completo conforme o documento do beneficiário. Os campos obrigatórios ficam sinalizados no formulário.",
    seletor: '[data-tour="beneficiario-nome"]',
    aba: "dados"
  },
  {
    id: "salvar",
    titulo: "Salve o cadastro",
    descricao: "Depois de preencher os dados obrigatórios, use Salvar. O sistema informa se existir alguma pendência antes de concluir.",
    seletor: '[data-tour="beneficiario-salvar"]',
    aba: "dados"
  }
];

function obterPosicaoElemento(seletor: string) {
  const elemento = document.querySelector<HTMLElement>(seletor);
  if (!elemento) return null;
  elemento.scrollIntoView({ block: "nearest", inline: "nearest" });
  const retangulo = elemento.getBoundingClientRect();
  return {
    top: retangulo.top,
    left: retangulo.left,
    width: retangulo.width,
    height: retangulo.height
  };
}

export function CadastroBeneficiarioTour({
  aberto,
  onClose,
  onNavigate
}: CadastroBeneficiarioTourProps) {
  const [indice, setIndice] = useState(0);
  const [posicao, setPosicao] = useState<ReturnType<typeof obterPosicaoElemento>>(null);
  const passo = passos[indice];
  const ultimoPasso = indice === passos.length - 1;

  useEffect(() => {
    if (aberto) setIndice(0);
  }, [aberto]);

  useLayoutEffect(() => {
    if (!aberto) return;

    const atualizarPosicao = () => setPosicao(obterPosicaoElemento(passo.seletor));
    const frame = window.requestAnimationFrame(atualizarPosicao);
    window.addEventListener("resize", atualizarPosicao);
    window.addEventListener("scroll", atualizarPosicao, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", atualizarPosicao);
      window.removeEventListener("scroll", atualizarPosicao, true);
    };
  }, [aberto, passo]);

  if (!aberto) return null;

  function irParaPasso(proximoIndice: number) {
    const proximoPasso = passos[proximoIndice];
    if (proximoPasso.aba) onNavigate(proximoPasso.aba);
    setIndice(proximoIndice);
  }

  const larguraJanela = typeof window === "undefined" ? 1280 : window.innerWidth;
  const alturaJanela = typeof window === "undefined" ? 800 : window.innerHeight;
  const larguraCartao = Math.min(360, larguraJanela - 32);
  const posicaoCartao = posicao
    ? {
        top: Math.min(posicao.top + posicao.height + 14, alturaJanela - 230),
        left: Math.min(Math.max(16, posicao.left), larguraJanela - larguraCartao - 16)
      }
    : {
        top: Math.max(24, alturaJanela / 2 - 120),
        left: Math.max(16, (larguraJanela - larguraCartao) / 2)
      };

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Guia de preenchimento">
      {posicao ? (
        <div
          className="pointer-events-none fixed rounded-md ring-2 ring-[var(--g3-primary)] ring-offset-2 transition-all duration-200"
          style={{
            top: posicao.top - 4,
            left: posicao.left - 4,
            width: posicao.width + 8,
            height: posicao.height + 8,
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.48)"
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-slate-900/48" />
      )}

      <div
        className="fixed rounded-xl border border-[var(--g3-primary)]/25 bg-white p-4 shadow-2xl transition-all duration-200"
        style={{ top: posicaoCartao.top, left: posicaoCartao.left, width: larguraCartao }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 rounded-full bg-[var(--g3-primary-soft)] p-2 text-[var(--g3-primary)]">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">
                Guia de preenchimento · {indice + 1}/{passos.length}
              </p>
              <h2 className="mt-1 text-sm font-semibold text-slate-900">{passo.titulo}</h2>
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose} aria-label="Encerrar guia">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <p className="mt-3 text-sm leading-5 text-slate-600">{passo.descricao}</p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => irParaPasso(indice - 1)} disabled={indice === 0}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Voltar
          </Button>
          <Button type="button" size="sm" onClick={() => (ultimoPasso ? onClose() : irParaPasso(indice + 1))}>
            {ultimoPasso ? "Finalizar" : "Próximo"}
            {!ultimoPasso ? <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" /> : null}
          </Button>
        </div>
      </div>
    </div>
  );
}
