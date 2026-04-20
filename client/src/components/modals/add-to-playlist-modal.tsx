import { useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ListMusic } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type AddToPlaylistSongPayload = {
  spotifyId: string;
  title: string;
  artists?: string[] | string;
  cover?: string;
  duration?: number;
  preview_url?: string;
};

type PlaylistItem = { id: string; name: string; songCount: number };

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: AddToPlaylistSongPayload | null;
}

export default function AddToPlaylistModal({
  isOpen,
  onClose,
  song,
}: AddToPlaylistModalProps) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: playlists = [], isLoading } = useQuery({
    queryKey: ["playlists"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await axios.get("/api/playlists", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.playlists as PlaylistItem[];
    },
    enabled: isOpen,
  });

  const addMutation = useMutation({
    mutationFn: async (playlistId: string) => {
      if (!song) throw new Error("Missing song");
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      await axios.post(
        `/api/playlists/${playlistId}/songs`,
        {
          spotifyId: song.spotifyId,
          title: song.title,
          artists: song.artists,
          cover: song.cover,
          duration: song.duration,
          preview_url: song.preview_url,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === "playlists" ||
          q.queryKey[0] === "playlist-detail",
      });
      toast({
        title: "Added to playlist",
        description: "Song saved successfully.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add to playlist",
        description: error?.response?.data?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const title = useMemo(() => {
    if (!song) return "Add to playlist";
    const t = song.title || "Song";
    return `Add “${t}” to playlist`;
  }, [song]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="glass-panel border-white/20 bg-gray text-white max-w-[420px] sm:max-w-md mx-2">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            {title}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : playlists.length > 0 ? (
          <div className="flex flex-col gap-2">
            {playlists.map((p) => (
              <Button
                key={p.id}
                type="button"
                variant="ghost"
                className="justify-between bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] h-12"
                disabled={addMutation.isPending}
                onClick={() => addMutation.mutate(p.id)}
              >
                <span className="truncate">{p.name}</span>
                <span className="text-xs text-gray-500 shrink-0">
                  {p.songCount} {p.songCount === 1 ? "song" : "songs"}
                </span>
              </Button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-10 text-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <ListMusic className="w-7 h-7 text-gray-500 mb-1" />
            <p className="text-sm text-gray-400">No playlists created yet</p>
            <p className="text-xs text-gray-600 max-w-xs">
              Create a playlist first, then add songs to it.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            variant="ghost"
            className="glass-panel hover:bg-white/10 hover:text-white"
            onClick={onClose}
            disabled={addMutation.isPending}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

