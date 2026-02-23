import { useState, useEffect } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Music2, Youtube, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface YoutubeVersionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: any;
  onSelect: (youtubeItem: any) => void;
  formatTime: (time: number) => string;
}

export default function YoutubeVersionsModal({
  isOpen,
  onClose,
  song,
  onSelect,
  formatTime,
}: YoutubeVersionsModalProps) {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && song) {
      searchVersions();
    }
  }, [isOpen, song]);

  const searchVersions = async () => {
    setIsLoading(true);
    try {
      const artistName = Array.isArray(song.artists)
        ? song.artists.join(" ")
        : song.artists;
      const query = `${song.name} ${artistName}`;
      const res = await axios.get("/api/youtube/search", {
        params: { q: query },
      });
      setItems(res.data.items);
    } catch (error) {
      console.error("Failed to fetch versions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!song) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-2xl bg-transparent bg-white/5 backdrop-blur-2xl border-white/10 text-white p-0 overflow-hidden shadow-2xl rounded-2xl">
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              Select Alternative Version
            </DialogTitle>
          </DialogHeader>

          {/* Original Song Context */}
          <div className="flex items-center sm:flex-col gap-4 sm:gap-3">
            <div className="relative flex-shrink-0">
              <img
                src={song.image}
                alt={song.name}
                className="w-20 h-20 sm:w-32 sm:h-32 rounded-lg object-cover shadow-2xl"
              />
              <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/10" />
            </div>
            <div className="flex-1 min-w-0 sm:text-center">
              <h3 className="text-base sm:text-lg font-bold truncate text-white">
                {song.name}
              </h3>
              <p className="text-white/70 text-xs sm:text-sm truncate font-medium">
                {Array.isArray(song.artists)
                  ? song.artists.join(", ")
                  : song.artists}
              </p>
            </div>
          </div>

          {/* Version List */}
          <div className="space-y-2 max-h-[60vh] sm:max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-500/30 blur-xl rounded-full animate-pulse" />
                  <Loader2 className="w-10 h-10 text-purple-400 animate-spin relative" />
                </div>
                <p className="text-gray-400 text-sm animate-pulse font-medium">
                  Scanning YouTube for versions...
                </p>
              </div>
            ) : items.length > 0 ? (
              items.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center gap-3 sm:gap-4 p-2 rounded-xl hover:bg-white/10 transition-all  cursor-pointer bg-white/[0.02]"
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-24 sm:w-32 aspect-video rounded-lg object-cover shadow-lg"
                    />
                    <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-lg border border-white/10">
                      {formatTime(item.duration / 1000)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-xs sm:text-sm line-clamp-2 leading-snug text-white/90 group-hover:text-white transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-1 font-medium truncate">
                      {item.channelTitle}
                    </p>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full bg-purple-600/80 hover:bg-purple-600/80 hover:text-white transition-all h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 lg:opacity-0 lg:group-hover:opacity-100"
                    onClick={() => onSelect(item)}
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={3} />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Youtube className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-gray-500 text-sm px-8">
                  No alternative versions found on YouTube for this track.
                </p>
              </div>
            )}
          </div>
          {!isLoading && items.length > 0 && (
            <p className="text-[10px] sm:text-xs text-gray-500 mt-2 font-medium text-center">
              These are the search results from YouTube search. Results may not
              be accurate.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
