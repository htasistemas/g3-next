export class BrasilApiHolidayProvider {
    getProviderName() {
        return "brasilapi";
    }
    async healthCheck() {
        try {
            await this.getHolidays(new Date().getFullYear(), "BR");
            return true;
        }
        catch {
            return false;
        }
    }
    async getHolidays(year, country) {
        if (country.toUpperCase() !== "BR") {
            return [];
        }
        const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
        if (!response.ok) {
            throw new Error(`BrasilAPI indisponível (${response.status}).`);
        }
        const data = (await response.json());
        return data.map((item) => ({
            titulo: item.name,
            descricao: item.type ? `Feriado ${item.type.toLowerCase()}` : "Feriado nacional",
            dataEvento: item.date,
            tipoEvento: "feriado_nacional",
            abrangencia: "nacional",
            origemReferencia: "https://brasilapi.com.br/docs#tag/Feriados"
        }));
    }
}
