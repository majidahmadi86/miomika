"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Wand2,
  GraduationCap,
  Sparkles,
  Languages,
  Heart,
  Check,
  Plus,
  Smile,
  Brain,
} from "lucide-react";
import type { TalkConfig, TalkMode, GameType, ContentChannel } from "@/lib/talk/modes";
import { GAME_LABELS } from "@/lib/talk/modes";
import { updateUiLanguage, useProfile } from "@/lib/auth/use-profile";

interface AdjustSheetProps {
  open: boolean;
  config: TalkConfig;
  uiLang: "th" | "en";
  onSave: (config: TalkConfig) => void;
  onClose: () => void;
  onMiomiHelp: (topic: "pillars" | "niche" | "voice") => void;
}

export function AdjustSheet({ open, config, uiLang, onSave, onClose, onMiomiHelp }: AdjustSheetProps) {
  const { profile } = useProfile();
  const [draft, setDraft] = useState<TalkConfig>(config);
  const [optimisticReplyLang, setOptimisticReplyLang] = useState<"th" | "en" | null>(null);
  const [langConfirm, setLangConfirm] = useState<string | null>(null);
  const replyLang = profile?.ui_language ?? optimisticReplyLang ?? uiLang;

  useEffect(() => {
    if (!open) return;
    const onPop = (e: PopStateEvent) => {
      e.preventDefault();
      onClose();
    };
    window.history.pushState({ adjustOpen: true }, "");
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (window.history.state?.adjustOpen) {
        window.history.back();
      }
    };
  }, [open, onClose]);

  const socialNeeds = (() => {
    let count = 0;
    if (!draft.social.channel) count++;
    if (!draft.social.niche) count++;
    if (draft.social.pillars.length === 0) count++;
    if (draft.social.brandVoice.length === 0) count++;
    return count;
  })();

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
            background: "rgba(26,26,24,0.5)",
            zIndex: 300,
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxHeight: "90vh",
              background: "#FAFAF6",
              borderRadius: "28px 28px 0 0",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 -8px 40px rgba(26,26,24,0.15)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderBottom: "0.5px solid #EDE8E0",
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "transparent",
                  border: "none",
                  color: "#3D352B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={22} strokeWidth={2} />
              </button>
              <span style={{ fontFamily: "'Kanit', sans-serif", fontSize: "14px", color: "#3D352B", fontWeight: 500 }}>
                {uiLang === "en" ? "Adjust your pet" : "ปรับแต่งสัตว์เลี้ยงของคุณ"}
              </span>
              <div style={{ width: "36px" }} />
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 40px", WebkitOverflowScrolling: "touch" }}>
              <Group label={uiLang === "en" ? "Lock her role" : "ล็อคบทบาท"} help={uiLang === "en" ? "Auto = she reads you. Lock = she stays in one mode." : "อัตโนมัติ = หนูอ่านคุณ ล็อค = หนูอยู่ในโหมดเดียว"}>
                <ModeGrid value={draft.mode} onChange={(m) => setDraft({ ...draft, mode: m })} uiLang={uiLang} />
              </Group>

              <Section icon={Languages} title={uiLang === "en" ? "Reply language" : "ภาษาที่หนูตอบ"}>
                <PillRow>
                  <Pill
                    active={replyLang === "en"}
                    onClick={() => {
                      if (replyLang === "en") return;
                      setOptimisticReplyLang("en");
                      void updateUiLanguage("en").then(() => {
                        setLangConfirm("Now replying in English~");
                        window.setTimeout(() => setLangConfirm(null), 2500);
                      });
                    }}
                  >
                    English
                  </Pill>
                  <Pill
                    active={replyLang === "th"}
                    onClick={() => {
                      if (replyLang === "th") return;
                      setOptimisticReplyLang("th");
                      void updateUiLanguage("th").then(() => {
                        setLangConfirm("Now replying in ไทย~");
                        window.setTimeout(() => setLangConfirm(null), 2500);
                      });
                    }}
                  >
                    ไทย
                  </Pill>
                </PillRow>
                {langConfirm && (
                  <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "11px", color: "#5BBFA8", margin: "8px 0 0", textAlign: "center" }}>
                    {langConfirm}
                  </p>
                )}
              </Section>

              {(draft.mode === "auto" || draft.mode === "teach") && (
                <Section icon={GraduationCap} title={uiLang === "en" ? "If teaching" : "ถ้าสอนภาษา"}>
                  <DoubleRow>
                    <Field label={uiLang === "en" ? "I'm learning" : "ฉันกำลังเรียน"}>
                      <select
                        value={draft.teach.learning}
                        onChange={(e) => setDraft({ ...draft, teach: { ...draft.teach, learning: e.target.value as "th" | "en" } })}
                        style={selectStyle}
                      >
                        <option value="th">Thai · ภาษาไทย</option>
                        <option value="en">English · ภาษาอังกฤษ</option>
                      </select>
                    </Field>
                    <Field label={uiLang === "en" ? "My level" : "ระดับของฉัน"}>
                      <select
                        value={draft.teach.level}
                        onChange={(e) => setDraft({ ...draft, teach: { ...draft.teach, level: e.target.value as TalkConfig["teach"]["level"] } })}
                        style={selectStyle}
                      >
                        <option value="A1">A1 · beginner</option>
                        <option value="A2">A2 · elementary</option>
                        <option value="B1">B1 · intermediate</option>
                        <option value="B2">B2 · upper</option>
                        <option value="C1">C1 · advanced</option>
                      </select>
                    </Field>
                  </DoubleRow>
                  <MiniLabel label={uiLang === "en" ? "Practice types I want" : "แบบฝึกที่อยากเล่น"} />
                  <ChipsGrid>
                    {(Object.keys(GAME_LABELS) as GameType[]).map((g) => {
                      const on = draft.teach.games.includes(g);
                      return (
                        <Chip
                          key={g}
                          active={on}
                          onClick={() => {
                            const games = on ? draft.teach.games.filter((x) => x !== g) : [...draft.teach.games, g];
                            setDraft({ ...draft, teach: { ...draft.teach, games } });
                          }}
                        >
                          {on ? <Check size={11} strokeWidth={2.5} /> : <Plus size={11} strokeWidth={2.5} />}
                          {GAME_LABELS[g][uiLang]}
                        </Chip>
                      );
                    })}
                  </ChipsGrid>
                </Section>
              )}

              {(draft.mode === "auto" || draft.mode === "social") && (
                <Section icon={Sparkles} title={uiLang === "en" ? "If social mode" : "ถ้าโหมดโซเชียล"} badge={socialNeeds > 0 ? `${socialNeeds} ${uiLang === "en" ? "to fill" : "ต้องเติม"}` : undefined}>
                  <DoubleRow>
                    <Field label={uiLang === "en" ? "Channel" : "ช่อง"}>
                      <select
                        value={draft.social.channel ?? ""}
                        onChange={(e) => setDraft({ ...draft, social: { ...draft.social, channel: (e.target.value || null) as ContentChannel | null } })}
                        style={selectStyle}
                      >
                        <option value="">— choose —</option>
                        <option value="tiktok">TikTok</option>
                        <option value="instagram">Instagram</option>
                        <option value="youtube">YouTube</option>
                        <option value="facebook">Facebook</option>
                        <option value="line">LINE</option>
                      </select>
                    </Field>
                    <Field label={uiLang === "en" ? "Niche" : "นิช"}>
                      <input
                        value={draft.social.niche}
                        onChange={(e) => setDraft({ ...draft, social: { ...draft.social, niche: e.target.value } })}
                        placeholder={uiLang === "en" ? "e.g. coffee shop" : "เช่น ร้านกาแฟ"}
                        style={selectStyle}
                      />
                    </Field>
                  </DoubleRow>
                  <MiniLabel label={uiLang === "en" ? "Content pillars" : "เสาหลักของเนื้อหา"} />
                  <ChipsGrid>
                    {draft.social.pillars.map((p) => (
                      <span key={p} style={chipStaticStyle}>{p}</span>
                    ))}
                    <button type="button" onClick={() => onMiomiHelp("pillars")} style={chipAddStyle}>
                      + {uiLang === "en" ? "add pillar" : "เพิ่ม"}
                    </button>
                  </ChipsGrid>
                  <MiniLabel label={uiLang === "en" ? "Audience" : "กลุ่มเป้าหมาย"} mt />
                  <input
                    value={draft.social.audience}
                    onChange={(e) => setDraft({ ...draft, social: { ...draft.social, audience: e.target.value } })}
                    placeholder={uiLang === "en" ? "Bangkok 25-40 expats" : "ชาวต่างชาติในกรุงเทพ 25-40"}
                    style={selectStyle}
                  />
                  {socialNeeds > 0 && (
                    <button
                      type="button"
                      onClick={() => onMiomiHelp("niche")}
                      style={ghostCtaStyle}
                    >
                      <Sparkles size={14} strokeWidth={2} />
                      {uiLang === "en" ? "Let Miomi help me build these" : "ให้หนูช่วยสร้างให้ค่า~"}
                    </button>
                  )}
                </Section>
              )}

              {(draft.mode === "auto" || draft.mode === "translate") && (
                <Section icon={Languages} title={uiLang === "en" ? "If translating" : "ถ้าแปลภาษา"}>
                  <MiniLabel label={uiLang === "en" ? "Mode" : "โหมด"} />
                  <PillRow>
                    <Pill active={draft.translate.mode === "solo"} onClick={() => setDraft({ ...draft, translate: { ...draft.translate, mode: "solo" } })}>
                      {uiLang === "en" ? "Solo" : "คนเดียว"}
                    </Pill>
                    <Pill active={draft.translate.mode === "between_us"} onClick={() => setDraft({ ...draft, translate: { ...draft.translate, mode: "between_us" } })}>
                      {uiLang === "en" ? "Between two people" : "ระหว่างสองคน"}
                    </Pill>
                  </PillRow>
                  <ToggleRow
                    label={uiLang === "en" ? "Save words I learn while translating" : "บันทึกคำที่เรียนตอนแปล"}
                    value={draft.translate.saveWords}
                    onToggle={() => setDraft({ ...draft, translate: { ...draft.translate, saveWords: !draft.translate.saveWords } })}
                  />
                </Section>
              )}

              <Section icon={Smile} title={uiLang === "en" ? "Her personality" : "บุคลิกของหนู"}>
                <MiniLabel label={uiLang === "en" ? "Tone" : "โทน"} />
                <PillRow>
                  {(["warm", "focused", "playful"] as const).map((t) => (
                    <Pill key={t} active={draft.tone === t} onClick={() => setDraft({ ...draft, tone: t })}>
                      {uiLang === "en" ? t.charAt(0).toUpperCase() + t.slice(1) : t === "warm" ? "อบอุ่น" : t === "focused" ? "ตั้งใจ" : "ขี้เล่น"}
                    </Pill>
                  ))}
                </PillRow>
                <MiniLabel label={uiLang === "en" ? "How intelligent should she be" : "ความฉลาดของหนู"} mt />
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontFamily: "'Quicksand', sans-serif", fontSize: "11px", color: "#9A8B73" }}>
                  <span>{uiLang === "en" ? "Fast" : "เร็ว"}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={50}
                    value={draft.depth}
                    onChange={(e) => setDraft({ ...draft, depth: parseInt(e.target.value, 10) })}
                    style={{ flex: 1, accentColor: "#34A98F" }}
                  />
                  <span>{uiLang === "en" ? "Genius" : "อัจฉริยะ"}</span>
                </div>
                <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "10.5px", color: "#9A8B73", margin: "4px 0 0", textAlign: "center" }}>
                  {draft.depth <= 33 ? (uiLang === "en" ? "Fast · short answers" : "เร็ว · สั้น")
                    : draft.depth <= 66 ? (uiLang === "en" ? "Smart · balanced" : "ฉลาด · สมดุล")
                    : (uiLang === "en" ? "Genius · deep & thoughtful" : "อัจฉริยะ · ลึก")}
                </p>
              </Section>

              <Section icon={Brain} title={uiLang === "en" ? "Memory" : "ความจำ"}>
                <ToggleRow
                  label={uiLang === "en" ? "My progress" : "ความก้าวหน้าของฉัน"}
                  value={draft.memory.progress}
                  onToggle={() => setDraft({ ...draft, memory: { ...draft.memory, progress: !draft.memory.progress } })}
                />
                <ToggleRow
                  label={uiLang === "en" ? "Things I share personally" : "สิ่งที่ฉันบอกหนู"}
                  value={draft.memory.personal}
                  onToggle={() => setDraft({ ...draft, memory: { ...draft.memory, personal: !draft.memory.personal } })}
                />
                <ToggleRow
                  label={uiLang === "en" ? "Favorite topics" : "หัวข้อที่ชอบ"}
                  value={draft.memory.topics}
                  onToggle={() => setDraft({ ...draft, memory: { ...draft.memory, topics: !draft.memory.topics } })}
                />
              </Section>

              <button
                type="button"
                onClick={() => onSave(draft)}
                style={{
                  width: "100%",
                  height: "46px",
                  borderRadius: "999px",
                  background: "linear-gradient(135deg, #6ECDB8 0%, #34A98F 100%)",
                  border: "none",
                  color: "#FFFFFF",
                  fontFamily: "'Kanit', sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  marginTop: "8px",
                }}
              >
                {uiLang === "en" ? "Save ✦" : "บันทึก ✦"}
              </button>
              <button
                type="button"
                onClick={() => setDraft({ ...config, mode: "auto" })}
                style={{
                  width: "100%",
                  height: "38px",
                  background: "transparent",
                  border: "none",
                  color: "#9A8B73",
                  fontFamily: "'Quicksand', sans-serif",
                  fontSize: "12px",
                  cursor: "pointer",
                  marginTop: "6px",
                  paddingBottom: "12px",
                }}
              >
                {uiLang === "en" ? "Reset to Auto" : "รีเซ็ตเป็นอัตโนมัติ"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "0.5px solid #EDE8E0",
  background: "#FFFFFF",
  borderRadius: "10px",
  fontFamily: "'Quicksand', sans-serif",
  fontSize: "12px",
  color: "#1A1A18",
  outline: "none",
};
const chipStaticStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  background: "rgba(110,205,184,0.12)",
  border: "0.5px solid rgba(52,169,143,0.3)",
  borderRadius: "999px",
  fontFamily: "'Quicksand', sans-serif",
  fontSize: "11.5px",
  color: "#34A98F",
};
const chipAddStyle: React.CSSProperties = {
  background: "transparent",
  border: "0.5px dashed #34A98F",
  color: "#34A98F",
  fontFamily: "'Quicksand', sans-serif",
  fontSize: "11.5px",
  padding: "5px 10px",
  borderRadius: "999px",
  cursor: "pointer",
};
const ghostCtaStyle: React.CSSProperties = {
  width: "100%",
  marginTop: "10px",
  padding: "9px",
  background: "rgba(125,211,192,0.1)",
  border: "0.5px solid rgba(125,211,192,0.3)",
  borderRadius: "12px",
  fontFamily: "'Quicksand', sans-serif",
  fontSize: "12px",
  color: "#5BBFA8",
  fontWeight: 500,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
};

function Group({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <span style={{ display: "block", fontFamily: "'Quicksand', sans-serif", fontSize: "11px", fontWeight: 600, color: "#9A8B73", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "4px" }}>{label}</span>
      {help && <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "11.5px", color: "#9A8B73", margin: "0 0 10px", lineHeight: 1.4 }}>{help}</p>}
      {children}
    </div>
  );
}

function Section({ icon: Icon, title, badge, children }: { icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>; title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.6)", border: "0.5px solid #EDE8E0", borderRadius: "16px", padding: "13px", marginBottom: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
        <Icon size={14} color="#34A98F" strokeWidth={2} />
        <span style={{ fontFamily: "'Kanit', sans-serif", fontSize: "13px", color: "#3D352B", fontWeight: 500, flex: 1 }}>{title}</span>
        {badge && (
          <span style={{ background: "rgba(110,205,184,0.18)", color: "#34A98F", fontFamily: "'Quicksand', sans-serif", fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "999px" }}>{badge}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function ModeGrid({ value, onChange, uiLang }: { value: TalkMode; onChange: (m: TalkMode) => void; uiLang: "th" | "en" }) {
  const modes: { key: TalkMode; icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>; th: string; en: string; descTh: string; descEn: string; span?: number }[] = [
    { key: "auto", icon: Wand2, th: "อัตโนมัติ", en: "Auto", descTh: "หนูอ่านคุณ", descEn: "she reads you" },
    { key: "teach", icon: GraduationCap, th: "สอนภาษา", en: "Teach", descTh: "ภาษาเท่านั้น", descEn: "language only" },
    { key: "social", icon: Sparkles, th: "โซเชียล", en: "Social", descTh: "โหมดคอนเทนต์", descEn: "content mode" },
    { key: "translate", icon: Languages, th: "แปลภาษา", en: "Translate", descTh: "ระหว่างเรา", descEn: "between us" },
    { key: "chat", icon: Heart, th: "แค่คุย", en: "Just chat", descTh: "อยู่กับหนู", descEn: "be with me", span: 2 },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
      {modes.map((m) => {
        const active = value === m.key;
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => onChange(m.key)}
            style={{
              gridColumn: m.span === 2 ? "span 2" : "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "4px",
              padding: "11px 12px",
              background: active ? "linear-gradient(135deg, #FFF4E8 0%, #FFE8D6 100%)" : "rgba(255,255,255,0.7)",
              border: active ? "0.5px solid rgba(52,169,143,0.4)" : "0.5px solid #EDE8E0",
              borderRadius: "14px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <m.icon size={18} color={active ? "#34A98F" : "#9A8B73"} strokeWidth={2} />
            <p style={{ fontFamily: "'Kanit', sans-serif", fontSize: "13px", color: "#1A1A18", margin: 0, fontWeight: 500 }}>{uiLang === "en" ? m.en : m.th}</p>
            <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "10.5px", color: "#9A8B73" }}>{uiLang === "en" ? m.descEn : m.descTh}</span>
          </button>
        );
      })}
    </div>
  );
}

function DoubleRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span style={{ display: "block", fontFamily: "'Quicksand', sans-serif", fontSize: "10.5px", color: "#9A8B73", marginBottom: "4px", fontWeight: 500 }}>{label}</span>
      {children}
    </div>
  );
}

function MiniLabel({ label, mt = false }: { label: string; mt?: boolean }) {
  return (
    <span style={{ display: "block", fontFamily: "'Quicksand', sans-serif", fontSize: "10.5px", color: "#9A8B73", marginBottom: "4px", fontWeight: 500, marginTop: mt ? "8px" : 0 }}>
      {label}
    </span>
  );
}

function ChipsGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>{children}</div>;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "6px 10px",
        border: active ? "0.5px solid rgba(52,169,143,0.4)" : "0.5px solid #EDE8E0",
        background: active ? "linear-gradient(135deg, #FFF4E8 0%, #FFE8D6 100%)" : "rgba(255,255,255,0.7)",
        borderRadius: "999px",
        fontFamily: "'Quicksand', sans-serif",
        fontSize: "11.5px",
        color: active ? "#34A98F" : "#9A8B73",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function PillRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: "5px" }}>{children}</div>;
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "8px",
        border: active ? "0.5px solid rgba(52,169,143,0.4)" : "0.5px solid #EDE8E0",
        background: active ? "linear-gradient(135deg, #FFF4E8 0%, #FFE8D6 100%)" : "rgba(255,255,255,0.7)",
        borderRadius: "999px",
        fontFamily: "'Quicksand', sans-serif",
        fontSize: "11.5px",
        color: active ? "#34A98F" : "#9A8B73",
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 2px", borderBottom: "0.5px solid #EDE8E0", fontFamily: "'Quicksand', sans-serif", fontSize: "12.5px", color: "#1A1A18" }}>
      <span>{label}</span>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={value}
        style={{
          width: "32px",
          height: "18px",
          borderRadius: "999px",
          background: value ? "#34A98F" : "#EDE8E0",
          border: "none",
          position: "relative",
          cursor: "pointer",
          transition: "background 200ms",
          padding: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "2px",
            left: value ? "16px" : "2px",
            width: "14px",
            height: "14px",
            borderRadius: "50%",
            background: "#FFFFFF",
            boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
            transition: "left 200ms",
          }}
        />
      </button>
    </div>
  );
}
