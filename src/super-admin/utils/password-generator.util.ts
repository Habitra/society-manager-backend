import { randomBytes, randomInt } from 'crypto';

/**
 * Generates a cryptographically secure temporary password.
 *
 * Uses crypto.randomInt() for character selection (CSPRNG-backed) and
 * Fisher-Yates shuffle with crypto.randomBytes() for uniform permutation.
 *
 * Output: 12-character string guaranteed to contain at least one uppercase,
 * one lowercase, one digit, and one special character.
 */
export function generateTemporaryPassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = uppercase + lowercase + numbers + symbols;

  // Guarantee at least one character from each required class
  const chars: string[] = [
    uppercase[randomInt(uppercase.length)],
    lowercase[randomInt(lowercase.length)],
    numbers[randomInt(numbers.length)],
    symbols[randomInt(symbols.length)],
  ];

  // Fill remaining positions to reach length 12
  while (chars.length < 12) {
    chars.push(allChars[randomInt(allChars.length)]);
  }

  // Fisher-Yates shuffle using crypto.randomBytes() for uniform permutation
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
