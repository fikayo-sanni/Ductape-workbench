import { useState } from 'react';
import { Buffer } from 'buffer';
import { useWorkbenchStore } from '@/stores/workbench-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Download,
  Plus,
  CheckCircle,
  FileText,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ImportDocsTypes } from '@ductape/sdk/dist/imports/imports.types';
import { connectDuctapeWorkspace } from '@/helpers/ductape';
import { useAuth } from '@/store/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import appServicesReal from '@/services/appServicesReal';

interface AppCreatedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: any;
}

export default function AppCreatedModal({ open, onOpenChange, app }: AppCreatedModalProps) {
  const { openTab, closeTab, tabs, activeTabId } = useWorkbenchStore();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showImportView, setShowImportView] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importType, setImportType] = useState<'postman' | 'openapi'>('postman');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleImportContent = () => {
    setShowImportView(true);
  };

  const handleBackToMain = () => {
    if (!isImporting) {
      setShowImportView(false);
      setFile(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/json') {
      setFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    if (!app?.workspace_id || !user?._id || !user?.auth_token || !user?.public_key) {
      toast.error('Missing required configuration. Please try again.');
      return;
    }

    setIsImporting(true);

    try {
      const content = await file.text();
      const blob = new Blob([content], { type: 'application/json' });

      // Initialize the full Ductape SDK instance for import operations
      const ductape = connectDuctapeWorkspace({
        workspace_id: app.workspace_id,
        user_id: user._id,
        token: user.auth_token,
        public_key: user.public_key,
      });

      // Get the latest version or default to 0.0.1
      let version = '0.0.1';
      if (app.versions && app.versions.length > 0) {
        const latestVersion = app.versions.find((v: any) => v.latest === true);
        if (latestVersion) {
          version = latestVersion.tag;
        }
      }

      // Import using SDK actions.import
      await ductape.actions.import({
        file: blob as unknown as Buffer,
        type: importType === 'postman' ? ImportDocsTypes.postmanV21 : ImportDocsTypes.openApiV30,
        version: version,
        appTag: app.tag,
        updateIfExists: true,
      });

      // Invalidate relevant queries to ensure fresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['apps', 'internal', app.workspace_id] }),
        queryClient.invalidateQueries({ queryKey: ['app', app._id] }),
        queryClient.invalidateQueries({ queryKey: ['app', app.tag] }),
      ]);

      // Close the modal first
      onOpenChange(false);

      // Fetch the full updated app data by tag (same as sidebar does)
      const response = await appServicesReal.fetchAppByTag({
        tag: app.tag,
        user_id: user?._id || '',
        public_key: user?.public_key || '',
      });

      const updatedApp = response.data;

      // Close the current tab and reopen with fresh data
      if (activeTabId) {
        const currentTab = tabs.find(t => t.id === activeTabId);
        if (currentTab && currentTab.type === 'app') {
          // Close the current tab
          closeTab(activeTabId);

          // Reopen with fresh data - use timestamp to force complete remount
          openTab({
            id: `app-${updatedApp._id}-${Date.now()}`,
            type: 'app',
            title: updatedApp.app_name,
            data: updatedApp,
            itemId: updatedApp._id,
          });
        }
      }

      // Show success toast after tab is reloaded
      toast.success(`${importType === 'postman' ? 'Postman' : 'OpenAPI'} collection imported successfully!`);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import collection');
    } finally {
      setIsImporting(false);
    }
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
    // The app tab is already open, just close the modal
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={isImporting ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        {!showImportView ? (
          // Main view
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-green/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green" />
                </div>
                <div>
                  <DialogTitle className='text-grey'>App Created Successfully!</DialogTitle>
                  <DialogDescription>
                    Your app "{app?.app_name || app?.name}" has been created and is now open. What would you like to do next?
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="py-6 space-y-4">
              <div className="space-y-3">
                <Button
                  onClick={handleImportContent}
                  variant="outline"
                  className="w-full gap-3 h-auto p-4 justify-start"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                    <Download className="h-5 w-5 text-blue" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Import App Docs</div>
                    <div className="text-sm opacity-80">Import Postman or OpenAPI collections</div>
                  </div>
                </Button>

                <Button
                  onClick={handleAddRequest}
                  variant="outline"
                  className="w-full gap-3 h-auto p-4 justify-start"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                    <Plus className="h-5 w-5 text-purple" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Add Request</div>
                    <div className="text-sm opacity-80">Create a new API request for this app</div>
                  </div>
                </Button>
              </div>

              <div className="pt-4 border-t border-grey-400">
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  className="w-full"
                >
                  Skip for now
                </Button>
              </div>
            </div>
          </>
        ) : (
          // Import view
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                {!isImporting && (
                  <Button
                    onClick={handleBackToMain}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <div>
                  <DialogTitle className='text-grey'>Import to App</DialogTitle>
                  <DialogDescription>
                    Import Postman collections or OpenAPI specifications to populate your app with actions and configurations
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Import Type Selection */}
            <div className="space-y-3 mt-4">
              <Label className="text-sm font-semibold text-grey">Select Import Type</Label>
              <div className="space-y-2">
                <label
                  className={cn(
                    'flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors',
                    importType === 'postman' ? 'border-primary bg-primary/5' : 'border-grey-300 hover:border-grey-400'
                  )}
                >
                  <input
                    type="radio"
                    name="importType"
                    value="postman"
                    checked={importType === 'postman'}
                    onChange={(e) => setImportType(e.target.value as 'postman' | 'openapi')}
                    disabled={isImporting}
                    className="w-4 h-4 text-primary"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-grey">Postman Collection</div>
                    <div className="text-sm text-grey-600">
                      Import Postman v2.0 or v2.1 collections
                    </div>
                  </div>
                </label>

                <label
                  className={cn(
                    'flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors',
                    importType === 'openapi' ? 'border-primary bg-primary/5' : 'border-grey-300 hover:border-grey-400'
                  )}
                >
                  <input
                    type="radio"
                    name="importType"
                    value="openapi"
                    checked={importType === 'openapi'}
                    onChange={(e) => setImportType(e.target.value as 'postman' | 'openapi')}
                    disabled={isImporting}
                    className="w-4 h-4 text-primary"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-grey">OpenAPI Specification</div>
                    <div className="text-sm text-grey-600">
                      Import OpenAPI v3.0 specifications
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-3 mt-4">
              <Label className="text-sm font-semibold text-grey">Upload File</Label>
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                  isDragging ? 'border-primary bg-blue-400' : 'border-grey-400',
                  file && 'border-green bg-green/5'
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-grey-100 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-grey-600" />
                  </div>

                  {file ? (
                    <>
                      <p className="text-sm font-medium text-grey">{file.name}</p>
                      <p className="text-xs text-grey-600">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                      {!isImporting && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFile(null)}
                          className="mt-2"
                        >
                          Remove
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-grey-600">
                        Drag and drop your JSON file here
                      </p>
                      <p className="text-xs text-grey-600">or</p>
                      <label htmlFor="file-upload">
                        <Button variant="outline" size="sm" asChild disabled={isImporting}>
                          <span>Browse Files</span>
                        </Button>
                      </label>
                      <input
                        id="file-upload"
                        type="file"
                        accept=".json"
                        onChange={handleFileChange}
                        disabled={isImporting}
                        className="hidden"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-6">
              {!isImporting && (
                <Button variant="outline" onClick={handleBackToMain}>
                  Cancel
                </Button>
              )}
              <Button onClick={handleImport} disabled={!file || isImporting}>
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Import'
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
