import { useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import AppLayout from "@/components/layout/app-layout";
import DoubleMarquee from "@/components/double-marquee";
import { useGlobalPlayer } from "@/components/global-player-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Loader2,
  MoreVertical,
  Play,
  Music4,
} from "lucide-react";
import AddToPlaylistModal, {
  AddToPlaylistSongPayload,
} from "@/components/modals/add-to-playlist-modal";
import {
  ContextMenu,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import SongContextMenuContent from "@/components/song-context-menu-content";
import YoutubeVersionsModal from "@/components/room components/youtube-versions-modal";

type Song = {
  id: string;
  name: string;
  artists?: string[] | string;
  image?: string;
  duration?: number;
  preview_url?: string;
};

const formatTime = (ms = 0) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${Math.floor(s % 60)
    .toString()
    .padStart(2, "0")}`;
};

export default function PlaylistDetailPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [, setLocation] = useLocation();
  const [isFavoritesRoute] = useRoute("/playlists/favorites");
  const [playlistMatch, params] = useRoute("/playlists/:playlistId");
  const playlistId = params?.playlistId;
  const isFavorites = Boolean(isFavoritesRoute);
  const { playSong, playSongList } = useGlobalPlayer();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [loadingSongId, setLoadingSongId] = useState<string | null>(null);
  const [isPlayAllLoading, setIsPlayAllLoading] = useState(false);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const [songForPlaylist, setSongForPlaylist] =
    useState<AddToPlaylistSongPayload | null>(null);
  const [selectedSongForVersions, setSelectedSongForVersions] = useState<Song | null>(null);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: isFavorites ? ["favorite-songs"] : ["playlist-detail", playlistId],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      if (isFavorites) {
        const res = await axios.get("/api/favorites", {
          headers: { Authorization: `Bearer ${token}` },
        });
        return res.data.favorites as Song[];
      }
      const res = await axios.get(`/api/playlists/${playlistId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.playlist as { id: string; name: string; songs: Song[] };
    },
    enabled: !!user && (isFavorites || (playlistMatch && !!playlistId)),
  });

  const songs = isFavorites
    ? ((data as Song[] | undefined) || [])
    : ((data as { id: string; name: string; songs: Song[] } | undefined)?.songs || []);

  const editMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      await axios.patch(
        `/api/playlists/${playlistId}`,
        { name: editName.trim() },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    },
    onSuccess: async () => {
      setIsEditOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["playlist-detail", playlistId] });
      await queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast({ title: "Playlist updated" });
    },
    onError: (error: any) =>
      toast({
        title: "Failed to update playlist",
        description: error?.response?.data?.message || "Please try again.",
        variant: "destructive",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      await axios.delete(`/api/playlists/${playlistId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["playlists"] });
      setLocation("/playlists");
      toast({ title: "Playlist deleted" });
    },
    onError: () =>
      toast({
        title: "Failed to delete playlist",
        variant: "destructive",
      }),
  });

  const unfavoriteMutation = useMutation({
    mutationFn: async (spotifyId: string) => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      await axios.delete(`/api/favorites/${spotifyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: async (_data, spotifyId) => {
      queryClient.setQueryData(["favorite-songs"], (old: any[] | undefined) => {
        const prev = Array.isArray(old) ? old : [];
        return prev.filter((song: any) => song.id !== spotifyId);
      });
      await queryClient.invalidateQueries({ queryKey: ["favorite-songs"] });
      await queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast({ title: "Removed from favorites" });
    },
    onError: () =>
      toast({
        title: "Failed to remove favorite",
        variant: "destructive",
      }),
  });

  const addToFavoritesMutation = useMutation({
    mutationFn: async (song: Song) => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const payload = {
        spotifyId: song.id,
        title: song.name,
        artists: song.artists,
        cover: song.image,
        duration: song.duration,
        preview_url: song.preview_url,
      };
      await axios.post("/api/favorites", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: async (_data, song) => {
      queryClient.setQueryData(["favorite-songs"], (old: any[] | undefined) => {
        const prev = Array.isArray(old) ? old : [];
        if (prev.some((s: any) => s.id === song.id)) return prev;
        return [
          {
            id: song.id,
            name: song.name,
            artists: Array.isArray(song.artists)
              ? song.artists
              : [song.artists].filter(Boolean),
            image: song.image,
            duration: song.duration,
            preview_url: song.preview_url,
          },
          ...prev,
        ];
      });
      await queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === "favorite-songs" ||
          q.queryKey[0] === "playlists" ||
          q.queryKey[0] === "playlist-detail",
      });
      toast({
        title: "Added to favorites ❤️",
      });
    },
    onError: (error: any) =>
      toast({
        title: "Cannot add to favorites",
        description: error.response?.data?.message || "Please log in to save songs.",
        variant: "destructive",
      }),
  });

  const resolveSong = async (song: Song) => {
    const artists = Array.isArray(song.artists) ? song.artists.join(" ") : (song.artists || "");
    const q = `${song.name} ${artists || ""}`;
    const res = await axios.get("/api/youtube/search", { params: { q } });
    const top = res.data?.items?.[0];
    if (!top) return null;
    return {
      youtubeId: top.id as string,
      title: song.name,
      artists: song.artists || "",
      cover: song.image || "",
      duration: (top.duration || song.duration || 0) / 1000,
      spotifyId: song.id,
    };
  };

  const playOne = async (song: Song) => {
    setLoadingSongId(song.id);
    try {
      const resolved = await resolveSong(song);
      if (!resolved) {
        toast({
          title: "No playable version found",
          variant: "destructive",
        });
        return;
      }
      playSong(resolved);
    } catch {
      toast({
        title: "Playback failed",
        variant: "destructive",
      });
    } finally {
      setLoadingSongId(null);
    }
  };

  const playAll = async () => {
    if (songs.length === 0) return;
    setIsPlayAllLoading(true);
    try {
      const resolved = (await Promise.all(songs.map(resolveSong))).filter(Boolean) as any[];
      if (resolved.length === 0) {
        toast({
          title: "No playable songs found",
          variant: "destructive",
        });
        return;
      }
      playSongList(resolved);
    } catch {
      toast({
        title: "Could not start playlist",
        variant: "destructive",
      });
    } finally {
      setIsPlayAllLoading(false);
    }
  };

  const openAddToPlaylist = (song: Song) => {
    setSongForPlaylist({
      spotifyId: song.id,
      title: song.name,
      artists: song.artists,
      cover: song.image,
      duration: song.duration,
      preview_url: song.preview_url,
    });
    setIsAddToPlaylistOpen(true);
  };

  const openVersions = (song: Song) => {
    setSelectedSongForVersions(song);
    setIsVersionModalOpen(true);
  };

  const handleSelectVersion = (youtubeItem: any) => {
    if (!selectedSongForVersions) return;
    playSong({
      youtubeId: youtubeItem.id,
      title: selectedSongForVersions.name,
      artists: selectedSongForVersions.artists || "",
      cover: selectedSongForVersions.image || "",
      duration: (youtubeItem.duration || selectedSongForVersions.duration || 0) / 1000,
      spotifyId: selectedSongForVersions.id,
    });
    setIsVersionModalOpen(false);
  };

  const playlistName = isFavorites
    ? "Favorite songs"
    : ((data as { id: string; name: string; songs: Song[] } | undefined)?.name || "Playlist");

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

  if (!isFavorites && !playlistMatch) {
    setLocation("/playlists");
    return null;
  }

  return (
    <AppLayout activePage="playlists">
      <div className="max-w-3xl mx-auto px-5 md:px-10 py-8 pb-32 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-white">{playlistName}</h1>
          {!isFavorites && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white/80 hover:bg-white/10">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-black/70 border-white/10 text-white">
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-white/10"
                  onClick={() => {
                    setEditName(playlistName);
                    setIsEditOpen(true);
                  }}
                >
                  Edit name
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-red-400 hover:bg-white/10"
                  onClick={() => setIsDeleteOpen(true)}
                >
                  Delete playlist
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div>
          <Button
            className="bg-purple-600 hover:bg-purple-500 text-white"
            onClick={playAll}
            disabled={isPlayAllLoading || isLoading || songs.length === 0}
          >
            {isPlayAllLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Play className="w-4 h-4 mr-2 fill-current" />
            )}
            Play
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          </div>
        ) : songs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <Music4 className="w-7 h-7 text-gray-500 mb-1" />
            <p className="text-sm text-gray-400">No songs in this playlist</p>
          </div>
        ) : (
          <div className="space-y-1">
            {songs.map((song) => (
              <ContextMenu key={song.id}>
                <ContextMenuTrigger asChild>
                  <div className="flex items-center p-2 rounded-lg hover:bg-white/10 transition-all group">
                    <img
                      src={
                        song.image ||
                        "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=50&h=50&fit=crop&crop=center"
                      }
                      alt={song.name}
                      className="w-12 h-12 rounded-sm object-cover mr-2 shrink-0"
                    />
                    <div className="flex-1 min-w-0 mr-2">
                      <DoubleMarquee
                        text1={song.name}
                        text2={
                          Array.isArray(song.artists)
                            ? song.artists.join(", ")
                            : (song.artists || "")
                        }
                        className1="font-semibold text-sm text-white"
                        className2="text-gray-400 text-xs"
                      />
                    </div>
                    <div className="text-gray-400 text-xs mr-3 tabular-nums shrink-0">
                      {formatTime(song.duration)}
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => playOne(song)}
                      disabled={loadingSongId === song.id}
                      className="h-9 w-9 hover:bg-purple-500 transition-opacity bg-purple-600 rounded-full flex items-center justify-center p-0"
                    >
                      {loadingSongId === song.id ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                      )}
                    </Button>
                  </div>
                </ContextMenuTrigger>
                <SongContextMenuContent
                  song={song}
                  onFindVersions={openVersions}
                  onAddToPlaylist={openAddToPlaylist}
                  onAddToFavorites={(selectedSong) =>
                    addToFavoritesMutation.mutate(selectedSong as Song)
                  }
                  onUnfavorite={
                    isFavorites
                      ? (selectedSong) => unfavoriteMutation.mutate(selectedSong.id)
                      : undefined
                  }
                />
              </ContextMenu>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="glass-panel border-white/20 bg-gray text-white max-w-[364px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">Edit name</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              editMutation.mutate();
            }}
          >
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="bg-white/10 border-white/20 placeholder:text-white-400 md:text-[16px] tracking-wide mt-2 p-6"
            />
            <div className="flex space-x-2">
              <Button
                type="button"
                onClick={() => setIsEditOpen(false)}
                variant="ghost"
                className="flex-1 glass-panel hover:bg-white/10 hover:text-white p-6"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editMutation.isPending}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 p-6"
              >
                {editMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="bg-black/80 backdrop-blur-xl border-white/10 text-white max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete playlist?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this playlist? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 sm:space-x-3">
            <AlertDialogCancel className="bg-white/10 border-none hover:bg-white/20 hover:text-white transition-colors">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-500 text-white transition-colors"
              onClick={() => deleteMutation.mutate()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddToPlaylistModal
        isOpen={isAddToPlaylistOpen}
        onClose={() => setIsAddToPlaylistOpen(false)}
        song={songForPlaylist}
      />
      <YoutubeVersionsModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        song={
          selectedSongForVersions
            ? {
                ...selectedSongForVersions,
                image: selectedSongForVersions.image,
              }
            : null
        }
        onSelect={handleSelectVersion}
        formatTime={(time) => {
          const secs = Math.floor(time);
          return `${Math.floor(secs / 60)}:${Math.floor(secs % 60)
            .toString()
            .padStart(2, "0")}`;
        }}
      />
    </AppLayout>
  );
}

