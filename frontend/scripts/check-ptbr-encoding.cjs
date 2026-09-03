const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const scanTargets = [
  "src/pages",
  "src/features",
  "src/services",
  "src/lib",
  "src/components",
  "src/routes",
  "src/types",
  "src/app/app-shell.tsx"
];

const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".scss", ".html"]);
// Detecta sequências de mojibake, sem acusar letras válidas do português,
// como o "Ã" presente em palavras legítimas (por exemplo, "ELEIÇÃO").
const brokenPatterns = [/Ã[\u0080-\u00bf]/g, /ï¿½/g, /�/g];

function collectFiles(targetPath, output) {
  if (!fs.existsSync(targetPath)) return;
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    if (allowedExtensions.has(path.extname(targetPath))) output.push(targetPath);
    return;
  }

  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    const fullPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, output);
      continue;
    }
    if (entry.isFile() && allowedExtensions.has(path.extname(entry.name))) {
      output.push(fullPath);
    }
  }
}

function findBrokenLine(content, index) {
  let start = index;
  while (start > 0 && content[start - 1] !== "\n") start -= 1;
  let end = index;
  while (end < content.length && content[end] !== "\n") end += 1;
  const line = content.slice(start, end);
  const lineNumber = content.slice(0, start).split("\n").length;
  return { lineNumber, line };
}

const files = [];
for (const target of scanTargets) {
  collectFiles(path.join(projectRoot, target), files);
}

const issues = [];
for (const filePath of files) {
  const content = fs.readFileSync(filePath, "utf8");
  for (const pattern of brokenPatterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(content);
    if (!match) continue;
    const detail = findBrokenLine(content, match.index);
    issues.push({
      file: path.relative(projectRoot, filePath),
      line: detail.lineNumber,
      sample: detail.line.trim().slice(0, 140)
    });
    break;
  }
}

if (issues.length > 0) {
  console.error("Foram encontrados textos com codificacao quebrada (pt-BR) no frontend:");
  for (const issue of issues.slice(0, 50)) {
    console.error(`- ${issue.file}:${issue.line} -> ${issue.sample}`);
  }
  if (issues.length > 50) {
    console.error(`... e mais ${issues.length - 50} arquivo(s)/ocorrencia(s).`);
  }
  console.error("Corrija os acentos antes de executar o projeto.");
  process.exit(1);
}

console.log("Verificacao de acentuacao pt-BR concluida sem erros.");
