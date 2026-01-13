import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyRound, Save, CheckCircle, Loader2, XCircle, Check, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import { useSDKProxy } from '@/services/sdkProxy';
import { TokenPeriods } from '@/types';

interface InlineSessionFormProps {
  product: {
    _id: string;
    name: string;
    tag: string;
    logo?: string;
    envs: Array<{ slug: string; name?: string; env_name?: string }>;
    workspace_id?: string;
  };
  onCancel: () => void;
  onSuccess: () => void;
}

export default function InlineSessionForm({ product, onCancel, onSuccess }: InlineSessionFormProps) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  // Proxy configuration
  const proxyConfig = product?.workspace_id && user?._id
    ? {
        workspace_id: product.workspace_id || currentWorkspaceId || '',
        user_id: user._id || '',
        token: user.auth_token || '',
        public_key: user.public_key || '',
      }
    : null;

  // Initialize SDK Proxy
  const sdkProxy = useSDKProxy(proxyConfig);

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
      if (!sdkProxy) throw new Error('SDK proxy not initialized');
      if (!product?.tag) throw new Error('Product tag not found');

      // Parse and validate schema
      let parsedSchema;
      try {
        parsedSchema = JSON.parse(values.schema);
      } catch {
        throw new Error('Invalid JSON schema');
      }

      // Convert selector path to nested curly brace format
      const selectorPath = values.selector.split('.').map((part: string) => `{${part}}`).join('');
      const formattedSelector = `$Session${selectorPath}`;

      const payload = {
        name: values.name,
        tag: values.tag,
        description: values.description,
        selector: formattedSelector,
        schema: parsedSchema,
        expiry: parseInt(values.expiry),
        period: values.period,
      };

      const session = await sdkProxy.sessions.create(product.tag, payload);
      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', product?._id] });

      toast.success('Session created successfully');
      onSuccess();
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

    try {
      await createSession(formData);
    } catch (error: any) {
      // Error already handled in mutation
    }
  };

  const handleNameChange = (value: string) => {
    const sanitizedTag = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    setFormData({
      ...formData,
      name: value,
      tag: sanitizedTag,
      description: !formData.description || formData.description.endsWith(' session')
        ? `${value} session`
        : formData.description
    });
  };

  // Validate JSON schema and extract selector options
  const schemaValidation = useMemo(() => {
    try {
      const schema = JSON.parse(formData.schema);
      const options: string[] = [];

      const traverse = (obj: any, path: string = '', parentIsArray: boolean = false) => {
        if (typeof obj !== 'object' || obj === null) return;
        if (parentIsArray) return;

        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          const isArray = Array.isArray(value);
          const isObject = typeof value === 'object' && value !== null && !isArray;

          if (!isObject && !isArray) {
            options.push(currentPath);
          }

          if (isObject && !isArray) {
            traverse(value, currentPath, false);
          }
        }
      };

      traverse(schema);

      return {
        isValid: true,
        error: null,
        selectorOptions: options,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Invalid JSON',
        selectorOptions: [],
      };
    }
  }, [formData.schema]);

  const selectorOptions = schemaValidation.selectorOptions;

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header with Back Button */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-grey-500 hover:text-grey -ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <KeyRound className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New Session</h1>
              <p className="text-sm text-grey-600">
                Adding to {product.name}
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
                placeholder="e.g. user-auth-session"
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
              />
              <Button variant="outline" onClick={() => handleNameChange(formData.name)} size="sm">
                Auto-generate
              </Button>
            </div>
            <p className="text-xs text-grey-600 mt-1">
              Format: (auto-generated from session name)
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
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="schema" className="required">
                Schema (JSON)
              </Label>
              {formData.schema && formData.schema.trim() !== '{}' && formData.schema.trim() !== '' && (
                <div className="flex items-center gap-1.5">
                  {schemaValidation.isValid ? (
                    <>
                      <Check className="h-4 w-4 text-green" />
                      <span className="text-xs text-green font-medium">Valid JSON</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red" />
                      <span className="text-xs text-red font-medium">Invalid JSON</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <Textarea
              id="schema"
              placeholder='{"userId": "string", "email": "string"}'
              value={formData.schema}
              onChange={(e) => setFormData({ ...formData, schema: e.target.value })}
              className={`mt-2 min-h-40 font-mono text-sm ${
                formData.schema && formData.schema.trim() !== '{}' && formData.schema.trim() !== ''
                  ? schemaValidation.isValid
                    ? 'border-green focus:border-green focus:ring-green'
                    : 'border-red focus:border-red focus:ring-red'
                  : ''
              }`}
            />
            {!schemaValidation.isValid && formData.schema && formData.schema.trim() !== '{}' && formData.schema.trim() !== '' && (
              <p className="text-xs text-red mt-1 flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {schemaValidation.error}
              </p>
            )}
            <p className="text-xs text-grey-600 mt-1">JSON schema defining the session data structure</p>
          </div>

          {/* Selector */}
          <div>
            <Label htmlFor="selector" className="required">
              Selector
            </Label>
            <Select
              value={formData.selector}
              onValueChange={(value) => setFormData({ ...formData, selector: value })}
            >
              <SelectTrigger id="selector" className="mt-2">
                <SelectValue placeholder="Select a field from schema" />
              </SelectTrigger>
              <SelectContent>
                {selectorOptions.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-grey-600">
                    No valid fields available. Add a valid schema first.
                  </div>
                ) : (
                  selectorOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-grey-600 mt-1">
              Field used to uniquely identify the session
              {formData.selector && (
                <span className="block mt-1 font-mono text-primary">
                  Preview: $Session{formData.selector.split('.').map((part: string) => `{${part}}`).join('')}
                </span>
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
            <Button variant="outline" onClick={onCancel} disabled={isCreating}>
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
      </div>
    </div>
  );
}
