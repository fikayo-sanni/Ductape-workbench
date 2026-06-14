import { Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CloudProvider } from './cloudConnection.constants';

const PROVIDER_STYLES: Record<
  CloudProvider,
  { box: string; icon: string; ring: string }
> = {
  aws: {
    box: 'bg-orange-500/10',
    icon: 'text-orange-600',
    ring: 'ring-orange-500/25',
  },
  gcp: {
    box: 'bg-blue-500/10',
    icon: 'text-blue-600',
    ring: 'ring-blue-500/25',
  },
  azure: {
    box: 'bg-sky-500/10',
    icon: 'text-sky-600',
    ring: 'ring-sky-500/25',
  },
  mongodb_atlas: {
    box: 'bg-emerald-500/10',
    icon: 'text-emerald-700',
    ring: 'ring-emerald-500/25',
  },
  neo4j_aura: {
    box: 'bg-lime-500/10',
    icon: 'text-lime-700',
    ring: 'ring-lime-500/25',
  },
};

export default function CloudProviderIcon({
  provider = 'aws',
  size = 'md',
  showActiveRing = false,
  className,
}: {
  provider?: CloudProvider | string;
  size?: 'sm' | 'md' | 'lg';
  showActiveRing?: boolean;
  className?: string;
}) {
  const p = (provider in PROVIDER_STYLES ? provider : 'aws') as CloudProvider;
  const s = PROVIDER_STYLES[p];
  const dim =
    size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
  const iconDim =
    size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

  return (
    <div
      className={cn(
        dim,
        'rounded-lg flex items-center justify-center shrink-0',
        s.box,
        showActiveRing && 'ring-2 ring-offset-2 ring-offset-white',
        showActiveRing && s.ring,
        className,
      )}
    >
      <Cloud className={cn(iconDim, s.icon)} />
    </div>
  );
}
