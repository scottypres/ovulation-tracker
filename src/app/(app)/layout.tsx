import { BottomNav } from "@/components/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto w-full max-w-md">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
