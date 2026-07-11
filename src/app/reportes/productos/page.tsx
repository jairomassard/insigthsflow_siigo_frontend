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

interface Producto {
  code: string;
  producto: string;
  cantidad: number;
  total: number;
  facturas?: number;
}
interface KPIs {
  ventas_totales: number;
  ventas_facturadas?: number;
  unidades_facturadas?: number;
  facturas: number;
  ticket_promedio: number;
  fuente?: string;
  logica?: string;
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
      <div className="mb-1 font-bold text-gray-800">
        {formatMesCorto(item.mes)}
      </div>

      <div className="flex justify-between gap-4">
        <span className="text-gray-500">Unidades:</span>
        <span className="font-semibold text-gray-900">
          {Number(item.cantidad || 0).toLocaleString("es-CO")}
        </span>
      </div>

      <div className="flex justify-between gap-4">
        <span className="text-gray-500">Total facturado:</span>
        <span className="font-semibold text-gray-900">
          {formatCurrency(item.total || 0)}
        </span>
      </div>
    </div>
  );
}

export default function ReporteProductosPage() {
  const [top10, setTop10] = useState<Producto[]>([]);
  const [bottom10, setBottom10] = useState<Producto[]>([]);
  const [todos, setTodos] = useState<Producto[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [detalle, setDetalle] = useState<ProductoDetalle | null>(null);

  const [defaultDates] = useState(() => getDefaultYearToDateRange());

  const [fechaDesde, setFechaDesde] = useState<string>(defaultDates.desde);
  const [fechaHasta, setFechaHasta] = useState<string>(defaultDates.hasta);
  const [centroCostos, setCentroCostos] = useState<string>("");

  const [metric, setMetric] = useState<"cantidad" | "total">("cantidad");
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>("");
  const [mesHistoricoSeleccionado, setMesHistoricoSeleccionado] = useState<any | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const detalleRef = useRef<HTMLDivElement>(null);

  const [busquedaTabla, setBusquedaTabla] = useState("");
  const [ordenTabla, setOrdenTabla] = useState<{
    columna: "producto" | "code" | "cantidad" | "total" | "facturas";
    dir: "asc" | "desc";
  }>({ columna: "total", dir: "desc" });
  const [paginaTabla, setPaginaTabla] = useState(1);
  const FILAS_POR_PAGINA = 20;

  const queryParams = useMemo(() => {
    const q: string[] = [];
    if (fechaDesde) q.push(`desde=${encodeURIComponent(fechaDesde)}`);
    if (fechaHasta) q.push(`hasta=${encodeURIComponent(fechaHasta)}`);
    if (centroCostos) q.push(`centro_costos=${encodeURIComponent(centroCostos)}`);
    if (metric) q.push(`ordenar_por=${encodeURIComponent(metric)}`);
    return q.length ? `?${q.join("&")}` : "";
  }, [fechaDesde, fechaHasta, centroCostos, metric]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await authFetch(`/reportes/productos${queryParams}`);
        setTop10(data.top10 || []);
        setBottom10(data.bottom10 || []);
        setTodos(data.todos || []);
        setKpis(data.kpis || null);
        setPaginaTabla(1);
      } catch (e) {
        console.error("Error cargando reporte productos", e);
      }
    };
    fetchData();
  }, [queryParams]);

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

  const fetchDetalleProducto = async (codeOverride?: string) => {
    const code = codeOverride ?? productoSeleccionado;
    if (!code) return;
    setLoadingDetalle(true);
    try {
      const data = await authFetch(
        `/reportes/productos/detalle?producto_code=${encodeURIComponent(
          code
        )}&desde=${fechaDesde}&hasta=${fechaHasta}&centro_costo=${centroCostos}`
      );
      setDetalle(data || null);
      setMesHistoricoSeleccionado(null);
    } catch (e) {
      console.error("Error cargando detalle producto", e);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const handleSeleccionProducto = (code: string) => {
    setProductoSeleccionado(code);
    if (code) fetchDetalleProducto(code);
    else setDetalle(null);
  };

  const handleClickBarra = (code?: string) => {
    if (!code) return;
    handleSeleccionProducto(code);
    detalleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleLimpiar = () => {
    setProductoSeleccionado("");
    setDetalle(null);
  };

  const toggleOrdenTabla = (columna: typeof ordenTabla.columna) => {
    setOrdenTabla((prev) =>
      prev.columna === columna
        ? { columna, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { columna, dir: "desc" }
    );
    setPaginaTabla(1);
  };

  const tablaFiltrada = useMemo(() => {
    const q = busquedaTabla.trim().toLowerCase();
    const base = !q
      ? todos
      : todos.filter(
          (p) =>
            p.producto.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q)
        );
    const { columna, dir } = ordenTabla;
    const sorted = [...base].sort((a, b) => {
      const va = a[columna];
      const vb = b[columna];
      if (typeof va === "string" || typeof vb === "string") {
        return String(va ?? "").localeCompare(String(vb ?? ""));
      }
      return Number(va ?? 0) - Number(vb ?? 0);
    });
    if (dir === "desc") sorted.reverse();
    return sorted;
  }, [todos, busquedaTabla, ordenTabla]);

  const totalPaginasTabla = Math.max(
    1,
    Math.ceil(tablaFiltrada.length / FILAS_POR_PAGINA)
  );
  const paginaTablaSegura = Math.min(paginaTabla, totalPaginasTabla);
  const tablaPagina = useMemo(
    () =>
      tablaFiltrada.slice(
        (paginaTablaSegura - 1) * FILAS_POR_PAGINA,
        paginaTablaSegura * FILAS_POR_PAGINA
      ),
    [tablaFiltrada, paginaTablaSegura]
  );

  const IconoOrden = ({
    columna,
  }: {
    columna: typeof ordenTabla.columna;
  }) => {
    if (ordenTabla.columna !== columna) {
      return <ArrowUpDown size={12} className="text-gray-300" />;
    }
    return ordenTabla.dir === "asc" ? (
      <ArrowUp size={12} className="text-gray-700" />
    ) : (
      <ArrowDown size={12} className="text-gray-700" />
    );
  };

  // ✅ Fix: asegurar que las fechas se mantengan en el mes correcto (UTC)
  const historicoConFechasSeguras = useMemo(() => {
    if (!detalle?.historico?.length) return [];
    return detalle.historico.map((item) => {
      const d = new Date(item.mes);
      d.setUTCHours(12); // fuerza a mitad del día UTC para evitar desfase
      return { ...item, mes: d.toISOString() };
    });
  }, [detalle]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📦 Reporte de Productos Facturados</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ranking de productos según ítems de facturas emitidas. No descuenta notas crédito porque estas no tienen detalle confiable por producto.
        </p>
      </div>

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
        <Button
          variant={metric === "cantidad" ? "default" : "outline"}
          onClick={() => setMetric("cantidad")}
        >
          Unidades
        </Button>
        <Button
          variant={metric === "total" ? "default" : "outline"}
          onClick={() => setMetric("total")}
        >
          Valor facturado ($)
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg text-gray-500 font-bold">Ventas facturadas por producto</div>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(kpis?.ventas_facturadas ?? kpis?.ventas_totales ?? 0)}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Suma de ítems de facturas emitidas. No descuenta notas crédito.
            </p>
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

      {/* Top 10 en fila */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              Top 10 Más Facturados ({metric === "cantidad" ? "Unidades" : "Valor facturado"})
            </CardTitle>
            <p className="text-xs text-gray-500">Haz clic en una barra para ver su detalle.</p>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={top10} margin={{ top: 15, bottom: 15, left: 5, right: 35 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => (metric === "cantidad" ? abreviar(v) : abreviarMoneda(v))}
                />
                <YAxis type="category" dataKey="producto" width={180} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(v: number) => (metric === "cantidad" ? abreviar(v) : abreviarMoneda(v))}
                />
                <Bar
                  dataKey={metric}
                  fill="#22c55e"
                  radius={[0, 6, 6, 0]}
                  cursor="pointer"
                  onClick={(data: any) => handleClickBarra(data?.code)}
                >
                  <LabelList
                    dataKey={metric}
                    position="right"
                    formatter={(v: any) =>
                      metric === "cantidad" ? abreviar(Number(v)) : abreviarMoneda(Number(v))
                    }
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Top 10 Menos Facturados ({metric === "cantidad" ? "Unidades" : "Valor facturado"})
            </CardTitle>
            <p className="text-xs text-gray-500">Haz clic en una barra para ver su detalle.</p>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={bottom10}
                margin={{ top: 15, bottom: 15, left: 5, right: 35 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => (metric === "cantidad" ? abreviar(v) : abreviarMoneda(v))}
                />
                <YAxis type="category" dataKey="producto" width={180} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(v: number) => (metric === "cantidad" ? abreviar(v) : abreviarMoneda(v))}
                />
                <Bar
                  dataKey={metric}
                  fill="#ef4444"
                  radius={[0, 6, 6, 0]}
                  cursor="pointer"
                  onClick={(data: any) => handleClickBarra(data?.code)}
                >
                  <LabelList
                    dataKey={metric}
                    position="right"
                    formatter={(v: any) =>
                      metric === "cantidad" ? abreviar(Number(v)) : abreviarMoneda(Number(v))
                    }
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detalle producto */}
      <div ref={detalleRef} className="scroll-mt-4">
      <Card className="relative">
        <CardHeader className="flex justify-between items-start">
          <CardTitle>Detalle Producto</CardTitle>
          {detalle && (
            <button
              className="text-gray-500 hover:text-red-500 text-xl font-bold absolute top-2 right-2"
              onClick={handleLimpiar}
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
              options={productos.map((p) => ({ value: p.code, label: p.label }))}
              value={productoSeleccionado}
              onChange={handleSeleccionProducto}
              placeholder="Busca por nombre o código de producto..."
              emptyText="No se encontraron productos con ese nombre o código."
            />
            <Button
              onClick={() => fetchDetalleProducto()}
              disabled={!productoSeleccionado || loadingDetalle}
            >
              {loadingDetalle ? (
                <RefreshCcw className="mr-1 inline animate-spin" size={14} />
              ) : null}
              {loadingDetalle ? "Cargando..." : "Ver Detalle"}
            </Button>
            <Button variant="outline" onClick={handleLimpiar}>
              Limpiar
            </Button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {productos.length > 0
              ? `${productos.length.toLocaleString("es-CO")} productos disponibles. Escribe para filtrar.`
              : null}
          </p>

          {detalle && (
            <div className="mt-4 space-y-4">
              <div>
                <b>Producto:</b> {detalle.producto}
              </div>
              <div>
                <b>Código:</b> {detalle.code}
              </div>
              <div>
                <b>Unidades facturadas:</b> {detalle.cantidad}
              </div>
              <div>
                <b>Total facturado:</b> {formatCurrency(detalle.total)}
              </div>
              <div>
                <b>Facturas asociadas:</b> {detalle.facturas}
              </div>

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

                        <XAxis
                          dataKey="mes"
                          tickFormatter={(mes) => formatMesCorto(mes)}
                        />

                        <YAxis
                          yAxisId="left"
                          orientation="left"
                          tickFormatter={(v) => abreviar(v)}
                        />

                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tickFormatter={(v) => abreviarMoneda(v)}
                        />

                        <Tooltip content={<HistoricoTooltip />} />

                        <Bar
                          yAxisId="left"
                          dataKey="cantidad"
                          name="Unidades facturadas"
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                        >
                          <LabelList
                            dataKey="cantidad"
                            position="top"
                            formatter={(v: any) => abreviar(Number(v || 0))}
                            style={{ fontSize: 11, fontWeight: 700 }}
                          />
                        </Bar>

                        <Bar
                          yAxisId="right"
                          dataKey="total"
                          name="Total facturado"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                        >
                          <LabelList
                            dataKey="total"
                            position="top"
                            formatter={(v: any) => abreviarMoneda(Number(v || 0))}
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
                        <span className="text-gray-500">Unidades facturadas:</span>
                        <span className="font-semibold">
                          {Number(mesHistoricoSeleccionado.cantidad || 0).toLocaleString("es-CO")}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Total facturado:</span>
                        <span className="font-semibold">
                          {formatCurrency(mesHistoricoSeleccionado.total || 0)}
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

      {/* Tabla completa de productos */}
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Todos los Productos</CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              {tablaFiltrada.length.toLocaleString("es-CO")} producto
              {tablaFiltrada.length === 1 ? "" : "s"} en el período seleccionado. Haz clic
              en una fila o en un encabezado de columna para ordenar.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <Input
                value={busquedaTabla}
                onChange={(e) => {
                  setBusquedaTabla(e.target.value);
                  setPaginaTabla(1);
                }}
                placeholder="Buscar por nombre o código..."
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={ordenTabla.columna}
                onChange={(e) => {
                  const columna = e.target.value as typeof ordenTabla.columna;
                  setOrdenTabla((prev) => ({ columna, dir: prev.dir }));
                  setPaginaTabla(1);
                }}
                className="border rounded-md p-2 text-sm bg-background"
              >
                <option value="total">Ordenar: Total facturado</option>
                <option value="cantidad">Ordenar: Unidades</option>
                <option value="producto">Ordenar: Producto (A-Z)</option>
                <option value="code">Ordenar: Código</option>
                <option value="facturas">Ordenar: Facturas</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  setOrdenTabla((prev) => ({
                    ...prev,
                    dir: prev.dir === "asc" ? "desc" : "asc",
                  }))
                }
                className="flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
                title={ordenTabla.dir === "asc" ? "Ascendente" : "Descendente"}
              >
                {ordenTabla.dir === "asc" ? (
                  <ArrowUp size={14} />
                ) : (
                  <ArrowDown size={14} />
                )}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th
                    className="py-2 pr-3 cursor-pointer select-none"
                    onClick={() => toggleOrdenTabla("code")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Código <IconoOrden columna="code" />
                    </span>
                  </th>
                  <th
                    className="py-2 pr-3 cursor-pointer select-none"
                    onClick={() => toggleOrdenTabla("producto")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Producto <IconoOrden columna="producto" />
                    </span>
                  </th>
                  <th
                    className="py-2 pr-3 cursor-pointer select-none text-right"
                    onClick={() => toggleOrdenTabla("cantidad")}
                  >
                    <span className="inline-flex items-center gap-1 justify-end w-full">
                      Unidades <IconoOrden columna="cantidad" />
                    </span>
                  </th>
                  <th
                    className="py-2 pr-3 cursor-pointer select-none text-right"
                    onClick={() => toggleOrdenTabla("total")}
                  >
                    <span className="inline-flex items-center gap-1 justify-end w-full">
                      Total facturado <IconoOrden columna="total" />
                    </span>
                  </th>
                  <th
                    className="py-2 pr-3 cursor-pointer select-none text-right"
                    onClick={() => toggleOrdenTabla("facturas")}
                  >
                    <span className="inline-flex items-center gap-1 justify-end w-full">
                      Facturas <IconoOrden columna="facturas" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tablaPagina.map((p) => (
                  <tr
                    key={p.code}
                    onClick={() => handleClickBarra(p.code)}
                    className="border-b last:border-0 cursor-pointer hover:bg-emerald-50"
                  >
                    <td className="py-2 pr-3 text-gray-500">{p.code}</td>
                    <td className="py-2 pr-3 font-medium text-gray-800">{p.producto}</td>
                    <td className="py-2 pr-3 text-right">
                      {Number(p.cantidad || 0).toLocaleString("es-CO")}
                    </td>
                    <td className="py-2 pr-3 text-right">{formatCurrency(p.total)}</td>
                    <td className="py-2 pr-3 text-right">{p.facturas ?? 0}</td>
                  </tr>
                ))}
                {tablaPagina.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400">
                      No se encontraron productos con ese nombre o código.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPaginasTabla > 1 && (
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span>
                Página {paginaTablaSegura} de {totalPaginasTabla}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPaginaTabla((p) => Math.max(1, p - 1))}
                  disabled={paginaTablaSegura <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setPaginaTabla((p) => Math.min(totalPaginasTabla, p + 1))
                  }
                  disabled={paginaTablaSegura >= totalPaginasTabla}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
