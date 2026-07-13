"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
} from "recharts";
import { Search, Download, Eraser, FileText, CircleDollarSign, Receipt, Landmark } from "lucide-react";

type ClienteOption = {
  id: string;
  nombre: string;
};

type CentroCostoOption = {
  id: number | string;
  nombre: string;
  codigo?: string | null;
};

type FacturaRow = {
  id?: number;
  factura_id?: number;
  idfactura: string;
  
  documento?: string | null;
  tipo_movimiento?: "FACTURA" | "NOTA_CREDITO" | string | null;
  tipo_documento_label?: string | null;
  documento_afectado?: string | null;

  fecha: string;
  vencimiento?: string | null;
  cliente_nombre: string;
  estado?: string | null;
  estado_pago?: string | null;
  estado_pago_real?: string | null;
  subtotal?: number;
  impuestos?: number;
  impuestos_total?: number;
  total_retenciones?: number;
  retenciones?: number;
  total?: number;
  saldo?: number;
  observaciones?: string | null;
  descripcion?: string | null;
  medio_pago?: string | null;
  public_url?: string | null;
  centro_costo_nombre?: string | null;
  centro_costo_codigo?: string | null;
};

type Kpis = {
  total_registros?: number;

  cantidad_facturas?: number;
  cantidad_notas_credito?: number;

  facturas_emitidas?: number;
  notas_credito?: number;
  ventas_netas?: number;

  total_facturado?: number;
  total_facturado_bruto?: number;

  subtotal?: number;
  iva?: number;
  impuestos?: number;
  retenciones?: number;
  saldo?: number;
};

type Serie = {
  mes?: string;
  label?: string;
  total_facturado?: number;
  total?: number;
};

function formatCurrency(value: number | null | undefined) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 2,
  }).format(n);
}

//function abreviar(value: number | null | undefined) {
//  const n = Number(value || 0);
//  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
//  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
//  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
//  return `${n}`;
//}
function abreviar(valor: number | null | undefined): string {
  const n = Number(valor || 0);
  const abs = Math.abs(n);

  if (abs >= 1_000_000_000) {
    const millones = n / 1_000_000;
    return `${millones.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  }
  if (abs >= 1_000_000) {
    const millones = n / 1_000_000;
    return `${millones.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  }
  if (abs >= 1_000) {
    const miles = n / 1_000;
    return `${miles.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}K`;
  }
  return `${Math.round(n).toLocaleString("es-CO")}`;
}


function formatLabelValue(value: unknown) {
  return abreviar(Number(value || 0));
}

function estadoPagoLabel(row: FacturaRow) {
  return (row.estado_pago_real || row.estado_pago || "").toLowerCase();
}

function estadoPagoClasses(estado: string) {
  switch (estado) {
    case "pagada":
      return "bg-emerald-100 text-emerald-800 border border-emerald-200";
    case "pendiente":
      return "bg-red-100 text-red-800 border border-red-200";
    case "parcial":
      return "bg-amber-100 text-amber-800 border border-amber-200";
    case "no_aplica":
      return "bg-slate-100 text-slate-600 border border-slate-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

function normalizarMesLabel(mes: string) {
  if (!mes) return "";
  if (/^\d{4}-\d{2}$/.test(mes)) return mes;
  return mes;
}

function buildBadgeClass(color: "blue" | "emerald" | "violet" | "amber" | "rose") {
  const map = {
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    violet: "bg-violet-100 text-violet-700 border-violet-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    rose: "bg-rose-100 text-rose-700 border-rose-200",
  };
  return `inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${map[color]}`;
}

export default function BuscadorFacturasPage() {
  const today = new Date();
  const defaultHasta = today.toISOString().slice(0, 10);
  const defaultDesde = `${today.getFullYear() - 1}-01-01`;

  const [q, setQ] = useState("");
  const [factura, setFactura] = useState("");
  const [cliente, setCliente] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [estadoPago, setEstadoPago] = useState("");
  const [estadoFactura, setEstadoFactura] = useState("");
  const [desde, setDesde] = useState(defaultDesde);
  const [hasta, setHasta] = useState(defaultHasta);

  const [rows, setRows] = useState<FacturaRow[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [series, setSeries] = useState<Serie[]>([]);
  const [count, setCount] = useState(0);

  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [centros, setCentros] = useState<CentroCostoOption[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const totalSubtotal = Number(kpis?.subtotal || 0);
  const totalIva = Number(kpis?.iva ?? kpis?.impuestos ?? 0);
  const totalRetenciones = Number(kpis?.retenciones || 0);
  const totalFacturado = Number(kpis?.total_facturado || 0);
  const totalSaldo = Number(kpis?.saldo || 0);
  const totalNotasCredito = Number(kpis?.notas_credito || 0);
  const cantidadNotasCredito = Number(kpis?.cantidad_notas_credito || 0);
  const totalFacturadoBruto = Number(kpis?.total_facturado_bruto || kpis?.facturas_emitidas || 0);

  async function loadCatalogos() {
    setLoadingCatalogos(true);
    try {
      const qs = new URLSearchParams();
      if (desde) qs.append("desde", desde);
      if (hasta) qs.append("hasta", hasta);

      const [clientesRes, centrosRes] = await Promise.all([
        authFetch(`/catalogos/clientes-facturas?${qs.toString()}`),
        authFetch(`/catalogos/centros-costo?${qs.toString()}`),
      ]);

      setClientes(Array.isArray(clientesRes) ? clientesRes : []);
      setCentros(Array.isArray(centrosRes) ? centrosRes : []);
    } catch (e) {
      console.error("Error cargando catálogos:", e);
    } finally {
      setLoadingCatalogos(false);
    }
  }

  async function buscar() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.append("q", q.trim());
      if (factura.trim()) params.append("factura", factura.trim());
      if (cliente) params.append("cliente", cliente);
      if (costCenter) params.append("cost_center", costCenter);
      if (estadoPago) params.append("estado_pago", estadoPago);
      if (estadoFactura) params.append("estado_factura", estadoFactura);
      if (desde) params.append("desde", desde);
      if (hasta) params.append("hasta", hasta);
      params.append("limit", "5000");

      const data = await authFetch(`/reportes/busqueda-inteligente-facturas?${params.toString()}`);

      if (data?.error) {
        throw new Error(data.error);
      }

      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setKpis(data?.kpis || null);
      setSeries(Array.isArray(data?.series) ? data.series : []);
      setCount(Number(data?.count || 0));
    } catch (err: any) {
      console.error("ERROR BUSCADOR FACTURAS:", err);
      setError(err?.message || "Ocurrió un error al buscar.");
      setRows([]);
      setKpis(null);
      setSeries([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }

  function exportarExcel() {
    setExporting(true);
    setError("");

    try {
      if (!rows.length) {
        throw new Error("No hay datos en pantalla para exportar.");
      }

      const hojaResumen = XLSX.utils.json_to_sheet([
        {
          "Palabra clave": q || "Todos",
          Factura: factura || "Todas",
          Cliente: cliente || "Todos",
          "Centro de costo": costCenter || "Todos",
          "Estado pago": estadoPago || "Todos",
          "Estado factura": estadoFactura || "Todos",
          Desde: desde || "Sin filtro",
          Hasta: hasta || "Sin filtro",
          "Movimientos encontrados": count,
          "Cantidad notas crédito": cantidadNotasCredito,
          "Facturas emitidas": totalFacturadoBruto,
          "Total notas crédito": totalNotasCredito,
          "Ventas netas": totalFacturado,
          Subtotal: totalSubtotal,
          IVA: totalIva,
          Retenciones: totalRetenciones,
          Saldo: totalSaldo,
        },
      ]);

      const hojaFacturas = XLSX.utils.json_to_sheet(
        rows.map((row) => {
          const iva = Number(row.impuestos ?? row.impuestos_total ?? 0);
          const retenciones = Number(row.retenciones ?? row.total_retenciones ?? 0);
          const descripcion = row.descripcion || row.observaciones || "";
          const estadoPago = row.estado_pago_real || row.estado_pago || "";

          return {
            Tipo: row.tipo_documento_label || row.tipo_movimiento || "Factura",
            Fecha: row.fecha || "",
            Vencimiento: row.vencimiento || "",
            Documento: row.documento || row.idfactura || "",
            "Documento afectado": row.documento_afectado || "",
            Cliente: row.cliente_nombre || "",
            "Centro de costo": row.centro_costo_nombre || "",
            "Código centro costo": row.centro_costo_codigo || "",
            "Descripción / observaciones": descripcion,
            Subtotal: Number(row.subtotal || 0),
            IVA: iva,
            Retenciones: retenciones,
            Total: Number(row.total || 0),
            Saldo: Number(row.saldo || 0),
            "Estado pago": estadoPago,
            "Estado factura": row.estado || "",
            "Medio de pago": row.medio_pago || "",
            "URL factura": row.public_url || "",
          };
        })
      );

      const hojaEvolucion = XLSX.utils.json_to_sheet(
        chartData.map((item) => ({
          Mes: item.mes,
          Total_Facturado: item.total,
        }))
      );

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, hojaResumen, "Resumen");
      XLSX.utils.book_append_sheet(wb, hojaFacturas, "Movimientos");
      XLSX.utils.book_append_sheet(wb, hojaEvolucion, "Evolucion_Mensual");

      const wsResumen = wb.Sheets["Resumen"];
      const wsFacturas = wb.Sheets["Movimientos"];
      const wsEvolucion = wb.Sheets["Evolucion_Mensual"];

      wsResumen["!cols"] = [
        { wch: 18 },
        { wch: 16 },
        { wch: 22 },
        { wch: 20 },
        { wch: 18 },
        { wch: 18 },
        { wch: 14 },
        { wch: 14 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
      ];

      wsFacturas["!cols"] = [
        { wch: 16 }, // Tipo
        { wch: 14 }, // Fecha
        { wch: 14 }, // Vencimiento
        { wch: 18 }, // Documento
        { wch: 22 }, // Documento afectado
        { wch: 30 }, // Cliente
        { wch: 24 }, // Centro de costo
        { wch: 18 }, // Código centro costo
        { wch: 50 }, // Descripción
        { wch: 16 }, // Subtotal
        { wch: 16 }, // IVA
        { wch: 16 }, // Retenciones
        { wch: 16 }, // Total
        { wch: 16 }, // Saldo
        { wch: 16 }, // Estado pago
        { wch: 16 }, // Estado factura
        { wch: 18 }, // Medio de pago
        { wch: 48 }, // URL
      ];

      wsEvolucion["!cols"] = [
        { wch: 16 },
        { wch: 20 },
      ];

      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });

      const hoy = new Date();
      const y = hoy.getFullYear();
      const m = String(hoy.getMonth() + 1).padStart(2, "0");
      const d = String(hoy.getDate()).padStart(2, "0");

      saveAs(
        new Blob([buf], { type: "application/octet-stream" }),
        `busqueda_inteligente_facturas_${y}-${m}-${d}.xlsx`
      );
    } catch (err: any) {
      console.error("ERROR EXPORTANDO EXCEL:", err);
      setError(err?.message || "No fue posible exportar el archivo Excel.");
    } finally {
      setExporting(false);
    }
  }

  function limpiar() {
    setQ("");
    setFactura("");
    setCliente("");
    setCostCenter("");
    setEstadoPago("");
    setEstadoFactura("");
    setDesde("");
    setHasta("");
    setError("");

    setRows([]);
    setKpis(null);
    setSeries([]);
    setCount(0);
  }

  useEffect(() => {
    loadCatalogos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta]);


  const chartData = useMemo(() => {
    if (series.length > 0) {
      return series.map((item) => ({
        mes: normalizarMesLabel(item.mes || item.label || ""),
        total: Number(item.total_facturado ?? item.total ?? 0),
      }));
    }

    const map = new Map<string, { mes: string; total: number }>();

    for (const row of rows) {
      const mes = row.fecha?.slice(0, 7) || "Sin fecha";
      if (!map.has(mes)) {
        map.set(mes, { mes, total: 0 });
      }
      const item = map.get(mes)!;
      item.total += Number(row.total || 0);
    }

    return Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [series, rows]);

  const kpiCards = [
    {
      title: "Movimientos encontrados",
      value: count,
      color: "blue" as const,
      icon: FileText,
    },
    {
      title: "Facturas emitidas",
      value: formatCurrency(totalFacturadoBruto),
      color: "emerald" as const,
      icon: CircleDollarSign,
    },
    {
      title: "Notas crédito",
      value: formatCurrency(totalNotasCredito),
      subtitle: `${cantidadNotasCredito} documento${cantidadNotasCredito === 1 ? "" : "s"}`,
      color: "rose" as const,
      icon: Receipt,
    },
    {
      title: "Ventas netas",
      value: formatCurrency(totalFacturado),
      color: "blue" as const,
      icon: CircleDollarSign,
    },
    {
      title: "IVA neto",
      value: formatCurrency(totalIva),
      color: "violet" as const,
      icon: Landmark,
    },
    {
      title: "Retenciones",
      value: formatCurrency(totalRetenciones),
      color: "amber" as const,
      icon: Receipt,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="space-y-5 p-3 md:p-5">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_25%),radial-gradient(circle_at_left,_rgba(16,185,129,0.10),_transparent_25%),linear-gradient(to_bottom_right,_rgba(255,255,255,1),_rgba(248,250,252,0.96))]" />
          <div className="relative flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Reporte inteligente
              </span>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                Buscador inteligente de facturas y notas crédito
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                Busca, analiza y exporta a Excel las facturas y notas crédito filtradas que ves en pantalla.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={buildBadgeClass("blue")}>
                Registros: {count}
              </span>
              <span className={buildBadgeClass("emerald")}>
                Saldo total: {formatCurrency(totalSaldo)}
              </span>
            </div>
          </div>
        </div>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">Filtros</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
              <div className="space-y-1.5 xl:col-span-4">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Palabra clave
                </label>
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Ej: Zapier"
                  className="h-10 rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-1.5 xl:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Factura
                </label>
                <Input
                  value={factura}
                  onChange={(e) => setFactura(e.target.value)}
                  placeholder="Ej: FV-2-2043"
                  className="h-10 rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-1.5 xl:col-span-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Cliente
                </label>
                <select
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="">Todos</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 xl:col-span-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Centro de costo
                </label>
                <select
                  value={costCenter}
                  onChange={(e) => setCostCenter(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="">Todos</option>
                  {centros.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {c.nombre}
                      {c.codigo ? ` (${c.codigo})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
              <div className="space-y-1.5 xl:col-span-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Desde
                </label>
                <Input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="h-10 rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-1.5 xl:col-span-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Hasta
                </label>
                <Input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="h-10 rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-1.5 xl:col-span-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Estado pago
                </label>
                <select
                  value={estadoPago}
                  onChange={(e) => setEstadoPago(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="">Todos</option>
                  <option value="pagada">Pagada</option>
                  <option value="parcial">Parcial</option>
                  <option value="pendiente">Pendiente</option>
                </select>
              </div>

              <div className="space-y-1.5 xl:col-span-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Estado factura
                </label>
                <select
                  value={estadoFactura}
                  onChange={(e) => setEstadoFactura(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="">Todos</option>
                  <option value="emitida">Emitida</option>
                  <option value="anulada">Anulada</option>
                  <option value="borrador">Borrador</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={buscar} disabled={loading} className="rounded-xl">
                <Search className="mr-2 h-4 w-4" />
                {loading ? "Buscando..." : "Buscar"}
              </Button>

              <Button
                variant="outline"
                onClick={limpiar}
                disabled={loading}
                className="rounded-xl"
              >
                <Eraser className="mr-2 h-4 w-4" />
                Limpiar
              </Button>

              <Button
                variant="secondary"
                onClick={exportarExcel}
                disabled={exporting || loading || rows.length === 0}
                className="rounded-xl"
              >
                <Download className="mr-2 h-4 w-4" />
                {exporting ? "Exportando..." : "Exportar Excel"}
              </Button>

              {loadingCatalogos && (
                <span className="self-center text-sm text-slate-500">
                  Actualizando catálogos...
                </span>
              )}
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
          {kpiCards.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.title}
                className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm"
              >
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className={buildBadgeClass(item.color)}>KPI</span>
                    <Icon className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="text-sm font-medium text-slate-500">{item.title}</div>
                  <div className="mt-2 text-xl font-bold tracking-tight text-slate-900">
                    {item.value}
                  </div>

                  {"subtitle" in item && item.subtitle ? (
                    <div className="mt-1 text-xs font-medium text-slate-500">
                      {item.subtitle}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">
              Evolución mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 18, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={{ stroke: "#cbd5e1" }}
                  />
                  <YAxis
                    tickFormatter={abreviar}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={{ stroke: "#cbd5e1" }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(Number(value))}
                    labelFormatter={(label) => `Mes: ${label}`}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 30px rgba(15,23,42,.12)",
                    }}
                  />
                  <Bar
                    dataKey="total"
                    fill="#1E40AF"
                    radius={[8, 8, 0, 0]}
                    name="Total facturado"
                  >
                    <LabelList
                      dataKey="total"
                      position="top"
                      formatter={formatLabelValue}
                      style={{ fontSize: 10, fontWeight: 700, fill: "#1e3a8a" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-base font-bold text-slate-900">Resultados</CardTitle>
              {rows.length > 0 && (
                <span className="text-xs text-slate-500">
                  Saldo total encontrado: {formatCurrency(totalSaldo)}
                </span>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-700">
                    <th className="px-3 py-3 font-semibold">Tipo</th>
                    <th className="px-3 py-3 font-semibold">Fecha</th>
                    <th className="px-3 py-3 font-semibold">Documento</th>
                    <th className="px-3 py-3 font-semibold">Cliente</th>
                    <th className="px-3 py-3 font-semibold">Centro de costo</th>
                    <th className="px-3 py-3 font-semibold">Descripción / observaciones</th>
                    <th className="px-3 py-3 text-right font-semibold">Subtotal</th>
                    <th className="px-3 py-3 text-right font-semibold">IVA</th>
                    <th className="px-3 py-3 text-right font-semibold">Retenciones</th>
                    <th className="px-3 py-3 text-right font-semibold">Total</th>
                    <th className="px-3 py-3 text-right font-semibold">Saldo</th>
                    <th className="px-3 py-3 font-semibold">Estado pago</th>
                    <th className="px-3 py-3 font-semibold">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={13} className="px-3 py-10 text-center text-slate-500">
                        No se encontraron resultados.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, idx) => {
                      const iva = Number(row.impuestos ?? row.impuestos_total ?? 0);
                      const retenciones = Number(row.retenciones ?? row.total_retenciones ?? 0);
                      const estadoPago = estadoPagoLabel(row);
                      const descripcion = row.descripcion || row.observaciones || "-";

                      return (
                          <tr
                            key={`${row.tipo_movimiento || "DOC"}-${row.documento || row.idfactura}-${row.factura_id ?? row.id ?? idx}`}
                            className={`border-t border-slate-100 align-top transition hover:bg-slate-50/70 ${
                              row.tipo_movimiento === "NOTA_CREDITO" ? "bg-rose-50/40" : ""
                            }`}
                          >
                            <td className="whitespace-nowrap px-3 py-3">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                  row.tipo_movimiento === "NOTA_CREDITO"
                                    ? "bg-rose-100 text-rose-700 border border-rose-200"
                                    : "bg-blue-100 text-blue-700 border border-blue-200"
                                }`}
                              >
                                {row.tipo_documento_label || row.tipo_movimiento || "Factura"}
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                              {row.fecha}
                            </td>

                            <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-900">
                              <div>{row.documento || row.idfactura}</div>

                              {row.documento_afectado ? (
                                <div className="mt-1 text-[11px] font-medium text-slate-500">
                                  Afecta: {row.documento_afectado}
                                </div>
                              ) : null}
                            </td>
                          <td className="min-w-[220px] px-3 py-3 text-slate-700">
                            {row.cliente_nombre}
                          </td>
                          <td className="min-w-[180px] px-3 py-3 text-slate-700">
                            {row.centro_costo_nombre || "-"}
                            {row.centro_costo_codigo ? (
                              <div className="text-xs text-slate-400">
                                {row.centro_costo_codigo}
                              </div>
                            ) : null}
                          </td>
                          <td className="min-w-[320px] px-3 py-3 text-slate-700">
                            <div className="line-clamp-3 whitespace-pre-wrap">
                              {descripcion}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right text-slate-700">
                            {formatCurrency(row.subtotal)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right text-slate-700">
                            {formatCurrency(iva)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right text-slate-700">
                            {formatCurrency(retenciones)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-900">
                            {formatCurrency(row.total)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right text-slate-700">
                            {formatCurrency(row.saldo)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${estadoPagoClasses(
                                estadoPago
                              )}`}
                            >
                              {estadoPago || "-"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            {row.public_url ? (
                              <a
                                href={row.public_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                              >
                                Ver documento
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400">Sin enlace</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}