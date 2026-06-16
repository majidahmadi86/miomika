"use client";

import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useUILanguage } from "@/lib/i18n/client";

interface AvatarEditSheetProps {
  open: boolean;
  userId: string;
  onClose: () => void;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = url;
  });
}

async function getCroppedBlob(imageSrc: string, area: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-canvas-context");
  const size = Math.min(Math.round(area.width), 512);
  canvas.width = size;
  canvas.height = size;
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("blob-failed"))), "image/jpeg", 0.9);
  });
}

export function AvatarEditSheet({ open, userId, onClose }: AvatarEditSheetProps) {
  const uiLang = useUILanguage();
  const C = {
    th: {
      chooseTitle: "เลือกรูปของคุณ",
      fromDevice: "เลือกจากอุปกรณ์",
      useMiomi: "ใช้รูป Miomi",
      cancel: "ยกเลิก",
      adjustTitle: "ปรับรูปของคุณ",
      save: "บันทึก",
      chooseDifferent: "เลือกรูปอื่น",
      error: "อัปโหลดไม่สำเร็จ ลองอีกครั้ง",
    },
    en: {
      chooseTitle: "Choose your picture",
      fromDevice: "Choose from device",
      useMiomi: "Use Miomi default",
      cancel: "Cancel",
      adjustTitle: "Adjust your photo",
      save: "Save",
      chooseDifferent: "Choose a different photo",
      error: "Upload failed. Please try again.",
    },
  }[uiLang === "th" ? "th" : "en"];

  const inputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_: Area, px: Area) => setAreaPixels(px), []);

  const reset = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAreaPixels(null);
    setError(null);
    setBusy(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    const url = URL.createObjectURL(file);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = url;
    setImageSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleSave = async () => {
    if (!imageSrc || !areaPixels) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await getCroppedBlob(imageSrc, areaPixels);
      const supabase = createClient();
      const path = `${userId}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: updErr } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", userId);
      if (updErr) throw updErr;
      window.dispatchEvent(new Event("miomika:profile-refresh"));
      handleClose();
    } catch {
      setError(C.error);
    } finally {
      setBusy(false);
    }
  };

  const handleUseMiomi = async () => {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: e } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
      if (e) throw e;
      window.dispatchEvent(new Event("miomika:profile-refresh"));
      handleClose();
    } catch {
      setError(C.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 md:items-center"
          onClick={handleClose}
        >
          <motion.div
            data-horizontal-scroll-zone
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-[20px] bg-surface p-6 shadow-float md:max-w-[460px] md:rounded-[20px]"
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />

            {imageSrc ? (
              <>
                <h2 className="mb-4 text-[17px] font-semibold text-ink">{C.adjustTitle}</h2>
                <div className="relative h-[280px] w-full overflow-hidden rounded-[16px] bg-surface-2">
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  />
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  aria-label="zoom"
                  className="mt-4 w-full accent-[var(--mk-accent)]"
                />
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSave()}
                    className="h-12 w-full rounded-full text-[15px] font-semibold text-white shadow-cta disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, var(--mk-accent-grad-from), var(--mk-accent-grad-to))" }}
                  >
                    {C.save}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => inputRef.current?.click()}
                    className="h-11 w-full rounded-full border border-line bg-surface-2 text-[14px] font-semibold text-ink disabled:opacity-60"
                  >
                    {C.chooseDifferent}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleClose}
                    className="h-11 w-full rounded-full text-[14px] font-semibold text-ink-muted"
                  >
                    {C.cancel}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="mb-4 text-[17px] font-semibold text-ink">{C.chooseTitle}</h2>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => inputRef.current?.click()}
                    className="h-12 w-full rounded-full text-[15px] font-semibold text-white shadow-cta disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, var(--mk-accent-grad-from), var(--mk-accent-grad-to))" }}
                  >
                    {C.fromDevice}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleUseMiomi()}
                    className="h-11 w-full rounded-full border border-line bg-surface-2 text-[14px] font-semibold text-ink disabled:opacity-60"
                  >
                    {C.useMiomi}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleClose}
                    className="h-11 w-full rounded-full text-[14px] font-semibold text-ink-muted"
                  >
                    {C.cancel}
                  </button>
                </div>
              </>
            )}

            {error ? <p className="mt-3 text-center text-[13px] text-[#C4564A]">{error}</p> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
