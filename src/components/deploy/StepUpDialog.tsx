import { useEffect, useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { startStepUp, verifyStepUp, type IDeployAuth } from '@/services/deployServices';
import { controlError, isSixDigitCode } from '@/utils/deployControls';
import { Field, Note } from './controls';

/**
 * A fresh code from the person's own email, good for one change. The code is asked for on a click rather than automatically, so a
 * dialog opened by mistake does not use up the few codes a person may ask for. The grant it earns is handed to the caller, who
 * sends it with the one change it was earned for and never keeps it.
 */
export default function StepUpDialog({
  open, auth, scope, title, description, onClose, onGrant,
}: {
  open: boolean;
  auth: IDeployAuth;
  scope: string;
  title: string;
  description: string;
  onClose: () => void;
  onGrant: (grant: string) => void | Promise<void>;
}) {
  const [sentTo, setSentTo] = useState<string | undefined>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'sending' | 'verifying' | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (open) { setSentTo(undefined); setCode(''); setBusy(undefined); setError(undefined); }
  }, [open, scope]);

  const send = async () => {
    setBusy('sending'); setError(undefined);
    try {
      const started = await startStepUp(auth, scope);
      setSentTo(started.sentTo); setCode('');
    } catch (e) {
      setError(controlError(e, 'The code could not be sent.').message);
    } finally { setBusy(undefined); }
  };

  const verify = async () => {
    if (!isSixDigitCode(code)) { setError('The code is six digits.'); return; }
    setBusy('verifying'); setError(undefined);
    try {
      const { grant } = await verifyStepUp(auth, scope, code);
      await onGrant(grant);
    } catch (e) {
      const failure = controlError(e, 'That did not work.');
      setError(failure.message);
      if (failure.code === 'STEP_UP_LOCKED') setSentTo(undefined);
    } finally { setBusy(undefined); }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {!sentTo ? (
          <div className="space-y-3">
            <p className="text-sm text-grey-600">This change needs a fresh code from your email, so a login left behind on a machine cannot make it. The code works for this one change.</p>
            <Button onClick={() => void send()} disabled={busy === 'sending'} className="gap-2">
              {busy === 'sending' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              Email me a code
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Note tone="info">A six-digit code was sent to {sentTo}. It lasts five minutes.</Note>
            <Field label="Code" htmlFor="step-up-code">
              <Input
                id="step-up-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} placeholder="123456"
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                onKeyDown={(event) => { if (event.key === 'Enter') void verify(); }}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void verify()} disabled={busy === 'verifying' || !isSixDigitCode(code)} className="gap-2">
                {busy === 'verifying' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Verify and continue
              </Button>
              <Button variant="outline" onClick={() => void send()} disabled={busy !== undefined}>Send a new code</Button>
            </div>
          </div>
        )}
        {error ? <Note tone="bad">{error}</Note> : null}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy !== undefined}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
