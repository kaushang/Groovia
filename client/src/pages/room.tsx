import { useParams, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "react-router-dom";
import { LogOut, Copy } from "lucide-react";

import LeaveRoomModal from "@/components/leave-room-modal";
import SongSearch from "@/components/room components/song-search";
import Player from "@/components/room components/room-player";
import QueueList from "@/components/room components/queue-list";
import MobileNavigation from "@/components/room components/mobile-navigation";
import ListenerCountSheet from "@/components/room components/listener-count-sheet";
import JoinRoomModal from "@/components/join-room-modal";

import GlassPanel from "@/components/glass-panel";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const [, setLocation] = useLocation();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  // A-B Loop State
  const [isLoopingRange, setIsLoopingRange] = useState(false);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);

  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  // Listener Count & Dropdown state moved to ListenerCountSheet component

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null); // State to pass to children
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<any>(null);

  const lastEmitTimeRef = useRef(0);
  const lastActiveSongIdRef = useRef<string | null>(null);
  const isHostRef = useRef(false);
  const userIdParam = searchParams.get("user");
  const [userId, setUserId] = useState<string | null>(userIdParam);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeTab, setActiveTab] = useState<"search" | "player" | "queue">(
    "player",
  );

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

  const isHost = Boolean(
    room &&
    userId &&
    ((typeof room.createdBy === "string" && room.createdBy === userId) ||
      (typeof room.createdBy === "object" &&
        room.createdBy?._id?.toString() === userId.toString())),
  );

  // Handle loop state persistence and reset on song change
  useEffect(() => {
    // Use queue item ID to ensure loop state is unique to the specific play instance
    const currentQueueItemId = activeSong?._id || activeSong?.id;

    if (currentQueueItemId) {
      // If the song has changed (or this is the first load)
      if (currentQueueItemId !== lastActiveSongIdRef.current) {
        const storedState = localStorage.getItem("groovia_loop_state");
        if (storedState) {
          try {
            const parsed = JSON.parse(storedState);
            // Only restore if the stored queue item ID matches
            if (parsed.queueItemId === currentQueueItemId && parsed.isLooping) {
              setIsLooping(true);
            } else {
              setIsLooping(false);
            }
          } catch (e) {
            setIsLooping(false);
          }
        } else {
          setIsLooping(false);
        }

        // Reset A-B Loop Range for new song
        setIsLoopingRange(false);
        setLoopStart(null);
        setLoopEnd(null);

        lastActiveSongIdRef.current = currentQueueItemId;
      }
    }
  }, [activeSong?._id, activeSong?.id]);

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
    setSocket(socket);

    // Join the room via WebSocket
    socket.emit("joinRoom", { roomId, userId });

    // ✅ When YOU join (reload included) → always sync exact state from server
    socket.on("joinedRoom", (data) => {
      console.log("Successfully joined room via WebSocket:", data);

      if (data.room) {
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
      }
    });

    // ✅ When users leave → set absolute count from server if provided
    socket.on("userLeft", (data) => {
      console.log("User left:", data);
      toast({
        title: "User left",
        description: `${data.user?.username || "Someone"} left the room`,
      });
    });

    // ✅ Full room updates → always sync absolute
    socket.on("roomUpdated", (updatedRoom) => {
      console.log("Room updated:", updatedRoom);

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
        oldData ? { ...oldData, queueItems: data.queueItems } : oldData,
      );

      if (data.votedBy?.userId !== userId) {
        let description = "";
        if (data.action === "unvoted") {
          description = `${data.votedBy?.username || "Someone"} removed their vote`;
        } else {
          description = `${data.votedBy?.username || "Someone"} voted ${data.voteType === "up" ? "👍" : "👎"}`;
        }

        toast({
          title: "Song vote updated",
          description,
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

    // ✅ Sync Loop State Listener
    socket.on("loopToggled", (data) => {
      console.log("🔁 Received loop update:", data);
      setIsLooping(data.isLooping);
    });

    // ✅ Sync Loop Range Listener
    socket.on("loopRangeUpdated", (data) => {
      console.log("🔁 Received range loop update:", data);
      console.log("🔁 Received range loop update:", data);
      setIsLoopingRange(data.isLoopingRange);
      setLoopStart(data.loopStart);
      setLoopEnd(data.loopEnd);
    });

    socket.on("kicked", (data) => {
      if (data.roomId === roomId) {
        toast({
          title: "Kicked",
          description: "You have been kicked out of the room",
          variant: "destructive",
        });
        setLocation("/");
      }
    });

    socket.on("notification", (data) => {
      toast({
        title: data.type === "warning" ? "Notice" : "Update",
        description: data.message,
        variant: data.type === "warning" ? "destructive" : "default",
      });
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.emit("leaveRoom", { roomId, userId });
        socket.disconnect();
      }
    };
  }, [roomId, userId, toast, queryClient]);

  const { data: recommendations } = useQuery({
    queryKey: ["recommendations", activeSong?.song?.spotifyId],
    queryFn: async () => {
      if (!activeSong?.song?.spotifyId) return [];
      const res = await axios.get("/api/recommendations", {
        params: { seed_track: activeSong.song.spotifyId },
      });
      return res.data.tracks;
    },
    enabled: !!activeSong?.song?.spotifyId,
  });

  const searchYouTube = async (query: string, songId?: string) => {
    try {
      console.log(`Searching YouTube for: ${query}`);
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

      if (!apiKey) {
        console.error(
          "YouTube API Key is missing! Make sure VITE_YOUTUBE_API_KEY is set in .env",
        );
        return;
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(
          query,
        )}&key=${apiKey}`,
      );
      const data = await response.json();
      console.log("YouTube Search Results:", data);

      if (data.items && data.items.length > 0) {
        const videoId = data.items[0].id.videoId;
        setYoutubeVideoId(videoId);

        // Save to server if we have a songId
        if (songId) {
          try {
            await axios.post(`/api/songs/${songId}/youtube-id`, {
              youtubeId: videoId,
            });
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
      const artistName = Array.isArray(activeSong.song.artists)
        ? activeSong.song.artists.join(" ")
        : activeSong.song.artist;
      // Pass the song ID so we can save the result
      searchYouTube(
        `${activeSong.song.title} ${artistName} Full Song`,
        activeSong.song._id || activeSong.song.id,
      );
    } else {
      setYoutubeVideoId(null);
    }
  }, [activeSong?._id, activeSong?.song?.youtubeId]);

  const addToQueueMutation = useMutation({
    mutationFn: (song: any) =>
      apiRequest("POST", `/api/rooms/${roomId}/queue`, {
        spotifyId: song.id,
        title: song.name,
        artist: Array.isArray(song.artists)
          ? song.artists.join(", ")
          : song.artists,
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
    mutationFn: async ({
      queueItemId,
      voteType,
    }: {
      queueItemId: string;
      voteType: "up" | "down";
    }) => {
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
      toast({
        title: "Failed to vote",
        description: error.message || "Try again",
        variant: "destructive",
      });
    },
  });

  // CLIENT SIDE - Add more debugging
  const leaveRoomMutation = useMutation({
    mutationFn: () => {
      console.log("🔍 Attempting to leave room:", { roomId, userId });

      if (!roomId || !userId) {
        throw new Error(
          `Missing required data: roomId=${roomId}, userId=${userId}`,
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
      audioRef.current
        ?.play()
        .catch((e) => console.log("Audio playback failed:", e));
      playerRef.current?.playVideo();
    }
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (!isHost) return;
    if (activeSong && socketRef.current && roomId) {
      // Optimistic Update
      const oldRoomData = queryClient.getQueryData<any>(["room", roomId]);

      if (oldRoomData?.queueItems) {
        const queueItems = [...oldRoomData.queueItems];
        const currentIndex = queueItems.findIndex(
          (item: any) =>
            (item._id && item._id === activeSong._id) ||
            (item.id && item.id === activeSong.id),
        );

        if (currentIndex !== -1 && currentIndex < queueItems.length - 1) {
          const nextSong = queueItems[currentIndex + 1];

          const newQueueItems = queueItems.map((item, index) => {
            if (index === currentIndex) return { ...item, isPlaying: false };
            if (index === currentIndex + 1) return { ...item, isPlaying: true };
            return item;
          });

          queryClient.setQueryData(["room", roomId], {
            ...oldRoomData,
            queueItems: newQueueItems,
          });

          // Reset/Update player state
          setCurrentTime(0);
          if (nextSong?.song?.duration) {
            setDuration(nextSong.song.duration / 1000);
          }
          // Optimistically set YouTube ID if available to avoid flicker
          if (nextSong.song?.youtubeId) {
            setYoutubeVideoId(nextSong.song.youtubeId);
          } else {
            setYoutubeVideoId(null);
          }

          setIsPlaying(true);
        }
      }

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
    const songDuration = activeSong.song.duration
      ? activeSong.song.duration / 1000
      : 0;
    const totalDuration = duration || songDuration || 0;
    const newTime = percentage * totalDuration;

    if (audioRef.current) audioRef.current.currentTime = newTime;
    if (playerRef.current && typeof playerRef.current.seekTo === "function") {
      playerRef.current.seekTo(newTime, true);
    }

    setCurrentTime(newTime);
  };

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying && activeSong) {
        audioRef.current
          .play()
          .catch((e) => console.log("Playback failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, activeSong]);

  // Sync playback when becoming host (or losing host status)
  useEffect(() => {
    if (isHost && audioRef.current && activeSong) {
      if (Math.abs(audioRef.current.currentTime - currentTime) > 0.5) {
        audioRef.current.currentTime = currentTime;
      }
      setIsPlaying(true);
      audioRef.current
        .play()
        .catch((e) => console.log("Host transition playback failed:", e));
    } else if (!isHost) {
      // If we are NO LONGER host (or never were), reset local playing state
      // (Visual only, since audio element unmounts anyway, but good for Player UI)
      setIsPlaying(false);
    }
  }, [isHost]);

  // Sync YouTube progress
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateProgress = () => {
      if (
        playerRef.current &&
        typeof playerRef.current.getCurrentTime === "function"
      ) {
        const time = playerRef.current.getCurrentTime();
        const dur = playerRef.current.getDuration();

        // Only update local time from player if we are hosting or playing locally
        // Otherwise, rely on socket updates for time sync
        if (typeof time === "number" && (isHost || isPlaying)) {
          setCurrentTime(time);
        }
        if (dur) setDuration(dur);

        // Host emits updates
        if (isHost && socketRef.current && typeof time === "number") {
          const now = Date.now();
          if (now - lastEmitTimeRef.current > 1000) {
            // Emit every 1s
            socketRef.current.emit("updateTime", {
              roomId,
              currentTime: time,
              duration: dur || 0,
            });
            lastEmitTimeRef.current = now;
          }
        }
      }
    };

    const handleRangeCheckout = () => {
      if (isLoopingRange && loopStart !== null && loopEnd !== null) {
        if (currentTime >= loopEnd) {
          // Seek to start
          if (audioRef.current) audioRef.current.currentTime = loopStart;
          if (
            playerRef.current &&
            typeof playerRef.current.seekTo === "function"
          ) {
            playerRef.current.seekTo(loopStart, true);
          }
          setCurrentTime(loopStart);
        }
      }
    };

    if (youtubeVideoId) {
      updateProgress();
      handleRangeCheckout(); // Check range loop
      interval = setInterval(() => {
        updateProgress();
        handleRangeCheckout();
      }, 100);
    }
    return () => clearInterval(interval);
  }, [
    youtubeVideoId,
    isHost,
    roomId,
    isLoopingRange,
    loopStart,
    loopEnd,
    currentTime,
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-panel rounded-xl w-fit flex flex-row gap-8 p-12">
          <div className="w-full aspect-video flex items-center justify-center">
            <div className="flex flex-row items-center">
              <img
                src="/groovia_icon.png"
                alt=""
                className="h-10 w-10 animate-spin-reverse-slow"
              />
            </div>
          </div>
          <p className="text-white whitespace-nowrap -ml-4 my-auto">
            Loading room...
          </p>
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
    <div className="h-screen flex flex-col pt-2 pb-8 overflow-hidden">
      {/* Room Header */}
      <div className="container mx-auto px-4">
        <div className="relative flex flex-col md:flex-row justify-center md:justify-between items-center md:items-center md:mb-4 w-full pt-2 md:pt-0">
          <div className="flex flex-col md:items-start md:text-left z-10 w-full md:w-auto">
            <div className="flex flex-row items-center justify-between gap-4 w-full md:w-auto mb-2 mt-2">
              <span
                className="text-2xl md:text-2xl items-end md:text-center font-bold text-white tracking-tight ml-1 drop-shadow-lg"
                data-testid="room-name"
              >
                {room.name}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="md:hidden text-red-400 text-md h-fit w-fit mr-3 pt-1 hover:bg-transparent hover:text-red-400 [&_svg]:w-4 [&_svg]:h-4"
                onClick={() => setShowLeaveDialog(true)}
                disabled={leaveRoomMutation.isPending}
                aria-label="Leave Room"
              >
                Leave
                {/* <LogOut strokeWidth={3} /> */}
              </Button>
            </div>

            <div className="flex  justify-between text-sm font-medium px-1 py-1 text-gray-200 md:bg-transparent rounded-xl mb-1 md:p-0 backdrop-blur-md md:backdrop-blur-none md:border-none shadow-sm md:shadow-none transition-all md:hover:bg-transparent">
              <div className="flex items-center flex-row mr-2">
                <span className="text-gray-400 mr-2 text-sm uppercase tracking-wider">
                  Room Code:
                </span>
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
              </div>

              <ListenerCountSheet
                room={room}
                userId={userId}
                socket={socket}
                roomId={roomId || ""}
              />
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
                <LogOut className="w-4 h-4" />
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
      <JoinRoomModal
        isOpen={showJoinDialog}
        onClose={() => setShowJoinDialog(false)}
        initialCode={room?.code}
        onCancel={() => setLocation("/")}
      />

      {/* Three Column Layout - Adaptive Grid/Tabs */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_2fr_1fr] gap-2 lg:gap-2 lg:px-6 px-4 flex-1 min-h-0 lg:pb-6 relative w-full">
        {/* Search and Add Songs */}
        <SongSearch
          className={activeTab === "search" ? "flex" : "hidden lg:flex"}
          addToQueueMutation={addToQueueMutation}
          formatTime={formatTime}
        />

        {/* Audio Player - Hidden but functional, only for Creator */}
        {(room?.createdBy === userId ||
          (typeof room?.createdBy === "object" &&
            room?.createdBy?._id === userId)) && (
          <audio
            ref={audioRef}
            src={activeSong?.song?.url}
            onEnded={() => {
              if (isLooping && audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
                return;
              }
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
                    duration: e.currentTarget.duration,
                  });
                  lastEmitTimeRef.current = now;
                }
              }

              // Check A-B Loop
              if (isLoopingRange && loopStart !== null && loopEnd !== null) {
                if (e.currentTarget.currentTime >= loopEnd) {
                  e.currentTarget.currentTime = loopStart;
                }
              }
            }}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          />
        )}

        {/* Now Playing */}
        <Player
          className={activeTab === "player" ? "flex" : "hidden lg:flex"}
          room={room}
          activeSong={activeSong}
          userId={userId}
          isHost={isHost}
          youtubeVideoId={youtubeVideoId}
          playerRef={playerRef}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          handleNext={handleNext}
          handlePrevious={handlePrevious}
          handlePlayPause={handlePlayPause}
          handleSeek={handleSeek}
          currentTime={currentTime}
          duration={duration}
          loopStart={loopStart}
          loopEnd={loopEnd}
          isLooping={isLooping}
          isLoopingRange={isLoopingRange}
          onToggleLoop={(newState) => {
            setIsLooping(newState);
            const currentQueueItemId = activeSong?._id || activeSong?.id;
            if (currentQueueItemId) {
              localStorage.setItem(
                "groovia_loop_state",
                JSON.stringify({
                  queueItemId: currentQueueItemId,
                  isLooping: newState,
                }),
              );
            }
            if (socketRef.current) {
              socketRef.current.emit("toggleLoop", {
                roomId,
                isLooping: newState,
              });
            }
          }}
          onUpdateLoopRange={(start, end, isActive) => {
            setLoopStart(start);
            setLoopEnd(end);
            setIsLoopingRange(isActive);
            if (socketRef.current) {
              socketRef.current.emit("updateLoopRange", {
                roomId,
                loopStart: start,
                loopEnd: end,
                isLoopingRange: isActive,
              });
            }
          }}
          recommendations={recommendations}
          addToQueueMutation={addToQueueMutation}
          formatTime={formatTime}
        />

        {/* Queue List */}
        <QueueList
          className={activeTab === "queue" ? "flex" : "hidden lg:flex"}
          room={room}
          userId={userId}
          isLooping={isLooping}
          voteMutation={voteMutation}
          deleteSongMutation={deleteSongMutation}
          addToQueueMutation={addToQueueMutation}
        />

        {/* Mobile Bottom Navigation */}
        <MobileNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </div>
  );
}
