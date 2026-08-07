"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { Search, ArrowLeft } from "lucide-react";
import RangePicker from "@/components/admin/RangePicker";
import { adminPalette, FONT_DISPLAY, tint } from "@/components/admin/ui";

/** Mobile: two rows · desktop: single compact bar. */
export default function AdminHeader() {
  const [searchOpen, setSearchOpen] = useState(false);

  function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = String(fd.get("q") ?? "").trim();
    const url = q ? `/admin/users?q=${encodeURIComponent(q)}` : "/admin/users";
    window.location.href = url;
  }

  const iconBtn: CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: 10,
    border: `0.5px solid ${adminPalette.line}`,
    background: adminPalette.canvas,
    color: adminPalette.ink,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    textDecoration: "none",
    flexShrink: 0,
  };

  return (
    <div
      className="shrink-0"
      style={{
        background: "#fff",
        position: "relative",
        fontFamily: FONT_DISPLAY,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 1,
          background: `linear-gradient(90deg, ${tint(adminPalette.teal, 0.45)}, ${tint(adminPalette.gold, 0.45)})`,
          opacity: 0.55,
          pointerEvents: "none",
        }}
      />

      {/* Row 1 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "10px 14px 6px",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", flexShrink: 0 }}>
          <span style={{ color: adminPalette.gold }}>Miomika</span>
          <span style={{ color: adminPalette.ink, fontWeight: 600 }}> admin</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          {/* Desktop search */}
          <form method="get" action="/admin/users" className="hidden md:block">
            <input
              name="q"
              placeholder="Search anyone…"
              style={{
                padding: "5px 10px",
                border: `0.5px solid ${adminPalette.line}`,
                borderRadius: 99,
                fontSize: 12,
                fontFamily: "inherit",
                width: 170,
                background: adminPalette.canvas,
              }}
            />
          </form>
          {/* Mobile search toggle */}
          <button
            type="button"
            className="md:hidden"
            aria-label="Search users"
            style={iconBtn}
            onClick={() => setSearchOpen((v) => !v)}
          >
            <Search size={18} strokeWidth={1.75} />
          </button>
          <a href="/home" className="hidden md:inline" style={{ fontSize: 12, color: adminPalette.muted, textDecoration: "none", whiteSpace: "nowrap" }}>
            back to app
          </a>
          <a href="/home" className="md:hidden" aria-label="Back to app" style={iconBtn}>
            <ArrowLeft size={18} strokeWidth={1.75} />
          </a>
        </div>
      </div>

      {searchOpen ? (
        <form onSubmit={onSearch} className="md:hidden" style={{ padding: "0 14px 8px" }}>
          <input
            name="q"
            autoFocus
            placeholder="Search anyone…"
            style={{
              width: "100%",
              padding: "10px 12px",
              border: `0.5px solid ${adminPalette.line}`,
              borderRadius: 10,
              fontSize: 14,
              fontFamily: "inherit",
              background: adminPalette.canvas,
              boxSizing: "border-box",
            }}
          />
        </form>
      ) : null}

      {/* Row 2 · range pills */}
      <div style={{ padding: "0 14px 10px" }}>
        <RangePicker />
      </div>
    </div>
  );
}
