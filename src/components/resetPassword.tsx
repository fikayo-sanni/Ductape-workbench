import toast from "react-hot-toast";
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
import { authServices } from "@/services/authServices";
import { Eye, EyeOff, Loader } from "lucide-react";
import { useState } from "react";

const resetPasswordSchema = z.object({
  email: z.string().email(),
});

const createNewPasswordSchema = z
  .object({
    token: z.string().min(6, { message: "OTP must be 6 characters" }),
    newPassword: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });


export default function ResetPassword() {
  const [ passwordReset, setPasswordReset ] = useState(false);
  const [showPassword, setShowPassword] = useState({
    newPassword: false,
    confirmPassword: false,
  });

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const createPasswordForm = useForm<z.infer<typeof createNewPasswordSchema>>({
    resolver: zodResolver(createNewPasswordSchema),
    defaultValues: {
      token: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { mutate, status } = useMutation({
    mutationFn: (data: { email: string }) => authServices.resetPassword(data),
    onSuccess: () => {
      toast.success("Password reset code sent successfully, check your email");
      setPasswordReset(true);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { mutate: createPassword, status: newPasswordStatus } = useMutation({
    mutationFn: (data: { token: string; password: string; email: string }) =>
      authServices.createNewPassword(data),
    onSuccess: () => {
      toast.success("Password changed successfully, please login");
      setPasswordReset(false)
    },
    onError: (error: any) => {
    const message = error?.response?.data?.message || error.message || "Failed to send reset code";
    toast.error(message);
  },
  });

  const onSubmit = (values: z.infer<typeof resetPasswordSchema>) => {
    mutate(values);
  };

  const email = form.getValues("email");
  
  const onSubmitNewPassword = (values: z.infer<typeof createNewPasswordSchema>) => {
    if (!email || typeof email !== "string") {
      toast.error("Please navigate to the reset password modal and try again");
      return;
    }

    const payload = {
      token: values.token,
      password: values.newPassword,
      email: email,
    };
    createPassword(payload);
  };


  return (
    <>
    {!passwordReset ? (
    <div className="flex items-center w-full">
      {/* hack to preload the background image above */}
      <div className="mx-auto max-w-[456px] w-full flex flex-col items-center justify-center gap-10">
        <img src="/ductape-icon.svg" alt="Ductape" width={40} height={40} />

        <div className="bg-white rounded-10px px-4 sm:px-7 py-8 w-full">
          <div className="flex flex-col items-center text-center gap-1">
            <h1 className="text-grey text-2xl font-bold">Reset Password</h1>
            <p className="text-grey-600 max-w-[296px]">
              Enter your email address and we'll send you a code to reset your
              password
            </p>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-8 w-full"
            >
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email address</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="mt-9 w-full font-bold h-12"
                disabled={status === "pending"}
              >
                {status === "pending" && (
                  <Loader className="animate-spin mr-2 size-5" />
                )}
                Send code
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
              ): (
<div className="flex items-center w-full relative p-4">
      <div className="mx-auto max-w-[456px] w-full flex flex-col items-center justify-center gap-10">

        <div className="bg-white rounded-10px px-4 sm:px-7 py-8 w-full">
          <div className="flex flex-col items-center text-center gap-1">
            <h1 className="text-grey text-2xl font-bold">
              Create New Password
            </h1>
          </div>

          <Form {...createPasswordForm}>
            <form
              onSubmit={createPasswordForm.handleSubmit(onSubmitNewPassword)}
              className="mt-8 w-full"
            >
              <div className="space-y-4">
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
                          <Input
                            {...field}
                            type={
                              showPassword.newPassword ? "text" : "password"
                            }
                          />
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
                            aria-label={
                              showPassword.newPassword
                                ? "Hide password"
                                : "Show password"
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
                            type={
                              showPassword.confirmPassword ? "text" : "password"
                            }
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
                            aria-label={
                              showPassword.confirmPassword
                                ? "Hide password"
                                : "Show password"
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
              </div>

              <Button
                type="submit"
                className="mt-9 w-full font-bold h-12"
                disabled={newPasswordStatus === "pending"}
              >
                {newPasswordStatus === "pending" && (
                  <Loader className="animate-spin mr-2 size-5" />
                )}
                Update Password
              </Button>
            </form>
          </Form>
        </div>

        

       
      </div>
    </div>

              )}
              </>
  );
}