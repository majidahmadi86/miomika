import Link from "next/link";
import Image from "next/image";
import type { AttentionItem } from "@/lib/admin/attention";
import { adminPalette, FONT_DISPLAY, tint } from "@/components/admin/ui";

export function AttentionStrip({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          borderRadius: 12,
          background: tint(adminPalette.teal, 0.1),
          border: `0.5px solid ${tint(adminPalette.teal, 0.25)}`,
          marginBottom: 10,
        }}
      >
        <Image src="/miomi/head-happy.png" alt="" width={24} height={24} style={{ opacity: 0.85 }} />
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 13.5, color: adminPalette.teal }}>
          All calm · nothing needs you right now
        </div>
      </div>
    );
  }

  return (
    <div
      className="admin-hscroll"
      style={{ display: "flex", gap: 8, marginBottom: 10, paddingBottom: 2 }}
    >
      {items.map((it, i) => {
        const color = it.severity === "action" ? adminPalette.rose : adminPalette.amber;
        return (
          <Link
            key={i}
            href={it.href}
            style={{
              flex: "0 0 auto",
              width: 240,
              maxWidth: "80vw",
              textDecoration: "none",
              padding: "10px 12px",
              borderRadius: 12,
              background: tint(color, 0.1),
              border: `0.5px solid ${tint(color, 0.28)}`,
              borderLeft: `3px solid ${color}`,
              color: adminPalette.ink,
            }}
          >
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 12.5, color, marginBottom: 4 }}>
              {it.title} →
            </div>
            <div style={{ fontSize: 11.5, color: adminPalette.muted, lineHeight: 1.35 }}>{it.detail}</div>
          </Link>
        );
      })}
    </div>
  );
}
