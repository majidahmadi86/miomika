import type { CSSProperties, ReactNode } from "react";
import { FONT_DISPLAY, adminPalette } from "@/components/admin/ui";

/** Unified page header for every admin tab. */
export default function AdminPageHeader({
  title,
  rangeLabel,
  actions,
}: {
  title: string;
  rangeLabel: string;
  actions?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 14,
        flexWrap: "wrap",
      }}
    >
      <div>
        <h1
          style={{
            fontSize: 16,
            fontWeight: 700,
            margin: 0,
            color: adminPalette.ink,
            letterSpacing: "-0.01em",
            fontFamily: FONT_DISPLAY,
          }}
        >
          {title}
        </h1>
        <div style={{ fontSize: 11.5, color: adminPalette.muted, marginTop: 2 }}>{rangeLabel}</div>
      </div>
      {actions ? <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{actions}</div> : null}
    </div>
  );
}

/** Re-export tokens so existing page imports keep working. */
export {
  adminPalette as adminTokens,
  adminCard,
  adminKpi,
  adminTh,
  adminTd,
  adminPagePad,
  filterPanel,
  applyBtn,
  inputStyle,
  FONT_DISPLAY,
} from "@/components/admin/ui";

export type { CSSProperties };
