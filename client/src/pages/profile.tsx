import { useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import axios from "axios";
import AppLayout from "@/components/layout/app-layout";
import { Loader2, Pencil } from "lucide-react";
import DoubleMarquee from "@/components/double-marquee";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type MusicHistorySong = {
  _id: string;
  name: string;
  artists: string[];
  image?: string;
  playedAt: string;
  context: "solo" | "room";
};

type MusicHistoryPage = {
  songs: MusicHistorySong[];
  hasMore: boolean;
  total: number;
};

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const musicHistoryPageSize = 8;
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);

  const { data: favoriteSongs = [], isLoading: isFetchingFavorites } = useQuery(
    {
      queryKey: ["favorite-songs"],
      queryFn: async () => {
        const token = await getToken();
        if (!token) throw new Error("Not authenticated");
        const res = await axios.get("/api/favorites", {
          headers: { Authorization: `Bearer ${token}` },
        });
        return res.data.favorites;
      },
      enabled: !!user,
    },
  );
  const { data: playlists = [], isLoading: isFetchingPlaylists } = useQuery({
    queryKey: ["playlists"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await axios.get("/api/playlists", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.playlists;
    },
    enabled: !!user,
  });
  const {
    data: musicHistoryData,
    isLoading: isFetchingHistory,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["music-history"],
    queryFn: async ({ pageParam = 0 }) => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await axios.get("/api/music-history", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          offset: pageParam,
          limit: musicHistoryPageSize,
        },
      });
      return res.data as MusicHistoryPage;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.hasMore) return undefined;
      return allPages.reduce(
        (total, page) =>
          total + (Array.isArray(page?.songs) ? page.songs.length : 0),
        0,
      );
    },
    enabled: !!user,
    staleTime: 5_000,
    refetchInterval: 5_000,
  });

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!user) {
    setLocation("/auth");
    return null;
  }

  const musicHistorySongs =
    musicHistoryData?.pages?.flatMap((page) => page.songs || []) || [];

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  const displayName =
    user.username ||
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
    "Groovia User";

  const handleOpenUsernameDialog = () => {
    setNewUsername(user.username || "");
    setIsUsernameDialogOpen(true);
  };

  const handleUpdateUsername = async () => {
    const trimmed = newUsername.trim();
    if (!trimmed) {
      toast({
        title: "Username required",
        description: "Please enter a username.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUpdatingUsername(true);
      await user.update({ username: trimmed });
      await user.reload();
      setIsUsernameDialogOpen(false);
      toast({ title: "Username updated" });
    } catch (error: any) {
      const message =
        error?.errors?.[0]?.longMessage ||
        error?.errors?.[0]?.message ||
        "Failed to update username";
      toast({
        title: "Could not update username",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  return (
    <AppLayout activePage="profile">
      <div className="max-w-2xl mx-auto px-5 md:px-10 py-8 pb-32 flex flex-col gap-8">
        {/* ── Profile Header ── */}
        <section className="flex items-center gap-5">
          <div className="relative shrink-0">
            <img
              src={user.imageUrl}
              alt={displayName}
              className="w-20 h-20 rounded-full object-cover ring-2 ring-white/10"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white truncate">
                {displayName}
              </h1>
              <button
                onClick={handleOpenUsernameDialog}
                className="shrink-0 text-white/60 hover:text-white transition-colors"
                aria-label="Edit username"
                title="Edit username"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
            {user.primaryEmailAddress && (
              <p className="text-sm text-white/70 truncate mt-0.5">
                {user.primaryEmailAddress.emailAddress}
              </p>
            )}
            {joinDate && (
              <p className="text-xs text-white/70 mt-1">
                Member since {joinDate}
              </p>
            )}
          </div>
        </section>

        {/* ── Stats Row ── */}
        <section className="grid grid-cols-3 gap-3">
          <StatCard
            label="Favorites"
            value={favoriteSongs.length}
            loading={isFetchingFavorites}
          />
          <StatCard
            label="Playlists"
            value={playlists.length}
            loading={isFetchingPlaylists}
          />
          <StatCard label="Friends" value={0} />
        </section>

        <section className="flex flex-col gap-6">
          <div>
            <h2 className="text-md font-bold text-white mb-3">
              Your Music History
            </h2>
            {isFetchingHistory ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
              </div>
            ) : musicHistorySongs.length > 0 ? (
              <div className="flex flex-col gap-1">
                {musicHistorySongs.map((song, index) => (
                  <div
                    key={`${song._id}-${song.playedAt}-${index}`}
                    className="flex items-center gap-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors"
                  >
                    <span className="text-xs text-white/70 w-4 text-right shrink-0">
                      {index + 1}
                    </span>
                    <img
                      src={song.image || "/groovia_icon.avif"}
                      alt={song.name}
                      className="w-9 h-9 rounded object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0 mr-2">
                      <DoubleMarquee
                        text1={song.name}
                        text2={
                          Array.isArray(song.artists)
                            ? song.artists.join(", ")
                            : song.artists
                        }
                        className1="font-semibold text-sm text-white"
                        className2="text-gray-400 text-xs"
                      />
                    </div>
                    <span className="text-[11px] text-gray-500 shrink-0">
                      {song.context === "room" ? "Room" : "Solo"}
                    </span>
                  </div>
                ))}
                {hasNextPage && (
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="mt-2 py-2 text-xs font-medium text-purple-300 hover:text-purple-200 transition-colors disabled:opacity-60"
                  >
                    {isFetchingNextPage ? "Loading..." : "Show more"}
                  </button>
                )}
              </div>
            ) : (
              <EmptyState
                message="No music history yet"
                sub="Songs you start listening to will appear here."
              />
            )}
          </div>
        </section>
      </div>

      <Dialog
        open={isUsernameDialogOpen}
        onOpenChange={(open) => {
          if (!isUpdatingUsername) setIsUsernameDialogOpen(open);
        }}
      >
        <DialogContent
          className="glass-panel border-white/20 bg-gray text-white max-w-[364px] sm:max-w-md"
          data-testid="edit-username-modal"
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold mb-0 text-center">
              Edit Username
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateUsername();
            }}
            className="space-y-3"
          >
            <Input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Enter new username"
              disabled={isUpdatingUsername}
              maxLength={32}
              className="bg-white/10 border-white/20 placeholder:text-white-400 md:text-[16px] tracking-wide p-6"
              data-testid="input-edit-username"
            />
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsUsernameDialogOpen(false)}
                disabled={isUpdatingUsername}
                className="flex-1 glass-panel hover:bg-white/10 hover:text-white p-6 md:text-[16px]"
                data-testid="button-cancel-edit-username"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdatingUsername}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 p-6 md:text-[16px]"
                data-testid="button-save-edit-username"
              >
                {isUpdatingUsername ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

// ── Sub-components ───────────────────────────────────────────

function StatCard({
  label,
  value,
  loading = false,
}: {
  label: string;
  value: number;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-row gap-2 items-center py-1 px-2  rounded-sm bg-white/[0.04] border border-white/[0.07]">
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
      ) : (
        <span className="text-sm font-bold text-white">{value}</span>
      )}
      <span className="text-[11px] text-gray-200 uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

function EmptyState({ message, sub }: { message: string; sub: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <p className="text-sm text-gray-500">{message}</p>
      <p className="text-xs text-gray-600 max-w-xs leading-relaxed">{sub}</p>
    </div>
  );
}
