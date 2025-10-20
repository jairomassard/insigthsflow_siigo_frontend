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

function abreviar(valor: number): string {
  if (valor >= 1_000_000_000) return `${(valor / 1_000_000_000).toFixed(1)}B`;
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000) return `${(valor / 1_000).toFixed(0)}K`;
  if (valor <= 1_000_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (valor <= 1_000_000) return `${(valor / 1_000_000).toFixed(0)}M`;
  if (valor <= 1_000) return `${(valor / 1_000).toFixed(0)}K`;
  return `${Math.round(valor)}`;
}

const CustomLabel = ({ x, y, width, value }: any) => {
  if (value == null) return null;
  return (
    <Text
      x={x + width / 2}
      y={y - 8}
      textAnchor="middle"
      fontSize={12}
      fill="#000"
    >
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
  const [fechaDesde, setFechaDesde] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await authFetch(
          `/reportes/cruce_iva?desde=${fechaDesde}&hasta=${fechaHasta}&modo=${modo}&detalle=1`
        );
        if (res.error) throw new Error(res.error);
        setSeries(res.series);
        setKpis(res.kpis);
        setAgrupadas(res.series_agrupadas?.[modo] || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fechaDesde, fechaHasta, modo]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-4">📊 Reporte Cruce de IVA</h1>

      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <label className="text-sm">Desde:</label><br />
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="border p-1 rounded" />
        </div>
        <div>
          <label className="text-sm">Hasta:</label><br />
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="border p-1 rounded" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle>IVA de Ventas</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">$ {Number(kpis.iva_ventas || 0).toLocaleString("es-CO")}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>IVA de Compras</CardTitle></CardHeader><CardContent><p className="text-xl font-bold text-blue-600">$ {Number(kpis.iva_compras || 0).toLocaleString("es-CO")}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Cruce de IVA Período</CardTitle></CardHeader><CardContent><p className="text-xl font-bold text-orange-600">$ {Number(kpis.saldo_iva || 0).toLocaleString("es-CO")}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>📈 Evolución mensual del IVA</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={series}>
              <XAxis dataKey="label" />
              <YAxis tickFormatter={(v) => `$${(v / 1_000_000).toFixed(0)}M`} />
              <Tooltip formatter={(v: any) => `$${Number(v).toLocaleString("es-CO")}`} />
              <Legend />
              <Bar dataKey="iva_ventas" name="IVA Venta" fill="#0ea5e9" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="iva_ventas" content={<CustomLabel />} />
              </Bar>
              <Bar dataKey="iva_compras" name="IVA Compra" fill="#22c55e" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="iva_compras" content={<CustomLabel />} />
              </Bar>
              <Bar dataKey="saldo_iva" name="Cruce IVA" fill="#f97316" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="saldo_iva" content={<CustomLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>📄 Tabla resumen por periodo</CardTitle></CardHeader>
        <CardContent className="overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Periodo</th>
                <th className="p-2 text-right">IVA Venta</th>
                <th className="p-2 text-right">IVA Compra</th>
                <th className="p-2 text-right">Cruce IVA</th>
                <th className="p-2 text-right">Mes presentación</th>
              </tr>
            </thead>
            <tbody>
              {series.map((s, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2">{s.label}</td>
                  <td className="p-2 text-right">$ {Number(s.iva_ventas).toLocaleString("es-CO")}</td>
                  <td className="p-2 text-right">$ {Number(s.iva_compras).toLocaleString("es-CO")}</td>
                  <td className="p-2 text-right">$ {Number(s.saldo_iva).toLocaleString("es-CO")}</td>
                  <td className="p-2 text-right">{s.mes_presentacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div>
        <label className="text-sm font-semibold">Modo presentación:</label><br />
        <select value={modo} onChange={e => setModo(e.target.value as any)} className="border p-1 rounded mt-1">
          <option value="bimensual">Bimensual</option>
          <option value="trimestral">Trimestral</option>
          <option value="cuatrimestral">Cuatrimestral</option>
        </select>
      </div>

      {agrupadas.length > 0 && (
        <Card>
          <CardHeader><CardTitle>📄 Tabla resumen agrupada ({modo})</CardTitle></CardHeader>
          <CardContent className="overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Mes presentación</th>
                  <th className="p-2 text-right">IVA Venta</th>
                  <th className="p-2 text-right">IVA Compra</th>
                  <th className="p-2 text-right">Cruce IVA</th>
                </tr>
              </thead>
              <tbody>
                {agrupadas.map((fila, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2 text-left">{fila.label}</td>
                    <td className="p-2 text-right">$ {Number(fila.iva_ventas).toLocaleString("es-CO")}</td>
                    <td className="p-2 text-right">$ {Number(fila.iva_compras).toLocaleString("es-CO")}</td>
                    <td className="p-2 text-right">$ {Number(fila.saldo_iva).toLocaleString("es-CO")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
