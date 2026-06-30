"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { userId: string; hasPendingReferral: boolean };

export default function UserActions({ userId, hasPendingReferral }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tier, setTier] = useState("pro");
  const [rooms, setRooms] = useState("");
  const [baht, setBaht] = useState("");
  const [note, setNote] = useState("");

  async function run(action: string, value?: string | number, key?: string) {
    setBusy(key ?? action);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/user-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: data?.error ?? "failed" });
      } else {
        setMsg({ ok: true, text: data?.detail ?? "done" });
        setRooms(""); setBaht(""); setNote("");
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: "network error" });
    } finally {
      setBusy(null);
    }
  }

  const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" };
  const lbl: React.CSSProperties = { fontSize: 12, color: "#6b675f", width: 110, flexShrink: 0 };
  const input: React.CSSProperties = { padding: "6px 8px", border: "0.5px solid #D9D3C8", borderRadius: 6, fontSize: 13, fontFamily: "inherit", width: 90 };
  const btn: React.CSSProperties = { padding: "6px 12px", border: "0.5px solid #C9E5DC", background: "#EAF6F1", color: "#1F7A68", borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: "pointer" };
  const btnGold: React.CSSProperties = { ...btn, border: "0.5px solid #E8D8A8", background: "#FBF3DC", color: "#8A6D1F" };

  return (
    <div style={{ background: "#fff", border: "0.5px solid #EDE8E0", borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Actions</div>

      <div style={row}>
        <span style={lbl}>Set tier</span>
        <select value={tier} onChange={(e) => setTier(e.target.value)} style={{ ...input, width: 110 }}>
          <option value="free">free</option>
          <option value="pro">pro</option>
          <option value="pro_max">pro_max</option>
        </select>
        <button style={btn} disabled={busy !== null} onClick={() => run("set_tier", tier, "tier")}>{busy === "tier" ? "…" : "Apply"}</button>
      </div>

      <div style={row}>
        <span style={lbl}>Room credits</span>
        <input style={input} type="number" placeholder="e.g. 10" value={rooms} onChange={(e) => setRooms(e.target.value)} />
        <button style={btn} disabled={busy !== null || rooms === ""} onClick={() => run("grant_room_credits", rooms, "rooms")}>{busy === "rooms" ? "…" : "Grant"}</button>
        <span style={{ fontSize: 11, color: "#B0A488" }}>negative removes</span>
      </div>

      <div style={row}>
        <span style={lbl}>฿ credit</span>
        <input style={input} type="number" placeholder="e.g. 30" value={baht} onChange={(e) => setBaht(e.target.value)} />
        <button style={btn} disabled={busy !== null || baht === ""} onClick={() => run("grant_referral_credit", baht, "baht")}>{busy === "baht" ? "…" : "Grant"}</button>
      </div>

      {hasPendingReferral && (
        <div style={row}>
          <span style={lbl}>Referral</span>
          <button style={btnGold} disabled={busy !== null} onClick={() => run("reward_referral", undefined, "reward")}>{busy === "reward" ? "…" : "Reward ฿30 to both"}</button>
          <span style={{ fontSize: 11, color: "#B0A488" }}>friend paid but reward didn&apos;t fire</span>
        </div>
      )}

      <div style={{ ...row, alignItems: "flex-start" }}>
        <span style={lbl}>Note</span>
        <textarea style={{ ...input, width: 260, height: 46, resize: "vertical" }} placeholder="why you made a change…" value={note} onChange={(e) => setNote(e.target.value)} />
        <button style={btn} disabled={busy !== null || note.trim() === ""} onClick={() => run("add_note", note, "note")}>{busy === "note" ? "…" : "Log note"}</button>
      </div>

      {msg && (
        <div style={{ marginTop: 6, fontSize: 12, color: msg.ok ? "#1F7A68" : "#A32D2D" }}>
          {msg.ok ? "✓ " : "✕ "}{msg.text}
        </div>
      )}
    </div>
  );
}
