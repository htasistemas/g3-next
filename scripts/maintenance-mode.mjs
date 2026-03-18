#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const action = (process.argv[2] || "").trim().toLowerCase();
const defaultFlagPath = path.resolve(process.cwd(), "docker/runtime/maintenance.enable");
const flagPath = process.env.APP_MAINTENANCE_FLAG_PATH
  ? path.resolve(process.env.APP_MAINTENANCE_FLAG_PATH)
  : defaultFlagPath;

function ensureDir() {
  fs.mkdirSync(path.dirname(flagPath), { recursive: true });
}

function enable() {
  ensureDir();
  fs.writeFileSync(
    flagPath,
    `enabled_at=${new Date().toISOString()}\nsource=node-script\n`,
    "utf8"
  );
  console.log(`Modo manutencao ativado em ${flagPath}`);
}

function disable() {
  if (fs.existsSync(flagPath)) {
    fs.unlinkSync(flagPath);
  }
  console.log(`Modo manutencao desativado em ${flagPath}`);
}

function status() {
  console.log(fs.existsSync(flagPath) ? "ativo" : "inativo");
}

switch (action) {
  case "on":
    enable();
    break;
  case "off":
    disable();
    break;
  case "status":
    status();
    break;
  default:
    console.error("Uso: node scripts/maintenance-mode.mjs <on|off|status>");
    process.exit(1);
}
