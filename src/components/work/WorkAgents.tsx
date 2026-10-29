import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Bot, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWorkAuth } from '@/hooks/useWork';
import { pauseAgent, workErrorMessage } from '@/services/workServices';
import { StepUpCancelled, withStepUp } from './StepUp';
import { agentLabel, agentWhere, ago, leaseLeft, splitSessions, viaLabel, type IWorkSession } from '@/utils/workBoard';

/** The agent sessions open on the product: who, where, on what, and the last sign of life. */
export default function WorkAgents({ sessions, meId, onOpen }: { sessions: IWorkSession[]; meId?: string; onOpen: (ref: string) => void }) {
  const auth = useWorkAuth();
  const queryClient = useQueryClient();
  const [showQuiet, setShowQuiet] = useState(false);
  const { live, quiet } = splitSessions(sessions);
  const rows = showQuiet ? [...live, ...quiet] : live;
  const pause = useMutation({
    mutationFn: (agentId: string) => withStepUp(auth!, () => pauseAgent(auth!, agentId, 'Paused from the Workbench')),
    onSuccess: () => {
      toast.success('Agent paused; what it held is back on the board.');
      queryClient.invalidateQueries({ queryKey: ['work'] });
    },
    onError: (e) => { if (!(e instanceof StepUpCancelled)) toast.error(workErrorMessage(e)); },
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
          {rows.map((s) => {
            const label = agentLabel(s.agent ? { client: s.agent.client, owner: s.owner ? { id: s.user_id, name: s.owner.name } : null } : undefined, meId);
            return (
            <tr key={s.id} className="border-t border-grey-400 align-top">
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5 font-medium text-grey">
                  <span className={cn('h-2 w-2 rounded-full', s.state === 'active' ? 'bg-green' : 'bg-orange')} aria-label={s.state} />
                  <Bot className="h-4 w-4 text-primary" />
                  {label}
                </div>
                <div className="mt-0.5 text-xs text-grey-600">{agentWhere(s.agent, label)}</div>
                <div className="mt-0.5 text-[11px] text-grey-600" title="The agent names its own client; this is what it said, not a proof">{viaLabel(s)}</div>
              </td>
              <td className="px-4 py-3 text-xs text-grey">
                <div>{s.repo || 'no repo'}</div>
                {s.branch ? <div className="mt-0.5 flex items-center gap-1 text-grey-600"><GitBranch className="h-3 w-3" />{s.branch}</div> : null}
              </td>
              <td className="px-4 py-3">
                {s.working_on.length ? (
                  s.working_on.map((w) => (
                    <button key={w.item_id} onClick={() => w.ref && onOpen(w.ref)} className="block text-left text-xs text-grey hover:text-primary">
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
            );
          })}
          {!live.length && !showQuiet ? (
            <tr className="border-t border-grey-400"><td colSpan={5} className="px-4 py-4 text-center text-xs text-grey-600">No agent is working on this product right now.</td></tr>
          ) : null}
        </tbody>
      </table>
      {quiet.length ? (
        <button
          type="button"
          onClick={() => setShowQuiet((v) => !v)}
          className="w-full border-t border-grey-400 px-4 py-2 text-left text-xs text-grey-600 hover:text-primary"
          data-testid="work-agents-quiet"
        >
          {showQuiet ? 'Hide' : 'Show'} {quiet.length} {quiet.length === 1 ? 'session' : 'sessions'} that stopped answering and hold nothing (Ductape ends them after an hour)
        </button>
      ) : null}
    </div>
  );
}
