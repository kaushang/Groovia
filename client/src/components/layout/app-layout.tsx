import { useState } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import AnimatedLogo from "@/components/animated-logo";
import SoloMiniPlayer from "@/components/solo-mini-player";
import {
  Plus,
  DoorOpen,
  Users,
  ListMusic,
  Settings,
  LogOut,
  Menu,
  Home,
  User,
  X,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import CreateRoomModal from "@/components/modals/create-room-modal";
import JoinRoomModal from "@/components/modals/join-room-modal";
import SignOutModal from "@/components/modals/sign-out-modal";

function NavItem({
  icon: Icon,
  label,
  onClick,
  active = false,
  danger = false,
  collapsed = false,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  collapsed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`
        flex items-center w-full rounded-lg text-sm font-medium transition-all duration-150 group
        ${collapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2.5"}
        ${
          danger
            ? "text-red-400 hover:bg-red-500/10 hover:text-red-300"
            : active
              ? "bg-white/10 text-white"
              : "text-gray-400 hover:bg-white/[0.06] hover:text-gray-200"
        }
      `}
    >
      <Icon
        className={`w-4 h-4 shrink-0 transition-colors
          ${danger ? "text-red-500" : active ? "text-purple-400" : "text-gray-500 group-hover:text-gray-300"}`}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
  activePage?: "home" | "profile" | "playlists";
}

export default function AppLayout({ children, activePage }: AppLayoutProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [location, setLocation] = useLocation();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isJoinRoomOpen, setIsJoinRoomOpen] = useState(false);
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    setLocation("/");
  };

  const SidebarInner = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className={`flex items-center ${collapsed ? "justify-center px-2 py-4" : "px-4 py-5"}`}
      >
        {collapsed ? (
          <img
            src="/groovia_icon.avif"
            alt="Groovia"
            className="w-7 h-7 animate-spin-slow"
          />
        ) : (
          <AnimatedLogo size="xs" />
        )}
      </div>

      <div className="h-px bg-white/[0.08] mx-3 mb-3" />

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 px-3 mb-1 mt-1">
            Navigate
          </p>
        )}
        <NavItem
          icon={Home}
          label="Home"
          active={activePage === "home"}
          onClick={() => {
            setLocation("/home");
            setIsSheetOpen(false);
          }}
          collapsed={collapsed}
        />
        <NavItem
          icon={User}
          label="Profile"
          active={activePage === "profile"}
          onClick={() => {
            setLocation("/profile");
            setIsSheetOpen(false);
          }}
          collapsed={collapsed}
        />

        <div className="h-px bg-white/[0.08] mx-2 my-2" />

        {!collapsed && (
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 px-3 mb-1">
            Rooms
          </p>
        )}
        <NavItem
          icon={Plus}
          label="Create Room"
          onClick={() => {
            setIsCreateRoomOpen(true);
            setIsSheetOpen(false);
          }}
          collapsed={collapsed}
        />
        <NavItem
          icon={DoorOpen}
          label="Join Room"
          onClick={() => {
            setIsJoinRoomOpen(true);
            setIsSheetOpen(false);
          }}
          collapsed={collapsed}
        />

        <div className="h-px bg-white/[0.08] mx-2 my-2" />

        {!collapsed && (
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 px-3 mb-1">
            Library
          </p>
        )}
        <NavItem
          icon={ListMusic}
          label="Playlists"
          active={activePage === "playlists"}
          onClick={() => {
            setLocation("/playlists");
            setIsSheetOpen(false);
          }}
          collapsed={collapsed}
        />
        <NavItem
          icon={Users}
          label="Friends"
          onClick={() => {}}
          collapsed={collapsed}
        />
        <NavItem
          icon={Settings}
          label="Settings"
          onClick={() => {}}
          collapsed={collapsed}
        />
      </nav>

      {/* User + Logout */}
      <div className="px-2 pb-4">
        <div className="h-px bg-white/[0.08] mx-2 mb-3" />
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-3 py-2 mb-1 rounded-lg bg-white/[0.04]">
            <img
              src={user.imageUrl}
              alt={user.firstName ?? "user"}
              className="w-7 h-7 rounded-full object-cover shrink-0"
            />
            <span className="text-sm font-medium text-gray-300 truncate">
              {user.username || user.firstName || "You"}
            </span>
          </div>
        )}
        <NavItem
          icon={LogOut}
          label="Sign Out"
          onClick={() => {
            setIsSignOutOpen(true);
            setIsSheetOpen(false);
          }}
          danger
          collapsed={collapsed}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex text-white">
      {/* Mobile sidebar sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent
          side="left"
          className="w-[260px] sm:max-w-md border-r border-white/10 bg-black/60 backdrop-blur-2xl text-white p-0 shadow-2xl"
        >
          <div className="h-full overflow-y-auto">
            <SidebarInner collapsed={false} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-white/[0.07] bg-black/20 backdrop-blur-md h-screen sticky top-0">
        <SidebarInner collapsed={false} />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between px-5 py-4 lg:hidden border-b border-white/[0.06] bg-black/20 backdrop-blur-md sticky top-0 z-30">
          <button
            onClick={() => setIsSheetOpen(true)}
            className="rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </main>
      </div>

      {/* Modals */}
      <CreateRoomModal
        isOpen={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
      />
      <JoinRoomModal
        isOpen={isJoinRoomOpen}
        onClose={() => setIsJoinRoomOpen(false)}
      />
      <SignOutModal
        isOpen={isSignOutOpen}
        onClose={() => setIsSignOutOpen(false)}
        onConfirm={handleLogout}
      />

      {/* Global solo mini player */}
      <SoloMiniPlayer />
    </div>
  );
}
