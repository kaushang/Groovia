import React from "react";

type AnimatedLogoProps = {
  size?: "sm" | "md" | "lg" | "default";
};

export default function AnimatedLogo({ size = "default" }: AnimatedLogoProps) {
  const sizeClasses = {
    sm: "max-w-[200px] sm:max-w-[250px] md:max-w-[300px]",
    md: "max-w-[250px] sm:max-w-[350px] md:max-w-[400px]",
    lg: "max-w-[400px] sm:max-w-[500px] md:max-w-[600px]",
    default: "max-w-[300px] sm:max-w-[400px] md:max-w-[500px]",
  };

  const textClasses = {
    sm: "text-sm sm:text-base md:text-lg",
    md: "text-base sm:text-lg md:text-2xl",
    lg: "text-xl sm:text-2xl md:text-3xl",
    default: "text-md md:text-3xl",
  };

  const topTextMarginClasses = {
    sm: "-mb-2 md:-mb-5",
    md: "-mb-3 md:-mb-6",
    lg: "-mb-4 md:-mb-6",
    default: "-mb-4 md:-mb-6",
  };

  const bottomTextMarginClasses = {
    sm: "-mt-3 md:-mt-5",
    md: "-mt-4 md:-mt-6",
    lg: "-mt-5 md:-mt-7",
    default: "-mt-5 md:-mt-6",
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.default;
  const currentTextClass = textClasses[size] || textClasses.default;
  const currentTopMarginClass = topTextMarginClasses[size] || topTextMarginClasses.default;
  const currentBottomMarginClass = bottomTextMarginClasses[size] || bottomTextMarginClasses.default;

  return (
    <div className="w-fit">
      <h2 className={`${currentTextClass} ${currentTopMarginClass} font-light text-gray-200 animate-pulse-soft px-2 text-left`}>
        Because music
      </h2>
      <div className={`relative w-full ${currentSizeClass} mx-auto`}>
        <img
          src="/groovia_logo.avif"
          alt="Groovia"
          className="w-full h-auto select-none pointer-events-none"
        />
        {/* First icon - right to R */}
        <div className="absolute w-[16%] top-[50%] -translate-y-1/2 left-[31%] rotate-[40deg]">
          <img
            src="/groovia_icon.avif"
            alt=""
            className="w-full animate-spin-reverse-slow"
          />
        </div>
        {/* Second icon - left to V */}
        <div className="absolute w-[16%] top-[50%] -translate-y-1/2 left-[48%] rotate-[40deg]">
          <img
            src="/groovia_icon.avif"
            alt=""
            className="w-full animate-spin-slow"
          />
        </div>
      </div>
      <h2 className={`${currentTextClass} ${currentBottomMarginClass} font-light text-gray-200 animate-pulse-soft px-2 text-right`}>
        is better together
      </h2>
    </div>
  );
}
