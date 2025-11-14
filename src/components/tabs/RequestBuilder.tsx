import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/store/useAuth";
import { useWorkbenchStore } from "@/stores/workbench-store";
import { useDuctape } from "@/hooks/useDuctape";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Send,
  Save,
  Plus,
  Trash2,
  Code,
  Globe,
  Hash,
  FileCode,
  Server,
  RotateCcw,
  Wand2,
  Copy,
  Settings,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import appServicesReal from "@/services/appServicesReal";
import {
  DataFormats,
  DataTypes,
  InputsTypes,
} from "@ductape/sdk/dist/types/enums";

interface RequestBuilderProps {
  tabId: string;
  data?: {
    productId?: string;
    appId?: string;
    isNew?: boolean;
  };
}

interface KeyValue {
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
  metadata?: {
    minLength?: number;
    maxLength?: number;
    required?: boolean;
    type?: string; // DataTypes enum value
  };
}

interface ICustomEnv {
  slug: string;
  base_url?: string;
  config?: Record<string, unknown>;
  active: boolean;
}

// Helper function to syntax highlight JSON
const syntaxHighlightJSON = (jsonString: string) => {
  try {
    const obj =
      typeof jsonString === "string" ? JSON.parse(jsonString) : jsonString;
    const formatted = JSON.stringify(obj, null, 2);

    return formatted.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = "text-purple-600"; // numbers
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "text-blue-600 font-semibold"; // keys
          } else {
            cls = "text-green-700"; // string values
          }
        } else if (/true|false/.test(match)) {
          cls = "text-orange-600"; // boolean
        } else if (/null/.test(match)) {
          cls = "text-red-600"; // null
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  } catch (e) {
    return jsonString; // Return as-is if not valid JSON
  }
};

export default function RequestBuilder({ tabId, data }: RequestBuilderProps) {
  const { user, currentWorkspaceId } = useAuth();
  const { updateTab, tabs } = useWorkbenchStore();
  const queryClient = useQueryClient();

  // localStorage key for this tab's request builder state
  const STORAGE_KEY = `request-builder-${data?.appId || data?.productId || tabId}`;

  // Load initial state from localStorage
  const getInitialState = () => {
    try {
      console.log(updateTab);
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading saved state:', error);
    }
    return null;
  };

  const savedState = getInitialState();

  // Initialize Ductape SDK
  const ductape = useDuctape({
    workspace_id: currentWorkspaceId || "",
    user_id: user?._id || "",
    token: user?.auth_token || "",
    public_key: user?.public_key || "",
    type: "app",
  }) as any;

  // Form state matching IAppAction interface
  const [formData, setFormData] = useState(savedState?.formData || {
    name: "",
    tag: "",
    description: "",
    method: "GET",
    request_type: DataFormats.JSON,
  });

  const [fullUrl, setFullUrl] = useState(savedState?.fullUrl || "");
  const [baseUrl, setBaseUrl] = useState(savedState?.baseUrl || "");
  const [resource, setResource] = useState(savedState?.resource || "");
  const [params, setParams] = useState<KeyValue[]>(savedState?.params || []);
  const [query, setQuery] = useState<KeyValue[]>(savedState?.query || []);
  const [headers, setHeaders] = useState<KeyValue[]>(
    savedState?.headers || [{ key: "Content-Type", value: "application/json", enabled: true }]
  );
  const [body, setBody] = useState(savedState?.body || "");
  const [formDataFields, setFormDataFields] = useState<KeyValue[]>(savedState?.formDataFields || []);
  const [response, setResponse] = useState<any>(savedState?.response || null);
  const [isLoadingRequest, setIsLoadingRequest] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(savedState?.activeTab || "params");

  // Custom envs that will be saved with the action (ICustomEnv[])
  const [customEnvs, setCustomEnvs] = useState<ICustomEnv[]>(savedState?.customEnvs || []);

  // State to track which CustomEnv is being updated for highlighting
  const [updatingEnvSlugs, setUpdatingEnvSlugs] = useState<Set<string>>(
    new Set()
  );

  // State for metadata editing - tracks which field in which category is being edited
  const [editingMetadata, setEditingMetadata] = useState<{
    category: "params" | "query" | "headers" | "body" | null;
    index: number | null;
  }>({ category: null, index: null });

  // State for body field metadata (for JSON bodies)
  const [bodyFieldsMetadata, setBodyFieldsMetadata] = useState<
    Record<
      string,
      {
        minLength?: number;
        maxLength?: number;
        required?: boolean;
        type?: string;
      }
    >
  >({});

  // Fetch app data to get environments from latest version
  const { data: appData } = useQuery({
    queryKey: ["app", data?.appId],
    queryFn: () =>
      appServicesReal.fetchApp({
        app_id: data?.appId || "",
        user_id: user?._id || "",
        public_key: user?.public_key || "",
      }),
    enabled: !!data?.appId,
  });

  const app = appData?.data;
  // Get envs from latest version
  const latestVersion = app?.versions?.find((v: any) => v.latest === true);
  const environments = latestVersion?.envs || [];

  // Initialize Ductape SDK with app tag when available
  useEffect(() => {
    if (app?.tag) {
      ductape.init(app.tag);
    }
  }, [app?.tag, ductape]);

  // Auto-generate tag from name
  useEffect(() => {
    if (formData.name) {
      const tag = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 50);
      setFormData((prev: any) => ({ ...prev, tag }));
    }
  }, [formData.name]);

  // Initialize customEnvs from app environments
  useEffect(() => {
    if (environments.length > 0 && customEnvs.length === 0) {
      const initialCustomEnvs: ICustomEnv[] = environments.map((env: any) => ({
        slug: env.slug,
        base_url: env.base_url || "",
        config: env.config || {},
        active: env.active || false,
      }));
      setCustomEnvs(initialCustomEnvs);

      // Set the first active environment's base URL
      const firstActive =
        environments.find((e: any) => e.active) || environments[0];
      if (firstActive?.base_url) {
        setBaseUrl(firstActive.base_url);
      }
    }
  }, [environments, customEnvs.length]);

  // Parse URL when it changes
  useEffect(() => {
    if (fullUrl) {
      try {
        const url = new URL(fullUrl);
        const extractedBaseUrl = `${url.protocol}//${url.host}`;
        const extractedResource = url.pathname;

        // Only update if not matching current base URL
        if (extractedBaseUrl !== baseUrl) {
          setBaseUrl(extractedBaseUrl);
        }
        setResource(extractedResource);

        // Extract query parameters
        const extractedQueryParams: KeyValue[] = [];
        url.searchParams.forEach((value, key) => {
          extractedQueryParams.push({ key, value, enabled: true });
        });
        if (extractedQueryParams.length > 0) {
          setQuery(extractedQueryParams);
        }

        // Extract path parameters (e.g., /users/:id or /users/{{id}})
        const extractedPathParams: KeyValue[] = [];
        const pathSegments = extractedResource.split("/").filter(Boolean);
        pathSegments.forEach((segment) => {
          // Match :param or {{param}} patterns
          if (segment.startsWith(":")) {
            const paramName = segment.substring(1);
            extractedPathParams.push({
              key: paramName,
              value: "",
              enabled: true,
            });
          } else if (segment.startsWith("{{") && segment.endsWith("}}")) {
            const paramName = segment.substring(2, segment.length - 2);
            extractedPathParams.push({
              key: paramName,
              value: "",
              enabled: true,
            });
          }
        });
        if (extractedPathParams.length > 0) {
          setParams(extractedPathParams);
        }
      } catch (e) {
        // Invalid URL, ignore
      }
    }
  }, [fullUrl]);

  // Update full URL when base URL or resource changes
  useEffect(() => {
    if (baseUrl && resource) {
      try {
        const url = new URL(resource, baseUrl);
        // Add query params
        query
          .filter((q) => q.enabled && q.key)
          .forEach((q) => {
            url.searchParams.set(q.key, q.value);
          });
        setFullUrl(url.toString());
      } catch (e) {
        // Invalid combination
      }
    }
  }, [baseUrl, resource, query]);

  // Auto-update all custom envs when base URL changes (not matching any existing env)
  useEffect(() => {
    if (baseUrl && customEnvs.length > 0) {
      const matchingEnv = customEnvs.find((e) => e.base_url === baseUrl);

      // If base URL doesn't match any env, update all envs to this new base URL
      if (!matchingEnv) {
        // Highlight all envs being updated
        const envSlugs = customEnvs.map((env) => env.slug);
        setUpdatingEnvSlugs(new Set(envSlugs));

        setCustomEnvs((prev) =>
          prev.map((env) => ({
            ...env,
            base_url: baseUrl,
          }))
        );

        // Remove highlighting after a short delay
        setTimeout(() => {
          setUpdatingEnvSlugs(new Set());
        }, 1000);
      }
    }
  }, [baseUrl]);

  // Save state to localStorage whenever relevant state changes
  useEffect(() => {
    const stateToSave = {
      formData,
      fullUrl,
      baseUrl,
      resource,
      params,
      query,
      headers,
      body,
      formDataFields,
      response,
      activeTab,
      customEnvs,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error saving state to localStorage:', error);
    }
  }, [
    formData,
    fullUrl,
    baseUrl,
    resource,
    params,
    query,
    headers,
    body,
    formDataFields,
    response,
    activeTab,
    customEnvs,
    STORAGE_KEY,
  ]);

  const handleNameChange = (value: string) => {
    // Auto-generate description only if description is empty or was auto-generated
    const shouldAutoGenerateDescription =
      !formData.description ||
      formData.description === `Action for ${formData.name}`;

    setFormData({
      ...formData,
      name: value,
      description: shouldAutoGenerateDescription
        ? value
          ? `Action for ${value}`
          : ""
        : formData.description,
    });
  };

  const handleEnvSelect = (slug: string) => {
    // Highlight the env being updated
    setUpdatingEnvSlugs((prev) => new Set(prev).add(slug));

    const env = customEnvs.find((e) => e.slug === slug);
    if (env?.base_url) {
      setBaseUrl(env.base_url);
    }
    // Set this env as active
    setCustomEnvs((prev) =>
      prev.map((e) => ({
        ...e,
        active: e.slug === slug,
      }))
    );

    // Remove highlighting after a short delay
    setTimeout(() => {
      setUpdatingEnvSlugs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(slug);
        return newSet;
      });
    }, 1000);
  };

  const handleResetEnv = (slug: string) => {
    // Highlight the env being reset
    setUpdatingEnvSlugs((prev) => new Set(prev).add(slug));

    const originalEnv = environments.find((e: any) => e.slug === slug);
    if (originalEnv) {
      setCustomEnvs((prev) =>
        prev.map((env) => {
          if (env.slug === slug) {
            return {
              ...env,
              base_url: originalEnv.base_url || "",
            };
          }
          return env;
        })
      );

      // If this is the active env, update the main base URL too
      const env = customEnvs.find((e) => e.slug === slug && e.active);
      if (env) {
        setBaseUrl(originalEnv.base_url || "");
      }

      toast.success("Environment reset to default");

      // Remove highlighting after a short delay
      setTimeout(() => {
        setUpdatingEnvSlugs((prev) => {
          const newSet = new Set(prev);
          newSet.delete(slug);
          return newSet;
        });
      }, 1000);
    }
  };

  const formatJSON = () => {
    try {
      const parsed = JSON.parse(body);
      const formatted = JSON.stringify(parsed, null, 2);
      setBody(formatted);
      toast.success("JSON formatted successfully");
    } catch (e) {
      toast.error("Invalid JSON - cannot format");
    }
  };

  const copyResponseToClipboard = () => {
    try {
      const jsonString = JSON.stringify(response.data || response, null, 2);
      navigator.clipboard.writeText(jsonString);
      toast.success("Response copied to clipboard");
    } catch (e) {
      toast.error("Failed to copy response");
    }
  };

  const addKeyValue = (
    setter: React.Dispatch<React.SetStateAction<KeyValue[]>>
  ) => {
    setter((prev) => [...prev, { key: "", value: "", enabled: true }]);
  };

  const updateKeyValue = (
    index: number,
    field: keyof KeyValue,
    value: any,
    setter: React.Dispatch<React.SetStateAction<KeyValue[]>>
  ) => {
    setter((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeKeyValue = (
    index: number,
    setter: React.Dispatch<React.SetStateAction<KeyValue[]>>
  ) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMetadata = (
    index: number,
    metadataField: "minLength" | "maxLength" | "required" | "type",
    value: any,
    setter: React.Dispatch<React.SetStateAction<KeyValue[]>>
  ) => {
    setter((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        metadata: {
          ...updated[index].metadata,
          [metadataField]: value,
        },
      };
      return updated;
    });
  };

  // Extract all field paths from a JSON object (including nested)
  const extractJsonPaths = (obj: any, prefix = ""): string[] => {
    const paths: string[] = [];

    if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
      Object.keys(obj).forEach((key) => {
        const path = prefix ? `${prefix}.${key}` : key;
        paths.push(path);

        if (
          typeof obj[key] === "object" &&
          obj[key] !== null &&
          !Array.isArray(obj[key])
        ) {
          paths.push(...extractJsonPaths(obj[key], path));
        }
      });
    }

    return paths;
  };

  // Update body field metadata
  const updateBodyFieldMetadata = (
    fieldPath: string,
    metadataField: "minLength" | "maxLength" | "required" | "type",
    value: any
  ) => {
    setBodyFieldsMetadata((prev) => ({
      ...prev,
      [fieldPath]: {
        ...prev[fieldPath],
        [metadataField]: value,
      },
    }));
  };

  // Render metadata editing panel
  const renderMetadataPanel = (
    item: KeyValue,
    index: number,
    category: "params" | "query" | "headers" | "body",
    setter: React.Dispatch<React.SetStateAction<KeyValue[]>>
  ) => {
    const isEditing =
      editingMetadata.category === category && editingMetadata.index === index;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Button
            onClick={() =>
              setEditingMetadata(
                isEditing
                  ? { category: null, index: null }
                  : { category, index }
              )
            }
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
          >
            <Settings className="h-3 w-3 mr-1" />
            {isEditing ? "Hide" : "Metadata"}
          </Button>
        </div>

        {isEditing && (
          <div className="p-3 bg-grey-50 rounded border border-grey-300 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-grey-600 mb-1">Min Length</Label>
                <Input
                  type="number"
                  placeholder="Min"
                  value={item.metadata?.minLength || ""}
                  onChange={(e) =>
                    updateMetadata(
                      index,
                      "minLength",
                      e.target.value ? parseInt(e.target.value) : undefined,
                      setter
                    )
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs text-grey-600 mb-1">Max Length</Label>
                <Input
                  type="number"
                  placeholder="Max"
                  value={item.metadata?.maxLength || ""}
                  onChange={(e) =>
                    updateMetadata(
                      index,
                      "maxLength",
                      e.target.value ? parseInt(e.target.value) : undefined,
                      setter
                    )
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-grey-600 mb-1">Type</Label>
              <Select
                value={item.metadata?.type || ""}
                onValueChange={(value) =>
                  updateMetadata(index, "type", value, setter)
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(DataTypes).map((type) => (
                    <SelectItem key={type} value={type} className="text-xs">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`required-${category}-${index}`}
                checked={item.metadata?.required || false}
                onChange={(e) =>
                  updateMetadata(index, "required", e.target.checked, setter)
                }
                className="w-4 h-4 rounded border-grey-400"
              />
              <Label
                htmlFor={`required-${category}-${index}`}
                className="text-xs text-grey-700 cursor-pointer"
              >
                Required
              </Label>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render body field metadata panel
  const renderBodyFieldMetadata = (fieldPath: string) => {
    const isEditing =
      editingMetadata.category === "body" &&
      editingMetadata.index?.toString() === fieldPath;
    const metadata = bodyFieldsMetadata[fieldPath];

    return (
      <div className="space-y-2 ml-4">
        <div className="flex items-center justify-between">
          <Button
            onClick={() =>
              setEditingMetadata(
                isEditing
                  ? { category: null, index: null }
                  : { category: "body", index: fieldPath as any }
              )
            }
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
          >
            <Settings className="h-3 w-3 mr-1" />
            {isEditing ? "Hide" : "Metadata"}
          </Button>
        </div>

        {isEditing && (
          <div className="p-3 bg-grey-50 rounded border border-grey-300 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-grey-600 mb-1">Min Length</Label>
                <Input
                  type="number"
                  placeholder="Min"
                  value={metadata?.minLength || ""}
                  onChange={(e) =>
                    updateBodyFieldMetadata(
                      fieldPath,
                      "minLength",
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs text-grey-600 mb-1">Max Length</Label>
                <Input
                  type="number"
                  placeholder="Max"
                  value={metadata?.maxLength || ""}
                  onChange={(e) =>
                    updateBodyFieldMetadata(
                      fieldPath,
                      "maxLength",
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-grey-600 mb-1">Type</Label>
              <Select
                value={metadata?.type || ""}
                onValueChange={(value) =>
                  updateBodyFieldMetadata(fieldPath, "type", value)
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(DataTypes).map((type) => (
                    <SelectItem key={type} value={type} className="text-xs">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`required-body-${fieldPath}`}
                checked={metadata?.required || false}
                onChange={(e) =>
                  updateBodyFieldMetadata(
                    fieldPath,
                    "required",
                    e.target.checked
                  )
                }
                className="w-4 h-4 rounded border-grey-400"
              />
              <Label
                htmlFor={`required-body-${fieldPath}`}
                className="text-xs text-grey-700 cursor-pointer"
              >
                Required
              </Label>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleTest = async () => {
    if (!fullUrl) {
      toast.error("Please enter a URL");
      return;
    }

    setIsLoadingRequest(true);
    try {
      // Prepare query params
      const queryParams: Record<string, string> = {};
      query
        .filter((q) => q.enabled && q.key)
        .forEach((q) => {
          queryParams[q.key] = q.value;
        });

      // Prepare headers
      const requestHeaders: Record<string, string> = {};
      headers
        .filter((h) => h.enabled && h.key)
        .forEach((h) => {
          requestHeaders[h.key] = h.value;
        });

      // Prepare params (path parameters)
      const pathParams: Record<string, string> = {};
      params
        .filter((p) => p.enabled && p.key)
        .forEach((p) => {
          pathParams[p.key] = p.value;
        });

      // Parse body based on request type
      let parsedBody: any;
      if (["POST", "PUT", "PATCH"].includes(formData.method)) {
        if (formData.request_type === DataFormats.FORMDATA) {
          // Convert form data fields to object
          parsedBody = {};
          formDataFields
            .filter((f) => f.enabled && f.key)
            .forEach((f) => {
              parsedBody[f.key] = f.value;
            });
        } else if (formData.request_type === DataFormats.JSON && body) {
          try {
            parsedBody = JSON.parse(body);
          } catch {
            parsedBody = body; // Keep as string if not valid JSON
          }
        } else if (body) {
          parsedBody = body; // XML or other text formats
        }
      }

      // Call backend proxy
      const apiBaseUrl =
        import.meta.env.VITE_API_BASE_URL || "https://api.ductape.app/";
      const proxyUrl = `${apiBaseUrl}apps/v1/test-action`;

      const res = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.auth_token}`,
          "x-user-id": user?._id || "",
          "x-workspace-id": "",
        },
        body: JSON.stringify({
          url: fullUrl,
          method: formData.method,
          headers: requestHeaders,
          query: Object.keys(queryParams).length > 0 ? queryParams : undefined,
          params: Object.keys(pathParams).length > 0 ? pathParams : undefined,
          body: parsedBody,
        }),
      });

      const responseData = await res.json();

      // Extract metadata and actual response data
      const { _meta, data: actualData } = responseData;

      if (res.ok) {
        setResponse({
          status: _meta?.status || res.status,
          statusText: _meta?.statusText || res.statusText,
          headers: _meta?.headers || {},
          data: actualData, // The actual API response (can be array or object)
          time: _meta?.time,
          size: _meta?.size,
        });
        toast.success("Request completed");
      } else {
        // Handle error response
        setResponse({
          status: _meta?.status || res.status,
          statusText: _meta?.statusText || res.statusText,
          headers: _meta?.headers || {},
          data: actualData, // The actual API error response
          error: _meta?.error || "Request failed",
          time: _meta?.time,
          size: _meta?.size,
        });
        toast.error(_meta?.error || "Request failed");
      }

      setActiveTab("response"); // Auto-switch to response tab
    } catch (error: any) {
      toast.error(`Request failed: ${error.message}`);
      setResponse({
        error: error.message,
      });
      setActiveTab("response"); // Auto-switch to response tab even on error
    } finally {
      setIsLoadingRequest(false);
    }
  };

  // Helper function to detect response format
  /*const detectResponseFormat = (data: any): InputsTypes => {
    if (!data) return InputsTypes.TEXT;

    // Check content type from headers if available
    const contentType =
      response?.headers?.["content-type"] ||
      response?.headers?.["Content-Type"] ||
      "";

    if (contentType.includes("application/json")) {
      return InputsTypes.JSON;
    }
    if (
      contentType.includes("application/xml") ||
      contentType.includes("text/xml")
    ) {
      return InputsTypes.XML;
    }
    if (contentType.includes("text/html")) {
      return InputsTypes.HTML;
    }
    if (contentType.includes("application/soap+xml")) {
      return InputsTypes.XML;
    }

    // Fallback to data structure detection
    if (typeof data === "object" && data !== null) {
      // Check if it's XML-like (string starting with <)
      const dataStr = JSON.stringify(data);
      if (dataStr.trim().startsWith("<")) {
        return InputsTypes.XML;
      }
      return InputsTypes.JSON;
    }

    if (typeof data === "string") {
      const trimmed = data.trim();
      if (trimmed.startsWith("<")) {
        return trimmed.includes("soap:") || trimmed.includes("SOAP:")
          ? InputsTypes.XML
          : InputsTypes.XML;
      }
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        return InputsTypes.JSON;
      }
      if (
        trimmed.startsWith("<!DOCTYPE html>") ||
        trimmed.startsWith("<html")
      ) {
        return InputsTypes.HTML;
      }
    }

    return InputsTypes.TEXT;
  };*/

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("Please enter a name for this request");
      return;
    }

    setIsSaving(true);

    try {
      // Build IAppAction object with all fields including envs (ICustomEnv[]) and metadata
      const actionData = {
        name: formData.name,
        tag: formData.tag,
        description: formData.description,
        method: formData.method,
        request_type: formData.request_type,
        resource,
        params:
          params.filter((p) => p.enabled && p.key).length > 0
            ? {
                type: InputsTypes.JSON,
                sample: params
                  .filter((p) => p.enabled && p.key) // Only include enabled params with keys
                  .reduce(
                    (acc, p) => ({ ...acc, [p.key]: p.value }),
                    {}
                  ),
                data: params
                  .filter((p) => p.enabled && p.key) // Only include enabled params in data array
                  .map((p) => ({
                    key: p.key,
                    value: p.value,
                    enabled: p.enabled,
                    ...(p.metadata && Object.keys(p.metadata).length > 0
                      ? { metadata: p.metadata }
                      : {}),
                  })),
              }
            : undefined,
        query:
          query.filter((q) => q.enabled && q.key).length > 0
            ? {
                type: InputsTypes.JSON,
                sample: query
                  .filter((q) => q.enabled && q.key) // Only include enabled query params with keys
                  .reduce(
                    (acc, q) => ({ ...acc, [q.key]: q.value }),
                    {}
                  ),
                data: query
                  .filter((q) => q.enabled && q.key) // Only include enabled query params in data array
                  .map((q) => ({
                    key: q.key,
                    value: q.value,
                    enabled: q.enabled,
                    ...(q.metadata && Object.keys(q.metadata).length > 0
                      ? { metadata: q.metadata }
                      : {}),
                  })),
              }
            : undefined,
        headers:
          headers.filter((h) => h.enabled && h.key).length > 0
            ? {
                type: InputsTypes.JSON,
                sample: headers
                  .filter((h) => h.enabled && h.key) // Only include enabled headers with keys
                  .reduce(
                    (acc, h) => ({ ...acc, [h.key]: h.value }),
                    {}
                  ),
                data: headers
                  .filter((h) => h.enabled && h.key) // Only include enabled headers in data array
                  .map((h) => ({
                    key: h.key,
                    value: h.value,
                    enabled: h.enabled,
                    ...(h.metadata && Object.keys(h.metadata).length > 0
                      ? { metadata: h.metadata }
                      : {}),
                  })),
              }
            : undefined,
        body:
          body || formDataFields.length > 0
            ? {
                type:
                  formData.request_type === DataFormats.JSON
                    ? InputsTypes.JSON
                    : formData.request_type === DataFormats.FORMDATA
                    ? InputsTypes.FORMDATA
                    : formData.request_type === DataFormats.URLENCODED
                    ? InputsTypes.URLENCODED
                    : formData.request_type === DataFormats.SOAP
                    ? InputsTypes.XML
                    : formData.request_type === DataFormats.HTML
                    ? InputsTypes.HTML
                    : InputsTypes.TEXT,
                sample:
                  formData.request_type === DataFormats.JSON
                    ? JSON.parse(body)
                    : formData.request_type === DataFormats.FORMDATA
                    ? formDataFields.reduce(
                        (acc, f) => ({ ...acc, [f.key]: f.value }),
                        {}
                      )
                    : body,
                data:
                  formData.request_type === DataFormats.FORMDATA
                    ? formDataFields.map((f) => ({
                        key: f.key,
                        value: f.value,
                        enabled: f.enabled,
                        ...(f.metadata && Object.keys(f.metadata).length > 0
                          ? { metadata: f.metadata }
                          : {}),
                      }))
                    : [],
                ...(formData.request_type === DataFormats.JSON &&
                Object.keys(bodyFieldsMetadata).length > 0
                  ? { fieldsMetadata: bodyFieldsMetadata }
                  : {}),
              }
            : undefined,
        envs: customEnvs, // ICustomEnv[]
        response: {
          name: `${formData.name} Response`,
          tag: `${formData.name} Response`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 50),
          response_format: formData.request_type,
          status_code: response.status.toString(),
          success: response.status >= 200 && response.status < 300,
          body: response.data,
        },
      };

      console.log("Action data to save:", actionData);
      console.log("Custom envs to save:", customEnvs);

      // Validate ductape is initialized and app tag is available
      if (!ductape || !app?.tag) {
        toast.error(
          "SDK not initialized. Please check your credentials and app data."
        );
        return;
      }

      await ductape.init(app.tag);

      const actionPayload = {
        ...actionData,
      };

      console.log("Full action payload:", actionPayload);

      await ductape.actions.create(actionPayload);

      toast.success("Action created successfully");

      // Clear saved state from localStorage after successful save
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error('Error clearing saved state:', error);
      }

      // Close current tab
      const { closeTab, openTab } = useWorkbenchStore.getState();
      closeTab(tabId);

      // Invalidate app query cache
      queryClient.invalidateQueries({ queryKey: ['app', data?.appId] });

      // Fetch fresh app data and reopen app tab
      try {
        const appResponse = await appServicesReal.fetchAppByTag({
          tag: app.tag,
          user_id: user?._id || '',
          public_key: user?.public_key || '',
        });
        const refreshedApp = appResponse.data;

        // Close existing app tab if it exists, then reopen with fresh data
        const existingAppTab = tabs.find(t => t.type === 'app' && t.itemId === refreshedApp._id);
        if (existingAppTab) {
          closeTab(existingAppTab.id);
        }

        // Reopen app tab with fresh data and navigate to actions section
        openTab({
          id: `app-${refreshedApp._id}`,
          type: 'app',
          title: refreshedApp.app_name,
          itemId: refreshedApp._id,
          data: {
            ...refreshedApp,
            activeSection: 'actions', // Navigate to actions section
          },
        });
      } catch (error) {
        console.error('Failed to refresh app data:', error);
        // Fallback: open app tab with cached data
        openTab({
          id: `app-${data?.appId}`,
          title: app?.app_name || "App",
          type: "app",
          itemId: data?.appId,
          data: {
            appId: data?.appId,
            activeSection: "actions",
          },
        });
      }
    } catch (error: any) {
      console.error("Error creating action:", error);
      toast.error(error.message || "Failed to create action");
    } finally {
      setIsSaving(false);
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return "bg-green/10 text-green";
      case "POST":
        return "bg-blue/10 text-blue";
      case "PUT":
        return "bg-orange-500/10 text-orange-500";
      case "PATCH":
        return "bg-purple-500/10 text-purple-500";
      case "DELETE":
        return "bg-red/10 text-red";
      default:
        return "bg-grey-400 text-grey";
    }
  };

  return (
    <div className="h-full overflow-hidden bg-grey-100 flex">
      {/* Left Panel - URL & Environments */}
      <div className="w-2/5 border-r border-grey-400 bg-white overflow-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue/10 flex items-center justify-center flex-shrink-0">
                <Globe className="h-6 w-6 text-blue" />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Request Name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="text-xl font-bold border-none p-0 h-auto focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="text-xs text-grey-600 bg-grey-100 px-3 py-1.5 rounded inline-block">
              Tag:{" "}
              <span className="font-mono">
                {formData.tag || "auto-generated"}
              </span>
            </div>

            <Textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev: any) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="text-sm resize-none"
              rows={2}
            />
          </div>

          {/* App Information */}
          {data?.appId && (
            <div className="pt-4 border-t border-grey-400">
              <Label className="text-sm font-semibold text-grey flex items-center gap-2 mb-3">
                <Server className="h-4 w-4 text-primary" />
                Adding to App
              </Label>

              {app ? (
                <div className="p-3 bg-grey-100 rounded-lg border border-grey-400">
                  <div className="flex items-center gap-3">
                    {/* App Logo */}
                    <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center text-green text-sm font-semibold flex-shrink-0">
                      {app.logo ? (
                        <img
                          src={app.logo}
                          alt={app.app_name}
                          className="w-full h-full rounded-lg object-cover"
                        />
                      ) : (
                        app.app_name
                          .split(" ")
                          .map((word) => word[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      )}
                    </div>

                    {/* App Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-grey truncate">
                        {app.app_name}
                      </h4>
                      <p className="text-xs text-grey-600 truncate">
                        {app.tag}
                      </p>
                      {app.status && (
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1",
                            app.status === "active"
                              ? "bg-green/10 text-green"
                              : "bg-grey-400 text-grey-600"
                          )}
                        >
                          {app.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-grey-100 rounded-lg border border-grey-400">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-grey-400/20 flex items-center justify-center flex-shrink-0">
                      <Server className="h-5 w-5 text-grey-600" />
                    </div>
                    <div className="flex-1">
                      <div className="h-4 bg-grey-400/30 rounded animate-pulse mb-1"></div>
                      <div className="h-3 bg-grey-400/20 rounded animate-pulse w-2/3"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* URL Builder */}
          <div className="space-y-3 pt-4 border-t border-grey-400">
            <Label className="text-sm font-semibold text-grey">
              Request URL
            </Label>

            <div className="flex items-center gap-2">
              <Select
                value={formData.method}
                onValueChange={(value) =>
                  setFormData((prev: any) => ({ ...prev, method: value }))
                }
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["GET", "POST", "PUT", "PATCH", "DELETE"].map((method) => (
                    <SelectItem key={method} value={method}>
                      <span
                        className={cn(
                          "px-2 py-1 rounded text-xs font-bold",
                          getMethodColor(method)
                        )}
                      >
                        {method}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={handleTest}
                disabled={isLoadingRequest || !fullUrl}
                className="bg-primary text-white hover:bg-primary/90"
                size="sm"
              >
                <Send className="h-4 w-4 mr-1" />
                {isLoadingRequest ? "Sending..." : "Send"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-grey flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Full URL
              </Label>
              <Input
                placeholder="https://api.example.com/v1/users"
                value={fullUrl}
                onChange={(e) => setFullUrl(e.target.value)}
                className="font-mono text-lg h-12 border-grey-400 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
                autoFocus
              />
            </div>

            {baseUrl && (
              <div className="p-3 bg-grey-100 rounded-lg border border-grey-400">
                <Label className="text-xs font-medium text-grey-600 mb-2 flex items-center gap-2">
                  <Hash className="h-3 w-3" />
                  Resource Path
                </Label>
                <Input
                  placeholder="/api/v1/endpoint"
                  value={resource}
                  onChange={(e) => setResource(e.target.value)}
                  className="font-mono text-xs h-8"
                />
              </div>
            )}
          </div>

          {/* Environments */}
          {environments.length > 0 && (
            <div className="pt-4 border-t border-grey-400">
              <Label className="text-sm font-semibold text-grey flex items-center gap-2 mb-3">
                <Server className="h-4 w-4 text-primary" />
                Environments
              </Label>

              <div className="space-y-2">
                {customEnvs.map((env) => {
                  const originalEnv = environments.find(
                    (e: any) => e.slug === env.slug
                  );
                  const isModified = env.base_url !== originalEnv?.base_url;
                  const isUpdating = updatingEnvSlugs.has(env.slug);

                  return (
                    <div key={env.slug} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => handleEnvSelect(env.slug)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-all duration-300 flex-1",
                            isUpdating &&
                              "animate-pulse ring-4 ring-yellow-400 ring-opacity-75 shadow-lg",
                            env.active
                              ? isUpdating
                                ? "bg-yellow-400 text-yellow-900 shadow-xl transform scale-105"
                                : "bg-primary text-white"
                              : isUpdating
                              ? "bg-yellow-200 text-yellow-900 shadow-xl transform scale-105"
                              : "bg-grey-100 text-grey-700 hover:bg-grey-200"
                          )}
                        >
                          <span>{originalEnv?.env_name || env.slug}</span>
                          {isModified && !isUpdating && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-orange-500"
                              title="Modified"
                            />
                          )}
                          {isUpdating && (
                            <span
                              className="w-2 h-2 rounded-full bg-yellow-600 animate-ping"
                              title="Updating..."
                            />
                          )}
                        </button>

                        {isModified && !isUpdating && (
                          <Button
                            onClick={() => handleResetEnv(env.slug)}
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            title="Reset to default"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      {env.active && (
                        <div className="pl-3 text-xs text-grey-600">
                          <code
                            className={cn(
                              "px-2 py-1 rounded border block transition-all duration-300",
                              isUpdating
                                ? "bg-yellow-100 border-yellow-400 text-yellow-800 shadow-md"
                                : "bg-grey-100 border-grey-400"
                            )}
                          >
                            {env.base_url || "Not set"}
                          </code>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Request/Response */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="border-b border-grey-400 bg-white px-6 flex-shrink-0">
            <TabsList className="w-full justify-start rounded-none bg-transparent p-0 h-auto">
              <TabsTrigger
                value="params"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                Params
              </TabsTrigger>
              <TabsTrigger
                value="headers"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                Headers
              </TabsTrigger>
              {["POST", "PUT", "PATCH"].includes(formData.method) && (
                <TabsTrigger
                  value="body"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  Body
                </TabsTrigger>
              )}
              <TabsTrigger
                value="response"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                disabled={!response}
              >
                Response
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <TabsContent value="params" className="p-6 space-y-6 m-0">
              {/* Query Parameters Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold text-grey flex items-center gap-2">
                    <Hash className="h-4 w-4 text-primary" />
                    Query Parameters
                  </Label>
                  <Button
                    onClick={() => addKeyValue(setQuery)}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Query
                  </Button>
                </div>
                <div className="space-y-2">
                  {query.length === 0 ? (
                    <p className="text-sm text-grey-600 text-center py-8 bg-grey-100 rounded border border-grey-400">
                      No query parameters
                    </p>
                  ) : (
                    query.map((item, index) => (
                      <div
                        key={index}
                        className="p-3 bg-grey-100 rounded border border-grey-400 space-y-2"
                      >
                        <div className="flex gap-2 items-center">
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={(e) =>
                              updateKeyValue(
                                index,
                                "enabled",
                                e.target.checked,
                                setQuery
                              )
                            }
                            className="w-4 h-4 rounded border-grey-400"
                          />
                          <Input
                            placeholder="Key"
                            value={item.key}
                            onChange={(e) =>
                              updateKeyValue(
                                index,
                                "key",
                                e.target.value,
                                setQuery
                              )
                            }
                            className="flex-1 h-9"
                          />
                          <Input
                            placeholder="Value"
                            value={item.value}
                            onChange={(e) =>
                              updateKeyValue(
                                index,
                                "value",
                                e.target.value,
                                setQuery
                              )
                            }
                            className="flex-1 h-9"
                          />
                          <Button
                            onClick={() => removeKeyValue(index, setQuery)}
                            variant="ghost"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4 text-red" />
                          </Button>
                        </div>
                        {renderMetadataPanel(item, index, "query", setQuery)}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-grey-400"></div>

              {/* Path Parameters Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold text-grey flex items-center gap-2">
                    <Hash className="h-4 w-4 text-primary" />
                    Path Parameters
                  </Label>
                  <Button
                    onClick={() => addKeyValue(setParams)}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Path
                  </Button>
                </div>
                <div className="space-y-2">
                  {params.length === 0 ? (
                    <p className="text-sm text-grey-600 text-center py-8 bg-grey-100 rounded border border-grey-400">
                      No path parameters
                    </p>
                  ) : (
                    params.map((item, index) => (
                      <div
                        key={index}
                        className="p-3 bg-grey-100 rounded border border-grey-400 space-y-2"
                      >
                        <div className="flex gap-2 items-center">
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={(e) =>
                              updateKeyValue(
                                index,
                                "enabled",
                                e.target.checked,
                                setParams
                              )
                            }
                            className="w-4 h-4 rounded border-grey-400"
                          />
                          <Input
                            placeholder="Key"
                            value={item.key}
                            onChange={(e) =>
                              updateKeyValue(
                                index,
                                "key",
                                e.target.value,
                                setParams
                              )
                            }
                            className="flex-1 h-9"
                          />
                          <Input
                            placeholder="Value"
                            value={item.value}
                            onChange={(e) =>
                              updateKeyValue(
                                index,
                                "value",
                                e.target.value,
                                setParams
                              )
                            }
                            className="flex-1 h-9"
                          />
                          <Button
                            onClick={() => removeKeyValue(index, setParams)}
                            variant="ghost"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4 text-red" />
                          </Button>
                        </div>
                        {renderMetadataPanel(item, index, "params", setParams)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="headers" className="p-6 space-y-4 m-0">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold text-grey flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-primary" />
                  Headers
                </Label>
                <Button
                  onClick={() => addKeyValue(setHeaders)}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {headers.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 bg-grey-100 rounded border border-grey-400 space-y-2"
                  >
                    <div className="flex gap-2 items-center">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) =>
                          updateKeyValue(
                            index,
                            "enabled",
                            e.target.checked,
                            setHeaders
                          )
                        }
                        className="w-4 h-4 rounded border-grey-400"
                      />
                      <Input
                        placeholder="Header"
                        value={item.key}
                        onChange={(e) =>
                          updateKeyValue(
                            index,
                            "key",
                            e.target.value,
                            setHeaders
                          )
                        }
                        className="flex-1 h-9"
                      />
                      <Input
                        placeholder="Value"
                        value={item.value}
                        onChange={(e) =>
                          updateKeyValue(
                            index,
                            "value",
                            e.target.value,
                            setHeaders
                          )
                        }
                        className="flex-1 h-9"
                      />
                      <Button
                        onClick={() => removeKeyValue(index, setHeaders)}
                        variant="ghost"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4 text-red" />
                      </Button>
                    </div>
                    {renderMetadataPanel(item, index, "headers", setHeaders)}
                  </div>
                ))}
              </div>
            </TabsContent>

            {["POST", "PUT", "PATCH"].includes(formData.method) && (
              <TabsContent
                value="body"
                className="p-6 space-y-4 m-0"
              >
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold text-grey flex items-center gap-2">
                    <Code className="h-4 w-4 text-primary" />
                    Request Body
                  </Label>
                  <div className="flex items-center gap-2">
                    {formData.request_type === DataFormats.JSON && body && (
                      <Button
                        onClick={formatJSON}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Wand2 className="h-4 w-4" />
                        Format JSON
                      </Button>
                    )}
                    <Select
                      value={formData.request_type}
                      onValueChange={(value) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          request_type: value as DataFormats,
                        }))
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={DataFormats.JSON}>JSON</SelectItem>
                        <SelectItem value={DataFormats.SOAP}>XML</SelectItem>
                        <SelectItem value={DataFormats.FORMDATA}>
                          Form Data
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* JSON/XML Textarea */}
                {(formData.request_type === DataFormats.JSON ||
                  formData.request_type === DataFormats.SOAP) && (
                  <>
                    <Textarea
                      placeholder={
                        formData.request_type === DataFormats.JSON
                          ? '{\n  "key": "value"\n}'
                          : "<xml>\n  <key>value</key>\n</xml>"
                      }
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      className="font-mono text-sm min-h-[400px] resize-none"
                    />

                    {/* JSON Field Metadata - only show for valid JSON */}
                    {formData.request_type === DataFormats.JSON &&
                      body &&
                      (() => {
                        try {
                          const parsed = JSON.parse(body);
                          const fieldPaths = extractJsonPaths(parsed);

                          if (fieldPaths.length > 0) {
                            return (
                              <div className="space-y-2 mt-4">
                                <Label className="text-sm font-semibold text-grey-700">
                                  Field Metadata
                                </Label>
                                <div className="space-y-2">
                                  {fieldPaths.map((path) => (
                                    <div
                                      key={path}
                                      className="p-3 bg-grey-100 rounded border border-grey-400"
                                    >
                                      <div className="flex items-center justify-between">
                                        <code className="text-sm font-mono text-grey-800">
                                          {path}
                                        </code>
                                      </div>
                                      {renderBodyFieldMetadata(path)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                        } catch (e) {
                          // Invalid JSON, don't show field metadata
                        }
                        return null;
                      })()}
                  </>
                )}

                {/* Form Data - similar to query/params inputs */}
                {formData.request_type === DataFormats.FORMDATA && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {formDataFields.map((item, index) => (
                        <div
                          key={index}
                          className="p-3 bg-grey-100 rounded border border-grey-400 space-y-2"
                        >
                          <div className="flex gap-2 items-center">
                            <input
                              type="checkbox"
                              checked={item.enabled}
                              onChange={(e) =>
                                updateKeyValue(
                                  index,
                                  "enabled",
                                  e.target.checked,
                                  setFormDataFields
                                )
                              }
                              className="w-4 h-4 rounded border-grey-400"
                            />
                            <Input
                              placeholder="Key"
                              value={item.key}
                              onChange={(e) =>
                                updateKeyValue(
                                  index,
                                  "key",
                                  e.target.value,
                                  setFormDataFields
                                )
                              }
                              className="flex-1 h-9"
                            />
                            <Input
                              placeholder="Value"
                              value={item.value}
                              onChange={(e) =>
                                updateKeyValue(
                                  index,
                                  "value",
                                  e.target.value,
                                  setFormDataFields
                                )
                              }
                              className="flex-1 h-9"
                            />
                            <Button
                              onClick={() =>
                                removeKeyValue(index, setFormDataFields)
                              }
                              variant="ghost"
                              size="sm"
                            >
                              <Trash2 className="h-4 w-4 text-red" />
                            </Button>
                          </div>
                          {renderMetadataPanel(
                            item,
                            index,
                            "body",
                            setFormDataFields
                          )}
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={() => addKeyValue(setFormDataFields)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Form Field
                    </Button>
                  </div>
                )}
              </TabsContent>
            )}

            <TabsContent
              value="response"
              className="m-0 h-full flex flex-col overflow-hidden"
            >
              {!response ? (
                <div className="flex items-center justify-center h-full text-grey-600">
                  <div className="text-center">
                    <p className="text-lg mb-2">No response yet</p>
                    <p className="text-sm">
                      Send a request to see the response
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col overflow-hidden">
                  {response.status && (
                    <div className="flex-shrink-0 flex items-center gap-2 p-3 mx-6 mt-6 bg-grey-100 rounded-lg border border-grey-400">
                      <span className="text-sm font-medium text-grey-600">
                        Status:
                      </span>
                      <span
                        className={cn(
                          "px-3 py-1 rounded text-xs font-bold",
                          response.status >= 200 && response.status < 300
                            ? "bg-green/10 text-green border border-green/20"
                            : response.status >= 400
                            ? "bg-red/10 text-red border border-red/20"
                            : "bg-grey-400 text-grey"
                        )}
                      >
                        {response.status} {response.statusText}
                      </span>
                      {response.time !== undefined && (
                        <>
                          <span className="text-grey-300 mx-2">|</span>
                          <span className="text-sm font-medium text-grey-600">Time:</span>
                          <span className="text-sm text-grey-700">{response.time}ms</span>
                        </>
                      )}
                      {response.size !== undefined && (
                        <>
                          <span className="text-grey-300 mx-2">|</span>
                          <span className="text-sm font-medium text-grey-600">Size:</span>
                          <span className="text-sm text-grey-700">{response.size} bytes</span>
                        </>
                      )}
                    </div>
                  )}
                  <div className="flex-1 flex flex-col min-h-0 px-6 pb-6 pt-4">
                    <div className="flex items-center justify-between mb-2 flex-shrink-0">
                      <Label className="text-sm font-medium text-grey-600">
                        Response Body
                      </Label>
                      <Button
                        onClick={copyResponseToClipboard}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                    <div className="flex-1 bg-white rounded-lg border border-grey-400 p-4 overflow-auto font-mono text-sm min-h-0 max-h-[700px]">
                      <pre
                        className="text-grey-800"
                        style={{
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                        dangerouslySetInnerHTML={{
                          __html: syntaxHighlightJSON(
                            response.data || response
                          ),
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        {/* Save Button */}
        <div className="border-t border-grey-400 bg-white p-4 flex justify-end">
          <Button
            onClick={handleSave}
            className="bg-primary text-white hover:bg-primary/90"
            disabled={
              isSaving ||
              !response ||
              (response.status &&
                (response.status < 200 || response.status >= 300))
            }
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaving ? "Saving..." : "Save Request"}
          </Button>
        </div>
      </div>
    </div>
  );
}
