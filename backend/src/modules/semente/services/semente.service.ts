import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { SementeRepository } from "../repositories/semente.repository.js";

type ChatPayload = {
  usuarioId: string;
  mensagem: string;
};

type SementeChatResponse = {
  tipo: "aprendizado" | "resposta";
  answer: string;
  memorias?: string[];
};

function montarInstrucaoSistema(memorias: string[]) {
  const blocoMemorias = memorias.length
    ? memorias.map((memoria, indice) => `${indice + 1}. ${memoria}`).join("\n")
    : "Nenhuma memória registrada para este usuário.";

  return `Você é a Semente, integrada ao sistema g3n. Aqui está o seu banco de memória sobre este usuário: ${blocoMemorias}`;
}

export class SementeService {
  private readonly repository = new SementeRepository();

  async chat(payload: ChatPayload): Promise<SementeChatResponse> {
    const mensagem = payload.mensagem.trim();

    if (mensagem.toLowerCase().startsWith("/aprender ")) {
      const conteudo = mensagem.slice("/aprender ".length).trim();
      if (!conteudo) {
        throw new AppError("Informe o conteúdo a ser aprendido após o comando /aprender.", 422);
      }

      await this.repository.adicionarMemoria(payload.usuarioId, conteudo);
      const memorias = await this.repository.listarMemorias(payload.usuarioId);

      return {
        tipo: "aprendizado",
        answer: "Memória salva com sucesso. Vou considerar essa preferência nas próximas respostas.",
        memorias: memorias.map((item) => item.conteudo)
      };
    }

    if (!env.APP_GEMINI_API_KEY || env.IA_PROVIDER !== "gemini") {
      throw new AppError(
        "A IA generativa nao esta configurada no backend. Defina GEMINI_API_KEY, IA_PROVIDER=gemini e IA_MODEL no ambiente.",
        503
      );
    }

    const memorias = await this.repository.listarMemorias(payload.usuarioId);
    const client = new GoogleGenerativeAI(env.APP_GEMINI_API_KEY);
    const model = client.getGenerativeModel({
      model: env.IA_MODEL,
      systemInstruction: montarInstrucaoSistema(memorias.map((item) => item.conteudo))
    });

    const result = await model.generateContent(mensagem);
    const answer = result.response.text().trim();

    return {
      tipo: "resposta",
      answer: answer || "Nao foi possivel gerar uma resposta agora.",
      memorias: memorias.map((item) => item.conteudo)
    };
  }
}
