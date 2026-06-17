"use client";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function BackButton({
  fallback = "/me",
  label,
  className,
}: {
  fallback?: string;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className={className}
    >
      <ChevronLeft className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
