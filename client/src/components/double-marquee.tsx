import { useEffect, useRef, useState } from "react";

interface DoubleMarqueeProps {
    text1: string; // Song Title
    text2: string; // Artist Name
    className1?: string;
    className2?: string;
}

export default function DoubleMarquee({
    text1,
    text2,
    className1 = "",
    className2 = ""
}: DoubleMarqueeProps) {
    const [containerWidth, setContainerWidth] = useState(0);
    const [text1Width, setText1Width] = useState(0);
    const [text2Width, setText2Width] = useState(0);

    // Use refs to measure dimensions
    const containerRef = useRef<HTMLDivElement>(null);
    const text1Ref = useRef<HTMLSpanElement>(null);
    const text2Ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const measure = () => {
            if (containerRef.current && text1Ref.current && text2Ref.current) {
                setContainerWidth(containerRef.current.offsetWidth);
                setText1Width(text1Ref.current.offsetWidth);
                setText2Width(text2Ref.current.offsetWidth);
            }
        };

        measure();

        const resizeObserver = new ResizeObserver(measure);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => resizeObserver.disconnect();
    }, [text1, text2]);
    
    const gap = 24;
    const speed = 36; // pixels per second
    const pauseDuration = 2;

    // Generate a unique ID for this animation instance style
    // Use a simple random string to avoid React version dependency issues with useId
    const [animId] = useState(() => Math.random().toString(36).substr(2, 9));

    const maxContentWidth = Math.max(text1Width, text2Width);

    // Helper to render a specific line
    const renderLine = (text: string, width: number, className: string, suffix: string) => {
        // Only animate if this SPECIFIC line overflows
        if (width <= containerWidth) {
            return (
                <div className={`truncate ${className}`}>
                    {text}
                </div>
            );
        }
        const stride = maxContentWidth + gap;
        const moveDistance = stride;
        const moveDuration = moveDistance / speed;
        const totalDuration = moveDuration + pauseDuration;
        const pausePercent = (pauseDuration / totalDuration) * 100;

        return (
            <div className="w-full max-w-full overflow-hidden relative">
                <style>{`
                    @keyframes marquee-${animId}-${suffix} {
                        0% { transform: translateX(0%); }
                        ${pausePercent}% { transform: translateX(0%); }
                        100% { transform: translateX(-25%); }
                        }
                `}</style>
                <div
                    className="whitespace-nowrap flex"
                    style={{
                        animationName: `marquee-${animId}-${suffix}`,
                        animationDuration: `${totalDuration}s`,
                        animationTimingFunction: 'linear',
                        animationIterationCount: 'infinite',
                        width: "fit-content"
                    }}
                >
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            style={{ width: `${maxContentWidth}px`, marginRight: `${gap}px` }}
                            className={`flex-none ${className}`}
                        >
                            {text}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div ref={containerRef} className="flex flex-col min-w-0 overflow-hidden w-full">
            {/* Hidden measurement spans */}
            <div className="absolute opacity-0 pointer-events-none whitespace-nowrap" aria-hidden="true">
                <span ref={text1Ref} className={className1}>{text1}</span>
                <span ref={text2Ref} className={className2}>{text2}</span>
            </div>

            <div className="grid grid-cols-1">
                {renderLine(text1, text1Width, className1, '1')}
                {renderLine(text2, text2Width, className2, '2')}
            </div>
        </div>
    );
}
