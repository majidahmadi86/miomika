"use client";

import { Fragment, useState } from "react";
import { adminTd, adminTh } from "@/components/admin/AdminPageHeader";
import { adminPalette, tint } from "@/components/admin/ui";

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
    return <div style={{ fontSize: 12.5, color: adminPalette.subtle }}>No failed events in range.</div>;
  }
  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }} className="admin-table-scroll">
      <table>
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
                style={{
                  cursor: r.payload ? "pointer" : "default",
                  background: tint(adminPalette.rose, 0.04),
                  borderLeft: `3px solid ${adminPalette.rose}`,
                }}
              >
                <td style={{ ...adminTd, whiteSpace: "nowrap", fontSize: 11, color: adminPalette.muted }}>{r.when}</td>
                <td style={adminTd}>{r.source}</td>
                <td style={adminTd}>{r.label}</td>
                <td style={{ ...adminTd, color: adminPalette.rose, fontSize: 12 }}>{(r.detail ?? "·").slice(0, 80)}</td>
              </tr>
              {open === i && r.payload ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      ...adminTd,
                      background: tint(adminPalette.rose, 0.06),
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 11,
                      whiteSpace: "pre-wrap",
                      color: "#4a4742",
                      borderLeft: `3px solid ${adminPalette.rose}`,
                    }}
                  >
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
