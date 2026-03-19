import { datasComemorativasSeed } from "../datas-comemorativas.seed.js";
export class LocalCommemorativeProvider {
    getProviderName() {
        return "local";
    }
    async healthCheck() {
        return true;
    }
    async importByYear(_year) {
        return datasComemorativasSeed;
    }
    async importByMonth(_year, month) {
        return datasComemorativasSeed.filter((item) => item.mes === month);
    }
}
