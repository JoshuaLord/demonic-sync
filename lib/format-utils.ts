const ROMAN_NUMERALS: [number, string][] = [
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

export function toRomanNumeral(num: number): string {
  let result = '';
  let remaining = num;
  for (const [value, symbol] of ROMAN_NUMERALS) {
    while (remaining >= value) {
      result += symbol;
      remaining -= value;
    }
  }
  return result;
}

export function getTierClasses(tier: string): string {
  switch (tier) {
    case 'Easy': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    case 'Medium': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    case 'Hard': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
    case 'Elite': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
    default: return 'bg-red-500/10 text-red-600 dark:text-red-400';
  }
}
