"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";

type Cliente = {
  cliente_nombre: string;
  total: number;
  total_str: string;
  aging: {
    por_vencer: number;
    "1_30": number;
    "31_60": number;
    "61_90": number;
    "91_mas": number;
  };
  facturas: any[];
};

type Proyeccion = {
  fecha: string;
  total: number;
  total_str: string;
  vencido: boolean;
  facturas: {
    idfactura: string;
    cliente_nombre: string;
    saldo: number;
    public_url: string | null;
    dias_vencidos: number; // ✅ agregar esta línea
  }[];
};

export default function ReporteCxCPage() {
  useAuthGuard();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [resumen, setResumen] = useState<any>({});
  const [proyeccion, setProyeccion] = useState<Proyeccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBar, setSelectedBar] = useState<Proyeccion | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await authFetch("/reportes/cuentas-por-cobrar?detalle=1");
        if (res.error) throw new Error(res.error);

        setResumen(res.resumen_global);
        setClientes(
          res.consolidado.map((c: any) => ({
            ...c,
            facturas: (res.detalle || []).filter(
              (d: any) => d.cliente_nombre === c.cliente_nombre
            ),
          }))
        );
        setProyeccion(res.proyeccion_por_fecha || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Determinar rango usando `dias_vencidos` entregado por backend
  const calcularRango = (dias_vencidos: number) => {
    if (dias_vencidos <= 0) return "Por vencer";
    if (dias_vencidos <= 30) return "1-30";
    if (dias_vencidos <= 60) return "31-60";
    if (dias_vencidos <= 90) return "61-90";
    return "91+";
  };

  // Saber si una fecha está vencida
  const esVencido = (fecha: string) => {
    const hoy = new Date();
    const f = new Date(fecha);
    return f < hoy; // vencido si fecha < hoy
  };


  // función auxiliar para rango por barra
  const obtenerRangoBarra = (entry: Proyeccion): string | null => {
    if (!entry.vencido || entry.facturas.length === 0) return null;

    const diasMax = Math.max(...entry.facturas.map(f => f.dias_vencidos ?? 0));

    if (diasMax <= 30) return "Vencido 1-30";
    if (diasMax <= 60) return "Vencido 31-60";
    if (diasMax <= 90) return "Vencido 61-90";
    return "Vencido 91+";
  };



  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-4">
        📊 Reporte de Cuentas por Cobrar (Cartera)
      </h1>

      {loading && <p className="text-gray-500">Cargando datos…</p>}
      {error && <p className="text-red-600">Error: {error}</p>}

      {!loading && !error && (
        <>
          {/* Resumen Global */}
          <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-4">
            <Card><CardHeader><CardTitle>Facturas vivas</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{resumen.facturas_vivas}</p></CardContent></Card>
            <Card><CardHeader><CardTitle>Total CxC</CardTitle></CardHeader><CardContent><p className="text-xl font-bold text-blue-600">{resumen.total_global}</p></CardContent></Card>
            <Card><CardHeader><CardTitle>Total vencido</CardTitle></CardHeader><CardContent><p className="text-xl font-bold text-red-600">{resumen.total_vencido}</p></CardContent></Card>
            <Card><CardHeader><CardTitle>% vencido</CardTitle></CardHeader><CardContent><p className="text-xl font-bold text-orange-500">{resumen.pct_vencido}%</p></CardContent></Card>
          </div>

          <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-5">

            <Card><CardHeader><CardTitle>Total por Vencer</CardTitle></CardHeader><CardContent><p className="text-xl font-bold text-green-600">{resumen.total_por_vencer}</p></CardContent></Card>
            <Card><CardHeader><CardTitle>Vencido 1-30</CardTitle></CardHeader><CardContent><p className="text-xl font-bold" style={{ color: "#f87171" }}>{fmt(resumen.total_1_30)}</p></CardContent></Card>
            <Card><CardHeader><CardTitle>Vencido 31-60</CardTitle></CardHeader><CardContent><p className="text-xl font-bold" style={{ color: "#ef4444" }}>{fmt(resumen.total_31_60)}</p></CardContent></Card>
            <Card><CardHeader><CardTitle>Vencido 61-90</CardTitle></CardHeader><CardContent><p className="text-xl font-bold" style={{ color: "#dc2626" }}>{fmt(resumen.total_61_90)}</p></CardContent></Card>
            <Card><CardHeader><CardTitle>Vencido 91+</CardTitle></CardHeader><CardContent><p className="text-xl font-bold" style={{ color: "#b91c1c" }}>{fmt(resumen.total_91_mas)}</p></CardContent></Card>


         </div>

          {/* Proyección por fecha */}
          <Card>
            <CardHeader>
              <CardTitle className="text-md">
                📅 Proyección de cobros por fecha
              </CardTitle>
            </CardHeader>
            <CardContent>
            <ResponsiveContainer width="100%" height={350}>
            <BarChart data={proyeccion}>
                <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
                <YAxis
                tickFormatter={(v) => `$${(v / 1_000_000).toFixed(0)}M`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;

                    const entry = payload[0].payload as Proyeccion;
                    const rango = obtenerRangoBarra(entry);
                    const totalFormatted = entry.total_str;
                    return (
                      <div className="bg-white border rounded shadow p-2 text-sm">
                        {rango && <div className="font-semibold text-gray-700 mb-1">{rango}</div>}
                        <div><strong>Vencimiento:</strong> {label}</div>
                        <div><strong>Total:</strong> {totalFormatted}</div>
                      </div>
                    );
                  }}
                />

                <Bar
                    dataKey="total"
                    radius={[6, 6, 0, 0]}
                    onClick={(data) => {
                        if (data && data.payload) {
                        setSelectedBar(data.payload as Proyeccion);
                        }
                    }}
                    >
                    {/* Pintar verde o rojo según vencimiento */}
                    {proyeccion.map((entry: Proyeccion, index) => {
                      let diasMax = 0;

                      if (entry.vencido && entry.facturas.length > 0) {
                        diasMax = Math.max(...entry.facturas.map(f => f.dias_vencidos ?? 0));

                      }

                      let color = "#16a34a"; // verde por defecto (por vencer)

                      if (entry.vencido) {
                        if (diasMax <= 30) color = "#f87171";
                        else if (diasMax <= 60) color = "#ef4444";
                        else if (diasMax <= 90) color = "#dc2626";
                        else color = "#b91c1c";
                      }

                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}


                    {/* Etiquetas arriba de cada barra */}
                    <LabelList
                        dataKey="total"
                        position="top"
                        content={(props) => {
                        const { x, y, value } = props;
                        if (value == null) return null;

                        let displayValue = "";
                        const v = Number(value);
                        if (v >= 1_000_000_000) displayValue = (v / 1_000_000_000).toFixed(1) + "B";
                        else if (v >= 1_000_000) displayValue = (v / 1_000_000).toFixed(0) + "M";
                        else if (v >= 1_000) displayValue = (v / 1_000).toFixed(0) + "K";
                        else displayValue = v.toString();

                        return (
                            <text
                            x={x}
                            y={y}
                            dy={-4}
                            fill="#333"
                            fontSize={12}
                            textAnchor="middle"
                            >
                            {displayValue}
                            </text>
                        );
                        }}
                    />
                </Bar>

            </BarChart>
            </ResponsiveContainer>


              {/* Panel fijo de facturas */}
              {selectedBar && (
                <div className="mt-4 p-4 border rounded-lg shadow-md bg-white max-h-96 overflow-auto">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                        {obtenerRangoBarra(selectedBar) && (
                        <p className="text-sm font-semibold text-gray-700">
                          {obtenerRangoBarra(selectedBar)}
                        </p>
                      )}
                      <p className="font-semibold">
                        Vencimiento: {selectedBar.fecha}
                      </p>

                      <p className="text-green-700 font-bold">
                        Total día: {selectedBar.total_str}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedBar(null)}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Cerrar
                    </button>
                  </div>

                  <div className="grid gap-2">
                    {selectedBar.facturas.map((f: any, idx: number) => (
                      <div
                        key={idx}
                        className="border p-2 rounded bg-gray-50 text-sm"
                      >
                        <p className="font-medium">{f.cliente_nombre}</p>
                        <p className="text-xs text-gray-600">
                          Factura: {f.idfactura}
                        </p>
                        <p className="text-xs text-gray-600">
                          Valor: ${Number(f.saldo).toLocaleString("es-CO")}
                        </p>
                        {f.public_url && (
                          <a
                            href={f.public_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 text-xs hover:underline"
                          >
                            Ver factura
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clientes */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clientes.map((cliente, idx) => (
              <Card key={idx} className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">{cliente.cliente_nombre}</CardTitle>
                  <div className="text-sm text-gray-600">
                    Total: <b>{cliente.total_str}</b>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Gráfico de aging */}
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={[
                        { bucket: "Por vencer", monto: cliente.aging.por_vencer },
                        { bucket: "1-30", monto: cliente.aging["1_30"] },
                        { bucket: "31-60", monto: cliente.aging["31_60"] },
                        { bucket: "61-90", monto: cliente.aging["61_90"] },
                        { bucket: "91+", monto: cliente.aging["91_mas"] },
                      ]}
                      margin={{ top: 30, left: 20 }} // 👈 Ajuste importante
                    >
                      <XAxis dataKey="bucket" />
                      <YAxis hide />
                      <Tooltip
                        formatter={(v: number) =>
                          `$ ${v.toLocaleString("es-CO")}`
                        }
                      />
                      <Bar dataKey="monto" radius={[6, 6, 0, 0]}>
                        {[
                            cliente.aging.por_vencer,
                            cliente.aging["1_30"],
                            cliente.aging["31_60"],
                            cliente.aging["61_90"],
                            cliente.aging["91_mas"],
                        ].map((_, i) => (
                            <Cell
                                key={`cell-${i}`}
                                fill={
                                    ["#2563eb", "#f87171", "#ef4444", "#dc2626", "#b91c1c"][i]
                                }
                            />
                        ))}
                            <LabelList
                                dataKey="monto"
                                position="top"
                                content={(props) => {
                                const { x, y, value } = props;
                                if (value == null) return null;

                                let displayValue = "";
                                const v = Number(value);
                                if (v >= 1_000_000_000) displayValue = (v / 1_000_000_000).toFixed(1) + "B";
                                else if (v >= 1_000_000) displayValue = (v / 1_000_000).toFixed(0) + "M";
                                else if (v >= 1_000) displayValue = (v / 1_000).toFixed(0) + "K";
                                else displayValue = v.toString();

                                return (
                                    <text
                                    x={x}
                                    y={y}
                                    dy={-4}
                                    fill="#333"
                                    fontSize={12}
                                    textAnchor="middle"
                                    >
                                    {displayValue}
                                    </text>
                                );
                                }}
                            />
    
                       </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Detalle de facturas */}
                  <Accordion type="single" collapsible className="mt-4">
                    <AccordionItem value="facturas">
                      <AccordionTrigger className="text-sm font-medium">
                        Ver detalle de facturas
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="overflow-auto max-h-60">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="p-2 text-left">Factura</th>
                                <th className="p-2 text-left">Fecha</th>
                                <th className="p-2 text-left">Vencimiento</th>
                                <th className="p-2 text-left">Rango</th>
                                <th className="p-2 text-right">Saldo</th>
                                <th className="p-2">Link</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cliente.facturas.map((f: any, i: number) => {
                                const rango = calcularRango(f.dias_vencidos);
                                const esVencida =
                                  rango !== "Por vencer"; // vencidas son 1-30, 31-60, 61-90, 91+
                                return (
                                  <tr
                                    key={i}
                                    className={`border-b ${
                                      esVencida ? "text-red-600" : ""
                                    }`}
                                  >
                                    <td className="p-2">{f.idfactura}</td>
                                    <td className="p-2">{f.fecha}</td>
                                    <td className="p-2">{f.vencimiento}</td>
                                    <td className="p-2">{rango}</td>
                                    <td className="p-2 text-right">
                                      {f.saldo_str}
                                    </td>
                                    <td className="p-2 text-center">
                                      {f.public_url ? (
                                        <a
                                          href={f.public_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-blue-600 hover:underline"
                                        >
                                          Ver
                                        </a>
                                      ) : (
                                        "-"
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ✅ Formateador general
function fmt(n: any) {
    return typeof n === "number"
        ? `$ ${n.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`
        : n;
}
