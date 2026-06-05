"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api";
import { getDefaultYearToDateRange } from "@/lib/dateDefaults";
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

interface Cliente {
  id?: string;
  nombre?: string;
  cliente?: string;
  label?: string;
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
  const n = Number(valor || 0);
  const abs = Math.abs(n);

  if (abs >= 1_000_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}K`;

  return `${Math.round(n)}`;
}

function getClienteNombre(cliente: Cliente): string {
  return String(cliente?.nombre || cliente?.cliente || cliente?.label || "").trim();
}

/* -------- componente -------- */

export default function ReporteVendedoresPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [top5, setTop5] = useState<Vendedor[]>([]);
  const [ranking, setRanking] = useState<Vendedor[]>([]);

  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [defaultDates] = useState(() => getDefaultYearToDateRange());

  const [fechaDesde, setFechaDesde] = useState<string>(defaultDates.desde);
  const [fechaHasta, setFechaHasta] = useState<string>(defaultDates.hasta);
  const [centroCostos, setCentroCostos] = useState<string>("");
  const [clienteSel, setClienteSel] = useState<string>("");

  /* ---------------- QUERY PARAMS ---------------- */

  const queryParams = useMemo(() => {
    const q: string[] = [];

    if (fechaDesde) q.push(`desde=${encodeURIComponent(fechaDesde)}`);
    if (fechaHasta) q.push(`hasta=${encodeURIComponent(fechaHasta)}`);
    if (centroCostos) q.push(`centro_costos=${encodeURIComponent(centroCostos)}`);
    if (clienteSel) q.push(`cliente=${encodeURIComponent(clienteSel)}`);

    return q.length ? `?${q.join("&")}` : "";
  }, [fechaDesde, fechaHasta, centroCostos, clienteSel]);

  /* ---------------- LOAD DATA ---------------- */

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await authFetch(`/reportes/vendedores${queryParams}`);

        setKpis(data?.kpis || null);
        setTop5(Array.isArray(data?.top5) ? data.top5 : []);
        setRanking(Array.isArray(data?.ranking) ? data.ranking : []);
      } catch (e) {
        console.error("Error cargando reporte vendedores", e);
        setKpis(null);
        setTop5([]);
        setRanking([]);
      }
    };

    fetchData();
  }, [queryParams]);

  /* ---------------- LOAD CENTROS ---------------- */

  useEffect(() => {
    const fetchCentros = async () => {
      try {
        const data = await authFetch(`/catalogos/centros-costo-consolidado`);
        setCentros(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Error cargando centros de costo", e);
        setCentros([]);
      }
    };

    fetchCentros();
  }, []);

  /* ---------------- LOAD CLIENTES ---------------- */

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const qs: string[] = [];

        if (fechaDesde) qs.push(`desde=${encodeURIComponent(fechaDesde)}`);
        if (fechaHasta) qs.push(`hasta=${encodeURIComponent(fechaHasta)}`);
        if (centroCostos) qs.push(`centro_costos=${encodeURIComponent(centroCostos)}`);

        const query = qs.length ? `?${qs.join("&")}` : "";
        const data = await authFetch(`/catalogos/clientes-facturas${query}`);

        setClientes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error cargando clientes", err);
        setClientes([]);
      }
    };

    fetchClientes();
  }, [fechaDesde, fechaHasta, centroCostos]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📊 Reporte de ventas netas por vendedores</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ventas agrupadas por vendedor según filtros de fecha, centro de costos y cliente.
        </p>
      </div>

      {/* Filtros */}
      <div className="grid gap-2 md:grid-cols-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium">Fecha desde</label>
          <Input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium">Fecha hasta</label>
          <Input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium">Centro de Costos</label>
          <select
            value={centroCostos}
            onChange={(e) => {
              setCentroCostos(e.target.value);
              setClienteSel("");
            }}
            className="rounded border p-2"
          >
            <option value="">Todos</option>

            {centros.map((cc) => (
              <option key={cc.id || cc.nombre} value={cc.id}>
                {cc.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium">Cliente</label>
          <select
            value={clienteSel}
            onChange={(e) => setClienteSel(e.target.value)}
            className="rounded border p-2"
          >
            <option value="">Todos</option>

            {clientes.map((cliente, idx) => {
              const nombre = getClienteNombre(cliente);

              if (!nombre) return null;

              return (
                <option key={`${nombre}-${idx}`} value={nombre}>
                  {nombre}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-bold text-gray-500">Ventas netas</div>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(kpis?.ventas_totales || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-bold text-gray-500">Facturas Emitidas</div>
            <div className="text-xl font-bold text-blue-600">
              {kpis?.facturas || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-bold text-gray-500">Ticket Promedio</div>
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
          {top5.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              No hay información para los filtros seleccionados.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={top5}
                margin={{ top: 10, bottom: 10, left: 5, right: 35 }}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  type="number"
                  tickFormatter={(v) => abreviar(Number(v || 0))}
                />

                <YAxis
                  type="category"
                  dataKey="vendedor_nombre"
                  width={220}
                  tick={{ fontSize: 12 }}
                />

                <Tooltip
                  formatter={(v: number) => formatCurrency(Number(v || 0))}
                  labelFormatter={(label) => `Vendedor: ${label}`}
                />

                <Bar dataKey="total" fill="#22c55e" radius={[0, 6, 6, 0]}>
                  <LabelList
                    dataKey="total"
                    position="right"
                    formatter={(v: any) => abreviar(Number(v || 0))}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tabla ranking */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking Completo</CardTitle>
        </CardHeader>

        <CardContent className="max-h-[400px] overflow-x-auto overflow-y-auto">
          <table className="w-full border-collapse border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-center">#</th>
                <th className="border p-2 text-center">Vendedor</th>
                <th className="border p-2 text-center">Facturas</th>
                <th className="border p-2 text-center">Ventas netas</th>
              </tr>
            </thead>

            <tbody>
              {ranking.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="border p-4 text-center text-gray-500"
                  >
                    No hay información para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                ranking.map((r, i) => (
                  <tr key={`${r.vendedor_nombre}-${i}`} className="hover:bg-gray-50">
                    <td className="border p-2 text-center">{i + 1}</td>

                    <td className="border p-2">
                      {r.vendedor_nombre || "Sin asignar"}
                    </td>

                    <td className="border p-2 text-center">
                      {r.facturas || 0}
                    </td>

                    <td className="border p-2 text-center">
                      {formatCurrency(r.total || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}