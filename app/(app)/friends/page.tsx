import { AppShell } from "@/components/layout/AppShell";

export default function FriendsPage() {
  return (
    <AppShell>
      <div className="flex h-full min-h-0 flex-col overflow-hidden px-3 pt-2">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <h1 className="text-lg font-semibold text-rose-accent">Friends</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Placeholder friends list.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
