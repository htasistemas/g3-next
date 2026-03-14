import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
export class DashboardGeocodingService {
    async geocodificar(endereco) {
        const query = this.montarConsulta(endereco);
        if (!query) {
            return null;
        }
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("format", "jsonv2");
        url.searchParams.set("limit", "1");
        url.searchParams.set("countrycodes", "br");
        url.searchParams.set("addressdetails", "0");
        url.searchParams.set("q", query);
        const response = await fetch(url, {
            signal: AbortSignal.timeout(15000),
            headers: {
                "User-Agent": env.APP_GEOCODING_USER_AGENT,
                "Accept-Language": "pt-BR,pt;q=0.9"
            }
        });
        if (!response.ok) {
            throw new AppError("O serviço de geocodificação não respondeu corretamente.", 502);
        }
        const body = (await response.json());
        const first = body[0];
        const latitude = first?.lat ? Number(first.lat) : Number.NaN;
        const longitude = first?.lon ? Number(first.lon) : Number.NaN;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null;
        }
        return { latitude, longitude };
    }
    async aguardarJanelaRateLimit() {
        await new Promise((resolve) => setTimeout(resolve, 1100));
    }
    montarConsulta(endereco) {
        const partes = [
            endereco.logradouro,
            endereco.numero,
            endereco.bairro,
            endereco.cidade,
            endereco.estado,
            endereco.cep
        ]
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter(Boolean);
        return partes.join(", ");
    }
}
