/**
 * Native shell detection. Inside the Capacitor app (Android/iOS), the runtime
 * injects window.Capacitor into the remote page. Store rules forbid selling
 * digital goods through outside payment systems in-app, so billing surfaces
 * check this flag and turn purchase buttons into information (the Netflix
 * model: buy on miomika.com in a browser, use everywhere).
 */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  try {
    return !!cap?.isNativePlatform?.();
  } catch {
    return false;
  }
}
