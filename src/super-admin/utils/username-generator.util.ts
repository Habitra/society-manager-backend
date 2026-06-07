export function generateCommunityAdminUsername(
  communityCode: string,
  sequence: number,
): string {
  const paddedSequence = sequence.toString().padStart(6, '0');
  return `${communityCode.toUpperCase()}-${paddedSequence}`;
}
