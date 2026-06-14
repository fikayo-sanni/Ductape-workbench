import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CLOUD_PROVIDER_GUIDES,
  gcpApiEnableUrl,
  providerBadgeClass,
  type CloudProvider,
  type CloudSetupLink,
} from '@/components/cloud/cloudSetupGuide';

function ConsoleLink({ link }: { link: CloudSetupLink }) {
  return (
    <li>
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-start gap-1.5 text-sm text-primary hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          {link.label}
          {link.description ? (
            <span className="block text-xs text-grey-600 font-normal">{link.description}</span>
          ) : null}
        </span>
      </a>
    </li>
  );
}

type CloudSetupGuidePanelProps = {
  provider: CloudProvider;
  className?: string;
  title?: string;
  /** Hides networking guides and long role lists during initial AWS setup */
  compact?: boolean;
  /** GCP project ID — used to deep-link API enable URLs when known */
  gcpProjectId?: string;
};

export default function CloudSetupGuidePanel({
  provider,
  className,
  title = 'Setup in your cloud console',
  compact = false,
  gcpProjectId,
}: CloudSetupGuidePanelProps) {
  const guide = CLOUD_PROVIDER_GUIDES[provider];
  const cloudSteps = compact
    ? guide.cloudSteps.filter((step) => !step.title.includes('VPC resources'))
    : guide.cloudSteps;

  return (
    <div
      className={cn(
        'bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 sm:p-6 space-y-4',
        className,
      )}
    >
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold text-grey">{title}</h3>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-medium',
              providerBadgeClass(provider),
            )}
          >
            {guide.shortLabel}
          </span>
        </div>
        <p className="text-sm text-grey-600">{guide.description}</p>
      </div>

      <ol className="text-sm text-grey-600 space-y-3 list-none">
        {cloudSteps.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span className="text-grey font-medium shrink-0 w-5">{i + 1}.</span>
            <div>
              <span className="font-medium text-grey">{step.title}</span>
              <p className="mt-0.5 leading-relaxed">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      {!compact && guide.recommendedApis && guide.recommendedApis.length > 0 ? (
        <div className="pt-2 border-t border-blue-500/20">
          <p className="text-xs font-semibold text-grey mb-2">
            Enable Google Cloud APIs (per feature)
          </p>
          <ul className="text-sm space-y-3">
            {guide.recommendedApis.map((api) => (
              <li key={api.serviceId} className="text-grey-600 leading-relaxed">
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                  <a
                    href={gcpApiEnableUrl(api.serviceId, gcpProjectId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline shrink-0"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="font-medium">{api.apiLabel}</span>
                  </a>
                  <span className="text-xs font-mono text-grey bg-white/80 px-1.5 py-0.5 rounded border border-blue-500/20">
                    {api.serviceId}
                  </span>
                </div>
                <p className="mt-1 text-xs">
                  <span className="font-medium text-grey">{api.feature}</span>
                  {' — '}
                  {api.purpose}
                </p>
              </li>
            ))}
          </ul>
          {guide.recommendedApisHint ? (
            <p className="text-xs text-grey-600 mt-2">{guide.recommendedApisHint}</p>
          ) : null}
          {provider === 'gcp' && !gcpProjectId?.trim() ? (
            <p className="text-xs text-grey-600 mt-2">
              Enter your GCP project ID below to open enable links scoped to your project.
            </p>
          ) : null}
        </div>
      ) : null}

      {!compact && guide.recommendedRoles && guide.recommendedRoles.length > 0 ? (
        <div className="pt-2 border-t border-blue-500/20">
          <p className="text-xs font-semibold text-grey mb-2">
            Recommended roles (grant only what you use)
          </p>
          <ul className="text-sm space-y-2">
            {guide.recommendedRoles.map((r) => (
              <li
                key={r.roleName}
                className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2 text-grey-600"
              >
                <code className="text-xs font-mono text-grey bg-white/80 px-1.5 py-0.5 rounded border border-blue-500/20 shrink-0">
                  {r.roleName}
                </code>
                <span>
                  <span className="text-grey font-medium">{r.feature}</span>
                  {' — '}
                  {r.purpose}
                </span>
              </li>
            ))}
          </ul>
          {guide.recommendedRolesHint ? (
            <p className="text-xs text-grey-600 mt-2">{guide.recommendedRolesHint}</p>
          ) : null}
        </div>
      ) : null}

      {!compact && guide.networkingGuides && guide.networkingGuides.length > 0 ? (
        <div className="pt-2 border-t border-blue-500/20 space-y-4">
          <p className="text-xs font-semibold text-grey">Feature networking</p>
          {guide.networkingGuides.map((net) => (
            <div
              key={net.id}
              className="rounded-lg border border-blue-500/20 bg-white/60 p-3 space-y-2"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-grey">{net.title}</p>
                  <span className="text-[10px] font-medium text-grey-600 bg-grey-100 px-1.5 py-0.5 rounded">
                    {net.feature}
                  </span>
                  {net.optional ? (
                    <span className="text-[10px] font-medium text-blue-700 bg-blue-500/10 px-1.5 py-0.5 rounded">
                      Optional
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-grey-600 mt-1 leading-relaxed">{net.summary}</p>
              </div>
              <ol className="text-xs text-grey-600 space-y-2 list-none">
                {net.steps.map((step) => (
                  <li key={step.title} className="flex gap-2">
                    <span className="text-grey shrink-0">•</span>
                    <div>
                      <span className="font-medium text-grey">{step.title}</span>
                      <p className="mt-0.5 leading-relaxed">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-blue-500/20">
        <div>
          <p className="text-xs font-semibold text-grey mb-2">Open in console</p>
          <ul className="space-y-2">
            {guide.consoleLinks.map((link) => (
              <ConsoleLink key={link.href} link={link} />
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-grey mb-2">Documentation</p>
          <ul className="space-y-2">
            {guide.docLinks.map((link) => (
              <ConsoleLink key={link.href} link={link} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
