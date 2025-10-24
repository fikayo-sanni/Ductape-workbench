import { useState } from "react";
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
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { triggerOnboardingForNewUser } from "@/utils/onboarding";
import { authServices } from "@/services/authServices";
import { SignupPayload } from "@/types/auth";

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


export default function CreateAccountModal({ open, onClose, onSuccess }: CreateAccountModalProps) {
  const [showPassword, setShowPassword] = useState({
    password: false,
    confirmPassword: false,
  });

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

  const { mutate, status } = useMutation({
    mutationFn: (data: SignupPayload) => authServices.signup(data),
    onSuccess: () => {
      toast.success("Account created successfully! Please log in to continue.");
      
      // Trigger onboarding for new user
      triggerOnboardingForNewUser();
      
      // Close modal and reset form
      onClose();
      form.reset();
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.errors || "Failed to create account. Please try again.";
      toast.error(errorMessage);
    },
  });

  const onSubmit = (values: z.infer<typeof signupSchema>) => {
    const { confirmPassword, terms, ...payload } = values;
    mutate({
      ...payload,
      active: "true",
    });
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                disabled={status === "pending"}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={status === "pending"}
              >
                {status === "pending" ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </form>
        </Form>

        {/* Social Login Options */}
        <div className="mt-6">
          <div className="flex items-center">
            <hr className="flex-grow border-t border-grey-200" />
            <span className="px-3 text-grey-500 text-sm font-medium">OR</span>
            <hr className="flex-grow border-t border-grey-200" />
          </div>

          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1 h-10"
              onClick={() => {
                // Handle Google OAuth
                window.location.href = `${
                  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/'
                }users/v1/auth/google`;
              }}
            >
              Google
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-10"
              onClick={() => {
                // Handle GitHub OAuth
                window.location.href = `${
                  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/'
                }users/v1/auth/github`;
              }}
            >
              GitHub
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-10"
              onClick={() => {
                // Handle LinkedIn OAuth
                window.location.href = `${
                  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/'
                }users/v1/auth/linkedin`;
              }}
            >
              LinkedIn
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
