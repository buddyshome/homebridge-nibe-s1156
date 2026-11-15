/**
 * Makes a string valid for HAP 'Name' / accessory display names.
 * HAP-NodeJS requires: starts and ends with a letter or number, and only
 * letters, numbers, spaces and  ’'&!._:;()/,-  in between.
 *
 * - drops a legacy "::<timestamp>" suffix
 * - removes parentheses ("Average temperature (BT1)" -> "Average temperature BT1")
 * - removes any other unsupported characters
 * - trims leading/trailing characters that are not letters or numbers
 */
export function toHapName(value: string | undefined, fallback = 'Nibe'): string {
  const sanitized = (value ?? '')
    .replace(/::\d+$/, '')
    .replace(/[()]/g, ' ')
    .replace(/[^\p{L}\p{N}\p{Zs}’'&!._:;/,-]/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  return sanitized || fallback;
}
