import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import appServices from '@/services/appServices';
import productServices from '@/services/productServices';
import type { IApp } from '@/types/app';

export interface ProductBriefAppOption {
  /** App document id — product briefs store this as `product_id` (backend refs `apps`). */
  value: string;
  label: string;
}

function appLabelFromParts(
  appName: string,
  tag: string,
  productNames: string[]
): string {
  const base = `${appName}${tag ? ` (@${tag})` : ''}`;
  if (productNames.length === 0) return base;
  return `${base} — ${productNames.join(' · ')}`;
}

/** Product / app row explicitly marked non-public. */
function isDeniedPublic(status: string | undefined): boolean {
  const s = (status ?? '').toLowerCase();
  return s === 'private' || s === 'draft';
}

/** Nested app on a product: include only if not explicitly private/draft. */
function nestedAppOkForPublicBrief(raw: { status?: string }): boolean {
  return !isDeniedPublic(raw.status);
}

/**
 * Apps available for product briefs: **public** workspace apps and apps linked from **public**
 * products only (suitable for partner-facing briefs).
 */
export function useWorkspaceProductBriefAppOptions() {
  const { user, currentWorkspaceId } = useAuth();
  const enabled = !!currentWorkspaceId && !!user?._id && !!user?.public_key;

  const { data: appsRes, isLoading: loadingApps } = useQuery({
    queryKey: ['workspace-apps-brief', 'public', currentWorkspaceId],
    queryFn: () =>
      appServices.fetchApps({
        workspace_id: currentWorkspaceId!,
        user_id: user!._id,
        public_key: user!.public_key,
        status: 'public',
      }),
    enabled,
  });

  const { data: productsRes, isLoading: loadingProducts } = useQuery({
    queryKey: ['workspace-products-brief', 'public', currentWorkspaceId],
    queryFn: () =>
      productServices.fetchProducts({
        workspace_id: currentWorkspaceId!,
        user_id: user!._id,
        public_key: user!.public_key,
        status: 'public',
      }),
    enabled,
  });

  const options: ProductBriefAppOption[] = useMemo(() => {
    const workspaceApps: IApp[] = (appsRes?.data ?? []).filter(
      (a) => !isDeniedPublic(a.status)
    );
    const products = (productsRes?.data ?? []).filter((p) => !isDeniedPublic(p.status));

    const productNamesByAppId = new Map<string, Set<string>>();
    for (const p of products) {
      for (const a of p.apps || []) {
        const id = a?._id as string | undefined;
        if (!id || !nestedAppOkForPublicBrief(a as { status?: string })) continue;
        if (!productNamesByAppId.has(id)) productNamesByAppId.set(id, new Set());
        productNamesByAppId.get(id)!.add(p.name);
      }
    }

    const byId = new Map<string, IApp>();
    for (const a of workspaceApps) {
      if (a?._id) byId.set(a._id, a);
    }
    for (const p of products) {
      for (const raw of p.apps || []) {
        const id = raw?._id as string | undefined;
        if (!id || !nestedAppOkForPublicBrief(raw as { status?: string })) continue;
        if (byId.has(id)) continue;
        byId.set(id, {
          ...(raw as IApp),
          _id: id,
          app_name: raw.app_name || 'App',
          tag: raw.tag || '',
        } as IApp);
      }
    }

    const out: ProductBriefAppOption[] = [];
    for (const [id, app] of byId) {
      const names = productNamesByAppId.get(id);
      const productNames = names ? [...names].sort((a, b) => a.localeCompare(b)) : [];
      out.push({
        value: id,
        label: appLabelFromParts(app.app_name || 'App', app.tag || '', productNames),
      });
    }
    out.sort((a, b) => a.label.localeCompare(b.label));
    return out;
  }, [appsRes?.data, productsRes?.data]);

  return {
    options,
    isLoading: loadingApps || loadingProducts,
    isEmpty: options.length === 0,
  };
}

export function getLabelForAppId(
  appId: string | undefined,
  options: ProductBriefAppOption[]
): string {
  if (!appId) return 'Unknown app';
  return options.find((o) => o.value === appId)?.label ?? appId;
}
