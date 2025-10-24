import { useState } from 'react';
import { Key, Plus, Copy, Eye, EyeOff, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Token {
  _id: string;
  name: string;
  token: string;
  type: 'api_key' | 'bearer_token' | 'oauth_token';
  scope: string[];
  created_at: Date;
  expires_at?: Date;
  last_used?: Date;
  status: 'active' | 'expired' | 'revoked';
}

// Empty tokens array - will be populated from API
const initialTokens: Token[] = [];

export default function TokensTabContent() {
  const [tokens, setTokens] = useState<Token[]>(initialTokens);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set());
  const [newToken, setNewToken] = useState({
    name: '',
    type: 'api_key' as Token['type'],
    scope: [] as string[],
    expires_in: '365',
  });

  const handleToggleTokenVisibility = (tokenId: string) => {
    setVisibleTokens(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tokenId)) {
        newSet.delete(tokenId);
      } else {
        newSet.add(tokenId);
      }
      return newSet;
    });
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    // Could add toast notification here
  };

  const handleCreateToken = () => {
    const expiresAt = newToken.expires_in !== 'never'
      ? new Date(Date.now() + parseInt(newToken.expires_in) * 24 * 60 * 60 * 1000)
      : undefined;

    const token: Token = {
      _id: `token-${Date.now()}`,
      name: newToken.name,
      token: `sk_${newToken.type}_${Math.random().toString(36).substring(2, 15)}`,
      type: newToken.type,
      scope: newToken.scope,
      created_at: new Date(),
      expires_at: expiresAt,
      status: 'active',
    };

    setTokens([token, ...tokens]);
    setShowCreateDialog(false);
    setNewToken({
      name: '',
      type: 'api_key',
      scope: [],
      expires_in: '365',
    });
  };

  const handleRevokeToken = (tokenId: string) => {
    setTokens(tokens.map(t =>
      t._id === tokenId ? { ...t, status: 'revoked' as const } : t
    ));
  };

  const maskToken = (token: string, visible: boolean) => {
    if (visible) return token;
    return token.substring(0, 10) + '•'.repeat(20);
  };

  const getStatusColor = (status: Token['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green/10 text-green';
      case 'expired':
        return 'bg-orange-500/10 text-orange-500';
      case 'revoked':
        return 'bg-red-500/10 text-red-500';
    }
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Key className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-grey">API Tokens</h1>
              </div>
              <p className="text-grey-600">
                Manage API keys and access tokens for your workspace
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Token
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                <Key className="h-5 w-5 text-green" />
              </div>
              <div>
                <p className="text-2xl font-bold text-grey">
                  {tokens.filter(t => t.status === 'active').length}
                </p>
                <p className="text-sm text-grey-600">Active Tokens</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-grey">
                  {tokens.filter(t => t.status === 'expired').length}
                </p>
                <p className="text-sm text-grey-600">Expired Tokens</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-grey">
                  {tokens.filter(t => t.status === 'revoked').length}
                </p>
                <p className="text-sm text-grey-600">Revoked Tokens</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tokens List */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-grey mb-4">Your Tokens</h2>
          <div className="space-y-3">
            {tokens.map((token) => (
              <div
                key={token._id}
                className="p-4 rounded-lg border border-grey-400 hover:border-primary transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-sm font-semibold text-grey">{token.name}</h3>
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getStatusColor(token.status))}>
                        {token.status}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                        {token.type.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-xs font-mono text-grey-600 bg-grey-100 px-2 py-1 rounded flex-1 truncate">
                        {maskToken(token.token, visibleTokens.has(token._id))}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleTokenVisibility(token._id)}
                        className="h-7 w-7 p-0"
                      >
                        {visibleTokens.has(token._id) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyToken(token.token)}
                        className="h-7 w-7 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-grey-600">
                      <span>Scope: {token.scope.join(', ')}</span>
                      <span>•</span>
                      <span>Created: {token.created_at.toLocaleDateString()}</span>
                      {token.expires_at && (
                        <>
                          <span>•</span>
                          <span>Expires: {token.expires_at.toLocaleDateString()}</span>
                        </>
                      )}
                      {token.last_used && (
                        <>
                          <span>•</span>
                          <span>Last used: {token.last_used.toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {token.status === 'active' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRevokeToken(token._id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Token Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Token</DialogTitle>
            <DialogDescription>
              Create a new API token for accessing your workspace resources
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="token-name">Token Name</Label>
              <Input
                id="token-name"
                placeholder="e.g., Production API Key"
                value={newToken.name}
                onChange={(e) => setNewToken({ ...newToken, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="token-type">Token Type</Label>
              <Select
                value={newToken.type}
                onValueChange={(value) => setNewToken({ ...newToken, type: value as Token['type'] })}
              >
                <SelectTrigger id="token-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="api_key">API Key</SelectItem>
                  <SelectItem value="bearer_token">Bearer Token</SelectItem>
                  <SelectItem value="oauth_token">OAuth Token</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires-in">Expires In</Label>
              <Select
                value={newToken.expires_in}
                onValueChange={(value) => setNewToken({ ...newToken, expires_in: value })}
              >
                <SelectTrigger id="expires-in">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Scope</Label>
              <div className="flex gap-2 flex-wrap">
                {['read', 'write', 'delete', 'admin'].map((scope) => (
                  <button
                    key={scope}
                    onClick={() => {
                      const newScope = newToken.scope.includes(scope)
                        ? newToken.scope.filter(s => s !== scope)
                        : [...newToken.scope, scope];
                      setNewToken({ ...newToken, scope: newScope });
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                      newToken.scope.includes(scope)
                        ? 'bg-primary text-white'
                        : 'bg-grey-100 text-grey-600 hover:bg-grey-200'
                    )}
                  >
                    {scope}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateToken} disabled={!newToken.name || newToken.scope.length === 0}>
              Create Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
