// src/app/dashboard/client/resumen-ejecutivo/page.tsx
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { authFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ResponsiveContainer,
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
  X,
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
  burn_promedio_3m?: number;
  burn_promedio?: number;
  gasto_promedio?: number;
  gasto_promedio_3m?: number;
  egresos_promedio?: number;
  egresos_promedio_3m?: number;
  meses_promedio?: number;
  unidad: string;
  requiere_parametrizacion?: boolean;
  mensaje?: string;
  formula?: string;
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
    rango_auto?: boolean;
    ajuste_por_corte?: boolean;
    modo_periodo?: "ytd_cerrado" | "ultimo_mes_cerrado" | "manual";
    tipo_corte?: "cerrado" | "al_dia";
    ultima_fecha_auxiliar?: string | null;
    fecha_corte_confiable?: string | null;
  };
  metadata?: {
    hay_datos_auxiliar_actual: boolean;
    ultima_fecha_auxiliar?: string | null;
    fecha_corte_confiable?: string | null;
    mes_actual_parcial?: boolean;
    modo_periodo?: "ytd_cerrado" | "ultimo_mes_cerrado" | "manual";
    tipo_corte?: "cerrado" | "al_dia";
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

type ModoPeriodo = "ytd_cerrado" | "manual";

type DashboardMetadata = {
  ultima_fecha_auxiliar?: string | null;
  fecha_corte_confiable?: string | null;
  desde_sugerido?: string | null;
  hasta_sugerido?: string | null;
  mes_actual_parcial?: boolean;
  modo_periodo?: string | null;
  mensaje_contexto?: string | null;
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

type KpiCardItem = {
  label: string;
  value: string;
  valueFull: string;
  description?: string;
  delta?: string;
  accent: string;
  chip: string;
  bar: string;
  glow: string;
  icon: ReactNode;
  helpText?: string;
  helpAlign?: "left" | "center" | "right";
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

function formatCurrencyShort(valor: number): string {
  return `$ ${abreviar(Number(valor || 0))}`;
}

function formatPercent(valor?: number): string {
  return `${Number(valor || 0).toFixed(1)}%`;
}

function formatMonths(valor?: number): string {
  return `${Number(valor || 0).toFixed(1)} meses`;
}

function getGastoPromedioRunway(
  runway?: KPIRunway,
  cajaActual?: number,
): number {
  const directo = Number(
    runway?.burn_promedio_3m ||
      runway?.gasto_promedio_3m ||
      runway?.egresos_promedio_3m ||
      runway?.burn_promedio ||
      runway?.gasto_promedio ||
      runway?.egresos_promedio ||
      0,
  );

  if (directo > 0) return directo;

  const meses = Number(runway?.actual || 0);
  const caja = Number(cajaActual || 0);

  if (meses > 0 && caja > 0) return caja / meses;

  return 0;
}

function abreviar(valor: number): string {
  const n = Number(valor || 0);
  const abs = Math.abs(n);

  if (abs >= 1_000_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
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
  const n = Number(diff || 0);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}${suffix}`;
}

function formatDateSafe(value?: string | null) {
  if (!value) return "—";
  const raw = String(value).slice(0, 10);
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return String(value);
  return `${d}/${m}/${y}`;
}

function shortenName(value: string, max = 28) {
  const text = String(value || "Sin nombre").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
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
    <span className="group/info relative z-[80] inline-flex shrink-0">
      <span
        aria-label="Ver explicación"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 shadow-sm transition group-hover/info:border-slate-400 group-hover/info:text-slate-700"
      >
        <CircleHelp size={13} />
      </span>

      <span
        className={cx(
          "pointer-events-none absolute top-7 z-[100] hidden w-72 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] font-medium leading-5 text-slate-700 shadow-2xl group-hover/info:block",
          alignClass,
        )}
      >
        {text}
      </span>
    </span>
  );
}

function KpiCard({
  item,
  onOpen,
}: {
  item: KpiCardItem;
  onOpen: (item: KpiCardItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      aria-label={`Abrir detalle de ${item.label}: ${item.valueFull}`}
      className="relative z-0 text-left outline-none transition hover:z-30 focus-visible:z-30 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
    >
      <Card
        className={cx(
          "relative h-[92px] overflow-visible rounded-[1.25rem] border border-slate-200 shadow-sm transition-all duration-300",
          "hover:-translate-y-0.5 hover:shadow-md bg-gradient-to-br",
          item.accent,
        )}
      >
        <div className={cx("absolute bottom-3 left-0 top-3 w-1 rounded-r-full", item.bar)} />
        <div className={cx("pointer-events-none absolute -right-4 -top-5 h-20 w-20 rounded-full blur-2xl", item.glow)} />

        <CardContent className="relative flex h-full flex-col justify-between p-2.5">
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="line-clamp-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">
                  {item.label}
                </div>
                {item.helpText && <InfoBubble text={item.helpText} align={item.helpAlign} />}
              </div>
            </div>

            <div className={cx("rounded-xl border p-1.5 shadow-sm", item.chip)}>
              {item.icon}
            </div>
          </div>

          <div>
            <div className="truncate text-[17px] font-black leading-none tracking-tight text-slate-900">
              {item.value}
            </div>

            <div className="mt-1 flex items-center justify-between gap-1.5">
              {item.delta && (
                <div className="truncate rounded-full border border-slate-200 bg-white/90 px-2 py-0.5 text-[9px] font-black text-slate-700 shadow-sm">
                  {item.delta}
                </div>
              )}
              <span className="ml-auto text-[9px] font-bold text-slate-400">Tocar</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function KpiDetailModal({
  item,
  periodo,
  centroCostos,
  onClose,
}: {
  item: KpiCardItem | null;
  periodo: { desde: string; hasta: string };
  centroCostos: string;
  onClose: () => void;
}) {
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cx("relative overflow-hidden bg-gradient-to-br p-4", item.accent)}>
          <div className={cx("pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl", item.glow)} />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                KPI seleccionado
              </div>
              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                {item.label}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white/80 p-2 text-slate-600 shadow-sm transition hover:bg-white"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
              Valor completo
            </div>
            <div className="mt-1 break-words text-2xl font-black text-slate-900">
              {item.valueFull}
            </div>
          </div>

          {item.description && (
            <p className="rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold leading-6 text-slate-700">
              {item.description}
            </p>
          )}

          {item.helpText && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3 text-sm leading-6 text-indigo-800">
              {item.helpText}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-400">Desde</div>
              <div>{formatDateSafe(periodo.desde)}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-400">Hasta</div>
              <div>{formatDateSafe(periodo.hasta)}</div>
            </div>
            <div className="col-span-2 rounded-2xl bg-slate-50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-400">
                Centro de costos
              </div>
              <div>{centroCostos ? "Filtrado" : "Todos"}</div>
            </div>
          </div>
        </div>
      </div>
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
    <div className="mb-2.5">
      <div className="mb-1 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {badge}
      </div>
      <h2 className="text-[15px] font-black tracking-tight text-slate-900 md:text-[16px]">
        {title}
      </h2>
      <p className="mt-0.5 text-[12px] font-medium leading-5 text-slate-500">
        {subtitle}
      </p>
    </div>
  );
}

function EmptyState({ text = "Sin datos para mostrar." }: { text?: string }) {
  return (
    <div className="flex h-full min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm font-medium text-slate-500">
      {text}
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
  const [modoPeriodo, setModoPeriodo] = useState<ModoPeriodo>("ytd_cerrado");
  const [centroCostos, setCentroCostos] = useState<string>("");
  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [initReady, setInitReady] = useState(false);
  const [indicadorSeleccionado, setIndicadorSeleccionado] =
    useState<IndicadorVista>("eficiencia_operativa");
  const [selectedKpi, setSelectedKpi] = useState<KpiCardItem | null>(null);

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
        modo_periodo: modoPeriodo,
      });

      if (centroCostos) qs.set("centro_costos", centroCostos);

      const json: DashboardResponse = await authFetch(
        `/dashboard/resumen-ejecutivo?${qs.toString()}`,
      );

      setData(json);

      // En modo "Corte cerrado" sí sincronizamos los inputs con el corte confiable
      // que devuelve el backend.
      //
      // En modo "Al día" NO sincronizamos automáticamente la fecha hasta,
      // porque si el usuario pidió 08/06 y el backend ajustó a 31/05 por falta de auxiliar,
      // cambiar el input dispara una segunda consulta y se pierde la cápsula informativa.
      if (modoPeriodo !== "manual") {
        if (json?.periodo?.desde && json.periodo.desde !== fechaDesde) {
          setFechaDesde(json.periodo.desde);
        }

        if (json?.periodo?.hasta && json.periodo.hasta !== fechaHasta) {
          setFechaHasta(json.periodo.hasta);
        }
      }
    } catch (err: any) {
      setError(err?.message || "Error cargando dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function cargarCentros() {
    try {
      const data = await authFetch(`/catalogos/centros-costo-consolidado`);
      setCentros(Array.isArray(data) ? data : []);
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
  }, [initReady, fechaDesde, fechaHasta, centroCostos, modoPeriodo]);

  const hayAuxiliar = data?.metadata?.hay_datos_auxiliar_actual ?? true;

  const mensajeContextoDashboard = useMemo(() => {
    if (!data?.metadata || !hayAuxiliar) return null;

    if (data.metadata.mensaje_contexto) {
      return data.metadata.mensaje_contexto;
    }

    if (modoPeriodo === "manual") {
      const ultima = data.periodo?.ultima_fecha_auxiliar || data.metadata.ultima_fecha_auxiliar;
      const hastaUsado = data.periodo?.hasta;

      if (ultima) {
        return `Vista al día: el análisis usa la información disponible en auxiliares hasta ${ultima}.`;
      }

      if (hastaUsado) {
        return `Vista al día: el análisis usa información parcial hasta ${hastaUsado}.`;
      }

      return "Vista al día: el análisis puede incluir información parcial del mes en curso.";
    }

    if (data.periodo?.ajuste_por_corte) {
      const corte = data.periodo?.fecha_corte_confiable || data.metadata.fecha_corte_confiable;

      if (corte) {
        return `Vista de corte cerrado: el rango solicitado se ajustó automáticamente hasta el último corte mensual confiable: ${corte}.`;
      }

      return "Vista de corte cerrado: el análisis se ajustó al último corte mensual confiable.";
    }

    return null;
  }, [data, hayAuxiliar, modoPeriodo]);

  const kpiCards = useMemo<KpiCardItem[]>(() => {
    if (!data?.kpis) return [];

    const ef = data.kpis.eficiencia_operativa;
    const ebitda = data.kpis.ebitda;
    const ventas = data.kpis.ventas_netas;
    const caja = data.kpis.caja_disponible;
    const runway = data.kpis.cash_runway;
    const gastoPromedioRunway = getGastoPromedioRunway(runway, caja.actual);
    const mesesPromedioRunway = Number(runway?.meses_promedio || 3);

    return [
      {
        label: "Eficiencia operativa",
        value: hayAuxiliar ? formatPercent(ef.actual) : "Sin datos",
        valueFull: hayAuxiliar ? formatPercent(ef.actual) : "Sin datos",
        description: hayAuxiliar
          ? `De cada $100 vendidos, quedan ${ef.actual < 0 ? "-$" : "$"}${Math.abs(ef.actual).toFixed(1)} como EBITDA.`
          : "No hay auxiliar contable cargado para el período seleccionado.",
        delta: hayAuxiliar
          ? `${diffLabel(ef.diff, " pts")} vs anterior`
          : `Último auxiliar: ${data?.metadata?.ultima_fecha_auxiliar || "N/D"}`,
        accent: "from-indigo-100 via-violet-50 to-white",
        chip: "bg-indigo-50 text-indigo-700 border-indigo-200",
        bar: "bg-indigo-500",
        glow: "bg-indigo-300/60",
        icon: <Target size={16} />,
        helpText:
          "Mide qué porcentaje de las ventas se convierte en EBITDA. Ayuda a saber si el negocio está transformando las ventas en resultado operativo.",
        helpAlign: "right" as const,
      },
      {
        label: "EBITDA",
        value: hayAuxiliar ? formatCurrencyShort(ebitda.actual) : "Sin datos",
        valueFull: hayAuxiliar ? formatCurrency(ebitda.actual) : "Sin datos",
        description: hayAuxiliar
          ? "Resultado operativo antes de impuestos, intereses, depreciaciones y amortizaciones."
          : "El auxiliar contable no tiene datos para este período.",
        delta: hayAuxiliar ? `${diffLabel(ebitda.pct, "%")} vs anterior` : "Pendiente",
        accent: "from-emerald-100 via-green-50 to-white",
        chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
        bar: "bg-emerald-500",
        glow: "bg-emerald-300/60",
        icon: <TrendingUp size={16} />,
        helpText:
          "Representa la utilidad operativa del negocio antes de considerar intereses, impuestos, depreciaciones y amortizaciones.",
        helpAlign: "center" as const,
      },
      {
        label: "Ventas netas",
        value: hayAuxiliar ? formatCurrencyShort(ventas.actual) : "Sin datos",
        valueFull: hayAuxiliar ? formatCurrency(ventas.actual) : "Sin datos",
        description: hayAuxiliar
          ? "Ingresos operacionales netos del período analizado."
          : "No hay ventas contables disponibles en el auxiliar del período.",
        delta: hayAuxiliar ? `${diffLabel(ventas.pct, "%")} vs anterior` : "Pendiente",
        accent: "from-sky-100 via-blue-50 to-white",
        chip: "bg-sky-50 text-sky-700 border-sky-200",
        bar: "bg-sky-500",
        glow: "bg-sky-300/60",
        icon: <Banknote size={16} />,
        helpText:
          "Corresponde a los ingresos operacionales del período. Sirve para monitorear el tamaño real de la operación y su evolución mensual.",
        helpAlign: "center" as const,
      },
      {
        label: "Caja disponible",
        value: formatCurrencyShort(caja.actual),
        valueFull: formatCurrency(caja.actual),
        description:
          "Saldo estimado de caja y bancos al cierre del período seleccionado.",
        delta: "Base de liquidez",
        accent: "from-amber-100 via-yellow-50 to-white",
        chip: "bg-amber-50 text-amber-700 border-amber-200",
        bar: "bg-amber-500",
        glow: "bg-amber-300/60",
        icon: <Wallet size={16} />,
        helpText:
          "Muestra la caja y bancos estimados disponibles. Sirve como base para evaluar liquidez inmediata y calcular cuántos meses puede operar la empresa.",
        helpAlign: "center" as const,
      },
      {
        label: "Autonomía de caja",
        value: formatMonths(runway.actual),
        valueFull: formatMonths(runway.actual),
        description:
          "Meses estimados de operación con la caja actual según el gasto promedio reciente.",
        delta:
          runway?.requiere_parametrizacion
            ? "Pendiente parametrización"
            : gastoPromedioRunway > 0
              ? `Gasto ${mesesPromedioRunway}M: ${formatCurrencyShort(gastoPromedioRunway)}`
              : "Gasto no disponible",
        accent: "from-rose-100 via-pink-50 to-white",
        chip: "bg-rose-50 text-rose-700 border-rose-200",
        bar: "bg-rose-500",
        glow: "bg-rose-300/60",
        icon: <Activity size={16} />,
        helpText:
          "Indica cuántos meses podría operar la empresa con la caja actual, asumiendo el ritmo reciente de gasto.",
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
            { label: "Período actual", value: hayAuxiliar ? formatPercent(ef.actual) : "Sin datos", accent: "bg-indigo-50 text-indigo-700 border-indigo-100" },
            { label: "Período anterior", value: formatPercent(ef.anterior), accent: "bg-slate-50 text-slate-700 border-slate-200" },
            { label: "Promedio 6 meses", value: formatPercent(ef.promedio_6m), accent: "bg-emerald-50 text-emerald-700 border-emerald-100" },
            { label: "Meta", value: formatPercent(ef.meta), accent: "bg-amber-50 text-amber-700 border-amber-100" },
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
            { label: "Período actual", value: hayAuxiliar ? formatCurrency(ebitda.actual) : "Sin datos", accent: "bg-emerald-50 text-emerald-700 border-emerald-100" },
            { label: "Período anterior", value: formatCurrency(ebitda.anterior), accent: "bg-slate-50 text-slate-700 border-slate-200" },
            { label: "Variación absoluta", value: formatCurrency(ebitda.diff), accent: "bg-sky-50 text-sky-700 border-sky-100" },
            { label: "Variación %", value: formatPercent(ebitda.pct), accent: "bg-indigo-50 text-indigo-700 border-indigo-100" },
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
            { label: "Período actual", value: hayAuxiliar ? formatCurrency(ventas.actual) : "Sin datos", accent: "bg-sky-50 text-sky-700 border-sky-100" },
            { label: "Período anterior", value: formatCurrency(ventas.anterior), accent: "bg-slate-50 text-slate-700 border-slate-200" },
            { label: "Variación absoluta", value: formatCurrency(ventas.diff), accent: "bg-emerald-50 text-emerald-700 border-emerald-100" },
            { label: "Variación %", value: formatPercent(ventas.pct), accent: "bg-indigo-50 text-indigo-700 border-indigo-100" },
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
            { label: "Saldo actual", value: formatCurrency(caja.actual), accent: "bg-amber-50 text-amber-700 border-amber-100" },
            { label: "Último corte auxiliar", value: data.metadata?.ultima_fecha_auxiliar || "No disponible", accent: "bg-slate-50 text-slate-700 border-slate-200" },
            { label: "Centro de costos", value: centroCostos ? "Filtrado" : "Todos", accent: "bg-sky-50 text-sky-700 border-sky-100" },
            { label: "Uso principal", value: "Liquidez", accent: "bg-emerald-50 text-emerald-700 border-emerald-100" },
          ],
          emptyChartText:
            "Este indicador aún no trae una serie histórica mensual en la respuesta del backend.",
        };

      case "autonomia_caja":
      default:
        return {
          nombre: "Autonomía de caja",
          subtitulo:
            "Meses que la empresa podría operar con la caja actual, usando como referencia el gasto promedio reciente.",
          lectura: formatMonths(runway.actual),
          interpretacion: `Con la caja actual y el gasto promedio reciente, la empresa tendría aproximadamente ${formatMonths(runway.actual)} de autonomía. El gasto promedio de referencia es ${formatCurrency(getGastoPromedioRunway(runway, caja.actual))}.`,
          tarjetas: [
            { label: "Autonomía estimada", value: formatMonths(runway.actual), accent: "bg-rose-50 text-rose-700 border-rose-100" },
            { label: "Gasto promedio", value: formatCurrency(getGastoPromedioRunway(runway, caja.actual)), accent: "bg-slate-50 text-slate-700 border-slate-200" },
            { label: "Unidad", value: runway.unidad || "Meses", accent: "bg-sky-50 text-sky-700 border-sky-100" },
            { label: "Uso principal", value: "Resiliencia", accent: "bg-emerald-50 text-emerald-700 border-emerald-100" },
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

  const serieMensual = data?.series?.mensual || [];
  const periodoActual = {
    desde: data?.periodo?.desde || fechaDesde,
    hasta: data?.periodo?.hasta || fechaHasta,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="space-y-2.5 p-2 md:p-3">
        {/* ENCABEZADO COMPACTO */}
        <div className="relative overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(79,70,229,0.12),_transparent_30%),radial-gradient(circle_at_left,_rgba(16,185,129,0.14),_transparent_30%),linear-gradient(to_bottom_right,_rgba(255,255,255,1),_rgba(248,250,252,0.98))]" />
          <div className="relative flex flex-col gap-2.5 p-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                <Sparkles size={12} />
                Panel ejecutivo inteligente
              </div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 md:text-[1.55rem]">
                Panel ejecutivo financiero
              </h1>
              <p className="mt-0.5 max-w-4xl text-[12px] font-medium leading-5 text-slate-600">
                Foto rápida del desempeño financiero: indicadores clave, evolución y focos de atención.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 xl:min-w-[360px]">
              <HeaderMiniMetric label="Meses" value={serieMensual.length || 0} />
              <HeaderMiniMetric label="Clientes" value={data?.top_clientes?.length || 0} />
              <HeaderMiniMetric label="Proveedores" value={data?.top_proveedores?.length || 0} />
            </div>
          </div>
        </div>

        {/* FILTROS COMPACTOS */}
        <Card className="rounded-[1.35rem] border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="grid gap-2 lg:grid-cols-[1fr_1fr_1fr_1.2fr_auto_auto] lg:items-end">
              <FilterField label="Fecha desde">
                <Input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="h-9 rounded-xl border-slate-200 bg-white text-sm"
                />
              </FilterField>

              <FilterField label="Fecha hasta">
                <Input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="h-9 rounded-xl border-slate-200 bg-white text-sm"
                />
              </FilterField>

              <FilterField label="Modo de análisis">
                <select
                  value={modoPeriodo}
                  onChange={(e) => setModoPeriodo(e.target.value as ModoPeriodo)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="ytd_cerrado">Corte cerrado</option>
                  <option value="manual">Al día</option>
                </select>
              </FilterField>

              <FilterField label="Centro de costos">
                <select
                  value={centroCostos}
                  onChange={(e) => setCentroCostos(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                >
                  <option value="">Todos</option>
                  {centros.map((cc) => (
                    <option key={cc.id} value={String(cc.id)}>
                      {cc.nombre}
                    </option>
                  ))}
                </select>
              </FilterField>

              <button
                onClick={() => {
                  const d = getDefaultDates();
                  setFechaDesde(d.desde);
                  setFechaHasta(d.hasta);
                  setCentroCostos("");
                  setModoPeriodo("ytd_cerrado");
                }}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                Limpiar
              </button>

              <button
                onClick={cargarDashboard}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-black text-white shadow-lg transition hover:bg-black active:scale-[0.98]"
              >
                {loading ? <RefreshCcw size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {loading ? "Actualizando..." : "Actualizar"}
              </button>
            </div>
          </CardContent>
        </Card>



        {error && (
          <Card className="rounded-[1.35rem] border border-rose-200 bg-rose-50 shadow-sm">
            <CardContent className="p-3 text-sm font-medium text-rose-700">
              {error}
            </CardContent>
          </Card>
        )}

        {mensajeContextoDashboard ? (
          <div
            className={cx(
              "rounded-2xl border px-3 py-2 text-xs font-semibold leading-5",
              modoPeriodo === "manual" || data?.metadata?.tipo_corte === "al_dia"
                ? "border-blue-100 bg-blue-50 text-blue-800"
                : "border-emerald-100 bg-emerald-50 text-emerald-800",
            )}
          >
            {mensajeContextoDashboard}
          </div>
        ) : null}

        {data?.metadata && !data.metadata.hay_datos_auxiliar_actual && (
          <Card className="rounded-[1.35rem] border border-amber-200 bg-amber-50 shadow-sm">
            <CardContent className="p-3">
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

        {/* KPIs EN UNA FILA PARA 1366PX */}
        {!!kpiCards.length && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {kpiCards.map((item, i) => (
              <KpiCard key={i} item={item} onOpen={setSelectedKpi} />
            ))}
          </div>
        )}

        {/* BLOQUE INDICADOR CON SELECTOR */}
        {detalleIndicador && (
          <Card className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-900 px-3 py-2.5 text-white">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-[12px] font-black uppercase tracking-[0.16em]">
                    Indicador bajo análisis
                  </h2>
                  <p className="mt-0.5 max-w-4xl text-[12px] leading-5 text-slate-300">
                    {detalleIndicador.subtitulo}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden text-[10px] font-black uppercase tracking-[0.14em] text-slate-300 sm:block">
                    Indicador
                  </span>
                  <select
                    value={indicadorSeleccionado}
                    onChange={(e) => setIndicadorSeleccionado(e.target.value as IndicadorVista)}
                    className="h-9 min-w-[220px] rounded-xl border border-white/10 bg-white px-3 text-sm font-bold text-slate-800 outline-none"
                  >
                    {opcionesIndicador.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <CardContent className="p-3">
              <div className="grid gap-3 xl:grid-cols-[0.92fr_1.35fr]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Lectura ejecutiva
                  </div>
                  <div className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                    {detalleIndicador.lectura}
                  </div>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-700">
                    {detalleIndicador.interpretacion}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {detalleIndicador.tarjetas.map((card, idx) => (
                      <div
                        key={idx}
                        className={cx("rounded-2xl border px-3 py-2", card.accent)}
                      >
                        <div className="text-[10px] font-black uppercase tracking-wide opacity-70">
                          {card.label}
                        </div>
                        <div className="mt-1 truncate text-sm font-black">{card.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  {detalleIndicador.chartKey ? (
                    <div className="h-[218px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={serieMensual} margin={{ top: 12, right: 12, left: 0, bottom: 2 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 10, fontWeight: 700, fill: "#475569" }}
                          />
                          <YAxis
                            tickFormatter={(value) =>
                              detalleIndicador.chartTipo === "porcentaje"
                                ? `${Number(value).toFixed(0)}%`
                                : abreviar(Number(value))
                            }
                            tick={{ fontSize: 10, fontWeight: 700, fill: "#475569" }}
                          />
                          <Tooltip
                            formatter={(value: any) =>
                              detalleIndicador.chartTipo === "porcentaje"
                                ? [`${Number(value).toFixed(1)}%`, detalleIndicador.chartName || "Indicador"]
                                : [formatCurrency(Number(value)), detalleIndicador.chartName || "Indicador"]
                            }
                          />
                          <Line
                            type="monotone"
                            dataKey={detalleIndicador.chartKey}
                            name={detalleIndicador.chartName}
                            stroke={detalleIndicador.chartColor || "#0f172a"}
                            strokeWidth={4}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex h-[218px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm font-medium leading-6 text-slate-500">
                      {detalleIndicador.emptyChartText}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CAPA 2 - EXPLICACIÓN */}
        <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[1.45fr_0.95fr]">
          <Card className="rounded-[1.35rem] border-slate-200 shadow-sm">
            <CardContent className="p-3">
              <SectionTitle
                badge="Análisis"
                title="Qué cambió y por qué"
                subtitle="Evolución de ventas, EBITDA y eficiencia operativa en los últimos meses."
              />

              <div className="h-[218px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={serieMensual} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fontWeight: 700, fill: "#475569" }}
                    />
                    <YAxis
                      yAxisId="money"
                      tickFormatter={(v) => abreviar(Number(v))}
                      tick={{ fontSize: 10, fontWeight: 700, fill: "#475569" }}
                    />
                    <YAxis
                      yAxisId="pct"
                      orientation="right"
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 10, fontWeight: 700, fill: "#475569" }}
                    />
                    <Tooltip
                      formatter={(value: any, name: string) => {
                        if (name === "Eficiencia operativa") {
                          return [`${Number(value).toFixed(1)}%`, "Eficiencia operativa"];
                        }
                        return [formatCurrency(Number(value)), name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 800 }} />
                    <Line
                      yAxisId="money"
                      type="monotone"
                      dataKey="ventas"
                      name="Ventas"
                      stroke="#0f172a"
                      strokeWidth={4}
                      dot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="money"
                      type="monotone"
                      dataKey="ebitda"
                      name="EBITDA"
                      stroke="#10b981"
                      strokeWidth={4}
                      dot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="pct"
                      type="monotone"
                      dataKey="eficiencia_operativa"
                      name="Eficiencia operativa"
                      stroke="#4f46e5"
                      strokeWidth={4}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.35rem] border-slate-200 shadow-sm">
            <CardContent className="p-3">
              <SectionTitle
                badge="Lectura"
                title="Explicaciones del sistema"
                subtitle="Resumen narrativo para conversación ejecutiva."
              />

              <div className="space-y-2">
                {(data?.explicaciones || []).slice(0, 4).map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] font-semibold leading-5 text-slate-700"
                  >
                    {item}
                  </div>
                ))}

                {(data?.explicaciones || []).length === 0 && (
                  <EmptyState text="No hay explicaciones disponibles para este período." />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TOPS */}
        <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-3">
          <TopGastosCard data={data?.top_gastos || []} />
          <TopSimpleCard
            title="Top clientes"
            subtitle="Clientes con mayor participación en ventas."
            icon={<Users size={15} />}
            data={data?.top_clientes || []}
            tone="emerald"
          />
          <TopSimpleCard
            title="Top proveedores"
            subtitle="Proveedores con mayor participación en compras/gastos."
            icon={<Building2 size={15} />}
            data={data?.top_proveedores || []}
            tone="rose"
          />
        </div>

        {/* CAPA 3 - ACCIÓN */}
        <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
          <Card className="rounded-[1.35rem] border-slate-200 shadow-sm">
            <CardContent className="p-3">
              <SectionTitle
                badge="Capa 3"
                title="Qué revisar o decidir"
                subtitle="Acciones sugeridas por el sistema con base en los indicadores."
              />

              <div className="space-y-2">
                {(data?.acciones || []).slice(0, 5).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                  >
                    <div className="mt-0.5 rounded-2xl bg-indigo-50 p-2 text-indigo-700">
                      <Lightbulb size={15} />
                    </div>
                    <div className="text-[12px] font-semibold leading-5 text-slate-700">
                      {item}
                    </div>
                  </div>
                ))}

                {(data?.acciones || []).length === 0 && (
                  <EmptyState text="No hay acciones sugeridas para este período." />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.35rem] border-slate-200 shadow-sm">
            <CardContent className="p-3">
              <SectionTitle
                badge="Alertas"
                title="Alertas y foco inmediato"
                subtitle="Lecturas ejecutivas de riesgo y prioridad."
              />

              <div className="space-y-2">
                {(data?.alertas || []).slice(0, 5).map((item, idx) => (
                  <div
                    key={idx}
                    className={cx(
                      "rounded-2xl border px-3 py-2.5",
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
                        <TriangleAlert size={15} />
                      </div>

                      <div>
                        <div className="text-sm font-black text-slate-900">
                          {item.titulo}
                        </div>
                        <div className="mt-0.5 text-[12px] font-semibold leading-5 text-slate-700">
                          {item.descripcion}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {(data?.alertas || []).length === 0 && (
                  <EmptyState text="No hay alertas para este período." />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <KpiDetailModal
        item={selectedKpi}
        periodo={periodoActual}
        centroCostos={centroCostos}
        onClose={() => setSelectedKpi(null)}
      />
    </div>
  );
}

function HeaderMiniMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/85 px-3 py-2 shadow-sm backdrop-blur">
      <div className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-base font-black text-slate-900">{value}</div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function TopGastosCard({ data }: { data: TopGasto[] }) {
  const rows = (data || []).slice(0, 8);

  return (
    <Card className="rounded-[1.35rem] border-slate-200 shadow-sm">
      <CardContent className="p-3">
        <SectionTitle
          badge="Ranking"
          title="Top gastos"
          subtitle="Cuentas con mayor peso en el período."
        />

        <div className="h-[230px]">
          {rows.length === 0 ? (
            <EmptyState text="Sin gastos para mostrar." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                layout="vertical"
                margin={{ top: 4, right: 22, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => abreviar(Number(v))}
                  tick={{ fontSize: 10, fill: "#64748b", fontWeight: 700 }}
                />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  width={145}
                  tickFormatter={(v) => shortenName(String(v), 21)}
                  tick={{ fontSize: 10, fill: "#334155", fontWeight: 700 }}
                />
                <Tooltip
                  formatter={(v: any) => formatCurrency(Number(v))}
                  labelFormatter={(label) => String(label)}
                />
                <Bar dataKey="valor" name="Valor" fill="#f97316" radius={[0, 8, 8, 0]}>
                  <LabelList
                    dataKey="valor"
                    position="right"
                    formatter={(v: any) => abreviar(Number(v))}
                    style={{ fontSize: 10, fill: "#9a3412", fontWeight: 800 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TopSimpleCard({
  title,
  subtitle,
  icon,
  data,
  tone,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  data: TopItem[];
  tone: "emerald" | "rose";
}) {
  const rows = (data || []).slice(0, 7);
  const toneClasses =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-rose-50 text-rose-700";

  return (
    <Card className="rounded-[1.35rem] border-slate-200 shadow-sm">
      <CardContent className="p-3">
        <SectionTitle badge="Ranking" title={title} subtitle={subtitle} />

        <div className="space-y-2">
          {rows.length === 0 && <EmptyState text="Sin datos para mostrar." />}

          {rows.map((item, idx) => (
            <div
              key={`${item.nombre}-${idx}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
              title={`${item.nombre}: ${formatCurrency(item.total)}`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className={cx("shrink-0 rounded-2xl p-2", toneClasses)}>{icon}</div>
                <div className="min-w-0">
                  <div className="line-clamp-1 text-[12px] font-black text-slate-800">
                    {item.nombre}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">
                    #{idx + 1}
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right text-[12px] font-black text-slate-900 tabular-nums">
                {formatCurrency(item.total)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
