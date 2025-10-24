import { useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from '@/lib/utils';

interface ActionRequestPanelProps {
  action: any;
}

export default function ActionRequestPanel({ action }: ActionRequestPanelProps) {
  const [selectedEnv, setSelectedEnv] = useState(
    action.envs?.find((e: any) => e.active)?._id || action.envs?.[0]?._id || ''
  );
  const [params, setParams] = useState<Record<string, string>>({});
  const [query, setQuery] = useState<Record<string, string>>({});
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [body, setBody] = useState<Record<string, string>>({});

  const getMethodColor = (method: string) => {
    switch (method?.toUpperCase()) {
      case 'GET':
        return 'bg-green/10 text-green border-green';
      case 'POST':
        return 'bg-blue-500/10 text-primary border-primary';
      case 'PUT':
        return 'bg-yellow/10 text-yellow border-yellow';
      case 'PATCH':
        return 'bg-purple-500/10 text-purple-500 border-purple-500';
      case 'DELETE':
        return 'bg-red/10 text-red border-red';
      default:
        return 'bg-grey-400 text-grey-600 border-grey-600';
    }
  };

  const handleExecute = () => {
    console.log('Executing action:', {
      action: action.tag,
      env: selectedEnv,
      params,
      query,
      headers,
      body,
    });
    // TODO: Implement actual API call
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-grey-400">
        <h2 className="text-lg font-semibold text-grey mb-2">{action.name || action.tag}</h2>
        <p className="text-sm text-grey-600 mb-4">{action.description}</p>

        {/* Method and Endpoint */}
        <div className="flex items-center gap-3 mb-4">
          <span
            className={cn(
              'px-3 py-1 rounded border font-medium text-sm',
              getMethodColor(action.method)
            )}
          >
            {action.method?.toUpperCase() || 'GET'}
          </span>
          <code className="flex-1 px-3 py-2 bg-grey-100 rounded border border-grey-400 text-sm font-mono">
            {action.resource || '/'}
          </code>
        </div>

        {/* Environment Selector */}
        {action.envs && action.envs.length > 0 && (
          <div className="mb-4">
            <Label className="mb-2 block">Environment</Label>
            <Select value={selectedEnv} onValueChange={setSelectedEnv}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select environment" />
              </SelectTrigger>
              <SelectContent>
                {action.envs.map((env: any) => (
                  <SelectItem key={env._id} value={env._id}>
                    {env.env_name} ({env.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Execute Button */}
        <Button onClick={handleExecute} className="w-full" size="lg">
          <Play className="h-4 w-4 mr-2" />
          Execute Action
        </Button>
      </div>

      {/* Request Tabs */}
      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="params" className="h-full flex flex-col">
          <TabsList className="w-full justify-start px-6 border-b border-grey-400">
            <TabsTrigger value="params">Params</TabsTrigger>
            <TabsTrigger value="query">Query</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            <TabsTrigger value="body">Body</TabsTrigger>
          </TabsList>

          {/* Params Tab */}
          <TabsContent value="params" className="flex-1 p-6 overflow-auto">
            {action.params?.data && action.params.data.length > 0 ? (
              <div className="space-y-4">
                {action.params.data.map((param: any) => (
                  <div key={param.key} className="border border-grey-400 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor={`param-${param.key}`} className="flex items-center gap-2">
                        {param.key}
                        {param.required && <span className="text-xs text-red">*</span>}
                      </Label>
                      <span className="text-xs text-grey-600">{param.type}</span>
                    </div>
                    {param.description && (
                      <p className="text-xs text-grey-600 mb-2">{param.description}</p>
                    )}
                    <Input
                      id={`param-${param.key}`}
                      value={params[param.key] || ''}
                      onChange={(e) => setParams({ ...params, [param.key]: e.target.value })}
                      placeholder={`Enter ${param.key}`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-grey-600 py-8">
                <p>No path parameters for this action</p>
              </div>
            )}
          </TabsContent>

          {/* Query Tab */}
          <TabsContent value="query" className="flex-1 p-6 overflow-auto">
            {action.query?.data && action.query.data.length > 0 ? (
              <div className="space-y-4">
                {action.query.data.map((param: any) => (
                  <div key={param.key} className="border border-grey-400 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor={`query-${param.key}`} className="flex items-center gap-2">
                        {param.key}
                        {param.required && <span className="text-xs text-red">*</span>}
                      </Label>
                      <span className="text-xs text-grey-600">{param.type}</span>
                    </div>
                    {param.description && (
                      <p className="text-xs text-grey-600 mb-2">{param.description}</p>
                    )}
                    <Input
                      id={`query-${param.key}`}
                      value={query[param.key] || ''}
                      onChange={(e) => setQuery({ ...query, [param.key]: e.target.value })}
                      placeholder={`Enter ${param.key}`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-grey-600 py-8">
                <p>No query parameters for this action</p>
              </div>
            )}
          </TabsContent>

          {/* Headers Tab */}
          <TabsContent value="headers" className="flex-1 p-6 overflow-auto">
            {action.headers?.data && action.headers.data.length > 0 ? (
              <div className="space-y-4">
                {action.headers.data.map((header: any) => (
                  <div key={header.key} className="border border-grey-400 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor={`header-${header.key}`} className="flex items-center gap-2">
                        {header.key}
                        {header.required && <span className="text-xs text-red">*</span>}
                      </Label>
                      <span className="text-xs text-grey-600">{header.type}</span>
                    </div>
                    {header.description && (
                      <p className="text-xs text-grey-600 mb-2">{header.description}</p>
                    )}
                    <Input
                      id={`header-${header.key}`}
                      value={headers[header.key] || ''}
                      onChange={(e) => setHeaders({ ...headers, [header.key]: e.target.value })}
                      placeholder={`Enter ${header.key}`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-grey-600 py-8">
                <p>No custom headers for this action</p>
              </div>
            )}
          </TabsContent>

          {/* Body Tab */}
          <TabsContent value="body" className="flex-1 p-6 overflow-auto">
            {action.body?.data && action.body.data.length > 0 ? (
              <div className="space-y-4">
                {action.body.data.map((field: any) => (
                  <div key={field.key} className="border border-grey-400 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor={`body-${field.key}`} className="flex items-center gap-2">
                        {field.key}
                        {field.required && <span className="text-xs text-red">*</span>}
                      </Label>
                      <span className="text-xs text-grey-600">{field.type}</span>
                    </div>
                    {field.description && (
                      <p className="text-xs text-grey-600 mb-2">{field.description}</p>
                    )}
                    <Input
                      id={`body-${field.key}`}
                      value={body[field.key] || ''}
                      onChange={(e) => setBody({ ...body, [field.key]: e.target.value })}
                      placeholder={`Enter ${field.key}`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-grey-600 py-8">
                <p>No body parameters for this action</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
