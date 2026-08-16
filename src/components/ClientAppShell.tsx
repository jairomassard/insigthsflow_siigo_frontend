"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { getWhoAmI } from "@/lib/authInfo";
import { usePermisos } from "@/hooks/usePermisos";
import {
  Home,
  UserCog,
  Users,
  Plug,
  ShoppingCart,
  DollarSign,
  PackageOpen,
  Briefcase,
  FileBarChart2,
  BarChartBig,
  LayoutDashboard,
  Settings,
  Pin,
  PinOff,
  ChevronRight,
} from "lucide-react";

// Preferencia de sidebar fijo/oculto - compartida entre todas las pantallas
// de cliente (reportes + dashboard), por eso vive en localStorage y no en
// estado de un solo layout.
const SIDEBAR_PINNED_KEY = "insightflow_sidebar_pinned";

function leerPinnedInicial(): boolean {
  if (typeof window === "undefined") return true;
  const saved = window.localStorage.getItem(SIDEBAR_PINNED_KEY);
  if (saved !== null) return saved === "true";

  // Sin preferencia guardada (primera visita): en celular el sidebar fijo
  // apila el menu completo ARRIBA del reporte (la rejilla usa col-span-12
  // para ambos por debajo del breakpoint md de Tailwind, 768px) - medido en
  // un iPhone 13 real: ~1348px de menu antes de llegar al contenido. Por
  // eso ahi arranca oculto por defecto; en tablet/desktop sigue fijo como
  // siempre.
  return window.innerWidth >= 768;
}

export default function ClientAppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);
  const [cliente, setCliente] = useState<{ nombre: string; logo_url?: string } | null>(null);
  const [proveedorDatos, setProveedorDatos] = useState<"siigo" | "alegra">("siigo");
  const { permisos, loading: loadingPermisos } = usePermisos();

  // pinned = sidebar siempre visible, empujando el contenido (comportamiento
  // clasico). !pinned = sidebar oculto por defecto, se "monta" como overlay
  // sobre el reporte al pasar el mouse por el borde izquierdo.
  const [pinned, setPinned] = useState<boolean>(leerPinnedInicial);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_PINNED_KEY, String(pinned));
  }, [pinned]);

  useEffect(() => {
    (async () => {
      const me = await getWhoAmI();
      if (!me) return router.replace("/login");
      if (me.perfilid === 0) return router.replace("/dashboard/admin");

      setCliente({
        nombre: me.cliente?.nombre ?? "Cliente",
        logo_url: me.cliente?.logo_url,
      });
      setProveedorDatos(me.proveedor_datos === "alegra" ? "alegra" : "siigo");

      setOk(true);
    })();
  }, [router]);

  if (!ok || loadingPermisos) return <div className="p-6">Cargando…</div>;

  type NavItem =
    | { href: string; label: string; icon: React.ReactNode }
    | { label: string; icon: React.ReactNode; onClick: () => void };

  const tiene = (codigo: string) => permisos.includes(codigo);

  const navSections: { title: string; items: NavItem[] }[] = [
    {
      title: "Navegación",
      items: [
        ...(tiene("ver_resumen_ejecutivo")
          ? [
              {
                href: "/dashboard/client/resumen-ejecutivo",
                label: "Resumen Ejecutivo",
                icon: <LayoutDashboard className="w-4 h-4" />,
              },
            ]
          : []),
        ...(tiene("ver_dashboard")
          ? [
              {
                href: "/dashboard/client",
                label: "Inicio",
                icon: <Home className="w-4 h-4" />,
              },
            ]
          : []),
      ],
    },
    {
      title: "Consulta y Configuración",
      items: [
        ...(tiene("ver_perfiles")
          ? [
              {
                href: "/dashboard/client/profiles",
                label: "Perfiles",
                icon: <UserCog className="w-4 h-4" />,
              },
            ]
          : []),
        ...(tiene("ver_usuarios")
          ? [
              {
                href: "/dashboard/client/users",
                label: "Usuarios",
                icon: <Users className="w-4 h-4" />,
              },
            ]
          : []),
        ...(tiene("ver_integracion_siigo")
          ? [
              proveedorDatos === "alegra"
                ? {
                    href: "/dashboard/client/integrations/alegra",
                    label: "Integración Alegra",
                    icon: <Plug className="w-4 h-4" />,
                  }
                : {
                    href: "/dashboard/client/integrations/siigo",
                    label: "Integración Siigo",
                    icon: <Plug className="w-4 h-4" />,
                  },
            ]
          : []),
        ...(tiene("ver_configuraciones_varias")
          ? [
              {
                href: "/dashboard/client/configuraciones_varias",
                label: "Configuraciones Varias",
                icon: <Settings className="w-4 h-4" />,
              },
            ]
          : []),
      ],
    },
    {
      title: "Reportes de Ventas",
      items: [
        ...(tiene("ver_reporte_ventas")
          ? [
              {
                href: "/reportes/financiero/ventas",
                label: "Ingresos por Ventas",
                icon: <DollarSign className="w-4 h-4" />,
              },
            ]
          : []),
        ...(tiene("ver_reporte_vendedores")
          ? [
              {
                href: "/reportes/vendedores",
                label: "Ventas por Vendedor",
                icon: <Users className="w-4 h-4" />,
              },
            ]
          : []),
        ...(tiene("ver_reporte_productos")
          ? [
              {
                href: "/reportes/productos",
                label: "Ventas por Producto",
                icon: <PackageOpen className="w-4 h-4" />,
              },
            ]
          : []),
        ...(tiene("ver_reporte_buscador_facturas")
          ? [
              {
                href: "/reportes/financiero/buscador-facturas",
                label: "Buscador Inteligente de Facturas",
                icon: <FileBarChart2 className="w-4 h-4" />,
              },
            ]
          : []),
      ],
    },
    {
      title: "Reportes de Costos",
      items: [
        ...(tiene("ver_reporte_compras_gastos")
          ? [
              {
                href: "/reportes/financiero/compras_gastos",
                label: "Egresos por Compras/Gastos",
                icon: <ShoppingCart className="w-4 h-4" />,
              },
            ]
          : []),
        ...(tiene("ver_reporte_nomina")
          ? [
              {
                href: "/reportes/financiero/nomina",
                label: "Costos Nómina",
                icon: <UserCog className="w-4 h-4" />,
              },
            ]
          : []),
        ...(tiene("ver_reporte_proveedores")
          ? [
              {
                href: "/reportes/compras/proveedores",
                label: "Compras a Proveedores",
                icon: <ShoppingCart className="w-4 h-4" />,
              },
            ]
          : []),
      ],
    },
    {
      title: "Clientes y Cartera",
      items: [
        ...(tiene("ver_reporte_clientes")
          ? [
              {
                href: "/reportes/clientes",
                label: "Facturación Clientes",
                icon: <Briefcase className="w-4 h-4" />,
              },
            ]
          : []),
        ...(tiene("ver_reporte_cxc")
          ? [
              {
                href: "/reportes/financiero/cxc",
                label: "Cuentas x Cobrar (Cartera)",
                icon: <Briefcase className="w-4 h-4" />,
              },
            ]
          : []),
      ],
    },
    {
      title: "Reportes Especiales",
      items: [
        ...(tiene("ver_reporte_consolidado")
          ? [
              {
                href: "/reportes/financiero/consolidado",
                label: "Ingresos Vs Egresos Consolidado",
                icon: <FileBarChart2 className="w-4 h-4" />,
              },
            ]
          : []),
        ...(tiene("ver_reporte_cruce_dian")
          ? [
              {
                href: "/reportes/crucedian",
                label: "Cruce DIAN vs Siigo",
                icon: <FileBarChart2 className="w-4 h-4" />,
              },
            ]
          : []),
        ...(tiene("ver_reporte_cruceivas")
          ? [
              {
                href: "/reportes/cruceivas",
                label: "Reporte de Cruce de IVAs",
                icon: <FileBarChart2 className="w-4 h-4" />,
              },
            ]
          : []),
        ...(tiene("ver_reporte_retenciones")
          ? [
              {
                href: "/reportes/retenciones",
                label: "Reporte de Retenciones",
                icon: <FileBarChart2 className="w-4 h-4" />,
              },
            ]
          : []),
        ...(tiene("ver_reporte_estado_resultados")
          ? [
              {
                href: "/reportes/estado-resultados",
                label: "Estado de Resultados (PyG)",
                icon: <FileBarChart2 className="w-4 h-4" />,
              },
            ]
          : []),
        ...(tiene("ver_reporte_analisis_variacion")
          ? [
              {
                href: "/reportes/financiero/analisis-variacion",
                label: "Análisis de Variación",
                icon: <FileBarChart2 className="w-4 h-4" />,
              },
            ]
          : []),
        ...(tiene("ver_reporte_balance_general")
          ? [
              {
                href: "/reportes/financiero/balance-general",
                label: "Balance General",
                icon: <FileBarChart2 className="w-4 h-4" />,
              },
            ]
          : []),
        ...(tiene("ver_reporte_indicadores_auxiliares")
          ? [
              {
                href: "/reportes/financiero/indicadores-financieros-auxiliares",
                label: "Indicadores Financieros",
                icon: <FileBarChart2 className="w-4 h-4" />,
              },
            ]
          : []),
        ...(tiene("ver_reporte_balance") && proveedorDatos === "siigo"
          ? [
              {
                href: "/reportes/balance",
                label: "Analisis Balance de Prueba",
                icon: <BarChartBig className="w-4 h-4" />,
              },
            ]
          : []),
        ...(tiene("ver_reporte_indicadores") && proveedorDatos === "siigo"
          ? [
              {
                href: "/reportes/indicadores",
                label: "Ind. Financieros desde Balance Prueba",
                icon: <FileBarChart2 className="w-4 h-4" />,
              },
            ]
          : []),
      ],
    },
  ];

  const visibleNavSections = navSections.filter(
    (section) => section.items.length > 0
  );

  const sidebarContent = (
    <>
      <div className="bg-white p-4 text-center flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          {cliente?.logo_url ? (
            <img src={cliente.logo_url} alt="Logo" className="mx-auto max-h-16 object-contain" />
          ) : (
            <div className="font-bold text-gray-700 truncate">{cliente?.nombre}</div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setPinned((p) => !p)}
          title={pinned ? "Ocultar barra lateral" : "Fijar barra lateral"}
          className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        >
          {pinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
        </button>
      </div>
      <nav className="space-y-6 p-4">
        {visibleNavSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {section.title && (
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((link, i) => (
                <Link
                  key={i}
                  href={(link as any).href}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium w-full hover:bg-white hover:text-black"
                >
                  <span className="text-white">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
        <div className="pt-6 px-3">
          <LogoutButton />
        </div>
      </nav>
    </>
  );

  if (pinned) {
    return (
      <div className="min-h-screen grid grid-cols-12 bg-white">
        <aside className="col-span-12 md:col-span-3 lg:col-span-2 bg-black text-white">
          {sidebarContent}
        </aside>
        <section className="col-span-12 md:col-span-9 lg:col-span-10 p-6 overflow-x-auto">
          {children}
        </section>
      </div>
    );
  }

  // No fijo: el contenido usa las 12 columnas completas. Un borde angosto
  // fijo a la izquierda sirve de "manija" - al pasar el mouse por ahi (o
  // por el sidebar ya expandido) se monta el sidebar completo como overlay
  // flotante sobre el reporte, sin empujar el contenido. z-40 se deja por
  // debajo de los modales de los reportes (varios usan z-50 / z-[100]),
  // para que un modal abierto siempre gane sobre este overlay.
  //
  // onClick ademas de onMouseEnter: en tablet/touch no existe "hover", asi
  // que sin esto, una vez oculto el sidebar no habia forma de volver a
  // abrirlo con el dedo (bug reportado). El backdrop invisible es el cierre
  // equivalente al "mouse leave" para touch (tocar fuera del sidebar).
  return (
    <div className="min-h-screen bg-white">
      <div
        className="fixed left-0 top-0 z-30 flex h-screen w-5 items-center justify-center bg-black/10 transition-colors hover:bg-black/20"
        onMouseEnter={() => setHovering(true)}
        onClick={() => setHovering(true)}
      >
        <ChevronRight className="w-3 h-3 text-gray-500" />
      </div>

      {hovering && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setHovering(false)}
          />
          <aside
            onMouseLeave={() => setHovering(false)}
            className="fixed left-0 top-0 z-40 h-screen w-64 overflow-y-auto bg-black text-white shadow-2xl"
          >
            {sidebarContent}
          </aside>
        </>
      )}

      <section className="p-6 overflow-x-auto">{children}</section>
    </div>
  );
}
