"use client";

import { useEffect, useMemo, useState } from "react";
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

type FacturaDetalle = {
  idfactura: string;
  cliente_nombre: string;
  centro_costo_nombre?: string;
  vendedor_nombre?: string;
  fecha: string;
  vencimiento: string;
  dias_vencidos: number;
  dias_transcurridos?: number;
  total: number;
  pagos_total: number;
  saldo: number;
  saldo_str: string;
  total_str: string;
  public_url: string | null;
};

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
  facturas: FacturaDetalle[];
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
    dias_vencidos: number;
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
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [mostrarTabla, setMostrarTabla] = useState(false);

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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedCliente(null);
        setSelectedBar(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const obtenerRangoBarra = (entry: Proyeccion): string | null => {
    if (!entry.vencido || entry.facturas.length === 0) return null;

    const diasMax = Math.max(...entry.facturas.map((f) => f.dias_vencidos ?? 0));

    if (diasMax <= 30) return "Vencido 1-30";
    if (diasMax <= 60) return "Vencido 31-60";
    if (diasMax <= 90) return "Vencido 61-90";
    return "Vencido 91+";
  };

  const totalPorVencer = useMemo(
    () => clientes.reduce((acc, c) => acc + Number(c.aging?.por_vencer || 0), 0),
    [clientes]
  );

  const total1_30 = useMemo(
    () => clientes.reduce((acc, c) => acc + Number(c.aging?.["1_30"] || 0), 0),
    [clientes]
  );

  const total31_60 = useMemo(
    () => clientes.reduce((acc, c) => acc + Number(c.aging?.["31_60"] || 0), 0),
    [clientes]
  );

  const total61_90 = useMemo(
    () => clientes.reduce((acc, c) => acc + Number(c.aging?.["61_90"] || 0), 0),
    [clientes]
  );

  const total91Mas = useMemo(
    () => clientes.reduce((acc, c) => acc + Number(c.aging?.["91_mas"] || 0), 0),
    [clientes]
  );

  const totalGeneral = useMemo(
    () => clientes.reduce((acc, c) => acc + Number(c.total || 0), 0),
    [clientes]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-4">
        📊 Reporte de Cuentas por Cobrar (Cartera)
      </h1>

      {loading && <p className="text-gray-500">Cargando datos…</p>}
      {error && <p className="text-red-600">Error: {error}</p>}

      {!loading && !error && (
        <>
          <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Facturas vivas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{resumen.facturas_vivas}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total CxC</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-blue-600">
                  {resumen.total_global}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total vencido</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-red-600">
                  {resumen.total_vencido}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>% vencido</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-orange-500">
                  {resumen.pct_vencido}%
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-5">
            <Card>
              <CardHeader>
                <CardTitle>Total por Vencer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-green-600">
                  {resumen.total_por_vencer}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vencido 1-30</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold" style={{ color: "#f87171" }}>
                  {fmt(resumen.total_1_30)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vencido 31-60</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold" style={{ color: "#ef4444" }}>
                  {fmt(resumen.total_31_60)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vencido 61-90</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold" style={{ color: "#dc2626" }}>
                  {fmt(resumen.total_61_90)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vencido 91+</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold" style={{ color: "#b91c1c" }}>
                  {fmt(resumen.total_91_mas)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-md">📅 Proyección de cobros por fecha</CardTitle>
            </CardHeader>

            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={proyeccion}>
                  <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `$${(Number(v) / 1_000_000).toFixed(0)}M`} />

                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;

                      const entry = payload[0].payload as Proyeccion;
                      const rango = obtenerRangoBarra(entry);
                      const totalFormatted = entry.total_str;

                      return (
                        <div className="bg-white border rounded shadow p-2 text-sm">
                          {rango && (
                            <div className="font-semibold text-gray-700 mb-1">
                              {rango}
                            </div>
                          )}

                          <div>
                            <strong>Vencimiento:</strong> {label}
                          </div>

                          <div>
                            <strong>Total:</strong> {totalFormatted}
                          </div>
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
                    {proyeccion.map((entry: Proyeccion, index) => {
                      let diasMax = 0;

                      if (entry.vencido && entry.facturas.length > 0) {
                        diasMax = Math.max(
                          ...entry.facturas.map((f) => f.dias_vencidos ?? 0)
                        );
                      }

                      let color = "#16a34a";

                      if (entry.vencido) {
                        if (diasMax <= 30) color = "#f87171";
                        else if (diasMax <= 60) color = "#ef4444";
                        else if (diasMax <= 90) color = "#dc2626";
                        else color = "#b91c1c";
                      }

                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}

                    <LabelList
                      dataKey="total"
                      position="top"
                      content={(props) => {
                        const { x, y, value } = props;
                        if (value == null) return null;

                        const v = Number(value);
                        let displayValue = "";

                        if (v >= 1_000_000_000) {
                          displayValue = (v / 1_000_000_000).toFixed(1) + "B";
                        } else if (v >= 1_000_000) {
                          displayValue = (v / 1_000_000).toFixed(0) + "M";
                        } else if (v >= 1_000) {
                          displayValue = (v / 1_000).toFixed(0) + "K";
                        } else {
                          displayValue = v.toString();
                        }

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

              <div className="mt-6 mb-4">
                <div className="text-right">
                  <button
                    onClick={() => setMostrarTabla((prev) => !prev)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm transition"
                  >
                    {mostrarTabla ? "Ocultar tabla de aging" : "Mostrar tabla de aging"}
                  </button>
                </div>

                {mostrarTabla && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-[980px] w-full text-sm border border-gray-300 rounded-lg shadow-sm">
                      <thead className="bg-gray-100 text-gray-700 sticky top-0">
                        <tr>
                          <th className="p-2 text-left">Cliente</th>
                          <th className="p-2 text-right">Por vencer</th>
                          <th className="p-2 text-right">1-30</th>
                          <th className="p-2 text-right">31-60</th>
                          <th className="p-2 text-right">61-90</th>
                          <th className="p-2 text-right">91+</th>
                          <th className="p-2 text-right">Total</th>
                        </tr>
                      </thead>

                      <tbody>
                        {clientes.map((c, i) => (
                          <tr
                            key={i}
                            className={`border-b hover:bg-gray-50 ${
                              c.total === 0 ? "text-gray-400" : ""
                            }`}
                          >
                            <td className="p-2 whitespace-nowrap">{c.cliente_nombre}</td>

                            <td className="p-2 text-right text-green-600">
                              <div>{fmt(c.aging.por_vencer)}</div>
                              <div className="text-[11px] text-gray-500">
                                {fmtPct(pct(c.aging.por_vencer, totalPorVencer))}
                              </div>
                            </td>

                            <td className="p-2 text-right text-orange-500">
                              <div>{fmt(c.aging["1_30"])}</div>
                              <div className="text-[11px] text-gray-500">
                                {fmtPct(pct(c.aging["1_30"], total1_30))}
                              </div>
                            </td>

                            <td className="p-2 text-right text-orange-600">
                              <div>{fmt(c.aging["31_60"])}</div>
                              <div className="text-[11px] text-gray-500">
                                {fmtPct(pct(c.aging["31_60"], total31_60))}
                              </div>
                            </td>

                            <td className="p-2 text-right text-red-600">
                              <div>{fmt(c.aging["61_90"])}</div>
                              <div className="text-[11px] text-gray-500">
                                {fmtPct(pct(c.aging["61_90"], total61_90))}
                              </div>
                            </td>

                            <td className="p-2 text-right text-red-800">
                              <div>{fmt(c.aging["91_mas"])}</div>
                              <div className="text-[11px] text-gray-500">
                                {fmtPct(pct(c.aging["91_mas"], total91Mas))}
                              </div>
                            </td>

                            <td className="p-2 text-right font-semibold">
                              <div>{fmt(c.total)}</div>
                              <div className="text-[11px] text-gray-500">
                                {fmtPct(pct(c.total, totalGeneral))}
                              </div>
                            </td>
                          </tr>
                        ))}

                        <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                          <td className="p-2 text-left">Totales</td>

                          <td className="p-2 text-right text-green-600">
                            <div>{fmt(totalPorVencer)}</div>
                            <div className="text-[11px] text-gray-500">100,0%</div>
                          </td>

                          <td className="p-2 text-right text-orange-500">
                            <div>{fmt(total1_30)}</div>
                            <div className="text-[11px] text-gray-500">100,0%</div>
                          </td>

                          <td className="p-2 text-right text-orange-600">
                            <div>{fmt(total31_60)}</div>
                            <div className="text-[11px] text-gray-500">100,0%</div>
                          </td>

                          <td className="p-2 text-right text-red-600">
                            <div>{fmt(total61_90)}</div>
                            <div className="text-[11px] text-gray-500">100,0%</div>
                          </td>

                          <td className="p-2 text-right text-red-800">
                            <div>{fmt(total91Mas)}</div>
                            <div className="text-[11px] text-gray-500">100,0%</div>
                          </td>

                          <td className="p-2 text-right font-bold">
                            <div>{fmt(totalGeneral)}</div>
                            <div className="text-[11px] text-gray-500">100,0%</div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {selectedCliente && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                  <div
                    className="relative flex flex-col rounded-2xl bg-white shadow-2xl border border-white/40"
                    style={{
                      width: "min(95vw, 1120px)",
                      height: "min(90vh, 760px)",
                      minWidth: "430px",
                      minHeight: "420px",
                      maxWidth: "96vw",
                      maxHeight: "92vh",
                      resize: "both",
                      overflow: "auto",
                    }}
                  >
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-white px-4 py-3 rounded-t-2xl">
                      <div>
                        <h2 className="text-lg font-semibold">
                          Detalle ampliado del cliente
                        </h2>
                        <p className="text-xs text-gray-500">
                          Puedes ajustar el tamaño desde la esquina inferior derecha.
                        </p>
                      </div>

                      <button
                        onClick={() => setSelectedCliente(null)}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-auto p-4">
                      <ClienteCard cliente={selectedCliente} ampliado />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clientes.map((cliente, idx) => (
              <ClienteCard
                key={idx}
                cliente={cliente}
                onAmpliar={() => setSelectedCliente(cliente)}
              />
            ))}
          </div>

       </>
      )}
    </div>
  );
}

function fmt(n: any) {
  return typeof n === "number"
    ? `$ ${n.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`
    : n;
}

function pct(part: number, total: number) {
  if (!total || total <= 0) return 0;
  return (Number(part || 0) / total) * 100;
}

function fmtPct(value: number) {
  return `${value.toLocaleString("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function fmtDias(value: any) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return Math.max(0, Math.round(n)).toLocaleString("es-CO");
}

type ClienteCardProps = {
  cliente: Cliente;
  onAmpliar?: () => void;
  ampliado?: boolean;
};

function ClienteCard({ cliente, onAmpliar, ampliado = false }: ClienteCardProps) {
  const [ordenFacturas, setOrdenFacturas] = useState<"fecha" | "vencimiento">(
    "fecha"
  );

  const calcularRango = (dias_vencidos: number) => {
    if (dias_vencidos <= 0) return "Por vencer";
    if (dias_vencidos <= 30) return "1-30";
    if (dias_vencidos <= 60) return "31-60";
    if (dias_vencidos <= 90) return "61-90";
    return "91+";
  };

  const parseFecha = (valor: any) => {
    if (!valor) return 0;

    const texto = String(valor).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      return new Date(`${texto}T00:00:00`).getTime();
    }

    const match = texto.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (match) {
      const [, dd, mm, yyyy] = match;
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd)).getTime();
    }

    const intento = new Date(texto).getTime();
    return isNaN(intento) ? 0 : intento;
  };

  const facturasOrdenadas = [...cliente.facturas].sort((a: FacturaDetalle, b: FacturaDetalle) => {
    if (ordenFacturas === "vencimiento") {
      const diasA = Number(a.dias_vencidos ?? 0);
      const diasB = Number(b.dias_vencidos ?? 0);

      if (diasB !== diasA) return diasB - diasA;

      return parseFecha(a.vencimiento) - parseFecha(b.vencimiento);
    }

    return parseFecha(b.fecha) - parseFecha(a.fecha);
  });

  return (
    <Card className={`shadow-md h-full ${ampliado ? "border-0 shadow-none" : ""}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{cliente.cliente_nombre}</CardTitle>
            <div className="text-sm text-gray-600 mt-1">
              Total: <b>{cliente.total_str}</b>
            </div>
          </div>

          {onAmpliar && (
            <button
              onClick={onAmpliar}
              className="px-3 py-1 text-sm bg-slate-700 text-white rounded hover:bg-slate-800 transition"
            >
              Ampliar
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={ampliado ? 260 : 220}>
          <BarChart
            data={[
              { bucket: "Por vencer", monto: cliente.aging.por_vencer },
              { bucket: "1-30", monto: cliente.aging["1_30"] },
              { bucket: "31-60", monto: cliente.aging["31_60"] },
              { bucket: "61-90", monto: cliente.aging["61_90"] },
              { bucket: "91+", monto: cliente.aging["91_mas"] },
            ]}
            margin={{ top: 30, left: 20, right: 10 }}
          >
            <XAxis dataKey="bucket" />
            <YAxis hide />
            <Tooltip formatter={(v: number) => `$ ${Number(v).toLocaleString("es-CO")}`} />

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
                  fill={["#2563eb", "#f87171", "#ef4444", "#dc2626", "#b91c1c"][i]}
                />
              ))}

              <LabelList
                dataKey="monto"
                position="top"
                content={(props) => {
                  const { x, y, value } = props;
                  if (value == null) return null;

                  const v = Number(value);
                  let displayValue = "";

                  if (v >= 1_000_000_000) {
                    displayValue = (v / 1_000_000_000).toFixed(1) + "B";
                  } else if (v >= 1_000_000) {
                    displayValue = (v / 1_000_000).toFixed(0) + "M";
                  } else if (v >= 1_000) {
                    displayValue = (v / 1_000).toFixed(0) + "K";
                  } else {
                    displayValue = v.toString();
                  }

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

        <Accordion type="single" collapsible className="mt-4" defaultValue={ampliado ? "facturas" : undefined}>
          <AccordionItem value="facturas">
            <AccordionTrigger className="text-sm font-medium">
              Ver detalle de facturas
            </AccordionTrigger>

            <AccordionContent>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-700">Ordenar por:</span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOrdenFacturas("fecha")}
                    className={`px-3 py-1 rounded text-sm border transition ${
                      ordenFacturas === "fecha"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    Fecha
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrdenFacturas("vencimiento")}
                    className={`px-3 py-1 rounded text-sm border transition ${
                      ordenFacturas === "vencimiento"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    Vencimiento
                  </button>
                </div>
              </div>

              <div className={`${ampliado ? "max-h-none" : "max-h-[420px]"} overflow-auto`}>
                <table className="w-full min-w-[860px] text-sm border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-100">
                      <th className="p-2 text-left">Factura</th>
                      <th className="p-2 text-left">Fecha</th>
                      <th className="p-2 text-left">Vencimiento</th>
                      <th className="p-2 text-left">Rango</th>
                      <th className="p-2 text-right">Días transc.</th>
                      <th className="p-2 text-right">Saldo</th>
                      <th className="p-2">Link</th>
                    </tr>
                  </thead>

                  <tbody>
                    {facturasOrdenadas.map((f: FacturaDetalle, i: number) => {
                      const rango = calcularRango(Number(f.dias_vencidos || 0));
                      const esVencida = rango !== "Por vencer";
                      const diasTranscurridos = f.dias_transcurridos ?? 0;

                      return (
                        <tr
                          key={`${f.idfactura}-${i}`}
                          className={`border-b ${esVencida ? "text-red-600" : ""}`}
                        >
                          <td className="p-2 whitespace-nowrap">{f.idfactura}</td>
                          <td className="p-2 whitespace-nowrap">{f.fecha}</td>
                          <td className="p-2 whitespace-nowrap">{f.vencimiento}</td>
                          <td className="p-2 whitespace-nowrap">{rango}</td>
                          <td className="p-2 text-right whitespace-nowrap">
                            <span
                              className={`inline-flex min-w-[58px] justify-center rounded-full px-2 py-1 text-xs font-semibold ${
                                Number(diasTranscurridos) <= 30
                                  ? "bg-green-50 text-green-700"
                                  : Number(diasTranscurridos) <= 60
                                  ? "bg-orange-50 text-orange-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {fmtDias(diasTranscurridos)}
                            </span>
                          </td>
                          <td className="p-2 text-right whitespace-nowrap">{f.saldo_str}</td>
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
  );
}