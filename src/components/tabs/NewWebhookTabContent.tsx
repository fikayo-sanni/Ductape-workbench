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
  const [selectedAction, setSelectedAction] = useState<string>(savedTabState?.selectedAction || "");
  const [actionSearchQuery, setActionSearchQuery] = useState("");

  // Persist tab state automatically
  useTabState(
    tabId,
    'new-webhook',
    name || 'New Webhook',
    {},
    { name, tag, description, selectedAction }
  );

  // Progressive disclosure - show sections as user progresses
  const showActionSelection = name.trim().length > 0 && tag.trim().length > 0;

  // Get actions from app
  const appActions = app ? (() => {
    const currentVersion = app.versions?.find((v: any) => v.latest) || app.versions?.[0];
    return currentVersion?.actions || [];
  })() : [];

  // No longer need to initialize environments

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

  const handleActionSelect = (actionTag: string) => {
    setSelectedAction(actionTag);
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
        action: payload.action,
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
    selectedAction.trim().length > 0;

  const handleSave = async () => {
    if (!name.trim() || !tag.trim()) {
      toast.error("Please enter name and tag");
      return;
    }

    if (!selectedAction.trim()) {
      toast.error("Please select an action for this webhook");
      return;
    }

    await createWebhook({
      name,
      tag,
      description,
      action: selectedAction,
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

        {/* Action Selection */}
        {showActionSelection && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle
                  className={`h-5 w-5 ${
                    selectedAction ? "text-green" : "text-grey-400"
                  }`}
                />
                Action Configuration
              </CardTitle>
              <CardDescription>
                Select the action that will be called to register this webhook
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="webhook-action" className="required">
                  Registration Action
                </Label>
                <Select
                  value={selectedAction}
                  onValueChange={(value) => {
                    if (value === "__add_new__") {
                      // Open new action creation tab
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
                          envs: currentVersion?.envs || [],
                          variables: currentVersion?.variables || [],
                          constants: currentVersion?.constants || [],
                          auths: currentVersion?.auths || [],
                        },
                        isDirty: true,
                      });
                    } else {
                      handleActionSelect(value);
                    }
                  }}
                >
                  <SelectTrigger id="webhook-action" className="mt-2">
                    <SelectValue placeholder="Choose an action..." />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Search Input */}
                    <div className="px-2 py-1.5 border-b border-grey-300">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-grey-600" />
                        <Input
                          placeholder="Search actions..."
                          value={actionSearchQuery}
                          onChange={(e) => setActionSearchQuery(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          className="pl-8 h-8 text-sm"
                        />
                      </div>
                    </div>

                    {/* Actions List */}
                    {(() => {
                      const filteredActions = appActions.filter((action: any) => {
                        if (!actionSearchQuery.trim()) return true;
                        const query = actionSearchQuery.toLowerCase();
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
                              No actions found matching "{actionSearchQuery}"
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
                  The action that will be called to register the webhook URL with the third-party service
                </p>
              </div>

              {/* Display selected action details */}
              {selectedAction && (() => {
                const action = appActions.find((a: any) => a.tag === selectedAction);
                return action ? (
                  <div className="p-4 bg-grey-50 rounded-lg border border-grey-400 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-grey-600 uppercase">
                        Selected Action
                      </span>
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
                        {action.method}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-grey-600">Name</div>
                      <div className="text-sm font-medium text-grey">{action.name}</div>
                    </div>
                    {action.resource && (
                      <div className="space-y-1">
                        <div className="text-xs text-grey-600">Resource</div>
                        <div className="font-mono text-sm text-grey break-all">
                          {action.resource}
                        </div>
                      </div>
                    )}
                    {action.description && (
                      <div className="space-y-1">
                        <div className="text-xs text-grey-600">Description</div>
                        <div className="text-sm text-grey">
                          {action.description}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
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
