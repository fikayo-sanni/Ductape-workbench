import { Key, Shield, Lock, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface AuthTabContentProps {
  auth: any;
}

export default function AuthTabContent({ auth }: AuthTabContentProps) {
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  const toggleShowValue = (key: string) => {
    setShowValues(prev => ({
      ...prev, [key]: !prev[key]
    }));
  };

  const getAuthTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'api_key':
        return 'bg-yellow/10 text-yellow';
      case 'bearer':
      case 'oauth2':
        return 'bg-primary/10 text-primary';
      case 'basic':
        return 'bg-green/10 text-green';
      default:
        return 'bg-grey-400 text-grey';
    }
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-yellow/10 flex items-center justify-center flex-shrink-0">
              <Key className="h-6 w-6 text-yellow" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-grey mb-2">{auth.name}</h1>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-grey-600">Tag: <span className="font-mono">{auth.tag}</span></span>
                {auth.type && (
                  <span className={cn('px-2 py-1 rounded text-xs font-medium', getAuthTypeColor(auth.type))}>
                    {auth.type}
                  </span>
                )}
              </div>
              {auth.description && (
                <p className="text-sm text-grey-600">{auth.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Authentication Details */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-grey mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Authentication Configuration
          </h2>

          <div className="space-y-4">
            {/* Auth Type */}
            <div>
              <Label className="text-sm font-semibold text-grey">Authentication Type</Label>
              <Input
                value={auth.type || 'Not specified'}
                readOnly
                className="mt-2"
              />
            </div>

            {/* Scheme (for Bearer, etc) */}
            {auth.scheme && (
              <div>
                <Label className="text-sm font-semibold text-grey">Scheme</Label>
                <Input
                  value={auth.scheme}
                  readOnly
                  className="mt-2"
                />
              </div>
            )}

            {/* Token/Key Location */}
            {auth.in && (
              <div>
                <Label className="text-sm font-semibold text-grey">Location</Label>
                <Input
                  value={auth.in}
                  readOnly
                  className="mt-2"
                />
              </div>
            )}

            {/* Parameter Name */}
            {auth.name && auth.in && (
              <div>
                <Label className="text-sm font-semibold text-grey">Parameter Name</Label>
                <Input
                  value={auth.param_name || auth.name}
                  readOnly
                  className="mt-2"
                />
              </div>
            )}
          </div>
        </div>

        {/* OAuth 2.0 Details (if applicable) */}
        {auth.type?.toLowerCase() === 'oauth2' && (
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-grey mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              OAuth 2.0 Configuration
            </h2>

            <div className="space-y-4">
              {auth.authorization_url && (
                <div>
                  <Label className="text-sm font-semibold text-grey">Authorization URL</Label>
                  <Input
                    value={auth.authorization_url}
                    readOnly
                    className="mt-2 font-mono text-xs"
                  />
                </div>
              )}

              {auth.token_url && (
                <div>
                  <Label className="text-sm font-semibold text-grey">Token URL</Label>
                  <Input
                    value={auth.token_url}
                    readOnly
                    className="mt-2 font-mono text-xs"
                  />
                </div>
              )}

              {auth.flow && (
                <div>
                  <Label className="text-sm font-semibold text-grey">OAuth Flow</Label>
                  <Input
                    value={auth.flow}
                    readOnly
                    className="mt-2"
                  />
                </div>
              )}

              {auth.scopes && auth.scopes.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold text-grey mb-2">Scopes</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {auth.scopes.map((scope: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Required Fields */}
        {auth.required_fields && auth.required_fields.length > 0 && (
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-grey mb-4">Required Fields</h2>
            <div className="space-y-3">
              {auth.required_fields.map((field: any, index: number) => (
                <div key={index} className="p-3 rounded-lg border border-grey-400">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold text-grey">{field.name || field.key}</Label>
                    {field.type && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-grey-100 text-grey-600">
                        {field.type}
                      </span>
                    )}
                  </div>
                  {field.description && (
                    <p className="text-xs text-grey-600 mb-2">{field.description}</p>
                  )}
                  <div className="relative">
                    <Input
                      type={showValues[field.key] ? 'text' : 'password'}
                      placeholder={`Enter ${field.name || field.key}`}
                      className="pr-10"
                    />
                    <button
                      onClick={() => toggleShowValue(field.key)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey"
                    >
                      {showValues[field.key] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usage Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ Usage Information</h3>
          <p className="text-xs text-blue-800">
            This authentication method will be automatically applied to all actions that require it. Configure the required fields above to use this authentication in your requests.
          </p>
        </div>
      </div>
    </div>
  );
}
