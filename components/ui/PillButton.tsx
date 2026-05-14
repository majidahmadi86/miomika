import { cn } from "@/lib/utils";

type PillButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export function PillButton({
  className,
  variant = "primary",
  ...props
}: PillButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-medium transition-colors",
        variant === "primary" &&
          "bg-rose-accent text-white hover:bg-rose-mid",
        variant === "ghost" &&
          "border border-rose-border bg-transparent text-rose-accent hover:bg-rose-light",
        className,
      )}
      {...props}
    />
  );
}
