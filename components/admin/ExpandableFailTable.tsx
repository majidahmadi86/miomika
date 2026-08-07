"use client";

import { Fragment, useState } from "react";
import { adminTd, adminTh } from "@/components/admin/AdminPageHeader";

export type FailRow = {
  source: string;
  when: string;
  label: string;
  detail: string | null;
  payload: string | null;
};

export default function ExpandableFailTable({ rows }: { rows: FailRow[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (rows.length === 0) {
    return <div style={{ fontSize: 12.5, color: "#B0A488" }}>No failed events in range.</div>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={adminTh}>When</th>
            <th style={adminTh}>Source</th>
            <th style={adminTh}>Label</th>
            <th style={adminTh}>Detail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <Fragment key={i}>
              <tr
                onClick={() => setOpen(open === i ? null : i)}
                style={{ cursor: r.payload ? "pointer" : "default" }}
              >
                <td style={{ ...adminTd, whiteSpace: "nowrap", fontSize: 11, color: "#6b675f" }}>{r.when}</td>
                <td style={adminTd}>{r.source}</td>
                <td style={adminTd}>{r.label}</td>
                <td style={{ ...adminTd, color: "#A32D2D", fontSize: 12 }}>{(r.detail ?? "·").slice(0, 80)}</td>
              </tr>
              {open === i && r.payload ? (
                <tr>
                  <td colSpan={4} style={{ ...adminTd, background: "#FBFAF6", fontFamily: "ui-monospace, monospace", fontSize: 11, whiteSpace: "pre-wrap", color: "#4a4742" }}>
                    {r.payload}
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
