import { cn } from "@/lib/utils";

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-rose-border bg-white p-4 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
