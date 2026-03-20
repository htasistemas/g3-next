import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Caminhos relativos à raiz do projeto (D:/g3-next/)
const ROOT_DIR = process.cwd().endsWith("backend") ? path.resolve(process.cwd(), "..") : process.cwd();
const UPDATES_DIR = path.join(ROOT_DIR, "updates");
const PACKAGES_DIR = path.join(UPDATES_DIR, "packages");
const VERSION_FILE = path.join(UPDATES_DIR, "version.json");

function calcularChecksum(filePath: string): string {
  const fileBuffer = readFileSync(filePath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
}

async function main() {
  console.log("🚀 Iniciando geração do pacote de atualização...");
  console.log(`📍 Diretório Raiz: ${ROOT_DIR}`);

  if (!existsSync(VERSION_FILE)) {
    console.error(`❌ Erro: Arquivo ${VERSION_FILE} não encontrado.`);
    return;
  }

  // 1. Ler Manifesto Atual
  const manifesto = JSON.parse(readFileSync(VERSION_FILE, "utf-8"));
  const versao = manifesto.latestVersion;
  const packageName = `g3-next-update-${versao}.zip`;
  const packagePath = path.join(PACKAGES_DIR, packageName);

  // 2. Garantir que a pasta de pacotes existe
  if (!existsSync(PACKAGES_DIR)) {
    mkdirSync(PACKAGES_DIR, { recursive: true });
  }

  console.log(`📦 Criando pacote: ${packageName}`);

  try {
    // 3. Garante que pastas dist existam
    if (!existsSync(path.join(ROOT_DIR, 'backend', 'dist'))) mkdirSync(path.join(ROOT_DIR, 'backend', 'dist'), { recursive: true });
    if (!existsSync(path.join(ROOT_DIR, 'frontend', 'dist'))) mkdirSync(path.join(ROOT_DIR, 'frontend', 'dist'), { recursive: true });

    // 4. Compactar
    if (process.platform === "win32") {
      const comando = `powershell.exe -NoProfile -Command "Compress-Archive -Path '${path.join(ROOT_DIR, 'backend', 'dist')}', '${path.join(ROOT_DIR, 'frontend', 'dist')}' -DestinationPath '${packagePath}' -Force"`;
      execSync(comando);
    } else {
      execSync(`zip -r ${packagePath} backend/dist frontend/dist`);
    }

    console.log("✅ Arquivo ZIP gerado com sucesso.");

    // 5. Calcular Checksum
    const checksum = calcularChecksum(packagePath);
    console.log(`🔐 Checksum gerado: ${checksum}`);

    // 6. Atualizar version.json
    manifesto.packageName = packageName;
    manifesto.checksum = checksum;
    manifesto.releaseDate = new Date().toISOString().slice(0, 10);
    
    writeFileSync(VERSION_FILE, JSON.stringify(manifesto, null, 2), "utf-8");
    console.log("📝 Manifesto version.json atualizado!");

    console.log("\n✨ Atualização PRONTA! Agora você pode testar o botão 'Baixar Pacote' na tela.");
  } catch (error: any) {
    console.error("❌ Erro ao gerar pacote:", error.message);
  }
}

main();
