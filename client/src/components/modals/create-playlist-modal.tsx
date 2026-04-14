import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreatePlaylistModal({
  isOpen,
  onClose,
}: CreatePlaylistModalProps) {
  const [name, setName] = useState("");
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createPlaylistMutation = useMutation({
    mutationFn: async (playlistName: string) => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      await axios.post(
        "/api/playlists",
        { name: playlistName },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    },
    onSuccess: async () => {
      setName("");
      await queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast({
        title: "Playlist created",
        description: "Your new playlist is now in your library.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create playlist",
        description: error?.response?.data?.message || "Could not create playlist.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast({
        title: "Playlist name required",
        description: "Please enter a playlist name.",
        variant: "destructive",
      });
      return;
    }
    createPlaylistMutation.mutate(trimmed);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="glass-panel border-white/20 bg-gray text-white max-w-[364px] sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold mb-0 text-center">
            Create Playlist
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Input
              id="playlistName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 60))}
              placeholder="Enter playlist name"
              className="bg-white/10 border-white/20 placeholder:text-white-400 md:text-[16px] tracking-wide mt-2 p-6"
              autoFocus
            />
          </div>

          <div className="flex space-x-2">
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              className="flex-1 glass-panel hover:bg-white/10 hover:text-white p-6 md:text-[16px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 p-6 md:text-[16px]"
              disabled={createPlaylistMutation.isPending}
            >
              {createPlaylistMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

