import { useState } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import CodeGenerator from './CodeGenerator';

export default function ResponsePanel() {
  const { currentRequestId, responses } = useWorkbenchStore();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!currentRequestId) return null;

  const responseData = responses[currentRequestId];

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="response" className="h-full flex flex-col">
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="response">Response</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
          </TabsList>

          {/* Response Body */}
          <TabsContent value="response" className="flex-1 p-4 overflow-auto">
            {!responseData ? (
              <div className="text-center py-12 text-grey-600">
                <p className="text-sm">Click Send to see the response</p>
              </div>
            ) : responseData.error ? (
              <div className="p-4 bg-red/10 border border-red rounded-md">
                <p className="text-sm font-semibold text-red mb-2">Error</p>
                <p className="text-sm text-grey">{responseData.error}</p>
              </div>
            ) : responseData.response ? (
              <div className="space-y-4">
                {/* Status Info */}
                <div className="flex items-center gap-4 p-3 bg-green/10 border border-green rounded-md">
                  <div>
                    <span className="text-sm font-semibold text-green">
                      Status: {responseData.response.status} {responseData.response.statusText}
                    </span>
                  </div>
                  <div className="text-sm text-grey-600">
                    Time: {responseData.response.time}ms
                  </div>
                  <div className="text-sm text-grey-600">
                    Size: {responseData.response.size} bytes
                  </div>
                </div>

                {/* Response Body */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-grey">Response Body</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(
                          JSON.stringify(responseData.response?.data, null, 2),
                          'body'
                        )
                      }
                    >
                      {copiedSection === 'body' ? (
                        <Check className="h-4 w-4 mr-1" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      Copy
                    </Button>
                  </div>
                  <pre className="p-4 bg-grey-100 border border-grey-400 rounded-md overflow-auto text-xs font-mono max-h-96">
                    {JSON.stringify(responseData.response.data, null, 2)}
                  </pre>
                </div>
              </div>
            ) : null}
          </TabsContent>

          {/* Response Headers */}
          <TabsContent value="headers" className="flex-1 p-4 overflow-auto">
            {!responseData?.response ? (
              <div className="text-center py-12 text-grey-600">
                <p className="text-sm">No response headers yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-grey">Response Headers</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      copyToClipboard(
                        JSON.stringify(responseData.response?.headers, null, 2),
                        'headers'
                      )
                    }
                  >
                    {copiedSection === 'headers' ? (
                      <Check className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    Copy
                  </Button>
                </div>
                <div className="border border-grey-400 rounded-md divide-y divide-grey-400">
                  {Object.entries(responseData.response.headers).map(([key, value]) => (
                    <div key={key} className="flex p-3">
                      <span className="font-medium text-grey w-1/3 text-sm">{key}:</span>
                      <span className="text-grey-600 text-sm flex-1">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Code Generation */}
          <TabsContent value="code" className="flex-1 overflow-auto">
            <CodeGenerator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
