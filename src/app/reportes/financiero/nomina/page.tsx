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
  LineChart,
  Line,
  Legend,
} from "recharts";

/* --- Helpers --- */
function formatMiles(valor: number | string): string {
  const n = typeof valor === "number" ? valor : parseFloat(String(valor || 0));
  return `$ ${Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}

function abreviar(valor: number): string {
  if (valor >= 1_000_000_000) return `${(valor / 1_000_000_000).toFixed(1)}B`;
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000) return `${(valor / 1_000).toFixed(0)}K`;
  return `${valor}`;
}

function formatearPeriodo(periodo: string): string {
  if (!periodo) return "";
  const [anio, mes] = periodo.split("-");
  const fecha = new Date(Number(anio), Number(mes) - 1, 1);
  return fecha.toLocaleDateString("es-CO", { month: "short", year: "numeric" });
}

/* --- Interfaces --- */
interface Globales {
  empleados: number;
  total_sueldos: number;
  total_auxilios: number;
  total_extralegal: number;
  total_prima: number;
  total_intereses_cesantias: number;
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
  no_contrato?: string;
  sueldo: number;
  aux_transporte: number;
  auxilio_extralegal: number;
  prima: number;
  intereses_cesantias: number;
  total_ingresos: number;
  fondo_salud: number;
  fondo_pension: number;
  fondo_solidaridad: number;
  retefuente: number;
  prestamos: number;
  total_deducciones: number;
  neto_pagar: number;
}

interface EvolucionMensualItem {
  periodo: string;
  empleados: number;
  total_ingresos: number;
  total_deducciones: number;
  total_neto_pagar: number;
}

/* --- Componente principal --- */
export default function ReporteNominaDashboardPage() {
  const [globales, setGlobales] = useState<Globales | null>(null);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [topEmpleados, setTopEmpleados] = useState<Empleado[]>([]);
  const [evolucionMensual, setEvolucionMensual] = useState<EvolucionMensualItem[]>([]);
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
        const empleadosRes = res?.empleados || [];
        const topRes = res?.top_empleados || [];

        setGlobales(res?.globales || null);
        setEmpleados(empleadosRes);
        setTopEmpleados(topRes.slice(0, cantidadEmpleados));
        setEvolucionMensual(res?.evolucion_mensual || []);
      } catch (err) {
        console.error("Error cargando datos de nómina:", err);
        setGlobales(null);
        setEmpleados([]);
        setTopEmpleados([]);
        setEvolucionMensual([]);
      }
    };

    fetchData();
  }, [anio, mes, desde, hasta, empleadoSel, cantidadEmpleados]);

  const empleadosOptions = [...empleados].sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📊 Dashboard de Costos Nómina</h1>

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
                {empleadosOptions.map((e) => (
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

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={limpiarFiltros} className="flex items-center gap-2">
              🔄 Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {globales && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10">
          {[
            { label: "Empleados", key: "empleados", color: "text-black" },
            { label: "Sueldos", key: "total_sueldos", color: "text-blue-600" },
            { label: "Auxilios", key: "total_auxilios", color: "text-cyan-600" },
            { label: "Extralegal", key: "total_extralegal", color: "text-indigo-600" },
            { label: "Prima", key: "total_prima", color: "text-violet-600" },
            { label: "Intereses Cesantías", key: "total_intereses_cesantias", color: "text-fuchsia-600" },            
            { label: "Ingresos", key: "total_ingresos", color: "text-purple-600" },
            { label: "Préstamos", key: "total_prestamos", color: "text-yellow-600" },
            { label: "ReteFuente", key: "total_retefuente", color: "text-orange-600" },
            { label: "Deducciones", key: "total_deducciones", color: "text-red-600" },
            { label: "Neto Pagar", key: "total_neto_pagar", color: "text-green-600" },
          ].map(({ label, key, color }) => (
            <Card key={label} className="shadow-sm">
              <CardContent className="p-3 flex flex-col items-center justify-center min-h-[88px]">
                <div className="text-sm text-gray-500 font-bold text-center">{label}</div>
                <div className={`text-base font-bold ${color} text-center`}>
                  {key === "empleados"
                    ? globales[key as keyof Globales]
                    : formatMiles(globales[key as keyof Globales] || 0)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Evolución mensual de la nómina</CardTitle>
        </CardHeader>
        <CardContent>
          {evolucionMensual.length > 0 ? (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={evolucionMensual} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="periodo"
                  tickFormatter={formatearPeriodo}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tickFormatter={(v) => abreviar(Number(v))} />
                <Tooltip
                  formatter={(value: number) => formatMiles(value)}
                  labelFormatter={(label) => `Periodo: ${formatearPeriodo(label)}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total_ingresos"
                  name="Ingresos"
                  stroke="#7c3aed"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="total_deducciones"
                  name="Deducciones"
                  stroke="#dc2626"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="total_neto_pagar"
                  name="Neto pagar"
                  stroke="#16a34a"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-gray-500">
              No hay datos suficientes para mostrar la evolución mensual.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Ingresos por Empleado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={topEmpleados} layout="vertical" margin={{ left: 20, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="nombre" width={160} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatMiles(v)} />
                <Bar dataKey="total_ingresos" fill="#3b82f6" radius={[0, 6, 6, 0]}>
                  <LabelList
                    dataKey="total_ingresos"
                    position="right"
                    formatter={(value: any) => abreviar(Number(value || 0))}
                  />
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
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={topEmpleados} layout="vertical" margin={{ left: 20, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="nombre" width={160} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatMiles(v)} />
                <Bar dataKey="neto_pagar" fill="#16a34a" radius={[0, 6, 6, 0]}>
                  <LabelList
                    dataKey="neto_pagar"
                    position="right"
                    formatter={(value: any) => abreviar(Number(value || 0))}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalle Nómina por Empleado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border">
              <thead className="bg-gray-100 text-center">
                <tr>
                  {[
                    "Nombre",
                    "Identificación",
                    "No. Contrato",
                    "Sueldo",
                    "Aux. Transporte",
                    "Aux. Extralegal",
                    "Prima",
                    "Intereses Cesantías",
                    "Ingresos",
                    "Salud",
                    "Pensión",
                    "Solidaridad",
                    "Préstamos",
                    "ReteFuente",
                    "Deducciones",
                    "Neto",
                  ].map((h) => (
                    <th key={h} className="px-3 py-2 border whitespace-nowrap font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {empleados.map((e, i) => (
                  <tr key={i} className="border-t text-right">
                    <td className="px-3 py-1 border text-left whitespace-nowrap">{e.nombre}</td>
                    <td className="px-3 py-1 border text-center whitespace-nowrap">{e.identificacion}</td>
                    <td className="px-3 py-1 border text-center whitespace-nowrap">{e.no_contrato || ""}</td>
                    <td className="px-3 py-1 border text-center">{formatMiles(e.sueldo)}</td>
                    <td className="px-3 py-1 border text-center">{formatMiles(e.aux_transporte)}</td>
                    <td className="px-3 py-1 border text-center">{formatMiles(e.auxilio_extralegal)}</td>
                    <td className="px-3 py-1 border text-center">{formatMiles(e.prima || 0)}</td>
                    <td className="px-3 py-1 border text-center">{formatMiles(e.intereses_cesantias || 0)}</td>
                    <td className="px-3 py-1 border text-center">{formatMiles(e.total_ingresos)}</td>
                    <td className="px-3 py-1 border text-center">{formatMiles(e.fondo_salud)}</td>
                    <td className="px-3 py-1 border text-center">{formatMiles(e.fondo_pension)}</td>
                    <td className="px-3 py-1 border text-center">{formatMiles(e.fondo_solidaridad)}</td>
                    <td className="px-3 py-1 border text-center">{formatMiles(e.prestamos)}</td>
                    <td className="px-3 py-1 border text-center">{formatMiles(e.retefuente)}</td>
                    <td className="px-3 py-1 border text-center">{formatMiles(e.total_deducciones)}</td>
                    <td className="px-3 py-1 border text-center font-bold text-green-700">
                      {formatMiles(e.neto_pagar)}
                    </td>
                  </tr>
                ))}
                {empleados.length === 0 && (
                  <tr>
                    <td colSpan={15} className="px-4 py-6 text-center text-gray-500">
                      No hay registros de nómina para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}