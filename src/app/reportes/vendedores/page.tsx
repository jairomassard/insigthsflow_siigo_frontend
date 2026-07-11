"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { authFetch } from "@/lib/api";
import { getDefaultYearToDateRange } from "@/lib/dateDefaults";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { RefreshCcw, ArrowUp, ArrowDown, ArrowUpDown, Search } from "lucide-react";
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

interface HistoricoMes {
  mes: string;
  total: number;
  facturas: number;
}

interface VendedorDetalle {
  vendedor_nombre: string;
  total: number;
  ventas_netas?: number;
  facturas: number;
  notas_credito?: number;
  historico: HistoricoMes[];
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

function formatMesCorto(value: any): string {
  try {
    const d = new Date(value);
    return d.toLocaleString("es-CO", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    });
  } catch {
    return "Fecha inválida";
  }
}

function HistoricoTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-bold text-gray-800">{formatMesCorto(item.mes)}</div>

      <div className="flex justify-between gap-4">
        <span className="text-gray-500">Ventas netas:</span>
        <span className="font-semibold text-gray-900">
          {formatCurrency(item.total || 0)}
        </span>
      </div>

      <div className="flex justify-between gap-4">
        <span className="text-gray-500">Facturas:</span>
        <span className="font-semibold text-gray-900">
          {Number(item.facturas || 0).toLocaleString("es-CO")}
        </span>
      </div>
    </div>
  );
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

  const [vendedorSeleccionado, setVendedorSeleccionado] = useState<string>("");
  const [detalleVendedor, setDetalleVendedor] = useState<VendedorDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [mesHistoricoSeleccionado, setMesHistoricoSeleccionado] = useState<any | null>(null);
  const detalleRef = useRef<HTMLDivElement>(null);

  const [busquedaRanking, setBusquedaRanking] = useState("");
  const [ordenRanking, setOrdenRanking] = useState<{
    columna: "vendedor_nombre" | "facturas" | "total";
    dir: "asc" | "desc";
  }>({ columna: "total", dir: "desc" });

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

  /* ---------------- DETALLE VENDEDOR ---------------- */

  const fetchDetalleVendedor = async (nombreOverride?: string) => {
    const nombre = nombreOverride ?? vendedorSeleccionado;
    if (!nombre) return;

    setLoadingDetalle(true);
    try {
      const qs: string[] = [`vendedor=${encodeURIComponent(nombre)}`];
      if (fechaDesde) qs.push(`desde=${encodeURIComponent(fechaDesde)}`);
      if (fechaHasta) qs.push(`hasta=${encodeURIComponent(fechaHasta)}`);
      if (centroCostos) qs.push(`centro_costo=${encodeURIComponent(centroCostos)}`);

      const data = await authFetch(`/reportes/vendedores/detalle?${qs.join("&")}`);
      setDetalleVendedor(data || null);
      setMesHistoricoSeleccionado(null);
    } catch (e) {
      console.error("Error cargando detalle vendedor", e);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const handleSeleccionVendedor = (nombre: string) => {
    setVendedorSeleccionado(nombre);
    if (nombre) fetchDetalleVendedor(nombre);
    else setDetalleVendedor(null);
  };

  const handleClickVendedor = (nombre?: string) => {
    if (!nombre) return;
    handleSeleccionVendedor(nombre);
    detalleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleLimpiarDetalle = () => {
    setVendedorSeleccionado("");
    setDetalleVendedor(null);
  };

  // Asegurar que las fechas se mantengan en el mes correcto (UTC)
  const historicoConFechasSeguras = useMemo(() => {
    if (!detalleVendedor?.historico?.length) return [];
    return detalleVendedor.historico.map((item) => {
      const d = new Date(item.mes);
      d.setUTCHours(12);
      return { ...item, mes: d.toISOString() };
    });
  }, [detalleVendedor]);

  /* ---------------- RANKING: BUSQUEDA Y ORDEN ---------------- */

  const toggleOrdenRanking = (columna: typeof ordenRanking.columna) => {
    setOrdenRanking((prev) =>
      prev.columna === columna
        ? { columna, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { columna, dir: "desc" }
    );
  };

  const rankingFiltrado = useMemo(() => {
    const q = busquedaRanking.trim().toLowerCase();
    const base = !q
      ? ranking
      : ranking.filter((r) =>
          (r.vendedor_nombre || "").toLowerCase().includes(q)
        );
    const { columna, dir } = ordenRanking;
    const sorted = [...base].sort((a: any, b: any) => {
      const va = a[columna];
      const vb = b[columna];
      if (typeof va === "string" || typeof vb === "string") {
        return String(va ?? "").localeCompare(String(vb ?? ""));
      }
      return Number(va ?? 0) - Number(vb ?? 0);
    });
    if (dir === "desc") sorted.reverse();
    return sorted;
  }, [ranking, busquedaRanking, ordenRanking]);

  const IconoOrdenRanking = ({
    columna,
  }: {
    columna: typeof ordenRanking.columna;
  }) => {
    if (ordenRanking.columna !== columna) {
      return <ArrowUpDown size={12} className="text-gray-300" />;
    }
    return ordenRanking.dir === "asc" ? (
      <ArrowUp size={12} className="text-gray-700" />
    ) : (
      <ArrowDown size={12} className="text-gray-700" />
    );
  };

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
          <SearchableSelect
            options={clientes
              .map((cliente) => getClienteNombre(cliente))
              .filter(Boolean)
              .map((nombre) => ({ value: nombre, label: nombre }))}
            value={clienteSel}
            onChange={setClienteSel}
            placeholder="Todos"
            emptyText="No se encontraron clientes."
          />
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
          <p className="text-xs text-gray-500">Haz clic en una barra para ver su detalle.</p>
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

                <Bar
                  dataKey="total"
                  fill="#22c55e"
                  radius={[0, 6, 6, 0]}
                  cursor="pointer"
                  onClick={(data: any) => handleClickVendedor(data?.vendedor_nombre)}
                >
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

      {/* Detalle vendedor */}
      <div ref={detalleRef} className="scroll-mt-4">
        <Card className="relative">
          <CardHeader className="flex justify-between items-start">
            <CardTitle>Detalle Vendedor</CardTitle>
            {detalleVendedor && (
              <button
                className="text-gray-500 hover:text-red-500 text-xl font-bold absolute top-2 right-2"
                onClick={handleLimpiarDetalle}
                title="Cerrar"
              >
                &times;
              </button>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchableSelect
                className="w-full sm:w-96"
                options={ranking.map((r) => ({
                  value: r.vendedor_nombre,
                  label: r.vendedor_nombre || "Sin asignar",
                }))}
                value={vendedorSeleccionado}
                onChange={handleSeleccionVendedor}
                placeholder="Busca un vendedor..."
                emptyText="No se encontraron vendedores."
              />
              <Button
                onClick={() => fetchDetalleVendedor()}
                disabled={!vendedorSeleccionado || loadingDetalle}
              >
                {loadingDetalle ? (
                  <RefreshCcw className="mr-1 inline animate-spin" size={14} />
                ) : null}
                {loadingDetalle ? "Cargando..." : "Ver Detalle"}
              </Button>
              <Button variant="outline" onClick={handleLimpiarDetalle}>
                Limpiar
              </Button>
            </div>

            {detalleVendedor && (
              <div className="mt-4 space-y-4">
                <div>
                  <b>Vendedor:</b> {detalleVendedor.vendedor_nombre || "Sin asignar"}
                </div>
                <div>
                  <b>Ventas netas:</b>{" "}
                  {formatCurrency(detalleVendedor.ventas_netas ?? detalleVendedor.total)}
                </div>
                <div>
                  <b>Facturas:</b> {detalleVendedor.facturas}
                </div>
                {!!detalleVendedor.notas_credito && (
                  <div>
                    <b>Notas crédito:</b> {formatCurrency(detalleVendedor.notas_credito)}
                  </div>
                )}

                {/* Histórico mensual */}
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Evolución Mensual</CardTitle>
                    <p className="text-xs text-gray-500">
                      En tablet toca una barra para ver el valor completo.
                    </p>
                  </CardHeader>

                  <CardContent>
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={historicoConFechasSeguras}
                          margin={{ top: 28, right: 24, bottom: 10, left: 10 }}
                          onClick={(state: any) => {
                            const item = state?.activePayload?.[0]?.payload;
                            if (item) setMesHistoricoSeleccionado(item);
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />

                          <XAxis dataKey="mes" tickFormatter={(mes) => formatMesCorto(mes)} />

                          <YAxis tickFormatter={(v) => abreviar(v)} />

                          <Tooltip content={<HistoricoTooltip />} />

                          <Bar dataKey="total" name="Ventas netas" fill="#10b981" radius={[4, 4, 0, 0]}>
                            <LabelList
                              dataKey="total"
                              position="top"
                              formatter={(v: any) => abreviar(Number(v || 0))}
                              style={{ fontSize: 11, fontWeight: 700 }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {mesHistoricoSeleccionado && (
                      <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm md:hidden">
                        <div className="font-bold text-gray-800">
                          {formatMesCorto(mesHistoricoSeleccionado.mes)}
                        </div>

                        <div className="mt-1 flex justify-between gap-4">
                          <span className="text-gray-500">Ventas netas:</span>
                          <span className="font-semibold">
                            {formatCurrency(mesHistoricoSeleccionado.total || 0)}
                          </span>
                        </div>

                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Facturas:</span>
                          <span className="font-semibold">
                            {Number(mesHistoricoSeleccionado.facturas || 0).toLocaleString("es-CO")}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabla ranking */}
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Ranking Completo</CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              {rankingFiltrado.length.toLocaleString("es-CO")} vendedor
              {rankingFiltrado.length === 1 ? "" : "es"}. Haz clic en una fila o en un
              encabezado de columna para ordenar.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <Input
                value={busquedaRanking}
                onChange={(e) => setBusquedaRanking(e.target.value)}
                placeholder="Buscar vendedor..."
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={ordenRanking.columna}
                onChange={(e) => {
                  const columna = e.target.value as typeof ordenRanking.columna;
                  setOrdenRanking((prev) => ({ columna, dir: prev.dir }));
                }}
                className="border rounded-md p-2 text-sm bg-background"
              >
                <option value="total">Ordenar: Ventas netas</option>
                <option value="facturas">Ordenar: Facturas</option>
                <option value="vendedor_nombre">Ordenar: Vendedor (A-Z)</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  setOrdenRanking((prev) => ({
                    ...prev,
                    dir: prev.dir === "asc" ? "desc" : "asc",
                  }))
                }
                className="flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
                title={ordenRanking.dir === "asc" ? "Ascendente" : "Descendente"}
              >
                {ordenRanking.dir === "asc" ? (
                  <ArrowUp size={14} />
                ) : (
                  <ArrowDown size={14} />
                )}
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="max-h-[400px] overflow-x-auto overflow-y-auto">
          <table className="w-full border-collapse border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-center">#</th>
                <th
                  className="border p-2 text-center cursor-pointer select-none"
                  onClick={() => toggleOrdenRanking("vendedor_nombre")}
                >
                  <span className="inline-flex items-center gap-1 justify-center w-full">
                    Vendedor <IconoOrdenRanking columna="vendedor_nombre" />
                  </span>
                </th>
                <th
                  className="border p-2 text-center cursor-pointer select-none"
                  onClick={() => toggleOrdenRanking("facturas")}
                >
                  <span className="inline-flex items-center gap-1 justify-center w-full">
                    Facturas <IconoOrdenRanking columna="facturas" />
                  </span>
                </th>
                <th
                  className="border p-2 text-center cursor-pointer select-none"
                  onClick={() => toggleOrdenRanking("total")}
                >
                  <span className="inline-flex items-center gap-1 justify-center w-full">
                    Ventas netas <IconoOrdenRanking columna="total" />
                  </span>
                </th>
              </tr>
            </thead>

            <tbody>
              {rankingFiltrado.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="border p-4 text-center text-gray-500"
                  >
                    No hay información para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                rankingFiltrado.map((r, i) => (
                  <tr
                    key={`${r.vendedor_nombre}-${i}`}
                    onClick={() => handleClickVendedor(r.vendedor_nombre)}
                    className="cursor-pointer hover:bg-emerald-50"
                  >
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