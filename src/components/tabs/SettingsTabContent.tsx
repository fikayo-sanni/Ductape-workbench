import { useState } from 'react';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader, Settings as SettingsIcon, User, Building2, Bell, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsTrigger, TabsList } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuth } from '@/store/useAuth';
import { useFetchUserDetails } from '@/hooks/useUserQueries';
import { useFetchWorkspaces } from '@/hooks/useWorkspaceQueries';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import workspaceServices from '@/services/workspaceServices';
import { WorkspaceLogo } from '@/components/settings/WorkspaceLogo';
import { UserLogo } from '@/components/settings/UserLogo';
import { userServices, ChangePasswordPayload } from '@/services/userServices';
import toast from 'react-hot-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';

const profileFormSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

const workspaceFormSchema = z.object({
  workspaceName: z
    .string()
    .min(2, 'Workspace name must be at least 2 characters'),
  description: z.string().optional(),
});

const passwordFormSchema = z
  .object({
    oldPassword: z.string().min(8, 'Password must be at least 8 characters'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmNewPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters'),
  })
  .refine(data => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ['confirmNewPassword'],
  });

const notificationFormSchema = z.object({
  type: z.enum(['all', 'none'], {
    required_error: 'You need to select a notification type.',
  }),
  type2: z.enum(['all', 'none'], {
    required_error: 'You need to select a notification type.',
  }),
  type3: z.enum(['all', 'none'], {
    required_error: 'You need to select a notification type.',
  }),
  type4: z.enum(['all', 'none'], {
    required_error: 'You need to select a notification type.',
  }),
  emailNotification: z.boolean().default(false).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function SettingsTabContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: workspaces, status: workspacesStatus } = useFetchWorkspaces({
    user_id: user?._id ?? '',
    public_key: user?.public_key ?? '',
  });
  const { data: userDetailsRes, status: userDetailsStatus } = useFetchUserDetails(
    {
      user_id: user?._id ?? '',
      public_key: user?.public_key ?? '',
    },
  );

  const userDetails = userDetailsRes?.data;

  const defaultWorkspace = workspaces?.data?.find(
    workspace => workspace.default === true,
  );
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    values: {
      fullName: `${user?.firstname || ''} ${user?.lastname || ''}`.trim(),
      email: user?.email || '',
    },
  });

  const workspaceForm = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    values: {
      workspaceName: defaultWorkspace?.workspace_name || '',
      description: defaultWorkspace?.description || 'A quick summary of the workspace comes here',
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const notificationForm = useForm<z.infer<typeof notificationFormSchema>>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      type: 'all',
      type2: 'all',
      type3: 'all',
      type4: 'all',
      emailNotification: true,
    },
  });

  const selectedValue = notificationForm.watch('type');
  const selectedValue2 = notificationForm.watch('type2');
  const selectedValue3 = notificationForm.watch('type3');
  const selectedValue4 = notificationForm.watch('type4');

  const updateUserMutation = useMutation({
    mutationFn: userServices.updateUser,
    onSuccess: () => {
      toast.success('Profile updated successfully');
      queryClient.invalidateQueries({
        queryKey: ['user-details'],
      });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.errors || 'Failed to update profile',
      );
    },
  });

  const { mutate: changePassword, status: changingPassword } = useMutation({
    mutationFn: (payload: ChangePasswordPayload) =>
      userServices.changePassword({
        payload,
        public_key: user?.public_key || '',
        user_id: user?._id || '',
      }),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setShowPasswordModal(false);
      passwordForm.reset();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.errors || 'Failed to change password');
    },
  });

  const updateWorkspaceMutation = useMutation({
    mutationFn: workspaceServices.updateWorkspace,
    onSuccess: () => {
      toast.success('Workspace updated successfully');
      queryClient.invalidateQueries({
        queryKey: ['workspaces'],
      });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.errors || 'Failed to update workspace',
      );
    },
  });

  const handleWorkspaceLogoChange = (logoUrl: string) => {
    if (!defaultWorkspace?.workspace_id) return;
    updateWorkspaceMutation.mutate({
      user_id: user?._id || '',
      public_key: user?.public_key || '',
      logo: logoUrl,
      workspace_id: defaultWorkspace.workspace_id,
    });
  };

  const handleUserLogoChange = (logoUrl: string) => {
    updateUserMutation.mutate({
      user_id: user?._id || '',
      public_key: user?.public_key || '',
      profilePicture: logoUrl,
    });
  };

  const onWorkspaceSubmit = async (data: WorkspaceFormValues) => {
    if (!defaultWorkspace?.workspace_id) return;
    await updateWorkspaceMutation.mutateAsync({
      user_id: user?._id || '',
      public_key: user?.public_key || '',
      logo: defaultWorkspace?.logo || '',
      workspace_id: defaultWorkspace.workspace_id,
      workspaceName: data.workspaceName,
      description: data.description,
    });
  };

  const onProfileSubmit = async (data: ProfileFormValues) => {
    await updateUserMutation.mutateAsync({
      user_id: user?._id || '',
      public_key: user?.public_key || '',
      fullName: data.fullName,
      email: data.email,
    });
  };

  const onPasswordSubmit = (data: PasswordFormValues) => {
    changePassword(data);
  };

  const onNotificationSubmit = (
    data: z.infer<typeof notificationFormSchema>,
  ) => {
    console.log("data", data);
    toast.success('Notification preferences saved');
  };

  if (workspacesStatus === 'pending' || userDetailsStatus === 'pending') {
    return (
      <div className="flex items-center justify-center h-full bg-grey-100">
        <Loader className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <SettingsIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Settings</h1>
              <p className="text-sm text-grey-600">Manage your profile, workspace, and notification preferences</p>
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <div className="bg-white rounded-lg border border-grey-400 shadow-sm">
          <Tabs defaultValue="profile" className="w-full">
            <div className="border-b border-grey-400">
              <div className="px-6 pt-4">
                <TabsList className="flex -mb-px bg-transparent justify-start pb-0">
                  <TabsTrigger
                    value="profile"
                    className="px-4 py-3 text-base font-semibold text-grey-600 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none data-[state=active]:bg-transparent"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </TabsTrigger>
                  <TabsTrigger
                    value="workspace"
                    className="px-4 py-3 text-base font-semibold text-grey-600 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none data-[state=active]:bg-transparent"
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Workspace
                  </TabsTrigger>
                  <TabsTrigger
                    value="notifications"
                    className="px-4 py-3 text-base font-semibold text-grey-600 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none data-[state=active]:bg-transparent"
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <div className="p-6">
              <TabsContent value="profile" className="space-y-6 mt-0">
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                    {/* Profile Photo Section */}
                    <div className="border border-grey-400 rounded-lg p-6 bg-grey-50 dark:bg-background-secondary">
                      <UserLogo
                        initialLogo={userDetails?.profilePicture || user?.profilePicture || ''}
                        onLogoChange={handleUserLogoChange}
                      />
                    </div>

                    <Separator />

                    {/* Personal Information */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-grey">Personal Information</h2>
                      <FormField
                        control={profileForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-grey">Full Name</FormLabel>
                            <FormControl>
                              <Input {...field} readOnly className="bg-grey-50 dark:bg-background-secondary" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-grey">Email Address</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" readOnly className="bg-grey-50 dark:bg-background-secondary" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    {/* Security Section */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-grey">Security</h2>
                      <Button
                        type="button"
                        size="lg"
                        variant="outline"
                        className="text-primary font-semibold"
                        onClick={() => setShowPasswordModal(true)}
                      >
                        Change Password
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="workspace" className="space-y-6 mt-0">
                <Form {...workspaceForm}>
                  <form onSubmit={workspaceForm.handleSubmit(onWorkspaceSubmit)} className="space-y-6">
                    {/* Workspace Logo Section */}
                    <div className="border border-grey-400 rounded-lg p-6 bg-grey-50 dark:bg-background-secondary">
                      <WorkspaceLogo
                        initialLogo={defaultWorkspace?.logo || ''}
                        workspaceName={defaultWorkspace?.workspace_name || ''}
                        onLogoChange={handleWorkspaceLogoChange}
                      />
                    </div>

                    <Separator />

                    {/* Workspace Information */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-grey">Workspace Information</h2>
                      <FormField
                        control={workspaceForm.control}
                        name="workspaceName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-grey">Workspace Name</FormLabel>
                            <FormControl>
                              <Input {...field} readOnly className="bg-grey-50 dark:bg-background-secondary" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={workspaceForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-grey">Workspace Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} readOnly className="min-h-32 bg-grey-50 dark:bg-background-secondary" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    {/* Delete Workspace */}
                    <div className="border border-red/20 bg-red/5 rounded-lg p-4">
                      <h2 className="text-lg font-semibold text-grey mb-2">Delete Workspace</h2>
                      <p className="text-sm text-grey-600 mb-4">Once you delete a workspace, there is no going back. Please be certain.</p>
                      <Button
                        size="lg"
                        type="button"
                        variant="destructive"
                      >
                        Delete Workspace
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="notifications" className="space-y-6 mt-0">
                <Form {...notificationForm}>
                  <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                    {/* Desktop Notifications Section */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-grey">
                        Desktop Notifications
                      </h2>
                      <div className="space-y-6 pl-4 border-l-2 border-grey-300">
                      <FormField
                        control={notificationForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-grey text-base font-medium">
                              Notification Type
                            </FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-1"
                              >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="all" />
                                  </FormControl>
                                  <FormLabel
                                    className={`text-base font-medium ${
                                      selectedValue === 'all'
                                        ? 'text-grey'
                                        : 'text-grey-200'
                                    }`}
                                  >
                                    All
                                  </FormLabel>
                                </FormItem>

                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="none" />
                                  </FormControl>
                                  <FormLabel
                                    className={`text-base font-medium ${
                                      selectedValue === 'none'
                                        ? 'text-grey'
                                        : 'text-grey-200'
                                    }`}
                                  >
                                    None
                                  </FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={notificationForm.control}
                        name="type2"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-grey text-base font-medium">
                              Notification Type
                            </FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-1"
                              >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="all" />
                                  </FormControl>
                                  <FormLabel
                                    className={`text-base font-medium ${
                                      selectedValue2 === 'all'
                                        ? 'text-grey'
                                        : 'text-grey-200'
                                    }`}
                                  >
                                    All
                                  </FormLabel>
                                </FormItem>

                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="none" />
                                  </FormControl>
                                  <FormLabel
                                    className={`text-base font-medium ${
                                      selectedValue2 === 'none'
                                        ? 'text-grey'
                                        : 'text-grey-200'
                                    }`}
                                  >
                                    None
                                  </FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      </div>
                    </div>

                    <Separator />

                    {/* Email Notifications Section */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-grey">
                        Email Notifications
                      </h2>
                      <FormField
                        control={notificationForm.control}
                        name="emailNotification"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border border-grey-400 rounded-lg bg-grey-50 dark:bg-background-secondary">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="mt-[5px]"
                              />
                            </FormControl>
                            <div className="leading-none mt-0">
                              <FormLabel className="text-grey text-base font-semibold cursor-pointer">
                                Send notifications by email
                              </FormLabel>
                              <FormDescription className="text-grey-600 text-sm mt-1">
                                Ductape may still send you important emails about
                                your account or billing information
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      <div className="pl-4 border-l-2 border-grey-300 space-y-4">
                          <FormField
                            control={notificationForm.control}
                            name="type3"
                            render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormLabel className="text-grey text-base font-medium">
                                  Notification Type
                                </FormLabel>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex flex-col space-y-1"
                                  >
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                      <FormControl>
                                        <RadioGroupItem value="all" />
                                      </FormControl>
                                      <FormLabel
                                        className={`text-base font-medium ${
                                          selectedValue3 === 'all'
                                            ? 'text-grey'
                                            : 'text-grey-200'
                                        }`}
                                      >
                                        All
                                      </FormLabel>
                                    </FormItem>

                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                      <FormControl>
                                        <RadioGroupItem value="none" />
                                      </FormControl>
                                      <FormLabel
                                        className={`text-base font-medium ${
                                          selectedValue3 === 'none'
                                            ? 'text-grey'
                                            : 'text-grey-200'
                                        }`}
                                      >
                                        None
                                      </FormLabel>
                                    </FormItem>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={notificationForm.control}
                            name="type4"
                            render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormLabel className="text-grey text-base font-medium">
                                  Notification Type
                                </FormLabel>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex flex-col space-y-1"
                                  >
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                      <FormControl>
                                        <RadioGroupItem value="all" />
                                      </FormControl>
                                      <FormLabel
                                        className={`text-base font-medium ${
                                          selectedValue4 === 'all'
                                            ? 'text-grey'
                                            : 'text-grey-200'
                                        }`}
                                      >
                                        All
                                      </FormLabel>
                                    </FormItem>

                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                      <FormControl>
                                        <RadioGroupItem value="none" />
                                      </FormControl>
                                      <FormLabel
                                        className={`text-base font-medium ${
                                          selectedValue4 === 'none'
                                            ? 'text-grey'
                                            : 'text-grey-200'
                                        }`}
                                      >
                                        None
                                      </FormLabel>
                                    </FormItem>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4 border-t border-grey-400">
                      <Button type="submit" className="gap-2">
                        Save Notification Preferences
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>

            </div>
          </Tabs>
        </div>
      </div>

      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-grey dark:text-grey">Change Password</DialogTitle>
                <DialogDescription className="text-grey-600 dark:text-grey-600">
                  Update your account password for enhanced security
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <Form {...passwordForm}>
            <form
              onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
              className="space-y-4 mt-4"
            >
              <FormField
                control={passwordForm.control}
                name="oldPassword"
                render={({ field }) => (
                  <FormItem>
                    <div>
                      <FormLabel className="required">Current Password</FormLabel>
                      <FormControl>
                        <div className="relative mt-2">
                          <Input
                            type={showCurrentPassword ? 'text' : 'password'}
                            className="pr-10"
                            placeholder="Enter your current password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            className="w-fit h-fit absolute top-1/2 right-2 -translate-y-1/2 p-0 mr-2"
                            onClick={() =>
                              setShowCurrentPassword(!showCurrentPassword)
                            }
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-4 w-4 text-grey-600 dark:text-grey-600" />
                            ) : (
                              <Eye className="h-4 w-4 text-grey-600 dark:text-grey-600" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <div>
                      <FormLabel className="required">New Password</FormLabel>
                      <FormControl>
                        <div className="relative mt-2">
                          <Input
                            type={showNewPassword ? 'text' : 'password'}
                            className="pr-10"
                            placeholder="Enter your new password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            className="w-fit h-fit absolute top-1/2 right-2 -translate-y-1/2 p-0 mr-2"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4 text-grey-600 dark:text-grey-600" />
                            ) : (
                              <Eye className="h-4 w-4 text-grey-600 dark:text-grey-600" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmNewPassword"
                render={({ field }) => (
                  <FormItem>
                    <div>
                      <FormLabel className="required">Confirm New Password</FormLabel>
                      <FormControl>
                        <div className="relative mt-2">
                          <Input
                            type={showConfirmPassword ? 'text' : 'password'}
                            className="pr-10"
                            placeholder="Confirm your new password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            className="w-fit h-fit absolute top-1/2 right-2 -translate-y-1/2 p-0 mr-2"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-grey-600 dark:text-grey-600" />
                            ) : (
                              <Eye className="h-4 w-4 text-grey-600 dark:text-grey-600" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPasswordModal(false)}
                    disabled={changingPassword === 'pending'}
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={changingPassword === 'pending'} className="gap-2">
                  {changingPassword === 'pending' ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Update Password
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

