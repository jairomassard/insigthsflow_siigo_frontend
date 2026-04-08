// src/app/reportes/financiero/consolidado/page.tsx
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
  Legend,
  CartesianGrid,
  LabelList,
  Line,
} from "recharts";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

/* -------- tipos -------- */
interface EvolucionMes {
  mes: string;
  ingresos: number;
  ingresos_netos: number;
  egresos: number;
  utilidad: number;
  margen: number;
  utilidad_acumulada: number;
  nomina?: number;
}

interface KPIs {
  ingresos: number;
  ingresos_netos: number;
  egresos: number;
  utilidad: number;
  margen: number;
  facturas_venta: number;
  facturas_compra: number;
}

interface CentroCosto {
  id: string;
  nombre: string;
}

interface TopItem {
  nombre: string;
  total: number;
}

/* -------- helpers -------- */
function formatCurrency(valor: number): string {
  return `$ ${Math.round(Number(valor || 0)).toLocaleString("es-CO")}`;
}

function abreviar(valor: number): string {
  const n = Number(valor || 0);
  const abs = Math.abs(n);

  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${Math.round(n)}`;
}

function getMesLabel(raw: string) {
  try {
    return formatInTimeZone(new Date(raw), "UTC", "MMM yyyy");
  } catch {
    return raw;
  }
}

function getMesTooltip(raw: string) {
  try {
    const txt = String(raw);
    const [year, month] = txt.split("-");
    return `${month}-${year}`;
  } catch {
    return raw;
  }
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/* -------- componente -------- */
export default function ReporteFinancieroConsolidadoPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [evolucion, setEvolucion] = useState<EvolucionMes[]>([]);
  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [topClientes, setTopClientes] = useState<TopItem[]>([]);
  const [topProveedores, setTopProveedores] = useState<TopItem[]>([]);

  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [centroCostos, setCentroCostos] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTipo, setModalTipo] = useState<"ingresos" | "egresos" | null>(null);
  const [modalMes, setModalMes] = useState<string | null>(null);
  const [detalleFacturas, setDetalleFacturas] = useState<any[]>([]);

  const [modalClienteOpen, setModalClienteOpen] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string | null>(null);

  const [modalProveedorOpen, setModalProveedorOpen] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<string | null>(null);

  const queryParams = useMemo(() => {
    const q: string[] = [];
    if (fechaDesde) q.push(`desde=${encodeURIComponent(fechaDesde)}`);
    if (fechaHasta) q.push(`hasta=${encodeURIComponent(fechaHasta)}`);
    if (centroCostos) q.push(`centro_costos=${encodeURIComponent(centroCostos)}`);
    return q.length ? `?${q.join("&")}` : "";
  }, [fechaDesde, fechaHasta, centroCostos]);

  const cerrarModal = () => {
    setModalOpen(false);
    setModalClienteOpen(false);
    setModalProveedorOpen(false);
    setModalTipo(null);
    setModalMes(null);
    setClienteSeleccionado(null);
    setProveedorSeleccionado(null);
  };

  const limpiarFiltros = () => {
    setFechaDesde("");
    setFechaHasta("");
    setCentroCostos("");
  };

  /* --- fetch data --- */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await authFetch(`/reportes/financiero/consolidado${queryParams}`);
        setKpis(data.kpis || null);
        setEvolucion(data.evolucion || []);
        setTopClientes(data.top_clientes || []);
        setTopProveedores(data.top_proveedores || []);
      } catch (e) {
        console.error("Error cargando consolidado", e);
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

  /* --- manejar clic en barras --- */
  const handleBarClick = async (tipo: "ingresos" | "egresos", data: any) => {
    let d: Date;

    if (typeof data.mes === "string") {
      const isoFixed = data.mes.replace(" ", "T");
      d = new Date(isoFixed);
    } else if (data.mes instanceof Date) {
      d = data.mes;
    } else if (typeof data.mes === "number") {
      d = new Date(data.mes);
    } else {
      console.error("handleBarClick: formato de mes inesperado:", data.mes);
      return;
    }

    if (isNaN(d.getTime())) {
      console.error("handleBarClick: fecha inválida calculada:", d);
      return;
    }

    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    const firstOfMonthUTC = new Date(Date.UTC(year, month, 1));
    const lastOfMonthUTC = new Date(Date.UTC(year, month + 1, 0));

    const desdeMes = format(firstOfMonthUTC, "yyyy-MM-dd");
    const hastaMes = format(lastOfMonthUTC, "yyyy-MM-dd");
    const mes = format(firstOfMonthUTC, "yyyy-MM");

    setModalTipo(tipo);
    setModalMes(mes);
    setModalOpen(true);

    try {
      const qs = new URLSearchParams({ desde: desdeMes, hasta: hastaMes });
      if (centroCostos) qs.set("centro_costos", String(centroCostos));

      if (tipo === "ingresos") {
        const result = await authFetch(`/reportes/facturas_cliente?${qs.toString()}`);
        setDetalleFacturas(result.rows || []);
      } else {
        const result = await authFetch(`/reportes/facturas_proveedor?${qs.toString()}`);
        setDetalleFacturas(result.rows || []);
      }
    } catch (err) {
      console.error("Error cargando detalle", err);
      setDetalleFacturas([]);
    }
  };

  const handleClienteClick = async (nombre: string) => {
    setClienteSeleccionado(nombre);
    setModalClienteOpen(true);

    const qs = new URLSearchParams();
    if (fechaDesde) qs.set("desde", fechaDesde);
    if (fechaHasta) qs.set("hasta", fechaHasta);
    if (centroCostos) qs.set("centro_costos", centroCostos);
    qs.set("cliente", nombre);

    try {
      const res = await authFetch(`/reportes/facturas_cliente?${qs.toString()}`);
      setDetalleFacturas(res.rows || []);
    } catch (err) {
      console.error("Error cargando facturas cliente", err);
      setDetalleFacturas([]);
    }
  };

  const handleProveedorClick = async (nombre: string) => {
    setProveedorSeleccionado(nombre);
    setModalProveedorOpen(true);

    const qs = new URLSearchParams();
    if (fechaDesde) qs.set("desde", fechaDesde);
    if (fechaHasta) qs.set("hasta", fechaHasta);
    if (centroCostos) qs.set("centro_costos", centroCostos);
    qs.set("proveedor", nombre);

    try {
      const res = await authFetch(`/reportes/facturas_proveedor?${qs.toString()}`);
      setDetalleFacturas(res.rows || []);
    } catch (err) {
      console.error("Error cargando compras proveedor", err);
      setDetalleFacturas([]);
    }
  };

  const kpiCards = kpis
    ? [
        {
          label: "Ingresos Netos",
          value: formatCurrency(kpis.ingresos_netos),
          accent: "from-emerald-500/15 to-emerald-400/5",
          text: "text-emerald-700",
          chip: "bg-emerald-100 text-emerald-700",
        },
        {
          label: "Ingresos",
          value: formatCurrency(kpis.ingresos),
          accent: "from-green-500/15 to-green-400/5",
          text: "text-green-700",
          chip: "bg-green-100 text-green-700",
        },
        {
          label: "Egresos",
          value: formatCurrency(kpis.egresos),
          accent: "from-rose-500/15 to-red-400/5",
          text: "text-rose-700",
          chip: "bg-rose-100 text-rose-700",
        },
        {
          label: "Utilidad",
          value: formatCurrency(kpis.utilidad),
          accent: "from-violet-500/15 to-purple-400/5",
          text: "text-violet-700",
          chip: "bg-violet-100 text-violet-700",
        },
        {
          label: "Margen",
          value: `${kpis.margen}%`,
          accent: "from-sky-500/15 to-indigo-400/5",
          text: "text-sky-700",
          chip: "bg-sky-100 text-sky-700",
        },
        {
          label: "Fact. Venta",
          value: `${kpis.facturas_venta}`,
          accent: "from-teal-500/15 to-teal-300/5",
          text: "text-teal-700",
          chip: "bg-teal-100 text-teal-700",
        },
        {
          label: "Fact. Compra",
          value: `${kpis.facturas_compra}`,
          accent: "from-orange-500/15 to-amber-400/5",
          text: "text-orange-700",
          chip: "bg-orange-100 text-orange-700",
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="space-y-4 p-3 md:p-4 lg:p-5">
        {/* Header premium */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.10),_transparent_30%),radial-gradient(circle_at_left,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(to_bottom_right,_rgba(255,255,255,1),_rgba(248,250,252,0.96))]" />
          <div className="relative flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:p-5">
            <div>
              <div className="mb-1 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Reporte financiero
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
                Consolidado Ingresos vs Egresos
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Vista ejecutiva compacta, moderna y optimizada para lectura rápida.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
                <div className="text-[11px] font-medium text-slate-500">Meses</div>
                <div className="text-lg font-bold text-slate-900">{evolucion.length}</div>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
                <div className="text-[11px] font-medium text-slate-500">Clientes</div>
                <div className="text-lg font-bold text-slate-900">{topClientes.length}</div>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
                <div className="text-[11px] font-medium text-slate-500">Proveedores</div>
                <div className="text-lg font-bold text-slate-900">{topProveedores.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 flex-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fecha desde
                  </label>
                  <Input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fecha hasta
                  </label>
                  <Input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Centro de costos
                  </label>
                  <select
                    value={centroCostos}
                    onChange={(e) => setCentroCostos(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
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

              <div className="flex gap-2">
                <button
                  onClick={limpiarFiltros}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs compactos premium */}
        {kpis && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {kpiCards.map((item, i) => (
              <Card
                key={i}
                className={cx(
                  "group relative overflow-hidden rounded-3xl border border-slate-200 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
                  "bg-gradient-to-br",
                  item.accent
                )}
              >
                <div className="absolute inset-0 bg-white/85 backdrop-blur-[1px]" />
                <CardContent className="relative flex h-[92px] flex-col justify-between p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="line-clamp-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {item.label}
                    </span>
                    <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-bold", item.chip)}>
                      KPI
                    </span>
                  </div>
                  <div className={cx("text-base font-extrabold leading-tight md:text-lg", item.text)}>
                    {item.value}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Evolución mensual */}
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-base font-bold text-slate-900">
                Evolución mensual
              </CardTitle>
              <div className="text-xs text-slate-500">
                Clic en las barras para abrir detalle de facturas
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-1">
            <ResponsiveContainer width="100%" height={315}>
              <BarChart data={evolucion} margin={{ top: 18, bottom: 28, left: 8, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="mes"
                  tickFormatter={(mes) => getMesLabel(mes)}
                  angle={-25}
                  textAnchor="end"
                  height={50}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickLine={{ stroke: "#cbd5e1" }}
                />
                <YAxis
                  tickFormatter={(v: any) => abreviar(Number(v))}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickLine={{ stroke: "#cbd5e1" }}
                />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;

                    const row = payload[0].payload;

                    return (
                      <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
                        <div className="mb-2 text-sm font-bold text-slate-800">
                          {getMesTooltip(String(row.mes))}
                        </div>

                        <div className="space-y-1.5 text-sm">
                          <div className="flex items-center justify-between gap-4 text-emerald-700">
                            <span className="font-medium">Ingresos Netos</span>
                            <span className="font-bold">{formatCurrency(row.ingresos_netos)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-green-700">
                            <span className="font-medium">Ingresos</span>
                            <span className="font-bold">{formatCurrency(row.ingresos)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-rose-700">
                            <span className="font-medium">Egresos</span>
                            <span className="font-bold">{formatCurrency(row.egresos)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-blue-700">
                            <span className="font-medium">Utilidad Mensual</span>
                            <span className="font-bold">{formatCurrency(row.utilidad)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-violet-700">
                            <span className="font-medium">Utilidad Acumulada</span>
                            <span className="font-bold">{formatCurrency(row.utilidad_acumulada)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "4px" }} />
                <Bar
                  dataKey="ingresos"
                  name="Ingresos"
                  fill="#22c55e"
                  radius={[8, 8, 0, 0]}
                  onClick={(data) => handleBarClick("ingresos", data)}
                >
                  <LabelList
                    dataKey="ingresos"
                    position="top"
                    formatter={(v: any) => abreviar(Number(v))}
                    style={{ fontSize: 10, fill: "#166534", fontWeight: 700 }}
                  />
                </Bar>

                <Bar
                  dataKey="egresos"
                  name="Egresos"
                  fill="#ef4444"
                  radius={[8, 8, 0, 0]}
                  onClick={(data) => handleBarClick("egresos", data)}
                >
                  <LabelList
                    dataKey="egresos"
                    position="top"
                    formatter={(v: any) => abreviar(Number(v))}
                    style={{ fontSize: 10, fill: "#991b1b", fontWeight: 700 }}
                  />
                </Bar>

                <Line type="monotone" dataKey="utilidad" name="Utilidad Mensual" stroke="#2563eb" strokeWidth={2}>
                  <LabelList
                    dataKey="utilidad"
                    position="bottom"
                    formatter={(v: any) => abreviar(Number(v))}
                    style={{ fontSize: 10, fill: "#1e3a8a", fontWeight: 700 }}
                  />
                </Line>

                <Line
                  type="monotone"
                  dataKey="utilidad_acumulada"
                  name="Utilidad Acumulada"
                  stroke="#9333ea"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                >
                  <LabelList
                    dataKey="utilidad_acumulada"
                    position="top"
                    formatter={(v: any) => abreviar(Number(v))}
                    style={{ fontSize: 10, fill: "#6b21a8", fontWeight: 700 }}
                  />
                </Line>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top clientes, nómina y proveedores */}
        <div className="grid gap-4 xl:grid-cols-3">
          {/* Top Clientes */}
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900">Top 10 Clientes</CardTitle>
            </CardHeader>
            <CardContent className="h-[290px] pt-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={topClientes}
                  margin={{ top: 8, bottom: 8, left: 0, right: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => abreviar(Number(v))}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={{ stroke: "#cbd5e1" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={175}
                    tick={{ fontSize: 11, fill: "#334155" }}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={{ stroke: "#cbd5e1" }}
                  />
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{
                      borderRadius: "14px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 30px rgba(15,23,42,.12)",
                    }}
                  />
                  <Bar
                    dataKey="total"
                    fill="#22c55e"
                    radius={[0, 8, 8, 0]}
                    onClick={async (data) => {
                      const nombre = data?.payload?.nombre;
                      if (nombre) await handleClienteClick(nombre);
                    }}
                  >
                    <LabelList
                      dataKey="total"
                      position="right"
                      formatter={(v: any) => abreviar(Number(v))}
                      style={{ fontSize: 10, fill: "#166534", fontWeight: 700 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Nómina */}
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900">Costos x Nómina</CardTitle>
            </CardHeader>
            <CardContent className="h-[290px] pt-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={evolucion}
                  layout="vertical"
                  margin={{ top: 8, bottom: 8, left: 0, right: 18 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="mes"
                    tickFormatter={(mes) => getMesLabel(mes)}
                    width={95}
                    tick={{ fontSize: 11, fill: "#334155" }}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={{ stroke: "#cbd5e1" }}
                  />
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{
                      borderRadius: "14px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 30px rgba(15,23,42,.12)",
                    }}
                  />
                  <Bar dataKey="nomina" fill="#f97316" radius={[0, 8, 8, 0]}>
                    <LabelList
                      dataKey="nomina"
                      position="right"
                      formatter={(v: any) => abreviar(Number(v))}
                      style={{ fontSize: 10, fill: "#9a3412", fontWeight: 700 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Proveedores */}
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900">Top 10 Proveedores</CardTitle>
            </CardHeader>
            <CardContent className="h-[290px] pt-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={topProveedores}
                  margin={{ top: 8, bottom: 8, left: 0, right: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => abreviar(Number(v))}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={{ stroke: "#cbd5e1" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={175}
                    tick={{ fontSize: 11, fill: "#334155" }}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={{ stroke: "#cbd5e1" }}
                  />
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{
                      borderRadius: "14px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 30px rgba(15,23,42,.12)",
                    }}
                  />
                  <Bar
                    dataKey="total"
                    fill="#ef4444"
                    radius={[0, 8, 8, 0]}
                    onClick={async (data) => {
                      const nombre = data?.payload?.nombre;
                      if (nombre) await handleProveedorClick(nombre);
                    }}
                  >
                    <LabelList
                      dataKey="total"
                      position="right"
                      formatter={(v: any) => abreviar(Number(v))}
                      style={{ fontSize: 10, fill: "#991b1b", fontWeight: 700 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Modal detalle */}
        {(modalOpen || modalClienteOpen || modalProveedorOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm">
            <div className="relative max-h-[88vh] w-full max-w-7xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {modalOpen && modalTipo === "ingresos" && `Facturas de Venta - ${modalMes}`}
                    {modalOpen && modalTipo === "egresos" && `Facturas de Compra - ${modalMes}`}
                    {modalClienteOpen && `Facturas de ${clienteSeleccionado}`}
                    {modalProveedorOpen && `Compras a ${proveedorSeleccionado}`}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Detalle transaccional según los filtros seleccionados.
                  </p>
                </div>

                <button
                  onClick={cerrarModal}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cerrar
                </button>
              </div>

              <div className="max-h-[72vh] overflow-auto p-4">
                <table className="w-full border-separate border-spacing-0 overflow-hidden text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-100">
                    <tr className="text-left text-slate-700">
                      {(modalTipo === "ingresos" || modalClienteOpen) ? (
                        <>
                          <th className="border-b border-slate-200 px-3 py-3">Factura</th>
                          <th className="border-b border-slate-200 px-3 py-3">Cliente</th>
                          <th className="border-b border-slate-200 px-3 py-3">Fecha</th>
                          <th className="border-b border-slate-200 px-3 py-3">Vencimiento</th>
                          <th className="border-b border-slate-200 px-3 py-3">Estado</th>
                          <th className="border-b border-slate-200 px-3 py-3">Centro de Costo</th>
                          <th className="border-b border-slate-200 px-3 py-3">Total</th>
                          <th className="border-b border-slate-200 px-3 py-3">Pagado</th>
                          <th className="border-b border-slate-200 px-3 py-3">Pendiente</th>
                          <th className="border-b border-slate-200 px-3 py-3">Link</th>
                        </>
                      ) : (
                        <>
                          <th className="border-b border-slate-200 px-3 py-3">Proveedor</th>
                          <th className="border-b border-slate-200 px-3 py-3">Factura</th>
                          <th className="border-b border-slate-200 px-3 py-3">Fecha</th>
                          <th className="border-b border-slate-200 px-3 py-3">Vencimiento</th>
                          <th className="border-b border-slate-200 px-3 py-3">Estado</th>
                          <th className="border-b border-slate-200 px-3 py-3">Centro de Costo</th>
                          <th className="border-b border-slate-200 px-3 py-3">Total</th>
                          <th className="border-b border-slate-200 px-3 py-3">Saldo</th>
                        </>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {Array.isArray(detalleFacturas) && detalleFacturas.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="rounded-b-2xl px-4 py-8 text-center text-sm text-slate-500"
                        >
                          No hay facturas encontradas
                        </td>
                      </tr>
                    ) : (
                      Array.isArray(detalleFacturas) &&
                      detalleFacturas.map((f, i) => {
                        if (modalTipo === "ingresos" || modalClienteOpen) {
                          const isVencido =
                            (f.estado_cartera || "").toLowerCase() === "vencido";

                          return (
                            <tr
                              key={i}
                              className={cx(
                                "transition hover:bg-slate-50",
                                isVencido && "bg-red-50/40"
                              )}
                            >
                              <td className="border-b border-slate-100 px-3 py-3 font-medium text-slate-800">
                                {f.idfactura}
                              </td>
                              <td className="border-b border-slate-100 px-3 py-3 text-slate-700">
                                {f.cliente_nombre}
                              </td>
                              <td className="border-b border-slate-100 px-3 py-3 text-slate-700">
                                {format(new Date(f.fecha), "dd-MM-yyyy")}
                              </td>
                              <td className="border-b border-slate-100 px-3 py-3 text-slate-700">
                                {format(new Date(f.vencimiento), "dd-MM-yyyy")}
                              </td>
                              <td className="border-b border-slate-100 px-3 py-3">
                                <span
                                  className={cx(
                                    "rounded-full px-2.5 py-1 text-xs font-bold",
                                    isVencido
                                      ? "bg-red-100 text-red-700"
                                      : "bg-emerald-100 text-emerald-700"
                                  )}
                                >
                                  {f.estado_cartera}
                                </span>
                              </td>
                              <td className="border-b border-slate-100 px-3 py-3 text-slate-700">
                                {f.centro_costo_nombre || "—"}
                              </td>
                              <td className="border-b border-slate-100 px-3 py-3 font-semibold text-slate-800">
                                {formatCurrency(f.total)}
                              </td>
                              <td className="border-b border-slate-100 px-3 py-3 text-slate-700">
                                {formatCurrency(f.pagado)}
                              </td>
                              <td className="border-b border-slate-100 px-3 py-3 text-slate-700">
                                {formatCurrency(f.pendiente)}
                              </td>
                              <td className="border-b border-slate-100 px-3 py-3">
                                {f.public_url ? (
                                  <a
                                    href={f.public_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-semibold text-blue-600 underline-offset-2 hover:underline"
                                  >
                                    Ver
                                  </a>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        }

                        const proveedor =
                          f.proveedor_nombre ??
                          f.proveedor ??
                          f.nombre_proveedor ??
                          f.razon_social ??
                          "Sin proveedor";

                        const isNoPagada = (f.estado || "").toLowerCase() === "no pagada";

                        return (
                          <tr
                            key={i}
                            className={cx(
                              "transition hover:bg-slate-50",
                              isNoPagada && "bg-red-50/40"
                            )}
                          >
                            <td className="border-b border-slate-100 px-3 py-3 font-medium text-slate-800">
                              {proveedor}
                            </td>
                            <td className="border-b border-slate-100 px-3 py-3 text-slate-700">
                              {f.factura_proveedor}
                            </td>
                            <td className="border-b border-slate-100 px-3 py-3 text-slate-700">
                              {format(new Date(f.fecha), "dd-MM-yyyy")}
                            </td>
                            <td className="border-b border-slate-100 px-3 py-3 text-slate-700">
                              {format(new Date(f.vencimiento), "dd-MM-yyyy")}
                            </td>
                            <td className="border-b border-slate-100 px-3 py-3">
                              <span
                                className={cx(
                                  "rounded-full px-2.5 py-1 text-xs font-bold",
                                  isNoPagada
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700"
                                )}
                              >
                                {f.estado}
                              </span>
                            </td>
                            <td className="border-b border-slate-100 px-3 py-3 text-slate-700">
                              {f.centro_costo_nombre || "—"}
                            </td>
                            <td className="border-b border-slate-100 px-3 py-3 font-semibold text-slate-800">
                              {formatCurrency(f.total)}
                            </td>
                            <td className="border-b border-slate-100 px-3 py-3 text-slate-700">
                              {formatCurrency(f.saldo)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}