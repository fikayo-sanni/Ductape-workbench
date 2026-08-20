import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Mail, Loader, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { triggerOnboardingForNewUser } from '@/utils/onboarding';
import { authServices } from '@/services/authServices';
import { SignupPayload, User } from '@/types/auth';
import { useAuth } from '@/store/useAuth';
import RedirectIfAuthenticated from '@/components/auth/RedirectIfAuthenticated';
import AuthPageShell from '@/components/auth/AuthPageShell';

const signupSchema = z
  .object({
    firstname: z.string().min(1, { message: 'First name is required' }),
    lastname: z.string().min(1, { message: 'Last name is required' }),
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
    confirmPassword: z.string().min(6, { message: 'Password must be at least 6 characters' }),
    terms: z.boolean().refine((val) => val === true, {
      message: 'Please accept terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type Step = 'signup' | 'otp';

function SignupForm() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [step, setStep] = useState<Step>('signup');
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState({ password: false, confirmPassword: false });
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstname: '',
      lastname: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
  });

  useEffect(() => {
    if (step === 'otp' && otpInputRefs.current[0]) {
      otpInputRefs.current[0].focus();
    }
  }, [step]);

  const { mutate: signupMutate, status: signupStatus } = useMutation({
    mutationFn: (data: SignupPayload) => authServices.signup(data),
    onSuccess: ({ data }) => {
      setUserId(data._id);
      setUserEmail(data.email);
      setStep('otp');
      toast.success('Verification code sent to your email!');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.errors || 'Failed to create account. Please try again.';
      toast.error(message);
    },
  });

  const { mutate: verifyMutate, status: verifyStatus } = useMutation({
    mutationFn: (data: { token: string; user_id: string }) => authServices.verifyEmail(data),
    onSuccess: ({ data }) => {
      const user: User = data.result;
      setUser(user);
      toast.success("Welcome to Ductape! Let's get you set up.");
      triggerOnboardingForNewUser();
      navigate('/onboarding');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.errors || 'Invalid or expired OTP. Please try again.';
      toast.error(message);
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

  const onSubmit = (values: z.infer<typeof signupSchema>) => {
    const { confirmPassword, terms, ...payload } = values;
    signupMutate({ ...payload, active: 'true' });
  };

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

  if (step === 'otp') {
    return (
      <AuthPageShell
        testId="signup-otp-page"
        title="Verify Your Email"
        subtitle={`Code sent to ${userEmail}`}
        icon={<Mail className="h-5 w-5" />}
      >
        <div className="flex justify-center gap-2 mb-6">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (otpInputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
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
            'Verify & Continue'
          )}
        </Button>

        <p className="mt-4 text-center text-sm text-grey-600">
          Didn&apos;t receive the code?{' '}
          <button
            onClick={() => resendMutate({ user_id: userId })}
            disabled={resendStatus === 'pending'}
            className="text-primary font-semibold hover:underline disabled:opacity-50"
          >
            {resendStatus === 'pending' ? 'Sending...' : 'Resend Code'}
          </button>
        </p>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      testId="signup-page"
      title="Create your account"
      subtitle="Get started for Free"
      icon={<UserPlus className="h-5 w-5" />}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="John" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Doe" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="john@example.com" />
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
                      type={showPassword.password ? 'text' : 'password'}
                    />
                    <Button
                      variant="ghost"
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() =>
                        setShowPassword({ ...showPassword, password: !showPassword.password })
                      }
                    >
                      {showPassword.password ? (
                        <EyeOff className="h-4 w-4 text-grey-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-grey-500" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() =>
                        setShowPassword({
                          ...showPassword,
                          confirmPassword: !showPassword.confirmPassword,
                        })
                      }
                    >
                      {showPassword.confirmPassword ? (
                        <EyeOff className="h-4 w-4 text-grey-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-grey-500" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="terms"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-start gap-3">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-1" />
                  </FormControl>
                  <FormLabel className="text-sm text-grey-600 leading-relaxed font-normal">
                    I agree to Ductape&apos;s terms and privacy policy
                  </FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full h-12 font-bold" disabled={signupStatus === 'pending'}>
            {signupStatus === 'pending' && <Loader className="animate-spin mr-2 size-5" />}
            Create Account
          </Button>
        </form>
      </Form>

      <p className="mt-6 text-center text-sm text-grey-600">
        Already have an account?{' '}
        <Link to="/login" className="text-primary font-semibold hover:underline">
          Login
        </Link>
      </p>
    </AuthPageShell>
  );
}

export default function SignupPage() {
  return (
    <RedirectIfAuthenticated>
      <SignupForm />
    </RedirectIfAuthenticated>
  );
}
