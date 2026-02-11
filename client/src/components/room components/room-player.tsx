import GlassPanel from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import DoubleMarquee from "@/components/double-marquee";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Music,
  Loader2,
  Plus,
} from "lucide-react";
import YouTube from "react-youtube";
import { toast } from "@/hooks/use-toast";

interface PlayerProps {
  className?: string; // For visibility toggling
  room: any; // Using any for Room object to match existing structure, could be typed
  activeSong: any;
  userId: string | null;
  isHost: boolean;
  youtubeVideoId: string | null;
  playerRef: any;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  handleNext: () => void;
  handlePrevious: () => void;
  handlePlayPause: () => void;
  handleSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  currentTime: number;
  duration: number;
  loopStart: number | null;
  loopEnd: number | null;
  isLooping: boolean;
  isLoopingRange: boolean;
  // Handler functions for loop actions that involve socket emits
  onToggleLoop: (newState: boolean) => void;
  onUpdateLoopRange: (
    start: number | null,
    end: number | null,
    isActive: boolean,
  ) => void;

  // For mobile recommendations
  recommendations: any[];
  addToQueueMutation: any;
  formatTime: (time: number) => string;
}

export default function Player({
  className,
  room,
  activeSong,
  userId,
  isHost,
  youtubeVideoId,
  playerRef,
  isPlaying,
  setIsPlaying,
  handleNext,
  handlePrevious,
  handlePlayPause,
  handleSeek,
  currentTime,
  duration,
  loopStart,
  loopEnd,
  isLooping,
  isLoopingRange,
  onToggleLoop,
  onUpdateLoopRange,
  recommendations,
  addToQueueMutation,
  formatTime,
}: PlayerProps) {
  return (
    <GlassPanel
      className={`p-2 flex-1 h-full min-h-0 lg:h-[80vh] flex flex-col lg:flex-row items-center ${activeSong ? "lg:items-start lg:justify-start" : "lg:items-center lg:justify-center"} text-center ${activeSong ? "lg:text-left" : "lg:text-center"} overflow-hidden ${className}`}
    >
      {/* Left Column: Player */}
      <div
        className={`w-full ${activeSong ? "lg:w-1/2" : "lg:w-3/4"} flex flex-col items-center text-center overflow-y-auto overflow-x-hidden h-full custom-scrollbar pr-1`}
      >
        <h2 className="text-2xl font-bold mb-4 flex items-center text-white justify-center top-0 bg-transparent z-10">
          <Play className="w-6 h-6 mr-3 text-green-400" />
          Now Playing
        </h2>

        {/* Media Area - Fixed container to prevent layout shifts */}
        <div className="w-full mb-2 min-h-fit">
          {activeSong ? (
            youtubeVideoId ? (
              <div className="w-full">
                {room?.createdBy === userId ||
                (typeof room?.createdBy === "object" &&
                  room?.createdBy?._id === userId) ? (
                  <YouTube
                    videoId={youtubeVideoId}
                    opts={{
                      height: "100%",
                      width: "100%",
                      playerVars: {
                        autoplay: 1,
                        controls: 0, // Hide YouTube controls
                      },
                    }}
                    onReady={(e: { target: any }) => {
                      playerRef.current = e.target;
                      e.target.playVideo();
                    }}
                    onStateChange={(e: { data: number }) => {
                      // Sync state with player events (1 = playing, 2 = paused)
                      if (e.data === 1) setIsPlaying(true);
                      if (e.data === 2) setIsPlaying(false);
                    }}
                    onEnd={() => {
                      if (isLooping && playerRef.current) {
                        playerRef.current.seekTo(0);
                        playerRef.current.playVideo();
                      } else {
                        handleNext();
                      }
                    }}
                    className="rounded-xl w-full aspect-video"
                    iframeClassName="rounded-xl w-full h-full"
                  />
                ) : (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden group bg-black/40">
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
              <div className="w-full aspect-video flex items-center justify-center bg-white/5 rounded-xl border border-white/5">
                <div className="flex flex-row items-center ">
                  <img
                    src="/groovia_icon.avif"
                    alt=""
                    className="h-10 w-10 animate-spin-reverse-slow"
                  />
                </div>
              </div>
            )
          ) : (
            <div className="w-full aspect-video flex flex-col items-center justify-center bg-white/5 rounded-xl border border-white/5">
              <Music className="w-16 h-16 text-white/10 mb-4" />
              <p className="text-white/40 font-medium">No songs in queue</p>
            </div>
          )}
        </div>

        {/* Song Details */}
        <div
          className={`w-full flex flex-col px-2 ${activeSong ? "items-start text-left" : "items-center text-center"}`}
        >
          <div className="w-full overflow-hidden relative">
            <DoubleMarquee
              text1={activeSong?.song?.title || "Haven't started grooving yet?"}
              text2={
                activeSong
                  ? Array.isArray(activeSong.song.artists)
                    ? activeSong.song.artists.join(", ")
                    : activeSong.song.artist
                  : ""
              }
              className1={`font-bold text-white ${activeSong ? "text-lg md:text-xl" : "text-md md:text-xl"}`}
              className2="text-xs md:text-base text-purple-300 font-medium"
            />
          </div>
          {activeSong && (
            <p className="text-xs text-white/50 mt-2">
              Added by{" "}
              <span className="text-white/80">
                {activeSong?.username || "Unknown"}
              </span>
            </p>
          )}
        </div>

        {/* Playback Controls & Progress - Always Visible */}
        <div
          className={`w-full bg-white/10 backdrop-blur-xl rounded-[1rem] px-6 py-4 border border-white/10 mt-4 transition-all duration-300 ${!activeSong ? "opacity-40 grayscale pointer-events-none" : ""}`}
        >
          {/* Progress Bar */}
          <div className="flex items-center justify-between text-xs font-mono text-gray-400 mb-4 gap-3">
            <span className="w-10 text-right">{formatTime(currentTime)}</span>
            <div
              className={`flex-1 h-1.5 bg-white/10 rounded-full relative group flex items-center ${isHost ? "cursor-pointer" : "cursor-default"}`}
              onClick={handleSeek}
            >
              <div
                className={`absolute inset-0 rounded-full transition-colors ${isHost ? "hover:bg-white/5" : ""}`}
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
              {loopStart !== null && (
                <div
                  className="absolute h-3 w-0.5 bg-purple-400 top-1/2 -translate-y-1/2"
                  style={{ left: `${(loopStart / (duration || 1)) * 100}%` }}
                />
              )}
              {loopEnd !== null && (
                <div
                  className="absolute h-3 w-0.5 bg-purple-400 top-1/2 -translate-y-1/2"
                  style={{ left: `${(loopEnd / (duration || 1)) * 100}%` }}
                />
              )}

              <div
                className="bg-white h-full rounded-full relative z-10"
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
              >
                {isHost && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity scale-150"></div>
                )}
              </div>
            </div>
            <span className="w-10 text-left">{formatTime(duration)}</span>
          </div>

          {/* Controls */}
          <div className="relative flex items-center justify-center gap-4 w-full px-4">
            {/* A-B Loop Button */}
            <Button
              variant="ghost"
              size="icon"
              className={`absolute left-0 w-12 h-8 transition-all disabled:opacity-30 hover:bg-transparent disabled:cursor-not-allowed ${
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
                    // Reset if B < A (user clicked earlier)
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
              <span className="text-xs font-mono font-bold border border-current rounded px-1">
                {isLoopingRange ? "A-B" : loopStart ? "A..." : "A-B"}
              </span>
            </Button>

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

            <Button
              variant="ghost"
              size="icon"
              className={`w-8 h-8 absolute right-0 transition-all scale-125 transform disabled:opacity-30 hover:bg-transparent disabled:cursor-not-allowed hover:text-white-50 ${
                isLooping
                  ? "text-purple-400 hover:text-purple-400"
                  : "text-white/70"
              }`}
              onClick={() => {
                onToggleLoop(!isLooping);
              }}
              disabled={!isHost}
              title={isLooping ? "Disable Loop" : "Enable Loop"}
            >
              <Repeat className="w-6 h-6" strokeWidth={isLooping ? 2.5 : 1.5} />
            </Button>
          </div>
        </div>

        {/* Mobile Recommendations (Visible only on mobile) */}
        {activeSong && (
          <div className="lg:hidden w-full flex flex-col mt-6 pt-4 border-t border-white/10">
            <h3 className="text-lg font-bold mb-3 text-white text-center flex items-center pl-2">
              Related songs
            </h3>

            <div className="space-y-2 pb-4">
              {!recommendations ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-14 bg-white/5 animate-pulse rounded-lg"
                    ></div>
                  ))}
                </div>
              ) : recommendations.length === 0 ? (
                <div className="text-center text-white/40 py-4">
                  No recommendations found
                </div>
              ) : (
                recommendations.slice(0, 10).map((song: any) => (
                  <div
                    key={`mobile-${song.id}`}
                    className="flex items-center p-2 rounded-sm hover:bg-white/10 transition-all group "
                  >
                    <img
                      src={song.image}
                      alt={song.name}
                      className="w-12 h-12 rounded-sm object-cover mr-2"
                    />
                    <div className="flex-1 min-w-0 mr-2">
                      <DoubleMarquee
                        text1={song.name}
                        text2={
                          Array.isArray(song.artists)
                            ? song.artists.join(", ")
                            : song.artists
                        }
                        className1="font-semibold text-sm text-white text-left"
                        className2="text-gray-400 text-xs text-left"
                      />
                    </div>
                    <div className="text-gray-400 text-xs mr-2">
                      {formatTime(song.duration / 1000)}
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => addToQueueMutation.mutate(song)}
                      disabled={
                        addToQueueMutation.isPending &&
                        addToQueueMutation.variables?.id === song.id
                      }
                      className="h-8 w-8 md:h-10 md:w-10 opacity-100 md:opacity-0 group-hover:opacity-100 hover:bg-purple-600 transition-opacity bg-purple-600 rounded-[50%]"
                    >
                      {addToQueueMutation.isPending &&
                      addToQueueMutation.variables?.id === song.id ? (
                        <Loader2
                          style={{ width: 20, height: 20 }}
                          className="w-6 h-6 text-white animate-spin"
                        />
                      ) : (
                        <Plus className="w-6 h-6 text-white" strokeWidth={4} />
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Recommendations */}
      {activeSong && (
        <div className="hidden lg:flex w-1/2 flex-col h-full overflow-hidden pl-2 border-white/10">
          <h3 className="text-2xl font-bold mb-4 text-white text-center mx-auto px-2 flex items-center pl-2">
            Related songs
          </h3>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-2">
            {!recommendations ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-14 bg-white/5 animate-pulse rounded-lg"
                  ></div>
                ))}
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center text-white/40 py-8">
                No recommendations found
              </div>
            ) : (
              <div className="space-y-2">
                {recommendations.map((song: any) => (
                  <div
                    key={song.id}
                    className="flex items-center p-2 rounded-sm hover:bg-white/10 transition-all group"
                  >
                    <img
                      src={song.image}
                      alt={song.name}
                      className="w-12 h-12 rounded-sm object-cover mr-2"
                    />
                    <div className="flex-1 min-w-0 mr-2">
                      <DoubleMarquee
                        text1={song.name}
                        text2={
                          Array.isArray(song.artists)
                            ? song.artists.join(", ")
                            : song.artists
                        }
                        className1="font-semibold text-sm text-white text-left"
                        className2="text-gray-400 text-xs text-left"
                      />
                    </div>
                    <div className="text-gray-400 text-xs mr-2">
                      {formatTime(song.duration / 1000)}
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => addToQueueMutation.mutate(song)}
                      disabled={
                        addToQueueMutation.isPending &&
                        addToQueueMutation.variables?.id === song.id
                      }
                      className="h-8 w-8 md:h-10 md:w-10 opacity-100 md:opacity-0 group-hover:opacity-100 hover:bg-purple-600 transition-opacity bg-purple-600 rounded-[50%]"
                    >
                      {addToQueueMutation.isPending &&
                      addToQueueMutation.variables?.id === song.id ? (
                        <Loader2
                          style={{ width: 20, height: 20 }}
                          className="w-6 h-6 text-white animate-spin"
                        />
                      ) : (
                        <Plus className="w-6 h-6 text-white" strokeWidth={4} />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </GlassPanel>
  );
}
