// src/common/utils/slug.util.ts
// ============================================================
// Slug generation utility for community slugs.
// e.g. "Green Park Phase 2" → "green-park-phase-2"
// ============================================================

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')   // remove non-alphanumeric except space and hyphen
    .replace(/\s+/g, '-')            // replace spaces with hyphens
    .replace(/-+/g, '-')             // collapse multiple hyphens
    .replace(/^-|-$/g, '');          // trim leading/trailing hyphens
}

/**
 * Appends a random suffix to ensure slug uniqueness.
 * e.g. "green-park-phase-2-a3f9"
 */
export function generateUniqueSlug(name: string): string {
  const base = generateSlug(name);
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}
