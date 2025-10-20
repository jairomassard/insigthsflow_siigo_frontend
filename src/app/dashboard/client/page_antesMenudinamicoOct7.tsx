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
    <div className="space-y-6">  {/* Antes: space-y-12 */}
      {/* Encabezado */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">📊 Panel Clientes</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Administra perfiles, usuarios e integración con Siigo. Accede fácilmente a reportes clasificados visualmente.
        </p>
      </div>

      {/* Sección: Consulta y configuración */}
      <section>
        <h2 className="text-lg font-semibold mb-2">🔧 Consulta y Configuración</h2>  {/* Antes: mb-4 */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"> {/* Antes: gap-4 */}
          <FeatureCard icon="🧑‍💼" title="Perfiles" href="/dashboard/client/profiles" description="Crea y edita los perfiles de tu empresa." />
          <FeatureCard icon="👥" title="Usuarios" href="/dashboard/client/users" description="Gestiona los usuarios y sus accesos." />
          <FeatureCard icon="🔌" title="Integración Siigo" href="/dashboard/client/integrations/siigo" description="Configura credenciales API Siigo y sincroniza información." />
        </div>
      </section>

      {/* Reportes de Ventas */}
      <section>
        <h2 className="text-lg font-semibold mb-2">📈 Reportes de Ventas</h2>  {/* Antes: mb-4 */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">  {/* Antes: gap-4 */}
          <FeatureCard icon="💰" title="Ingresos por Ventas" href="/reportes/financiero" description="Facturas mes a mes, top 5 clientes y estado de pago." color="bg-blue-50" />
          <FeatureCard icon="👨‍💼" title="Ventas por Vendedor" href="/reportes/vendedores" description="Top 5 vendedores, ventas y cantidad de facturas." color="bg-blue-50" />
          <FeatureCard icon="📦" title="Ventas por Producto" href="/reportes/productos" description="Evolución mensual y top 10 productos más y menos vendidos." color="bg-blue-50" />
        </div>
      </section>

      {/* Reportes de Costos */}
      <section>
        <h2 className="text-lg font-semibold mb-2">💸 Reportes de Costos</h2>  {/* Antes: mb-4 */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">  {/* Antes: gap-4 */}
          <FeatureCard icon="🧾" title="Egresos por Compras/Gastos" href="/reportes/financiero/cxc" description="Análisis de egresos por cliente y edad cartera." color="bg-yellow-50" />
          <FeatureCard icon="🧑‍💻" title="Costos Nómina" href="/reportes/financiero/nomina" description="Costos mes a mes por concepto y empleado." color="bg-yellow-50" />
          <FeatureCard icon="🛒" title="Compras a Proveedores" href="/reportes/compras/proveedores" description="Facturas de compra, top 15 proveedores y estado de pago." color="bg-yellow-50" />
        </div>
      </section>

      {/* Reportes de Clientes y Cartera */}
      <section>
        <h2 className="text-lg font-semibold mb-2">👥 Clientes y Cartera</h2> {/* Antes: mb-4 */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">  {/* Antes: gap-4 */}
          <FeatureCard icon="🗂️" title="Facturación Clientes" href="/reportes/clientes" description="Facturación por cliente y centro de costo." color="bg-purple-50" />
          <FeatureCard icon="💼" title="Cuentas por Cobrar (Cartera)" href="/reportes/financiero/cxc" description="Análisis cartera por clientes y edades." color="bg-purple-50" />
        </div>
      </section>

      {/* Reportes Especiales */}
      <section>
        <h2 className="text-lg font-semibold mb-2">🌟 Reportes Especiales</h2> {/* Antes: mb-4 */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">  {/* Antes: gap-4 */}
          <FeatureCard icon="📚" title="Financiero Consolidado" href="/reportes/financiero/consolidado" description="Facturación vs gastos, top clientes y proveedores." color="bg-green-50" />
          <FeatureCard icon="⚖️" title="Analisis Balance de Prueba" href="/reportes/balance" description="Generar y subir balance emitido por Siigo. Ver indicadores financieros rapidadmente y obtener conclusiones sobre ellos, lo que le facilitara decisiones rápidas" color="bg-green-50" />
          <FeatureCard icon="📈" title="Indicadores Financieros" href="/reportes/indicadores" description="Consulta indicadores financieros inferidos a partir del balance emitido por Siigo y obtén conclusiones sobre ellos" color="bg-green-50" />
        </div>
      </section>
    </div>
  );
}

type FeatureCardProps = {
  icon: string;
  title: string;
  description: string;
  href: string;
  color?: string;
};

function FeatureCard({ icon, title, description, href, color = "bg-white" }: FeatureCardProps) {
  return (
    <Link
      href={href}
      className={`flex items-start gap-3 rounded-xl border p-3 transition-all duration-200 ease-in-out transform
                  ${color} hover:shadow-lg hover:scale-[1.02] hover:bg-gray-100
                  active:scale-95 active:bg-gray-200`}
    >
      <div className="text-3xl leading-none">{icon}</div>
      <div className="space-y-1">
        <h3 className="font-semibold text-base text-gray-800">{title}</h3>
        <p className="text-sm text-gray-600 leading-snug">{description}</p>
      </div>
    </Link>
  );
}

