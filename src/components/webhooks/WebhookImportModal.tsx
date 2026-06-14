import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, Download, FileJson } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import { useDuctape } from '@/hooks/useDuctape';
import {
  WEBHOOKS_IMPORT_EXAMPLE,
  WEBHOOKS_IMPORT_INSTRUCTIONS,
  normalizeWebhooksImportPayload,
  WebhooksImportPayload,
} from '@/constants/webhooks-import.schema';

interface WebhookImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: {
    _id?: string;
    tag: string;
    workspace_id?: string;
  };
  onSuccess?: () => void;
}

export default function WebhookImportModal({
  open,
  onOpenChange,
  app,
  onSuccess,
}: WebhookImportModalProps) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jsonText, setJsonText] = useState('');

  const ductape = useDuctape({
    workspace_id: app.workspace_id || currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'app',
  }) as any;

  const { mutateAsync: runImport, isPending } = useMutation({
    mutationFn: async (payload: WebhooksImportPayload) => {
      if (!ductape) throw new Error('Ductape not initialized');
      await ductape.init(app.tag);
      const normalized = normalizeWebhooksImportPayload(payload);
      return ductape.webhooks.importBulk(app.tag, normalized);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['app', app._id] });
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      toast.success(`Imported ${result?.imported ?? 0} webhook collection(s)`);
      setJsonText('');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Import failed');
    },
  });

  const handleFileSelect = async (file: File) => {
    try {
      const text = await file.text();
      setJsonText(text);
    } catch {
      toast.error('Could not read file');
    }
  };

  const handleImport = async () => {
    try {
      const parsed = JSON.parse(jsonText) as WebhooksImportPayload;
      await runImport(parsed);
    } catch (error: any) {
      toast.error(error.message || 'Invalid JSON');
    }
  };

  const downloadExample = () => {
    const blob = new Blob([JSON.stringify(WEBHOOKS_IMPORT_EXAMPLE, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'webhooks-import-example.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Import Webhooks
          </DialogTitle>
          <DialogDescription>
            Import webhook collections and events in bulk from a JSON file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Choose JSON file
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={downloadExample}>
              <Download className="h-4 w-4" />
              Download example
            </Button>
          </div>

          <div>
            <Label>JSON payload</Label>
            <Textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder={JSON.stringify(WEBHOOKS_IMPORT_EXAMPLE, null, 2)}
              className="mt-2 font-mono text-xs min-h-[240px]"
            />
          </div>

          <pre className="text-xs text-grey-600 bg-grey-50 border border-grey-200 rounded-lg p-3 whitespace-pre-wrap max-h-40 overflow-y-auto">
            {WEBHOOKS_IMPORT_INSTRUCTIONS}
          </pre>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={!jsonText.trim() || isPending}
              className="gap-2"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Import
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
