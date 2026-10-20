import { cookies } from "next/headers";
import { AppShell } from "@/components/AppShell";
import { requireProfile } from "@/lib/auth/session";
import { getMyFolders } from "@/lib/queries/folders";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Signed-in users without a profile finish setting it up first.
  const { profile } = await requireProfile();
  const [folders, cookieStore] = await Promise.all([getMyFolders(), cookies()]);

  return (
    <AppShell
      username={profile.username}
      folders={folders.map(({ id, name, icon, role }) => ({ id, name, icon, role }))}
      initiallyCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed"}
    >
      {children}
    </AppShell>
  );
}
