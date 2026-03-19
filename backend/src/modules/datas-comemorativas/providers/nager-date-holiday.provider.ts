import type { HolidayProviderInterface, HolidayProviderItem } from "./holiday-provider.interface.js";

type NagerHolidayResponse = Array<{
  date: string;
  localName: string;
  name: string;
  counties?: string[] | null;
  global?: boolean;
}>;

export class NagerDateHolidayProvider implements HolidayProviderInterface {
  getProviderName() {
    return "nager";
  }

  async healthCheck() {
    try {
      await this.getHolidays(new Date().getFullYear(), "BR");
      return true;
    } catch {
      return false;
    }
  }

  async getHolidays(year: number, country: string, state?: string | null): Promise<HolidayProviderItem[]> {
    const response = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${encodeURIComponent(country.toUpperCase())}`
    );
    if (!response.ok) {
      throw new Error(`Nager.Date indisponível (${response.status}).`);
    }

    const data = (await response.json()) as NagerHolidayResponse;
    return data
      .filter((item) => {
        if (!state) return true;
        if (!item.counties?.length) return true;
        return item.counties.some((county) => county.toUpperCase().endsWith(`-${state.toUpperCase()}`));
      })
      .map((item) => ({
        titulo: item.localName || item.name,
        descricao: item.global === false ? "Feriado regional" : "Feriado nacional",
        dataEvento: item.date,
        tipoEvento: item.global === false ? "feriado_estadual" : "feriado_nacional",
        abrangencia: item.global === false ? "estadual" : "nacional",
        uf: item.global === false ? state?.toUpperCase() ?? undefined : undefined,
        origemReferencia: "https://date.nager.at/"
      }));
  }
}

