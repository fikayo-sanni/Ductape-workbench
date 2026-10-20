/** Rules for the image a user picks as a product or app logo. */

export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'] as const;
export const MAX_LOGO_BYTES = 5 * 1024 * 1024;
export const LOGO_ACCEPT = LOGO_TYPES.join(',');

/** The reason a file cannot be used as a logo, or undefined when it can. */
export function validateLogoFile(file: { type: string; size: number }): string | undefined {
  if (!(LOGO_TYPES as readonly string[]).includes(file.type)) {
    return 'Please choose an image file (PNG, JPEG, GIF, WebP or SVG).';
  }
  if (file.size <= 0) return 'That file is empty.';
  if (file.size > MAX_LOGO_BYTES) return 'The image must be smaller than 5 MB.';
  return undefined;
}

/** Up to two initials, for when there is no logo. */
export function logoInitials(name: string | undefined): string {
  return String(name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || '?';
}
