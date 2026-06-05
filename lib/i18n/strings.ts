/**
 * Lightweight string table. No i18n library — just a typed lookup.
 *
 * Add strings here as you encounter hardcoded ones in components. Warm
 * Miomi phrases go in lib/voice/warmth.ts, NOT here. This file is for
 * functional UI chrome: button labels, headings, form errors, etc.
 */

export type Lang = "th" | "en";

const STRINGS = {
  // Auth surfaces
  welcome_back: {
    th: "ยินดีต้อนรับกลับค่า~",
    en: "Welcome back~",
  },
  welcome_back_subtitle: {
    th: "Welcome back",
    en: "Sign in to continue",
  },
  sign_in: {
    th: "เข้าสู่ระบบ / Login",
    en: "Sign in",
  },
  sign_up: {
    th: "สมัครสมาชิก / Sign up",
    en: "Sign up",
  },
  signin_google: {
    th: "เข้าสู่ระบบด้วย Google",
    en: "Continue with Google",
  },
  signup_google: {
    th: "สมัครด้วย Google",
    en: "Sign up with Google",
  },
  signin_google_connecting: {
    th: "กำลังเชื่อมต่อ...",
    en: "Connecting...",
  },
  divider_or_email: {
    th: "หรือใช้อีเมล",
    en: "or use email",
  },
  email_label: { th: "Email", en: "Email" },
  password_label: { th: "Password", en: "Password" },
  password_confirm_label: { th: "Confirm password", en: "Confirm password" },
  back_to_home: { th: "กลับหน้าหลัก", en: "Back to home" },
  no_account_yet: {
    th: "ยังไม่มีบัญชี? สมัครเลยค่า",
    en: "No account yet? Sign up~",
  },
  have_account: {
    th: "มีบัญชีแล้ว? เข้าสู่ระบบค่า",
    en: "Have an account? Sign in",
  },
  signup_start: {
    th: "มาเริ่มต้นด้วยกันนะคะ~",
    en: "Let's get started~",
  },
  signup_subtitle: {
    th: "Create your account",
    en: "Create your account",
  },

  // Welcome screen
  welcome_intro: {
    th: "ยินดีต้อนรับนะคะ~\nหนูรอคุณอยู่ค่า",
    en: "Welcome~\nI've been waiting for you",
  },
  welcome_caption: {
    th: "Welcome · I've been waiting",
    en: "Welcome · I've been waiting",
  },

  // Companion
  companion_aria: {
    th: "คุยกับมิโอมิ — Talk to Miomi",
    en: "Talk to Miomi",
  },
  companion_open_fullscreen: {
    th: "ขยายเต็มจอ",
    en: "Open in deep-focus",
  },
  companion_dismiss: {
    th: "ปิด",
    en: "Close",
  },
  companion_open_in_talk: {
    th: "คุยแบบเต็มจอ · Open in deep-focus mode",
    en: "Open in deep-focus mode",
  },

  // Home CTA
  cta_talk_to_miomi: {
    th: "คุยกับมิโอมิ",
    en: "Talk to Miomi",
  },
  cta_talk_to_miomi_sub: {
    th: "Talk to Miomi",
    en: "Tap to chat",
  },

  // Desktop hold banner
  desktop_hold_banner: {
    th: "หนูทำงานดีที่สุดบนมือถือค่า~ เปิดบน iPhone หรือ Android เพื่อประสบการณ์เต็มรูปแบบ",
    en: "I work best on mobile~ Open on iPhone or Android for the full experience",
  },

  // PWA update delivery
  pwa_update_ready: {
    th: "มีเวอร์ชันใหม่แล้วค่า — กดรีเฟรชเพื่ออัปเดต",
    en: "New version ready — reload to update",
  },
  pwa_update_reload: {
    th: "รีเฟรช",
    en: "Reload",
  },

  // Mic / unsupported browser
  mic_unsupported_chrome: {
    th: "เปิดใน Chrome เพื่อใช้เสียงค่า~",
    en: "Open in Chrome to use voice~",
  },
  mic_unsupported_typing_ok: {
    th: "พิมพ์ข้อความได้เลยค่า~",
    en: "Just type, that works too~",
  },
  mic_permission_denied: {
    th: "ไม่ได้รับอนุญาตใช้ไมค์ค่า~",
    en: "Mic permission denied~",
  },
} as const satisfies Record<string, Record<Lang, string>>;

export type StringKey = keyof typeof STRINGS;

export function tr(key: StringKey, lang: Lang): string {
  const row = STRINGS[key];
  return row[lang];
}

export const t = STRINGS;
