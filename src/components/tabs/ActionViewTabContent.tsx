import { useState, useEffect } from 'react';
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
import { Send, Plus, Trash2, Code, Globe, Hash, FileCode, Server, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface ActionViewTabContentProps {
  action: any;
}

interface KeyValue {
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
}

interface ICustomEnv {
  slug: string;
  base_url: string;
  config?: Record<string, unknown>;
  active: boolean;
}

export default function ActionViewTabContent({ action }: ActionViewTabContentProps) {
  // Debug logging
  console.log('ActionViewTabContent - action data:', action);
  console.log('ActionViewTabContent - environments from action:', action.envs);
  console.log('ActionViewTabContent - action.appName:', action.appName);
  console.log('ActionViewTabContent - action.appTag:', action.appTag);

  // Form state matching the action data
  const [formData, setFormData] = useState({
    name: action.name || action.tag || '',
    tag: action.tag || '',
    description: action.description || '',
    method: action.method || 'GET',
    request_type: 'JSON',
  });

  const [fullUrl, setFullUrl] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [resource, setResource] = useState(action.resource || '');
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

  // Use app data passed from parent component
  const app = {
    app_name: action.appName,
    tag: action.appTag,
    logo: action.appLogo,
    status: action.appStatus,
  };
  
  // Use environments passed from parent component
  const environments = action.envs || [];
  
  // Debug logging
  console.log('ActionViewTabContent - app data:', app);
  console.log('ActionViewTabContent - environments:', environments);

  // Initialize form data from action
  useEffect(() => {
    if (action) {
      setFormData({
        name: action.name || action.tag || '',
        tag: action.tag || '',
        description: action.description || '',
        method: action.method || 'GET',
        request_type: 'JSON',
      });
      setResource(action.resource || '');
    }
  }, [action]);

  // Initialize customEnvs from app environments
  useEffect(() => {
    if (environments.length > 0 && customEnvs.length === 0) {
      const envs = environments.map((env: any) => ({
        slug: env.slug,
        base_url: env.base_url || '',
        active: env.active || false,
      }));
      setCustomEnvs(envs);
      
      // Set the active environment's base URL
      const activeEnv = environments.find((env: any) => env.active) || environments[0];
      if (activeEnv?.base_url) {
        setBaseUrl(activeEnv.base_url);
      }
    }
  }, [environments]);

  // Initialize params, query, headers from action data
  useEffect(() => {
    if (action) {
      // Initialize params
      if (action.params?.data) {
        setParams(
          action.params.data.map((param: any) => ({
            key: param.key || '',
            value: param.default || '',
            description: param.description || '',
            enabled: true,
          }))
        );
      }

      // Initialize query
      if (action.query?.data) {
        setQuery(
          action.query.data.map((param: any) => ({
            key: param.key || '',
            value: param.default || '',
            description: param.description || '',
            enabled: true,
          }))
        );
      }

      // Initialize headers
      if (action.headers?.data) {
        setHeaders([
          { key: 'Content-Type', value: 'application/json', enabled: true },
          ...action.headers.data.map((header: any) => ({
            key: header.key || '',
            value: header.default || '',
            description: header.description || '',
            enabled: true,
          }))
        ]);
      }

      // Initialize body
      if (action.body?.data) {
        const bodyData = action.body.data.reduce((acc: any, field: any) => {
          acc[field.key] = field.default || '';
          return acc;
        }, {});
        setBody(JSON.stringify(bodyData, null, 2));
      }
    }
  }, [action]);

  // Build full URL from base URL and resource
  useEffect(() => {
    if (baseUrl && resource) {
      try {
        // Ensure resource starts with / if it doesn't already
        const normalizedResource = resource.startsWith('/') ? resource : `/${resource}`;
        const url = new URL(normalizedResource, baseUrl);
        setFullUrl(url.toString());
      } catch (e) {
        // If URL construction fails, try simple concatenation
        const normalizedResource = resource.startsWith('/') ? resource : `/${resource}`;
        setFullUrl(`${baseUrl}${normalizedResource}`);
      }
    } else if (baseUrl) {
      // If only base URL is available, show it
      setFullUrl(baseUrl);
    } else if (resource) {
      // If only resource is available, show it
      setFullUrl(resource);
    }
  }, [baseUrl, resource]);

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
      toast.error('Please enter a valid URL');
      return;
    }

    setIsLoadingRequest(true);
    const startTime = Date.now();
    
    try {
      // Prepare headers
      const requestHeaders: Record<string, string> = {};
      headers.forEach(header => {
        if (header.enabled && header.key && header.value) {
          requestHeaders[header.key] = header.value;
        }
      });

      // Prepare query parameters
      const queryParams = new URLSearchParams();
      query.forEach(param => {
        if (param.enabled && param.key && param.value) {
          queryParams.append(param.key, param.value);
        }
      });

      // Prepare path parameters (replace in URL)
      let finalUrl = fullUrl;
      params.forEach(param => {
        if (param.enabled && param.key && param.value) {
          finalUrl = finalUrl.replace(`{${param.key}}`, param.value);
        }
      });

      // Add query parameters to URL
      if (queryParams.toString()) {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryParams.toString();
      }

      // Prepare request body
      let requestBody: string | undefined;
      if (['POST', 'PUT', 'PATCH'].includes(formData.method) && body) {
        try {
          // Try to parse as JSON to validate
          JSON.parse(body);
          requestBody = body;
        } catch (e) {
          // If not valid JSON, send as plain text
          requestBody = body;
        }
      }

      // Make the actual API call
      const fetchOptions: RequestInit = {
        method: formData.method,
        headers: requestHeaders,
        ...(requestBody && { body: requestBody }),
      };

      const response = await fetch(finalUrl, fetchOptions);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Get response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Get response body
      let responseData: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        try {
          responseData = await response.json();
        } catch (e) {
          responseData = await response.text();
        }
      } else {
        responseData = await response.text();
      }

      // Calculate response size
      const responseSize = new Blob([JSON.stringify(responseData)]).size;

      const apiResponse = {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data: responseData,
        time: responseTime,
        size: responseSize,
        url: finalUrl,
        method: formData.method,
      };

      setResponse(apiResponse);
      
      if (response.ok) {
        toast.success(`Request executed successfully (${response.status})`);
      } else {
        toast.error(`Request failed (${response.status})`);
      }
    } catch (error: any) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      const errorResponse = {
        status: 0,
        statusText: 'Network Error',
        headers: {},
        data: {
          error: error.message || 'Request failed',
          type: 'network_error'
        },
        time: responseTime,
        size: 0,
        url: fullUrl,
        method: formData.method,
      };

      setResponse(errorResponse);
      toast.error(`Request failed: ${error.message || 'Network error'}`);
    } finally {
      setIsLoadingRequest(false);
    }
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
    <div className="h-full overflow-hidden bg-grey-100 flex flex-col lg:flex-row">
      {/* Left Panel - URL & Environments */}
      <div className="w-full lg:w-2/5 border-b lg:border-b-0 lg:border-r border-grey-400 bg-white overflow-auto">
        <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
          {/* Header */}
          <div className="space-y-3 lg:space-y-4">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg bg-blue/10 flex items-center justify-center flex-shrink-0">
                <Globe className="h-5 w-5 lg:h-6 lg:w-6 text-blue" />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Action Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="text-lg lg:text-xl font-bold border-none p-0 h-auto focus-visible:ring-0"
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
          {app && (
            <div className="pt-4 border-t border-grey-400">
              <Label className="text-sm font-semibold text-grey flex items-center gap-2 mb-3">
                <Server className="h-4 w-4 text-primary" />
                App Context
              </Label>
              
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
                        .map((word: string) => word[0])
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
            </div>
          )}

          {/* URL Builder */}
          <div className="space-y-3 pt-4 border-t border-grey-400">
            <Label className="text-sm font-semibold text-grey">Request URL</Label>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Select
                value={formData.method}
                onValueChange={(value) => setFormData(prev => ({ ...prev, method: value }))}
              >
                <SelectTrigger className="w-full sm:w-28">
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
                disabled={isLoadingRequest || !fullUrl || !baseUrl}
                className="bg-primary text-white hover:bg-primary/90 w-full sm:w-auto"
                size="sm"
              >
                <Send className="h-4 w-4 mr-1" />
                {isLoadingRequest ? 'Sending...' : 'Send'}
              </Button>
            </div>

            <Input
              placeholder={baseUrl ? "Select an environment to see full URL" : "No environment selected"}
              value={fullUrl}
              readOnly
              className="font-mono text-sm bg-grey-50"
            />
            
            {!baseUrl && (
              <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                ⚠️ Please select an environment above to enable the Send button
              </div>
            )}
            
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
              <p className="text-xs text-grey-500 mt-1">
                {baseUrl ? `Full URL: ${baseUrl}${resource.startsWith('/') ? resource : `/${resource}`}` : 'Select an environment to see full URL'}
              </p>
            </div>

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
          <div className="border-b border-grey-400 bg-white px-4 lg:px-6">
            <TabsList className="w-full justify-start rounded-none bg-transparent p-0 h-auto overflow-x-auto">
              <TabsTrigger
                value="query"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 lg:px-4 py-3 text-sm lg:text-base whitespace-nowrap"
              >
                Query
              </TabsTrigger>
              <TabsTrigger
                value="params"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 lg:px-4 py-3 text-sm lg:text-base whitespace-nowrap"
              >
                Params
              </TabsTrigger>
              <TabsTrigger
                value="headers"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 lg:px-4 py-3 text-sm lg:text-base whitespace-nowrap"
              >
                Headers
              </TabsTrigger>
              {['POST', 'PUT', 'PATCH'].includes(formData.method) && (
                <TabsTrigger
                  value="body"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 lg:px-4 py-3 text-sm lg:text-base whitespace-nowrap"
                >
                  Body
                </TabsTrigger>
              )}
              <TabsTrigger
                value="response"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 lg:px-4 py-3 text-sm lg:text-base whitespace-nowrap"
                disabled={!response}
              >
                Response
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto">
            <TabsContent value="query" className="p-4 lg:p-6 space-y-4 m-0">
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
                  <p className="text-sm text-grey-600 text-center py-8 bg-grey-100 rounded-lg">
                    No query parameters
                  </p>
                ) : (
                  query.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center p-2 bg-grey-100 rounded border border-grey-400">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={(e) => updateKeyValue(index, 'enabled', e.target.checked, setQuery)}
                          className="w-4 h-4 rounded border-grey-400"
                        />
                        <Button
                          onClick={() => removeKeyValue(index, setQuery)}
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="params" className="p-4 lg:p-6 space-y-4 m-0">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold text-grey flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-primary" />
                  Path Parameters
                </Label>
                <Button onClick={() => addKeyValue(setParams)} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {params.length === 0 ? (
                  <p className="text-sm text-grey-600 text-center py-8 bg-grey-100 rounded-lg">
                    No path parameters
                  </p>
                ) : (
                  params.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center p-2 bg-grey-100 rounded border border-grey-400">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={(e) => updateKeyValue(index, 'enabled', e.target.checked, setParams)}
                          className="w-4 h-4 rounded border-grey-400"
                        />
                        <Button
                          onClick={() => removeKeyValue(index, setParams)}
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="headers" className="p-4 lg:p-6 space-y-4 m-0">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold text-grey flex items-center gap-2">
                  <Code className="h-4 w-4 text-primary" />
                  Headers
                </Label>
                <Button onClick={() => addKeyValue(setHeaders)} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {headers.length === 0 ? (
                  <p className="text-sm text-grey-600 text-center py-8 bg-grey-100 rounded-lg">
                    No headers
                  </p>
                ) : (
                  headers.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center p-2 bg-grey-100 rounded border border-grey-400">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={(e) => updateKeyValue(index, 'enabled', e.target.checked, setHeaders)}
                          className="w-4 h-4 rounded border-grey-400"
                        />
                        <Button
                          onClick={() => removeKeyValue(index, setHeaders)}
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Key"
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
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {['POST', 'PUT', 'PATCH'].includes(formData.method) && (
              <TabsContent value="body" className="p-4 lg:p-6 space-y-4 m-0">
                <Label className="text-base font-semibold text-grey flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-primary" />
                  Request Body
                </Label>
                <Textarea
                  placeholder='{\n  "key": "value"\n}'
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="font-mono text-sm min-h-[200px]"
                />
              </TabsContent>
            )}

            <TabsContent value="response" className="p-4 lg:p-6 space-y-4 m-0">
              <Label className="text-base font-semibold text-grey flex items-center gap-2">
                <Code className="h-4 w-4 text-primary" />
                Response
              </Label>
              {response ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                    <span className={cn(
                      'px-2 py-1 rounded font-medium inline-block w-fit',
                      response.status >= 200 && response.status < 300
                        ? 'bg-green/10 text-green'
                        : response.status >= 400
                        ? 'bg-red/10 text-red'
                        : 'bg-yellow/10 text-yellow'
                    )}>
                      {response.status} {response.statusText}
                    </span>
                    <div className="flex flex-wrap gap-2 sm:gap-4">
                      <span className="text-grey-600">{response.time}ms</span>
                      <span className="text-grey-600">{response.size} bytes</span>
                    </div>
                    {response.url && (
                      <span className="text-grey-500 text-xs font-mono break-all">
                        {response.method} {response.url}
                      </span>
                    )}
                  </div>
                  
                  {/* Response Headers */}
                  {Object.keys(response.headers).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-grey mb-2">Headers</h4>
                      <div className="bg-grey-100 p-3 rounded border border-grey-400 max-h-32 overflow-auto">
                        {Object.entries(response.headers).map(([key, value]) => (
                          <div key={key} className="text-xs font-mono">
                            <span className="text-grey-600">{key}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Response Body */}
                  <div>
                    <h4 className="text-sm font-medium text-grey mb-2">Body</h4>
                    <pre className="bg-grey-100 p-4 rounded border border-grey-400 text-sm overflow-auto max-h-96">
                      {typeof response.data === 'string' 
                        ? response.data 
                        : JSON.stringify(response.data, null, 2)
                      }
                    </pre>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-grey-600 text-center py-8 bg-grey-100 rounded-lg">
                  No response yet. Send a request to see the response.
                </p>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
