import {
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu";
import { HeartOff } from "lucide-react";

type SongLike = {
  id: string;
  name: string;
  artists?: string[] | string;
  image?: string;
  duration?: number;
  preview_url?: string;
};

interface SongContextMenuContentProps {
  song: SongLike;
  onFindVersions?: (song: SongLike) => void;
  onAddToPlaylist?: (song: SongLike) => void;
  onAddToFavorites?: (song: SongLike) => void;
  onUnfavorite?: (song: SongLike) => void;
}

export default function SongContextMenuContent({
  song,
  onFindVersions,
  onAddToPlaylist,
  onAddToFavorites,
  onUnfavorite,
}: SongContextMenuContentProps) {
  return (
    <ContextMenuContent className="bg-black/60 backdrop-blur-xl border-white/10 text-white min-w-[180px]">
      {onFindVersions && (
        <ContextMenuItem
          onClick={() => onFindVersions(song)}
          className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
        >
          Find different versions
        </ContextMenuItem>
      )}
      {onAddToPlaylist && (
        <ContextMenuItem
          onClick={() => onAddToPlaylist(song)}
          className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
        >
          Add to playlist
        </ContextMenuItem>
      )}
      {onAddToFavorites && (
        <ContextMenuItem
          onClick={() => onAddToFavorites(song)}
          className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white text-rose-400 focus:text-rose-300"
        >
          Add to favorites
        </ContextMenuItem>
      )}
      {onUnfavorite && (
        <ContextMenuItem
          onClick={() => onUnfavorite(song)}
          className="cursor-pointer text-rose-400 hover:bg-white/10 focus:bg-white/10 focus:text-rose-300"
        >
          <HeartOff className="w-4 h-4 mr-2" />
          Unfavorite
        </ContextMenuItem>
      )}
    </ContextMenuContent>
  );
}

