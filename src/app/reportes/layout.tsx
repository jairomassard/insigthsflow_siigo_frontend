"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  LogOut,
} from "lucide-react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);
  const [cliente, setCliente] = useState<{ nombre: string; logo_url?: string } | null>(null);
  const { permisos, loading: loadingPermisos } = usePermisos();

  useEffect(() => {
    (async () => {
      const me = await getWhoAmI();
      if (!me) return router.replace("/login");
      if (me.perfilid === 0) return router.replace("/dashboard/admin");

      setCliente({
        nombre: me.cliente?.nombre ?? "Cliente",
        logo_url: me.cliente?.logo_url,
      });

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
      items: tiene("ver_dashboard")
        ? [
            {
              href: "/dashboard/client",
              label: "Inicio",
              icon: <Home className="w-4 h-4" />,
            },
          ]
        : [],
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
              {
                href: "/dashboard/client/integrations/siigo",
                label: "Integración Siigo",
                icon: <Plug className="w-4 h-4" />,
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
                label: "Financiero Consolidado",
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
        ...(tiene("ver_reporte_balance")
          ? [
              {
                href: "/reportes/balance",
                label: "Analisis Balance de Prueba",
                icon: <BarChartBig className="w-4 h-4" />,
              },
            ]
          : []),
        ...(tiene("ver_reporte_indicadores")
          ? [
              {
                href: "/reportes/indicadores",
                label: "Indicadores Financieros",
                icon: <FileBarChart2 className="w-4 h-4" />,
              },
            ]
          : []),
      ],
    },
  ];

  return (
    <div className="min-h-screen grid grid-cols-12 bg-white">
      <aside className="col-span-12 md:col-span-3 lg:col-span-2 bg-black text-white">
        <div className="bg-white p-4 text-center">
          {cliente?.logo_url ? (
            <img src={cliente.logo_url} alt="Logo" className="mx-auto max-h-16 object-contain" />
          ) : (
            <div className="font-bold text-gray-700">{cliente?.nombre}</div>
          )}
        </div>
        <nav className="space-y-6 p-4">
          {navSections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {section.title && (
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((link, i) => (
                  <a
                    key={i}
                    href={(link as any).href}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium w-full hover:bg-white hover:text-black"
                  >
                    <span className="text-white">{link.icon}</span>
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
          <div className="pt-6 px-3">
            <LogoutButton />
          </div>
        </nav>
      </aside>
      <section className="col-span-12 md:col-span-9 lg:col-span-10 p-6 overflow-x-auto">
        {children}
      </section>
    </div>
  );
}