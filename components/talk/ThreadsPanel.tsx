"use client";

// Chat thread list — the approved phase-3 mock, one component for both homes:
// the desktop rail ("rail") and the mobile drawer ("drawer"). Selection and
// New chat travel through the URL (/talk?thread=… | /talk?new=1) so this stays
// decoupled from the talk screen. Refreshes on mount and whenever the talk
// screen dispatches "miomika:threads".

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";

type Thread = { id: string; title: string | null; last_message_at: string; created_at: string };

const Q = "'Quicksand', sans-serif";
const K = "'Kanit', sans-serif";

function dayLabel(iso: string, lang: "en" | "th"): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return lang === "en" ? "today" : "วันนี้";
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return lang === "en" ? "yesterday" : "เมื่อวาน";
  return d.toLocaleDateString(lang === "en" ? "en-GB" : "th-TH", { day: "numeric", month: "short" });
}

function PanelInner({
  lang,
  variant,
  onNavigate,
}: {
  lang: "en" | "th";
  variant: "rail" | "drawer";
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  const font = lang === "en" ? Q : K;
  const paramThread = searchParams.get("thread");
  const activeId = paramThread ?? threads[0]?.id ?? null;

  const load = useCallback(() => {
    void (async () => {
      try {
        const res = await fetch("/api/talk/threads", { credentials: "include", cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { threads?: Thread[] };
        setThreads(json.threads ?? []);
      } catch {
        /* list is best-effort */
      }
    })();
  }, []);

  useEffect(() => {
    load();
    const onChanged = () => load();
    window.addEventListener("miomika:threads", onChanged);
    return () => window.removeEventListener("miomika:threads", onChanged);
  }, [load]);

  const saveRename = useCallback(
    (id: string) => {
      const title = editValue.trim();
      setEditingId(null);
      if (!title) return;
      void (async () => {
        try {
          await fetch(`/api/talk/threads/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ title }),
          });
        } catch {
          /* keep old title on failure */
        }
        load();
      })();
    },
    [editValue, load],
  );

  const deleteThread = useCallback(
    (id: string) => {
      setConfirmingId(null);
      setMenuId(null);
      void (async () => {
        try {
          await fetch(`/api/talk/threads/${id}`, { method: "DELETE", credentials: "include" });
        } catch {
          /* thread stays on failure */
        }
        load();
        if (id === activeId) {
          router.push("/talk?new=1");
          onNavigate?.();
        }
      })();
    },
    [activeId, load, onNavigate, router],
  );

  const titleOf = (t: Thread) => t.title?.trim() || (lang === "en" ? "New chat" : "แชทใหม่");

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px 8px" }}>
        <span style={{ fontFamily: Q, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#A89C88" }}>
          {lang === "en" ? "CHATS" : "แชท"}
        </span>
        <Link
          href="/talk?new=1"
          aria-label={lang === "en" ? "New chat" : "แชทใหม่"}
          onClick={onNavigate}
          style={{ width: 22, height: 22, borderRadius: 7, background: "#E7F3EF", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
        >
          <Plus size={13} color="#1F7A68" strokeWidth={2.2} />
        </Link>
      </div>
      <div style={{ minHeight: 0, flex: 1, overflowY: "auto" }}>
        {threads.length === 0 ? (
          <p style={{ fontFamily: font, fontSize: 12, lineHeight: 1.5, color: "#A89C88", padding: "0 8px", margin: 0 }}>
            {lang === "en"
              ? "No chats yet — start talking with Miomi and they'll appear here"
              : "ยังไม่มีบทสนทนา เริ่มคุยกับมิโอมิแล้วจะมาอยู่ตรงนี้ค่า"}
          </p>
        ) : (
          threads.map((t) => {
            const active = t.id === activeId;
            return (
              <div key={t.id} style={{ marginBottom: 2 }}>
                {editingId === t.id ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 6px" }}>
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename(t.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      style={{ flex: 1, minWidth: 0, fontFamily: font, fontSize: 12, padding: "4px 7px", borderRadius: 7, border: "1px solid #CFE5DC", outline: "none", background: "#fff", color: "#3A362F" }}
                    />
                    <button type="button" onClick={() => saveRename(t.id)} aria-label="Save" style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                      <Check size={14} color="#1F7A68" />
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: 4, borderRadius: 9, padding: "6px 8px",
                      background: active ? "#EDF6F2" : "transparent",
                    }}
                  >
                    <Link
                      href={`/talk?thread=${t.id}`}
                      onClick={onNavigate}
                      style={{ flex: 1, minWidth: 0, textDecoration: "none" }}
                    >
                      <span style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: active ? 600 : 400, color: active ? "#22574A" : "#6B655B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {titleOf(t)}
                      </span>
                      <span style={{ display: "block", fontFamily: Q, fontSize: 9.5, color: active ? "#7FB3A3" : "#B3AC9F" }}>
                        {dayLabel(t.last_message_at, lang)}
                      </span>
                    </Link>
                    <button
                      type="button"
                      aria-label="Chat options"
                      onClick={() => { setMenuId(menuId === t.id ? null : t.id); setConfirmingId(null); }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0 }}
                    >
                      <MoreHorizontal size={14} color={active ? "#9CC7B9" : "#D5CEC0"} />
                    </button>
                  </div>
                )}
                {menuId === t.id && editingId !== t.id ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 8px 5px 8px" }}>
                    {confirmingId === t.id ? (
                      <>
                        <span style={{ fontFamily: font, fontSize: 11, color: "#993556" }}>{lang === "en" ? "Delete?" : "ลบเลยไหม?"}</span>
                        <button type="button" onClick={() => deleteThread(t.id)} aria-label="Confirm delete" style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                          <Check size={13} color="#993556" />
                        </button>
                        <button type="button" onClick={() => setConfirmingId(null)} aria-label="Cancel" style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                          <X size={13} color="#A89C88" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => { setEditingId(t.id); setEditValue(t.title ?? ""); setMenuId(null); }}
                          style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: 2, fontFamily: font, fontSize: 11, color: "#1F7A68" }}
                        >
                          <Pencil size={11} /> {lang === "en" ? "Rename" : "เปลี่ยนชื่อ"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(t.id)}
                          style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: 2, fontFamily: font, fontSize: 11, color: "#C75C86" }}
                        >
                          <Trash2 size={11} /> {lang === "en" ? "Delete" : "ลบ"}
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
                {variant === "drawer" ? null : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function ThreadsPanel(props: { lang: "en" | "th"; variant: "rail" | "drawer"; onNavigate?: () => void }) {
  return (
    <Suspense fallback={null}>
      <PanelInner {...props} />
    </Suspense>
  );
}
