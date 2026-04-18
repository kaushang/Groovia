import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, Vote, Share, Music, ExternalLink } from "lucide-react";
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
      <div className="min-h-screen flex flex-col w-full relative">
        <div className="absolute top-4 right-6 z-50 flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              document.getElementById("about")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
            className="text-md lg:text-md font-semibold text-white/80 transition hover:text-white p-2"
          >
            About
          </button>
          <span className="text-white/50">|</span>
          {user ? (
            <p
              onClick={() => setLocation("/home")}
              className="text-md text-white/80 hover:text-white font-semibold p-2"
            >
              Home
            </p>
          ) : (
            <p
              onClick={() => setLocation("/auth")}
              className="text-md lg:text-md text-white/80 hover:text-white font-semibold bg-transparent p-2 cursor-pointer"
            >
              Register
            </p>
          )}
        </div>
        <div className="flex-1 flex py-16 lg:mt-32 mt-4 md:justify-center items-center w-full">
          <div className="text-center max-w-8xl mx-auto w-full lg:px-0 px-6">
            {/* Hero Logo and Animation */}
            <div className="md:h-fit mb-12 -mt-2 md:max-w-[500px] flex items-center flex-col justify-center mx-auto">
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
                    key={feature.title}
                  />
                );
              })}
            </div>

            {/* About Section */}
            <section
              id="about"
              className="mx-auto lg:mt-14 max-w-full text-left bg-transparent flex justify-center py-10 backdrop-blur-sm"
            >
              <div className="max-w-7xl">
                <h2 className="mb-8 text-center text-3xl font-bold text-white md:text-4xl">
                  About Groovia
                </h2>

                <div className="space-y-8">
                  <article className="w-full text-left">
                    <h3 className="mb-2 text-xl font-semibold text-white">
                      What is Groovia?
                    </h3>
                    <p className="text-md leading-7 text-white/75 text-justify">
                      Groovia is a shared music queue platform that brings
                      people together by enabling them to listen to music in a
                      collaborative and democratic manner. It's a place where
                      everyone has a say and a chance to shape the perfect
                      playlist. It removes the hassle of passing the phone
                      around and repeatedly asking someone to play your song by
                      allowing everyone to search and add their favourite songs
                      into the shared queue directly from their own phones.
                    </p>
                  </article>

                  <article className="w-full text-left">
                    <h3 className="mb-2 text-xl font-semibold text-white">
                      What problem does it solve?
                    </h3>
                    <p className="text-md leading-7 text-white/75 text-justify">
                      In social gatherings or shared workspaces, when people
                      decide to listen to music, two genuine problems arise.
                      Music control is often centralized to one person, forcing
                      everyone else to ask the host to play their favorite songs
                      repeatedly. Additionally, there is no fair or democratic
                      way to decide what plays next, leading to designated “DJs”
                      and passive listeners, ultimately resulting in
                      disengagement.
                      <br />
                      Groovia solves this by creating a shared music room where
                      everyone can add songs to a common queue and vote on what
                      plays next. This democratizes music control, fosters
                      engagement, and transforms passive listening into an
                      interactive group experience.
                    </p>
                  </article>

                  <article className="w-full text-left">
                    <h3 className="mb-2 text-xl font-semibold text-white">
                      Tech stack used
                    </h3>
                    <p className="text-md leading-7 text-white/75 text-justify">
                      The frontend is built with <strong>React</strong> and{" "}
                      <strong>TypeScript</strong>, utilizing{" "}
                      <strong>Tailwind CSS</strong> for styling and{" "}
                      <strong>Clerk</strong> for authentication. The backend is
                      powered by <strong>Node.js</strong> with
                      <strong> Express</strong>, using{" "}
                      <strong>Socket.IO</strong> for real-time communication and
                      updates, and
                      <strong> MongoDB</strong> for data storage.{" "}
                      <strong>Spotify's Web API is</strong> integrated to access
                      music metadata. Currently deployed on{" "}
                      <strong>Render</strong>.
                    </p>
                  </article>
                </div>
              </div>
            </section>
          </div>
        </div>

        <footer className="w-full border-t border-white/15 bg-gradient-to-b from-black/20 to-black/40 px-6 py-10 text-left backdrop-blur-sm">
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_1fr]">
            <div className="flex-col lg:items-start lg:flex hidden space-y-3">
              <AnimatedLogo size="md" />
            </div>

            <div className="flex flex-row flex-wrap lg:gap-10 gap-8 items-start lg:justify-end justify-between">
              <div className="lg:space-y-3 space-y-1 w-fit">
                <h3 className="text-xs font-semibold uppercase text-white/55">
                  Developer Contact
                </h3>
                <div className="flex flex-col gap-2 text-sm text-white/75">
                  <p className=" transition flex gap-1 items-center">
                    kaushangsurya29@gmail.com
                  </p>
                </div>
                <a
                  href="https://github.com/kaushang"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/75 text-sm transition hover:text-white flex gap-1 items-center"
                >
                  GitHub
                  <ExternalLink size={14} className="-mt-0.5" />
                </a>
                <a
                  href="https://www.linkedin.com/in/kaushangsurya/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/75 text-sm transition hover:text-white flex gap-1 items-center"
                >
                  LinkedIn
                  <ExternalLink size={14} className="-mt-0.5" />
                </a>
              </div>

              <div className="lg:space-y-3 space-y-1 w-fit">
                <h3 className="text-xs font-semibold uppercase text-white/55">
                  Contribute
                </h3>
                <a
                  href="https://github.com/kaushang/Groovia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/75 text-sm transition hover:text-white flex gap-1 items-center"
                >
                  GitHub Repo
                  <ExternalLink size={14} className="-mt-0.5" />
                </a>
              </div>

              <div className="lg:space-y-3 space-y-1 w-fit">
                <h3 className="text-xs font-semibold uppercase text-white/55">
                  Groovia
                </h3>
                <div className="flex flex-col gap-2 text-sm text-white/75 transition">
                  <p
                    className="hover:text-white cursor-pointer"
                    onClick={() => setShowCreateModal(true)}
                  >
                    Create Room
                  </p>
                  <p
                    className="hover:text-white cursor-pointer"
                    onClick={() => setShowJoinModal(true)}
                  >
                    Join Room
                  </p>
                  <Link className="hover:text-white" to="/auth">
                    Register
                  </Link>
                </div>
              </div>

              <div className="lg:space-y-3 space-y-1 w-fit mr-2">
                <h3 className="text-xs font-semibold uppercase text-white/55">
                  Legal
                </h3>
                <div className="flex flex-col gap-2 text-sm">
                  <Link
                    to="/privacy-policy"
                    className="text-white/75 transition hover:text-white"
                  >
                    Privacy Policy
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between mx-auto max-w-7xl mt-8 border-t border-white/20 text-xs pt-4 text-white/45">
            <div>
              © {new Date().getFullYear()} Groovia. All rights reserved.
            </div>
            <div>Made with ♥️</div>
          </div>
        </footer>

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
