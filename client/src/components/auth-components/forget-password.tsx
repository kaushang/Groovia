import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSignIn } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight } from "lucide-react";

export default function ForgetPassword({ onCancel }: { onCancel: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasSentPasswordCode, setHasSentPasswordCode] = useState(false);
  const { isLoaded: isSignInLoaded, signIn, setActive } = useSignIn();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  const handleForgotPasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isSignInLoaded) return;
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setHasSentPasswordCode(true);
      toast({ title: "Check your email", description: "We sent you a code to reset your password.", variant: "default" });
    } catch (err: any) {
      toast({ title: "Error", description: err.errors?.[0]?.message || err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isSignInLoaded) return;
    setIsLoading(true);
    
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password,
      });
      
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setLocation("/");
        toast({ title: "Success", description: "Password reset correctly!", variant: "default" });
      } else {
        console.log(result);
      }
    } catch (err: any) {
      toast({ title: "Error reset password", description: err.errors?.[0]?.message || err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="mb-8 text-center lg:text-left">
        <h1 className="text-2xl md:text-3xl font-light text-gray-200 tracking-tight mb-2">
          Reset Password
        </h1>
        <p className="text-gray-400 text-[15px]">
          {!hasSentPasswordCode ? "Enter your email to receive a reset code." : "Enter the 6-digit code and a new password."}
        </p>
      </div>

      {!hasSentPasswordCode ? (
        <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="reset-email" className="text-gray-200 ml-1">Email Address</Label>
            <Input
              id="reset-email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20 md:text-[16px] p-2 h-auto tracking-wide transition-all"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 p-6 md:text-[16px] mt-6 flex items-center justify-center gap-2 group"
            disabled={isLoading}
          >
            {isLoading ? "Sending code..." : <>Send Reset Code <ArrowRight className="w-[18px] h-[18px] group-hover:translate-x-1 transition-transform" /></>}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="reset-code" className="text-gray-200 ml-1">Reset Code</Label>
            <Input
              id="reset-code"
              name="code"
              type="text"
              placeholder="123456"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20 md:text-[16px] p-2 h-auto tracking-wide transition-all"
              maxLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-gray-200 ml-1">New Password</Label>
            <Input
              id="new-password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20 md:text-[16px] p-2 h-auto tracking-wide transition-all"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 p-6 md:text-[16px] mt-6 flex items-center justify-center gap-2 group"
            disabled={isLoading}
          >
            {isLoading ? "Resetting..." : <>Reset Password <ArrowRight className="w-[18px] h-[18px] group-hover:translate-x-1 transition-transform" /></>}
          </Button>
        </form>
      )}
      
      <div className="mt-6 text-center">
        <button 
          onClick={onCancel} 
          type="button" 
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          Back to login
        </button>
      </div>
    </div>
  );
}
