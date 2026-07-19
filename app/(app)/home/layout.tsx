import type { Metadata } from "next";

/**
 * /home is the free-trial door the landing links the world to — it gets real
 * SEO citizenship: its own title, description, canonical, and index rights
 * (robots.ts allows it as of the same commit).
 */
export const metadata: Metadata = {
  title: "Try Miomi free · Talk in Thai & English | Miomika",
  description:
    "Start talking with Miomi right now — no signup needed. A voice AI companion that teaches Thai and English through real conversation. คุยกับมีโอมิฟรี ไม่ต้องสมัคร",
  alternates: { canonical: "https://miomika.com/home" },
  robots: { index: true, follow: true },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
