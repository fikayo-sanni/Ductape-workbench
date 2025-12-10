import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "./ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useAuth } from "@/store/useAuth";
import { authServices } from "@/services/authServices";
import { User } from "@/types/auth";
import toast from "react-hot-toast";
import { Loader, Eye, EyeOff, Mail } from "lucide-react";
import CreateAccountModal from "./CreateAccountModal";
import { triggerOnboardingForNewUser } from "@/utils/onboarding";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

interface LoginModalProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function LoginModal({ onSuccess, onClose }: LoginModalProps) {
  const { setUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);

  // OTP verification state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first OTP input when modal opens
  useEffect(() => {
    if (showOtpModal && otpInputRefs.current[0]) {
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    }
  }, [showOtpModal]);

  const { mutate, status } = useMutation({
    mutationFn: authServices.login,
    onSuccess: ({ status: responseStatus, data }) => {
      if (responseStatus) {
        const user: User = data.result;

        // Check if user needs email verification
        if (user.requires_verification) {
          setUserId(user._id);
          setUserEmail(user.email);
          setShowOtpModal(true);
          toast.success("Verification code sent to your email!");
          return;
        }

        localStorage.setItem("token", user.auth_token);
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);
        toast.success("Login successful");
        onSuccess?.();
      } else {
        toast.error("Login failed: unexpected error");
      }
    },
    onError: (error: any) => {
      console.error(error);
      const message = error?.response?.data?.errors || "Failed to Login";
      toast.error(message);
    },
  });

  // Verify OTP mutation
  const { mutate: verifyMutate, status: verifyStatus } = useMutation({
    mutationFn: (data: { token: string; user_id: string }) => authServices.verifyEmail(data),
    onSuccess: ({ data }) => {
      const user: User = data.result;
      setUser(user);

      toast.success("Email verified! Welcome to Ductape!");

      // Trigger onboarding for newly verified user
      triggerOnboardingForNewUser();

      // Close OTP modal and login modal
      setShowOtpModal(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.errors || "Invalid or expired OTP. Please try again.";
      toast.error(errorMessage);
      // Clear OTP inputs on error
      setOtp(["", "", "", "", "", ""]);
      otpInputRefs.current[0]?.focus();
    },
  });

  // Resend OTP mutation
  const { mutate: resendMutate, status: resendStatus } = useMutation({
    mutationFn: (data: { user_id: string }) => authServices.resendVerificationOTP(data),
    onSuccess: () => {
      toast.success("New verification code sent!");
      setOtp(["", "", "", "", "", ""]);
      otpInputRefs.current[0]?.focus();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.errors || "Failed to resend code. Please try again.";
      toast.error(errorMessage);
    },
  });

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    mutate(values);
  };

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (newOtp.every((digit) => digit !== "") && newOtp.join("").length === 6) {
      verifyMutate({ token: newOtp.join(""), user_id: userId });
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData.length === 6) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);
      verifyMutate({ token: pastedData, user_id: userId });
    }
  };

  const handleVerifyOtp = () => {
    const token = otp.join("");
    if (token.length !== 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }
    verifyMutate({ token, user_id: userId });
  };

  const handleResendOtp = () => {
    resendMutate({ user_id: userId });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white border border-grey-400 rounded-10px px-4 sm:px-7 py-8 w-full max-w-[456px] shadow-xl">

        {/* Ductape Logo */}
        <div className="flex justify-center mb-6">
          <div className="text-2xl font-bold text-primary">Ductape Workbench</div>
        </div>

        <div className="flex flex-col items-center text-center gap-1">
          <h1 className="text-grey text-2xl font-bold">Build Resilient Systems</h1>
          <p className="text-grey-600">Login to access the workbench</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 w-full space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="your@email.com" />
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
                      <Input {...field} type={showPassword ? "text" : "password"} />
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

            <Button
              type="submit"
              className="w-full font-bold h-12"
              disabled={status === "pending"}
            >
              {status === "pending" && <Loader className="animate-spin mr-2 size-5" />}
              Login
            </Button>
          </form>
        </Form>

        <div className="flex items-center mt-6">
          <hr className="flex-grow border-t border-grey-400" />
          <span className="px-3 text-grey-700 text-sm font-semibold">OR</span>
          <hr className="flex-grow border-t border-grey-400" />
        </div>

        <div className="flex gap-4 items-center mt-6">
          {[
            { name: "google", label: "Google" },
            { name: "github", label: "GitHub" },
            { name: "linkedin", label: "LinkedIn" },
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

        <div className="mt-6 text-center">
          <p className="text-sm text-grey-600">
            New to Ductape?{" "}
            <button
              onClick={() => setShowCreateAccountModal(true)}
              className="text-primary font-semibold underline hover:no-underline"
            >
              Create an account
            </button>
          </p>
        </div>
      </div>

      {/* Create Account Modal */}
      <CreateAccountModal
        open={showCreateAccountModal}
        onClose={() => setShowCreateAccountModal(false)}
        onSuccess={() => {
          // Close the login modal and show success message
          onClose?.();
          toast.success("Account created! Please log in to continue.");
        }}
      />

      {/* OTP Verification Modal */}
      <Dialog
        open={showOtpModal}
        onOpenChange={(isOpen) => {
          // Prevent closing - user must complete verification
          if (!isOpen) return;
        }}
      >
        <DialogContent
          className="max-w-md"
          hideCloseButton
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-grey">
              Verify Your Email
            </DialogTitle>
            <DialogDescription className="text-grey-600 mt-2">
              <div className="flex items-center gap-2 mt-2">
                <Mail className="h-4 w-4" />
                <span>We sent a 6-digit code to <strong>{userEmail}</strong></span>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="mt-8 space-y-6">
            {/* OTP Input */}
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
                  className="w-12 h-14 text-center text-xl font-semibold border border-grey-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  disabled={verifyStatus === "pending"}
                />
              ))}
            </div>

            {/* Verify Button */}
            <Button
              onClick={handleVerifyOtp}
              className="w-full"
              disabled={verifyStatus === "pending" || otp.some((d) => !d)}
            >
              {verifyStatus === "pending" ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </Button>

            {/* Resend Code */}
            <div className="text-center text-sm text-grey-600">
              Didn't receive the code?{" "}
              <button
                onClick={handleResendOtp}
                disabled={resendStatus === "pending"}
                className="text-primary font-semibold hover:underline disabled:opacity-50"
              >
                {resendStatus === "pending" ? "Sending..." : "Resend Code"}
              </button>
            </div>

            <p className="text-xs text-grey-500 text-center">
              The code expires in 5 minutes
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
