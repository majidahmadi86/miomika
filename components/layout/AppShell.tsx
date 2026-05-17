import { BottomNav } from "@/components/ui/BottomNav";

type AppShellProps = {
  children: React.ReactNode;
  showNav?: boolean;
};

export function AppShell({ children, showNav = true }: AppShellProps) {
  return (
    <div className="relative flex h-svh max-h-svh flex-col overflow-hidden bg-white md:h-screen md:max-h-screen md:overflow-hidden">
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      {showNav && <BottomNav />}
    </div>
  );
}