import { MiomiCharacter } from "@/components/miomi/MiomiCharacter";
import { MiomiSpeechBubble } from "@/components/miomi/MiomiSpeechBubble";

export function MiomiStage() {
  return (
    <section className="flex flex-col items-center gap-4">
      <MiomiCharacter expression="idle" />
      <MiomiSpeechBubble>สวัสดี! นี่คือ Miomi stage (placeholder)</MiomiSpeechBubble>
    </section>
  );
}
