"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReminderRow, ServiceLive } from "@/lib/admin/watchboard";
import { adminPalette, FONT_DISPLAY, tint, applyBtn, inputStyle } from "@/components/admin/ui";

function Dot({ status }: { status: ServiceLive["status"] }) {
  const c =
    status === "ok" ? adminPalette.teal : status === "stale" ? adminPalette.amber : adminPalette.slate;
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: c,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

function dueChip(due: string | null): { label: string; color: string } | null {
  if (!due) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((new Date(due + "T00:00:00").getTime() - today.getTime()) / 864e5);
  if (days < 0) return { label: `overdue ${Math.abs(days)}d`, color: adminPalette.rose };
  if (days === 0) return { label: "due today", color: adminPalette.amber };
  if (days <= 14) return { label: `due in ${days}d`, color: adminPalette.amber };
  return { label: `due ${due}`, color: adminPalette.slate };
}

export default function Watchboard({
  services,
  reminders,
  remindersReady,
}: {
  services: ServiceLive[];
  reminders: ReminderRow[];
  remindersReady: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const post = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      setErr(null);
      try {
        const res = await fetch("/api/admin/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErr(data?.error ?? "failed");
          return;
        }
        setTitle("");
        setDue("");
        setNote("");
        router.refresh();
      } catch {
        setErr("network error");
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  return (
    <div id="watchboard" style={{ height: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: FONT_DISPLAY }}>Watchboard</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {services.map((s) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <Dot status={s.status} />
            <span style={{ fontWeight: 700, fontFamily: FONT_DISPLAY, minWidth: 88 }}>{s.name}</span>
            <span style={{ color: adminPalette.muted }}>{s.line}</span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: `0.5px solid ${adminPalette.lineSoft}`, paddingTop: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: FONT_DISPLAY, marginBottom: 6 }}>Reminders</div>
        {!remindersReady ? (
          <div style={{ fontSize: 11.5, color: adminPalette.subtle, lineHeight: 1.4 }}>
            run the setup SQL · create table admin_reminders (see handoff report)
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8, maxHeight: 120, overflowY: "auto" }}>
              {reminders.length === 0 ? (
                <div style={{ fontSize: 11.5, color: adminPalette.subtle }}>No open reminders.</div>
              ) : (
                reminders.map((r) => {
                  const chip = dueChip(r.due_date);
                  return (
                    <div
                      key={r.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        fontSize: 12,
                        padding: "4px 0",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontFamily: FONT_DISPLAY }}>{r.title}</div>
                        {r.note ? <div style={{ color: adminPalette.muted, fontSize: 11 }}>{r.note}</div> : null}
                        {chip ? (
                          <span
                            style={{
                              display: "inline-block",
                              marginTop: 2,
                              fontSize: 10,
                              fontWeight: 700,
                              color: chip.color,
                              background: tint(chip.color, 0.14),
                              padding: "1px 6px",
                              borderRadius: 99,
                            }}
                          >
                            {chip.label}
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => post({ op: "done", id: r.id })}
                        style={{
                          fontSize: 11,
                          border: "none",
                          background: "transparent",
                          color: adminPalette.teal,
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        done
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => post({ op: "delete", id: r.id })}
                        style={{
                          fontSize: 11,
                          border: "none",
                          background: "transparent",
                          color: adminPalette.rose,
                          cursor: "pointer",
                        }}
                      >
                        del
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!title.trim()) return;
                post({ op: "create", title: title.trim(), due_date: due || null, note: note.trim() || null });
              }}
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Reminder title"
                style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="date"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                  aria-label="Due date"
                />
                <button type="submit" disabled={busy || !title.trim()} style={{ ...applyBtn, padding: "7px 12px" }}>
                  Add
                </button>
              </div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="note (optional)"
                style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
              />
              {err ? <div style={{ fontSize: 11, color: adminPalette.rose }}>{err}</div> : null}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
