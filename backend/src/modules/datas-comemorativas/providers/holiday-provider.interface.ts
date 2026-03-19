export type HolidayProviderItem = {
  titulo: string;
  descricao?: string;
  dataEvento: string;
  tipoEvento: "feriado_nacional" | "feriado_estadual" | "feriado_municipal";
  abrangencia: "nacional" | "estadual" | "municipal";
  uf?: string;
  municipio?: string;
  origemReferencia?: string;
};

export interface HolidayProviderInterface {
  getHolidays(year: number, country: string, state?: string | null, city?: string | null): Promise<HolidayProviderItem[]>;
  healthCheck(): Promise<boolean>;
  getProviderName(): string;
}

