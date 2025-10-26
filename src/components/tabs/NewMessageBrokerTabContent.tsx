import { useState, useEffect } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Save, ChevronRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import { useDuctape } from '@/hooks/useDuctape';
import { MessageBrokerTypes } from '@ductape/sdk/dist/types';

interface NewMessageBrokerTabContentProps {
  tabId: string;
  data?: any;
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
  rabbitmqExchange: string;
  rabbitmqQueue: string;
  rabbitmqRoutingKey: string;
  // Redis
  redisHost: string;
  redisPort: string;
  redisChannel: string;
  redisPassword: string;
  // AWS SQS
  awsRegion: string;
  awsQueueUrl: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  // Kafka
  kafkaBrokers: string; // comma-separated
  kafkaClientId: string;
  kafkaGroupId: string;
  kafkaTopic: string;
  kafkaSsl: boolean;
  kafkaSaslMechanism: string;
  kafkaSaslUsername: string;
  kafkaSaslPassword: string;
  // Google Pub/Sub
  gcpProjectId: string;
  gcpTopicName: string;
  gcpSubscriptionName: string;
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

export default function NewMessageBrokerTabContent({ tabId, data }: NewMessageBrokerTabContentProps) {
  const { closeTab, openTab } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  // Extract product context from data
  const product = data?.productId ? {
    _id: data.productId,
    name: data.productName,
    tag: data.productTag,
    logo: data.productLogo,
    envs: data.productEnvs || [],
    workspace_id: data.workspaceId || currentWorkspaceId
  } : null;

  const [formData, setFormData] = useState({
    name: '',
    tag: '',
  });

  const [showEnvs, setShowEnvs] = useState(false);
  const [envConfigs, setEnvConfigs] = useState<EnvConfig[]>([]);

  // Initialize Ductape SDK
  const ductape = useDuctape({
    workspace_id: product?.workspace_id || currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product',
  }) as any;

  // Initialize environment configs when product is loaded
  useEffect(() => {
    if (product?.envs && envConfigs.length === 0) {
      const configs: EnvConfig[] = product.envs.map((env: any) => ({
        slug: env.slug,
        env_name: env.env_name || env.name,
        type: '',
        // RabbitMQ defaults
        rabbitmqHost: '',
        rabbitmqPort: '5672',
        rabbitmqUsername: '',
        rabbitmqPassword: '',
        rabbitmqExchange: '',
        rabbitmqQueue: '',
        rabbitmqRoutingKey: '',
        // Redis defaults
        redisHost: '',
        redisPort: '6379',
        redisChannel: '',
        redisPassword: '',
        // AWS SQS defaults
        awsRegion: '',
        awsQueueUrl: '',
        awsAccessKeyId: '',
        awsSecretAccessKey: '',
        // Kafka defaults
        kafkaBrokers: '',
        kafkaClientId: '',
        kafkaGroupId: '',
        kafkaTopic: '',
        kafkaSsl: false,
        kafkaSaslMechanism: '',
        kafkaSaslUsername: '',
        kafkaSaslPassword: '',
        // Google Pub/Sub defaults
        gcpProjectId: '',
        gcpTopicName: '',
        gcpSubscriptionName: '',
        gcpConfigType: 'service_account',
        gcpConfigProjectId: '',
        gcpPrivateKeyId: '',
        gcpPrivateKey: '',
        gcpClientEmail: '',
        gcpClientId: '',
        gcpAuthUri: 'https://accounts.google.com/o/oauth2/auth',
        gcpTokenUri: 'https://oauth2.googleapis.com/token',
        gcpAuthProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
        gcpClientX509CertUrl: '',
        gcpUniverseDomain: 'googleapis.com',
      }));
      setEnvConfigs(configs);
    }
  }, [product, envConfigs.length]);

  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value });
    // Auto-generate tag
    if (value && product?.tag) {
      const sanitizedValue = value.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
      setFormData(prev => ({ ...prev, name: value, tag: `${product.tag}:${sanitizedValue}` }));
    }
  };

  const handleContinue = () => {
    if (!formData.name.trim() || !formData.tag.trim()) {
      toast.error('Please fill in name and tag');
      return;
    }
    setShowEnvs(true);
  };

  const updateEnvConfig = (index: number, field: string, value: string | boolean) => {
    const updated = [...envConfigs];
    updated[index] = { ...updated[index], [field]: value };
    setEnvConfigs(updated);
  };

  const buildConfigForType = (env: EnvConfig) => {
    switch (env.type) {
      case 'RABBITMQ':
        return {
          host: env.rabbitmqHost,
          port: parseInt(env.rabbitmqPort) || 5672,
          username: env.rabbitmqUsername,
          password: env.rabbitmqPassword,
          exchange: env.rabbitmqExchange,
          queue: env.rabbitmqQueue,
          routingKey: env.rabbitmqRoutingKey,
        };
      case 'REDIS':
        return {
          host: env.redisHost,
          port: parseInt(env.redisPort) || 6379,
          channel: env.redisChannel,
          password: env.redisPassword || undefined,
        };
      case 'AWS_SQS':
        return {
          region: env.awsRegion,
          queueUrl: env.awsQueueUrl,
          accessKeyId: env.awsAccessKeyId,
          secretAccessKey: env.awsSecretAccessKey,
        };
      case 'KAFKA':
        return {
          brokers: env.kafkaBrokers.split(',').map(b => b.trim()).filter(Boolean),
          clientId: env.kafkaClientId,
          groupId: env.kafkaGroupId,
          topic: env.kafkaTopic,
          ssl: env.kafkaSsl,
          sasl: env.kafkaSaslMechanism ? {
            mechanism: env.kafkaSaslMechanism,
            username: env.kafkaSaslUsername,
            password: env.kafkaSaslPassword,
          } : undefined,
        };
      case 'GOOGLE_PUBSUB':
        return {
          projectId: env.gcpProjectId,
          topicName: env.gcpTopicName,
          subscriptionName: env.gcpSubscriptionName || undefined,
          config: {
            type: env.gcpConfigType,
            project_id: env.gcpConfigProjectId,
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
      if (!ductape) throw new Error('Product not initialized');
      if (!product?.tag) throw new Error('Product tag not found');

      await ductape.init(product.tag);

      const payload = {
        name: values.name,
        tag: values.tag,
        envs: values.envs.map(env => ({
          slug: env.slug,
          type: env.type.toLowerCase() as MessageBrokerTypes,
          config: buildConfigForType(env),
        })),
      };

      const messageBroker = await ductape.messageBrokers.create(payload);
      return messageBroker;
    },
    onSuccess: (messageBroker) => {
      queryClient.invalidateQueries({ queryKey: ['messageBrokers'] });
      closeTab(tabId);
      openTab({
        id: `message-broker-${messageBroker._id}-${Date.now()}`,
        type: 'message-broker',
        title: messageBroker.name,
        itemId: messageBroker._id,
        data: { ...messageBroker, componentType: 'message-broker', productName: product?.name },
      });
      toast.success('Message broker created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create message broker');
    },
  });

  const handleSave = async () => {
    // Validate at least one environment is configured
    const hasConfiguredEnv = envConfigs.some(env => env.type.trim());
    if (!hasConfiguredEnv) {
      toast.error('Please configure at least one environment');
      return;
    }

    await createMessageBroker({
      name: formData.name,
      tag: formData.tag,
      envs: envConfigs.filter(env => env.type.trim()),
    });
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Product Context Header */}
        {product && (
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
                {product.logo ? (
                  <img
                    src={product.logo}
                    alt={product.name}
                    className="w-full h-full rounded-lg object-cover"
                  />
                ) : (
                  product.name?.split(' ').map((word: string) => word[0]).join('').toUpperCase().slice(0, 2)
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-grey">Creating message broker for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  This message broker will be automatically connected to your product and configured for its environments
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
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New Message Broker</h1>
              <p className="text-sm text-grey-600">
                {product?.name ? `Adding to ${product.name}` : 'Configure a message broker for your product'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="required">
                Broker Name
              </Label>
              <Input
                id="name"
                placeholder="e.g., Production Message Broker"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-grey-600 mt-1">A friendly name for this message broker configuration</p>
            </div>

            <div>
              <Label htmlFor="tag" className="required">
                Tag
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="tag"
                  placeholder="e.g., my-product:production-broker"
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                />
                <Button variant="outline" onClick={() => handleNameChange(formData.name)} size="sm">
                  Auto-generate
                </Button>
              </div>
              <p className="text-xs text-grey-600 mt-1">
                Format: product-name:broker-name (auto-generated from broker name)
              </p>
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
                <p className="text-sm text-grey-600">Configure message broker for each environment</p>
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
                    <Label htmlFor={`type-${index}`} className="required">
                      Broker Type
                    </Label>
                    <Select
                      value={env.type}
                      onValueChange={(value) => updateEnvConfig(index, 'type', value)}
                    >
                      <SelectTrigger id={`type-${index}`} className="mt-2">
                        <SelectValue placeholder="Select message broker type" />
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
                  {env.type === 'RABBITMQ' && (
                    <div className="space-y-4 pt-4 border-t border-grey-300">
                      <div className="bg-blue-50 p-3 rounded-lg text-sm text-grey-600">
                        <p className="font-medium">RabbitMQ Configuration</p>
                        <p className="text-xs">Configure your RabbitMQ connection settings including host, credentials, exchange, and queue details.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`rabbitmqHost-${index}`} className="required">Host</Label>
                          <Input
                            id={`rabbitmqHost-${index}`}
                            placeholder="rabbitmq.yourdomain.com"
                            value={env.rabbitmqHost}
                            onChange={(e) => updateEnvConfig(index, 'rabbitmqHost', e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`rabbitmqPort-${index}`} className="required">Port</Label>
                          <Input
                            id={`rabbitmqPort-${index}`}
                            placeholder="5672"
                            value={env.rabbitmqPort}
                            onChange={(e) => updateEnvConfig(index, 'rabbitmqPort', e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`rabbitmqUsername-${index}`} className="required">Username</Label>
                          <Input
                            id={`rabbitmqUsername-${index}`}
                            placeholder="rabbitmq-user"
                            value={env.rabbitmqUsername}
                            onChange={(e) => updateEnvConfig(index, 'rabbitmqUsername', e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`rabbitmqPassword-${index}`} className="required">Password</Label>
                          <Input
                            id={`rabbitmqPassword-${index}`}
                            type="password"
                            placeholder="••••••••"
                            value={env.rabbitmqPassword}
                            onChange={(e) => updateEnvConfig(index, 'rabbitmqPassword', e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`rabbitmqExchange-${index}`} className="required">Exchange</Label>
                          <Input
                            id={`rabbitmqExchange-${index}`}
                            placeholder="my-exchange"
                            value={env.rabbitmqExchange}
                            onChange={(e) => updateEnvConfig(index, 'rabbitmqExchange', e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`rabbitmqQueue-${index}`} className="required">Queue</Label>
                          <Input
                            id={`rabbitmqQueue-${index}`}
                            placeholder="my-queue"
                            value={env.rabbitmqQueue}
                            onChange={(e) => updateEnvConfig(index, 'rabbitmqQueue', e.target.value)}
                            className="mt-2"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor={`rabbitmqRoutingKey-${index}`} className="required">Routing Key</Label>
                        <Input
                          id={`rabbitmqRoutingKey-${index}`}
                          placeholder="my-routing-key"
                          value={env.rabbitmqRoutingKey}
                          onChange={(e) => updateEnvConfig(index, 'rabbitmqRoutingKey', e.target.value)}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  )}

                  {/* Redis Configuration */}
                  {env.type === 'REDIS' && (
                    <div className="space-y-4 pt-4 border-t border-grey-300">
                      <div className="bg-green-50 p-3 rounded-lg text-sm text-grey-600">
                        <p className="font-medium">Redis Configuration</p>
                        <p className="text-xs">Configure your Redis connection settings for Pub/Sub messaging.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`redisHost-${index}`} className="required">Host</Label>
                          <Input
                            id={`redisHost-${index}`}
                            placeholder="redis.yourdomain.com"
                            value={env.redisHost}
                            onChange={(e) => updateEnvConfig(index, 'redisHost', e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`redisPort-${index}`} className="required">Port</Label>
                          <Input
                            id={`redisPort-${index}`}
                            placeholder="6379"
                            value={env.redisPort}
                            onChange={(e) => updateEnvConfig(index, 'redisPort', e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`redisChannel-${index}`} className="required">Channel</Label>
                          <Input
                            id={`redisChannel-${index}`}
                            placeholder="events"
                            value={env.redisChannel}
                            onChange={(e) => updateEnvConfig(index, 'redisChannel', e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`redisPassword-${index}`}>Password (Optional)</Label>
                          <Input
                            id={`redisPassword-${index}`}
                            type="password"
                            placeholder="••••••••"
                            value={env.redisPassword}
                            onChange={(e) => updateEnvConfig(index, 'redisPassword', e.target.value)}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AWS SQS Configuration */}
                  {env.type === 'AWS_SQS' && (
                    <div className="space-y-4 pt-4 border-t border-grey-300">
                      <div className="bg-orange-50 p-3 rounded-lg text-sm text-grey-600">
                        <p className="font-medium">AWS SQS Configuration</p>
                        <p className="text-xs">Configure your AWS SQS connection settings including region, queue URL, and credentials.</p>
                      </div>
                      <div>
                        <Label htmlFor={`awsRegion-${index}`} className="required">Region</Label>
                        <Input
                          id={`awsRegion-${index}`}
                          placeholder="us-east-1"
                          value={env.awsRegion}
                          onChange={(e) => updateEnvConfig(index, 'awsRegion', e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`awsQueueUrl-${index}`} className="required">Queue URL</Label>
                        <Input
                          id={`awsQueueUrl-${index}`}
                          placeholder="https://sqs.us-east-1.amazonaws.com/123456789012/my-queue"
                          value={env.awsQueueUrl}
                          onChange={(e) => updateEnvConfig(index, 'awsQueueUrl', e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`awsAccessKeyId-${index}`} className="required">Access Key ID</Label>
                        <Input
                          id={`awsAccessKeyId-${index}`}
                          placeholder="your-access-key-id"
                          value={env.awsAccessKeyId}
                          onChange={(e) => updateEnvConfig(index, 'awsAccessKeyId', e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`awsSecretAccessKey-${index}`} className="required">Secret Access Key</Label>
                        <Input
                          id={`awsSecretAccessKey-${index}`}
                          type="password"
                          placeholder="your-secret-access-key"
                          value={env.awsSecretAccessKey}
                          onChange={(e) => updateEnvConfig(index, 'awsSecretAccessKey', e.target.value)}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  )}

                  {/* Kafka Configuration */}
                  {env.type === 'KAFKA' && (
                    <div className="space-y-4 pt-4 border-t border-grey-300">
                      <div className="bg-purple-50 p-3 rounded-lg text-sm text-grey-600">
                        <p className="font-medium">Kafka Configuration</p>
                        <p className="text-xs">Configure your Kafka cluster settings including brokers, topics, and authentication.</p>
                      </div>
                      <div>
                        <Label htmlFor={`kafkaBrokers-${index}`} className="required">Brokers (comma-separated)</Label>
                        <Input
                          id={`kafkaBrokers-${index}`}
                          placeholder="kafka-broker1:9092,kafka-broker2:9092"
                          value={env.kafkaBrokers}
                          onChange={(e) => updateEnvConfig(index, 'kafkaBrokers', e.target.value)}
                          className="mt-2"
                        />
                        <p className="text-xs text-grey-600 mt-1">Enter comma-separated broker addresses</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`kafkaClientId-${index}`} className="required">Client ID</Label>
                          <Input
                            id={`kafkaClientId-${index}`}
                            placeholder="my-app"
                            value={env.kafkaClientId}
                            onChange={(e) => updateEnvConfig(index, 'kafkaClientId', e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`kafkaGroupId-${index}`} className="required">Group ID</Label>
                          <Input
                            id={`kafkaGroupId-${index}`}
                            placeholder="my-consumer-group"
                            value={env.kafkaGroupId}
                            onChange={(e) => updateEnvConfig(index, 'kafkaGroupId', e.target.value)}
                            className="mt-2"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor={`kafkaTopic-${index}`} className="required">Topic</Label>
                        <Input
                          id={`kafkaTopic-${index}`}
                          placeholder="my-topic"
                          value={env.kafkaTopic}
                          onChange={(e) => updateEnvConfig(index, 'kafkaTopic', e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <div className="flex items-center gap-2 p-4 border rounded-lg">
                        <input
                          type="checkbox"
                          id={`kafkaSsl-${index}`}
                          checked={env.kafkaSsl}
                          onChange={(e) => updateEnvConfig(index, 'kafkaSsl', e.target.checked)}
                          className="h-4 w-4"
                        />
                        <div>
                          <Label htmlFor={`kafkaSsl-${index}`} className="font-medium">Enable SSL</Label>
                          <p className="text-xs text-grey-600">Enable SSL for secure communication</p>
                        </div>
                      </div>
                      <div className="space-y-4 pt-4 border-t border-grey-300">
                        <h5 className="font-medium text-grey">SASL Authentication (Optional)</h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`kafkaSaslMechanism-${index}`}>Mechanism</Label>
                            <Input
                              id={`kafkaSaslMechanism-${index}`}
                              placeholder="plain"
                              value={env.kafkaSaslMechanism}
                              onChange={(e) => updateEnvConfig(index, 'kafkaSaslMechanism', e.target.value)}
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`kafkaSaslUsername-${index}`}>Username</Label>
                            <Input
                              id={`kafkaSaslUsername-${index}`}
                              placeholder="kafka-user"
                              value={env.kafkaSaslUsername}
                              onChange={(e) => updateEnvConfig(index, 'kafkaSaslUsername', e.target.value)}
                              className="mt-2"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`kafkaSaslPassword-${index}`}>Password</Label>
                          <Input
                            id={`kafkaSaslPassword-${index}`}
                            type="password"
                            placeholder="••••••••"
                            value={env.kafkaSaslPassword}
                            onChange={(e) => updateEnvConfig(index, 'kafkaSaslPassword', e.target.value)}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Google Pub/Sub Configuration */}
                  {env.type === 'GOOGLE_PUBSUB' && (
                    <div className="space-y-4 pt-4 border-t border-grey-300">
                      <div className="bg-red-50 p-3 rounded-lg text-sm text-grey-600">
                        <p className="font-medium">Google Pub/Sub Configuration</p>
                        <p className="text-xs">Configure your Google Cloud Pub/Sub settings including project ID, topics, and service account credentials.</p>
                      </div>
                      <div>
                        <Label htmlFor={`gcpProjectId-${index}`} className="required">Project ID</Label>
                        <Input
                          id={`gcpProjectId-${index}`}
                          placeholder="your-gcp-project-id"
                          value={env.gcpProjectId}
                          onChange={(e) => updateEnvConfig(index, 'gcpProjectId', e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`gcpTopicName-${index}`} className="required">Topic Name</Label>
                          <Input
                            id={`gcpTopicName-${index}`}
                            placeholder="my-topic"
                            value={env.gcpTopicName}
                            onChange={(e) => updateEnvConfig(index, 'gcpTopicName', e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`gcpSubscriptionName-${index}`}>Subscription Name (Optional)</Label>
                          <Input
                            id={`gcpSubscriptionName-${index}`}
                            placeholder="my-subscription"
                            value={env.gcpSubscriptionName}
                            onChange={(e) => updateEnvConfig(index, 'gcpSubscriptionName', e.target.value)}
                            className="mt-2"
                          />
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-grey-300">
                        <h5 className="font-medium text-grey">Service Account Configuration</h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`gcpConfigProjectId-${index}`} className="required">Project ID</Label>
                            <Input
                              id={`gcpConfigProjectId-${index}`}
                              placeholder="your-project-id"
                              value={env.gcpConfigProjectId}
                              onChange={(e) => updateEnvConfig(index, 'gcpConfigProjectId', e.target.value)}
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`gcpPrivateKeyId-${index}`} className="required">Private Key ID</Label>
                            <Input
                              id={`gcpPrivateKeyId-${index}`}
                              placeholder="abcdefghijklmnopqrstuvwxyz1234567890"
                              value={env.gcpPrivateKeyId}
                              onChange={(e) => updateEnvConfig(index, 'gcpPrivateKeyId', e.target.value)}
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
                            onChange={(e) => updateEnvConfig(index, 'gcpPrivateKey', e.target.value)}
                            className="mt-2 min-h-[100px]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`gcpClientEmail-${index}`} className="required">Client Email</Label>
                            <Input
                              id={`gcpClientEmail-${index}`}
                              placeholder="your-service-account@your-project-id.iam.gserviceaccount.com"
                              value={env.gcpClientEmail}
                              onChange={(e) => updateEnvConfig(index, 'gcpClientEmail', e.target.value)}
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`gcpClientId-${index}`} className="required">Client ID</Label>
                            <Input
                              id={`gcpClientId-${index}`}
                              placeholder="123456789012345678901"
                              value={env.gcpClientId}
                              onChange={(e) => updateEnvConfig(index, 'gcpClientId', e.target.value)}
                              className="mt-2"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`gcpClientX509CertUrl-${index}`} className="required">Client X509 Cert URL</Label>
                          <Input
                            id={`gcpClientX509CertUrl-${index}`}
                            placeholder="https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project-id.iam.gserviceaccount.com"
                            value={env.gcpClientX509CertUrl}
                            onChange={(e) => updateEnvConfig(index, 'gcpClientX509CertUrl', e.target.value)}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
                <Button variant="outline" onClick={() => closeTab(tabId)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isCreating} className="gap-2">
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Create Message Broker
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
