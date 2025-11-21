// src/app/reportes/financiero/consolidado/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LabelList,
  LineChart,
  Line,
} from "recharts";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { parseISO } from "date-fns";

/* -------- tipos -------- */
interface EvolucionMes {
  mes: string;
  ingresos: number;
  egresos: number;
  utilidad: number;
  margen: number;
  utilidad_acumulada: number; // 👈 nuevo
}

interface KPIs {
  ingresos: number;
  ingresos_netos: number;
  egresos: number;
  utilidad: number;
  margen: number;
  facturas_venta: number;
  facturas_compra: number;
}

interface CentroCosto {
  id: string;
  nombre: string;
}

interface TopItem {
  nombre: string;
  total: number;
}

/* -------- helpers -------- */
function formatCurrency(valor: number): string {
  return `$ ${Math.round(Number(valor || 0)).toLocaleString("es-CO")}`;
}

function abreviar(valor: number): string {
  if (valor >= 1_000_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(0)}M`;
  if (valor >= 1_000) return `${(valor / 1_000).toFixed(0)}K`;
  if (valor <= 1_000_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (valor <= 1_000_000) return `${(valor / 1_000_000).toFixed(0)}M`;
  if (valor <= 1_000) return `${(valor / 1_000).toFixed(0)}K`;
  return `${Math.round(valor)}`;
}

/* -------- componente -------- */
export default function ReporteFinancieroConsolidadoPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [evolucion, setEvolucion] = useState<EvolucionMes[]>([]);
  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [topClientes, setTopClientes] = useState<TopItem[]>([]);
  const [topProveedores, setTopProveedores] = useState<TopItem[]>([]);

  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [centroCostos, setCentroCostos] = useState<string>("");

    // --- estados del modal ---
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTipo, setModalTipo] = useState<"ingresos" | "egresos" | null>(null);
  const [modalMes, setModalMes] = useState<string | null>(null);
  const [detalleFacturas, setDetalleFacturas] = useState<any[]>([]);

  // Nuevos estados en el componente
  const [modalClienteOpen, setModalClienteOpen] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string | null>(null);

  const [modalProveedorOpen, setModalProveedorOpen] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<string | null>(null);

  const queryParams = useMemo(() => {
    const q: string[] = [];
    if (fechaDesde) q.push(`desde=${encodeURIComponent(fechaDesde)}`);
    if (fechaHasta) q.push(`hasta=${encodeURIComponent(fechaHasta)}`);
    if (centroCostos) q.push(`centro_costos=${encodeURIComponent(centroCostos)}`);
    return q.length ? `?${q.join("&")}` : "";
  }, [fechaDesde, fechaHasta, centroCostos]);

  /* --- fetch data --- */
  useEffect(() => {
    const fetchData = async () => {
      try {
        //console.log("🔍 Fetching reporte financiero con filtros:", queryParams);      // se puede ocultar despues para no mostrarlo en pagina
        const data = await authFetch(`/reportes/financiero/consolidado${queryParams}`);
        setKpis(data.kpis || null);
        setEvolucion(data.evolucion || []);
        setTopClientes(data.top_clientes || []);
        setTopProveedores(data.top_proveedores || []);
      } catch (e) {
        console.error("Error cargando consolidado", e);
      }
    };
    fetchData();
  }, [queryParams]);

  /* --- fetch centros --- */
  useEffect(() => {
    const fetchCentros = async () => {
        try {
        const data = await authFetch(`/catalogos/centros-costo-consolidado`);
        setCentros(data || []);
        } catch (e) {
        console.error("Error cargando centros de costo", e);
        }
    };
    fetchCentros();
  }, []);



    /* --- manejar clic en barras --- */
    const handleBarClick = async (tipo: "ingresos" | "egresos", data: any) => {
      console.log("🔍 clicked month data:", data.mes);

      let d: Date;
      if (typeof data.mes === "string") {
        const isoFixed = data.mes.replace(" ", "T"); // 👈 solución clave
        const withUTC = isoFixed.endsWith("Z") ? isoFixed : `${isoFixed}`;
        d = new Date(withUTC);
      } else if (data.mes instanceof Date) {
        d = data.mes;
      } else if (typeof data.mes === "number") {
        d = new Date(data.mes);
      } else {
        console.error("handleBarClick: formato de mes inesperado:", data.mes);
        return;
      }

      if (isNaN(d.getTime())) {
        console.error("handleBarClick: fecha inválida calculada:", d);
        return;
      }


      // Forzar primer día del mes en UTC
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth(); // 0‑based
      const firstOfMonthUTC = new Date(Date.UTC(year, month, 1));
      const lastOfMonthUTC = new Date(Date.UTC(year, month + 1, 0));

      const desdeMes = format(firstOfMonthUTC, "yyyy-MM-dd");
      const hastaMes = format(lastOfMonthUTC, "yyyy-MM-dd");
      const mes = format(firstOfMonthUTC, "yyyy-MM");

      setModalTipo(tipo);
      setModalMes(mes);
      setModalOpen(true);

      try {
        if (tipo === "ingresos") {
          const qs = new URLSearchParams({ desde: desdeMes, hasta: hastaMes });
          //if (centroCostos) qs.set("centro_costos", String(centroCostos));
          if (centroCostos) qs.set("cost_center", String(centroCostos));

          const result = await authFetch(`/reportes/facturas_cliente?${qs.toString()}`);
          setDetalleFacturas(result.rows || []);
        } else {
          const qs = new URLSearchParams({ desde: desdeMes, hasta: hastaMes });
          //if (centroCostos) qs.set("centro_costos", String(centroCostos));
          if (centroCostos) qs.set("cost_center", String(centroCostos));

          const result = await authFetch(`/reportes/facturas_proveedor?${qs.toString()}`);
          setDetalleFacturas(result.rows || []);
        }
      } catch (err) {
        console.error("Error cargando detalle", err);
        setDetalleFacturas([]);
      }
    };



    // Nuevas funciones para manejar clicks en los graficos de top clientes y proveedores
    const handleClienteClick = async (nombre: string) => {
        setClienteSeleccionado(nombre);
        setModalClienteOpen(true);

        const qs = new URLSearchParams();
        if (fechaDesde) qs.set("desde", fechaDesde);
        if (fechaHasta) qs.set("hasta", fechaHasta);
        // 👈 IMPORTANTE: este parámetro debe llamarse centro_costos porque el backend lo espera así
        if (centroCostos) qs.set("cost_center", centroCostos);


        qs.set("cliente", nombre);

        try {
            const res = await authFetch(`/reportes/facturas_cliente?${qs.toString()}`);
            setDetalleFacturas(res.rows || []);
        } catch (err) {
            console.error("Error cargando facturas cliente", err);
            setDetalleFacturas([]);
        }
    };

    const handleProveedorClick = async (nombre: string) => {
        setProveedorSeleccionado(nombre);
        setModalProveedorOpen(true);

        const qs = new URLSearchParams();
        if (fechaDesde) qs.set("desde", fechaDesde);
        if (fechaHasta) qs.set("hasta", fechaHasta);
        //if (centroCostos) qs.set("centro_costos", centroCostos);   asi estaba
        if (centroCostos) qs.set("cost_center", centroCostos);

        qs.set("proveedor", nombre);

        try {
            const res = await authFetch(`/reportes/facturas_proveedor?${qs.toString()}`);
            setDetalleFacturas(res.rows || []); // ✅ corregido: aseguramos extraer `rows`
        } catch (err) {
            console.error("Error cargando compras proveedor", err);
            setDetalleFacturas([]);
        }
     };



  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📊 Reporte Consolidado Ingresos vs Egresos</h1>

      {/* Filtros */}
      <div className="grid gap-2 md:grid-cols-3">
        <div className="flex flex-col">
          <label className="text-sm font-medium">Fecha desde</label>
          <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium">Fecha hasta</label>
          <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
        </div>
        <div className="flex flex-col">
        <label className="text-sm font-medium">Centro de Costos</label>
            <select
                value={centroCostos}
                onChange={(e) => setCentroCostos(e.target.value)}
                className="border rounded p-2"
            >
                <option value="">Todos</option>
                {centros.map((cc) => (
                <option key={cc.id} value={cc.id}>
                    {cc.nombre}
                </option>
                ))}
            </select>
        </div>

      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {[
            { label: "Ingresos Netos", value: formatCurrency(kpis.ingresos_netos), color: "text-emerald-600" },
            { label: "Ingresos", value: formatCurrency(kpis.ingresos), color: "text-green-600" },
            { label: "Egresos", value: formatCurrency(kpis.egresos), color: "text-red-600" },
            { label: "Utilidad Acumulada", value: formatCurrency(kpis.utilidad), color: "text-purple-600" },
            { label: "Margen", value: `${kpis.margen}%`, color: "text-purple-600" },
            { label: "# Fact. Venta", value: kpis.facturas_venta, color: "text-green-600" },
            { label: "# Fact. Compra", value: kpis.facturas_compra, color: "text-red-600" },
          ].map((item, i) => (
            <Card key={i} className="shadow-sm h-[85px] min-w-[130px]">
              <CardContent className="p-0 flex flex-col items-center justify-center">
                <div className="text-m font-bold text-black-600 tracking-tight text-center">
                  {item.label}
                </div>
                <div className={`text-lg font-extrabold ${item.color} text-center`}>
                  {item.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Evolución mensual */}
      <Card>
        <CardHeader><CardTitle>Evolución Mensual</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={evolucion} margin={{ top: 30, bottom: 40, left: 40, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="mes"
                tickFormatter={(mes) =>
                  formatInTimeZone(new Date(mes), "UTC", "MMM yyyy")
                }
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis tickFormatter={(v: any) => abreviar(Number(v))}  // asi estaba: tickFormatter={(v) => formatCurrency(v)}
              />
              <Tooltip
                labelFormatter={(mes) => format(new Date(mes), "MM-yyyy")}
                formatter={(v: number) => formatCurrency(v)}
                />
              <Legend />

              <Bar
                dataKey="ingresos"
                name="Ingresos"
                fill="#22c55e"
                radius={[6, 6, 0, 0]}
                onClick={(data) => handleBarClick("ingresos", data)}
              >
                <LabelList dataKey="ingresos" position="top" formatter={(v: any) => abreviar(Number(v))} />
              </Bar>
              <Bar
                dataKey="egresos"
                name="Egresos"
                fill="#ef4444"
                radius={[6, 6, 0, 0]}
                onClick={(data) => handleBarClick("egresos", data)}
              >
                <LabelList dataKey="egresos" position="top" formatter={(v: any) => abreviar(Number(v))} />
              </Bar>
              <Line type="monotone" dataKey="utilidad" name="Utilidad Mensual" stroke="#2563eb" >
                <LabelList
                    dataKey="utilidad"
                    position="bottom"
                    formatter={(v: any) => abreviar(Number(v))}
                    style={{ fontSize: 13, fill: "#555" }} 
                    />
              </Line>
              <Line type="monotone" dataKey="utilidad_acumulada" name="Utilidad Acumulada" stroke="#9333ea" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} >
    
                <LabelList
                    dataKey="utilidad_acumulada"
                    position="top"
                    formatter={(v: any) => abreviar(Number(v))}
                    style={{ fontSize: 13, fill: "#555" }} 
                    />
 
              </Line>

            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

    {/* === MODAL DETALLE FACTURAS === */}
    {(modalOpen || modalClienteOpen || modalProveedorOpen) && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-6xl w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
            {modalOpen && modalTipo === "ingresos" && `Facturas de Venta - ${modalMes}`}
            {modalOpen && modalTipo === "egresos" && `Facturas de Compra - ${modalMes}`}
            {modalClienteOpen && `Facturas de ${clienteSeleccionado}`}
            {modalProveedorOpen && `Compras a ${proveedorSeleccionado}`}
        </h2>


            <button
                onClick={() => {
                    setModalOpen(false);
                    setModalClienteOpen(false);
                    setModalProveedorOpen(false);
                }}
                className="absolute top-2 right-2 text-red-500 hover:text-black"
                >
                ✖
            </button>


        <table className="w-full border-collapse border text-sm">
            <thead>
            <tr className="bg-gray-100">
                {(modalTipo === "ingresos" || modalClienteOpen) ? (
                <>
                    <th className="border p-2">Factura</th>
                    <th className="border p-2">Cliente</th>
                    <th className="border p-2">Fecha</th>
                    <th className="border p-2">Vencimiento</th>
                    <th className="border p-2">Estado</th>
                    <th className="border p-2">Centro de Costo</th>
                    <th className="border p-2">Total</th>
                    <th className="border p-2">Pagado</th>
                    <th className="border p-2">Pendiente</th>
                    <th className="border p-2">Link</th>
                </>
                ) : (
                <>
                    <th className="border p-2">Proveedor</th>
                    <th className="border p-2">Factura</th>
                    <th className="border p-2">Fecha</th>
                    <th className="border p-2">Vencimiento</th>
                    <th className="border p-2">Estado</th>
                    <th className="border p-2">Centro de Costo</th>
                    <th className="border p-2">Total</th>
                    <th className="border p-2">Saldo</th>
                </>
                )}
            </tr>
            </thead>
            <tbody>
            {Array.isArray(detalleFacturas) && detalleFacturas.length === 0 ? (
                <tr>
                <td colSpan={10} className="text-center p-4">
                    No hay facturas encontradas
                </td>
                </tr>
            ) : (
                Array.isArray(detalleFacturas) && detalleFacturas.map((f, i) => {
                if (modalTipo === "ingresos" || modalClienteOpen) {
                    const isVencido = (f.estado_cartera || "").toLowerCase() === "vencido";
                    return (
                    <tr
                        key={i}
                        className={`hover:bg-gray-50 ${isVencido ? "text-red-600 font-bold" : ""}`}
                    >
                        <td className="border p-2">{f.idfactura}</td>
                        <td className="border p-2">{f.cliente_nombre}</td>
                        <td className="border p-2">{format(new Date(f.fecha), "dd-MM-yyyy")}</td>
                        <td className="border p-2">{format(new Date(f.vencimiento), "dd-MM-yyyy")}</td>
                        <td className="border p-2">{f.estado_cartera}</td>
                        <td className="border p-2">{f.centro_costo_nombre || "—"}</td>
                        <td className="border p-2">{formatCurrency(f.total)}</td>
                        <td className="border p-2">{formatCurrency(f.pagado)}</td>
                        <td className="border p-2">{formatCurrency(f.pendiente)}</td>
                        <td className="border p-2">
                        <a
                            href={f.public_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline"
                        >
                            Ver
                        </a>
                        </td>
                    </tr>
                    );
                } else {
                    const proveedor =
                    f.proveedor_nombre ??
                    f.proveedor ??
                    f.nombre_proveedor ??
                    f.razon_social ??
                    "Sin proveedor";

                    const isNoPagada = (f.estado || "").toLowerCase() === "no pagada";

                    return (
                    <tr
                        key={i}
                        className={`hover:bg-gray-50 ${isNoPagada ? "text-red-600 font-bold" : ""}`}
                    >
                        <td className="border p-2">{proveedor}</td>
                        <td className="border p-2">{f.factura_proveedor}</td>
                        <td className="border p-2">{format(new Date(f.fecha), "dd-MM-yyyy")}</td>
                        <td className="border p-2">{format(new Date(f.vencimiento), "dd-MM-yyyy")}</td>
                        <td className="border p-2">{f.estado}</td>
                        <td className="border p-2">{f.centro_costo_nombre || "—"}</td>
                        <td className="border p-2">{formatCurrency(f.total)}</td>
                        <td className="border p-2">{formatCurrency(f.saldo)}</td>
                    </tr>
                    );
                }
                })
            )}
            </tbody>
        </table>

            <div className="flex justify-end mt-4">
                <button
                onClick={() => {
                    setModalOpen(false);
                    setModalClienteOpen(false);
                    setModalProveedorOpen(false);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                Cerrar
                </button>
            </div>
        </div>
    </div>
    )}



      {/* Top clientes, nómina y proveedores en una sola fila */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Top 10 Clientes */}
        <Card>
          <CardHeader><CardTitle>Top 10 Clientes</CardTitle></CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={topClientes}
                margin={{ top: 10, bottom: 10, left: 5, right: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => abreviar(v)} />
                <YAxis type="category" dataKey="nombre" width={220} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar
                  dataKey="total"
                  fill="#22c55e"
                  radius={[0, 6, 6, 0]}
                  onClick={async (data) => {
                    const nombre = data?.payload?.nombre;
                    if (nombre) await handleClienteClick(nombre);
                  }}
                >
                  <LabelList
                    dataKey="total"
                    position="right"
                    formatter={(v: any) => abreviar(Number(v))}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Nómina */}
        <Card>
          <CardHeader><CardTitle>Costos x Nómina</CardTitle></CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={evolucion}
                layout="vertical"
                margin={{ left: 10, right: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="mes"
                  tickFormatter={(mes) =>
                    formatInTimeZone(new Date(mes), "UTC", "MMM yyyy")
                  }
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="nomina" fill="#eb612bff" radius={[0, 6, 6, 0]}>
                  <LabelList
                    dataKey="nomina"
                    position="right"
                    formatter={(v: any) => abreviar(Number(v))}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top 10 Proveedores */}
        <Card>
          <CardHeader><CardTitle>Top 10 Proveedores</CardTitle></CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={topProveedores}
                margin={{ top: 10, bottom: 10, left: 5, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => abreviar(v)} />
                <YAxis type="category" dataKey="nombre" width={220} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar
                  dataKey="total"
                  fill="#d44540ff"
                  radius={[0, 6, 6, 0]}
                  onClick={async (data) => {
                    const nombre = data?.payload?.nombre;
                    if (nombre) await handleProveedorClick(nombre);
                  }}
                >
                  <LabelList
                    dataKey="total"
                    position="right"
                    formatter={(v: any) => abreviar(Number(v))}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

                        



    </div>
  );
}
