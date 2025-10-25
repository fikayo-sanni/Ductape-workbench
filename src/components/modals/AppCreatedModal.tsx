import { useWorkbenchStore } from '@/stores/workbench-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Download,
  Plus,
  CheckCircle,
} from 'lucide-react';

interface AppCreatedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: any;
}

export default function AppCreatedModal({ open, onOpenChange, app }: AppCreatedModalProps) {
  const { openTab } = useWorkbenchStore();

  const handleImportContent = () => {
    // Open the app tab first, then the user can use the import functionality from there
    openTab({
      id: `app-${app._id}-${Date.now()}`,
      type: 'app',
      title: app.app_name || app.name,
      itemId: app._id,
      data: app,
    });
    onOpenChange(false);
  };

  const handleAddRequest = () => {
    // Open a new request tab for this app
    openTab({
      id: `request-${Date.now()}`,
      type: 'request',
      title: 'New Request',
      data: {
        appId: app._id,
        isNew: true,
        componentType: 'request',
      },
      isDirty: true,
    });
    onOpenChange(false);
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green" />
            </div>
            <div>
              <DialogTitle>App Created Successfully!</DialogTitle>
              <DialogDescription>
                Your app "{app?.app_name || app?.name}" has been created. What would you like to do next?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <div className="space-y-3">
            <Button
              onClick={handleImportContent}
              className="w-full gap-3 h-auto p-4 justify-start"
            >
              <div className="w-10 h-10 rounded-lg bg-blue/10 flex items-center justify-center">
                <Download className="h-5 w-5 text-blue" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Import App Content</div>
                <div className="text-sm opacity-80">Import from Postman, OpenAPI, or other sources</div>
              </div>
            </Button>

            <Button
              onClick={handleAddRequest}
              className="w-full gap-3 h-auto p-4 justify-start"
            >
              <div className="w-10 h-10 rounded-lg bg-purple/10 flex items-center justify-center">
                <Plus className="h-5 w-5 text-purple" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Add Request</div>
                <div className="text-sm opacity-80">Create a new API request for this app</div>
              </div>
            </Button>
          </div>

          <div className="pt-4 border-t border-grey-200">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="w-full"
            >
              Skip for now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
