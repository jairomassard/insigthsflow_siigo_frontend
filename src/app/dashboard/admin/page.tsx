// src/app/dashboard/admin/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getWhoAmI } from "@/lib/authInfo";

export default function AdminHome() {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      // Proteger: solo superadmin
      const me = await getWhoAmI();
      if (!me) { router.replace("/login"); return; }
      if (me.perfilid !== 0) { router.replace("/dashboard/client"); return; }
      setOk(true);
    })();
  }, [router]);

  if (!ok) return <div className="p-6">Cargando…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel SuperAdmin</h1>
        <p className="text-gray-600">
          Desde aquí puedes gestionar clientes, perfiles y usuarios del sistema.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/admin/clients"
          className="block rounded-lg border p-4 hover:bg-gray-50"
        >
          <h2 className="font-semibold">Clientes</h2>
          <p className="text-sm text-gray-600">Crea y administra clientes del sistema.</p>
        </Link>

        <Link
          href="/dashboard/admin/profiles"
          className="block rounded-lg border p-4 hover:bg-gray-50"
        >
          <h2 className="font-semibold">Perfiles</h2>
          <p className="text-sm text-gray-600">Configura perfiles de acceso para clientes.</p>
        </Link>

        <Link
          href="/dashboard/admin/users"
          className="block rounded-lg border p-4 hover:bg-gray-50"
        >
          <h2 className="font-semibold">Usuarios</h2>
          <p className="text-sm text-gray-600">Gestiona todos los usuarios registrados.</p>
        </Link>
      </div>
    </div>
  );
}

