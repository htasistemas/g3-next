import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
interface IbgeCity {
  id: number;
  nome: string;
  microrregiao: {
    mesorregiao: {
      UF: {
        sigla: string;
      };
    };
  };
}

export interface CityPayload {
  id: number;
  nome: string;
  uf: string;
}

@Injectable({ providedIn: 'root' })
export class CityService {
  private readonly apiUrl =
    'https://servicodados.ibge.gov.br/api/v1/localidades/estados/31/municipios';
  private cachedCities$: Observable<CityPayload[]> | null = null;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<CityPayload[]> {
    if (!this.cachedCities$) {
      this.cachedCities$ = this.http.get<IbgeCity[]>(this.apiUrl).pipe(
        map((cities) =>
          cities
            .map((city) => ({
              id: city.id,
              nome: city.nome,
              uf: city.microrregiao.mesorregiao.UF.sigla
            }))
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        ),
        shareReplay(1)
      );
    }
    return this.cachedCities$;
  }
}

