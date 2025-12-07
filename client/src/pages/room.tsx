import { useParams, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "react-router-dom";
import {
  Music,
  Search,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Users,
  Share,
  QrCode,
  ExternalLink,
  LogOut,
  ChevronUp,
  ChevronDown,
  Plus,
  Shuffle,
  Trash2,
  Copy,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LeaveRoomModal from "@/components/leave-room-modal";


import GlassPanel from "@/components/glass-panel";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Song } from "@shared/schema";
import { io, Socket } from "socket.io-client";
import { AnimatePresence, motion } from "framer-motion";
import YouTube from "react-youtube";

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const [isPlaying, setIsPlaying] = useState(true);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [listenerCount, setListenerCount] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [location] = useLocation();
  const userIdParam = searchParams.get("user");
  const [userId, setUserId] = useState<string | null>(userIdParam);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [joinUsername, setJoinUsername] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Check if we need to show join dialog
  useEffect(() => {
    const storedUserId = sessionStorage.getItem("userId");

    // If there's a user param in URL
    if (userIdParam) {
      // If it matches our stored session, we're good
      if (storedUserId === userIdParam) {
        setUserId(userIdParam);
      } else {
        // If it doesn't match (or we have no session), ignore URL param and show dialog
        // unless we have a valid stored session that ISN'T in the URL (edge case, but let's stick to "ignore URL if not match")
        // Actually, if we have a stored session, we could just use that?
        // User said: "Room Id is not needed as the url already has room id. And the user id that the url contains gets ignored and gets replaced with the current user's id"

        if (storedUserId) {
          // We have a session, but URL has different ID. Let's assume we use our session.
          setUserId(storedUserId);
          // Update URL to match our ID
          const newParams = new URLSearchParams(searchParams);
          newParams.set("user", storedUserId);
          setLocation(`/room/${roomId}?${newParams.toString()}`);
        } else {
          // No session, and URL has ID (likely creator's). Show join dialog.
          setUserId(null);
          setShowJoinDialog(true);
        }
      }
    } else {
      // No user param. Check session.
      if (storedUserId) {
        setUserId(storedUserId);
        const newParams = new URLSearchParams(searchParams);
        newParams.set("user", storedUserId);
        setLocation(`/room/${roomId}?${newParams.toString()}`);
      } else {
        setShowJoinDialog(true);
      }
    }
  }, [userIdParam, roomId, setLocation, searchParams]);

  const handleJoinRoom = async () => {
    if (!joinUsername.trim() || !room?.code) return;

    try {
      const res = await axios.post(`/api/rooms/code/${room.code}`, {
        username: joinUsername,
      });

      const newUserId = res.data.userId;

      // Save to session
      sessionStorage.setItem("userId", newUserId);
      setUserId(newUserId);

      // Update URL
      const newParams = new URLSearchParams(searchParams);
      newParams.set("user", newUserId);
      setLocation(`/room/${roomId}?${newParams.toString()}`);

      setShowJoinDialog(false);
      toast({
        title: "Joined Room",
        description: `Welcome, ${joinUsername}!`,
      });
    } catch (error) {
      toast({
        title: "Failed to join",
        description: "Could not join the room. Please try again.",
        variant: "destructive",
      });
    }
  };

  const { data: room, isLoading } = useQuery({
    queryKey: ["room", roomId],
    queryFn: async () => {
      const res = await fetch(`/api/rooms/${roomId}`);
      if (!res.ok) throw new Error("Failed to fetch room");
      return res.json();
    },
    enabled: !!roomId,
  });

  const activeSong = room?.queueItems?.find((item: any) => item.isPlaying);

  const currentUser = room?.members?.find((m: any) => {
    const mId = m.userId?._id || m.userId;
    return mId === userId;
  })?.userId;

  useEffect(() => {
    if (!roomId || !userId) return;

    // Create socket connection
    socketRef.current = io(window.location.origin, {
      query: { userId }, // helps server identify this user/socket
    });
    const socket = socketRef.current;

    // Join the room via WebSocket
    socket.emit("joinRoom", { roomId, userId });

    // ✅ When YOU join (reload included) → always sync exact state from server
    socket.on("joinedRoom", (data) => {
      console.log("Successfully joined room via WebSocket:", data);

      if (data.room) {
        const count =
          data.room.listenerCount ||
          data.listenerCount ||
          data.room.members?.length ||
          0;

        setListenerCount(count);

        // Merge so we don't lose fields like code/roomId
        queryClient.setQueryData(["room", roomId], (oldRoom: any) => ({
          ...oldRoom,
          ...data.room,
          roomId: data.roomId || oldRoom?.roomId,
        }));
      }
    });

    // ✅ When OTHER users join → only update if it's not me
    socket.on("userJoined", (data) => {
      if (data.userId !== userId) {
        console.log("User joined:", data);
        toast({
          title: "User joined",
          description: `${data.user?.username || "Someone"} joined the room`,
        });

        // If server gave full room, trust it; otherwise increment
        if (data.room) {
          const count =
            data.room.listenerCount || data.room.members?.length || 0;
          setListenerCount(count);
        } else {
          setListenerCount((prev) => prev + 1);
        }
      }
    });

    // ✅ When users leave → set absolute count from server if provided
    socket.on("userLeft", (data) => {
      console.log("User left:", data);
      toast({
        title: "User left",
        description: `${data.user?.username || "Someone"} left the room`,
      });

      if (data.room) {
        const count = data.room.listenerCount || data.room.members?.length || 0;
        setListenerCount(count);
      } else {
        setListenerCount((prev) => Math.max(0, prev - 1));
      }
    });

    // ✅ Full room updates → always sync absolute
    socket.on("roomUpdated", (updatedRoom) => {
      console.log("Room updated:", updatedRoom);
      const newCount =
        updatedRoom.listenerCount || updatedRoom.members?.length || 0;

      setListenerCount(newCount);

      queryClient.setQueryData(["room", roomId], (oldRoom: any) => ({
        ...oldRoom,
        ...updatedRoom,
      }));
    });

    // Handle WebSocket errors
    socket.on("joinRoomError", (error) => {
      console.error("Failed to join room via WebSocket:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to room",
        variant: "destructive",
      });
    });

    socket.on("songAdded", (data) => {
      console.log("Song added to queue:", data);

      // Update React Query cache immediately
      queryClient.setQueryData(["room", roomId], (oldData: any) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          queueItems: data.queueItems,
          listenerCount: data.listenerCount,
        };
      });

      // Show toast notification if song was added by someone else
      if (data.addedBy?.userId !== userId) {
        toast({
          title: "Song added to queue",
          description: `${data.newSong.username} added "${data.newSong.song.title}"`,
        });
      }
    });

    // Listen for successful song addition (for the user who added it)
    socket.on("songAddedSuccess", (data) => {
      console.log("Song successfully added:", data);

      // Update React Query cache
      queryClient.setQueryData(["room", roomId], (oldData: any) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          queueItems: data.queueItems,
          listenerCount: data.listenerCount,
        };
      });
    });

    // Listen for song addition errors
    socket.on("songAddError", (data) => {
      console.error("Error adding song:", data);

      toast({
        title: "Failed to add song",
        description: data.message || "Please try again",
        variant: "destructive",
      });

      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["room", roomId] });
    });

    // ✅ Vote Updated Listener
    socket.on("voteUpdated", (data) => {
      console.log("Vote updated received:", data);

      // Update the correct query key: ["room", roomId]
      queryClient.setQueryData(["room", roomId], (oldData: any) =>
        oldData ? { ...oldData, queueItems: data.queueItems } : oldData
      );

      if (data.votedBy?.userId !== userId) {
        toast({
          title: "Song vote updated",
          description: `${data.votedBy?.username || "Someone"} voted ${data.voteType === "up" ? "👍" : "👎"}`,
        });
      }
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.emit("leaveRoom", { roomId, userId });
        socket.disconnect();
      }
    };
  }, [roomId, userId, toast, queryClient]);

  const {
    data,
    isLoading: isSearching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["/search", { q: searchQuery }],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await axios.get<any>("/search", {
        params: { q: searchQuery, offset: pageParam },
      });
      return res.data.tracks;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 10 ? allPages.length * 10 : undefined;
    },
    enabled: searchQuery.length > 0,
    initialPageParam: 0,
  });

  const searchResults = data?.pages.flat() || [];

  const searchYouTube = async (query: string) => {
    try {
      console.log(`Searching YouTube for: ${query}`);
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

      if (!apiKey) {
        console.error("YouTube API Key is missing! Make sure VITE_YOUTUBE_API_KEY is set in .env");
        return;
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(
          query
        )}&key=${apiKey}`
      );
      const data = await response.json();
      console.log("YouTube Search Results:", data);

      if (data.items && data.items.length > 0) {
        setYoutubeVideoId(data.items[0].id.videoId);
      }
    } catch (error) {
      console.error("Error searching YouTube:", error);
    }
  };

  useEffect(() => {
    if (activeSong) {
      const artistName = Array.isArray(activeSong.song.artists) ? activeSong.song.artists.join(" ") : activeSong.song.artist;
      searchYouTube(`${activeSong.song.title} ${artistName}`);
    } else {
      setYoutubeVideoId(null);
    }
  }, [activeSong?._id]);

  const addToQueueMutation = useMutation({
    mutationFn: (song: any) =>
      apiRequest("POST", `/api/rooms/${roomId}/queue`, {
        spotifyId: song.id,
        title: song.name,
        artist: Array.isArray(song.artists) ? song.artists.join(", ") : song.artists,
        cover: song.image,
        duration: song.duration,
        url: song.preview_url,
        addedBy: userId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room", roomId] });
      toast({ title: "Song added to queue!" });
    },
    onError: () => {
      toast({
        title: "Failed to add song",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const deleteSongMutation = useMutation({
    mutationFn: (queueItemId: string) =>
      apiRequest("DELETE", `/api/queue/${queueItemId}`, { userId }),
    onSuccess: () => {
      toast({ title: "Song removed from queue" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove song",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ queueItemId, voteType }: { queueItemId: string; voteType: "up" | "down"; }) => {
      if (!roomId || !userId) throw new Error("Missing required data");

      return apiRequest("POST", `/api/queue/${queueItemId}/vote`, {
        userId,
        voteType,
        roomId,
      });
    },
    onSuccess: () => {
      // No need to manually update cache here; socket will push the update
      toast({ title: "Vote recorded" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to vote", description: error.message || "Try again", variant: "destructive" });
    },
  });



  // CLIENT SIDE - Add more debugging
  const leaveRoomMutation = useMutation({
    mutationFn: () => {
      console.log("🔍 Attempting to leave room:", { roomId, userId });

      if (!roomId || !userId) {
        throw new Error(
          `Missing required data: roomId=${roomId}, userId=${userId}`
        );
      }

      return apiRequest("POST", `/api/rooms/${roomId}/leave`, {
        userId: userId,
      });
    },
    onSuccess: (response) => {
      console.log("✅ HTTP leave successful:", response);

      if (socketRef.current) {
        console.log("🔌 Emitting WebSocket leaveRoom event");
        socketRef.current.emit("leaveRoom", { roomId, userId });
      } else {
        console.warn("⚠️ No WebSocket connection available");
      }

      toast({
        title: "Left room",
        description: "You have successfully left the room",
      });
      setLocation("/");
    },
    onError: (error) => {
      console.error("❌ Leave room failed:", error.message);

      // Log the full error details
      if (error instanceof Response) {
        error.text().then((text) => {
          console.error("Error response body:", text);
        });
      }

      toast({
        title: "Failed to leave room",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (activeSong && socketRef.current && roomId) {
      socketRef.current.emit("songEnded", {
        roomId,
        songId: activeSong.song._id || activeSong.song.id,
      });
    }
  };

  const handlePrevious = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !activeSong) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percentage = x / width;

    // Use stored duration or fallback to song metadata
    const totalDuration = duration || activeSong.song.duration || 0;
    const newTime = percentage * totalDuration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying && activeSong) {
        audioRef.current.play().catch(e => console.log("Playback failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, activeSong]);
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="glass-panel p-8 rounded-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-white text-center">Loading room...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center ml-auto mr-auto justify-center max-w-[364px] sm:max-w-md">
        <GlassPanel className="p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Room not found</h1>
          <p className="text-gray-300">
            The room you're looking for doesn't exist or has been deleted.
          </p>
        </GlassPanel>
      </div>
    );
  }


  return (
    <div className="h-screen flex flex-col pt-4 pb-8 overflow-hidden">
      {/* Room Header */}
      <div className="container mx-auto px-6">
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center mb-4 w-[100%]">
          <div>
            <h1
              className="text-2xl font-bold text-white"
              data-testid="room-name"
            >
              Room: {room.name}
            </h1>
            <p className="text-gray-300 flex items-center ">
              {listenerCount} listeners • Room Code:
              <span
                className="font-monorounded text-sm ml-2"
                data-testid="room-code"
              >
                {room.code}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-2 hover:bg-white/10"
                onClick={() => {
                  navigator.clipboard.writeText(room.code);
                  toast({
                    title: "Copied!",
                    description: "Room code copied to clipboard",
                  });
                }}
              >
                <Copy className="h-3 w-3 text-gray-400" />
              </Button>
            </p>
          </div>



          <div className="flex flex-wrap gap-3">
            <Button
              size="sm"
              className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500"
              onClick={() => setShowLeaveDialog(true)}
              disabled={leaveRoomMutation.isPending}
              data-testid="button-leave-room"
            >
              <LogOut className="w-4 h-4" />
              {leaveRoomMutation.isPending ? "Leaving..." : "Leave Room"}
            </Button>
            <LeaveRoomModal
              isOpen={showLeaveDialog}
              onClose={() => setShowLeaveDialog(false)}
              onConfirm={() => leaveRoomMutation.mutate()}
              isLeaving={leaveRoomMutation.isPending}
            />
          </div>
        </div>
      </div>

      {/* Join Room Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent
          className="glass-panel border-white/20 bg-gray text-white max-w-[364px] sm:max-w-md [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold mb-0 text-center">
              Join Room
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div>
              <Input
                id="username"
                placeholder="Enter Username"
                value={joinUsername}
                onChange={(e) => {
                  let value = e.target.value;
                  if (value.length > 16) value = value.slice(0, 16);
                  setJoinUsername(value);
                }}
                className="bg-white/10 border-white/20 placeholder:text-white-400 text-lg tracking-widest mt-2 p-5"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleJoinRoom();
                }}
              />
            </div>

            <div className="flex space-x-3">
              <Button
                type="button"
                onClick={() => setLocation("/")}
                variant="ghost"
                className="flex-1 glass-panel hover:bg-white/10 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleJoinRoom}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600"
              >
                Join Room
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Three Column Layout */}
      <div className="grid lg:grid-cols-3 gap-6 px-12 flex-1 min-h-0 pb-6">
        {/* Search and Add Songs */}
        <GlassPanel className="p-4 h-[85vh] flex flex-col">
          <h2 className="text-2xl font-bold mb-2 flex items-center justify-center text-white">
            <Search className="w-6 h-6 mr-3 text-purple-300" />
            Add Songs
          </h2>

          <div className="relative space-y-2 mb-4">
            <Input
              type="text"
              placeholder="Search for songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-gray-300 focus:ring-2 focus:ring-purple-400"
              data-testid="input-search-songs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-4 text-white hover:text-white/60 transition-colors"
                title="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Search Results */}
          <div className="space-y-3 flex-1 overflow-y-auto mr-1 custom-scrollbar">
            {isSearching ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
              </div>
            ) : searchResults.length > 0 ? (
              <>
                {searchResults.map((song: any) => (
                  <div
                    key={song.id}
                    className="flex items-center p-3 mr-1 rounded-lg hover:bg-white/10 transition-all group"
                    data-testid={`search-result-${song.id}`}
                  >
                    <img
                      src={song.image}
                      alt={`${song.name} artwork`}
                      className="w-12 h-12 rounded-lg object-cover mr-4"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-white">
                        {song.name}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {song.artists.map((artist: string, i: number) => (
                          <span key={i}>
                            {artist}
                            {i < song.artists.length - 1 && ", "}
                          </span>
                        ))}
                      </p>
                    </div>
                    <div className="text-gray-400 text-xs mr-3">
                      {formatTime(song.duration / 1000)}
                    </div>
                    <Button
                      // size="sm"
                      variant="ghost"
                      onClick={() => {
                        addToQueueMutation.mutate(song);
                      }}
                      className="h-10 w-10 opacity-0 group-hover:opacity-100 hover:bg-purple-700 transition-opacity bg-purple-600 rounded-[50%]"
                      data-testid={`button-add-song-${song.id}`}
                    >
                      <Plus className="w-6 h-6 text-white" strokeWidth={4} />
                    </Button>
                  </div>
                ))}

                {hasNextPage && (
                  <div
                    onClick={() => fetchNextPage()}
                    className="text-center pt-2 mr-1 mx-auto cursor-pointer text-sm transition-colors border-t border-white/10 mt-2"
                  >
                    {isFetchingNextPage ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                        <span>Loading more...</span>
                      </div>
                    ) : (
                      <span className="text-purple-400 hover:text-purple-500">more results</span>
                    )}
                  </div>
                )}
              </>
            ) : searchQuery.length > 0 ? (
              <div className="h-full flex items-center justify-center min-h-[200px]">
                <p className="text-gray-400">No results found</p>
              </div>
            ) : null}
          </div>
        </GlassPanel>

        {/* Audio Player - Hidden but functional */}
        {/* Audio Player - Hidden but functional, only for Creator */}
        {(room?.createdBy === userId || (typeof room?.createdBy === 'object' && room?.createdBy?._id === userId)) && (
          <audio
            ref={audioRef}
            src={activeSong?.song?.url}
            onEnded={() => {
              if (activeSong && socketRef.current) {
                console.log("Song ended, requesting next...", activeSong);
                socketRef.current.emit("songEnded", {
                  roomId,
                  songId: activeSong.song._id || activeSong.song.id,
                });
              }
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={(e) => {
              if (!e.currentTarget.ended) {
                setIsPlaying(false);
              }
            }}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          />
        )}

        {/* Now Playing */}
        <GlassPanel className="p-6 h-[85vh] flex flex-col items-center text-center overflow-y-auto">
          <h2 className="text-2xl font-bold mb-6 flex items-center text-white">
            <Play className="w-6 h-6 mr-3 text-green-400" />
            Now Playing
          </h2>

          {activeSong ? (
            <>
              {/* YouTube Player */}
              {/* YouTube Player */}
              {/* YouTube Player */}
              {youtubeVideoId && (
                <div className="w-full mb-4">
                  {(room?.createdBy === userId || (typeof room?.createdBy === 'object' && room?.createdBy?._id === userId)) ? (
                    <YouTube
                      videoId={youtubeVideoId}
                      opts={{
                        height: '315',
                        width: '100%',
                        playerVars: {
                          autoplay: 1,
                        },
                      }}
                      onEnd={handleNext}
                      className="rounded-xl w-full"
                      iframeClassName="rounded-xl w-full"
                    />
                  ) : (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden group">
                      <img
                        src={`https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`}
                        alt="Now Playing"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
                        Playing on Host's Device
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TEMPORARILY COMMENTED OUT EXISTING CODE - wrapped to disable
              {/* Album Artwork 
              <div className="relative mb-5 group">                <img
                src={
                  activeSong.song.cover ||
                  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=280&h=280&fit=crop&crop=center"
                }
                alt={`${activeSong.song.title} artwork`}
                className="w-80 h-80 rounded-xl"
                data-testid="current-song-artwork"
              />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              {/* Song Info 
              <div className="mb-2">
                <h3
                  className="text-2xl font-bold mb-2 text-white"
                  data-testid="current-song-title"
                >
                  {activeSong.song.title}
                </h3>
                <p
                  className="text-gray-300 text-lg"
                  data-testid="current-song-artist"
                >
                  {activeSong.song.artist}
                </p>
                {activeSong.song.album && (
                  <p
                    className="text-gray-400 text-sm mt-1"
                    data-testid="current-song-album"
                  >
                    {activeSong.song.album}
                  </p>
                )}
              </div>

              {/* Progress Bar 
              <div className="w-full mb-4">
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration || activeSong.song.duration / 1000 || 0)}</span>
                </div>
                <div
                  className="w-full bg-white/20 rounded-full h-2 cursor-pointer relative group"
                  onClick={handleSeek}
                  data-testid="progress-bar-container"
                >
                  <div className="absolute inset-0 rounded-full hover:bg-white/10 transition-colors"></div>
                  <div
                    className="bg-gradient-to-r from-purple-400 to-blue-400 h-2 rounded-full transition-all relative"
                    style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                </div>
              </div>

              {/* Playback Controls 
              <div className="flex items-center space-x-6 mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-2xl hover:text-purple-300 transition-colors"
                  data-testid="button-previous"
                  onClick={handlePrevious}
                >
                  <SkipBack className="w-6 h-6" />
                </Button>
                <Button
                  size="lg"
                  className="bg-purple-600 rounded-full"
                  onClick={() => setIsPlaying(!isPlaying)}
                  data-testid="button-play-pause"
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8" />
                  ) : (
                    <Play className="w-8 h-8" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-2xl hover:text-purple-300 transition-colors"
                  data-testid="button-next"
                  onClick={handleNext}
                >
                  <SkipForward className="w-6 h-6" />
                </Button>
              </div>
              */}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-400">No songs in queue</p>
            </div>
          )}
        </GlassPanel>

        {/* Queue List */}
        <GlassPanel className="p-6 h-[85vh] flex flex-col">
          <h2 className="text-2xl font-bold mb-6 flex items-center justify-center text-white">
            <Music className="w-6 h-6 mr-3 text-blue-300" />
            Up Next
          </h2>

          {/* Queue Items */}
          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {room?.queueItems
                // .filter removed to include all items
                .sort((a: any, b: any) => {
                  // Keep currently playing song at the top
                  if (a.isPlaying) return -1;
                  if (b.isPlaying) return 1;

                  const scoreA = (a.upvotes || 0) - (a.downvotes || 0);
                  const scoreB = (b.upvotes || 0) - (b.downvotes || 0);
                  return scoreB - scoreA; // Descending order
                })
                .map((item: any, index: any) => {
                  const userVote = item.voters?.find(
                    (v: any) => v.userId === userId
                  )?.voteType;

                  return (
                    <motion.div
                      layout
                      // initial={{ opacity: 0, y: 20 }}
                      key={item._id || item.id}
                      className={`flex items-center p-3 mr-1 rounded-lg hover:bg-white/10 transition-all group bg-black/20 ${item.isPlaying ? 'bg-green-500/15 border border-green-500' : ''}`}
                    >
                      <div className="text-gray-400 text-sm w-8 text-center mr-1">
                        {index + 1}
                      </div>
                      <img
                        src={
                          item.song?.cover ||
                          "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=50&h=50&fit=crop&crop=center"
                        }
                        alt={`${item.song?.title || "Song"} artwork`}
                        className="w-14 h-14 rounded-lg object-cover mr-3"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-white flex items-center gap-2">
                          {item.song?.title || "Unknown Title"}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {item.song?.artist || "Unknown Artist"}
                        </p>
                        <p className="text-white/60 text-xs">
                          Added by <span>{item?.username || "Unknown"}</span>
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={userVote === "up"}
                          onClick={() =>
                            voteMutation.mutate({
                              queueItemId: item._id || item.id,
                              voteType: "up",
                            })
                          }
                          className={`transition-colors p-1 ${userVote === "up"
                            ? "text-green-400 bg-green-400/10"
                            : "text-gray-400 hover:text-green-400 hover:bg-white/10"
                            }`}
                        >
                          <ChevronUp className="w-4 h-4" />
                          <span className="mr-1">{item.upvotes ?? 0}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={userVote === "down"}
                          onClick={() =>
                            voteMutation.mutate({
                              queueItemId: item._id || item.id,
                              voteType: "down",
                            })
                          }
                          className={`transition-colors p-1 ${userVote === "down"
                            ? "text-red-400 bg-red-400/10"
                            : "text-gray-400 hover:text-red-400 hover:bg-white/10"
                            }`}
                        >
                          <ChevronDown className="w-4 h-4" />
                          <span className="mr-1">{item.downvotes ?? 0}</span>
                        </Button>
                        {((item.addedBy?._id || item.addedBy) == userId) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSongMutation.mutate(item._id || item.id)}
                            className="text-gray-400 hover:text-red-400 hover:bg-white/10 p-1 h-8 w-8"
                            title="Remove song"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
            </AnimatePresence>

            {room?.queueItems?.length === 0 && (
              <div className="text-center py-8 h-full flex items-center justify-center min-h-[200px]">
                <p className="text-gray-400">Queue is empty. Add some songs!</p>
              </div>
            )}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
