import { datasComemorativasSeed } from "../datas-comemorativas.seed.js";
import type { DataComemorativaImportItem } from "../datas-comemorativas.types.js";
import type { CommemorativeDateProviderInterface } from "./commemorative-date-provider.interface.js";

export class LocalCommemorativeProvider implements CommemorativeDateProviderInterface {
  getProviderName() {
    return "local";
  }

  async healthCheck() {
    return true;
  }

  async importByYear(_year: number): Promise<DataComemorativaImportItem[]> {
    return datasComemorativasSeed;
  }

  async importByMonth(_year: number, month: number): Promise<DataComemorativaImportItem[]> {
    return datasComemorativasSeed.filter((item) => item.mes === month);
  }
}

