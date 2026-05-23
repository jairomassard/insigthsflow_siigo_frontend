// src/app/reportes/financiero/consolidado/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LabelList,
} from "recharts";
import { formatInTimeZone } from "date-fns-tz";

interface EvolucionMes {
  mes: string;
  ingresos: number;
  ingresos_netos: number;
  ingresos_con_impuesto?: number;
  ingresos_sin_impuesto?: number;
  impuestos_netos?: number;
  facturas_emitidas?: number;
  notas_credito?: number;
  egresos: number;
  egresos_base?: number;
  nomina?: number;
  utilidad: number;
  margen: number;
  utilidad_acumulada: number;
  facturas_venta?: number;
  notas_credito_count?: number;
  facturas_compra?: number;
}

interface KPIs {
  ingresos: number;
  ingresos_netos: number;
  ingresos_con_impuesto?: number;
  ingresos_sin_impuesto?: number;
  impuestos_netos?: number;
  facturas_emitidas?: number;
  notas_credito?: number;
  egresos: number;
  nomina?: number;
  utilidad: number;
  margen: number;
  facturas_venta: number;
  notas_credito_count?: number;
  facturas_compra: number;
}

interface CentroCosto {
  id: string;
  nombre: string;
}

interface TopItem {
  nombre: string;
  total: number;
  facturas_emitidas?: number;
  notas_credito?: number;
}

type ModalMode = "ingresos" | "egresos";

type KpiTone = "emerald" | "green" | "red" | "rose" | "violet" | "sky" | "teal" | "orange";

interface KpiCardItem {
  label: string;
  displayValue: string;
  fullValue: string;
  helper: string;
  detail?: string;
  tone: KpiTone;
  rawValue?: number;
}

function toNum(value: any) {
  return Number(value || 0);
}

function formatCurrency(valor: any): string {
  return `$ ${Math.round(Number(valor || 0)).toLocaleString("es-CO")}`;
}

function fmtPct(valor: any): string {
  return `${Number(valor || 0).toLocaleString("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function getCompraEstadoTone(estado: any, saldo?: any) {
  const estadoNorm = String(estado || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const saldoNum = Number(saldo || 0);

  const isNoPagada =
    estadoNorm === "no pagada" ||
    estadoNorm === "no pagado" ||
    estadoNorm === "pendiente" ||
    estadoNorm === "vencida" ||
    estadoNorm === "vencido" ||
    saldoNum > 0;

  const isPagada =
    !isNoPagada &&
    (estadoNorm === "pagada" || estadoNorm === "pagado" || estadoNorm === "paid");

  if (isNoPagada) return "bg-red-100 text-red-700 border border-red-200";
  if (isPagada) return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  return "bg-amber-100 text-amber-700 border border-amber-200";
}

function abreviar(valor: number): string {
  const n = Number(valor || 0);
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${Math.round(n)}`;
}

function formatShortCurrency(valor: number): string {
  return `$ ${abreviar(Number(valor || 0))}`;
}

function getMesLabel(raw: string) {
  try {
    return formatInTimeZone(new Date(raw), "UTC", "MMM yyyy");
  } catch {
    return raw;
  }
}

function getMesTooltip(raw: string) {
  try {
    const txt = String(raw || "");
    const match = txt.match(/^(\d{4})-(\d{2})/);
    if (!match) return txt;
    return `${match[2]}-${match[1]}`;
  } catch {
    return raw;
  }
}

function getPeriodoSeguro(rawMes: any) {
  const raw = String(rawMes || "");
  const match = raw.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  const yearText = match[1];
  const monthText = match[2];
  const year = Number(yearText);
  const month = Number(monthText);
  if (!year || !month || month < 1 || month > 12) return null;
  const lastDay = new Date(year, month, 0).getDate();
  return {
    mesLabel: `${yearText}-${monthText}`,
    desdeMes: `${yearText}-${monthText}-01`,
    hastaMes: `${yearText}-${monthText}-${String(lastDay).padStart(2, "0")}`,
  };
}

function formatDateSafe(value: any) {
  if (!value) return "—";
  try {
    return formatInTimeZone(new Date(value), "UTC", "dd/MM/yyyy");
  } catch {
    return String(value);
  }
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getPeriodoLabel(fechaDesde: string, fechaHasta: string) {
  if (fechaDesde && fechaHasta) return `${fechaDesde} a ${fechaHasta}`;
  if (fechaDesde) return `Desde ${fechaDesde}`;
  if (fechaHasta) return `Hasta ${fechaHasta}`;
  return "Todos los datos cargados";
}

export default function ReporteFinancieroConsolidadoPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [evolucion, setEvolucion] = useState<EvolucionMes[]>([]);
  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [topClientes, setTopClientes] = useState<TopItem[]>([]);
  const [topProveedores, setTopProveedores] = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [centroCostos, setCentroCostos] = useState<string>("");
  const [selectedKpi, setSelectedKpi] = useState<KpiCardItem | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("ingresos");
  const [modalTitle, setModalTitle] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState("");
  const [detalleRows, setDetalleRows] = useState<any[]>([]);
  const [modalResumen, setModalResumen] = useState<any | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const queryParams = useMemo(() => {
    const q = new URLSearchParams();
    if (fechaDesde) q.set("desde", fechaDesde);
    if (fechaHasta) q.set("hasta", fechaHasta);
    if (centroCostos) q.set("centro_costos", centroCostos);
    const s = q.toString();
    return s ? `?${s}` : "";
  }, [fechaDesde, fechaHasta, centroCostos]);

  const centroSeleccionadoLabel = useMemo(() => {
    if (!centroCostos) return "Todos";
    return centros.find((c) => String(c.id) === String(centroCostos))?.nombre || centroCostos;
  }, [centroCostos, centros]);

  const limpiarFiltros = () => {
    setFechaDesde("");
    setFechaHasta("");
    setCentroCostos("");
    setSelectedKpi(null);
  };

  const cerrarModal = () => {
    setModalOpen(false);
    setDetalleRows([]);
    setModalResumen(null);
    setModalTitle("");
    setModalSubtitle("");
  };

  const loadConsolidado = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await authFetch(`/reportes/financiero/consolidado${queryParams}`);
      if (data?.error) {
        setErr(data.error);
        setKpis(null);
        setEvolucion([]);
        setTopClientes([]);
        setTopProveedores([]);
        return;
      }
      setKpis(data.kpis || null);
      setEvolucion(Array.isArray(data.evolucion) ? data.evolucion : []);
      setTopClientes(Array.isArray(data.top_clientes) ? data.top_clientes : []);
      setTopProveedores(Array.isArray(data.top_proveedores) ? data.top_proveedores : []);
    } catch (e: any) {
      console.error("Error cargando consolidado", e);
      setErr(e?.message || "Error cargando consolidado financiero");
      setKpis(null);
      setEvolucion([]);
      setTopClientes([]);
      setTopProveedores([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCentros = async () => {
    try {
      const data = await authFetch(`/catalogos/centros-costo-consolidado${queryParams}`);
      setCentros(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando centros de costo", e);
      setCentros([]);
    }
  };

  useEffect(() => {
    loadConsolidado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams]);

  useEffect(() => {
    loadCentros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams]);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedKpi(null);
        cerrarModal();
      }
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrirModal = async ({
    mode,
    title,
    subtitle,
    params,
  }: {
    mode: ModalMode;
    title: string;
    subtitle?: string;
    params: URLSearchParams;
  }) => {
    setModalMode(mode);
    setModalTitle(title);
    setModalSubtitle(subtitle || "");
    setModalOpen(true);
    setModalLoading(true);
    setDetalleRows([]);
    setModalResumen(null);
    try {
      const endpoint =
        mode === "ingresos"
          ? `/reportes/facturas_cliente?${params.toString()}`
          : `/reportes/facturas_proveedor?${params.toString()}`;
      const result = await authFetch(endpoint);
      setDetalleRows(Array.isArray(result?.rows) ? result.rows : []);
      setModalResumen(result?.resumen || null);
    } catch (error) {
      console.error("Error cargando detalle", error);
      setDetalleRows([]);
      setModalResumen(null);
    } finally {
      setModalLoading(false);
    }
  };

  const handleBarClick = async (tipo: ModalMode, data: any) => {
    const periodo = getPeriodoSeguro(data?.mes);
    if (!periodo) {
      console.error("handleBarClick: mes inválido recibido:", data?.mes, data);
      return;
    }
    const qs = new URLSearchParams({ desde: periodo.desdeMes, hasta: periodo.hastaMes });
    if (centroCostos) qs.set("centro_costos", centroCostos);
    await abrirModal({
      mode: tipo,
      title:
        tipo === "ingresos"
          ? `Movimientos de ingresos - ${periodo.mesLabel}`
          : `Facturas de compra - ${periodo.mesLabel}`,
      subtitle:
        tipo === "ingresos"
          ? "Incluye facturas y notas crédito del mes."
          : "Detalle de compras y gastos del mes.",
      params: qs,
    });
  };

  const handleClienteClick = async (nombre: string) => {
    const qs = new URLSearchParams();
    if (fechaDesde) qs.set("desde", fechaDesde);
    if (fechaHasta) qs.set("hasta", fechaHasta);
    if (centroCostos) qs.set("centro_costos", centroCostos);
    qs.set("cliente", nombre);
    await abrirModal({
      mode: "ingresos",
      title: `Movimientos de ingresos - ${nombre}`,
      subtitle: "Facturas y notas crédito del cliente según filtros.",
      params: qs,
    });
  };

  const handleProveedorClick = async (nombre: string) => {
    const qs = new URLSearchParams();
    if (fechaDesde) qs.set("desde", fechaDesde);
    if (fechaHasta) qs.set("hasta", fechaHasta);
    if (centroCostos) qs.set("centro_costos", centroCostos);
    qs.set("proveedor", nombre);
    await abrirModal({
      mode: "egresos",
      title: `Compras a proveedor - ${nombre}`,
      subtitle: "Facturas de compra según filtros.",
      params: qs,
    });
  };

  const ingresosNetos = toNum(kpis?.ingresos_netos ?? kpis?.ingresos);
  const facturasEmitidas = toNum(kpis?.facturas_emitidas);
  const notasCredito = toNum(kpis?.notas_credito);
  const egresos = toNum(kpis?.egresos);
  const utilidad = toNum(kpis?.utilidad);
  const margen = toNum(kpis?.margen);
  const facturasVenta = toNum(kpis?.facturas_venta);
  const notasCreditoCount = toNum(kpis?.notas_credito_count);
  const facturasCompra = toNum(kpis?.facturas_compra);

  const kpiCards: KpiCardItem[] = kpis
    ? [
        {
          label: "Ingresos netos",
          displayValue: formatShortCurrency(ingresosNetos),
          fullValue: formatCurrency(ingresosNetos),
          helper: "Facturas emitidas menos notas crédito, con impuesto.",
          detail: "Es el ingreso real del periodo después de descontar devoluciones o notas crédito.",
          tone: "emerald",
          rawValue: ingresosNetos,
        },
        {
          label: "Facturas emitidas",
          displayValue: formatShortCurrency(facturasEmitidas),
          fullValue: formatCurrency(facturasEmitidas),
          helper: "Ventas facturadas antes de descontar notas crédito.",
          detail: "Representa el total bruto facturado en ventas durante el periodo filtrado.",
          tone: "green",
          rawValue: facturasEmitidas,
        },
        {
          label: "Notas crédito",
          displayValue: formatShortCurrency(notasCredito),
          fullValue: formatCurrency(notasCredito),
          helper: "Notas crédito descontadas de ingresos.",
          detail: "Valor que reduce las ventas por devoluciones, ajustes o anulaciones comerciales.",
          tone: "red",
          rawValue: notasCredito,
        },
        {
          label: "Egresos",
          displayValue: formatShortCurrency(egresos),
          fullValue: formatCurrency(egresos),
          helper: "Compras y gastos, incluyendo nómina si aplica.",
          detail: "Resume las salidas registradas para comparar contra los ingresos netos.",
          tone: "rose",
          rawValue: egresos,
        },
        {
          label: "Utilidad",
          displayValue: formatShortCurrency(utilidad),
          fullValue: formatCurrency(utilidad),
          helper: "Ingresos netos menos egresos.",
          detail: "Muestra el resultado financiero del periodo después de descontar egresos.",
          tone: "violet",
          rawValue: utilidad,
        },
        {
          label: "Margen",
          displayValue: fmtPct(margen),
          fullValue: fmtPct(margen),
          helper: "Utilidad sobre ingresos netos.",
          detail: "Permite evaluar qué porcentaje de los ingresos netos se convierte en utilidad.",
          tone: "sky",
          rawValue: margen,
        },
        {
          label: "Fact. venta",
          displayValue: `${facturasVenta.toLocaleString("es-CO")}`,
          fullValue: `${facturasVenta.toLocaleString("es-CO")} facturas de venta`,
          helper: `Notas crédito: ${notasCreditoCount.toLocaleString("es-CO")}`,
          detail: "Cantidad de documentos de venta encontrados según los filtros actuales.",
          tone: "teal",
          rawValue: facturasVenta,
        },
        {
          label: "Fact. compra",
          displayValue: `${facturasCompra.toLocaleString("es-CO")}`,
          fullValue: `${facturasCompra.toLocaleString("es-CO")} facturas de compra`,
          helper: "Documentos de compra/gasto.",
          detail: "Cantidad de documentos de compra o gasto encontrados según los filtros actuales.",
          tone: "orange",
          rawValue: facturasCompra,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="space-y-3 p-3 md:p-4 lg:p-4 xl:p-5">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.10),_transparent_30%),radial-gradient(circle_at_left,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(to_bottom_right,_rgba(255,255,255,1),_rgba(248,250,252,0.96))]" />
          <div className="relative flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between md:p-4">
            <div>
              <div className="mb-1 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Reporte financiero
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
                Consolidado Ingresos vs Egresos
              </h1>
              <p className="mt-1 max-w-4xl text-xs text-slate-600 md:text-sm">
                Ingresos netos alineados con Siigo: facturas emitidas menos notas crédito, comparados contra egresos, nómina y utilidad.
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <MiniMetric label="Estado" value={loading ? "Cargando" : err ? "Con error" : "Actualizado"} danger={!!err} />
              <MiniMetric label="Meses" value={evolucion.length} />
              <MiniMetric label="Clientes" value={topClientes.length} />
              <MiniMetric label="Proveedores" value={topProveedores.length} />
            </div>
          </div>
        </div>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fecha desde</label>
                  <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="h-9 rounded-xl border-slate-200 bg-white text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fecha hasta</label>
                  <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="h-9 rounded-xl border-slate-200 bg-white text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Centro de costos</label>
                  <select value={centroCostos} onChange={(e) => setCentroCostos(e.target.value)} className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400">
                    <option value="">Todos</option>
                    {centros.map((cc) => (
                      <option key={cc.id} value={cc.id}>{cc.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button onClick={limpiarFiltros} className="h-9 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Limpiar
              </button>
            </div>
          </CardContent>
        </Card>

        {err && (
          <Card className="rounded-3xl border-red-200 bg-red-50 shadow-sm">
            <CardContent className="p-3 text-sm font-medium text-red-700">{err}</CardContent>
          </Card>
        )}

        {kpis && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
            {kpiCards.map((item) => (
              <KpiCardCompact key={item.label} item={item} onClick={() => setSelectedKpi(item)} />
            ))}
          </div>
        )}

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="px-4 pb-1 pt-3">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-base font-bold text-slate-900">Evolución mensual</CardTitle>
              <div className="text-xs text-slate-500">Clic en las barras para abrir detalle. Ingresos = facturas menos notas crédito.</div>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-1">
            {evolucion.length === 0 ? (
              <div className="flex h-[270px] items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">
                Sin datos para los filtros seleccionados.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={310}>
                <ComposedChart data={evolucion} margin={{ top: 14, bottom: 18, left: 0, right: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="mes"
                    tickFormatter={(mes) => getMesLabel(mes)}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={{ stroke: "#cbd5e1" }}
                  />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={(v) => `$${abreviar(Number(v))}`}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={{ stroke: "#cbd5e1" }}
                    width={58}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={{ stroke: "#cbd5e1" }}
                    width={38}
                  />
                  <Tooltip
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const row = payload[0]?.payload || {};
                      return (
                        <div className="min-w-[260px] rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl">
                          <div className="mb-2 text-sm font-bold text-slate-800">Mes {getMesTooltip(label)}</div>
                          <div className="space-y-1.5 text-sm">
                            <TooltipLine label="Facturas emitidas" value={formatCurrency(row.facturas_emitidas)} className="text-emerald-700" />
                            <TooltipLine label="Notas crédito" value={formatCurrency(row.notas_credito)} className="text-red-700" />
                            <TooltipLine label="Ingresos netos" value={formatCurrency(row.ingresos_netos ?? row.ingresos)} className="text-green-700" strong />
                            <TooltipLine label="Egresos" value={formatCurrency(row.egresos)} className="text-rose-700" />
                            <TooltipLine label="Nómina" value={formatCurrency(row.nomina)} className="text-orange-700" />
                            <TooltipLine label="Utilidad" value={formatCurrency(row.utilidad)} className="text-violet-700" strong />
                            <TooltipLine label="Margen" value={fmtPct(row.margen)} className="text-sky-700" />
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    yAxisId="left"
                    dataKey="ingresos_netos"
                    name="Ingresos netos"
                    fill="#10b981"
                    radius={[8, 8, 0, 0]}
                    onClick={(data: any) => handleBarClick("ingresos", data?.payload || data)}
                    cursor="pointer"
                  >
                    <LabelList dataKey="ingresos_netos" position="top" formatter={(v: any) => abreviar(Number(v))} style={{ fontSize: 10, fill: "#047857", fontWeight: 700 }} />
                  </Bar>
                  <Bar
                    yAxisId="left"
                    dataKey="egresos"
                    name="Egresos"
                    fill="#f43f5e"
                    radius={[8, 8, 0, 0]}
                    onClick={(data: any) => handleBarClick("egresos", data?.payload || data)}
                    cursor="pointer"
                  >
                    <LabelList dataKey="egresos" position="top" formatter={(v: any) => abreviar(Number(v))} style={{ fontSize: 10, fill: "#be123c", fontWeight: 700 }} />
                  </Bar>
                  <Line yAxisId="left" type="monotone" dataKey="utilidad" name="Utilidad" stroke="#7c3aed" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line yAxisId="right" type="monotone" dataKey="margen" name="Margen %" stroke="#0284c7" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <TopHorizontalBarCard
            title="Top clientes"
            subtitle="Clientes con mayor venta neta según filtros. Toca una barra para abrir detalle."
            data={topClientes}
            emptyText="Sin clientes para los filtros seleccionados."
            color="#10b981"
            labelColor="#047857"
            tooltipKind="clientes"
            onClick={handleClienteClick}
          />
          <TopHorizontalBarCard
            title="Top proveedores"
            subtitle="Proveedores con mayor compra o gasto según filtros. Toca una barra para abrir detalle."
            data={topProveedores}
            emptyText="Sin proveedores para los filtros seleccionados."
            color="#f43f5e"
            labelColor="#be123c"
            tooltipKind="proveedores"
            onClick={handleProveedorClick}
          />
        </div>
      </div>

      <KpiDetailPopover
        item={selectedKpi}
        periodo={getPeriodoLabel(fechaDesde, fechaHasta)}
        centroCosto={centroSeleccionadoLabel}
        onClose={() => setSelectedKpi(null)}
      />

      <DetalleModal
        open={modalOpen}
        mode={modalMode}
        title={modalTitle}
        subtitle={modalSubtitle}
        rows={detalleRows}
        resumen={modalResumen}
        loading={modalLoading}
        onClose={cerrarModal}
      />
    </div>
  );
}

function MiniMetric({ label, value, danger = false }: { label: string; value: any; danger?: boolean }) {
  return (
    <div className={cx("rounded-2xl border px-3 py-2 text-center shadow-sm", danger ? "border-red-200 bg-red-50" : "border-slate-200 bg-white/80")}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={cx("mt-0.5 text-xs font-extrabold", danger ? "text-red-700" : "text-slate-800")}>{value}</div>
    </div>
  );
}

function getKpiToneClasses(tone: KpiTone) {
  const map: Record<KpiTone, { bg: string; text: string; chip: string; ring: string }> = {
    emerald: { bg: "from-emerald-500/15 to-emerald-400/5", text: "text-emerald-700", chip: "bg-emerald-100 text-emerald-700", ring: "ring-emerald-200" },
    green: { bg: "from-green-500/15 to-green-400/5", text: "text-green-700", chip: "bg-green-100 text-green-700", ring: "ring-green-200" },
    red: { bg: "from-red-500/15 to-rose-400/5", text: "text-red-700", chip: "bg-red-100 text-red-700", ring: "ring-red-200" },
    rose: { bg: "from-rose-500/15 to-red-400/5", text: "text-rose-700", chip: "bg-rose-100 text-rose-700", ring: "ring-rose-200" },
    violet: { bg: "from-violet-500/15 to-purple-400/5", text: "text-violet-700", chip: "bg-violet-100 text-violet-700", ring: "ring-violet-200" },
    sky: { bg: "from-sky-500/15 to-indigo-400/5", text: "text-sky-700", chip: "bg-sky-100 text-sky-700", ring: "ring-sky-200" },
    teal: { bg: "from-teal-500/15 to-teal-300/5", text: "text-teal-700", chip: "bg-teal-100 text-teal-700", ring: "ring-teal-200" },
    orange: { bg: "from-orange-500/15 to-amber-400/5", text: "text-orange-700", chip: "bg-orange-100 text-orange-700", ring: "ring-orange-200" },
  };
  return map[tone];
}

function KpiCardCompact({ item, onClick }: { item: KpiCardItem; onClick: () => void }) {
  const tone = getKpiToneClasses(item.tone);
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${item.label}: ${item.fullValue}`}
      className={cx(
        "group relative overflow-hidden rounded-2xl border border-slate-200 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2",
        "bg-gradient-to-br",
        tone.bg,
        tone.ring
      )}
    >
      <div className="absolute inset-0 bg-white/86 backdrop-blur-[1px]" />
      <div className="relative flex h-[74px] flex-col justify-between p-2.5 xl:h-[82px]">
        <div className="flex items-start justify-between gap-1">
          <span className="line-clamp-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{item.label}</span>
          <span className={cx("rounded-full px-1.5 py-0.5 text-[9px] font-extrabold", tone.chip)}>i</span>
        </div>
        <div>
          <div className={cx("truncate text-[15px] font-black leading-tight xl:text-lg", tone.text)}>{item.displayValue}</div>
          <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-slate-500">Toca para ver detalle</p>
        </div>
      </div>
    </button>
  );
}

function KpiDetailPopover({ item, periodo, centroCosto, onClose }: { item: KpiCardItem | null; periodo: string; centroCosto: string; onClose: () => void }) {
  if (!item) return null;
  const tone = getKpiToneClasses(item.tone);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className={cx("bg-gradient-to-br p-4", tone.bg)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">KPI seleccionado</div>
              <h3 className="mt-1 text-lg font-black text-slate-900">{item.label}</h3>
            </div>
            <button onClick={onClose} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">
              Cerrar
            </button>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Valor completo</div>
            <div className={cx("mt-1 text-2xl font-black", tone.text)}>{item.fullValue}</div>
          </div>
          <p className="text-sm leading-relaxed text-slate-600">{item.detail || item.helper}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Periodo</div>
              <div className="mt-1 text-sm font-bold text-slate-700">{periodo}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Centro de costos</div>
              <div className="mt-1 text-sm font-bold text-slate-700">{centroCosto}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TooltipLine({ label, value, className, strong = false }: { label: string; value: any; className?: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className={cx(strong ? "font-extrabold" : "font-semibold", className)}>{value}</span>
    </div>
  );
}

function TopHorizontalBarCard({
  title,
  subtitle,
  data,
  emptyText,
  color,
  labelColor,
  tooltipKind,
  onClick,
}: {
  title: string;
  subtitle: string;
  data: TopItem[];
  emptyText: string;
  color: string;
  labelColor: string;
  tooltipKind: "clientes" | "proveedores";
  onClick: (nombre: string) => void;
}) {
  const chartData = (data || []).slice(0, 12);
  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm">
      <CardHeader className="px-4 pb-1 pt-3">
        <CardTitle className="text-base font-bold text-slate-900">{title}</CardTitle>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-1">
        {chartData.length === 0 ? (
          <div className="flex h-[255px] items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">
            {emptyText}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={285}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 44, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => abreviar(Number(v))} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={{ stroke: "#cbd5e1" }} tickLine={{ stroke: "#cbd5e1" }} />
              <YAxis type="category" dataKey="nombre" width={170} tick={{ fontSize: 10, fill: "#334155" }} axisLine={{ stroke: "#cbd5e1" }} tickLine={{ stroke: "#cbd5e1" }} />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const row = payload[0].payload || {};
                  return (
                    <div className="min-w-[230px] rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl">
                      <div className="mb-2 text-sm font-bold text-slate-800">{row.nombre}</div>
                      {tooltipKind === "clientes" ? (
                        <div className="space-y-1.5 text-sm">
                          <TooltipLine label="Facturas emitidas" value={formatCurrency(row.facturas_emitidas)} className="text-emerald-700" />
                          <TooltipLine label="Notas crédito" value={formatCurrency(row.notas_credito)} className="text-red-700" />
                          <TooltipLine label="Venta neta" value={formatCurrency(row.total)} className="text-green-700" strong />
                        </div>
                      ) : (
                        <div className="space-y-1.5 text-sm">
                          <TooltipLine label="Total compras" value={formatCurrency(row.total)} className="text-rose-700" strong />
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="total"
                fill={color}
                radius={[0, 8, 8, 0]}
                onClick={(data: any) => {
                  const nombre = data?.payload?.nombre;
                  if (nombre) onClick(nombre);
                }}
                cursor="pointer"
              >
                <LabelList dataKey="total" position="right" formatter={(v: any) => abreviar(Number(v))} style={{ fontSize: 10, fill: labelColor, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function DetalleModal({
  open,
  mode,
  title,
  subtitle,
  rows,
  resumen,
  loading,
  onClose,
}: {
  open: boolean;
  mode: ModalMode;
  title: string;
  subtitle?: string;
  rows: any[];
  resumen?: any;
  loading?: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  const isIngresos = mode === "ingresos";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm">
      <div className="relative max-h-[92vh] w-full max-w-7xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle || "Detalle transaccional según los filtros seleccionados."}</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
            Cerrar
          </button>
        </div>
        {isIngresos && (
          <div className="grid gap-2 border-b border-slate-100 bg-white px-4 py-3 sm:grid-cols-2 lg:grid-cols-5">
            <ModalMetric label="Facturas emitidas" value={formatCurrency(resumen?.facturas_emitidas)} tone="emerald" />
            <ModalMetric label="Notas crédito" value={formatCurrency(resumen?.notas_credito)} tone="red" />
            <ModalMetric label="Ingresos netos" value={formatCurrency(resumen?.ventas_netas)} tone="green" />
            <ModalMetric label="Facturas" value={resumen?.total_facturas ?? rows.filter((r) => r.tipo_movimiento === "FACTURA").length} tone="slate" />
            <ModalMetric label="Notas crédito" value={resumen?.total_notas_credito ?? rows.filter((r) => r.tipo_movimiento === "NOTA_CREDITO").length} tone="slate" />
          </div>
        )}
        <div className="max-h-[72vh] overflow-auto p-3">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-500">Cargando detalle…</div>
          ) : (
            <div className="overflow-auto rounded-2xl border border-slate-200">
              {isIngresos ? <IngresosTable rows={rows} /> : <EgresosTable rows={rows} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalMetric({ label, value, tone = "slate" }: { label: string; value: any; tone?: "slate" | "emerald" | "green" | "red" }) {
  const map = {
    slate: "bg-slate-50 text-slate-800 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-100",
    green: "bg-green-50 text-green-800 border-green-100",
    red: "bg-red-50 text-red-800 border-red-100",
  };
  return (
    <div className={cx("rounded-2xl border px-3 py-2", map[tone])}>
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-sm font-extrabold">{value ?? "—"}</div>
    </div>
  );
}

function IngresosTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full min-w-[1280px] border-separate border-spacing-0 text-sm">
      <thead className="sticky top-0 z-10 bg-slate-100">
        <tr className="text-left text-slate-700">
          <th className="border-b border-slate-200 px-3 py-3">Tipo</th>
          <th className="border-b border-slate-200 px-3 py-3">Documento</th>
          <th className="border-b border-slate-200 px-3 py-3">Afecta</th>
          <th className="border-b border-slate-200 px-3 py-3">Cliente</th>
          <th className="border-b border-slate-200 px-3 py-3">Fecha</th>
          <th className="border-b border-slate-200 px-3 py-3">Vencimiento</th>
          <th className="border-b border-slate-200 px-3 py-3">Centro de costo</th>
          <th className="border-b border-slate-200 px-3 py-3 text-right">Subtotal</th>
          <th className="border-b border-slate-200 px-3 py-3 text-right">Impuestos</th>
          <th className="border-b border-slate-200 px-3 py-3 text-right">Total</th>
          <th className="border-b border-slate-200 px-3 py-3 text-right">Pagado</th>
          <th className="border-b border-slate-200 px-3 py-3 text-right">Pendiente</th>
          <th className="border-b border-slate-200 px-3 py-3">Link</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={13} className="px-4 py-8 text-center text-sm text-slate-500">No hay movimientos encontrados.</td></tr>
        ) : (
          rows.map((f, i) => {
            const isNC = f.tipo_movimiento === "NOTA_CREDITO";
            const subtotal = toNum(f.subtotal);
            const impuestos = toNum(f.impuestos_total ?? f.impuestos);
            const total = toNum(f.total);
            const pagado = toNum(f.valor_pagado ?? f.pagado);
            const pendiente = toNum(f.valor_pendiente ?? f.saldo);
            return (
              <tr key={`${f.tipo_movimiento}-${f.documento || f.idfactura}-${i}`} className={cx("transition hover:bg-slate-50", isNC && "bg-red-50/40")}>
                <td className="border-b border-slate-100 px-3 py-3"><span className={cx("rounded-full px-2.5 py-1 text-xs font-bold", isNC ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700")}>{isNC ? "Nota crédito" : "Factura"}</span></td>
                <td className="border-b border-slate-100 px-3 py-3 font-medium text-slate-800">{f.documento || f.idfactura}</td>
                <td className="border-b border-slate-100 px-3 py-3 text-slate-600">{f.documento_afectado || "—"}</td>
                <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{f.cliente_nombre || "—"}</td>
                <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{formatDateSafe(f.fecha)}</td>
                <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{formatDateSafe(f.vencimiento)}</td>
                <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{f.centro_costo_nombre || "—"}</td>
                <td className={cx("border-b border-slate-100 px-3 py-3 text-right font-medium", subtotal < 0 ? "text-red-700" : "text-slate-700")}>{formatCurrency(subtotal)}</td>
                <td className={cx("border-b border-slate-100 px-3 py-3 text-right", impuestos < 0 ? "text-red-700" : "text-slate-700")}>{formatCurrency(impuestos)}</td>
                <td className={cx("border-b border-slate-100 px-3 py-3 text-right font-semibold", total < 0 ? "text-red-700" : "text-slate-800")}>{formatCurrency(total)}</td>
                <td className="border-b border-slate-100 px-3 py-3 text-right text-slate-700">{formatCurrency(pagado)}</td>
                <td className="border-b border-slate-100 px-3 py-3 text-right text-slate-700">{formatCurrency(pendiente)}</td>
                <td className="border-b border-slate-100 px-3 py-3">{f.public_url ? <a href={f.public_url} target="_blank" rel="noreferrer" className="font-semibold text-blue-600 hover:underline">Ver</a> : <span className="text-slate-400">—</span>}</td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

function EgresosTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-sm">
      <thead className="sticky top-0 z-10 bg-slate-100">
        <tr className="text-left text-slate-700">
          <th className="border-b border-slate-200 px-3 py-3">Proveedor</th>
          <th className="border-b border-slate-200 px-3 py-3">Documento</th>
          <th className="border-b border-slate-200 px-3 py-3">Factura proveedor</th>
          <th className="border-b border-slate-200 px-3 py-3">Fecha</th>
          <th className="border-b border-slate-200 px-3 py-3">Vencimiento</th>
          <th className="border-b border-slate-200 px-3 py-3">Estado</th>
          <th className="border-b border-slate-200 px-3 py-3">Centro de costo</th>
          <th className="border-b border-slate-200 px-3 py-3 text-right">Total</th>
          <th className="border-b border-slate-200 px-3 py-3 text-right">Saldo</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">No hay compras encontradas.</td></tr>
        ) : (
          rows.map((c, i) => (
            <tr key={`${c.idcompra || c.id}-${i}`} className="transition hover:bg-slate-50">
              <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{c.proveedor_nombre || "Sin proveedor"}</td>
              <td className="border-b border-slate-100 px-3 py-3 font-medium text-slate-800">{c.idcompra || c.id}</td>
              <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{c.factura_proveedor || "—"}</td>
              <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{formatDateSafe(c.fecha)}</td>
              <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{formatDateSafe(c.vencimiento)}</td>
              <td className="border-b border-slate-100 px-3 py-3"><span className={cx("rounded-full px-2.5 py-1 text-xs font-bold", getCompraEstadoTone(c.estado, c.saldo))}>{c.estado || "—"}</span></td>
              <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{c.centro_costo_nombre || "—"}</td>
              <td className="border-b border-slate-100 px-3 py-3 text-right font-semibold text-slate-800">{formatCurrency(c.total)}</td>
              <td className="border-b border-slate-100 px-3 py-3 text-right text-slate-700">{formatCurrency(c.saldo)}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
