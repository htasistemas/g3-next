import dns from "node:dns/promises";
import net from "node:net";

function ipv4Privado(ip: string) {
  const partes = ip.split(".").map(Number);
  if (partes.length !== 4 || partes.some((parte) => !Number.isInteger(parte) || parte < 0 || parte > 255)) return false;
  return partes[0] === 10 || partes[0] === 127 || (partes[0] === 172 && partes[1] >= 16 && partes[1] <= 31) ||
    (partes[0] === 192 && partes[1] === 168) || (partes[0] === 169 && partes[1] === 254) || partes[0] === 0;
}

function ipPrivado(ip: string) {
  if (net.isIPv4(ip)) return ipv4Privado(ip);
  if (net.isIPv6(ip)) {
    const normalizado = ip.toLowerCase();
    return normalizado === "::1" || normalizado === "::" || normalizado.startsWith("fc") ||
      normalizado.startsWith("fd") || normalizado.startsWith("fe8") || normalizado.startsWith("fe9") ||
      normalizado.startsWith("fea") || normalizado.startsWith("feb");
  }
  return false;
}

export function ehDestinoIpPrivado(hostname: string) {
  return ipPrivado(hostname.replace(/^\[|\]$/g, ""));
}

export async function validarUrlRemotaPublica(valor: string) {
  const url = new URL(valor);
  if (!(["http:", "https:"].includes(url.protocol)) || url.username || url.password || url.port && !["80", "443"].includes(url.port)) {
    throw new Error("Destino remoto nao permitido.");
  }

  const hostname = url.hostname.toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || ehDestinoIpPrivado(hostname)) {
    throw new Error("Destino remoto nao permitido.");
  }

  if (!net.isIP(hostname)) {
    const enderecos = await dns.lookup(hostname, { all: true, verbatim: true });
    if (!enderecos.length || enderecos.some((endereco) => ipPrivado(endereco.address))) {
      throw new Error("Destino remoto nao permitido.");
    }
  }

  return url;
}
