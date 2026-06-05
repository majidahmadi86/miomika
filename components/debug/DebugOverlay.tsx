"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import {
  type DebugEvent,
  getEvents,
  subscribe,
  clearEvents,
} from "@/lib/debug/event-bus";
import type { MicState } from "@/components/talk/MicButton";
import type { TtsLang } from "@/lib/voice/tts";

const KIND_COLORS: Record<DebugEvent["kind"], string> = {
  mic: "#3B82F6",
  vad: "#06B6D4",
  transcribe: "#A855F7",
  engine: "#EC4899",
  tts: "#C9A96E",
  state: "#22C55E",
  error: "#EF4444",
  network: "#F97316",
};

interface DebugOverlayProps {
  open: boolean;
  onClose: () => void;
  micState: MicState;
  conversationLang: TtsLang;
}

function formatRelative(ts: number, now: number): string {
  const diff = (now - ts) / 1000;
  if (diff < 1) return "0.0s";
  if (diff < 60) return `${diff.toFixed(1)}s`;
  return `${Math.floor(diff / 60)}m${Math.floor(diff % 60)}s`;
}

function extractTurnLatency(events: DebugEvent[]): string | null {
  for (const event of events) {
    if (!event.message.startsWith("turn:model_audio_first")) continue;
    const data = event.data as { report?: string; deltaMs?: number | null } | undefined;
    const reportLine = data?.report
      ?.split("\n")
      .find((line) => line.includes("user_turn → first_audio"));
    if (reportLine) return reportLine;
    if (data?.deltaMs != null) return `user_turn → first_audio: ${data.deltaMs}ms`;
  }
  return null;
}

function inferVadState(events: DebugEvent[]): string {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.kind !== "vad") continue;
    if (e.message.includes("destroyed")) return "destroyed";
    if (e.message.includes("created") || e.message.includes("running")) return "started";
    if (e.message.includes("loading")) return "loading";
  }
  return "unknown";
}

function EventRow({ event, now }: { event: DebugEvent; now: number }) {
  const [expanded, setExpanded] = useState(false);
  const color = KIND_COLORS[event.kind];

  return (
    <div
      style={{
        padding: "6px 10px",
        borderBottom: "0.5px solid rgba(255,255,255,0.08)",
        fontFamily: "monospace",
        fontSize: "11px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
        <span style={{ color: "#9A8B73", flexShrink: 0, width: "36px" }}>
          {formatRelative(event.timestamp, now)}
        </span>
        <span
          style={{
            background: color,
            color: "#fff",
            borderRadius: "4px",
            padding: "1px 5px",
            fontSize: "9px",
            fontWeight: 700,
            flexShrink: 0,
            textTransform: "uppercase",
          }}
        >
          {event.kind}
        </span>
        <span
          style={{
            color: event.level === "error" ? "#FCA5A5" : event.level === "warn" ? "#FDE68A" : "#E5E5E5",
            flex: 1,
            wordBreak: "break-word",
          }}
        >
          {event.message}
        </span>
        {event.data && (
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            style={{
              background: "none",
              border: "none",
              color: "#9A8B73",
              cursor: "pointer",
              fontSize: "10px",
              padding: "0 4px",
            }}
          >
            {expanded ? "▲" : "▼"}
          </button>
        )}
      </div>
      {expanded && event.data && (
        <pre
          style={{
            margin: "4px 0 0 42px",
            padding: "6px 8px",
            background: "rgba(0,0,0,0.3)",
            borderRadius: "4px",
            color: "#D4D4D4",
            fontSize: "10px",
            overflow: "auto",
            maxHeight: "120px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {JSON.stringify(event.data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function DebugOverlay({ open, onClose, micState, conversationLang }: DebugOverlayProps) {
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(0);
  const dragY = useMotionValue(0);
  const opacity = useTransform(dragY, [0, 120], [1, 0.3]);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  /* eslint-disable react-hooks/set-state-in-effect -- debug overlay live stream */
  useEffect(() => {
    if (!open) return;
    setEvents(getEvents().slice(-100).reverse());
    setNow(Date.now());
    const unsub = subscribe((e) => {
      if (pausedRef.current) return;
      setEvents((prev) => [e, ...prev].slice(0, 100));
    });
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      unsub();
      window.clearInterval(tick);
    };
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const errorCount = events.filter((e) => e.level === "error").length;
  const vadState = inferVadState(events);
  const turnLatency = extractTurnLatency(events);

  const handleCopy = useCallback(async () => {
    const text = JSON.stringify(getEvents(), null, 2);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }, []);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 80 || info.velocity.y > 400) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(26,26,24,0.45)",
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={onClose}
        >
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            style={{ y: dragY, opacity, width: "100%" }}
            onDragEnd={handleDragEnd}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: "#1A1A18",
                borderRadius: "20px 20px 0 0",
                maxHeight: "72vh",
                display: "flex",
                flexDirection: "column",
                paddingBottom: "env(safe-area-inset-bottom, 16px)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
                <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#444" }} />
              </div>

              <div style={{ padding: "0 14px 10px", borderBottom: "0.5px solid rgba(255,255,255,0.1)" }}>
                <p style={{ margin: "0 0 8px", fontFamily: "monospace", fontSize: "12px", fontWeight: 700, color: "#C9A96E" }}>
                  Debug Stream
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontFamily: "monospace", fontSize: "10px", color: "#D4D4D4" }}>
                  <span>mic: <strong style={{ color: "#22C55E" }}>{micState}</strong></span>
                  <span>lang: <strong style={{ color: "#22C55E" }}>{conversationLang}</strong></span>
                  <span>vad: <strong style={{ color: vadState === "started" ? "#22C55E" : "#F97316" }}>{vadState}</strong></span>
                  <span>errors: <strong style={{ color: errorCount > 0 ? "#EF4444" : "#22C55E" }}>{errorCount}</strong></span>
                </div>
                <p style={{ margin: "8px 0 0", fontFamily: "monospace", fontSize: "10px", color: turnLatency ? "#C9A96E" : "#9A8B73" }}>
                  latency: {turnLatency ?? "user_turn_start → model_audio_first (awaiting turn)"}
                </p>
                <p style={{ margin: "4px 0 0", fontFamily: "monospace", fontSize: "9px", color: "#9A8B73" }}>
                  open: triple-tap header bar · toggle: ? key
                </p>
                <div style={{ display: "flex", gap: "6px", marginTop: "10px", flexWrap: "wrap" }}>
                  <button type="button" onClick={() => setPaused((p) => !p)} style={btnStyle}>
                    {paused ? "Resume" : "Pause stream"}
                  </button>
                  <button type="button" onClick={() => { clearEvents(); setEvents([]); }} style={btnStyle}>
                    Clear
                  </button>
                  <button type="button" onClick={() => void handleCopy()} style={btnStyle}>
                    Copy all
                  </button>
                  <button type="button" onClick={onClose} style={btnStyle}>
                    Close
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                {events.length === 0 ? (
                  <p style={{ padding: "20px", textAlign: "center", color: "#9A8B73", fontFamily: "monospace", fontSize: "11px" }}>
                    No events yet
                  </p>
                ) : (
                  events.map((e, i) => <EventRow key={`${e.timestamp}-${i}`} event={e} now={now} />)
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const btnStyle: CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  border: "0.5px solid rgba(255,255,255,0.15)",
  borderRadius: "6px",
  color: "#E5E5E5",
  fontFamily: "monospace",
  fontSize: "10px",
  padding: "5px 10px",
  cursor: "pointer",
};
