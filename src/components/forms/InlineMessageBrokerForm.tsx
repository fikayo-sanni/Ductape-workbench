import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  MessageSquare,
  Save,
  ChevronRight,
  CheckCircle,
  Loader2,
  Upload,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/store/useAuth";
import { useDuctape } from "@/hooks/useDuctape";
import { MessageBrokerTypes } from "@ductape/sdk/dist/types";

interface InlineMessageBrokerFormProps {
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

interface EnvConfig {
  slug: string;
  env_name: string;
  type: string;
  // RabbitMQ
  rabbitmqHost: string;
  rabbitmqPort: string;
  rabbitmqUsername: string;
  rabbitmqPassword: string;
  rabbitmqQueue: string;
  rabbitmqRoutingKey: string;
  // Redis
  redisHost: string;
  redisPort: string;
  redisPassword: string;
  // AWS SQS
  awsRegion: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  // Kafka
  kafkaBrokers: string;
  kafkaClientId: string;
  kafkaGroupId: string;
  kafkaSsl: boolean;
  kafkaSaslMechanism: string;
  kafkaSaslUsername: string;
  kafkaSaslPassword: string;
  // Google Pub/Sub
  gcpProjectId: string;
  gcpConfigType: string;
  gcpConfigProjectId: string;
  gcpPrivateKeyId: string;
  gcpPrivateKey: string;
  gcpClientEmail: string;
  gcpClientId: string;
  gcpAuthUri: string;
  gcpTokenUri: string;
  gcpAuthProviderX509CertUrl: string;
  gcpClientX509CertUrl: string;
  gcpUniverseDomain: string;
}

export default function InlineMessageBrokerForm({
  product,
  onCancel,
  onSuccess,
}: InlineMessageBrokerFormProps) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    tag: "",
  });

  const [showEnvs, setShowEnvs] = useState(false);
  const [envConfigs, setEnvConfigs] = useState<EnvConfig[]>([]);
  const [passwordVisibility, setPasswordVisibility] = useState<Record<string, boolean>>({});

  // Initialize Ductape SDK
  const ductape = useDuctape({
    workspace_id: product?.workspace_id || currentWorkspaceId || "",
    user_id: user?._id || "",
    token: user?.auth_token || "",
    public_key: user?.public_key || "",
    type: "product",
  }) as any;

  // Initialize environment configs when product is loaded
  useEffect(() => {
    if (product?.envs && envConfigs.length === 0) {
      const configs: EnvConfig[] = product.envs.map((env: any) => ({
        slug: env.slug,
        env_name: env.name || env.env_name || env.slug,
        type: "",
        rabbitmqHost: "",
        rabbitmqPort: "5672",
        rabbitmqUsername: "",
        rabbitmqPassword: "",
        rabbitmqQueue: "",
        rabbitmqRoutingKey: "",
        redisHost: "",
        redisPort: "6379",
        redisPassword: "",
        awsRegion: "",
        awsAccessKeyId: "",
        awsSecretAccessKey: "",
        kafkaBrokers: "",
        kafkaClientId: "",
        kafkaGroupId: "",
        kafkaSsl: false,
        kafkaSaslMechanism: "",
        kafkaSaslUsername: "",
        kafkaSaslPassword: "",
        gcpProjectId: "",
        gcpConfigType: "service_account",
        gcpConfigProjectId: "",
        gcpPrivateKeyId: "",
        gcpPrivateKey: "",
        gcpClientEmail: "",
        gcpClientId: "",
        gcpAuthUri: "https://accounts.google.com/o/oauth2/auth",
        gcpTokenUri: "https://oauth2.googleapis.com/token",
        gcpAuthProviderX509CertUrl: "https://www.googleapis.com/oauth2/v1/certs",
        gcpClientX509CertUrl: "",
        gcpUniverseDomain: "googleapis.com",
      }));
      setEnvConfigs(configs);
    }
  }, [product?.envs]);

  const handleNameChange = (value: string) => {
    const sanitizedValue = value.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
    setFormData({ name: value, tag: sanitizedValue });
  };

  const handleContinue = () => {
    if (!formData.name.trim() || !formData.tag.trim()) {
      toast.error("Please fill in name and tag");
      return;
    }
    setShowEnvs(true);
  };

  const updateEnvConfig = (index: number, field: string, value: string | boolean) => {
    const updated = [...envConfigs];
    updated[index] = { ...updated[index], [field]: value };
    setEnvConfigs(updated);
  };

  const togglePasswordVisibility = (key: string) => {
    setPasswordVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleUploadServiceAccount = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const updated = [...envConfigs];
        updated[index] = {
          ...updated[index],
          gcpConfigType: json.type || "service_account",
          gcpConfigProjectId: json.project_id || "",
          gcpPrivateKeyId: json.private_key_id || "",
          gcpPrivateKey: json.private_key || "",
          gcpClientEmail: json.client_email || "",
          gcpClientId: json.client_id || "",
          gcpAuthUri: json.auth_uri || "https://accounts.google.com/o/oauth2/auth",
          gcpTokenUri: json.token_uri || "https://oauth2.googleapis.com/token",
          gcpAuthProviderX509CertUrl: json.auth_provider_x509_cert_url || "https://www.googleapis.com/oauth2/v1/certs",
          gcpClientX509CertUrl: json.client_x509_cert_url || "",
          gcpUniverseDomain: json.universe_domain || "googleapis.com",
        };
        setEnvConfigs(updated);
        toast.success("Service account JSON uploaded successfully");
      } catch (error) {
        toast.error("Failed to parse service account JSON file");
      }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = "";
  };

  const buildConfigForType = (env: EnvConfig) => {
    switch (env.type) {
      case "RABBITMQ":
        return {
          host: env.rabbitmqHost,
          port: parseInt(env.rabbitmqPort) || 5672,
          username: env.rabbitmqUsername,
          password: env.rabbitmqPassword,
          queue: env.rabbitmqQueue,
          routingKey: env.rabbitmqRoutingKey,
        };
      case "REDIS":
        return {
          host: env.redisHost,
          port: parseInt(env.redisPort) || 6379,
          password: env.redisPassword || undefined,
        };
      case "AWS_SQS":
        return {
          region: env.awsRegion,
          accessKeyId: env.awsAccessKeyId,
          secretAccessKey: env.awsSecretAccessKey,
        };
      case "KAFKA":
        return {
          brokers: env.kafkaBrokers.split(",").map((b) => b.trim()).filter(Boolean),
          clientId: env.kafkaClientId,
          groupId: env.kafkaGroupId,
          ssl: env.kafkaSsl,
          sasl: env.kafkaSaslMechanism
            ? {
                mechanism: env.kafkaSaslMechanism,
                username: env.kafkaSaslUsername,
                password: env.kafkaSaslPassword,
              }
            : undefined,
        };
      case "GOOGLE_PUBSUB":
        return {
          projectId: env.gcpProjectId,
          credentials: {
            project_id: env.gcpProjectId,
            private_key_id: env.gcpPrivateKeyId,
            private_key: env.gcpPrivateKey,
            client_email: env.gcpClientEmail,
            client_id: env.gcpClientId,
            auth_uri: env.gcpAuthUri,
            token_uri: env.gcpTokenUri,
            auth_provider_x509_cert_url: env.gcpAuthProviderX509CertUrl,
            client_x509_cert_url: env.gcpClientX509CertUrl,
            universe_domain: env.gcpUniverseDomain,
          },
        };
      default:
        return {};
    }
  };

  const { mutateAsync: createMessageBroker, isPending: isCreating } = useMutation({
    mutationFn: async (values: { name: string; tag: string; envs: EnvConfig[] }) => {
      if (!ductape) throw new Error("Product not initialized");
      if (!product?.tag) throw new Error("Product tag not found");

      await ductape.init(product.tag);

      const payload = {
        name: values.name,
        tag: values.tag,
        envs: values.envs.map((env) => ({
          slug: env.slug,
          type: env.type.toLowerCase() as MessageBrokerTypes,
          config: buildConfigForType(env),
        })),
      };

      const messageBroker = await ductape.messageBrokers.create(payload);
      return messageBroker;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messageBrokers"] });
      queryClient.invalidateQueries({ queryKey: ["products", currentWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ["product", product._id] });

      toast.success("Message broker created successfully");
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create message broker");
    },
  });

  const handleSave = async () => {
    const hasConfiguredEnv = envConfigs.some((env) => env.type.trim());
    if (!hasConfiguredEnv) {
      toast.error("Please configure at least one environment");
      return;
    }

    await createMessageBroker({
      name: formData.name,
      tag: formData.tag,
      envs: envConfigs.filter((env) => env.type.trim()),
    });
  };

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
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New Messaging</h1>
              <p className="text-sm text-grey-600">Adding to {product.name}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="required">Broker Name</Label>
              <Input
                id="name"
                placeholder="e.g., Production Messaging"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-grey-600 mt-1">A friendly name for this messaging configuration</p>
            </div>

            <div>
              <Label htmlFor="tag" className="required">Tag</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="tag"
                  placeholder="e.g., production-broker"
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                />
                <Button variant="outline" onClick={() => handleNameChange(formData.name)} size="sm">
                  Auto-generate
                </Button>
              </div>
              <p className="text-xs text-grey-600 mt-1">Unique identifier (auto-generated from name)</p>
            </div>

            {!showEnvs && (
              <Button onClick={handleContinue} className="gap-2">
                Continue to Environment Configuration
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Environment Configurations */}
          {showEnvs && (
            <div className="space-y-6 pt-6 border-t border-grey-400">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-grey">Environment Configuration</h3>
                <p className="text-sm text-grey-600">Configure messaging for each environment</p>
              </div>

              {envConfigs.map((env, index) => (
                <div key={env.slug} className="border border-grey-400 rounded-lg p-6 space-y-4 bg-grey-50">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-grey-400">
                    <div>
                      <h4 className="font-semibold text-grey">{env.env_name}</h4>
                      <p className="text-xs text-grey-600 mt-1">Slug: {env.slug}</p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`type-${index}`} className="required">Broker Type</Label>
                    <Select value={env.type} onValueChange={(value) => updateEnvConfig(index, "type", value)}>
                      <SelectTrigger id={`type-${index}`} className="mt-2">
                        <SelectValue placeholder="Select messaging type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RABBITMQ">RabbitMQ</SelectItem>
                        <SelectItem value="REDIS">Redis Pub/Sub</SelectItem>
                        <SelectItem value="AWS_SQS">AWS SQS</SelectItem>
                        <SelectItem value="KAFKA">Apache Kafka</SelectItem>
                        <SelectItem value="GOOGLE_PUBSUB">Google Pub/Sub</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* RabbitMQ Configuration */}
                  {env.type === "RABBITMQ" && (
                    <div className="space-y-4 pt-4 border-t border-grey-300">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`rabbitmqHost-${index}`} className="required">Host</Label>
                          <Input
                            id={`rabbitmqHost-${index}`}
                            placeholder="rabbitmq.yourdomain.com"
                            value={env.rabbitmqHost}
                            onChange={(e) => updateEnvConfig(index, "rabbitmqHost", e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`rabbitmqPort-${index}`} className="required">Port</Label>
                          <Input
                            id={`rabbitmqPort-${index}`}
                            placeholder="5672"
                            value={env.rabbitmqPort}
                            onChange={(e) => updateEnvConfig(index, "rabbitmqPort", e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`rabbitmqUsername-${index}`} className="required">Username</Label>
                          <Input
                            id={`rabbitmqUsername-${index}`}
                            placeholder="rabbitmq-user"
                            value={env.rabbitmqUsername}
                            onChange={(e) => updateEnvConfig(index, "rabbitmqUsername", e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`rabbitmqPassword-${index}`} className="required">Password</Label>
                          <div className="relative">
                            <Input
                              id={`rabbitmqPassword-${index}`}
                              type={passwordVisibility[`${index}-rabbitmqPassword`] ? "text" : "password"}
                              placeholder="••••••••"
                              value={env.rabbitmqPassword}
                              onChange={(e) => updateEnvConfig(index, "rabbitmqPassword", e.target.value)}
                              className="mt-2 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(`${index}-rabbitmqPassword`)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey mt-1"
                            >
                              {passwordVisibility[`${index}-rabbitmqPassword`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor={`rabbitmqQueue-${index}`} className="required">Queue</Label>
                        <Input
                          id={`rabbitmqQueue-${index}`}
                          placeholder="my-queue"
                          value={env.rabbitmqQueue}
                          onChange={(e) => updateEnvConfig(index, "rabbitmqQueue", e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`rabbitmqRoutingKey-${index}`} className="required">Routing Key</Label>
                        <Input
                          id={`rabbitmqRoutingKey-${index}`}
                          placeholder="my-routing-key"
                          value={env.rabbitmqRoutingKey}
                          onChange={(e) => updateEnvConfig(index, "rabbitmqRoutingKey", e.target.value)}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  )}

                  {/* Redis Configuration */}
                  {env.type === "REDIS" && (
                    <div className="space-y-4 pt-4 border-t border-grey-300">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`redisHost-${index}`} className="required">Host</Label>
                          <Input
                            id={`redisHost-${index}`}
                            placeholder="redis.yourdomain.com"
                            value={env.redisHost}
                            onChange={(e) => updateEnvConfig(index, "redisHost", e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`redisPort-${index}`} className="required">Port</Label>
                          <Input
                            id={`redisPort-${index}`}
                            placeholder="6379"
                            value={env.redisPort}
                            onChange={(e) => updateEnvConfig(index, "redisPort", e.target.value)}
                            className="mt-2"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor={`redisPassword-${index}`}>Password (Optional)</Label>
                        <div className="relative">
                          <Input
                            id={`redisPassword-${index}`}
                            type={passwordVisibility[`${index}-redisPassword`] ? "text" : "password"}
                            placeholder="••••••••"
                            value={env.redisPassword}
                            onChange={(e) => updateEnvConfig(index, "redisPassword", e.target.value)}
                            className="mt-2 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(`${index}-redisPassword`)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey mt-1"
                          >
                            {passwordVisibility[`${index}-redisPassword`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AWS SQS Configuration */}
                  {env.type === "AWS_SQS" && (
                    <div className="space-y-4 pt-4 border-t border-grey-300">
                      <div>
                        <Label htmlFor={`awsRegion-${index}`} className="required">Region</Label>
                        <Input
                          id={`awsRegion-${index}`}
                          placeholder="us-east-1"
                          value={env.awsRegion}
                          onChange={(e) => updateEnvConfig(index, "awsRegion", e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`awsAccessKeyId-${index}`} className="required">Access Key ID</Label>
                        <Input
                          id={`awsAccessKeyId-${index}`}
                          placeholder="your-access-key-id"
                          value={env.awsAccessKeyId}
                          onChange={(e) => updateEnvConfig(index, "awsAccessKeyId", e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`awsSecretAccessKey-${index}`} className="required">Secret Access Key</Label>
                        <div className="relative">
                          <Input
                            id={`awsSecretAccessKey-${index}`}
                            type={passwordVisibility[`${index}-awsSecretAccessKey`] ? "text" : "password"}
                            placeholder="your-secret-access-key"
                            value={env.awsSecretAccessKey}
                            onChange={(e) => updateEnvConfig(index, "awsSecretAccessKey", e.target.value)}
                            className="mt-2 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(`${index}-awsSecretAccessKey`)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey mt-1"
                          >
                            {passwordVisibility[`${index}-awsSecretAccessKey`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Kafka Configuration */}
                  {env.type === "KAFKA" && (
                    <div className="space-y-4 pt-4 border-t border-grey-300">
                      <div>
                        <Label htmlFor={`kafkaBrokers-${index}`} className="required">Brokers (comma-separated)</Label>
                        <Input
                          id={`kafkaBrokers-${index}`}
                          placeholder="kafka-broker1:9092,kafka-broker2:9092"
                          value={env.kafkaBrokers}
                          onChange={(e) => updateEnvConfig(index, "kafkaBrokers", e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`kafkaClientId-${index}`} className="required">Client ID</Label>
                          <Input
                            id={`kafkaClientId-${index}`}
                            placeholder="my-app"
                            value={env.kafkaClientId}
                            onChange={(e) => updateEnvConfig(index, "kafkaClientId", e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`kafkaGroupId-${index}`} className="required">Group ID</Label>
                          <Input
                            id={`kafkaGroupId-${index}`}
                            placeholder="my-consumer-group"
                            value={env.kafkaGroupId}
                            onChange={(e) => updateEnvConfig(index, "kafkaGroupId", e.target.value)}
                            className="mt-2"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-4 border rounded-lg">
                        <input
                          type="checkbox"
                          id={`kafkaSsl-${index}`}
                          checked={env.kafkaSsl}
                          onChange={(e) => updateEnvConfig(index, "kafkaSsl", e.target.checked)}
                          className="h-4 w-4"
                        />
                        <div>
                          <Label htmlFor={`kafkaSsl-${index}`} className="font-medium">Enable SSL</Label>
                          <p className="text-xs text-grey-600">Enable SSL for secure communication</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Google Pub/Sub Configuration */}
                  {env.type === "GOOGLE_PUBSUB" && (
                    <div className="space-y-4 pt-4 border-t border-grey-300">
                      <div>
                        <Label htmlFor={`gcpProjectId-${index}`} className="required">Project ID</Label>
                        <Input
                          id={`gcpProjectId-${index}`}
                          placeholder="your-gcp-project-id"
                          value={env.gcpProjectId}
                          onChange={(e) => updateEnvConfig(index, "gcpProjectId", e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-grey">Service Account Configuration</h5>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            ref={fileInputRef}
                            accept=".json"
                            onChange={(e) => handleUploadServiceAccount(index, e)}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            Service Account JSON
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`gcpClientEmail-${index}`} className="required">Client Email</Label>
                          <Input
                            id={`gcpClientEmail-${index}`}
                            placeholder="your-service-account@your-project-id.iam.gserviceaccount.com"
                            value={env.gcpClientEmail}
                            onChange={(e) => updateEnvConfig(index, "gcpClientEmail", e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`gcpClientId-${index}`} className="required">Client ID</Label>
                          <Input
                            id={`gcpClientId-${index}`}
                            placeholder="123456789012345678901"
                            value={env.gcpClientId}
                            onChange={(e) => updateEnvConfig(index, "gcpClientId", e.target.value)}
                            className="mt-2"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor={`gcpPrivateKey-${index}`} className="required">Private Key</Label>
                        <Textarea
                          id={`gcpPrivateKey-${index}`}
                          placeholder="-----BEGIN PRIVATE KEY-----&#10;...your private key...&#10;-----END PRIVATE KEY-----"
                          value={env.gcpPrivateKey}
                          onChange={(e) => updateEnvConfig(index, "gcpPrivateKey", e.target.value)}
                          className="mt-2 min-h-[100px]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleSave} disabled={isCreating} className="gap-2">
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Create Messaging
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
