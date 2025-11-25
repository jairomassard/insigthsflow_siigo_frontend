"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
interface Vendedor {
  vendedor_nombre: string;
  total: number;
  facturas?: number;
}

interface CentroCosto {
  id: string;
  nombre: string;
}

interface KPIs {
  ventas_totales: number;
  facturas: number;
  ticket_promedio: number;
}

/* -------- helpers -------- */
function formatCurrency(valor: number): string {
  return `$ ${Math.round(Number(valor || 0)).toLocaleString("es-CO")}`;
}

function abreviar(valor: number): string {
  if (valor >= 1_000_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(0)}M`;
  if (valor >= 1_000) return `${(valor / 1_000).toFixed(0)}K`;
  return `${Math.round(valor)}`;
}

/* -------- componente -------- */
export default function ReporteVendedoresPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [top5, setTop5] = useState<Vendedor[]>([]);
  const [ranking, setRanking] = useState<Vendedor[]>([]);
  const [centros, setCentros] = useState<CentroCosto[]>([]);

  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [centroCostos, setCentroCostos] = useState<string>("");

  const queryParams = useMemo(() => {
    const q: string[] = [];
    if (fechaDesde) q.push(`desde=${encodeURIComponent(fechaDesde)}`);
    if (fechaHasta) q.push(`hasta=${encodeURIComponent(fechaHasta)}`);
    if (centroCostos) q.push(`centro_costos=${encodeURIComponent(centroCostos)}`);
    return q.length ? `?${q.join("&")}` : "";
  }, [fechaDesde, fechaHasta, centroCostos]);

  /* --- fetch data --- */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await authFetch(`/reportes/vendedores${queryParams}`);
        setKpis(data.kpis || null);
        setTop5(data.top5 || []);
        setRanking(data.ranking || []);
      } catch (e) {
        console.error("Error cargando reporte vendedores", e);
      }
    };
    fetchData();
  }, [queryParams]);

  /* --- fetch centros --- */
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📊 Reporte Ventas por Vendedores</h1>

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
              <option key={cc.id} value={cc.id}>
                {cc.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg text-gray-500 font-bold">Ventas Totales</div>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(kpis?.ventas_totales || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg text-gray-500 font-bold">Facturas Emitidas</div>
            <div className="text-xl font-bold text-blue-600">{kpis?.facturas || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg text-gray-500 font-bold">Ticket Promedio</div>
            <div className="text-xl font-bold text-purple-600">
              {formatCurrency(kpis?.ticket_promedio || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Top 5 */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Vendedores</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={top5}
              margin={{ top: 10, bottom: 10, left: 5, right: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => abreviar(v)} />
              <YAxis
                type="category"
                dataKey="vendedor_nombre"
                width={220}
                tick={{ fontSize: 12 }}
              />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="total" fill="#22c55e" radius={[0, 6, 6, 0]}>
                <LabelList
                  dataKey="total"
                  position="right"
                  formatter={(v: any) => abreviar(Number(v))}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabla ranking */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking Completo</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full border-collapse border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-center">#</th>
                <th className="border p-2 text-center">Vendedor</th>
                <th className="border p-2 text-center">Facturas</th>
                <th className="border p-2 text-center">Ventas Totales</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="border p-2 text-center">{i + 1}</td>
                  <td className="border p-2">{r.vendedor_nombre || "Sin asignar"}</td>
                  <td className="border p-2 text-center">{r.facturas}</td>
                  <td className="border p-2 text-center">{formatCurrency(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
