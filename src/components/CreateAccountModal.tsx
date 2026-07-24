import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, EyeOff, Mail, Loader } from "lucide-react";
import toast from "react-hot-toast";
import { triggerOnboardingForNewUser } from "@/utils/onboarding";
import { authServices } from "@/services/authServices";
import { SignupPayload, User } from "@/types/auth";
import { useAuth } from "@/store/useAuth";
import { isSelfHosted } from "@/helpers/env";

const signupSchema = z
  .object({
    firstname: z.string().min(1, { message: "First name is required" }),
    lastname: z.string().min(1, { message: "Last name is required" }),
    email: z.string().email({ message: "Invalid email address" }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
    terms: z.boolean().refine((val) => val === true, {
      message: "Please accept terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

interface CreateAccountModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = "signup" | "otp";

export default function CreateAccountModal({ open, onClose, onSuccess }: CreateAccountModalProps) {
  const { setUser } = useAuth();
  const [step, setStep] = useState<Step>("signup");
  const [userId, setUserId] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [showPassword, setShowPassword] = useState({
    password: false,
    confirmPassword: false,
  });
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstname: "",
      lastname: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  // Focus first OTP input when switching to OTP step
  useEffect(() => {
    if (step === "otp" && otpInputRefs.current[0]) {
      otpInputRefs.current[0].focus();
    }
  }, [step]);

  // Signup mutation
  const { mutate: signupMutate, status: signupStatus } = useMutation({
    mutationFn: (data: SignupPayload) => authServices.signup(data),
    onSuccess: ({ data }) => {
      setUserId(data._id);
      setUserEmail(data.email);
      setStep("otp");
      toast.success("Verification code sent to your email!");
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.errors || "Failed to create account. Please try again.";
      toast.error(errorMessage);
    },
  });

  // Verify OTP mutation
  const { mutate: verifyMutate, status: verifyStatus } = useMutation({
    mutationFn: (data: { token: string; user_id: string }) => authServices.verifyEmail(data),
    onSuccess: ({ data }) => {
      const user: User = data.result;
      setUser(user);

      toast.success("Welcome to Ductape! Let's get you set up.");

      // Trigger onboarding for new user
      triggerOnboardingForNewUser();

      // Close modal and reset form
      handleFullReset();

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
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

  const onSubmit = (values: z.infer<typeof signupSchema>) => {
    const { confirmPassword, terms, ...payload } = values;
    signupMutate({
      ...payload,
      active: "true",
    });
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

  const handleFullReset = () => {
    form.reset();
    setStep("signup");
    setUserId("");
    setUserEmail("");
    setOtp(["", "", "", "", "", ""]);
    onClose();
  };

  const handleClose = () => {
    handleFullReset();
  };

  // Prevent closing modal during OTP step - user must complete verification
  const handleOpenChange = (isOpen: boolean) => {
    // Only allow closing if we're on the signup step (not OTP verification)
    if (!isOpen && step === "otp") {
      return; // Prevent closing during OTP step
    }
    if (!isOpen) {
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        data-testid="create-account-modal"
        className="max-w-md max-h-[90vh] overflow-y-auto"
        hideCloseButton={step === "otp"}
        onInteractOutside={(e) => {
          if (step === "otp") {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (step === "otp") {
            e.preventDefault();
          }
        }}
      >
        {step === "signup" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-grey">
                Create Account
              </DialogTitle>
              <DialogDescription className="text-grey-600">
                Let's get you set up with Ductape Workbench
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="mt-6 space-y-4"
              >
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
                            type={showPassword.password ? "text" : "password"}
                            placeholder="Enter your password"
                          />
                          <Button
                            variant="ghost"
                            type="button"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() =>
                              setShowPassword({
                                ...showPassword,
                                password: !showPassword.password,
                              })
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
                            type={showPassword.confirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                          />
                          <Button
                            variant="ghost"
                            type="button"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
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
                          <Checkbox
                            id="terms"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="mt-1"
                          />
                        </FormControl>
                        <FormLabel
                          htmlFor="terms"
                          className="text-sm text-grey-600 leading-relaxed"
                        >
                          By creating an account, you agree to Ductape's{" "}
                          <a
                            href="https://www.ductape.app/terms-of-use"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Terms of Use
                          </a>{" "}
                          and{" "}
                          <a
                            href="https://www.ductape.app/privacy-policy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Privacy Policy
                          </a>
                        </FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1"
                    disabled={signupStatus === "pending"}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={signupStatus === "pending"}
                  >
                    {signupStatus === "pending" ? (
                      <>
                        <Loader className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </div>
              </form>
            </Form>

            {/* Social Login Options */}
            {!isSelfHosted() && (
              <div className="mt-6">
                <div className="flex items-center">
                  <hr className="flex-grow border-t border-grey-200" />
                  <span className="px-3 text-grey-500 text-sm font-medium">OR</span>
                  <hr className="flex-grow border-t border-grey-200" />
                </div>

                <div className="flex gap-4 items-center mt-6">
                  {[
                    { name: "google", label: "Google" },
                    { name: "github", label: "GitHub" },
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
              </div>
            )}
          </>
        ) : (
          <>
            {/* OTP Verification Step */}
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-grey">
                Verify Your Email
              </DialogTitle>
              <DialogDescription className="text-grey-600 mt-2">
                <span className="flex items-center gap-2 mt-2">
                  <Mail className="h-4 w-4" />
                  <span>We sent a 6-digit code to <strong>{userEmail}</strong></span>
                </span>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
