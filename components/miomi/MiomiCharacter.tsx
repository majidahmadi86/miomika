import Image from "next/image";
import { cn } from "@/lib/utils";

export type MiomiExpression = "idle" | "happy";

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
  const src = sleeping
    ? "/miomi/idle.png"
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
          0%,
          100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-20px);
          }
        }
        @keyframes miomi-play-wiggle {
          0% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-10deg);
          }
          50% {
            transform: rotate(10deg);
          }
          75% {
            transform: rotate(-6deg);
          }
          100% {
            transform: rotate(0deg);
          }
        }
        @keyframes miomi-level-up-bounce {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          35% {
            transform: translateY(-28px) scale(1.04);
          }
          55% {
            transform: translateY(-8px) scale(1.02);
          }
        }
        .miomi-anim-feed {
          animation: miomi-feed-bounce 0.4s ease-out;
        }
        .miomi-anim-play {
          animation: miomi-play-wiggle 0.5s ease-in-out;
        }
        .miomi-anim-level-up {
          animation: miomi-level-up-bounce 0.65s ease-out;
        }
      `}</style>
      <div
        className={cn(
          "origin-bottom",
          breathe && !sleeping && !animClass && "miomi-breathe",
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
