import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/store/useAuth';
import { authServices } from '@/services/authServices';
import { User } from '@/types/auth';
import toast from 'react-hot-toast';
import { Loader, Eye, EyeOff, Mail, LogIn } from 'lucide-react';
import { triggerOnboardingForNewUser } from '@/utils/onboarding';
import RedirectIfAuthenticated from '@/components/auth/RedirectIfAuthenticated';
import AuthPageShell from '@/components/auth/AuthPageShell';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const searchParams = new URLSearchParams(location.search);
  const returnTo = (location.state as { from?: string } | null)?.from || searchParams.get('from') || '/';

  useEffect(() => {
    if (showOtpModal && otpInputRefs.current[0]) {
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    }
  }, [showOtpModal]);

  const { mutate, status } = useMutation({
    mutationFn: authServices.login,
    onSuccess: ({ status: responseStatus, data }) => {
      if (!responseStatus) {
        toast.error('Login failed: unexpected error');
        return;
      }

      const user: User = data.result;
      if (user.requires_verification) {
        setUserId(user._id);
        setUserEmail(user.email);
        setShowOtpModal(true);
        toast.success('Verification code sent to your email!');
        return;
      }

      localStorage.setItem('token', user.auth_token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      toast.success('Login successful');
      navigate(returnTo || '/');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.errors || 'Failed to Login';
      toast.error(message);
    },
  });

  const { mutate: verifyMutate, status: verifyStatus } = useMutation({
    mutationFn: (data: { token: string; user_id: string }) => authServices.verifyEmail(data),
    onSuccess: ({ data }) => {
      const user: User = data.result;
      setUser(user);
      toast.success('Email verified! Welcome to Ductape!');
      triggerOnboardingForNewUser();
      setShowOtpModal(false);
      navigate('/onboarding');
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.errors || 'Invalid or expired OTP. Please try again.';
      toast.error(errorMessage);
      setOtp(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    },
  });

  const { mutate: resendMutate, status: resendStatus } = useMutation({
    mutationFn: (data: { user_id: string }) => authServices.resendVerificationOTP(data),
    onSuccess: () => {
      toast.success('New verification code sent!');
      setOtp(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.errors || 'Failed to resend code. Please try again.';
      toast.error(message);
    },
  });

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpInputRefs.current[index + 1]?.focus();
    if (newOtp.every((digit) => digit !== '') && newOtp.join('').length === 6) {
      verifyMutate({ token: newOtp.join(''), user_id: userId });
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      verifyMutate({ token: pastedData, user_id: userId });
    }
  };

  return (
    <AuthPageShell
      testId="login-page"
      title="Welcome back"
      subtitle="Sign in to your workbench"
      icon={<LogIn className="h-5 w-5" />}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit((values) => mutate(values))} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="your@email.com" data-testid="login-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPassword ? 'text' : 'password'}
                      data-testid="login-password"
                    />
                    <Button
                      variant="ghost"
                      type="button"
                      className="absolute top-1/2 right-2 -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
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

          <div className="text-end">
            <Link to="/forgot-password" className="text-primary text-sm font-bold hover:underline">
              Forgot your password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full font-bold h-12"
            disabled={status === 'pending'}
            data-testid="login-submit"
          >
            {status === 'pending' && <Loader className="animate-spin mr-2 size-5" />}
            Login
          </Button>
        </form>
      </Form>

      <div className="flex items-center my-6">
        <hr className="flex-grow border-t border-grey-400" />
        <span className="px-3 text-grey-700 text-sm font-semibold">OR</span>
        <hr className="flex-grow border-t border-grey-400" />
      </div>

      <div className="flex gap-4">
        {[
          { name: 'google', label: 'Google' },
          { name: 'github', label: 'GitHub' },
        ].map((provider) => (
          <Button
            key={provider.name}
            variant="outline"
            className="flex-1"
            onClick={() => {
              window.location.href = `${import.meta.env.VITE_API_BASE_URL}users/v1/auth/${provider.name}`;
            }}
          >
            <span className="capitalize">{provider.label}</span>
          </Button>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-grey-600">
        New to Ductape?{' '}
        <Link to="/signup" className="text-primary font-semibold hover:underline">
          Create an account
        </Link>
      </p>

      <Dialog open={showOtpModal} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-md"
          hideCloseButton
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-grey">Verify Your Email</DialogTitle>
            <DialogDescription className="text-grey-600 mt-2">
              <span className="flex items-center gap-2 mt-2">
                <Mail className="h-4 w-4" />
                <span>
                  We sent a 6-digit code to <strong>{userEmail}</strong>
                </span>
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="mt-8 space-y-6">
            <div className="flex justify-center gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (otpInputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={handleOtpPaste}
                  className="w-12 h-14 text-center text-xl font-semibold border border-grey-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  disabled={verifyStatus === 'pending'}
                />
              ))}
            </div>

            <Button
              onClick={() => verifyMutate({ token: otp.join(''), user_id: userId })}
              className="w-full"
              disabled={verifyStatus === 'pending' || otp.some((d) => !d)}
            >
              {verifyStatus === 'pending' ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Email'
              )}
            </Button>

            <div className="text-center text-sm text-grey-600">
              Didn&apos;t receive the code?{' '}
              <button
                onClick={() => resendMutate({ user_id: userId })}
                disabled={resendStatus === 'pending'}
                className="text-primary font-semibold hover:underline disabled:opacity-50"
              >
                {resendStatus === 'pending' ? 'Sending...' : 'Resend Code'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AuthPageShell>
  );
}

export default function LoginPage() {
  return (
    <RedirectIfAuthenticated>
      <LoginForm />
    </RedirectIfAuthenticated>
  );
}
