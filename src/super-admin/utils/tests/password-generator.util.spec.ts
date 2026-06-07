import { generateTemporaryPassword } from '../password-generator.util';

describe('generateTemporaryPassword', () => {
  it('should generate a 12-character password', () => {
    const pwd = generateTemporaryPassword();
    expect(pwd.length).toBe(12);
  });

  it('should contain at least one uppercase letter', () => {
    const pwd = generateTemporaryPassword();
    expect(/[A-Z]/.test(pwd)).toBe(true);
  });

  it('should contain at least one lowercase letter', () => {
    const pwd = generateTemporaryPassword();
    expect(/[a-z]/.test(pwd)).toBe(true);
  });

  it('should contain at least one number', () => {
    const pwd = generateTemporaryPassword();
    expect(/[0-9]/.test(pwd)).toBe(true);
  });

  it('should contain at least one symbol', () => {
    const pwd = generateTemporaryPassword();
    expect(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pwd)).toBe(true);
  });

  it('should be random', () => {
    const pwd1 = generateTemporaryPassword();
    const pwd2 = generateTemporaryPassword();
    expect(pwd1).not.toBe(pwd2);
  });
});
