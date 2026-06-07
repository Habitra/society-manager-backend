import { generateCommunityAdminUsername } from '../username-generator.util';

describe('generateCommunityAdminUsername', () => {
  it('should format correctly for sequence 1', () => {
    const username = generateCommunityAdminUsername('JPA', 1);
    expect(username).toBe('JPA-000001');
  });

  it('should format correctly for sequence 150', () => {
    const username = generateCommunityAdminUsername('ATS', 150);
    expect(username).toBe('ATS-000150');
  });

  it('should pad short community codes and handle numbers', () => {
    const username = generateCommunityAdminUsername('ABC', 999999);
    expect(username).toBe('ABC-999999');
  });
});
