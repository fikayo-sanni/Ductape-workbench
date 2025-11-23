import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Webhook,
  Loader2,
  Save,
  Plus,
  CheckCircle,
  Search,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/store/useAuth";
import { useWorkbenchStore } from "@/stores/workbench-store";
import { useDuctape } from "@/hooks/useDuctape";
import { IWebhookEnv } from "@/types/webhook";
import { HttpMethods } from "@ductape/sdk/dist/types";
import { MarkdownEditor } from "../ui/markdown-editor";
import { useTabState, getInitialTabState } from '@/hooks/useTabState';

interface NewWebhookTabContentProps {
  tabId: string;
  data?: any;
}

interface SampleField {
  id: string;
  key: string;
  value: string;
  addTo: "headers" | "body" | "params" | "query";
}

export default function NewWebhookTabContent({
  tabId,
  data,
}: NewWebhookTabContentProps) {
  const { closeTab, openTab } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  const app = data?.app || null;
  const product = data?.product || null;

  // Restore saved state
  const savedTabState = getInitialTabState(tabId, null as any);

  const [name, setName] = useState(savedTabState?.name || "");
  const [tag, setTag] = useState(savedTabState?.tag || "");
  const [description, setDescription] = useState(savedTabState?.description || "");
  const [active] = useState(true); // Always active by default
  const [requiresDashboardLink, setRequiresDashboardLink] = useState(savedTabState?.requiresDashboardLink !== undefined ? savedTabState.requiresDashboardLink : true);
  const [environments, setEnvironments] = useState<IWebhookEnv[]>(savedTabState?.environments || []);
  const [sampleFields] = useState<SampleField[]>(savedTabState?.sampleFields || []);
  const [selectedActions, setSelectedActions] = useState<Record<string, string>>(savedTabState?.selectedActions || {});
  const [actionSearchQueries, setActionSearchQueries] = useState<Record<string, string>>({});

  // Persist tab state automatically
  useTabState(
    tabId,
    'new-webhook',
    name || 'New Webhook',
    {},
    { name, tag, description, requiresDashboardLink, environments, sampleFields, selectedActions }
  );

  // Progressive disclosure - show sections as user progresses
  const showEnvironments = name.trim().length > 0 && tag.trim().length > 0;

  // Get actions from app
  const appActions = app ? (() => {
    const currentVersion = app.versions?.find((v: any) => v.latest) || app.versions?.[0];
    return currentVersion?.actions || [];
  })() : [];

  // Initialize environments from app/product
  useEffect(() => {
    if (showEnvironments && environments.length === 0) {
      const envsToAdd: IWebhookEnv[] = [];

      if (app) {
        const currentVersion =
          app.versions?.find((v: any) => v.latest) || app.versions?.[0];
        const appEnvs = currentVersion?.envs || app.envs || [];

        appEnvs.forEach((env: any) => {
          envsToAdd.push({
            _id: env._id,
            slug: env.slug,
            registration_url: "",
            method: "POST",
            sample: "",
          });
        });
      } else if (product) {
        const productEnvs = product.envs || [];

        productEnvs.forEach((env: any) => {
          envsToAdd.push({
            _id: env._id,
            slug: env.slug,
            registration_url: "",
            method: "POST",
            sample: "",
          });
        });
      }

      setEnvironments(envsToAdd);
    }
  }, [showEnvironments]);

  // Initialize Ductape SDK
  const ductape = useDuctape({
    workspace_id: currentWorkspaceId || "",
    user_id: user?._id || "",
    token: user?.auth_token || "",
    public_key: user?.public_key || "",
    type: app ? "app" : "product",
  }) as any;

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-fill description
    setDescription(value);
    // Auto-generate tag
    const sanitized = value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    setTag(sanitized);
  };

  const handleUpdateEnvironment = (
    index: number,
    field: string,
    value: any
  ) => {
    setEnvironments((prev) =>
      prev.map((env, i) => (i === index ? { ...env, [field]: value } : env))
    );
  };

  const handleActionSelect = (envSlug: string, actionTag: string) => {
    setSelectedActions(prev => ({ ...prev, [envSlug]: actionTag }));

    // Find the selected action and update environment with its details
    const selectedAction = appActions.find((action: any) => action.tag === actionTag);
    if (selectedAction) {
      const envIndex = environments.findIndex(env => env.slug === envSlug);
      if (envIndex !== -1) {
        handleUpdateEnvironment(envIndex, 'registration_url', selectedAction.endpoint || '');
        handleUpdateEnvironment(envIndex, 'method', selectedAction.method || 'POST');
      }
    }
  };

  const buildSampleFromFields = () => {
    // Build structure like authorizations.tsx tokenConfig
    const sampleObj: Record<string, Record<string, string>> = {
      headers: {},
      body: {},
      params: {},
      query: {},
    };

    sampleFields.forEach((field) => {
      if (field.key.trim() && field.value.trim() && field.addTo) {
        sampleObj[field.addTo][field.key] = field.value;
      }
    });

    return JSON.stringify(sampleObj, null, 2);
  };

  const { mutateAsync: createWebhook, isPending: isCreating } = useMutation({
    mutationFn: async (payload: any) => {
      if (!ductape) throw new Error("Ductape not initialized");

      const contextTag = app ? app.tag : product?.tag;
      if (!contextTag) throw new Error("App or Product tag not found");

      await ductape.init(contextTag);

      const webhookData = await ductape.webhooks.create({
        name: payload.name,
        tag: payload.tag,
        description: payload.description,
        envs: payload.envs,
        active: payload.active,
      });

      return webhookData;
    },
    onSuccess: (webhook) => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook created successfully!");
      closeTab(tabId);

      openTab({
        id: `webhook-${webhook._id}-${Date.now()}`,
        type: "webhook",
        title: webhook.name,
        itemId: webhook._id,
        data: {
          ...webhook,
          componentType: "webhook",
          appName: app?.app_name,
          productName: product?.name,
        },
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create webhook");
    },
  });

  // Check if all steps are complete
  const isFormComplete =
    name.trim().length > 0 &&
    tag.trim().length > 0 &&
    (requiresDashboardLink ||
     (environments.length > 0 &&
      (app ? Object.keys(selectedActions).some(envSlug => selectedActions[envSlug]) : environments.some(env => env.registration_url.trim()))));

  const handleSave = async () => {
    if (!name.trim() || !tag.trim()) {
      toast.error("Please enter name and tag");
      return;
    }

    if (!requiresDashboardLink && environments.length === 0) {
      toast.error("Please configure at least one environment");
      return;
    }

    if (!requiresDashboardLink) {
      if (app && !Object.keys(selectedActions).some(envSlug => selectedActions[envSlug])) {
        toast.error("Please select an action for at least one environment");
        return;
      }
      if (product && !environments.some(env => env.registration_url.trim())) {
        toast.error("Please enter a registration URL for at least one environment");
        return;
      }
    }

    // Build sample from fields and update environments
    const sample = buildSampleFromFields();
    const envsWithSample = environments.map((env) => ({
      ...env,
      sample,
    }));

    await createWebhook({
      name,
      tag,
      description,
      envs: envsWithSample,
      active,
    });
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Product/App Context */}
        {(product || app) && (
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
                {(app?.logo || product?.logo) ? (
                  <img
                    src={app?.logo || product?.logo}
                    alt={app?.app_name || product?.name}
                    className="w-full h-full rounded-lg object-cover"
                  />
                ) : (
                  (app?.app_name || product?.name)?.split(' ').map((word: string) => word[0]).join('').toUpperCase().slice(0, 2)
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-grey">Creating webhook for {app?.app_name || product?.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {app?.tag || product?.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  This webhook will be automatically connected to your {app ? 'app' : 'product'} and configured for its environments
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
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Webhook className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">
                Create New Webhook
              </h1>
              <p className="text-sm text-grey-600">
                {product?.name
                  ? `Adding to ${product.name}`
                  : app
                  ? `Adding to ${app.app_name}`
                  : "Configure webhook endpoints for your integration"}
              </p>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle
                className={`h-5 w-5 ${
                  name.trim() && tag.trim() ? "text-green" : "text-grey-400"
                }`}
              />
              Basic Information
            </CardTitle>
            <CardDescription>
              Enter the name and description for your webhook
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name" className="required">
                Name
              </Label>
              <Input
                id="name"
                placeholder="e.g., User Registration Webhook"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="mt-2"
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="tag" className="required">
                Tag
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="tag"
                  placeholder="e.g., user_registration"
                  value={tag}
                  onChange={(e) =>
                    setTag(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_]/g, "_")
                        .replace(/_+/g, "_")
                    )
                  }
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleNameChange(name)}
                  size="sm"
                >
                  Auto-generate
                </Button>
              </div>
              <p className="text-xs text-grey-600 mt-1">
                Auto-generated from name (lowercase, underscores only)
              </p>
            </div>

            <div>
              <MarkdownEditor
                value={description}
                onChange={(e) => setDescription(e)}
                placeholder="Optional description for this token"
                label="Description"
              />
            </div>
          </CardContent>
        </Card>

        {/* Environment Configuration */}
        {showEnvironments && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle
                  className={`h-5 w-5 ${
                    requiresDashboardLink ||
                    (app ? Object.keys(selectedActions).some(envSlug => selectedActions[envSlug]) : environments.some(env => env.registration_url.trim()))
                      ? "text-green"
                      : "text-grey-400"
                  }`}
                />
                Environment Configuration
              </CardTitle>
              <CardDescription>
                Configure webhook endpoints for each environment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Global Settings */}
              <div className="flex items-center justify-between rounded-lg border border-grey-400 p-4 bg-grey-50">
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="dashboard-link"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Requires Dashboard Link
                  </Label>
                  <p className="text-xs text-grey-600">
                    Enable if the webhook URL must be registered through a dashboard UI. Disable if registration is done via API call.
                  </p>
                </div>
                <Switch
                  id="dashboard-link"
                  checked={requiresDashboardLink}
                  onCheckedChange={setRequiresDashboardLink}
                />
              </div>

              {/* Environment Cards - Only show when dashboard link is NOT required */}
              {!requiresDashboardLink && (
                <div className="space-y-4">
                  <Label className="text-sm font-semibold text-grey">
                    Action to register url
                  </Label>
                  {environments.map((env, index) => (
                  <div
                    key={index}
                    className="p-5 bg-white border border-grey-400 rounded-lg hover:border-primary transition-colors"
                  >
                    <div className="space-y-4">
                      {/* Environment Header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-grey">
                            {env.slug.charAt(0).toUpperCase() +
                              env.slug.slice(1)}{" "}
                            Environment
                          </h3>
                          <p className="text-xs text-grey-600 mt-1">
                            Configure webhook endpoint for {env.slug}
                          </p>
                        </div>
                        <div className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                          {env.slug.toUpperCase()}
                        </div>
                      </div>

                      {/* Action Selection (for apps) or Manual URL Entry (for products) */}
                      {app ? (
                        <div className="space-y-4">
                          <div>
                            <Label
                              htmlFor={`env-${index}-action`}
                              className="required"
                            >
                              Select Action
                            </Label>
                            <Select
                              value={selectedActions[env.slug] || ""}
                              onValueChange={(value) => {
                                if (value === "__add_new__") {
                                  // Open new action creation tab with full app context and webhook environments
                                  const currentVersion = app.versions?.find((v: any) => v.latest) || app.versions?.[0];
                                  openTab({
                                    id: `new-action-${Date.now()}`,
                                    type: 'request',
                                    title: 'New Action',
                                    data: {
                                      isNew: true,
                                      app: app,
                                      appId: app?._id,
                                      appTag: app?.tag,
                                      appName: app?.app_name,
                                      version: currentVersion?.tag,
                                      envs: environments.map(e => ({
                                        _id: e._id,
                                        slug: e.slug,
                                        env_name: e.slug
                                      })),
                                      variables: currentVersion?.variables || [],
                                      constants: currentVersion?.constants || [],
                                      auths: currentVersion?.auths || [],
                                    },
                                    isDirty: true,
                                  });
                                } else {
                                  handleActionSelect(env.slug, value);
                                }
                              }}
                            >
                              <SelectTrigger id={`env-${index}-action`} className="mt-2">
                                <SelectValue placeholder="Choose an action..." />
                              </SelectTrigger>
                              <SelectContent>
                                {/* Search Input */}
                                <div className="px-2 py-1.5 border-b border-grey-300">
                                  <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-grey-600" />
                                    <Input
                                      placeholder="Search actions..."
                                      value={actionSearchQueries[env.slug] || ""}
                                      onChange={(e) => {
                                        setActionSearchQueries(prev => ({
                                          ...prev,
                                          [env.slug]: e.target.value
                                        }));
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      onKeyDown={(e) => e.stopPropagation()}
                                      className="pl-8 h-8 text-sm"
                                    />
                                  </div>
                                </div>

                                {/* Actions List */}
                                {(() => {
                                  const searchQuery = actionSearchQueries[env.slug] || "";
                                  const filteredActions = appActions.filter((action: any) => {
                                    if (!searchQuery.trim()) return true;
                                    const query = searchQuery.toLowerCase();
                                    return (
                                      action.name?.toLowerCase().includes(query) ||
                                      action.tag?.toLowerCase().includes(query) ||
                                      action.method?.toLowerCase().includes(query)
                                    );
                                  });

                                  if (appActions.length === 0) {
                                    return (
                                      <>
                                        <div className="p-2 text-sm text-grey-600 text-center">
                                          No actions available
                                        </div>
                                        <SelectItem value="__add_new__" className="border-t border-grey-400 mt-1 pt-1">
                                          <div className="flex items-center gap-2 text-primary">
                                            <Plus className="h-4 w-4" />
                                            <span className="font-medium">Add Action</span>
                                          </div>
                                        </SelectItem>
                                      </>
                                    );
                                  }

                                  if (filteredActions.length === 0) {
                                    return (
                                      <>
                                        <div className="p-2 text-sm text-grey-600 text-center">
                                          No actions found matching "{searchQuery}"
                                        </div>
                                        <SelectItem value="__add_new__" className="border-t border-grey-400 mt-1 pt-1">
                                          <div className="flex items-center gap-2 text-primary">
                                            <Plus className="h-4 w-4" />
                                            <span className="font-medium">Add Action</span>
                                          </div>
                                        </SelectItem>
                                      </>
                                    );
                                  }

                                  return (
                                    <>
                                      {filteredActions.map((action: any) => (
                                        <SelectItem key={action.tag} value={action.tag}>
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">{action.name}</span>
                                            <span className="text-xs text-grey-600">({action.method})</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                      <SelectItem value="__add_new__" className="border-t border-grey-400 mt-1 pt-1">
                                        <div className="flex items-center gap-2 text-primary">
                                          <Plus className="h-4 w-4" />
                                          <span className="font-medium">Add Action</span>
                                        </div>
                                      </SelectItem>
                                    </>
                                  );
                                })()}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-grey-600 mt-1">
                              The action that will be triggered when webhook events are received
                            </p>
                          </div>

                          {/* Display selected action details */}
                          {selectedActions[env.slug] && (() => {
                            const selectedAction = appActions.find(
                              (action: any) => action.tag === selectedActions[env.slug]
                            );
                            return selectedAction ? (
                              <div className="p-4 bg-grey-50 rounded-lg border border-grey-400 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-grey-600 uppercase">
                                    Action Details
                                  </span>
                                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
                                    {selectedAction.method}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-xs text-grey-600">Endpoint</div>
                                  <div className="font-mono text-sm text-grey break-all">
                                    {selectedAction.endpoint || env.registration_url}
                                  </div>
                                </div>
                                {selectedAction.description && (
                                  <div className="space-y-1">
                                    <div className="text-xs text-grey-600">Description</div>
                                    <div className="text-sm text-grey">
                                      {selectedAction.description}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : null;
                          })()}
                        </div>
                      ) : (
                        /* Manual URL entry for products */
                        <div className="grid grid-cols-3 gap-4">
                          <div className="col-span-2">
                            <Label
                              htmlFor={`env-${index}-url`}
                              className="required"
                            >
                              Registration URL
                            </Label>
                            <Input
                              id={`env-${index}-url`}
                              placeholder="https://api.example.com/webhooks"
                              value={env.registration_url}
                              onChange={(e) =>
                                handleUpdateEnvironment(
                                  index,
                                  "registration_url",
                                  e.target.value
                                )
                              }
                              className="mt-2"
                            />
                            <p className="text-xs text-grey-600 mt-1">
                              The URL where webhook events will be sent
                            </p>
                          </div>

                          <div>
                            <Label htmlFor={`env-${index}-method`}>Method</Label>
                            <Select
                              value={env.method}
                              onValueChange={(value) =>
                                handleUpdateEnvironment(index, "method", value)
                              }
                            >
                              <SelectTrigger className="mt-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.keys(HttpMethods).map((method) => (
                                  <SelectItem key={method} value={method}>
                                    {method}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-grey-600 mt-1">
                              HTTP method
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
          <Button
            type="button"
            variant="outline"
            onClick={() => closeTab(tabId)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isCreating || !isFormComplete}
            className="gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Create Webhook
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
