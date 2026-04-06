import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  InputOTP, 
  InputOTPGroup, 
  InputOTPSeparator, 
  InputOTPSlot 
} from "@/components/ui/input-otp";
import { useSignUp } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function VerifySignup() {
  const [isLoading, setIsLoading] = useState(false);
  const [value, setValue] = useState("");
  const { isLoaded, signUp, setActive } = useSignUp();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    
    setIsLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: value,
      });
      
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setLocation("/profile");
        toast({ title: "Success", description: "Account created and verified!", variant: "default" });
      } else {
        console.log(result);
      }
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.errors?.[0]?.message || err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!isLoaded) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      toast({ title: "Code resent", description: "Check your email for the new code." });
    } catch (err: any) {
      toast({ title: "Error resending code", description: err.errors?.[0]?.message || err.message, variant: "destructive" });
    }
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="mb-8 text-center lg:text-left">
        <h1 className="text-2xl md:text-3xl font-light text-gray-200 tracking-tight mb-2">
          Verify your identity
        </h1>
        <p className="text-gray-400 text-[15px]">
          We've sent a 6-digit verification code to your email.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 flex flex-col items-center">
        <InputOTP
          maxLength={6}
          value={value}
          onChange={(value) => setValue(value)}
          className="mt-2"
        >
          <InputOTPGroup className="gap-2 sm:gap-3">
            <InputOTPSlot index={0} className="w-10 h-12 sm:w-12 sm:h-14 text-xl bg-white/10 border-white/20 text-white rounded-md" />
            <InputOTPSlot index={1} className="w-10 h-12 sm:w-12 sm:h-14 text-xl bg-white/10 border-white/20 text-white rounded-md" />
            <InputOTPSlot index={2} className="w-10 h-12 sm:w-12 sm:h-14 text-xl bg-white/10 border-white/20 text-white rounded-md" />
          </InputOTPGroup>
          <InputOTPSeparator className="text-white/50 mx-1 sm:mx-2" />
          <InputOTPGroup className="gap-2 sm:gap-3">
            <InputOTPSlot index={3} className="w-10 h-12 sm:w-12 sm:h-14 text-xl bg-white/10 border-white/20 text-white rounded-md" />
            <InputOTPSlot index={4} className="w-10 h-12 sm:w-12 sm:h-14 text-xl bg-white/10 border-white/20 text-white rounded-md" />
            <InputOTPSlot index={5} className="w-10 h-12 sm:w-12 sm:h-14 text-xl bg-white/10 border-white/20 text-white rounded-md" />
          </InputOTPGroup>
        </InputOTP>

        <Button 
          type="submit" 
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 p-6 md:text-[16px] mt-6"
          disabled={isLoading || value.length < 6}
        >
          {isLoading ? "Verifying..." : "Verify Code"}
        </Button>
      </form>

      <div className="mt-8 text-center text-sm">
        <span className="text-gray-400">Didn't receive a code? </span>
        <button type="button" onClick={handleResend} className="text-purple-400 hover:text-purple-300 transition-colors font-medium ml-1">
          Resend
        </button>
      </div>
    </div>
  );
}
