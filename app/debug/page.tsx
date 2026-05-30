"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getEvents, type DebugEvent } from "@/lib/debug/event-bus";

const DEBUG_KEY_HASH = "a3f2c8b1e9d0476";

function DebugViewer() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key");
  const authorized = key === DEBUG_KEY_HASH || process.env.NODE_ENV === "development";

  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [ua] = useState(() => (typeof navigator !== "undefined" ? navigator.userAgent : ""));
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));

  useEffect(() => {
    if (!authorized) return;
    const poll = window.setInterval(() => {
      setEvents(getEvents().slice(-100).reverse());
      setOnline(navigator.onLine);
    }, 500);
    return () => window.clearInterval(poll);
  }, [authorized]);

  if (!authorized) {
    return (
      <div style={{ padding: "32px", fontFamily: "monospace", color: "#9A8B73" }}>
        Access denied. Append ?key= to URL.
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#1A1A18", color: "#E5E5E5", fontFamily: "monospace", fontSize: "12px" }}>
      <div style={{ padding: "16px", borderBottom: "1px solid #333" }}>
        <h1 style={{ margin: "0 0 12px", fontSize: "16px", color: "#C9A96E" }}>/debug — Event Viewer</h1>
        <p style={{ margin: "4px 0", color: "#9A8B73" }}>online: {String(online)}</p>
        <p style={{ margin: "4px 0", color: "#9A8B73", wordBreak: "break-all" }}>ua: {ua}</p>
        <p style={{ margin: "8px 0 0", color: "#666" }}>{events.length} events (polled 500ms)</p>
      </div>
      <div style={{ padding: "8px 0" }}>
        {events.map((e, i) => (
          <div key={`${e.timestamp}-${i}`} style={{ padding: "4px 16px", borderBottom: "0.5px solid #2a2a28" }}>
            <span style={{ color: "#666" }}>{new Date(e.timestamp).toISOString().slice(11, 23)}</span>
            {" "}
            <span style={{ color: e.level === "error" ? "#EF4444" : "#C9A96E" }}>[{e.kind}]</span>
            {" "}
            {e.message}
            {e.data && (
              <pre style={{ margin: "2px 0 0", fontSize: "10px", color: "#888", overflow: "auto" }}>
                {JSON.stringify(e.data)}
              </pre>
            )}
          </div>
        ))}
        {events.length === 0 && (
          <p style={{ padding: "32px", textAlign: "center", color: "#666" }}>No events in this session yet.</p>
        )}
      </div>
    </div>
  );
}

export default function DebugPage() {
  return (
    <Suspense fallback={<div style={{ padding: "32px", fontFamily: "monospace" }}>Loading…</div>}>
      <DebugViewer />
    </Suspense>
  );
}
