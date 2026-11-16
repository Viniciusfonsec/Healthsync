export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function maskCpf(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function isValidCpf(value: string): boolean {
  const cpf = digitsOnly(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calculate = (base: string, factor: number) => {
    let total = 0;
    for (const char of base) total += Number(char) * factor--;
    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return (
    calculate(cpf.slice(0, 9), 10) === Number(cpf[9]) && calculate(cpf.slice(0, 10), 11) === Number(cpf[10])
  );
}

export function maskPhone(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
