import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Webhook,
  Loader2,
  Save,
  CheckCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/store/useAuth";
import { useWorkbenchStore } from "@/stores/workbench-store";
import { useDuctape } from "@/hooks/useDuctape";
import { MarkdownEditor } from "../ui/markdown-editor";
import { useTabState, getInitialTabState } from '@/hooks/useTabState';

interface NewWebhookTabContentProps {
  tabId: string;
  data?: any;
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

  // Persist tab state automatically
  useTabState(
    tabId,
    'new-webhook',
    name || 'New Webhook Channel',
    {},
    { name, tag, description }
  );

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
      });

      return webhookData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook Channel created successfully!");
      closeTab(tabId);

      // Open/focus the app tab and refresh its content
      const appId = app?._id;
      const appTabId = `app-${appId}`;

      // Invalidate all app-related queries to refresh the content
      queryClient.invalidateQueries({ queryKey: ["app"] });
      queryClient.invalidateQueries({ queryKey: ["apps"] });
      queryClient.refetchQueries({ queryKey: ["app", appId] });

      openTab({
        id: appTabId,
        type: "app",
        title: app?.app_name || "App",
        itemId: appId,
        data: {
          appId: appId,
          appName: app?.app_name,
          appTag: app?.tag,
          appLogo: app?.logo,
          refresh: true, // Signal to refresh the tab content
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
    tag.trim().length > 0;

  const handleSave = async () => {
    if (!name.trim() || !tag.trim()) {
      toast.error("Please enter name and tag");
      return;
    }

    await createWebhook({
      name,
      tag,
      description,
      active,
    });
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
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
                  <h2 className="text-xl font-bold text-grey">Creating webhook channel for {app?.app_name || product?.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {app?.tag || product?.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  This webhook channel will be automatically connected to your {app ? 'app' : 'product'} and configured for its environments
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
                Create New Webhook Channel
              </h1>
              <p className="text-sm text-grey-600">
                {product?.name
                  ? `Adding to ${product.name}`
                  : app
                  ? `Adding to ${app.app_name}`
                  : "Configure webhook channel endpoints for your integration"}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-6">
          {/* Webhook Channel Name */}
          <div>
            <Label htmlFor="name" className="required">
              Webhook Channel Name
            </Label>
            <Input
              id="name"
              placeholder="e.g., User Registration Webhook Channel"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="mt-2"
              autoFocus
            />
            <p className="text-xs text-grey-600 mt-1">A descriptive name for this webhook channel</p>
          </div>

          {/* Tag */}
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

          {/* Description */}
          <div>
            <MarkdownEditor
              value={description}
              onChange={(e) => setDescription(e)}
              placeholder="Optional description for this webhook channel"
              label="Description"
            />
          </div>
        </div>

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
                Create Webhook Channel
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
