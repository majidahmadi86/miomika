import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tapFeedback =
  "transition-transform active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const toneStyles = {
  teal: {
    surface: "bg-accent-soft",
    icon: "text-accent",
    border: "border-line",
  },
  violet: {
    surface: "bg-[#F0EDF8]",
    icon: "text-[#7C6BB8]",
    border: "border-[#E4DFF0]",
  },
  pink: {
    surface: "bg-warm-soft",
    icon: "text-warm",
    border: "border-line-strong",
  },
} as const;

type ActionTileProps = {
  icon: LucideIcon;
  label: string;
  sub: string;
  tone: keyof typeof toneStyles;
  href: string;
  className?: string;
};

export function ActionTile({ icon: Icon, label, sub, tone, href, className }: ActionTileProps) {
  const styles = toneStyles[tone];

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-2 rounded-tile border p-4 text-center shadow-card",
        styles.surface,
        styles.border,
        tapFeedback,
        className,
      )}
    >
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-full bg-surface shadow-sm", styles.icon)}>
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-[11px] text-ink-muted">{sub}</p>
      </div>
    </Link>
  );
}
