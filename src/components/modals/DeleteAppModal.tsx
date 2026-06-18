import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DeleteAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appName: string;
  appTag?: string;
  onConfirm: () => void | Promise<void>;
  isDeleting?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

export default function DeleteAppModal({
  open,
  onOpenChange,
  appName,
  appTag,
  onConfirm,
  isDeleting = false,
  disabled = false,
  disabledReason,
}: DeleteAppModalProps) {
  const [confirmInput, setConfirmInput] = useState('');

  useEffect(() => {
    if (!open) setConfirmInput('');
  }, [open]);

  const nameMatches = confirmInput.trim() === appName.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isDeleting) onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-grey">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete app
          </DialogTitle>
          <DialogDescription className="text-sm text-grey-600 pt-1">
            <strong className="text-red-600">Warning:</strong> This permanently deletes the app,
            its versions, actions, and webhooks. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {disabled && disabledReason ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {disabledReason}
          </div>
        ) : null}

        <div className="space-y-4 py-2">
          <div className="bg-grey-100 rounded-lg p-4 border border-grey-400">
            <p className="text-xs text-grey-600 mb-1">App</p>
            <p className="text-sm font-medium text-grey">{appName}</p>
            {appTag ? (
              <p className="text-xs text-grey-500 mt-1 font-mono break-all">{appTag}</p>
            ) : null}
          </div>

          {!disabled ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-grey">
                Type{' '}
                <code className="bg-grey-100 px-1.5 py-0.5 rounded font-mono text-xs">{appName}</code>{' '}
                to confirm
              </Label>
              <Input
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Enter app name"
                disabled={isDeleting}
              />
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={disabled || !nameMatches || isDeleting}
            onClick={() => onConfirm()}
            className="gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete app
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
