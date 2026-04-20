import { useUser, useAuth } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import AppLayout from "@/components/layout/app-layout";
import { Loader2, Heart, Music2, Users } from "lucide-react";

// Derive top artists from the favorites list
function getTopArtists(songs: any[]): { name: string; count: number }[] {
  const counts: Record<string, number> = {};
  songs.forEach((song) => {
    const artists = Array.isArray(song.artists) ? song.artists : [song.artists];
    artists.forEach((a: string) => {
      counts[a] = (counts[a] ?? 0) + 1;
    });
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [, setLocation] = useLocation();

  const { data: favoriteSongs = [], isLoading: isFetchingFavorites } = useQuery({
    queryKey: ["favorite-songs"],
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
  const { data: playlists = [], isLoading: isFetchingPlaylists } = useQuery({
    queryKey: ["playlists"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await axios.get("/api/playlists", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.playlists;
    },
    enabled: !!user,
  });

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!user) {
    setLocation("/auth");
    return null;
  }

  const topArtists = getTopArtists(favoriteSongs);

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  const displayName =
    user.username ||
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
    "Groovia User";

  return (
    <AppLayout activePage="profile">
      <div className="max-w-2xl mx-auto px-5 md:px-10 py-8 pb-32 flex flex-col gap-8">

        {/* ── Profile Header ── */}
        <section className="flex items-center gap-5">
          <div className="relative shrink-0">
            <img
              src={user.imageUrl}
              alt={displayName}
              className="w-20 h-20 rounded-full object-cover ring-2 ring-white/10"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white truncate">{displayName}</h1>
            {user.primaryEmailAddress && (
              <p className="text-sm text-white/70 truncate mt-0.5">
                {user.primaryEmailAddress.emailAddress}
              </p>
            )}
            {joinDate && (
              <p className="text-xs text-white/70 mt-1">Member since {joinDate}</p>
            )}
          </div>
        </section>

        {/* ── Stats Row ── */}
        <section className="grid grid-cols-3 gap-3">
          <StatCard
            icon={Heart}
            label="Favorites"
            value={favoriteSongs.length}
            loading={isFetchingFavorites}
          />
          <StatCard
            icon={Music2}
            label="Playlists"
            value={playlists.length}
            loading={isFetchingPlaylists}
          />
          <StatCard icon={Users} label="Friends" value={0} />
        </section>

        <section className="flex flex-col gap-6">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
              Your Top Artists
            </h2>
            {isFetchingFavorites ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
              </div>
            ) : topArtists.length > 0 ? (
              <div className="flex flex-col gap-1">
                {topArtists.map((artist, index) => (
                  <div
                    key={artist.name}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors"
                  >
                    <span className="text-xs text-gray-600 w-4 text-right shrink-0">
                      {index + 1}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center shrink-0">
                      <Music2 className="w-4 h-4 text-gray-500" />
                    </div>
                    <p className="flex-1 text-sm font-medium text-gray-200 truncate">
                      {artist.name}
                    </p>
                    <span className="text-xs text-gray-600 shrink-0">
                      {artist.count} {artist.count === 1 ? "track" : "tracks"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                message="No top artists yet"
                sub="Songs you favorite will appear here."
              />
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

// ── Sub-components ───────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  loading = false,
}: {
  icon: any;
  label: string;
  value: number;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-4 px-3 rounded-xl bg-white/[0.04] border border-white/[0.07]">
      <Icon className="w-4 h-4 text-gray-500" />
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
      ) : (
        <span className="text-xl font-bold text-white">{value}</span>
      )}
      <span className="text-[11px] text-gray-600 uppercase tracking-wide">{label}</span>
    </div>
  );
}

function EmptyState({ message, sub }: { message: string; sub: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <p className="text-sm text-gray-500">{message}</p>
      <p className="text-xs text-gray-600 max-w-xs leading-relaxed">{sub}</p>
    </div>
  );
}
