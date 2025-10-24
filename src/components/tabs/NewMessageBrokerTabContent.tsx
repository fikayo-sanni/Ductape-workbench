import { useState } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';

export default function NewMessageBrokerTabContent({ tabId, data }: { tabId: string; data?: any }) {
  const { closeTab, openTab } = useWorkbenchStore();
  const { currentWorkspaceId } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    tag: '',
    type: 'rabbitmq',
    host: 'localhost',
    port: '5672',
    username: '',
    password: '',
    queue_name: '',
    description: '',
  });

  const brokerDefaults: Record<string, { port: string }> = {
    rabbitmq: { port: '5672' },
    kafka: { port: '9092' },
    redis: { port: '6379' },
    sqs: { port: '' },
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.tag.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const newBroker = {
        _id: `message-broker-${Date.now()}`,
        ...formData,
        product_id: data?.productId,
        workspace_id: currentWorkspaceId,
        created_at: new Date().toISOString(),
      };

      closeTab(tabId);
      openTab({
        id: `message-broker-${newBroker._id}-${Date.now()}`,
        type: 'message-broker',
        title: formData.name,
        itemId: newBroker._id,
        data: { ...newBroker, componentType: 'message-broker', productName: data?.productName },
      });

      toast.success('Message Broker created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create message broker');
    }
  };

  const generateTag = () => {
    if (formData.name) {
      setFormData({ ...formData, tag: formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') });
    }
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New Message Broker</h1>
              <p className="text-sm text-grey-600">Set up message queues and pub/sub</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-6">
          <div>
            <Label htmlFor="name" className="required">Broker Name</Label>
            <Input id="name" placeholder="e.g., Production Queue" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} onBlur={generateTag} className="mt-2" />
          </div>

          <div>
            <Label htmlFor="tag" className="required">Tag</Label>
            <div className="flex gap-2 mt-2">
              <Input id="tag" placeholder="e.g., prod-queue" value={formData.tag} onChange={(e) => setFormData({ ...formData, tag: e.target.value })} />
              <Button variant="outline" onClick={generateTag} size="sm">Auto</Button>
            </div>
          </div>

          <div>
            <Label htmlFor="type" className="required">Broker Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value, port: brokerDefaults[value]?.port || formData.port })}>
              <SelectTrigger id="type" className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rabbitmq">RabbitMQ</SelectItem>
                <SelectItem value="kafka">Apache Kafka</SelectItem>
                <SelectItem value="redis">Redis Pub/Sub</SelectItem>
                <SelectItem value="sqs">AWS SQS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="host">Host</Label>
              <Input id="host" placeholder="localhost" value={formData.host} onChange={(e) => setFormData({ ...formData, host: e.target.value })} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="port">Port</Label>
              <Input id="port" placeholder="5672" value={formData.port} onChange={(e) => setFormData({ ...formData, port: e.target.value })} className="mt-2" />
            </div>
          </div>

          <div>
            <Label htmlFor="queue_name">Queue/Topic Name</Label>
            <Input id="queue_name" placeholder="events" value={formData.queue_name} onChange={(e) => setFormData({ ...formData, queue_name: e.target.value })} className="mt-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" placeholder="guest" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="mt-2" />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" placeholder="Describe this message broker..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="mt-2" />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
            <Button variant="outline" onClick={() => closeTab(tabId)}>Cancel</Button>
            <Button onClick={handleSave} className="gap-2"><Save className="h-4 w-4" />Create Message Broker</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
