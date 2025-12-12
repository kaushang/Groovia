import { useParams, useLocation } from "wouter";
import DoubleMarquee from "@/components/double-marquee";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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

  const [isPlaying, setIsPlaying] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [listenerCount, setListenerCount] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<any>(null);
  const lastEmitTimeRef = useRef(0);
  const isHostRef = useRef(false);
  const [location] = useLocation();
  const userIdParam = searchParams.get("user");
  const [userId, setUserId] = useState<string | null>(userIdParam);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [joinUsername, setJoinUsername] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeTab, setActiveTab] = useState<'search' | 'player' | 'queue'>('player');

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

  // Handle browser back button
  useEffect(() => {
    // Capture the current URL (the Room URL) to restore in case of back navigation
    const currentUrl = window.location.href;

    // Push a new entry to history stack to trap the back button
    window.history.pushState(null, "", currentUrl);

    const handlePopState = (event: PopStateEvent) => {
      // Prevent default navigation
      event.preventDefault();
      setShowLeaveDialog(true);
      // Restore the captured Room URL to ensure we stay on the page
      window.history.pushState(null, "", currentUrl);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

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

  const isHost = Boolean(room && userId && (
    (typeof room.createdBy === 'string' && room.createdBy === userId) ||
    typeof room.createdBy === 'object' && room.createdBy?._id?.toString() === userId.toString()
  ));

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

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

    // ✅ Sync Time Listener
    socket.on("timeUpdated", (data) => {
      // Only non-hosts need to sync from server
      console.log("⏱️ Received time update:", data);
      if (!isHostRef.current) {
        setCurrentTime(data.currentTime);
        setDuration(data.duration);
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

  const searchYouTube = async (query: string, songId?: string) => {
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
        const videoId = data.items[0].id.videoId;
        setYoutubeVideoId(videoId);

        // Save to server if we have a songId
        if (songId) {
          try {
            await axios.post(`/api/songs/${songId}/youtube-id`, { youtubeId: videoId });
            console.log("✅ Saved YouTube ID to server");
          } catch (err) {
            console.error("Failed to save YouTube ID:", err);
          }
        }
      }
    } catch (error) {
      console.error("Error searching YouTube:", error);
    }
  };

  useEffect(() => {
    if (activeSong) {
      // 1. Check if we already have a saved YouTube ID (ZERO API CALLS)
      if (activeSong.song.youtubeId) {
        console.log("🎯 Using saved YouTube ID:", activeSong.song.youtubeId);
        setYoutubeVideoId(activeSong.song.youtubeId);
        return;
      }

      // 2. If not, search YouTube and save it
      setYoutubeVideoId(null);
      const artistName = Array.isArray(activeSong.song.artists) ? activeSong.song.artists.join(" ") : activeSong.song.artist;
      // Pass the song ID so we can save the result
      searchYouTube(`${activeSong.song.title} ${artistName}`, activeSong.song._id || activeSong.song.id);
    } else {
      setYoutubeVideoId(null);
    }
  }, [activeSong?._id, activeSong?.song?.youtubeId]);

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

  const handlePlayPause = () => {
    if (!isHost) return;
    if (isPlaying) {
      audioRef.current?.pause();
      playerRef.current?.pauseVideo();
    } else {
      audioRef.current?.play().catch((e) => console.log("Audio playback failed:", e));
      playerRef.current?.playVideo();
    }
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (!isHost) return;
    if (activeSong && socketRef.current && roomId) {
      socketRef.current.emit("songEnded", {
        roomId,
        songId: activeSong.song._id || activeSong.song.id,
      });
    }
  };

  const handlePrevious = () => {
    if (!isHost) return;
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    if (playerRef.current) {
      playerRef.current.seekTo(0);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isHost) return;
    if (!activeSong) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percentage = x / width;

    // Use stored duration or fallback to song metadata (converted to seconds if needed)
    const songDuration = activeSong.song.duration ? activeSong.song.duration / 1000 : 0;
    const totalDuration = duration || songDuration || 0;
    const newTime = percentage * totalDuration;

    if (audioRef.current) audioRef.current.currentTime = newTime;
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(newTime, true);
    }

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

  // Sync YouTube progress
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateProgress = () => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const time = playerRef.current.getCurrentTime();
        const dur = playerRef.current.getDuration();
        if (typeof time === 'number') setCurrentTime(time);
        if (dur) setDuration(dur);

        // Host emits updates
        if (isHost && socketRef.current && typeof time === 'number') {
          const now = Date.now();
          if (now - lastEmitTimeRef.current > 1000) { // Emit every 1s
            console.log("⏱️ Emitting time update:", time);
            socketRef.current.emit("updateTime", {
              roomId,
              currentTime: time,
              duration: dur || 0
            });
            lastEmitTimeRef.current = now;
          }
        }
      }
    };

    if (youtubeVideoId) {
      updateProgress();
      interval = setInterval(updateProgress, 100);
    }
    return () => clearInterval(interval);
  }, [youtubeVideoId, isHost, roomId]);

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
      <div className="container mx-auto px-4">
        <div className="relative flex flex-col md:flex-row justify-center md:justify-between items-center md:items-center mt-4 md:mb-4 w-full pt-2 md:pt-0">
          <div className="flex flex-col md:items-start md:text-left z-10 w-full md:w-auto">
            <h1
              className="text-3xl md:text-2xl text-center font-bold text-white mb-2 md:mt-2 md:mb-1 tracking-tight drop-shadow-lg"
              data-testid="room-name"
            >
              {room.name}
            </h1>

            <div className="flex items-center justify-between text-sm font-medium px-4 text-gray-200 md:bg-transparent rounded-xl border border-white/10 bg-white/10  mb-2 md:p-0 backdrop-blur-md md:backdrop-blur-none md:border-none shadow-sm md:shadow-none transition-all md:hover:bg-transparent">
              <div className="flex items-center flex-row">
                <span className="text-gray-400 mr-2 text-sm uppercase tracking-wider">Room Code:</span>
                <span
                  className="font-mono font-bold tracking-wider text-white"
                  data-testid="room-code"
                >
                  {room.code}
                </span>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 ml-1 hover:bg-white/20 text-gray-400 hover:text-white rounded-full"
                  onClick={() => {
                    navigator.clipboard.writeText(room.code);
                    toast({
                      title: "Copied!",
                      description: "Room code copied to clipboard",
                    });
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <span className="mx-2 text-white/30">•</span>
                <Sheet>
                  <SheetTrigger asChild>
                    <button className="flex items-center hover:text-white transition-colors group outline-none px-2 border border-white/10 rounded-full bg-white/10">
                      <Users className="w-3.5 h-3.5 mr-2 text-purple-300 group-hover:text-purple-400" />
                      <span className="flex items-center group-hover:underline decoration-white/30 underline-offset-4">
                        {listenerCount} <span className="md:inline ml-1">listeners</span>
                      </span>
                    </button>
                  </SheetTrigger>
                  <SheetContent className="w-3/4 sm:max-w-md border-l border-white/10 bg-black/20 backdrop-blur-xl text-white p-0 shadow-2xl">
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
                            {/* <Users className="w-6 h-6 text-purple-400" /> */}
                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-2 ml-2">Listeners</h4>
                            <Badge variant="outline" className=" ml-2 border-purple-300/50 text-purple-300">
                              {room?.members?.length || 0}
                            </Badge>
                          </div>
                          {[...(room?.members || [])].sort((a: any, b: any) => {
                            const aId = (a.userId?._id || a.userId)?.toString();
                            const bId = (b.userId?._id || b.userId)?.toString();
                            const cId = (room.createdBy?._id || room.createdBy)?.toString();
                            if (aId === cId) return -1;
                            if (bId === cId) return 1;
                            return 0;
                          }).map((member: any) => {
                            const user = member.userId;
                            const isMe = (user._id || user) === userId;
                            const cId = (room.createdBy?._id || room.createdBy)?.toString();
                            const mId = (user._id || user)?.toString();
                            const isHost = mId === cId;

                            return (
                              <div key={user._id || user} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                                <Avatar className="h-9 w-9 border border-white/10">
                                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || user}`} />
                                  <AvatarFallback className="bg-gray-800 text-gray-300">
                                    {(user.username?.[0] || "U").toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors flex items-center gap-2">
                                    {user.username || "Unknown"}
                                    {isMe && <Badge variant="secondary" className="text-[12px] h-4 px-2 bg-white/10 text-white/80">You</Badge>}
                                    {isHost && (
                                      <>
                                        <span className="text-[12px] text-purple-300 font-medium bg-purple-300/10 px-2 rounded-full">Room Host</span>
                                      </>
                                    )}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              </div>

              <div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="md:hidden text-white/70 text-red-400 w-10 h-10 -mr-3 rounded-full p-0 transition-colors hover:bg-transparent hover:text-red-400 hover:bg-black/20"
                  onClick={() => setShowLeaveDialog(true)}
                  disabled={leaveRoomMutation.isPending}
                  aria-label="Leave Room"
                >
                  <LogOut className="w-8 h-8" strokeWidth={3} />
                </Button>
              </div>
            </div>
          </div>

          <div className="absolute top-0.5 right-0 md:static md:block z-20">
            {/* Desktop Leave Button */}
            <div className="hidden md:flex flex-wrap gap-3">
              <Button
                size="sm"
                className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 shadow-lg shadow-red-900/20 border-0"
                onClick={() => setShowLeaveDialog(true)}
                disabled={leaveRoomMutation.isPending}
                data-testid="button-leave-room"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {leaveRoomMutation.isPending ? "Leaving..." : "Leave Room"}
              </Button>
            </div>
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

      {/* Three Column Layout - Adaptive Grid/Tabs */}
      <div className="grid lg:grid-cols-3 gap-6 lg:px-12 px-4 flex-1 min-h-0 pb-24 lg:pb-6 relative w-full">
        {/* Search and Add Songs */}
        <GlassPanel className={`p-2 h-[70vh] lg:h-[80vh] flex flex-col ${activeTab === 'search' ? 'flex' : 'hidden lg:flex'}`}>
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
          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
            {isSearching ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
              </div>
            ) : searchResults.length > 0 ? (
              <>
                {searchResults.map((song: any) => (
                  <div
                    key={song.id}
                    className="flex items-center p-2 mr-1 rounded-sm hover:bg-white/10 transition-all group"
                    data-testid={`search-result-${song.id}`}
                  >
                    <img
                      src={song.image}
                      alt={`${song.name} artwork`}
                      className="w-12 h-12 rounded-sm object-cover mr-2"
                    />
                    <div className="flex-1 min-w-0 mr-2">
                      <DoubleMarquee
                        text1={song.name}
                        text2={Array.isArray(song.artists) ? song.artists.join(", ") : song.artists}
                        className1="font-semibold text-sm text-white"
                        className2="text-gray-400 text-xs"
                      />
                    </div>
                    <div className="text-gray-400 text-xs mr-2">
                      {formatTime(song.duration / 1000)}
                    </div>
                    <Button
                      // size="sm"
                      variant="ghost"
                      onClick={() => {
                        addToQueueMutation.mutate(song);
                      }}
                      className="h-8 w-8 md:h-10 md:w-10 opacity-1 md:opacity-0 group-hover:opacity-100 hover:bg-purple-700 transition-opacity bg-purple-600 rounded-[50%]"
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
                        <span className="text-sm text-purple-400 hover:text-purple-500">Loading more...</span>
                      </div>
                    ) : (
                      <span className="text-purple-400 hover:text-purple-500 text-sm">more results</span>
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
            onTimeUpdate={(e) => {
              setCurrentTime(e.currentTarget.currentTime);
              // Host emits updates for audio file
              if (isHost && socketRef.current) {
                const now = Date.now();
                if (now - lastEmitTimeRef.current > 1000) {
                  socketRef.current.emit("updateTime", {
                    roomId,
                    currentTime: e.currentTarget.currentTime,
                    duration: e.currentTarget.duration
                  });
                  lastEmitTimeRef.current = now;
                }
              }
            }}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          />
        )}

        {/* Now Playing */}
        <GlassPanel className={`p-2 h-[70vh] lg:h-[80vh] flex flex-col items-center text-center overflow-y-auto overflow-x-hidden ${activeTab === 'player' ? 'flex' : 'hidden lg:flex'}`}>
          <h2 className="text-2xl font-bold mb-6 flex items-center text-white">
            <Play className="w-6 h-6 mr-3 text-green-400" />
            Now Playing
          </h2>

          {/* Media Area - Fixed container to prevent layout shifts */}
          <div className="w-full mb-2 min-h-fit">
            {activeSong ? (
              youtubeVideoId ? (
                <div className="w-full">
                  {(room?.createdBy === userId || (typeof room?.createdBy === 'object' && room?.createdBy?._id === userId)) ? (
                    <YouTube
                      videoId={youtubeVideoId}
                      opts={{
                        height: '100%',
                        width: '100%',
                        playerVars: {
                          autoplay: 1,
                          controls: 0,
                        },
                      }}
                      onReady={(e: { target: any; }) => {
                        playerRef.current = e.target;
                        e.target.playVideo();
                      }}
                      onStateChange={(e: { data: number; }) => {
                        // Sync state with player events (1 = playing, 2 = paused)
                        if (e.data === 1) setIsPlaying(true);
                        if (e.data === 2) setIsPlaying(false);
                      }}
                      onEnd={handleNext}
                      className="rounded-xl w-full h-[245px] md:h-[315px]"
                      iframeClassName="rounded-xl w-full h-full"
                    />
                  ) : (
                    <div className="relative w-full h-[245px] md:h-[315px] rounded-xl overflow-hidden group bg-black/40">
                      <img
                        src={`https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`}
                        alt="Now Playing"
                        className="w-full h-full object-cover opacity-80"
                      />
                      <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs text-white border border-white/10">
                        Playing on Host's Device
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-[245px] md:h-[315px] flex flex-col items-center justify-center bg-white/5 rounded-xl border border-white/5">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-400 mb-3"></div>
                  <p className="text-white/80 animate-pulse text-sm font-medium">Playing...</p>
                </div>
              )
            ) : (
              <div className="w-full h-[245px] md:h-[315px] flex flex-col items-center justify-center bg-white/5 rounded-xl border border-white/5">
                <Music className="w-16 h-16 text-white/10 mb-4" />
                <p className="text-white/40 font-medium">No songs in queue</p>
              </div>
            )}
          </div>

          {/* Song Details */}
          <div className="w-full flex flex-col items-start px-2 text-left">
            <div className="w-full overflow-hidden relative">
              <DoubleMarquee
                text1={activeSong?.song?.title || "No Song Playing"}
                text2={activeSong ? (Array.isArray(activeSong.song.artists) ? activeSong.song.artists.join(", ") : activeSong.song.artist) : ""}
                className1="text-lg md:text-xl font-bold text-white"
                className2="text-xs md:text-base text-purple-300 font-medium"
              />
            </div>
            {activeSong && (
              <p className="text-xs text-white/50 mt-2">
                Added by <span className="text-white/80">{activeSong?.username || "Unknown"}</span>
              </p>
            )}
          </div>

          {/* Playback Controls & Progress - Always Visible */}
          <div className={`w-full max-w-xl bg-white/10 backdrop-blur-xl rounded-[1rem] pl-6 pr-6 pt-4 pb-4 border border-white/10 mt-4 transition-all duration-300 ${!activeSong ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
            {/* Progress Bar */}
            <div className="flex items-center justify-between text-xs font-mono text-gray-400 mb-4 gap-3">
              <span className="w-10 text-right">{formatTime(currentTime)}</span>
              <div
                className={`flex-1 h-1.5 bg-white/10 rounded-full relative group flex items-center ${isHost ? "cursor-pointer" : "cursor-default"}`}
                onClick={handleSeek}
              >
                <div className={`absolute inset-0 rounded-full transition-colors ${isHost ? "hover:bg-white/5" : ""}`}></div>
                <div
                  className="bg-white h-full rounded-full relative"
                  style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                >
                  {isHost && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity scale-150"></div>
                  )}
                </div>
              </div>
              <span className="w-10 text-left">{formatTime(duration)}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-6">
              <Button
                variant="ghost"
                size="icon"
                className="w-12 h-8 text-white/70 hover:text-white hover:bg-transparent transition-all scale-150 transform disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={handlePrevious}
                disabled={!isHost}
              >
                <SkipBack className="w-8 h-8" strokeWidth={1.5} />
              </Button>

              <Button
                size="icon"
                className="w-16 h-12 rounded-full bg-white text-black hover:bg-white/90 hover:scale-105 transition-all flex items-center justify-center p-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
                onClick={handlePlayPause}
                disabled={!isHost}
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 fill-current" />
                ) : (
                  <Play className="w-7 h-7 fill-current ml-1" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="w-12 h-8 text-white/70 hover:text-white hover:bg-transparent transition-all scale-150 transform disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={handleNext}
                disabled={!isHost}
              >
                <SkipForward className="w-8 h-8" strokeWidth={1.5} />
              </Button>
            </div>
          </div>
        </GlassPanel>

        {/* Queue List */}
        <GlassPanel className={`p-2 h-[70vh] lg:h-[80vh] flex items-center flex-col ${activeTab === 'queue' ? 'flex' : 'hidden lg:flex'}`}>
          <h2 className="text-2xl font-bold mb-6 flex items-center justify-center text-white">
            <Music className="w-6 h-6 mr-3 text-blue-300" />
            Up Next
          </h2>

          {/* Queue Items */}
          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar w-full">
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
                    <div
                      // layout
                      // initial={{ opacity: 0, y: 20 }}
                      key={item._id || item.id}
                      className={`flex items-center p-2 mr-1 rounded-lg hover:bg-white/10 transition-all group bg-black/20 ${item.isPlaying ? 'bg-green-500/15 hover:bg-green-500/15 border border-green-500' : ''}`}
                    >
                      <div className="text-gray-200 text-xs w-2 text-center mr-2">
                        {index + 1}
                      </div>
                      <img
                        src={
                          item.song?.cover ||
                          "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=50&h=50&fit=crop&crop=center"
                        }
                        alt={`${item.song?.title || "Song"} artwork`}
                        className="w-12 h-12 rounded-sm object-cover mr-3"
                      />
                      <div className="flex-1 min-w-0 overflow-hidden grid grid-cols-1">
                        <DoubleMarquee
                          text1={item.song?.title || "Unknown Title"}
                          text2={item.song?.artist || "Unknown Artist"}
                          className1="font-medium text-xs md:text-sm text-white"
                          className2="font-medium text-xs md:text-xs text-gray-400"
                        />
                        {/* <p className="text-gray-400 text-xs">
                          {item.song?.artist || "Unknown Artist"}
                        </p> */}
                        <p className="text-white/60 text-xs ">
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
                            ? "text-green-400 bg-green-400/10 hover:bg-green-400/10 hover:text-green-400 disabled:opacity-100"
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
                            ? "text-red-400 bg-red-400/10 hover:bg-red-400/10 hover:text-red-400 disabled:opacity-100"
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
                    </div>
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

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-6 left-4 right-4 h-16 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl flex items-center justify-around z-50 shadow-2xl safe-pb">
        <button
          onClick={() => setActiveTab("search")}
          className={`relative flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${activeTab === "search" ? "text-purple-400 scale-110" : "text-gray-400 hover:text-white"
            }`}
        >
          <Search className="w-6 h-6 mb-1" strokeWidth={activeTab === "search" ? 2.5 : 2} />
          <span className="text-[10px] font-medium tracking-wide">Add Songs</span>
          {activeTab === "search" && (
            <span className="absolute -bottom-1 w-1 h-1 bg-purple-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("player")}
          className={`relative flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${activeTab === "player" ? "text-green-400 scale-110" : "text-gray-400 hover:text-white"
            }`}
        >
          <div className={`p-3 rounded-full transition-all ${activeTab === "player" ? "bg-green-300/20" : ""}`}>
            <Play className={`w-6 h-6 ${activeTab === "player" ? "fill-current" : ""}`} strokeWidth={activeTab === "player" ? 2.5 : 2} />
          </div>
        </button>

        <button
          onClick={() => setActiveTab("queue")}
          className={`relative flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${activeTab === "queue" ? "text-blue-400 scale-110" : "text-gray-400 hover:text-white"
            }`}
        >
          <Music className="w-6 h-6 mb-1" strokeWidth={activeTab === "queue" ? 2.5 : 2} />
          <span className="text-[10px] font-medium tracking-wide">Queue</span>
          {activeTab === "queue" && (
            <span className="absolute -bottom-1 w-1 h-1 bg-blue-400 rounded-full" />
          )}
        </button>
      </div>
    </div>
  );
}
