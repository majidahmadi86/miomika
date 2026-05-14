import { BottomNav } from "@/components/ui/BottomNav";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col pb-14 md:pb-0">
      <div className="flex-1">{children}</div>
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
