import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Users, Vote, Share, Music } from "lucide-react";
import JoinRoomModal from "@/components/join-room-modal";
import CreateRoomModal from "@/components/create-room-modal";
import GlassPanel from "@/components/glass-panel";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FaPlus } from "react-icons/fa";
import { BiDoorOpen } from "react-icons/bi";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast } = useToast();

  const createRoomMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/rooms", {
        name: "My Music Room",
        createdBy: "demo-user", // In real app, use actual user ID
      }),
    onSuccess: async (response) => {
      const room = await response.json();
      toast({
        title: "Room created!",
        description: `Room code: ${room.code}`,
      });
      setLocation(`/room/${room.id}`);
    },
    onError: () => {
      toast({
        title: "Failed to create room",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const createRoom = () => {
    createRoomMutation.mutate();
  };

  const features = [
    {
      icon: Vote,
      title: "Democratic Queue",
      description: "Vote on songs to shape the perfect playlist",
      color: "text-blue-300",
    },
    {
      icon: Users,
      title: "Real-time Collaboration",
      description: "Listen together with friends in synchronized rooms",
      color: "text-purple-300",
    },
    {
      icon: Music,
      title: "Vast Music Library",
      description: "Access Spotify's rich metadata to search and play any song you want",
      color: "text-green-400",
    },
    {
      icon: Share,
      title: "Easy Sharing",
      description: "Share rooms with links and unique codes",
      color: "text-cyan-300",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col py-12 md:justify-center items-center w-full">
      <div className="text-center max-w-8xl mx-auto w-full">
        {/* Hero Logo and Animation */}
        <div className="md:h-fit mb-12 md:max-w-[500px] flex items-center flex-col justify-center mx-auto">
          <div >
            <h2 className="text-md md:text-3xl -mb-4 md:-mb-6 font-light text-gray-200 animate-pulse-soft px-2 text-left">
              Because music
            </h2>
            <div className="relative w-full max-w-[300px] sm:max-w-[400px] md:max-w-[500px] mx-auto">
              <img
                src="/groovia_logo.png"
                alt="Groovia"
                className="w-full h-auto select-none pointer-events-none"
              />
              {/* First icon - right to R */}
              <div className="absolute w-[16%] top-[50%] -translate-y-1/2 left-[31%] rotate-[40deg]">
                <img
                  src="/groovia_icon.png"
                  alt=""
                  className="w-full animate-spin-reverse-slow"
                />
              </div>
              {/* Second icon - left to V */}
              <div className="absolute w-[16%] top-[50%] -translate-y-1/2 left-[48%] rotate-[40deg]">
                <img
                  src="/groovia_icon.png"
                  alt=""
                  className="w-full animate-spin-slow"
                />
              </div>
            </div>
            <h2 className="text-md md:text-3xl -mt-5 md:-mt-6 font-light text-gray-200 animate-pulse-soft px-2 text-right">
              is better together
            </h2>
          </div>
        </div>


        {/* Main Action Buttons */}
        <div className="flex flex-col md:flex-row md:gap-6 gap-4 justify-center items-center mb-12">
          <Button
            onClick={() => setShowCreateModal(true)}
            size="lg"
            className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-white-500 md:px-8 md:py-7 text-xl py-7 font-semibold group"
            disabled={createRoomMutation.isPending}
            data-testid="button-create-room"
          >
            <span>
              <FaPlus style={{ width: "18px", height: "18px" }} />
            </span>
            {createRoomMutation.isPending ? "Creating..." : "Create Room"}
          </Button>

          <Button
            onClick={() => setShowJoinModal(true)}
            size="lg"
            className="w-full md:w-auto text-xl font-semibold bg-gradient-to-r from-purple-600 to-white-500 md:px-8 md:py-7 py-7 text-white"
            data-testid="button-join-room"
          >
            <span>
              <BiDoorOpen style={{ width: "22px", height: "22px" }} />
            </span>
            Join Room
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-4 gap-4 max-w-7xl mx-auto w-full pb-6 md:pb-0">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <GlassPanel
                key={index}
                className="p-6 text-center group transition-transform duration-100"
                data-testid={`feature-card-${index}`}
              >
                <div className={`text-4xl mb-4 ${feature.color}`}>
                  <IconComponent className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </GlassPanel>
            );
          })}
        </div>
      </div>

      <JoinRoomModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
      />
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
