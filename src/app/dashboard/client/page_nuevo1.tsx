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
      const me = await getWhoAmI();
      if (!me) { router.replace("/login"); return; }
      if (me.perfilid === 0) { router.replace("/dashboard/admin"); return; }
      setOk(true);
    })();
  }, [router]);

  if (!ok) return <div className="p-6">Cargando…</div>;

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-bold">📊 Panel Cliente</h1>
        <p className="text-gray-600 mt-1">Administra perfiles, usuarios e integración con Siigo y accede a reportes agrupados por categoría.</p>
      </div>

      {/* Consulta y configuración */}
      <section>
        <h2 className="text-lg font-semibold mb-2">🔧 Consulta y Configuración</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/dashboard/client/profiles" className="block rounded-lg border p-4 hover:bg-gray-50">
            <h3 className="font-semibold">Perfiles</h3>
            <p className="text-sm text-gray-600">Crea y edita los perfiles de tu empresa.</p>
          </Link>
          <Link href="/dashboard/client/users" className="block rounded-lg border p-4 hover:bg-gray-50">
            <h3 className="font-semibold">Usuarios</h3>
            <p className="text-sm text-gray-600">Gestiona los usuarios y sus accesos.</p>
          </Link>
          <Link href="/dashboard/client/integrations/siigo" className="block rounded-lg border p-4 hover:bg-gray-50">
            <h3 className="font-semibold">Integración Siigo</h3>
            <p className="text-sm text-gray-600">Configura credenciales de la API de Siigo y sincroniza datos.</p>
          </Link>
        </div>
      </section>

      {/* Reportes de Ventas */}
      <section>
        <h2 className="text-lg font-semibold mb-2">📈 Reportes de Ventas</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/reportes/financiero" className="block rounded-lg border p-4 hover:bg-gray-50">
            <h3 className="font-semibold">Ingresos por Ventas</h3>
            <p className="text-sm text-gray-600">Facturas mes a mes, top 5 clientes y estado de pago.</p>
          </Link>
          <Link href="/reportes/vendedores" className="block rounded-lg border p-4 hover:bg-gray-50">
            <h3 className="font-semibold">Ventas por Vendedor</h3>
            <p className="text-sm text-gray-600">Top 5 vendedores, ventas y cantidad de facturas por vendedor.</p>
          </Link>
          <Link href="/reportes/productos" className="block rounded-lg border p-4 hover:bg-gray-50">
            <h3 className="font-semibold">Ventas por Producto</h3>
            <p className="text-sm text-gray-600">Detalle evolución ventas por producto y top 10 más y menos vendidos.</p>
          </Link>
        </div>
      </section>

      {/* Reportes de Costos */}
      <section>
        <h2 className="text-lg font-semibold mb-2">💸 Reportes de Costos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/reportes/financiero/cxc" className="block rounded-lg border p-4 hover:bg-gray-50">
            <h3 className="font-semibold">Egresos por Compras/Gastos</h3>
            <p className="text-sm text-gray-600">Análisis cartera por clientes y edades.</p>
          </Link>
          <Link href="/reportes/financiero/nomina" className="block rounded-lg border p-4 hover:bg-gray-50">
            <h3 className="font-semibold">Costos Nómina</h3>
            <p className="text-sm text-gray-600">Costos mes a mes, por conceptos y empleados.</p>
          </Link>
          <Link href="/reportes/compras/proveedores" className="block rounded-lg border p-4 hover:bg-gray-50">
            <h3 className="font-semibold">Compras a Proveedores</h3>
            <p className="text-sm text-gray-600">Facturas de compra, top 15 proveedores y estado de pago.</p>
          </Link>
        </div>
      </section>

      {/* Reportes de Clientes y Cartera */}
      <section>
        <h2 className="text-lg font-semibold mb-2">👥 Clientes y Cartera</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/reportes/clientes" className="block rounded-lg border p-4 hover:bg-gray-50">
            <h3 className="font-semibold">Facturación Clientes</h3>
            <p className="text-sm text-gray-600">Facturación por cliente y centro de costo.</p>
          </Link>
          <Link href="/reportes/financiero/cxc" className="block rounded-lg border p-4 hover:bg-gray-50">
            <h3 className="font-semibold">Cuentas por Cobrar</h3>
            <p className="text-sm text-gray-600">Análisis de cartera por clientes y edades.</p>
          </Link>
        </div>
      </section>

      {/* Reportes Especiales */}
      <section>
        <h2 className="text-lg font-semibold mb-2">🌟 Reportes Especiales</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/reportes/financiero/consolidado" className="block rounded-lg border p-4 hover:bg-gray-50">
            <h3 className="font-semibold">Financiero Consolidado</h3>
            <p className="text-sm text-gray-600">Facturación vs gastos, top clientes y proveedores.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
