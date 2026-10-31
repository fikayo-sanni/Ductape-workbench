import { CheckCircle2, CircleAlert, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTraffic, shortHash, type IRolloutSide, type IRolloutView } from '@/utils/deployments';

const when = (iso?: string) => (iso ? new Date(iso).toLocaleString() : undefined);

function Side({ title, tone, side, children }: { title: string; tone: 'candidate' | 'stable'; side: IRolloutSide; children?: React.ReactNode }) {
  return (
    <div className={cn('flex-1 rounded-lg border p-4', tone === 'candidate' ? 'border-primary/40 bg-primary/5' : 'border-grey-400')} data-testid={`rollout-${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-grey-600">{title}</p>
      <p className="mt-1 text-2xl font-bold text-grey">{formatTraffic(side.trafficPercent)}</p>
      {side.observedPercent !== undefined && side.observedPercent !== side.trafficPercent ? (
        <p className="text-xs text-orange">The cloud last reported {formatTraffic(side.observedPercent)}</p>
      ) : null}
      <dl className="mt-3 space-y-1 text-xs text-grey-600">
        <div className="flex justify-between gap-3"><dt>Release</dt><dd className="font-mono text-grey" title={side.release}>{shortHash(side.release)}</dd></div>
        <div className="flex justify-between gap-3"><dt>Revision</dt><dd className="truncate font-mono text-grey">{side.revision ?? '-'}</dd></div>
      </dl>
      {children}
    </div>
  );
}

/** The release taking part of the traffic beside the last good one, while a rollout is under way. */
export default function RolloutPanel({ view }: { view: IRolloutView }) {
  const v = view.candidate.verification;
  return (
    <div className="space-y-3" data-testid="rollout">
      {view.moving ? (
        <p className="flex items-center gap-2 text-xs text-grey-600"><Loader2 className="h-3.5 w-3.5 animate-spin" />Being checked and moved; this updates by itself.</p>
      ) : null}
      <div className="flex flex-col gap-3 md:flex-row">
        <Side title="New release" tone="candidate" side={view.candidate}>
          <div className="mt-3 space-y-1 text-xs text-grey-600">
            {view.candidate.since ? <p>Taking traffic since {when(view.candidate.since)}</p> : null}
            {v ? (
              <p className={cn('flex items-center gap-1.5', v.passed === v.total ? 'text-green' : 'text-orange')}>
                {v.passed === v.total ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
                {v.passed} of {v.total} check{v.total === 1 ? '' : 's'} passed{v.attempts ? ` (${v.attempts} attempt${v.attempts === 1 ? '' : 's'})` : ''}, {when(v.at)}
              </p>
            ) : (
              <p>Not checked yet</p>
            )}
            {view.candidate.url ? <p className="truncate">At <span className="font-mono">{view.candidate.url}</span></p> : null}
          </div>
        </Side>
        <Side title="Last good release" tone="stable" side={view.stable}>
          <p className="mt-3 text-xs text-grey-600">A rollback sends it all the traffic again.</p>
        </Side>
      </div>
    </div>
  );
}
