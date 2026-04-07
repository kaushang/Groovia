import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GlassPanel from "@/components/glass-panel";
import { useSignUp, useSignIn } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Disc3 } from "lucide-react";
import AnimatedLogo from "@/components/animated-logo";
import ForgetPassword from "@/components/auth-components/forget-password";
import VerifySignup from "@/components/auth-components/verify-signup";

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const { isLoaded: isSignUpLoaded, signUp } = useSignUp();
  const { isLoaded: isSignInLoaded, signIn, setActive } = useSignIn();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isSignInLoaded) return;

    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setLocation("/home");
      } else {
        console.log(result);
      }
    } catch (err: any) {
      toast({
        title: "Error signing in",
        description: err.errors?.[0]?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isSignUpLoaded) return;

    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      await signUp.create({
        username,
        emailAddress: email,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      toast({
        title: "Error signing up",
        description: err.errors?.[0]?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full">
      {/* Left section - Branding & Visuals (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center p-12">
        <div className="md:h-fit w-full flex items-center flex-col items-center justify-center">
          <div className="w-full flex justify-center">
            <AnimatedLogo size="md" />
          </div>

          {/* Floating Vinyl & Album Art */}
          <div className="relative w-full h-[360px] max-w-[680px] mx-auto hidden sm:block scale-110 translate-y-4">
            {/* Left Vinyl Record */}
            <div className="absolute top-1/2 left-[6%] -translate-y-1/2">
              <div className="w-48 h-48 rounded-full bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] border border-white/5 shadow-2xl flex items-center justify-center">
                {/* Vinyl grooves */}
                <div className="w-36 h-36 rounded-full border border-white/5 flex items-center justify-center">
                  <div className="w-28 h-28 rounded-full border border-white/5 flex items-center justify-center">
                    {/* Vinyl center label */}
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center border-2 border-[#1a1a1a]">
                      <div className="w-4 h-4 rounded-full bg-[#0a0a0a]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Left Tilted Album Cover */}
            <div className="absolute top-[35%] left-[22%] -translate-y-1/2 w-40 h-40 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 shadow-2xl backdrop-blur-md z-[15] transform -rotate-12 hover:-rotate-6 transition-transform duration-500 overflow-hidden">
              <img
                src="images/For A Reason.jpg"
                alt="Album cover left"
                className="absolute inset-0 w-full h-full object-cover z-0"
              />
              <div className="absolute -top-5 -left-5 w-24 h-24 bg-pink-500/30 rounded-full blur-lg" />
            </div>

            {/* Right Tilted Album Cover */}
            <div className="absolute top-[45%] right-[15%] -translate-y-1/2 w-44 h-44 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/10 shadow-2xl backdrop-blur-md z-0 transform rotate-12 hover:rotate-6 transition-transform duration-500 overflow-hidden">
              <img
                src="images/With You.jpg"
                alt="Album cover right"
                className="absolute inset-0 w-full h-full object-cover z-0"
              />
              <div className="absolute -top-5 -left-5 w-24 h-24 bg-cyan-500/30 rounded-full blur-lg" />
            </div>

            {/* Front Album Glass Cover */}
            <div className="absolute top-[55%] left-[50%] -translate-y-1/2 -translate-x-1/2 w-56 h-56 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 shadow-[0_0_50px_rgba(168,85,247,0.3)] backdrop-blur-xl z-20 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform duration-500">
              <img
                src="images/Thodi Si Daaru.jpg"
                alt="Album cover front"
                className="absolute inset-0 w-full h-full object-cover z-0"
              />

              {/* Abstract Album Art shapes */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/40 rounded-full blur-xl animate-pulse-soft z-0" />
              <div
                className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/40 rounded-full blur-xl animate-pulse-soft z-0"
                style={{ animationDelay: "1s" }}
              />
            </div>

            {/* Background glowing orb */}
            <div className="absolute top-[55%] left-[50%] -translate-y-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-purple-600/20 rounded-full blur-[90px] -z-10" />
          </div>
        </div>
      </div>

      {/* Right section - Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 md:p-12 relative min-h-[100dvh]">
        {/* Mobile Logo */}
        <div className="lg:hidden absolute p-6 top-8 left-0 w-full flex justify-center opacity-90">
          <AnimatedLogo size="lg" />
        </div>

        <div className="w-full max-w-[460px] z-10 mt-24 lg:mt-0 relative lg:-ml-60">
          <GlassPanel className="p-6 sm:p-8">
            {pendingVerification ? (
              <VerifySignup />
            ) : isForgotPassword ? (
              <ForgetPassword onCancel={() => setIsForgotPassword(false)} />
            ) : (
              <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="mb-8 text-center lg:text-left">
                  <h1 className="text-2xl md:text-3xl font-light text-gray-200 tracking-tight mb-2">
                    {activeTab === "login" ? "Welcome Back" : "Join the vibe"}
                  </h1>
                  <p className="text-gray-400 text-[15px]">
                    Enter your details to get started.
                  </p>
                </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-black/30 p-0 px-1 border border-white/5">
                <TabsTrigger value="login" className="text-gray-300">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-gray-300">
                  Create Account
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="login"
                className="mt-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-200 ml-1">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="name@example.com"
                      required
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20 md:text-[16px] p-2 h-auto tracking-wide transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <Label htmlFor="password" className="text-gray-200">
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={() => setIsForgotPassword(true)}
                        className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20 md:text-[16px] p-2 h-auto tracking-wide transition-all"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 p-6 md:text-[16px] mt-6 flex items-center justify-center gap-2 group"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      "Signing in..."
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="w-[18px] h-[18px] group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent
                value="signup"
                className="mt-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <form onSubmit={handleSignUp} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-gray-200 ml-1">
                      Username
                    </Label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="johndoe"
                      required
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20 md:text-[16px] p-2 h-auto tracking-wide transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="signup-email"
                      className="text-gray-200 ml-1"
                    >
                      Email Address
                    </Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="name@example.com"
                      required
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20 md:text-[16px] p-2 h-auto tracking-wide transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="signup-password"
                      className="text-gray-200 ml-1"
                    >
                      Password
                    </Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20 md:text-[16px] p-2 h-auto tracking-wide transition-all"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 p-6 md:text-[16px] mt-6 flex items-center justify-center gap-2 group"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      "Creating account..."
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="w-[18px] h-[18px] group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
              </div>
            )}
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
