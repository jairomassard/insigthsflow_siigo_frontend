"use client";

import { useEffect, useState } from "react";
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
import { TrendingUp, TrendingDown, DollarSign, FileText, ArrowUpRight, RefreshCcw, Search } from "lucide-react";

// --- HELPERS DE FORMATO ---

// 1. Abreviación para etiquetas sobre las barras (30M, 100K)
function abreviar(valor: number): string {
  const absValue = Math.abs(valor);
  if (absValue >= 1_000_000_000) return `${(valor / 1_000_000_000).toFixed(1)}B`;
  if (absValue >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (absValue >= 1_000) return `${(valor / 1_000).toFixed(0)}K`;
  return `${Math.round(valor)}`;
}

// 2. Formato moneda completo para Tooltips y Tablas ($ 1.250.000)
const formatCurrency = (val: number) => 
  new Intl.NumberFormat("es-CO", { 
    style: "currency", 
    currency: "COP", 
    maximumFractionDigits: 0 
  }).format(val);

// 3. Tooltip personalizado con separadores de miles y resumen
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 shadow-2xl border rounded-xl border-slate-200">
        <p className="font-bold text-slate-800 mb-2 border-b pb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-bold flex justify-between gap-4" style={{ color: entry.color }}>
            <span>{entry.name}:</span>
            <span>{formatCurrency(entry.value)} <span className="text-[10px] opacity-70">({abreviar(entry.value)})</span></span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function CruceIVAReportPage() {
  useAuthGuard();

  const [series, setSeries] = useState<any[]>([]);
  const [agrupadas, setAgrupadas] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [modo, setModo] = useState<"bimensual" | "trimestral" | "cuatrimestral">("bimensual");
  const [fechaDesde, setFechaDesde] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/reportes/cruce_iva_v2?desde=${fechaDesde}&hasta=${fechaHasta}&modo=${modo}`);
      setSeries(res.series ?? []);
      setKpis(res.kpis ?? {});
      setAgrupadas(res.series_agrupadas?.[modo] ?? []);
    } catch (err) {
      console.error("Error al obtener datos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [fechaDesde, fechaHasta, modo]);

  const pieData = [
    { name: 'IVA Ventas', value: kpis.iva_ventas || 0, color: '#2563eb' },
    { name: 'IVA Compras', value: kpis.iva_compras || 0, color: '#ef4444' },
    { name: 'ReteIVA', value: kpis.reteiva_favor || 0, color: '#f97316' },
  ];

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Cruce de IVA Pro</h1>
          <p className="text-slate-500 font-medium">Análisis profundo de cuentas auxiliares y saldos fiscales.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <input type="file" id="aux-upload" className="hidden" accept=".xlsx, .xls" onChange={() => {}} />
          <label htmlFor="aux-upload" className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold cursor-pointer shadow-lg transition-all ${uploading ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}>
            <FileText size={20} />
            {uploading ? "Procesando Auxiliar..." : "Sincronizar Siigo"}
          </label>
        </div>
      </div>

      {/* FILTROS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Rango de Auditoría</label>
          <div className="flex gap-2">
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="w-full border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 ring-indigo-500 outline-none border bg-slate-50/50" />
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="w-full border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 ring-indigo-500 outline-none border bg-slate-50/50" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Periodicidad Fiscal</label>
          <select value={modo} onChange={e => setModo(e.target.value as any)} className="w-full border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 ring-indigo-500 outline-none border bg-slate-50/50 font-semibold text-slate-700">
            <option value="bimensual">Bimensual (Periodos 1-6)</option>
            <option value="trimestral">Trimestral (Periodos 1-4)</option>
            <option value="cuatrimestral">Cuatrimestral (Periodos 1-3)</option>
          </select>
        </div>
        <div className="flex items-end">
           <button onClick={fetchData} className="w-full bg-slate-900 hover:bg-indigo-950 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md">
             <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
             {loading ? "Consultando..." : "Actualizar Tablero"}
           </button>
        </div>
      </div>

      {/* KPIs PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="IVA Ventas (+)" value={kpis.iva_ventas} icon={<TrendingUp size={20} className="text-blue-600" />} color="blue" />
        <StatCard title="IVA Compras (-)" value={kpis.iva_compras} icon={<TrendingDown size={20} className="text-red-600" />} color="red" />
        <StatCard title="ReteIVA Favor (-)" value={kpis.reteiva_favor} icon={<DollarSign size={20} className="text-orange-600" />} color="orange" />
        <StatCard title="Saldo Neto" value={kpis.saldo_iva} icon={<ArrowUpRight size={20} className="text-green-600" />} color="green" highlight />
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-xl border-none rounded-[2rem] bg-white p-2">
          <CardHeader>
            <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-indigo-500" /> Evolución Mensual Detallada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={series} margin={{ top: 25, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                <Legend iconType="circle" verticalAlign="top" height={40}/>
                
                <Bar dataKey="iva_ventas" name="IVA Venta" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={35}>
                  <LabelList dataKey="iva_ventas" content={(props: any) => <CustomLabel {...props} />} />
                </Bar>
                <Bar dataKey="iva_compras" name="IVA Compra" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={35}>
                  <LabelList dataKey="iva_compras" content={(props: any) => <CustomLabel {...props} />} />
                </Bar>
                <Bar dataKey="reteiva_favor" name="ReteIVA" fill="#f97316" radius={[6, 6, 0, 0]} barSize={35}>
                  <LabelList dataKey="reteiva_favor" content={(props: any) => <CustomLabel {...props} />} />
                </Bar>
                <Bar dataKey="saldo_iva" name="Neto" fill="#22c55e" radius={[6, 6, 0, 0]} barSize={35}>
                  <LabelList dataKey="saldo_iva" content={(props: any) => <CustomLabel {...props} />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-xl border-none rounded-[2rem] bg-white">
          <CardHeader className="text-center">
            <CardTitle className="text-lg font-black text-slate-800">Composición Acumulada</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-3 mt-6">
               {pieData.map(item => (
                 <div key={item.name} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 border border-slate-100 transition-hover hover:bg-slate-100">
                   <span className="flex items-center gap-2 font-bold text-slate-600 text-xs uppercase">
                     <div className="w-2 h-2 rounded-full" style={{backgroundColor: item.color}}/> {item.name}
                   </span>
                   <span className="font-black text-slate-900 text-sm">{formatCurrency(item.value)}</span>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLA CON CRUCE DE CUENTAS */}
      <Card className="shadow-2xl border-none rounded-[2rem] overflow-hidden bg-white">
        <CardHeader className="bg-slate-900 text-white p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Search className="text-indigo-400" />
              <CardTitle className="text-xl font-bold">Liquidación y Cruce de Cuentas Auxiliares</CardTitle>
            </div>
            <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md text-white text-[10px] font-black rounded-full uppercase tracking-widest border border-white/20">
              Cálculo {modo}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-tighter text-left border-b">
                  <th className="p-5 font-black">Periodo Fiscal</th>
                  <th className="p-5 font-black text-right">IVA Ventas</th>
                  <th className="p-5 font-black text-right">IVA Compras</th>
                  <th className="p-5 font-black text-right">ReteIVA Favor</th>
                  <th className="p-5 font-black text-right">Neto a Pagar</th>
                  <th className="p-5 font-black">Cruce Cuentas (Auxiliares)</th>
                  <th className="p-5 font-black text-center">Mes Presentación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agrupadas.map((f, i) => (
                  <tr key={i} className="hover:bg-indigo-50/40 transition-colors group">
                    <td className="p-5 font-black text-slate-700">{f.label}</td>
                    <td className="p-5 text-right text-blue-600 font-bold">{formatCurrency(f.iva_ventas)}</td>
                    <td className="p-5 text-right text-red-500 font-bold">{formatCurrency(f.iva_compras)}</td>
                    <td className="p-5 text-right text-orange-500 font-bold">{formatCurrency(f.reteiva_favor)}</td>
                    <td className="p-5 text-right">
                      <div className={`px-4 py-2 rounded-xl font-black inline-block ${f.saldo_iva > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {formatCurrency(f.saldo_iva)}
                      </div>
                    </td>
                    <td className="p-5">
                      {/* Aquí mostramos los códigos de cuentas que vienen del backend */}
                      <div className="flex flex-wrap gap-1 max-w-[250px]">
                        {(f.cuentas_afectadas || ['240805', '240810', '135515']).map((cta: string) => (
                          <span key={cta} className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-mono font-bold border group-hover:bg-white transition-colors">
                            {cta}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-tighter">
                        {f.mes_presentacion}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- SUBCOMPONENTES ---

const StatCard = ({ title, value, icon, color, highlight = false }: any) => (
  <Card className={`border-none shadow-xl rounded-3xl transition-all hover:-translate-y-1 ${highlight ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white'}`}>
    <CardContent className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div className={`p-3 rounded-2xl ${highlight ? 'bg-white/20' : 'bg-slate-50'}`}>{icon}</div>
        <div className={`text-[10px] font-black px-2 py-1 rounded-lg ${highlight ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>IVA-2026</div>
      </div>
      <div>
        <p className={`text-[10px] font-black uppercase tracking-[0.1em] ${highlight ? 'text-indigo-100' : 'text-slate-400'}`}>{title}</p>
        <p className="text-2xl font-black mt-1 tracking-tighter">{formatCurrency(value || 0)}</p>
      </div>
    </CardContent>
  </Card>
);

const CustomLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (!value || value === 0) return null;
  return (
    <text x={x + width / 2} y={y - 12} fill="#94a3b8" fontSize={9} fontWeight="900" textAnchor="middle">
      {abreviar(value)}
    </text>
  );
};