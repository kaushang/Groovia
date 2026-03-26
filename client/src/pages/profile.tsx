import { useState } from "react";
import { useUser, useClerk, useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import AnimatedLogo from "@/components/animated-logo";
import { useLocation } from "wouter";
import {
  Loader2,
  Users,
  LogOut,
  Home,
  Plus,
  DoorOpen,
  Settings,
  HelpCircle,
  Info,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ListMusic,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import CreateRoomModal from "@/components/modals/create-room-modal";
import JoinRoomModal from "@/components/modals/join-room-modal";

// Sidebar nav item
function SidebarItem({
  icon: Icon,
  label,
  onClick,
  variant = "default",
  collapsed = false,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
  collapsed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex items-center w-full rounded-xl text-sm font-medium transition-all duration-200 group
        ${collapsed ? "justify-center px-2 py-3" : "gap-3 px-4 py-3"}
        ${
          variant === "danger"
            ? "text-red-400 hover:bg-red-500/15 hover:text-red-300"
            : "text-gray-300 hover:bg-white/10 hover:text-white"
        }`}
    >
      <Icon
        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
          variant === "danger"
            ? "text-red-500"
            : "text-gray-400 group-hover:text-purple-400"
        }`}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isJoinRoomOpen, setIsJoinRoomOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const { data: favoriteSongs, isLoading: isFetchingFavorites } = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await axios.get("/api/favorites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.favorites;
    },
    enabled: !!user,
  });

  const formatTime = (ms: number) => {
    const s = ms / 1000;
    return `${Math.floor(s / 60)}:${Math.floor(s % 60)
      .toString()
      .padStart(2, "0")}`;
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!user) {
    setLocation("/auth");
    return null;
  }

  const handleLogout = async () => {
    await signOut();
    setLocation("/");
  };

  // Full sidebar content (used for mobile overlay — always expanded)
  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex flex-col h-fit w-fit">
      {/* Logo */}
      <div
        className={`flex items-center py-4 mb-2 overflow-hidden ${collapsed ? "justify-center px-2" : "justify-center px-4"}`}
      >
        {collapsed ? (
          <img
            src="/groovia_icon.avif"
            alt="Groovia"
            className="w-8 h-8 animate-spin-slow"
          />
        ) : (
          <AnimatedLogo size="xs" />
        )}
      </div>

      <div className="h-px bg-white/10 mx-3 mb-4" />

      {/* Navigation */}
      <nav className="flex flex-col gap-1 px-2 flex-1">
        {!collapsed && (
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest px-3 mb-1">
            Rooms
          </p>
        )}
        <SidebarItem
          collapsed={collapsed}
          icon={Plus}
          label="Create Room"
          onClick={() => {
            setIsCreateRoomOpen(true);
            setIsMobileSidebarOpen(false);
          }}
        />
        <SidebarItem
          collapsed={collapsed}
          icon={DoorOpen}
          label="Join Room"
          onClick={() => {
            setIsJoinRoomOpen(true);
            setIsMobileSidebarOpen(false);
          }}
        />

        <div className="h-px bg-white/10 mx-2 my-3" />

        {!collapsed && (
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest px-3 mb-1">
            Navigation
          </p>
        )}
        <SidebarItem
          collapsed={collapsed}
          icon={Home}
          label="Home"
          onClick={() => {
            setLocation("/");
            setIsMobileSidebarOpen(false);
          }}
        />
        <SidebarItem
          collapsed={collapsed}
          icon={Users}
          label="Find Friends"
          onClick={() => {}}
        />
        <SidebarItem
          collapsed={collapsed}
          icon={ListMusic}
          label="Playlists"
          onClick={() => {}}
        />

        <div className="h-px bg-white/10 mx-2 my-3" />

        {!collapsed && (
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest px-3 mb-1">
            Account
          </p>
        )}
        <SidebarItem
          collapsed={collapsed}
          icon={Settings}
          label="Settings"
          onClick={() => {}}
        />
        <SidebarItem
          collapsed={collapsed}
          icon={HelpCircle}
          label="Help & Support"
          onClick={() => {}}
        />
        <SidebarItem
          collapsed={collapsed}
          icon={Info}
          label="About Groovia"
          onClick={() => {}}
        />
      </nav>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-1 px-2 pb-4">
        <div className="h-px bg-white/10 mx-2 mb-3" />
        <SidebarItem
          collapsed={collapsed}
          icon={LogOut}
          label="Sign Out"
          onClick={handleLogout}
          variant="danger"
        />
        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setIsSidebarCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`hidden lg:flex items-center mt-2 rounded-xl px-3 py-2.5 text-gray-500 hover:text-white hover:bg-white/10 transition-all duration-200 text-xs font-medium gap-2
            ${collapsed ? "justify-center" : ""}`}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex text-white">
      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 h-screen overflow-y-auto transition-all duration-300 ease-in-out
          ${isSidebarCollapsed ? "w-[68px]" : "w-64"}`}
      >
        <SidebarContent collapsed={isSidebarCollapsed} />
      </aside>

      {/* ── MOBILE SIDEBAR OVERLAY ── */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        >
          <aside
            className="absolute left-0 top-0 h-full w-56 bg-black/60 backdrop-blur-xl border-r border-white/10 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end p-3">
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent collapsed={false} />
          </aside>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 py-5 lg:py-10 px-6 md:px-12 overflow-y-auto">
        {/* Mobile header bar */}
        <div className="flex items-center justify-between mb-4 lg:hidden">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          {/* <span className="text-sm font-semibold text-gray-400">Profile</span>
          <div className="w-9" /> */}
        </div>

        <div className="max-w-4xl mx-auto flex flex-col gap-12">
          {/* ── PROFILE HEADER ── */}
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-5 pb-8 border-b border-white/[0.07]">
            <img
              src={user.imageUrl}
              alt="Profile"
              className="w-[72px] h-[72px] rounded-full object-cover shrink-0"
            />
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-white lg:text-left text-center">
                {user.username ||
                  `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
                  "Groovia User"}
              </h1>
              <div className="flex items-center gap-6 mt-3">
                <span className="text-sm text-white font-medium">
                  {favoriteSongs?.length ?? 0}{" "}
                  <span className="text-gray-500 font-normal">favorites</span>
                </span>
                <span className="text-sm text-white font-medium">
                  0 <span className="text-gray-500 font-normal">friends</span>
                </span>
                <span className="text-sm text-white font-medium">
                  0 <span className="text-gray-500 font-normal">playlists</span>
                </span>
              </div>
            </div>
          </div>

          {/* ── FAVORITE SONGS ── */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-white uppercase tracking-widest">
                Favorite Songs
              </h2>
              {favoriteSongs && favoriteSongs.length > 0 && (
                <span className="text-xs text-gray-600">
                  {favoriteSongs.length} tracks
                </span>
              )}
            </div>

            {isFetchingFavorites ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
              </div>
            ) : favoriteSongs && favoriteSongs.length > 0 ? (
              <div className="flex flex-col">
                {favoriteSongs.map((song: any, index: number) => (
                  <div
                    key={song.id || song._id}
                    className="flex items-center gap-4 py-3 px-2 rounded-lg hover:bg-white/[0.04] transition-colors group -mx-2"
                  >
                    <span className="text-xs text-white-700 w-4 text-right shrink-0">
                      {index + 1}
                    </span>
                    <img
                      src={song.image}
                      alt={song.name}
                      className="w-9 h-9 rounded object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{song.name}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {Array.isArray(song.artists)
                          ? song.artists.join(", ")
                          : song.artists}
                      </p>
                    </div>
                    <span className="text-xs text-gray-600 shrink-0 tabular-nums">
                      {formatTime(song.duration)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <p className="text-sm text-gray-500">No favorites yet</p>
                <p className="text-xs text-gray-600 mt-1">
                  Right-click any song in a room and hit "Add to favorites"
                </p>
              </div>
            )}
          </section>

          {/* ── FRIENDS & PLAYLISTS ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold text-white uppercase tracking-widest">
                  Friends
                </h2>
                <span className="text-xs text-gray-600">0</span>
              </div>
              <div className="py-14 text-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <p className="text-sm text-gray-500">No friends added</p>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold text-white uppercase tracking-widest">
                  Playlists
                </h2>
                <span className="text-xs text-gray-600">0</span>
              </div>
              <div className="py-14 text-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <p className="text-sm text-gray-500">No playlists yet</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Modals */}
      <CreateRoomModal
        isOpen={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
      />
      <JoinRoomModal
        isOpen={isJoinRoomOpen}
        onClose={() => setIsJoinRoomOpen(false)}
      />
    </div>
  );
}
