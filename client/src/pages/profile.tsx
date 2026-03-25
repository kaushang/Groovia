import { useUser, useClerk } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import GlassPanel from "@/components/glass-panel";
import { useLocation } from "wouter";

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();

  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  if (!user) {
    setLocation("/auth");
    return null;
  }

  const handleLogout = async () => {
    await signOut();
    setLocation("/");
  };

  return (
    <div className="min-h-screen flex py-12 md:justify-center items-center w-full px-6">
      <div className="w-full max-w-md mx-auto relative">
        <GlassPanel className="p-8 border-white/20 bg-gray-900/50 text-white">
          <h1 className="text-3xl font-bold mb-6 text-center text-white">Profile</h1>
          
          <div className="mb-8 text-left text-gray-200 space-y-4">
            <div>
              <p className="text-sm text-gray-400">Username</p>
              <p className="text-xl tracking-wide">{user.username || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Email Address</p>
              <p className="text-xl tracking-wide">{user.primaryEmailAddress?.emailAddress || "N/A"}</p>
            </div>
          </div>
          
          <div className="flex flex-col space-y-4">
             <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20 p-6 md:text-[16px] transition-colors"
            >
              Back to Home
            </Button>
            <Button 
              onClick={handleLogout}
              className="w-full bg-gradient-to-r from-red-600 to-red-400 hover:from-red-500 hover:to-red-300 text-white p-6 md:text-[16px] font-semibold transition-colors"
            >
              Log Out
            </Button>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
