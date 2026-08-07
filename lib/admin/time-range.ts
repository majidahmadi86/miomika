/** Admin console time-range parsing. Presets write ?range=; custom uses ?range=custom&from=&to=. */

export type RangePreset = "24h" | "7d" | "30d" | "90d" | "custom";
export type TimeBucket = "hour" | "day" | "month";

export type ParsedRange = {
  preset: RangePreset;
  from: Date;
  to: Date;
  bucket: TimeBucket;
  /** Short echo for page headers, e.g. "7d · May 1 · May 8". */
  label: string;
  /** Query fragment to preserve across tab links (no leading ?). */
  queryString: string;
};

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function pickBucket(from: Date, to: Date, preset: RangePreset): TimeBucket {
  if (preset === "24h") return "hour";
  const ms = to.getTime() - from.getTime();
  if (ms <= 2 * 864e5) return "hour";
  if (ms <= 100 * 864e5) return "day";
  return "month";
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function buildQuery(preset: RangePreset, from: Date, to: Date): string {
  if (preset === "custom") {
    return `range=custom&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
  }
  return `range=${preset}`;
}

function labelFor(preset: RangePreset, from: Date, to: Date): string {
  if (preset === "custom") return `custom · ${fmtShort(from)} · ${fmtShort(to)}`;
  return `${preset} · ${fmtShort(from)} · ${fmtShort(to)}`;
}

/**
 * Parse admin search params into a concrete [from, to) window + bucket size.
 * Defaults to 7d when missing/invalid.
 */
export function parseRange(
  searchParams: Record<string, string | string[] | undefined> | URLSearchParams,
): ParsedRange {
  const get = (k: string) =>
    searchParams instanceof URLSearchParams ? (searchParams.get(k) ?? "") : one(searchParams[k]);

  const raw = (get("range") || "7d").toLowerCase();
  const now = new Date();
  const to = new Date(now);

  const presets: Record<Exclude<RangePreset, "custom">, number> = {
    "24h": 864e5,
    "7d": 7 * 864e5,
    "30d": 30 * 864e5,
    "90d": 90 * 864e5,
  };

  if (raw === "custom") {
    const fromRaw = get("from");
    const toRaw = get("to");
    const fromDate = fromRaw ? new Date(fromRaw) : new Date(now.getTime() - 7 * 864e5);
    const toDate = toRaw ? new Date(toRaw) : now;
    const from = Number.isFinite(fromDate.getTime()) ? fromDate : new Date(now.getTime() - 7 * 864e5);
    let end = Number.isFinite(toDate.getTime()) ? toDate : now;
    if (end.getTime() <= from.getTime()) end = new Date(from.getTime() + 864e5);
    // Inclusive end-of-day when the param is a bare date (YYYY-MM-DD).
    if (/^\d{4}-\d{2}-\d{2}$/.test(toRaw)) {
      end = new Date(toRaw + "T23:59:59.999Z");
    }
    const preset: RangePreset = "custom";
    return {
      preset,
      from,
      to: end,
      bucket: pickBucket(from, end, preset),
      label: labelFor(preset, from, end),
      queryString: buildQuery(preset, from, end),
    };
  }

  const preset = (raw in presets ? raw : "7d") as Exclude<RangePreset, "custom">;
  const from = new Date(now.getTime() - presets[preset]);
  return {
    preset,
    from,
    to,
    bucket: pickBucket(from, to, preset),
    label: labelFor(preset, from, to),
    queryString: buildQuery(preset, from, to),
  };
}

/** Equal-length window immediately before `range` (for KPI deltas). */
export function previousPeriod(range: ParsedRange): { from: Date; to: Date } {
  const span = range.to.getTime() - range.from.getTime();
  return {
    from: new Date(range.from.getTime() - span),
    to: new Date(range.from.getTime()),
  };
}

/** ISO strings for PostgREST filters. */
export function rangeIso(range: { from: Date; to: Date }): { fromIso: string; toIso: string } {
  return { fromIso: range.from.toISOString(), toIso: range.to.toISOString() };
}

/** Append range query onto an admin path (preserves other params if given). */
export function withRange(href: string, queryString: string): string {
  if (!queryString) return href;
  const [path, existing] = href.split("?");
  const merged = new URLSearchParams(existing ?? "");
  const add = new URLSearchParams(queryString);
  for (const [k, v] of add.entries()) merged.set(k, v);
  const qs = merged.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Floor a date to the start of its bucket (UTC). */
export function bucketStart(d: Date, bucket: TimeBucket): Date {
  const x = new Date(d);
  if (bucket === "hour") {
    x.setUTCMinutes(0, 0, 0);
    return x;
  }
  if (bucket === "day") {
    x.setUTCHours(0, 0, 0, 0);
    return x;
  }
  x.setUTCDate(1);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

/** Advance one bucket. */
export function nextBucket(d: Date, bucket: TimeBucket): Date {
  const x = new Date(d);
  if (bucket === "hour") {
    x.setUTCHours(x.getUTCHours() + 1);
    return x;
  }
  if (bucket === "day") {
    x.setUTCDate(x.getUTCDate() + 1);
    return x;
  }
  x.setUTCMonth(x.getUTCMonth() + 1);
  return x;
}

/** Empty series of {t, v:0} covering [from, to]. */
export function emptyBuckets(from: Date, to: Date, bucket: TimeBucket): { t: string; v: number }[] {
  const out: { t: string; v: number }[] = [];
  let cur = bucketStart(from, bucket);
  const end = to.getTime();
  let guard = 0;
  while (cur.getTime() < end && guard < 2000) {
    out.push({ t: cur.toISOString(), v: 0 });
    cur = nextBucket(cur, bucket);
    guard++;
  }
  return out;
}

export function formatBucketLabel(iso: string, bucket: TimeBucket): string {
  const d = new Date(iso);
  if (bucket === "hour") {
    return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", hour12: false });
  }
  if (bucket === "day") {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}
