"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RefreshCcw,
  GitCompareArrows,
  Brain,
  Search,
  Lightbulb,
  TrendingUp,
  Activity,
  DollarSign,
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Sparkles,
  TriangleAlert,
  Target,
  HelpCircle,
} from "lucide-react";

// =========================================================
// TIPOS
// =========================================================
type EvolucionItem = {
  label: string;
  ingresos?: number;
  ingresos_operacionales?: number;
  ingresos_no_operacionales?: number;
  ingresos_totales?: number;
  costos_venta?: number;
  gastos_operacionales?: number;
  gastos_no_operacionales?: number;
  costos_gastos?: number;
  utilidad_bruta?: number;
  utilidad_operativa?: number;
  utilidad_antes_impuestos?: number;
  ebitda?: number;
  utilidad_neta?: number;
  margen_bruto?: number;
  margen_operativo?: number;
  margen_ebitda?: number;
  margen_neto?: number;
};

type CuentaItem = {
  cuenta: string;
  cuenta_padre?: string;
  nombre: string;
  seccion?: string;
  clase?: string;
  naturaleza?: string;
  valores_mes: Record<string, number>;
  total: number;
};

type CompareMode = "mensual" | "rangos";

type AggregatedKpis = {
  ingresos_operacionales: number;
  ingresos_no_operacionales: number;
  ingresos_totales: number;
  costos_venta: number;
  gastos_operacionales: number;
  gastos_no_operacionales: number;
  utilidad_bruta: number;
  utilidad_operativa: number;
  utilidad_antes_impuestos: number;
  ebitda: number;
  utilidad_neta: number;
  margen_bruto: number;
  margen_operativo: number;
  margen_ebitda: number;
  margen_neto: number;
};

type DriverRow = {
  cuenta: string;
  nombre: string;
  seccion: string;
  base: number;
  comparacion: number;
  variacion: number;
  impacto: number;
  favorable: boolean;
};

type KpiRow = {
  key: string;
  label: string;
  base: number;
  comparacion: number;
  variacion: number;
  variacionPct: number | null;
  tipo: "currency" | "percent";
};

type WaterfallPoint = {
  id: string;
  label: string;
  shortLabel: string;
  start: number;
  end: number;
  delta: number;
  kind: "total" | "delta" | "other";
  favorable?: boolean;
};

// =========================================================
// HELPERS
// =========================================================
const formatCurrency = (val: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(val || 0);

const formatPercent = (val?: number) => `${(val ?? 0).toFixed(2)}%`;

const formatSignedCurrency = (val: number) => {
  const abs = Math.abs(val || 0);
  const formatted = formatCurrency(abs);
  return val < 0 ? `-${formatted}` : formatted;
};

const formatSignedPercent = (val: number | null) => {
  if (val === null || Number.isNaN(val)) return "N/A";
  return `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
};

const formatDeltaNumber = (val: number, tipo: "currency" | "percent") => {
  if (tipo === "percent") {
    return `${val >= 0 ? "+" : ""}${val.toFixed(2)} pp`;
  }
  return `${val >= 0 ? "+" : "-"}${formatCurrency(Math.abs(val))}`;
};

function porcentajeCambio(actual: number, anterior: number) {
  if (!anterior) return null;
  return ((actual - anterior) / Math.abs(anterior)) * 100;
}

function slicePeriodos(periodos: string[], from: string, to: string) {
  const idxFrom = periodos.indexOf(from);
  const idxTo = periodos.indexOf(to);

  if (idxFrom === -1 || idxTo === -1) return [];
  const start = Math.min(idxFrom, idxTo);
  const end = Math.max(idxFrom, idxTo);

  return periodos.slice(start, end + 1);
}

function seccionTipo(seccion?: string) {
  switch (seccion) {
    case "INGRESOS_OPERACIONALES":
    case "INGRESOS_NO_OPERACIONALES":
      return "ingreso";
    case "COSTOS_VENTA":
      return "costo";
    case "GASTOS_OPERACIONALES":
    case "GASTOS_NO_OPERACIONALES":
      return "gasto";
    default:
      return "otro";
  }
}

function esFavorable(seccion: string, variacion: number) {
  const tipo = seccionTipo(seccion);
  if (tipo === "ingreso") return variacion > 0;
  if (tipo === "costo" || tipo === "gasto") return variacion < 0;
  return variacion > 0;
}

function safeSum(values: number[]) {
  return values.reduce((acc, v) => acc + (v || 0), 0);
}

function aggregateEvolution(items: EvolucionItem[]): AggregatedKpis {
  const ingresos_operacionales = safeSum(items.map((x) => x.ingresos_operacionales ?? 0));
  const ingresos_no_operacionales = safeSum(items.map((x) => x.ingresos_no_operacionales ?? 0));
  const costos_venta = safeSum(items.map((x) => x.costos_venta ?? 0));
  const gastos_operacionales = safeSum(items.map((x) => x.gastos_operacionales ?? 0));
  const gastos_no_operacionales = safeSum(items.map((x) => x.gastos_no_operacionales ?? 0));
  const ebitda = safeSum(items.map((x) => x.ebitda ?? 0));

  const ingresos_totales = ingresos_operacionales + ingresos_no_operacionales;
  const utilidad_bruta = ingresos_operacionales - costos_venta;
  const utilidad_operativa = utilidad_bruta - gastos_operacionales;
  const utilidad_antes_impuestos =
    utilidad_operativa + ingresos_no_operacionales - gastos_no_operacionales;
  const utilidad_neta = utilidad_antes_impuestos;

  const baseMargen = ingresos_totales || 0;

  return {
    ingresos_operacionales,
    ingresos_no_operacionales,
    ingresos_totales,
    costos_venta,
    gastos_operacionales,
    gastos_no_operacionales,
    utilidad_bruta,
    utilidad_operativa,
    utilidad_antes_impuestos,
    ebitda,
    utilidad_neta,
    margen_bruto: baseMargen ? (utilidad_bruta / baseMargen) * 100 : 0,
    margen_operativo: baseMargen ? (utilidad_operativa / baseMargen) * 100 : 0,
    margen_ebitda: baseMargen ? (ebitda / baseMargen) * 100 : 0,
    margen_neto: baseMargen ? (utilidad_neta / baseMargen) * 100 : 0,
  };
}

function buildKpiRows(base: AggregatedKpis, comparacion: AggregatedKpis): KpiRow[] {
  const rows: Array<{ key: keyof AggregatedKpis; label: string; tipo: "currency" | "percent" }> = [
    { key: "ingresos_totales", label: "Ingresos Totales", tipo: "currency" },
    { key: "utilidad_bruta", label: "Utilidad Bruta", tipo: "currency" },
    { key: "utilidad_operativa", label: "Utilidad Operativa", tipo: "currency" },
    { key: "ebitda", label: "EBITDA", tipo: "currency" },
    { key: "utilidad_neta", label: "Utilidad Neta", tipo: "currency" },
    { key: "margen_bruto", label: "Margen Bruto", tipo: "percent" },
    { key: "margen_operativo", label: "Margen Operativo", tipo: "percent" },
    { key: "margen_ebitda", label: "Margen EBITDA", tipo: "percent" },
    { key: "margen_neto", label: "Margen Neto", tipo: "percent" },
  ];

  return rows.map((row) => {
    const baseValue = base[row.key] as number;
    const compValue = comparacion[row.key] as number;
    return {
      key: row.key,
      label: row.label,
      base: baseValue,
      comparacion: compValue,
      variacion: compValue - baseValue,
      variacionPct: porcentajeCambio(compValue, baseValue),
      tipo: row.tipo,
    };
  });
}

function getDeltaClass(val: number) {
  if (val > 0) return "text-emerald-600";
  if (val < 0) return "text-rose-600";
  return "text-slate-500";
}

function formatPeriodoLabel(periodo: string) {
  const [year, month] = periodo.split("-");
  const meses = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];
  const idx = Number(month) - 1;
  return `${meses[idx] || month} ${year}`;
}

function formatPeriodoRangeLabel(labels: string[]) {
  if (!labels.length) return "Sin selección";
  if (labels.length === 1) return formatPeriodoLabel(labels[0]);

  const first = labels[0];
  const last = labels[labels.length - 1];

  const [y1, m1] = first.split("-");
  const [y2, m2] = last.split("-");

  const meses = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];

  if (y1 === y2) {
    return `${meses[Number(m1) - 1]}-${meses[Number(m2) - 1]} ${y1}`;
  }

  return `${meses[Number(m1) - 1]} ${y1} a ${meses[Number(m2) - 1]} ${y2}`;
}

function formatPeriodoNarrativo(labels: string[], modo: CompareMode) {
  if (!labels.length) return "período sin selección";
  if (modo === "mensual") return formatPeriodoLabel(labels[0]);
  return `el acumulado de ${formatPeriodoRangeLabel(labels)}`;
}

function getImpactLabel(favorable: boolean) {
  return favorable ? "Mejora resultado" : "Presiona resultado";
}

function getImpactClasses(favorable: boolean) {
  return favorable
    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
    : "bg-rose-50 text-rose-700 border border-rose-100";
}

function shortDriverLabel(row: DriverRow) {
  const cleanName = row.nombre.length > 18 ? `${row.nombre.slice(0, 18)}…` : row.nombre;
  return `${row.cuenta}`;
}

function abreviarMonto(valor: number) {
  const abs = Math.abs(valor || 0);
  if (abs >= 1_000_000_000) return `${valor < 0 ? "-" : ""}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${valor < 0 ? "-" : ""}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${valor < 0 ? "-" : ""}$${(abs / 1_000).toFixed(0)}K`;
  return formatSignedCurrency(valor);
}

const KPI_INFO: Record<string, string> = {
  ingresos_totales:
    "Representa el total de ingresos del período o rango comparado, incluyendo componentes operacionales y no operacionales.",
  utilidad_bruta:
    "Es el resultado luego de restar a los ingresos operacionales los costos de venta. Mide la rentabilidad directa del negocio.",
  utilidad_operativa:
    "Es la utilidad después de restar los gastos operacionales a la utilidad bruta. Refleja el desempeño del negocio en su operación normal.",
  ebitda:
    "Corresponde a la utilidad antes de intereses, impuestos, depreciaciones y amortizaciones. Sirve para medir la capacidad operativa del negocio.",
  utilidad_neta:
    "Es el resultado final después de considerar costos, gastos y componentes no operacionales del período.",
  margen_bruto:
    "Indica qué porcentaje de los ingresos totales se convierte en utilidad bruta.",
  margen_operativo:
    "Indica qué porcentaje de los ingresos totales se convierte en utilidad operativa.",
  margen_ebitda:
    "Indica qué porcentaje de los ingresos totales se convierte en EBITDA.",
  margen_neto:
    "Indica qué porcentaje de los ingresos totales se convierte en utilidad neta.",
};

const BLOCK_INFO = {
  explicacion:
    "Resume qué cambió entre el período base y el período comparado en ingresos, utilidades y magnitudes principales.",
  diagnostico:
    "Interpreta por qué cambió el resultado, señalando presión en costos, gastos o partidas no operacionales.",
  recomendacion:
    "Propone focos de revisión o decisión gerencial con base en los cambios detectados.",
  mayorMejora:
    "Muestra la cuenta con mayor impacto positivo sobre el resultado frente al período base.",
  mayorPresion:
    "Muestra la cuenta con mayor impacto negativo o mayor presión sobre el resultado frente al período base.",
  puntoCritico:
    "Resume el aspecto más sensible o prioritario a revisar en la comparación actual.",
  variacionKpis:
    "Presenta la comparación cuantitativa de los KPIs principales entre la base y el período comparado.",
  drivers:
    "Lista las cuentas contables con mayor impacto absoluto en la variación del resultado.",
  waterfall:
    "Este puente visual parte de la utilidad base, muestra los principales factores que suman o restan al resultado, y termina en la utilidad comparada.",
};

// =========================================================
// PAGE
// =========================================================
export default function AnalisisVariacionInteligentePage() {
  useAuthGuard();

  const [evolucion, setEvolucion] = useState<EvolucionItem[]>([]);
  const [composicion, setComposicion] = useState<CuentaItem[]>([]);
  const [fechaDesde, setFechaDesde] = useState("2026-01-01");
  const [fechaHasta, setFechaHasta] = useState("2026-12-31");
  const [loading, setLoading] = useState(false);

  const [modoComparacion, setModoComparacion] = useState<CompareMode>("mensual");

  const [periodoBase, setPeriodoBase] = useState("");
  const [periodoComparacion, setPeriodoComparacion] = useState("");

  const [rangoBaseDesde, setRangoBaseDesde] = useState("");
  const [rangoBaseHasta, setRangoBaseHasta] = useState("");
  const [rangoCompDesde, setRangoCompDesde] = useState("");
  const [rangoCompHasta, setRangoCompHasta] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await authFetch(
        `/reportes/analisis_variacion_v1?desde=${fechaDesde}&hasta=${fechaHasta}`
      );
      const evo: EvolucionItem[] = res.evolucion ?? [];
      const comp: CuentaItem[] = res.composicion ?? [];

      setEvolucion(evo);
      setComposicion(comp);

      const labels = evo.map((x) => x.label);
      if (labels.length === 1) {
        setPeriodoBase(labels[0]);
        setPeriodoComparacion(labels[0]);
        setRangoBaseDesde(labels[0]);
        setRangoBaseHasta(labels[0]);
        setRangoCompDesde(labels[0]);
        setRangoCompHasta(labels[0]);
      } else if (labels.length >= 2) {
        const last = labels[labels.length - 1];
        const prev = labels[labels.length - 2];

        setPeriodoBase(prev);
        setPeriodoComparacion(last);

        setRangoBaseDesde(prev);
        setRangoBaseHasta(prev);
        setRangoCompDesde(last);
        setRangoCompHasta(last);
      }
    } catch (error) {
      console.error(error);
      alert("No fue posible cargar el análisis de variación.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const periodos = useMemo(() => evolucion.map((x) => x.label), [evolucion]);

  const labelsBase = useMemo(() => {
    if (!periodos.length) return [];
    if (modoComparacion === "mensual") {
      return periodoBase ? [periodoBase] : [];
    }
    return slicePeriodos(periodos, rangoBaseDesde, rangoBaseHasta);
  }, [modoComparacion, periodos, periodoBase, rangoBaseDesde, rangoBaseHasta]);

  const labelsComparacion = useMemo(() => {
    if (!periodos.length) return [];
    if (modoComparacion === "mensual") {
      return periodoComparacion ? [periodoComparacion] : [];
    }
    return slicePeriodos(periodos, rangoCompDesde, rangoCompHasta);
  }, [modoComparacion, periodos, periodoComparacion, rangoCompDesde, rangoCompHasta]);

  const evolucionBase = useMemo(
    () => evolucion.filter((x) => labelsBase.includes(x.label)),
    [evolucion, labelsBase]
  );

  const evolucionComparacion = useMemo(
    () => evolucion.filter((x) => labelsComparacion.includes(x.label)),
    [evolucion, labelsComparacion]
  );

  const aggBase = useMemo(() => aggregateEvolution(evolucionBase), [evolucionBase]);
  const aggComparacion = useMemo(
    () => aggregateEvolution(evolucionComparacion),
    [evolucionComparacion]
  );

  const kpiRows = useMemo(() => buildKpiRows(aggBase, aggComparacion), [aggBase, aggComparacion]);

  const drivers = useMemo(() => {
    const rows: DriverRow[] = composicion.map((cuenta) => {
      const base = safeSum(labelsBase.map((p) => cuenta.valores_mes[p] || 0));
      const comparacion = safeSum(labelsComparacion.map((p) => cuenta.valores_mes[p] || 0));
      const variacion = comparacion - base;

      return {
        cuenta: cuenta.cuenta,
        nombre: cuenta.nombre,
        seccion: cuenta.seccion || "OTROS",
        base,
        comparacion,
        variacion,
        impacto: Math.abs(variacion),
        favorable: esFavorable(cuenta.seccion || "OTROS", variacion),
      };
    });

    return rows
      .filter((x) => x.base !== 0 || x.comparacion !== 0 || x.variacion !== 0)
      .sort((a, b) => b.impacto - a.impacto);
  }, [composicion, labelsBase, labelsComparacion]);

  const topDrivers = useMemo(() => drivers.slice(0, 12), [drivers]);
  const topFavorables = useMemo(
    () => drivers.filter((x) => x.favorable).slice(0, 5),
    [drivers]
  );
  const topDesfavorables = useMemo(
    () => drivers.filter((x) => !x.favorable).slice(0, 5),
    [drivers]
  );

  const narrativa = useMemo(() => {
    const explicacion: string[] = [];
    const diagnostico: string[] = [];
    const recomendaciones: string[] = [];

    const baseIng = aggBase.ingresos_totales;
    const compIng = aggComparacion.ingresos_totales;

    const baseUb = aggBase.utilidad_bruta;
    const compUb = aggComparacion.utilidad_bruta;

    const baseUo = aggBase.utilidad_operativa;
    const compUo = aggComparacion.utilidad_operativa;

    const baseUn = aggBase.utilidad_neta;
    const compUn = aggComparacion.utilidad_neta;

    const deltaIng = compIng - baseIng;
    const deltaUb = compUb - baseUb;
    const deltaUo = compUo - baseUo;
    const deltaUn = compUn - baseUn;

    const pctIng = porcentajeCambio(compIng, baseIng);
    const pctUb = porcentajeCambio(compUb, baseUb);
    const pctUo = porcentajeCambio(compUo, baseUo);
    const pctUn = porcentajeCambio(compUn, baseUn);

    const nombreBase = formatPeriodoNarrativo(labelsBase, modoComparacion);
    const nombreComp = formatPeriodoNarrativo(labelsComparacion, modoComparacion);

    explicacion.push(
      `Frente a ${nombreBase}, ${nombreComp} registra ingresos por ${formatCurrency(
        compIng
      )} (${pctIng === null ? "sin base comparable" : formatSignedPercent(pctIng)}), con una variación de ${formatSignedCurrency(deltaIng)}.`
    );

    explicacion.push(
      `La utilidad neta se ubica en ${formatCurrency(compUn)} (${pctUn === null ? "sin base comparable" : formatSignedPercent(
        pctUn
      )}), mientras la utilidad operativa alcanza ${formatCurrency(compUo)}.`
    );

    if (deltaIng > 0 && deltaUb < 0) {
      diagnostico.push(
        "Aunque los ingresos crecen, el margen bruto se reduce. Esto indica presión en costos de venta, devoluciones o una mezcla comercial menos rentable."
      );
    }

    if (deltaUb > 0 && deltaUo < 0) {
      diagnostico.push(
        "La utilidad bruta mejora, pero la utilidad operativa pierde fuerza. Esto sugiere que el gasto operacional está absorbiendo parte importante de la mejora comercial."
      );
    }

    if (aggComparacion.gastos_operacionales < 0) {
      diagnostico.push(
        `Se observan gastos operacionales netos negativos (${formatSignedCurrency(
          aggComparacion.gastos_operacionales
        )}). Esto puede corresponder a reclasificaciones, reversión de provisiones o ajustes contables que afectan la lectura operativa.`
      );
    }

    if (aggComparacion.utilidad_operativa > aggComparacion.utilidad_bruta) {
      diagnostico.push(
        "La utilidad operativa está por encima de la utilidad bruta. Esto sugiere una recuperación neta en gastos operacionales o movimientos contables no habituales en la lectura gerencial."
      );
    }

    if (
      Math.abs(
        aggComparacion.ingresos_no_operacionales - aggComparacion.gastos_no_operacionales
      ) > 0
    ) {
      const netoNoOp =
        aggComparacion.ingresos_no_operacionales - aggComparacion.gastos_no_operacionales;

      diagnostico.push(
        `El resultado no operacional impacta el período en ${formatSignedCurrency(
          netoNoOp
        )}, por lo que una parte del resultado final no proviene directamente de la operación principal del negocio.`
      );
    }

    if (!diagnostico.length) {
      diagnostico.push(
        "El comportamiento general del período es consistente y no muestra alertas fuertes en la relación entre ingresos, costos, gastos y utilidad."
      );
    }

    if (pctIng !== null && pctIng <= -15) {
      recomendaciones.push(
        "Prioridad alta: revisar ventas, devoluciones y ritmo comercial, porque la caída de ingresos frente al período base es material."
      );
    }

    if (pctUb !== null && pctUb <= -10) {
      recomendaciones.push(
        "Prioridad alta: revisar costos directos, devoluciones y precios de venta, ya que el margen bruto está deteriorándose."
      );
    }

    if (pctUo !== null && pctUo <= -10) {
      recomendaciones.push(
        "Prioridad media: analizar el crecimiento del gasto operacional y validar que esté alineado con la generación de ingresos."
      );
    }

    if (pctUn !== null && pctUn <= -10) {
      recomendaciones.push(
        "Prioridad alta: la utilidad neta presenta presión relevante. Conviene revisar costos, gastos operativos y componentes no operacionales."
      );
    }

    if (aggComparacion.gastos_operacionales < 0) {
      recomendaciones.push(
        "Validar con contabilidad las cuentas operacionales con saldo acreedor para confirmar si corresponden a reversión legítima, reclasificación o error de registro."
      );
    }

    if (topDesfavorables.length > 0) {
      recomendaciones.push(
        `Priorizar revisión de las cuentas con mayor impacto negativo, empezando por ${topDesfavorables
          .slice(0, 2)
          .map((x) => `${x.cuenta} - ${x.nombre}`)
          .join(" y ")}.`
      );
    }

    if (!recomendaciones.length) {
      recomendaciones.push(
        "Mantener seguimiento sobre margen bruto, gasto operacional y utilidad neta para validar que la mejora observada sea sostenible."
      );
    }

    return { explicacion, diagnostico, recomendaciones };
  }, [
    aggBase,
    aggComparacion,
    labelsBase,
    labelsComparacion,
    modoComparacion,
    topDesfavorables,
  ]);

  const resumenDrivers = useMemo(() => {
    const positivos = topFavorables.slice(0, 3).map((x) => ({
      texto: `${x.cuenta} - ${x.nombre}`,
      valor: x.variacion,
    }));

    const negativos = topDesfavorables.slice(0, 3).map((x) => ({
      texto: `${x.cuenta} - ${x.nombre}`,
      valor: x.variacion,
    }));

    return { positivos, negativos };
  }, [topFavorables, topDesfavorables]);

  const readyToCompare =
    labelsBase.length > 0 &&
    labelsComparacion.length > 0 &&
    !(
      labelsBase.length === 1 &&
      labelsComparacion.length === 1 &&
      labelsBase[0] === labelsComparacion[0]
    );

  const baseLabel = useMemo(() => formatPeriodoRangeLabel(labelsBase), [labelsBase]);

  const comparacionLabel = useMemo(
    () => formatPeriodoRangeLabel(labelsComparacion),
    [labelsComparacion]
  );

  const descripcionComparacion = useMemo(() => {
    if (!readyToCompare) return "";

    if (modoComparacion === "mensual") {
      return `Comparando ${baseLabel} vs ${comparacionLabel}.`;
    }

    return `Comparando acumulados: ${baseLabel} vs ${comparacionLabel}.`;
  }, [readyToCompare, modoComparacion, baseLabel, comparacionLabel]);

  const detalleComparacion = useMemo(() => {
    if (!readyToCompare) return "";

    if (modoComparacion === "mensual") {
      return "Cada lado representa un solo mes.";
    }

    return `El rango base incluye ${labelsBase.length} mes(es) y el comparado ${labelsComparacion.length} mes(es).`;
  }, [readyToCompare, modoComparacion, labelsBase.length, labelsComparacion.length]);

  const mayorMejora = useMemo(() => {
    const mejor = topFavorables[0];
    if (!mejor) return "No hay una mejora dominante identificada en la selección actual.";

    return `${mejor.cuenta} - ${mejor.nombre} mejora el resultado en ${formatSignedCurrency(
      mejor.variacion
    )}, principalmente por una reducción o menor impacto de esta cuenta frente al período base.`;
  }, [topFavorables]);

  const mayorPresion = useMemo(() => {
    const peor = topDesfavorables[0];
    if (!peor) return "No se detecta una presión dominante sobre el resultado en la selección actual.";

    return `${peor.cuenta} - ${peor.nombre} reduce el resultado en ${formatSignedCurrency(
      peor.variacion
    )}, siendo el principal factor de presión frente al período base.`;
  }, [topDesfavorables]);

  const puntoCritico = useMemo(() => {
    if (aggComparacion.gastos_operacionales < 0) {
      return "Los gastos operacionales netos son negativos en el período comparado. Conviene validar reversiones, provisiones o clasificaciones contables antes de sacar conclusiones gerenciales definitivas.";
    }

    const ubRow = kpiRows.find((x) => x.key === "utilidad_bruta");
    if (ubRow && ubRow.variacionPct !== null && ubRow.variacionPct <= -10) {
      return "El principal punto a vigilar es el deterioro del margen bruto. Revisa costos directos, devoluciones y mezcla comercial.";
    }

    const unRow = kpiRows.find((x) => x.key === "utilidad_neta");
    if (unRow && unRow.variacionPct !== null && unRow.variacionPct <= -10) {
      return "La utilidad neta presenta una caída relevante. Conviene revisar costos, gasto operacional y componentes no operacionales.";
    }

    return "El principal punto a vigilar es la sostenibilidad del margen: el crecimiento en ingresos debe traducirse de forma proporcional en rentabilidad.";
  }, [aggComparacion.gastos_operacionales, kpiRows]);

  const waterfallData = useMemo<WaterfallPoint[]>(() => {
    if (!readyToCompare) return [];

    const selectedDrivers = topDrivers.slice(0, 6);

    const points: WaterfallPoint[] = [];
    const baseUtility = aggBase.utilidad_neta;
    const targetUtility = aggComparacion.utilidad_neta;

    points.push({
      id: "base",
      label: `Utilidad base (${baseLabel})`,
      shortLabel: "Base",
      start: 0,
      end: baseUtility,
      delta: baseUtility,
      kind: "total",
    });

    let running = baseUtility;

    selectedDrivers.forEach((driver, idx) => {
      const utilityImpact = driver.favorable ? driver.impacto : -driver.impacto;
      const start = running;
      const end = running + utilityImpact;

      points.push({
        id: `driver-${idx}`,
        label: `${driver.cuenta} - ${driver.nombre}`,
        shortLabel: shortDriverLabel(driver),
        start,
        end,
        delta: utilityImpact,
        kind: "delta",
        favorable: utilityImpact >= 0,
      });

      running = end;
    });

    const otros = targetUtility - running;
    if (Math.abs(otros) > 1) {
      points.push({
        id: "otros",
        label: "Otros impactos",
        shortLabel: "Otros",
        start: running,
        end: running + otros,
        delta: otros,
        kind: "other",
        favorable: otros >= 0,
      });
      running += otros;
    }

    points.push({
      id: "final",
      label: `Utilidad comparada (${comparacionLabel})`,
      shortLabel: "Comparación",
      start: 0,
      end: targetUtility,
      delta: targetUtility,
      kind: "total",
    });

    return points;
  }, [readyToCompare, topDrivers, aggBase.utilidad_neta, aggComparacion.utilidad_neta, baseLabel, comparacionLabel]);

  return (
    <div className="space-y-4 p-5 bg-slate-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Análisis de Variación Inteligente
            <span className="text-[10px] bg-indigo-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">
              Premium
            </span>
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-1">
            Explicación + diagnóstico + recomendación sobre cambios entre períodos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-black transition-all shadow-lg active:scale-95"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Actualizando..." : "Actualizar análisis"}
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-4 rounded-[2rem] border shadow-sm space-y-4">
        <div className="flex flex-wrap gap-4 items-end justify-between">
          <div className="flex gap-4 flex-wrap">
            <div className="flex flex-col min-w-[240px]">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">
                Rango de carga
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full border rounded-xl p-2 text-xs font-bold bg-slate-50"
                />
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full border rounded-xl p-2 text-xs font-bold bg-slate-50"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 rounded-2xl p-1 border">
            <button
              onClick={() => setModoComparacion("mensual")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                modoComparacion === "mensual"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              <GitCompareArrows size={14} />
              Mes vs mes
            </button>
            <button
              onClick={() => setModoComparacion("rangos")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                modoComparacion === "rangos"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              <BarChart3 size={14} />
              Rango vs rango
            </button>
          </div>
        </div>

        {modoComparacion === "mensual" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-2xl p-4 bg-slate-50">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
                Período base
              </label>
              <select
                value={periodoBase}
                onChange={(e) => setPeriodoBase(e.target.value)}
                className="w-full border rounded-xl p-3 text-sm font-bold bg-white"
              >
                <option value="">Selecciona período</option>
                {periodos.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="border rounded-2xl p-4 bg-slate-50">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
                Período comparación
              </label>
              <select
                value={periodoComparacion}
                onChange={(e) => setPeriodoComparacion(e.target.value)}
                className="w-full border rounded-xl p-3 text-sm font-bold bg-white"
              >
                <option value="">Selecciona período</option>
                {periodos.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="border rounded-2xl p-4 bg-slate-50 space-y-3">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                Rango base
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
                    Desde
                  </label>
                  <select
                    value={rangoBaseDesde}
                    onChange={(e) => setRangoBaseDesde(e.target.value)}
                    className="w-full border rounded-xl p-3 text-sm font-bold bg-white"
                  >
                    <option value="">Selecciona período</option>
                    {periodos.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
                    Hasta
                  </label>
                  <select
                    value={rangoBaseHasta}
                    onChange={(e) => setRangoBaseHasta(e.target.value)}
                    className="w-full border rounded-xl p-3 text-sm font-bold bg-white"
                  >
                    <option value="">Selecciona período</option>
                    {periodos.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="border rounded-2xl p-4 bg-slate-50 space-y-3">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                Rango comparación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
                    Desde
                  </label>
                  <select
                    value={rangoCompDesde}
                    onChange={(e) => setRangoCompDesde(e.target.value)}
                    className="w-full border rounded-xl p-3 text-sm font-bold bg-white"
                  >
                    <option value="">Selecciona período</option>
                    {periodos.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
                    Hasta
                  </label>
                  <select
                    value={rangoCompHasta}
                    onChange={(e) => setRangoCompHasta(e.target.value)}
                    className="w-full border rounded-xl p-3 text-sm font-bold bg-white"
                  >
                    <option value="">Selecciona período</option>
                    {periodos.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-xs">
          <BadgeInfo
            label={modoComparacion === "mensual" ? "Base" : "Base acumulada"}
            value={labelsBase.length ? baseLabel : "Sin selección"}
          />
          <BadgeInfo
            label={
              modoComparacion === "mensual" ? "Comparación" : "Comparación acumulada"
            }
            value={labelsComparacion.length ? comparacionLabel : "Sin selección"}
          />
        </div>

        {readyToCompare && (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-black uppercase tracking-widest text-indigo-700">
                  Lectura del comparativo
                </p>
                <InfoHint text="Resume la lógica de comparación activa: si estás comparando un mes contra otro, o un rango acumulado contra otro rango." />
              </div>
              <p className="text-sm font-bold text-slate-800 mt-1">
                {descripcionComparacion}
              </p>
              <p className="text-xs text-slate-600 mt-1">{detalleComparacion}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-indigo-100 text-[11px] font-black text-indigo-700 uppercase tracking-widest">
                {modoComparacion === "mensual"
                  ? "Comparación mensual"
                  : "Comparación acumulada"}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-black text-slate-700 uppercase tracking-widest">
                Base: {baseLabel}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-black text-slate-700 uppercase tracking-widest">
                Comparación: {comparacionLabel}
              </span>
            </div>
          </div>
        )}
      </div>

      {!readyToCompare ? (
        <Card className="rounded-[2rem] border shadow-sm bg-white">
          <CardContent className="p-6">
            <p className="text-sm text-slate-600">
              Selecciona dos períodos distintos para generar el análisis.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <CompareStatCard
              title="Ingresos Totales"
              base={aggBase.ingresos_totales}
              comparacion={aggComparacion.ingresos_totales}
              icon={<TrendingUp size={18} />}
              tipo="currency"
              description={KPI_INFO.ingresos_totales}
            />
            <CompareStatCard
              title="Utilidad Bruta"
              base={aggBase.utilidad_bruta}
              comparacion={aggComparacion.utilidad_bruta}
              icon={<DollarSign size={18} />}
              tipo="currency"
              description={KPI_INFO.utilidad_bruta}
            />
            <CompareStatCard
              title="Utilidad Operativa"
              base={aggBase.utilidad_operativa}
              comparacion={aggComparacion.utilidad_operativa}
              icon={<Landmark size={18} />}
              tipo="currency"
              description={KPI_INFO.utilidad_operativa}
            />
            <CompareStatCard
              title="EBITDA"
              base={aggBase.ebitda}
              comparacion={aggComparacion.ebitda}
              icon={<Activity size={18} />}
              tipo="currency"
              highlight
              description={KPI_INFO.ebitda}
            />
            <CompareStatCard
              title="Utilidad Neta"
              base={aggBase.utilidad_neta}
              comparacion={aggComparacion.utilidad_neta}
              icon={<TrendingUp size={18} />}
              tipo="currency"
              description={KPI_INFO.utilidad_neta}
            />
          </div>

          {/* WATERFALL */}
          <Card className="rounded-[2rem] shadow-xl border-none bg-white p-2">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-black text-slate-500 uppercase tracking-tight flex justify-between items-center gap-3">
                <div className="flex items-center gap-2">
                  <span>🌊 Puente de Variación de Utilidad</span>
                  <InfoHint text={BLOCK_INFO.waterfall} />
                </div>
                <div className="flex gap-4 text-[10px]">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-indigo-600"></div> Totales
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Suma
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-rose-500"></div> Resta
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <WaterfallMiniChart data={waterfallData} />
            </CardContent>
          </Card>

          {/* NARRATIVA */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <InsightBlock
              title="Explicación"
              subtitle="Qué cambió"
              icon={<Brain size={16} />}
              items={narrativa.explicacion}
              tone="slate"
              description={BLOCK_INFO.explicacion}
            />
            <InsightBlock
              title="Diagnóstico"
              subtitle="Por qué cambió"
              icon={<Search size={16} />}
              items={narrativa.diagnostico}
              tone="indigo"
              description={BLOCK_INFO.diagnostico}
            />
            <InsightBlock
              title="Recomendación"
              subtitle="Qué revisar o decidir"
              icon={<Lightbulb size={16} />}
              items={narrativa.recomendaciones}
              tone="amber"
              description={BLOCK_INFO.recomendacion}
            />
          </div>

          {/* MINI FRANJA EJECUTIVA */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <ExecutiveStripCard
              title="Mayor mejora"
              icon={<Sparkles size={16} />}
              tone="emerald"
              text={mayorMejora}
              description={BLOCK_INFO.mayorMejora}
            />
            <ExecutiveStripCard
              title="Mayor presión"
              icon={<TriangleAlert size={16} />}
              tone="rose"
              text={mayorPresion}
              description={BLOCK_INFO.mayorPresion}
            />
            <ExecutiveStripCard
              title="Punto crítico a revisar"
              icon={<Target size={16} />}
              tone="amber"
              text={puntoCritico}
              description={BLOCK_INFO.puntoCritico}
            />
          </div>

          {/* TABLA KPIs */}
          <Card className="rounded-[2rem] shadow-sm border bg-white">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wide flex items-center gap-2">
                Variación de KPIs
                <InfoHint text={BLOCK_INFO.variacionKpis} />
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                    <th className="py-3 px-4 text-left">Indicador</th>
                    <th className="py-3 px-4 text-right">Base</th>
                    <th className="py-3 px-4 text-right">Comparación</th>
                    <th className="py-3 px-4 text-right">Variación $ / pp</th>
                    <th className="py-3 px-4 text-right">Variación %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {kpiRows.map((row) => (
                    <tr key={row.key} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-700">{row.label}</td>
                      <td className="py-3 px-4 text-right text-slate-700 font-semibold">
                        {row.tipo === "currency"
                          ? formatCurrency(row.base)
                          : formatPercent(row.base)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900 font-black">
                        {row.tipo === "currency"
                          ? formatCurrency(row.comparacion)
                          : formatPercent(row.comparacion)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-black ${getDeltaClass(
                          row.variacion
                        )}`}
                      >
                        {formatDeltaNumber(row.variacion, row.tipo)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-black ${
                          row.variacionPct === null
                            ? "text-slate-400"
                            : getDeltaClass(row.variacionPct)
                        }`}
                      >
                        {formatSignedPercent(row.variacionPct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* TOP DRIVERS RESUMEN */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <DriverSummaryCard
              title="Factores que mejoran el resultado"
              tone="emerald"
              rows={resumenDrivers.positivos}
              description="Resume las cuentas con mayor efecto favorable sobre el resultado frente al período base."
            />
            <DriverSummaryCard
              title="Factores que presionan el resultado"
              tone="rose"
              rows={resumenDrivers.negativos}
              description="Resume las cuentas con mayor efecto desfavorable o de presión sobre el resultado frente al período base."
            />
          </div>

          {/* TABLA DRIVERS */}
          <Card className="rounded-[2rem] shadow-sm border bg-white">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wide flex items-center gap-2">
                Top drivers contables de la variación
                <InfoHint text={BLOCK_INFO.drivers} />
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 overflow-x-auto">
              <table className="w-full min-w-[1200px] text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                    <th className="py-3 px-4 text-left">Cuenta</th>
                    <th className="py-3 px-4 text-left">Nombre</th>
                    <th className="py-3 px-4 text-left">Sección</th>
                    <th className="py-3 px-4 text-right">Base</th>
                    <th className="py-3 px-4 text-right">Comparación</th>
                    <th className="py-3 px-4 text-right">Variación</th>
                    <th className="py-3 px-4 text-right">Impacto</th>
                    <th className="py-3 px-4 text-center">Impacto gerencial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topDrivers.map((row) => (
                    <tr key={`${row.cuenta}-${row.seccion}`} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded text-[11px]">
                          {row.cuenta}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-semibold">{row.nombre}</td>
                      <td className="py-3 px-4 text-slate-500 text-xs font-black">
                        {row.seccion.replaceAll("_", " ")}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-700">
                        {formatSignedCurrency(row.base)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {formatSignedCurrency(row.comparacion)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-black ${
                          row.variacion > 0
                            ? "text-emerald-600"
                            : row.variacion < 0
                            ? "text-rose-600"
                            : "text-slate-400"
                        }`}
                      >
                        {formatSignedCurrency(row.variacion)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {formatCurrency(row.impacto)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getImpactClasses(
                            row.favorable
                          )}`}
                        >
                          {getImpactLabel(row.favorable)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// =========================================================
// SUBCOMPONENTES
// =========================================================
const InfoHint = ({
  text,
  dark = false,
  align = "right",
}: {
  text: string;
  dark?: boolean;
  align?: "left" | "right";
}) => (
  <div className="relative group/info inline-flex">
    <button
      type="button"
      className={`inline-flex items-center justify-center w-4 h-4 rounded-full transition-all ${
        dark
          ? "bg-white/20 text-white hover:bg-white/30"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
      }`}
      aria-label="Ver explicación"
    >
      <HelpCircle size={11} />
    </button>

    <div
      className={`pointer-events-none absolute top-6 z-50 w-64 rounded-2xl border px-3 py-3 text-[11px] leading-5 shadow-2xl opacity-0 scale-95 transition-all duration-200 group-hover/info:opacity-100 group-hover/info:scale-100 group-focus-within/info:opacity-100 group-focus-within/info:scale-100 ${
        align === "left" ? "left-0" : "right-0"
      } ${
        dark
          ? "border-slate-700 bg-slate-900 text-slate-100"
          : "border-slate-200 bg-white text-slate-700"
      }`}
    >
      {text}
    </div>
  </div>
);

const BadgeInfo = ({ label, value }: { label: string; value: string }) => (
  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 shadow-sm">
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
      {label}
    </span>
    <span className="text-xs font-bold text-slate-800">{value}</span>
  </div>
);

const CompareStatCard = ({
  title,
  base,
  comparacion,
  icon,
  tipo,
  highlight = false,
  description,
}: {
  title: string;
  base: number;
  comparacion: number;
  icon: React.ReactNode;
  tipo: "currency" | "percent";
  highlight?: boolean;
  description: string;
}) => {
  const delta = comparacion - base;
  const pct = porcentajeCambio(comparacion, base);

  return (
    <Card
      className={`relative overflow-visible border shadow-lg rounded-[2rem] transition-all hover:scale-[1.01] ${
        highlight
          ? "bg-indigo-600 text-white shadow-indigo-200 border-none"
          : "bg-white border-slate-100"
      }`}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div className={`p-2.5 rounded-2xl ${highlight ? "bg-white/20" : "bg-slate-50"}`}>
            {icon}
          </div>

          <div className="flex items-center gap-1.5">
            <div
              className={`text-[9px] font-black px-2 py-1 rounded-lg flex items-center gap-1 ${
                highlight
                  ? "bg-emerald-400 text-emerald-950"
                  : delta > 0
                  ? "bg-emerald-50 text-emerald-700"
                  : delta < 0
                  ? "bg-rose-50 text-rose-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {pct === null ? "N/A" : formatSignedPercent(pct)}
            </div>
            <InfoHint text={description} dark={highlight} />
          </div>
        </div>

        <p
          className={`text-[9px] font-black uppercase tracking-widest ${
            highlight ? "text-indigo-100" : "text-slate-400"
          }`}
        >
          {title}
        </p>

        <div className="space-y-1 mt-2">
          <p className="text-[11px] font-black uppercase tracking-widest opacity-70">
            Base
          </p>
          <p className="text-[1rem] leading-none font-black">
            {tipo === "currency" ? formatCurrency(base) : formatPercent(base)}
          </p>
        </div>

        <div className="space-y-1 mt-3">
          <p className="text-[11px] font-black uppercase tracking-widest opacity-70">
            Comparación
          </p>
          <p className="text-[1.6rem] leading-none font-black tracking-tighter">
            {tipo === "currency" ? formatCurrency(comparacion) : formatPercent(comparacion)}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs font-black">
          {delta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>
            {tipo === "currency"
              ? formatDeltaNumber(delta, tipo)
              : formatDeltaNumber(delta, "percent")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

const InsightBlock = ({
  title,
  subtitle,
  icon,
  items,
  tone,
  description,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  items: string[];
  tone: "slate" | "indigo" | "amber";
  description: string;
}) => {
  const toneMap = {
    slate: {
      border: "border-slate-200",
      title: "text-slate-700",
      subtitle: "text-slate-500",
      bg: "bg-slate-50",
      item: "bg-white text-slate-700 border border-slate-100",
    },
    indigo: {
      border: "border-indigo-200",
      title: "text-indigo-700",
      subtitle: "text-indigo-500",
      bg: "bg-indigo-50",
      item: "bg-white text-slate-700 border border-indigo-100",
    },
    amber: {
      border: "border-amber-200",
      title: "text-amber-700",
      subtitle: "text-amber-500",
      bg: "bg-amber-50",
      item: "bg-white text-slate-700 border border-amber-100",
    },
  }[tone];

  return (
    <Card className={`rounded-[2rem] shadow-sm border ${toneMap.border} ${toneMap.bg}`}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white">{icon}</div>
            <div>
              <h3 className={`text-sm font-black uppercase tracking-wide ${toneMap.title}`}>
                {title}
              </h3>
              <p className={`text-xs font-medium ${toneMap.subtitle}`}>{subtitle}</p>
            </div>
          </div>
          <InfoHint text={description} />
        </div>

        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className={`text-sm rounded-xl px-3 py-3 ${toneMap.item}`}>
              {item}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const DriverSummaryCard = ({
  title,
  tone,
  rows,
  description,
}: {
  title: string;
  tone: "emerald" | "rose";
  rows: { texto: string; valor: number }[];
  description: string;
}) => {
  const styles =
    tone === "emerald"
      ? {
          card: "border-emerald-200 bg-emerald-50",
          title: "text-emerald-700",
          item: "bg-white border border-emerald-100 text-slate-700",
          value: "text-emerald-700",
        }
      : {
          card: "border-rose-200 bg-rose-50",
          title: "text-rose-700",
          item: "bg-white border border-rose-100 text-slate-700",
          value: "text-rose-700",
        };

  return (
    <Card className={`rounded-[2rem] shadow-sm border ${styles.card}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className={`text-sm font-black uppercase tracking-wide ${styles.title}`}>
            {title}
          </h3>
          <InfoHint text={description} />
        </div>

        <div className="space-y-2">
          {rows.length === 0 ? (
            <div className={`rounded-xl px-3 py-3 text-sm ${styles.item}`}>
              No hay cuentas destacadas en este grupo.
            </div>
          ) : (
            rows.map((row, idx) => (
              <div
                key={idx}
                className={`rounded-xl px-3 py-3 flex items-center justify-between gap-3 ${styles.item}`}
              >
                <span className="text-sm">{row.texto}</span>
                <span className={`text-sm font-black ${styles.value}`}>
                  {formatSignedCurrency(row.valor)}
                </span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ExecutiveStripCard = ({
  title,
  icon,
  tone,
  text,
  description,
}: {
  title: string;
  icon: React.ReactNode;
  tone: "emerald" | "rose" | "amber";
  text: string;
  description: string;
}) => {
  const styles =
    tone === "emerald"
      ? {
          card: "border-emerald-200 bg-emerald-50",
          title: "text-emerald-700",
          box: "bg-white border border-emerald-100 text-slate-700",
        }
      : tone === "rose"
      ? {
          card: "border-rose-200 bg-rose-50",
          title: "text-rose-700",
          box: "bg-white border border-rose-100 text-slate-700",
        }
      : {
          card: "border-amber-200 bg-amber-50",
          title: "text-amber-700",
          box: "bg-white border border-amber-100 text-slate-700",
        };

  return (
    <Card className={`rounded-[2rem] shadow-sm border ${styles.card}`}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white">{icon}</div>
            <div>
              <h3 className={`text-sm font-black uppercase tracking-wide ${styles.title}`}>
                {title}
              </h3>
            </div>
          </div>
          <InfoHint text={description} />
        </div>

        <div className={`rounded-xl px-3 py-3 text-sm leading-6 ${styles.box}`}>
          {text}
        </div>
      </CardContent>
    </Card>
  );
};

const WaterfallMiniChart = ({ data }: { data: WaterfallPoint[] }) => {
  if (!data.length) return null;

  const width = Math.max(920, data.length * 120);
  const height = 360;
  const paddingLeft = 70;
  const paddingRight = 30;
  const paddingTop = 28;
  const paddingBottom = 70;

  const values = data.flatMap((d) => [d.start, d.end, 0]);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const spread = Math.max(rawMax - rawMin, 1);
  const minVal = rawMin - spread * 0.12;
  const maxVal = rawMax + spread * 0.12;

  const plotHeight = height - paddingTop - paddingBottom;
  const plotWidth = width - paddingLeft - paddingRight;
  const step = plotWidth / data.length;
  const barWidth = Math.min(64, step * 0.58);

  const y = (value: number) => {
    const ratio = (value - minVal) / (maxVal - minVal || 1);
    return height - paddingBottom - ratio * plotHeight;
  };

  const zeroY = y(0);

  const gridLines = 4;
  const axisTicks = Array.from({ length: gridLines + 1 }, (_, i) => {
    const val = minVal + ((maxVal - minVal) / gridLines) * i;
    return { value: val, y: y(val) };
  });

  const getFill = (point: WaterfallPoint) => {
    if (point.kind === "total") return "#4f46e5";
    if (point.delta >= 0) return "#10b981";
    return "#f43f5e";
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[920px] h-[360px]"
        role="img"
        aria-label="Gráfico waterfall de variación de utilidad"
      >
        {axisTicks.map((tick, idx) => (
          <g key={idx}>
            <line
              x1={paddingLeft}
              x2={width - paddingRight}
              y1={tick.y}
              y2={tick.y}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />
            <text
              x={paddingLeft - 10}
              y={tick.y + 4}
              textAnchor="end"
              fontSize="10"
              fontWeight="700"
              fill="#64748b"
            >
              {abreviarMonto(tick.value)}
            </text>
          </g>
        ))}

        <line
          x1={paddingLeft}
          x2={width - paddingRight}
          y1={zeroY}
          y2={zeroY}
          stroke="#94a3b8"
          strokeWidth="1.5"
        />

        {data.map((point, idx) => {
          const x = paddingLeft + idx * step + (step - barWidth) / 2;
          const barTop = Math.min(y(point.start), y(point.end));
          const barBottom = Math.max(y(point.start), y(point.end));
          const barHeight = Math.max(barBottom - barTop, 3);
          const centerX = x + barWidth / 2;

          const labelY =
            point.kind === "total"
              ? y(point.end) - 10
              : point.delta >= 0
              ? y(point.end) - 10
              : y(point.end) + 18;

          return (
            <g key={point.id}>
              {idx < data.length - 1 && point.kind !== "total" && (
                <line
                  x1={centerX + barWidth / 2}
                  x2={paddingLeft + (idx + 1) * step + step / 2}
                  y1={y(point.end)}
                  y2={y(point.end)}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                />
              )}

              <rect
                x={x}
                y={barTop}
                width={barWidth}
                height={barHeight}
                rx={12}
                fill={getFill(point)}
              />

              <text
                x={centerX}
                y={labelY}
                textAnchor="middle"
                fontSize="11"
                fontWeight="900"
                fill="#334155"
              >
                {point.kind === "total" ? abreviarMonto(point.end) : abreviarMonto(point.delta)}
              </text>

              <text
                x={centerX}
                y={height - 34}
                textAnchor="middle"
                fontSize="10"
                fontWeight="900"
                fill="#475569"
              >
                {point.shortLabel}
              </text>

              <text
                x={centerX}
                y={height - 20}
                textAnchor="middle"
                fontSize="9"
                fill="#94a3b8"
              >
                {point.kind === "total"
                  ? point.id === "base"
                    ? "Inicio"
                    : "Final"
                  : point.kind === "other"
                  ? "Ajuste"
                  : "Driver"}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <span className="font-black text-slate-900">Base:</span> utilidad del período o rango inicial.
        </div>
        <div className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <span className="font-black text-slate-900">Drivers:</span> cuentas con mayor impacto explicativo.
        </div>
        <div className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <span className="font-black text-slate-900">Comparación:</span> utilidad final del período o rango comparado.
        </div>
      </div>
    </div>
  );
};