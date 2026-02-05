import { Search, Play, Music } from "lucide-react";

interface MobileNavigationProps {
  activeTab: "search" | "player" | "queue";
  setActiveTab: (tab: "search" | "player" | "queue") => void;
}

export default function MobileNavigation({
  activeTab,
  setActiveTab,
}: MobileNavigationProps) {
  return (
    <div className="lg:hidden shrink-0 h-14 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl mt-1 flex items-center justify-around shadow-2xl safe-pb w-full">
      <button
        onClick={() => setActiveTab("search")}
        className={`relative flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${
          activeTab === "search"
            ? "text-purple-400 scale-110"
            : "text-gray-400 hover:text-white"
        }`}
      >
        <Search
          className="w-6 h-6 mb-1"
          strokeWidth={activeTab === "search" ? 2.5 : 2}
        />
        <span className="text-[10px] font-medium tracking-wide">Add Songs</span>
        {activeTab === "search" && (
          <span className="absolute -bottom-1 w-1 h-1 bg-purple-400 rounded-full" />
        )}
      </button>

      <button
        onClick={() => setActiveTab("player")}
        className={`relative flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${
          activeTab === "player"
            ? "text-green-400 scale-100"
            : "text-gray-400 hover:text-white"
        }`}
      >
        <div
          className={`p-3 rounded-full transition-all ${activeTab === "player" ? "bg-green-300/20" : ""}`}
        >
          <Play
            className={`w-6 h-6 ${activeTab === "player" ? "fill-current" : ""}`}
            strokeWidth={activeTab === "player" ? 2.5 : 2}
          />
        </div>
      </button>

      <button
        onClick={() => setActiveTab("queue")}
        className={`relative flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${
          activeTab === "queue"
            ? "text-blue-400 scale-110"
            : "text-gray-400 hover:text-white"
        }`}
      >
        <Music
          className="w-6 h-6 mb-1"
          strokeWidth={activeTab === "queue" ? 2.5 : 2}
        />
        <span className="text-[10px] font-medium tracking-wide">Queue</span>
        {activeTab === "queue" && (
          <span className="absolute -bottom-1 w-1 h-1 bg-blue-400 rounded-full" />
        )}
      </button>
    </div>
  );
}
