import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward, Repeat } from "lucide-react";
import DoubleMarquee from "@/components/double-marquee";

interface MiniPlayerBarProps {
  activeSong: any;
  isPlaying: boolean;
  isHost: boolean;
  isLooping: boolean;
  currentTime: number;
  duration: number;
  handlePlayPause: () => void;
  handleNext: () => void;
  handlePrevious: () => void;
  onToggleLoop: (newState: boolean) => void;
  formatTime: (time: number) => string;
}

export default function MiniPlayerBar({
  activeSong,
  isPlaying,
  isHost,
  isLooping,
  currentTime,
  duration,
  handlePlayPause,
  handleNext,
  handlePrevious,
  onToggleLoop,
  formatTime,
}: MiniPlayerBarProps) {
  if (!activeSong) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-white/10 backdrop-blur-xl border-t border-white/10 flex items-center px-4 md:px-8 z-50 justify-between">
      {/* Song Details */}
      <div className="flex items-center min-w-0 flex-1">
        <img
          src={activeSong.song.cover || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=50&h=50&fit=crop&crop=center"}
          alt={activeSong.song.title}
          className="w-14 h-14 rounded-md object-cover mr-2 shadow-md shadow-black/20"
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

      {/* Controls */}
      <div className="flex-shrink-0 pl-4">
        <Button
          size="icon"
          className="w-12 h-12 rounded-full bg-white text-black hover:bg-gray-200 transition-all flex items-center justify-center disabled:opacity-50 shadow-lg shadow-black/30"
          onClick={handlePlayPause}
          disabled={!isHost}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 fill-current" />
          ) : (
            <Play className="w-6 h-6 fill-current ml-1" />
          )}
        </Button>
      </div>
    </div>
  );
}
