import type { DataComemorativaImportItem } from "../datas-comemorativas.types.js";

export interface CommemorativeDateProviderInterface {
  importByYear(year: number): Promise<DataComemorativaImportItem[]>;
  importByMonth(year: number, month: number): Promise<DataComemorativaImportItem[]>;
  healthCheck(): Promise<boolean>;
  getProviderName(): string;
}

