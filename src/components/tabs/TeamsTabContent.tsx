import { useState } from 'react';
import { Users, Mail, Shield, MoreVertical, UserPlus, Trash2, Crown, Loader2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/useAuth';
import workspaceServices from '@/services/workspaceServices';
import { InviteMemberPayload, WorkspaceMember } from '@/types/workspace';

const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
});

export default function TeamsTabContent() {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  // Fetch workspace members
  const { data: membersRes, status: membersStatus } = useQuery({
    queryKey: ['workspace-members', currentWorkspaceId],
    queryFn: () =>
      workspaceServices.fetchWorkspaceMembers({
        user_id: user?._id as string,
        public_key: user?.public_key as string,
        workspace_id: currentWorkspaceId as string,
      }),
    enabled: !!currentWorkspaceId && !!user?._id && !!user?.public_key,
  });

  const allMembers = membersRes?.data || [];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  // Invite member mutation
  const { mutate: inviteMember, status: invitingMember } = useMutation({
    mutationFn: (payload: InviteMemberPayload) =>
      workspaceServices.inviteMember({
        payload,
      }),
    onSuccess: () => {
      toast.success('Invite sent successfully');
      setShowInviteDialog(false);
      form.reset();
      queryClient.invalidateQueries({
        queryKey: ['workspace-members', currentWorkspaceId],
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.errors || 'Failed to send invite');
    },
  });

  // Remove member mutation
  const { mutate: removeMember, status: removeMemberStatus } = useMutation({
    mutationFn: (data: { workspace_id: string; access_id: string }) =>
      workspaceServices.removeMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspace-members', currentWorkspaceId]
      });
      toast.success('Team member removed successfully');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.errors || 'Failed to remove team member'
      );
    },
  });

  const onInviteMemberSubmit = (values: z.infer<typeof formSchema>) => {
    inviteMember({
      ...values,
      workspace_id: currentWorkspaceId as string,
      user_id: user?._id as string,
      public_key: user?.public_key as string,
      type: 'single',
      access_level: 'collaborator',
    });
  };

  const handleRemoveMember = (memberId: string) => {
    if (!currentWorkspaceId) return;
    removeMember({
      workspace_id: currentWorkspaceId,
      access_id: memberId,
    });
  };

  const getInitials = (member: WorkspaceMember) => {
    const firstname = member.user?.firstname || '';
    const lastname = member.user?.lastname || '';

    if (firstname || lastname) {
      return `${firstname[0] || ''}${lastname[0] || ''}`.toUpperCase();
    }

    return member.user?.email?.[0]?.toUpperCase() || 'U';
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'bg-purple-500/10 text-purple-500';
      case 'admin':
        return 'bg-primary/10 text-primary';
      case 'collaborator':
        return 'bg-green/10 text-green';
      default:
        return 'bg-grey-400 text-grey-600';
    }
  };

  const getStatusColor = (accepted: boolean) => {
    return accepted
      ? 'bg-green/10 text-green'
      : 'bg-orange-500/10 text-orange-500';
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return <Crown className="h-4 w-4" />;
      case 'admin':
        return <Shield className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (membersStatus === 'pending') {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (membersStatus === 'error' || !currentWorkspaceId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-grey-600">Failed to load team members</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => queryClient.invalidateQueries({
              queryKey: ['workspace-members', currentWorkspaceId]
            })}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-grey-100">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-grey">Team Members</h1>
              </div>
              <p className="text-grey-600">
                Manage team members and their access to your workspace
              </p>
            </div>
            <Button
              onClick={() => setShowInviteDialog(true)}
              className="gap-2"
              disabled={!currentWorkspaceId}
            >
              <UserPlus className="h-4 w-4" />
              Invite Member
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-grey">{allMembers.length}</p>
                <p className="text-sm text-grey-600">Total Members</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-green" />
              </div>
              <div>
                <p className="text-2xl font-bold text-grey">
                  {allMembers.filter(m => m.accepted).length}
                </p>
                <p className="text-sm text-grey-600">Active</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-grey">
                  {allMembers.filter(m => !m.accepted).length}
                </p>
                <p className="text-sm text-grey-600">Pending</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-grey">
                  {allMembers.filter(m =>
                    m.access_level.toLowerCase() === 'admin' ||
                    m.access_level.toLowerCase() === 'owner'
                  ).length}
                </p>
                <p className="text-sm text-grey-600">Admins</p>
              </div>
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-grey mb-4">Members</h2>

          {allMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600">No team members yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setShowInviteDialog(true)}
              >
                Invite Your First Member
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {allMembers.map((member) => (
                <div
                  key={member._id}
                  className="p-4 rounded-lg border border-grey-400 hover:border-primary transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Avatar */}
                      <Avatar className="h-10 w-10 bg-primary">
                        {member.user?.profilePicture ? (
                          <img
                            src={member.user.profilePicture}
                            alt="user avatar"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <AvatarFallback className="bg-primary text-white text-sm font-bold">
                            {getInitials(member)}
                          </AvatarFallback>
                        )}
                      </Avatar>

                      {/* Member Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-grey truncate">
                            {member.user?.firstname || member.user?.lastname
                              ? `${member.user.firstname || ''} ${member.user.lastname || ''}`.trim()
                              : member.user?.email || 'Unknown User'}
                          </h3>
                          {getRoleIcon(member.access_level)}
                          <Badge
                            variant={member.accepted ? 'default' : 'secondary'}
                            className={cn(
                              'uppercase font-semibold text-xs',
                              getStatusColor(member.accepted)
                            )}
                          >
                            {member.accepted ? 'Active' : 'Pending'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-grey-600">
                          <span className="truncate">{member.user?.email}</span>
                          {member.date_joined && (
                            <>
                              <span>•</span>
                              <span>
                                Joined {format(new Date(member.date_joined), 'MMM dd, yyyy')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Role Badge and Actions */}
                    <div className="flex items-center gap-2">
                      <Badge
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-medium uppercase',
                          getRoleColor(member.access_level)
                        )}
                      >
                        {member.access_level}
                      </Badge>

                      {member.access_level.toLowerCase() !== 'owner' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleRemoveMember(member._id)}
                              disabled={removeMemberStatus === 'pending'}
                              className="text-red cursor-pointer focus:text-red-500 focus:bg-red-50 text-xs font-semibold"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove from Workspace
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Role Permissions Info */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-grey mb-4">Role Permissions</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Crown className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-grey text-sm">Owner</h3>
                <p className="text-xs text-grey-600">
                  Full access to all resources, can manage billing and delete workspace
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-grey text-sm">Admin</h3>
                <p className="text-xs text-grey-600">
                  Can manage all resources, invite members, and configure settings
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-green mt-0.5" />
              <div>
                <h3 className="font-semibold text-grey text-sm">Collaborator</h3>
                <p className="text-xs text-grey-600">
                  Can create, edit, and delete resources but cannot manage team members
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Member Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md border-b-4 border-b-primary sm:rounded-lg">
          <DialogHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-grey">Invite Team Member</DialogTitle>
                <DialogDescription className="text-grey-600">
                  Add people to work with you by email address
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onInviteMemberSubmit)}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-grey-700 font-medium">Email Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="colleague@company.com"
                        {...field}
                        disabled={invitingMember === 'pending'}
                        className="h-11"
                        type="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-grey-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-grey mb-1">Access Level</h4>
                    <p className="text-xs text-grey-600">
                      New members will be added as <span className="font-medium text-green">Collaborators</span> with read and write access to this workspace.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInviteDialog(false)}
                  disabled={invitingMember === 'pending'}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={invitingMember === 'pending'}
                  className="flex-1 gap-2"
                >
                  {invitingMember === 'pending' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending Invite...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Send Invite
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
