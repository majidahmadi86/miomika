import Image from "next/image";

const moods = ["idle", "happy", "thinking", "speaking"] as const;

export type MiomiMood = (typeof moods)[number];

type MiomiCharacterProps = {
  mood?: MiomiMood;
};

export function MiomiCharacter({ mood = "idle" }: MiomiCharacterProps) {
  const src = `/miomi/${mood}.png`;

  return (
    <div className="relative h-48 w-48 shrink-0">
      <Image
        src={src}
        alt="Miomi"
        width={192}
        height={192}
        className="h-full w-full object-contain"
        priority
      />
    </div>
  );
}
