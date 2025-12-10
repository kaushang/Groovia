import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateRoomModal({
  isOpen,
  onClose,
}: CreateRoomModalProps) {
  const [roomName, setRoomName] = useState("");
  const [username, setUsername] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const createRoomMutation = useMutation({
    mutationFn: ({ name, username }: { name: string; username: string }) =>
      apiRequest("POST", "/api/rooms", { name, username }),
    onSuccess: async (response) => {
      const res = await response.json();
      const userId = res.userId;
      
      // Save to session storage so room.tsx knows we are authenticated
      sessionStorage.setItem("userId", userId);

      toast({
        title: "Room created!",
        description: `${res.room.name} has been created successfully`,
      });
      onClose();
      navigate(`/room/${res.room._id}?user=${userId}`);
    },
    onError: () => {
      toast({
        title: "Failed to create room",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = roomName.trim();
    const trimmedUsername = username.trim();

    if (trimmedUsername.length === 0) {
      toast({
        title: "Username required",
        description: "Please enter a username",
        variant: "destructive",
      });
      return;
    }
    if (name.length === 0) {
      toast({
        title: "Room name required",
        description: "Please enter a room name",
        variant: "destructive",
      });
      return;
    }
    createRoomMutation.mutate({ name, username: trimmedUsername });
  };

  const handleRoomNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (value.length > 16) value = value.slice(0, 16);
    setRoomName(value);
  };
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (value.length > 16) value = value.slice(0, 16);
    setUsername(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="glass-panel border-white/20 bg-gray text-white max-w-[364px] sm:max-w-md"
        data-testid="create-room-modal"
      >
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold mb-0 text-center">
            Create a Room
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={handleUsernameChange}
              placeholder="Enter Name"
              className="bg-white/10 border-white/20 placeholder:text-white-400 md:text-[16px] tracking-wide mt- p-6"
              data-testid="input-user-name"
            />
          </div>

          <div>
            <Input
              id="roomName"
              type="text"
              value={roomName}
              onChange={handleRoomNameChange}
              placeholder="Enter Room Name"
              className="bg-white/10 border-white/20 placeholder:text-white-400 md:text-[16px] tracking-wide mt-2 p-6"
              data-testid="input-room-name"
            />
          </div>

          <div className="flex space-x-2">
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              className="flex-1 glass-panel hover:bg-white/10 hover:text-white p-6 md:text-[16px]"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 p-6 md:text-[16px]"
              disabled={createRoomMutation.isPending}
              data-testid="button-create"
            >
              {createRoomMutation.isPending ? "Creating..." : "Create Room"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
