import { BottomNav } from "@/components/ui/BottomNav";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative flex h-svh max-h-svh flex-col overflow-hidden bg-white md:h-auto md:max-h-none md:overflow-visible">
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      <BottomNav />
    </div>
  );
}
