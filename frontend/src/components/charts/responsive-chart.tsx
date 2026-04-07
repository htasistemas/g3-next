import { useEffect, useRef, useState, type ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

type ResponsiveLength = number | `${number}%`;

type ResponsiveChartProps = {
  children: ReactElement;
  width?: ResponsiveLength;
  height?: ResponsiveLength;
  minWidth?: number;
  minHeight?: number;
};

export function ResponsiveChart({
  children,
  width = "100%",
  height,
  minWidth = 0,
  minHeight = 180
}: ResponsiveChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensoes, setDimensoes] = useState({ width: 0, height: 0 });
  const altura = height ?? minHeight;

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const observedElement = element;

    function atualizarDimensoes() {
      const proximaLargura = Math.floor(observedElement.clientWidth);
      const proximaAltura = Math.floor(observedElement.clientHeight);

      setDimensoes((atual) => {
        if (atual.width === proximaLargura && atual.height === proximaAltura) {
          return atual;
        }

        return {
          width: proximaLargura,
          height: proximaAltura
        };
      });
    }

    atualizarDimensoes();

    const observer = new ResizeObserver(() => {
      atualizarDimensoes();
    });

    observer.observe(observedElement);

    return () => {
      observer.disconnect();
    };
  }, [altura, minHeight, minWidth, width]);

  const pronto = dimensoes.width > 0 && dimensoes.height > 0;

  return (
    <div ref={containerRef} style={{ width, height: altura, minWidth, minHeight }} aria-hidden={!pronto}>
      {pronto ? (
        <ResponsiveContainer width="100%" height={altura} minWidth={minWidth} minHeight={minHeight}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
