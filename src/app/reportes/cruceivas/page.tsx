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
import { TrendingUp, TrendingDown, DollarSign, Percent, FileText, ArrowUpRight } from "lucide-react";

// --- HELPERS DE FORMATO ---
function abreviar(valor: number): string {
  const absValue = Math.abs(valor);
  if (absValue >= 1_000_000_000) return `${(valor / 1_000_000_000).toFixed(0)}B`;
  if (absValue >= 1_000_000) return `${(valor / 1_000_000).toFixed(0)}M`;
  if (absValue >= 1_000) return `${(valor / 1_000).toFixed(0)}K`;
  return `${Math.round(valor)}`;
}

const formatCurrency = (val: number) => 
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);

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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [fechaDesde, fechaHasta, modo]);

  // Data para gráfico de torta (Composición de Créditos/Débitos de IVA)
  const pieData = [
    { name: 'IVA Ventas', value: kpis.iva_ventas || 0, color: '#2563eb' },
    { name: 'IVA Compras', value: kpis.iva_compras || 0, color: '#ef4444' },
    { name: 'ReteIVA', value: kpis.reteiva_favor || 0, color: '#f97316' },
  ];

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* HEADER DINÁMICO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Análisis de Impuestos (IVA)</h1>
          <p className="text-gray-500">Cruce detallado de libros auxiliares y liquidación proyectada.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <input type="file" id="aux-upload" className="hidden" accept=".xlsx, .xls" onChange={() => {}} />
          <label htmlFor="aux-upload" className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold cursor-pointer shadow-lg transition all ${uploading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            <FileText size={18} />
            {uploading ? "Procesando..." : "Sincronizar Auxiliar"}
          </label>
        </div>
      </div>

      {/* FILTROS AVANZADOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-2xl shadow-sm border">
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase">Rango de Fecha</label>
          <div className="flex gap-2">
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="w-full border rounded-lg p-2 text-sm focus:ring-2 ring-indigo-500 outline-none" />
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="w-full border rounded-lg p-2 text-sm focus:ring-2 ring-indigo-500 outline-none" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase">Periodicidad DIAN</label>
          <select value={modo} onChange={e => setModo(e.target.value as any)} className="w-full border rounded-lg p-2 text-sm focus:ring-2 ring-indigo-500 outline-none">
            <option value="bimensual">Bimensual (Grandes Contribuyentes)</option>
            <option value="trimestral">Trimestral</option>
            <option value="cuatrimestral">Cuatrimestral (Régimen Común)</option>
          </select>
        </div>
        <div className="flex items-end">
           <button onClick={fetchData} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-lg transition">Actualizar Datos</button>
        </div>
      </div>

      {/* BLOQUE DE KPIs EXPANDIDO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="IVA Generado" value={kpis.iva_ventas} icon={<TrendingUp className="text-blue-600" />} color="blue" />
        <StatCard title="IVA Descontable" value={kpis.iva_compras} icon={<TrendingDown className="text-red-600" />} color="red" />
        <StatCard title="ReteIVA (Favor)" value={kpis.reteiva_favor} icon={<DollarSign className="text-orange-600" />} color="orange" />
        <StatCard title="Saldo a Pagar" value={kpis.saldo_iva} icon={<ArrowUpRight className="text-green-600" />} color="green" highlight />
      </div>

      {/* GRÁFICOS LADO A LADO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-md border-none rounded-2xl">
          <CardHeader><CardTitle className="text-lg">📊 Comparativa Mensual de Impuestos</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={series} margin={{ top: 30, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                <Legend iconType="circle" />
                <Bar dataKey="iva_ventas" name="IVA Venta" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={40}>
                  <LabelList dataKey="iva_ventas" content={(props: any) => <CustomLabel {...props} />} />
                </Bar>
                <Bar dataKey="iva_compras" name="IVA Compra" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={40}>
                  <LabelList dataKey="iva_compras" content={(props: any) => <CustomLabel {...props} />} />
                </Bar>
                <Bar dataKey="saldo_iva" name="Neto" fill="#22c55e" radius={[6, 6, 0, 0]} barSize={40}>
                  <LabelList dataKey="saldo_iva" content={(props: any) => <CustomLabel {...props} />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md border-none rounded-2xl">
          <CardHeader><CardTitle className="text-lg">🎯 Composición del Periodo</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-3 mt-4">
               {pieData.map(item => (
                 <div key={item.name} className="flex justify-between items-center text-sm">
                   <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}}/> {item.name}</span>
                   <span className="font-bold">{formatCurrency(item.value)}</span>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLA DE LIQUIDACIÓN DETALLADA */}
      <Card className="shadow-md border-none rounded-2xl overflow-hidden">
        <CardHeader className="bg-white border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">📄 Detalle de Liquidación Sugerida</CardTitle>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full uppercase tracking-wider">Modo {modo}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-xs uppercase text-left">
                  <th className="p-4 font-semibold">Periodo Fiscal</th>
                  <th className="p-4 text-right font-semibold">IVA Ventas (+)</th>
                  <th className="p-4 text-right font-semibold">IVA Compras (-)</th>
                  <th className="p-4 text-right font-semibold">ReteIVA Favor (-)</th>
                  <th className="p-4 text-right font-semibold">Total a Pagar</th>
                  <th className="p-4 text-center font-semibold">Presentación</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {agrupadas.map((f, i) => (
                  <tr key={i} className="hover:bg-blue-50/30 transition">
                    <td className="p-4 font-bold text-gray-700">{f.label}</td>
                    <td className="p-4 text-right text-blue-600 font-medium">{formatCurrency(f.iva_ventas)}</td>
                    <td className="p-4 text-right text-red-500 font-medium">{formatCurrency(f.iva_compras)}</td>
                    <td className="p-4 text-right text-orange-500 font-medium">{formatCurrency(f.reteiva_favor)}</td>
                    <td className="p-4 text-right">
                      <span className={`px-3 py-1 rounded-lg font-bold ${f.saldo_iva > 0 ? 'text-green-700 bg-green-100' : 'text-gray-600 bg-gray-100'}`}>
                        {formatCurrency(f.saldo_iva)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="text-xs text-gray-500 font-medium bg-gray-100 inline-block px-2 py-1 rounded-md">
                        {f.mes_presentacion}
                      </div>
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

// --- SUBCOMPONENTES AUXILIARES ---

const StatCard = ({ title, value, icon, color, highlight = false }: any) => (
  <Card className={`border-none shadow-md rounded-2xl overflow-hidden ${highlight ? 'bg-green-600 text-white' : 'bg-white'}`}>
    <CardContent className="p-5">
      <div className="flex justify-between items-start">
        <div className={`p-2 rounded-lg ${highlight ? 'bg-white/20' : 'bg-gray-50'}`}>{icon}</div>
        {highlight && <Percent size={16} className="text-white/60" />}
      </div>
      <div className="mt-4">
        <p className={`text-xs font-bold uppercase tracking-wider ${highlight ? 'text-white/80' : 'text-gray-400'}`}>{title}</p>
        <p className="text-2xl font-black mt-1">{formatCurrency(value || 0)}</p>
      </div>
    </CardContent>
  </Card>
);

const CustomLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 10} fill="#64748b" fontSize={11} fontWeight="bold" textAnchor="middle">
      {abreviar(value)}
    </text>
  );
};