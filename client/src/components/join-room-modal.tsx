import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JoinRoomModal({
  isOpen,
  onClose,
  initialCode,
  onCancel,
}: JoinRoomModalProps & { initialCode?: string; onCancel?: () => void }) {
  const [roomCode, setRoomCode] = useState(initialCode || "");
  const [username, setUsername] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const isLinkJoin = !!initialCode;

  const joinRoomMutation = useMutation({
    mutationFn: ({ username }: { username: string }) =>
      apiRequest("POST", `/api/rooms/code/${roomCode}`, { username }),
    onSuccess: async (response) => {
      const res = await response.json();
      const userId = res.userId;

      sessionStorage.setItem("userId", userId);

      toast({
        title: "Joined room!",
        description: `Welcome to ${res.room.name}`,
      });
      onClose();
      navigate(`/room/${res.room._id}?user=${userId}`);
    },
    onError: () => {
      toast({
        title: "Room not found",
        description: "Please check the room code and try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    if (trimmedUsername.length === 0) {
      toast({
        title: "Username required",
        description: "Please enter a username",
        variant: "destructive",
      });
      return;
    }
    if (roomCode.length === 6) {
      joinRoomMutation.mutate({ username: trimmedUsername });
    } else {
      toast({
        title: "Invalid code",
        description: "Please enter a valid 6-digit room code",
        variant: "destructive",
      });
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (value.length > 6) value = value.slice(0, 6);
    setRoomCode(value);
  };
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (value.length > 12) value = value.slice(0, 12);
    setUsername(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`glass-panel border-white/20 bg-gray text-white max-w-[364px] sm:max-w-md ${
          isLinkJoin ? "[&>button]:hidden" : ""
        }`}
        data-testid="join-room-modal"
        onPointerDownOutside={
          isLinkJoin ? (e) => e.preventDefault() : undefined
        }
        onEscapeKeyDown={isLinkJoin ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold mb-0 text-center">
            {isLinkJoin ? "Join Room" : "Join a Room"}
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
              className="bg-white/10 border-white/20 placeholder:text-white-400 md:text-[16px] tracking-wide p-6"
              data-testid="input-user-name"
            />
          </div>
          {!isLinkJoin && (
            <div>
              <Input
                id="roomCode"
                type="text"
                value={roomCode}
                onChange={handleCodeChange}
                placeholder="Enter 6-digit Room Code"
                className="bg-white/10 border-white/20 placeholder:text-white-400 md:text-[16px] tracking-wide mt-2 p-6"
                data-testid="input-room-code"
              />
            </div>
          )}

          <div className="flex space-x-2">
            <Button
              type="button"
              onClick={onCancel || onClose}
              variant="ghost"
              className="flex-1 glass-panel hover:bg-white/10 hover:text-white p-6 md:text-[16px]"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 p-6 md:text-[16px]"
              disabled={joinRoomMutation.isPending}
              data-testid="button-join"
            >
              {joinRoomMutation.isPending ? "Joining..." : "Join Room"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
