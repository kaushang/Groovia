import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Socket } from "socket.io-client";

interface ListenerCountSheetProps {
  room: any;
  userId: string | null;
  socket: Socket | null;
  roomId: string;
}

export default function ListenerCountSheet({
  room,
  userId,
  socket,
  roomId,
}: ListenerCountSheetProps) {
  const { toast } = useToast();

  // State from room.tsx
  const [listenerCount, setListenerCount] = useState(0);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Initialize and sync listenerCount with room data
  useEffect(() => {
    if (room) {
      const count = room.listenerCount || room.members?.length || 0;
      setListenerCount(count);
    }
  }, [room]);

  // Socket listeners for count updates
  useEffect(() => {
    if (!socket) return;

    const handleUserJoined = (data: any) => {
      if (data.userId !== userId) {
        // Only increment if we didn't receive full room update (which would be handled by the room prop effect)
        if (!data.room) {
          setListenerCount((prev) => prev + 1);
        }
      }
    };

    const handleUserLeft = (data: any) => {
      // Only decrement if we didn't receive full room update
      if (!data.room) {
        setListenerCount((prev) => Math.max(0, prev - 1));
      }
    };

    socket.on("userJoined", handleUserJoined);
    socket.on("userLeft", handleUserLeft);

    return () => {
      socket.off("userJoined", handleUserJoined);
      socket.off("userLeft", handleUserLeft);
    };
  }, [socket, userId]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="flex items-center hover:text-white transition-colors group outline-none px-2 border border-white/10 rounded-full bg-white/10">
          <Users className="w-3.5 h-3.5 mr-2 text-purple-300" />
          <span className="flex items-center py-1 decoration-white/30 underline-offset-4">
            {listenerCount} <span className="md:inline ml-1">listeners</span>
          </span>
        </button>
      </SheetTrigger>
      <SheetContent className="w-3/4 sm:max-w-md border-l border-white/10 bg-black/10 backdrop-blur-lg text-white p-0 shadow-2xl">
        <SheetHeader className="p-4 border-b border-white/10">
          <SheetTitle className="text-2xl font-bold text-white flex items-center gap-2 mt-4 -mb-1">
            Room Members
          </SheetTitle>
          <SheetDescription className="text-gray-400 -mt-2">
            See who's vibing in the room right now.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] p-2">
          <div className="space-y-4">
            {/* Room Members List */}
            <div className="space-y-2">
              <div className="flex flex-row items-center">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-2 ml-2">
                  Listeners
                </h4>
                <Badge
                  variant="outline"
                  className=" ml-2 border-purple-300/50 px-2 text-purple-300"
                >
                  {room?.members?.length || 0}
                </Badge>
              </div>
              <div className="space-y-2">
                {[...(room?.members || [])]
                  // sorting the members list to ensure the Room Host always appears at the top.
                  .sort((a: any, b: any) => {
                    const aId = (a.userId?._id || a.userId)?.toString();
                    const bId = (b.userId?._id || b.userId)?.toString();
                    const cId = (
                      room.createdBy?._id || room.createdBy
                    )?.toString();
                    if (aId === cId) return -1;
                    if (bId === cId) return 1;
                    return 0;
                  })
                  .map((member: any) => {
                    const user = member.userId;
                    const isMe = (user._id || user) === userId;
                    const cId = (
                      room.createdBy?._id || room.createdBy
                    )?.toString();
                    const mId = (user._id || user)?.toString();
                    const isMemberHost = mId === cId;
                    const amIHost = userId === cId;
                    const isSelected = openDropdownId === mId;
                    const isBlurred =
                      openDropdownId !== null && openDropdownId !== mId;

                    const MemberRow = (
                      <div
                        className={`flex items-center rounded-sm gap-3 p-1 transition-all duration-300 group ${
                          amIHost && !isMe && !isMemberHost
                            ? "cursor-pointer"
                            : ""
                        } ${
                          isSelected
                            ? "bg-white/10"
                            : "bg-transparent hover:bg-white/5"
                        } ${isBlurred ? "blur-sm opacity-80" : "opacity-100"}`}
                      >
                        <Avatar
                          className={`h-9 w-9 border ${isMemberHost ? "border-purple-400 ring-2 ring-purple-400/30 shadow-[0_0_8px_rgba(192,132,252,0.4)]" : "border-white/10"}`}
                        >
                          <AvatarImage
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || user}`}
                          />
                          <AvatarFallback className="bg-gray-800 text-gray-300">
                            {(user.username?.[0] || "U").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors flex items-center gap-1">
                            {user.username || "Unknown"}
                            {isMemberHost && (
                              <>
                                <span className="text-[12px] text-purple-300 bg-purple-300/10 px-2 rounded-full">
                                  Host
                                </span>
                              </>
                            )}
                            {isMe && (
                              <Badge
                                variant="secondary"
                                className="text-[12px] pt-1 text-white/80 bg-transparent"
                              >
                                (You)
                              </Badge>
                            )}
                          </span>
                        </div>
                      </div>
                    );

                    if (amIHost && !isMe && !isMemberHost) {
                      return (
                        <DropdownMenu
                          key={user._id || user}
                          onOpenChange={(open) =>
                            setOpenDropdownId(open ? mId : null)
                          }
                        >
                          <DropdownMenuTrigger asChild>
                            {MemberRow}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-transparent border-white/10 text-white z-[1000]"
                          >
                            <DropdownMenuItem
                              onClick={() => {
                                if (socket) {
                                  socket.emit("makeHost", {
                                    roomId,
                                    newHostId: mId,
                                  });
                                  toast({
                                    title: "Updating Host",
                                    description: `Making ${user.username} the new host...`,
                                  });
                                }
                              }}
                              className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
                            >
                              Make Host
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                if (socket) {
                                  socket.emit("kickUser", {
                                    roomId,
                                    userIdToKick: mId,
                                  });
                                  toast({
                                    title: "Kicking User",
                                    description: `Kicking ${user.username}...`,
                                    variant: "destructive",
                                  });
                                }
                              }}
                              className="text-red-500 hover:text-red-500 focus:text-red-500 cursor-pointer hover:bg-white/10 focus:bg-white/10"
                            >
                              Kick
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      );
                    }
                    return <div key={user._id || user}>{MemberRow}</div>;
                  })}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
