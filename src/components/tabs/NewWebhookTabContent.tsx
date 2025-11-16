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
import { Checkbox } from "@/components/ui/checkbox";
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
  Trash2,
  CheckCircle,
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
  const [active, setActive] = useState(savedTabState?.active !== undefined ? savedTabState.active : true);
  const [environments, setEnvironments] = useState<IWebhookEnv[]>(savedTabState?.environments || []);
  const [sampleFields, setSampleFields] = useState<SampleField[]>(savedTabState?.sampleFields || []);

  // Persist tab state automatically
  useTabState(
    tabId,
    'new-webhook',
    name || 'New Webhook',
    {},
    { name, tag, description, active, environments, sampleFields }
  );

  // Progressive disclosure - show sections as user progresses
  const showEnvironments = name.trim().length > 0 && tag.trim().length > 0;
  const showSampleBuilder =
    environments.length > 0 &&
    environments.some((env) => env.registration_url.trim());

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

  const handleAddSampleField = () => {
    const newField: SampleField = {
      id: `field_${Date.now()}`,
      key: "",
      value: "",
      addTo: "body",
    };
    setSampleFields((prev) => [...prev, newField]);
  };

  const handleUpdateSampleField = (
    id: string,
    updates: Partial<SampleField>
  ) => {
    setSampleFields((prev) =>
      prev.map((field) => (field.id === id ? { ...field, ...updates } : field))
    );
  };

  const handleRemoveSampleField = (id: string) => {
    setSampleFields((prev) => prev.filter((f) => f.id !== id));
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
    environments.length > 0 &&
    environments.some((env) => env.registration_url.trim());

  const handleSave = async () => {
    if (!name.trim() || !tag.trim()) {
      toast.error("Please enter name and tag");
      return;
    }

    if (environments.length === 0) {
      toast.error("Please configure at least one environment");
      return;
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
        {/* Product Context */}
        {(product || app) && (
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Webhook className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-grey">
                  Create Webhook for {app ? app.app_name : product?.name}
                </h2>
                <p className="text-sm text-grey-600">
                  Configure webhook endpoints
                </p>
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

            <div className="flex items-center space-x-2 rounded-lg border border-grey-400 p-4">
              <Checkbox
                id="active"
                checked={active}
                onCheckedChange={(checked) => setActive(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="active"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Active
                </Label>
                <p className="text-xs text-grey-600">
                  Enable this webhook for use
                </p>
              </div>
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
                    environments.some((env) => env.registration_url.trim())
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
              <div className="flex items-center space-x-2 rounded-lg border border-grey-400 p-4 bg-grey-50">
                <Checkbox
                  id="dashboard-link"
                  checked={active}
                  onCheckedChange={(checked) => setActive(checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="dashboard-link"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Requires Dashboard Link
                  </Label>
                  <p className="text-xs text-grey-600">
                    Enable this setting if the webhook requires dashboard
                    authentication
                  </p>
                </div>
              </div>

              {/* Environment Cards */}
              <div className="space-y-4">
                <Label className="text-sm font-semibold text-grey">
                  Environment Endpoints
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

                      {/* Registration URL and HTTP Method */}
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
                            placeholder="https://dashboard.ductape.app/api/webhooks"
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
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sample Payload Builder */}
        {showSampleBuilder && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-grey-400" />
                Sample Payload
              </CardTitle>
              <CardDescription>
                Define the structure of the expected payload (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sampleFields.length > 0 && (
                <div className="space-y-3">
                  {sampleFields.map((field) => (
                    <div key={field.id} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label>Key</Label>
                        <Input
                          placeholder="e.g., Authorization"
                          value={field.key}
                          onChange={(e) =>
                            handleUpdateSampleField(field.id, {
                              key: e.target.value,
                            })
                          }
                          className="mt-2"
                        />
                      </div>
                      <div className="flex-1">
                        <Label>Value</Label>
                        <Input
                          placeholder="e.g., Bearer <token>"
                          value={field.value}
                          onChange={(e) =>
                            handleUpdateSampleField(field.id, {
                              value: e.target.value,
                            })
                          }
                          className="mt-2"
                        />
                      </div>
                      <div className="flex-1">
                        <Label>Add To</Label>
                        <Select
                          value={field.addTo}
                          onValueChange={(
                            value: "headers" | "body" | "params" | "query"
                          ) =>
                            handleUpdateSampleField(field.id, { addTo: value })
                          }
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="headers">Headers</SelectItem>
                            <SelectItem value="body">Body</SelectItem>
                            <SelectItem value="params">Params</SelectItem>
                            <SelectItem value="query">Query</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveSampleField(field.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={handleAddSampleField}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Sample Field
              </Button>

              {sampleFields.length > 0 && (
                <div className="mt-4 p-4 bg-grey-100 rounded-lg border border-grey-400">
                  <Label className="text-sm font-semibold mb-2 block">
                    Preview
                  </Label>
                  <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
                    <code>{buildSampleFromFields()}</code>
                  </pre>
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
