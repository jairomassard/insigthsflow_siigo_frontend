"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  CartesianGrid,
} from "recharts";

/* --- Helpers --- */
function formatMiles(valor: number | string): string {
  const n = typeof valor === "number" ? valor : parseFloat(valor);
  return `$ ${n.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}

function abreviar(valor: number): string {
  if (valor >= 1_000_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000) return `${(valor / 1_000).toFixed(0)}K`;
  return `${valor}`;
}

/* --- Interfaces --- */
interface Globales {
  empleados: number;
  total_sueldos: number;
  total_auxilios: number;
  total_vacaciones: number;
  total_primas: number;
  total_intereses_cesantias: number;
  total_cesantias: number;
  total_extralegal: number;
  total_ingresos: number;
  total_salud: number;
  total_pension: number;
  total_solidaridad: number;
  total_retefuente: number;
  total_prestamos: number;
  total_deducciones: number;
  total_neto_pagar: number;
}

interface Empleado {
  nombre: string;
  identificacion: string;
  sueldo: number;
  aux_transporte: number;
  prov_vacaciones: number;
  prov_prima: number;
  prov_intereses_cesantias: number;
  prov_cesantias: number;
  auxilio_extralegal: number;
  total_ingresos: number;
  fondo_salud: number;
  fondo_pension: number;
  fondo_solidaridad: number;
  retefuente: number;
  prestamos: number;
  total_deducciones: number;
  neto_pagar: number;
}

/* --- Componente principal --- */
export default function ReporteNominaDashboardPage() {
  const [globales, setGlobales] = useState<Globales | null>(null);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [topEmpleados, setTopEmpleados] = useState<Empleado[]>([]);
  const [cantidadEmpleados, setCantidadEmpleados] = useState<number>(10);

  const [mes, setMes] = useState<string>("");
  const [anio, setAnio] = useState<string>(new Date().getFullYear().toString());
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");
  const [empleadoSel, setEmpleadoSel] = useState<string>("");

  const limpiarFiltros = () => {
    setMes("");
    setAnio(new Date().getFullYear().toString());
    setDesde("");
    setHasta("");
    setEmpleadoSel("");
  };

  useEffect(() => {
    const fetchData = async () => {
      const params = new URLSearchParams();

      if (anio) params.append("anio", anio);
      if (mes) params.append("mes", mes);
      if (empleadoSel) params.append("empleado", empleadoSel);
      if (desde) params.append("desde", desde);
      if (hasta) params.append("hasta", hasta);

      const url = `/reportes/nomina/dashboard?${params.toString()}`;
      try {
        const res = await authFetch(url);
        setGlobales(res?.globales || null);
        setEmpleados(res?.empleados || []);
        setTopEmpleados(res?.empleados?.slice(0, cantidadEmpleados) || []);
      } catch (err) {
        console.error("Error cargando datos de nómina:", err);
      }
    };

    fetchData();
  }, [anio, mes, desde, hasta, empleadoSel, cantidadEmpleados]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📊 Dashboard de Costos Nómina</h1>

      {/* --- Filtros --- */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-6">
            <div>
              <label className="text-sm font-medium">Desde</label>
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium">Hasta</label>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium">Mes</label>
              <select
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="border rounded p-2 w-full"
              >
                <option value="">Todos</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString("es", { month: "long" })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Año</label>
              <Input
                type="number"
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Empleado</label>
              <select
                value={empleadoSel}
                onChange={(e) => setEmpleadoSel(e.target.value)}
                className="border rounded p-2 w-full"
              >
                <option value="">Todos</option>
                {empleados.map((e) => (
                  <option key={e.identificacion} value={e.identificacion}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Empleados en gráfico</label>
              <Input
                type="number"
                value={cantidadEmpleados}
                min={1}
                max={100}
                onChange={(e) => setCantidadEmpleados(Number(e.target.value))}
              />
            </div>
          </div>

          {/* --- Botón limpiar filtros --- */}
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={limpiarFiltros} className="flex items-center gap-2">
              🔄 Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* --- KPIs --- */}
      {globales && (
        <div className="flex flex-wrap gap-4 overflow-x-auto">
          {[
            { label: "Empleados", key: "empleados", color: "text-black" },
            { label: "Sueldos", key: "total_sueldos", color: "text-blue-600" },
            { label: "Auxilios", key: "total_auxilios", color: "text-blue-600" },
            { label: "Extralegal", key: "total_extralegal", color: "text-blue-600" },
            {
              label: "Provisiones",
              value: formatMiles(
                (globales.total_primas || 0) +
                  (globales.total_intereses_cesantias || 0) +
                  (globales.total_cesantias || 0)
              ),
              color: "text-purple-600",
            },
            { label: "Ingresos", key: "total_ingresos", color: "text-purple-600" },
            { label: "Préstamos", key: "total_prestamos", color: "text-yellow-600" },
            { label: "ReteFuente", key: "total_retefuente", color: "text-orange-600" },
            { label: "Deducciones", key: "total_deducciones", color: "text-red-600" },
            { label: "Neto Pagar", key: "total_neto_pagar", color: "text-green-600" },
          ].map(({ label, key, color, value }) => (
            <Card key={label} className="w-[140px] min-w-[120px] shadow-sm h-[85px]">
              <CardContent className="p-1 flex flex-col items-center justify-center">
                <div className="text-m text-gray-500 font-bold text-center">{label}</div>
                <div className={`text-l font-bold ${color}`}>
                  {value ||
                    (key === "empleados"
                      ? globales[key as keyof Globales]
                      : formatMiles(globales[key as keyof Globales] || 0))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* --- Gráficos --- */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Ingresos por Empleado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topEmpleados} layout="vertical" margin={{ left: 20, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="nombre" width={140} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatMiles(v)} />
                <Bar dataKey="total_ingresos" fill="#3b82f6" radius={[0, 6, 6, 0]}>
                  <LabelList dataKey="total_ingresos" position="right" formatter={(v: any) => abreviar(Number(v))} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Neto a Pagar por Empleado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topEmpleados} layout="vertical" margin={{ left: 20, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="nombre" width={140} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatMiles(v)} />
                <Bar dataKey="neto_pagar" fill="#16a34a" radius={[0, 6, 6, 0]}>
                  <LabelList dataKey="neto_pagar" position="right" formatter={(v: any) => abreviar(Number(v))} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* --- Tabla de empleados --- */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle Nómina por Empleado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border">
              <thead className="bg-gray-100 text-center">
                <tr>
                  {["Nombre", "Identificación", "Sueldo", "Aux. Transporte", "Aux. Extralegal", "Provisiones Empresa", "Ingresos", "Préstamos", "ReteFuente", "Deducciones", "Neto"].map((h) => (
                    <th key={h} className="px-3 py-2 border whitespace-nowrap font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {empleados.map((e, i) => (
                  <tr key={i} className="border-t text-right">
                    <td className="px-3 py-1 border text-left whitespace-nowrap">{e.nombre}</td>
                    <td className="px-3 py-1 border text-center whitespace-nowrap">{e.identificacion}</td>
                    <td className="px-3 py-1 border text-center">{formatMiles(e.sueldo)}</td>
                    <td className="px-3 py-1 border text-center">{formatMiles(e.aux_transporte)}</td>
                    <td className="px-3 py-1 border text-center">{formatMiles(e.auxilio_extralegal)}</td>
                    <td className="px-3 py-1 border text-center">{formatMiles((e.prov_prima || 0) + (e.prov_intereses_cesantias || 0) + (e.prov_cesantias || 0))}</td>
                    <td className="px-3 py-1 border text-center">{formatMiles(e.total_ingresos)}</td>
                    <td className="px-3 py-1 border text-center">{formatMiles(e.prestamos)}</td>
                    <td className="px-3 py-1 border text-center">{formatMiles(e.retefuente)}</td>
                    <td className="px-3 py-1 border text-center">{formatMiles(e.total_deducciones)}</td>
                    <td className="px-3 py-1 border text-center font-bold text-green-700">{formatMiles(e.neto_pagar)}</td>
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
