import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BillingPlan } from '@/types/pricing';

function formatLimit(value: number | null | undefined): string {
  if (value == null) return 'Unlimited';
  return value.toLocaleString();
}

function formatStorage(gb: number | null | undefined): string {
  if (gb == null) return 'Unlimited';
  if (gb >= 1000) return `${gb / 1000} TB`;
  return `${gb} GB`;
}

function planPriceLabel(plan: BillingPlan): string {
  if (plan.monthlyPrice === 0) return 'Free';
  if (plan.monthlyPrice == null) return 'Custom';
  return `$${plan.monthlyPrice}`;
}

interface PlanFeatureListProps {
  plan: BillingPlan;
  compact?: boolean;
}

export function PlanFeatureList({ plan, compact = false }: PlanFeatureListProps) {
  const limits = plan.productLimits;
  const features: string[] = [];

  if (plan.monthlyRequests != null) {
    features.push(`${formatLimit(plan.monthlyRequests)} API requests / month`);
  }
  features.push(`${formatStorage(plan.fileTransfer)} file transfer`);
  features.push(`${formatLimit(plan.users)} users`);
  if (plan.apps != null) features.push(`${formatLimit(plan.apps)} apps`);
  if (plan.products != null) features.push(`${formatLimit(plan.products)} products`);
  if (plan.logsRetentionDays != null) {
    features.push(`${formatLimit(plan.logsRetentionDays)} days log retention`);
  }
  if (plan.usageDataRetentionDays != null) {
    features.push(`${formatLimit(plan.usageDataRetentionDays)} days usage data retention`);
  }

  if (limits) {
    if (limits.databases != null) features.push(`${formatLimit(limits.databases)} databases per product`);
    if (limits.caches != null) features.push(`${formatLimit(limits.caches)} caches per product`);
    if (limits.actions != null) features.push(`${formatLimit(limits.actions)} actions per product`);
    if (limits.storageUnits != null) features.push(`${formatLimit(limits.storageUnits)} storage units per product`);
    if (limits.messageBrokers != null) features.push(`${formatLimit(limits.messageBrokers)} message brokers per product`);
    if (limits.jobs != null) features.push(`${formatLimit(limits.jobs)} jobs per product`);
    if (limits.cloudFunctions != null) {
      features.push(`${formatLimit(limits.cloudFunctions)} cloud functions per product`);
    }
  }

  if (plan.marketplaceAccess?.canPublish) {
    features.push('Marketplace publishing');
  }

  plan.customFeatures?.forEach((feature) => {
    if (typeof feature === 'string' && feature.trim()) features.push(feature.trim());
  });

  const textClass = compact ? 'text-xs' : 'text-sm';
  const iconClass = compact ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <ul className={cn('space-y-2', compact ? 'mt-3' : 'mt-4')}>
      {features.map((feature) => (
        <li key={feature} className={cn('flex items-start gap-2.5 text-grey-600', textClass)}>
          <CheckCircle2 className={cn('text-primary flex-shrink-0 mt-0.5', iconClass)} />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}

interface OnboardingPlanCardProps {
  plan: BillingPlan;
  selected: boolean;
  onSelect: () => void;
}

export default function OnboardingPlanCard({ plan, selected, onSelect }: OnboardingPlanCardProps) {
  const showOverage =
    !plan.isPayAsYouGo &&
    plan.usagePricing &&
    (plan.usagePricing.additionalRequestPrice > 0 ||
      plan.usagePricing.additionalStoragePrice > 0 ||
      plan.usagePricing.additionalUserPrice > 0);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group text-left rounded-10px border bg-white p-6 lg:p-7 transition-all hover:shadow-md flex flex-col h-full',
        selected
          ? 'border-2 border-primary ring-4 ring-primary/10 shadow-sm'
          : 'border-grey-400 hover:border-primary/40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-xl text-grey group-hover:text-primary transition-colors">
          {plan.name}
        </h3>
        {plan.isPayAsYouGo ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            Pay as you go
          </span>
        ) : null}
      </div>

      <div className="flex items-baseline gap-1 mt-3">
        <span className="text-4xl font-bold text-grey">{planPriceLabel(plan)}</span>
        {plan.monthlyPrice > 0 ? <span className="text-sm text-grey-600">/month</span> : null}
      </div>

      {plan.description ? (
        <p className="text-sm text-grey-600 mt-3 leading-relaxed">{plan.description}</p>
      ) : null}

      <div className="mt-4 pt-4 border-t border-grey-200 flex-1 flex flex-col">
        <PlanFeatureList plan={plan} />

        {showOverage ? (
          <div className="mt-4 rounded-lg border border-grey-300 bg-grey-100/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-grey-600 mb-1.5">
              Overage rates
            </p>
            <ul className="text-xs text-grey-600 space-y-1">
              {plan.usagePricing.additionalRequestPrice > 0 ? (
                <li>${plan.usagePricing.additionalRequestPrice} per extra request</li>
              ) : null}
              {plan.usagePricing.additionalStoragePrice > 0 ? (
                <li>${plan.usagePricing.additionalStoragePrice} per extra GB</li>
              ) : null}
              {plan.usagePricing.additionalUserPrice > 0 ? (
                <li>${plan.usagePricing.additionalUserPrice} per extra user</li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {plan.isPayAsYouGo ? (
          <p className="mt-4 text-xs text-grey-600 leading-relaxed">
            Billed based on actual resource usage each month.
          </p>
        ) : null}
      </div>
    </button>
  );
}

export function OnboardingPlanSummary({ plan }: { plan: BillingPlan }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-grey-600">Selected plan</p>
        <p className="text-xl font-bold text-grey mt-1">{plan.name}</p>
        <p className="text-sm text-grey-600 mt-1">
          {planPriceLabel(plan)}
          {plan.monthlyPrice > 0 ? ' / month' : ''}
        </p>
      </div>
      {plan.description ? (
        <p className="text-sm text-grey-600 leading-relaxed">{plan.description}</p>
      ) : null}
      <PlanFeatureList plan={plan} compact />
    </div>
  );
}
