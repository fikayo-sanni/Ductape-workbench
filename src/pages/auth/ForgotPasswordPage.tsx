import { useEffect, useRef, useState } from 'react';
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
import OtpFields, { emptyOtpDigits } from '@/components/auth/OtpFields';

const resetPasswordSchema = z.object({
  email: z.string().email(),
});

const createNewPasswordSchema = z
  .object({
    newPassword: z.string().min(6, { message: 'Password must be at least 6 characters' }),
    confirmPassword: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function ForgotPasswordPage() {
  const [passwordReset, setPasswordReset] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(emptyOtpDigits);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
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
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (!passwordReset) return;
    const timer = setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    return () => clearTimeout(timer);
  }, [passwordReset]);

  const { mutate, status } = useMutation({
    mutationFn: (data: { email: string }) => authServices.resetPassword(data),
    onSuccess: (_data, variables) => {
      toast.success('Password reset code sent successfully, check your email');
      setSubmittedEmail(variables.email);
      setOtp(emptyOtpDigits());
      createPasswordForm.reset({ newPassword: '', confirmPassword: '' });
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
      setSubmittedEmail('');
      setOtp(emptyOtpDigits());
      form.reset();
      createPasswordForm.reset();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Failed to reset password';
      toast.error(message);
    },
  });

  const onSubmitNewPassword = (values: z.infer<typeof createNewPasswordSchema>) => {
    const token = otp.join('');
    if (!submittedEmail) {
      toast.error('Please enter your email on the previous step');
      return;
    }
    if (token.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }
    createPassword({
      token,
      password: values.newPassword,
      email: submittedEmail,
    });
  };

  return (
    <AuthPageShell
      title={passwordReset ? 'Create New Password' : 'Reset Password'}
      subtitle={
        passwordReset
          ? submittedEmail
            ? `Code sent to ${submittedEmail}`
            : 'Enter your code and new password'
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
                    <Input {...field} type="email" autoComplete="email" />
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
            <div className="space-y-2">
              <p className="text-sm font-medium leading-none">Enter OTP</p>
              <OtpFields
                value={otp}
                onChange={setOtp}
                inputRefs={otpInputRefs}
                disabled={newPasswordStatus === 'pending'}
              />
            </div>

            <FormField
              control={createPasswordForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        {...field}
                        type={showPassword.newPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                      />
                    </FormControl>
                    <Button
                      variant="ghost"
                      type="button"
                      className="absolute top-1/2 right-2 -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() =>
                        setShowPassword((prev) => ({
                          ...prev,
                          newPassword: !prev.newPassword,
                        }))
                      }
                      aria-label={showPassword.newPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword.newPassword ? (
                        <EyeOff className="h-4 w-4 text-grey-600" />
                      ) : (
                        <Eye className="h-4 w-4 text-grey-600" />
                      )}
                    </Button>
                  </div>
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
                  <div className="relative">
                    <FormControl>
                      <Input
                        {...field}
                        type={showPassword.confirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                      />
                    </FormControl>
                    <Button
                      variant="ghost"
                      type="button"
                      className="absolute top-1/2 right-2 -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() =>
                        setShowPassword((prev) => ({
                          ...prev,
                          confirmPassword: !prev.confirmPassword,
                        }))
                      }
                      aria-label={
                        showPassword.confirmPassword ? 'Hide password' : 'Show password'
                      }
                    >
                      {showPassword.confirmPassword ? (
                        <EyeOff className="h-4 w-4 text-grey-600" />
                      ) : (
                        <Eye className="h-4 w-4 text-grey-600" />
                      )}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-12 font-bold"
              disabled={newPasswordStatus === 'pending' || otp.some((d) => !d)}
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
