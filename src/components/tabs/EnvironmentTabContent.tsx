import { Globe, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface EnvironmentTabContentProps {
  environment: any;
}

export default function EnvironmentTabContent({ environment }: EnvironmentTabContentProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleShowValue = (key: string) => {
    setShowValues(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Parse environment variables if they're stored as key-value pairs
  const envVariables = environment.variables || environment.envs || [];

  return (
    <div className="bg-grey-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-grey mb-2">{environment.env_name || environment.name}</h1>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-grey-600">Slug: <span className="font-mono">{environment.slug}</span></span>
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-semibold border",
                  environment.active
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
                    : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                )}>
                  {environment.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {environment.description && (
                <p className="text-sm text-grey-600">{environment.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Base URL */}
        {environment.base_url && (
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-grey mb-4">Base URL</h2>
            <div className="flex items-center gap-2">
              <Input
                value={environment.base_url}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(environment.base_url, 'base_url')}
              >
                {copiedKey === 'base_url' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Environment Variables */}
        {envVariables.length > 0 && (
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-grey mb-4">Environment Variables</h2>
            <div className="space-y-3">
              {envVariables.map((variable: any, index: number) => (
                <div key={index} className="p-3 rounded-lg border border-grey-400">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold text-grey">
                      {variable.key || variable.name}
                    </Label>
                    {variable.required && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red/10 text-red">
                        Required
                      </span>
                    )}
                  </div>
                  {variable.description && (
                    <p className="text-xs text-grey-600 mb-2">{variable.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showValues[variable.key || variable.name] ? 'text' : 'password'}
                        value={variable.value || variable.default_value || ''}
                        readOnly
                        className="pr-10 font-mono text-sm"
                      />
                      <button
                        onClick={() => toggleShowValue(variable.key || variable.name)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey"
                      >
                        {showValues[variable.key || variable.name] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(variable.value || variable.default_value || '', `var-${index}`)}
                    >
                      {copiedKey === `var-${index}` ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {envVariables.length === 0 && !environment.base_url && (
          <div className="bg-white rounded-lg border border-grey-400 p-12 shadow-sm text-center">
            <Globe className="h-12 w-12 text-grey-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-grey mb-2">No Variables Configured</h3>
            <p className="text-sm text-grey-600">
              This environment doesn't have any variables or base URL configured yet.
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ About Environments</h3>
          <p className="text-xs text-blue-800">
            Environments allow you to manage different configurations for development, staging, and production. Variables defined here can be used in your API requests.
          </p>
        </div>
      </div>
    </div>
  );
}
