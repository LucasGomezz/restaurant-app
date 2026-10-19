import { NavBar } from "@/components/NavBar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <NavBar />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
