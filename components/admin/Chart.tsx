"use client";

import dynamic from "next/dynamic";

function ChartSkeleton({ height = 200 }: { height?: number }) {
  return <div style={{ height, background: "#F7F4EE", borderRadius: 8 }} aria-hidden />;
}

/** Recharts wrappers · admin-only · never SSR so the lib stays out of user bundles. */
export const AdminLineChart = dynamic(
  () => import("./ChartInner").then((m) => m.AdminLineChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

export const AdminBarChart = dynamic(
  () => import("./ChartInner").then((m) => m.AdminBarChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

export const AdminAreaChart = dynamic(
  () => import("./ChartInner").then((m) => m.AdminAreaChart),
  { ssr: false, loading: () => <ChartSkeleton height={120} /> },
);

export const AdminSparkline = dynamic(
  () => import("./ChartInner").then((m) => m.AdminSparkline),
  { ssr: false, loading: () => <div style={{ height: 36 }} /> },
);
