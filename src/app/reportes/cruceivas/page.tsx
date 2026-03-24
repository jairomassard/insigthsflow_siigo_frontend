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
  LabelList,
  Legend,
  Text,
} from "recharts";

// --- HELPERS ---
function abreviar(valor: number): string {
  if (valor >= 1_000_000_000) return `${(valor / 1_000_000_000).toFixed(1)}B`;
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000) return `${(valor / 1_000).toFixed(0)}K`;
  return `${Math.round(valor)}`;
}

const CustomLabel = ({ x, y, width, value }: any) => {
  if (value == null) return null;
  return (
    <Text x={x + width / 2} y={y - 8} textAnchor="middle" fontSize={12} fill="#000">
      {abreviar(value)}
    </Text>
  );
};

export default function CruceIVAReportPage() {
  useAuthGuard();

  const [series, setSeries] = useState<any[]>([]);
  const [agrupadas, setAgrupadas] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [modo, setModo] = useState<"bimensual" | "trimestral" | "cuatrimestral">("bimensual");
  const [fechaDesde, setFechaDesde] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
  );
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // --- FUNCIÓN DE CARGA DE ARCHIVO ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileSelected = e.target.files?.[0];
    if (!fileSelected) return;

    setUploading(true);
    const formData = new FormData();
    // Usamos "archivo" para que coincida con el nuevo endpoint del backend
    formData.append("archivo", fileSelected);

    try {
      // Usamos tu authFetch estándar
      const res = await authFetch("/reportes/cargar_auxiliar", {
        method: "POST",
        body: formData,
        // IMPORTANTE: NO pasar headers manuales aquí, authFetch se encarga
      });

      // Si authFetch no lanzó error, es que res ya es el JSON procesado
      alert(`✅ ¡Éxito! Registros procesados: ${res.detalles.registros_procesados}`);
      
      // Llamamos a la función que refresca los KPIs y el Gráfico
      fetchData(); 
      
    } catch (err: any) {
      console.error("Error en upload:", err);
      alert("❌ Error: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = ""; // Limpiamos el input para poder subir el mismo archivo si se desea
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // Apuntamos al nuevo endpoint de analítica v2
      const res = await authFetch(
        `/reportes/cruce_iva_v2?desde=${fechaDesde}&hasta=${fechaHasta}&modo=${modo}`
      );
      if (res.error) throw new Error(res.error);
      
      setSeries(res.series ?? []);
      setKpis(res.kpis ?? {});
      setAgrupadas(res.series_agrupadas?.[modo] ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fechaDesde, fechaHasta, modo]);

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📊 Reporte Cruce de IVA (Libro Auxiliar)</h1>
        
        {/* BOTÓN DE CARGA */}
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            id="aux-upload" 
            className="hidden" 
            accept=".xlsx, .xls" 
            onChange={handleFileUpload} 
          />
          <label 
            htmlFor="aux-upload" 
            className={`px-4 py-2 rounded-lg text-white font-medium cursor-pointer transition ${uploading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {uploading ? "⏳ Procesando..." : "📁 Cargar Auxiliar Siigo"}
          </label>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg shadow-sm">
        <div>
          <label className="text-xs font-semibold text-gray-500">DESDE</label><br />
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="border p-2 rounded text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">HASTA</label><br />
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="border p-2 rounded text-sm" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-blue-500">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">IVA Generado (Ventas)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-blue-600">$ {Number(kpis.iva_ventas || 0).toLocaleString("es-CO")}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-red-500">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">IVA Descontable (Compras)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">$ {Number(kpis.iva_compras || 0).toLocaleString("es-CO")}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-orange-500">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">ReteIVA Recibido (15%)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-orange-600">$ {Number(kpis.reteiva_favor || 0).toLocaleString("es-CO")}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-green-500 bg-green-50">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Neto a Pagar Periodo</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-700">$ {Number(kpis.saldo_iva || 0).toLocaleString("es-CO")}</p></CardContent>
        </Card>
      </div>

      {/* GRÁFICO */}
      <Card>
        <CardHeader><CardTitle>📈 Evolución Mensual (Datos Contables Reales)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={series}>
              <XAxis dataKey="label" />
              <YAxis tickFormatter={v => `$${(v / 1_000_000).toFixed(0)}M`} />
              <Tooltip formatter={(v: any) => `$${Number(v).toLocaleString("es-CO")}`} />
              <Legend />
              <Bar dataKey="iva_ventas" name="IVA Venta" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="iva_compras" name="IVA Compra" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saldo_iva" name="Neto a Pagar" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* TABLA AGRUPADA */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>📄 Liquidación Sugerida ({modo})</CardTitle>
          <select value={modo} onChange={e => setModo(e.target.value as any)} className="border p-1 rounded text-sm">
            <option value="bimensual">Bimensual</option>
            <option value="trimestral">Trimestral</option>
            <option value="cuatrimestral">Cuatrimestral</option>
          </select>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-2 text-left">Periodo</th>
                <th className="p-2 text-right">IVA Venta</th>
                <th className="p-2 text-right">IVA Compra</th>
                <th className="p-2 text-right">ReteIVA Favor</th>
                <th className="p-2 text-right">A Pagar Neto</th>
                <th className="p-2 text-center">Mes Presentación</th>
              </tr>
            </thead>
            <tbody>
              {agrupadas.map((f, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">{f.label}</td>
                  <td className="p-2 text-right text-blue-600">$ {f.iva_ventas.toLocaleString()}</td>
                  <td className="p-2 text-right text-red-600">$ {f.iva_compras.toLocaleString()}</td>
                  <td className="p-2 text-right text-orange-600">$ {f.reteiva_favor.toLocaleString()}</td>
                  <td className="p-2 text-right font-bold text-green-700">$ {f.saldo_iva.toLocaleString()}</td>
                  <td className="p-2 text-center text-gray-500">{f.mes_presentacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}