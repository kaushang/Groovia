import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, Vote, Share, Music } from "lucide-react";
import { FaPlus } from "react-icons/fa";
import { BiDoorOpen } from "react-icons/bi";
import JoinRoomModal from "@/components/modals/join-room-modal";
import CreateRoomModal from "@/components/modals/create-room-modal";
import FeatureCard from "@/components/feature-card";
import AnimatedLogo from "@/components/animated-logo";

export default function Landing() {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
    <div className="min-h-screen flex py-12 md:justify-center items-center w-full px-6">
      <div className="text-center max-w-8xl mx-auto w-full">
        {/* Hero Logo and Animation */}
        <div className="md:h-fit mb-12 md:max-w-[500px] flex items-center flex-col justify-center mx-auto">
          <AnimatedLogo size="lg" />
        </div>

        {/* Main Action Buttons */}
        <div className="flex flex-col md:flex-row md:gap-6 gap-4 justify-center items-center mb-12">
          <Button
            onClick={() => setShowCreateModal(true)}
            size="lg"
            className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-white-500 md:px-8 md:py-7 text-xl py-7 font-semibold group"
            data-testid="button-create-room"
          >
            <span>
              <FaPlus style={{ width: "18px", height: "18px" }} />
            </span>
            Create Room
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
            return (
              <FeatureCard
                Icon={feature.icon}
                title={feature.title}
                description={feature.description}
                color={feature.color}
                index={index}
              />
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
