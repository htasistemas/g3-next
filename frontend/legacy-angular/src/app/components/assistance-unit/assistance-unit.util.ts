export function formatTitleCase(value: string): string {
  if (!value) {
    return value;
  }

  const convert = (word: string) =>
    word
      .split('-')
      .map((segment) =>
        segment ? segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase() : ''
      )
      .join('-');

  return value.replace(/\S+/g, convert);
}

export function isValidCnpj(value: string): boolean {
  const digits = (value || '').replace(/\D/g, '');

  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) {
    return false;
  }

  const calculateVerifier = (base: string, weights: number[]) => {
    let total = 0;
    for (let i = 0; i < base.length; i += 1) {
      total += parseInt(base.charAt(i), 10) * weights[i];
    }
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstVerifier = calculateVerifier(digits.slice(0, 12), [
    5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2
  ]);
  const secondVerifier = calculateVerifier(digits.slice(0, 13), [
    6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2
  ]);

  return (
    firstVerifier === Number(digits.charAt(12)) && secondVerifier === Number(digits.charAt(13))
  );
}

