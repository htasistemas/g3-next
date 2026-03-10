export function titleCaseWords(value: string): string {
  if (typeof value !== 'string') return '';

  const lowerCased = value.toLowerCase();
  return lowerCased.replace(/\b(\p{L})(\p{L}*)/gu, (_, first: string, rest: string) => `${first.toUpperCase()}${rest}`);
}

