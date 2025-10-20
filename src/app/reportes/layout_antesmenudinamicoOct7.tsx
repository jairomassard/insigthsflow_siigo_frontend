"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { getWhoAmI } from "@/lib/authInfo";
import {
  BarChart2,
  Users,
  User,
  Settings,
  Home,
  FileText,
  Briefcase,
  PieChart,
} from "lucide-react";

type ClienteLite = { nombre: string; logo_url?: string };

type NavSection = {
  title: string;
  icon?: React.ReactNode;  // <--- cambio aquí
  items: {
    href: string;
    label: string;
    icon: React.ReactNode;  // <--- y aquí
  }[];
};


export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);
  const [cliente, setCliente] = useState<ClienteLite | null>(null);

  useEffect(() => {
    (async () => {
      const me = await getWhoAmI();
      if (!me) return router.replace("/login");
      if (me.perfilid === 0) return router.replace("/dashboard/admin");

      if (me.cliente && typeof me.cliente === "object") {
        setCliente({
          nombre: me.cliente.nombre ?? "Cliente",
          logo_url: me.cliente.logo_url ?? undefined,
        });
      } else {
        setCliente({ nombre: "Cliente" });
      }

      setOk(true);
    })();
  }, [router]);

  if (!ok) return <div className="p-6">Cargando…</div>;

  const navSections: NavSection[] = [
    {
      title: "Navegación",
      icon: <Home className="w-4 h-4" />,
      items: [
        { href: "/dashboard/client", label: "Inicio", icon: <Home className="w-4 h-4" /> },
      ],
    },
    {
      title: "Configuración",
      icon: <Settings className="w-4 h-4" />,
      items: [
        { href: "/dashboard/client/profiles", label: "Perfiles", icon: <User className="w-4 h-4" /> },
        { href: "/dashboard/client/users", label: "Usuarios", icon: <Users className="w-4 h-4" /> },
        { href: "/dashboard/client/integrations/siigo", label: "Integración Siigo", icon: <Settings className="w-4 h-4" /> },
      ],
    },
    {
      title: "Reportes de Ventas",
      icon: <BarChart2 className="w-4 h-4" />,
      items: [
        { href: "/reportes/financiero/ventas", label: "Ingresos por Ventas", icon: <BarChart2 className="w-4 h-4" /> },
        { href: "/reportes/vendedores", label: "Ventas por Vendedor", icon: <BarChart2 className="w-4 h-4" /> },
        { href: "/reportes/productos", label: "Ventas por Producto", icon: <BarChart2 className="w-4 h-4" /> },
      ],
    },
    {
      title: "Reportes de Costos",
      icon: <FileText className="w-4 h-4" />,
      items: [
        { href: "/reportes/financiero/compras_gastos", label: "Egresos por Compras/Gastos", icon: <FileText className="w-4 h-4" /> },
        { href: "/reportes/financiero/nomina", label: "Costos Nómina", icon: <FileText className="w-4 h-4" /> },
        { href: "/reportes/compras/proveedores", label: "Compras a Proveedores", icon: <FileText className="w-4 h-4" /> },
      ],
    },
    {
      title: "Clientes y Cartera",
      icon: <Briefcase className="w-4 h-4" />,
      items: [
        { href: "/reportes/clientes", label: "Facturación Clientes", icon: <Briefcase className="w-4 h-4" /> },
        { href: "/reportes/financiero/cxc", label: "Cuentas x Cobrar (Cartera)", icon: <Briefcase className="w-4 h-4" /> },
      ],
    },
    {
      title: "Especiales",
      icon: <PieChart className="w-4 h-4" />,
      items: [
        { href: "/reportes/financiero/consolidado", label: "Financiero Consolidado", icon: <PieChart className="w-4 h-4" /> },
        { href: "/reportes/balance", label: "Analisis Balance de Prueba ", icon: <PieChart className="w-4 h-4" /> },
        { href: "/reportes/indicadores", label: "Indicadores Financieros", icon: <PieChart className="w-4 h-4" /> },
      ],
    },
  ];

  return (
    <div className="min-h-screen grid grid-cols-12 bg-white">
      <aside className="col-span-12 md:col-span-3 lg:col-span-2 bg-gray-50 border-r p-4">
        <div className="mb-6 text-center">
          {cliente?.logo_url ? (
            <img
              src={cliente.logo_url}
              alt={cliente.nombre || "Logo del cliente"}
              className="mx-auto max-h-16 object-contain"
            />
          ) : (
            <div className="font-semibold text-gray-700">{cliente?.nombre ?? "Cliente"}</div>
          )}
        </div>

        <nav className="space-y-6">
          {navSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                {section.icon}
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 font-medium transition-all hover:bg-gray-200 hover:shadow-sm active:bg-gray-300"
                  >
                    <span className="text-gray-500">{link.icon}</span>
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            </div>
          ))}

          <div className="pt-6">
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
