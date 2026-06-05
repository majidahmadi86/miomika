/** Ephemeral Live token caps — server-only mint; browser receives token.name only. */

export const LIVE_TOKEN_GUEST_SESSION_MINUTES = 5;
export const LIVE_TOKEN_GUEST_EXPIRE_MINUTES = 10;
export const LIVE_TOKEN_MEMBER_SESSION_MINUTES = 1;
export const LIVE_TOKEN_MEMBER_EXPIRE_MINUTES = 30;

export function liveTokenDurations(isGuest: boolean): {
  sessionMinutes: number;
  expireMinutes: number;
} {
  return isGuest
    ? {
        sessionMinutes: LIVE_TOKEN_GUEST_SESSION_MINUTES,
        expireMinutes: LIVE_TOKEN_GUEST_EXPIRE_MINUTES,
      }
    : {
        sessionMinutes: LIVE_TOKEN_MEMBER_SESSION_MINUTES,
        expireMinutes: LIVE_TOKEN_MEMBER_EXPIRE_MINUTES,
      };
}
