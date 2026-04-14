import { useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import AppLayout from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Heart, ListMusic, Loader2, Music4, Plus } from "lucide-react";
import CreatePlaylistModal from "@/components/modals/create-playlist-modal";

type PlaylistItem = {
  id: string;
  name: string;
  songCount: number;
  createdAt?: string;
  isFavorites?: boolean;
};

export default function PlaylistsPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [, setLocation] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: playlists = [], isLoading: isLoadingPlaylists } = useQuery({
    queryKey: ["playlists"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await axios.get("/api/playlists", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.playlists as PlaylistItem[];
    },
    enabled: !!user,
  });

  const { data: favoriteSongs = [], isLoading: isLoadingFavorites } = useQuery({
    queryKey: ["favorite-songs"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await axios.get("/api/favorites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.favorites as any[];
    },
    enabled: !!user,
  });

  const visiblePlaylists = useMemo(() => {
    const list: PlaylistItem[] = [...playlists];
    if (favoriteSongs.length > 0) {
      list.unshift({
        id: "favorites",
        name: "Favorite songs",
        songCount: favoriteSongs.length,
        isFavorites: true,
      });
    }
    return list;
  }, [playlists, favoriteSongs.length]);

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

  const isLoading = isLoadingPlaylists || isLoadingFavorites;

  return (
    <AppLayout activePage="playlists">
      <div className="max-w-3xl mx-auto px-5 md:px-10 py-8 pb-32 flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Playlists</h1>
          </div>
          <Button
            type="button"
            className="bg-purple-600 hover:bg-purple-500 text-white shrink-0"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Create
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          </div>
        ) : visiblePlaylists.length > 0 ? (
          <div className="flex flex-col gap-2">
            {visiblePlaylists.map((playlist) => (
              <button
                key={playlist.id}
                type="button"
                onClick={() =>
                  setLocation(
                    playlist.isFavorites
                      ? "/playlists/favorites"
                      : `/playlists/${playlist.id}`,
                  )
                }
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-white/[0.08] border border-white/10 flex items-center justify-center shrink-0">
                  {playlist.isFavorites ? (
                    <Heart className="w-5 h-5 text-pink-400" />
                  ) : (
                    <ListMusic className="w-5 h-5 text-purple-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {playlist.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {playlist.songCount} {playlist.songCount === 1 ? "song" : "songs"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-16 text-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <Music4 className="w-7 h-7 text-gray-500 mb-1" />
            <p className="text-sm text-gray-400">No playlists created yet</p>
            <p className="text-xs text-gray-600 max-w-xs">
              Create your first playlist to start organizing your songs.
            </p>
          </div>
        )}
      </div>
      <CreatePlaylistModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </AppLayout>
  );
}