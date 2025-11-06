// 🔧 Archivo: app/dashboard/client/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getWhoAmI } from "@/lib/authInfo";
import { usePermisos } from "@/hooks/usePermisos";
import { authFetch } from "@/lib/api"; // ✅ Requerido para backend

export default function ClientHome() {
  const router = useRouter();
  const [ok, setOk] = useState(false);
  const { permisos, loading: loadingPermisos } = usePermisos();
  const [notif, setNotif] = useState<any>(null);

  // 🧩 Cargar sesión
  useEffect(() => {
    (async () => {
      const me = await getWhoAmI();
      if (!me) return router.replace("/login");
      if (me.perfilid === 0) return router.replace("/dashboard/admin");
      setOk(true);
    })();
  }, [router]);

  // 🧩 Cargar notificación (solo para admins o superadmins)
  useEffect(() => {
    async function fetchNotif() {
      try {
        const res = await authFetch("/api/notificaciones");
        const data = await res.json();
        if (data && data.length > 0) setNotif(data[0]);
      } catch (e) {
        console.error("Error al cargar notificaciones", e);
      }
    }
    fetchNotif();
  }, []);

  // 🟢 Marcar notificación como leída y ocultar
  async function cerrarNotif() {
    try {
      if (notif?.id) {
        await authFetch(`/api/notificaciones/marcar-leida/${notif.id}`, {
          method: "POST",
        });
      }
    } catch (e) {
      console.error("Error marcando notificación como leída", e);
    }
    setNotif(null);
  }

  if (!ok || loadingPermisos) return <div className="p-6">Cargando…</div>;
  const tiene = (codigo: string) => permisos.includes(codigo);

  return (
    <div className="space-y-6">
      {/* 🔔 Banner de notificación de sincronización */}
      {notif && (
        <div
          className={`relative rounded-lg p-3 mb-2 ${
            notif.nivel === "success"
              ? "bg-green-100 text-green-900 border border-green-400"
              : "bg-red-100 text-red-900 border border-red-400"
          }`}
        >
          <button
            onClick={cerrarNotif}
            className="absolute top-2 right-2 text-sm font-bold hover:opacity-70"
          >
            ❌
          </button>
          <strong className="block">{notif.titulo}</strong>
          <p className="text-sm">{notif.mensaje}</p>
        </div>
      )}

      {/* 🧭 Panel principal */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">📊 Panel Clientes</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Configura tu sistema, la integración con Siigo y accede fácilmente a los diferentes reportes.
        </p>
        <hr className="border-gray-900 mt-3" />
      </div>

      {/* 🔧 Consulta y Configuración */}
      {(tiene("ver_perfiles") || tiene("ver_usuarios") || tiene("ver_integracion_siigo")) && (
        <section className="rounded-xl p-4 bg-gray-100 space-y-3">
          <h2 className="text-base font-semibold text-gray-900">🔧 Consulta y Configuración</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tiene("ver_perfiles") && (
              <FeatureCard
                icon="🧑‍💼"
                title="Perfiles"
                href="/dashboard/client/profiles"
                description="Crea y edita los perfiles de tu empresa."
              />
            )}
            {tiene("ver_usuarios") && (
              <FeatureCard
                icon="👥"
                title="Usuarios"
                href="/dashboard/client/users"
                description="Gestiona los usuarios y sus accesos."
              />
            )}
            {tiene("ver_integracion_siigo") && (
              <FeatureCard
                icon="🔌"
                title="Integración Siigo"
                href="/dashboard/client/integrations/siigo"
                description="Configura credenciales API Siigo y sincroniza información."
              />
            )}
          </div>
        </section>
      )}

      {/* 📈 Secciones de reportes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {(tiene("ver_reporte_ventas") ||
          tiene("ver_reporte_vendedores") ||
          tiene("ver_reporte_productos")) && (
          <Section title="📈 Reportes de Ventas" color="bg-blue-50">
            {tiene("ver_reporte_ventas") && (
              <FeatureCard
                icon="💰"
                title="Ingresos por Ventas"
                href="/reportes/financiero/ventas"
                description="Facturas mes a mes, top 5 clientes y estado de pago."
              />
            )}
            {tiene("ver_reporte_vendedores") && (
              <FeatureCard
                icon="👨‍💼"
                title="Ventas por Vendedor"
                href="/reportes/vendedores"
                description="Top 5 vendedores, ventas y cantidad de facturas."
              />
            )}
            {tiene("ver_reporte_productos") && (
              <FeatureCard
                icon="📦"
                title="Ventas por Producto"
                href="/reportes/productos"
                description="Evolución mensual y top 10 productos más y menos vendidos."
              />
            )}
          </Section>
        )}

        {(tiene("ver_reporte_compras_gastos") ||
          tiene("ver_reporte_nomina") ||
          tiene("ver_reporte_proveedores")) && (
          <Section title="💸 Reportes de Costos" color="bg-yellow-50">
            {tiene("ver_reporte_compras_gastos") && (
              <FeatureCard
                icon="🧾"
                title="Egresos por Compras/Gastos"
                href="/reportes/financiero/compras_gastos"
                description="Análisis de egresos por cliente y edad cartera."
              />
            )}
            {tiene("ver_reporte_nomina") && (
              <FeatureCard
                icon="🧑‍💻"
                title="Costos Nómina"
                href="/reportes/financiero/nomina"
                description="Costos mes a mes por concepto y empleado."
              />
            )}
            {tiene("ver_reporte_proveedores") && (
              <FeatureCard
                icon="🛒"
                title="Compras a Proveedores"
                href="/reportes/compras/proveedores"
                description="Facturas de compra, top 15 proveedores y estado de pago."
              />
            )}
          </Section>
        )}

        {(tiene("ver_reporte_clientes") || tiene("ver_reporte_cxc")) && (
          <Section title="👥 Reporte Clientes y Cartera" color="bg-purple-50">
            {tiene("ver_reporte_clientes") && (
              <FeatureCard
                icon="🗂️"
                title="Facturación Clientes"
                href="/reportes/clientes"
                description="Facturación por cliente y centro de costo."
              />
            )}
            {tiene("ver_reporte_cxc") && (
              <FeatureCard
                icon="💼"
                title="Cuentas por Cobrar (Cartera)"
                href="/reportes/financiero/cxc"
                description="Análisis cartera por clientes y edades."
              />
            )}
          </Section>
        )}

        {(tiene("ver_reporte_consolidado") ||
          tiene("ver_reporte_cruceivas") ||
          tiene("ver_reporte_balance") ||
          tiene("ver_reporte_indicadores")) && (
          <Section title="🌟 Reportes Especiales" color="bg-green-50">
            {tiene("ver_reporte_consolidado") && (
              <FeatureCard
                icon="📚"
                title="Financiero Consolidado"
                href="/reportes/financiero/consolidado"
                description="Facturación vs gastos, top clientes y proveedores."
              />
            )}
            {tiene("ver_reporte_cruceivas") && (
              <FeatureCard
                icon="📊"
                title="Cruce IVAs"
                href="/reportes/cruceivas"
                description="Muestra los cruce de IVAs mes a mes y valores a pagar por periodos."
              />
            )}
            {tiene("ver_reporte_balance") && (
              <FeatureCard
                icon="⚖️"
                title="Analisis Balance de Prueba"
                href="/reportes/balance"
                description="Generar y subir balance emitido por Siigo. Ver indicadores financieros rápidamente y obtener conclusiones útiles para decisiones."
              />
            )}
            {tiene("ver_reporte_indicadores") && (
              <FeatureCard
                icon="📈"
                title="Indicadores Financieros"
                href="/reportes/indicadores"
                description="Consulta indicadores financieros inferidos a partir del balance emitido por Siigo y obtén conclusiones sobre ellos."
              />
            )}
          </Section>
        )}
      </div>
    </div>
  );
}

type FeatureCardProps = {
  icon: string;
  title: string;
  description: string;
  href: string;
};

type SectionProps = {
  title: string;
  children: React.ReactNode;
  color?: string;
};

function Section({ title, children, color = "bg-gray-100" }: SectionProps) {
  return (
    <section className={`rounded-xl p-3 space-y-3 ${color}`}>
      <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function FeatureCard({ icon, title, description, href }: FeatureCardProps) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-lg border bg-white p-3 hover:bg-gray-100 hover:shadow"
    >
      <div className="text-2xl leading-none">{icon}</div>
      <div>
        <h3 className="font-semibold text-sm text-gray-800">{title}</h3>
        <p className="text-xs text-gray-600 leading-snug">{description}</p>
      </div>
    </Link>
  );
}
