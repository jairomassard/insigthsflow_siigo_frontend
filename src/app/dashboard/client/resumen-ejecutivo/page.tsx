"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LabelList,
} from "recharts";
import {
  Sparkles,
  TrendingUp,
  Wallet,
  Banknote,
  Activity,
  BriefcaseBusiness,
  TriangleAlert,
  Target,
  RefreshCcw,
  Lightbulb,
  Building2,
  Users,
} from "lucide-react";

/* =========================================================
 * TIPOS
 * ========================================================= */
type Variacion = {
  actual: number;
  anterior: number;
  diff: number;
  pct: number;
};

type KPIEficiencia = {
  actual: number;
  anterior: number;
  diff: number;
  promedio_6m: number;
  meta: number;
};

type KPICaja = {
  actual: number;
};

type KPIRunway = {
  actual: number;
  burn_promedio_3m: number;
  unidad: string;
};

type Kpis = {
  ventas_netas: Variacion;
  ebitda: Variacion;
  utilidad_operativa: Variacion;
  eficiencia_operativa: KPIEficiencia;
  caja_disponible: KPICaja;
  cash_runway: KPIRunway;
};

type SerieMensual = {
  label: string;
  ventas: number;
  ebitda: number;
  eficiencia_operativa: number;
  gastos_operacionales: number;
  dep_amort: number;
};

type TopItem = {
  nombre: string;
  total: number;
};

type TopGasto = {
  cuenta: string;
  nombre: string;
  valor: number;
};

type Alerta = {
  nivel: "alta" | "media" | "baja";
  titulo: string;
  descripcion: string;
};

type DashboardResponse = {
  periodo: {
    desde: string;
    hasta: string;
    anterior_desde: string;
    anterior_hasta: string;
  };
  kpis: Kpis;
  series: {
    mensual: SerieMensual[];
  };
  top_gastos: TopGasto[];
  top_clientes: TopItem[];
  top_proveedores: TopItem[];
  explicaciones: string[];
  acciones: string[];
  alertas: Alerta[];
};

type CentroCosto = {
  id: string | number;
  nombre: string;
};

/* =========================================================
 * HELPERS
 * ========================================================= */
function formatCurrency(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(valor || 0));
}

function formatPercent(valor?: number): string {
  return `${Number(valor || 0).toFixed(1)}%`;
}

function formatMonths(valor?: number): string {
  return `${Number(valor || 0).toFixed(1)} meses`;
}

function abreviar(valor: number): string {
  const n = Number(valor || 0);
  const abs = Math.abs(n);

  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${Math.round(n)}`;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getDefaultDates() {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const start = new Date(today.getFullYear(), today.getMonth(), 1);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { desde: fmt(start), hasta: fmt(end) };
}

function diffLabel(diff: number, suffix = "") {
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff.toFixed(1)}${suffix}`;
}

/* =========================================================
 * COMPONENTES PEQUEÑOS
 * ========================================================= */
function KpiCard({
  label,
  value,
  description,
  delta,
  accent,
  chip,
  icon,
}: {
  label: string;
  value: string;
  description?: string;
  delta?: string;
  accent: string;
  chip: string;
  icon: React.ReactNode;
}) {
  return (
    <Card
      className={cx(
        "group relative overflow-hidden rounded-[2rem] border border-slate-200 shadow-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-md bg-gradient-to-br",
        accent
      )}
    >
      <div className="absolute inset-0 bg-white/88 backdrop-blur-[1px]" />
      <CardContent className="relative p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              {label}
            </div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              KPI estrella
            </div>
          </div>

          <div className={cx("rounded-2xl p-3 shadow-sm", chip)}>
            {icon}
          </div>
        </div>

        <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
          {value}
        </div>

        {description && (
          <p className="mt-2 text-sm leading-5 text-slate-600">{description}</p>
        )}

        {delta && (
          <div className="mt-4 inline-flex rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-bold text-slate-700">
            {delta}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SectionTitle({
  badge,
  title,
  subtitle,
}: {
  badge: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4">
      <div className="mb-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {badge}
      </div>
      <h2 className="text-lg font-black tracking-tight text-slate-900 md:text-xl">
        {title}
      </h2>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

/* =========================================================
 * PÁGINA
 * ========================================================= */
export default function DashboardResumenEjecutivoPage() {
  const defaults = getDefaultDates();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string>("");

  const [fechaDesde, setFechaDesde] = useState(defaults.desde);
  const [fechaHasta, setFechaHasta] = useState(defaults.hasta);
  const [centroCostos, setCentroCostos] = useState<string>("");
  const [centros, setCentros] = useState<CentroCosto[]>([]);

  async function cargarDashboard() {
    try {
      setLoading(true);
      setError("");

      const qs = new URLSearchParams({
        desde: fechaDesde,
        hasta: fechaHasta,
      });

      if (centroCostos) qs.set("centro_costos", centroCostos);

      const res = await authFetch(`/dashboard/resumen-ejecutivo?${qs.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.detalle || json?.error || "No fue posible cargar el dashboard");
      }

      setData(json);
    } catch (err: any) {
      setError(err?.message || "Error cargando dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function cargarCentros() {
    try {
      const res = await authFetch("/siigo/centros-costo");
      if (!res.ok) return;
      const json = await res.json();
      const rows = Array.isArray(json) ? json : json?.rows || json?.data || [];
      setCentros(rows);
    } catch {
      setCentros([]);
    }
  }

  useEffect(() => {
    cargarDashboard();
    cargarCentros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpiCards = useMemo(() => {
    if (!data?.kpis) return [];

    const ef = data.kpis.eficiencia_operativa;
    const ebitda = data.kpis.ebitda;
    const ventas = data.kpis.ventas_netas;
    const caja = data.kpis.caja_disponible;
    const runway = data.kpis.cash_runway;

    return [
      {
        label: "Eficiencia Operativa",
        value: formatPercent(ef.actual),
        description: `De cada $100 vendidos, quedan $${ef.actual.toFixed(1)} como EBITDA`,
        delta: `${diffLabel(ef.diff, " pts")} vs período anterior`,
        accent: "from-indigo-500/15 to-violet-400/5",
        chip: "bg-indigo-50 text-indigo-700 border border-indigo-100",
        icon: <Target size={18} />,
      },
      {
        label: "EBITDA",
        value: formatCurrency(ebitda.actual),
        description: "Resultado operativo antes de impuestos, intereses, depreciaciones y amortizaciones.",
        delta: `${diffLabel(ebitda.pct, "%")} vs período anterior`,
        accent: "from-emerald-500/15 to-green-400/5",
        chip: "bg-emerald-50 text-emerald-700 border border-emerald-100",
        icon: <TrendingUp size={18} />,
      },
      {
        label: "Ventas Netas",
        value: formatCurrency(ventas.actual),
        description: "Ingresos operacionales del período analizado.",
        delta: `${diffLabel(ventas.pct, "%")} vs período anterior`,
        accent: "from-sky-500/15 to-blue-400/5",
        chip: "bg-sky-50 text-sky-700 border border-sky-100",
        icon: <Banknote size={18} />,
      },
      {
        label: "Caja Disponible",
        value: formatCurrency(caja.actual),
        description: "Saldo estimado de caja y bancos al cierre del período.",
        delta: "Base para runway",
        accent: "from-amber-500/15 to-yellow-400/5",
        chip: "bg-amber-50 text-amber-700 border border-amber-100",
        icon: <Wallet size={18} />,
      },
      {
        label: "Cash Runway",
        value: formatMonths(runway.actual),
        description: "Meses estimados de operación con la caja actual según burn promedio 3M.",
        delta: `Burn promedio: ${formatCurrency(runway.burn_promedio_3m)}`,
        accent: "from-rose-500/15 to-orange-400/5",
        chip: "bg-rose-50 text-rose-700 border border-rose-100",
        icon: <Activity size={18} />,
      },
    ];
  }, [data]);

  const eficienciaComparativos = useMemo(() => {
    if (!data?.kpis?.eficiencia_operativa) return [];
    const ef = data.kpis.eficiencia_operativa;

    return [
      {
        label: "Período actual",
        value: `${ef.actual.toFixed(1)}%`,
        accent: "bg-indigo-50 text-indigo-700 border-indigo-100",
      },
      {
        label: "Período anterior",
        value: `${ef.anterior.toFixed(1)}%`,
        accent: "bg-slate-50 text-slate-700 border-slate-200",
      },
      {
        label: "Promedio 6 meses",
        value: `${ef.promedio_6m.toFixed(1)}%`,
        accent: "bg-emerald-50 text-emerald-700 border-emerald-100",
      },
      {
        label: "Meta",
        value: `${ef.meta.toFixed(1)}%`,
        accent: "bg-amber-50 text-amber-700 border-amber-100",
      },
    ];
  }, [data]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="space-y-5 p-3 md:p-4 lg:p-5">
        {/* HEADER PREMIUM */}
        <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(79,70,229,0.10),_transparent_28%),radial-gradient(circle_at_left,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(to_bottom_right,_rgba(255,255,255,1),_rgba(248,250,252,0.98))]" />
          <div className="relative flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                <Sparkles size={12} />
                Resumen Ejecutivo Inteligente
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                Dashboard financiero premium
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Foto rápida del desempeño financiero de tu empresa. Aquí ves los KPIs
                más importantes, por qué suben o bajan y qué revisar de inmediato.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
                <div className="text-[11px] font-medium text-slate-500">Meses graficados</div>
                <div className="text-lg font-black text-slate-900">
                  {data?.series?.mensual?.length || 0}
                </div>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
                <div className="text-[11px] font-medium text-slate-500">Top clientes</div>
                <div className="text-lg font-black text-slate-900">
                  {data?.top_clientes?.length || 0}
                </div>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
                <div className="text-[11px] font-medium text-slate-500">Top proveedores</div>
                <div className="text-lg font-black text-slate-900">
                  {data?.top_proveedores?.length || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FILTROS */}
        <Card className="rounded-[2rem] border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fecha desde
                  </label>
                  <Input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="h-11 rounded-2xl border-slate-200 bg-white"
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
                    className="h-11 rounded-2xl border-slate-200 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Centro de costos
                  </label>
                  <select
                    value={centroCostos}
                    onChange={(e) => setCentroCostos(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  >
                    <option value="">Todos</option>
                    {centros.map((cc) => (
                      <option key={cc.id} value={String(cc.id)}>
                        {cc.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const d = getDefaultDates();
                    setFechaDesde(d.desde);
                    setFechaHasta(d.hasta);
                    setCentroCostos("");
                  }}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Limpiar
                </button>

                <button
                  onClick={cargarDashboard}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-black text-white shadow-lg transition hover:bg-black active:scale-[0.98]"
                >
                  {loading ? <RefreshCcw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {loading ? "Actualizando..." : "Actualizar dashboard"}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="rounded-[2rem] border border-rose-200 bg-rose-50 shadow-sm">
            <CardContent className="p-4 text-sm font-medium text-rose-700">
              {error}
            </CardContent>
          </Card>
        )}

        {/* CAPA 1 - FOTO RÁPIDA */}
        {!!kpiCards.length && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            {kpiCards.map((item, i) => (
              <KpiCard key={i} {...item} />
            ))}
          </div>
        )}

        {/* BLOQUE EFICIENCIA OPERATIVA */}
        {data?.kpis?.eficiencia_operativa && (
          <Card className="rounded-[2rem] border-none bg-white shadow-2xl overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-900 px-6 py-5 text-white">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-[0.16em]">
                    Indicador estrella
                  </h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Eficiencia Operativa: % de ventas que se convierten en EBITDA
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                    Lectura ejecutiva
                  </div>
                  <div className="mt-1 text-2xl font-black text-white">
                    {formatPercent(data.kpis.eficiencia_operativa.actual)}
                  </div>
                </div>
              </div>
            </div>

            <CardContent className="p-6">
              <div className="grid gap-4 md:grid-cols-4">
                {eficienciaComparativos.map((item, i) => (
                  <div
                    key={i}
                    className={cx(
                      "rounded-3xl border p-4",
                      item.accent
                    )}
                  >
                    <div className="text-[11px] font-black uppercase tracking-[0.16em]">
                      {item.label}
                    </div>
                    <div className="mt-2 text-2xl font-black">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm leading-7 text-slate-700">
                  <span className="font-black text-slate-900">Interpretación:</span>{" "}
                  de cada <span className="font-black">$100 vendidos</span>, la empresa
                  está convirtiendo aproximadamente{" "}
                  <span className="font-black">
                    ${data.kpis.eficiencia_operativa.actual.toFixed(1)}
                  </span>{" "}
                  en EBITDA.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CAPA 2 - EXPLICACIÓN */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">
          <Card className="rounded-[2rem] border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <SectionTitle
                badge="Capa 2"
                title="Qué cambió y por qué"
                subtitle="Evolución de ventas, EBITDA y eficiencia operativa en los últimos meses."
              />

              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.series?.mensual || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#475569" }} />
                    <YAxis yAxisId="money" tickFormatter={abreviar} tick={{ fontSize: 12, fill: "#475569" }} />
                    <YAxis
                      yAxisId="pct"
                      orientation="right"
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 12, fill: "#475569" }}
                    />
                    <Tooltip
                      formatter={(value: any, name: string) => {
                        if (name === "eficiencia_operativa") {
                          return [`${Number(value).toFixed(1)}%`, "Eficiencia"];
                        }
                        return [formatCurrency(Number(value)), name === "ventas" ? "Ventas" : "EBITDA"];
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="money"
                      type="monotone"
                      dataKey="ventas"
                      name="Ventas"
                      stroke="#0f172a"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="money"
                      type="monotone"
                      dataKey="ebitda"
                      name="EBITDA"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="pct"
                      type="monotone"
                      dataKey="eficiencia_operativa"
                      name="eficiencia_operativa"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <SectionTitle
                badge="Lectura automática"
                title="Explicación ejecutiva"
                subtitle="Resumen sintetizado del comportamiento del período."
              />

              <div className="space-y-3">
                {(data?.explicaciones || []).map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TOP GASTOS + TOP CLIENTES/PROVEEDORES */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card className="rounded-[2rem] border-slate-200 shadow-sm xl:col-span-1">
            <CardContent className="p-6">
              <SectionTitle
                badge="Presión de gasto"
                title="Top gastos operacionales"
                subtitle="Dónde se está yendo más dinero en el período."
              />

              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={(data?.top_gastos || []).map((g) => ({
                      nombre: g.nombre.length > 18 ? `${g.nombre.slice(0, 18)}…` : g.nombre,
                      valor: g.valor,
                    }))}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tickFormatter={abreviar} tick={{ fontSize: 12, fill: "#475569" }} />
                    <YAxis
                      type="category"
                      dataKey="nombre"
                      width={110}
                      tick={{ fontSize: 12, fill: "#475569" }}
                    />
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                    <Bar dataKey="valor" radius={[0, 14, 14, 0]} fill="#f59e0b">
                      <LabelList
                        dataKey="valor"
                        position="right"
                        formatter={(value) => abreviar(Number(value ?? 0))}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <SectionTitle
                badge="Comercial"
                title="Top clientes"
                subtitle="Clientes con mayor facturación en el período."
              />

              <div className="space-y-3">
                {(data?.top_clientes || []).map((item, idx) => (
                  <div
                    key={`${item.nombre}-${idx}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-indigo-50 p-2 text-indigo-700">
                        <Users size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800">{item.nombre}</div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-400">
                          Cliente #{idx + 1}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <SectionTitle
                badge="Abastecimiento"
                title="Top proveedores"
                subtitle="Proveedores con mayor peso en compras/gastos."
              />

              <div className="space-y-3">
                {(data?.top_proveedores || []).map((item, idx) => (
                  <div
                    key={`${item.nombre}-${idx}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-emerald-50 p-2 text-emerald-700">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800">{item.nombre}</div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-400">
                          Proveedor #{idx + 1}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CAPA 3 - ACCIÓN */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card className="rounded-[2rem] border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <SectionTitle
                badge="Capa 3"
                title="Qué revisar o decidir"
                subtitle="Acciones sugeridas por el sistema con base en los KPIs."
              />

              <div className="space-y-3">
                {(data?.acciones || []).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="mt-0.5 rounded-2xl bg-indigo-50 p-2 text-indigo-700">
                      <Lightbulb size={16} />
                    </div>
                    <div className="text-sm leading-6 text-slate-700">{item}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <SectionTitle
                badge="Alertas"
                title="Alertas y foco inmediato"
                subtitle="Lecturas ejecutivas de riesgo y prioridad."
              />

              <div className="space-y-3">
                {(data?.alertas || []).map((item, idx) => (
                  <div
                    key={idx}
                    className={cx(
                      "rounded-2xl border px-4 py-4",
                      item.nivel === "alta" && "border-rose-200 bg-rose-50",
                      item.nivel === "media" && "border-amber-200 bg-amber-50",
                      item.nivel === "baja" && "border-emerald-200 bg-emerald-50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cx(
                          "rounded-2xl p-2",
                          item.nivel === "alta" && "bg-rose-100 text-rose-700",
                          item.nivel === "media" && "bg-amber-100 text-amber-700",
                          item.nivel === "baja" && "bg-emerald-100 text-emerald-700"
                        )}
                      >
                        <TriangleAlert size={16} />
                      </div>

                      <div>
                        <div className="text-sm font-black text-slate-900">{item.titulo}</div>
                        <div className="mt-1 text-sm leading-6 text-slate-700">
                          {item.descripcion}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ÁREA EXTRA VISUAL */}
        <Card className="rounded-[2rem] border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <SectionTitle
              badge="Tendencia"
              title="Comportamiento mensual de ventas y EBITDA"
              subtitle="Vista ejecutiva para seguir la evolución del negocio."
            />

            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.series?.mensual || []}>
                  <defs>
                    <linearGradient id="ventasFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="ebitdaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.20} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#475569" }} />
                  <YAxis tickFormatter={abreviar} tick={{ fontSize: 12, fill: "#475569" }} />
                  <Tooltip
                    formatter={(value: any, name: string) => [
                      formatCurrency(Number(value)),
                      name === "ventas" ? "Ventas" : "EBITDA",
                    ]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="ventas"
                    stroke="#0f172a"
                    fill="url(#ventasFill)"
                    strokeWidth={3}
                    name="Ventas"
                  />
                  <Area
                    type="monotone"
                    dataKey="ebitda"
                    stroke="#10b981"
                    fill="url(#ebitdaFill)"
                    strokeWidth={3}
                    name="EBITDA"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}