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
  TrendingDown,
  Activity,
  DollarSign,
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
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

function tendenciaVerbo(actual: number, anterior: number, up = "aumentó", down = "disminuyó") {
  if (actual > anterior) return up;
  if (actual < anterior) return down;
  return "se mantuvo estable";
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
      const res = await authFetch(`/reportes/analisis_variacion_v1?desde=${fechaDesde}&hasta=${fechaHasta}`);
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

    const nombreBase =
      modoComparacion === "mensual"
        ? labelsBase[0] || "Período base"
        : `${labelsBase[0] || ""} a ${labelsBase[labelsBase.length - 1] || ""}`;

    const nombreComp =
      modoComparacion === "mensual"
        ? labelsComparacion[0] || "Período comparación"
        : `${labelsComparacion[0] || ""} a ${labelsComparacion[labelsComparacion.length - 1] || ""}`;

    explicacion.push(
      `Frente a ${nombreBase}, el período ${nombreComp} ${tendenciaVerbo(compIng, baseIng)} en ingresos a ${formatCurrency(compIng)} (${pctIng === null ? "N/A" : formatSignedPercent(pctIng)}).`
    );

    explicacion.push(
      `La utilidad neta ${tendenciaVerbo(compUn, baseUn)} a ${formatCurrency(compUn)} (${pctUn === null ? "N/A" : formatSignedPercent(pctUn)}), mientras la utilidad operativa cerró en ${formatCurrency(compUo)}.`
    );

    if (deltaIng > 0 && deltaUb < 0) {
      diagnostico.push(
        "Los ingresos mejoraron, pero la utilidad bruta se deterioró. Esto sugiere presión en costos de venta, devoluciones o mezcla comercial menos rentable."
      );
    }

    if (deltaUb > 0 && deltaUo < 0) {
      diagnostico.push(
        "La utilidad bruta creció, pero la utilidad operativa se debilitó. Esto apunta a una estructura de gasto operacional más pesada."
      );
    }

    if (aggComparacion.gastos_operacionales < 0) {
      diagnostico.push(
        `El período comparado presenta gastos operacionales netos negativos (${formatSignedCurrency(
          aggComparacion.gastos_operacionales
        )}), lo cual sugiere reversiones, reclasificaciones o ajustes contables poco habituales en lectura gerencial.`
      );
    }

    if (aggComparacion.utilidad_operativa > aggComparacion.utilidad_bruta) {
      diagnostico.push(
        "La utilidad operativa está por encima de la utilidad bruta, señal de recuperación neta en gastos operacionales."
      );
    }

    if (Math.abs(aggComparacion.ingresos_no_operacionales - aggComparacion.gastos_no_operacionales) > 0) {
      const netoNoOp =
        aggComparacion.ingresos_no_operacionales - aggComparacion.gastos_no_operacionales;
      diagnostico.push(
        `El resultado no operacional aporta ${formatSignedCurrency(netoNoOp)} al período comparado.`
      );
    }

    if (!diagnostico.length) {
      diagnostico.push(
        "El comportamiento general del período es consistente y no muestra anomalías fuertes en la relación entre ingresos, costos, gastos y utilidad."
      );
    }

    if (pctIng !== null && pctIng <= -15) {
      recomendaciones.push(
        "Revisar ventas, devoluciones y ritmo comercial, porque la caída de ingresos es material frente al período base."
      );
    }

    if (pctUb !== null && pctUb <= -10) {
      recomendaciones.push(
        "Revisar rentabilidad comercial, estructura de costos directos y cuentas de devoluciones para proteger el margen bruto."
      );
    }

    if (pctUo !== null && pctUo <= -10) {
      recomendaciones.push(
        "Revisar el gasto operacional con foco en crecimiento no productivo, reclasificaciones y provisiones."
      );
    }

    if (pctUn !== null && pctUn <= -10) {
      recomendaciones.push(
        "Revisar de inmediato los factores que presionan la utilidad neta: costos, gastos operativos y partidas no operacionales."
      );
    }

    if (aggComparacion.gastos_operacionales < 0) {
      recomendaciones.push(
        "Validar con contabilidad las cuentas operacionales con saldo acreedor para confirmar si corresponden a reversión legítima o error de clasificación."
      );
    }

    if (topDesfavorables.length > 0) {
      recomendaciones.push(
        `Priorizar revisión de las cuentas con mayor impacto desfavorable, empezando por ${topDesfavorables
          .slice(0, 2)
          .map((x) => `${x.cuenta} - ${x.nombre}`)
          .join(" y ")}.`
      );
    }

    if (!recomendaciones.length) {
      recomendaciones.push(
        "Mantener seguimiento sobre margen bruto, gasto operacional y utilidad neta para validar que la mejora sea sostenible."
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
    !(labelsBase.length === 1 &&
      labelsComparacion.length === 1 &&
      labelsBase[0] === labelsComparacion[0]);

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
            label="Base"
            value={labelsBase.length ? labelsBase.join(", ") : "Sin selección"}
          />
          <BadgeInfo
            label="Comparación"
            value={labelsComparacion.length ? labelsComparacion.join(", ") : "Sin selección"}
          />
        </div>
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
            />
            <CompareStatCard
              title="Utilidad Bruta"
              base={aggBase.utilidad_bruta}
              comparacion={aggComparacion.utilidad_bruta}
              icon={<DollarSign size={18} />}
              tipo="currency"
            />
            <CompareStatCard
              title="Utilidad Operativa"
              base={aggBase.utilidad_operativa}
              comparacion={aggComparacion.utilidad_operativa}
              icon={<Landmark size={18} />}
              tipo="currency"
            />
            <CompareStatCard
              title="EBITDA"
              base={aggBase.ebitda}
              comparacion={aggComparacion.ebitda}
              icon={<Activity size={18} />}
              tipo="currency"
              highlight
            />
            <CompareStatCard
              title="Utilidad Neta"
              base={aggBase.utilidad_neta}
              comparacion={aggComparacion.utilidad_neta}
              icon={<TrendingUp size={18} />}
              tipo="currency"
            />
          </div>

          {/* NARRATIVA */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <InsightBlock
              title="Explicación"
              subtitle="Qué cambió"
              icon={<Brain size={16} />}
              items={narrativa.explicacion}
              tone="slate"
            />
            <InsightBlock
              title="Diagnóstico"
              subtitle="Por qué cambió"
              icon={<Search size={16} />}
              items={narrativa.diagnostico}
              tone="indigo"
            />
            <InsightBlock
              title="Recomendación"
              subtitle="Qué revisar o decidir"
              icon={<Lightbulb size={16} />}
              items={narrativa.recomendaciones}
              tone="amber"
            />
          </div>

          {/* TABLA KPIs */}
          <Card className="rounded-[2rem] shadow-sm border bg-white">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wide">
                Variación de KPIs
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
              title="Drivers favorables"
              tone="emerald"
              rows={resumenDrivers.positivos}
            />
            <DriverSummaryCard
              title="Drivers desfavorables"
              tone="rose"
              rows={resumenDrivers.negativos}
            />
          </div>

          {/* TABLA DRIVERS */}
          <Card className="rounded-[2rem] shadow-sm border bg-white">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wide">
                Top drivers contables de la variación
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
                    <th className="py-3 px-4 text-center">Lectura</th>
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
                          row.variacion > 0 ? "text-emerald-600" : row.variacion < 0 ? "text-rose-600" : "text-slate-400"
                        }`}
                      >
                        {formatSignedCurrency(row.variacion)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {formatCurrency(row.impacto)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            row.favorable
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}
                        >
                          {row.favorable ? "Favorable" : "Desfavorable"}
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
const BadgeInfo = ({ label, value }: { label: string; value: string }) => (
  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 border text-slate-700">
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
      {label}
    </span>
    <span className="text-xs font-bold">{value}</span>
  </div>
);

const CompareStatCard = ({
  title,
  base,
  comparacion,
  icon,
  tipo,
  highlight = false,
}: {
  title: string;
  base: number;
  comparacion: number;
  icon: React.ReactNode;
  tipo: "currency" | "percent";
  highlight?: boolean;
}) => {
  const delta = comparacion - base;
  const pct = porcentajeCambio(comparacion, base);

  return (
    <Card
      className={`relative overflow-hidden border shadow-lg rounded-[2rem] transition-all hover:scale-[1.01] ${
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
          <span>{tipo === "currency" ? formatDeltaNumber(delta, tipo) : formatDeltaNumber(delta, "percent")}</span>
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
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  items: string[];
  tone: "slate" | "indigo" | "amber";
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
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white">{icon}</div>
          <div>
            <h3 className={`text-sm font-black uppercase tracking-wide ${toneMap.title}`}>
              {title}
            </h3>
            <p className={`text-xs font-medium ${toneMap.subtitle}`}>{subtitle}</p>
          </div>
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
}: {
  title: string;
  tone: "emerald" | "rose";
  rows: { texto: string; valor: number }[];
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
        <h3 className={`text-sm font-black uppercase tracking-wide mb-4 ${styles.title}`}>
          {title}
        </h3>

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