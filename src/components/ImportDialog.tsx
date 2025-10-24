import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Upload, FileText, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: { type: 'postman' | 'openapi'; source: 'file' | 'url'; content: string }) => void;
}

export default function ImportDialog({ open, onOpenChange, onImport }: ImportDialogProps) {
  const [importType, setImportType] = useState<'postman' | 'openapi'>('postman');
  const [importSource, setImportSource] = useState<'file' | 'url'>('file');
  const [url, setUrl] = useState('');
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
    if (importSource === 'url' && url) {
      onImport({ type: importType, source: 'url', content: url });
    } else if (importSource === 'file' && file) {
      const content = await file.text();
      onImport({ type: importType, source: 'file', content });
    }

    // Reset
    setUrl('');
    setFile(null);
    onOpenChange(false);
  };

  const canImport = (importSource === 'url' && url) || (importSource === 'file' && file);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import to App</DialogTitle>
          <DialogDescription>
            Import Postman collections or OpenAPI specifications to create an app
          </DialogDescription>
        </DialogHeader>

        <Tabs value={importType} onValueChange={(v) => setImportType(v as 'postman' | 'openapi')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="postman">Postman Collection</TabsTrigger>
            <TabsTrigger value="openapi">OpenAPI Spec</TabsTrigger>
          </TabsList>

          <TabsContent value="postman" className="space-y-4 mt-4">
            <p className="text-sm text-grey-600">
              Import a Postman collection (v2.0 or v2.1) to automatically create an app with
              actions, environments, and variables.
            </p>
          </TabsContent>

          <TabsContent value="openapi" className="space-y-4 mt-4">
            <p className="text-sm text-grey-600">
              Import an OpenAPI specification (v3.0 or v3.1) to automatically create an app with
              endpoints and schemas.
            </p>
          </TabsContent>
        </Tabs>

        {/* Import Source */}
        <div className="space-y-4 mt-4">
          <div className="flex gap-2">
            <Button
              variant={importSource === 'file' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setImportSource('file')}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
            <Button
              variant={importSource === 'url' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setImportSource('url')}
              className="flex-1"
            >
              <Link2 className="h-4 w-4 mr-2" />
              From URL
            </Button>
          </div>

          {importSource === 'file' ? (
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
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-grey">URL</label>
              <Input
                placeholder="https://api.example.com/openapi.json"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-xs text-grey-600">
                Paste the URL to your {importType === 'postman' ? 'Postman collection' : 'OpenAPI spec'}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!canImport}>
            Import
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
