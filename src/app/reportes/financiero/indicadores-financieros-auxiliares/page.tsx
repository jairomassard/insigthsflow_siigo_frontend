"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { authFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Info,
  Settings,
  X,
  Save,
  SlidersHorizontal,
  CheckCircle2,
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
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return formatCurrency(n);
}

function nombreMesCorto(mes: string): string {
  if (!mes || !mes.includes("-")) return mes || "";
  const [year, month] = mes.split("-");
  const fecha = new Date(Number(year), Number(month) - 1, 1);
  return fecha.toLocaleDateString("es-CO", { month: "short", year: "2-digit" });
}

function nombreIndicador(k: string): string {
  const labels: Record<string, string> = {
    liquidez: "Liquidez corriente",
    apalancamiento: "Apalancamiento",
    rentabilidad: "Rentabilidad neta",
    autonomia: "Autonomía financiera",
    capital_trabajo: "Capital de trabajo",
    porcentaje_activo_no_corriente: "Activo no corriente",
    porcentaje_pasivo_corto: "Pasivo corto plazo",
    solvencia: "Solvencia",
    endeudamiento_largo_plazo: "Endeudamiento largo plazo",
    roe: "ROE (rentab. patrimonio)",
    roa: "ROA (rentab. activos)",
    prueba_acida: "Prueba ácida",
    dso_dias_cobro: "Días de cobro (DSO)",
    dpo_dias_pago: "Días de pago (DPO)",
    cobertura_intereses: "Cobertura de intereses",
    activo_total: "Activo total",
    pasivo_total: "Pasivo total",
    patrimonio: "Patrimonio",
    utilidad_neta: "Utilidad neta",
  };

  return labels[k] || k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function valorIndicador(k: string, v: number | null | undefined) {
  if (["capital_trabajo", "activo_total", "pasivo_total", "patrimonio", "utilidad_neta"].includes(k)) {
    return abreviarMoneda(v);
  }
  if (["dso_dias_cobro", "dpo_dias_pago"].includes(k)) {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
    return `${fmt2(v)} días`;
  }
  return fmt2(v);
}

function valorEjecutivoCompleto(k: string, v: number | null | undefined) {
  if (["activo_total", "pasivo_total", "patrimonio", "utilidad_neta"].includes(k)) {
    return formatCurrency(v);
  }

  return valorIndicador(k, v);
}

function toInputValue(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function parseNumberOrNull(v: string): number | null {
  if (v === null || v === undefined) return null;
  const clean = String(v).trim().replace(",", ".");
  if (!clean) return null;
  const num = Number(clean);
  return Number.isFinite(num) ? num : null;
}

const INDICADOR_INFO: Record<string, string> = {
  liquidez:
    "Mide cuántas veces el activo corriente cubre el pasivo corriente. Su lectura depende del ciclo operativo de la empresa.",
  apalancamiento:
    "Mide qué proporción de los activos está financiada con deuda. La lectura depende del modelo de negocio y la estructura de capital.",
  rentabilidad:
    "Mide el margen neto del período seleccionado: utilidad neta dividida entre ingresos.",
  autonomia:
    "Refleja qué proporción del activo está financiada con recursos propios.",
  capital_trabajo:
    "Activo corriente menos pasivo corriente. Muestra la diferencia entre recursos corrientes y obligaciones corrientes.",
  porcentaje_activo_no_corriente:
    "Indica qué proporción del activo total está concentrada en activos no corrientes o de permanencia.",
  porcentaje_pasivo_corto:
    "Mide qué parte del pasivo total vence en el corto plazo.",
  solvencia:
    "Mide la cobertura general de pasivos con activos.",
  endeudamiento_largo_plazo:
    "Mide la relación entre deuda de largo plazo y patrimonio.",
  roe:
    "Utilidad neta dividida entre el patrimonio. Mide el rendimiento que obtienen los socios sobre su capital invertido - el indicador de rentabilidad que más le importa al dueño de la empresa.",
  roa:
    "Utilidad neta dividida entre el activo total. Mide qué tan eficientemente los activos de la empresa generan utilidad, sin importar cómo se financiaron.",
  prueba_acida:
    "Activo corriente menos inventarios, dividido entre pasivo corriente. Liquidez más estricta que la razón corriente porque no depende de vender inventario para pagar deudas.",
  dso_dias_cobro:
    "Días promedio que tarda la empresa en recaudar su cartera, calculado con el saldo real pendiente de clientes y las ventas del período.",
  dpo_dias_pago:
    "Días promedio que la empresa tarda en pagar a sus proveedores, calculado con el saldo real pendiente y las compras del período.",
  cobertura_intereses:
    "Utilidad operativa dividida entre los gastos financieros del período. Mide cuántas veces la utilidad alcanza para cubrir el costo de la deuda.",
  activo_total:
    "Representa el total de recursos económicos controlados por la empresa al corte seleccionado.",
  pasivo_total:
    "Representa el total de obligaciones de la empresa con terceros al corte seleccionado.",
  patrimonio:
    "Corresponde al valor residual de la empresa después de restar los pasivos al activo total.",
  utilidad_neta:
    "Resultado final del período después de costos, gastos y demás partidas del estado de resultados.",
};

const CAMPOS_BASE = [
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
];

const CONFIG_FIELDS = [
  "liquidez_min",
  "liquidez_max",
  "apalancamiento_max",
  "rentabilidad_min",
  "autonomia_min",
  "solvencia_min",
  "capital_trabajo_min",
  "porcentaje_pasivo_corto_max",
  "porcentaje_activo_no_corriente_max",
  "endeudamiento_largo_plazo_max",
  "roe_min",
  "roa_min",
  "prueba_acida_min",
  "dso_dias_cobro_max",
  "dpo_dias_pago_min",
  "cobertura_intereses_min",
] as const;

type ConfigField = typeof CONFIG_FIELDS[number];

type InterpretacionDetalle = {
  estado?: string;
  severidad?: "ok" | "warning" | "neutral" | string;
  texto?: string;
  valor?: number | null;
  minimo?: number | null;
  maximo?: number | null;
};

type ConfigFinanciera = Partial<Record<ConfigField, number | null>> & {
  id?: number;
  idcliente?: number;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
};

const CONFIG_LABELS: Record<ConfigField, { label: string; help: string; placeholder: string }> = {
  liquidez_min: {
    label: "Liquidez mínima",
    help: "Valor mínimo esperado para Activo corriente / Pasivo corriente.",
    placeholder: "Ej: 1.20",
  },
  liquidez_max: {
    label: "Liquidez máxima",
    help: "Valor máximo interno para controlar exceso de recursos corrientes, si aplica.",
    placeholder: "Ej: 3.00",
  },
  apalancamiento_max: {
    label: "Apalancamiento máximo",
    help: "Máximo aceptado para Pasivo total / Activo total.",
    placeholder: "Ej: 0.70",
  },
  rentabilidad_min: {
    label: "Rentabilidad mínima",
    help: "Mínimo esperado para Utilidad neta / Ingresos.",
    placeholder: "Ej: 0.08",
  },
  autonomia_min: {
    label: "Autonomía mínima",
    help: "Mínimo esperado para Patrimonio / Activo total.",
    placeholder: "Ej: 0.30",
  },
  solvencia_min: {
    label: "Solvencia mínima",
    help: "Mínimo esperado para Activo total / Pasivo total.",
    placeholder: "Ej: 1.30",
  },
  capital_trabajo_min: {
    label: "Capital de trabajo mínimo",
    help: "Valor mínimo esperado en pesos para Activo corriente - Pasivo corriente.",
    placeholder: "Ej: 80000000",
  },
  porcentaje_pasivo_corto_max: {
    label: "Pasivo corto plazo máximo",
    help: "Máximo aceptado para Pasivo corriente / Pasivo total.",
    placeholder: "Ej: 0.65",
  },
  porcentaje_activo_no_corriente_max: {
    label: "Activo no corriente máximo",
    help: "Máximo aceptado para Activo no corriente / Activo total, si aplica.",
    placeholder: "Ej: 0.75",
  },
  endeudamiento_largo_plazo_max: {
    label: "Endeudamiento largo plazo máximo",
    help: "Máximo aceptado para Pasivo no corriente / Patrimonio.",
    placeholder: "Ej: 1.00",
  },
  roe_min: {
    label: "ROE mínimo",
    help: "Mínimo esperado para Utilidad neta / Patrimonio (rentabilidad sobre el capital propio).",
    placeholder: "Ej: 0.15",
  },
  roa_min: {
    label: "ROA mínimo",
    help: "Mínimo esperado para Utilidad neta / Activo total (rentabilidad sobre los activos).",
    placeholder: "Ej: 0.05",
  },
  prueba_acida_min: {
    label: "Prueba ácida mínima",
    help: "Mínimo esperado para (Activo corriente - Inventarios) / Pasivo corriente.",
    placeholder: "Ej: 1.00",
  },
  dso_dias_cobro_max: {
    label: "Días de cobro máximo (DSO)",
    help: "Máximo de días aceptado para recaudar la cartera de clientes.",
    placeholder: "Ej: 45",
  },
  dpo_dias_pago_min: {
    label: "Días de pago mínimo (DPO)",
    help: "Mínimo de días esperado antes de pagar a proveedores, para preservar caja.",
    placeholder: "Ej: 30",
  },
  cobertura_intereses_min: {
    label: "Cobertura de intereses mínima",
    help: "Mínimo esperado para Utilidad operativa / Gastos financieros.",
    placeholder: "Ej: 3.00",
  },
};

function getIndicadorTone(detalle?: InterpretacionDetalle, parametrosConfigurados = false) {
  if (!parametrosConfigurados) {
    return {
      card: "bg-white border-slate-200",
      chip: "bg-slate-100 text-slate-600",
      iconWrap: "bg-slate-100 text-slate-500",
      icon: "—",
      label: "Informativo",
    };
  }

  if (!detalle || detalle.estado === "sin_dato") {
    return {
      card: "bg-slate-50 border-slate-200",
      chip: "bg-slate-100 text-slate-600",
      iconWrap: "bg-slate-100 text-slate-500",
      icon: "⚪",
      label: "Sin dato",
    };
  }

  if (detalle.estado === "dentro_rango" || detalle.severidad === "ok") {
    return {
      card: "bg-emerald-50 border-emerald-200",
      chip: "bg-emerald-100 text-emerald-700",
      iconWrap: "bg-emerald-100 text-emerald-700",
      icon: "🟢",
      label: "Dentro del rango",
    };
  }

  if (detalle.estado === "por_debajo" || detalle.estado === "por_encima" || detalle.severidad === "warning") {
    return {
      card: "bg-amber-50 border-amber-200",
      chip: "bg-amber-100 text-amber-700",
      iconWrap: "bg-amber-100 text-amber-700",
      icon: "🟡",
      label: "Fuera del rango",
    };
  }

  return {
    card: "bg-white border-slate-200",
    chip: "bg-slate-100 text-slate-600",
    iconWrap: "bg-slate-100 text-slate-500",
    icon: "—",
    label: "Sin parámetro",
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
  icon: ReactNode;
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
        <p className="mt-2 text-[1.55rem] 2xl:text-[1.75rem] leading-tight font-black tracking-tight break-words">
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
  detalle,
  parametrosConfigurados,
  compact = false,
}: {
  k: string;
  v: number | null | undefined;
  explicacion?: string;
  interpretacion?: string;
  detalle?: InterpretacionDetalle;
  parametrosConfigurados: boolean;
  compact?: boolean;
}) => {
  const tone = getIndicadorTone(detalle, parametrosConfigurados);

  const detalleRango = useMemo(() => {
    if (!parametrosConfigurados || !detalle) return "";
    const partes = [];
    if (detalle.minimo !== null && detalle.minimo !== undefined) partes.push(`Mín: ${fmtNum(detalle.minimo)}`);
    if (detalle.maximo !== null && detalle.maximo !== undefined) partes.push(`Máx: ${fmtNum(detalle.maximo)}`);
    return partes.join(" · ");
  }, [detalle, parametrosConfigurados]);

  return (
    <div className={`rounded-[1.6rem] border p-5 shadow-sm transition-all hover:shadow-md ${tone.card}`}>
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
          {tone.icon}
        </div>
      </div>

      <p className={`${compact ? "text-2xl" : "text-3xl"} mt-4 font-black tracking-tight text-slate-900`}>
        {valorIndicador(k, v)}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${tone.chip}`}>
          {tone.label}
        </span>
        {detalleRango && (
          <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 border border-white">
            {detalleRango}
          </span>
        )}
      </div>

      {explicacion && (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          {explicacion}
        </p>
      )}

      {(interpretacion || detalle?.texto) && (
        <div className="mt-3 rounded-2xl bg-white/80 p-3 text-xs leading-5 text-slate-700 border border-white/70">
          {detalle?.texto || interpretacion}
        </div>
      )}
    </div>
  );
};

const ModoInterpretacionBanner = ({
  parametrosConfigurados,
  modoInterpretacion,
  onOpenConfig,
}: {
  parametrosConfigurados: boolean;
  modoInterpretacion: string;
  onOpenConfig: () => void;
}) => {
  return (
    <Card className={`rounded-[2rem] border shadow-sm ${parametrosConfigurados ? "bg-emerald-50/70 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
      <CardContent className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-3 rounded-2xl ${parametrosConfigurados ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
              {parametrosConfigurados ? <CheckCircle2 size={20} /> : <Info size={20} />}
            </div>
            <div>
              <p className="text-sm font-black text-slate-800 uppercase tracking-widest">
                Modo de interpretación: {parametrosConfigurados ? "Parametrizado" : "Informativo"}
              </p>
              <p className="mt-1 text-sm text-slate-600 leading-6 max-w-4xl">
                {parametrosConfigurados
                  ? "Los indicadores se comparan contra los rangos definidos por esta empresa. Las alertas no usan reglas genéricas de InsightFlow."
                  : "La empresa aún no ha configurado rangos financieros propios. Los indicadores se muestran sin dictamen automático y deben interpretarse según la industria, el modelo operativo y el criterio financiero de la empresa."}
              </p>
              <p className="mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Backend: {modoInterpretacion || (parametrosConfigurados ? "parametrizado" : "sin_parametros")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenConfig}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black text-white shadow-lg transition-all hover:bg-black active:scale-95"
          >
            <Settings size={16} />
            Configurar parámetros
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

const ConfigModal = ({
  open,
  onClose,
  form,
  setForm,
  saving,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: boolean;
  onSave: () => void;
}) => {
  if (!open) return null;

  const groups: { title: string; description: string; fields: ConfigField[] }[] = [
    {
      title: "Liquidez y solvencia",
      description: "Rangos mínimos o máximos para evaluar capacidad de cobertura.",
      fields: ["liquidez_min", "liquidez_max", "solvencia_min", "capital_trabajo_min", "prueba_acida_min"],
    },
    {
      title: "Endeudamiento y estructura",
      description: "Límites internos para deuda y composición del balance.",
      fields: ["apalancamiento_max", "porcentaje_pasivo_corto_max", "porcentaje_activo_no_corriente_max", "endeudamiento_largo_plazo_max", "autonomia_min"],
    },
    {
      title: "Rentabilidad",
      description: "Objetivos mínimos de margen y retorno sobre lo invertido.",
      fields: ["rentabilidad_min", "roe_min", "roa_min"],
    },
    {
      title: "Ciclo de caja y cobertura de deuda",
      description: "Objetivos para el tiempo de cobro/pago y la capacidad de cubrir intereses.",
      fields: ["dso_dias_cobro_max", "dpo_dias_pago_min", "cobertura_intereses_min"],
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl border border-slate-200">
        <div className="flex items-start justify-between gap-4 bg-slate-900 px-6 py-5 text-white">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black uppercase tracking-widest">
              <SlidersHorizontal size={20} className="text-emerald-400" />
              Parámetros financieros empresariales
            </h2>
            <p className="mt-1 text-xs text-slate-300 leading-5">
              Define rangos propios para activar la interpretación contra objetivos internos. Deja vacío lo que no aplique.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[68vh] overflow-y-auto p-6 space-y-5">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 leading-6">
            <strong>Importante:</strong> estos parámetros no son normas universales ni reemplazan el criterio del financiero o contador. Son objetivos internos definidos por la empresa para que InsightFlow compare los indicadores contra esos rangos.
          </div>

          {groups.map((group) => (
            <div key={group.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5">
              <div className="mb-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">{group.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{group.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {group.fields.map((field) => (
                  <label key={field} className="block rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">
                        {CONFIG_LABELS[field].label}
                      </span>
                      <InfoHint text={CONFIG_LABELS[field].help} align="right" />
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      value={form[field] || ""}
                      placeholder={CONFIG_LABELS[field].placeholder}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, [field]: e.target.value }))
                      }
                      className="mt-3 rounded-xl bg-slate-50 text-xs font-bold"
                    />
                    <p className="mt-2 text-[10px] leading-4 text-slate-400">
                      {CONFIG_LABELS[field].help}
                    </p>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t bg-slate-50 px-6 py-4">
          <p className="text-[11px] text-slate-500 leading-5">
            Los valores tipo porcentaje deben ingresarse como decimal. Ejemplo: 70% = 0.70, 8% = 0.08.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-black text-white shadow-lg hover:bg-emerald-700 disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? "Guardando..." : "Guardar parámetros"}
            </button>
          </div>
        </div>
      </div>
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
  const [interpretacionesDetalle, setInterpretacionesDetalle] = useState<Record<string, InterpretacionDetalle>>({});
  const [conclusiones, setConclusiones] = useState<string[]>([]);
  const [evolucionMensual, setEvolucionMensual] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [metaBalance, setMetaBalance] = useState<any>(null);
  const [resumenBalance, setResumenBalance] = useState<any>(null);
  const [configFinanciera, setConfigFinanciera] = useState<ConfigFinanciera | null>(null);
  const [parametrosConfigurados, setParametrosConfigurados] = useState<boolean>(false);
  const [modoInterpretacion, setModoInterpretacion] = useState<string>("sin_parametros");
  const [loading, setLoading] = useState<boolean>(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});

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
      setInterpretacionesDetalle(data.interpretaciones_detalle || {});
      setConclusiones(data.conclusiones || []);
      setEvolucionMensual(data.evolucion_mensual || []);
      setMeta(data.meta || null);
      setMetaBalance(data.meta_balance || null);
      setResumenBalance(data.resumen_balance || null);
      setConfigFinanciera(data.config_financiera || null);
      setParametrosConfigurados(Boolean(data.parametros_configurados));
      setModoInterpretacion(data.modo_interpretacion || data.meta?.modo_interpretacion || "sin_parametros");
    } catch (e) {
      console.error("Error cargando indicadores desde auxiliares:", e);
    } finally {
      setLoading(false);
    }
  };

  const cargarConfig = async () => {
    try {
      const data = await authFetch("/reportes/auxiliares/indicadores-financieros/config");
      const config = data.config || null;
      setConfigFinanciera(config);
      setParametrosConfigurados(Boolean(data.parametros_configurados));
      setModoInterpretacion(data.modo_interpretacion || "sin_parametros");

      const nextForm: Record<string, string> = {};
      CONFIG_FIELDS.forEach((field) => {
        nextForm[field] = toInputValue(config?.[field]);
      });
      setConfigForm(nextForm);
    } catch (e) {
      console.error("Error consultando configuración financiera:", e);
    }
  };

  const abrirModalConfig = async () => {
    await cargarConfig();
    setModalOpen(true);
  };

  const guardarConfig = async () => {
    setSavingConfig(true);
    try {
      const payload: Record<string, number | null | boolean> = { activo: true };
      CONFIG_FIELDS.forEach((field) => {
        payload[field] = parseNumberOrNull(configForm[field] || "");
      });

      const data = await authFetch("/reportes/auxiliares/indicadores-financieros/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setConfigFinanciera(data.config || null);
      setParametrosConfigurados(Boolean(data.parametros_configurados));
      setModoInterpretacion(data.modo_interpretacion || "sin_parametros");
      setModalOpen(false);
      await cargar();
    } catch (e) {
      console.error("Error guardando configuración financiera:", e);
      alert("No fue posible guardar la configuración financiera.");
    } finally {
      setSavingConfig(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        .filter(([k]) => !CAMPOS_BASE.includes(k))
        .map(([k, v]) => ({
          Indicador: k.replace(/_/g, " ").toUpperCase(),
          Valor: typeof v === "number" && isFinite(v) ? v.toFixed(2) : "—",
          Explicacion: explicaciones[k] || "",
          Modo_Interpretacion: parametrosConfigurados ? "Parametrizado" : "Informativo",
          Interpretacion: interpretaciones[k] || "",
          Estado: interpretacionesDetalle[k]?.estado || "",
          Minimo_Empresa: interpretacionesDetalle[k]?.minimo ?? "",
          Maximo_Empresa: interpretacionesDetalle[k]?.maximo ?? "",
        }))
    );

    const hojaConclusiones = XLSX.utils.json_to_sheet(
      (conclusiones || []).map((c, i) => ({ N: i + 1, Lectura: c }))
    );

    const hojaEvolucion = XLSX.utils.json_to_sheet(
      evolucionMensual.map((r) => ({
        Mes: r.mes,
        Utilidad_Neta: r.utilidad_neta,
        Rentabilidad: r.rentabilidad,
      }))
    );

    const hojaConfig = XLSX.utils.json_to_sheet(
      CONFIG_FIELDS.map((field) => ({
        Parametro: field,
        Nombre: CONFIG_LABELS[field].label,
        Valor: configFinanciera?.[field] ?? "",
        Ayuda: CONFIG_LABELS[field].help,
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
    XLSX.utils.book_append_sheet(wb, hojaEvolucion, "Evolucion_Mensual");
    XLSX.utils.book_append_sheet(wb, hojaConfig, "Parametros_Empresa");

    if ((conclusiones || []).length > 0) {
      XLSX.utils.book_append_sheet(wb, hojaConclusiones, "Lectura_Parametrizada");
    }

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

  const kpisPrincipales = ["liquidez", "apalancamiento", "rentabilidad", "autonomia", "roe"];
  const kpisComplementarios = [
    "capital_trabajo",
    "porcentaje_activo_no_corriente",
    "porcentaje_pasivo_corto",
    "solvencia",
    "endeudamiento_largo_plazo",
    "roa",
    "prueba_acida",
    "dso_dias_cobro",
    "dpo_dias_pago",
    "cobertura_intereses",
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
      <ConfigModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        form={configForm}
        setForm={setConfigForm}
        saving={savingConfig}
        onSave={guardarConfig}
      />

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
            Indicadores calculados desde auxiliares. Sin parámetros empresariales, no se emite dictamen automático.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={abrirModalConfig}
              className="flex items-center gap-2 px-4 py-3 bg-slate-100 text-slate-800 rounded-2xl text-xs font-black hover:bg-slate-200 transition-all border border-slate-200"
            >
              <Settings size={16} />
              Parámetros
            </button>

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

          <p className="text-slate-400 text-[10px] font-semibold italic text-right">
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
          <strong>resultado del período</strong>. La interpretación automática solo se activa si la empresa define sus propios parámetros.
        </div>
      </div>

      <ModoInterpretacionBanner
        parametrosConfigurados={parametrosConfigurados}
        modoInterpretacion={modoInterpretacion}
        onOpenConfig={abrirModalConfig}
      />

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
            Esta página calcula indicadores financieros desde la información contable cargada. InsightFlow no emite un dictamen universal sobre la empresa; cuando existen parámetros empresariales, compara los indicadores contra esos rangos internos.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-amber-200 bg-white p-4">
              <p className="font-semibold">Balance al corte final</p>
              <p className="text-slate-600">
                Activo, pasivo, patrimonio, liquidez, solvencia, autonomía y capital de trabajo se calculan con saldos acumulados hasta la fecha final seleccionada.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-white p-4">
              <p className="font-semibold">Resultado del período</p>
              <p className="text-slate-600">
                Ingresos, costos, gastos, utilidad neta y rentabilidad se calculan con los movimientos del período elegido.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-white p-4">
              <p className="font-semibold">Parámetros empresariales</p>
              <p className="text-slate-600">
                Si la empresa configura sus rangos, los indicadores se interpretan contra esos objetivos. Si no, se muestran en modo informativo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LECTURA EJECUTIVA DEL BALANCE */}
      {parametrosConfigurados && resumenBalance?.narrativa?.length > 0 && (
        <Card className="rounded-[2rem] border-none overflow-hidden bg-white shadow-2xl">
          <div className="bg-slate-900 px-8 py-5 text-white">
            <h3 className="font-black text-lg uppercase tracking-widest">
              Lectura Ejecutiva del Balance al Corte
            </h3>
            <p className="mt-1 text-xs text-slate-300">
              Lectura disponible solo bajo parámetros empresariales configurados.
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

      {/* ALERTAS DEL BALANCE */}
      {parametrosConfigurados && resumenBalance?.alertas?.length > 0 && (
        <Card className="rounded-[2rem] border-amber-200 bg-amber-50/70 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-2xl bg-amber-100 text-amber-700">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-900 uppercase tracking-wide">
                  Alertas del balance
                </h3>
                <div className="mt-3 space-y-2">
                  {resumenBalance.alertas.map((txt: string, i: number) => (
                    <div key={i} className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-700">
                      {txt}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TARJETAS EJECUTIVAS */}
      {Object.keys(indicadores).length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tarjetasEjecutivas.map((t) => (
            <ExecutiveStatCard
              key={t.key}
              title={t.titulo}
              value={valorEjecutivoCompleto(t.key, t.valor)}
              detail={t.detalle}
              icon={t.icon}
              color={t.color}
              highlight={t.highlight}
              description={INDICADOR_INFO[t.key] || t.detalle}
            />
          ))}
        </div>
      )}

      {/* INDICADORES */}
      {Object.keys(indicadores).length > 0 && (
        <Card className="rounded-[2rem] shadow-xl border-none bg-white p-2">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-black text-slate-500 uppercase tracking-tight flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <span>📊 Indicadores Financieros Clave</span>
              <div className="flex flex-wrap gap-2 text-[10px]">
                {parametrosConfigurados ? (
                  <>
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Dentro del rango
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                      <div className="w-2 h-2 rounded-full bg-amber-400"></div> Fuera del rango
                    </span>
                  </>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    <Info size={12} /> Modo informativo sin dictamen
                  </span>
                )}
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
                    detalle={interpretacionesDetalle[k]}
                    parametrosConfigurados={parametrosConfigurados}
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
                    detalle={interpretacionesDetalle[k]}
                    parametrosConfigurados={parametrosConfigurados}
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
            La evolución mensual muestra utilidad neta y rentabilidad del período. Los indicadores de balance corresponden al corte final seleccionado, no a cada mes individual.
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

      {/* LECTURA PARAMETRIZADA */}
      {parametrosConfigurados && conclusiones.length > 0 && (
        <Card className="rounded-[2rem] shadow-sm border bg-white">
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                Lectura contra parámetros empresariales
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Esta lectura se genera únicamente contra los rangos definidos por la empresa.
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

            {resumenBalance?.nota_interpretacion && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500 leading-5">
                {resumenBalance.nota_interpretacion}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
