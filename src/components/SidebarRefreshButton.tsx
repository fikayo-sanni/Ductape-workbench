import { useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface SidebarRefreshButtonProps {
  label: string;
  onRefresh: () => Promise<unknown>;
  isFetching?: boolean;
  disabled?: boolean;
}

export default function SidebarRefreshButton({ label, onRefresh, isFetching = false, disabled = false }: SidebarRefreshButtonProps) {
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const busy = pending || isFetching;

  const refresh = async () => {
    if (inFlight.current || busy || disabled) return;
    inFlight.current = true;
    setPending(true);
    try {
      await onRefresh();
    } catch {
      toast.error(`Failed to refresh ${label.toLowerCase()}. Please try again.`);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  return (
    <Button type="button" variant="ghost" size="icon"
      className="h-8 w-8 shrink-0 text-grey-600"
      title={`Refresh ${label.toLowerCase()}`} aria-label={`Refresh ${label.toLowerCase()}`}
      aria-busy={busy} disabled={disabled || busy} onClick={() => void refresh()}>
      <RefreshCw aria-hidden="true" className={cn('h-4 w-4', busy && 'animate-spin')} />
    </Button>
  );
}
