/**
 * Sorts an array of strings in natural order (e.g., '1', '2', '10' instead of '1', '10', '2').
 * @param arr The array of strings to sort.
 * @returns A new array with the strings sorted naturally.
 */
export function naturalSort(arr: string[]): string[] {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  return [...arr].sort(collator.compare);
}
