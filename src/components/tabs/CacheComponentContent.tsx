import { Zap, Copy, Eye, EyeOff, Edit, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface CacheComponentContentProps {
  cache: any;
}

export default function CacheComponentContent({ cache }: CacheComponentContentProps) {
  const [showSecrets, setShowSecrets] = useState(false);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getProviderLabel = (provider: string) => {
    const labels: Record<string, string> = {
      redis: 'Redis',
      memcached: 'Memcached',
      'in-memory': 'In-Memory',
    };
    return labels[provider] || provider;
  };

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      redis: 'bg-red/10 text-red',
      memcached: 'bg-green/10 text-green',
      'in-memory': 'bg-purple-500/10 text-purple-500',
    };
    return colors[provider] || 'bg-grey-400 text-grey-600';
  };

  const formatTTL = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    return `${Math.floor(seconds / 86400)} days`;
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-yellow/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-yellow" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-grey">{cache.name}</h1>
                <p className="text-sm text-grey-600">{cache.tag}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" size="sm" className="gap-2 text-red hover:text-red">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>

          {cache.description && (
            <p className="text-grey-600 mt-4">{cache.description}</p>
          )}
        </div>

        {/* Cache Configuration */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-grey mb-4">Cache Configuration</h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-grey-600">Provider</label>
              <div className="mt-1">
                <span className={cn('inline-flex px-3 py-1 rounded-full text-sm font-medium', getProviderColor(cache.provider))}>
                  {getProviderLabel(cache.provider)}
                </span>
              </div>
            </div>

            {cache.ttl && (
              <div>
                <label className="text-sm font-medium text-grey-600">Time to Live (TTL)</label>
                <div className="mt-1 flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-grey-100 rounded-lg border border-grey-400">
                    <Clock className="h-4 w-4 text-grey-600" />
                    <span className="font-mono text-sm text-grey">{cache.ttl} seconds</span>
                    <span className="text-sm text-grey-600">({formatTTL(parseInt(cache.ttl))})</span>
                  </div>
                </div>
                <p className="text-xs text-grey-600 mt-1">Cached items will expire after this duration</p>
              </div>
            )}

            {cache.host && (
              <div>
                <label className="text-sm font-medium text-grey-600">Host</label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-grey-100 rounded-lg border border-grey-400 font-mono text-sm">
                    {cache.host}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(cache.host, 'Host')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {cache.port && (
              <div>
                <label className="text-sm font-medium text-grey-600">Port</label>
                <div className="mt-1">
                  <code className="inline-block px-3 py-2 bg-grey-100 rounded-lg border border-grey-400 font-mono text-sm">
                    {cache.port}
                  </code>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Connection Details */}
        {(cache.password || cache.connection_string) && (
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-grey">Connection Details</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSecrets(!showSecrets)}
                className="gap-2"
              >
                {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showSecrets ? 'Hide' : 'Show'}
              </Button>
            </div>

            <div className="space-y-4">
              {cache.connection_string && (
                <div>
                  <label className="text-sm font-medium text-grey-600">Connection String</label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-grey-100 rounded-lg border border-grey-400 font-mono text-sm break-all">
                      {showSecrets ? cache.connection_string : '•'.repeat(50)}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(cache.connection_string, 'Connection string')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {cache.password && (
                <div>
                  <label className="text-sm font-medium text-grey-600">Password</label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-grey-100 rounded-lg border border-grey-400 font-mono text-sm">
                      {showSecrets ? cache.password : '•'.repeat(20)}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(cache.password, 'Password')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 p-3 bg-yellow/5 border border-yellow/20 rounded-lg">
              <p className="text-sm text-grey-600">
                <strong>Security Note:</strong> Keep connection credentials secure and use environment variables in production.
              </p>
            </div>
          </div>
        )}

        {/* Performance Benefits */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-grey mb-4">Performance Benefits</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green/5 border border-green/20 rounded-lg">
              <p className="text-2xl font-bold text-green mb-1">↓ 80%</p>
              <p className="text-sm text-grey-600">Response Time</p>
            </div>
            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
              <p className="text-2xl font-bold text-primary mb-1">↓ 90%</p>
              <p className="text-sm text-grey-600">Database Load</p>
            </div>
            <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
              <p className="text-2xl font-bold text-purple-500 mb-1">↑ 10x</p>
              <p className="text-sm text-grey-600">Throughput</p>
            </div>
          </div>
        </div>

        {/* Usage Information */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-grey mb-2">Cache Active</h3>
          <p className="text-sm text-grey-600">
            Caching is enabled and will improve application performance by reducing database queries and API calls.
          </p>
        </div>
      </div>
    </div>
  );
}
