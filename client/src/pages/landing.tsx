import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Users, Vote, Share } from "lucide-react";
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
      icon: Share,
      title: "Easy Sharing",
      description: "Share rooms with links and unique codes",
      color: "text-cyan-300",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col py-12 px-6 md:justify-center items-center w-full">
      <div className="text-center max-w-4xl mx-auto w-full">
        {/* Hero Logo and Animation */}
        <div className="w-full text-center md:h-fit mb-12">
          <div className="text-5xl sm:text-7xl md:text-8xl font-bold">
            Groovia
          </div>
          <h2 className="text-xl md:text-3xl mt-2 font-light text-gray-200 animate-pulse-soft px-2">
            Because music is better together
          </h2>
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
        <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto w-full pb-6 md:pb-0">
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
