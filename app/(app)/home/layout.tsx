import type { Metadata } from "next";
import Image from "next/image";
import { HeroGateRemover } from "./HeroGateRemover";

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
  return (
    <>
      {/* Server-painted hero: production /home shipped an EMPTY body, so LCP
          could never beat bundle+auth (proven by live fetch + local build).
          This layer is pure HTML — the cat paints at image speed, then fades
          the instant the app mounts. Same happy.png as the welcome gate, so
          the crossfade is seamless. pointer-events none: never blocks input. */}
      <div
        id="mio-ssr-hero"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "#FAFAF6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "opacity 0.45s ease",
          pointerEvents: "none",
        }}
      >
        <Image
          src="/miomi/idle.png"
          alt="Miomi"
          width={560}
          height={560}
          priority
          fetchPriority="high"
          sizes="(max-width: 640px) 100vw, 640px"
          quality={70}
          style={{ objectFit: "contain", width: "min(100vw, 640px)", height: "auto" }}
        />
      </div>
      <HeroGateRemover />
      {children}
    </>
  );
}
