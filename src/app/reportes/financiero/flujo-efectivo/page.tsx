"use client";

import { useEffect, useState } from "react";
import { API, getToken } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from "recharts";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Landmark,
  Scale,
  FileBarChart2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lightbulb,
  ArrowRightLeft,
  Building2,
  Download,
} from "lucide-react";

type ItemFlujo = {
  cuenta: string;
  nombre: string;
  delta: number;
  efecto_caja?: number;
};

type FlujoEfectivoResponse = {
  ok: boolean;
  error?: string;
  fechas_faltantes?: string[];
  fechas?: { fecha_inicio: string; fecha_fin: string };
  kpis?: {
    utilidad_neta: number;
    dep_amort: number;
    variacion_capital_trabajo: number;
    flujo_operacion: number;
    flujo_inversion: number;
    flujo_financiacion: number;
    total_flujos_calculado: number;
    caja_inicial: number;
    caja_final: number;
    delta_caja_real: number;
    diferencia: number;
    diferencia_pct: number | null;
    cuadra: boolean;
  };
  detalle?: {
    operacion: ItemFlujo[];
    inversion: ItemFlujo[];
    financiacion: ItemFlujo[];
    excluido_patrimonio: ItemFlujo[];
  };
  resumen?: { narrativa: string[] };
};

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function autoFitColumns(ws: XLSX.WorkSheet, rows: Record<string, unknown>[]) {
  const widths: number[] = [];
  rows.forEach((row) => {
    Object.values(row || {}).forEach((value, idx) => {
      const cellValue = value === null || value === undefined ? "" : String(value);
      widths[idx] = Math.max(widths[idx] || 10, cellValue.length + 2);
    });
  });
  ws["!cols"] = widths.map((w) => ({ wch: Math.min(w, 40) }));
}

function formatFechaCorta(fecha?: string | null) {
  if (!fecha) return "";
  const [y, m, d] = fecha.slice(0, 10).split("-");
  if (!y || !m || !d) return fecha;
  return `${d}/${m}/${y}`;
}

function InfoHint({ text, align = "right" }: { text: string; align?: "left" | "right" }) {
  return (
    <div className="relative group/info inline-flex">
      <button
        type="button"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
        aria-label="Ver explicación"
      >
        <HelpCircle size={11} />
      </button>
      <div
        className={`pointer-events-none absolute top-6 z-50 w-64 rounded-2xl border border-slate-200 bg-white text-slate-700 px-3 py-3 text-[11px] leading-5 shadow-2xl opacity-0 scale-95 transition-all duration-200 group-hover/info:opacity-100 group-hover/info:scale-100 ${
          align === "left" ? "left-0" : "right-0"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function StatCardFlujo({
  title,
  value,
  icon,
  color = "slate",
  description,
  highlight = false,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: "emerald" | "red" | "blue" | "indigo" | "slate";
  description: string;
  highlight?: boolean;
}) {
  const themes: Record<string, string> = {
    emerald: "text-emerald-600 bg-white border-slate-100",
    red: "text-red-600 bg-white border-slate-100",
    blue: "text-blue-600 bg-white border-slate-100",
    indigo: "text-indigo-600 bg-white border-slate-100",
    slate: "text-slate-700 bg-white border-slate-100",
  };

  return (
    <Card
      className={`relative overflow-visible border shadow-lg rounded-[2rem] transition-all hover:scale-[1.01] ${
        highlight ? "bg-indigo-600 text-white shadow-indigo-200 border-none" : themes[color]
      }`}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div className={`p-2.5 rounded-2xl ${highlight ? "bg-white/20" : "bg-slate-50"}`}>{icon}</div>
          <InfoHint text={description} />
        </div>
        <p
          className={`text-[9px] font-black uppercase tracking-widest ${
            highlight ? "text-indigo-100" : "text-slate-400"
          }`}
        >
          {title}
        </p>
        <p className="text-[1.9rem] leading-none font-black mt-1 tracking-tighter break-words">{value}</p>
      </CardContent>
    </Card>
  );
}

function CuadraturaBadge({ cuadra, diferencia }: { cuadra: boolean; diferencia: number }) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-xl text-sm font-black ${
        cuadra ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {cuadra ? "CUADRA" : `NO CUADRA (${formatCurrency(diferencia)})`}
    </span>
  );
}

function TablaFlujo({
  titulo,
  items,
  open,
  onToggle,
  colorHeader,
}: {
  titulo: string;
  items: ItemFlujo[];
  open: boolean;
  onToggle: () => void;
  colorHeader: string;
}) {
  const total = items.reduce((acc, it) => acc + (it.efecto_caja ?? it.delta), 0);

  return (
    <Card className="rounded-[2rem] shadow-sm border bg-white overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-all"
      >
        <div className="flex items-center gap-3">
          <span className={`text-xs font-black uppercase tracking-widest ${colorHeader}`}>{titulo}</span>
          <span className="text-[10px] text-slate-400 font-bold">({items.length} cuentas)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-black text-slate-800">{formatCurrency(total)}</span>
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {open && (
        <CardContent className="p-0 border-t">
          {items.length === 0 ? (
            <p className="text-xs text-slate-400 px-6 py-4">Sin movimiento en este periodo.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="text-left font-black px-6 py-2">Cuenta</th>
                  <th className="text-right font-black px-6 py-2">Efecto en caja</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.cuenta} className="border-t border-slate-100">
                    <td className="px-6 py-2 text-slate-700">{it.nombre}</td>
                    <td className="px-6 py-2 text-right text-slate-700 font-semibold">
                      {formatCurrency(it.efecto_caja ?? it.delta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      )}
    </Card>
  );
}

type PasoCascada = {
  label: string;
  base: number;
  valor: number;
  tipo: "total" | "positivo" | "negativo";
  real: number;
};

function CascadaTooltip({ active, payload }: { active?: boolean; payload?: { payload: PasoCascada }[] }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const prefijo = d.tipo === "positivo" ? "+" : "";
  return (
    <div className="bg-white border rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-black text-slate-800">{d.label}</p>
      <p className="text-slate-600 font-semibold">
        {prefijo}
        {formatCurrency(d.real)}
      </p>
    </div>
  );
}

function GraficoCascada({
  cajaInicial,
  flujoOperacion,
  flujoInversion,
  flujoFinanciacion,
  cajaFinal,
}: {
  cajaInicial: number;
  flujoOperacion: number;
  flujoInversion: number;
  flujoFinanciacion: number;
  cajaFinal: number;
}) {
  let running = cajaInicial;
  const pasos = [
    { label: "Operación", delta: flujoOperacion },
    { label: "Inversión", delta: flujoInversion },
    { label: "Financiación", delta: flujoFinanciacion },
  ];

  const data: PasoCascada[] = [
    { label: "Caja Inicial", base: Math.min(cajaInicial, 0), valor: Math.abs(cajaInicial), tipo: "total", real: cajaInicial },
    ...pasos.map((p) => {
      const antes = running;
      const despues = running + p.delta;
      running = despues;
      return {
        label: p.label,
        base: Math.min(antes, despues),
        valor: Math.abs(despues - antes),
        tipo: (p.delta >= 0 ? "positivo" : "negativo") as PasoCascada["tipo"],
        real: p.delta,
      };
    }),
    { label: "Caja Final", base: Math.min(cajaFinal, 0), valor: Math.abs(cajaFinal), tipo: "total", real: cajaFinal },
  ];

  const colorPorTipo: Record<PasoCascada["tipo"], string> = {
    total: "#475569",
    positivo: "#10b981",
    negativo: "#f43f5e",
  };

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 28, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: "bold" }} />
        <YAxis hide />
        <Tooltip content={<CascadaTooltip />} cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="base" stackId="a" fill="transparent" />
        <Bar dataKey="valor" stackId="a" radius={[6, 6, 6, 6]} barSize={56}>
          {data.map((entry, idx) => (
            <Cell key={idx} fill={colorPorTipo[entry.tipo]} />
          ))}
          <LabelList
            dataKey="real"
            position="top"
            formatter={(v: unknown) => formatCurrency(typeof v === "number" ? v : Number(v))}
            style={{ fontSize: 10, fontWeight: 700, fill: "#334155" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function FlujoEfectivoPage() {
  const [mostrarExplicacion, setMostrarExplicacion] = useState(false);
  const [fechasDisponibles, setFechasDisponibles] = useState<string[] | null>(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fechasFaltantes, setFechasFaltantes] = useState<string[]>([]);
  const [data, setData] = useState<FlujoEfectivoResponse | null>(null);

  // Guía al usuario para que solo pueda elegir fechas que SÍ tienen Balance
  // de Prueba real cargado — evita el "elige y falla" de un date picker
  // libre, dado que el backend exige ambas fechas ancladas para confiar
  // en el saldo inicial.
  useEffect(() => {
    const cargarFechas = async () => {
      const token = getToken();
      const res = await fetch(`${API}/reportes/flujo_efectivo_v1/fechas_disponibles`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      const fechas: string[] = json?.fechas || [];
      setFechasDisponibles(fechas);
      if (fechas.length >= 2) {
        setFechaInicio(fechas[fechas.length - 2]);
        setFechaFin(fechas[fechas.length - 1]);
      }
    };
    cargarFechas();
  }, []);

  const [openSections, setOpenSections] = useState({
    operacion: true,
    inversion: false,
    financiacion: false,
    excluido: false,
  });

  const consultar = async () => {
    try {
      setLoading(true);
      setError(null);
      setFechasFaltantes([]);
      const params = new URLSearchParams({ fecha_inicio: fechaInicio, fecha_fin: fechaFin });
      const token = getToken();
      const res = await fetch(`${API}/reportes/flujo_efectivo_v1?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) {
        setData(null);
        setError(json?.error || "No fue posible consultar el flujo de efectivo.");
        setFechasFaltantes(json?.fechas_faltantes || []);
        return;
      }
      setData(json);
    } catch {
      setData(null);
      setError("No fue posible consultar el flujo de efectivo.");
    } finally {
      setLoading(false);
    }
  };

  const exportarExcel = () => {
    if (!data || !data.kpis || !data.fechas) {
      alert("No hay información para exportar.");
      return;
    }
    const kpis = data.kpis;

    const wb = XLSX.utils.book_new();

    const resumenRows = [
      { Campo: "Fecha inicio del periodo", Valor: data.fechas.fecha_inicio },
      { Campo: "Fecha fin del periodo", Valor: data.fechas.fecha_fin },
      { Campo: "Utilidad neta", Valor: kpis.utilidad_neta },
      { Campo: "+ Depreciación/Amortización", Valor: kpis.dep_amort },
      { Campo: "Variación capital de trabajo", Valor: kpis.variacion_capital_trabajo },
      { Campo: "Flujo de Operación", Valor: kpis.flujo_operacion },
      { Campo: "Flujo de Inversión", Valor: kpis.flujo_inversion },
      { Campo: "Flujo de Financiación", Valor: kpis.flujo_financiacion },
      { Campo: "Total 3 flujos (calculado)", Valor: kpis.total_flujos_calculado },
      { Campo: "Caja inicial", Valor: kpis.caja_inicial },
      { Campo: "Caja final", Valor: kpis.caja_final },
      { Campo: "Movimiento real de caja", Valor: kpis.delta_caja_real },
      { Campo: "Diferencia", Valor: kpis.diferencia },
      { Campo: "Diferencia %", Valor: kpis.diferencia_pct },
      { Campo: "Cuadra", Valor: kpis.cuadra ? "Sí" : "No" },
    ];
    const wsResumen = XLSX.utils.json_to_sheet(resumenRows);
    autoFitColumns(wsResumen, resumenRows);
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

    const detalleRows = [
      ...(data.detalle?.operacion || []).map((it) => ({
        Seccion: "Operación",
        Cuenta: it.cuenta,
        Nombre: it.nombre,
        Efecto_en_caja: it.efecto_caja ?? it.delta,
      })),
      ...(data.detalle?.inversion || []).map((it) => ({
        Seccion: "Inversión",
        Cuenta: it.cuenta,
        Nombre: it.nombre,
        Efecto_en_caja: it.efecto_caja ?? it.delta,
      })),
      ...(data.detalle?.financiacion || []).map((it) => ({
        Seccion: "Financiación",
        Cuenta: it.cuenta,
        Nombre: it.nombre,
        Efecto_en_caja: it.efecto_caja ?? it.delta,
      })),
      ...(data.detalle?.excluido_patrimonio || []).map((it) => ({
        Seccion: "Excluido (requiere revisión)",
        Cuenta: it.cuenta,
        Nombre: it.nombre,
        Efecto_en_caja: it.delta,
      })),
    ];
    if (detalleRows.length > 0) {
      const wsDetalle = XLSX.utils.json_to_sheet(detalleRows);
      autoFitColumns(wsDetalle, detalleRows);
      XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle");
    }

    if (data.resumen?.narrativa?.length) {
      const narrativaRows = data.resumen.narrativa.map((txt) => ({ Lectura_ejecutiva: txt }));
      const wsNarrativa = XLSX.utils.json_to_sheet(narrativaRows);
      autoFitColumns(wsNarrativa, narrativaRows);
      XLSX.utils.book_append_sheet(wb, wsNarrativa, "Lectura Ejecutiva");
    }

    const fileName = `flujo_efectivo_${data.fechas.fecha_inicio}_a_${data.fechas.fecha_fin}.xlsx`;
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, fileName);
  };

  const k = data?.kpis;

  return (
    <div className="space-y-4 p-5 bg-slate-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Flujo de Efectivo
            <span className="text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">
              Premium
            </span>
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-1">
            Estado de Flujo de Efectivo, método indirecto — reconstruido a partir de tu Estado de Resultados
            y Balance General.
          </p>
        </div>

        <Button
          onClick={exportarExcel}
          disabled={!data}
          variant="outline"
          className="rounded-2xl px-5 py-3 text-xs font-black border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          <Download size={16} className="mr-2" />
          Excel
        </Button>
      </div>

      {/* EXPLICACIÓN AMIGABLE - pensado para dueños de pyme/mediana empresa,
          no para contadores. Colapsada por defecto para no robarle
          protagonismo al reporte - solo el icono + la pregunta gancho,
          con un toggle para quien quiera leer el resto. */}
      <Card className="rounded-[2rem] border border-blue-100 bg-blue-50/60 shadow-sm">
        <button
          onClick={() => setMostrarExplicacion((v) => !v)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-blue-100/30 transition-all rounded-[2rem]"
        >
          <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0">
            <Lightbulb size={16} />
          </div>
          <h3 className="text-xs md:text-sm font-black text-slate-800 flex-1">
            ¿Por qué mi utilidad no se parece a la plata que tengo en el banco?
          </h3>
          {mostrarExplicacion ? (
            <ChevronUp size={16} className="text-blue-600 shrink-0" />
          ) : (
            <ChevronDown size={16} className="text-blue-600 shrink-0" />
          )}
        </button>

        {mostrarExplicacion && (
          <CardContent className="px-6 pb-6 pt-0">
            <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
              Es la pregunta que más confunde a un dueño de negocio: <i>&quot;si gané tanto, ¿por qué no
              tengo esa plata en el banco?&quot;</i> — o al revés, <i>&quot;si tengo tanta plata, ¿por qué mi
              utilidad se ve tan chica?&quot;</i> Tu Estado de Resultados te dice si ganaste plata y tu
              Balance te dice qué tienes y qué debes, pero ninguno de los dos te explica esto. Este reporte
              sí: te muestra si el efectivo que tienes hoy viene de que tu negocio genuinamente está
              mejorando, o de algo que no se va a repetir (cobrar una cartera vieja, un préstamo nuevo) —
              para que decidas con información real si puedes contratar, invertir, o si debes cuidarte de
              gastar de más pensando que &quot;hay plata&quot;.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <div className="bg-white border border-blue-100 rounded-2xl p-3 flex items-start gap-2.5">
                <Wallet size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-black text-slate-800">Operación</p>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    El efectivo que generó (o consumió) tu negocio del día a día: ventas, cobros, pagos a
                    proveedores y empleados.
                  </p>
                </div>
              </div>
              <div className="bg-white border border-blue-100 rounded-2xl p-3 flex items-start gap-2.5">
                <ArrowRightLeft size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-black text-slate-800">Inversión</p>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Plata usada o recibida por comprar o vender activos: maquinaria, equipos, vehículos.
                  </p>
                </div>
              </div>
              <div className="bg-white border border-blue-100 rounded-2xl p-3 flex items-start gap-2.5">
                <Building2 size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-black text-slate-800">Financiación</p>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Plata que entró o salió por préstamos, tarjetas de crédito, aportes de socios o retiros.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-white border border-blue-100 rounded-2xl px-3 py-2.5 mt-4">
              <span className="text-base leading-none">💡</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Este es uno de los 3 estados financieros que casi todo banco pide para un crédito — y la
                mayoría de las pymes en Colombia no lo tienen listo (toca armarlo a mano en Excel). Aquí lo
                tienes automático, con los datos que ya cargaste.
              </p>
            </div>

            <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
              Cuando ves el badge <b>&quot;CUADRA&quot;</b>, significa que el sistema comparó el resultado
              contra el movimiento real de tu cuenta bancaria — así sabes que el número es confiable, no una
              estimación.
            </p>
          </CardContent>
        )}
      </Card>

      {/* FILTROS */}
      <Card className="rounded-[2rem] border shadow-sm bg-white">
        <CardContent className="p-5">
          {fechasDisponibles === null ? (
            <p className="text-xs text-slate-400 font-medium">Cargando fechas disponibles...</p>
          ) : fechasDisponibles.length < 2 ? (
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
              <p className="text-xs text-slate-600 leading-relaxed">
                Todavía no tienes suficientes Balances de Prueba cargados para usar este reporte — necesitas
                al menos 2 fechas de corte. Sube y aplica el Balance de Prueba real de Siigo desde{" "}
                <a href="/reportes/financiero/balance-general" className="underline font-bold text-slate-800">
                  Balance General
                </a>
                .
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex flex-col min-w-[200px]">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">
                    Desde (inicio del periodo)
                  </label>
                  <select
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold px-3 py-2.5"
                  >
                    {fechasDisponibles.map((f) => (
                      <option key={f} value={f} disabled={f === fechaFin}>
                        {formatFechaCorta(f)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col min-w-[200px]">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">
                    Hasta (fin del periodo)
                  </label>
                  <select
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold px-3 py-2.5"
                  >
                    {fechasDisponibles.map((f) => (
                      <option key={f} value={f} disabled={f === fechaInicio}>
                        {formatFechaCorta(f)}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={consultar}
                  disabled={loading || fechaInicio >= fechaFin}
                  className="rounded-2xl px-6 py-3 text-xs font-black bg-slate-900 hover:bg-black text-white shadow-lg active:scale-95"
                >
                  {loading ? "Consultando..." : "Consultar"}
                </Button>
              </div>
              <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                Solo se muestran las fechas que ya tienen el <b>Balance de Prueba real de Siigo</b> cargado y
                aplicado — así te garantizamos que el resultado va a ser confiable.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* ERROR / FECHAS FALTANTES */}
      {error && (
        <Card className="rounded-[2rem] border border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="p-5 flex gap-3 items-start">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-bold text-amber-900">{error}</p>
              {fechasFaltantes.length > 0 && (
                <p className="text-xs text-amber-800 mt-2">
                  Sube y aplica el Balance de Prueba real de Siigo para:{" "}
                  <b>{fechasFaltantes.map(formatFechaCorta).join(" y ")}</b> desde la página de{" "}
                  <a href="/reportes/financiero/balance-general" className="underline font-bold">
                    Balance General
                  </a>
                  , y vuelve a consultar.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* RESULTADO */}
      {k && data?.fechas && (
        <>
          <p className="text-xs text-slate-500 font-medium px-1">
            Periodo: <b>{formatFechaCorta(data.fechas.fecha_inicio)}</b> →{" "}
            <b>{formatFechaCorta(data.fechas.fecha_fin)}</b>
          </p>

          {/* KPIs de partida */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCardFlujo
              title="Utilidad Neta"
              value={formatCurrency(k.utilidad_neta)}
              icon={<FileBarChart2 size={18} />}
              color="slate"
              description="Utilidad neta del periodo, tomada del Estado de Resultados."
            />
            <StatCardFlujo
              title="+ Depreciación/Amortización"
              value={formatCurrency(k.dep_amort)}
              icon={<TrendingUp size={18} />}
              color="blue"
              description="Gasto no monetario que se revierte porque no representa salida real de caja."
            />
            <StatCardFlujo
              title="Var. Capital de Trabajo"
              value={formatCurrency(k.variacion_capital_trabajo)}
              icon={<Scale size={18} />}
              color="indigo"
              description="Efecto en caja de los cambios en cuentas por cobrar, inventarios, cuentas por pagar y similares."
            />
            <StatCardFlujo
              title="Flujo de Operación"
              value={formatCurrency(k.flujo_operacion)}
              icon={<Wallet size={18} />}
              highlight
              description="Utilidad Neta + Depreciación/Amortización + Variación de Capital de Trabajo."
            />
          </div>

          {/* Los 3 flujos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCardFlujo
              title="Flujo de Operación"
              value={formatCurrency(k.flujo_operacion)}
              icon={<Wallet size={18} />}
              color={k.flujo_operacion >= 0 ? "emerald" : "red"}
              description="Caja generada (o consumida) por la operación normal del negocio."
            />
            <StatCardFlujo
              title="Flujo de Inversión"
              value={formatCurrency(k.flujo_inversion)}
              icon={<TrendingDown size={18} />}
              color={k.flujo_inversion >= 0 ? "emerald" : "red"}
              description="Caja usada o liberada por compra/venta de activos fijos e inversiones."
            />
            <StatCardFlujo
              title="Flujo de Financiación"
              value={formatCurrency(k.flujo_financiacion)}
              icon={<Landmark size={18} />}
              color={k.flujo_financiacion >= 0 ? "emerald" : "red"}
              description="Caja por deuda, capital, socios y accionistas."
            />
          </div>

          {/* Cuadratura */}
          <Card className="rounded-[2rem] border shadow-sm bg-white">
            <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-8">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Total 3 flujos (calculado)
                  </p>
                  <p className="text-xl font-black text-slate-800 mt-1">
                    {formatCurrency(k.total_flujos_calculado)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Movimiento real de caja
                  </p>
                  <p className="text-xl font-black text-slate-800 mt-1">{formatCurrency(k.delta_caja_real)}</p>
                </div>
              </div>
              <div className="flex flex-col items-start md:items-end gap-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cuadratura</p>
                <CuadraturaBadge cuadra={k.cuadra} diferencia={k.diferencia} />
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de cascada: la forma estándar de visualizar un Flujo de
              Efectivo - muestra visualmente el puente entre la caja inicial
              y la caja final a través de los 3 flujos. Con leyenda + ícono
              de ayuda porque sin eso no era obvio qué significaba cada
              color (feedback real: "no me es claro las barras verdes y
              grises, no sé si suma o resta"). */}
          <Card className="rounded-[2rem] border shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                    De tu caja inicial a tu caja final
                  </h3>
                  <InfoHint
                    align="left"
                    text={
                      "Las barras grises son el saldo real de tu cuenta bancaria (inicio y fin del periodo). " +
                      "Las barras de color muestran cuánta caja entró (verde) o salió (rojo) en cada categoría " +
                      "entre esas dos fechas — sumando o restando una tras otra hasta llegar a la caja final."
                    }
                  />
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-slate-600 inline-block" /> Saldo de caja
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Entra caja
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Sale caja
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Saldo inicial: <b className="text-slate-700">{formatCurrency(k.caja_inicial)}</b> — Saldo
                final: <b className="text-slate-700">{formatCurrency(k.caja_final)}</b>
              </p>
              <GraficoCascada
                cajaInicial={k.caja_inicial}
                flujoOperacion={k.flujo_operacion}
                flujoInversion={k.flujo_inversion}
                flujoFinanciacion={k.flujo_financiacion}
                cajaFinal={k.caja_final}
              />
            </CardContent>
          </Card>

          {/* Narrativa */}
          {data.resumen?.narrativa && data.resumen.narrativa.length > 0 && (
            <Card className="rounded-[2rem] shadow-sm border bg-white overflow-hidden">
              <div className="bg-slate-900 text-white px-6 py-5 flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-white/10">
                  <FileBarChart2 size={18} className="text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide">Lectura ejecutiva</h3>
                  <p className="text-xs text-slate-400 mt-1">Interpretación automática del flujo de efectivo.</p>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="bg-slate-50 border rounded-2xl p-4 space-y-2">
                  {data.resumen.narrativa.map((txt, idx) => (
                    <div key={idx} className="text-sm text-slate-800 leading-6">
                      • {txt}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detalle por flujo */}
          {data.detalle && (
            <div className="space-y-3">
              <TablaFlujo
                titulo="Detalle Operación"
                items={data.detalle.operacion}
                open={openSections.operacion}
                onToggle={() => setOpenSections((s) => ({ ...s, operacion: !s.operacion }))}
                colorHeader="text-emerald-700"
              />
              <TablaFlujo
                titulo="Detalle Inversión"
                items={data.detalle.inversion}
                open={openSections.inversion}
                onToggle={() => setOpenSections((s) => ({ ...s, inversion: !s.inversion }))}
                colorHeader="text-blue-700"
              />
              <TablaFlujo
                titulo="Detalle Financiación"
                items={data.detalle.financiacion}
                open={openSections.financiacion}
                onToggle={() => setOpenSections((s) => ({ ...s, financiacion: !s.financiacion }))}
                colorHeader="text-indigo-700"
              />
              {data.detalle.excluido_patrimonio.length > 0 && (
                <Card className="rounded-[2rem] border border-amber-200 bg-amber-50 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setOpenSections((s) => ({ ...s, excluido: !s.excluido }))}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-amber-100/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle size={15} className="text-amber-600" />
                      <span className="text-xs font-black uppercase tracking-widest text-amber-800">
                        Excluido de financiación (requiere revisión)
                      </span>
                    </div>
                    {openSections.excluido ? (
                      <ChevronUp size={16} className="text-amber-600" />
                    ) : (
                      <ChevronDown size={16} className="text-amber-600" />
                    )}
                  </button>
                  {openSections.excluido && (
                    <CardContent className="p-0 border-t border-amber-200">
                      <p className="text-[11px] text-amber-800 px-6 py-3 leading-relaxed">
                        Estas cuentas de patrimonio se movieron en el periodo, pero no se contaron como
                        entrada/salida real de caja porque probablemente son apropiación de una utilidad ya
                        contada arriba, no un aporte o retiro real. Pídele a tu contador que confirme si alguna
                        de estas sí corresponde a un movimiento real de dinero.
                      </p>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-amber-100/60 text-amber-900">
                            <th className="text-left font-black px-6 py-2">Cuenta</th>
                            <th className="text-right font-black px-6 py-2">Movimiento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.detalle.excluido_patrimonio.map((it) => (
                            <tr key={it.cuenta} className="border-t border-amber-100">
                              <td className="px-6 py-2 text-slate-700">{it.nombre}</td>
                              <td className="px-6 py-2 text-right text-slate-700 font-semibold">
                                {formatCurrency(it.delta)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  )}
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
