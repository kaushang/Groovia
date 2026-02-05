import { CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import GlassPanel from "@/components/glass-panel";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <GlassPanel className="w-fit max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <h1 className="text-2xl font-bold text-white-900">
              Page Not Found
            </h1>
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>

          <p className="mt-2 text-md text-white-600">No such route exists</p>
        </CardContent>
      </GlassPanel>
    </div>
  );
}
