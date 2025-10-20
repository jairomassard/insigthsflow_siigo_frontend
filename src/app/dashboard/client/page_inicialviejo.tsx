// src/app/dashboard/client/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getWhoAmI } from "@/lib/authInfo";

export default function ClientHome() {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      // Proteger la vista: requiere login y que NO sea superadmin
      const me = await getWhoAmI();
      if (!me) { router.replace("/login"); return; }
      if (me.perfilid === 0) { router.replace("/dashboard/admin"); return; }
      setOk(true);
    })();
  }, [router]);

  if (!ok) return <div className="p-6">Cargando…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel Cliente</h1>
        <p className="text-gray-600">Administra tus perfiles, usuarios e integración con Siigo y consulta diferentes reportes.</p>
      </div>

      <div>
        <h1 className="text-m font-bold">Consulta y configuación</h1>
        
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/client/profiles"
          className="block rounded-lg border p-4 hover:bg-gray-50"
        >
          <h2 className="font-semibold">Perfiles</h2>
          <p className="text-sm text-gray-600">Crea y edita los perfiles de tu empresa.</p>
        </Link>

        <Link
          href="/dashboard/client/users"    
          className="block rounded-lg border p-4 hover:bg-gray-50"
        >
          <h2 className="font-semibold">Usuarios</h2>
          <p className="text-sm text-gray-600">Gestiona los usuarios y sus accesos.</p>
        </Link>

        <Link
          href="/dashboard/client/integrations/siigo"
          className="block rounded-lg border p-4 hover:bg-gray-50"
        >
          <h2 className="font-semibold">Panel de integración Siigo</h2>
          <p className="text-sm text-gray-600">Configura tus credenciales de la API de Siigo y sincroniza Información.</p>
        </Link>
      </div>

      <div>
        <h1 className="text-m font-bold">Reportes</h1>
        
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/reportes/financiero"
          className="block rounded-lg border p-4 hover:bg-gray-50"
        >
          <h2 className="font-semibold">Reporte Ingresos por Ventas</h2>
          <p className="text-sm text-gray-600">Revisa Total Facturas mes a mes, top 5 Clientes y estado de pago.</p>
        </Link>
        <Link
          href="/reportes/financiero/cxc"
          className="block rounded-lg border p-4 hover:bg-gray-50"
        >
          <h2 className="font-semibold">Reporte Egresos por Compras/Gastos</h2>
          <p className="text-sm text-gray-600">Analiza la cartera por clientes y edades.</p>
        </Link>

        <Link
          href="/reportes/financiero/consolidado" 
          className="block rounded-lg border p-4 hover:bg-gray-50"
        >
          <h2 className="font-semibold">Reporte Financiero Consolidado</h2>
          <p className="text-sm text-gray-600">Muestra Facturación Vs Gastos y Top clientes y proveedores.</p>
        </Link>

      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/reportes/clientes"
          className="block rounded-lg border p-4 hover:bg-gray-50"
        >
          <h2 className="font-semibold">Reporte Facturacion clientes</h2>
          <p className="text-sm text-gray-600">Revisa Facturacion por cliente y centro de costo (cantidad, estado de pago).</p>
        </Link>

        <Link
          href="/reportes/financiero/cxc"
          className="block rounded-lg border p-4 hover:bg-gray-50"
        >
          <h2 className="font-semibold">Reporte Cuentas por Cobrar a Clientes (Cartera)</h2>
          <p className="text-sm text-gray-600">Analiza la cartera por clientes y edades.</p>
        </Link>

        <Link
          href="/reportes/vendedores"
          className="block rounded-lg border p-4 hover:bg-gray-50"
        >
          <h2 className="font-semibold">Reporte Ventas por Vendedor</h2>
          <p className="text-sm text-gray-600">Revisa las ventas y cantidad de facturas vendidas de cada uno de los vendedores, y un Top 5 de mejores vendedores.</p>
        </Link>

      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/reportes/financiero/nomina"
          className="block rounded-lg border p-4 hover:bg-gray-50"
        >
          <h2 className="font-semibold">Reporte Costos Nómina</h2>
          <p className="text-sm text-gray-600">Revisa Costos de Nomina Mes a Mes, por diferentes conceptos para cada empleado.</p>
        </Link>

        <Link
          href="/reportes/compras/proveedores"
          className="block rounded-lg border p-4 hover:bg-gray-50"
        >
          <h2 className="font-semibold">Reporte compras a Proveedores</h2>
          <p className="text-sm text-gray-600">Revisa Facturas de compra mes a mes, top 15 proveeores y estado de pago.</p>
        </Link>

        <Link
          href="/reportes/productos"
          className="block rounded-lg border p-4 hover:bg-gray-50"
        >
          <h2 className="font-semibold">Reporte Ventas por Producto</h2>
          <p className="text-sm text-gray-600">Revisa las ventas por producto, el detalle de evolucion en ventas y un top 10 mas vendidos y menos vendidos.</p>
        </Link>

      </div>
    </div>
  );
}
