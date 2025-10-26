import { useState } from 'react';
import { Bell, Mail, Phone, Webhook, FileText, Plus, Edit2, Box, Activity } from 'lucide-react';
import { IProductNotifier } from '@/types/notifier';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '../ui/button';

interface NotificationTabContentProps {
  data?: any;
}

export default function NotificationTabContent({ data }: NotificationTabContentProps) {
  const notifier: IProductNotifier = data;
  const [selectedEnv, setSelectedEnv] = useState<string>(notifier?.envs?.[0]?.slug || '');

  if (!notifier) {
    return (
      <div className="bg-grey-100 p-6">
        <div className="text-center py-12">
          <Bell className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600">Notifier not found</p>
        </div>
      </div>
    );
  }

  const currentEnv = notifier.envs?.find((env) => env.slug === selectedEnv);
  
  const activeChannels = [];
  if (currentEnv?.push_notifications) activeChannels.push({ type: 'Push', icon: Bell, color: 'purple' });
  if (currentEnv?.emails) activeChannels.push({ type: 'Email', icon: Mail, color: 'blue' });
  if (currentEnv?.sms) activeChannels.push({ type: 'SMS', icon: Phone, color: 'green' });
  if (currentEnv?.callbacks) activeChannels.push({ type: 'Callback', icon: Webhook, color: 'orange' });

  return (
    <div className="bg-grey-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-lg bg-red/10 flex items-center justify-center flex-shrink-0">
                <Bell className="h-8 w-8 text-red" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-grey mb-2">{notifier.name}</h1>
                <p className="text-sm text-grey-600 font-mono mb-3">{notifier.tag}</p>
                {notifier.description && (
                  <p className="text-grey-600">{notifier.description}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded-lg border border-grey-400 hover:bg-grey-100 transition-colors text-sm font-medium flex items-center gap-2">
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-grey-400 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Box className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-grey">{notifier.envs?.length || 0}</div>
                <div className="text-sm text-grey-600">Environments</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-grey-400 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-green" />
              </div>
              <div>
                <div className="text-2xl font-bold text-grey">{activeChannels.length}</div>
                <div className="text-sm text-grey-600">Active Channels</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-grey-400 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-grey">{notifier.messages?.length || 0}</div>
                <div className="text-sm text-grey-600">Messages</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-grey-400 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-red" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green" />
                  <div className="text-sm font-medium text-grey">Active</div>
                </div>
                <div className="text-xs text-grey-600 mt-1">Notification service</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Channels */}
            <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-grey">Configuration</h2>
                {notifier.envs && notifier.envs.length > 1 && (
                  <Select value={selectedEnv} onValueChange={setSelectedEnv}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {notifier.envs.map((env) => (
                        <SelectItem key={env._id || env.slug} value={env.slug}>
                          {env.slug}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              
              {activeChannels.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-grey-400 mx-auto mb-3" />
                  <p className="text-sm text-grey-600">No channels configured for this environment</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentEnv?.push_notifications && (
                    <div className="border border-grey-400 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <Bell className="h-4 w-4 text-purple-500" />
                        </div>
                        <span className="font-medium text-grey">Push Notifications</span>
                        <Badge variant="outline" className="ml-auto">Active</Badge>
                      </div>
                      <pre className="text-xs bg-grey-100 p-3 rounded whitespace-pre-wrap break-words">
                        {JSON.stringify(currentEnv.push_notifications, null, 2)}
                      </pre>
                    </div>
                  )}

                  {currentEnv?.emails && (
                    <div className="border border-grey-400 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-blue-500" />
                        </div>
                        <span className="font-medium text-grey">Email</span>
                        <Badge variant="outline" className="ml-auto">Active</Badge>
                      </div>
                      <pre className="text-xs bg-grey-100 p-3 rounded whitespace-pre-wrap break-words">
                        {JSON.stringify(currentEnv.emails, null, 2)}
                      </pre>
                    </div>
                  )}

                  {currentEnv?.sms && (
                    <div className="border border-grey-400 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <Phone className="h-4 w-4 text-green-500" />
                        </div>
                        <span className="font-medium text-grey">SMS</span>
                        <Badge variant="outline" className="ml-auto">Active</Badge>
                      </div>
                      <pre className="text-xs bg-grey-100 p-3 rounded whitespace-pre-wrap break-words">
                        {JSON.stringify(currentEnv.sms, null, 2)}
                      </pre>
                    </div>
                  )}

                  {currentEnv?.callbacks && (
                    <div className="border border-grey-400 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                          <Webhook className="h-4 w-4 text-orange-500" />
                        </div>
                        <span className="font-medium text-grey">Callback</span>
                        <Badge variant="outline" className="ml-auto">Active</Badge>
                      </div>
                      <pre className="text-xs bg-grey-100 p-3 rounded whitespace-pre-wrap break-words">
                        {JSON.stringify(currentEnv.callbacks, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Messages */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-grey">Messages</h2>
                <Button size="sm" variant="outline" className="px-3 py-1.5 rounded-lg text-grey transition-colors text-sm font-medium flex items-center gap-1">
                    <Plus className="h-4 w-4" />
                    Add
                </Button>
              </div>

              {!notifier.messages || notifier.messages.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-grey-400 mx-auto mb-3" />
                  <p className="text-sm text-grey-600 mb-1">No messages yet</p>
                  <p className="text-xs text-grey-500">Create message templates</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifier.messages.map((message: any, idx: number) => (
                    <button
                      key={message._id || idx}
                      className="w-full text-left border border-grey-400 rounded-lg p-3 hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="font-medium text-grey text-sm">{message.name}</span>
                          {message.tag && (
                            <Badge variant="outline" className="text-xs">{message.tag}</Badge>
                          )}
                        </div>
                        {message.email && <Mail className="h-4 w-4 text-blue-500" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
