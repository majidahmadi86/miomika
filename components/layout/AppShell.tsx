import { BottomNav } from "@/components/ui/BottomNav";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-white md:h-auto md:max-h-none md:min-h-screen md:overflow-visible">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
      <div className="shrink-0 md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
