import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: "SUA_API_KEY"
});

const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Explique o que é API"
});

console.log(response.text);