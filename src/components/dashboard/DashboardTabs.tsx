import type { ComponentType } from 'react';
import { AlertTriangle, CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ITabIndicator, TabTone } from '@/utils/dashboardTabs';

export interface IDashboardTabItem<Id extends string> {
  id: Id;
  label: string;
  icon: ComponentType<{ className?: string }>;
  indicator: ITabIndicator;
}

const toneText: Record<TabTone, string> = { good: 'text-green', warn: 'text-orange', bad: 'text-red', neutral: 'text-grey-600' };
const toneTile: Record<TabTone, string> = { good: 'bg-green/10 text-green', warn: 'bg-orange/10 text-orange', bad: 'bg-red/10 text-red', neutral: 'bg-grey-100 text-grey-600' };
const toneBadge: Record<TabTone, string> = { good: 'bg-green text-white', warn: 'bg-orange text-white', bad: 'bg-red text-white', neutral: 'bg-grey-400 text-white' };
const toneRing: Record<TabTone, string> = { good: '', warn: 'border-orange/50', bad: 'border-red/50', neutral: '' };

function StatusIcon({ tone }: { tone: TabTone }) {
  const className = cn('h-3.5 w-3.5 flex-shrink-0', toneText[tone]);
  if (tone === 'bad' || tone === 'warn') return <AlertTriangle className={className} aria-hidden />;
  if (tone === 'good') return <CheckCircle2 className={className} aria-hidden />;
  return <Circle className={className} aria-hidden />;
}

/**
 * The dashboard's sections as three cards. Each says what it holds and how it is doing: a section with a problem carries a red or amber
 * edge and a count, so a failure on a tab that is not open is still seen.
 */
export default function DashboardTabs<Id extends string>({ tabs, selected, onSelect }: { tabs: Array<IDashboardTabItem<Id>>; selected: Id; onSelect: (id: Id) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3" role="tablist" aria-label="Dashboard sections">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.id === selected;
        const { indicator } = tab;
        const problem = indicator.tone === 'bad' || indicator.tone === 'warn';
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`dashboard-tab-${tab.id}`}
            aria-selected={active}
            aria-controls={`dashboard-panel-${tab.id}`}
            data-testid={`dashboard-tab-${tab.id}`}
            data-tone={indicator.tone}
            onClick={() => onSelect(tab.id)}
            className={cn(
              'relative flex items-center gap-3 rounded-xl border bg-white p-3 text-left shadow-sm transition-all sm:p-4',
              active ? 'border-primary ring-2 ring-primary/15' : cn('border-grey-400 hover:border-primary/50', problem && toneRing[indicator.tone]),
            )}
          >
            <span className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg', active ? 'bg-primary text-white' : toneTile[indicator.tone])}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block truncate text-sm font-semibold sm:text-base', active ? 'text-primary' : 'text-grey')}>{tab.label}</span>
              <span className={cn('mt-0.5 flex items-center gap-1.5 text-xs', toneText[indicator.tone])}>
                <StatusIcon tone={indicator.tone} />
                <span className="truncate" data-testid={`dashboard-tab-${tab.id}-status`}>{indicator.label}</span>
              </span>
            </span>
            {problem && indicator.count > 0 ? (
              <span className={cn('flex h-6 min-w-6 flex-shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums', toneBadge[indicator.tone])} aria-label={`${indicator.count} to look at`}>
                {indicator.count}
              </span>
            ) : indicator.label === 'Reading status' ? (
              <Clock className="h-4 w-4 flex-shrink-0 text-grey-600" aria-hidden />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
