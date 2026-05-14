type MiomiSpeechBubbleProps = {
  children: React.ReactNode;
};

export function MiomiSpeechBubble({ children }: MiomiSpeechBubbleProps) {
  return (
    <div className="max-w-xs rounded-2xl border border-rose-border bg-rose-light px-4 py-3 text-sm text-neutral-800 shadow-sm">
      {children}
    </div>
  );
}
