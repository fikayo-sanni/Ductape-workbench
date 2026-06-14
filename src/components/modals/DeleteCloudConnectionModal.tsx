import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
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

interface DeleteCloudConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
  onConfirm: () => void | Promise<void>;
  isDeleting?: boolean;
}

export default function DeleteCloudConnectionModal({
  open,
  onOpenChange,
  displayName,
  onConfirm,
  isDeleting = false,
}: DeleteCloudConnectionModalProps) {
  const [confirmInput, setConfirmInput] = useState('');

  useEffect(() => {
    if (!open) setConfirmInput('');
  }, [open]);

  const nameMatches = confirmInput.trim() === displayName.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-grey">Delete cloud connection</DialogTitle>
          <DialogDescription className="text-sm text-grey-600 pt-1">
            This removes the connection from your workspace. Linked product resources may stop
            working until you configure credentials again.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-grey-100 rounded-lg p-4 border border-grey-400">
            <p className="text-xs text-grey-600 mb-1">Connection name</p>
            <p className="text-sm font-medium text-grey">{displayName}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-grey">
              Type{' '}
              <code className="bg-grey-100 px-1.5 py-0.5 rounded font-mono text-xs">{displayName}</code>{' '}
              to confirm
            </Label>
            <Input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="Enter display name"
              disabled={isDeleting}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!nameMatches || isDeleting}
            onClick={() => onConfirm()}
            className="gap-2"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete connection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
