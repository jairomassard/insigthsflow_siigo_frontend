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
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from "recharts";

/* -------- tipos -------- */
interface Producto {
  code: string;
  producto: string;
  cantidad: number;
  total: number;
}
interface KPIs {
  ventas_totales: number;
  facturas: number;
  ticket_promedio: number;
}
interface CentroCosto {
  id: string;
  nombre: string;
}
interface ProductoCatalogo {
  code: string;
  name: string;
  label: string;
}
interface HistoricoMes {
  mes: string;
  cantidad: number;
  total: number;
}
interface ProductoDetalle extends Producto {
  facturas: number;
  historico: HistoricoMes[];
}

/* -------- helpers -------- */
function abreviar(valor: number): string {
  if (valor >= 1_000_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(0)}M`;
  if (valor >= 1_000) return `${(valor / 1_000).toFixed(0)}K`;
  return `${Math.round(valor)}`;
}
function abreviarMoneda(valor: number): string {
  if (valor >= 1_000_000_000) return `$ ${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000_000) return `$ ${(valor / 1_000_000).toFixed(0)}M`;
  if (valor >= 1_000) return `$ ${(valor / 1_000).toFixed(0)}K`;
  return `$ ${Math.round(valor)}`;
}
function formatCurrency(valor: number): string {
  return `$ ${Math.round(Number(valor || 0)).toLocaleString("es-CO")}`;
}

/* -------- componente -------- */
export default function ReporteProductosPage() {
  const [top10, setTop10] = useState<Producto[]>([]);
  const [bottom10, setBottom10] = useState<Producto[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [detalle, setDetalle] = useState<ProductoDetalle | null>(null);

  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [centroCostos, setCentroCostos] = useState<string>("");
  const [metric, setMetric] = useState<"cantidad" | "total">("cantidad");
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>("");

  const queryParams = useMemo(() => {
    const q: string[] = [];
    if (fechaDesde) q.push(`desde=${encodeURIComponent(fechaDesde)}`);
    if (fechaHasta) q.push(`hasta=${encodeURIComponent(fechaHasta)}`);
    if (centroCostos) q.push(`centro_costos=${encodeURIComponent(centroCostos)}`);
    if (metric) q.push(`ordenar_por=${encodeURIComponent(metric)}`);
    return q.length ? `?${q.join("&")}` : "";
  }, [fechaDesde, fechaHasta, centroCostos, metric]);

  /* --- fetch data --- */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await authFetch(`/reportes/productos${queryParams}`);
        setTop10(data.top10 || []);
        setBottom10(data.bottom10 || []);
        setKpis(data.kpis || null);
      } catch (e) {
        console.error("Error cargando reporte productos", e);
      }
    };
    fetchData();
  }, [queryParams]);

  /* --- fetch centros de costo --- */
  useEffect(() => {
    const fetchCentros = async () => {
      try {
        const data = await authFetch(`/catalogos/centros-costo-consolidado`);
        setCentros(data || []);
      } catch (e) {
        console.error("Error cargando centros de costo", e);
      }
    };
    fetchCentros();
  }, []);

  /* --- fetch catálogo de productos --- */
  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const data = await authFetch(`/catalogos/productos`);
        setProductos(data || []);
      } catch (e) {
        console.error("Error cargando productos", e);
      }
    };
    fetchProductos();
  }, []);

  /* --- detalle producto --- */
  const fetchDetalleProducto = async () => {
    if (!productoSeleccionado) return;
    try {
      const data = await authFetch(
        `/reportes/productos/detalle?producto_code=${encodeURIComponent(productoSeleccionado)}&desde=${fechaDesde}&hasta=${fechaHasta}&centro_costo=${centroCostos}`
      );
      setDetalle(data || null);
    } catch (e) {
      console.error("Error cargando detalle producto", e);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📦 Reporte Ventas por Producto</h1>

      {/* Filtros */}
      <div className="grid gap-2 md:grid-cols-3">
        <div className="flex flex-col">
          <label className="text-sm font-medium">Fecha desde</label>
          <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium">Fecha hasta</label>
          <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium">Centro de Costos</label>
          <select
            value={centroCostos}
            onChange={(e) => setCentroCostos(e.target.value)}
            className="border rounded p-2"
          >
            <option value="">Todos</option>
            {centros.map((cc) => (
              <option key={cc.nombre} value={cc.nombre}>
                {cc.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Switch métrica */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">Métrica:</span>
        <Button variant={metric === "cantidad" ? "default" : "outline"} onClick={() => setMetric("cantidad")}>
          Unidades
        </Button>
        <Button variant={metric === "total" ? "default" : "outline"} onClick={() => setMetric("total")}>
          Valor ($)
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-sm text-gray-500">Ventas Totales</div>
            <div className="text-xl font-bold text-green-600">{formatCurrency(kpis?.ventas_totales || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-sm text-gray-500">Facturas Emitidas</div>
            <div className="text-xl font-bold text-blue-600">{kpis?.facturas || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-sm text-gray-500">Ticket Promedio</div>
            <div className="text-xl font-bold text-purple-600">{formatCurrency(kpis?.ticket_promedio || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Top 10 en fila */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top 10 Más Vendidos ({metric === "cantidad" ? "Unidades" : "Valor en $"})</CardTitle></CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={top10} margin={{ top: 15, bottom: 15, left: 5, right: 35 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => metric === "cantidad" ? abreviar(v) : abreviarMoneda(v)} />
                <YAxis type="category" dataKey="producto" width={180} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => metric === "cantidad" ? abreviar(v) : abreviarMoneda(v)} />
                <Bar dataKey={metric} fill="#22c55e" radius={[0, 6, 6, 0]}>
                  <LabelList dataKey={metric} position="right" formatter={(v: any) => metric === "cantidad" ? abreviar(Number(v)) : abreviarMoneda(Number(v))} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top 10 Menos Vendidos ({metric === "cantidad" ? "Unidades" : "Valor en $"})</CardTitle></CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={bottom10} margin={{ top: 15, bottom: 15, left: 5, right: 35 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => metric === "cantidad" ? abreviar(v) : abreviarMoneda(v)} />
                <YAxis type="category" dataKey="producto" width={180} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => metric === "cantidad" ? abreviar(v) : abreviarMoneda(v)} />
                <Bar dataKey={metric} fill="#ef4444" radius={[0, 6, 6, 0]}>
                  <LabelList dataKey={metric} position="right" formatter={(v: any) => metric === "cantidad" ? abreviar(Number(v)) : abreviarMoneda(Number(v))} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detalle producto */}
      <Card>
        <CardHeader><CardTitle>Detalle Producto</CardTitle></CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <select
              value={productoSeleccionado}
              onChange={(e) => setProductoSeleccionado(e.target.value)}
              className="border rounded p-2"
            >
              <option value="">Seleccione un producto</option>
              {productos.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.label}
                </option>
              ))}
            </select>
            <Button onClick={fetchDetalleProducto}>Ver Detalle</Button>
          </div>

          {detalle && (
            <div className="mt-4 space-y-4">
              <div><b>Producto:</b> {detalle.producto}</div>
              <div><b>Código:</b> {detalle.code}</div>
              <div><b>Unidades vendidas:</b> {detalle.cantidad}</div>
              <div><b>Total ventas:</b> {formatCurrency(detalle.total)}</div>
              <div><b>Facturas asociadas:</b> {detalle.facturas}</div>

              {/* Histórico mensual */}
              <Card className="mt-4">
                <CardHeader><CardTitle>Evolución Mensual</CardTitle></CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={detalle.historico} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" tickFormatter={(v) => new Date(v).toLocaleDateString("es-CO", { month: "short", year: "2-digit" })} />
                      <YAxis yAxisId="left" orientation="left" tickFormatter={(v) => abreviar(v)} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => abreviarMoneda(v)} />
                      <Tooltip formatter={(v: number, name) => name === "cantidad" ? abreviar(v) : abreviarMoneda(v)} />
                      <Bar yAxisId="left" dataKey="cantidad" fill="#3b82f6" radius={[4,4,0,0]} />
                      <Bar yAxisId="right" dataKey="total" fill="#10b981" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
