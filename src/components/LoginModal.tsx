import { useState } from "react";
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
import { useAuth } from "@/store/useAuth";
import { authServices } from "@/services/authServices";
import { User } from "@/types/auth";
import toast from "react-hot-toast";
import { Loader, Eye, EyeOff, X } from "lucide-react";
import CreateAccountModal from "./CreateAccountModal";

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

  const { mutate, status } = useMutation({
    mutationFn: authServices.login,
    onSuccess: ({ status: responseStatus, data }) => {
      if (responseStatus) {
        const user: User = data.result;
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

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    mutate(values);
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
    </div>
  );
}
