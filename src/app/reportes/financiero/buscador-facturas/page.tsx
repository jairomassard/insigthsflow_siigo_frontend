"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  subtotal?: number;
  iva?: number;
  impuestos?: number;
  retenciones?: number;
  total_facturado?: number;
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

function abreviar(value: number | null | undefined) {
  const n = Number(value || 0);
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
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
      return "bg-emerald-100 text-emerald-800";
    case "pendiente":
      return "bg-red-100 text-red-800";
    case "parcial":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function normalizarMesLabel(mes: string) {
  if (!mes) return "";
  if (/^\d{4}-\d{2}$/.test(mes)) return mes;
  return mes;
}

async function descargarArchivoConAuth(url: string) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("jwt") ||
        ""
      : "";

  const res = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  if (!res.ok) {
    let message = "No fue posible exportar el archivo.";
    try {
      const maybeJson = await res.clone().json();
      if (maybeJson?.error) message = maybeJson.error;
    } catch {}
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
  const fileName = decodeURIComponent(match?.[1] || match?.[2] || "busqueda_inteligente_facturas.xlsx");

  const fileUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = fileUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(fileUrl);
}

export default function BuscadorFacturasPage() {
  const today = new Date();
  const defaultHasta = today.toISOString().slice(0, 10);
  const defaultDesde = `${today.getFullYear() - 1}-01-01`;

  const [q, setQ] = useState("zapier");
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

  async function exportarExcel() {
    setExporting(true);
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

      await descargarArchivoConAuth(
        `/reportes/busqueda-inteligente-facturas/export.xlsx?${params.toString()}`
      );
    } catch (err: any) {
      console.error("ERROR EXPORTANDO EXCEL:", err);
      setError(err?.message || "No fue posible exportar a Excel.");
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
    setDesde(defaultDesde);
    setHasta(defaultHasta);
    setError("");
  }

  useEffect(() => {
    loadCatalogos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta]);

  useEffect(() => {
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Buscador inteligente de facturas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Busca facturas por palabra clave, número, cliente, centro de costo y rango de fechas.
        </p>
      </div>

      <Card className="border-0 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
            <div className="space-y-2 xl:col-span-4">
              <label className="text-sm font-medium">Palabra clave</label>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ej: Zapier"
              />
            </div>

            <div className="space-y-2 xl:col-span-2">
              <label className="text-sm font-medium">Factura</label>
              <Input
                value={factura}
                onChange={(e) => setFactura(e.target.value)}
                placeholder="Ej: FV-2-2043"
              />
            </div>

            <div className="space-y-2 xl:col-span-2">
              <label className="text-sm font-medium">Cliente</label>
              <select
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 xl:col-span-2">
              <label className="text-sm font-medium">Centro de costo</label>
              <select
                value={costCenter}
                onChange={(e) => setCostCenter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                {centros.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {c.nombre}{c.codigo ? ` (${c.codigo})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 xl:col-span-1">
              <label className="text-sm font-medium">Desde</label>
              <Input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>

            <div className="space-y-2 xl:col-span-1">
              <label className="text-sm font-medium">Hasta</label>
              <Input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>

            <div className="space-y-2 xl:col-span-2">
              <label className="text-sm font-medium">Estado pago</label>
              <select
                value={estadoPago}
                onChange={(e) => setEstadoPago(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                <option value="pagada">Pagada</option>
                <option value="parcial">Parcial</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </div>

            <div className="space-y-2 xl:col-span-2">
              <label className="text-sm font-medium">Estado factura</label>
              <select
                value={estadoFactura}
                onChange={(e) => setEstadoFactura(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                <option value="emitida">Emitida</option>
                <option value="anulada">Anulada</option>
                <option value="borrador">Borrador</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={buscar} disabled={loading}>
              {loading ? "Buscando..." : "Buscar"}
            </Button>

            <Button
              variant="outline"
              onClick={limpiar}
              disabled={loading}
            >
              Limpiar
            </Button>

            <Button
              variant="secondary"
              onClick={exportarExcel}
              disabled={exporting || loading || rows.length === 0}
            >
              {exporting ? "Exportando..." : "Exportar Excel"}
            </Button>

            {loadingCatalogos && (
              <span className="self-center text-sm text-muted-foreground">
                Actualizando catálogos...
              </span>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Facturas encontradas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{count}</CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Subtotal</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">
            {formatCurrency(totalSubtotal)}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">IVA</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">
            {formatCurrency(totalIva)}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Retenciones</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">
            {formatCurrency(totalRetenciones)}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total facturado</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">
            {formatCurrency(totalFacturado)}
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Evolución mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={abreviar} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(Number(value))}
                  labelFormatter={(label) => `Mes: ${label}`}
                />
                <Bar
                  dataKey="total"
                  fill="#1E40AF"
                  radius={[6, 6, 0, 0]}
                  name="Total facturado"
                >
                  <LabelList
                    dataKey="total"
                    position="top"
                    formatter={formatLabelValue}
                    style={{ fontSize: 10 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-md border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-3 py-2 font-semibold">Fecha</th>
                  <th className="px-3 py-2 font-semibold">Factura</th>
                  <th className="px-3 py-2 font-semibold">Cliente</th>
                  <th className="px-3 py-2 font-semibold">Centro de costo</th>
                  <th className="px-3 py-2 font-semibold">Descripción / observaciones</th>
                  <th className="px-3 py-2 font-semibold text-right">Subtotal</th>
                  <th className="px-3 py-2 font-semibold text-right">IVA</th>
                  <th className="px-3 py-2 font-semibold text-right">Retenciones</th>
                  <th className="px-3 py-2 font-semibold text-right">Total</th>
                  <th className="px-3 py-2 font-semibold text-right">Saldo</th>
                  <th className="px-3 py-2 font-semibold">Estado pago</th>
                  <th className="px-3 py-2 font-semibold">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={12} className="px-3 py-8 text-center text-muted-foreground">
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
                        key={`${row.idfactura}-${row.factura_id ?? row.id ?? idx}`}
                        className="border-t align-top"
                      >
                        <td className="whitespace-nowrap px-3 py-2">{row.fecha}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-medium">{row.idfactura}</td>
                        <td className="min-w-[220px] px-3 py-2">{row.cliente_nombre}</td>
                        <td className="min-w-[180px] px-3 py-2">
                          {row.centro_costo_nombre || "-"}
                          {row.centro_costo_codigo ? (
                            <div className="text-xs text-muted-foreground">
                              {row.centro_costo_codigo}
                            </div>
                          ) : null}
                        </td>
                        <td className="min-w-[320px] px-3 py-2">
                          <div className="line-clamp-3 whitespace-pre-wrap">
                            {descripcion}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          {formatCurrency(row.subtotal)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          {formatCurrency(iva)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          {formatCurrency(retenciones)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">
                          {formatCurrency(row.total)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          {formatCurrency(row.saldo)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${estadoPagoClasses(
                              estadoPago
                            )}`}
                          >
                            {estadoPago || "-"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {row.public_url ? (
                            <a
                              href={row.public_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Ver factura
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {rows.length > 0 && (
            <div className="mt-3 text-xs text-muted-foreground">
              Saldo total encontrado: {formatCurrency(totalSaldo)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}