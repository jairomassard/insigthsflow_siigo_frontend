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
import { TrendingUp, TrendingDown, DollarSign, FileText, ArrowUpRight, RefreshCcw, Search, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 30; 
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="#64748b" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight="bold">
      {abreviar(value)}
    </text>
  );
};

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

export default function CruceIVAReportPage() {
  useAuthGuard();

  const [series, setSeries] = useState<any[]>([]);
  const [agrupadas, setAgrupadas] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [modo, setModo] = useState<"bimensual" | "trimestral" | "cuatrimestral">("bimensual");
  
  // AJUSTE: Iniciamos en 2025 para que veas los datos que vas a cargar
  const [fechaDesde, setFechaDesde] = useState("2025-01-01");
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().slice(0, 10));
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/reportes/cruce_iva_v2?desde=${fechaDesde}&hasta=${fechaHasta}&modo=${modo}`);
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
      await authFetch("/reportes/cargar_auxiliar", {
        method: "POST",
        body: formData,
      });
      alert(`Éxito: Se procesaron los registros de todo el auxiliar.`);
      fetchData(); 
    } catch (err) {
      console.error("Error subiendo archivo:", err);
      alert("Error cargando el archivo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => { fetchData(); }, [fechaDesde, fechaHasta, modo]);

  const pieData = [
    { name: 'IVA Ventas', value: kpis.iva_ventas || 0, color: '#2563eb' },
    { name: 'IVA Compras', value: kpis.iva_compras || 0, color: '#ef4444' },
    { name: 'ReteIVA (135517)', value: kpis.reteiva_favor || 0, color: '#f97316' },
  ];

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Cruce de IVA (V2)</h1>
          <p className="text-slate-500 font-medium">Auditoría multianual de cuentas 2408 y 135517.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold shadow-lg transition-all ${uploading ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
          >
            {uploading ? <RefreshCcw className="animate-spin" size={20} /> : <FileText size={20} />}
            {uploading ? "Procesando Auxiliar..." : "Sincronizar Auxiliar"}
          </button>
        </div>
      </div>

      <Alert className="bg-blue-50 border-blue-200 rounded-2xl shadow-sm border-l-4 border-l-blue-500">
        <Info className="h-5 w-5 text-blue-600" />
        <AlertTitle className="text-blue-800 font-bold ml-2">Modo Auditoría Full</AlertTitle>
        <AlertDescription className="text-blue-700 ml-2 mt-1 italic">
          El sistema ahora procesa <strong>todas las cuentas contables</strong> del Excel para cruces avanzados.
        </AlertDescription>
      </Alert>

      {/* FILTROS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rango Fiscal</label>
          <div className="flex gap-2">
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="w-full border rounded-xl p-2 text-sm bg-slate-50" />
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="w-full border rounded-xl p-2 text-sm bg-slate-50" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Periodicidad</label>
          <select value={modo} onChange={e => setModo(e.target.value as any)} className="w-full border rounded-xl p-2 text-sm font-bold bg-slate-50">
            <option value="bimensual">Bimensual</option>
            <option value="trimestral">Trimestral</option>
            <option value="cuatrimestral">Cuatrimestral</option>
          </select>
        </div>
        <div className="flex items-end">
           <button onClick={fetchData} className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-black transition-colors">
             <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} /> 
             {loading ? "Actualizando..." : "Actualizar Datos"}
           </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="IVA Ventas (+)" value={kpis.iva_ventas} icon={<TrendingUp className="text-blue-600" />} color="blue" />
        <StatCard title="IVA Compras (-)" value={kpis.iva_compras} icon={<TrendingDown className="text-red-600" />} color="red" />
        <StatCard title="ReteIVA 135517 (-)" value={kpis.reteiva_favor} icon={<DollarSign className="text-orange-600" />} color="orange" />
        <StatCard title="Neto a Pagar" value={kpis.saldo_iva} icon={<ArrowUpRight className="text-green-600" />} color="green" highlight />
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-xl border-none rounded-[2rem] bg-white overflow-hidden p-2">
          <CardHeader><CardTitle className="text-lg font-bold">📈 Evolución y Cruce Mensual</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={series} margin={{ top: 25, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold'}} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                <Bar dataKey="iva_ventas" name="IVA Venta" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={35}>
                  <LabelList dataKey="iva_ventas" content={(props: any) => <CustomLabel {...props} />} />
                </Bar>
                <Bar dataKey="iva_compras" name="IVA Compra" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={35}>
                  <LabelList dataKey="iva_compras" content={(props: any) => <CustomLabel {...props} />} />
                </Bar>
                <Bar dataKey="reteiva_favor" name="ReteIVA (135517)" fill="#f97316" radius={[6, 6, 0, 0]} barSize={35}>
                  <LabelList dataKey="reteiva_favor" content={(props: any) => <CustomLabel {...props} />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* TORTA */}
        <Card className="shadow-xl border-none rounded-[2rem] bg-white">
          <CardHeader className="text-center"><CardTitle className="text-lg font-bold">🎯 Composición Periodo</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} innerRadius={65} outerRadius={90} paddingAngle={8} dataKey="value" label={renderCustomizedLabel} labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}>
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-2 mt-4">
               {pieData.map(item => (
                 <div key={item.name} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
                   <span className="flex items-center gap-2 font-bold text-slate-600 text-xs">
                     <div className="w-2 h-2 rounded-full" style={{backgroundColor: item.color}}/> {item.name}
                   </span>
                   <span className="font-black text-slate-900 text-sm">{formatCurrency(item.value)}</span>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLA DE AUDITORÍA */}
      <Card className="shadow-2xl border-none rounded-[2rem] overflow-hidden bg-white">
        <CardHeader className="bg-slate-900 text-white p-5">
           <CardTitle className="text-lg font-bold flex items-center gap-2"><Search size={20} className="text-indigo-400" /> Detalle de Liquidación Sugerida</CardTitle>
        </CardHeader>
        <CardContent className="p-0 text-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b text-left">
                  <th className="p-5">Periodo Agrupado</th>
                  <th className="p-5 text-right">IVA Ventas</th>
                  <th className="p-5 text-right">IVA Compras</th>
                  <th className="p-5 text-right">ReteIVA 135517</th>
                  <th className="p-5 text-right">Saldo Neto</th>
                  <th className="p-5">Rangos Auditados</th>
                  <th className="p-5 text-center">Presentación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agrupadas.map((f, i) => (
                  <tr key={i} className="hover:bg-indigo-50/20 transition-colors">
                    <td className="p-5 font-black text-slate-700">{f.label}</td>
                    <td className="p-5 text-right font-bold text-blue-600">{formatCurrency(f.iva_ventas)}</td>
                    <td className="p-5 text-right font-bold text-red-500">{formatCurrency(f.iva_compras)}</td>
                    <td className="p-5 text-right font-bold text-orange-500">{formatCurrency(f.reteiva_favor)}</td>
                    <td className="p-5 text-right">
                      <span className={`px-4 py-1.5 rounded-xl font-black ${f.saldo_iva > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {formatCurrency(f.saldo_iva)}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {/* AJUSTE: Etiquetas que reflejan los nuevos filtros del backend */}
                        {['240801-09', '240810-80', '135517'].map(c => (
                          <span key={c} className="text-[8px] bg-slate-100 px-1.5 py-0.5 rounded border font-mono font-bold text-slate-500">{c}</span>
                        ))}
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">
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
  <Card className={`border-none shadow-lg rounded-3xl transition-all hover:scale-[1.02] ${highlight ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white'}`}>
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

const CustomLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (!value || value === 0) return null;
  return (
    <text x={x + width / 2} y={y - 12} fill="#94a3b8" fontSize={9} fontWeight="900" textAnchor="middle">{abreviar(value)}</text>
  );
};