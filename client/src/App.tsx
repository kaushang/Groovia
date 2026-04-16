import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlobalPlayerProvider } from "@/components/global-player-provider";
import Landing from "@/pages/landing";
import Room from "@/pages/room";
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";
import ProfilePage from "@/pages/profile";
import HomePage from "@/pages/home";
import PlaylistsPage from "@/pages/playlists";
import PlaylistDetailPage from "@/pages/playlist-detail";
import PrivacyPolicy from "@/pages/privacy-policy";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/home" component={HomePage} />
      <Route path="/room/:roomId" component={Room} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/playlists" component={PlaylistsPage} />
      <Route path="/playlists/favorites" component={PlaylistDetailPage} />
      <Route path="/playlists/:playlistId" component={PlaylistDetailPage} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GlobalPlayerProvider>
          <div className="min-h-screen gradient-animated-bg">
            <Router />
            <Toaster />
          </div>
        </GlobalPlayerProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}