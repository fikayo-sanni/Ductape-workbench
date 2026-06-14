/** Product app link as stored on the integration/product document */
export type ProductAppLink = {
  access_tag?: string;
  app_tag?: string;
};

/**
 * Resolves the product access tag for an app opened from a product context.
 * Connected-app list items are full app records (tag = app tag); access_tag lives on product.apps.
 */
export function resolveProductAppAccessTag(
  appTag: string | undefined,
  productApps: ProductAppLink[] | undefined,
  explicit?: string | null
): string | undefined {
  const fromExplicit = explicit?.trim();
  if (fromExplicit) return fromExplicit;
  if (!appTag?.trim() || !productApps?.length) return undefined;

  const normalized = appTag.trim();
  const match = productApps.find(
    (entry) =>
      entry.app_tag === normalized ||
      entry.access_tag === normalized ||
      (typeof entry.access_tag === 'string' &&
        entry.access_tag.startsWith(`${normalized}:`))
  );
  return match?.access_tag?.trim() || undefined;
}
