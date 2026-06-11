import fs from "node:fs";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

function carregarVersaoSistema() {
  const versaoEnv = process.env.VITE_APP_VERSION?.trim();
  if (versaoEnv) {
    return versaoEnv;
  }

  const arquivosVersao = [
    path.resolve(__dirname, ".g3-version"),
    path.resolve(__dirname, "../updates/version.txt")
  ];

  for (const arquivo of arquivosVersao) {
    if (!fs.existsSync(arquivo)) {
      continue;
    }

    const versao = fs.readFileSync(arquivo, "utf8").split(/\r?\n/u, 1)[0]?.trim();
    if (versao) {
      return versao;
    }
  }

  return "1.00.147";
}

const appVersion = carregarVersaoSistema();

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  }
});
