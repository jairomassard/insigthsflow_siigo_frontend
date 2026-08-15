import ClientAppShell from "@/components/ClientAppShell";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <ClientAppShell>{children}</ClientAppShell>;
}
