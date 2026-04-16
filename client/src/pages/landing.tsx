import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, Vote, Share, Music } from "lucide-react";
import { FaPlus } from "react-icons/fa";
import { BiDoorOpen } from "react-icons/bi";
import JoinRoomModal from "@/components/modals/join-room-modal";
import CreateRoomModal from "@/components/modals/create-room-modal";
import FeatureCard from "@/components/feature-card";
import { useUser } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import AnimatedLogo from "@/components/animated-logo";
import { Link } from "wouter";

export default function Landing() {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { user } = useUser();
  const [, setLocation] = useLocation();

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
      description:
        "Access Spotify's rich metadata to search and play any song you want",
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
    <>
      <div className="min-h-screen flex py-12 md:justify-center items-center w-full px-6 relative">
        <div className="absolute top-4 right-6 z-50 md:block">
          {user ? (
            <Button
              onClick={() => setLocation("/home")}
              className="bg-gray-100/10 border border-gray-400/20 text-md text-white/80 font-semibold px-4 py-2"
            >
              Home
            </Button>
          ) : (
            <Button
              onClick={() => setLocation("/auth")}
              className="bg-gray-100/10 border border-gray-400/20 text-sm lg:text-md text-white/80 font-semibold lg:px-4 lg:py-2 px-3"
            >
              Register
            </Button>
          )}
        </div>
        <div className="text-center max-w-8xl mx-auto w-full">
          {/* Hero Logo and Animation */}
          <div className="md:h-fit mb-12 mt-2 md:max-w-[500px] flex items-center flex-col justify-center mx-auto">
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
        <Link
          to="/privacy-policy"
          className="text-gray-200 underline text-xs mt-2"
          >
          Privacy Policy
        </Link>
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

    </>
  );
}
