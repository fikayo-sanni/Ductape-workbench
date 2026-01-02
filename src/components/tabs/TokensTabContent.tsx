import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Key,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Check,
  Loader2,
  RefreshCw,
  Shield,
  MoreVertical,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/useAuth";
import toast from "react-hot-toast";
import tokensServices from "@/services/tokensServices";
import productServices from "@/services/productServices";
import { MarkdownEditor } from "../ui/markdown-editor";
import { connectDuctapeWorkspace, SDKProxyService } from "@/helpers/ductape";
import { IProduct } from "@/types/product";
import {
  getCachedTokens,
  setCachedTokens,
  addCachedToken,
  removeCachedToken,
  updateCachedToken,
} from "@/stores/tokens-cache";

interface Token {
  name: string;
  token?: string; // Only available on creation
  encrypted_token?: string;
  token_type: string;
  scope: string[];
  expires_in?: number | null;
  envs: string[];
  created_at: Date | string;
  last_used?: Date | string | null;
  is_active: boolean;
  description?: string;
}

type ConfirmAction = 'revoke' | 'delete';

type ExpiryPeriod = "hours" | "days" | "weeks" | "months" | "years";

// Empty tokens array - will be populated from API
const initialTokens: Token[] = [];

export default function TokensTabContent() {
  const { currentWorkspaceId, user } = useAuth();
  const [tokens, setTokens] = useState<Token[]>(initialTokens);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showNewTokenDialog, setShowNewTokenDialog] = useState(false);
  const [createdToken, setCreatedToken] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [newToken, setNewToken] = useState({
    name: "",
    description: "",
    token_type: "credential",
    scope: [] as string[],
    expiryDuration: "",
    expiryPeriod: "days" as ExpiryPeriod,
    envs: [] as string[],
  });

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>('delete');
  const [confirmTokenName, setConfirmTokenName] = useState('');
  const [confirmInputValue, setConfirmInputValue] = useState('');
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  // Copy feedback state
  const [copiedTokenName, setCopiedTokenName] = useState<string | null>(null);
  const [copiedAccessKey, setCopiedAccessKey] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Initialize Ductape SDK proxy instance for workspace operations
  const ductape = useMemo<SDKProxyService | null>(() => {
    if (!currentWorkspaceId || !user?._id || !user?.public_key || !user?.auth_token) {
      return null;
    }
    try {
      return connectDuctapeWorkspace({
        workspace_id: currentWorkspaceId,
        user_id: user._id,
        token: user.auth_token,
        public_key: user.public_key,
      });
    } catch (error) {
      console.error("Failed to initialize Ductape SDK:", error);
      return null;
    }
  }, [currentWorkspaceId, user?._id, user?.public_key, user?.auth_token]);

  // Access Key State
  const [accessKey, setAccessKey] = useState("**************************************");
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [accessKeyVisible, setAccessKeyVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Products state for scope selection
  const [products, setProducts] = useState<IProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedProductDetails, setSelectedProductDetails] = useState<IProduct | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingProductDetails, setLoadingProductDetails] = useState(false);

  // Get current workspace data
  const currentWorkspace = user?.workspaces?.find(
    (ws: any) =>
      ws.workspace_id === currentWorkspaceId || ws._id === currentWorkspaceId
  );

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success("Token copied to clipboard!");
  };

  // Copy token key in $Secret{key} format
  const handleCopyTokenKey = (tokenName: string) => {
    const formattedKey = `$Secret{${tokenName}}`;
    navigator.clipboard.writeText(formattedKey);
    setCopiedTokenName(tokenName);
    toast.success(`Copied: ${formattedKey}`);
    setTimeout(() => setCopiedTokenName(null), 2000);
  };

  // Load tokens from cache or fetch on mount
  useEffect(() => {
    if (!ductape || !currentWorkspaceId) return;

    // Try to load from cache first
    const cached = getCachedTokens(currentWorkspaceId);
    if (cached) {
      setTokens(cached);
    } else {
      fetchTokens();
    }
  }, [ductape, currentWorkspaceId]);

  // Fetch products for scope selection
  useEffect(() => {
    if (currentWorkspaceId && user?._id && user?.public_key) {
      fetchProductsList();
    }
  }, [currentWorkspaceId, user?._id, user?.public_key]);

  const fetchProductsList = async () => {
    if (!currentWorkspaceId || !user?._id || !user?.public_key) return;

    setLoadingProducts(true);
    try {
      const response = await productServices.fetchProducts({
        workspace_id: currentWorkspaceId,
        user_id: user._id,
        public_key: user.public_key,
        status: "all",
      });
      setProducts(response.data || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Fetch full product details when a product is selected
  const fetchProductDetails = async (productId: string) => {
    if (!currentWorkspaceId || !user?._id || !user?.public_key || !productId) {
      setSelectedProductDetails(null);
      return;
    }

    setLoadingProductDetails(true);
    try {
      const response = await productServices.fetchProduct({
        workspace_id: currentWorkspaceId,
        user_id: user._id,
        public_key: user.public_key,
        product_id: productId,
      });
      setSelectedProductDetails(response.data || null);
    } catch (error) {
      console.error("Failed to fetch product details:", error);
      setSelectedProductDetails(null);
    } finally {
      setLoadingProductDetails(false);
    }
  };

  // Get available resources for selected product
  const availableResources = useMemo(() => {
    if (!selectedProductDetails) return [];

    const resources: { type: string; tag: string; name: string }[] = [];

    // Add apps
    selectedProductDetails.apps?.forEach((app: any) => {
      resources.push({
        type: "app",
        tag: app.access_tag || app.tag,
        name: app.name || app.access_tag || app.tag,
      });
    });

    return resources;
  }, [selectedProductDetails]);

  const fetchTokens = useCallback(async () => {
    if (!ductape || !currentWorkspaceId) return;

    setLoading(true);
    try {
      const secretsList = await (ductape as any).secrets.list();
      // Map secrets to token format
      const tokensData: Token[] = (secretsList || []).map((secret: any) => ({
        name: secret.key,
        token_type: secret.token_type || "api",
        scope: secret.scope || [],
        expires_in: secret.expires_at,
        envs: secret.envs || [],
        created_at: secret.createdAt || new Date(),
        last_used: null,
        is_active: !secret.expires_at || secret.expires_at * 1000 > Date.now(),
        description: secret.description,
      }));
      setTokens(tokensData);
      // Save to cache
      setCachedTokens(currentWorkspaceId, tokensData);
    } catch (error) {
      console.error("Failed to fetch tokens:", error);
      toast.error("Failed to fetch tokens");
    } finally {
      setLoading(false);
    }
  }, [ductape, currentWorkspaceId]);

  const validateTokenName = (name: string): boolean => {
    // Only allow alphanumeric characters and underscores
    const tagPattern = /^[a-zA-Z0-9_]+$/;
    return tagPattern.test(name);
  };

  // Generate a random token value
  const generateTokenValue = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = 64;
    let result = 'dtk_'; // Prefix for Ductape tokens
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Calculate expiry timestamp (Unix epoch in seconds)
  const calculateExpiryTimestamp = (duration: string, period: ExpiryPeriod): number | null => {
    if (!duration || duration === "") return null;

    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum <= 0) return null;

    const now = Math.floor(Date.now() / 1000);
    const multipliers: Record<ExpiryPeriod, number> = {
      hours: 3600,
      days: 86400,
      weeks: 604800,
      months: 2592000,
      years: 31536000,
    };

    return now + (durationNum * multipliers[period]);
  };

  const handleCreateToken = async () => {
    if (!ductape) {
      toast.error("Unable to connect to Ductape. Please check your credentials and try again.");
      return;
    }

    // Validate token name format
    if (!validateTokenName(newToken.name)) {
      toast.error(
        "Token name must only contain letters, numbers, and underscores (no spaces or special characters)"
      );
      return;
    }

    if (!newToken.name.trim()) {
      toast.error("Please enter a token key");
      return;
    }

    if (newToken.scope.length === 0) {
      toast.error("Please select at least one scope");
      return;
    }

    setLoading(true);
    try {
      const expires_at = calculateExpiryTimestamp(newToken.expiryDuration, newToken.expiryPeriod);

      // Generate token value
      const tokenValue = generateTokenValue();

      await (ductape as any).secrets.create({
        key: newToken.name,
        value: tokenValue,
        description: newToken.description || undefined,
        token_type: newToken.token_type,
        scope: newToken.scope,
        envs: newToken.envs,
        expires_at,
      });

      // Show the newly created token (only time it's visible)
      setCreatedToken(tokenValue);
      setShowNewTokenDialog(true);

      // Refresh tokens list
      await fetchTokens();

      setShowCreateDialog(false);
      setNewToken({
        name: "",
        description: "",
        token_type: "credential",
        scope: [],
        expiryDuration: "",
        expiryPeriod: "days",
        envs: [],
      });
      setSelectedProductId("");
      setSelectedProductDetails(null);

      toast.success("Token created successfully");
    } catch (error: any) {
      console.error("Failed to create token:", error);
      toast.error(error?.message || "Failed to create token");
    } finally {
      setLoading(false);
    }
  };

  // Open confirmation dialog for revoke/delete
  const openConfirmDialog = (tokenName: string, action: ConfirmAction) => {
    setConfirmTokenName(tokenName);
    setConfirmAction(action);
    setConfirmInputValue('');
    setShowConfirmDialog(true);
  };

  // Handle confirmed revoke action
  const handleConfirmedRevoke = async () => {
    if (!ductape || !currentWorkspaceId || confirmInputValue !== confirmTokenName) return;

    setIsConfirmLoading(true);
    try {
      // Revoke by setting expiry to now (expired)
      await (ductape as any).secrets.update(confirmTokenName, {
        expires_at: Math.floor(Date.now() / 1000) - 1, // Set to past
      });

      // Update local state and cache quietly (no refetch)
      const updatedTokens = tokens.map((t) =>
        t.name === confirmTokenName ? { ...t, is_active: false } : t
      );
      setTokens(updatedTokens);
      setCachedTokens(currentWorkspaceId, updatedTokens);
      updateCachedToken(confirmTokenName, { is_active: false });

      toast.success("Token revoked successfully");
      setShowConfirmDialog(false);
      setConfirmInputValue('');
    } catch (error: any) {
      console.error("Failed to revoke token:", error);
      toast.error(error?.message || "Failed to revoke token");
    } finally {
      setIsConfirmLoading(false);
    }
  };

  // Handle confirmed delete action
  const handleConfirmedDelete = async () => {
    if (!ductape || !currentWorkspaceId || confirmInputValue !== confirmTokenName) return;

    setIsConfirmLoading(true);
    try {
      await (ductape as any).secrets.delete(confirmTokenName);

      // Update local state and cache quietly (no refetch)
      const updatedTokens = tokens.filter((t) => t.name !== confirmTokenName);
      setTokens(updatedTokens);
      setCachedTokens(currentWorkspaceId, updatedTokens);
      removeCachedToken(confirmTokenName);

      toast.success("Token deleted successfully");
      setShowConfirmDialog(false);
      setConfirmInputValue('');
    } catch (error: any) {
      console.error("Failed to delete token:", error);
      toast.error(error?.message || "Failed to delete token");
    } finally {
      setIsConfirmLoading(false);
    }
  };

  const handleConfirmAction = () => {
    if (confirmAction === 'revoke') {
      handleConfirmedRevoke();
    } else {
      handleConfirmedDelete();
    }
  };

  const getStatusColor = (is_active: boolean) => {
    return is_active ? "bg-green/10 text-green" : "bg-red-500/10 text-red-500";
  };

  const getStatusText = (is_active: boolean) => {
    return is_active ? "active" : "revoked";
  };

  // Access Key Handlers
  const handleCopyAccessKey = () => {
    if (!accessKeyVisible) return;
    navigator.clipboard
      .writeText(accessKey)
      .then(() => {
        setCopiedAccessKey(true);
        toast.success("Access key copied to clipboard!");
        setTimeout(() => setCopiedAccessKey(false), 2000);
      })
      .catch(() => toast.error("Failed to copy access key."));
  };

  const handleRequestOtp = async () => {
    if (otpSent) {
      setShowOtpDialog(true);
      return;
    }

    try {
      // Call API to send OTP
      await tokensServices.getTwoFA({
        user_id: user?._id ?? "",
        public_key: user?.public_key ?? "",
      });
      toast.success("OTP sent to your email");
      setOtpSent(true);
      setShowOtpDialog(true);
      setSecondsLeft(60);
    } catch (error) {
      toast.error("Failed to send OTP. Please try again.");
      console.error("Error sending OTP:", error);
    }
  };

  const handleVerifyOtp = async () => {
    const otp = otpValues.join("");
    if (otp.length !== 6) {
      toast.error("Please enter complete OTP");
      return;
    }

    try {
      // Call API to verify OTP and get access_key
      const response = await tokensServices.postTwoFA({
        user_id: user?._id ?? "",
        public_key: user?.public_key ?? "",
        workspace_id: currentWorkspaceId || "",
        token: otp,
      });

      if (response.status && response.data) {
        setAccessKey(response.data.access_key);
        setAccessKeyVisible(true);
        setOtpVerified(true);
        setShowOtpDialog(false);
        setOtpValues(["", "", "", "", "", ""]);
        toast.success("OTP verified successfully");
      } else {
        toast.error("Invalid OTP entered");
      }
    } catch (error) {
      toast.error("OTP verification failed");
      console.error("Error verifying OTP:", error);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const newOtpValues = [...otpValues];
    newOtpValues[index] = value.replace(/\D/, "");
    setOtpValues(newOtpValues);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleRegenerateAccessKey = async () => {
    if (!otpVerified) {
      toast.error("Please verify with OTP first");
      return;
    }

    setIsRegenerating(true);
    try {
      const response = await tokensServices.regenerateAccessKey({
        user_id: user?._id ?? "",
        public_key: user?.public_key ?? "",
        workspace_id: currentWorkspaceId || "",
      });

      if (response.status && response.data) {
        setAccessKey(response.data.access_key);
        toast.success("Access key regenerated successfully");
      } else {
        toast.error("Failed to regenerate access key");
      }
    } catch (error) {
      toast.error("Failed to regenerate access key");
      console.error("Error regenerating access key:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleToggleAccessKeyVisibility = () => {
    if (accessKeyVisible) {
      setAccessKeyVisible(false);
    } else {
      if (!otpVerified) {
        handleRequestOtp();
      } else {
        setAccessKeyVisible(true);
      }
    }
  };

  // OTP Timer Effect
  useEffect(() => {
    if (secondsLeft === 0 || !showOtpDialog) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft, showOtpDialog]);

  // State for access key panel
  const [showAccessKeyPanel, setShowAccessKeyPanel] = useState(false);

  return (
    <div className="h-full overflow-auto bg-grey-100">
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        {/* Page Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-grey">Tokens & Credentials</h1>
          <p className="text-sm text-grey-500 mt-1">
            Manage API tokens and SDK access keys for your workspace
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green/10 flex items-center justify-center">
                <Key className="h-4 w-4 text-green" />
              </div>
              <div>
                <p className="text-xl font-bold text-grey">
                  {tokens.filter((t) => t.is_active).length}
                </p>
                <p className="text-xs text-grey-500">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Key className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-grey">{tokens.length}</p>
                <p className="text-xs text-grey-500">Total</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-grey">
                  {tokens.filter((t) => !t.is_active).length}
                </p>
                <p className="text-xs text-grey-500">Revoked</p>
              </div>
            </div>
          </div>
        </div>

        {/* Header with tabs-style navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-white rounded-lg border border-grey-300 p-1">
            <button
              onClick={() => setShowAccessKeyPanel(false)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                !showAccessKeyPanel
                  ? "bg-primary text-white"
                  : "text-grey-600 hover:text-grey hover:bg-grey-50"
              )}
            >
              <span className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Tokens
                <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">
                  {tokens.length}
                </span>
              </span>
            </button>
            <button
              onClick={() => setShowAccessKeyPanel(true)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                showAccessKeyPanel
                  ? "bg-primary text-white"
                  : "text-grey-600 hover:text-grey hover:bg-grey-50"
              )}
            >
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                SDK Access Key
              </span>
            </button>
          </div>

          {!showAccessKeyPanel && (
            <div className="flex items-center gap-2">
              <Button
                onClick={fetchTokens}
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              <Button onClick={() => setShowCreateDialog(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Token
              </Button>
            </div>
          )}
        </div>

        {/* Content based on selected tab */}
        {showAccessKeyPanel ? (
          /* SDK Access Key Panel */
          <div className="bg-white rounded-lg border border-grey-400 shadow-sm overflow-hidden">
            {/* Header Section */}
            <div className="p-6 border-b border-grey-400">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-grey">SDK Access Key</h2>
                    <p className="text-sm text-grey-600">
                      Initialize the Ductape SDK in your application
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border",
                  otpVerified
                    ? "bg-green/10 text-green border-green/20"
                    : "bg-primary/5 text-primary border-primary/20"
                )}>
                  {otpVerified ? "Verified" : "2FA Protected"}
                </span>
              </div>
            </div>

            {/* Access Key Section */}
            <div className="p-6 bg-grey-50/50">
              <label className="text-xs font-medium text-grey-600 uppercase tracking-wide mb-2 block">
                Access Key
              </label>
              <div className="bg-white rounded-lg border border-grey-300 p-4 flex items-center justify-between gap-4">
                <code className="text-sm font-mono text-grey break-all flex-1 select-all">
                  {accessKeyVisible ? accessKey : "•".repeat(40)}
                </code>
                <div className="flex items-center gap-1 shrink-0 border-l border-grey-200 pl-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleToggleAccessKeyVisibility}
                    className="h-8 w-8 p-0 hover:bg-grey-100"
                    title={accessKeyVisible ? "Hide key" : "Reveal key"}
                  >
                    {accessKeyVisible ? (
                      <EyeOff className="h-4 w-4 text-grey-600" />
                    ) : (
                      <Eye className="h-4 w-4 text-grey-600" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyAccessKey}
                    disabled={!accessKeyVisible}
                    className="h-8 w-8 p-0 hover:bg-grey-100"
                    title="Copy key"
                  >
                    {copiedAccessKey ? (
                      <Check className="h-4 w-4 text-green" />
                    ) : (
                      <Copy className="h-4 w-4 text-grey-600" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center gap-2">
                <Button
                  variant={accessKeyVisible ? "outline" : "default"}
                  size="sm"
                  onClick={handleToggleAccessKeyVisibility}
                  className="gap-2"
                >
                  {accessKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {accessKeyVisible ? "Hide Key" : "Reveal Key"}
                </Button>
                {accessKeyVisible && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyAccessKey}
                    className="gap-2"
                  >
                    {copiedAccessKey ? <Check className="h-4 w-4 text-green" /> : <Copy className="h-4 w-4" />}
                    {copiedAccessKey ? "Copied!" : "Copy Key"}
                  </Button>
                )}
                {otpVerified && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerateAccessKey}
                    disabled={isRegenerating}
                    className="gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  >
                    <RefreshCw className={cn("h-4 w-4", isRegenerating && "animate-spin")} />
                    {isRegenerating ? "Regenerating..." : "Regenerate"}
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Start Section */}
            <div className="p-6 border-t border-grey-400">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-grey">Quick Start</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const code = `import Ductape from '@ductape/sdk';

const ductape = new Ductape({
  accessKey: '${accessKeyVisible ? accessKey : 'your-access-key'}'
});`;
                    navigator.clipboard.writeText(code);
                    setCopiedCode(true);
                    toast.success("Code copied to clipboard!");
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="gap-1.5 h-7 text-xs"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-green" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedCode ? "Copied!" : "Copy code"}
                </Button>
              </div>
              <div className="bg-grey-100 dark:bg-grey-800 rounded-lg p-4 border border-grey-300 dark:border-grey-700 overflow-x-auto">
                <pre className="text-sm font-mono text-grey dark:text-grey-100 leading-relaxed">{`import Ductape from '@ductape/sdk';

const ductape = new Ductape({
  accessKey: '${accessKeyVisible ? accessKey.slice(0, 24) + '...' : 'your-access-key'}'
});`}</pre>
              </div>
              <div className="mt-4 flex items-center gap-6 text-sm">
                <a
                  href="https://docs.ductape.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Documentation →
                </a>
                <a
                  href="https://www.npmjs.com/package/@ductape/sdk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-grey-600 hover:text-grey transition-colors"
                >
                  NPM Package
                </a>
              </div>
            </div>

            {/* Security Notice */}
            <div className="px-6 py-4 bg-amber-50 border-t border-amber-100">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-700">
                  Keep your access key secure. Never expose it in client-side code or public repositories.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Tokens List */
          <div>
            {loading ? (
              <div className="bg-white rounded-lg border border-grey-400 shadow-sm text-center py-16 text-grey-600">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <span className="text-sm">Loading tokens...</span>
              </div>
            ) : tokens.length === 0 ? (
              <div className="bg-white rounded-lg border border-grey-400 shadow-sm text-center py-12 px-4">
                <Key className="h-12 w-12 text-grey-400 mx-auto mb-3" />
                <p className="text-sm text-grey-600">No tokens yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setShowCreateDialog(true)}
                >
                  Create Your First Token
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-grey mb-4">Secrets</h2>
                <div className="space-y-3">
                  {tokens.map((token) => (
                    <div
                      key={token.name}
                      className="p-4 rounded-lg border border-grey-400 hover:border-primary hover:shadow-sm transition-all"
                    >
                      {/* Header Row - Icon, Name, Status, Actions */}
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Icon */}
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                            token.is_active ? "bg-primary/10" : "bg-grey-100"
                          )}>
                            <Key className={cn(
                              "h-5 w-5",
                              token.is_active ? "text-primary" : "text-grey-400"
                            )} />
                          </div>

                          {/* Name and Status */}
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-grey" title={token.name}>
                              {token.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                className={cn(
                                  'uppercase font-semibold text-[10px] px-1.5 py-0',
                                  getStatusColor(token.is_active)
                                )}
                              >
                                {getStatusText(token.is_active)}
                              </Badge>
                              {token.expires_in && (
                                <span className={cn(
                                  "flex items-center gap-1 text-[10px]",
                                  token.expires_in * 1000 < Date.now() ? "text-red-500" : "text-grey-500"
                                )}>
                                  <Clock className="h-3 w-3" />
                                  {(() => {
                                    const expiryMs = token.expires_in * 1000;
                                    const now = Date.now();
                                    if (expiryMs < now) return 'Expired';
                                    const diffMs = expiryMs - now;
                                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                    if (diffDays > 0) return `${diffDays}d left`;
                                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                    if (diffHours > 0) return `${diffHours}h left`;
                                    return `${Math.floor(diffMs / (1000 * 60))}m left`;
                                  })()}
                                </span>
                              )}
                              <span className="text-[10px] text-grey-400">
                                • Created {new Date(token.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Copy and Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyTokenKey(token.name)}
                            className="h-8 gap-1.5 text-xs"
                          >
                            {copiedTokenName === token.name ? (
                              <Check className="h-3.5 w-3.5 text-green" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            {copiedTokenName === token.name ? "Copied" : "Copy"}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleCopyTokenKey(token.name)}
                                className="cursor-pointer text-xs"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy $Secret Reference
                              </DropdownMenuItem>
                              {token.is_active && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => openConfirmDialog(token.name, 'revoke')}
                                    className="text-orange-500 cursor-pointer focus:text-orange-600 focus:bg-orange-50 text-xs"
                                  >
                                    <AlertCircle className="h-4 w-4 mr-2" />
                                    Revoke Token
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openConfirmDialog(token.name, 'delete')}
                                className="text-red-500 cursor-pointer focus:text-red-500 focus:bg-red-50 text-xs font-semibold"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Token
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Description */}
                      {token.description && (
                        <p className="text-xs text-grey-600 mb-3 ml-[52px]">{token.description}</p>
                      )}

                      {/* Scopes and Envs - inline */}
                      {(token.scope.length > 0 || token.envs.length > 0) && (
                        <div className="flex items-center gap-4 ml-[52px] flex-wrap">
                          {/* Scope badges */}
                          {token.scope.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-grey-500 uppercase font-medium">Scope:</span>
                              {token.scope.slice(0, 3).map((scope) => (
                                <Badge
                                  key={scope}
                                  variant="secondary"
                                  className="bg-grey-100 text-grey-600 text-[10px] font-normal px-1.5 py-0"
                                >
                                  {scope}
                                </Badge>
                              ))}
                              {token.scope.length > 3 && (
                                <span className="text-[10px] text-grey-400">+{token.scope.length - 3}</span>
                              )}
                            </div>
                          )}

                          {/* Env badges */}
                          {token.envs.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-grey-500 uppercase font-medium">Envs:</span>
                              {token.envs.map((env) => (
                                <Badge
                                  key={env}
                                  className="bg-primary/10 text-primary text-[10px] font-normal px-1.5 py-0"
                                >
                                  {env}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Create Token Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) {
          setSelectedProductId("");
          setSelectedProductDetails(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-grey">Create New Token</DialogTitle>
            <DialogDescription>
              Create a new API token for accessing your workspace resources
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="token-name">Token Key *</Label>
              <Input
                id="token-name"
                placeholder="e.g., production_api_key"
                value={newToken.name}
                onChange={(e) => {
                  // Convert spaces and special characters to underscores
                  // Allow alphanumeric characters and underscores only
                  const rawValue = e.target.value;

                  let value = rawValue
                    .replace(/[^a-zA-Z0-9_\s]+/g, "") // Remove special chars but keep spaces and underscores
                    .replace(/\s+/g, "_") // Convert all spaces to underscores
                    .replace(/_+/g, "_") // Collapse multiple consecutive underscores into one
                    .replace(/^_+/, "") // Remove leading underscores
                    .slice(0, 50); // Limit to 50 characters

                  // Auto-fill description if it's empty or still the auto-generated one
                  const shouldUpdateDescription =
                    !newToken.description ||
                    newToken.description.startsWith("Token for ");

                  setNewToken({
                    ...newToken,
                    name: value,
                    description:
                      shouldUpdateDescription && value
                        ? `Token for ${value}`
                        : newToken.description,
                  });
                }}
              />
              <p className="text-xs text-grey-600">
                Use only letters, numbers, and underscores (no spaces)
              </p>
            </div>

            <div className="space-y-2">
              <MarkdownEditor
                value={newToken.description}
                onChange={(e) =>
                  setNewToken({ ...newToken, description: e })
                }
                placeholder="Optional description for this token"
                label="Description *"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="token-type">Token Type *</Label>
              <Select
                value={newToken.token_type}
                onValueChange={(value) =>
                  setNewToken({
                    ...newToken,
                    token_type: value as Token["token_type"],
                  })
                }
              >
                <SelectTrigger id="token-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credential">Credential</SelectItem>
                  <SelectItem value="api">API Token</SelectItem>
                  <SelectItem value="bearer">Bearer Token</SelectItem>
                  <SelectItem value="oauth">OAuth Token</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Expires In (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Duration"
                  value={newToken.expiryDuration}
                  onChange={(e) =>
                    setNewToken({ ...newToken, expiryDuration: e.target.value })
                  }
                  className="w-24"
                  min="1"
                />
                <Select
                  value={newToken.expiryPeriod}
                  onValueChange={(value) =>
                    setNewToken({ ...newToken, expiryPeriod: value as ExpiryPeriod })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="weeks">Weeks</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                    <SelectItem value="years">Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-grey-600">
                Leave empty for no expiration
              </p>
            </div>

            <div className="space-y-4">
              <Label>Scope *</Label>
              <p className="text-xs text-grey-600 -mt-2">
                Select a product and then choose which resources this token can access
              </p>

              {/* Product Selection */}
              <div className="space-y-2">
                <Label className="text-xs text-grey-500">Product</Label>
                <Select
                  value={selectedProductId}
                  onValueChange={(value) => {
                    setSelectedProductId(value);
                    // Clear scopes when product changes
                    setNewToken({ ...newToken, scope: [] });
                    // Fetch full product details including apps
                    fetchProductDetails(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingProducts ? "Loading products..." : "Select a product"} />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product._id} value={product._id || ""}>
                        {product.name || product.tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Resource/App Selection */}
              {selectedProductId && (
                <div className="space-y-2">
                  <Label className="text-xs text-grey-500">Resources & Apps</Label>
                  {loadingProductDetails ? (
                    <div className="flex items-center gap-2 text-sm text-grey-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading resources...
                    </div>
                  ) : availableResources.length > 0 ? (
                    <div className="flex gap-2 flex-wrap">
                      {availableResources.map((resource) => (
                        <button
                          key={resource.tag}
                          onClick={() => {
                            const scopeValue = `${selectedProductDetails?.tag}:${resource.tag}`;
                            const newScope = newToken.scope.includes(scopeValue)
                              ? newToken.scope.filter((s) => s !== scopeValue)
                              : [...newToken.scope, scopeValue];
                            setNewToken({ ...newToken, scope: newScope });
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5",
                            newToken.scope.includes(`${selectedProductDetails?.tag}:${resource.tag}`)
                              ? "bg-primary text-white"
                              : "bg-grey-100 text-grey-600 hover:bg-grey-200"
                          )}
                        >
                          <span className="text-[10px] uppercase opacity-70">{resource.type}</span>
                          {resource.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-grey-500 italic">
                      No apps found in this product. Add apps to define scopes.
                    </p>
                  )}
                </div>
              )}

              {/* Selected Scopes Display */}
              {newToken.scope.length > 0 && (
                <div className="bg-grey-50 rounded-lg p-3 border border-grey-200">
                  <p className="text-xs text-grey-500 mb-2">Selected scopes:</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {newToken.scope.map((scope) => (
                      <span
                        key={scope}
                        className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1"
                      >
                        {scope}
                        <button
                          onClick={() => {
                            setNewToken({
                              ...newToken,
                              scope: newToken.scope.filter((s) => s !== scope),
                            });
                          }}
                          className="hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Environments</Label>
              <p className="text-xs text-grey-600">
                Select which environments this token can access
              </p>
              <div className="flex gap-2 flex-wrap">
                {currentWorkspace?.defaultEnvs?.map((env) => (
                  <button
                    key={env.slug}
                    onClick={() => {
                      const newEnvs = newToken.envs.includes(env.slug)
                        ? newToken.envs.filter((e) => e !== env.slug)
                        : [...newToken.envs, env.slug];
                      setNewToken({ ...newToken, envs: newEnvs });
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                      newToken.envs.includes(env.slug)
                        ? "bg-primary text-white"
                        : "bg-grey-100 text-grey-600 hover:bg-grey-200"
                    )}
                  >
                    {env.env_name}
                  </button>
                )) || (
                  <p className="text-sm text-grey-600">
                    No environments configured
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateToken}
              disabled={
                !newToken.name || newToken.scope.length === 0 || loading
              }
            >
              {loading ? "Creating..." : "Create Token"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Token Created Dialog */}
      <Dialog open={showNewTokenDialog} onOpenChange={setShowNewTokenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-grey">
              Token Created Successfully!
            </DialogTitle>
            <DialogDescription>
              Make sure to copy your token now. You won't be able to see it
              again!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-grey-100 rounded-lg border border-grey-400">
              <code className="text-sm font-mono text-grey break-all">
                {createdToken}
              </code>
            </div>
            <Button
              onClick={() => handleCopyToken(createdToken)}
              className="w-full gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy Token
            </Button>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowNewTokenDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OTP Verification Dialog */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-grey">
              Enter OTP
            </DialogTitle>
            <DialogDescription className="text-sm text-grey-600 pt-2">
              We sent a six-digit pin to your email address. Check your email
              and enter the code below
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* OTP Input */}
            <div className="flex gap-2 justify-between">
              {otpValues.map((value, index) => (
                <Input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={value}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-12 h-12 text-center text-lg font-semibold"
                />
              ))}
            </div>

            {/* Verify Button */}
            <Button
              onClick={handleVerifyOtp}
              disabled={otpValues.some((v) => !v)}
              className="w-full"
            >
              Verify Code
            </Button>

            {/* Resend Timer */}
            <p className="text-sm text-grey-600 text-center">
              Resend Code in{" "}
              <span className="text-primary font-semibold">
                {formatTime(secondsLeft)}
              </span>
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Revoke/Delete */}
      <Dialog open={showConfirmDialog} onOpenChange={(open) => {
        if (!isConfirmLoading) {
          setShowConfirmDialog(open);
          if (!open) {
            setConfirmInputValue('');
          }
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-grey">
              <AlertTriangle className={cn(
                "h-5 w-5",
                confirmAction === 'delete' ? "text-red-500" : "text-orange-500"
              )} />
              {confirmAction === 'delete' ? 'Delete Token' : 'Revoke Token'}
            </DialogTitle>
            <DialogDescription className="text-sm text-grey-600 pt-2">
              {confirmAction === 'delete' ? (
                <>
                  <strong className="text-red-600">Warning:</strong> Deleting this token is permanent and cannot be undone.
                  Any applications or services using this token will immediately lose access.
                </>
              ) : (
                <>
                  <strong className="text-orange-600">Warning:</strong> Revoking this token will immediately invalidate it.
                  Any applications or services using this token will lose access until a new token is created.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Token Info */}
            <div className="bg-grey-100 rounded-lg p-4 border border-grey-400">
              <p className="text-xs text-grey-600 mb-1">Token Key</p>
              <code className="text-sm font-mono font-semibold text-grey">
                {confirmTokenName}
              </code>
            </div>

            {/* Confirmation Input */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-grey">
                Type <code className="bg-grey-100 px-1.5 py-0.5 rounded font-mono text-xs">{confirmTokenName}</code> to confirm
              </Label>
              <Input
                value={confirmInputValue}
                onChange={(e) => setConfirmInputValue(e.target.value)}
                placeholder="Enter token key to confirm"
                className="font-mono"
                disabled={isConfirmLoading}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmDialog(false);
                  setConfirmInputValue('');
                }}
                disabled={isConfirmLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAction}
                disabled={confirmInputValue !== confirmTokenName || isConfirmLoading}
                className={cn(
                  "gap-2",
                  confirmAction === 'delete'
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-orange-500 hover:bg-orange-600"
                )}
              >
                {isConfirmLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {confirmAction === 'delete' ? 'Deleting...' : 'Revoking...'}
                  </>
                ) : (
                  <>
                    {confirmAction === 'delete' ? (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Delete Token
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4" />
                        Revoke Token
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
