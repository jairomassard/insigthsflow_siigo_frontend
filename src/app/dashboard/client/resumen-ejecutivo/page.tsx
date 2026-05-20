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
  CircleHelp,
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
  requiere_parametrizacion?: boolean;
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
  metadata?: {
    hay_datos_auxiliar_actual: boolean;
    ultima_fecha_auxiliar?: string | null;
    mensaje_contexto?: string | null;
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
  desde_sugerido?: string | null;
  hasta_sugerido?: string | null;
};

type IndicadorVista =
  | "eficiencia_operativa"
  | "ebitda"
  | "ventas_netas"
  | "caja_disponible"
  | "autonomia_caja";

type TarjetaIndicador = {
  label: string;
  value: string;
  accent: string;
};

type DetalleIndicador = {
  nombre: string;
  subtitulo: string;
  lectura: string;
  interpretacion: string;
  tarjetas: TarjetaIndicador[];
  chartKey?: keyof SerieMensual;
  chartName?: string;
  chartColor?: string;
  chartTipo?: "dinero" | "porcentaje";
  emptyChartText?: string;
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
function InfoBubble({
  text,
  align = "center",
}: {
  text: string;
  align?: "left" | "center" | "right";
}) {
  const alignClass =
    align === "left"
      ? "right-0"
      : align === "right"
        ? "left-0"
        : "left-1/2 -translate-x-1/2";

  return (
    <div className="group/info relative shrink-0">
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 shadow-sm transition hover:border-slate-400 hover:text-slate-700"
      >
        <CircleHelp size={13} />
      </button>

      <div
        className={cx(
          "pointer-events-none absolute top-7 z-[70] hidden w-72 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] font-medium leading-5 text-slate-700 shadow-2xl group-hover/info:block",
          alignClass,
        )}
      >
        {text}
      </div>
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
  bar,
  glow,
  icon,
  helpText,
  helpAlign,
}: {
  label: string;
  value: string;
  description?: string;
  delta?: string;
  accent: string;
  chip: string;
  bar: string;
  glow: string;
  icon: ReactNode;
  helpText?: string;
  helpAlign?: "left" | "center" | "right";
}) {
  return (
    <div className="relative z-0 hover:z-30">
      <Card
        className={cx(
          "relative overflow-visible rounded-[1.75rem] border border-slate-200 shadow-sm transition-all duration-300",
          "hover:-translate-y-0.5 hover:shadow-lg bg-gradient-to-br",
          accent,
        )}
      >
        <div className={cx("absolute bottom-4 left-0 top-4 w-1.5 rounded-r-full", bar)} />
        <div className={cx("pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full blur-2xl", glow)} />

        <CardContent className="relative p-3.5 md:p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 md:text-[11px]">
                  {label}
                </div>
                {helpText && <InfoBubble text={helpText} align={helpAlign} />}
              </div>
            </div>

            <div className={cx("rounded-2xl border p-2.5 shadow-sm", chip)}>{icon}</div>
          </div>

          <div className="text-[1.55rem] font-black tracking-tight text-slate-900 md:text-[1.75rem]">
            {value}
          </div>

          {description && (
            <p className="mt-1.5 line-clamp-2 text-[12px] font-semibold leading-5 text-slate-700">
              {description}
            </p>
          )}

          {delta && (
            <div className="mt-2.5 inline-flex rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[10px] font-black text-slate-700 shadow-sm">
              {delta}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
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
    <div className="mb-3">
      <div className="mb-1 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {badge}
      </div>
      <h2 className="text-[15px] font-black tracking-tight text-slate-900 md:text-[17px]">
        {title}
      </h2>
      <p className="mt-0.5 text-[12px] font-medium leading-5 text-slate-500">
        {subtitle}
      </p>
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
  const [initReady, setInitReady] = useState(false);
  const [indicadorSeleccionado, setIndicadorSeleccionado] =
    useState<IndicadorVista>("eficiencia_operativa");

  async function cargarFechasSugeridas() {
    try {
      const meta: DashboardMetadata = await authFetch(
        "/dashboard/resumen-ejecutivo/metadata",
      );

      if (meta?.desde_sugerido && meta?.hasta_sugerido) {
        setFechaDesde(meta.desde_sugerido);
        setFechaHasta(meta.hasta_sugerido);
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
        `/dashboard/resumen-ejecutivo?${qs.toString()}`,
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

  const kpiCards = useMemo(() => {
    if (!data?.kpis) return [];

    const ef = data.kpis.eficiencia_operativa;
    const ebitda = data.kpis.ebitda;
    const ventas = data.kpis.ventas_netas;
    const caja = data.kpis.caja_disponible;
    const runway = data.kpis.cash_runway;

    return [
      {
        label: "Eficiencia operativa",
        value: hayAuxiliar ? formatPercent(ef.actual) : "Sin datos",
        description: hayAuxiliar
          ? `De cada $100 vendidos, quedan ${ef.actual < 0 ? "-$" : "$"}${Math.abs(ef.actual).toFixed(1)} como EBITDA.`
          : "No hay auxiliar contable cargado para el período seleccionado.",
        delta: hayAuxiliar
          ? `${diffLabel(ef.diff, " pts")} vs período anterior`
          : `Último auxiliar: ${data?.metadata?.ultima_fecha_auxiliar || "N/D"}`,
        accent: "from-indigo-100 via-violet-50 to-white",
        chip: "bg-indigo-50 text-indigo-700 border-indigo-200",
        bar: "bg-indigo-500",
        glow: "bg-indigo-300/60",
        icon: <Target size={18} />,
        helpText:
          "Mide qué porcentaje de las ventas se convierte en EBITDA. Ayuda a saber si el negocio está transformando las ventas en resultado operativo.",
        helpAlign: "right" as const,
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
        accent: "from-emerald-100 via-green-50 to-white",
        chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
        bar: "bg-emerald-500",
        glow: "bg-emerald-300/60",
        icon: <TrendingUp size={18} />,
        helpText:
          "Representa la utilidad operativa del negocio antes de considerar intereses, impuestos, depreciaciones y amortizaciones. Es una lectura rápida de la rentabilidad operativa.",
        helpAlign: "center" as const,
      },
      {
        label: "Ventas netas",
        value: hayAuxiliar ? formatCurrency(ventas.actual) : "Sin datos",
        description: hayAuxiliar
          ? "Ingresos operacionales netos del período analizado."
          : "No hay ventas contables disponibles en el auxiliar del período.",
        delta: hayAuxiliar
          ? `${diffLabel(ventas.pct, "%")} vs período anterior`
          : "Pendiente de carga contable",
        accent: "from-sky-100 via-blue-50 to-white",
        chip: "bg-sky-50 text-sky-700 border-sky-200",
        bar: "bg-sky-500",
        glow: "bg-sky-300/60",
        icon: <Banknote size={18} />,
        helpText:
          "Corresponde a los ingresos operacionales del período. Sirve para monitorear el tamaño real de la operación y su evolución mensual.",
        helpAlign: "center" as const,
      },
      {
        label: "Caja disponible",
        value: formatCurrency(caja.actual),
        description:
          "Saldo estimado de caja y bancos al cierre del período seleccionado.",
        delta: "Base para la autonomía de caja",
        accent: "from-amber-100 via-yellow-50 to-white",
        chip: "bg-amber-50 text-amber-700 border-amber-200",
        bar: "bg-amber-500",
        glow: "bg-amber-300/60",
        icon: <Wallet size={18} />,
        helpText:
          "Muestra la caja y bancos estimados disponibles. Sirve como base para evaluar liquidez inmediata y calcular cuántos meses puede operar la empresa.",
        helpAlign: "center" as const,
      },
      {
        label: "Autonomía de caja",
        value: formatMonths(runway.actual),
        description:
          "Meses estimados de operación con la caja actual según el gasto promedio de los últimos 3 meses.",
        delta:
          runway?.requiere_parametrizacion
            ? "Pendiente de parametrización"
            : Number(runway?.burn_promedio_3m || 0) > 0
              ? `Gasto promedio 3M: ${formatCurrency(runway.burn_promedio_3m)}`
              : "Gasto promedio no disponible",
        accent: "from-rose-100 via-pink-50 to-white",
        chip: "bg-rose-50 text-rose-700 border-rose-200",
        bar: "bg-rose-500",
        glow: "bg-rose-300/60",
        icon: <Activity size={18} />,
        helpText:
          "Indica cuántos meses podría operar la empresa con la caja actual, asumiendo el ritmo reciente de gasto. Es una lectura ejecutiva de resiliencia financiera.",
        helpAlign: "left" as const,
      },
    ];
  }, [data, hayAuxiliar]);

  const detalleIndicador = useMemo<DetalleIndicador | null>(() => {
    if (!data?.kpis) return null;

    const ef = data.kpis.eficiencia_operativa;
    const ebitda = data.kpis.ebitda;
    const ventas = data.kpis.ventas_netas;
    const caja = data.kpis.caja_disponible;
    const runway = data.kpis.cash_runway;

    switch (indicadorSeleccionado) {
      case "eficiencia_operativa":
        return {
          nombre: "Eficiencia operativa",
          subtitulo:
            "Porcentaje de las ventas que se convierte en EBITDA. Útil para saber qué tan rentable está siendo la operación.",
          lectura: hayAuxiliar ? formatPercent(ef.actual) : "Sin datos",
          interpretacion: hayAuxiliar
            ? `Por cada $100 vendidos, la empresa está convirtiendo aproximadamente ${ef.actual < 0 ? "-$" : "$"}${Math.abs(ef.actual).toFixed(1)} en EBITDA.`
            : "No hay información del auxiliar para calcular la eficiencia operativa del período seleccionado.",
          tarjetas: [
            {
              label: "Período actual",
              value: hayAuxiliar ? formatPercent(ef.actual) : "Sin datos",
              accent: "bg-indigo-50 text-indigo-700 border-indigo-100",
            },
            {
              label: "Período anterior",
              value: formatPercent(ef.anterior),
              accent: "bg-slate-50 text-slate-700 border-slate-200",
            },
            {
              label: "Promedio 6 meses",
              value: formatPercent(ef.promedio_6m),
              accent: "bg-emerald-50 text-emerald-700 border-emerald-100",
            },
            {
              label: "Meta",
              value: formatPercent(ef.meta),
              accent: "bg-amber-50 text-amber-700 border-amber-100",
            },
          ],
          chartKey: "eficiencia_operativa",
          chartName: "Eficiencia operativa",
          chartColor: "#4f46e5",
          chartTipo: "porcentaje",
        };

      case "ebitda":
        return {
          nombre: "EBITDA",
          subtitulo:
            "Resultado operativo antes de impuestos, intereses, depreciaciones y amortizaciones.",
          lectura: hayAuxiliar ? formatCurrency(ebitda.actual) : "Sin datos",
          interpretacion: hayAuxiliar
            ? `El EBITDA del período fue ${formatCurrency(ebitda.actual)} y cambió ${diffLabel(ebitda.pct, "%")} frente al período anterior.`
            : "No hay información del auxiliar para calcular el EBITDA del período seleccionado.",
          tarjetas: [
            {
              label: "Período actual",
              value: hayAuxiliar ? formatCurrency(ebitda.actual) : "Sin datos",
              accent: "bg-emerald-50 text-emerald-700 border-emerald-100",
            },
            {
              label: "Período anterior",
              value: formatCurrency(ebitda.anterior),
              accent: "bg-slate-50 text-slate-700 border-slate-200",
            },
            {
              label: "Variación absoluta",
              value: formatCurrency(ebitda.diff),
              accent: "bg-sky-50 text-sky-700 border-sky-100",
            },
            {
              label: "Variación %",
              value: formatPercent(ebitda.pct),
              accent: "bg-indigo-50 text-indigo-700 border-indigo-100",
            },
          ],
          chartKey: "ebitda",
          chartName: "EBITDA",
          chartColor: "#10b981",
          chartTipo: "dinero",
        };

      case "ventas_netas":
        return {
          nombre: "Ventas netas",
          subtitulo:
            "Ingresos operacionales netos del período. Sirve para monitorear tamaño del negocio y tendencia comercial.",
          lectura: hayAuxiliar ? formatCurrency(ventas.actual) : "Sin datos",
          interpretacion: hayAuxiliar
            ? `Las ventas netas del período fueron ${formatCurrency(ventas.actual)} y variaron ${diffLabel(ventas.pct, "%")} frente al período anterior.`
            : "No hay información del auxiliar para calcular las ventas netas del período seleccionado.",
          tarjetas: [
            {
              label: "Período actual",
              value: hayAuxiliar ? formatCurrency(ventas.actual) : "Sin datos",
              accent: "bg-sky-50 text-sky-700 border-sky-100",
            },
            {
              label: "Período anterior",
              value: formatCurrency(ventas.anterior),
              accent: "bg-slate-50 text-slate-700 border-slate-200",
            },
            {
              label: "Variación absoluta",
              value: formatCurrency(ventas.diff),
              accent: "bg-emerald-50 text-emerald-700 border-emerald-100",
            },
            {
              label: "Variación %",
              value: formatPercent(ventas.pct),
              accent: "bg-indigo-50 text-indigo-700 border-indigo-100",
            },
          ],
          chartKey: "ventas",
          chartName: "Ventas netas",
          chartColor: "#0f172a",
          chartTipo: "dinero",
        };

      case "caja_disponible":
        return {
          nombre: "Caja disponible",
          subtitulo:
            "Saldo estimado de caja y bancos al cierre del período. Es la base de liquidez inmediata.",
          lectura: formatCurrency(caja.actual),
          interpretacion: `La caja disponible estimada al cierre del período es ${formatCurrency(caja.actual)}. Este valor es la base para evaluar liquidez inmediata y autonomía financiera.`,
          tarjetas: [
            {
              label: "Saldo actual",
              value: formatCurrency(caja.actual),
              accent: "bg-amber-50 text-amber-700 border-amber-100",
            },
            {
              label: "Último corte auxiliar",
              value: data.metadata?.ultima_fecha_auxiliar || "No disponible",
              accent: "bg-slate-50 text-slate-700 border-slate-200",
            },
            {
              label: "Centro de costos",
              value: centroCostos ? "Filtrado" : "Todos",
              accent: "bg-sky-50 text-sky-700 border-sky-100",
            },
            {
              label: "Uso principal",
              value: "Liquidez",
              accent: "bg-emerald-50 text-emerald-700 border-emerald-100",
            },
          ],
          emptyChartText:
            "Este indicador aún no trae una serie histórica mensual en la respuesta del backend. Si quieres, en la siguiente iteración lo alimentamos con una tendencia de caja mes a mes.",
        };

      case "autonomia_caja":
      default:
        return {
          nombre: "Autonomía de caja",
          subtitulo:
            "Meses que la empresa podría operar con la caja actual, usando como referencia el gasto promedio reciente.",
          lectura: formatMonths(runway.actual),
          interpretacion: `Con la caja actual y el gasto promedio reciente, la empresa tendría aproximadamente ${formatMonths(runway.actual)} de autonomía. El gasto promedio de referencia es ${formatCurrency(runway.burn_promedio_3m)}.`,
          tarjetas: [
            {
              label: "Autonomía estimada",
              value: formatMonths(runway.actual),
              accent: "bg-rose-50 text-rose-700 border-rose-100",
            },
            {
              label: "Gasto promedio 3 meses",
              value: formatCurrency(runway.burn_promedio_3m),
              accent: "bg-slate-50 text-slate-700 border-slate-200",
            },
            {
              label: "Unidad",
              value: runway.unidad || "Meses",
              accent: "bg-sky-50 text-sky-700 border-sky-100",
            },
            {
              label: "Uso principal",
              value: "Resiliencia",
              accent: "bg-emerald-50 text-emerald-700 border-emerald-100",
            },
          ],
          emptyChartText:
            "Este indicador se calcula con caja y gasto promedio. Si quieres ver una evolución mensual de autonomía, habría que incorporarla explícitamente en el backend.",
        };
    }
  }, [data, hayAuxiliar, indicadorSeleccionado, centroCostos]);

  const opcionesIndicador = [
    { value: "eficiencia_operativa", label: "Eficiencia operativa" },
    { value: "ebitda", label: "EBITDA" },
    { value: "ventas_netas", label: "Ventas netas" },
    { value: "caja_disponible", label: "Caja disponible" },
    { value: "autonomia_caja", label: "Autonomía de caja" },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="space-y-2.5 p-2 md:p-3 lg:p-3.5">
        {/* ENCABEZADO */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(79,70,229,0.12),_transparent_30%),radial-gradient(circle_at_left,_rgba(16,185,129,0.14),_transparent_30%),linear-gradient(to_bottom_right,_rgba(255,255,255,1),_rgba(248,250,252,0.98))]" />
          <div className="relative flex flex-col gap-3 p-4 md:p-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                <Sparkles size={12} />
                Panel ejecutivo inteligente
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-[2rem]">
                Panel ejecutivo financiero
              </h1>
              <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">
                Foto rápida del desempeño financiero de tu empresa. Aquí ves los
                indicadores clave, su evolución y los focos de atención más
                importantes.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 xl:min-w-[360px]">
              <div className="rounded-2xl border border-white/60 bg-white/85 px-3 py-2 shadow-sm backdrop-blur">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Meses graficados
                </div>
                <div className="text-lg font-black text-slate-900">
                  {data?.series?.mensual?.length || 0}
                </div>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/85 px-3 py-2 shadow-sm backdrop-blur">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Principales clientes
                </div>
                <div className="text-lg font-black text-slate-900">
                  {data?.top_clientes?.length || 0}
                </div>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/85 px-3 py-2 shadow-sm backdrop-blur">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Principales proveedores
                </div>
                <div className="text-lg font-black text-slate-900">
                  {data?.top_proveedores?.length || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FILTROS */}
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardContent className="p-3.5 md:p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Fecha desde
                  </label>
                  <Input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="h-10 rounded-2xl border-slate-200 bg-white text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Fecha hasta
                  </label>
                  <Input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="h-10 rounded-2xl border-slate-200 bg-white text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
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
                  onClick={async () => {
                    const d = getDefaultDates();
                    setFechaDesde(d.desde);
                    setFechaHasta(d.hasta);
                    setCentroCostos("");
                  }}
                  className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  Limpiar
                </button>

                <button
                  onClick={cargarDashboard}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-black text-white shadow-lg transition hover:bg-black active:scale-[0.98]"
                >
                  {loading ? (
                    <RefreshCcw size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  {loading ? "Actualizando..." : "Actualizar panel"}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="rounded-[1.75rem] border border-rose-200 bg-rose-50 shadow-sm">
            <CardContent className="p-4 text-sm font-medium text-rose-700">
              {error}
            </CardContent>
          </Card>
        )}

        {data?.metadata && !data.metadata.hay_datos_auxiliar_actual && (
          <Card className="rounded-[1.75rem] border border-amber-200 bg-amber-50 shadow-sm">
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {kpiCards.map((item, i) => (
              <KpiCard key={i} {...item} />
            ))}
          </div>
        )}

        {/* BLOQUE INDICADOR CON SELECTOR */}
        {detalleIndicador && (
          <Card className="overflow-visible rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-900 px-4 py-3 text-white md:px-5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.16em]">
                    Indicador bajo análisis
                  </h2>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-300">
                    {detalleIndicador.subtitulo}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div>
                    <div className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">
                      Selecciona el indicador
                    </div>
                    <select
                      value={indicadorSeleccionado}
                      onChange={(e) =>
                        setIndicadorSeleccionado(e.target.value as IndicadorVista)
                      }
                      className="h-10 min-w-[240px] rounded-2xl border border-white/15 bg-white/10 px-3 text-sm font-semibold text-white outline-none transition focus:border-white/40"
                    >
                      {opcionesIndicador.map((opt) => (
                        <option key={opt.value} value={opt.value} className="text-slate-900">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-2xl bg-white/10 px-3 py-2 sm:min-w-[160px]">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
                      Lectura ejecutiva
                    </div>
                    <div className="mt-1 text-2xl font-black text-white">
                      {detalleIndicador.lectura}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <CardContent className="p-4 md:p-5">
              <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                <div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {detalleIndicador.tarjetas.map((item, i) => (
                      <div
                        key={i}
                        className={cx("rounded-2xl border p-3", item.accent)}
                      >
                        <div className="text-[11px] font-black uppercase tracking-[0.16em]">
                          {item.label}
                        </div>
                        <div className="mt-1 text-lg font-black md:text-xl">
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                    <p className="text-sm leading-6 text-slate-700">
                      <span className="font-black text-slate-900">
                        Interpretación:
                      </span>{" "}
                      {detalleIndicador.interpretacion}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Comportamiento mensual
                  </div>

                  {detalleIndicador.chartKey ? (
                    <div className="h-[210px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data?.series?.mensual || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fontWeight: 700, fill: "#475569" }}
                          />
                          <YAxis
                            tickFormatter={(value: number) =>
                              detalleIndicador.chartTipo === "porcentaje"
                                ? `${Number(value).toFixed(0)}%`
                                : abreviar(Number(value || 0))
                            }
                            tick={{ fontSize: 11, fontWeight: 700, fill: "#475569" }}
                          />
                          <Tooltip
                            formatter={(value: any) => [
                              detalleIndicador.chartTipo === "porcentaje"
                                ? `${Number(value).toFixed(1)}%`
                                : formatCurrency(Number(value)),
                              detalleIndicador.chartName || "Indicador",
                            ]}
                          />
                          <Legend
                            wrapperStyle={{
                              fontSize: 12,
                              fontWeight: 800,
                              color: "#334155",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey={detalleIndicador.chartKey}
                            name={detalleIndicador.chartName || "Indicador"}
                            stroke={detalleIndicador.chartColor || "#0f172a"}
                            strokeWidth={4}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex h-[210px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 text-center text-sm font-medium leading-6 text-slate-500">
                      {detalleIndicador.emptyChartText}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CAPA 2 - EXPLICACIÓN */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.45fr_0.95fr]">
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardContent className="p-4 md:p-4.5">
              <SectionTitle
                badge="Análisis"
                title="Qué cambió y por qué"
                subtitle="Evolución de ventas, EBITDA y eficiencia operativa en los últimos meses."
              />

              <div className="h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.series?.mensual || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fontWeight: 700, fill: "#475569" }}
                    />
                    <YAxis
                      yAxisId="money"
                      tickFormatter={abreviar}
                      tick={{ fontSize: 11, fontWeight: 700, fill: "#475569" }}
                    />
                    <YAxis
                      yAxisId="pct"
                      orientation="right"
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 11, fontWeight: 700, fill: "#475569" }}
                    />
                    <Tooltip
                      formatter={(value: any, name: string) => {
                        if (name === "Eficiencia operativa") {
                          return [`${Number(value).toFixed(1)}%`, "Eficiencia operativa"];
                        }
                        return [
                          formatCurrency(Number(value)),
                          name === "Ventas" ? "Ventas" : "EBITDA",
                        ];
                      }}
                    />
                    <Legend
                      wrapperStyle={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#334155",
                      }}
                    />
                    <Line
                      yAxisId="money"
                      type="monotone"
                      dataKey="ventas"
                      name="Ventas"
                      stroke="#0f172a"
                      strokeWidth={4}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      yAxisId="money"
                      type="monotone"
                      dataKey="ebitda"
                      name="EBITDA"
                      stroke="#10b981"
                      strokeWidth={4}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      yAxisId="pct"
                      type="monotone"
                      dataKey="eficiencia_operativa"
                      name="Eficiencia operativa"
                      stroke="#4f46e5"
                      strokeWidth={4}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardContent className="p-4 md:p-4.5">
              <SectionTitle
                badge="Lectura automática"
                title="Explicación ejecutiva"
                subtitle="Resumen sintetizado del comportamiento del período."
              />

              <div className="space-y-2.5">
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
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <Card className="rounded-[1.75rem] border-slate-200 shadow-sm xl:col-span-1">
            <CardContent className="p-4 md:p-4.5">
              <SectionTitle
                badge="Presión de gasto"
                title="Principales gastos operacionales"
                subtitle="Dónde se está yendo más dinero en el período."
              />

              {!data?.metadata?.hay_datos_auxiliar_actual ||
              !(data?.top_gastos || []).length ? (
                <div className="flex h-[240px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                  No hay gastos operacionales del auxiliar para el período seleccionado.
                </div>
              ) : (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={(data?.top_gastos || []).map((g) => ({
                        nombre:
                          g.nombre.length > 38
                            ? `${g.nombre.slice(0, 38)}…`
                            : g.nombre,
                        nombreCompleto: g.nombre,
                        valor: g.valor,
                      }))}
                      layout="vertical"
                      margin={{ top: 10, right: 34, left: 6, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        type="number"
                        tickFormatter={abreviar}
                        tick={{
                          fontSize: 11,
                          fontWeight: 700,
                          fill: "#475569",
                        }}
                      />
                      <YAxis
                        type="category"
                        dataKey="nombre"
                        width={205}
                        tick={{
                          fontSize: 11,
                          fontWeight: 800,
                          fill: "#475569",
                        }}
                      />
                      <Tooltip
                        formatter={(value: any) => formatCurrency(Number(value))}
                        labelFormatter={(label) => String(label)}
                      />
                      <Bar dataKey="valor" radius={[0, 14, 14, 0]} fill="#f59e0b">
                        <LabelList
                          dataKey="valor"
                          position="right"
                          formatter={(value: ReactNode) =>
                            abreviar(Number(value ?? 0))
                          }
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardContent className="p-4 md:p-4.5">
              <SectionTitle
                badge="Comercial"
                title="Principales clientes"
                subtitle="Clientes con mayor facturación en el período."
              />

              <div className="space-y-2.5">
                {(data?.top_clientes || []).map((item, idx) => (
                  <div
                    key={`${item.nombre}-${idx}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="shrink-0 rounded-2xl bg-indigo-50 p-2 text-indigo-700">
                        <Users size={16} />
                      </div>
                      <div>
                        <div className="line-clamp-1 text-sm font-black text-slate-800">
                          {item.nombre}
                        </div>
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

          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardContent className="p-4 md:p-4.5">
              <SectionTitle
                badge="Abastecimiento"
                title="Principales proveedores"
                subtitle="Proveedores con mayor peso en compras y gastos."
              />

              <div className="space-y-2.5">
                {(data?.top_proveedores || []).map((item, idx) => (
                  <div
                    key={`${item.nombre}-${idx}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="shrink-0 rounded-2xl bg-emerald-50 p-2 text-emerald-700">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <div className="line-clamp-1 text-sm font-black text-slate-800">
                          {item.nombre}
                        </div>
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
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardContent className="p-4 md:p-4.5">
              <SectionTitle
                badge="Capa 3"
                title="Qué revisar o decidir"
                subtitle="Acciones sugeridas por el sistema con base en los indicadores."
              />

              <div className="space-y-2.5">
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

          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardContent className="p-4 md:p-4.5">
              <SectionTitle
                badge="Alertas"
                title="Alertas y foco inmediato"
                subtitle="Lecturas ejecutivas de riesgo y prioridad."
              />

              <div className="space-y-2.5">
                {(data?.alertas || []).map((item, idx) => (
                  <div
                    key={idx}
                    className={cx(
                      "rounded-2xl border px-4 py-3.5",
                      item.nivel === "alta" && "border-rose-200 bg-rose-50",
                      item.nivel === "media" && "border-amber-200 bg-amber-50",
                      item.nivel === "baja" && "border-emerald-200 bg-emerald-50",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cx(
                          "rounded-2xl p-2",
                          item.nivel === "alta" && "bg-rose-100 text-rose-700",
                          item.nivel === "media" && "bg-amber-100 text-amber-700",
                          item.nivel === "baja" && "bg-emerald-100 text-emerald-700",
                        )}
                      >
                        <TriangleAlert size={16} />
                      </div>

                      <div>
                        <div className="text-sm font-black text-slate-900">
                          {item.titulo}
                        </div>
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

        {/* TENDENCIA EXTRA */}
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardContent className="p-4 md:p-5">
            <SectionTitle
              badge="Tendencia mensual"
              title="Comportamiento mensual de ventas y EBITDA"
              subtitle="Vista ejecutiva para seguir la evolución del negocio."
            />

            <div className="h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.series?.mensual || []}>
                  <defs>
                    <linearGradient id="ventasFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="ebitdaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 700, fill: "#475569" }} />
                  <YAxis tickFormatter={abreviar} tick={{ fontSize: 11, fontWeight: 700, fill: "#475569" }} />
                  <Tooltip
                    formatter={(value: any, name: string) => [
                      formatCurrency(Number(value)),
                      name === "Ventas" ? "Ventas" : "EBITDA",
                    ]}
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#334155",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ventas"
                    stroke="#0f172a"
                    fill="url(#ventasFill)"
                    strokeWidth={4}
                    name="Ventas"
                  />
                  <Area
                    type="monotone"
                    dataKey="ebitda"
                    stroke="#10b981"
                    fill="url(#ebitdaFill)"
                    strokeWidth={4}
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
