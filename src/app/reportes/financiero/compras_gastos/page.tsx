// Archivo: src/app/reportes/financiero/compras_gastos/page.tsx
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
} from "recharts";
import { format } from "date-fns";

interface EvolucionMes {
  mes: string; // ISO date string
  total_compras: number;
  total_pagadas: number;
  total_pendientes: number;
}

interface KPIs {
  total_compras: number;
  total_pagado: number;
  total_saldo: number;
  total_facturas: number;
  facturas_pagadas: number;
  facturas_pendientes: number;

  // 👇 nuevos
  compras_x_factura: number;
  valor_compras_x_factura: number;
  compras_x_cta_cobro: number;
  valor_compras_x_cta_cobro: number;  
}

interface CentroCosto {
  id: string;
  nombre: string;
}

interface FacturaDetalle {
  proveedor_nombre: string;
  factura: string; // idcompra (alias en BE)
  fecha: string;
  vencimiento: string;
  estado: "pagado" | "pendiente";   // 👈 corregido
  total: number;
  saldo: number;
  centro_costo_nombre?: string; // 👈 nuevo
}

interface TopProveedorValor {
  proveedor_nombre: string;
  total_compras: number;  // <- nombre real del backend
  num_facturas: number;   // <- opcional, también lo devuelve
}

interface TopProveedorCount {
  proveedor_nombre: string;
  num_facturas: number;
}

/* --------------------- helpers --------------------- */

function formatCurrency(valor: number): string {
  // Miles con 0 decimales
  return `$ ${Math.round(Number(valor || 0)).toLocaleString("es-CO")}`;
}

function abreviar(valor: number): string {
  if (valor >= 1_000_000_000) return `${(valor / 1_000_000_000).toFixed(1)}B`;
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(0)}M`;
  if (valor >= 1_000) return `${(valor / 1_000).toFixed(0)}K`;
  return `${Math.round(valor)}`;
}

function toYYYYMM(dateLike: string | Date): string {
  try {
    return format(new Date(dateLike), "yyyy-MM");
  } catch {
    return String(dateLike).slice(0, 7);
  }
}




/* --------------------- componente --------------------- */

export default function ReporteFinancieroComprasGastosPage() {
  const [evolucion, setEvolucion] = useState<EvolucionMes[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);

  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");   /*_si se quiere establecer fecha se deja ("2025-09-30")  */
  const [centroCostos, setCentroCostos] = useState<string>("");

  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Top proveedores
  const [topView, setTopView] = useState<"valor" | "facturas">("valor");
  const [topValor, setTopValor] = useState<TopProveedorValor[]>([]);
  const [topFacturas, setTopFacturas] = useState<TopProveedorCount[]>([]);

  // Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalTitle, setModalTitle] = useState<string>("");
  const [modalRows, setModalRows] = useState<FacturaDetalle[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(false);

  // Construir querystring común
  const queryParams = useMemo(() => {
    const q: string[] = [];
    if (fechaDesde) q.push(`desde=${encodeURIComponent(fechaDesde)}`);
    if (fechaHasta) q.push(`hasta=${encodeURIComponent(fechaHasta)}`);
    if (centroCostos) q.push(`centro_costos=${encodeURIComponent(centroCostos)}`);
    return q.length ? `?${q.join("&")}` : "";
  }, [fechaDesde, fechaHasta, centroCostos]);

  /* -------- centros de costo reales -------- */
  useEffect(() => {
    const fetchCentros = async () => {
      try {
        const url = `/catalogos/centros-costo-reales${
          queryParams ? queryParams.replace("?", "?") : ""
        }`;
        const data = await authFetch(url);
        setCentros(data || []);
      } catch (e) {
        console.error("Error cargando centros de costo reales", e);
      }
    };
    fetchCentros();
  }, [queryParams]);

  /* -------- datos principales + tops -------- */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await authFetch(`/reportes/financiero/compras-gastos${queryParams}`);
        setKpis(data.kpis);
        setEvolucion(data.evolucion || []);
        const topVal = await authFetch(`/reportes/financiero/compras-gastos/top-proveedores${queryParams}`);
        setTopValor(topVal || []);
        const topFac = await authFetch(`/reportes/financiero/compras-gastos/top-proveedores-facturas${queryParams}`);
        setTopFacturas(topFac || []);
      } catch (e) {
        console.error("Error al cargar el reporte financiero", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [queryParams]);

  /* -------- handler del modal (click en barras) -------- */
  async function handleBarClick(serie: "total" | "pagadas" | "pendiente", item: EvolucionMes) {
    try {
      setModalLoading(true);
      const estado = serie === "total" ? "total" : serie === "pagadas" ? "pagado" : "pendiente";
      const mesYYYYMM = toYYYYMM(item.mes);
      const url = `/reportes/financiero/compras-gastos/detalle?mes=${mesYYYYMM}&estado=${estado}`;
      const rows: FacturaDetalle[] = await authFetch(url);
      const titulo = `Facturas ${estado === "total" ? "Totales" : estado === "pagado" ? "Pagadas" : "Pendientes"} • ${format(new Date(item.mes), "MMM yyyy")}`;
      setModalTitle(titulo);
      setModalRows(rows || []);
      setModalOpen(true);
    } catch (e) {
      console.error("Error abriendo modal de facturas", e);
    } finally {
      setModalLoading(false);
    }
  }

  const evolucionSegura = useMemo(() => {
    return evolucion.map((item) => {
      const d = new Date(item.mes);
      d.setUTCHours(12);
      return { ...item, mes: d.toISOString() };
    });
  }, [evolucion]);


    /* -------- handler modal proveedor -------- */
  async function handleProveedorClick(proveedor: string) {
    try {
      setModalLoading(true);
      const url = `/reportes/financiero/compras-gastos/detalle-proveedor${queryParams ? queryParams + "&" : "?"}proveedor=${encodeURIComponent(proveedor)}`;
      const rows: FacturaDetalle[] = await authFetch(url);
      setModalTitle(`Facturas de ${proveedor}`);
      setModalRows(rows || []);
      setModalOpen(true);
    } catch (e) {
      console.error("Error cargando facturas de proveedor", e);
    } finally {
      setModalLoading(false);
    }
  }

  /* -------- datasets Top en horizontal (Power BI vibe) -------- */
    const topValorData = useMemo(
    () =>
        (topValor || []).map((t) => ({
        proveedor: t.proveedor_nombre,
        valor: Number(t.total_compras) || 0,  // ✅ ahora sí existe
        })),
    [topValor]
    );

    const topFacturasData = useMemo(
    () =>
        (topFacturas || []).map((t) => ({
        proveedor: t.proveedor_nombre,
        facturas: Number(t.num_facturas) || 0,
        })),
    [topFacturas]
    );


  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">📊 Reporte Egresos por Compras & Gastos</h1>

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
          <Select value={centroCostos} onChange={(e) => setCentroCostos(e.target.value)}>
            <option value="">Todos</option>
            {centros.map((cc) => (
              <SelectItem key={cc.id} value={cc.id} label={cc.nombre} />
            ))}
          </Select>
        </div>
      </div>

      {/* KPIs */}
      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2">
            {/* Total Compras */}
            <Card className="min-h-[74px]">
            <CardContent className="p-3 flex flex-col justify-center">
                <div className="text-m font-bold text-black-600 tracking-tight text-center">Total Compras</div>
                <div className="mt-1 text-lg font-extrabold leading-none text-blue-600 text-center">
                {formatCurrency(kpis.total_compras)}
                </div>
            </CardContent>
            </Card>

            {/* Total Pagado */}
            <Card className="min-h-[74px]">
            <CardContent className="p-3 flex flex-col justify-center">
                <div className="text-m font-bold text-black-600 tracking-tight text-center">Total Pagado</div>
                <div className="mt-1 text-lg font-extrabold leading-none text-green-600 text-center">
                {formatCurrency(kpis.total_pagado)}
                </div>
            </CardContent>
            </Card>

            {/* Total Pendiente */}
            <Card className="min-h-[74px]">
            <CardContent className="p-3 flex flex-col justify-center">
                <div className="text-m font-bold text-black-600 tracking-tight text-center">Total Pendiente</div>
                <div className="mt-1 text-lg font-extrabold leading-none text-red-600 text-center">
                {formatCurrency(kpis.total_saldo)}
                </div>
            </CardContent>
            </Card>

            {/* # Facturas */}
            <Card className="min-h-[74px]">
            <CardContent className="p-3 flex flex-col justify-center">
                <div className="text-m font-bold text-black-600 tracking-tight text-center"># Facturas</div>
                <div className="mt-1 text-lg font-extrabold leading-none text-blue-600 text-center">
                {kpis.total_facturas.toLocaleString("es-CO")}
                </div>
            </CardContent>
            </Card>

            {/* Pagadas */}
            <Card className="min-h-[74px]">
            <CardContent className="p-3 flex flex-col justify-center">
                <div className="text-m font-bold text-black-600 tracking-tight text-center">Pagadas</div>
                <div className="mt-1 text-lg font-extrabold leading-none text-green-600 text-center">
                {kpis.facturas_pagadas.toLocaleString("es-CO")}
                </div>
            </CardContent>
            </Card>

            {/* Pendientes */}
            <Card className="min-h-[74px]">
            <CardContent className="p-3 flex flex-col justify-center">
                <div className="text-m font-bold text-black-600 tracking-tight text-center">Pendientes</div>
                <div className="mt-1 text-lg font-extrabold leading-none text-red-600 text-center">
                {kpis.facturas_pendientes.toLocaleString("es-CO")}
                </div>
            </CardContent>
            </Card>

            {/* Compras x Factura */}
            <Card className="min-h-[74px]">
              <CardContent className="p-3 flex flex-col justify-center">
                <div className="text-m font-bold text-center"># Compras x Factura</div>
                <div className="mt-1 text-lg font-extrabold text-indigo-600 text-center">
                  {kpis.compras_x_factura.toLocaleString("es-CO")}
                </div>
              </CardContent>
            </Card>

            {/* Valor Compras x Factura */}
            <Card className="min-h-[74px]">
              <CardContent className="p-3 flex flex-col justify-center">
                <div className="text-m font-bold text-center">Valor Compras x Factura</div>
                <div className="mt-1 text-lg font-extrabold text-indigo-600 text-center">
                  {formatCurrency(kpis.valor_compras_x_factura)}
                </div>
              </CardContent>
            </Card>

            {/* Compras x Cta. Cobro */}
            <Card className="min-h-[74px]">
              <CardContent className="p-3 flex flex-col justify-center">
                <div className="text-m font-bold text-center"># Compras x Cta. Cobro</div>
                <div className="mt-1 text-lg font-extrabold text-purple-600 text-center">
                  {kpis.compras_x_cta_cobro.toLocaleString("es-CO")}
                </div>
              </CardContent>
            </Card>

            {/* Valor Compras x Cta. Cobro */}
            <Card className="min-h-[74px]">
              <CardContent className="p-3 flex flex-col justify-center">
                <div className="text-m font-bold text-center">Valor Compras x Cta. Cobro</div>
                <div className="mt-1 text-lg font-extrabold text-purple-600 text-center">
                  {formatCurrency(kpis.valor_compras_x_cta_cobro)}
                </div>
              </CardContent>
            </Card>

        </div>
     )}


      {/* Evolución mensual */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Evolución Mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={evolucionSegura} margin={{ top: 10, bottom: 40, left: 40, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="mes"
                tickFormatter={(mes) => format(new Date(mes), "MMM yyyy")}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis tickFormatter={(v) => formatCurrency(v)} fontSize={11}/>
              <Tooltip
                formatter={(value: number, name: string) => [formatCurrency(Number(value)), name]}
                labelFormatter={(label) =>
                  (() => {
                    try {
                      return format(new Date(label), "MMM yyyy");
                    } catch {
                      return label;
                    }
                  })()
                }
                
              />
              <Legend />

              {/* Total Compras */}
              <Bar
                dataKey="total_compras"
                name="Compras Totales"
                fill="#2563eb"
                radius={[6, 6, 0, 0]}
                onClick={(_, idx) => {
                  const item = evolucionSegura[idx];
                  if (item) handleBarClick("total", item);
                }}
              >
                <LabelList
                  dataKey="total_compras"
                  position="top"
                  formatter={(v: any) => abreviar(Number(v))}
                  style={{ fontSize: 10, fontWeight: 500 }}
                />
              </Bar>

              {/* Pagadas */}
              <Bar
                dataKey="total_pagadas"
                name="Pagadas"
                fill="#22c55e"
                radius={[6, 6, 0, 0]}
                onClick={(_, idx) => {
                  const item = evolucionSegura[idx];
                  if (item) handleBarClick("pagadas", item);
                }}
              >
                <LabelList
                  dataKey="total_pagadas"
                  position="top"
                  formatter={(v: any) => abreviar(Number(v))}
                  style={{ fontSize: 10, fontWeight: 500 }}
                />
              </Bar>

              {/* Pendientes */}
              <Bar
                dataKey="total_pendientes"
                name="Pendientes"
                fill="#ef4444"
                radius={[6, 6, 0, 0]}
                onClick={(_, idx) => {
                  const item = evolucionSegura[idx];
                  if (item) handleBarClick("pendiente", item);
                }}
              >
                <LabelList
                  dataKey="total_pendientes"
                  position="top"
                  formatter={(v: any) => abreviar(Number(v))}
                  style={{ fontSize: 10, fontWeight: 500 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="text-s text-black-600 tracking-tight text-right">* Haga click sobre una barra de interés para mayor información</div>
        </CardContent>
      </Card>

      {/* Top Proveedores */}
      <Card className="shadow-sm">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Top 15 Proveedores</CardTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTopView("valor")}
              className={`px-3 py-1 rounded-full text-sm ${
                topView === "valor"
                  ? "bg-blue-600 text-white shadow"
                  : "bg-gray-100 hover:bg-gray-200"
              } transition`}
            >
              Por valor
            </button>
            <button
              onClick={() => setTopView("facturas")}
              className={`px-3 py-1 rounded-full text-sm ${
                topView === "facturas"
                  ? "bg-blue-600 text-white shadow"
                  : "bg-gray-100 hover:bg-gray-200"
              } transition`}
            >
              Por # facturas
            </button>
          </div>
        </CardHeader>

        <CardContent>
        {topView === "valor" ? (
            <div className="w-full h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                layout="vertical"
                data={topValorData}
                margin={{ top: 10, bottom: 10, left: 20, right: 20 }}
                >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(Number(v))} />
                <YAxis type="category" dataKey="proveedor" width={220} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatCurrency(Number(v))} />
                <Bar
                    dataKey="valor"
                    name="Compras"
                    fill="#2563eb"
                    radius={[0, 6, 6, 0]}
                    onClick={(_, index) => {
                    const item = topValorData[index];
                    if (item) handleProveedorClick(item.proveedor);
                    }}
                >
                    <LabelList
                    dataKey="valor"
                    position="right"
                    formatter={(v: any) => abreviar(Number(v))}
                    style={{ fontSize: 10, fontWeight: 500 }}
                    />
                </Bar>
                </BarChart>
            </ResponsiveContainer>
            </div>
        ) : (
            <div className="w-full h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                layout="vertical"
                data={topFacturasData}
                margin={{ top: 10, bottom: 10, left: 20, right: 20 }}
                >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="proveedor" width={220} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `${Number(v).toLocaleString("es-CO")}`} />
                <Bar
                    dataKey="facturas"
                    name="# Facturas"
                    fill="#22c55e"
                    radius={[0, 6, 6, 0]}
                    onClick={(_, index) => {
                    const item = topFacturasData[index];
                    if (item) handleProveedorClick(item.proveedor);
                    }}
                >
                    <LabelList
                    dataKey="facturas"
                    position="right"
                    formatter={(v: any) => `${Number(v).toLocaleString("es-CO")}`}
                    />
                </Bar>
                </BarChart>
            </ResponsiveContainer>
            </div>
        )}
        <div className="text-s text-black-600 tracking-tight text-right">* Haga click sobre una barra de interés para mayor información</div>
        </CardContent>

      </Card>

      {/* Modal de detalle */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-6xl bg-white rounded-2xl shadow-xl overflow-hidden animate-[fadeIn_0.2s_ease]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 sm:px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">{modalTitle}</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200"
              >
                Cerrar
              </button>
            </div>

            <div className="p-4 max-h-[70vh] overflow-auto">
              {modalLoading ? (
                <p className="text-sm text-gray-500">Cargando…</p>
              ) : modalRows.length === 0 ? (
                <p className="text-sm text-gray-500">No hay facturas para mostrar.</p>
              ) : (
                <table className="min-w-full text-sm border-collapse">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="border-b">
                      {[
                        "Proveedor",
                        "Factura",
                        "Fecha",
                        "Vencimiento",
                        "Estado",
                        "Centro de Costo",
                        "Total",
                        "Saldo",
                      ].map((h, idx) => (
                        <th
                          key={idx}
                          className={`p-2 ${idx < 6 ? "text-left" : "text-right"}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {modalRows.map((r, i) => {
                      const esPendiente = r.estado === "pendiente";  // ✅ directo de la BD
                      return (
                        <tr
                          key={`${r.factura}-${i}`}
                          className={`border-b${esPendiente ? " text-red-600" : ""}`}
                        >
                          <td className="p-2">{r.proveedor_nombre}</td>
                          <td className="p-2">{r.factura}</td>
                          <td className="p-2">{format(new Date(r.fecha), "dd-MM-yyyy")}</td>
                          <td className="p-2">{format(new Date(r.vencimiento), "dd-MM-yyyy")}</td>
                          <td className="p-2">
                            {r.estado === "pagado" ? "Pagada" : "Pendiente"} {/* ✅ legible para usuario */}
                          </td>
                          <td className="p-2">{r.centro_costo_nombre || "—"}</td>
                          <td className="p-2 text-right">{formatCurrency(r.total)}</td>
                          <td className="p-2 text-right">{formatCurrency(r.saldo)}</td>
                        </tr>
                      );
                    })}
                  </tbody>

                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
