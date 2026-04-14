import { useState, useEffect, useCallback } from "react";
import { useGlobalPlayer } from "@/components/global-player-provider";
import { Button } from "@/components/ui/button";
import DoubleMarquee from "@/components/double-marquee";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  CirclePlus,
  Trash2,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${Math.floor(s % 60)
    .toString()
    .padStart(2, "0")}`;

export default function SoloMiniPlayer() {
  const {
    currentSong,
    isPlaying,
    isLooping,
    currentTime,
    duration,
    togglePlayPause,
    toggleLoop,
    skip,
    seek,
    clearPlayer,
  } = useGlobalPlayer();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── A-B Loop state (local) ──────────────────────────────────────────────
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [isLoopingRange, setIsLoopingRange] = useState(false);

  // Reset A-B whenever the song changes
  useEffect(() => {
    setLoopStart(null);
    setLoopEnd(null);
    setIsLoopingRange(false);
  }, [currentSong?.youtubeId]);

  // Enforce A-B loop on every time tick
  useEffect(() => {
    if (isLoopingRange && loopStart !== null && loopEnd !== null) {
      if (currentTime >= loopEnd) {
        seek(loopStart);
      }
    }
  }, [currentTime, isLoopingRange, loopStart, loopEnd, seek]);

  const handleRangeLoop = useCallback(() => {
    if (!loopStart) {
      setLoopStart(currentTime);
      setLoopEnd(null);
      setIsLoopingRange(false);
      toast({
        title: "Point A set",
        description: "Click again to set Point B",
      });
    } else if (!loopEnd) {
      if (currentTime > loopStart) {
        setLoopEnd(currentTime);
        setIsLoopingRange(true);
        toast({ title: "A-B Loop active" });
      } else {
        setLoopStart(currentTime);
        toast({ title: "Point A updated", description: "Must set B after A" });
      }
    } else {
      setLoopStart(null);
      setLoopEnd(null);
      setIsLoopingRange(false);
      toast({ title: "A-B Loop cleared" });
    }
  }, [currentTime, loopStart, loopEnd, toast]);

  // ── Add to Favorites ────────────────────────────────────────────────────
  const addFavMutation = useMutation({
    mutationFn: async () => {
      if (!currentSong) return;
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await axios.post(
        "/api/favorites",
        {
          spotifyId: currentSong.spotifyId || currentSong.youtubeId,
          title: currentSong.title,
          artists: currentSong.artists,
          cover: currentSong.cover,
          duration: currentSong.duration * 1000,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return res.data;
    },
    onSuccess: async () => {
      queryClient.setQueryData(["favorite-songs"], (old: any[] | undefined) => {
        const prev = Array.isArray(old) ? old : [];
        const spotifyId = currentSong?.spotifyId || currentSong?.youtubeId;
        if (!spotifyId || !currentSong) return prev;
        if (prev.some((s: any) => s.id === spotifyId)) return prev;
        return [
          {
            id: spotifyId,
            name: currentSong.title,
            artists: Array.isArray(currentSong.artists)
              ? currentSong.artists
              : [currentSong.artists].filter(Boolean),
            image: currentSong.cover,
            duration: (currentSong.duration || 0) * 1000,
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
        description: `${currentSong?.title} saved.`,
      });
    },
    onError: (err: any) =>
      toast({
        title: "Error",
        description: err.response?.data?.message || "Could not save.",
        variant: "destructive",
      }),
  });

  if (!currentSong) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const artistsStr = Array.isArray(currentSong.artists)
    ? currentSong.artists.join(", ")
    : currentSong.artists;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width),
    );
    seek(ratio * duration);
  };

  const abLabel = isLoopingRange ? "A-B" : loopStart ? "A…" : "A-B";
  const abActive = isLoopingRange || loopStart !== null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 w-full  lg:mx-auto">
      {/* ── TOP PROGRESS BAR — spans full width, acts as the border ── */}
      <div
        className="h-1 w-full bg-white/15 cursor-pointer rounded-t-sm overflow-hidden w-[100%] lg:w-[100%] mx-auto"
        onClick={handleSeek}
      >
        {/* A-B range tint */}
        {loopStart !== null && duration > 0 && (
          <div
            className="absolute top-0 h-full bg-purple-500/40"
            style={{
              left: `${(loopStart / duration) * 100}%`,
              width: loopEnd
                ? `${((loopEnd - loopStart) / duration) * 100}%`
                : "2px",
            }}
          />
        )}
        {/* Fill */}
        <div
          className="h-full bg-white rounded-full"
          style={{ width: `${progress}%`, transition: "width 0.5s linear" }}
        />
      </div>

      {/* ── PLAYER BAR ── */}
      <div className="bg-black/65 backdrop-blur-xl border-x border-b border-white/[0.08] rounded-b-sm">
        <div className="flex items-center px-2 md:px-6 h-[70px] gap-2">
          {/* ── LEFT: Song info ─────────────────────────────────────── */}
          <div className="flex items-center gap-2 w-full md:w-1/3 min-w-0">
            <img
              src={currentSong.cover}
              alt={currentSong.title}
              className="w-11 h-11 rounded object-cover shrink-0 shadow-md"
            />
            <div className="min-w-0 flex-1 md:flex-none md:w-[160px] lg:w-[90%]">
              <DoubleMarquee
                text1={currentSong.title}
                text2={artistsStr}
                className1="text-sm font-semibold text-white"
                className2="text-xs text-gray-400"
              />
            </div>
          </div>

          {/* ── CENTRE: Full playback controls (desktop) ──────────────── */}
          <div className="hidden md:flex flex-col items-center justify-center flex-1 max-w-md mx-auto gap-1.5">
            {/* Buttons row */}
            <div className="flex items-center gap-3">
              {/* A-B Loop */}
              <Button
                variant="ghost"
                size="icon"
                title={
                  isLoopingRange
                    ? "Clear A-B loop"
                    : loopStart
                      ? "Set Point B"
                      : "Set Point A"
                }
                onClick={handleRangeLoop}
                className={`w-8 h-8 hover:bg-transparent ${
                  abActive
                    ? "text-purple-400 hover:text-purple-300"
                    : "text-white/50 hover:text-white"
                }`}
              >
                <span className="text-[10px] font-mono font-bold border border-current rounded px-1 leading-none py-0.5">
                  {abLabel}
                </span>
              </Button>

              {/* Previous — restart song */}
              <Button
                variant="ghost"
                size="icon"
                title="Restart"
                onClick={() => seek(0)}
                className="w-8 h-8 text-white/50 hover:text-white hover:bg-transparent"
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </Button>

              {/* Play / Pause */}
              <Button
                size="icon"
                onClick={togglePlayPause}
                className="w-9 h-9 rounded-full bg-white text-black hover:bg-gray-200 shadow-md"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </Button>

              {/* Skip next */}
              <Button
                variant="ghost"
                size="icon"
                title="Skip"
                onClick={skip}
                className="w-8 h-8 text-white/50 hover:text-white hover:bg-transparent"
              >
                <SkipForward className="w-8 h-8 fill-current" />
              </Button>

              {/* Loop */}
              <Button
                variant="ghost"
                size="icon"
                title={isLooping ? "Disable loop" : "Loop song"}
                onClick={toggleLoop}
                className={`w-8 h-8 hover:bg-transparent ${
                  isLooping
                    ? "text-purple-400 hover:text-purple-300"
                    : "text-white/50 hover:text-white"
                }`}
              >
                <Repeat
                  className="w-4 h-4"
                  strokeWidth={isLooping ? 2.5 : 1.5}
                />
              </Button>
            </div>

            {/* Times */}
            <div className="flex items-center w-full justify-center gap-2">
              <span className="text-[10px] text-gray-500 tabular-nums">
                {fmt(currentTime)}
              </span>
              <span className="text-[10px] text-gray-600">/</span>
              <span className="text-[10px] text-gray-500 tabular-nums">
                {fmt(duration)}
              </span>
            </div>
          </div>

          {/* ── RIGHT: Favorites + Trash ─────────────────────────────── */}
          <div className="flex items-center gap-1 md:w-1/3 md:justify-end shrink-0">
            {/* Mobile: play + skip */}
            <Button
              size="icon"
              onClick={togglePlayPause}
              className="w-9 h-9 rounded-full bg-white text-black hover:bg-gray-200 md:hidden"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={skip}
              className="w-8 h-8 text-white/50 hover:text-white md:hidden"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </Button>

            {/* Add to Favorites */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => addFavMutation.mutate()}
              disabled={addFavMutation.isPending}
              title="Add to Favorites"
              className="w-9 h-9 text-white/50 hover:text-rose-400 hover:bg-transparent transition-colors"
            >
              {addFavMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-t-rose-400 rounded-full animate-spin" />
              ) : (
                <CirclePlus className="w-5 h-5" />
              )}
            </Button>

            {/* Clear / Dismiss — trash icon */}
            <Button
              variant="ghost"
              size="icon"
              onClick={clearPlayer}
              title="Remove from player"
              className="w-8 h-8 text-white/30 hover:text-red-400 hover:bg-transparent transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
