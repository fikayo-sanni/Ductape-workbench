/** Slug used as cloud connection tag (same convention as product/storage tags). */
export function tagFromDisplayName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
