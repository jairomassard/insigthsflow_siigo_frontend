"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  LabelList
} from "recharts";
import {
  Building2,
  Landmark,
  Wallet,
  RefreshCcw,
  Receipt,
  FileBarChart2,
  Info
} from "lucide-react";

// ---------------- HELPERS ----------------
function abreviar(valor: number): string {
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
    maximumFractionDigits: 0
  }).format(val || 0);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 shadow-2xl border rounded-xl border-slate-200">
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

const CustomLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (!value || value === 0) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 12}
      fill="#94a3b8"
      fontSize={9}
      fontWeight="900"
      textAnchor="middle"
    >
      {abreviar(value)}
    </text>
  );
};

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  value
}: any) => {
  if (!value || value === 0) return null;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 24;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#64748b"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={11}
      fontWeight="bold"
    >
      {abreviar(value)}
    </text>
  );
};

const COLORS = [
  "#4f46e5",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#14b8a6",
  "#0f766e",
  "#6366f1"
];

// ---------------- TYPES ----------------
type EvolucionRow = {
  label: string;
  retefuente: number;
  reteica_conceptos: number;
};

type ComposicionRow = {
  cuenta: string;
  concepto: string;
  tipo: string;
  valor: number;
};

type IcaDetalleMensualRow = {
  label: string;
  cuenta: string;
  concepto: string;
  tipo: string;
  valor: number;
};

type ReteFuenteDetalleMensualRow = {
  label: string;
  cuenta: string;
  concepto: string;
  tipo: string;
  valor: number;
};

type Kpis = {
  total_retefuente?: number;
  total_reteica_conceptos?: number;
  total_general?: number;
};

type ReferenciasContables = {
  cuenta_236898?: number;
  nota?: string;
};

// ---------------- PAGE ----------------
export default function RetencionesReportPage() {
  useAuthGuard();

  const [evolucion, setEvolucion] = useState<EvolucionRow[]>([]);
  const [composicion, setComposicion] = useState<ComposicionRow[]>([]);
  const [icaDetalleMensual, setIcaDetalleMensual] = useState<IcaDetalleMensualRow[]>([]);
  const [retefuenteDetalleMensual, setReteFuenteDetalleMensual] = useState<ReteFuenteDetalleMensualRow[]>([]);
  const [kpis, setKpis] = useState<Kpis>({});
  const [referenciasContables, setReferenciasContables] = useState<ReferenciasContables>({});
  const [fechaDesde, setFechaDesde] = useState("2026-01-01");
  const [fechaHasta, setFechaHasta] = useState("2026-12-31");
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await authFetch(
        `/reportes/retenciones_v1?desde=${fechaDesde}&hasta=${fechaHasta}`
      );

      setEvolucion(res.evolucion ?? []);
      setComposicion(res.composicion ?? []);
      setIcaDetalleMensual(res.ica_detalle_mensual ?? []);
      setReteFuenteDetalleMensual(res.retefuente_detalle_mensual ?? []);
      setKpis(res.kpis ?? {});
      setReferenciasContables(res.referencias_contables ?? {});
    } catch (err) {
      console.error("Error consultando reporte de retenciones:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fechaDesde, fechaHasta]);

  const topConceptos = useMemo(() => {
    return [...composicion]
      .sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor))
      .slice(0, 7);
  }, [composicion]);

  const detalleIcaAgrupado = useMemo(() => {
    const map = new Map<string, IcaDetalleMensualRow>();

    for (const row of icaDetalleMensual) {
      const key = `${row.label}__${row.cuenta}__${row.concepto}`;
      if (!map.has(key)) {
        map.set(key, { ...row });
      } else {
        const existing = map.get(key)!;
        existing.valor += row.valor;
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.label !== b.label) return a.label.localeCompare(b.label);
      return a.cuenta.localeCompare(b.cuenta);
    });
  }, [icaDetalleMensual]);

  const detalleReteFuenteAgrupado = useMemo(() => {
    const map = new Map<string, ReteFuenteDetalleMensualRow>();

    for (const row of retefuenteDetalleMensual) {
      const key = `${row.label}__${row.cuenta}__${row.concepto}`;
      if (!map.has(key)) {
        map.set(key, { ...row });
      } else {
        const existing = map.get(key)!;
        existing.valor += row.valor;
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.label !== b.label) return a.label.localeCompare(b.label);
      return a.cuenta.localeCompare(b.cuenta);
    });
  }, [retefuenteDetalleMensual]);

  return (
    <div className="space-y-4 p-4 bg-slate-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-[2rem] border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Dashboard Retenciones
            <span className="text-[10px] bg-indigo-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">
              v2.2
            </span>
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-1">
            Control detallado de retenciones DIAN (2365) e ICA operativo del período (236805).
          </p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-[2rem] border shadow-sm items-end">
        <div className="flex flex-col flex-1 min-w-[220px]">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">
            Rango Fiscal de Análisis
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

        <button
          onClick={fetchData}
          className="bg-slate-900 text-white font-black px-6 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-black transition-all shadow-md active:scale-95"
        >
          <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          {loading ? "Consultando..." : "Actualizar Tablero"}
        </button>
      </div>

      {/* KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total ReteFuente (2365)"
          value={kpis.total_retefuente}
          icon={<Landmark size={20} />}
          color="indigo"
        />
        <StatCard
          title="ICA retenido por conceptos (236805)"
          value={kpis.total_reteica_conceptos}
          icon={<Building2 size={20} />}
          color="pink"
        />
        <StatCard
          title="Total Retenciones del Período"
          value={kpis.total_general}
          icon={<Wallet size={20} />}
          color="slate"
          highlight
        />
      </div>

      {/* REFERENCIA CONTABLE 236898 */}
      {!!referenciasContables?.nota && (
        <Card className="rounded-[2rem] shadow-lg border-none bg-white">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 mt-0.5">
                <Info size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-slate-800">
                  Referencia contable informativa
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Cuenta 236898:{" "}
                  <span className="font-black text-slate-700">
                    {formatCurrency(referenciasContables?.cuenta_236898 || 0)}
                  </span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {referenciasContables?.nota}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TENDENCIA MENSUAL */}
      <div className="grid grid-cols-1 gap-5">
        <Card className="rounded-[2rem] shadow-xl border-none bg-white p-2">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-black text-slate-500 uppercase tracking-tight">
              📈 Tendencia mensual de retenciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart
                data={evolucion}
                margin={{ top: 30, right: 10, left: 0, bottom: 0 }}
                barCategoryGap="10%"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fontWeight: "bold" }}
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "20px" }} />

                <Bar
                  dataKey="retefuente"
                  name="ReteFuente (2365)"
                  fill="#4f46e5"
                  radius={[6, 6, 0, 0]}
                  barSize={46}
                >
                  <LabelList
                    dataKey="retefuente"
                    content={(props: any) => <CustomLabel {...props} />}
                  />
                </Bar>

                <Bar
                  dataKey="reteica_conceptos"
                  name="ICA retenido por conceptos (236805)"
                  fill="#ec4899"
                  radius={[6, 6, 0, 0]}
                  barSize={46}
                >
                  <LabelList
                    dataKey="reteica_conceptos"
                    content={(props: any) => <CustomLabel {...props} />}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* TRAZABILIDAD + TORTA */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 rounded-[2rem] shadow-2xl border-none overflow-hidden bg-white">
          <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
            <span className="flex items-center gap-2 font-black text-sm uppercase tracking-widest">
              <Receipt size={18} className="text-indigo-400" />
              Trazabilidad por concepto y cuenta
            </span>
            <span className="text-[10px] font-bold bg-white/10 px-3 py-1 rounded-full border border-white/20 uppercase tracking-tighter">
              Detalle real por cuenta
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b text-slate-400 font-black text-[10px] uppercase">
                <tr>
                  <th className="p-5 text-left">Cuenta</th>
                  <th className="p-5 text-left">Concepto</th>
                  <th className="p-5 text-center">Tipo</th>
                  <th className="p-5 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold">
                {composicion.map((f, i) => (
                  <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="p-5 text-slate-500 font-mono text-xs">{f.cuenta}</td>
                    <td className="p-5 text-slate-700">{f.concepto}</td>
                    <td className="p-5 text-center">
                      <TipoBadge tipo={f.tipo} />
                    </td>
                    <td className="p-5 text-right text-slate-900 font-black">
                      {formatCurrency(f.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="rounded-[2rem] shadow-xl border-none bg-white overflow-hidden">
          <CardHeader className="text-center pb-0">
            <CardTitle className="text-sm font-black text-slate-500 uppercase tracking-widest">
              🎯 Top conceptos retenidos
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={topConceptos}
                  innerRadius={50}
                  outerRadius={78}
                  paddingAngle={4}
                  dataKey="valor"
                  nameKey="concepto"
                  label={renderCustomizedLabel}
                  labelLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                >
                  {topConceptos.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            <div className="w-full space-y-1.5 px-3 pb-4 mt-2 max-h-[420px] overflow-y-auto custom-scrollbar">
              {topConceptos.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-2 rounded-xl bg-slate-50 border border-slate-100 font-bold text-xs"
                >
                  <span className="flex items-center gap-2 truncate max-w-[190px]" title={item.concepto}>
                    <div
                      className="min-w-[10px] h-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="truncate">{item.concepto}</span>
                  </span>
                  <span className="text-slate-800 font-black whitespace-nowrap">
                    {formatCurrency(item.valor)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DETALLE MENSUAL ICA */}
      <Card className="rounded-[2rem] shadow-2xl border-none overflow-hidden bg-white">
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
          <span className="flex items-center gap-2 font-black text-sm uppercase tracking-widest">
            <FileBarChart2 size={18} className="text-pink-400" />
            Detalle mensual de ICA
          </span>
          <span className="text-[10px] font-bold bg-white/10 px-3 py-1 rounded-full border border-white/20 uppercase tracking-tighter">
            236805
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b text-slate-400 font-black text-[10px] uppercase">
              <tr>
                <th className="p-5 text-left">Periodo</th>
                <th className="p-5 text-left">Cuenta</th>
                <th className="p-5 text-left">Concepto</th>
                <th className="p-5 text-center">Tipo</th>
                <th className="p-5 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold">
              {detalleIcaAgrupado.map((f, i) => (
                <tr key={i} className="hover:bg-pink-50/30 transition-colors">
                  <td className="p-5 text-slate-500 font-mono text-xs">{f.label}</td>
                  <td className="p-5 text-slate-500 font-mono text-xs">{f.cuenta}</td>
                  <td className="p-5 text-slate-700">{f.concepto}</td>
                  <td className="p-5 text-center">
                    <TipoBadge tipo={f.tipo} />
                  </td>
                  <td className="p-5 text-right text-slate-900 font-black">
                    {formatCurrency(f.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* DETALLE MENSUAL RETEFUENTE */}
      <Card className="rounded-[2rem] shadow-2xl border-none overflow-hidden bg-white">
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
          <span className="flex items-center gap-2 font-black text-sm uppercase tracking-widest">
            <FileBarChart2 size={18} className="text-indigo-400" />
            Detalle mensual de ReteFuente
          </span>
          <span className="text-[10px] font-bold bg-white/10 px-3 py-1 rounded-full border border-white/20 uppercase tracking-tighter">
            2365
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b text-slate-400 font-black text-[10px] uppercase">
              <tr>
                <th className="p-5 text-left">Periodo</th>
                <th className="p-5 text-left">Cuenta</th>
                <th className="p-5 text-left">Concepto</th>
                <th className="p-5 text-center">Tipo</th>
                <th className="p-5 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold">
              {detalleReteFuenteAgrupado.map((f, i) => (
                <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-5 text-slate-500 font-mono text-xs">{f.label}</td>
                  <td className="p-5 text-slate-500 font-mono text-xs">{f.cuenta}</td>
                  <td className="p-5 text-slate-700">{f.concepto}</td>
                  <td className="p-5 text-center">
                    <TipoBadge tipo={f.tipo} />
                  </td>
                  <td className="p-5 text-right text-slate-900 font-black">
                    {formatCurrency(f.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ---------------- SUBCOMPONENTES ----------------
const TipoBadge = ({ tipo }: { tipo: string }) => {
  const map: Record<string, string> = {
    ReteFuente: "bg-indigo-100 text-indigo-700",
    ReteICA: "bg-pink-100 text-pink-700",
    ReteICA_Devolucion: "bg-rose-100 text-rose-700",
    Otros: "bg-slate-100 text-slate-700"
  };

  const labels: Record<string, string> = {
    ReteFuente: "ReteFuente",
    ReteICA: "ReteICA",
    ReteICA_Devolucion: "Devolución ICA",
    Otros: "Otros"
  };

  return (
    <span className={`text-[10px] px-3 py-1 rounded-full uppercase font-black ${map[tipo] || map.Otros}`}>
      {labels[tipo] || tipo}
    </span>
  );
};

const StatCard = ({ title, value, icon, color, highlight = false }: any) => {
  const themes: any = {
    indigo: "text-indigo-600 bg-white border-slate-100",
    pink: "text-pink-600 bg-white border-slate-100",
    slate: "text-white bg-slate-900 shadow-slate-300"
  };

  return (
    <Card className={`border shadow-lg rounded-[2rem] transition-all hover:scale-[1.02] ${themes[color]}`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div className={`p-3 rounded-2xl ${highlight ? "bg-white/10 text-slate-300" : "bg-slate-50"}`}>
            {icon}
          </div>
          <div className={`text-[9px] font-black px-2 py-1 rounded-lg ${highlight ? "bg-white/10 text-white" : "bg-slate-100 text-slate-400"}`}>
            AUDIT-26
          </div>
        </div>

        <p className={`text-[10px] font-black uppercase tracking-widest ${highlight ? "text-slate-300" : "text-slate-400"}`}>
          {title}
        </p>
        <p className={`text-2xl font-black mt-1 tracking-tighter ${highlight ? "text-white" : "text-slate-900"}`}>
          {formatCurrency(value || 0)}
        </p>
      </CardContent>
    </Card>
  );
};