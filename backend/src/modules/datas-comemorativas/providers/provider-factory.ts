import { BrasilApiHolidayProvider } from "./brasil-api-holiday.provider.js";
import type { CommemorativeDateProviderInterface } from "./commemorative-date-provider.interface.js";
import type { HolidayProviderInterface } from "./holiday-provider.interface.js";
import { LocalCommemorativeProvider } from "./local-commemorative.provider.js";
import { NagerDateHolidayProvider } from "./nager-date-holiday.provider.js";

export class ProviderFactory {
  private readonly holidayProviders = new Map<string, HolidayProviderInterface>([
    ["brasilapi", new BrasilApiHolidayProvider()],
    ["nager", new NagerDateHolidayProvider()]
  ]);

  private readonly commemorativeProviders = new Map<string, CommemorativeDateProviderInterface>([
    ["local", new LocalCommemorativeProvider()]
  ]);

  getHolidayProvider(name?: string | null) {
    if (!name) {
      return this.holidayProviders.get("brasilapi")!;
    }
    return this.holidayProviders.get(name.toLowerCase()) ?? this.holidayProviders.get("brasilapi")!;
  }

  getHolidayProviderWithFallback(primary?: string | null, fallback?: string | null) {
    return {
      primary: this.getHolidayProvider(primary),
      fallback: fallback ? this.getHolidayProvider(fallback) : undefined
    };
  }

  getCommemorativeProvider(name?: string | null) {
    if (!name) {
      return this.commemorativeProviders.get("local")!;
    }
    return this.commemorativeProviders.get(name.toLowerCase()) ?? this.commemorativeProviders.get("local")!;
  }

  listHolidayProviders() {
    return Array.from(this.holidayProviders.keys());
  }

  listCommemorativeProviders() {
    return Array.from(this.commemorativeProviders.keys());
  }
}
