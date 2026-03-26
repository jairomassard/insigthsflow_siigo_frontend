"use client";

import { useEffect, useState, useRef } from "react";
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
  Legend,
  CartesianGrid,
  LabelList
} from "recharts";
import { TrendingUp, FileText, RefreshCcw, DollarSign, Activity, PieChart, Table as TableIcon } from "lucide-react";

// --- HELPERS DE FORMATO ---
function abreviar(valor: number): string {
  if (!valor) return "0";
  const absValue = Math.abs(valor);
  if (absValue >= 1_000_000_000) return `${(valor / 1_000_000_000).toFixed(1)}B`;
  if (absValue >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (absValue >= 1_000) return `${(valor / 1_000).toFixed(0)}K`;
  return `${Math.round(valor)}`;
}

const formatCurrency = (val: number) => 
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val || 0);

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

export default function EstadoResultadosPage() {
  useAuthGuard();

  const [evolucion, setEvolucion] = useState<any[]>([]);
  const [composicion, setComposicion] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [fechaDesde, setFechaDesde] = useState("2026-01-01");
  const [fechaHasta, setFechaHasta] = useState("2026-12-31");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // EL SWITCH QUE PEDISTE: Gerencial vs Contable
  const [vista, setVista] = useState<"gerencial" | "contable">("gerencial");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/reportes/pnl_v1?desde=${fechaDesde}&hasta=${fechaHasta}`);
      setEvolucion(res.evolucion ?? []);
      setComposicion(res.composicion ?? []);
      setKpis(res.kpis ?? {});
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

  useEffect(() => { fetchData(); }, [fechaDesde, fechaHasta]);

  // Lógica para armar el P&L Tradicional agrupando las cuentas de 4 dígitos
  const getCuentas = (filtro: (c: any) => boolean) => composicion.filter(filtro);
  const sumCuentas = (cuentas: any[]) => cuentas.reduce((acc, c) => acc + c.valor, 0);

  const ingOp = getCuentas(c => c.cuenta.startsWith('41'));
  const costos = getCuentas(c => c.cuenta.startsWith('6') || c.cuenta.startsWith('7'));
  const gasOp = getCuentas(c => c.cuenta.startsWith('51') || c.cuenta.startsWith('52'));
  const ingNoOp = getCuentas(c => c.cuenta.startsWith('42'));
  const gasNoOp = getCuentas(c => c.cuenta.startsWith('53') || c.cuenta.startsWith('54'));

  const totalIngOp = sumCuentas(ingOp);
  const totalCostos = sumCuentas(costos);
  const utilidadBruta = totalIngOp - totalCostos;
  const totalGasOp = sumCuentas(gasOp);
  const utilidadOp = utilidadBruta - totalGasOp;
  const totalIngNoOp = sumCuentas(ingNoOp);
  const totalGasNoOp = sumCuentas(gasNoOp);
  const utilidadNeta = utilidadOp + totalIngNoOp - totalGasNoOp;

  return (
    <div className="space-y-5 p-5 bg-slate-50 min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Estado de Resultados (P&L) <span className="text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">Premium</span>
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-1">Análisis Financiero, Márgenes y EBITDA Automático.</p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
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
          <p className="text-slate-400 text-[10px] font-semibold italic">
            Ruta Siigo: Contabilidad {'>'} Comprobantes {'>'} Informe auxiliar contable
          </p>
        </div>
      </div>

      {/* FILTROS Y SWITCH DE VISTA */}
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-[2rem] border shadow-sm items-end justify-between">
        <div className="flex gap-4">
          <div className="flex flex-col min-w-[200px]">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">Rango de Análisis</label>
            <div className="flex gap-2">
              <input type="date" value={fechaDesde} onChange={e=>setFechaDesde(e.target.value)} className="w-full border rounded-xl p-2 text-xs font-bold bg-slate-50" />
              <input type="date" value={fechaHasta} onChange={e=>setFechaHasta(e.target.value)} className="w-full border rounded-xl p-2 text-xs font-bold bg-slate-50" />
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-black text-white uppercase ml-1 mb-1">.</label>
            <button onClick={fetchData} className="bg-indigo-50 text-indigo-700 font-black px-6 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all border border-indigo-100">
              <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* EL BOTÓN DUAL (GERENCIAL VS CONTABLE) */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
          <button 
            onClick={() => setVista("gerencial")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${vista === 'gerencial' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <PieChart size={14} /> Vista Gerencial
          </button>
          <button 
            onClick={() => setVista("contable")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${vista === 'contable' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <TableIcon size={14} /> Vista Contable (Tradicional)
          </button>
        </div>
      </div>

      {/* KPIs GERENCIALES (Siempre visibles) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Ingresos Totales" value={kpis.ingresos_totales} icon={<TrendingUp size={20}/>} color="emerald" />
        <StatCard title="Utilidad Bruta" value={kpis.utilidad_bruta} icon={<DollarSign size={20}/>} color="blue" badge={`${kpis.margen_bruto}%`} />
        <StatCard title="EBITDA" value={kpis.ebitda} icon={<Activity size={20}/>} color="indigo" badge={`${kpis.margen_ebitda}%`} highlight />
        <StatCard title="Utilidad Neta" value={kpis.utilidad_neta} icon={<TrendingUp size={20}/>} color="slate" badge={`${kpis.margen_neto}%`} />
      </div>

      {/* SECCIÓN DINÁMICA: DEPENDIENDO DEL SWITCH */}
      {vista === "gerencial" ? (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* GRÁFICO MIXTO (BARRAS Y LÍNEA DE TENDENCIA) */}
          <Card className="rounded-[2rem] shadow-xl border-none bg-white p-2">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-black text-slate-500 uppercase tracking-tight flex justify-between">
                <span>📈 Tendencia P&L Mensual</span>
                <div className="flex gap-4 text-[10px]">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Ingresos</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Costos/Gastos</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-1 bg-indigo-600 rounded-full"></div> EBITDA</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={380}>
                <ComposedChart data={evolucion} margin={{ top: 30, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold'}} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                  
                  <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[6,6,0,0]} barSize={40} />
                  <Bar dataKey="costos_gastos" name="Costos y Gastos" fill="#f43f5e" radius={[6,6,0,0]} barSize={40} />
                  {/* Línea superpuesta del EBITDA para ver cómo se mueve el margen */}
                  <Line type="monotone" dataKey="ebitda" name="EBITDA" stroke="#4f46e5" strokeWidth={4} dot={{r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff'}} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* VISTA TRADICIONAL CONTABLE (P&L WATERFALL) */}
          <Card className="rounded-[2rem] shadow-2xl border-none overflow-hidden bg-white">
            <div className="bg-slate-900 text-white px-8 py-5 flex justify-between items-center">
              <div>
                <h2 className="font-black text-lg uppercase tracking-widest">Estado de Resultados Integral</h2>
                <p className="text-slate-400 text-xs mt-1 font-medium">Clasificado bajo norma local (PUC)</p>
              </div>
              <TableIcon size={32} className="text-emerald-400 opacity-50" />
            </div>
            
            <div className="p-8">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {/* INGRESOS */}
                  <tr className="bg-slate-50/50"><td colSpan={2} className="py-3 px-4 font-black text-slate-800 text-base">INGRESOS OPERACIONALES</td></tr>
                  {ingOp.map(c => <RowCuenta key={c.cuenta} cuenta={c} isGasto={false} />)}
                  <RowTotal title="TOTAL INGRESOS OPERACIONALES" value={totalIngOp} />

                  {/* COSTOS */}
                  <tr><td colSpan={2} className="py-3 px-4 font-black text-slate-800 text-base pt-6">COSTOS DE VENTA</td></tr>
                  {costos.map(c => <RowCuenta key={c.cuenta} cuenta={c} isGasto={true} />)}
                  <RowTotal title="TOTAL COSTOS DE VENTA" value={totalCostos} isGasto={true} />

                  {/* UTILIDAD BRUTA */}
                  <tr className="bg-emerald-50"><td className="py-4 px-4 font-black text-emerald-800 text-lg uppercase">(=) Utilidad Bruta</td><td className="py-4 px-4 text-right font-black text-emerald-800 text-lg">{formatCurrency(utilidadBruta)}</td></tr>

                  {/* GASTOS OP */}
                  <tr><td colSpan={2} className="py-3 px-4 font-black text-slate-800 text-base pt-6">GASTOS OPERACIONALES</td></tr>
                  {gasOp.map(c => <RowCuenta key={c.cuenta} cuenta={c} isGasto={true} />)}
                  <RowTotal title="TOTAL GASTOS OPERACIONALES" value={totalGasOp} isGasto={true} />

                  {/* UTILIDAD OPERATIVA */}
                  <tr className="bg-blue-50"><td className="py-4 px-4 font-black text-blue-800 text-lg uppercase">(=) Utilidad Operativa</td><td className="py-4 px-4 text-right font-black text-blue-800 text-lg">{formatCurrency(utilidadOp)}</td></tr>

                  {/* NO OPERACIONALES */}
                  <tr><td colSpan={2} className="py-3 px-4 font-black text-slate-800 text-base pt-6">INGRESOS NO OPERACIONALES</td></tr>
                  {ingNoOp.map(c => <RowCuenta key={c.cuenta} cuenta={c} isGasto={false} />)}
                  <tr><td colSpan={2} className="py-3 px-4 font-black text-slate-800 text-base pt-4">GASTOS NO OPERACIONALES</td></tr>
                  {gasNoOp.map(c => <RowCuenta key={c.cuenta} cuenta={c} isGasto={true} />)}

                  {/* UTILIDAD NETA */}
                  <tr className="bg-slate-900 border-t-4 border-slate-900">
                    <td className="py-5 px-4 font-black text-white text-xl uppercase tracking-widest">(=) Utilidad Neta del Ejercicio</td>
                    <td className="py-5 px-4 text-right font-black text-emerald-400 text-2xl">{formatCurrency(utilidadNeta)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// --- SUBCOMPONENTES DE TABLA TRADICIONAL ---
const RowCuenta = ({ cuenta, isGasto }: { cuenta: any, isGasto: boolean }) => (
  <tr className="hover:bg-slate-50 transition-colors group">
    <td className="py-2 px-8 text-slate-600 font-medium text-xs flex gap-3 items-center">
      <span className="font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px]">{cuenta.cuenta}</span> 
      <span className="group-hover:text-indigo-600 transition-colors">{cuenta.nombre}</span>
    </td>
    <td className={`py-2 px-4 text-right font-bold text-xs ${isGasto ? 'text-rose-600' : 'text-slate-800'}`}>
      {isGasto && cuenta.valor > 0 ? '-' : ''}{formatCurrency(cuenta.valor)}
    </td>
  </tr>
);

const RowTotal = ({ title, value, isGasto = false }: { title: string, value: number, isGasto?: boolean }) => (
  <tr className="border-t border-slate-200 bg-slate-50/50">
    <td className="py-3 px-8 font-black text-slate-700 text-xs">{title}</td>
    <td className={`py-3 px-4 text-right font-black text-sm ${isGasto ? 'text-rose-600' : 'text-slate-900'}`}>
      {isGasto && value > 0 ? '-' : ''}{formatCurrency(value)}
    </td>
  </tr>
);

// --- SUBCOMPONENTE KPI ---
const StatCard = ({ title, value, icon, color, badge, highlight = false }: any) => {
  const themes: any = {
    emerald: "text-emerald-600 bg-white border-slate-100",
    blue: "text-blue-600 bg-white border-slate-100",
    indigo: "text-indigo-600 bg-white border-slate-100",
    slate: "text-slate-700 bg-white border-slate-100",
  };
  return (
    <Card className={`relative overflow-hidden border shadow-lg rounded-[2rem] transition-all hover:scale-[1.02] ${highlight ? 'bg-indigo-600 text-white shadow-indigo-200 border-none' : themes[color]}`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div className={`p-3 rounded-2xl ${highlight ? 'bg-white/20' : 'bg-slate-50'}`}>{icon}</div>
          {badge && (
            <div className={`text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 ${highlight ? 'bg-emerald-400 text-emerald-950' : 'bg-slate-100 text-slate-500'}`}>
              {badge} MARGEN
            </div>
          )}
        </div>
        <p className={`text-[10px] font-black uppercase tracking-widest ${highlight ? 'text-indigo-100' : 'text-slate-400'}`}>{title}</p>
        <p className="text-2xl font-black mt-1 tracking-tighter">{formatCurrency(value || 0)}</p>
      </CardContent>
    </Card>
  );
};