import type { CSSProperties, ReactNode } from "react";

const titleStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  margin: 0,
  color: "#2A2A28",
  letterSpacing: "-0.01em",
};

const echoStyle: CSSProperties = {
  fontSize: 11.5,
  color: "#9A8B73",
  marginTop: 2,
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 14,
  flexWrap: "wrap",
};

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
    <div style={rowStyle}>
      <div>
        <h1 style={titleStyle}>{title}</h1>
        <div style={echoStyle}>{rangeLabel}</div>
      </div>
      {actions ? <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{actions}</div> : null}
    </div>
  );
}

/** Shared dense card / table tokens for the admin cockpit. */
export const adminTokens = {
  teal: "#34A98F",
  tealStrong: "#1F7A68",
  tealSoft: "#EAF6F1",
  tealBorder: "#C9E5DC",
  ink: "#2A2A28",
  muted: "#9A8B73",
  subtle: "#B0A488",
  line: "#EDE8E0",
  lineSoft: "#F2EEE7",
  surface: "#fff",
  canvas: "#FBFAF6",
  danger: "#A32D2D",
  dangerSoft: "#FCEBEB",
  warn: "#854F0B",
  warnSoft: "#FAEEDA",
  ok: "#1D9E75",
} as const;

export const adminCard: CSSProperties = {
  background: adminTokens.surface,
  border: `0.5px solid ${adminTokens.line}`,
  borderRadius: 10,
  padding: "12px 14px",
};

export const adminKpi: CSSProperties = {
  background: adminTokens.surface,
  border: `0.5px solid ${adminTokens.line}`,
  borderRadius: 10,
  padding: "10px 12px",
};

export const adminTh: CSSProperties = {
  textAlign: "left",
  padding: "7px 10px",
  fontSize: 11,
  color: adminTokens.muted,
  fontWeight: 600,
  borderBottom: `0.5px solid ${adminTokens.line}`,
  whiteSpace: "nowrap",
};

export const adminTd: CSSProperties = {
  padding: "7px 10px",
  fontSize: 12.5,
  borderBottom: `0.5px solid ${adminTokens.lineSoft}`,
  color: adminTokens.ink,
};

export const adminPagePad: CSSProperties = {
  padding: "14px 16px 56px",
};
