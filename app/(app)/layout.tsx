import UserProvider from "@/components/UserProvider";
import NavShell from "@/components/NavShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <NavShell>{children}</NavShell>
    </UserProvider>
  );
}
