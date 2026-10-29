import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Bot, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWorkAuth } from '@/hooks/useWork';
import { pauseAgent, workErrorMessage } from '@/services/workServices';
import { ago, clientName, leaseLeft, type IWorkSession } from '@/utils/workBoard';

/** The agent sessions open on the product: who, where, on what, and the last sign of life. */
export default function WorkAgents({ sessions, onOpen }: { sessions: IWorkSession[]; onOpen: (ref: string) => void }) {
  const auth = useWorkAuth();
  const queryClient = useQueryClient();
  const pause = useMutation({
    mutationFn: (agentId: string) => pauseAgent(auth!, agentId, 'Paused from the Workbench'),
    onSuccess: () => {
      toast.success('Agent paused; what it held is back on the board.');
      queryClient.invalidateQueries({ queryKey: ['work'] });
    },
    onError: (e) => toast.error(workErrorMessage(e)),
  });

  if (!sessions.length) {
    return (
      <div className="rounded-xl border border-grey-400 bg-white p-8 text-center text-sm text-grey-600">
        No agent is working on this product. Agents appear here when they start a session through the Ductape MCP server, the CLI, or the Claude Code hooks (<code className="font-mono">ductape work install-hooks</code>).
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-grey-400 bg-white" data-testid="work-agents">
      <table className="w-full text-sm">
        <thead className="bg-white-700 text-left text-xs text-grey-600">
          <tr>
            <th className="px-4 py-2 font-medium">Agent</th>
            <th className="px-4 py-2 font-medium">Where</th>
            <th className="px-4 py-2 font-medium">Working on</th>
            <th className="px-4 py-2 font-medium">Last seen</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id} className="border-t border-grey-400 align-top">
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5 font-medium text-grey">
                  <span className={cn('h-2 w-2 rounded-full', s.state === 'active' ? 'bg-green' : 'bg-orange')} aria-label={s.state} />
                  <Bot className="h-4 w-4 text-primary" />
                  {clientName(s.agent?.client)}
                </div>
                <div className="mt-0.5 text-xs text-grey-600">{s.agent?.name ?? s.agent?.machine}</div>
              </td>
              <td className="px-4 py-3 text-xs text-grey">
                <div>{s.repo || 'no repo'}</div>
                {s.branch ? <div className="mt-0.5 flex items-center gap-1 text-grey-600"><GitBranch className="h-3 w-3" />{s.branch}</div> : null}
              </td>
              <td className="px-4 py-3">
                {s.working_on.length ? (
                  s.working_on.map((w) => (
                    <button key={w.item_id} onClick={() => w.ref && onOpen(w.ref)} className="block text-left text-xs hover:text-primary">
                      <span className="font-mono font-semibold">{w.ref}</span> {w.title} <span className="text-grey-600">· {leaseLeft(w.expires_at)}</span>
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-grey-600">Nothing claimed</span>
                )}
              </td>
              <td className={cn('px-4 py-3 text-xs', s.state === 'offline' ? 'text-orange' : 'text-grey-600')}>{s.state === 'offline' ? `Stopped answering ${ago(s.heartbeat_at)}` : ago(s.heartbeat_at)}</td>
              <td className="px-4 py-3 text-right">
                {s.agent ? (
                  <Button variant="outline" size="sm" disabled={pause.isPending} onClick={() => pause.mutate(s.agent!.id)}>
                    Pause
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
