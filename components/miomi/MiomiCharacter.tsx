"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type MiomiExpression = "idle" | "happy" | "thinking" | "speaking";

type MiomiCharacterProps = {
  expression?: MiomiExpression;
  sleeping?: boolean;
  feedAnimKey?: number;
  playAnimKey?: number;
  levelUpAnimKey?: number;
  breathe?: boolean;
  className?: string;
};

function getSrc(expression: MiomiExpression, sleeping: boolean, levelUpAnimKey: number): string {
  if (sleeping) return "/miomi/idle.png";
  if (levelUpAnimKey > 0) return "/miomi/happy.png";
  return `/miomi/${expression}.png`;
}

export function MiomiCharacter({
  expression = "idle",
  sleeping = false,
  feedAnimKey = 0,
  playAnimKey = 0,
  levelUpAnimKey = 0,
  breathe = true,
  className,
}: MiomiCharacterProps) {
  const targetSrc = getSrc(expression, sleeping, levelUpAnimKey);

  const [displayedSrc, setDisplayedSrc] = useState(targetSrc);
  const [nextSrc, setNextSrc] = useState<string | null>(null);
  const [fading, setFading] = useState(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (targetSrc === displayedSrc) return;

    // Cancel any in-progress fade
    if (fadeTimer.current) clearTimeout(fadeTimer.current);

    // Load next image behind current
    setNextSrc(targetSrc);
    setFading(false);

    // Small delay so next image has time to load before we start fading
    const loadDelay = setTimeout(() => {
      setFading(true);
      fadeTimer.current = setTimeout(() => {
        setDisplayedSrc(targetSrc);
        setNextSrc(null);
        setFading(false);
      }, 500);
    }, 60);

    return () => {
      clearTimeout(loadDelay);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, [targetSrc, displayedSrc]);

  const animClass =
    levelUpAnimKey > 0
      ? "miomi-anim-level-up"
      : feedAnimKey > 0
        ? "miomi-anim-feed"
        : playAnimKey > 0
          ? "miomi-anim-play"
          : undefined;

  const animKey = levelUpAnimKey
    ? `level-${levelUpAnimKey}`
    : feedAnimKey
      ? `feed-${feedAnimKey}`
      : playAnimKey
        ? `play-${playAnimKey}`
        : "idle";

  const imageClass = "pointer-events-none h-full max-h-full w-auto max-w-[min(92vw,100%)] select-none object-contain object-bottom";

  return (
    <>
      <style>{`
        @keyframes miomi-feed-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          40%       { transform: translateY(-20px) scale(1.06); }
          65%       { transform: translateY(-8px) scale(1.03); }
        }
        @keyframes miomi-play-wiggle {
          0%   { transform: rotate(0deg); }
          20%  { transform: rotate(-10deg) scale(1.04); }
          45%  { transform: rotate(10deg) scale(1.04); }
          70%  { transform: rotate(-5deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes miomi-level-up-bounce {
          0%   { transform: translateY(0) scale(1); }
          25%  { transform: translateY(-28px) scale(1.08); }
          50%  { transform: translateY(-12px) scale(1.04); }
          70%  { transform: translateY(-20px) scale(1.06); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes miomi-breathe {
          0%, 100% { transform: scale(1) translateY(0); }
          50%       { transform: scale(1.018) translateY(-2px); }
        }
        @keyframes miomi-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-5px); }
        }
        .miomi-anim-feed    { animation: miomi-feed-bounce 0.45s cubic-bezier(0.34,1.56,0.64,1); }
        .miomi-anim-play    { animation: miomi-play-wiggle 0.55s ease-in-out; }
        .miomi-anim-level-up { animation: miomi-level-up-bounce 0.7s cubic-bezier(0.34,1.56,0.64,1); }
        .miomi-breathe {
          animation: miomi-breathe 3.2s ease-in-out infinite;
          transform-origin: bottom center;
        }
        .miomi-float {
          animation: miomi-float 3.8s ease-in-out infinite;
          transform-origin: bottom center;
        }
      `}</style>

      <div
        className={cn(
          "origin-bottom",
          breathe && !sleeping && !animClass && "miomi-breathe",
          sleeping && "miomi-float",
          className,
        )}
      >
        <div
          key={animKey}
          className={cn("relative origin-bottom", animClass)}
          style={{ display: "inline-block" }}
        >
          {/* Layer 1 — currently displayed image */}
          <Image
            src={displayedSrc}
            alt="Miomi"
            width={560}
            height={560}
            priority
            className={imageClass}
            style={{
              opacity: fading ? 0 : 1,
              transition: "opacity 0.5s ease-in-out",
              position: "relative",
              zIndex: 1,
            }}
          />

          {/* Layer 2 — next image, fades in behind then becomes layer 1 */}
          {nextSrc && (
            <Image
              src={nextSrc}
              alt="Miomi"
              width={560}
              height={560}
              priority
              className={imageClass}
              style={{
                opacity: fading ? 1 : 0,
                transition: "opacity 0.5s ease-in-out",
                position: "absolute",
                inset: 0,
                zIndex: 2,
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}