import { useState, useEffect, useRef } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import AppLayout from "@/components/layout/app-layout";
import { useGlobalPlayer } from "@/components/global-player-provider";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  X,
  Play,
  Loader2,
  Music4,
  Plus,
  Disc3,
  ListMusic,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import SongSearch from "@/components/song-search";
// ── helpers ────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** formatTime expects seconds */
const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;

// ── Page ───────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [, setLocation] = useLocation();
  const { playSong, activeRoomId, setActiveRoomId } = useGlobalPlayer();
  const { toast } = useToast();

  // tracks which Spotify id is currently playing
  const [playingSpotifyId, setPlayingSpotifyId] = useState<string | null>(null);
  // tracks which id is currently loading (fetching top YT result)
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Room Leave Warning state
  const [pendingPlayAction, setPendingPlayAction] = useState<
    null | (() => void)
  >(null);

  // ── Leave Room ────────────────────────────────────────────────────────────

  const leaveRoomMutation = useMutation({
    mutationFn: async () => {
      const storedUserId = sessionStorage.getItem("userId");
      if (!activeRoomId || !storedUserId) return;
      await axios.post(`/api/rooms/${activeRoomId}/leave`, {
        userId: storedUserId,
      });
    },
    onSuccess: () => {
      setActiveRoomId(null);
    },
    onError: () => {
      // Best effort, clear anyway so they aren't stuck
      setActiveRoomId(null);
    },
  });

  const confirmPendingPlay = async () => {
    if (activeRoomId) {
      await leaveRoomMutation.mutateAsync();
      toast({
        title: "Left room",
        description: "You have disconnected from the room.",
      });
    }
    if (pendingPlayAction) {
      pendingPlayAction();
    }
    setPendingPlayAction(null);
  };

  const handleInterceptPlay = (action: () => void) => {
    if (activeRoomId) {
      setPendingPlayAction(() => action);
    } else {
      action();
    }
  };

  // ── Play immediately (top YouTube result) ─────────────────────────────────

  const handlePlaySong = (song: any) => {
    handleInterceptPlay(async () => {
      if (loadingId === song.id) return; // already fetching
      setLoadingId(song.id);
      try {
        const artistName = Array.isArray(song.artists)
          ? song.artists.join(" ")
          : song.artists;
        const q = `${song.name} ${artistName}`;
        const res = await axios.get("/api/youtube/search", { params: { q } });
        const items: any[] = res.data.items;
        if (!items || items.length === 0) {
          toast({
            title: "No YouTube match found",
            description: "Try 'Find versions' for more options.",
            variant: "destructive",
          });
          return;
        }
        const top = items[0];
        playSong({
          youtubeId: top.id,
          title: song.name,
          artists: song.artists,
          cover: song.image,
          duration: top.duration / 1000,
          spotifyId: song.id,
        });
        setPlayingSpotifyId(song.id);
      } catch (err) {
        toast({
          title: "Playback failed",
          description: "Could not load the track.",
          variant: "destructive",
        });
      } finally {
        setLoadingId(null);
      }
    });
  };

  const handleAction = ({
    song,
    youtubeVersion,
  }: {
    song: any;
    youtubeVersion?: any;
  }) => {
    if (youtubeVersion) {
      handleInterceptPlay(() => {
        playSong({
          youtubeId: youtubeVersion.id,
          title: song.name,
          artists: song.artists,
          cover: song.image,
          duration: youtubeVersion.duration / 1000,
          spotifyId: song.id,
        });
        setPlayingSpotifyId(song.id);
      });
    } else {
      handlePlaySong(song);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppLayout activePage="home">
      <div className="px-4 md:px-10 py-4 max-w-3xl mx-auto flex flex-col gap-8">

        <SongSearch
          onAction={handleAction}
          isActionPending={(songId) => loadingId === songId}
          formatTime={formatTime}
          asGlassPanel={false}
          hideHeader={true}
        />
      </div>
      {/* Leave Room Warning Modal */}
      <AlertDialog
        open={!!pendingPlayAction}
        onOpenChange={(o) => {
          if (!o) setPendingPlayAction(null);
        }}
      >
        <AlertDialogContent className="bg-black/80 backdrop-blur-xl border-white/10 text-white max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">
              Leave current room?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Playing a song directly on your dashboard will disconnect you from
              your current room. Do you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 sm:space-x-3">
            <AlertDialogCancel className="bg-white/10 border-none hover:bg-white/20 hover:text-white transition-colors">
              Stay in Room
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-purple-600 hover:bg-purple-500 text-white transition-colors"
              onClick={confirmPendingPlay}
            >
              Leave & Play
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>{" "}
    </AppLayout>
  );
}
