import { useState } from 'react';
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
  FileText,
  Download,
  Store,
  Plus,
} from 'lucide-react';
import ImportDialog from '@/components/ImportDialog';
import InternalAppSelectionModal from './InternalAppSelectionModal';

interface AddAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: any; // Add product context
}

export default function AddAppModal({ open, onOpenChange, product }: AddAppModalProps) {
  const { openTab } = useWorkbenchStore();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showInternalAppModal, setShowInternalAppModal] = useState(false);

  const handleAddInternalApp = () => {
    // Open internal app selection modal
    setShowInternalAppModal(true);
    onOpenChange(false);
  };

  const handleImportApp = () => {
    setShowImportDialog(true);
    onOpenChange(false);
  };

  const handleAddFromMarketplace = () => {
    // Open marketplace tab
    const { openMarketplaceTab } = useWorkbenchStore.getState();
    openMarketplaceTab();
    onOpenChange(false);
  };

  const handleImport = (data: { type: 'postman' | 'openapi'; source: 'file' | 'url'; content: string }) => {
    // Handle the import logic here
    console.log('Importing app:', data);
    setShowImportDialog(false);
    // You can add more logic here to process the imported data
  };

  const handleAppSelected = (app: any) => {
    // Open the selected app in a tab
    openTab({
      id: `app-${app._id}-${Date.now()}`,
      type: 'app',
      title: app.app_name || app.tag || 'App',
      itemId: app._id,
      data: app,
    });

    // Open a new request tab for this app
    openTab({
      id: `request-${Date.now()}`,
      type: 'request',
      title: 'New Request',
    });

    setShowInternalAppModal(false);
  };

  const options = [
    {
      id: 'internal-app',
      title: 'Add Workspace App',
      description: 'Choose from your workspace apps',
      icon: FileText,
      onClick: handleAddInternalApp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      id: 'import',
      title: 'Import App',
      description: 'Import an existing app from your local files',
      icon: Download,
      onClick: handleImportApp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      id: 'marketplace',
      title: 'Add from Marketplace',
      description: 'Browse and integrate apps from marketplace',
      icon: Store,
      onClick: handleAddFromMarketplace,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
  ];

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Add App to Product</DialogTitle>
              <DialogDescription>
                Choose how you'd like to add an app to this product
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-6 space-y-3">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.id}
                variant="outline"
                onClick={option.onClick}
                className={`w-full h-auto p-4 justify-start gap-4 hover:shadow-md transition-all ${option.borderColor} hover:${option.bgColor}`}
              >
                <div className={`w-12 h-12 rounded-lg ${option.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-6 w-6 ${option.color}`} />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-grey mb-1">{option.title}</h3>
                  <p className="text-sm text-grey-600">{option.description}</p>
                </div>
              </Button>
            );
          })}
        </div>

        <div className="flex justify-end pt-4 border-t border-grey-200">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="px-6"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Import Dialog */}
    <ImportDialog
      open={showImportDialog}
      onOpenChange={setShowImportDialog}
      onImport={handleImport}
    />

    {/* Internal App Selection Modal */}
    <InternalAppSelectionModal
      open={showInternalAppModal}
      onOpenChange={setShowInternalAppModal}
      onAppSelected={handleAppSelected}
      product={product} // Pass product context
    />
  </>
  );
}
