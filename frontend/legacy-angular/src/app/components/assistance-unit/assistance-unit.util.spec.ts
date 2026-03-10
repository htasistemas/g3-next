import { formatTitleCase, isValidCnpj } from './assistance-unit.util';

describe('AssistanceUnit utils', () => {
  it('capitalizes every word and hyphen segments', () => {
    expect(formatTitleCase('unidade central')).toBe('Unidade Central');
    expect(formatTitleCase('rota sul-superior')).toBe('Rota Sul-Superior');
    expect(formatTitleCase('  varios   espacos  ')).toBe('  Varios   Espacos  ');
  });

  it('returns same string when value is empty', () => {
    expect(formatTitleCase('')).toBe('');
    expect(formatTitleCase('   ')).toBe('   ');
  });

  it('validates a known good CNPJ', () => {
    expect(isValidCnpj('12.345.678/9012-30')).toBe(true);
  });

  it('rejects invalid CNPJ sequences', () => {
    expect(isValidCnpj('11.111.111/1111-11')).toBe(false);
    expect(isValidCnpj('12.345.678/9012-31')).toBe(false);
  });
});

