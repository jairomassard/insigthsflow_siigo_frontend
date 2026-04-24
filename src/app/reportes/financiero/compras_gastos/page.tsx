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
import { formatInTimeZone } from "date-fns-tz";

interface EvolucionMes {
  mes: string;
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
  facturas_parciales: number;
  saldo_parcial: number;
  compras_x_factura: number;
  valor_compras_x_factura: number;
  compras_x_cta_cobro: number;
  valor_compras_x_cta_cobro: number;
}

type EstadoCalc = "pagado" | "pendiente" | "parcial";
type EstadoModal = "total" | "pagado" | "pendiente" | "parcial";
type TipoDocumentoModal = "todos" | "factura" | "documento_soporte";
type ModalSortBy = "fecha_desc" | "fecha_asc" | "proveedor_asc" | "proveedor_desc";

interface CentroCosto {
  id: string;
  nombre: string;
}

interface FacturaDetalle {
  id?: number;
  proveedor_nombre: string;
  factura: string;
  fecha: string;
  vencimiento: string | null;
  estado_calc?: EstadoCalc;
  estado_raw?: string;
  total: number;
  saldo: number;
  pagado_calc?: number;
  anomalia_saldo_mayor_total?: boolean;
  centro_costo_nombre?: string;
  tipo_documento?: TipoDocumentoModal | "otro";
}

interface TopProveedorValor {
  proveedor_nombre: string;
  total_compras: number;
  num_facturas: number;
}

interface TopProveedorCount {
  proveedor_nombre: string;
  num_facturas: number;
}

function formatCurrency(valor: number): string {
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

function formatMesYYYYMM(mesYYYYMM: string): string {
  const [y, m] = mesYYYYMM.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1, 12));
  return formatInTimeZone(d, "UTC", "MMM yyyy");
}

function formatDateSafe(value?: string | null): string {
  if (!value) return "—";

  const raw = String(value).slice(0, 10);
  const [y, m, d] = raw.split("-");

  if (!y || !m || !d) return "—";

  return `${d}-${m}-${y}`;
}

function labelEstadoModal(estado: EstadoModal): string {
  if (estado === "total") return "Totales";
  if (estado === "pagado") return "Pagadas";
  if (estado === "pendiente") return "Pendientes";
  return "Parciales";
}

function labelTipoDocumento(tipo: TipoDocumentoModal): string {
  if (tipo === "factura") return "Facturas de compra";
  if (tipo === "documento_soporte") return "Documento Soporte";
  return "Todos";
}

export default function ReporteFinancieroComprasGastosPage() {
  const [evolucion, setEvolucion] = useState<EvolucionMes[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);

  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [centroCostos, setCentroCostos] = useState<string>("");

  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [topView, setTopView] = useState<"valor" | "facturas">("valor");
  const [topValor, setTopValor] = useState<TopProveedorValor[]>([]);
  const [topFacturas, setTopFacturas] = useState<TopProveedorCount[]>([]);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalMes, setModalMes] = useState<string>("");
  const [modalEstado, setModalEstado] = useState<EstadoModal>("total");
  const [modalTipoDocumento, setModalTipoDocumento] =
    useState<TipoDocumentoModal>("todos");
  const [modalSortBy, setModalSortBy] = useState<ModalSortBy>("fecha_desc");

  const [modalTitle, setModalTitle] = useState<string>("");
  const [modalRows, setModalRows] = useState<FacturaDetalle[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(false);

  const queryParams = useMemo(() => {
    const q: string[] = [];
    if (fechaDesde) q.push(`desde=${encodeURIComponent(fechaDesde)}`);
    if (fechaHasta) q.push(`hasta=${encodeURIComponent(fechaHasta)}`);
    if (centroCostos) q.push(`centro_costos=${encodeURIComponent(centroCostos)}`);
    return q.length ? `?${q.join("&")}` : "";
  }, [fechaDesde, fechaHasta, centroCostos]);

  useEffect(() => {
    const fetchCentros = async () => {
      try {
        const data = await authFetch(`/catalogos/centros-costo-reales${queryParams}`);
        setCentros(data || []);
      } catch (e) {
        console.error("Error cargando centros de costo reales", e);
      }
    };

    fetchCentros();
  }, [queryParams]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await authFetch(`/reportes/financiero/compras-gastos${queryParams}`);
        setKpis(data.kpis);
        setEvolucion(data.evolucion || []);

        const topVal = await authFetch(
          `/reportes/financiero/compras-gastos/top-proveedores${queryParams}`
        );
        setTopValor(topVal || []);

        const topFac = await authFetch(
          `/reportes/financiero/compras-gastos/top-proveedores-facturas${queryParams}`
        );
        setTopFacturas(topFac || []);
      } catch (e) {
        console.error("Error al cargar el reporte financiero", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [queryParams]);

  const evolucionSegura = useMemo(() => {
    return (evolucion || []).map((item) => {
      const d = new Date(item.mes);
      d.setUTCHours(12);
      return { ...item, mes: d.toISOString() };
    });
  }, [evolucion]);

  const topValorData = useMemo(
    () =>
      (topValor || []).map((t) => ({
        proveedor: t.proveedor_nombre,
        valor: Number(t.total_compras) || 0,
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

  const modalResumen = useMemo(() => {
    const cantidad = modalRows.length;
    const total = modalRows.reduce((acc, r) => acc + Number(r.total || 0), 0);

    const pagado = modalRows.reduce((acc, r) => {
      const pagadoCalc = Number.isFinite(Number(r.pagado_calc))
        ? Number(r.pagado_calc)
        : Number(r.total || 0) - Number(r.saldo || 0);

      return acc + pagadoCalc;
    }, 0);

    const saldo = modalRows.reduce((acc, r) => acc + Number(r.saldo || 0), 0);

    return { cantidad, total, pagado, saldo };
  }, [modalRows]);

  const modalRowsOrdenadas = useMemo(() => {
    const rows = [...modalRows];

    rows.sort((a, b) => {
      if (modalSortBy === "fecha_asc") {
        return String(a.fecha || "").localeCompare(String(b.fecha || ""));
      }

      if (modalSortBy === "fecha_desc") {
        return String(b.fecha || "").localeCompare(String(a.fecha || ""));
      }

      if (modalSortBy === "proveedor_asc") {
        return String(a.proveedor_nombre || "").localeCompare(
          String(b.proveedor_nombre || "")
        );
      }

      return String(b.proveedor_nombre || "").localeCompare(
        String(a.proveedor_nombre || "")
      );
    });

    return rows;
  }, [modalRows, modalSortBy]);

  async function cargarDetalleMes(
    mesYYYYMM: string,
    estado: EstadoModal,
    tipoDocumento: TipoDocumentoModal
  ) {
    const base = `/reportes/financiero/compras-gastos/detalle?mes=${mesYYYYMM}&estado=${estado}&tipo_documento=${tipoDocumento}`;
    const url = centroCostos
      ? `${base}&centro_costos=${encodeURIComponent(centroCostos)}`
      : base;

    return await authFetch(url);
  }

  async function handleBarClick(
    serie: "total" | "pagadas" | "pendiente",
    item: EvolucionMes
  ) {
    try {
      setModalLoading(true);

      const estado: EstadoModal =
        serie === "total" ? "total" : serie === "pagadas" ? "pagado" : "pendiente";

      const mesYYYYMM = toYYYYMM(item.mes);
      const tipoDocumento: TipoDocumentoModal = "todos";

      setModalMes(mesYYYYMM);
      setModalEstado(estado);
      setModalTipoDocumento(tipoDocumento);
      setModalSortBy("fecha_desc");

      const rows: FacturaDetalle[] = await cargarDetalleMes(
        mesYYYYMM,
        estado,
        tipoDocumento
      );

      setModalTitle(
        `Facturas ${labelEstadoModal(estado)} • ${labelTipoDocumento(
          tipoDocumento
        )} • ${formatMesYYYYMM(mesYYYYMM)}`
      );

      setModalRows(rows || []);
      setModalOpen(true);
    } catch (e) {
      console.error("Error abriendo modal de facturas", e);
    } finally {
      setModalLoading(false);
    }
  }

  async function recargarModal(
    nuevoEstado: EstadoModal = modalEstado,
    nuevoTipoDocumento: TipoDocumentoModal = modalTipoDocumento
  ) {
    try {
      if (!modalMes) return;

      setModalLoading(true);
      setModalEstado(nuevoEstado);
      setModalTipoDocumento(nuevoTipoDocumento);

      const rows: FacturaDetalle[] = await cargarDetalleMes(
        modalMes,
        nuevoEstado,
        nuevoTipoDocumento
      );

      setModalTitle(
        `Facturas ${labelEstadoModal(nuevoEstado)} • ${labelTipoDocumento(
          nuevoTipoDocumento
        )} • ${formatMesYYYYMM(modalMes)}`
      );

      setModalRows(rows || []);
    } catch (e) {
      console.error("Error recargando modal", e);
    } finally {
      setModalLoading(false);
    }
  }

  async function handleProveedorClick(proveedor: string) {
    try {
      setModalLoading(true);

      const url = `/reportes/financiero/compras-gastos/detalle-proveedor${
        queryParams ? queryParams + "&" : "?"
      }proveedor=${encodeURIComponent(proveedor)}&tipo_documento=todos`;

      const rows: FacturaDetalle[] = await authFetch(url);

      setModalTitle(`Facturas de ${proveedor}`);
      setModalRows(rows || []);
      setModalMes("");
      setModalEstado("total");
      setModalTipoDocumento("todos");
      setModalSortBy("fecha_desc");
      setModalOpen(true);
    } catch (e) {
      console.error("Error cargando facturas de proveedor", e);
    } finally {
      setModalLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">📊 Reporte Egresos por Compras & Gastos</h1>

      <div className="grid gap-2 md:grid-cols-3">
        <div className="flex flex-col">
          <label className="text-sm font-medium">Fecha desde</label>
          <Input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium">Fecha hasta</label>
          <Input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
          />
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

      {loading && <p className="text-sm text-gray-500">Cargando reporte…</p>}

      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-12 gap-2">
          <Card className="min-h-[74px]">
            <CardContent className="p-3 flex flex-col justify-center">
              <div className="text-m font-bold text-center">Total Compras</div>
              <div className="mt-1 text-lg font-extrabold text-blue-600 text-center">
                {formatCurrency(kpis.total_compras)}
              </div>
            </CardContent>
          </Card>

          <Card className="min-h-[74px]">
            <CardContent className="p-3 flex flex-col justify-center">
              <div className="text-m font-bold text-center"># Compras</div>
              <div className="mt-1 text-lg font-extrabold text-blue-600 text-center">
                {kpis.total_facturas.toLocaleString("es-CO")}
              </div>
            </CardContent>
          </Card>

          <Card className="min-h-[74px]">
            <CardContent className="p-3 flex flex-col justify-center">
              <div className="text-m font-bold text-center">Total Pagado</div>
              <div className="mt-1 text-lg font-extrabold text-green-600 text-center">
                {formatCurrency(kpis.total_pagado)}
              </div>
            </CardContent>
          </Card>

          <Card className="min-h-[74px]">
            <CardContent className="p-3 flex flex-col justify-center">
              <div className="text-m font-bold text-center">Pagadas</div>
              <div className="mt-1 text-lg font-extrabold text-green-600 text-center">
                {kpis.facturas_pagadas.toLocaleString("es-CO")}
              </div>
            </CardContent>
          </Card>

          <Card className="min-h-[74px]">
            <CardContent className="p-3 flex flex-col justify-center">
              <div className="text-m font-bold text-center">Total Pendiente</div>
              <div className="mt-1 text-lg font-extrabold text-red-600 text-center">
                {formatCurrency(kpis.total_saldo)}
              </div>
            </CardContent>
          </Card>

          <Card className="min-h-[74px]">
            <CardContent className="p-3 flex flex-col justify-center">
              <div className="text-m font-bold text-center">Pendientes</div>
              <div className="mt-1 text-lg font-extrabold text-red-600 text-center">
                {kpis.facturas_pendientes.toLocaleString("es-CO")}
              </div>
            </CardContent>
          </Card>

          <Card className="min-h-[74px]">
            <CardContent className="p-3 flex flex-col justify-center">
              <div className="text-m font-bold text-center">Saldo Parcial</div>
              <div className="mt-1 text-lg font-extrabold text-orange-600 text-center">
                {formatCurrency(Number(kpis.saldo_parcial || 0))}
              </div>
            </CardContent>
          </Card>

          <Card className="min-h-[74px]">
            <CardContent className="p-3 flex flex-col justify-center">
              <div className="text-m font-bold text-center">Parciales</div>
              <div className="mt-1 text-lg font-extrabold text-orange-600 text-center">
                {Number(kpis.facturas_parciales || 0).toLocaleString("es-CO")}
              </div>
            </CardContent>
          </Card>

          <Card className="min-h-[74px]">
            <CardContent className="p-3 flex flex-col justify-center">
              <div className="text-m font-bold text-center">Valor x Facturas</div>
              <div className="mt-1 text-lg font-extrabold text-indigo-600 text-center">
                {formatCurrency(kpis.valor_compras_x_factura)}
              </div>
            </CardContent>
          </Card>

          <Card className="min-h-[74px]">
            <CardContent className="p-3 flex flex-col justify-center">
              <div className="text-m font-bold text-center"># Facturas</div>
              <div className="mt-1 text-lg font-extrabold text-indigo-600 text-center">
                {kpis.compras_x_factura.toLocaleString("es-CO")}
              </div>
            </CardContent>
          </Card>

          <Card className="min-h-[74px]">
            <CardContent className="p-3 flex flex-col justify-center">
              <div className="text-m font-bold text-center">Valor Ctas. Cobro</div>
              <div className="mt-1 text-lg font-extrabold text-purple-600 text-center">
                {formatCurrency(kpis.valor_compras_x_cta_cobro)}
              </div>
            </CardContent>
          </Card>

          <Card className="min-h-[74px]">
            <CardContent className="p-3 flex flex-col justify-center">
              <div className="text-m font-bold text-center"># Ctas. Cobro</div>
              <div className="mt-1 text-lg font-extrabold text-purple-600 text-center">
                {kpis.compras_x_cta_cobro.toLocaleString("es-CO")}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Evolución Mensual</CardTitle>
        </CardHeader>

        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={evolucionSegura}
              margin={{ top: 10, bottom: 40, left: 40, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="mes"
                tickFormatter={(mes) => format(new Date(mes), "MMM yyyy")}
                angle={-30}
                textAnchor="end"
                height={60}
              />

              <YAxis tickFormatter={(v) => formatCurrency(Number(v))} fontSize={11} />

              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrency(Number(value)),
                  name,
                ]}
                labelFormatter={(label) => {
                  try {
                    return format(new Date(label), "MMM yyyy");
                  } catch {
                    return label;
                  }
                }}
              />

              <Legend />

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

          <div className="text-s text-black-600 tracking-tight text-right">
            * Haga click sobre una barra de interés para mayor información
          </div>
        </CardContent>
      </Card>

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
                  <YAxis
                    type="category"
                    dataKey="proveedor"
                    width={220}
                    tick={{ fontSize: 12 }}
                  />
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
                  <YAxis
                    type="category"
                    dataKey="proveedor"
                    width={220}
                    tick={{ fontSize: 12 }}
                  />
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

          <div className="text-s text-black-600 tracking-tight text-right">
            * Haga click sobre una barra de interés para mayor información
          </div>
        </CardContent>
      </Card>

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
              {modalMes && (
                <div className="mb-4 space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-1">
                      Tipo de documento
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ["todos", "Todos"],
                          ["factura", "Facturas de compra"],
                          ["documento_soporte", "Documento Soporte"],
                        ] as const
                      ).map(([tipo, label]) => (
                        <button
                          key={tipo}
                          onClick={() => recargarModal(modalEstado, tipo)}
                          className={`px-3 py-1 rounded-full text-sm border transition ${
                            modalTipoDocumento === tipo
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white hover:bg-gray-100"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-1">Estado</div>

                    <div className="flex flex-wrap gap-2">
                      {(["total", "pagado", "pendiente", "parcial"] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => recargarModal(st, modalTipoDocumento)}
                          className={`px-3 py-1 rounded-full text-sm border transition ${
                            modalEstado === st
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white hover:bg-gray-100"
                          }`}
                        >
                          {labelEstadoModal(st)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                <div className="rounded-xl border bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">Cantidad</div>
                  <div className="text-lg font-bold">
                    {modalResumen.cantidad.toLocaleString("es-CO")}
                  </div>
                </div>

                <div className="rounded-xl border bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">Total</div>
                  <div className="text-lg font-bold text-blue-600">
                    {formatCurrency(modalResumen.total)}
                  </div>
                </div>

                <div className="rounded-xl border bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">Pagado</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(modalResumen.pagado)}
                  </div>
                </div>

                <div className="rounded-xl border bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">Saldo</div>
                  <div className="text-lg font-bold text-red-600">
                    {formatCurrency(modalResumen.saldo)}
                  </div>
                </div>
              </div>

              <div className="mb-3 flex justify-end">
                <select
                  value={modalSortBy}
                  onChange={(e) => setModalSortBy(e.target.value as ModalSortBy)}
                  className="border rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="fecha_desc">Fecha: más reciente primero</option>
                  <option value="fecha_asc">Fecha: más antigua primero</option>
                  <option value="proveedor_asc">Proveedor: A-Z</option>
                  <option value="proveedor_desc">Proveedor: Z-A</option>
                </select>
              </div>

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
                        "Pagado",
                        "Saldo",
                      ].map((h, idx) => (
                        <th key={idx} className={`p-2 ${idx < 6 ? "text-left" : "text-right"}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {modalRowsOrdenadas.map((r, i) => {
                      const estado = (r.estado_calc || "pendiente") as EstadoCalc;
                      const esPendiente = estado === "pendiente";
                      const esParcial = estado === "parcial";
                      const esAnomalia = !!r.anomalia_saldo_mayor_total;

                      const rowClass =
                        "border-b " +
                        (esPendiente ? "text-red-600 " : esParcial ? "text-orange-600 " : "") +
                        (esAnomalia ? "font-semibold " : "");

                      const pagadoCalc = Number.isFinite(Number(r.pagado_calc))
                        ? Number(r.pagado_calc)
                        : Number(r.total || 0) - Number(r.saldo || 0);

                      return (
                        <tr key={`${r.factura}-${i}`} className={rowClass}>
                          <td className="p-2">{r.proveedor_nombre}</td>
                          <td className="p-2">{r.factura}</td>
                          <td className="p-2">{formatDateSafe(r.fecha)}</td>
                          <td className="p-2">{formatDateSafe(r.vencimiento)}</td>
                          <td className="p-2">
                            {estado === "pagado"
                              ? "Pagada"
                              : estado === "parcial"
                              ? "Parcial"
                              : "Pendiente"}
                            {esAnomalia ? " ⚠️" : ""}
                          </td>
                          <td className="p-2">{r.centro_costo_nombre || "—"}</td>
                          <td className="p-2 text-right">{formatCurrency(r.total)}</td>
                          <td className="p-2 text-right">{formatCurrency(pagadoCalc)}</td>
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