import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
} from "react";
import YouTube from "react-youtube";

export interface SoloSong {
  youtubeId: string;
  title: string;
  artists: string | string[];
  cover: string;
  duration: number; // seconds
  spotifyId?: string;
}

interface GlobalPlayerContextType {
  currentSong: SoloSong | null;
  queue: SoloSong[];
  isPlaying: boolean;
  isLooping: boolean;
  currentTime: number;
  duration: number;
  /** Set when user is actively inside a room page. null when not in a room. */
  activeRoomId: string | null;
  setActiveRoomId: (id: string | null) => void;
  playSong: (song: SoloSong) => void;
  addToQueue: (song: SoloSong) => void;
  togglePlayPause: () => void;
  toggleLoop: () => void;
  skip: () => void;
  seek: (seconds: number) => void;
  clearPlayer: () => void;
}

const GlobalPlayerContext = createContext<GlobalPlayerContextType | null>(null);

export function useGlobalPlayer() {
  const context = useContext(GlobalPlayerContext);
  if (!context) {
    throw new Error("useGlobalPlayer must be used within a GlobalPlayerProvider");
  }
  return context;
}

export function GlobalPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<SoloSong | null>(null);
  const [queue, setQueue] = useState<SoloSong[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const playerRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // Use a ref for isLooping so onStateChange closure always sees latest value
  const isLoopingRef = useRef(false);

  const startProgressTracking = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      if (playerRef.current) {
        try {
          const t = await playerRef.current.getCurrentTime();
          setCurrentTime(t);
        } catch (_) {}
      }
    }, 500);
  }, []);

  const stopProgressTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const playSong = useCallback(
    (song: SoloSong) => {
      setCurrentSong(song);
      setCurrentTime(0);
      setDuration(song.duration || 0);
      setIsPlaying(true);
      startProgressTracking();
    },
    [startProgressTracking]
  );

  const addToQueue = useCallback(
    (song: SoloSong) => {
      if (!currentSong) {
        playSong(song);
      } else {
        setQueue((prev) => [...prev, song]);
      }
    },
    [currentSong, playSong]
  );

  const skip = useCallback(() => {
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      setQueue(rest);
      playSong(next);
    } else {
      setCurrentSong(null);
      setIsPlaying(false);
      setCurrentTime(0);
      stopProgressTracking();
    }
  }, [queue, playSong, stopProgressTracking]);

  const togglePlayPause = useCallback(() => {
    if (!playerRef.current || !currentSong) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
      stopProgressTracking();
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
      startProgressTracking();
    }
  }, [isPlaying, currentSong, startProgressTracking, stopProgressTracking]);

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => {
      isLoopingRef.current = !prev;
      return !prev;
    });
  }, []);

  const seek = useCallback((seconds: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds, true);
      setCurrentTime(seconds);
    }
  }, []);

  const clearPlayer = useCallback(() => {
    setCurrentSong(null);
    setQueue([]);
    setIsPlaying(false);
    setCurrentTime(0);
    isLoopingRef.current = false;
    stopProgressTracking();
  }, [stopProgressTracking]);

  return (
    <GlobalPlayerContext.Provider
      value={{
        currentSong,
        queue,
        isPlaying,
        isLooping,
        currentTime,
        duration,
        activeRoomId,
        setActiveRoomId,
        playSong,
        addToQueue,
        togglePlayPause,
        toggleLoop,
        skip,
        seek,
        clearPlayer,
      }}
    >
      {children}

      {/* Hidden audio engine */}
      {currentSong && (
        <div
          style={{
            position: "fixed",
            bottom: "-9999px",
            left: "-9999px",
            width: 0,
            height: 0,
            overflow: "hidden",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          <YouTube
            key={currentSong.youtubeId}
            videoId={currentSong.youtubeId}
            opts={{
              width: "1",
              height: "1",
              playerVars: {
                autoplay: 1,
                controls: 0,
                rel: 0,
                modestbranding: 1,
              },
            }}
            onReady={(e: any) => {
              playerRef.current = e.target;
              const dur = e.target.getDuration();
              if (dur) setDuration(dur);
              e.target.playVideo();
              startProgressTracking();
            }}
            onStateChange={(e: any) => {
              // 0 = ended
              if (e.data === 0) {
                if (isLoopingRef.current && playerRef.current) {
                  // restart current song
                  playerRef.current.seekTo(0, true);
                  playerRef.current.playVideo();
                  setCurrentTime(0);
                } else {
                  skip();
                }
              }
            }}
          />
        </div>
      )}
    </GlobalPlayerContext.Provider>
  );
}
