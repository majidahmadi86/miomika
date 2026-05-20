"use client";

import Image from "next/image";
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

export function MiomiCharacter({
  expression = "idle",
  sleeping = false,
  feedAnimKey = 0,
  playAnimKey = 0,
  levelUpAnimKey = 0,
  breathe = true,
  className,
}: MiomiCharacterProps) {
  const isFullBody = sleeping || levelUpAnimKey > 0;

  const src = sleeping
    ? "/miomi/idle.png"
    : levelUpAnimKey > 0
      ? "/miomi/happy.png"
      : `/miomi/${expression}.png`;

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
          50%       { transform: translateY(-6px); }
        }
        .miomi-anim-feed {
          animation: miomi-feed-bounce 0.45s cubic-bezier(0.34,1.56,0.64,1);
        }
        .miomi-anim-play {
          animation: miomi-play-wiggle 0.55s ease-in-out;
        }
        .miomi-anim-level-up {
          animation: miomi-level-up-bounce 0.7s cubic-bezier(0.34,1.56,0.64,1);
        }
        .miomi-breathe {
          animation: miomi-breathe 3.2s ease-in-out infinite;
          transform-origin: bottom center;
        }
        .miomi-float {
          animation: miomi-float 3.6s ease-in-out infinite;
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
        <div key={animKey} className={cn("origin-bottom", animClass)}>
          <Image
            src={src}
            alt="Miomi"
            width={560}
            height={560}
            priority
            className="pointer-events-none h-full max-h-full w-auto max-w-[min(92vw,100%)] select-none object-contain object-bottom"
          />
        </div>
      </div>
    </>
  );
}
