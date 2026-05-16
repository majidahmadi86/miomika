import { BottomNav } from "@/components/ui/BottomNav";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-svh max-h-svh min-h-0 w-full flex-col overflow-hidden bg-white md:h-full md:max-h-none md:min-h-0">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:min-h-0">
        {children}
      </div>
      <div className="shrink-0 md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
