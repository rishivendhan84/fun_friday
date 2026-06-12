import UserProvider from "@/components/UserProvider";
import RealtimeProvider from "@/lib/realtime";
import NavShell from "@/components/NavShell";
import InviteOverlay from "@/components/InviteOverlay";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <RealtimeProvider>
        <NavShell>{children}</NavShell>
        <InviteOverlay />
      </RealtimeProvider>
    </UserProvider>
  );
}
