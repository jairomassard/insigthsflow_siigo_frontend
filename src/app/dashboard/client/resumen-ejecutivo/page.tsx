"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  TriangleAlert,
  Target,
  RefreshCcw,
  Lightbulb,
  Building2,
  Users,
  HelpCircle,
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
  actual: number | null;
  requiere_parametrizacion?: boolean;
  visible?: boolean;
  modo_caja?: string;
  mensaje?: string;
  cuentas_usadas?: Array<{ codigo: string; nombre?: string }>;
};

type KPIRunway = {
  actual: number | null;
  burn_promedio?: number | null;
  burn_promedio_3m?: number | null;
  unidad?: string;
  requiere_parametrizacion?: boolean;
  visible?: boolean;
  modo_runway?: string;
  mensaje?: string;
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
  eficiencia_operativa?: number;
  gastos_operacionales?: number;
  dep_amort?: number;
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

type DashboardConfigMetadata = {
  existe_config?: boolean;
  mostrar_caja?: boolean;
  mostrar_runway?: boolean;
  modo_caja?: string;
  modo_runway?: string;
  meses_grafica?: number;
  indicador_estrella?: string;
};

type DashboardResponse = {
  periodo: {
    desde: string;
    hasta: string;
    anterior_desde: string;
    anterior_hasta: string;
    rango_auto?: boolean;
    ajuste_por_corte?: boolean;
  };
  metadata?: {
    hay_datos_auxiliar_actual: boolean;
    ultima_fecha_auxiliar?: string | null;
    fecha_corte_confiable?: string | null;
    mes_actual_parcial?: boolean;
    modo_periodo?: string;
    mensaje_contexto?: string | null;
    config_dashboard?: DashboardConfigMetadata;
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

type DashboardMetadata = {
  ultima_fecha_auxiliar?: string | null;
  fecha_corte_confiable?: string | null;
  desde_sugerido?: string | null;
  hasta_sugerido?: string | null;
  mes_actual_parcial?: boolean;
  modo_periodo?: string | null;
  mensaje_contexto?: string | null;
};

/* =========================================================
 * HELPERS
 * ========================================================= */
function formatCurrency(valor?: number | null): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(valor || 0));
}

function formatPercent(valor?: number): string {
  return `${Number(valor || 0).toFixed(1)}%`;
}

function formatMonths(valor?: number | null): string {
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

function isConfiguredNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value);
}

function truncate(text: string, size = 22) {
  return text.length > size ? `${text.slice(0, size)}…` : text;
}

function getSerieLabel(name?: string, dataKey?: string) {
  const raw = String(name || dataKey || "").toLowerCase();

  if (
    raw === "ventas" ||
    raw === "venta" ||
    raw === "ingresos_operacionales"
  ) {
    return "Ventas";
  }

  if (raw === "ebitda") {
    return "EBITDA";
  }

  if (
    raw === "eficiencia_operativa" ||
    raw === "eficiencia operativa" ||
    raw === "margen_ebitda"
  ) {
    return "Eficiencia operativa";
  }

  return String(name || dataKey || "");
}

/* =========================================================
 * COMPONENTES PEQUEÑOS
 * ========================================================= */
const InfoHint = ({
  text,
  dark = false,
  align = "right",
}: {
  text: string;
  dark?: boolean;
  align?: "left" | "right";
}) => (
  <div className="group/info relative inline-flex">
    <button
      type="button"
      className={cx(
        "inline-flex h-4 w-4 items-center justify-center rounded-full transition-all",
        dark
          ? "bg-white/20 text-white hover:bg-white/30"
          : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-500"
      )}
      aria-label="Ver explicación"
    >
      <HelpCircle size={11} />
    </button>

    <div
      className={cx(
        "pointer-events-none absolute top-6 z-50 w-64 rounded-2xl border px-3 py-3 text-[11px] leading-5 shadow-2xl opacity-0 scale-95 transition-all duration-200 group-hover/info:opacity-100 group-hover/info:scale-100 group-focus-within/info:opacity-100 group-focus-within/info:scale-100",
        align === "left" ? "left-0" : "right-0",
        dark
          ? "border-slate-700 bg-slate-900 text-slate-100"
          : "border-slate-200 bg-white text-slate-700"
      )}
    >
      {text}
    </div>
  </div>
);

function TitleWithInfo({
  children,
  info,
  className = "",
  dark = false,
  align = "right",
}: {
  children: ReactNode;
  info?: string;
  className?: string;
  dark?: boolean;
  align?: "left" | "right";
}) {
  return (
    <div className={cx("flex items-center gap-2", className)}>
      <span>{children}</span>
      {info ? <InfoHint text={info} dark={dark} align={align} /> : null}
    </div>
  );
}

function KpiCard({
  label,
  value,
  description,
  delta,
  accent,
  chip,
  icon,
  info,
  sublabel = "KPI ejecutivo",
}: {
  label: string;
  value: string;
  description?: string;
  delta?: string;
  accent: string;
  chip: string;
  icon: React.ReactNode;
  info?: string;
  sublabel?: string;
}) {
  return (
    <Card
      className={cx(
        "group relative overflow-hidden rounded-[1.6rem] border border-slate-200 shadow-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-md bg-gradient-to-br",
        accent
      )}
    >
      <div className="absolute inset-0 bg-white/88 backdrop-blur-[1px]" />
      <CardContent className="relative p-4 lg:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <TitleWithInfo
              info={info}
              className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500"
              align="right"
            >
              {label}
            </TitleWithInfo>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {sublabel}
            </div>
          </div>

          <div className={cx("rounded-2xl p-2.5 shadow-sm", chip)}>{icon}</div>
        </div>

        <div className="text-xl font-black tracking-tight text-slate-900 md:text-2xl">
          {value}
        </div>

        {description && (
          <p className="mt-2 text-[13px] leading-5 text-slate-600">{description}</p>
        )}

        {delta && (
          <div className="mt-3 inline-flex rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-bold text-slate-700">
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
  info,
}: {
  badge: string;
  title: string;
  subtitle: string;
  info?: string;
}) {
  return (
    <div className="mb-3">
      <div className="mb-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {badge}
      </div>
      <TitleWithInfo
        info={info}
        className="text-lg font-black tracking-tight text-slate-900 md:text-xl"
        align="right"
      >
        {title}
      </TitleWithInfo>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

const CustomQueCambioTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-2xl">
      <p className="mb-2 border-b border-slate-100 pb-2 text-sm font-black text-slate-800">
        {label}
      </p>

      <div className="space-y-1.5 text-sm">
        {payload.map((entry: any, idx: number) => {
          const serie = getSerieLabel(entry.name, entry.dataKey);
          const isPct =
            entry.dataKey === "eficiencia_operativa" ||
            String(entry.name || "").toLowerCase().includes("eficiencia");

          return (
            <div key={idx} className="flex items-center justify-between gap-4">
              <span style={{ color: entry.color }} className="font-bold">
                {serie}
              </span>
              <span className="font-bold text-slate-800">
                {isPct
                  ? `${Number(entry.value || 0).toFixed(1)}%`
                  : formatCurrency(Number(entry.value || 0))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CustomVentasEbitdaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-2xl">
      <p className="mb-2 border-b border-slate-100 pb-2 text-sm font-black text-slate-800">
        {label}
      </p>

      <div className="space-y-1.5 text-sm">
        {payload.map((entry: any, idx: number) => {
          const serie = getSerieLabel(entry.name, entry.dataKey);

          return (
            <div key={idx} className="flex items-center justify-between gap-4">
              <span style={{ color: entry.color }} className="font-bold">
                {serie}
              </span>
              <span className="font-bold text-slate-800">
                {formatCurrency(Number(entry.value || 0))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

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
  const [fechaDesdeSugerida, setFechaDesdeSugerida] = useState(defaults.desde);
  const [fechaHastaSugerida, setFechaHastaSugerida] = useState(defaults.hasta);
  const [centroCostos, setCentroCostos] = useState<string>("");
  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [initReady, setInitReady] = useState(false);

  async function cargarFechasSugeridas() {
    try {
      const meta: DashboardMetadata = await authFetch("/dashboard/resumen-ejecutivo/metadata");

      if (meta?.desde_sugerido && meta?.hasta_sugerido) {
        setFechaDesde(meta.desde_sugerido);
        setFechaHasta(meta.hasta_sugerido);
        setFechaDesdeSugerida(meta.desde_sugerido);
        setFechaHastaSugerida(meta.hasta_sugerido);
      }
    } catch (e) {
      console.error("Error cargando metadata del dashboard", e);
    } finally {
      setInitReady(true);
    }
  }

  async function cargarDashboard() {
    try {
      setLoading(true);
      setError("");

      const qs = new URLSearchParams({
        desde: fechaDesde,
        hasta: fechaHasta,
      });

      if (centroCostos) qs.set("centro_costos", centroCostos);

      const json: DashboardResponse = await authFetch(
        `/dashboard/resumen-ejecutivo?${qs.toString()}`
      );

      setData(json);
    } catch (err: any) {
      setError(err?.message || "Error cargando dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function cargarCentros() {
    try {
      const data = await authFetch(`/catalogos/centros-costo-consolidado`);
      setCentros(data || []);
    } catch (e) {
      console.error("Error cargando centros de costo", e);
      setCentros([]);
    }
  }

  useEffect(() => {
    async function init() {
      await cargarFechasSugeridas();
      await cargarCentros();
    }
    init();
  }, []);

  useEffect(() => {
    if (!initReady || !fechaDesde || !fechaHasta) return;
    cargarDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initReady, fechaDesde, fechaHasta]);

  const hayAuxiliar = data?.metadata?.hay_datos_auxiliar_actual ?? true;
  const caja = data?.kpis?.caja_disponible;
  const runway = data?.kpis?.cash_runway;
  const cajaDisponibleConfigurada =
    isConfiguredNumber(caja?.actual) && !caja?.requiere_parametrizacion;
  const runwayConfigurado =
    isConfiguredNumber(runway?.actual) && !runway?.requiere_parametrizacion;

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
        value: hayAuxiliar ? formatPercent(ef.actual) : "Sin datos",
        description: hayAuxiliar
          ? `De cada $100 vendidos, quedan $${ef.actual.toFixed(1)} como EBITDA.`
          : "No hay auxiliar contable cargado para el período seleccionado.",
        delta: hayAuxiliar
          ? `${diffLabel(ef.diff, " pts")} vs período anterior`
          : `Último auxiliar: ${data?.metadata?.ultima_fecha_auxiliar || "N/D"}`,
        accent: "from-indigo-500/15 to-violet-400/5",
        chip: "bg-indigo-50 text-indigo-700 border border-indigo-100",
        icon: <Target size={18} />,
        info: "Mide qué porcentaje de las ventas operacionales termina convertido en EBITDA. Ayuda a ver la eficiencia del negocio, no solo el tamaño de las ventas.",
      },
      {
        label: "EBITDA",
        value: hayAuxiliar ? formatCurrency(ebitda.actual) : "Sin datos",
        description: hayAuxiliar
          ? "Resultado operativo antes de impuestos, intereses, depreciaciones y amortizaciones."
          : "El auxiliar contable no tiene datos para este período.",
        delta: hayAuxiliar
          ? `${diffLabel(ebitda.pct, "%")} vs período anterior`
          : "Pendiente de carga contable",
        accent: "from-emerald-500/15 to-green-400/5",
        chip: "bg-emerald-50 text-emerald-700 border border-emerald-100",
        icon: <TrendingUp size={18} />,
        info: "Refleja la generación operativa del negocio antes de efectos financieros y contables no caja. Sirve para comparar desempeño operativo entre periodos.",
      },
      {
        label: "Ventas Netas",
        value: hayAuxiliar ? formatCurrency(ventas.actual) : "Sin datos",
        description: hayAuxiliar
          ? "Ingresos operacionales del período analizado."
          : "No hay ventas contables disponibles en el auxiliar del período.",
        delta: hayAuxiliar
          ? `${diffLabel(ventas.pct, "%")} vs período anterior`
          : "Pendiente de carga contable",
        accent: "from-sky-500/15 to-blue-400/5",
        chip: "bg-sky-50 text-sky-700 border border-sky-100",
        icon: <Banknote size={18} />,
        info: "Corresponde a los ingresos operacionales reconocidos en el auxiliar para el rango analizado. Sirve para medir escala comercial y base de margen.",
      },
      {
        label: "Caja Disponible",
        value: cajaDisponibleConfigurada ? formatCurrency(caja?.actual) : "Pendiente",
        description: cajaDisponibleConfigurada
          ? "Saldo de caja parametrizado al cierre del período."
          : caja?.mensaje || "Configura las cuentas que representan la caja real disponible.",
        delta: cajaDisponibleConfigurada
          ? "Base para runway"
          : "Requiere parametrización",
        accent: "from-amber-500/15 to-yellow-400/5",
        chip: "bg-amber-50 text-amber-700 border border-amber-100",
        icon: <Wallet size={18} />,
        info: "No debe tomar toda la clase 11 a ciegas. Debe construirse con las cuentas bancarias o de caja que la empresa defina como disponibles para operar.",
      },
      {
        label: "Cash Runway",
        value: runwayConfigurado ? formatMonths(runway?.actual) : "Pendiente",
        description: runwayConfigurado
          ? "Meses estimados de operación con la caja disponible según la fórmula configurada."
          : runway?.mensaje || "Activa la configuración de runway para calcularlo con una base confiable.",
        delta: runwayConfigurado
          ? `Burn promedio: ${formatCurrency(
              runway?.burn_promedio ?? runway?.burn_promedio_3m ?? 0
            )}`
          : "Requiere parametrización",
        accent: "from-rose-500/15 to-orange-400/5",
        chip: "bg-rose-50 text-rose-700 border border-rose-100",
        icon: <Activity size={18} />,
        info: "Indica cuántos meses podría operar la empresa con la caja disponible actual. Solo es confiable si la caja y la fórmula de burn están parametrizadas.",
      },
    ];
  }, [data, hayAuxiliar, cajaDisponibleConfigurada, runwayConfigurado]);

  const eficienciaComparativos = useMemo(() => {
    if (!data?.kpis?.eficiencia_operativa) return [];
    const ef = data.kpis.eficiencia_operativa;

    return [
      {
        label: "Período actual",
        value: hayAuxiliar ? `${ef.actual.toFixed(1)}%` : "Sin datos",
        accent: "bg-indigo-50 text-indigo-700 border-indigo-100",
        info: "Valor del indicador en el rango seleccionado.",
      },
      {
        label: "Período anterior",
        value: `${ef.anterior.toFixed(1)}%`,
        accent: "bg-slate-50 text-slate-700 border-slate-200",
        info: "Sirve para comparar el resultado actual contra un rango anterior del mismo tamaño.",
      },
      {
        label: "Promedio 6 meses",
        value: `${ef.promedio_6m.toFixed(1)}%`,
        accent: "bg-emerald-50 text-emerald-700 border-emerald-100",
        info: "Referencia de tendencia para entender si el valor actual está por encima o por debajo del comportamiento reciente.",
      },
      {
        label: "Meta",
        value: `${ef.meta.toFixed(1)}%`,
        accent: "bg-amber-50 text-amber-700 border-amber-100",
        info: "Objetivo parametrizable del indicador estrella. Ayuda a evaluar si el negocio está cumpliendo la meta deseada.",
      },
    ];
  }, [data, hayAuxiliar]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="space-y-4 p-3 md:p-4">
        <div className="relative overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(79,70,229,0.10),_transparent_28%),radial-gradient(circle_at_left,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(to_bottom_right,_rgba(255,255,255,1),_rgba(248,250,252,0.98))]" />
          <div className="relative flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between lg:p-5">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                <Sparkles size={12} />
                Resumen Ejecutivo Inteligente
              </div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 md:text-2xl">
                Dashboard financiero premium
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Foto rápida del desempeño financiero de tu empresa. Aquí ves los KPIs
                más importantes, por qué suben o bajan y qué revisar de inmediato.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
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

        <Card className="rounded-[1.7rem] border-slate-200 shadow-sm">
          <CardContent className="p-4 lg:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="grid flex-1 gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fecha desde
                  </label>
                  <Input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="h-10 rounded-2xl border-slate-200 bg-white"
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
                    className="h-10 rounded-2xl border-slate-200 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Centro de costos
                  </label>
                  <select
                    value={centroCostos}
                    onChange={(e) => setCentroCostos(e.target.value)}
                    className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
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
                    setFechaDesde(fechaDesdeSugerida);
                    setFechaHasta(fechaHastaSugerida);
                    setCentroCostos("");
                  }}
                  className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Limpiar
                </button>

                <button
                  onClick={cargarDashboard}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-black text-white shadow-lg transition hover:bg-black active:scale-[0.98]"
                >
                  {loading ? (
                    <RefreshCcw size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  {loading ? "Actualizando..." : "Actualizar dashboard"}
                </button>
              </div>
            </div>

            {(data?.metadata?.fecha_corte_confiable || data?.metadata?.mensaje_contexto) && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
                {data?.metadata?.fecha_corte_confiable && (
                  <div>
                    <span className="font-bold text-slate-800">Corte contable usado:</span>{" "}
                    {data.metadata.fecha_corte_confiable}
                  </div>
                )}
                {data?.metadata?.mensaje_contexto && <div>{data.metadata.mensaje_contexto}</div>}
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <Card className="rounded-[1.7rem] border border-rose-200 bg-rose-50 shadow-sm">
            <CardContent className="p-4 text-sm font-medium text-rose-700">
              {error}
            </CardContent>
          </Card>
        )}

        {data?.metadata && !data.metadata.hay_datos_auxiliar_actual && (
          <Card className="rounded-[1.7rem] border border-amber-200 bg-amber-50 shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm font-semibold text-amber-800">
                {data.metadata.mensaje_contexto ||
                  "No hay información de auxiliar contable para el período seleccionado."}
              </div>
              {data.metadata.ultima_fecha_auxiliar && (
                <div className="mt-1 text-xs text-amber-700">
                  Última fecha disponible en auxiliar: {data.metadata.ultima_fecha_auxiliar}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!!kpiCards.length && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-5">
            {kpiCards.map((item, i) => (
              <KpiCard key={i} {...item} />
            ))}
          </div>
        )}

        {data?.kpis?.eficiencia_operativa && (
          <Card className="overflow-hidden rounded-[1.7rem] border-none bg-white shadow-xl">
            <div className="border-b border-slate-100 bg-slate-900 px-4 py-4 text-white lg:px-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <TitleWithInfo
                    info="Este bloque resalta la eficiencia operativa porque muestra cuánto de cada peso vendido se convierte en EBITDA. Por eso se compara el valor actual, el anterior, la tendencia y la meta."
                    className="text-lg font-black uppercase tracking-[0.16em]"
                    dark
                    align="left"
                  >
                    Indicador estrella
                  </TitleWithInfo>
                  <p className="mt-1 text-sm text-slate-300">
                    Eficiencia Operativa: % de ventas que se convierten en EBITDA
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                    Lectura ejecutiva
                  </div>
                  <div className="mt-1 text-2xl font-black text-white">
                    {hayAuxiliar
                      ? formatPercent(data.kpis.eficiencia_operativa.actual)
                      : "Sin datos"}
                  </div>
                </div>
              </div>
            </div>

            <CardContent className="p-4 lg:p-5">
              <div className="grid gap-3 md:grid-cols-4">
                {eficienciaComparativos.map((item, i) => (
                  <div key={i} className={cx("rounded-3xl border p-4", item.accent)}>
                    <TitleWithInfo
                      info={item.info}
                      className="text-[11px] font-black uppercase tracking-[0.16em]"
                      align="right"
                    >
                      {item.label}
                    </TitleWithInfo>
                    <div className="mt-2 text-2xl font-black">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm leading-7 text-slate-700">
                  <span className="font-black text-slate-900">Interpretación:</span>{" "}
                  {hayAuxiliar ? (
                    <>
                      de cada <span className="font-black">$100 vendidos</span>, la empresa
                      está convirtiendo aproximadamente{" "}
                      <span className="font-black">
                        ${data.kpis.eficiencia_operativa.actual.toFixed(1)}
                      </span>{" "}
                      en EBITDA.
                    </>
                  ) : (
                    <>
                      No hay información del auxiliar para calcular la eficiencia operativa del
                      período seleccionado.
                    </>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
          <Card className="rounded-[1.7rem] border-slate-200 shadow-sm">
            <CardContent className="p-4 lg:p-5">
              <SectionTitle
                badge="Capa 2"
                title="Qué cambió y por qué"
                subtitle="Evolución de ventas, EBITDA y eficiencia operativa en los últimos meses."
                info="Compara tres señales: ventas, EBITDA y eficiencia operativa. Sirve para entender si el crecimiento comercial viene acompañado o no de mejor rentabilidad."
              />

              <div className="h-[290px] md:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.series?.mensual || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#475569" }} />
                    <YAxis
                      yAxisId="money"
                      tickFormatter={abreviar}
                      tick={{ fontSize: 11, fill: "#475569" }}
                    />
                    <YAxis
                      yAxisId="pct"
                      orientation="right"
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 11, fill: "#475569" }}
                    />
                    <Tooltip content={<CustomQueCambioTooltip />} />
                    <Legend />
                    <Line
                      yAxisId="money"
                      type="monotone"
                      dataKey="ventas"
                      name="Ventas"
                      stroke="#0f172a"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="money"
                      type="monotone"
                      dataKey="ebitda"
                      name="EBITDA"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="pct"
                      type="monotone"
                      dataKey="eficiencia_operativa"
                      name="Eficiencia operativa"
                      stroke="#4f46e5"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.7rem] border-slate-200 shadow-sm">
            <CardContent className="p-4 lg:p-5">
              <SectionTitle
                badge="Lectura automática"
                title="Explicación ejecutiva"
                subtitle="Resumen sintetizado del comportamiento del período."
                info="Estas frases salen de las variaciones del dashboard. Ayudan a un lector no financiero a entender rápidamente qué pasó sin revisar toda la tabla contable."
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

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="rounded-[1.7rem] border-slate-200 shadow-sm xl:col-span-1">
            <CardContent className="p-4 lg:p-5">
              <SectionTitle
                badge="Presión de gasto"
                title="Top gastos operacionales"
                subtitle="Dónde se está yendo más dinero en el período."
                info="Muestra las categorías de gasto operacional con mayor peso en el período. Ayuda a enfocar revisiones y decisiones de control."
              />

              {!data?.metadata?.hay_datos_auxiliar_actual || !(data?.top_gastos || []).length ? (
                <div className="flex h-[260px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                  No hay gastos operacionales del auxiliar para el período seleccionado.
                </div>
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={(data?.top_gastos || []).map((g) => ({
                        nombre: truncate(g.nombre, 18),
                        valor: g.valor,
                      }))}
                      layout="vertical"
                      margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        type="number"
                        tickFormatter={abreviar}
                        tick={{ fontSize: 11, fill: "#475569" }}
                      />
                      <YAxis
                        type="category"
                        dataKey="nombre"
                        width={100}
                        tick={{ fontSize: 11, fill: "#475569" }}
                      />
                      <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                      <Bar dataKey="valor" radius={[0, 14, 14, 0]} fill="#f59e0b">
                        <LabelList
                          dataKey="valor"
                          position="right"
                          formatter={(value: ReactNode) => abreviar(Number(value ?? 0))}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.7rem] border-slate-200 shadow-sm">
            <CardContent className="p-4 lg:p-5">
              <SectionTitle
                badge="Comercial"
                title="Top clientes"
                subtitle="Clientes con mayor facturación en el período."
                info="Lista los clientes que más ventas aportan en el rango analizado. Sirve para ver concentración comercial y dependencia de pocos clientes."
              />

              <div className="space-y-3">
                {(data?.top_clientes || []).map((item, idx) => (
                  <div
                    key={`${item.nombre}-${idx}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-2xl bg-indigo-50 p-2 text-indigo-700">
                        <Users size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-800">{item.nombre}</div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-400">
                          Cliente #{idx + 1}
                        </div>
                      </div>
                    </div>
                    <div className="pl-3 text-right text-sm font-black text-slate-900">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.7rem] border-slate-200 shadow-sm">
            <CardContent className="p-4 lg:p-5">
              <SectionTitle
                badge="Abastecimiento"
                title="Top proveedores"
                subtitle="Proveedores con mayor peso en compras/gastos."
                info="Lista los proveedores más relevantes en compras y gastos del período. Ayuda a ver concentración de abastecimiento y presión de egresos."
              />

              <div className="space-y-3">
                {(data?.top_proveedores || []).map((item, idx) => (
                  <div
                    key={`${item.nombre}-${idx}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-2xl bg-emerald-50 p-2 text-emerald-700">
                        <Building2 size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-800">{item.nombre}</div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-400">
                          Proveedor #{idx + 1}
                        </div>
                      </div>
                    </div>
                    <div className="pl-3 text-right text-sm font-black text-slate-900">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card className="rounded-[1.7rem] border-slate-200 shadow-sm">
            <CardContent className="p-4 lg:p-5">
              <SectionTitle
                badge="Capa 3"
                title="Qué revisar o decidir"
                subtitle="Acciones sugeridas por el sistema con base en los KPIs."
                info="Estas acciones priorizan focos de revisión según cambios en rentabilidad, ventas, presión de gasto y otras señales del dashboard."
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

          <Card className="rounded-[1.7rem] border-slate-200 shadow-sm">
            <CardContent className="p-4 lg:p-5">
              <SectionTitle
                badge="Alertas"
                title="Alertas y foco inmediato"
                subtitle="Lecturas ejecutivas de riesgo y prioridad."
                info="Concentra riesgos o avisos relevantes del dashboard. Si caja o runway no están configurados, aquí se informa para evitar lecturas engañosas."
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

        <Card className="rounded-[1.7rem] border-slate-200 shadow-sm">
          <CardContent className="p-4 lg:p-5">
            <SectionTitle
              badge="Tendencia"
              title="Comportamiento mensual de ventas y EBITDA"
              subtitle="Vista ejecutiva para seguir la evolución del negocio."
              info="Esta gráfica muestra la trayectoria mensual de ventas y EBITDA. Sirve para detectar cambios de tendencia, picos o deterioros."
            />

            <div className="h-[290px] md:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.series?.mensual || []}>
                  <defs>
                    <linearGradient id="ventasFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="ebitdaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#475569" }} />
                  <YAxis tickFormatter={abreviar} tick={{ fontSize: 11, fill: "#475569" }} />
                  <Tooltip content={<CustomVentasEbitdaTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="ventas"
                    stroke="#0f172a"
                    fill="url(#ventasFill)"
                    strokeWidth={2.5}
                    name="Ventas"
                  />
                  <Area
                    type="monotone"
                    dataKey="ebitda"
                    stroke="#10b981"
                    fill="url(#ebitdaFill)"
                    strokeWidth={2.5}
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