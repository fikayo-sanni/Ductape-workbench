import { useState, useEffect } from "react";
import { Key, Plus, Copy, Eye, EyeOff, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/useAuth";
import toast from "react-hot-toast";
import tokensServices from "@/services/tokensServices";

interface Token {
  name: string;
  token?: string; // Only available on creation
  encrypted_token?: string;
  token_type: "api" | "access";
  scope: string[];
  expires_in?: number | null;
  envs: string[];
  created_at: Date | string;
  last_used?: Date | string | null;
  is_active: boolean;
  description?: string;
}

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
    token_type: "api" as Token["token_type"],
    scope: [] as string[],
    expires_in: "365",
    envs: [] as string[],
  });

  // Workspace Credentials State
  const [workspaceCredentials, setWorkspaceCredentials] = useState([
    {
      key: 'workspace_id',
      name: 'Workspace ID',
      description: 'Unique identifier for your Ductape workspace',
      value: '**************************************',
    },
    {
      key: 'user_id',
      name: 'User ID',
      description: 'Unique identifier for your user account within your Ductape workspace',
      value: '**************************************',
    },
    {
      key: 'private_key',
      name: 'Private Key',
      description: 'Secure key used for authenticating requests and accessing Ductape services. Please keep confidential and do not share with anyone.',
      value: '**************************************',
    },
  ]);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [visibleCredentials, setVisibleCredentials] = useState<{ [key: number]: boolean }>({});
  const [secondsLeft, setSecondsLeft] = useState(60);

  // Get current workspace data
  const currentWorkspace = user?.workspaces?.find(
    (ws: any) =>
      ws.workspace_id === currentWorkspaceId || ws._id === currentWorkspaceId
  );

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    // Could add toast notification here
  };

  // Fetch tokens on mount
  useEffect(() => {
    if (currentWorkspaceId) {
      fetchTokens();
    }
  }, [currentWorkspaceId]);

  const fetchTokens = async () => {
    if (!currentWorkspaceId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspaceId}/tokens`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      const data = await response.json();
      if (data.status) {
        setTokens(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch tokens:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateTokenName = (name: string): boolean => {
    // Only allow alphanumeric characters and underscores
    const tagPattern = /^[a-zA-Z0-9_]+$/;
    return tagPattern.test(name);
  };

  const handleCreateToken = async () => {
    if (!currentWorkspaceId) return;

    // Validate token name format
    if (!validateTokenName(newToken.name)) {
      alert(
        "Token name must only contain letters, numbers, and underscores (no spaces or special characters)"
      );
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: newToken.name,
        description: newToken.description,
        token_type: newToken.token_type,
        scope: newToken.scope,
        expires_in:
          newToken.expires_in === "never"
            ? null
            : parseInt(newToken.expires_in),
        envs: newToken.envs,
      };

      const response = await fetch(
        `/api/workspaces/${currentWorkspaceId}/tokens`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (data.status) {
        // Show the newly created token (only time it's visible)
        setCreatedToken(data.data.token);
        setShowNewTokenDialog(true);

        // Refresh tokens list
        await fetchTokens();

        setShowCreateDialog(false);
        setNewToken({
          name: "",
          description: "",
          token_type: "api",
          scope: [],
          expires_in: "365",
          envs: [],
        });
      }
    } catch (error) {
      console.error("Failed to create token:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeToken = async (tokenName: string) => {
    if (!currentWorkspaceId) return;

    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspaceId}/tokens/${tokenName}/revoke`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      const data = await response.json();
      if (data.status) {
        await fetchTokens();
      }
    } catch (error) {
      console.error("Failed to revoke token:", error);
    }
  };

  const handleDeleteToken = async (tokenName: string) => {
    if (!currentWorkspaceId) return;

    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspaceId}/tokens/${tokenName}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      const data = await response.json();
      if (data.status) {
        await fetchTokens();
      }
    } catch (error) {
      console.error("Failed to delete token:", error);
    }
  };

  const getStatusColor = (is_active: boolean) => {
    return is_active ? "bg-green/10 text-green" : "bg-red-500/10 text-red-500";
  };

  const getStatusText = (is_active: boolean) => {
    return is_active ? "active" : "revoked";
  };

  // Workspace Credentials Handlers
  const copyCredentialToClipboard = (value: string) => {
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success("Credential copied to clipboard!"))
      .catch(() => toast.error("Failed to copy credential."));
  };

  const handleRequestOtp = async () => {
    if (otpSent) {
      setShowOtpDialog(true);
      return;
    }

    try {
      // Call API to send OTP
      await tokensServices.getTwoFA({
        user_id: user?._id ?? '',
        public_key: user?.public_key ?? '',
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
      // Call API to verify OTP and get actual credentials
      const response = await tokensServices.postTwoFA({
        user_id: user?._id ?? '',
        public_key: user?.public_key ?? '',
        token: otp,
      });

      if (response.status && response.data) {
        setWorkspaceCredentials([
          {
            key: 'workspace_id',
            name: 'Workspace ID',
            description: 'Unique identifier for your Ductape workspace',
            value: response.data.workspace_id,
          },
          {
            key: 'user_id',
            name: 'User ID',
            description: 'Unique identifier for your user account within your Ductape workspace',
            value: response.data.user_id,
          },
          {
            key: 'private_key',
            name: 'Private Key',
            description: 'Secure key used for authenticating requests and accessing Ductape services. Please keep confidential and do not share with anyone.',
            value: response.data.private_key,
          },
        ]);

        setVisibleCredentials({ 0: true, 1: true, 2: true });
        setOtpVerified(true);
        setShowOtpDialog(false);
        setOtpValues(['', '', '', '', '', '']);
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
    newOtpValues[index] = value.replace(/\D/, '');
    setOtpValues(newOtpValues);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // OTP Timer Effect
  useEffect(() => {
    if (secondsLeft === 0 || !showOtpDialog) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft, showOtpDialog]);

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Key className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-grey">Tokens & Credentials</h1>
              </div>
              <p className="text-grey-600">
                Manage workspace credentials and tokens for secure access
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Token
            </Button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Workspace Credentials (Compact) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-grey-400 shadow-sm overflow-hidden">
              {/* Header with gradient */}
              <div className="px-4 py-3">
                <h2 className="text-base font-semibold text-grey flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Workspace Credentials
                </h2>
                <p className="text-xs mt-1 text-grey">
                  {otpVerified ? "Verified" : "Protected by 2FA"}
                </p>
              </div>

              {/* Info Banner */}
              <div className="bg-primary/5 border-b border-primary/10 px-3 py-2 flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-primary">
                  Essential for SDK initialization
                </p>
              </div>

              {/* Credentials List - Compact */}
              <div className="p-3 space-y-2">
                {workspaceCredentials.map((credential, index) => (
                  <div
                    key={credential.key}
                    className="border border-grey-400 rounded-md overflow-hidden hover:border-primary/50 transition-colors"
                  >
                    <div className="px-3 py-2 bg-grey-50 flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-grey">
                        {credential.name}
                      </h3>
                      <button
                        onClick={() => copyCredentialToClipboard(credential.value)}
                        className={cn(
                          "transition-colors",
                          visibleCredentials[index]
                            ? "text-grey hover:text-grey-600"
                            : "text-grey-400 cursor-not-allowed"
                        )}
                        disabled={!visibleCredentials[index]}
                        title="Copy"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center bg-white px-3 py-2 border-t border-grey-400">
                      <p className="text-xs font-mono text-grey font-medium flex-1 truncate">
                        {visibleCredentials[index]
                          ? credential.value
                          : "•".repeat(Math.min(credential.value.length, 24))}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Single Eye Toggle Button */}
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => {
                      // Check if all 3 credentials are visible
                      const allVisible = visibleCredentials[0] && visibleCredentials[1] && visibleCredentials[2];

                      if (allVisible) {
                        // Hide all
                        setVisibleCredentials({});
                      } else {
                        // Show all (trigger OTP if not verified)
                        if (!otpVerified) {
                          handleRequestOtp();
                        } else {
                          // If already verified, just show all
                          setVisibleCredentials({ 0: true, 1: true, 2: true });
                        }
                      }
                    }}
                    className="text-grey-600 hover:text-grey transition-colors flex items-center gap-1.5 text-xs"
                    title={(visibleCredentials[0] && visibleCredentials[1] && visibleCredentials[2]) ? "Hide All" : "Show All"}
                  >
                    {(visibleCredentials[0] && visibleCredentials[1] && visibleCredentials[2]) ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        <span>Hide All</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        <span>Show All</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - API Tokens */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                    <Key className="h-5 w-5 text-green" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-grey">
                      {tokens.filter((t) => t.is_active).length}
                    </p>
                    <p className="text-sm text-grey-600">Active</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Key className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-grey">{tokens.length}</p>
                    <p className="text-sm text-grey-600">Total</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Trash2 className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-grey">
                      {tokens.filter((t) => !t.is_active).length}
                    </p>
                    <p className="text-sm text-grey-600">Revoked</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tokens List */}
            <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-grey mb-4">API Tokens</h2>
              {loading ? (
                <div className="text-center py-8 text-grey-600">
                  Loading tokens...
                </div>
              ) : tokens.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-grey-100 flex items-center justify-center mx-auto mb-4">
                    <Key className="h-8 w-8 text-grey-400" />
                  </div>
                  <p className="text-grey-600 font-medium mb-1">No tokens yet</p>
                  <p className="text-sm text-grey-500">
                    Create your first token to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tokens.map((token) => (
                    <div
                      key={token.name}
                      className="p-4 rounded-lg border border-grey-400 hover:border-primary transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-sm font-semibold text-grey">
                              {token.name}
                            </h3>
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-xs font-medium",
                                getStatusColor(token.is_active)
                              )}
                            >
                              {getStatusText(token.is_active)}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                              {token.token_type}
                            </span>
                          </div>

                          {token.description && (
                            <p className="text-xs text-grey-600 mb-2">
                              {token.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-grey-600 flex-wrap">
                            <span>Scope: {token.scope.join(", ") || "None"}</span>
                            {token.envs.length > 0 && (
                              <>
                                <span>•</span>
                                <span>Envs: {token.envs.join(", ")}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>
                              Created:{" "}
                              {new Date(token.created_at).toLocaleDateString()}
                            </span>
                            {token.expires_in && (
                              <>
                                <span>•</span>
                                <span>Expires in: {token.expires_in} days</span>
                              </>
                            )}
                            {token.last_used && (
                              <>
                                <span>•</span>
                                <span>
                                  Last used:{" "}
                                  {new Date(token.last_used).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {token.is_active && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRevokeToken(token.name)}
                              className="text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                            >
                              Revoke
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteToken(token.name)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Token Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className='text-grey'>Create New Token</DialogTitle>
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
                    description: shouldUpdateDescription && value
                      ? `Token for ${value}`
                      : newToken.description
                  });
                }}
              />
              <p className="text-xs text-grey-600">
                Use only letters, numbers, and underscores (no spaces)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="token-description">Description</Label>
              <Textarea
                id="token-description"
                placeholder="Optional description for this token"
                value={newToken.description}
                onChange={(e) =>
                  setNewToken({ ...newToken, description: e.target.value })
                }
                rows={2}
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
                  <SelectItem value="api">API Token</SelectItem>
                  <SelectItem value="access">Bearer Token</SelectItem>
                  <SelectItem value="access">OAuth Token</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires-in">Expires In</Label>
              <Select
                value={newToken.expires_in}
                onValueChange={(value) =>
                  setNewToken({ ...newToken, expires_in: value })
                }
              >
                <SelectTrigger id="expires-in">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Scope *</Label>
              <div className="flex gap-2 flex-wrap">
                {["read", "write", "delete", "admin"].map((scope) => (
                  <button
                    key={scope}
                    onClick={() => {
                      const newScope = newToken.scope.includes(scope)
                        ? newToken.scope.filter((s) => s !== scope)
                        : [...newToken.scope, scope];
                      setNewToken({ ...newToken, scope: newScope });
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                      newToken.scope.includes(scope)
                        ? "bg-primary text-white"
                        : "bg-grey-100 text-grey-600 hover:bg-grey-200"
                    )}
                  >
                    {scope}
                  </button>
                ))}
              </div>
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
            <DialogTitle className='text-grey'>Token Created Successfully!</DialogTitle>
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
    </div>
  );
}
