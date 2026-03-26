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
import { TrendingUp, FileText, RefreshCcw, DollarSign, Activity, Table as TableIcon } from "lucide-react";

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
      <div className="bg-white p-4 shadow-2xl border rounded-xl border-slate-200 z-50">
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

// Etiquetas para las barras y líneas
const CustomLabel = (props: any) => {
  const { x, y, width, value, offset = -15 } = props;
  if (!value || value === 0) return null;
  return (
    <text x={width ? x + width / 2 : x} y={y + offset} fill="#475569" fontSize={10} fontWeight="900" textAnchor="middle">
      {abreviar(value)}
    </text>
  );
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

  // --- LÓGICA DE TABLA MATRICIAL (MES A MES) ---
  const periodos = evolucion.map(e => e.label);
  const getCuentas = (filtro: (c: any) => boolean) => composicion.filter(filtro);
  
  // Función para totalizar un bloque de cuentas mes a mes
  const getTotalesPorMes = (cuentas: any[]) => {
    const totales: Record<string, number> = {};
    periodos.forEach(p => totales[p] = 0);
    cuentas.forEach(c => {
      periodos.forEach(p => {
        totales[p] += (c.valores_mes[p] || 0);
      });
    });
    return totales;
  };

  const ingOp = getCuentas(c => c.cuenta.startsWith('41'));
  const costos = getCuentas(c => c.cuenta.startsWith('6') || c.cuenta.startsWith('7'));
  const gasOp = getCuentas(c => c.cuenta.startsWith('51') || c.cuenta.startsWith('52'));
  const ingNoOp = getCuentas(c => c.cuenta.startsWith('42'));
  const gasNoOp = getCuentas(c => c.cuenta.startsWith('53') || c.cuenta.startsWith('54'));

  // Totales acumulados (última columna)
  const sumCuentas = (cuentas: any[]) => cuentas.reduce((acc, c) => acc + c.total, 0);
  const totalIngOp = sumCuentas(ingOp);
  const totalCostos = sumCuentas(costos);
  const utilidadBruta = totalIngOp - totalCostos;
  const totalGasOp = sumCuentas(gasOp);
  const utilidadOp = utilidadBruta - totalGasOp;
  const totalIngNoOp = sumCuentas(ingNoOp);
  const totalGasNoOp = sumCuentas(gasNoOp);
  const utilidadNeta = utilidadOp + totalIngNoOp - totalGasNoOp;

  // Totales por Mes (Columnas del medio)
  const tIngOpMes = getTotalesPorMes(ingOp);
  const tCostosMes = getTotalesPorMes(costos);
  const tGasOpMes = getTotalesPorMes(gasOp);
  const tIngNoOpMes = getTotalesPorMes(ingNoOp);
  const tGasNoOpMes = getTotalesPorMes(gasNoOp);

  const ubMes = periodos.reduce((acc, p) => ({...acc, [p]: tIngOpMes[p] - tCostosMes[p]}), {} as Record<string, number>);
  const uoMes = periodos.reduce((acc, p) => ({...acc, [p]: ubMes[p] - tGasOpMes[p]}), {} as Record<string, number>);
  const unMes = periodos.reduce((acc, p) => ({...acc, [p]: uoMes[p] + tIngNoOpMes[p] - tGasNoOpMes[p]}), {} as Record<string, number>);

  return (
    <div className="space-y-5 p-5 bg-slate-50 min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Estado de Resultados (P&L) <span className="text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">Premium</span>
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-1">Análisis Financiero, Márgenes y Análisis Horizontal Automático.</p>
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

      {/* FILTROS */}
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
              <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} /> {loading ? "Actualizando..." : "Filtrar P&L"}
            </button>
          </div>
        </div>
      </div>

      {/* KPIs GERENCIALES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Ingresos Totales" value={kpis.ingresos_totales} icon={<TrendingUp size={20}/>} color="emerald" />
        <StatCard title="Utilidad Bruta" value={kpis.utilidad_bruta} icon={<DollarSign size={20}/>} color="blue" badge={`${kpis.margen_bruto}%`} />
        <StatCard title="EBITDA" value={kpis.ebitda} icon={<Activity size={20}/>} color="indigo" badge={`${kpis.margen_ebitda}%`} highlight />
        <StatCard title="Utilidad Neta" value={kpis.utilidad_neta} icon={<TrendingUp size={20}/>} color="slate" badge={`${kpis.margen_neto}%`} />
      </div>

      {/* GRÁFICO MIXTO (GERENCIAL) */}
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
            <ComposedChart data={evolucion} margin={{ top: 40, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold'}} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
              
              <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[6,6,0,0]} barSize={40}>
                <LabelList dataKey="ingresos" content={(props: any) => <CustomLabel {...props} />} />
              </Bar>
              <Bar dataKey="costos_gastos" name="Costos y Gastos" fill="#f43f5e" radius={[6,6,0,0]} barSize={40}>
                <LabelList dataKey="costos_gastos" content={(props: any) => <CustomLabel {...props} />} />
              </Bar>
              {/* Línea superpuesta del EBITDA con valor encima del nodo */}
              <Line type="monotone" dataKey="ebitda" name="EBITDA" stroke="#4f46e5" strokeWidth={4} dot={{r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff'}}>
                 <LabelList dataKey="ebitda" content={(props: any) => <CustomLabel {...props} offset={-20} />} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* VISTA TRADICIONAL MATRICIAL (CONTABLE + ANÁLISIS HORIZONTAL) */}
      <Card className="rounded-[2rem] shadow-2xl border-none overflow-hidden bg-white">
        <div className="bg-slate-900 text-white px-8 py-5 flex justify-between items-center">
          <div>
            <h2 className="font-black text-lg uppercase tracking-widest">Estado de Resultados Integral (Matricial)</h2>
            <p className="text-slate-400 text-xs mt-1 font-medium">Análisis Horizontal Mes a Mes + Acumulado</p>
          </div>
          <TableIcon size={32} className="text-emerald-400 opacity-50" />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-slate-100 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b">
                <th className="py-4 px-6 text-left sticky left-0 bg-slate-100 z-10 w-[300px]">Concepto / Cuenta</th>
                {periodos.map(p => (
                  <th key={p} className="py-4 px-4 text-right">{p}</th>
                ))}
                <th className="py-4 px-6 text-right bg-emerald-50 text-emerald-800 border-l border-emerald-100">TOTAL ACUMULADO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              
              {/* INGRESOS */}
              <tr className="bg-slate-50/50"><td colSpan={periodos.length + 2} className="py-3 px-6 font-black text-slate-800 text-base sticky left-0 bg-slate-50/50">INGRESOS OPERACIONALES</td></tr>
              {ingOp.map(c => <RowCuenta key={c.cuenta} cuenta={c} isGasto={false} periodos={periodos} />)}
              <RowTotal title="TOTAL INGRESOS OPERACIONALES" totalesMes={tIngOpMes} totalAcumulado={totalIngOp} periodos={periodos} />

              {/* COSTOS */}
              <tr><td colSpan={periodos.length + 2} className="py-3 px-6 font-black text-slate-800 text-base pt-6 sticky left-0 bg-white">COSTOS DE VENTA</td></tr>
              {costos.map(c => <RowCuenta key={c.cuenta} cuenta={c} isGasto={true} periodos={periodos} />)}
              <RowTotal title="TOTAL COSTOS DE VENTA" totalesMes={tCostosMes} totalAcumulado={totalCostos} isGasto={true} periodos={periodos} />

              {/* UTILIDAD BRUTA */}
              <tr className="bg-emerald-50">
                <td className="py-4 px-6 font-black text-emerald-800 text-sm uppercase sticky left-0 bg-emerald-50">(=) Utilidad Bruta</td>
                {periodos.map(p => <td key={p} className="py-4 px-4 text-right font-black text-emerald-800 text-sm">{formatCurrency(ubMes[p])}</td>)}
                <td className="py-4 px-6 text-right font-black text-emerald-900 text-base bg-emerald-100/50 border-l border-emerald-200">{formatCurrency(utilidadBruta)}</td>
              </tr>

              {/* GASTOS OP */}
              <tr><td colSpan={periodos.length + 2} className="py-3 px-6 font-black text-slate-800 text-base pt-6 sticky left-0 bg-white">GASTOS OPERACIONALES</td></tr>
              {gasOp.map(c => <RowCuenta key={c.cuenta} cuenta={c} isGasto={true} periodos={periodos} />)}
              <RowTotal title="TOTAL GASTOS OPERACIONALES" totalesMes={tGasOpMes} totalAcumulado={totalGasOp} isGasto={true} periodos={periodos} />

              {/* UTILIDAD OPERATIVA */}
              <tr className="bg-blue-50">
                <td className="py-4 px-6 font-black text-blue-800 text-sm uppercase sticky left-0 bg-blue-50">(=) Utilidad Operativa</td>
                {periodos.map(p => <td key={p} className="py-4 px-4 text-right font-black text-blue-800 text-sm">{formatCurrency(uoMes[p])}</td>)}
                <td className="py-4 px-6 text-right font-black text-blue-900 text-base bg-blue-100/50 border-l border-blue-200">{formatCurrency(utilidadOp)}</td>
              </tr>

              {/* NO OPERACIONALES */}
              <tr><td colSpan={periodos.length + 2} className="py-3 px-6 font-black text-slate-800 text-base pt-6 sticky left-0 bg-white">INGRESOS NO OPERACIONALES</td></tr>
              {ingNoOp.map(c => <RowCuenta key={c.cuenta} cuenta={c} isGasto={false} periodos={periodos} />)}
              
              <tr><td colSpan={periodos.length + 2} className="py-3 px-6 font-black text-slate-800 text-base pt-4 sticky left-0 bg-white">GASTOS NO OPERACIONALES</td></tr>
              {gasNoOp.map(c => <RowCuenta key={c.cuenta} cuenta={c} isGasto={true} periodos={periodos} />)}

              {/* UTILIDAD NETA */}
              <tr className="bg-slate-900 border-t-4 border-slate-900">
                <td className="py-5 px-6 font-black text-white text-base uppercase tracking-widest sticky left-0 bg-slate-900">(=) Utilidad Neta del Ejercicio</td>
                {periodos.map(p => <td key={p} className="py-5 px-4 text-right font-black text-emerald-400 text-sm">{formatCurrency(unMes[p])}</td>)}
                <td className="py-5 px-6 text-right font-black text-emerald-400 text-xl bg-slate-800 border-l border-slate-700">{formatCurrency(utilidadNeta)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// --- SUBCOMPONENTES DE TABLA MATRICIAL ---
const RowCuenta = ({ cuenta, isGasto, periodos }: { cuenta: any, isGasto: boolean, periodos: string[] }) => (
  <tr className="hover:bg-slate-50 transition-colors group">
    <td className="py-2 px-6 text-slate-600 font-medium text-xs flex gap-3 items-center sticky left-0 bg-white group-hover:bg-slate-50 transition-colors w-[300px]">
      <span className="font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px]">{cuenta.cuenta}</span> 
      <span className="group-hover:text-indigo-600 transition-colors truncate" title={cuenta.nombre}>{cuenta.nombre}</span>
    </td>
    {periodos.map(p => (
      <td key={p} className={`py-2 px-4 text-right font-bold text-xs ${isGasto ? 'text-rose-600' : 'text-slate-800'}`}>
        {isGasto && (cuenta.valores_mes[p] || 0) > 0 ? '-' : ''}{formatCurrency(cuenta.valores_mes[p] || 0)}
      </td>
    ))}
    <td className={`py-2 px-6 text-right font-black text-xs ${isGasto ? 'text-rose-700' : 'text-slate-900'} bg-slate-50/50 border-l border-slate-100`}>
      {isGasto && cuenta.total > 0 ? '-' : ''}{formatCurrency(cuenta.total)}
    </td>
  </tr>
);

const RowTotal = ({ title, totalesMes, totalAcumulado, isGasto = false, periodos }: any) => (
  <tr className="border-t border-slate-200 bg-slate-50/80">
    <td className="py-3 px-6 font-black text-slate-700 text-[11px] sticky left-0 bg-slate-50/80">{title}</td>
    {periodos.map((p: string) => (
      <td key={p} className={`py-3 px-4 text-right font-black text-xs ${isGasto ? 'text-rose-600' : 'text-slate-900'}`}>
        {isGasto && totalesMes[p] > 0 ? '-' : ''}{formatCurrency(totalesMes[p])}
      </td>
    ))}
    <td className={`py-3 px-6 text-right font-black text-sm ${isGasto ? 'text-rose-700' : 'text-slate-900'} bg-slate-100/50 border-l border-slate-200`}>
      {isGasto && totalAcumulado > 0 ? '-' : ''}{formatCurrency(totalAcumulado)}
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