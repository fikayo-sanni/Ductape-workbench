import { useEffect, useState, useSyncExternalStore } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { needsStepUp, startWorkStepUp, verifyWorkStepUp, workErrorMessage, type IWorkAuth } from '@/services/workServices';

/**
 * Asking the person for the code Ductape emails them, before a change only a person may make (approving, sending
 * back, changing the policy or rules, resuming an agent, cancelling, changing critical, assigning where the policy
 * gates on it). It is asked once; the grant is then held in memory for 15 minutes.
 */

type Pending = { auth: IWorkAuth; resolve: () => void; reject: (e: Error) => void };
let pending: Pending | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export class StepUpCancelled extends Error {
  constructor() {
    super('Not confirmed');
  }
}

function askForCode(auth: IWorkAuth): Promise<void> {
  return new Promise((resolve, reject) => {
    pending?.reject(new StepUpCancelled());
    pending = { auth, resolve, reject };
    notify();
  });
}

/** Runs a change; when the server asks for proof it is the person, asks for the emailed code and runs it again. */
export async function withStepUp<T>(auth: IWorkAuth, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (!needsStepUp(error)) throw error;
    await askForCode(auth);
    return fn();
  }
}

/** The dialog that asks for the code. Mounted once in the Work area. */
export function StepUpDialog() {
  const current = useSyncExternalStore(subscribe, () => pending);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!current) return;
    setSentTo(null);
    setCode('');
    setError(null);
    setBusy(true);
    startWorkStepUp(current.auth)
      .then((r) => setSentTo(r.sent_to ?? 'your email'))
      .catch((e) => setError(workErrorMessage(e)))
      .finally(() => setBusy(false));
  }, [current]);

  if (!current) return null;
  const close = (ok: boolean) => {
    const p = pending;
    pending = null;
    notify();
    if (ok) p?.resolve();
    else p?.reject(new StepUpCancelled());
  };
  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await verifyWorkStepUp(current.auth, code.trim());
      close(true);
    } catch (e) {
      setError(workErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-label="Confirm it is you" data-testid="work-step-up">
      <div className="w-full max-w-sm rounded-xl border border-grey-400 bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="h-4 w-4" /></span>
          <h2 className="text-base font-semibold text-grey">Confirm it is you</h2>
        </div>
        <p className="mb-3 text-sm text-grey-600">
          Only a person can make this change, and an agent can use your sign-in. {sentTo ? <>Enter the code sent to <span className="font-medium text-grey">{sentTo}</span>.</> : busy ? 'Sending a code to your email.' : null} You will not be asked again for 15 minutes.
        </p>
        <input
          autoFocus
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6) void confirm(); }}
          placeholder="6-digit code"
          aria-label="Code"
          className="w-full rounded-md border border-grey-400 bg-white px-3 py-2 text-center font-mono text-lg tracking-[0.4em] text-grey"
        />
        {error ? <p className="mt-2 text-xs text-red">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => close(false)}>Cancel</Button>
          <Button size="sm" disabled={busy || code.length !== 6} onClick={() => void confirm()}>Confirm</Button>
        </div>
      </div>
    </div>
  );
}
