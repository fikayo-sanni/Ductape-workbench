import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Save, Plus, Trash2, Code, Globe, Hash, FileCode, Server, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import appServicesReal from '@/services/appServicesReal';

interface RequestBuilderProps {
  tabId: string;
  data?: {
    productId?: string;
    appId?: string;
    isNew?: boolean;
  };
}

interface KeyValue {
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
}

interface ICustomEnv {
  slug: string;
  base_url?: string;
  config?: Record<string, unknown>;
  active: boolean;
}

export default function RequestBuilder({ tabId, data }: RequestBuilderProps) {
  const { user } = useAuth();
  const { updateTab } = useWorkbenchStore();

  // Form state matching IAppAction interface
  const [formData, setFormData] = useState({
    name: '',
    tag: '',
    description: '',
    method: 'GET',
    request_type: 'JSON',
  });

  const [fullUrl, setFullUrl] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [resource, setResource] = useState('');
  const [params, setParams] = useState<KeyValue[]>([]);
  const [query, setQuery] = useState<KeyValue[]>([]);
  const [headers, setHeaders] = useState<KeyValue[]>([
    { key: 'Content-Type', value: 'application/json', enabled: true }
  ]);
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [isLoadingRequest, setIsLoadingRequest] = useState(false);
  const [activeTab, setActiveTab] = useState('query');

  // Custom envs that will be saved with the action (ICustomEnv[])
  const [customEnvs, setCustomEnvs] = useState<ICustomEnv[]>([]);
  
  // State to track which CustomEnv is being updated for highlighting
  const [updatingEnvSlugs, setUpdatingEnvSlugs] = useState<Set<string>>(new Set());

  // Fetch app data to get environments from latest version
  const { data: appData } = useQuery({
    queryKey: ['app', data?.appId],
    queryFn: () =>
      appServicesReal.fetchApp({
        app_id: data?.appId || '',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
      }),
    enabled: !!data?.appId,
  });

  const app = appData?.data;
  // Get envs from latest version
  const latestVersion = app?.versions?.find((v: any) => v.latest === true);
  const environments = latestVersion?.envs || [];

  // Auto-generate tag from name
  useEffect(() => {
    if (formData.name) {
      const tag = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 50);
      setFormData(prev => ({ ...prev, tag }));
    }
  }, [formData.name]);

  // Initialize customEnvs from app environments
  useEffect(() => {
    if (environments.length > 0 && customEnvs.length === 0) {
      const initialCustomEnvs: ICustomEnv[] = environments.map((env: any) => ({
        slug: env.slug,
        base_url: env.base_url || '',
        config: {},
        active: env.active || false,
      }));
      setCustomEnvs(initialCustomEnvs);

      // Set the first active environment's base URL
      const firstActive = environments.find((e: any) => e.active) || environments[0];
      if (firstActive?.base_url) {
        setBaseUrl(firstActive.base_url);
      }
    }
  }, [environments, customEnvs.length]);

  // Parse URL when it changes
  useEffect(() => {
    if (fullUrl) {
      try {
        const url = new URL(fullUrl);
        const extractedBaseUrl = `${url.protocol}//${url.host}`;
        const extractedResource = url.pathname;

        // Only update if not matching current base URL
        if (extractedBaseUrl !== baseUrl) {
          setBaseUrl(extractedBaseUrl);
        }
        setResource(extractedResource);

        // Extract query parameters
        const extractedParams: KeyValue[] = [];
        url.searchParams.forEach((value, key) => {
          extractedParams.push({ key, value, enabled: true });
        });
        if (extractedParams.length > 0) {
          setQuery(extractedParams);
        }
      } catch (e) {
        // Invalid URL, ignore
      }
    }
  }, [fullUrl]);

  // Update full URL when base URL or resource changes
  useEffect(() => {
    if (baseUrl && resource) {
      try {
        const url = new URL(resource, baseUrl);
        // Add query params
        query.filter(q => q.enabled && q.key).forEach(q => {
          url.searchParams.set(q.key, q.value);
        });
        setFullUrl(url.toString());
      } catch (e) {
        // Invalid combination
      }
    }
  }, [baseUrl, resource, query]);

  // Auto-update all custom envs when base URL changes (not matching any existing env)
  useEffect(() => {
    if (baseUrl && customEnvs.length > 0) {
      const matchingEnv = customEnvs.find(e => e.base_url === baseUrl);

      // If base URL doesn't match any env, update all envs to this new base URL
      if (!matchingEnv) {
        // Highlight all envs being updated
        const envSlugs = customEnvs.map(env => env.slug);
        setUpdatingEnvSlugs(new Set(envSlugs));
        
        setCustomEnvs(prev => prev.map(env => ({
          ...env,
          base_url: baseUrl
        })));
        
        // Remove highlighting after a short delay
        setTimeout(() => {
          setUpdatingEnvSlugs(new Set());
        }, 1000);
      }
    }
  }, [baseUrl]);

  const handleEnvSelect = (slug: string) => {
    // Highlight the env being updated
    setUpdatingEnvSlugs(prev => new Set(prev).add(slug));
    
    const env = customEnvs.find(e => e.slug === slug);
    if (env?.base_url) {
      setBaseUrl(env.base_url);
    }
    // Set this env as active
    setCustomEnvs(prev => prev.map(e => ({
      ...e,
      active: e.slug === slug
    })));
    
    // Remove highlighting after a short delay
    setTimeout(() => {
      setUpdatingEnvSlugs(prev => {
        const newSet = new Set(prev);
        newSet.delete(slug);
        return newSet;
      });
    }, 1000);
  };

  const handleResetEnv = (slug: string) => {
    // Highlight the env being reset
    setUpdatingEnvSlugs(prev => new Set(prev).add(slug));
    
    const originalEnv = environments.find((e: any) => e.slug === slug);
    if (originalEnv) {
      setCustomEnvs(prev => prev.map(env => {
        if (env.slug === slug) {
          return {
            ...env,
            base_url: originalEnv.base_url || '',
          };
        }
        return env;
      }));

      // If this is the active env, update the main base URL too
      const env = customEnvs.find(e => e.slug === slug && e.active);
      if (env) {
        setBaseUrl(originalEnv.base_url || '');
      }

      toast.success('Environment reset to default');
      
      // Remove highlighting after a short delay
      setTimeout(() => {
        setUpdatingEnvSlugs(prev => {
          const newSet = new Set(prev);
          newSet.delete(slug);
          return newSet;
        });
      }, 1000);
    }
  };

  const addKeyValue = (
    setter: React.Dispatch<React.SetStateAction<KeyValue[]>>
  ) => {
    setter(prev => [...prev, { key: '', value: '', enabled: true }]);
  };

  const updateKeyValue = (
    index: number,
    field: keyof KeyValue,
    value: any,
    setter: React.Dispatch<React.SetStateAction<KeyValue[]>>
  ) => {
    setter(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeKeyValue = (
    index: number,
    setter: React.Dispatch<React.SetStateAction<KeyValue[]>>
  ) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const handleTest = async () => {
    if (!fullUrl) {
      toast.error('Please enter a URL');
      return;
    }

    setIsLoadingRequest(true);
    try {
      const url = new URL(fullUrl);

      // Add query params
      query.filter(q => q.enabled && q.key).forEach(q => {
        url.searchParams.set(q.key, q.value);
      });

      // Prepare headers
      const requestHeaders: Record<string, string> = {};
      headers.filter(h => h.enabled && h.key).forEach(h => {
        requestHeaders[h.key] = h.value;
      });

      const options: RequestInit = {
        method: formData.method,
        headers: requestHeaders,
      };

      if (['POST', 'PUT', 'PATCH'].includes(formData.method) && body) {
        options.body = body;
      }

      const res = await fetch(url.toString(), options);
      const responseData = await res.json();

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        data: responseData,
      });

      toast.success('Request completed');
      setActiveTab('response'); // Auto-switch to response tab
    } catch (error: any) {
      toast.error(`Request failed: ${error.message}`);
      setResponse({
        error: error.message,
      });
      setActiveTab('response'); // Auto-switch to response tab even on error
    } finally {
      setIsLoadingRequest(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Please enter a name for this request');
      return;
    }

    // Build IAppAction object with all fields including envs (ICustomEnv[])
    const actionData = {
      name: formData.name,
      tag: formData.tag,
      description: formData.description,
      method: formData.method,
      request_type: formData.request_type,
      resource,
      params: params.length > 0 ? {
        type: 'PARAMS',
        sample: params.reduce((acc, p) => ({ ...acc, [p.key]: p.value }), {}),
        data: params.map(p => ({ key: p.key, value: p.value, enabled: p.enabled }))
      } : undefined,
      query: query.length > 0 ? {
        type: 'QUERY',
        sample: query.reduce((acc, q) => ({ ...acc, [q.key]: q.value }), {}),
        data: query.map(q => ({ key: q.key, value: q.value, enabled: q.enabled }))
      } : undefined,
      headers: headers.length > 0 ? {
        type: 'HEADERS',
        sample: headers.reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {}),
        data: headers.map(h => ({ key: h.key, value: h.value, enabled: h.enabled }))
      } : undefined,
      body: body ? {
        type: 'BODY',
        sample: formData.request_type === 'JSON' ? JSON.parse(body) : body,
        data: []
      } : undefined,
      envs: customEnvs, // ICustomEnv[]
      responses: response ? [{
        name: `${formData.name} Response`,
        response_format: formData.request_type,
        status_code: response.status,
        success: response.status >= 200 && response.status < 300,
        body: {
          type: 'RESPONSE',
          sample: response.data,
          data: []
        }
      }] : []
    };

    console.log('Action data to save:', actionData);

    // TODO: Implement app.actions.update SDK method
    toast.success('Request saved');
    updateTab(tabId, { isDirty: false });
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-green/10 text-green';
      case 'POST':
        return 'bg-blue/10 text-blue';
      case 'PUT':
        return 'bg-orange-500/10 text-orange-500';
      case 'PATCH':
        return 'bg-purple-500/10 text-purple-500';
      case 'DELETE':
        return 'bg-red/10 text-red';
      default:
        return 'bg-grey-400 text-grey';
    }
  };

  return (
    <div className="h-full overflow-hidden bg-grey-100 flex">
      {/* Left Panel - URL & Environments */}
      <div className="w-2/5 border-r border-grey-400 bg-white overflow-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue/10 flex items-center justify-center flex-shrink-0">
                <Globe className="h-6 w-6 text-blue" />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Request Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="text-xl font-bold border-none p-0 h-auto focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="text-xs text-grey-600 bg-grey-100 px-3 py-1.5 rounded inline-block">
              Tag: <span className="font-mono">{formData.tag || 'auto-generated'}</span>
            </div>

            <Textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="text-sm resize-none"
              rows={2}
            />
          </div>

          {/* App Information */}
          {data?.appId && (
            <div className="pt-4 border-t border-grey-400">
              <Label className="text-sm font-semibold text-grey flex items-center gap-2 mb-3">
                <Server className="h-4 w-4 text-primary" />
                Adding to App
              </Label>
              
              {app ? (
                <div className="p-3 bg-grey-100 rounded-lg border border-grey-400">
                  <div className="flex items-center gap-3">
                    {/* App Logo */}
                    <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center text-green text-sm font-semibold flex-shrink-0">
                      {app.logo ? (
                        <img
                          src={app.logo}
                          alt={app.app_name}
                          className="w-full h-full rounded-lg object-cover"
                        />
                      ) : (
                        app.app_name
                          .split(' ')
                          .map(word => word[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)
                      )}
                    </div>
                    
                    {/* App Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-grey truncate">
                        {app.app_name}
                      </h4>
                      <p className="text-xs text-grey-600 truncate">
                        {app.tag}
                      </p>
                      {app.status && (
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1',
                          app.status === 'active' 
                            ? 'bg-green/10 text-green' 
                            : 'bg-grey-400 text-grey-600'
                        )}>
                          {app.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-grey-100 rounded-lg border border-grey-400">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-grey-400/20 flex items-center justify-center flex-shrink-0">
                      <Server className="h-5 w-5 text-grey-600" />
                    </div>
                    <div className="flex-1">
                      <div className="h-4 bg-grey-400/30 rounded animate-pulse mb-1"></div>
                      <div className="h-3 bg-grey-400/20 rounded animate-pulse w-2/3"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* URL Builder */}
          <div className="space-y-3 pt-4 border-t border-grey-400">
            <Label className="text-sm font-semibold text-grey">Request URL</Label>

            <div className="flex items-center gap-2">
              <Select
                value={formData.method}
                onValueChange={(value) => setFormData(prev => ({ ...prev, method: value }))}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(method => (
                    <SelectItem key={method} value={method}>
                      <span className={cn('px-2 py-1 rounded text-xs font-bold', getMethodColor(method))}>
                        {method}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={handleTest}
                disabled={isLoadingRequest || !fullUrl}
                className="bg-primary text-white hover:bg-primary/90"
                size="sm"
              >
                <Send className="h-4 w-4 mr-1" />
                {isLoadingRequest ? 'Sending...' : 'Send'}
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-grey flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Full URL
              </Label>
              <Input
                placeholder="https://api.example.com/v1/users"
                value={fullUrl}
                onChange={(e) => setFullUrl(e.target.value)}
                className="font-mono text-lg h-12 border-grey-400 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
                autoFocus
              />
            </div>

            {baseUrl && (
              <div className="p-3 bg-grey-100 rounded-lg border border-grey-400">
                <Label className="text-xs font-medium text-grey-600 mb-2 flex items-center gap-2">
                  <Hash className="h-3 w-3" />
                  Resource Path
                </Label>
                <Input
                  placeholder="/api/v1/endpoint"
                  value={resource}
                  onChange={(e) => setResource(e.target.value)}
                  className="font-mono text-xs h-8"
                />
              </div>
            )}
          </div>

          {/* Environments */}
          {environments.length > 0 && (
            <div className="pt-4 border-t border-grey-400">
              <Label className="text-sm font-semibold text-grey flex items-center gap-2 mb-3">
                <Server className="h-4 w-4 text-primary" />
                Environments
              </Label>

              <div className="space-y-2">
                {customEnvs.map((env) => {
                  const originalEnv = environments.find((e: any) => e.slug === env.slug);
                  const isModified = env.base_url !== originalEnv?.base_url;
                  const isUpdating = updatingEnvSlugs.has(env.slug);

                  return (
                    <div key={env.slug} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => handleEnvSelect(env.slug)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-all duration-300 flex-1',
                            isUpdating && 'animate-pulse ring-4 ring-yellow-400 ring-opacity-75 shadow-lg',
                            env.active
                              ? isUpdating 
                                ? 'bg-yellow-400 text-yellow-900 shadow-xl transform scale-105'
                                : 'bg-primary text-white'
                              : isUpdating
                                ? 'bg-yellow-200 text-yellow-900 shadow-xl transform scale-105'
                                : 'bg-grey-100 text-grey-700 hover:bg-grey-200'
                          )}
                        >
                          <span>{originalEnv?.env_name || env.slug}</span>
                          {isModified && !isUpdating && (
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" title="Modified" />
                          )}
                          {isUpdating && (
                            <span className="w-2 h-2 rounded-full bg-yellow-600 animate-ping" title="Updating..." />
                          )}
                        </button>

                        {isModified && !isUpdating && (
                          <Button
                            onClick={() => handleResetEnv(env.slug)}
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            title="Reset to default"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      {env.active && (
                        <div className="pl-3 text-xs text-grey-600">
                          <code className={cn(
                            "px-2 py-1 rounded border block transition-all duration-300",
                            isUpdating 
                              ? "bg-yellow-100 border-yellow-400 text-yellow-800 shadow-md"
                              : "bg-grey-100 border-grey-400"
                          )}>
                            {env.base_url || 'Not set'}
                          </code>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Request/Response */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="border-b border-grey-400 bg-white px-6">
            <TabsList className="w-full justify-start rounded-none bg-transparent p-0 h-auto">
              <TabsTrigger
                value="query"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                Query
              </TabsTrigger>
              <TabsTrigger
                value="params"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                Params
              </TabsTrigger>
              <TabsTrigger
                value="headers"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                Headers
              </TabsTrigger>
              {['POST', 'PUT', 'PATCH'].includes(formData.method) && (
                <TabsTrigger
                  value="body"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  Body
                </TabsTrigger>
              )}
              <TabsTrigger
                value="response"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                disabled={!response}
              >
                Response
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto">
            <TabsContent value="query" className="p-6 space-y-4 m-0">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold text-grey flex items-center gap-2">
                  <Hash className="h-4 w-4 text-primary" />
                  Query Parameters
                </Label>
                <Button onClick={() => addKeyValue(setQuery)} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {query.length === 0 ? (
                  <p className="text-sm text-grey-600 text-center py-8">
                    No query parameters
                  </p>
                ) : (
                  query.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center p-2 bg-grey-100 rounded border border-grey-400">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) => updateKeyValue(index, 'enabled', e.target.checked, setQuery)}
                        className="w-4 h-4 rounded border-grey-400"
                      />
                      <Input
                        placeholder="Key"
                        value={item.key}
                        onChange={(e) => updateKeyValue(index, 'key', e.target.value, setQuery)}
                        className="flex-1 h-9"
                      />
                      <Input
                        placeholder="Value"
                        value={item.value}
                        onChange={(e) => updateKeyValue(index, 'value', e.target.value, setQuery)}
                        className="flex-1 h-9"
                      />
                      <Button
                        onClick={() => removeKeyValue(index, setQuery)}
                        variant="ghost"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4 text-red" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="params" className="p-6 space-y-4 m-0">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold text-grey flex items-center gap-2">
                  <Hash className="h-4 w-4 text-primary" />
                  Path Parameters
                </Label>
                <Button onClick={() => addKeyValue(setParams)} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {params.length === 0 ? (
                  <p className="text-sm text-grey-600 text-center py-8">
                    No path parameters
                  </p>
                ) : (
                  params.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center p-2 bg-grey-100 rounded border border-grey-400">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) => updateKeyValue(index, 'enabled', e.target.checked, setParams)}
                        className="w-4 h-4 rounded border-grey-400"
                      />
                      <Input
                        placeholder="Key"
                        value={item.key}
                        onChange={(e) => updateKeyValue(index, 'key', e.target.value, setParams)}
                        className="flex-1 h-9"
                      />
                      <Input
                        placeholder="Value"
                        value={item.value}
                        onChange={(e) => updateKeyValue(index, 'value', e.target.value, setParams)}
                        className="flex-1 h-9"
                      />
                      <Button
                        onClick={() => removeKeyValue(index, setParams)}
                        variant="ghost"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4 text-red" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="headers" className="p-6 space-y-4 m-0">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold text-grey flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-primary" />
                  Headers
                </Label>
                <Button onClick={() => addKeyValue(setHeaders)} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {headers.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center p-2 bg-grey-100 rounded border border-grey-400">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(e) => updateKeyValue(index, 'enabled', e.target.checked, setHeaders)}
                      className="w-4 h-4 rounded border-grey-400"
                    />
                    <Input
                      placeholder="Header"
                      value={item.key}
                      onChange={(e) => updateKeyValue(index, 'key', e.target.value, setHeaders)}
                      className="flex-1 h-9"
                    />
                    <Input
                      placeholder="Value"
                      value={item.value}
                      onChange={(e) => updateKeyValue(index, 'value', e.target.value, setHeaders)}
                      className="flex-1 h-9"
                    />
                    <Button
                      onClick={() => removeKeyValue(index, setHeaders)}
                      variant="ghost"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4 text-red" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            {['POST', 'PUT', 'PATCH'].includes(formData.method) && (
              <TabsContent value="body" className="p-6 space-y-4 m-0">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold text-grey flex items-center gap-2">
                    <Code className="h-4 w-4 text-primary" />
                    Request Body
                  </Label>
                  <Select
                    value={formData.request_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, request_type: value }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="JSON">JSON</SelectItem>
                      <SelectItem value="XML">XML</SelectItem>
                      <SelectItem value="FORM">Form Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  placeholder={formData.request_type === 'JSON' ? '{\n  "key": "value"\n}' : 'Request body'}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="font-mono text-sm min-h-[400px] resize-none"
                />
              </TabsContent>
            )}

            <TabsContent value="response" className="p-6 space-y-4 m-0 h-full">
              {!response ? (
                <div className="flex items-center justify-center h-full text-grey-600">
                  <div className="text-center">
                    <p className="text-lg mb-2">No response yet</p>
                    <p className="text-sm">Send a request to see the response</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 h-full flex flex-col">
                  {response.status && (
                    <div className="flex items-center gap-2 p-3 bg-grey-100 rounded-lg border border-grey-400">
                      <span className="text-sm font-medium text-grey-600">Status:</span>
                      <span className={cn(
                        'px-3 py-1 rounded text-xs font-bold',
                        response.status >= 200 && response.status < 300 ? 'bg-green/10 text-green border border-green/20' :
                        response.status >= 400 ? 'bg-red/10 text-red border border-red/20' :
                        'bg-grey-400 text-grey'
                      )}>
                        {response.status} {response.statusText}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 flex flex-col min-h-0">
                    <Label className="text-sm font-medium text-grey-600 mb-2">Response Body</Label>
                    <div className="flex-1 bg-white rounded-lg border border-grey-400 p-4 overflow-auto font-mono text-sm">
                      <pre className="text-grey-800" style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {JSON.stringify(response.data || response, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        {/* Save Button */}
        <div className="border-t border-grey-400 bg-white p-4 flex justify-end">
          <Button onClick={handleSave} className="bg-primary text-white hover:bg-primary/90">
            <Save className="h-4 w-4 mr-2" />
            Save Request
          </Button>
        </div>
      </div>
    </div>
  );
}
