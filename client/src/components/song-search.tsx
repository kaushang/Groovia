import { useState, useEffect } from "react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Loader2, Play } from "lucide-react";
import GlassPanel from "@/components/glass-panel";
import DoubleMarquee from "@/components/double-marquee";
import YoutubeVersionsModal from "./room components/youtube-versions-modal";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface SongSearchProps {
  className?: string;
  onAction: (payload: { song: any; youtubeVersion?: any }) => void;
  isActionPending?: (songId: string) => boolean;
  actionIcon?: React.ReactNode;
  actionTitle?: string;
  formatTime: (time: number) => string;
  title?: string;
  hideHeader?: boolean;
  asGlassPanel?: boolean;
}

export default function SongSearch({
  className = "",
  onAction,
  isActionPending = () => false,
  actionIcon = <Play className="w-5 h-5 ml-0.5 text-white" fill="currentColor" />,
  actionTitle = "Play",
  formatTime,
  title = "Search Songs",
  hideHeader = false,
  asGlassPanel = true,
}: SongSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [selectedSongForVersions, setSelectedSongForVersions] = useState<any>(null);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const isMobile = useIsMobile();
  const { getToken } = useAuth();
  const { toast } = useToast();

  const addToFavoritesMutation = useMutation({
    mutationFn: async (song: any) => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      
      const payload = {
        spotifyId: song.id,
        title: song.name,
        artists: song.artists,
        cover: song.image,
        duration: song.duration,
        preview_url: song.preview_url,
      };

      const res = await axios.post("/api/favorites", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Added to favorites ❤️",
        description: `${variables.name} has been saved to your profile.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cannot add to favorites",
        description: error.response?.data?.message || "Please log in to save songs.",
        variant: "destructive",
      });
    },
  });

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

  const handleOpenVersions = (song: any) => {
    setSelectedSongForVersions(song);
    setIsVersionModalOpen(true);
  };

  const handleSelectVersion = (youtubeItem: any) => {
    onAction({
      song: selectedSongForVersions,
      youtubeVersion: youtubeItem,
    });
    setIsVersionModalOpen(false);
  };

  const Container = asGlassPanel ? GlassPanel : "div";
  const containerClasses = asGlassPanel 
    ? `p-2 flex-1 h-full min-h-0 lg:h-[80vh] flex flex-col ${className}`
    : `flex flex-col w-full ${className}`;

  return (
    <Container className={containerClasses}>
      {!hideHeader && (
        <h2 className="text-2xl font-bold mb-4 flex items-center justify-center text-white">
          <Search className="w-6 h-6 mr-3 text-purple-300" />
          {title}
        </h2>
      )}

      <div className="relative space-y-2 mb-4">
        <Input
          type="text"
          placeholder="Search for songs, artists, albums..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-3 bg-white/10 border-white/20 text-white placeholder:text-gray-300 focus:ring-2 focus:ring-purple-400 h-11 rounded-xl"
          data-testid="input-search-songs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/3 -translate-y-1/2 text-white hover:text-white/60 transition-colors"
            title="Clear search"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Results */}
      <div className="space-y-1 flex-1 overflow-y-auto custom-scrollbar">
        {isSearching || (searchQuery !== debouncedQuery && searchQuery.length > 0) ? (
          <div className="flex justify-center items-center py-12">
            <img
              src="/groovia_icon.avif"
              alt=""
              className="w-10 h-10 animate-spin-reverse-slow"
            />
          </div>
        ) : searchResults.length > 0 ? (
          <>
            {searchResults.map((song: any) => (
              <SongItem
                key={song.id}
                song={song}
                isMobile={isMobile}
                handleOpenVersions={handleOpenVersions}
                onAction={onAction}
                isActionPending={isActionPending(song.id)}
                actionIcon={actionIcon}
                actionTitle={actionTitle}
                addToFavoritesMutation={addToFavoritesMutation}
                formatTime={formatTime}
              />
            ))}

            {hasNextPage && (
              <div
                onClick={() => fetchNextPage()}
                className="text-center py-3 mx-auto cursor-pointer text-sm transition-colors border-t border-white/10 mt-2 hover:bg-white/[0.02]"
              >
                {isFetchingNextPage ? (
                  <div className="flex items-center justify-center gap-2">
                    <img
                      src="/groovia_icon.avif"
                      alt=""
                      className="w-4 h-4 animate-spin-reverse-slow"
                    />
                    <span className="text-sm text-white/80">Loading more...</span>
                  </div>
                ) : (
                  <span className="text-white/80 text-sm hover:text-white">Show more results</span>
                )}
              </div>
            )}
          </>
        ) : debouncedQuery.length > 0 ? (
          <div className="h-full flex items-center justify-center min-h-[200px]">
            <p className="text-gray-400">No results found for "{debouncedQuery}"</p>
          </div>
        ) : (
          !asGlassPanel && (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center mb-2">
                <Search className="w-6 h-6 text-gray-600" />
              </div>
              <p className="text-base font-medium text-gray-400">Search for a song to play</p>
              <p className="text-sm text-gray-600 max-w-xs">
                Find any track, artist, or album.
              </p>
            </div>
          )
        )}
      </div>

      <YoutubeVersionsModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        song={selectedSongForVersions}
        onSelect={handleSelectVersion}
        formatTime={formatTime}
      />
    </Container>
  );
}

function SongItem({
  song,
  isMobile,
  handleOpenVersions,
  onAction,
  isActionPending,
  actionIcon,
  actionTitle,
  addToFavoritesMutation,
  formatTime,
}: {
  song: any;
  isMobile: boolean;
  handleOpenVersions: (song: any) => void;
  onAction: (payload: { song: any; youtubeVersion?: any }) => void;
  isActionPending: boolean;
  actionIcon: React.ReactNode;
  actionTitle: string;
  addToFavoritesMutation: any;
  formatTime: (time: number) => string;
}) {
  return (
    <div
      className="flex items-center p-2 rounded-lg hover:bg-white/10 transition-all group cursor-default outline-none"
      data-testid={`search-result-${song.id}`}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex flex-1 items-center min-w-0 mr-2">
            <img
              src={song.image}
              alt={`${song.name} artwork`}
              className="w-12 h-12 rounded-sm object-cover mr-2 shrink-0"
            />
            <div className="flex-1 min-w-0 mr-2">
              <DoubleMarquee
                text1={song.name}
                text2={Array.isArray(song.artists) ? song.artists.join(", ") : song.artists}
                className1="font-semibold text-sm text-white"
                className2="text-gray-400 text-xs"
              />
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="bg-black/60 backdrop-blur-xl border-white/10 text-white min-w-[160px]">
          <ContextMenuItem
            onClick={() => handleOpenVersions(song)}
            className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
          >
            Find different versions
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => addToFavoritesMutation.mutate(song)}
            className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white text-rose-400 focus:text-rose-300"
          >
            Add to favorites
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <div className="text-gray-400 text-xs mr-3 tabular-nums shrink-0">
        {formatTime(song.duration / 1000)}
      </div>
      <div className="flex items-center opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onAction({ song });
          }}
          onPointerDown={(e) => e.stopPropagation()}
          disabled={isActionPending}
          className="h-9 w-9 hover:bg-purple-500 transition-opacity bg-purple-600 rounded-full flex items-center justify-center p-0"
          data-testid={`button-action-song-${song.id}`}
          title={actionTitle}
        >
          {isActionPending ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : (
            actionIcon
          )}
        </Button>
      </div>
    </div>
  );
}
