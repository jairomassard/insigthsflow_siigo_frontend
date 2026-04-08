"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { authFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from "recharts";
import {
  TrendingUp,
  FileText,
  RefreshCcw,
  DollarSign,
  Activity,
  Table as TableIcon,
  Landmark,
  Download,
  Eye,
  EyeOff,
  Plus,
  Minus,
} from "lucide-react";
import * as XLSX from "xlsx";

// =========================================================
// TIPOS
// =========================================================
type EvolucionItem = {
  label: string;
  ingresos?: number;
  ingresos_totales?: number;
  costos_gastos?: number;
  utilidad_bruta?: number;
  utilidad_operativa?: number;
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

type Kpis = {
  ingresos_totales?: number;
  utilidad_bruta?: number;
  utilidad_operativa?: number;
  ebitda?: number;
  utilidad_neta?: number;
  margen_bruto?: number;
  margen_operativo?: number;
  margen_ebitda?: number;
  margen_neto?: number;
};

type SectionKey =
  | "ingOp"
  | "costos"
  | "gasOp"
  | "ingNoOp"
  | "gasNoOp";

type ModoVisual = "gerencial" | "auditoria";

// =========================================================
// HELPERS
// =========================================================
function abreviar(valor: number): string {
  if (!valor) return "0";
  const absValue = Math.abs(valor);
  if (absValue >= 1_000_000_000) return `${(valor / 1_000_000_000).toFixed(1)}B`;
  if (absValue >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (absValue >= 1_000) return `${(valor / 1_000).toFixed(0)}K`;
  return `${Math.round(valor)}`;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(val || 0);

const formatPercent = (val?: number) => `${(val ?? 0).toFixed(2)}%`;

const formatSignedCurrency = (val: number) => {
  const abs = Math.abs(val || 0);
  const formatted = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(abs);

  return val < 0 ? `-${formatted}` : formatted;
};

const normalizeDisplayValue = (
  val: number,
  modo: ModoVisual,
  isGasto: boolean
) => {
  if (modo === "gerencial" && isGasto) return Math.abs(val || 0);
  return val || 0;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 shadow-2xl border rounded-xl border-slate-200 z-50">
        <p className="font-bold text-slate-800 mb-2 border-b pb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p
            key={index}
            className="text-sm font-bold flex justify-between gap-4"
            style={{ color: entry.color }}
          >
            <span>{entry.name}:</span>
            <span>{formatCurrency(entry.value)}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Etiqueta para barras: más cerca del tope
const BarLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (!value || value === 0) return null;

  return (
    <text
      x={x + width / 2}
      y={y - 6}
      fill="#475569"
      fontSize={10}
      fontWeight="900"
      textAnchor="middle"
    >
      {abreviar(value)}
    </text>
  );
};

// Etiqueta para línea EBITDA
const LineLabel = (props: any) => {
  const { x, y, value } = props;
  if (!value || value === 0) return null;

  return (
    <text
      x={x}
      y={y - 12}
      fill="#475569"
      fontSize={10}
      fontWeight="900"
      textAnchor="middle"
    >
      {abreviar(value)}
    </text>
  );
};

function getCuentaPrefix(cuenta?: string, length = 2) {
  return String(cuenta || "").slice(0, length);
}

function matchCuenta(
  cuenta: CuentaItem,
  seccionEsperada: string,
  fallback: (c: CuentaItem) => boolean
) {
  return cuenta.seccion ? cuenta.seccion === seccionEsperada : fallback(cuenta);
}
function porcentajeCambio(actual: number, anterior: number) {
  if (!anterior) return null;
  return ((actual - anterior) / Math.abs(anterior)) * 100;
}

function absPercent(part: number, total: number) {
  if (!total) return 0;
  return (Math.abs(part) / Math.abs(total)) * 100;
}

function tendenciaTexto(actual: number, anterior: number, labelUp = "aumentó", labelDown = "disminuyó") {
  if (actual > anterior) return labelUp;
  if (actual < anterior) return labelDown;
  return "se mantuvo estable";
}

function formatDeltaCurrency(actual: number, anterior: number) {
  const delta = (actual || 0) - (anterior || 0);
  return `${delta >= 0 ? "+" : "-"}${formatCurrency(Math.abs(delta))}`;
}

function formatDeltaPercent(actual: number, anterior: number) {
  const pct = porcentajeCambio(actual || 0, anterior || 0);
  if (pct === null) return "N/A";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

// =========================================================
// PAGE
// =========================================================
export default function EstadoResultadosPage() {
  useAuthGuard();

  const [evolucion, setEvolucion] = useState<EvolucionItem[]>([]);
  const [composicion, setComposicion] = useState<CuentaItem[]>([]);
  const [kpis, setKpis] = useState<Kpis>({});
  const [fechaDesde, setFechaDesde] = useState("2026-01-01");
  const [fechaHasta, setFechaHasta] = useState("2026-12-31");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [vista, setVista] = useState<"resumida" | "detallada">("detallada");
  const [modoVisual, setModoVisual] = useState<ModoVisual>("gerencial");
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    ingOp: false,
    costos: false,
    gasOp: false,
    ingNoOp: false,
    gasNoOp: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const expandAllSections = () => {
    setOpenSections({
      ingOp: true,
      costos: true,
      gasOp: true,
      ingNoOp: true,
      gasNoOp: true,
    });
  };

  const collapseAllSections = () => {
    setOpenSections({
      ingOp: false,
      costos: false,
      gasOp: false,
      ingNoOp: false,
      gasNoOp: false,
    });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await authFetch(
        `/reportes/pnl_v1?desde=${fechaDesde}&hasta=${fechaHasta}`
      );
      setEvolucion(res.evolucion ?? []);
      setComposicion(res.composicion ?? []);
      setKpis(res.kpis ?? {});
    } catch (err) {
      console.error(err);
      alert("No fue posible cargar el Estado de Resultados.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("archivo", file);

    try {
      await authFetch("/reportes/cargar_auxiliar", {
        method: "POST",
        body: formData,
      });
      alert("Éxito: se procesó el auxiliar contable.");
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Error cargando el archivo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const periodos = useMemo(() => evolucion.map((e) => e.label), [evolucion]);

  const evolucionChart = useMemo(
    () =>
      evolucion.map((e) => ({
        ...e,
        ingresos_chart: e.ingresos_totales ?? e.ingresos ?? 0,
      })),
    [evolucion]
  );

  const getCuentas = (predicate: (c: CuentaItem) => boolean) =>
    composicion.filter(predicate);

  const ingOp = useMemo(
    () =>
      getCuentas((c) =>
        matchCuenta(
          c,
          "INGRESOS_OPERACIONALES",
          (x) => getCuentaPrefix(x.cuenta, 2) === "41"
        )
      ),
    [composicion]
  );

  const costos = useMemo(
    () =>
      getCuentas((c) =>
        matchCuenta(
          c,
          "COSTOS_VENTA",
          (x) => ["6", "7"].includes(getCuentaPrefix(x.cuenta, 1))
        )
      ),
    [composicion]
  );

  const gasOp = useMemo(
    () =>
      getCuentas((c) =>
        matchCuenta(
          c,
          "GASTOS_OPERACIONALES",
          (x) => ["51", "52"].includes(getCuentaPrefix(x.cuenta, 2))
        )
      ),
    [composicion]
  );

  const ingNoOp = useMemo(
    () =>
      getCuentas((c) =>
        matchCuenta(
          c,
          "INGRESOS_NO_OPERACIONALES",
          (x) => getCuentaPrefix(x.cuenta, 2) === "42"
        )
      ),
    [composicion]
  );

  const gasNoOp = useMemo(
    () =>
      getCuentas((c) =>
        matchCuenta(
          c,
          "GASTOS_NO_OPERACIONALES",
          (x) => ["53", "54"].includes(getCuentaPrefix(x.cuenta, 2))
        )
      ),
    [composicion]
  );

  const getTotalesPorMes = (cuentas: CuentaItem[]) => {
    const totales: Record<string, number> = {};
    periodos.forEach((p) => {
      totales[p] = 0;
    });

    cuentas.forEach((c) => {
      periodos.forEach((p) => {
        totales[p] += c.valores_mes[p] || 0;
      });
    });

    return totales;
  };

  const sumCuentas = (cuentas: CuentaItem[]) =>
    cuentas.reduce((acc, c) => acc + (c.total || 0), 0);

  const totalIngOp = sumCuentas(ingOp);
  const totalCostos = sumCuentas(costos);
  const totalGasOp = sumCuentas(gasOp);
  const totalIngNoOp = sumCuentas(ingNoOp);
  const totalGasNoOp = sumCuentas(gasNoOp);

  const utilidadBruta = totalIngOp - totalCostos;
  const utilidadOperativa = utilidadBruta - totalGasOp;
  const utilidadAntesImpuestos =
    utilidadOperativa + totalIngNoOp - totalGasNoOp;
  const utilidadNeta = utilidadAntesImpuestos;

  const tIngOpMes = getTotalesPorMes(ingOp);
  const tCostosMes = getTotalesPorMes(costos);
  const tGasOpMes = getTotalesPorMes(gasOp);
  const tIngNoOpMes = getTotalesPorMes(ingNoOp);
  const tGasNoOpMes = getTotalesPorMes(gasNoOp);

  const ubMes = periodos.reduce(
    (acc, p) => ({ ...acc, [p]: tIngOpMes[p] - tCostosMes[p] }),
    {} as Record<string, number>
  );

  const uoMes = periodos.reduce(
    (acc, p) => ({ ...acc, [p]: ubMes[p] - tGasOpMes[p] }),
    {} as Record<string, number>
  );

  const uaiMes = periodos.reduce(
    (acc, p) => ({ ...acc, [p]: uoMes[p] + tIngNoOpMes[p] - tGasNoOpMes[p] }),
    {} as Record<string, number>
  );

  const unMes = uaiMes;

  const alertasAuditoria = useMemo(() => {
    const alertas: string[] = [];

    if (utilidadOperativa > utilidadBruta) {
      alertas.push(
        "La utilidad operativa es mayor que la utilidad bruta. Esto sugiere gastos operacionales netos negativos o reclasificaciones contables."
      );
    }

    if ((kpis.ebitda || 0) < (kpis.utilidad_operativa || utilidadOperativa || 0)) {
      alertas.push(
        "El EBITDA quedó por debajo de la utilidad operativa. Revisa cuentas de depreciación/amortización."
      );
    }

    const sumaMesesGasOp = Object.values(tGasOpMes).reduce((a, b) => a + b, 0);
    if (Math.abs(totalGasOp - sumaMesesGasOp) > 1) {
      alertas.push(
        "El acumulado de gastos operacionales no coincide con la suma visual de los meses. Puede haber signos ocultos o compensaciones."
      );
    }

    return alertas;
  }, [utilidadOperativa, utilidadBruta, kpis.ebitda, kpis.utilidad_operativa, totalGasOp, tGasOpMes]);


  const periodoActual = useMemo(() => {
    if (!evolucion.length) return null;
    return evolucion[evolucion.length - 1];
  }, [evolucion]);

  const periodoAnterior = useMemo(() => {
    if (evolucion.length < 2) return null;
    return evolucion[evolucion.length - 2];
  }, [evolucion]);

  const topImpactos = useMemo(() => {
    const grupos = [
      ...ingOp.map((c) => ({ ...c, grupo: "ingreso" as const })),
      ...costos.map((c) => ({ ...c, grupo: "costo" as const })),
      ...gasOp.map((c) => ({ ...c, grupo: "gasto" as const })),
      ...ingNoOp.map((c) => ({ ...c, grupo: "ingreso_no_op" as const })),
      ...gasNoOp.map((c) => ({ ...c, grupo: "gasto_no_op" as const })),
    ];

    return grupos
      .map((c) => ({
        cuenta: c.cuenta,
        nombre: c.nombre,
        total: c.total || 0,
        grupo: c.grupo,
        impacto: Math.abs(c.total || 0),
      }))
      .sort((a, b) => b.impacto - a.impacto)
      .slice(0, 5);
  }, [ingOp, costos, gasOp, ingNoOp, gasNoOp]);

  const interpretacionGerencial = useMemo(() => {
    const resumen: string[] = [];
    const variaciones: string[] = [];
    const hallazgos: string[] = [];
    const alertas: string[] = [];

    const ingresos = totalIngOp || 0;
    const costosVenta = totalCostos || 0;
    const gastosOperacion = totalGasOp || 0;
    const ingresosNoOp = totalIngNoOp || 0;
    const gastosNoOperacion = totalGasNoOp || 0;

    // RESUMEN
    resumen.push(
      `La empresa registra ingresos operacionales netos por ${formatCurrency(ingresos)} y una utilidad neta acumulada de ${formatCurrency(utilidadNeta)}.`
    );

    if (utilidadNeta > 0) {
      resumen.push(
        `El negocio cerró el período con rentabilidad positiva, apoyado en una utilidad operativa de ${formatCurrency(utilidadOperativa)}.`
      );
    } else if (utilidadNeta < 0) {
      resumen.push(
        `El período cerró con pérdida neta de ${formatCurrency(utilidadNeta)}, por lo que conviene revisar presión en costos, gastos y devoluciones.`
      );
    } else {
      resumen.push(
        `El período cerró en punto de equilibrio neto.`
      );
    }

    // VARIACIÓN VS PERÍODO ANTERIOR
    if (periodoActual && periodoAnterior) {
      const actualIngresos = periodoActual.ingresos_totales ?? periodoActual.ingresos ?? 0;
      const anteriorIngresos = periodoAnterior.ingresos_totales ?? periodoAnterior.ingresos ?? 0;

      const actualUb = periodoActual.utilidad_bruta ?? 0;
      const anteriorUb = periodoAnterior.utilidad_bruta ?? 0;

      const actualUo = periodoActual.utilidad_operativa ?? 0;
      const anteriorUo = periodoAnterior.utilidad_operativa ?? 0;

      const actualUn = periodoActual.utilidad_neta ?? 0;
      const anteriorUn = periodoAnterior.utilidad_neta ?? 0;

      variaciones.push(
        `Frente a ${periodoAnterior.label}, los ingresos ${tendenciaTexto(actualIngresos, anteriorIngresos)} a ${formatCurrency(actualIngresos)} (${formatDeltaCurrency(actualIngresos, anteriorIngresos)} / ${formatDeltaPercent(actualIngresos, anteriorIngresos)}).`
      );

      variaciones.push(
        `La utilidad bruta ${tendenciaTexto(actualUb, anteriorUb)} a ${formatCurrency(actualUb)} (${formatDeltaCurrency(actualUb, anteriorUb)} / ${formatDeltaPercent(actualUb, anteriorUb)}).`
      );

      variaciones.push(
        `La utilidad operativa ${tendenciaTexto(actualUo, anteriorUo)} a ${formatCurrency(actualUo)} (${formatDeltaCurrency(actualUo, anteriorUo)} / ${formatDeltaPercent(actualUo, anteriorUo)}).`
      );

      variaciones.push(
        `La utilidad neta ${tendenciaTexto(actualUn, anteriorUn)} a ${formatCurrency(actualUn)} (${formatDeltaCurrency(actualUn, anteriorUn)} / ${formatDeltaPercent(actualUn, anteriorUn)}).`
      );
    } else if (periodoActual) {
      variaciones.push(
        `Solo hay un período disponible en el rango seleccionado (${periodoActual.label}), por lo que aún no se puede comparar contra un mes anterior.`
      );
    }

    // HALLAZGOS
    if (ingresos > 0) {
      hallazgos.push(
        `Los costos de venta consumen ${absPercent(costosVenta, ingresos).toFixed(1)}% de los ingresos operacionales.`
      );

      hallazgos.push(
        `Los gastos operacionales netos equivalen a ${absPercent(gastosOperacion, ingresos).toFixed(1)}% de los ingresos operacionales.`
      );
    }

    if (ingresosNoOp > 0 || gastosNoOperacion > 0) {
      hallazgos.push(
        `El resultado no operacional aporta ${formatCurrency(ingresosNoOp - gastosNoOperacion)} al cierre del período.`
      );
    }

    if (utilidadOperativa > utilidadBruta) {
      hallazgos.push(
        `La utilidad operativa supera la utilidad bruta, lo que indica que hubo recuperación neta o reversión en gastos operacionales.`
      );
    }

    if (gastosOperacion < 0) {
      hallazgos.push(
        `Los gastos operacionales presentan saldo neto negativo (${formatSignedCurrency(gastosOperacion)}), situación poco habitual en lectura gerencial tradicional.`
      );
    }

    topImpactos.forEach((item, idx) => {
      if (idx < 3) {
        hallazgos.push(
          `Entre las cuentas con mayor impacto aparece ${item.cuenta} - ${item.nombre}, con ${formatSignedCurrency(item.total)}.`
        );
      }
    });

    // ALERTAS
    if (gastosOperacion < 0) {
      alertas.push(
        "Se detectan gastos operacionales netos negativos. Conviene validar si corresponde a reversiones contables, provisiones o reclasificaciones."
      );
    }

    if (utilidadOperativa > utilidadBruta) {
      alertas.push(
        "La utilidad operativa está por encima de la utilidad bruta. Esto no es un comportamiento usual y merece lectura contable específica."
      );
    }

    if (periodoActual && periodoAnterior) {
      const actualIngresos = periodoActual.ingresos_totales ?? periodoActual.ingresos ?? 0;
      const anteriorIngresos = periodoAnterior.ingresos_totales ?? periodoAnterior.ingresos ?? 0;
      const pctIngresos = porcentajeCambio(actualIngresos, anteriorIngresos);

      if (pctIngresos !== null && pctIngresos <= -20) {
        alertas.push(
          "Los ingresos cayeron más de 20% frente al período anterior. Recomienda revisar ventas, devoluciones y ritmo comercial."
        );
      }

      const actualUn = periodoActual.utilidad_neta ?? 0;
      const anteriorUn = periodoAnterior.utilidad_neta ?? 0;
      const pctUN = porcentajeCambio(actualUn, anteriorUn);

      if (pctUN !== null && pctUN <= -20) {
        alertas.push(
          "La utilidad neta cayó más de 20% frente al período anterior. Esto amerita revisar presión de costos, gastos y partidas extraordinarias."
        );
      }
    }

    return { resumen, variaciones, hallazgos, alertas };
  }, [
    evolucion,
    periodoActual,
    periodoAnterior,
    topImpactos,
    totalIngOp,
    totalCostos,
    totalGasOp,
    totalIngNoOp,
    totalGasNoOp,
    utilidadBruta,
    utilidadOperativa,
    utilidadNeta,
  ]);



  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    const kpisSheet = XLSX.utils.json_to_sheet([
      {
        indicador: "Ingresos Totales",
        valor: kpis.ingresos_totales || 0,
        margen: "",
      },
      {
        indicador: "Utilidad Bruta",
        valor: kpis.utilidad_bruta || 0,
        margen: kpis.margen_bruto || 0,
      },
      {
        indicador: "Utilidad Operativa",
        valor: kpis.utilidad_operativa || utilidadOperativa || 0,
        margen: kpis.margen_operativo || 0,
      },
      {
        indicador: "EBITDA",
        valor: kpis.ebitda || 0,
        margen: kpis.margen_ebitda || 0,
      },
      {
        indicador: "Utilidad Neta",
        valor: kpis.utilidad_neta || 0,
        margen: kpis.margen_neto || 0,
      },
    ]);

    const evolucionSheet = XLSX.utils.json_to_sheet(
      evolucion.map((e) => ({
        periodo: e.label,
        ingresos: e.ingresos_totales ?? e.ingresos ?? 0,
        costos_gastos: e.costos_gastos ?? 0,
        utilidad_bruta: e.utilidad_bruta ?? 0,
        utilidad_operativa: e.utilidad_operativa ?? 0,
        ebitda: e.ebitda ?? 0,
        utilidad_neta: e.utilidad_neta ?? 0,
      }))
    );

    const matrizRows: any[] = [];

    const pushSection = (sectionName: string, cuentas: CuentaItem[]) => {
      cuentas.forEach((c) => {
        const row: Record<string, any> = {
          seccion: sectionName,
          cuenta: c.cuenta,
          nombre: c.nombre,
          total: c.total,
        };
        periodos.forEach((p) => {
          row[p] = c.valores_mes[p] || 0;
        });
        matrizRows.push(row);
      });
    };

    pushSection("INGRESOS OPERACIONALES", ingOp);
    pushSection("COSTOS DE VENTA", costos);
    pushSection("GASTOS OPERACIONALES", gasOp);
    pushSection("INGRESOS NO OPERACIONALES", ingNoOp);
    pushSection("GASTOS NO OPERACIONALES", gasNoOp);

    const matrizSheet = XLSX.utils.json_to_sheet(matrizRows);

    XLSX.utils.book_append_sheet(wb, kpisSheet, "KPIs");
    XLSX.utils.book_append_sheet(wb, evolucionSheet, "Evolucion");
    XLSX.utils.book_append_sheet(wb, matrizSheet, "Matriz");

    XLSX.writeFile(wb, `pnl_${fechaDesde}_a_${fechaHasta}.xlsx`);
  };

  return (
    <div className="space-y-4 p-5 bg-slate-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Estado de Resultados (P&amp;L)
            <span className="text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">
              Premium
            </span>
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-1">
            Análisis Financiero, Márgenes y Análisis Horizontal Automático.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
            />

            <button
              onClick={exportExcel}
              className="flex items-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-black hover:bg-emerald-100 transition-all border border-emerald-100"
            >
              <Download size={16} />
              Exportar Excel
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-black transition-all shadow-lg active:scale-95"
            >
              {uploading ? (
                <RefreshCcw className="animate-spin" size={16} />
              ) : (
                <FileText size={16} />
              )}
              {uploading ? "Sincronizando..." : "Sincronizar Auxiliar"}
            </button>
          </div>

          <p className="text-slate-400 text-[10px] font-semibold italic">
            Ruta Siigo: Contabilidad {" > "} Comprobantes {" > "} Informe auxiliar contable
          </p>
        </div>
      </div>

      {/* FILTROS + VISTA */}
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-[2rem] border shadow-sm items-end justify-between">
        <div className="flex gap-4 flex-wrap">
          <div className="flex flex-col min-w-[240px]">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">
              Rango de Análisis
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

          <div className="flex flex-col">
            <label className="text-[10px] font-black text-white uppercase ml-1 mb-1">
              .
            </label>
            <button
              onClick={fetchData}
              className="bg-indigo-50 text-indigo-700 font-black px-6 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all border border-indigo-100"
            >
              <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
              {loading ? "Actualizando..." : "Filtrar P&L"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 rounded-2xl p-1 border">
            <button
              onClick={() => setVista("resumida")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                vista === "resumida"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              <EyeOff size={14} />
              Vista resumida
            </button>
            <button
              onClick={() => setVista("detallada")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                vista === "detallada"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              <Eye size={14} />
              Vista detallada
            </button>
          </div>

          <div className="flex items-center gap-2 bg-amber-50 rounded-2xl p-1 border border-amber-100">
            <button
              onClick={() => setModoVisual("gerencial")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                modoVisual === "gerencial"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              Modo gerencial
            </button>
            <button
              onClick={() => setModoVisual("auditoria")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                modoVisual === "auditoria"
                  ? "bg-amber-600 text-white"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              Modo auditoría
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <StatCard
          title="Ingresos Totales"
          value={kpis.ingresos_totales || 0}
          icon={<TrendingUp size={18} />}
          color="emerald"
        />
        <StatCard
          title="Utilidad Bruta"
          value={kpis.utilidad_bruta || 0}
          icon={<DollarSign size={18} />}
          color="blue"
          badge={formatPercent(kpis.margen_bruto)}
        />
        <StatCard
          title="Utilidad Operativa"
          value={kpis.utilidad_operativa || utilidadOperativa || 0}
          icon={<Landmark size={18} />}
          color="sky"
          badge={formatPercent(kpis.margen_operativo)}
        />
        <StatCard
          title="EBITDA"
          value={kpis.ebitda || 0}
          icon={<Activity size={18} />}
          color="indigo"
          badge={formatPercent(kpis.margen_ebitda)}
          highlight
        />
        <StatCard
          title="Utilidad Neta"
          value={kpis.utilidad_neta || 0}
          icon={<TrendingUp size={18} />}
          color="slate"
          badge={formatPercent(kpis.margen_neto)}
        />
      </div>

      {/* GRÁFICA */}
      <Card className="rounded-[2rem] shadow-xl border-none bg-white p-2">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-black text-slate-500 uppercase tracking-tight flex justify-between">
            <span>📈 Tendencia P&amp;L Mensual</span>
            <div className="flex gap-4 text-[10px]">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Ingresos
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-rose-500"></div> Costos/Gastos
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-indigo-600"></div> EBITDA
              </span>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-2">
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart
              data={evolucionChart}
              margin={{ top: 28, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fontWeight: "bold" }}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />

              <Bar
                dataKey="ingresos_chart"
                name="Ingresos"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
                barSize={40}
              >
                <LabelList dataKey="ingresos_chart" content={<BarLabel />} />
              </Bar>

              <Bar
                dataKey="costos_gastos"
                name="Costos y Gastos"
                fill="#f43f5e"
                radius={[6, 6, 0, 0]}
                barSize={40}
              >
                <LabelList dataKey="costos_gastos" content={<BarLabel />} />
              </Bar>

              <Line
                type="monotone"
                dataKey="ebitda"
                name="EBITDA"
                stroke="#4f46e5"
                strokeWidth={4}
                dot={{ r: 4, fill: "#4f46e5", strokeWidth: 2, stroke: "#fff" }}
              >
                <LabelList dataKey="ebitda" content={<LineLabel />} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ALERTAS AUDITORÍA */}
      {modoVisual === "auditoria" && alertasAuditoria.length > 0 && (
        <Card className="rounded-[2rem] border border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-black text-amber-800 uppercase tracking-wide mb-2">
              Alertas de auditoría
            </h3>
            <div className="space-y-2">
              {alertasAuditoria.map((alerta, idx) => (
                <div
                  key={idx}
                  className="text-sm text-amber-900 bg-white/70 border border-amber-100 rounded-xl px-3 py-2"
                >
                  {alerta}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* MATRIZ */}
      {vista === "detallada" && (
        <>
          <Card className="rounded-[2rem] shadow-2xl border-none overflow-hidden bg-white">
          <div className="bg-slate-900 text-white px-8 py-5 flex justify-between items-center">
            <div>
              <h2 className="font-black text-lg uppercase tracking-widest">
                Estado de Resultados Integral (Matricial)
              </h2>
              <p className="text-slate-400 text-xs mt-1 font-medium">
                Análisis Horizontal Mes a Mes + Acumulado
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={expandAllSections}
                className="px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-400/20 text-xs font-black hover:bg-emerald-500/20 transition-all"
              >
                Expandir todo
              </button>

              <button
                type="button"
                onClick={collapseAllSections}
                className="px-3 py-2 rounded-xl bg-white/5 text-white border border-white/10 text-xs font-black hover:bg-white/10 transition-all"
              >
                Contraer todo
              </button>

              <TableIcon size={30} className="text-emerald-400 opacity-60 ml-1" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead>
                <tr className="bg-slate-100 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b">
                  <th className="py-4 px-6 text-left sticky left-0 bg-slate-100 z-10 w-[360px]">
                    Concepto / Cuenta
                  </th>
                  {periodos.map((p) => (
                    <th key={p} className="py-4 px-4 text-right">
                      {p}
                    </th>
                  ))}
                  <th className="py-4 px-6 text-right bg-emerald-50 text-emerald-800 border-l border-emerald-100">
                    Total Acumulado
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {/* INGRESOS OPERACIONALES */}
                <SectionHeader
                  title="INGRESOS OPERACIONALES"
                  colSpan={periodos.length + 2}
                  expanded={openSections.ingOp}
                  onToggle={() => toggleSection("ingOp")}
                />
                {openSections.ingOp &&
                  ingOp.map((c) => (
                    <RowCuenta
                      key={c.cuenta}
                      cuenta={c}
                      isGasto={false}
                      periodos={periodos}
                      modoVisual={modoVisual}
                    />
                  ))}
                <RowTotal
                  title="TOTAL INGRESOS OPERACIONALES"
                  totalesMes={tIngOpMes}
                  totalAcumulado={totalIngOp}
                  periodos={periodos}
                  modoVisual={modoVisual}
                />

                {/* COSTOS */}
                <SectionHeader
                  title="COSTOS DE VENTA"
                  colSpan={periodos.length + 2}
                  white
                  expanded={openSections.costos}
                  onToggle={() => toggleSection("costos")}
                />
                {openSections.costos &&
                  costos.map((c) => (
                    <RowCuenta
                      key={c.cuenta}
                      cuenta={c}
                      isGasto={true}
                      periodos={periodos}
                      modoVisual={modoVisual}
                    />
                  ))}
                <RowTotal
                  title="TOTAL COSTOS DE VENTA"
                  totalesMes={tCostosMes}
                  totalAcumulado={totalCostos}
                  isGasto
                  periodos={periodos}
                  modoVisual={modoVisual}
                />

                {/* UTILIDAD BRUTA */}
                <ResultRow
                  title="(=) Utilidad Bruta"
                  values={ubMes}
                  total={utilidadBruta}
                  periodos={periodos}
                  rowClass="bg-emerald-50"
                  titleClass="text-emerald-800 bg-emerald-50"
                  valueClass="text-emerald-800"
                  totalClass="text-emerald-900 bg-emerald-100/50 border-l border-emerald-200"
                />

                {/* GASTOS OPERACIONALES */}
                <SectionHeader
                  title="GASTOS OPERACIONALES"
                  colSpan={periodos.length + 2}
                  white
                  expanded={openSections.gasOp}
                  onToggle={() => toggleSection("gasOp")}
                />
                {openSections.gasOp &&
                  gasOp.map((c) => (
                    <RowCuenta
                      key={c.cuenta}
                      cuenta={c}
                      isGasto={true}
                      periodos={periodos}
                      modoVisual={modoVisual}
                    />
                  ))}
                <RowTotal
                  title="TOTAL GASTOS OPERACIONALES"
                  totalesMes={tGasOpMes}
                  totalAcumulado={totalGasOp}
                  isGasto
                  periodos={periodos}
                  modoVisual={modoVisual}
                />

                {/* UTILIDAD OPERATIVA */}
                <ResultRow
                  title="(=) Utilidad Operativa"
                  values={uoMes}
                  total={utilidadOperativa}
                  periodos={periodos}
                  rowClass="bg-blue-50"
                  titleClass="text-blue-800 bg-blue-50"
                  valueClass="text-blue-800"
                  totalClass="text-blue-900 bg-blue-100/50 border-l border-blue-200"
                />

                {/* INGRESOS NO OPERACIONALES */}
                <SectionHeader
                  title="INGRESOS NO OPERACIONALES"
                  colSpan={periodos.length + 2}
                  white
                  expanded={openSections.ingNoOp}
                  onToggle={() => toggleSection("ingNoOp")}
                />
                {openSections.ingNoOp &&
                  ingNoOp.map((c) => (
                    <RowCuenta
                      key={c.cuenta}
                      cuenta={c}
                      isGasto={false}
                      periodos={periodos}
                      modoVisual={modoVisual}
                    />
                  ))}
                <RowTotal
                  title="TOTAL INGRESOS NO OPERACIONALES"
                  totalesMes={tIngNoOpMes}
                  totalAcumulado={totalIngNoOp}
                  periodos={periodos}
                  modoVisual={modoVisual}
                />

                {/* GASTOS NO OPERACIONALES */}
                <SectionHeader
                  title="GASTOS NO OPERACIONALES"
                  colSpan={periodos.length + 2}
                  white
                  expanded={openSections.gasNoOp}
                  onToggle={() => toggleSection("gasNoOp")}
                />
                {openSections.gasNoOp &&
                  gasNoOp.map((c) => (
                    <RowCuenta
                      key={c.cuenta}
                      cuenta={c}
                      isGasto={true}
                      periodos={periodos}
                      modoVisual={modoVisual}
                    />
                  ))}
                <RowTotal
                  title="TOTAL GASTOS NO OPERACIONALES"
                  totalesMes={tGasNoOpMes}
                  totalAcumulado={totalGasNoOp}
                  isGasto
                  periodos={periodos}
                  modoVisual={modoVisual}
                />

                {/* UTILIDAD ANTES DE IMPUESTOS */}
                <ResultRow
                  title="(=) Utilidad Antes de Impuestos"
                  values={uaiMes}
                  total={utilidadAntesImpuestos}
                  periodos={periodos}
                  rowClass="bg-amber-50"
                  titleClass="text-amber-800 bg-amber-50"
                  valueClass="text-amber-800"
                  totalClass="text-amber-900 bg-amber-100/50 border-l border-amber-200"
                />

                {/* UTILIDAD NETA */}
                <tr className="bg-slate-900 border-t-4 border-slate-900">
                  <td className="py-5 px-6 font-black text-white text-base uppercase tracking-widest sticky left-0 bg-slate-900">
                    (=) Utilidad Neta del Ejercicio
                  </td>
                  {periodos.map((p) => (
                    <td
                      key={p}
                      className="py-5 px-4 text-right font-black text-emerald-400 text-sm"
                    >
                      {formatCurrency(unMes[p])}
                    </td>
                  ))}
                  <td className="py-5 px-6 text-right font-black text-emerald-400 text-xl bg-slate-800 border-l border-slate-700">
                    {formatCurrency(utilidadNeta)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          </Card>

          <Card className="rounded-[2rem] shadow-sm border bg-white mt-4">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                  Interpretación automática del resultado
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Lectura gerencial del período con base en KPIs, variaciones y composición del P&amp;L.
                </p>
              </div>

              <div className="bg-slate-50 border rounded-2xl p-4 space-y-2">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                  Resumen ejecutivo
                </h4>
                {interpretacionGerencial.resumen.map((item, idx) => (
                  <p key={idx} className="text-sm text-slate-800 leading-6">
                    {item}
                  </p>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="border rounded-2xl p-4 bg-white">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-indigo-600 mb-3">
                    Variación vs período anterior
                  </h4>
                  <div className="space-y-2">
                    {interpretacionGerencial.variaciones.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-sm text-slate-700 bg-slate-50 rounded-xl px-3 py-2"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border rounded-2xl p-4 bg-white">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-emerald-600 mb-3">
                    Hallazgos clave
                  </h4>
                  <div className="space-y-2">
                    {interpretacionGerencial.hallazgos.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-sm text-slate-700 bg-emerald-50 rounded-xl px-3 py-2"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {interpretacionGerencial.alertas.length > 0 && (
                <div className="border border-amber-200 bg-amber-50 rounded-2xl p-4">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-amber-700 mb-3">
                    Alertas gerenciales
                  </h4>
                  <div className="space-y-2">
                    {interpretacionGerencial.alertas.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-sm text-amber-900 bg-white/70 border border-amber-100 rounded-xl px-3 py-2"
                      >
                        ⚠️ {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
const SectionHeader = ({
  title,
  colSpan,
  white = false,
  expanded,
  onToggle,
}: {
  title: string;
  colSpan: number;
  white?: boolean;
  expanded: boolean;
  onToggle: () => void;
}) => (
  <tr className={white ? "" : "bg-slate-50/50"}>
    <td
      colSpan={colSpan}
      className={`py-3 px-6 font-black text-slate-800 text-base sticky left-0 ${
        white ? "bg-white pt-6" : "bg-slate-50/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              expanded ? "bg-emerald-500" : "bg-slate-300"
            }`}
          />
          {title}
        </span>

        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all duration-200 hover:scale-105 active:scale-95"
          title={expanded ? "Contraer sección" : "Expandir sección"}
        >
          <span className="transition-transform duration-200">
            {expanded ? <Minus size={16} /> : <Plus size={16} />}
          </span>
        </button>
      </div>
    </td>
  </tr>
);

const RowCuenta = ({
  cuenta,
  isGasto,
  periodos,
  modoVisual,
}: {
  cuenta: CuentaItem;
  isGasto: boolean;
  periodos: string[];
  modoVisual: ModoVisual;
}) => (
  <tr className="hover:bg-slate-50 transition-colors group">
    <td className="py-2 px-6 text-slate-600 font-medium text-xs flex gap-3 items-center sticky left-0 bg-white group-hover:bg-slate-50 transition-colors w-[360px]">
      <span className="font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px]">
        {cuenta.cuenta}
      </span>
      <span
        className="group-hover:text-indigo-600 transition-colors truncate"
        title={cuenta.nombre}
      >
        {cuenta.nombre}
      </span>
    </td>

    {periodos.map((p) => {
      const valorReal = cuenta.valores_mes[p] || 0;
      const valorMostrar = normalizeDisplayValue(valorReal, modoVisual, isGasto);

      let cls = "text-slate-800";
      if (modoVisual === "auditoria") {
        cls = valorReal < 0
          ? "text-amber-700"
          : isGasto
          ? "text-rose-600"
          : "text-slate-800";
      } else {
        cls = isGasto ? "text-rose-600" : "text-slate-800";
      }

      return (
        <td key={p} className={`py-2 px-4 text-right font-bold text-xs ${cls}`}>
          {modoVisual === "auditoria"
            ? formatSignedCurrency(valorReal)
            : formatCurrency(valorMostrar)}
        </td>
      );
    })}

    <td
      className={`py-2 px-6 text-right font-black text-xs bg-slate-50/50 border-l border-slate-100 ${
        modoVisual === "auditoria"
          ? cuenta.total < 0
            ? "text-amber-700"
            : isGasto
            ? "text-rose-700"
            : "text-slate-900"
          : isGasto
          ? "text-rose-700"
          : "text-slate-900"
      }`}
    >
      {modoVisual === "auditoria"
        ? formatSignedCurrency(cuenta.total || 0)
        : formatCurrency(
            normalizeDisplayValue(cuenta.total || 0, modoVisual, isGasto)
          )}
    </td>
  </tr>
);

const RowTotal = ({
  title,
  totalesMes,
  totalAcumulado,
  isGasto = false,
  periodos,
  modoVisual,
}: {
  title: string;
  totalesMes: Record<string, number>;
  totalAcumulado: number;
  isGasto?: boolean;
  periodos: string[];
  modoVisual: ModoVisual;
}) => (
  <tr className="border-t border-slate-200 bg-slate-50/80">
    <td className="py-3 px-6 font-black text-slate-700 text-[11px] sticky left-0 bg-slate-50/80">
      {title}
    </td>
    {periodos.map((p) => {
      const valorReal = totalesMes[p] || 0;
      const valorMostrar = normalizeDisplayValue(valorReal, modoVisual, isGasto);

      let cls = "text-slate-900";
      if (modoVisual === "auditoria") {
        cls = valorReal < 0
          ? "text-amber-700"
          : isGasto
          ? "text-rose-600"
          : "text-slate-900";
      } else {
        cls = isGasto ? "text-rose-600" : "text-slate-900";
      }

      return (
        <td key={p} className={`py-3 px-4 text-right font-black text-xs ${cls}`}>
          {modoVisual === "auditoria"
            ? formatSignedCurrency(valorReal)
            : formatCurrency(valorMostrar)}
        </td>
      );
    })}
    <td
      className={`py-3 px-6 text-right font-black text-sm bg-slate-100/50 border-l border-slate-200 ${
        modoVisual === "auditoria"
          ? totalAcumulado < 0
            ? "text-amber-700"
            : isGasto
            ? "text-rose-700"
            : "text-slate-900"
          : isGasto
          ? "text-rose-700"
          : "text-slate-900"
      }`}
    >
      {modoVisual === "auditoria"
        ? formatSignedCurrency(totalAcumulado || 0)
        : formatCurrency(
            normalizeDisplayValue(totalAcumulado || 0, modoVisual, isGasto)
          )}
    </td>
  </tr>
);

const ResultRow = ({
  title,
  values,
  total,
  periodos,
  rowClass,
  titleClass,
  valueClass,
  totalClass,
}: {
  title: string;
  values: Record<string, number>;
  total: number;
  periodos: string[];
  rowClass: string;
  titleClass: string;
  valueClass: string;
  totalClass: string;
}) => (
  <tr className={rowClass}>
    <td
      className={`py-4 px-6 font-black text-sm uppercase sticky left-0 ${titleClass}`}
    >
      {title}
    </td>
    {periodos.map((p) => (
      <td key={p} className={`py-4 px-4 text-right font-black text-sm ${valueClass}`}>
        {formatCurrency(values[p] || 0)}
      </td>
    ))}
    <td className={`py-4 px-6 text-right font-black text-base ${totalClass}`}>
      {formatCurrency(total || 0)}
    </td>
  </tr>
);

const StatCard = ({
  title,
  value,
  icon,
  color,
  badge,
  highlight = false,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "emerald" | "blue" | "sky" | "indigo" | "slate";
  badge?: string;
  highlight?: boolean;
}) => {
  const themes: Record<string, string> = {
    emerald: "text-emerald-600 bg-white border-slate-100",
    blue: "text-blue-600 bg-white border-slate-100",
    sky: "text-sky-600 bg-white border-slate-100",
    indigo: "text-indigo-600 bg-white border-slate-100",
    slate: "text-slate-700 bg-white border-slate-100",
  };

  return (
    <Card
      className={`relative overflow-hidden border shadow-lg rounded-[2rem] transition-all hover:scale-[1.01] ${
        highlight
          ? "bg-indigo-600 text-white shadow-indigo-200 border-none"
          : themes[color]
      }`}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div className={`p-2.5 rounded-2xl ${highlight ? "bg-white/20" : "bg-slate-50"}`}>
            {icon}
          </div>
          {badge && (
            <div
              className={`text-[9px] font-black px-2 py-1 rounded-lg flex items-center gap-1 ${
                highlight
                  ? "bg-emerald-400 text-emerald-950"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {badge} MARGEN
            </div>
          )}
        </div>

        <p
          className={`text-[9px] font-black uppercase tracking-widest ${
            highlight ? "text-indigo-100" : "text-slate-400"
          }`}
        >
          {title}
        </p>
        <p className="text-[1.9rem] leading-none font-black mt-1 tracking-tighter">
          {formatCurrency(value || 0)}
        </p>
      </CardContent>
    </Card>
  );
};