export type ModelTier = "free" | "paid";

export function routeModel(tier: ModelTier): string {
  return tier === "paid"
    ? "claude-sonnet-4-20250514"
    : "claude-haiku-4-5-20251001";
}
