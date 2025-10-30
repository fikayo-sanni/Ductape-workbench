import { useState } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyRound, Save, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import { useDuctape } from '@/hooks/useDuctape';
import { TokenPeriods } from '@ductape/sdk/dist/types';

interface NewSessionTabContentProps {
  tabId: string;
  data?: any;
}

export default function NewSessionTabContent({ tabId, data }: NewSessionTabContentProps) {
  const { closeTab, openTab } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  // Extract product context from data
  const product = data?.productId ? {
    _id: data.productId,
    name: data.productName,
    tag: data.productTag,
    logo: data.productLogo,
    envs: data.productEnvs || [],
    workspace_id: data.workspaceId || currentWorkspaceId
  } : null;

  // Initialize Ductape SDK
  const ductape = useDuctape({
    workspace_id: product?.workspace_id || currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product'
  }) as any;

  const [formData, setFormData] = useState({
    name: '',
    tag: '',
    description: '',
    selector: '',
    schema: '{}',
    expiry: '1',
    period: TokenPeriods.MINUTES,
  });

  // Create session mutation
  const { mutateAsync: createSession, isPending: isCreating } = useMutation({
    mutationFn: async (values: typeof formData) => {
      if (!ductape) throw new Error('Product not initialized');

      // Parse and validate schema
      let parsedSchema;
      try {
        parsedSchema = JSON.parse(values.schema);
      } catch {
        throw new Error('Invalid JSON schema');
      }

      const payload = {
        name: values.name,
        tag: values.tag,
        description: values.description,
        selector: values.selector,
        schema: parsedSchema,
        expiry: parseInt(values.expiry),
        period: values.period,
      };
      
      try {
        const session = await ductape.sessions.create(payload);
        return session;
      } catch (error) {
        console.error('Error in create:', error);
        throw error;
      }
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      closeTab(tabId);
      openTab({
        id: `session-${session._id}-${Date.now()}`,
        type: 'session',
        title: session.name,
        itemId: session._id,
        data: { ...session, componentType: 'session', productName: product?.name },
      });
      toast.success('Session created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create session');
    },
  });

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a session name');
      return;
    }

    if (!formData.tag.trim()) {
      toast.error('Please enter a session tag');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    if (!formData.selector.trim()) {
      toast.error('Please enter a selector');
      return;
    }

    if (!formData.schema.trim()) {
      toast.error('Please enter a schema');
      return;
    }

    // Validate schema is valid JSON
    try {
      JSON.parse(formData.schema);
    } catch {
      toast.error('Schema must be valid JSON');
      return;
    }

    const expiryNum = parseInt(formData.expiry);
    if (isNaN(expiryNum) || expiryNum < 1) {
      toast.error('Please enter a valid expiry time (minimum 1)');
      return;
    }

    if (!data?.productId || !product) {
      toast.error('No product selected');
      return;
    }

    try {
      await createSession(formData);
    } catch (error: any) {
      // Error already handled in mutation
    }
  };

  const handleCancel = () => {
    closeTab(tabId);
  };

  const handleNameChange = (value: string) => {
    // Auto-generate tag from name
    const sanitizedTag = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    setFormData({ ...formData, name: value, tag: sanitizedTag });
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Product Context Header */}
        {product && (
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
                {product.logo ? (
                  <img
                    src={product.logo}
                    alt={product.name}
                    className="w-full h-full rounded-lg object-cover"
                  />
                ) : (
                  product.name?.split(' ').map((word: string) => word[0]).join('').toUpperCase().slice(0, 2)
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-grey">Creating session for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  This session will be automatically connected to your product for user authentication
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-grey-600">
                <CheckCircle className="h-4 w-4 text-green" />
                <span>Auto-connect enabled</span>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <KeyRound className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New Session</h1>
              <p className="text-sm text-grey-600">
                {product?.name ? `Adding to ${product.name}` : 'Configure session management for user authentication'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-6">
          {/* Session Name */}
          <div>
            <Label htmlFor="name" className="required">
              Session Name
            </Label>
            <Input
              id="name"
              placeholder="e.g., User Authentication Session"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="mt-2"
            />
            <p className="text-xs text-grey-600 mt-1">A descriptive name for this session configuration</p>
          </div>

          {/* Tag */}
          <div>
            <Label htmlFor="tag" className="required">
              Tag
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="tag"
                placeholder="e.g., my-product:user-auth-session"
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
              />
              <Button variant="outline" onClick={() => handleNameChange(formData.name)} size="sm">
                Auto-generate
              </Button>
            </div>
            <p className="text-xs text-grey-600 mt-1">
              Format: product-name:session-name (auto-generated from session name)
            </p>
          </div>

          {/* Description */}
          <div>
            <MarkdownEditor
              value={formData.description}
              onChange={(value) => setFormData({ ...formData, description: value })}
              placeholder="Describe the purpose of this session"
              label="Description"
            />
            <p className="text-xs text-grey-600 mt-1">Detailed description of this session's purpose</p>
          </div>

          {/* Expiry and Period */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expiry" className="required">
                Expiry Duration
              </Label>
              <Input
                id="expiry"
                type="number"
                min="1"
                placeholder="1"
                value={formData.expiry}
                onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
                className="mt-2"
              />
              <p className="text-xs text-grey-600 mt-1">How long the session lasts</p>
            </div>

            <div>
              <Label htmlFor="period" className="required">
                Time Period
              </Label>
              <Select value={formData.period} onValueChange={(value) => setFormData({ ...formData, period: value as TokenPeriods })}>
                <SelectTrigger id="period" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TokenPeriods).map(period => (
                    <SelectItem key={period} value={period}>
                      {period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-grey-600 mt-1">Time unit for expiry</p>
            </div>
          </div>

          {/* Schema */}
          <div>
            <Label htmlFor="schema" className="required">
              Schema (JSON)
            </Label>
            <Textarea
              id="schema"
              placeholder='{"user_id": "string", "email": "string"}'
              value={formData.schema}
              onChange={(e) => setFormData({ ...formData, schema: e.target.value })}
              className="mt-2 min-h-40 font-mono text-sm"
            />
            <p className="text-xs text-grey-600 mt-1">JSON schema defining the session data structure</p>
          </div>

          {/* Selector */}
          <div>
            <Label htmlFor="selector" className="required">
              Selector
            </Label>
            <Input
              id="selector"
              placeholder="e.g., user_id"
              value={formData.selector}
              onChange={(e) => setFormData({ ...formData, selector: e.target.value })}
              className="mt-2"
            />
            <p className="text-xs text-grey-600 mt-1">Field used to uniquely identify the session</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
            <Button variant="outline" onClick={handleCancel} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-2" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create Session
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-grey mb-2">Session Configuration Tips</h3>
          <ul className="text-sm text-grey-600 space-y-1 list-disc list-inside">
            <li>Define clear expiry periods based on your security requirements</li>
            <li>Use a unique selector field like user_id or email</li>
            <li>Include only necessary data in your session schema</li>
            <li>Consider shorter expiry times for sensitive applications</li>
            <li>Schema should be valid JSON format</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
