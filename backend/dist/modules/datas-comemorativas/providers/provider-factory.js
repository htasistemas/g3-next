import { BrasilApiHolidayProvider } from "./brasil-api-holiday.provider.js";
import { LocalCommemorativeProvider } from "./local-commemorative.provider.js";
import { NagerDateHolidayProvider } from "./nager-date-holiday.provider.js";
export class ProviderFactory {
    holidayProviders = new Map([
        ["brasilapi", new BrasilApiHolidayProvider()],
        ["nager", new NagerDateHolidayProvider()]
    ]);
    commemorativeProviders = new Map([
        ["local", new LocalCommemorativeProvider()]
    ]);
    getHolidayProvider(name) {
        if (!name) {
            return this.holidayProviders.get("brasilapi");
        }
        return this.holidayProviders.get(name.toLowerCase()) ?? this.holidayProviders.get("brasilapi");
    }
    getHolidayProviderWithFallback(primary, fallback) {
        return {
            primary: this.getHolidayProvider(primary),
            fallback: fallback ? this.getHolidayProvider(fallback) : undefined
        };
    }
    getCommemorativeProvider(name) {
        if (!name) {
            return this.commemorativeProviders.get("local");
        }
        return this.commemorativeProviders.get(name.toLowerCase()) ?? this.commemorativeProviders.get("local");
    }
    listHolidayProviders() {
        return Array.from(this.holidayProviders.keys());
    }
    listCommemorativeProviders() {
        return Array.from(this.commemorativeProviders.keys());
    }
}
