import { useState, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Loader2, Plus } from "lucide-react";
import GlassPanel from "@/components/glass-panel";
import DoubleMarquee from "@/components/double-marquee";

interface SongSearchProps {
  className?: string;
  addToQueueMutation: any;
  formatTime: (time: number) => string;
}

export default function SongSearch({
  className,
  addToQueueMutation,
  formatTime,
}: SongSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data,
    isLoading: isSearching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["/search", { q: debouncedQuery }],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await axios.get<any>("/search", {
        params: { q: debouncedQuery, offset: pageParam },
      });
      return res.data.tracks;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 10 ? allPages.length * 10 : undefined;
    },
    enabled: debouncedQuery.length > 0,
    initialPageParam: 0,
  });

  const searchResults = data?.pages.flat() || [];

  return (
    <GlassPanel
      className={`p-2 flex-1 h-full min-h-0 lg:h-[80vh] flex flex-col ${className}`}
    >
      <h2 className="text-2xl font-bold mb-4 flex items-center justify-center text-white">
        <Search className="w-6 h-6 mr-3 text-purple-300" />
        Add Songs
      </h2>

      <div className="relative space-y-2 mb-4">
        <Input
          type="text"
          placeholder="Search for songs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-2 bg-white/10 border-white/20 text-white placeholder:text-gray-300 focus:ring-2 focus:ring-purple-400"
          data-testid="input-search-songs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-4 text-white hover:text-white/60 transition-colors"
            title="Clear search"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Results */}
      <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
        {isSearching ||
        (searchQuery !== debouncedQuery && searchQuery.length > 0) ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 py-1">
              <img
                src="/groovia_icon.png"
                alt=""
                className="w-10 h-10 animate-spin-reverse-slow"
              />
            </div>
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
                    text2={
                      Array.isArray(song.artists)
                        ? song.artists.join(", ")
                        : song.artists
                    }
                    className1="font-semibold text-sm text-white"
                    className2="text-gray-400 text-xs"
                  />
                </div>
                <div className="text-gray-400 text-xs mr-2">
                  {formatTime(song.duration / 1000)}
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    addToQueueMutation.mutate(song);
                  }}
                  disabled={
                    addToQueueMutation.isPending &&
                    addToQueueMutation.variables?.id === song.id
                  }
                  className="h-8 w-8 md:h-10 md:w-10 md:opacity-0 opacity-1 group-hover:opacity-100 hover:bg-purple transition-opacity bg-purple-600 rounded-[50%]"
                  data-testid={`button-add-song-${song.id}`}
                >
                  {addToQueueMutation.isPending &&
                  addToQueueMutation.variables?.id === song.id ? (
                    <Loader2
                      style={{ width: 20, height: 20 }}
                      className="text-white animate-spin"
                    />
                  ) : (
                    <Plus className="w-6 h-6 text-white" strokeWidth={4} />
                  )}
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
                    <img
                      src="/groovia_icon.png"
                      alt=""
                      className="w-4 h-4 animate-spin-reverse-slow"
                    />
                    <span className="text-sm text-white/80">
                      Loading more...
                    </span>
                  </div>
                ) : (
                  <span className="text-white/80 text-sm underline">
                    more results
                  </span>
                )}
              </div>
            )}
          </>
        ) : debouncedQuery.length > 0 ? (
          <div className="h-full flex items-center justify-center min-h-[200px]">
            <p className="text-gray-400">No results found</p>
          </div>
        ) : null}
      </div>
    </GlassPanel>
  );
}
