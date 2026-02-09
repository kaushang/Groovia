import { useState } from "react";
import GlassPanel from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import DoubleMarquee from "@/components/double-marquee";
import {
  Repeat,
  ChevronUp,
  ChevronDown,
  Trash2,
  History,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface QueueListProps {
  className?: string; // For visibility toggling
  room: any; // Room object
  userId: string | null;
  isLooping: boolean;
  voteMutation: any;
  deleteSongMutation: any;
  addToQueueMutation: any;
}

export default function QueueList({
  className,
  room,
  userId,
  isLooping,
  voteMutation,
  deleteSongMutation,
  addToQueueMutation,
}: QueueListProps) {
  const [activeQueueTab, setActiveQueueTab] = useState<"up-next" | "history">(
    "up-next",
  );
  const [slideDirection, setSlideDirection] = useState(0); // -1 for left, 1 for right

  return (
    <GlassPanel
      className={`p-2 flex-1 h-full min-h-0 lg:h-[80vh] flex items-center flex-col ${className}`}
    >
      <div className="flex items-center justify-center w-full mb-4">
        <div className="relative flex w-full">
          {/* Sliding underline */}
          <motion.span
            className="absolute bottom-0 left-0 h-[2px] w-1/2 bg-white"
            animate={{ x: activeQueueTab === "up-next" ? "0%" : "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />

          <button
            onClick={() => {
              setSlideDirection(-1);
              setActiveQueueTab("up-next");
            }}
            className={`w-1/2 py-2 text-md font-medium transition-colors ${
              activeQueueTab === "up-next"
                ? "text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Up Next
          </button>

          <button
            onClick={() => {
              setSlideDirection(1);
              setActiveQueueTab("history");
            }}
            className={`w-1/2 py-2 text-md font-medium transition-colors ${
              activeQueueTab === "history"
                ? "text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Previously Played
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto custom-scrollbar w-full overflow-x-hidden">
        <AnimatePresence
          mode="popLayout"
          initial={false}
          custom={slideDirection}
        >
          <motion.div
            key={activeQueueTab}
            custom={slideDirection}
            variants={{
              enter: (direction: number) => ({
                x: direction > 0 ? 300 : -300,
                opacity: 0,
              }),
              center: {
                zIndex: 1,
                x: 0,
                opacity: 1,
              },
              exit: (direction: number) => ({
                zIndex: 0,
                x: direction < 0 ? 300 : -300,
                opacity: 0,
              }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="w-full flex flex-col space-y-2 lg:space-y-2 h-full"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = offset.x; // > 0 right, < 0 left

              if (swipe < -50 && activeQueueTab === "up-next") {
                setSlideDirection(1);
                setActiveQueueTab("history");
              } else if (swipe > 50 && activeQueueTab === "history") {
                setSlideDirection(-1);
                setActiveQueueTab("up-next");
              }
            }}
          >
            {activeQueueTab === "up-next" ? (
              // Up Next List
              (room?.queueItems || [])
                // .filter removed to include all items
                .sort((a: any, b: any) => {
                  // Keep currently playing song at the top
                  if (a.isPlaying) return -1;
                  if (b.isPlaying) return 1;

                  const scoreA = (a.upvotes || 0) - (a.downvotes || 0);
                  const scoreB = (b.upvotes || 0) - (b.downvotes || 0);

                  if (scoreA !== scoreB) {
                    return scoreB - scoreA; // Descending order of votes
                  }

                  // Tie-breaker: First Voted/Added First Served (Earlier is better)
                  const getTime = (item: any) => {
                    if (item.lastVotedAt)
                      return new Date(item.lastVotedAt).getTime();
                    if (item.addedAt) return new Date(item.addedAt).getTime();
                    // Fallback to _id creation time (first 8 hex chars = seconds timestamp)
                    const id = (item._id || item.id || "").toString();
                    try {
                      return parseInt(id.substring(0, 8), 16) * 1000;
                    } catch (e) {
                      return Date.now();
                    }
                  };

                  return getTime(a) - getTime(b);
                })
                .map((item: any, index: any) => {
                  const userVote = item.voters?.find(
                    (v: any) => v.userId === userId,
                  )?.voteType;

                  return (
                    <motion.div
                      // layout
                      // initial={{ opacity: 0, y: 20 }}
                      key={item._id || item.id}
                      className={`flex items-center p-2 mr-1 rounded-lg hover:bg-white/10 transition-all group bg-black/20 ${item.isPlaying ? "bg-green-500/15 hover:bg-green-500/15 border border-green-500" : ""}`}
                    >
                      <div className="flex flex-col items-center justify-center mr-1 w-4">
                        <div className="text-gray-200 text-xs text-center w-full">
                          {index + 1}
                        </div>
                        {item.isPlaying && isLooping && (
                          <Repeat className="w-3 h-3 text-green-300 mb-0.5" />
                        )}
                      </div>
                      <img
                        src={
                          item.song?.cover ||
                          "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=50&h=50&fit=crop&crop=center"
                        }
                        alt={`${item.song?.title || "Song"} artwork`}
                        className="w-12 h-12 rounded-sm object-cover mr-2"
                      />
                      <div className="flex-1 min-w-0 overflow-hidden grid grid-cols-1">
                        <DoubleMarquee
                          text1={item.song?.title || "Unknown Title"}
                          text2={item.song?.artist || "Unknown Artist"}
                          className1="font-medium text-xs md:text-sm text-white"
                          className2="font-medium text-xs md:text-xs text-gray-400"
                        />
                        <p className="text-white/60 text-[11px] text-xs flex items-center">
                          <span>
                            By <span>{item?.username || "Unknown"}</span>
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center ml-1 h-full">
                        <div className="flex flex-col items-center justify-center mr-1 gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={
                              voteMutation.isPending &&
                              voteMutation.variables?.queueItemId ===
                                (item._id || item.id)
                            }
                            onClick={() =>
                              voteMutation.mutate({
                                queueItemId: item._id || item.id,
                                voteType: "up",
                              })
                            }
                            className={`transition-colors h-[50%] h-6 p-2 flex items-center ${
                              userVote === "up"
                                ? "text-green-400 bg-green-400/10 hover:bg-green-400/10 hover:text-green-400 disabled:opacity-100"
                                : "text-gray-400 hover:text-green-400 hover:bg-white/10"
                            }`}
                          >
                            <ChevronUp className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="ml-[2px] text-[10px] md:text-xs">
                              {item.upvotes ?? 0}
                            </span>
                          </Button>
                          {/* Downvote */}
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={
                              voteMutation.isPending &&
                              voteMutation.variables?.queueItemId ===
                                (item._id || item.id)
                            }
                            onClick={() =>
                              voteMutation.mutate({
                                queueItemId: item._id || item.id,
                                voteType: "down",
                              })
                            }
                            className={`transition-colors h-[50%] h-6 p-2 flex items-center ${
                              userVote === "down"
                                ? "text-red-400 bg-red-400/10 hover:bg-red-400/10 hover:text-red-400 disabled:opacity-100"
                                : "text-gray-400 hover:text-red-400 hover:bg-white/10"
                            }`}
                          >
                            <ChevronDown className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="ml-[2px] text-[10px] md:text-xs">
                              {item.downvotes ?? 0}
                            </span>
                          </Button>
                        </div>

                        {item.addedBy === userId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSongMutation.mutate(item._id)}
                            className="h-full w-8 text-gray-400 hover:text-red-400 hover:bg-red-400/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })
            ) : 
            // History List
            room?.history && room.history.length > 0 ? (
              [...room.history].reverse().map((item: any, index: any) => (
                <div
                  key={item._id || index}
                  className="flex items-center p-2 mr-1 rounded-lg hover:bg-white/10 transition-all group bg-black/20"
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
                    className="w-12 h-12 rounded-sm object-cover mr-3 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                  />
                  <div className="flex-1 min-w-0 overflow-hidden grid grid-cols-1">
                    <DoubleMarquee
                      text1={item.song?.title || "Unknown Title"}
                      text2={item.song?.artist || "Unknown Artist"}
                      className1="font-medium text-xs md:text-sm text-white/70 group-hover:text-white"
                      className2="font-medium text-xs md:text-xs text-gray-400"
                    />
                    <p className="text-white/40 text-[10px] mt-0.5">
                      Played at{" "}
                      {new Date(item.playedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-1 h-8 w-8 text-gray-400 hover:text-purple-400 hover:bg-purple-400/10 md:opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Play Again"
                    disabled={
                      addToQueueMutation.isPending &&
                      addToQueueMutation.variables?.id === item.song.spotifyId
                    }
                    onClick={() =>
                      addToQueueMutation.mutate({
                        id: item.song.spotifyId,
                        name: item.song.title,
                        artists: [item.song.artist], // API expects array
                        image: item.song.cover,
                        duration: item.song.duration,
                        preview_url: item.song.url,
                      })
                    }
                  >
                    {addToQueueMutation.isPending &&
                    addToQueueMutation.variables?.id === item.song.spotifyId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center text-gray-400 bg-white/5 rounded-lg m-2">
                <History className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No songs played yet</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </GlassPanel>
  );
}
