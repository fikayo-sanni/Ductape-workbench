import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useSDKProxy } from '@/services/sdkProxy';
import toast from 'react-hot-toast';
import { FileText, Loader2, Plus, Trash2, Info } from 'lucide-react';

/**
 * Notification Template Tab Content
 * Create/edit notification templates (IProductNotificationTemplate) using SDK notifications.messages API.
 * - create(product, data)
 * - fetch(product, tag)
 * - update(product, tag, data)
 * - list(product, notificationTag)
 */

interface NotificationTemplateTabContentProps {
  tabId?: string;
  data?: {
    productTag: string;
    productName?: string;
    productLogo?: string;
    productEnvs?: Array<{ slug: string; name?: string }>;
    workspaceId?: string;
    notificationTag?: string; // optional when no notifications exist yet
    notification?: { name?: string; tag?: string };
    templateTag?: string; // message tag only (e.g. "welcome-email"); full tag = notificationTag:templateTag
    isNew?: boolean;
    noNotificationsYet?: boolean; // true when opened from explorer with zero notifications
  };
}

interface CallbackField {
  id: string;
  key: string;
  value: string;
  addTo: 'headers' | 'params' | 'query';
}

export default function NotificationTemplateTabContent({ tabId, data }: NotificationTemplateTabContentProps) {
  const { closeTab, openTab, tabs, setActiveTab } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  const productTag = data?.productTag;
  const notificationTag = data?.notificationTag;
  const notification = data?.notification;
  const templateTagOnly = data?.templateTag;
  const noNotificationsYet = data?.noNotificationsYet ?? (!notificationTag && data?.isNew);
  const isNew = data?.isNew ?? !templateTagOnly;
  const fullTag = notificationTag && templateTagOnly ? `${notificationTag}:${templateTagOnly}` : undefined;

  const sdkProxy = useSDKProxy(
    productTag && currentWorkspaceId && user?._id
      ? {
          workspace_id: currentWorkspaceId || '',
          user_id: user._id || '',
          token: user.auth_token || '',
          public_key: user.public_key || '',
        }
      : null
  );

  const [formData, setFormData] = useState({
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
  });

  const { data: existingTemplate, isLoading: isLoadingTemplate } = useQuery({
    queryKey: ['notification-template', productTag, fullTag],
    queryFn: async () => {
      if (!sdkProxy || !productTag || !fullTag) return null;
      return await sdkProxy.notifications.messages.fetch(productTag, fullTag);
    },
    enabled: !!sdkProxy && !!productTag && !!fullTag && !isNew,
  });

  useEffect(() => {
    if (existingTemplate && !isNew) {
      const t = existingTemplate as any;
      const callbackFields: CallbackField[] = [];
      const cb = t.callback;
      if (cb && typeof cb === 'object') {
        let fieldId = 0;
        const toFields = (obj: Record<string, string> | undefined, addTo: CallbackField['addTo']) => {
          if (!obj || typeof obj !== 'object') return;
          Object.entries(obj).forEach(([key, value]) => {
            if (key && value != null) {
              callbackFields.push({
                id: `field-load-${fieldId++}`,
                key,
                value: String(value),
                addTo,
              });
            }
          });
        };
        toFields(cb.headers, 'headers');
        toFields(cb.params, 'params');
        toFields(cb.query, 'query');
      }
      setFormData({
        name: t.name ?? '',
        tag: t.tag?.includes(':') ? t.tag.split(':')[1] ?? t.tag : t.tag ?? '',
        description: t.description ?? '',
        pushTitle: typeof t.push_notification?.title === 'string' ? t.push_notification.title : '',
        pushBody: typeof t.push_notification?.body === 'string' ? t.push_notification.body : '',
        pushData: t.push_notification?.data ? JSON.stringify(t.push_notification.data, null, 2) : '',
        emailSubject: t.email?.subject ?? '',
        emailTemplate: t.email?.template ?? '',
        sms: typeof t.sms === 'string' ? t.sms : '',
        callbackBody: t.callback?.body != null ? (typeof t.callback.body === 'string' ? t.callback.body : JSON.stringify(t.callback.body, null, 2)) : '',
        callbackFields,
      });
    }
  }, [existingTemplate, isNew]);

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
    setFormData((prev) => ({ ...prev, tag: sanitized }));
  };

  const handleAddCallbackField = () => {
    setFormData((prev) => ({
      ...prev,
      callbackFields: [
        ...prev.callbackFields,
        { id: `field-${Date.now()}`, key: '', value: '', addTo: 'headers' as const },
      ],
    }));
  };

  const handleUpdateCallbackField = (id: string, updates: Partial<CallbackField>) => {
    setFormData((prev) => ({
      ...prev,
      callbackFields: prev.callbackFields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
  };

  const handleRemoveCallbackField = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      callbackFields: prev.callbackFields.filter((f) => f.id !== id),
    }));
  };

  const buildPayload = () => {
    const tag = formData.tag?.trim() ? `${notificationTag}:${formData.tag.trim()}` : undefined;
    if (!tag) throw new Error('Tag is required');

    const push_notification =
      formData.pushTitle || formData.pushBody || formData.pushData
        ? {
            title: formData.pushTitle || '',
            body: formData.pushBody || '',
            ...(formData.pushData?.trim() && {
              data: (() => {
                try {
                  return JSON.parse(formData.pushData);
                } catch {
                  return undefined;
                }
              })(),
            }),
          }
        : undefined;

    const email =
      formData.emailSubject || formData.emailTemplate
        ? { subject: formData.emailSubject || '', template: formData.emailTemplate || '' }
        : undefined;

    let callback: any = undefined;
    if (formData.callbackFields.length > 0 || formData.callbackBody?.trim()) {
      const headers: Record<string, string> = {};
      const params: Record<string, string> = {};
      const query: Record<string, string> = {};
      formData.callbackFields.forEach((f) => {
        if (f.key && f.value) {
          if (f.addTo === 'headers') headers[f.key] = f.value;
          else if (f.addTo === 'params') params[f.key] = f.value;
          else if (f.addTo === 'query') query[f.key] = f.value;
        }
      });
      callback = {};
      if (Object.keys(headers).length > 0) callback.headers = headers;
      if (Object.keys(params).length > 0) callback.params = params;
      if (Object.keys(query).length > 0) callback.query = query;
      if (formData.callbackBody?.trim()) {
        try {
          callback.body = JSON.parse(formData.callbackBody);
        } catch {
          callback.body = formData.callbackBody;
        }
      }
    }

    return {
      name: formData.name.trim(),
      tag,
      description: (formData.description ?? '').trim(),
      push_notification,
      email,
      sms: formData.sms?.trim() || undefined,
      callback,
    };
  };

  const { mutateAsync: createTemplate, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      if (!sdkProxy || !productTag) throw new Error('SDK not initialized');
      const payload = buildPayload();
      return await sdkProxy.notifications.messages.create(productTag, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', productTag] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
      toast.success('Template created');
      closeTab(tabId!);
      const productTab = tabs.find(
        (t) => t.type === 'product' && (t.data?.tag === productTag || (t.data as any)?.productTag === productTag)
      );
      if (productTab) setActiveTab(productTab.id);
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to create template'),
  });

  const { mutateAsync: updateTemplate, isPending: isUpdating } = useMutation({
    mutationFn: async () => {
      if (!sdkProxy || !productTag || !fullTag) throw new Error('SDK or tag missing');
      const payload = buildPayload();
      return await sdkProxy.notifications.messages.update(productTag, fullTag, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', productTag] });
      queryClient.invalidateQueries({ queryKey: ['notification-template', productTag, fullTag] });
      toast.success('Template updated');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to update template'),
  });

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    if (!formData.tag.trim()) {
      toast.error('Please enter a tag');
      return;
    }
    if (isNew) await createTemplate();
    else await updateTemplate();
  };

  const handleNameChange = (value: string) => {
    const sanitizedTag = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setFormData((prev) => {
      const prevAutoDescription = prev.name?.trim() ? `${prev.name.trim()} template` : '';
      const wasAutoDescription = !prev.description || prev.description === prevAutoDescription;
      return {
        ...prev,
        name: value,
        tag: sanitizedTag,
        description: wasAutoDescription ? (value.trim() ? `${value.trim()} template` : '') : prev.description,
      };
    });
  };

  if (!productTag) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100 p-6">
        <p className="text-grey-600">Missing product context.</p>
      </div>
    );
  }

  // No notifications yet: show empty state and single action to create a notification
  if (noNotificationsYet || !notificationTag) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100 p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <FileText className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-grey">Templates belong to a notification</h2>
          <p className="text-sm text-grey-600">
            Create a notification first (e.g. “Transaction Alerts”). Then you can add templates to it (e.g. “Payment received”, “Withdrawal”).
          </p>
          <Button
            onClick={() => {
              openTab({
                id: `new-notification-${Date.now()}`,
                type: 'new-notification',
                title: 'New Notification',
                itemId: 'new',
                data: {
                  productTag: data?.productTag,
                  productName: data?.productName,
                  productLogo: data?.productLogo,
                  productEnvs: data?.productEnvs ?? [],
                  workspaceId: data?.workspaceId ?? currentWorkspaceId ?? '',
                },
                isDirty: true,
              });
              closeTab(tabId!);
            }}
          >
            Create notification
          </Button>
        </div>
      </div>
    );
  }

  if (!isNew && fullTag && isLoadingTemplate) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100 p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-lg border border-grey-400 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">
                {isNew ? 'New Notification Template' : 'Edit Template'}
              </h1>
              <p className="text-sm text-grey-600">
                {notification?.name ? `Notification: ${notification.name}` : notificationTag} • {productTag}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Variables</p>
            <p>
              Use <code className="bg-blue-100 px-1 rounded">{'{{variableName}}'}</code> in templates; they are replaced at runtime.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-grey-400 p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <Label className="required">Template name</Label>
              <Input
                placeholder="e.g. Payment Notification"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="required">Tag</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="e.g. payment_notification"
                  value={formData.tag}
                  onChange={(e) => setFormData((p) => ({ ...p, tag: e.target.value }))}
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAutoGenerateTag}>
                  Auto-generate
                </Button>
              </div>
              <p className="text-xs text-grey-500 mt-1">
                Full tag: {notificationTag}:{formData.tag || 'tag'}
              </p>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                className="mt-2"
                rows={2}
              />
            </div>
          </div>

          <div className="border-t border-grey-300 pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-grey">Channels</h2>

            {(isNew || formData.pushTitle || formData.pushBody || formData.pushData) && (
            <div className="border border-grey-300 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-grey">Push notification</h3>
              <div>
                <Label className="text-sm text-grey-600">Title</Label>
                <Input
                  value={formData.pushTitle}
                  onChange={(e) => setFormData((p) => ({ ...p, pushTitle: e.target.value }))}
                  placeholder='e.g. Credit from {{username}}'
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm text-grey-600">Body</Label>
                <Textarea
                  value={formData.pushBody}
                  onChange={(e) => setFormData((p) => ({ ...p, pushBody: e.target.value }))}
                  placeholder='e.g. You received {{amount}} {{currency}} from {{username}}'
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm text-grey-600">Data (JSON)</Label>
                <Textarea
                  value={formData.pushData}
                  onChange={(e) => setFormData((p) => ({ ...p, pushData: e.target.value }))}
                  placeholder='{"key": "{{value}}"}'
                  className="mt-1 font-mono text-sm"
                  rows={3}
                />
              </div>
            </div>
            )}

            {(isNew || formData.emailSubject || formData.emailTemplate) && (
            <div className="border border-grey-300 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-grey">Email</h3>
              <div>
                <Label className="text-sm text-grey-600">Subject</Label>
                <Input
                  value={formData.emailSubject}
                  onChange={(e) => setFormData((p) => ({ ...p, emailSubject: e.target.value }))}
                  placeholder='e.g. Credit from {{username}}'
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm text-grey-600">Template (HTML)</Label>
                <Textarea
                  value={formData.emailTemplate}
                  onChange={(e) => setFormData((p) => ({ ...p, emailTemplate: e.target.value }))}
                  placeholder='<p>You received {{amount}} {{currency}} from {{username}}</p>'
                  className="mt-1 font-mono text-sm"
                  rows={4}
                />
              </div>
            </div>
            )}

            <div className="border border-grey-300 rounded-lg p-4">
              <h3 className="font-semibold text-grey mb-2">SMS</h3>
              <Input
                value={formData.sms}
                onChange={(e) => setFormData((p) => ({ ...p, sms: e.target.value }))}
                placeholder='e.g. You received {{amount}} {{currency}} from {{username}}'
              />
            </div>

            <div className="border border-grey-300 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-grey">Callback / Webhook</h3>
              <div>
                <Label className="text-sm text-grey-600">Body (JSON)</Label>
                <Textarea
                  value={formData.callbackBody}
                  onChange={(e) => setFormData((p) => ({ ...p, callbackBody: e.target.value }))}
                  placeholder='{"event": "{{eventId}}"}'
                  className="mt-1 font-mono text-sm"
                  rows={4}
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-sm text-grey-600">Headers / Params / Query</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddCallbackField}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.callbackFields.map((f) => (
                    <div key={f.id} className="flex gap-2 items-end p-2 bg-grey-50 rounded">
                      <Input
                        placeholder="Key"
                        value={f.key}
                        onChange={(e) => handleUpdateCallbackField(f.id, { key: e.target.value })}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Value"
                        value={f.value}
                        onChange={(e) => handleUpdateCallbackField(f.id, { value: e.target.value })}
                        className="flex-1"
                      />
                      <Select value={f.addTo} onValueChange={(v) => handleUpdateCallbackField(f.id, { addTo: v as CallbackField['addTo'] })}>
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="headers">Headers</SelectItem>
                          <SelectItem value="params">Params</SelectItem>
                          <SelectItem value="query">Query</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveCallbackField(f.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={isCreating || isUpdating}
            >
              {(isCreating || isUpdating) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isNew ? 'Create Template' : 'Update Template'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
