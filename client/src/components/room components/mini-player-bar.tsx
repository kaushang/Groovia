import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  CirclePlus,
} from "lucide-react";
import DoubleMarquee from "@/components/double-marquee";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";

interface MiniPlayerBarProps {
  activeSong: any;
  isPlaying: boolean;
  isHost: boolean;
  isLooping: boolean;
  isLoopingRange: boolean;
  loopStart: number | null;
  loopEnd: number | null;
  currentTime: number;
  duration: number;
  handlePlayPause: () => void;
  handleNext: () => void;
  handlePrevious: () => void;
  handleSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  onToggleLoop: (newState: boolean) => void;
  onUpdateLoopRange: (
    start: number | null,
    end: number | null,
    isActive: boolean,
  ) => void;
  formatTime: (time: number) => string;
}

export default function MiniPlayerBar({
  activeSong,
  isPlaying,
  isHost,
  isLooping,
  isLoopingRange,
  loopStart,
  loopEnd,
  currentTime,
  duration,
  handlePlayPause,
  handleNext,
  handlePrevious,
  handleSeek,
  onToggleLoop,
  onUpdateLoopRange,
  formatTime,
}: MiniPlayerBarProps) {
  const { getToken } = useAuth();
  const { toast } = useToast();

  const addToFavoritesMutation = useMutation({
    mutationFn: async (songData: any) => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const payload = {
        spotifyId: songData.song.spotifyId || songData.song.id,
        title: songData.song.title,
        artists: songData.song.artists,
        cover: songData.song.cover || songData.song.image,
        duration: songData.song.duration,
        preview_url: songData.song.url || songData.song.preview_url,
      };

      const res = await axios.post("/api/favorites", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Added to favorites",
        description: `${variables.song.title} has been saved to your profile.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cannot add to favorites",
        description:
          error.response?.data?.message || "Please log in to save songs.",
        variant: "destructive",
      });
    },
  });

  if (!activeSong) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-white/10 backdrop-blur-xl border-t border-white/10 flex items-center px-4 md:px-8 z-50 justify-between m-1 rounded-sm">
      {/* Mobile Top Progress Bar */}
      <div 
        className={`absolute top-0 left-0 right-0 h-1 bg-white/20 md:hidden w-[99%] ml-0.5 mt-0 rounded-full ${isHost ? "cursor-pointer" : ""}`}
        onClick={handleSeek}
      >
        <div
          className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-100 ease-linear"
          style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
        />
      </div>

      {/* Song Details */}
      <div className="flex items-center min-w-0 flex-1 md:w-1/3 md:flex-none">
        <img
          src={
            activeSong.song.cover ||
            "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=50&h=50&fit=crop&crop=center"
          }
          alt={activeSong.song.title}
          className="w-14 h-14 rounded-md object-cover mr-2 shadow-md shadow-black/20 shrink-0"
        />
        <div className="overflow-hidden min-w-0 w-full mr-2">
          <DoubleMarquee
            text1={activeSong.song.title}
            text2={
              Array.isArray(activeSong.song.artists)
                ? activeSong.song.artists.join(", ")
                : activeSong.song.artist
            }
            className1="text-white font-semibold text-sm"
            className2="text-gray-400 text-xs"
          />
        </div>
      </div>

      {/* Desktop Controls (Middle) */}
      <div className="hidden md:flex flex-col items-center justify-center flex-1 max-w-2xl px-4">
        <div className="flex items-center justify-center gap-4 mb-1">
          {/* Range Loop button */}
          <Button
            variant="ghost"
            size="icon"
            className={`w-8 h-8 transition-all disabled:opacity-30 hover:bg-transparent ${
              isLoopingRange
                ? "text-purple-400 hover:text-purple-400 font-bold"
                : loopStart !== null
                  ? "text-purple-300 hover:text-purple-300"
                  : "text-white/70 hover:text-white"
            }`}
            onClick={() => {
              let nextStart = loopStart;
              let nextEnd = loopEnd;
              let nextActive = isLoopingRange;

              if (!loopStart) {
                // State 1: Set Start
                nextStart = currentTime;
                nextActive = false;
                toast({
                  title: "Point A set",
                  description: "Click again to set Point B",
                });
              } else if (!loopEnd) {
                if (currentTime > loopStart) {
                  // State 2: Set End
                  nextEnd = currentTime;
                  nextActive = true;
                  toast({
                    title: "Loop Range Active",
                    description: "Playing A-B Loop",
                  });
                } else {
                  // Reset if B < A
                  nextStart = currentTime;
                  nextEnd = null;
                  nextActive = false;
                  toast({
                    title: "Point A updated",
                    description: "Click again to set Point B",
                  });
                }
              } else {
                // State 3: Clear
                nextStart = null;
                nextEnd = null;
                nextActive = false;
                toast({ title: "Loop Cleared" });
              }

              onUpdateLoopRange(nextStart, nextEnd, nextActive);
            }}
            disabled={!isHost}
            title={
              isLoopingRange
                ? "Clear A-B Loop"
                : loopStart
                  ? "Set Point B"
                  : "Set Point A"
            }
          >
            <span className="text-[10px] font-mono font-bold border border-current rounded px-1">
              {isLoopingRange ? "A-B" : loopStart ? "A..." : "A-B"}
            </span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-white/70 hover:text-white disabled:opacity-30"
            onClick={handlePrevious}
            disabled={!isHost}
          >
            <SkipBack className="w-5 h-5" fill="currentColor" />
          </Button>

          <Button
            size="icon"
            className="w-10 h-10 rounded-full bg-white text-black hover:bg-gray-200 transition-all flex items-center justify-center disabled:opacity-50 shadow-md shadow-black/20"
            onClick={handlePlayPause}
            disabled={!isHost}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-1" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-white/70 hover:text-white disabled:opacity-30"
            onClick={handleNext}
            disabled={!isHost}
          >
            <SkipForward className="w-5 h-5" fill="currentColor" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={`w-8 h-8 disabled:opacity-30 ${
              isLooping ? "text-purple-400" : "text-white/70 hover:text-white"
            }`}
            onClick={() => onToggleLoop(!isLooping)}
            disabled={!isHost}
          >
            <Repeat className="w-4 h-4" strokeWidth={isLooping ? 2.5 : 1.5} />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center w-full gap-2 px-2 max-w-md">
          <span className="text-[10px] text-gray-400 w-8 text-right tabular-nums">
            {formatTime(currentTime)}
          </span>
          <div
            className={`flex-1 h-1 bg-white/20 rounded-full relative group flex items-center ${isHost ? "cursor-pointer" : "cursor-default"}`}
            onClick={handleSeek}
          >
            <div
              className={`absolute inset-0 rounded-full transition-colors ${isHost ? "hover:bg-white/10" : ""}`}
            ></div>
            {/* Loop Range Indicators */}
            {loopStart !== null && (
              <div
                className="absolute bg-purple-500/50 h-full"
                style={{
                  left: `${(loopStart / (duration || 1)) * 100}%`,
                  width: loopEnd
                    ? `${((loopEnd - loopStart) / (duration || 1)) * 100}%`
                    : "2px",
                }}
              />
            )}
            <div
              className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-100 ease-linear"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-400 w-8 tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Extreme Right Block */}
      <div className="flex items-center gap-2 md:w-1/3 md:justify-end shrink-0 pl-2">
        {/* Mobile only Play/Pause */}
        <Button
          size="icon"
          className="w-10 h-10 rounded-full bg-white text-black hover:bg-gray-200 transition-all flex items-center justify-center disabled:opacity-50 shadow-lg shadow-black/30 md:hidden"
          onClick={handlePlayPause}
          disabled={!isHost}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-1" />
          )}
        </Button>

        {/* Favorite Button (Visible on both Mobile alongside play/pause and Desktop extreme right) */}
        <Button
          variant="ghost"
          size="icon"
          className="hover:text-rose-400 text-white/70 transition-colors rounded-full"
          onClick={() => addToFavoritesMutation.mutate(activeSong)}
          disabled={addToFavoritesMutation.isPending}
          title="Add to Favorites"
        >
          {addToFavoritesMutation.isPending ? (
            <div className="w-6 h-6 border-2 border-t-rose-400 rounded-full animate-spin"></div>
          ) : (
            <div className="bg-white p-3 rounded-full w-10 h-10 shadow-lg shadow-black/30">
              <CirclePlus className="text-black text-lg w-full h-full" />
            </div>
          )}
        </Button>
      </div>
    </div>
  );
}
