"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { PulseEvent } from "@/app/api/admin/pulse/route";
import { adminPalette, FONT_DISPLAY, tint } from "@/components/admin/ui";

const TYPE_COLOR: Record<PulseEvent["type"], string> = {
  llm: adminPalette.sky,
  signup: adminPalette.teal,
  room: adminPalette.violet,
  payment: adminPalette.gold,
  admin: adminPalette.slate,
};

function rel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function Pulse() {
  const sp = useSearchParams();
  const [events, setEvents] = useState<PulseEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const visible = useRef(true);

  const qs = (() => {
    const p = new URLSearchParams();
    p.set("range", sp.get("range") || "7d");
    const from = sp.get("from");
    const to = sp.get("to");
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p.toString();
  })();

  const load = useCallback(async () => {
    if (paused || !visible.current) return;
    try {
      const res = await fetch(`/api/admin/pulse?${qs}`, { cache: "no-store" });
      if (!res.ok) {
        setErr("pulse unavailable");
        return;
      }
      const data = (await res.json()) as { events: PulseEvent[] };
      setEvents(data.events ?? []);
      setErr(null);
    } catch {
      setErr("pulse unavailable");
    }
  }, [qs, paused]);

  useEffect(() => {
    const onVis = () => {
      visible.current = document.visibilityState === "visible";
      if (visible.current) void load();
    };
    document.addEventListener("visibilitychange", onVis);
    const boot = setTimeout(() => void load(), 0);
    const id = setInterval(() => void load(), 30000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      clearTimeout(boot);
      clearInterval(id);
    };
  }, [load]);

  return (
    <div
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: FONT_DISPLAY }}>Live pulse</div>
        <div style={{ fontSize: 10, color: adminPalette.subtle }}>{paused ? "paused" : "live · 30s"}</div>
      </div>
      {err ? <div style={{ fontSize: 11.5, color: adminPalette.rose }}>{err}</div> : null}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
        {events.length === 0 && !err ? (
          <div style={{ fontSize: 11.5, color: adminPalette.subtle }}>No recent events in range.</div>
        ) : (
          events.map((e, i) => {
            const fail = e.ok === false;
            const color = TYPE_COLOR[e.type];
            const body = (
              <>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: fail ? adminPalette.rose : color,
                    marginTop: 4,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontFamily: FONT_DISPLAY, color: fail ? adminPalette.rose : adminPalette.ink }}>
                      {e.title}
                    </span>
                    <span style={{ color: adminPalette.subtle, flexShrink: 0 }}>{rel(e.t)}</span>
                  </div>
                  {e.detail ? (
                    <div
                      style={{
                        color: fail ? adminPalette.rose : adminPalette.muted,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: open === i ? "normal" : "nowrap",
                      }}
                    >
                      {e.detail}
                    </div>
                  ) : null}
                </div>
              </>
            );
            const style = {
              display: "flex" as const,
              gap: 8,
              alignItems: "flex-start" as const,
              padding: "5px 6px",
              borderRadius: 8,
              fontSize: 11.5,
              cursor: fail ? ("pointer" as const) : ("default" as const),
              background: fail ? tint(adminPalette.rose, 0.08) : undefined,
              borderLeft: fail ? `2px solid ${adminPalette.rose}` : "2px solid transparent",
              textDecoration: "none" as const,
              color: "inherit" as const,
            };
            if (e.href && !fail) {
              return (
                <Link key={i} href={e.href} style={style}>
                  {body}
                </Link>
              );
            }
            return (
              <div key={i} style={style} onClick={() => (fail ? setOpen(open === i ? null : i) : undefined)}>
                {body}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
