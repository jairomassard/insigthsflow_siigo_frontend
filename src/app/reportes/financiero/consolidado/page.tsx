// src/app/reportes/financiero/consolidado/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api";
import { getDefaultYearToDateRange } from "@/lib/dateDefaults";
import { usePermisos } from "@/hooks/usePermisos";
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
import { getWhoAmI } from "@/lib/authInfo";

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
type EstadoModal = "total" | "pagado" | "pendiente" | "parcial";
type TipoDocumentoModal = "todos" | "factura" | "documento_soporte";
type ModalSortBy = "fecha_desc" | "fecha_asc" | "nombre_asc" | "nombre_desc";
type ModalContext =
  | { kind: "mes"; mes: string }
  | { kind: "proveedor"; nombre: string }
  | { kind: "cliente"; nombre: string };

function labelEstadoModal(estado: EstadoModal): string {
  if (estado === "total") return "Todas";
  if (estado === "pagado") return "Pagado";
  if (estado === "pendiente") return "Pendiente";
  return "Parcial";
}

function labelTipoDocumento(tipo: TipoDocumentoModal): string {
  if (tipo === "factura") return "Facturas de compra";
  if (tipo === "documento_soporte") return "Documento Soporte";
  return "Todas";
}

// Traduce el estado interno (compartido con el modal de Egresos por
// Compras/Gastos) al valor que espera /reportes/facturas_cliente del lado de
// ingresos ("pagada", no "pagado"). "total" = sin filtro.
function estadoParamIngresos(estado: EstadoModal): string {
  if (estado === "total") return "";
  if (estado === "pagado") return "pagada";
  return estado;
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

function abreviar(valor: number): string {
  const n = Number(valor || 0);
  const abs = Math.abs(n);

  if (abs >= 1_000_000_000) {
    const millones = n / 1_000_000;
    return `${millones.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  }
  if (abs >= 1_000_000) {
    const millones = n / 1_000_000;
    return `${millones.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  }
  if (abs >= 1_000) {
    const miles = n / 1_000;
    return `${miles.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}K`;
  }
  return `${Math.round(n).toLocaleString("es-CO")}`;
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

export default function ReporteFinancieroConsolidadoPage() {
  const { permisos } = usePermisos();
  const tieneNomina = permisos.includes("ver_reporte_nomina");

  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [evolucion, setEvolucion] = useState<EvolucionMes[]>([]);
  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [topClientes, setTopClientes] = useState<TopItem[]>([]);
  const [topProveedores, setTopProveedores] = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [defaultDates] = useState(() => getDefaultYearToDateRange());

  const [fechaDesde, setFechaDesde] = useState<string>(defaultDates.desde);
  const [fechaHasta, setFechaHasta] = useState<string>(defaultDates.hasta);
  const [centroCostos, setCentroCostos] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("ingresos");
  const [modalTitle, setModalTitle] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState("");
  const [detalleRows, setDetalleRows] = useState<any[]>([]);
  const [modalResumen, setModalResumen] = useState<any | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<any | null>(null);

  const [modalContext, setModalContext] = useState<ModalContext | null>(null);
  const [modalEstado, setModalEstado] = useState<EstadoModal>("total");
  const [modalTipoDocumento, setModalTipoDocumento] =
    useState<TipoDocumentoModal>("todos");
  const [modalSortBy, setModalSortBy] = useState<ModalSortBy>("fecha_desc");

  // Ver la misma nota en compras_gastos/page.tsx junto a este estado: Alegra
  // no distingue Factura de Compra de Documento Soporte, por eso ese filtro
  // se oculta para clientes Alegra.
  const [proveedorDatos, setProveedorDatos] = useState<"siigo" | "alegra">(
    "siigo",
  );

  useEffect(() => {
    getWhoAmI().then((me) => {
      if (me?.proveedor_datos)
        setProveedorDatos(me.proveedor_datos as "siigo" | "alegra");
    });
  }, []);

  const queryParams = useMemo(() => {
    const q = new URLSearchParams();
    if (fechaDesde) q.set("desde", fechaDesde);
    if (fechaHasta) q.set("hasta", fechaHasta);
    if (centroCostos) q.set("centro_costos", centroCostos);
    const s = q.toString();
    return s ? `?${s}` : "";
  }, [fechaDesde, fechaHasta, centroCostos]);

  const limpiarFiltros = () => {
    const d = getDefaultYearToDateRange();

    setFechaDesde(d.desde);
    setFechaHasta(d.hasta);
    setCentroCostos("");
  };

  const cerrarModal = () => {
    setModalOpen(false);
    setDetalleRows([]);
    setModalResumen(null);
    setModalTitle("");
    setModalSubtitle("");
    setModalContext(null);
    setModalEstado("total");
    setModalTipoDocumento("todos");
    setModalSortBy("fecha_desc");
  };

  const loadConsolidado = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await authFetch(
        `/reportes/financiero/consolidado${queryParams}`,
      );
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
      setTopProveedores(
        Array.isArray(data.top_proveedores) ? data.top_proveedores : [],
      );
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
      const data = await authFetch(
        `/catalogos/centros-costo-consolidado${queryParams}`,
      );
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
      if (e.key === "Escape") cerrarModal();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trae las filas del modal según modo (ingresos/egresos) + contexto (mes,
  // proveedor o cliente) + filtros (estado, tipo de documento). Para egresos
  // reutiliza literalmente los mismos endpoints que ya usa el modal de
  // "Egresos por Compras/Gastos" (con el cálculo correcto de pagado_calc/
  // estado_calc que descuenta retención de Documento Soporte) en vez de
  // /reportes/facturas_proveedor, que no tenía ese ajuste ni filtros.
  async function cargarModal(
    mode: ModalMode,
    context: ModalContext,
    estado: EstadoModal,
    tipoDocumento: TipoDocumentoModal,
  ): Promise<{ rows: any[]; resumen: any | null }> {
    if (mode === "egresos") {
      if (context.kind === "mes") {
        const qs = new URLSearchParams({ mes: context.mes });
        if (estado !== "total") qs.set("estado", estado);
        if (tipoDocumento !== "todos") qs.set("tipo_documento", tipoDocumento);
        if (centroCostos) qs.set("centro_costos", centroCostos);
        const rows = await authFetch(
          `/reportes/financiero/compras-gastos/detalle?${qs.toString()}`,
        );
        return { rows: Array.isArray(rows) ? rows : [], resumen: null };
      }

      const nombreProveedor =
        context.kind === "proveedor" ? context.nombre : "";
      const qs = new URLSearchParams();
      if (fechaDesde) qs.set("desde", fechaDesde);
      if (fechaHasta) qs.set("hasta", fechaHasta);
      if (centroCostos) qs.set("centro_costos", centroCostos);
      qs.set("proveedor", nombreProveedor);
      if (estado !== "total") qs.set("estado", estado);
      if (tipoDocumento !== "todos") qs.set("tipo_documento", tipoDocumento);
      const rows = await authFetch(
        `/reportes/financiero/compras-gastos/detalle-proveedor?${qs.toString()}`,
      );
      return { rows: Array.isArray(rows) ? rows : [], resumen: null };
    }

    // ingresos
    const qs = new URLSearchParams();
    if (context.kind === "mes") {
      const periodo = getPeriodoSeguro(context.mes);
      if (periodo) {
        qs.set("desde", periodo.desdeMes);
        qs.set("hasta", periodo.hastaMes);
      }
    } else {
      if (fechaDesde) qs.set("desde", fechaDesde);
      if (fechaHasta) qs.set("hasta", fechaHasta);
    }
    if (centroCostos) qs.set("centro_costos", centroCostos);
    if (context.kind === "cliente") qs.set("cliente", context.nombre);
    const estadoParam = estadoParamIngresos(estado);
    if (estadoParam) qs.set("estado", estadoParam);

    const result = await authFetch(`/reportes/facturas_cliente?${qs.toString()}`);
    return {
      rows: Array.isArray(result?.rows) ? result.rows : [],
      resumen: result?.resumen || null,
    };
  }

  const abrirModalConContexto = async (
    mode: ModalMode,
    context: ModalContext,
    title: string,
    subtitle: string,
  ) => {
    setModalMode(mode);
    setModalContext(context);
    setModalEstado("total");
    setModalTipoDocumento("todos");
    setModalSortBy("fecha_desc");
    setModalTitle(title);
    setModalSubtitle(subtitle);
    setModalOpen(true);
    setModalLoading(true);
    setDetalleRows([]);
    setModalResumen(null);
    try {
      const { rows, resumen } = await cargarModal(
        mode,
        context,
        "total",
        "todos",
      );
      setDetalleRows(rows);
      setModalResumen(resumen);
    } catch (error) {
      console.error("Error cargando detalle", error);
      setDetalleRows([]);
      setModalResumen(null);
    } finally {
      setModalLoading(false);
    }
  };

  const recargarModal = async (
    nuevoEstado: EstadoModal = modalEstado,
    nuevoTipoDocumento: TipoDocumentoModal = modalTipoDocumento,
  ) => {
    if (!modalContext) return;
    setModalEstado(nuevoEstado);
    setModalTipoDocumento(nuevoTipoDocumento);
    setModalLoading(true);
    try {
      const { rows, resumen } = await cargarModal(
        modalMode,
        modalContext,
        nuevoEstado,
        nuevoTipoDocumento,
      );
      setDetalleRows(rows);
      setModalResumen(resumen);
    } catch (error) {
      console.error("Error recargando detalle", error);
      setDetalleRows([]);
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
    await abrirModalConContexto(
      tipo,
      { kind: "mes", mes: periodo.mesLabel },
      tipo === "ingresos"
        ? `Movimientos de ingresos - ${periodo.mesLabel}`
        : `Facturas de compra - ${periodo.mesLabel}`,
      tipo === "ingresos"
        ? "Incluye facturas y notas crédito del mes."
        : "Detalle de compras y gastos del mes.",
    );
  };

  const handleClienteClick = async (nombre: string) => {
    await abrirModalConContexto(
      "ingresos",
      { kind: "cliente", nombre },
      `Movimientos de ingresos - ${nombre}`,
      "Facturas y notas crédito del cliente según filtros.",
    );
  };

  const handleProveedorClick = async (nombre: string) => {
    await abrirModalConContexto(
      "egresos",
      { kind: "proveedor", nombre },
      `Compras a proveedor - ${nombre}`,
      "Facturas de compra según filtros.",
    );
  };

  const ingresosNetos = toNum(kpis?.ingresos_netos ?? kpis?.ingresos);
  const facturasEmitidas = toNum(kpis?.facturas_emitidas);
  const notasCredito = toNum(kpis?.notas_credito);
  const egresos = toNum(kpis?.egresos);
  const nomina = toNum(kpis?.nomina);
  const utilidad = toNum(kpis?.utilidad);
  const margen = toNum(kpis?.margen);
  const facturasVenta = toNum(kpis?.facturas_venta);
  const notasCreditoCount = toNum(kpis?.notas_credito_count);
  const facturasCompra = toNum(kpis?.facturas_compra);

  const kpiCards = kpis
    ? [
        {
          label: "Ingresos netos",
          value: `$ ${abreviar(ingresosNetos)}`,
          fullValue: formatCurrency(ingresosNetos),
          helper: "Facturas emitidas menos notas crédito, con impuesto.",
          accent: "from-emerald-500/15 to-emerald-400/5",
          text: "text-emerald-700",
          chip: "bg-emerald-100 text-emerald-700",
        },
        {
          label: "Facturas emitidas",
          value: `$ ${abreviar(facturasEmitidas)}`,
          fullValue: formatCurrency(facturasEmitidas),
          helper: "Ventas facturadas antes de descontar notas crédito.",
          accent: "from-green-500/15 to-green-400/5",
          text: "text-green-700",
          chip: "bg-green-100 text-green-700",
        },
        {
          label: "Notas crédito",
          value: `$ ${abreviar(notasCredito)}`,
          fullValue: formatCurrency(notasCredito),
          helper: "Notas crédito del periodo descontadas de ingresos.",
          accent: "from-red-500/15 to-rose-400/5",
          text: "text-red-700",
          chip: "bg-red-100 text-red-700",
        },
        {
          label: "Egresos",
          value: `$ ${abreviar(egresos)}`,
          fullValue: formatCurrency(egresos),
          helper: "Compras y gastos, incluyendo nómina si aplica.",
          accent: "from-rose-500/15 to-red-400/5",
          text: "text-rose-700",
          chip: "bg-rose-100 text-rose-700",
        },
        ...(tieneNomina
          ? [
              {
                label: "Nómina",
                value: `$ ${abreviar(nomina)}`,
                fullValue: formatCurrency(nomina),
                helper: "Costos de nómina integrados al cálculo de egresos.",
                accent: "from-orange-500/15 to-amber-400/5",
                text: "text-orange-700",
                chip: "bg-orange-100 text-orange-700",
              },
            ]
          : []),
        {
          label: "Resultado operativo estimado",
          value: `$ ${abreviar(utilidad)}`,
          fullValue: formatCurrency(utilidad),
          helper:
            "Ingresos netos menos egresos operativos registrados. No reemplaza la utilidad contable del Estado de Resultados.",
          accent: "from-violet-500/15 to-purple-400/5",
          text: "text-violet-700",
          chip: "bg-violet-100 text-violet-700",
        },
        {
          label: "Margen operativo estimado",
          value: fmtPct(margen),
          fullValue: fmtPct(margen),
          helper:
            "Resultado operativo estimado sobre ingresos netos. Para margen contable, consulta el Estado de Resultados.",
          accent: "from-sky-500/15 to-indigo-400/5",
          text: "text-sky-700",
          chip: "bg-sky-100 text-sky-700",
        },
        {
          label: "Fact. venta",
          value: `${facturasVenta}`,
          fullValue: `${facturasVenta.toLocaleString("es-CO")} facturas de venta / ${notasCreditoCount.toLocaleString("es-CO")} notas crédito`,
          helper: `Notas crédito: ${notasCreditoCount}`,
          accent: "from-teal-500/15 to-teal-300/5",
          text: "text-teal-700",
          chip: "bg-teal-100 text-teal-700",
        },
        {
          label: "Fact. compra",
          value: `${facturasCompra}`,
          fullValue: `${facturasCompra.toLocaleString("es-CO")} documentos de compra/gasto`,
          helper: "Documentos de compra/gasto.",
          accent: "from-amber-500/15 to-yellow-400/5",
          text: "text-amber-700",
          chip: "bg-amber-100 text-amber-700",
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="space-y-4 p-3 md:p-4 lg:p-5">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.10),_transparent_30%),radial-gradient(circle_at_left,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(to_bottom_right,_rgba(255,255,255,1),_rgba(248,250,252,0.96))]" />
          <div className="relative flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:p-5">
            <div>
              <div className="mb-1 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Reporte financiero
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
                Consolidado Ingresos vs Egresos
              </h1>
              <p className="mt-1 max-w-4xl text-sm text-slate-600">
                Vista operativa basada en documentos reales: ingresos netos, egresos
                y resultado operativo estimado. La utilidad contable se consulta
                en el Estado de Resultados.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MiniMetric
                label="Estado"
                value={loading ? "Cargando" : err ? "Con error" : "Actualizado"}
                danger={!!err}
              />
              <MiniMetric label="Meses" value={evolucion.length} />
              <MiniMetric label="Clientes" value={topClientes.length} />
              <MiniMetric label="Proveedores" value={topProveedores.length} />
            </div>
          </div>
        </div>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fecha desde
                  </label>
                  <Input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fecha hasta
                  </label>
                  <Input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Centro de costos
                  </label>
                  <select
                    value={centroCostos}
                    onChange={(e) => setCentroCostos(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
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
              <button
                onClick={limpiarFiltros}
                className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </CardContent>
        </Card>

        {err && (
          <Card className="rounded-3xl border-red-200 bg-red-50 shadow-sm">
            <CardContent className="p-4 text-sm font-medium text-red-700">
              {err}
            </CardContent>
          </Card>
        )}

        {kpis && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
            {kpiCards.map((item, i) => (
              <button
                key={i}
                type="button"
                title={`${item.label}: ${item.fullValue}`}
                onClick={() => setSelectedKpi(item)}
                className={cx(
                  "group relative overflow-hidden rounded-3xl border border-slate-200 text-left shadow-sm outline-none transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md focus:ring-2 focus:ring-blue-500/30",
                  "bg-gradient-to-br",
                  item.accent,
                )}
              >
                <div className="absolute inset-0 bg-white/85 backdrop-blur-[1px]" />
                <div className="relative flex h-[86px] flex-col justify-between p-2.5">
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="line-clamp-2 text-[9.5px] font-semibold uppercase leading-tight tracking-wide text-slate-500">
                      {item.label}
                    </span>
                    <span
                      className={cx(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                        item.chip,
                      )}
                    >
                      ⓘ
                    </span>
                  </div>
                  <div>
                    <div
                      className={cx(
                        "truncate text-sm font-extrabold leading-tight xl:text-base",
                        item.text,
                      )}
                    >
                      {item.value}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-slate-500">
                      Toca para ver detalle
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-semibold leading-5 text-blue-800">
          Este consolidado muestra un resultado operativo estimado a partir de documentos
          de venta, compras, gastos y nómina registrados. No corresponde a la utilidad
          contable oficial; para esa lectura usa el Estado de Resultados construido desde
          auxiliares contables.
        </div>

        {selectedKpi && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
            onClick={() => setSelectedKpi(null)}
          >
            <div
              className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    KPI seleccionado
                  </div>
                  <h3 className="mt-1 text-lg font-extrabold text-slate-900">
                    {selectedKpi.label}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedKpi(null)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-100"
                >
                  ×
                </button>
              </div>
              <div className={cx("text-2xl font-black", selectedKpi.text)}>
                {selectedKpi.fullValue}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {selectedKpi.helper}
              </p>
              <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
                Periodo: {fechaDesde || "inicio"} — {fechaHasta || "hoy"}
                {centroCostos
                  ? ` · Centro de costos: ${centroCostos}`
                  : " · Todos los centros de costo"}
              </div>
            </div>
          </div>
        )}

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-base font-bold text-slate-900">
                Evolución mensual
              </CardTitle>
              <div className="text-xs text-slate-500">
                Clic en las barras para abrir detalle. Resultado operativo estimado =
                ingresos netos menos egresos operativos.
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            {evolucion.length === 0 ? (
              <div className="flex h-[315px] items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">
                Sin datos para los filtros seleccionados.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={345}>
                <ComposedChart
                  data={evolucion}
                  margin={{ top: 22, bottom: 28, left: 8, right: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="mes"
                    tickFormatter={(mes) => getMesLabel(mes)}
                    angle={-25}
                    textAnchor="end"
                    height={54}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={{ stroke: "#cbd5e1" }}
                  />
                  <YAxis
                    tickFormatter={(v: any) => abreviar(Number(v))}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={{ stroke: "#cbd5e1" }}
                  />
                  <Tooltip content={<MonthlyTooltip tieneNomina={tieneNomina} />} />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "4px" }}
                  />
                  <Bar
                    dataKey="ingresos"
                    name="Ingresos netos"
                    fill="#22c55e"
                    radius={[8, 8, 0, 0]}
                    onClick={(data) => handleBarClick("ingresos", data)}
                    cursor="pointer"
                  >
                    <LabelList
                      dataKey="ingresos"
                      position="top"
                      formatter={(v: any) => abreviar(Number(v))}
                      style={{ fontSize: 10, fill: "#166534", fontWeight: 700 }}
                    />
                  </Bar>
                  <Bar
                    dataKey="egresos"
                    name="Egresos"
                    fill="#ef4444"
                    radius={[8, 8, 0, 0]}
                    onClick={(data) => handleBarClick("egresos", data)}
                    cursor="pointer"
                  >
                    <LabelList
                      dataKey="egresos"
                      position="top"
                      formatter={(v: any) => abreviar(Number(v))}
                      style={{ fontSize: 10, fill: "#991b1b", fontWeight: 700 }}
                    />
                  </Bar>
                  <Line
                    type="monotone"
                    dataKey="utilidad"
                    name="Resultado operativo mensual"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  >
                    <LabelList
                      dataKey="utilidad"
                      position="bottom"
                      formatter={(v: any) => abreviar(Number(v))}
                      style={{ fontSize: 10, fill: "#1e3a8a", fontWeight: 700 }}
                    />
                  </Line>
                  <Line
                    type="monotone"
                    dataKey="utilidad_acumulada"
                    name="Resultado operativo acumulado"
                    stroke="#9333ea"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  >
                    <LabelList
                      dataKey="utilidad_acumulada"
                      position="top"
                      formatter={(v: any) => abreviar(Number(v))}
                      style={{ fontSize: 10, fill: "#6b21a8", fontWeight: 700 }}
                    />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className={`grid gap-4 ${tieneNomina ? "xl:grid-cols-3" : "xl:grid-cols-2"}`}>
          <TopBarCard
            title="Top 10 Clientes"
            subtitle="Ventas netas con impuesto: facturas menos notas crédito."
            data={topClientes}
            color="#22c55e"
            labelColor="#166534"
            onClick={handleClienteClick}
            tooltipKind="clientes"
          />
          {tieneNomina && (
            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-900">
                  Costos x Nómina
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Costos de nómina integrados al cálculo de egresos.
                </p>
              </CardHeader>
              <CardContent className="h-[310px] pt-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={evolucion}
                    layout="vertical"
                    margin={{ top: 8, bottom: 8, left: 0, right: 18 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => abreviar(Number(v))}
                    />
                    <YAxis
                      type="category"
                      dataKey="mes"
                      tickFormatter={(mes) => getMesLabel(mes)}
                      width={95}
                      tick={{ fontSize: 11, fill: "#334155" }}
                      axisLine={{ stroke: "#cbd5e1" }}
                      tickLine={{ stroke: "#cbd5e1" }}
                    />
                    <Tooltip formatter={(v: any) => formatCurrency(v)} />
                    <Bar dataKey="nomina" fill="#f97316" radius={[0, 8, 8, 0]}>
                      <LabelList
                        dataKey="nomina"
                        position="right"
                        formatter={(v: any) => abreviar(Number(v))}
                        style={{ fontSize: 10, fill: "#9a3412", fontWeight: 700 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          <TopBarCard
            title="Top 10 Proveedores"
            subtitle="Compras y gastos por proveedor."
            data={topProveedores}
            color="#ef4444"
            labelColor="#991b1b"
            onClick={handleProveedorClick}
            tooltipKind="proveedores"
          />
        </div>

        <DetalleModal
          open={modalOpen}
          mode={modalMode}
          title={modalTitle}
          subtitle={modalSubtitle}
          rows={detalleRows}
          resumen={modalResumen}
          loading={modalLoading}
          onClose={cerrarModal}
          modalContext={modalContext}
          proveedorDatos={proveedorDatos}
          estado={modalEstado}
          tipoDocumento={modalTipoDocumento}
          sortBy={modalSortBy}
          onEstadoChange={(st) => recargarModal(st, modalTipoDocumento)}
          onTipoDocumentoChange={(tipo) => recargarModal(modalEstado, tipo)}
          onSortByChange={setModalSortBy}
        />
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: any;
  danger?: boolean;
}) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-white/60 bg-white/80 px-3 py-2 shadow-sm backdrop-blur",
        danger && "border-red-200 bg-red-50",
      )}
    >
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div
        className={cx(
          "text-lg font-bold",
          danger ? "text-red-700" : "text-slate-900",
        )}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}

function MonthlyTooltip({ active, payload, tieneNomina }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload || {};
  return (
    <div className="min-w-[270px] rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
      <div className="mb-2 text-sm font-bold text-slate-800">
        {getMesTooltip(String(row.mes))}
      </div>
      <div className="space-y-1.5 text-sm">
        <TooltipLine
          label="Facturas emitidas"
          value={formatCurrency(row.facturas_emitidas)}
          className="text-emerald-700"
        />
        <TooltipLine
          label="Notas crédito"
          value={formatCurrency(row.notas_credito)}
          className="text-red-700"
        />
        <TooltipLine
          label="Ingresos netos"
          value={formatCurrency(row.ingresos)}
          className="text-green-700"
          strong
        />
        <TooltipLine
          label="Ingresos sin impuesto"
          value={formatCurrency(row.ingresos_sin_impuesto)}
          className="text-teal-700"
        />
        <TooltipLine
          label="Impuestos netos"
          value={formatCurrency(row.impuestos_netos)}
          className="text-yellow-700"
        />
        <div className="my-2 border-t border-slate-100" />
        <TooltipLine
          label="Egresos"
          value={formatCurrency(row.egresos)}
          className="text-rose-700"
        />
        {tieneNomina && (
          <TooltipLine
            label="Nómina"
            value={formatCurrency(row.nomina)}
            className="text-orange-700"
          />
        )}
        <TooltipLine
          label="Resultado operativo mensual"
          value={formatCurrency(row.utilidad)}
          className={
            toNum(row.utilidad) >= 0 ? "text-blue-700" : "text-red-700"
          }
          strong
        />
        <TooltipLine
          label="Resultado operativo acumulado"
          value={formatCurrency(row.utilidad_acumulada)}
          className={
            toNum(row.utilidad_acumulada) >= 0
              ? "text-violet-700"
              : "text-red-700"
          }
        />
      </div>
    </div>
  );
}

function TooltipLine({
  label,
  value,
  className,
  strong = false,
}: {
  label: string;
  value: string;
  className?: string;
  strong?: boolean;
}) {
  return (
    <div className={cx("flex items-center justify-between gap-4", className)}>
      <span className="font-medium">{label}</span>
      <span
        className={cx("text-right", strong ? "font-extrabold" : "font-bold")}
      >
        {value}
      </span>
    </div>
  );
}

function TopBarCard({
  title,
  subtitle,
  data,
  color,
  labelColor,
  onClick,
  tooltipKind,
}: {
  title: string;
  subtitle: string;
  data: TopItem[];
  color: string;
  labelColor: string;
  onClick: (nombre: string) => void;
  tooltipKind: "clientes" | "proveedores";
}) {
  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-slate-900">
          {title}
        </CardTitle>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </CardHeader>
      <CardContent className="h-[310px] pt-0">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">
            Sin datos.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 8, bottom: 8, left: 0, right: 24 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                type="number"
                tickFormatter={(v) => abreviar(Number(v))}
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={{ stroke: "#cbd5e1" }}
              />
              <YAxis
                type="category"
                dataKey="nombre"
                width={175}
                tick={{ fontSize: 11, fill: "#334155" }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={{ stroke: "#cbd5e1" }}
              />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const row = payload[0].payload || {};
                  return (
                    <div className="min-w-[230px] rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl">
                      <div className="mb-2 text-sm font-bold text-slate-800">
                        {row.nombre}
                      </div>
                      {tooltipKind === "clientes" ? (
                        <div className="space-y-1.5 text-sm">
                          <TooltipLine
                            label="Facturas emitidas"
                            value={formatCurrency(row.facturas_emitidas)}
                            className="text-emerald-700"
                          />
                          <TooltipLine
                            label="Notas crédito"
                            value={formatCurrency(row.notas_credito)}
                            className="text-red-700"
                          />
                          <TooltipLine
                            label="Venta neta"
                            value={formatCurrency(row.total)}
                            className="text-green-700"
                            strong
                          />
                        </div>
                      ) : (
                        <div className="space-y-1.5 text-sm">
                          <TooltipLine
                            label="Total compras"
                            value={formatCurrency(row.total)}
                            className="text-rose-700"
                            strong
                          />
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
                <LabelList
                  dataKey="total"
                  position="right"
                  formatter={(v: any) => abreviar(Number(v))}
                  style={{ fontSize: 10, fill: labelColor, fontWeight: 700 }}
                />
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
  modalContext,
  proveedorDatos,
  estado,
  tipoDocumento,
  sortBy,
  onEstadoChange,
  onTipoDocumentoChange,
  onSortByChange,
}: {
  open: boolean;
  mode: ModalMode;
  title: string;
  subtitle?: string;
  rows: any[];
  resumen?: any;
  loading?: boolean;
  onClose: () => void;
  modalContext: ModalContext | null;
  proveedorDatos: "siigo" | "alegra";
  estado: EstadoModal;
  tipoDocumento: TipoDocumentoModal;
  sortBy: ModalSortBy;
  onEstadoChange: (st: EstadoModal) => void;
  onTipoDocumentoChange: (tipo: TipoDocumentoModal) => void;
  onSortByChange: (sort: ModalSortBy) => void;
}) {
  const isIngresos = mode === "ingresos";

  const rowsOrdenadas = useMemo(() => {
    const arr = [...rows];
    const nombreDe = (r: any) =>
      String((isIngresos ? r.cliente_nombre : r.proveedor_nombre) || "");

    arr.sort((a, b) => {
      if (sortBy === "fecha_asc") {
        return String(a.fecha || "").localeCompare(String(b.fecha || ""));
      }
      if (sortBy === "fecha_desc") {
        return String(b.fecha || "").localeCompare(String(a.fecha || ""));
      }
      if (sortBy === "nombre_asc") {
        return nombreDe(a).localeCompare(nombreDe(b));
      }
      return nombreDe(b).localeCompare(nombreDe(a));
    });

    return arr;
  }, [rows, sortBy, isIngresos]);

  const resumenEgresos = useMemo(() => {
    if (isIngresos) return null;
    const cantidad = rows.length;
    const total = rows.reduce((acc, r) => acc + toNum(r.total), 0);
    const pagado = rows.reduce((acc, r) => {
      const p = Number.isFinite(Number(r.pagado_calc))
        ? toNum(r.pagado_calc)
        : toNum(r.total) - toNum(r.saldo);
      return acc + p;
    }, 0);
    const saldo = rows.reduce((acc, r) => acc + toNum(r.saldo), 0);
    return { cantidad, total, pagado, saldo };
  }, [rows, isIngresos]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm">
      <div
        className="relative flex w-full max-w-7xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl"
        style={{
          width: "min(96vw, 1400px)",
          height: "min(90vh, 860px)",
          minWidth: "430px",
          minHeight: "360px",
          maxWidth: "98vw",
          maxHeight: "94vh",
          resize: "both",
          overflow: "auto",
        }}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 rounded-t-3xl border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {subtitle ||
                "Detalle transaccional según los filtros seleccionados."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Cerrar
          </button>
        </div>
        {isIngresos && (
          <div className="grid shrink-0 gap-3 border-b border-slate-100 bg-white px-5 py-3 sm:grid-cols-2 lg:grid-cols-5">
            <ModalMetric
              label="Facturas emitidas"
              value={formatCurrency(resumen?.facturas_emitidas)}
              tone="emerald"
            />
            <ModalMetric
              label="Notas crédito"
              value={formatCurrency(resumen?.notas_credito)}
              tone="red"
            />
            <ModalMetric
              label="Ingresos netos"
              value={formatCurrency(resumen?.ventas_netas)}
              tone="green"
            />
            <ModalMetric
              label="Facturas"
              value={
                resumen?.total_facturas ??
                rows.filter((r) => r.tipo_movimiento === "FACTURA").length
              }
              tone="slate"
            />
            <ModalMetric
              label="Notas crédito"
              value={
                resumen?.total_notas_credito ??
                rows.filter((r) => r.tipo_movimiento === "NOTA_CREDITO").length
              }
              tone="slate"
            />
          </div>
        )}
        {!isIngresos && resumenEgresos && (
          <div className="grid shrink-0 gap-3 border-b border-slate-100 bg-white px-5 py-3 sm:grid-cols-4">
            <ModalMetric label="Cantidad" value={resumenEgresos.cantidad} tone="slate" />
            <ModalMetric label="Total" value={formatCurrency(resumenEgresos.total)} tone="slate" />
            <ModalMetric label="Pagado" value={formatCurrency(resumenEgresos.pagado)} tone="green" />
            <ModalMetric label="Saldo" value={formatCurrency(resumenEgresos.saldo)} tone="red" />
          </div>
        )}

        <div className="flex-1 overflow-auto p-4">
          {modalContext && (
            <div className="mb-4 space-y-3">
              {!isIngresos &&
                modalContext.kind === "mes" &&
                proveedorDatos === "siigo" && (
                  <div>
                    <div className="mb-1 text-xs font-semibold text-slate-500">
                      Tipo de documento
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(
                        ["todos", "factura", "documento_soporte"] as const
                      ).map((tipo) => (
                        <button
                          key={tipo}
                          onClick={() => onTipoDocumentoChange(tipo)}
                          className={cx(
                            "rounded-full border px-3 py-1 text-sm transition",
                            tipoDocumento === tipo
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "bg-white hover:bg-gray-100",
                          )}
                        >
                          {labelTipoDocumento(tipo)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              <div>
                <div className="mb-1 text-xs font-semibold text-slate-500">
                  Estado
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["total", "pagado", "pendiente", "parcial"] as const).map(
                    (st) => (
                      <button
                        key={st}
                        onClick={() => onEstadoChange(st)}
                        className={cx(
                          "rounded-full border px-3 py-1 text-sm transition",
                          estado === st
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "bg-white hover:bg-gray-100",
                        )}
                      >
                        {labelEstadoModal(st)}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mb-3 flex justify-end">
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as ModalSortBy)}
              className="rounded-lg border bg-white px-3 py-2 text-sm"
            >
              <option value="fecha_desc">Fecha: más reciente primero</option>
              <option value="fecha_asc">Fecha: más antigua primero</option>
              <option value="nombre_asc">
                {isIngresos ? "Cliente: A-Z" : "Proveedor: A-Z"}
              </option>
              <option value="nombre_desc">
                {isIngresos ? "Cliente: Z-A" : "Proveedor: Z-A"}
              </option>
            </select>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-500">
              Cargando detalle…
            </div>
          ) : (
            <div className="overflow-auto rounded-2xl border border-slate-200">
              {isIngresos ? (
                <IngresosTable rows={rowsOrdenadas} />
              ) : (
                <EgresosTable rows={rowsOrdenadas} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalMetric({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: any;
  tone?: "slate" | "emerald" | "green" | "red";
}) {
  const map = {
    slate: "bg-slate-50 text-slate-800 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-100",
    green: "bg-green-50 text-green-800 border-green-100",
    red: "bg-red-50 text-red-800 border-red-100",
  };
  return (
    <div className={cx("rounded-2xl border px-3 py-2", map[tone])}>
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
        {label}
      </div>
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
          <th className="border-b border-slate-200 px-3 py-3">
            Centro de costo
          </th>
          <th className="border-b border-slate-200 px-3 py-3">Estado</th>
          <th className="border-b border-slate-200 px-3 py-3 text-right">
            Subtotal
          </th>
          <th className="border-b border-slate-200 px-3 py-3 text-right">
            Impuestos
          </th>
          <th className="border-b border-slate-200 px-3 py-3 text-right">
            Total
          </th>
          <th className="border-b border-slate-200 px-3 py-3 text-right">
            Pagado
          </th>
          <th className="border-b border-slate-200 px-3 py-3 text-right">
            Pendiente
          </th>
          <th className="border-b border-slate-200 px-3 py-3">Link</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={14}
              className="px-4 py-8 text-center text-sm text-slate-500"
            >
              No hay movimientos encontrados.
            </td>
          </tr>
        ) : (
          rows.map((f, i) => {
            const isNC = f.tipo_movimiento === "NOTA_CREDITO";
            const subtotal = toNum(f.subtotal);
            const impuestos = toNum(f.impuestos_total ?? f.impuestos);
            const total = toNum(f.total);
            const pagado = toNum(f.valor_pagado ?? f.pagado);
            const pendiente = toNum(f.valor_pendiente ?? f.saldo);
            const estadoPago = f.estado_pago_calc as
              | "pagada"
              | "pendiente"
              | "parcial"
              | "no_aplica"
              | undefined;
            return (
              <tr
                key={`${f.tipo_movimiento}-${f.documento || f.idfactura}-${i}`}
                className={cx(
                  "transition hover:bg-slate-50",
                  isNC && "bg-red-50/40",
                )}
              >
                <td className="border-b border-slate-100 px-3 py-3">
                  <span
                    className={cx(
                      "rounded-full px-2.5 py-1 text-xs font-bold",
                      isNC
                        ? "bg-red-100 text-red-700"
                        : "bg-emerald-100 text-emerald-700",
                    )}
                  >
                    {isNC ? "Nota crédito" : "Factura"}
                  </span>
                </td>
                <td className="border-b border-slate-100 px-3 py-3 font-medium text-slate-800">
                  {f.documento || f.idfactura}
                </td>
                <td className="border-b border-slate-100 px-3 py-3 text-slate-600">
                  {f.documento_afectado || "—"}
                </td>
                <td className="border-b border-slate-100 px-3 py-3 text-slate-700">
                  {f.cliente_nombre || "—"}
                </td>
                <td className="border-b border-slate-100 px-3 py-3 text-slate-700">
                  {formatDateSafe(f.fecha)}
                </td>
                <td className="border-b border-slate-100 px-3 py-3 text-slate-700">
                  {formatDateSafe(f.vencimiento)}
                </td>
                <td className="border-b border-slate-100 px-3 py-3 text-slate-700">
                  {f.centro_costo_nombre || "—"}
                </td>
                <td
                  className={cx(
                    "border-b border-slate-100 px-3 py-3 font-semibold",
                    estadoPago === "pendiente"
                      ? "text-red-600"
                      : estadoPago === "parcial"
                        ? "text-orange-600"
                        : "text-slate-600",
                  )}
                >
                  {estadoPago === "pagada"
                    ? "Pagada"
                    : estadoPago === "pendiente"
                      ? "Pendiente"
                      : estadoPago === "parcial"
                        ? "Parcial"
                        : "—"}
                </td>
                <td
                  className={cx(
                    "border-b border-slate-100 px-3 py-3 text-right font-medium",
                    subtotal < 0 ? "text-red-700" : "text-slate-700",
                  )}
                >
                  {formatCurrency(subtotal)}
                </td>
                <td
                  className={cx(
                    "border-b border-slate-100 px-3 py-3 text-right",
                    impuestos < 0 ? "text-red-700" : "text-slate-700",
                  )}
                >
                  {formatCurrency(impuestos)}
                </td>
                <td
                  className={cx(
                    "border-b border-slate-100 px-3 py-3 text-right font-semibold",
                    total < 0 ? "text-red-700" : "text-slate-800",
                  )}
                >
                  {formatCurrency(total)}
                </td>
                <td className="border-b border-slate-100 px-3 py-3 text-right text-slate-700">
                  {formatCurrency(pagado)}
                </td>
                <td className="border-b border-slate-100 px-3 py-3 text-right text-slate-700">
                  {formatCurrency(pendiente)}
                </td>
                <td className="border-b border-slate-100 px-3 py-3">
                  {f.public_url ? (
                    <a
                      href={f.public_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      Ver
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
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
    <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-sm">
      <thead className="sticky top-0 z-10 bg-slate-100">
        <tr className="text-left text-slate-700">
          <th className="border-b border-slate-200 px-3 py-3">Proveedor</th>
          <th className="border-b border-slate-200 px-3 py-3">Documento</th>
          <th className="border-b border-slate-200 px-3 py-3">
            Factura proveedor
          </th>
          <th className="border-b border-slate-200 px-3 py-3">Fecha</th>
          <th className="border-b border-slate-200 px-3 py-3">Vencimiento</th>
          <th className="border-b border-slate-200 px-3 py-3">Estado</th>
          <th className="border-b border-slate-200 px-3 py-3">
            Centro de costo
          </th>
          <th className="border-b border-slate-200 px-3 py-3 text-right">
            Total
          </th>
          <th className="border-b border-slate-200 px-3 py-3 text-right">
            Pagado
          </th>
          <th className="border-b border-slate-200 px-3 py-3 text-right">
            Saldo
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={10}
              className="px-4 py-8 text-center text-sm text-slate-500"
            >
              No hay compras encontradas.
            </td>
          </tr>
        ) : (
          rows.map((c, i) => {
            const estado = (c.estado_calc || "pendiente") as
              | "pagado"
              | "pendiente"
              | "parcial";
            const esPendiente = estado === "pendiente";
            const esParcial = estado === "parcial";
            const esAnomalia = !!c.anomalia_saldo_mayor_total;
            const pagadoCalc = Number.isFinite(Number(c.pagado_calc))
              ? toNum(c.pagado_calc)
              : toNum(c.total) - toNum(c.saldo);

            return (
              <tr
                key={`${c.factura || c.idcompra || c.id}-${i}`}
                className={cx(
                  "transition hover:bg-slate-50",
                  esPendiente
                    ? "text-red-600"
                    : esParcial
                      ? "text-orange-600"
                      : "text-slate-700",
                  esAnomalia && "font-semibold",
                )}
              >
                <td className="border-b border-slate-100 px-3 py-3">
                  {c.proveedor_nombre || "Sin proveedor"}
                </td>
                <td className="border-b border-slate-100 px-3 py-3 font-medium">
                  {c.factura || c.idcompra || c.id || "—"}
                </td>
                <td className="border-b border-slate-100 px-3 py-3">
                  {c.factura_proveedor || "—"}
                </td>
                <td className="border-b border-slate-100 px-3 py-3">
                  {formatDateSafe(c.fecha)}
                </td>
                <td className="border-b border-slate-100 px-3 py-3">
                  {formatDateSafe(c.vencimiento)}
                </td>
                <td className="border-b border-slate-100 px-3 py-3">
                  {estado === "pagado"
                    ? "Pagada"
                    : estado === "parcial"
                      ? "Parcial"
                      : "Pendiente"}
                  {esAnomalia ? " ⚠️" : ""}
                </td>
                <td className="border-b border-slate-100 px-3 py-3">
                  {c.centro_costo_nombre || "—"}
                </td>
                <td className="border-b border-slate-100 px-3 py-3 text-right font-semibold">
                  {formatCurrency(c.total)}
                </td>
                <td className="border-b border-slate-100 px-3 py-3 text-right">
                  {formatCurrency(pagadoCalc)}
                </td>
                <td className="border-b border-slate-100 px-3 py-3 text-right">
                  {formatCurrency(c.saldo)}
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
