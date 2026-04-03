export const fotoLarguraPx = 400;
export const fotoAlturaPx = 300;
export const fotoMaximaBytes = 5 * 1024 * 1024;

function carregarImagem(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => reject(new Error("Não foi possível processar a imagem."));
    imagem.src = dataUrl;
  });
}

export function lerArquivoComoDataUrl(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo de imagem."));
    reader.readAsDataURL(arquivo);
  });
}

export async function normalizarImagemParaJpeg(
  dataUrl: string,
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    fillStyle?: string;
  }
): Promise<string> {
  const imagem = await carregarImagem(dataUrl);
  const maxWidth = options?.maxWidth ?? imagem.width;
  const maxHeight = options?.maxHeight ?? imagem.height;
  const quality = options?.quality ?? 0.92;
  const fillStyle = options?.fillStyle ?? "#ffffff";

  const escala = Math.min(maxWidth / imagem.width, maxHeight / imagem.height, 1);
  const largura = Math.max(1, Math.round(imagem.width * escala));
  const altura = Math.max(1, Math.round(imagem.height * escala));

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const contexto = canvas.getContext("2d");

  if (!contexto) {
    throw new Error("Não foi possível processar a imagem.");
  }

  contexto.fillStyle = fillStyle;
  contexto.fillRect(0, 0, largura, altura);
  contexto.drawImage(imagem, 0, 0, largura, altura);

  return canvas.toDataURL("image/jpeg", quality);
}

export async function ajustarParaFotoTresPorQuatro(dataUrl: string): Promise<string> {
  const imagem = await carregarImagem(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = fotoLarguraPx;
  canvas.height = fotoAlturaPx;
  const contexto = canvas.getContext("2d");

  if (!contexto) {
    throw new Error("Não foi possível processar a imagem da foto.");
  }

  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, fotoLarguraPx, fotoAlturaPx);

  const escala = Math.min(fotoLarguraPx / imagem.width, fotoAlturaPx / imagem.height);
  const larguraRender = imagem.width * escala;
  const alturaRender = imagem.height * escala;
  const destinoX = (fotoLarguraPx - larguraRender) / 2;
  const destinoY = (fotoAlturaPx - alturaRender) / 2;

  contexto.drawImage(imagem, destinoX, destinoY, larguraRender, alturaRender);
  return canvas.toDataURL("image/jpeg", 0.92);
}

export function capturarFotoTresPorQuatroDoVideo(video: HTMLVideoElement): string {
  const canvas = document.createElement("canvas");
  canvas.width = fotoLarguraPx;
  canvas.height = fotoAlturaPx;
  const contexto = canvas.getContext("2d");

  if (!contexto) {
    throw new Error("Não foi possível capturar a imagem da webcam.");
  }

  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, fotoLarguraPx, fotoAlturaPx);

  const escala = Math.min(fotoLarguraPx / video.videoWidth, fotoAlturaPx / video.videoHeight);
  const larguraRender = video.videoWidth * escala;
  const alturaRender = video.videoHeight * escala;
  const destinoX = (fotoLarguraPx - larguraRender) / 2;
  const destinoY = (fotoAlturaPx - alturaRender) / 2;

  contexto.drawImage(video, destinoX, destinoY, larguraRender, alturaRender);
  return canvas.toDataURL("image/jpeg", 0.92);
}
