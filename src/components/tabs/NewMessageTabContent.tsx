import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { useDuctape } from '@/hooks/useDuctape';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { toast } from 'react-hot-toast';
import { FileText, Loader2, Plus, Trash2, Info } from 'lucide-react';
import { useTabState, getInitialTabState } from '@/hooks/useTabState';

interface NewMessageTabContentProps {
  tabId: string;
  data?: any;
}

interface CallbackField {
  id: string;
  key: string;
  value: string;
  addTo: 'headers' | 'params' | 'query';
}

export default function NewMessageTabContent({ tabId, data }: NewMessageTabContentProps) {
  const { closeTab, openTab } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  // Extract context from data
  const notification = data?.notification; // The notifier object
  const productTag = data?.productTag;
  const notifierTag = notification?.tag;

  // Get available channels from the notification's environments
  const availableChannels = {
    push: notification?.envs?.some((env: any) => env.push_notifications),
    email: notification?.envs?.some((env: any) => env.emails),
    sms: notification?.envs?.some((env: any) => env.sms),
    callback: notification?.envs?.some((env: any) => env.callbacks),
  };

  // Restore saved state
  const savedTabState = getInitialTabState(tabId, null as any);

  const [formData, setFormData] = useState(
    savedTabState?.formData || {
      name: '',
      tag: '',
      description: '',
      pushTitle: '',
      pushBody: '',
      pushData: '',
      emailSubject: '',
      emailTemplate: '',
      sms: '',
      callbackBody: '',
      callbackFields: [] as CallbackField[],
    }
  );

  // Persist tab state automatically
  useTabState(
    tabId,
    'new-message',
    formData.name || 'New Message',
    {},
    { formData }
  );

  // Auto-generate tag from name
  const handleAutoGenerateTag = () => {
    if (!formData.name) {
      toast.error('Please enter a name first');
      return;
    }
    const sanitized = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setFormData((prev: typeof formData) => ({ ...prev, tag: sanitized }));
  };

  useEffect(() => {
    if (formData.name && !formData.tag) {
      const sanitized = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData((prev: typeof formData) => ({ ...prev, tag: sanitized }));
    }
  }, [formData.name]);

  const handleAddCallbackField = () => {
    const newField: CallbackField = {
      id: `field-${Date.now()}`,
      key: '',
      value: '',
      addTo: 'headers',
    };
    setFormData((prev: typeof formData) => ({
      ...prev,
      callbackFields: [...prev.callbackFields, newField],
    }));
  };

  const handleUpdateCallbackField = (id: string, updates: Partial<CallbackField>) => {
    setFormData((prev: typeof formData) => ({
      ...prev,
      callbackFields: prev.callbackFields.map((field: CallbackField) =>
        field.id === id ? { ...field, ...updates } : field
      ),
    }));
  };

  const handleRemoveCallbackField = (id: string) => {
    setFormData((prev: typeof formData) => ({
      ...prev,
      callbackFields: prev.callbackFields.filter((field: CallbackField) => field.id !== id),
    }));
  };

  // Initialize SDK
  const ductape = useDuctape({
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product',
  });

  const { mutateAsync: createMessage, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      if (!ductape) throw new Error('Product builder not initialized');
      if (!productTag) throw new Error('Product tag missing');
      if (!notifierTag) throw new Error('Notifier tag missing');

      // Initialize the product
      await ductape.init(productTag);

      // Build push_notification object
      const push_notification = availableChannels.push && (formData.pushTitle || formData.pushBody || formData.pushData) ? {
        ...(formData.pushTitle && { title: formData.pushTitle }),
        ...(formData.pushBody && { body: formData.pushBody }),
        ...(formData.pushData && { data: JSON.parse(formData.pushData) }),
      } : undefined;

      // Build email object
      const email = availableChannels.email && (formData.emailSubject || formData.emailTemplate) ? {
        subject: formData.emailSubject,
        template: formData.emailTemplate,
      } : undefined;

      // Build callback object
      let callback: any = undefined;
      if (availableChannels.callback && (formData.callbackFields.length > 0 || formData.callbackBody)) {
        // Add fields based on addTo
        const headers: Record<string, string> = {};
        const params: Record<string, string> = {};
        const query: Record<string, string> = {};

        formData.callbackFields.forEach((field: CallbackField) => {
          if (field.key && field.value) {
            switch (field.addTo) {
              case 'headers':
                headers[field.key] = field.value;
                break;
              case 'params':
                params[field.key] = field.value;
                break;
              case 'query':
                query[field.key] = field.value;
                break;
            }
          }
        });

        callback = {};
        if (Object.keys(headers).length > 0) callback.headers = headers;
        if (Object.keys(params).length > 0) callback.params = params;
        if (Object.keys(query).length > 0) callback.query = query;

        // Parse body JSON if provided
        if (formData.callbackBody.trim()) {
          try {
            callback.body = JSON.parse(formData.callbackBody);
          } catch (e) {
            throw new Error('Invalid JSON in callback body');
          }
        }
      }

      const payload = {
        name: formData.name,
        tag: `${notifierTag}:${formData.tag}`,
        description: formData.description,
        push_notification,
        callback,
        email,
        sms: availableChannels.sms && formData.sms ? formData.sms : undefined,
      };

      const message = await (ductape as any).notifications.messages.create(payload);
      return message;
    },
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      closeTab(tabId);
      openTab({
        id: `message-${message._id}-${Date.now()}`,
        type: 'message',
        title: message.name,
        itemId: message._id,
        data: { ...message, notification, productTag, notifierTag },
      });
      toast.success('Message created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create message');
    },
  });

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a message name');
      return;
    }

    if (!formData.tag.trim()) {
      toast.error('Please enter a message tag');
      return;
    }

    await createMessage();
  };

  const handleNameChange = (value: string) => {
    const sanitizedTag = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    setFormData({
      ...formData,
      name: value,
      tag: sanitizedTag,
      // Auto-populate description if it's empty or was previously auto-generated
      description: !formData.description || formData.description.endsWith(' template')
        ? `${value} template`
        : formData.description
    });
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-red/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-red" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New Message</h1>
              <p className="text-sm text-grey-600">
                {notification?.name ? `Adding to ${notification.name}` : 'Configure message templates for your notification'}
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Variable Parameterization</p>
            <p>Use <code className="bg-blue-100 px-1 rounded">{"{{variableName}}"}</code> to create dynamic parameters in your messages. These will be replaced at runtime with actual values.</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="required">
                Message Name
              </Label>
              <Input
                id="name"
                placeholder="e.g., Payment Notification"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-grey-600 mt-1">A friendly name for this message template</p>
            </div>

            <div>
              <Label htmlFor="tag" className="required">
                Tag
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="tag"
                  placeholder="e.g., payment_notification"
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                />
                <Button variant="outline" onClick={handleAutoGenerateTag} size="sm">
                  Auto-generate
                </Button>
              </div>
              <p className="text-xs text-grey-600 mt-1">
                Format: {notifierTag}:{formData.tag || 'tag'} (auto-generated from message name)
              </p>
            </div>

            <div>
              <Label htmlFor="description">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Enter message description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-2"
                rows={3}
              />
              <p className="text-xs text-grey-600 mt-1">Optional description for this message template</p>
            </div>
          </div>

          {/* Message Content */}
          <div className="space-y-4 border-t border-grey-300 pt-6">
            <h2 className="text-lg font-semibold text-grey">Message Content</h2>
            
            {/* Push Notification */}
            {availableChannels.push && (
              <div className="border border-grey-300 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-grey">Push Notification</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-grey-600 mb-1 block">
                      Title <span className="text-grey-500">(use {`{{}}`} for variables)</span>
                    </Label>
                    <Input
                      value={formData.pushTitle}
                      onChange={(e) => setFormData({ ...formData, pushTitle: e.target.value })}
                      placeholder='Credit Alert From {{username}}'
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-grey-600 mb-1 block">
                      Body <span className="text-grey-500">(use {`{{}}`} for variables)</span>
                    </Label>
                    <Textarea
                      value={formData.pushBody}
                      onChange={(e) => setFormData({ ...formData, pushBody: e.target.value })}
                      placeholder='{{username}} sent you {{amount}} {{currency}}'
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-grey-600 mb-1 block">
                      Data (JSON) <span className="text-grey-500">(optional, use {`{{}}`} for variables)</span>
                    </Label>
                    <Textarea
                      value={formData.pushData}
                      onChange={(e) => setFormData({ ...formData, pushData: e.target.value })}
                      placeholder='{"transaction_id": "{{transactionId}}", "bank_code": "{{bankCode}}"}'
                      className="font-mono text-sm"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Email */}
            {availableChannels.email && (
              <div className="border border-grey-300 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <h3 className="font-semibold text-grey">Email</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-grey-600 mb-1 block">
                      Subject <span className="text-grey-500">(use {`{{}}`} for variables)</span>
                    </Label>
                    <Input
                      value={formData.emailSubject}
                      onChange={(e) => setFormData({ ...formData, emailSubject: e.target.value })}
                      placeholder='Credit Alert From {{username}}'
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-grey-600 mb-1 block">
                      Template <span className="text-grey-500">(HTML, use {`{{}}`} for variables)</span>
                    </Label>
                    <Textarea
                      value={formData.emailTemplate}
                      onChange={(e) => setFormData({ ...formData, emailTemplate: e.target.value })}
                      placeholder='<html><body><p>{{username}} sent you {{amount}} {{currency}}</p></body></html>'
                      className="font-mono text-sm"
                      rows={6}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SMS */}
            {availableChannels.sms && (
              <div className="border border-grey-300 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-green-500" />
                  <h3 className="font-semibold text-grey">SMS</h3>
                </div>
                <div>
                  <Label className="text-sm text-grey-600 mb-1 block">
                    Message <span className="text-grey-500">(use {`{{}}`} for variables)</span>
                  </Label>
                  <Input
                    value={formData.sms}
                    onChange={(e) => setFormData({ ...formData, sms: e.target.value })}
                    placeholder='You just received {{amount}} {{currency}} from {{username}}'
                  />
                </div>
              </div>
            )}

            {/* Callback/Webhook */}
            {availableChannels.callback && (
              <div className="border border-grey-300 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-orange-500" />
                  <h3 className="font-semibold text-grey">Callback/Webhook</h3>
                </div>

                {/* Body Section */}
                <div>
                  <Label className="text-sm text-grey-600 mb-2 block">
                    Body (JSON) <span className="text-grey-500">(use {`{{}}`} for variables, supports nested objects)</span>
                  </Label>
                  <Textarea
                    value={formData.callbackBody}
                    onChange={(e) => setFormData({ ...formData, callbackBody: e.target.value })}
                    placeholder={`{\n  "transaction_id": "{{transactionId}}",\n  "bank_info": {\n    "bank_code": "{{bankCode}}",\n    "account": {\n      "username": "{{username}}"\n    }\n  },\n  "event_name": "{{eventName}}",\n  "amount": "{{amount}}"\n}`}
                    className="font-mono text-sm"
                    rows={8}
                  />
                  <p className="text-xs text-grey-500 mt-1">Enter valid JSON. Supports nested structures for complex data.</p>
                </div>

                {/* Headers, Params, Query Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm text-grey-600 block">
                      Additional Fields <span className="text-grey-500">(Headers, Params, Query)</span>
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddCallbackField}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Field
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.callbackFields.map((field: CallbackField) => (
                      <div key={field.id} className="flex gap-2 items-end p-3 bg-grey-50 rounded-lg border border-grey-300">
                        <div className="flex-1">
                          <Label className="text-xs text-grey-600">Key</Label>
                          <Input
                            placeholder="e.g., Authorization"
                            value={field.key}
                            onChange={(e) =>
                              handleUpdateCallbackField(field.id, { key: e.target.value })
                            }
                            className="bg-white"
                          />
                        </div>

                        <div className="flex-1">
                          <Label className="text-xs text-grey-600">Value</Label>
                          <Input
                            placeholder='{{apiKey}}'
                            value={field.value}
                            onChange={(e) => {
                              let inputValue = e.target.value.trim();

                              // If empty, clear the field
                              if (!inputValue) {
                                handleUpdateCallbackField(field.id, { value: '' });
                                return;
                              }

                              // Remove all { and } characters to get the clean variable name
                              const cleaned = inputValue.replace(/[{}]/g, '');

                              // Wrap the cleaned value
                              handleUpdateCallbackField(field.id, { value: cleaned ? `{{${cleaned}}}` : '' });
                            }}
                            className="bg-white font-mono"
                          />
                        </div>

                        <div className="flex-1">
                          <Label className="text-xs text-grey-600">Add To</Label>
                          <Select
                            value={field.addTo}
                            onValueChange={(value) =>
                              handleUpdateCallbackField(field.id, { addTo: value as CallbackField['addTo'] })
                            }
                          >
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="headers">Headers</SelectItem>
                              <SelectItem value="params">Route Params</SelectItem>
                              <SelectItem value="query">Query String</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveCallbackField(field.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {formData.callbackFields.length === 0 && (
                      <p className="text-xs text-grey-500 italic">No additional fields. Click "Add Field" to add headers, params, or query strings.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="submit"
              onClick={handleSave}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Message'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
