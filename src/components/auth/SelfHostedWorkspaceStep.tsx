import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Loader, Users, AlertTriangle } from 'lucide-react';
import { useLicense } from '@/contexts/LicenseContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import workspaceServices from '@/services/workspaceServices';
import { User } from '@/types/auth';

interface SelfHostedWorkspaceStepProps {
  onWorkspaceCreated: (workspaceId: string) => void;
  onJoinRequested: () => void;
  user: User;
  creating: boolean;
  onCreateSubmit: (data: { name: string; description: string }) => void;
}

export default function SelfHostedWorkspaceStep({
  onJoinRequested,
  creating,
  onCreateSubmit,
}: SelfHostedWorkspaceStepProps) {
  const [form, setForm] = useState({ name: '', description: '' });
  const { isAtWorkspaceLimit, limits } = useLicense();

  const { data: allWorkspacesResponse, isLoading: workspacesLoading } = useQuery({
    queryKey: ['all-workspaces'],
    queryFn: () => workspaceServices.fetchAllWorkspaces(),
  });

  const workspaces = allWorkspacesResponse?.data ?? [];
  const atLimit = isAtWorkspaceLimit(workspaces.length);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onCreateSubmit({ name: form.name, description: form.description });
  };

  const handleJoinRequest = (workspaceName: string) => {
    toast.success(`Join request sent for "${workspaceName}"`);
    onJoinRequested();
  };

  return (
    <section className="rounded-10px border border-grey-400 bg-white shadow-sm p-6 sm:p-8 lg:p-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-12 xl:gap-16 items-start">
        <div className="space-y-3 lg:pt-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue/10">
            <Building2 className="h-6 w-6 text-blue" />
          </div>
          <h2 className="text-2xl font-bold text-grey">Workspace setup</h2>
          <p className="text-grey-600 leading-relaxed">
            Create a new workspace or request to join an existing one on this instance.
          </p>
        </div>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="create" className="flex-1">
              Create workspace
            </TabsTrigger>
            <TabsTrigger value="join" className="flex-1">
              Join workspace
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            {atLimit && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 mb-5 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Workspace limit reached ({limits?.max_workspaces} max). Upgrade your license to create more workspaces.
                </span>
              </div>
            )}
            <form onSubmit={handleCreateSubmit} className="space-y-5">
              <div>
                <Label htmlFor="sh_workspace_name">Workspace name</Label>
                <Input
                  id="sh_workspace_name"
                  className="mt-2 h-11"
                  placeholder="e.g., Acme Engineering"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="sh_description">Description (optional)</Label>
                <Textarea
                  id="sh_description"
                  className="mt-2 min-h-[120px]"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  className="h-11 px-8 font-bold"
                  disabled={creating || !form.name.trim() || atLimit}
                >
                  {creating ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create workspace'
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="join">
            {workspacesLoading ? (
              <div className="flex justify-center py-12">
                <Loader className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : workspaces.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="h-10 w-10 text-grey-400 mx-auto mb-3" />
                <p className="text-grey-600 text-sm">No workspaces found on this instance.</p>
                <p className="text-grey-500 text-xs mt-1">
                  Switch to the Create tab to set up the first workspace.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {workspaces.map((ws) => (
                  <li
                    key={ws._id || ws.workspace_id}
                    className={cn(
                      'flex items-center justify-between gap-4 rounded-lg border border-grey-300 bg-grey-50/60 p-4',
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-grey truncate">
                        {ws.workspace_name}
                      </p>
                      {ws.description && (
                        <p className="text-sm text-grey-600 mt-0.5 truncate">{ws.description}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => handleJoinRequest(ws.workspace_name)}
                    >
                      Request to join
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
