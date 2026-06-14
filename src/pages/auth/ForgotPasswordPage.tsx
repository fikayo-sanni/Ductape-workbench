import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { authServices } from '@/services/authServices';
import { Eye, EyeOff, Loader, KeyRound } from 'lucide-react';
import AuthPageShell from '@/components/auth/AuthPageShell';

const resetPasswordSchema = z.object({
  email: z.string().email(),
});

const createNewPasswordSchema = z
  .object({
    token: z.string().min(6, { message: 'OTP must be 6 characters' }),
    newPassword: z.string().min(6, { message: 'Password must be at least 6 characters' }),
    confirmPassword: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function ForgotPasswordPage() {
  const [passwordReset, setPasswordReset] = useState(false);
  const [showPassword, setShowPassword] = useState({
    newPassword: false,
    confirmPassword: false,
  });

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: '' },
  });

  const createPasswordForm = useForm<z.infer<typeof createNewPasswordSchema>>({
    resolver: zodResolver(createNewPasswordSchema),
    defaultValues: { token: '', newPassword: '', confirmPassword: '' },
  });

  const { mutate, status } = useMutation({
    mutationFn: (data: { email: string }) => authServices.resetPassword(data),
    onSuccess: () => {
      toast.success('Password reset code sent successfully, check your email');
      setPasswordReset(true);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { mutate: createPassword, status: newPasswordStatus } = useMutation({
    mutationFn: (data: { token: string; password: string; email: string }) =>
      authServices.createNewPassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully, please login');
      setPasswordReset(false);
      form.reset();
      createPasswordForm.reset();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Failed to reset password';
      toast.error(message);
    },
  });

  const email = form.getValues('email');

  const onSubmitNewPassword = (values: z.infer<typeof createNewPasswordSchema>) => {
    if (!email) {
      toast.error('Please enter your email on the previous step');
      return;
    }
    createPassword({
      token: values.token,
      password: values.newPassword,
      email,
    });
  };

  return (
    <AuthPageShell
      title={passwordReset ? 'Create New Password' : 'Reset Password'}
      subtitle={
        passwordReset
          ? 'Enter your code and new password'
          : "We'll email you a reset code"
      }
      icon={<KeyRound className="h-5 w-5" />}
    >
      {!passwordReset ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => mutate(values))} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full h-12 font-bold" disabled={status === 'pending'}>
              {status === 'pending' && <Loader className="animate-spin mr-2 size-5" />}
              Send code
            </Button>
          </form>
        </Form>
      ) : (
        <Form {...createPasswordForm}>
          <form
            onSubmit={createPasswordForm.handleSubmit(onSubmitNewPassword)}
            className="space-y-4"
          >
            <FormField
              control={createPasswordForm.control}
              name="token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enter OTP</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={createPasswordForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input {...field} type={showPassword.newPassword ? 'text' : 'password'} />
                      <Button
                        variant="ghost"
                        type="button"
                        className="absolute top-1/2 right-2 -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() =>
                          setShowPassword({
                            ...showPassword,
                            newPassword: !showPassword.newPassword,
                          })
                        }
                      >
                        {showPassword.newPassword ? (
                          <EyeOff className="h-4 w-4 text-grey-600" />
                        ) : (
                          <Eye className="h-4 w-4 text-grey-600" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={createPasswordForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword.confirmPassword ? 'text' : 'password'}
                      />
                      <Button
                        variant="ghost"
                        type="button"
                        className="absolute top-1/2 right-2 -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() =>
                          setShowPassword({
                            ...showPassword,
                            confirmPassword: !showPassword.confirmPassword,
                          })
                        }
                      >
                        {showPassword.confirmPassword ? (
                          <EyeOff className="h-4 w-4 text-grey-600" />
                        ) : (
                          <Eye className="h-4 w-4 text-grey-600" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-12 font-bold"
              disabled={newPasswordStatus === 'pending'}
            >
              {newPasswordStatus === 'pending' && <Loader className="animate-spin mr-2 size-5" />}
              Update Password
            </Button>
          </form>
        </Form>
      )}

      <p className="mt-6 text-center text-sm text-grey-600">
        <Link to="/login" className="text-primary font-semibold hover:underline">
          Back to login
        </Link>
      </p>
    </AuthPageShell>
  );
}
