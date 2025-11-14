import { useState } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: { type: 'postman' | 'openapi'; source: 'file'; content: string }) => void;
  isLoading?: boolean;
}

export default function ImportDialog({ open, onOpenChange, onImport, isLoading = false }: ImportDialogProps) {
  const [importType, setImportType] = useState<'postman' | 'openapi'>('postman');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
    if (file) {
      const content = await file.text();
      onImport({ type: importType, source: 'file', content });
    }

    // Reset
    setFile(null);
    onOpenChange(false);
  };

  const canImport = file !== null;

  return (
    <Dialog open={open} onOpenChange={isLoading ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import to App</DialogTitle>
          <DialogDescription>
            Import Postman collections to create an app with actions, environments, and variables
          </DialogDescription>
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
                'flex items-center gap-3 p-4 border rounded-lg transition-colors opacity-50 cursor-not-allowed',
                'border-grey-300'
              )}
            >
              <input
                type="radio"
                name="importType"
                value="openapi"
                disabled
                className="w-4 h-4 text-primary"
              />
              <div className="flex-1">
                <div className="font-semibold text-grey">OpenAPI Specification</div>
                <div className="text-sm text-grey-600">
                  Coming soon - OpenAPI v3.0 or v3.1
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                    className="mt-2"
                  >
                    Remove
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-grey-600">
                    Drag and drop your JSON file here
                  </p>
                  <p className="text-xs text-grey-600">or</p>
                  <label htmlFor="file-upload">
                    <Button variant="outline" size="sm" asChild>
                      <span>Browse Files</span>
                    </Button>
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          {!isLoading && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
          <Button onClick={handleImport} disabled={!canImport || isLoading}>
            {isLoading ? 'Importing...' : 'Import'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
