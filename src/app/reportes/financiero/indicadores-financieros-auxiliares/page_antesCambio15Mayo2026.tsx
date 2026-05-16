"use client";

import { useMemo, useState } from "react";
import { authFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Activity,
  Wallet,
  Landmark,
  TrendingUp,
  HelpCircle,
  RefreshCcw,
  Download,
  ShieldCheck,
  BarChart3,
  AlertTriangle,
} from "lucide-react";

/* ---------------------- Helpers ---------------------- */
function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("es-CO", { maximumFractionDigits: 2 });
}

function fmt2(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return Number(n).toFixed(2);
}

function formatCurrency(valor: number | null | undefined): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(valor || 0));
}

function abreviarMoneda(valor: number | null | undefined): string {
  const n = Number(valor || 0);
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return formatCurrency(n);
}

function colorSemaforo(key: string, valor: number | null): string {
  if (valor === null) return "bg-slate-50 border-slate-200";

  switch (key) {
    case "liquidez":
      return valor < 1
        ? "bg-red-50 border-red-200"
        : valor < 2
        ? "bg-yellow-50 border-yellow-200"
        : "bg-green-50 border-green-200";

    case "apalancamiento":
      return valor > 0.8
        ? "bg-red-50 border-red-200"
        : valor > 0.6
        ? "bg-yellow-50 border-yellow-200"
        : "bg-green-50 border-green-200";

    case "rentabilidad":
      return valor < 0
        ? "bg-red-50 border-red-200"
        : valor < 0.1
        ? "bg-yellow-50 border-yellow-200"
        : "bg-green-50 border-green-200";

    case "autonomia":
      return valor < 0.3
        ? "bg-red-50 border-red-200"
        : valor < 0.5
        ? "bg-yellow-50 border-yellow-200"
        : "bg-green-50 border-green-200";

    case "solvencia":
    case "cobertura_activo_pasivo":
      return valor < 1
        ? "bg-red-50 border-red-200"
        : valor < 1.5
        ? "bg-yellow-50 border-yellow-200"
        : "bg-green-50 border-green-200";

    case "capital_trabajo":
      return valor < 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200";

    default:
      return "bg-slate-50 border-slate-200";
  }
}

function iconoSemaforo(key: string, valor: number | null): string {
  if (valor === null) return "⚪";

  switch (key) {
    case "liquidez":
      return valor < 1 ? "🔴" : valor < 2 ? "🟡" : "🟢";
    case "apalancamiento":
      return valor > 0.8 ? "🔴" : valor > 0.6 ? "🟡" : "🟢";
    case "rentabilidad":
      return valor < 0 ? "🔴" : valor < 0.1 ? "🟡" : "🟢";
    case "autonomia":
      return valor < 0.3 ? "🔴" : valor < 0.5 ? "🟡" : "🟢";
    case "solvencia":
    case "cobertura_activo_pasivo":
      return valor < 1 ? "🔴" : valor < 1.5 ? "🟡" : "🟢";
    case "capital_trabajo":
      return valor < 0 ? "🔴" : "🟢";
    default:
      return "⚪";
  }
}

function diagCorto(key: string, valor: number | null): string {
  if (valor === null) return "Sin datos";

  switch (key) {
    case "liquidez":
      return valor > 3 ? "Exceso de liquidez" : valor >= 1 ? "Liquidez saludable" : "Riesgo de iliquidez";
    case "apalancamiento":
      return valor > 0.8 ? "Endeudamiento alto" : valor > 0.6 ? "Apalancamiento moderado" : "Deuda controlada";
    case "rentabilidad":
      return valor < 0 ? "Pérdidas netas" : valor < 0.1 ? "Rentabilidad baja" : "Rentabilidad sólida";
    case "autonomia":
      return valor < 0.3 ? "Alta deuda externa" : valor < 0.5 ? "Dependencia moderada" : "Buena autonomía";
    case "solvencia":
      return valor < 1 ? "Riesgo de insolvencia" : valor < 1.5 ? "Solvencia ajustada" : "Buena solvencia";
    case "capital_trabajo":
      return valor < 0 ? "Capital de trabajo negativo" : "Colchón operativo positivo";
    case "cobertura_activo_pasivo":
      return valor < 1 ? "Activos insuficientes para cubrir pasivos" : "Cobertura adecuada";
    case "porcentaje_pasivo_corto":
      return valor > 0.7 ? "Alta presión de corto plazo" : valor > 0.4 ? "Estructura equilibrada" : "Predomina deuda de largo plazo";
    case "porcentaje_activo_no_corriente":
      return valor > 0.7 ? "Alto peso de activos fijos" : valor > 0.4 ? "Composición balanceada" : "Predominio de activos corrientes";
    case "endeudamiento_largo_plazo":
      return valor > 1 ? "Presión alta a largo plazo" : "Presión razonable a largo plazo";
    default:
      return "";
  }
}

function nombreMesCorto(mes: string): string {
  const [year, month] = mes.split("-");
  const fecha = new Date(Number(year), Number(month) - 1, 1);
  return fecha.toLocaleDateString("es-CO", { month: "short", year: "2-digit" });
}

function nombreIndicador(k: string): string {
  return k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

const INDICADOR_INFO: Record<string, string> = {
  liquidez:
    "Mide la capacidad de la empresa para cubrir sus obligaciones de corto plazo con sus activos corrientes.",
  apalancamiento:
    "Mide qué tan financiada está la empresa con deuda frente a su estructura total de recursos.",
  rentabilidad:
    "Mide la capacidad del negocio para generar utilidad neta a partir de sus ingresos durante el período.",
  autonomia:
    "Refleja qué tanto del activo está financiado con recursos propios en lugar de deuda.",
  capital_trabajo:
    "Es la diferencia entre activo corriente y pasivo corriente. Indica el colchón operativo disponible en el corto plazo.",
  cobertura_activo_pasivo:
    "Mide cuántas veces los activos alcanzan a cubrir el total de pasivos de la empresa.",
  porcentaje_activo_no_corriente:
    "Indica qué proporción del activo total está concentrada en activos no corrientes o de largo plazo.",
  porcentaje_pasivo_corto:
    "Mide qué parte del pasivo total vence en el corto plazo, mostrando la presión inmediata de obligaciones.",
  solvencia:
    "Evalúa la capacidad general de la empresa para responder por sus deudas con su estructura patrimonial y de activos.",
  endeudamiento_largo_plazo:
    "Mide el peso relativo de las obligaciones de largo plazo dentro de la estructura financiera del negocio.",
  activo_total:
    "Representa el total de recursos económicos controlados por la empresa al corte seleccionado.",
  pasivo_total:
    "Representa el total de obligaciones de la empresa con terceros al corte seleccionado.",
  patrimonio:
    "Corresponde al valor residual de la empresa después de restar los pasivos al activo total.",
  utilidad_neta:
    "Es el resultado final del período después de costos, gastos y demás partidas del estado de resultados.",
};

function valorIndicador(k: string, v: number | null | undefined) {
  if (k === "capital_trabajo") return abreviarMoneda(v);
  if (["activo_total", "pasivo_total", "patrimonio", "utilidad_neta"].includes(k)) {
    return abreviarMoneda(v);
  }
  return fmt2(v);
}

function getIndicadorTone(key: string, valor: number | null) {
  if (valor === null) {
    return {
      chip: "bg-slate-100 text-slate-500",
      iconWrap: "bg-slate-100 text-slate-500",
    };
  }

  const base = colorSemaforo(key, valor);

  if (base.includes("red")) {
    return {
      chip: "bg-red-100 text-red-700",
      iconWrap: "bg-red-100 text-red-700",
    };
  }
  if (base.includes("yellow")) {
    return {
      chip: "bg-yellow-100 text-yellow-700",
      iconWrap: "bg-yellow-100 text-yellow-700",
    };
  }
  return {
    chip: "bg-emerald-100 text-emerald-700",
    iconWrap: "bg-emerald-100 text-emerald-700",
  };
}

const CustomLineTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

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
          <span>
            {entry.dataKey === "utilidad_neta"
              ? formatCurrency(Number(entry.value || 0))
              : fmt2(Number(entry.value || 0))}
          </span>
        </p>
      ))}
    </div>
  );
};

/* ---------------------- Subcomponentes ---------------------- */
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

const ExecutiveStatCard = ({
  title,
  value,
  detail,
  icon,
  color,
  description,
  highlight = false,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  color: "emerald" | "blue" | "sky" | "indigo";
  description: string;
  highlight?: boolean;
}) => {
  const themes: Record<string, string> = {
    emerald: "text-emerald-600 bg-white border-slate-100",
    blue: "text-blue-600 bg-white border-slate-100",
    sky: "text-sky-600 bg-white border-slate-100",
    indigo: "text-indigo-600 bg-white border-slate-100",
  };

  return (
    <Card
      className={`relative overflow-visible border shadow-lg rounded-[2rem] transition-all hover:scale-[1.01] ${
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
          <InfoHint text={description} dark={highlight} align="right" />
        </div>

        <p
          className={`text-[9px] font-black uppercase tracking-widest ${
            highlight ? "text-indigo-100" : "text-slate-400"
          }`}
        >
          {title}
        </p>
        <p className="text-[1.9rem] leading-none font-black mt-1 tracking-tighter">
          {value}
        </p>
        <p
          className={`mt-2 text-xs ${
            highlight ? "text-indigo-100/90" : "text-slate-500"
          }`}
        >
          {detail}
        </p>
      </CardContent>
    </Card>
  );
};

const IndicadorCard = ({
  k,
  v,
  explicacion,
  interpretacion,
  compact = false,
}: {
  k: string;
  v: number | null | undefined;
  explicacion?: string;
  interpretacion?: string;
  compact?: boolean;
}) => {
  const num = typeof v === "number" ? v : null;
  const tone = getIndicadorTone(k, num);

  return (
    <div className={`rounded-[1.6rem] border p-5 shadow-sm transition-all hover:shadow-md ${colorSemaforo(k, num)}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">
            {nombreIndicador(k)}
          </h4>
          <InfoHint
            text={INDICADOR_INFO[k] || explicacion || "Indicador financiero del análisis."}
            align="left"
          />
        </div>

        <div className={`px-2.5 py-1 rounded-xl text-sm font-black ${tone.iconWrap}`}>
          {iconoSemaforo(k, num)}
        </div>
      </div>

      <p className={`${compact ? "text-2xl" : "text-3xl"} mt-4 font-black tracking-tight text-slate-900`}>
        {valorIndicador(k, v)}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${tone.chip}`}>
          {diagCorto(k, num)}
        </span>
        <InfoHint
          text={`Diagnóstico corto: ${diagCorto(k, num)}.`}
          align="right"
        />
      </div>

      {explicacion && (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          {explicacion}
        </p>
      )}

      {interpretacion && (
        <div className="mt-3 rounded-2xl bg-white/80 p-3 text-xs leading-5 text-slate-700 border border-white/70">
          {interpretacion}
        </div>
      )}
    </div>
  );
};

/* ---------------------- Página ---------------------- */
export default function IndicadoresFinancierosAuxiliaresPage() {
  const [anio, setAnio] = useState<number>(2026);
  const [mesInicio, setMesInicio] = useState<number>(1);
  const [mesFin, setMesFin] = useState<number>(12);

  const [resumen, setResumen] = useState<any[]>([]);
  const [indicadores, setIndicadores] = useState<Record<string, number | null>>({});
  const [explicaciones, setExplicaciones] = useState<Record<string, string>>({});
  const [interpretaciones, setInterpretaciones] = useState<Record<string, string>>({});
  const [conclusiones, setConclusiones] = useState<string[]>([]);
  const [evolucionMensual, setEvolucionMensual] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [metaBalance, setMetaBalance] = useState<any>(null);
  const [resumenBalance, setResumenBalance] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await authFetch(
        `/reportes/auxiliares/indicadores-financieros?anio=${anio}&mes_inicio=${mesInicio}&mes_fin=${mesFin}`
      );

      setResumen(data.resumen_financiero || []);
      setIndicadores(data.indicadores || {});
      setExplicaciones(data.explicaciones || {});
      setInterpretaciones(data.interpretaciones || {});
      setConclusiones(data.conclusiones || []);
      setEvolucionMensual(data.evolucion_mensual || []);
      setMeta(data.meta || null);
      setMetaBalance(data.meta_balance || null);
      setResumenBalance(data.resumen_balance || null);
    } catch (e) {
      console.error("Error cargando indicadores desde auxiliares:", e);
    } finally {
      setLoading(false);
    }
  };

  const exportarExcel = () => {
    const hojaResumen = XLSX.utils.json_to_sheet(
      resumen.map((r) => ({
        "Clase Contable": r.clase,
        Valor: r.valor,
        Interpretación: r.interpretacion,
      }))
    );

    const hojaIndicadores = XLSX.utils.json_to_sheet(
      Object.entries(indicadores)
        .filter(([k]) =>
          ![
            "activo_total",
            "pasivo_total",
            "patrimonio",
            "ingresos",
            "costos",
            "gastos",
            "utilidad_neta",
            "activo_corriente",
            "activo_no_corriente",
            "pasivo_corto",
            "pasivo_largo",
          ].includes(k)
        )
        .map(([k, v]) => ({
          Indicador: k.replace(/_/g, " ").toUpperCase(),
          Valor: typeof v === "number" && isFinite(v) ? v.toFixed(2) : "—",
          Explicacion: explicaciones[k] || "",
          Interpretacion: interpretaciones[k] || "",
        }))
    );

    const hojaConclusiones = XLSX.utils.json_to_sheet(
      conclusiones.map((c, i) => ({ N: i + 1, Diagnostico: c }))
    );

    const hojaEvolucion = XLSX.utils.json_to_sheet(
      evolucionMensual.map((r) => ({
        Mes: r.mes,
        Utilidad_Neta: r.utilidad_neta,
        Rentabilidad: r.rentabilidad,
      }))
    );

    const hojaLecturaEjecutiva = XLSX.utils.json_to_sheet(
      (resumenBalance?.narrativa || []).map((c: string, i: number) => ({
        N: i + 1,
        Lectura_Ejecutiva: c,
      }))
    );

    const hojaAlertas = XLSX.utils.json_to_sheet(
      (resumenBalance?.alertas || []).map((c: string, i: number) => ({
        N: i + 1,
        Alerta: c,
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, hojaResumen, "Resumen_Tecnico");
    XLSX.utils.book_append_sheet(wb, hojaIndicadores, "Indicadores");
    XLSX.utils.book_append_sheet(wb, hojaConclusiones, "Conclusiones");
    XLSX.utils.book_append_sheet(wb, hojaEvolucion, "Evolucion_Mensual");

    if ((resumenBalance?.narrativa || []).length > 0) {
      XLSX.utils.book_append_sheet(wb, hojaLecturaEjecutiva, "Lectura_Ejecutiva");
    }

    if ((resumenBalance?.alertas || []).length > 0) {
      XLSX.utils.book_append_sheet(wb, hojaAlertas, "Alertas_Balance");
    }

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buf], { type: "application/octet-stream" }),
      `indicadores_financieros_auxiliares_${anio}_${mesInicio}_${mesFin}.xlsx`
    );
  };

  const kpisPrincipales = ["liquidez", "apalancamiento", "rentabilidad", "autonomia"];
  const kpisComplementarios = [
    "capital_trabajo",
    "cobertura_activo_pasivo",
    "porcentaje_activo_no_corriente",
    "porcentaje_pasivo_corto",
    "solvencia",
    "endeudamiento_largo_plazo",
  ];

  const tarjetasEjecutivas = useMemo(
    () => [
      {
        key: "activo_total",
        titulo: "Activo Total",
        valor: indicadores["activo_total"] ?? null,
        detalle: "Total de recursos controlados por la empresa al corte final",
        icon: <Wallet size={18} />,
        color: "emerald" as const,
      },
      {
        key: "pasivo_total",
        titulo: "Pasivo Total",
        valor: indicadores["pasivo_total"] ?? null,
        detalle: "Obligaciones acumuladas con terceros al corte final",
        icon: <Landmark size={18} />,
        color: "blue" as const,
      },
      {
        key: "patrimonio",
        titulo: "Patrimonio",
        valor: indicadores["patrimonio"] ?? null,
        detalle: "Base patrimonial o capital propio al corte final",
        icon: <ShieldCheck size={18} />,
        color: "sky" as const,
      },
      {
        key: "utilidad_neta",
        titulo: "Utilidad Neta",
        valor: indicadores["utilidad_neta"] ?? null,
        detalle: "Resultado del período seleccionado",
        icon: <TrendingUp size={18} />,
        color: "indigo" as const,
        highlight: true,
      },
    ],
    [indicadores]
  );

  const dataGrafica = useMemo(
    () =>
      (evolucionMensual || []).map((r) => ({
        ...r,
        mes_label: nombreMesCorto(r.mes),
      })),
    [evolucionMensual]
  );

  return (
    <div className="space-y-4 p-5 bg-slate-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Indicadores Financieros desde Auxiliares
            <span className="text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">
              Premium
            </span>
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-1">
            Lectura ejecutiva del balance y del resultado del período con KPIs automáticos.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={exportarExcel}
              disabled={!resumen.length}
              className="flex items-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-black hover:bg-emerald-100 transition-all border border-emerald-100 disabled:opacity-50"
            >
              <Download size={16} />
              Exportar Excel
            </button>

            <button
              onClick={cargar}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-70"
            >
              <RefreshCcw className={loading ? "animate-spin" : ""} size={16} />
              {loading ? "Calculando..." : "Calcular indicadores"}
            </button>
          </div>

          <p className="text-slate-400 text-[10px] font-semibold italic">
            Balance al corte final + Estado de resultados del período seleccionado
          </p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-[2rem] border shadow-sm items-end justify-between">
        <div className="flex gap-4 flex-wrap">
          <div className="flex flex-col min-w-[140px]">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">
              Año
            </label>
            <Input
              type="number"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="rounded-xl text-xs font-bold bg-slate-50"
            />
          </div>

          <div className="flex flex-col min-w-[140px]">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">
              Mes inicio
            </label>
            <Input
              type="number"
              value={mesInicio}
              onChange={(e) => setMesInicio(Number(e.target.value))}
              className="rounded-xl text-xs font-bold bg-slate-50"
            />
          </div>

          <div className="flex flex-col min-w-[140px]">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">
              Mes fin
            </label>
            <Input
              type="number"
              value={mesFin}
              onChange={(e) => setMesFin(Number(e.target.value))}
              className="rounded-xl text-xs font-bold bg-slate-50"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-slate-700 max-w-2xl">
          Esta página combina la lógica de <strong>balance al corte</strong> con la de{" "}
          <strong>resultado del período</strong> para producir una lectura financiera más completa.
        </div>
      </div>

      {/* META */}
      {meta && (
        <Card className="rounded-[2rem] border shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 leading-6">
              <strong>Fuente:</strong> Auxiliar contable &nbsp;|&nbsp;
              <strong>P&amp;L desde:</strong> {meta.fecha_desde} &nbsp;|&nbsp;
              <strong>P&amp;L hasta:</strong> {meta.fecha_hasta} &nbsp;|&nbsp;
              <strong>Balance al corte:</strong> {meta.fecha_corte_balance || meta.fecha_hasta}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CÓMO INTERPRETAR */}
      <Card className="rounded-[2rem] border-amber-200 bg-amber-50/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-black text-amber-800 uppercase tracking-wide">
            🧠 Cómo interpretar este reporte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-slate-700">
          <p>
            Esta página combina dos lógicas contables distintas para evitar confusiones:
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-amber-200 bg-white p-4">
              <p className="font-semibold">Balance al corte final</p>
              <p className="text-slate-600">
                Activo, pasivo, patrimonio, liquidez, solvencia, autonomía y capital de trabajo
                se calculan con la lógica del balance general acumulado hasta la fecha final seleccionada.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-white p-4">
              <p className="font-semibold">Resultado del período</p>
              <p className="text-slate-600">
                Ingresos, costos, gastos, utilidad neta y rentabilidad se calculan solo con los movimientos
                del período elegido.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-white p-4">
              <p className="font-semibold">Consistencia</p>
              <p className="text-slate-600">
                Los indicadores compartidos con Balance General deben coincidir para el mismo corte.
                La evolución mensual, por ahora, refleja el comportamiento del P&amp;L.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LECTURA EJECUTIVA */}
      {resumenBalance?.narrativa?.length > 0 && (
        <Card className="rounded-[2rem] border-none overflow-hidden bg-white shadow-2xl">
          <div className="bg-slate-900 px-8 py-5 text-white">
            <h3 className="font-black text-lg uppercase tracking-widest">
              Lectura Ejecutiva del Balance al Corte
            </h3>
            <p className="mt-1 text-xs text-slate-300">
              Interpretación automática del estado de situación financiera al cierre seleccionado.
            </p>
          </div>
          <CardContent className="p-6">
            <div className="rounded-2xl border bg-slate-50 p-4">
              <ul className="space-y-2 text-sm text-slate-800">
                {resumenBalance.narrativa.map((txt: string, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span>•</span>
                    <span>{txt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ALERTAS */}
      {resumenBalance?.alertas?.length > 0 && (
        <Card className="rounded-[2rem] border border-amber-200 bg-amber-50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-black text-amber-800 uppercase tracking-wide flex items-center gap-2">
              <AlertTriangle size={16} />
              Alertas y observaciones del balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-amber-200 bg-white p-4">
              <ul className="space-y-2 text-sm text-slate-800">
                {resumenBalance.alertas.map((txt: string, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span>•</span>
                    <span>{txt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TARJETAS EJECUTIVAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {tarjetasEjecutivas.map((item) => (
          <ExecutiveStatCard
            key={item.key}
            title={item.titulo}
            value={abreviarMoneda(item.valor)}
            detail={item.detalle}
            icon={item.icon}
            color={item.color}
            highlight={item.highlight}
            description={INDICADOR_INFO[item.key] || item.detalle}
          />
        ))}
      </div>

      {/* INDICADORES CLAVE */}
      {Object.keys(indicadores).length > 0 && (
        <Card className="rounded-[2rem] shadow-xl border-none bg-white p-2">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-black text-slate-500 uppercase tracking-tight flex justify-between">
              <span>📊 Indicadores Financieros Clave</span>
              <div className="flex gap-4 text-[10px]">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Saludable
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-400"></div> Atención
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div> Riesgo
                </span>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-4 space-y-8">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Activity size={16} className="text-indigo-600" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                  KPIs Principales
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {kpisPrincipales.map((k) => (
                  <IndicadorCard
                    key={k}
                    k={k}
                    v={indicadores[k]}
                    explicacion={explicaciones[k]}
                    interpretacion={interpretaciones[k]}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2">
                <BarChart3 size={16} className="text-emerald-600" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                  Indicadores Complementarios
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {kpisComplementarios.map((k) => (
                  <IndicadorCard
                    key={k}
                    k={k}
                    v={indicadores[k]}
                    explicacion={explicaciones[k]}
                    interpretacion={interpretaciones[k]}
                    compact
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* EVOLUCIÓN */}
      <Card className="rounded-[2rem] shadow-xl border-none bg-white p-2">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-black text-slate-500 uppercase tracking-tight">
            📉 Evolución Mensual del Período
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-8">
          <div className="rounded-2xl border bg-white p-4">
            <h4 className="mb-3 text-[11px] font-black uppercase tracking-widest text-slate-500">
              Utilidad neta mensual
            </h4>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataGrafica} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="mes_label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: "bold" }}
                  />
                  <YAxis
                    tickFormatter={(v) => abreviarMoneda(v)}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip content={<CustomLineTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="utilidad_neta"
                    name="Utilidad neta"
                    stroke="#4f46e5"
                    strokeWidth={4}
                    dot={{ r: 4, fill: "#4f46e5", strokeWidth: 2, stroke: "#fff" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <h4 className="mb-3 text-[11px] font-black uppercase tracking-widest text-slate-500">
              Rentabilidad mensual
            </h4>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataGrafica} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="mes_label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: "bold" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip content={<CustomLineTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="rentabilidad"
                    name="Rentabilidad"
                    stroke="#10b981"
                    strokeWidth={4}
                    dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            La evolución mensual de esta página muestra, por ahora, el comportamiento de utilidad neta
            y rentabilidad del período. Los indicadores de balance del encabezado corresponden al corte
            final seleccionado, no a cada mes individual.
          </div>
        </CardContent>
      </Card>

      {/* RESUMEN TÉCNICO */}
      {resumen.length > 0 && (
        <Card className="rounded-[2rem] shadow-2xl border-none overflow-hidden bg-white">
          <div className="bg-slate-900 text-white px-8 py-5">
            <h2 className="font-black text-lg uppercase tracking-widest">
              Resumen Técnico del Análisis
            </h2>
            <p className="text-slate-400 text-xs mt-1 font-medium">
              Lectura contable resumida del período y del corte financiero.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-slate-100 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b">
                  <th className="py-4 px-6 text-left">Clase contable</th>
                  <th className="py-4 px-4 text-center">Valor</th>
                  <th className="py-4 px-6 text-left">Interpretación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resumen.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-6 font-semibold text-slate-800">{r.clase}</td>
                    <td className="py-3 px-4 text-center font-mono text-slate-700">{fmtNum(r.valor)}</td>
                    <td className="py-3 px-6 text-slate-600">{r.interpretacion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* DIAGNÓSTICO */}
      {conclusiones.length > 0 && (
        <Card className="rounded-[2rem] shadow-sm border bg-white">
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                Diagnóstico financiero automático
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Lectura ejecutiva generada a partir de la estructura del balance y el comportamiento del período.
              </p>
            </div>

            <div className="border rounded-2xl p-4 bg-slate-50">
              <div className="space-y-2">
                {conclusiones.map((c, i) => (
                  <div
                    key={i}
                    className="text-sm text-slate-700 bg-white rounded-xl px-3 py-2 border border-slate-100"
                  >
                    {c}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* NOTAS TÉCNICAS */}
      {metaBalance && (
        <Card className="rounded-[2rem] border-slate-200 bg-slate-50/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wide">
              🧩 Notas técnicas del balance reconstruido
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 leading-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border bg-white p-4">
                <p className="font-semibold">Patrimonio reconstruido</p>
                <p className="mt-2">
                  <strong>Patrimonio reportado:</strong>{" "}
                  {formatCurrency(metaBalance?.patrimonio?.patrimonio_explicito_total || 0)}
                </p>
                <p>
                  <strong>Patrimonio calculado:</strong>{" "}
                  {formatCurrency(metaBalance?.patrimonio?.patrimonio_calculado_total || 0)}
                </p>
                <p>
                  <strong>Patrimonio total:</strong>{" "}
                  {formatCurrency(metaBalance?.patrimonio?.patrimonio_total || 0)}
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-4">
                <p className="font-semibold">Activo no corriente</p>
                <p className="mt-2">
                  <strong>Bruto:</strong>{" "}
                  {formatCurrency(metaBalance?.activo_no_corriente?.bruto_total || 0)}
                </p>
                <p>
                  <strong>Contra cuentas / ajustes:</strong>{" "}
                  {formatCurrency(metaBalance?.activo_no_corriente?.contra_total || 0)}
                </p>
                <p>
                  <strong>Neto:</strong>{" "}
                  {formatCurrency(metaBalance?.activo_no_corriente?.neto_total || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}