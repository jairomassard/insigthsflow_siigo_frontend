"use client";

import { useEffect, useState, useRef } from "react";
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
import { TrendingUp, TrendingDown, DollarSign, FileText, ArrowUpRight, RefreshCcw, Search, Info, CheckCircle2 } from "lucide-react";

// --- HELPERS DE FORMATO ---
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
  }).format(val);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 shadow-2xl border rounded-xl border-slate-200">
        <p className="font-bold text-slate-800 mb-2 border-b pb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-bold flex justify-between gap-4" style={{ color: entry.color }}>
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
    <text x={x + width / 2} y={y - 12} fill="#94a3b8" fontSize={9} fontWeight="900" textAnchor="middle">
      {abreviar(value)}
    </text>
  );
};

export default function CruceIVAReportPage() {
  useAuthGuard();

  const [series, setSeries] = useState<any[]>([]);
  const [agrupadas, setAgrupadas] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [modo, setModo] = useState<"bimensual" | "cuatrimestral">("bimensual");
  
  const [fechaDesde, setFechaDesde] = useState("2026-01-01");
  const [fechaHasta, setFechaHasta] = useState("2026-12-31");
  
  const [inc19, setInc19] = useState(true);
  const [inc5, setInc5] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/reportes/cruce_iva_v2?desde=${fechaDesde}&hasta=${fechaHasta}&modo=${modo}&inc19=${inc19}&inc5=${inc5}`);
      setSeries(res.series ?? []);
      setKpis(res.kpis ?? {});
      setAgrupadas(res.series_agrupadas?.[modo] ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("archivo", file);
    try {
      await authFetch("/reportes/cargar_auxiliar", { method: "POST", body: formData });
      alert(`Éxito: Se procesó el auxiliar contable.`);
      fetchData(); 
    } catch (err) {
      alert("Error cargando el archivo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => { fetchData(); }, [fechaDesde, fechaHasta, modo, inc19, inc5]);

  return (
    <div className="space-y-4 p-4 bg-slate-50 min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-[2rem] border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Cruce de IVA <span className="text-[10px] bg-indigo-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">v2.1</span>
          </h1>
          <p className="text-slate-500 text-xs font-medium italic">Ruta Siigo: Contabilidad {'>'} Comprobantes {'>'} Informe auxiliar contable</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx" onChange={handleFileUpload} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-black transition-all shadow-lg active:scale-95"
          >
            {uploading ? <RefreshCcw className="animate-spin" size={16} /> : <FileText size={16} />}
            {uploading ? "Sincronizando..." : "Sincronizar Auxiliar"}
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-5 rounded-[2rem] border shadow-sm">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Rango de Fecha</label>
          <div className="flex gap-2">
            <input type="date" value={fechaDesde} onChange={e=>setFechaDesde(e.target.value)} className="w-full border rounded-xl p-2 text-xs font-bold bg-slate-50" />
            <input type="date" value={fechaHasta} onChange={e=>setFechaHasta(e.target.value)} className="w-full border rounded-xl p-2 text-xs font-bold bg-slate-50" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Periodicidad DIAN</label>
          <select value={modo} onChange={e=>setModo(e.target.value as any)} className="w-full border rounded-xl p-2 text-xs font-bold bg-slate-50">
            <option value="bimensual">Bimensual (Ene-Feb...)</option>
            <option value="cuatrimestral">Cuatrimestral (Ene-Abr...)</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Configurar Tasas</label>
          <div className="flex gap-2">
            <button onClick={()=>setInc19(!inc19)} className={`flex-1 flex items-center justify-center gap-2 rounded-xl border text-[11px] font-black py-2 transition-all ${inc19 ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>
              {inc19 && <CheckCircle2 size={12} />} IVA 19%
            </button>
            <button onClick={()=>setInc5(!inc5)} className={`flex-1 flex items-center justify-center gap-2 rounded-xl border text-[11px] font-black py-2 transition-all ${inc5 ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>
              {inc5 && <CheckCircle2 size={12} />} IVA 5%
            </button>
          </div>
        </div>
        <div className="flex items-end">
          <button onClick={fetchData} className="w-full bg-indigo-50 text-indigo-700 font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 border border-indigo-100 hover:bg-indigo-100">
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} /> {loading ? "Cargando..." : "Actualizar Reporte"}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="IVA Ventas" value={kpis.iva_ventas} icon={<TrendingUp size={20}/>} color="indigo" />
        <StatCard title="IVA Compras" value={kpis.iva_compras} icon={<TrendingDown size={20}/>} color="red" />
        <StatCard title="ReteIVA Favor" value={kpis.reteiva_favor} icon={<DollarSign size={20}/>} color="orange" />
        <StatCard title="Neto a Pagar" value={kpis.saldo_iva} icon={<ArrowUpRight size={20}/>} color="emerald" highlight />
      </div>

      {/* GRÁFICO PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 rounded-[2rem] shadow-xl border-none bg-white p-2">
          <CardHeader className="pb-0"><CardTitle className="text-sm font-black text-slate-500 uppercase tracking-tight">📈 Comparativa por Tasas de IVA</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={series} margin={{ top: 30, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{fontSize: '11px', paddingTop: '20px'}} />
                
                {/* Barras dinámicas con los keys correctos del backend */}
                <Bar dataKey="iva_v19" name="Venta 19%" fill="#4338ca" radius={[4,4,0,0]} barSize={20}>
                   <LabelList dataKey="iva_v19" content={(props: any) => <CustomLabel {...props} />} />
                </Bar>
                <Bar dataKey="iva_v5" name="Venta 5%" fill="#818cf8" radius={[4,4,0,0]} barSize={20}>
                   <LabelList dataKey="iva_v5" content={(props: any) => <CustomLabel {...props} />} />
                </Bar>
                <Bar dataKey="iva_c19" name="Compra 19%" fill="#dc2626" radius={[4,4,0,0]} barSize={20}>
                   <LabelList dataKey="iva_c19" content={(props: any) => <CustomLabel {...props} />} />
                </Bar>
                <Bar dataKey="iva_c5" name="Compra 5%" fill="#fca5a5" radius={[4,4,0,0]} barSize={20}>
                   <LabelList dataKey="iva_c5" content={(props: any) => <CustomLabel {...props} />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* COMPOSICIÓN (PIE) */}
        <Card className="rounded-[2rem] shadow-xl border-none bg-white overflow-hidden">
          <CardHeader className="text-center pb-0"><CardTitle className="text-sm font-black text-slate-500 uppercase tracking-widest">🎯 Mix Periodo</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie 
                  data={[
                    {name: 'Ventas', value: kpis.iva_ventas || 0},
                    {name: 'Compras', value: kpis.iva_compras || 0},
                    {name: 'Rete', value: kpis.reteiva_favor || 0}
                  ]} 
                  innerRadius={50} 
                  outerRadius={70} 
                  paddingAngle={8} 
                  dataKey="value"
                >
                  <Cell fill="#4338ca" /><Cell fill="#dc2626" /><Cell fill="#f97316" />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-2 px-2 pb-4">
               <div className="flex justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-xs">
                 <span>IVA Neto Ventas</span><span className="text-indigo-600 font-black">{formatCurrency(kpis.iva_ventas)}</span>
               </div>
               <div className="flex justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-xs">
                 <span>Saldo a Pagar</span><span className="text-emerald-600 font-black">{formatCurrency(kpis.saldo_iva)}</span>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLA DE LIQUIDACIÓN */}
      <Card className="rounded-[2rem] shadow-2xl border-none overflow-hidden bg-white">
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
          <span className="flex items-center gap-2 font-black text-sm uppercase tracking-widest"><Search size={18} className="text-indigo-400" /> Liquidación Sugerida DIAN</span>
          <span className="text-[10px] font-bold bg-white/10 px-3 py-1 rounded-full border border-white/20 uppercase tracking-tighter">Cruce Auditoría</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b text-slate-400 font-black text-[10px] uppercase">
              <tr>
                <th className="p-5 text-left">Periodo Agrupado</th>
                <th className="p-5 text-right">IVA Ventas</th>
                <th className="p-5 text-right">IVA Compras</th>
                <th className="p-5 text-right">ReteIVA (135517)</th>
                <th className="p-5 text-right">Saldo Neto</th>
                <th className="p-5 text-center">Mes Presentación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold">
              {agrupadas.map((f, i) => (
                <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-5 text-slate-700">{f.label}</td>
                  <td className="p-5 text-right text-indigo-600 font-black">{formatCurrency(f.iva_ventas)}</td>
                  <td className="p-5 text-right text-red-500">{formatCurrency(f.iva_compras)}</td>
                  <td className="p-5 text-right text-orange-600">{formatCurrency(f.reteiva_favor)}</td>
                  <td className="p-5 text-right">
                    <span className={`px-4 py-1.5 rounded-xl font-black ${f.saldo_iva > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {formatCurrency(f.saldo_iva)}
                    </span>
                  </td>
                  <td className="p-5 text-center">
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase font-black">{f.mes_presentacion}</span>
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

const StatCard = ({ title, value, icon, color, highlight = false }: any) => {
  const themes: any = {
    indigo: "text-indigo-600 bg-white border-slate-100",
    red: "text-red-600 bg-white border-slate-100",
    orange: "text-orange-600 bg-white border-slate-100",
    emerald: "text-white bg-indigo-600 shadow-indigo-200",
  };
  return (
    <Card className={`border shadow-lg rounded-[2rem] transition-all hover:scale-[1.02] ${themes[color]}`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div className={`p-3 rounded-2xl ${highlight ? 'bg-white/20' : 'bg-slate-50'}`}>{icon}</div>
          <div className={`text-[9px] font-black px-2 py-1 rounded-lg ${highlight ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>AUDIT-26</div>
        </div>
        <p className={`text-[10px] font-black uppercase tracking-widest ${highlight ? 'text-indigo-100' : 'text-slate-400'}`}>{title}</p>
        <p className="text-2xl font-black mt-1 tracking-tighter">{formatCurrency(value || 0)}</p>
      </CardContent>
    </Card>
  );
};