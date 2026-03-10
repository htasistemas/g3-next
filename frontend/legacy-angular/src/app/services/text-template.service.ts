import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface TextTemplates {
  cession: string;
  loan: string;
}

@Injectable({ providedIn: 'root' })
export class TextTemplateService {
  private readonly storageKey = 'g3_text_templates';
  private readonly defaults: TextTemplates = {
    cession:
      'TERMO DE CESSÃO DE BEM PATRIMONIAL\n\n' +
      'Pelo presente instrumento, fica registrado que o bem {{nome}}, identificado pelo número de patrimônio {{numeroPatrimonio}}, ' +
      'foi cedido para uso e responsabilidade de {{responsavel}}, alocado em {{local}}, com valor de aquisição de {{valor}}.\n\n' +
      'O responsável declara estar ciente de que o bem permanece de propriedade da instituição, comprometendo-se a zelar pela sua conservação, ' +
      'utilizá-lo exclusivamente para fins institucionais, comunicar imediatamente qualquer dano, perda ou necessidade de manutenção e devolvê-lo ' +
      'quando solicitado ou ao término da cessão.\n\n' +
      'Dados do bem: Categoria {{categoria}} {{subcategoria}}. Estado de conservação {{conservacao}}. Situação {{status}}. Data de aquisição {{dataAquisicao}}.\n\n' +
      'Este termo é emitido na data de {{dataEmissao}}.',
    loan:
      'Eu, {{responsavel}}, assumo responsabilidade pelo empréstimo do bem {{nome}} (patrimônio {{numeroPatrimonio}}), alocado em {{local}}, comprometendo-me a devolvê-lo nas mesmas condições. Valor de referência: {{valor}}.'
  };

  private readonly templatesSubject = new BehaviorSubject<TextTemplates>(this.loadTemplates());
  readonly templates$ = this.templatesSubject.asObservable();

  getTemplates(): TextTemplates {
    return this.templatesSubject.value;
  }

  updateTemplates(partial: Partial<TextTemplates>): TextTemplates {
    const merged = { ...this.templatesSubject.value, ...partial } as TextTemplates;
    this.templatesSubject.next(merged);
    localStorage.setItem(this.storageKey, JSON.stringify(merged));
    return merged;
  }

  getDefaults(): TextTemplates {
    return this.defaults;
  }

  reset(): TextTemplates {
    this.templatesSubject.next(this.defaults);
    localStorage.removeItem(this.storageKey);
    return this.defaults;
  }

  private loadTemplates(): TextTemplates {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<TextTemplates>;
        return { ...this.defaults, ...parsed } as TextTemplates;
      } catch (error) {
        console.warn('Não foi possível carregar modelos de texto salvos', error);
      }
    }

    return this.defaults;
  }
}

