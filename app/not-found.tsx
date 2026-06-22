import Image from "next/image";
import Link from "next/link";

/**
 * 404 — a warm, on-brand "page not found" in Miomi's voice. Renders inside the
 * root layout, so it inherits the theme tokens and fonts.
 * TODO Mike: confirm/refine the Thai line.
 */
export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "24px",
        background: "var(--mk-canvas, #FAFAF6)",
        color: "var(--mk-ink, #2A2A28)",
      }}
    >
      <Image
        src="/miomi/head-thinking.png"
        alt=""
        width={116}
        height={116}
        style={{ marginBottom: "20px" }}
        priority
      />
      <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0 }}>
        Hmm, I can&apos;t find that page
      </h1>
      <p
        style={{
          marginTop: "10px",
          fontSize: "15px",
          lineHeight: 1.5,
          maxWidth: "320px",
          color: "var(--mk-ink-muted, #9A8B73)",
        }}
      >
        อุ๊ย หาหน้านี้ไม่เจอเลย เดี๋ยวเรากลับไปหน้าหลักกันนะ
      </p>
      <Link
        href="/"
        style={{
          marginTop: "24px",
          padding: "12px 28px",
          borderRadius: "9999px",
          background: "linear-gradient(135deg, #6ECDB8 0%, #34A98F 100%)",
          color: "#FFFFFF",
          fontSize: "15px",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Take me home
      </Link>
    </div>
  );
}
