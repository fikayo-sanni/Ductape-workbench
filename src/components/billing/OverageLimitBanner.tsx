import { AlertTriangle } from 'lucide-react';
import { useAssetLimitBanner } from '@/hooks/useAssetLimitBanner';
import type { WorkbenchAssetType } from '@/types/asset-limits';

type OverageLimitBannerProps = {
  assetType: WorkbenchAssetType;
  className?: string;
};

function formatPrice(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return `$${value.toFixed(2)}`;
}

export default function OverageLimitBanner({ assetType, className = '' }: OverageLimitBannerProps) {
  const { showBanner, asset, limits } = useAssetLimitBanner(assetType);

  if (!showBanner || !asset || !limits) {
    return null;
  }

  const overagePrice = formatPrice(asset.overageUnitPrice);
  const priceText = overagePrice
    ? ` Each additional ${asset.label.replace(/s$/, '')} costs ${overagePrice} on your next bill.`
    : ' Each additional item is billed as overage on your next bill.';

  return (
    <div
      className={`flex gap-3 rounded-lg border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100 ${className}`}
      role="status"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div>
        <p className="font-medium">Plan limit reached</p>
        <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
          You&apos;re at your {limits.planName} limit for {asset.label} ({asset.current}/
          {asset.limit}). You can still create, but new {asset.label} will incur overage fees.
          {priceText}
        </p>
      </div>
    </div>
  );
}
