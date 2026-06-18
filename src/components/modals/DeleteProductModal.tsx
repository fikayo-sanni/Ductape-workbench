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

interface DeleteProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  productTag?: string;
  onConfirm: () => void | Promise<void>;
  isDeleting?: boolean;
}

export default function DeleteProductModal({
  open,
  onOpenChange,
  productName,
  productTag,
  onConfirm,
  isDeleting = false,
}: DeleteProductModalProps) {
  const [confirmInput, setConfirmInput] = useState('');

  useEffect(() => {
    if (!open) setConfirmInput('');
  }, [open]);

  const nameMatches = confirmInput.trim() === productName.trim();

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
            Delete product
          </DialogTitle>
          <DialogDescription className="text-sm text-grey-600 pt-1">
            <strong className="text-red-600">Warning:</strong> This permanently deletes the
            product and all of its resources (databases, storage, workflows, apps, and more).
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-grey-100 rounded-lg p-4 border border-grey-400">
            <p className="text-xs text-grey-600 mb-1">Product</p>
            <p className="text-sm font-medium text-grey">{productName}</p>
            {productTag ? (
              <p className="text-xs text-grey-500 mt-1 font-mono break-all">{productTag}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-grey">
              Type{' '}
              <code className="bg-grey-100 px-1.5 py-0.5 rounded font-mono text-xs">{productName}</code>{' '}
              to confirm
            </Label>
            <Input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="Enter product name"
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
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete product
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
