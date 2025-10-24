import { useState } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Send, Plus, Trash2 } from 'lucide-react';
import { HttpMethod, Header, QueryParam } from '@/types';
import toast from 'react-hot-toast';

export default function RequestPanel() {
  const {
    currentRequestId,
    requests,
    updateRequest,
    setResponse,
  } = useWorkbenchStore();

  const [isSending, setIsSending] = useState(false);

  const currentRequest = requests.find(r => r.id === currentRequestId);

  if (!currentRequest) return null;

  const handleMethodChange = (method: HttpMethod) => {
    updateRequest(currentRequest.id, { method });
  };

  const handleUrlChange = (url: string) => {
    updateRequest(currentRequest.id, { url });
  };

  const handleNameChange = (name: string) => {
    updateRequest(currentRequest.id, { name });
  };

  const addHeader = () => {
    const newHeaders = [
      ...currentRequest.headers,
      { key: '', value: '', enabled: true },
    ];
    updateRequest(currentRequest.id, { headers: newHeaders });
  };

  const updateHeader = (index: number, updates: Partial<Header>) => {
    const newHeaders = [...currentRequest.headers];
    newHeaders[index] = { ...newHeaders[index], ...updates };
    updateRequest(currentRequest.id, { headers: newHeaders });
  };

  const deleteHeader = (index: number) => {
    const newHeaders = currentRequest.headers.filter((_, i) => i !== index);
    updateRequest(currentRequest.id, { headers: newHeaders });
  };

  const addQueryParam = () => {
    const newParams = [
      ...currentRequest.queryParams,
      { key: '', value: '', enabled: true },
    ];
    updateRequest(currentRequest.id, { queryParams: newParams });
  };

  const updateQueryParam = (index: number, updates: Partial<QueryParam>) => {
    const newParams = [...currentRequest.queryParams];
    newParams[index] = { ...newParams[index], ...updates };
    updateRequest(currentRequest.id, { queryParams: newParams });
  };

  const deleteQueryParam = (index: number) => {
    const newParams = currentRequest.queryParams.filter((_, i) => i !== index);
    updateRequest(currentRequest.id, { queryParams: newParams });
  };

  const handleBodyChange = (value: string) => {
    updateRequest(currentRequest.id, {
      body: { ...currentRequest.body, json: value },
    });
  };

  const handleSendRequest = async () => {
    setIsSending(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockResponse = {
        requestId: currentRequest.id,
        response: {
          status: 200,
          statusText: 'OK',
          headers: {
            'content-type': 'application/json',
            'content-length': '1234',
          },
          data: {
            success: true,
            message: 'Request successful',
            data: {
              id: '12345',
              timestamp: new Date().toISOString(),
            },
          },
          time: 245,
          size: 1234,
        },
        timestamp: new Date(),
      };

      setResponse(currentRequest.id, mockResponse);
      toast.success('Request sent successfully');
    } catch (error) {
      toast.error('Failed to send request');
      setResponse(currentRequest.id, {
        requestId: currentRequest.id,
        error: 'Failed to send request',
        timestamp: new Date(),
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Request Name */}
      <div className="p-4 border-b border-grey-400">
        <Input
          value={currentRequest.name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="font-medium"
          placeholder="Request name"
        />
      </div>

      {/* URL Bar */}
      <div className="p-4 border-b border-grey-400 flex gap-2">
        <Select value={currentRequest.method} onValueChange={handleMethodChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
            <SelectItem value="HEAD">HEAD</SelectItem>
            <SelectItem value="OPTIONS">OPTIONS</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={currentRequest.url}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="Enter request URL"
          className="flex-1"
        />
        <Button onClick={handleSendRequest} disabled={isSending}>
          {isSending ? (
            <>Sending...</>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send
            </>
          )}
        </Button>
      </div>

      {/* Request Details Tabs */}
      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="params" className="h-full flex flex-col">
          <TabsList className="mx-4 mt-2">
            <TabsTrigger value="params">Params</TabsTrigger>
            <TabsTrigger value="headers">Headers ({currentRequest.headers.length})</TabsTrigger>
            <TabsTrigger value="body">Body</TabsTrigger>
          </TabsList>

          {/* Query Params */}
          <TabsContent value="params" className="flex-1 p-4 overflow-auto">
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-grey">Query Parameters</h3>
                <Button size="sm" variant="outline" onClick={addQueryParam}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Param
                </Button>
              </div>

              {currentRequest.queryParams.length === 0 ? (
                <p className="text-sm text-grey-600 text-center py-8">
                  No query parameters yet
                </p>
              ) : (
                <div className="space-y-2">
                  {currentRequest.queryParams.map((param, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <input
                        type="checkbox"
                        checked={param.enabled}
                        onChange={(e) =>
                          updateQueryParam(index, { enabled: e.target.checked })
                        }
                        className="mt-2"
                      />
                      <Input
                        placeholder="Key"
                        value={param.key}
                        onChange={(e) =>
                          updateQueryParam(index, { key: e.target.value })
                        }
                        className="flex-1"
                      />
                      <Input
                        placeholder="Value"
                        value={param.value}
                        onChange={(e) =>
                          updateQueryParam(index, { value: e.target.value })
                        }
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteQueryParam(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Headers */}
          <TabsContent value="headers" className="flex-1 p-4 overflow-auto">
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-grey">Request Headers</h3>
                <Button size="sm" variant="outline" onClick={addHeader}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Header
                </Button>
              </div>

              {currentRequest.headers.length === 0 ? (
                <p className="text-sm text-grey-600 text-center py-8">
                  No headers yet
                </p>
              ) : (
                <div className="space-y-2">
                  {currentRequest.headers.map((header, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <input
                        type="checkbox"
                        checked={header.enabled}
                        onChange={(e) =>
                          updateHeader(index, { enabled: e.target.checked })
                        }
                        className="mt-2"
                      />
                      <Input
                        placeholder="Key"
                        value={header.key}
                        onChange={(e) =>
                          updateHeader(index, { key: e.target.value })
                        }
                        className="flex-1"
                      />
                      <Input
                        placeholder="Value"
                        value={header.value}
                        onChange={(e) =>
                          updateHeader(index, { value: e.target.value })
                        }
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteHeader(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Body */}
          <TabsContent value="body" className="flex-1 p-4 overflow-auto">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-grey">Request Body</h3>

              {currentRequest.method === 'GET' || currentRequest.method === 'HEAD' ? (
                <p className="text-sm text-grey-600">
                  {currentRequest.method} requests cannot have a body
                </p>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-grey-600">JSON</label>
                  <textarea
                    value={currentRequest.body.json || ''}
                    onChange={(e) => handleBodyChange(e.target.value)}
                    placeholder='{\n  "key": "value"\n}'
                    className="w-full h-64 p-3 border border-grey-400 rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
