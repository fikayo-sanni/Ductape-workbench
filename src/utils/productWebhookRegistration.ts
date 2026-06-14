export type ProductAppEnvMapping = {
  app_env_slug: string;
  product_env_slug: string;
};

/** Product environments that have an app↔product env mapping on the connected app. */
export function resolveMappedProductEnvs(
  productEnvs: Array<{ slug?: string; env_name?: string; active?: boolean }> | undefined,
  mappings: ProductAppEnvMapping[] | undefined
): Array<{ slug: string; env_name?: string }> {
  if (!productEnvs?.length || !mappings?.length) {
    return [];
  }

  const mappedSlugs = new Set(
    mappings.map((m) => m.product_env_slug).filter((slug): slug is string => Boolean(slug))
  );

  return productEnvs
    .filter((env) => env.slug && mappedSlugs.has(env.slug))
    .map((env) => ({
      slug: env.slug as string,
      env_name: env.env_name,
    }));
}

export function findProductAppEnvMappings(
  productApps: Array<{ access_tag?: string; app_tag?: string; envs?: ProductAppEnvMapping[] }> | undefined,
  accessTag: string | undefined,
  appTag: string | undefined
): ProductAppEnvMapping[] {
  if (!productApps?.length || !accessTag) {
    return [];
  }

  const match = productApps.find(
    (entry) =>
      entry.access_tag === accessTag ||
      (appTag &&
        (entry.app_tag === appTag ||
          entry.access_tag?.startsWith(`${appTag}:`)))
  );

  return match?.envs ?? [];
}

export type WebhookRegistrationConfig = {
  productEnv?: string;
  appEnv?: string;
  url?: string;
  method?: string;
  uuid?: string;
  active?: boolean;
};

export type ProductWebhookWithRegistration = {
  tag: string;
  name?: string;
  setup?: boolean;
  config?: WebhookRegistrationConfig[];
};

export function getWebhookProxyUrl(uuid: string): string {
  const base =
    import.meta.env.VITE_WEBHOOKS_BASE_URL || 'https://webhooks.ductape.app';
  return `${base}/webhooks/v1/process/${uuid}`;
}

export function isEnvRegistered(
  config: WebhookRegistrationConfig[] | undefined,
  productEnvSlug: string
): boolean {
  const row = config?.find((c) => c.productEnv === productEnvSlug);
  return Boolean(row && (row.uuid || row.url));
}

export function getWebhookRegistrationSummary(
  config: WebhookRegistrationConfig[] | undefined,
  productEnvs: Array<{ slug: string }>
): {
  registered: number;
  total: number;
  anyRegistered: boolean;
  fullyRegistered: boolean;
} {
  const total = productEnvs.length;
  const registered = productEnvs.filter((env) =>
    isEnvRegistered(config, env.slug)
  ).length;
  return {
    registered,
    total,
    anyRegistered: registered > 0,
    fullyRegistered: total > 0 && registered === total,
  };
}
