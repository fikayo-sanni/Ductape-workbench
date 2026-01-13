import { MessageSquare, Loader2, Server, Database, CloudCog, CheckCircle, Eye, EyeOff, Activity, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useSDKProxy } from '@/services/sdkProxy';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';

interface MessageBrokerTabContentProps {
  messageBroker: any;
}

export default function MessageBrokerTabContent({ messageBroker }: MessageBrokerTabContentProps) {
  // Show error if message broker data is incomplete and can't be fetched
  if (!messageBroker?.name && !messageBroker?.tag) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600 mb-2">Incomplete messaging data</p>
          <p className="text-grey-500 text-sm mb-4">
            This tab was restored from an older session with incomplete data.
          </p>
          <p className="text-grey-500 text-sm">
            Please close this tab and reopen the messaging from your product to reload it.
          </p>
        </div>
      </div>
    );
  }

  const { user, currentWorkspaceId } = useAuth();
  const { openTab } = useWorkbenchStore();
  const productTag = messageBroker?.productTag;
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});

  // Initialize SDK Proxy
  const sdkProxy = useSDKProxy(
    messageBroker?.productTag && user?._id
      ? {
          workspace_id: currentWorkspaceId || '',
          user_id: user._id || '',
          token: user.auth_token || '',
          public_key: user.public_key || '',
        }
      : null
  );

  // Fetch message broker details from SDK Proxy
  const { data: messageBrokerData, isLoading } = useQuery({
    queryKey: ['message-broker', productTag, messageBroker?.tag],
    queryFn: async () => {
      if (!sdkProxy || !messageBroker?.tag || !messageBroker?.productTag) {
        return messageBroker;
      }
      const result = await sdkProxy.messageBrokers.fetch(messageBroker.productTag, messageBroker.tag);
      return result;
    },
    enabled: !!sdkProxy && !!productTag && !!messageBroker?.tag,
  });

  const displayData = messageBrokerData || messageBroker;

  // Extract product info for header
  const product = messageBroker?.productName && messageBroker?.productTag ? {
    name: messageBroker.productName,
    tag: messageBroker.productTag,
    logo: messageBroker.productLogo,
  } : null;

  const toggleShowCredential = (key: string) => {
    setShowCredentials(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleViewEvents = (env: any) => {
    openTab({
      id: `message-broker-events-${displayData.tag}-${env.slug}`,
      type: 'message-broker-events',
      title: `${displayData.name} (${env.slug})`,
      itemId: `${displayData.tag}-${env.slug}`,
      data: {
        name: displayData.name,
        brokerTag: displayData.tag,
        tag: displayData.tag,
        type: env.type,
        productTag: messageBroker?.productTag,
        productName: messageBroker?.productName,
        productId: messageBroker?.productId,
        env: env,
      },
    });
  };

  const getBrokerTypeIcon = (type: string) => {
    const iconMap: Record<string, any> = {
      rabbitmq: { Icon: Database, color: 'text-blue', bgColor: 'bg-blue/10' },
      redis: { Icon: Server, color: 'text-red', bgColor: 'bg-red/10' },
      aws_sqs: { Icon: CloudCog, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
      kafka: { Icon: Server, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
      google_pubsub: { Icon: CloudCog, color: 'text-green', bgColor: 'bg-green/10' },
    };
    return iconMap[type?.toLowerCase()] || { Icon: MessageSquare, color: 'text-grey', bgColor: 'bg-grey/10' };
  };

  const getBrokerTypeName = (type: string) => {
    const nameMap: Record<string, string> = {
      rabbitmq: 'RabbitMQ',
      redis: 'Redis Pub/Sub',
      aws_sqs: 'AWS SQS',
      kafka: 'Apache Kafka',
      google_pubsub: 'Google Pub/Sub',
    };
    return nameMap[type?.toLowerCase()] || type;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-grey-600">Loading messaging details...</p>
        </div>
      </div>
    );
  }

  if (!displayData) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600">Messaging not found</p>
        </div>
      </div>
    );
  }

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
                  <h2 className="text-xl font-bold text-grey">Messaging for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  This messaging service is connected to your product and configured for its environments
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-grey-600">
                <CheckCircle className="h-4 w-4 text-green" />
                <span>Connected</span>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-cyan-600/10 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="h-6 w-6 text-cyan-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-grey mb-2">{displayData.name}</h1>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-grey-600">Tag: <span className="font-mono">{displayData.tag}</span></span>
              </div>
              {displayData.description && (
                <p className="text-sm text-grey-600">{displayData.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Environment Configurations */}
        {displayData.envs && displayData.envs.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-grey">Environment Configurations</h2>
            {displayData.envs.map((env: any, index: number) => {
              const config = env.config || {};
              const brokerType = env.type || '';
              const { Icon, color, bgColor } = getBrokerTypeIcon(brokerType);
              const envKey = `${env.slug}-${index}`;

              return (
                <div key={index} className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center`}>
                        <Icon className={`h-4 w-4 ${color}`} />
                      </div>
                      <h3 className="text-base font-semibold text-grey">{env.slug}</h3>
                      <span className={`px-3 py-1 rounded text-xs font-medium uppercase ${bgColor} ${color}`}>
                        {getBrokerTypeName(brokerType)}
                      </span>
                    </div>
                    <Button
                      onClick={() => handleViewEvents(env)}
                      className="gap-2"
                      size="sm"
                    >
                      <Activity className="h-4 w-4" />
                      View Events
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {config && Object.keys(config).length > 0 ? (
                      Object.entries(config).map(([key, value]: [string, any]) => {
                        // Check if this is a sensitive field
                        const isSensitive = key.toLowerCase().includes('password') ||
                                           key.toLowerCase().includes('secret') ||
                                           key.toLowerCase().includes('key') ||
                                           key.toLowerCase().includes('credentials') ||
                                           key.toLowerCase().includes('token');

                        if (isSensitive) {
                          return (
                            <div key={key}>
                              <Label className="text-sm font-semibold text-grey">{key}</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="relative flex-1">
                                  <Input
                                    type={showCredentials[`${envKey}-${key}`] ? 'text' : 'password'}
                                    value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    readOnly
                                    className="font-mono text-sm pr-10"
                                  />
                                  {value && (
                                    <button
                                      onClick={() => toggleShowCredential(`${envKey}-${key}`)}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey"
                                    >
                                      {showCredentials[`${envKey}-${key}`] ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // Display non-sensitive config
                        return (
                          <div key={key}>
                            <Label className="text-sm font-semibold text-grey">{key}</Label>
                            <Input
                              value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              readOnly
                              className="font-mono text-sm mt-1"
                            />
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-xs text-grey-600">No configuration details available</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 p-3 rounded-lg bg-grey-50 border border-grey-400">
                    <p className="text-xs text-grey-600">
                      <span className="font-semibold">Note:</span> These credentials are sensitive. Keep them secure and never commit them to version control.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-grey-400 p-12 shadow-sm text-center">
            <MessageSquare className="h-12 w-12 text-grey-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-grey mb-2">No Environments Configured</h3>
            <p className="text-sm text-grey-600">
              This message broker doesn't have any environment configurations yet.
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">About Message Brokers</h3>
          <p className="text-xs text-blue-800">
            Message brokers enable asynchronous communication between services through various messaging patterns (pub/sub, queues, topics). Each environment maintains its own configuration for isolation and secure message delivery across distributed systems.
          </p>
        </div>
      </div>
    </div>
  );
};
