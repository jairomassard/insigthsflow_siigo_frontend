// src/app/dashboard/admin/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { getWhoAmI } from "@/lib/authInfo";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await getWhoAmI();
      if (!me) { router.replace("/login"); return; }
      if (me.perfilid !== 0) { router.replace("/dashboard/client"); return; }
      setOk(true);
    })();
  }, [router]);

  if (!ok) return <div className="p-6">Cargando…</div>;

  return (
    <div className="min-h-screen grid grid-cols-12">
      <aside className="col-span-12 md:col-span-3 lg:col-span-2 bg-gray-100 p-4">
        <nav className="space-y-2">
          <a className="block rounded px-3 py-2 hover:bg-gray-200" href="/dashboard/admin">Inicio</a>
          <a className="block rounded px-3 py-2 hover:bg-gray-200" href="/dashboard/admin/clients">Clientes</a>
          <a className="block rounded px-3 py-2 hover:bg-gray-200" href="/dashboard/admin/profiles">Perfiles</a>
          <a className="block rounded px-3 py-2 hover:bg-gray-200" href="/dashboard/admin/users">Usuarios</a>

          <div className="pt-4"><LogoutButton /></div>
        </nav>
      </aside>
      <section className="col-span-12 md:col-span-9 lg:col-span-10 p-6">{children}</section>
    </div>
  );
}


