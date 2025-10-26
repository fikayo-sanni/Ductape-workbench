import { Key, Trash2 } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface AuthTabContentProps {
  auth: any;
}

export default function AuthTabContent({ auth }: AuthTabContentProps) {
  const authorizationType = auth.setup_type as 'credential_access' | 'token_access';

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-yellow/10 flex items-center justify-center">
                <Key className="h-6 w-6 text-yellow" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-grey">{auth.name}</h1>
                <p className="text-sm text-grey-600">Tag: <span className="font-mono">{auth.tag}</span></p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2 text-red hover:text-red">
              <Trash2 className="h-4 w-4 text-red" />
              Delete
            </Button>
          </div>
        </div>

        {/* Authorization Type */}
        <Card>
          <CardHeader>
            <CardTitle>Authorization Type</CardTitle>
            <CardDescription>The type of authorization method</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label>Authorization Type</Label>
              <Select value={authorizationType} disabled>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credential_access">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/10 text-green-600">
                        Credential Access
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="token_access">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary">
                        Token Access
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Name and description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Name of Authorization flow</Label>
              <Input
                value={auth.name || ''}
                readOnly
                className="mt-2"
              />
            </div>
            <div>
              <Label>Tag</Label>
              <Input
                value={auth.tag || ''}
                readOnly
                className="mt-2 font-mono"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={auth.description || ''}
                readOnly
                rows={3}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Credential Access Configuration */}
        {authorizationType === 'credential_access' && (
          <Card>
            <CardHeader>
              <CardTitle>Credential Configuration</CardTitle>
              <CardDescription>Action and expiry settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Action</Label>
                <Select value={auth.action_tag || 'no-action'} disabled>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select an action" />
                  </SelectTrigger>
                  <SelectContent>
                    {auth.action_tag ? (
                      <SelectItem value={auth.action_tag}>
                        {auth.action_tag}
                      </SelectItem>
                    ) : (
                      <SelectItem value="no-action">
                        No action selected
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Expiry</Label>
                  <Input
                    type="number"
                    value={auth.expiry || 0}
                    readOnly
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Period</Label>
                  <Select value={auth.period || 'hours'} disabled>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select a period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="weeks">Weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Token Configuration */}
        {authorizationType === 'token_access' && auth.tokens && (() => {
          // Collect all token fields from headers, body, params, and query
          const tokenFields: Array<{ type: string; key: string; sampleValue: string }> = [];
          
          ['headers', 'body', 'params', 'query'].forEach((category: string) => {
            if (auth.tokens[category]?.data && Array.isArray(auth.tokens[category].data)) {
              auth.tokens[category].data.forEach((item: any) => {
                if (item.key && item.sampleValue) {
                  tokenFields.push({
                    type: category.charAt(0).toUpperCase() + category.slice(1),
                    key: item.key,
                    sampleValue: item.sampleValue
                  });
                }
              });
            }
          });

          // Only show if there are token fields
          if (tokenFields.length === 0) return null;

          // Group by type for better visualization
          const groupedFields = tokenFields.reduce((acc, field) => {
            if (!acc[field.type]) {
              acc[field.type] = [];
            }
            acc[field.type].push(field);
            return acc;
          }, {} as Record<string, typeof tokenFields>);

          const getTypeColor = (type: string) => {
            switch (type.toLowerCase()) {
              case 'headers':
                return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
              case 'body':
                return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
              case 'params':
                return 'bg-green-500/10 text-green-600 border-green-500/20';
              case 'query':
                return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
              default:
                return 'bg-grey-500/10 text-grey-600 border-grey-500/20';
            }
          };

          return (
            <Card>
              <CardHeader>
                <CardTitle>Token Configuration</CardTitle>
                <CardDescription>Token fields and sample values</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(groupedFields).map(([type, fields]) => (
                  <div key={type} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className={cn('px-3 py-1 rounded-full text-xs font-semibold border', getTypeColor(type))}>
                        {type}
                      </span>
                      <span className="text-xs text-grey-600">{fields.length} field{fields.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="space-y-2">
                      {fields.map((field, index) => (
                        <div
                          key={index}
                          className="p-4 bg-grey-50 rounded-lg border border-grey-300 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <Label className="text-xs text-grey-600 mb-1 block">Field Name</Label>
                              <Input
                                value={field.key}
                                readOnly
                                className="font-mono text-sm bg-white"
                              />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <Label className="text-xs text-grey-600 mb-1 block">Sample Value</Label>
                            <Input
                              value={field.sampleValue}
                              readOnly
                              className="font-mono text-sm bg-white break-all"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })()}

        {/* Info */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-grey mb-2">ℹ️ Authorization Types</h3>
          <ul className="text-sm text-grey-600 space-y-1 list-disc list-inside">
            <li><strong>Credential Access:</strong> Uses credentials to access an action and generate tokens</li>
            <li><strong>Token Access:</strong> Uses pre-generated tokens for direct access</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
