/**
 * Browser detection for Web Speech API (SpeechRecognition).
 *
 * iOS Safari requires `webkitSpeechRecognition`; many Android browsers expose
 * the non-prefixed `SpeechRecognition`. Samsung Internet ships neither (it
 * advertises voice via its own assistant). Firefox has no implementation.
 *
 * The status function is SSR-safe (returns unsupported on the server).
 *
 * MIOMIKA.md §8 Phase 2 (Block A2 — mobile voice input).
 */

export type SpeechUnsupportedReason =
  | "no_api"
  | "samsung_internet"
  | "firefox"
  | "in_app_browser"
  | "unknown";

export interface SpeechSupportStatus {
  supported: boolean;
  reason?: SpeechUnsupportedReason;
}

export function speechRecognitionStatus(): SpeechSupportStatus {
  if (typeof window === "undefined") {
    return { supported: false, reason: "no_api" };
  }

  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes("samsungbrowser")) {
    return { supported: false, reason: "samsung_internet" };
  }
  if (ua.includes("firefox") || ua.includes("fxios")) {
    return { supported: false, reason: "firefox" };
  }
  // In-app browsers (Facebook, Instagram, LINE, etc.) typically lack the API.
  if (
    /fban|fbav|fbios|instagram|line\/|wv\)|webview/.test(ua) &&
    !ua.includes("safari")
  ) {
    return { supported: false, reason: "in_app_browser" };
  }

  const hasAPI =
    "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
  if (!hasAPI) return { supported: false, reason: "no_api" };

  return { supported: true };
}

export function getSpeechRecognitionConstructor():
  | (new () => SpeechRecognitionLike)
  | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Trimmed SpeechRecognition interface. The full DOM types aren't shipped by
 * default in TS lib.dom, so we declare just what we use.
 */
export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: Event & { error?: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string; confidence: number };
    };
  };
}

export function unsupportedCopy(
  reason: SpeechUnsupportedReason | undefined,
  lang: "th" | "en",
): { primary: string; secondary: string } {
  switch (reason) {
    case "samsung_internet":
      return lang === "th"
        ? {
            primary: "เปิดใน Chrome เพื่อใช้เสียง~ หรือพิมพ์ก็ได้ค่า",
            secondary: "Samsung Internet ไม่รองรับไมค์ค่า",
          }
        : {
            primary: "Open in Chrome for voice~ or just type below",
            secondary: "Samsung Internet doesn't support the mic",
          };
    case "in_app_browser":
      return lang === "th"
        ? {
            primary: "เปิดใน Chrome เพื่อใช้เสียง~ หรือพิมพ์ก็ได้ค่า",
            secondary: "แอปในแอปไม่รองรับไมค์ค่า",
          }
        : {
            primary: "Open in Chrome for voice~ or just type below",
            secondary: "In-app browsers don't support the mic",
          };
    case "firefox":
      return lang === "th"
        ? {
            primary: "ใช้เสียงไม่ได้ค่า~ พิมพ์ได้เลยนะ",
            secondary: "Firefox ไม่รองรับไมค์ค่า",
          }
        : {
            primary: "Voice unavailable~ just type below",
            secondary: "Firefox doesn't support the mic",
          };
    default:
      return lang === "th"
        ? {
            primary: "พิมพ์ข้อความได้เลยค่า~",
            secondary: "Voice ใช้ไม่ได้บนบราวเซอร์นี้",
          }
        : {
            primary: "Just type, that works too~",
            secondary: "Voice isn't available in this browser",
          };
  }
}
