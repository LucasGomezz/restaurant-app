import { NavBar } from "@/components/NavBar";
import { requireProfile } from "@/lib/auth/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Signed-in users without a profile finish setting it up first.
  const { profile } = await requireProfile();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <NavBar username={profile.username} />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
