import type { BrainState } from "@/lib/brain/state";

export type Move = "casual" | "teach" | "listen" | "practice" | "celebrate";

export function chooseMove(s: BrainState): Move {
  if (s.emotionalSignal === "sad" || s.intent === "venting") {
    return "listen";
  }
  if (s.emotionalSignal === "stuck" || s.intent === "struggling") {
    return "listen";
  }
  if (s.intent === "practice") {
    return "practice";
  }
  if (s.intent === "want_to_learn") {
    return "teach";
  }
  if (s.emotionalSignal === "excited" && s.exchangeNumber > 1) {
    return "celebrate";
  }
  if (s.isFirstExchange || s.intent === "greeting") {
    return "casual";
  }
  if (s.intent === "goodbye") {
    return "casual";
  }
  return s.exchangeNumber % 2 === 0 ? "teach" : "casual";
}

export function moveInstruction(move: Move, lang: "th" | "en"): string {
  const instructions: Record<Move, { th: string; en: string }> = {
    casual: {
      en: "Have a warm, light conversation. Ask a small follow-up. Do NOT teach.",
      th: "คุยแบบอบอุ่นเบาๆ ถามต่อเล็กน้อย ห้ามสอนคำศัพท์",
    },
    teach: {
      en: "Find ONE natural moment to introduce a new word or echo-correct gently. Teaching must be invisible — never use words like 'wrong' or 'lesson'. Echo the user's correct form in your reply naturally.",
      th: "หาจังหวะธรรมชาติเพียงจุดเดียวในการแนะนำคำใหม่หรือสะท้อนแก้ไขอย่างอ่อนโยน การสอนต้องมองไม่เห็น — ห้ามใช้คำว่า 'ผิด' หรือ 'บทเรียน' สะท้อนรูปที่ถูกต้องของผู้ใช้ในคำตอบอย่างเป็นธรรมชาติ",
    },
    listen: {
      en: "The user is struggling or sad. ONLY listen and validate. Do NOT teach. Do NOT correct. Use warmth from your soul. Face-saving is sacred — never make them feel watched or judged.",
      th: "ผู้ใช้กำลังลำบากหรือเศร้า ฟังและยืนยันเท่านั้น ห้ามสอน ห้ามแก้ไข ใช้ความอบอุ่นจากใจ การรักษาหน้าเป็นสิ่งศักดิ์สิทธิ์ — อย่าทำให้รู้สึกถูกจับตาหรือถูกตัดสิน",
    },
    practice: {
      en: "Co-create a tiny roleplay scenario (1-2 lines max) drawn from real life — ordering food, greeting a friend, asking for help.",
      th: "ร่วมสร้างบทบาทสมมติเล็กๆ (1-2 ประโยค) จากชีวิตจริง — สั่งอาหาร ทักเพื่อน ขอความช่วยเหลือ",
    },
    celebrate: {
      en: "The user is doing great. Name the specific thing they did well. Be theatrical with joy. Pull from warmth.ts praise vectors in spirit.",
      th: "ผู้ใช้ทำได้ดีมาก เรียกชื่อสิ่งที่ทำได้ดีอย่างเฉพาะเจาะจง แสดงความยินดีอย่างมีชีวิตชีวา ใช้จิตวิญญาณจาก praise vectors ใน warmth.ts",
    },
  };

  return instructions[move][lang];
}
