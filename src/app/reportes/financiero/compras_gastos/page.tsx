// Archivo: src/app/reportes/financiero/compras_gastos/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api";
import { getDefaultYearToDateRange } from "@/lib/dateDefaults";
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
  factura_proveedor?: string | null;
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

const KPIS_EMPTY: KPIs = {
  total_compras: 0,
  total_pagado: 0,
  total_saldo: 0,
  total_facturas: 0,
  facturas_pagadas: 0,
  facturas_pendientes: 0,
  facturas_parciales: 0,
  saldo_parcial: 0,
  compras_x_factura: 0,
  valor_compras_x_factura: 0,
  compras_x_cta_cobro: 0,
  valor_compras_x_cta_cobro: 0,
};

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeArray<T = any>(raw: any): T[] {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.results)) return raw.results;
  return [];
}

function normalizeKpis(raw: any): KPIs {
  return {
    total_compras: safeNumber(raw?.total_compras),
    total_pagado: safeNumber(raw?.total_pagado),
    total_saldo: safeNumber(raw?.total_saldo),
    total_facturas: safeNumber(raw?.total_facturas),
    facturas_pagadas: safeNumber(raw?.facturas_pagadas),
    facturas_pendientes: safeNumber(raw?.facturas_pendientes),
    facturas_parciales: safeNumber(raw?.facturas_parciales),
    saldo_parcial: safeNumber(raw?.saldo_parcial),
    compras_x_factura: safeNumber(raw?.compras_x_factura),
    valor_compras_x_factura: safeNumber(raw?.valor_compras_x_factura),
    compras_x_cta_cobro: safeNumber(raw?.compras_x_cta_cobro),
    valor_compras_x_cta_cobro: safeNumber(raw?.valor_compras_x_cta_cobro),
  };
}

function nombreProveedorSafe(value: unknown): string {
  const text = String(value || "").trim();
  return text || "Sin proveedor";
}

function formatCurrency(valor: number): string {
  return `$ ${Math.round(Number(valor || 0)).toLocaleString("es-CO")}`;
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

function formatCurrencyCompact(valor: number): string {
  return `$ ${abreviar(valor)}`;
}

type KpiTone = "blue" | "green" | "red" | "orange" | "indigo" | "purple";

interface KpiInfo {
  id: string;
  label: string;
  value: string;
  fullValue: string;
  tone: KpiTone;
  description: string;
}

function KpiCard({
  item,
  onSelect,
}: {
  item: KpiInfo;
  onSelect: (item: KpiInfo) => void;
}) {
  const toneClasses: Record<string, { box: string; value: string }> = {
    blue: { box: "bg-blue-50 border-blue-200", value: "text-blue-700" },
    green: { box: "bg-green-50 border-green-200", value: "text-green-700" },
    red: { box: "bg-red-50 border-red-200", value: "text-red-700" },
    orange: { box: "bg-orange-50 border-orange-200", value: "text-orange-700" },
    indigo: { box: "bg-indigo-50 border-indigo-200", value: "text-indigo-700" },
    purple: { box: "bg-purple-50 border-purple-200", value: "text-purple-700" },
  };

  const toneClass = toneClasses[item.tone] || toneClasses.blue;

  return (
    <button
      type="button"
      title={item.fullValue}
      onClick={() => onSelect(item)}
      className={`group min-w-0 rounded-xl border px-1.5 py-1.5 text-left shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] ${toneClass.box}`}
      style={{ minHeight: 62 }}
    >
      <div className="relative flex h-full min-h-[50px] flex-col items-center justify-center text-center">
        <span className="absolute right-0.5 top-0 text-[10px] font-black text-slate-400 group-hover:text-slate-700">
          ⓘ
        </span>
        <div className="w-full truncate pr-3 text-[9px] font-extrabold uppercase leading-tight tracking-tight text-slate-800">
          {item.label}
        </div>
        <div className={`mt-1 w-full truncate text-[15px] font-black leading-tight tracking-tight ${toneClass.value}`}>
          {item.value}
        </div>
      </div>
    </button>
  );
}

function toYYYYMM(dateLike: string | Date): string {
  try {
    const d = new Date(dateLike);

    if (Number.isNaN(d.getTime())) {
      return String(dateLike || "").slice(0, 7);
    }

    return format(d, "yyyy-MM");
  } catch {
    return String(dateLike || "").slice(0, 7);
  }
}

function formatMesYYYYMM(mesYYYYMM: string): string {
  try {
    const [y, m] = String(mesYYYYMM || "").split("-").map(Number);

    if (!y || !m) return "Periodo no disponible";

    const d = new Date(Date.UTC(y, m - 1, 1, 12));
    return formatInTimeZone(d, "UTC", "MMM yyyy");
  } catch {
    return "Periodo no disponible";
  }
}

function formatDateSafe(value?: string | null): string {
  if (!value) return "—";

  const raw = String(value).slice(0, 10);
  const [y, m, d] = raw.split("-");

  if (!y || !m || !d) return "—";

  return `${d}-${m}-${y}`;
}

function formatMesGrafica(value: string): string {
  try {
    const d = new Date(value);

    if (Number.isNaN(d.getTime())) return "—";

    return format(d, "MMM yyyy");
  } catch {
    return "—";
  }
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

function EmptyState({
  title,
  description,
  height = "h-[300px]",
}: {
  title: string;
  description: string;
  height?: string;
}) {
  return (
    <div
      className={`${height} rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-center px-4`}
    >
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      <div className="text-xs text-slate-500 mt-1 max-w-xl">{description}</div>
    </div>
  );
}

export default function ReporteFinancieroComprasGastosPage() {
  const [evolucion, setEvolucion] = useState<EvolucionMes[]>([]);
  const [kpis, setKpis] = useState<KPIs>(KPIS_EMPTY);

  const [defaultDates] = useState(() => getDefaultYearToDateRange());

  const [fechaDesde, setFechaDesde] = useState<string>(defaultDates.desde);
  const [fechaHasta, setFechaHasta] = useState<string>(defaultDates.hasta);
  const [centroCostos, setCentroCostos] = useState<string>("");

  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

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

  const [selectedKpi, setSelectedKpi] = useState<KpiInfo | null>(null);

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
        setCentros(normalizeArray<CentroCosto>(data));
      } catch (e) {
        console.error("Error cargando centros de costo reales", e);
        setCentros([]);
      }
    };

    fetchCentros();
  }, [queryParams]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setErrorMsg("");

      try {
        const data = await authFetch(`/reportes/financiero/compras-gastos${queryParams}`);

        setKpis(normalizeKpis(data?.kpis));
        setEvolucion(normalizeArray<EvolucionMes>(data?.evolucion));

        const topVal = await authFetch(
          `/reportes/financiero/compras-gastos/top-proveedores${queryParams}`
        );
        setTopValor(normalizeArray<TopProveedorValor>(topVal));

        const topFac = await authFetch(
          `/reportes/financiero/compras-gastos/top-proveedores-facturas${queryParams}`
        );
        setTopFacturas(normalizeArray<TopProveedorCount>(topFac));
      } catch (e) {
        console.error("Error al cargar el reporte financiero", e);

        setKpis(KPIS_EMPTY);
        setEvolucion([]);
        setTopValor([]);
        setTopFacturas([]);

        setErrorMsg(
          "No fue posible cargar información de compras y gastos. Si el cliente es nuevo, primero debes sincronizar las compras."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [queryParams]);

  const evolucionSegura = useMemo(() => {
    return normalizeArray<EvolucionMes>(evolucion)
      .map((item) => {
        const d = new Date(item?.mes);

        if (Number.isNaN(d.getTime())) {
          return null;
        }

        d.setUTCHours(12);

        return {
          mes: d.toISOString(),
          total_compras: safeNumber(item?.total_compras),
          total_pagadas: safeNumber(item?.total_pagadas),
          total_pendientes: safeNumber(item?.total_pendientes),
        };
      })
      .filter(Boolean) as EvolucionMes[];
  }, [evolucion]);

  const topValorData = useMemo(
    () =>
      normalizeArray<TopProveedorValor>(topValor).map((t) => ({
        proveedor: nombreProveedorSafe(t?.proveedor_nombre),
        valor: safeNumber(t?.total_compras),
      })),
    [topValor]
  );

  const topFacturasData = useMemo(
    () =>
      normalizeArray<TopProveedorCount>(topFacturas).map((t) => ({
        proveedor: nombreProveedorSafe(t?.proveedor_nombre),
        facturas: safeNumber(t?.num_facturas),
      })),
    [topFacturas]
  );

  const hayData =
    evolucionSegura.length > 0 ||
    topValorData.length > 0 ||
    topFacturasData.length > 0 ||
    safeNumber(kpis.total_compras) > 0 ||
    safeNumber(kpis.total_facturas) > 0;

  const periodoTexto = useMemo(() => {
    if (fechaDesde && fechaHasta) return `${formatDateSafe(fechaDesde)} a ${formatDateSafe(fechaHasta)}`;
    if (fechaDesde) return `Desde ${formatDateSafe(fechaDesde)}`;
    if (fechaHasta) return `Hasta ${formatDateSafe(fechaHasta)}`;
    return "Periodo completo según la información cargada";
  }, [fechaDesde, fechaHasta]);

  const kpiItems = useMemo<KpiInfo[]>(
    () => [
      {
        id: "total_compras",
        label: "Compras",
        value: formatCurrencyCompact(kpis.total_compras),
        fullValue: formatCurrency(kpis.total_compras),
        tone: "blue",
        description: "Valor total de compras y gastos del periodo filtrado.",
      },
      {
        id: "total_facturas",
        label: "# Compras",
        value: safeNumber(kpis.total_facturas).toLocaleString("es-CO"),
        fullValue: `${safeNumber(kpis.total_facturas).toLocaleString("es-CO")} documentos`,
        tone: "blue",
        description: "Cantidad total de documentos de compra encontrados en el periodo.",
      },
      {
        id: "total_pagado",
        label: "Pagado",
        value: formatCurrencyCompact(kpis.total_pagado),
        fullValue: formatCurrency(kpis.total_pagado),
        tone: "green",
        description: "Valor calculado como pagado dentro del total de compras y gastos.",
      },
      {
        id: "facturas_pagadas",
        label: "# Pagadas",
        value: safeNumber(kpis.facturas_pagadas).toLocaleString("es-CO"),
        fullValue: `${safeNumber(kpis.facturas_pagadas).toLocaleString("es-CO")} documentos`,
        tone: "green",
        description: "Cantidad de documentos que aparecen como pagados.",
      },
      {
        id: "total_saldo",
        label: "Pendiente",
        value: formatCurrencyCompact(kpis.total_saldo),
        fullValue: formatCurrency(kpis.total_saldo),
        tone: "red",
        description: "Saldo pendiente por pagar en el periodo filtrado.",
      },
      {
        id: "facturas_pendientes",
        label: "# Pend.",
        value: safeNumber(kpis.facturas_pendientes).toLocaleString("es-CO"),
        fullValue: `${safeNumber(kpis.facturas_pendientes).toLocaleString("es-CO")} documentos`,
        tone: "red",
        description: "Cantidad de documentos que todavía tienen saldo pendiente.",
      },
      {
        id: "saldo_parcial",
        label: "Saldo Parc.",
        value: formatCurrencyCompact(kpis.saldo_parcial),
        fullValue: formatCurrency(kpis.saldo_parcial),
        tone: "orange",
        description: "Saldo de documentos con pago parcial.",
      },
      {
        id: "facturas_parciales",
        label: "# Parc.",
        value: safeNumber(kpis.facturas_parciales).toLocaleString("es-CO"),
        fullValue: `${safeNumber(kpis.facturas_parciales).toLocaleString("es-CO")} documentos`,
        tone: "orange",
        description: "Cantidad de documentos con estado parcial.",
      },
      {
        id: "valor_compras_x_factura",
        label: "Val. Fact.",
        value: formatCurrencyCompact(kpis.valor_compras_x_factura),
        fullValue: formatCurrency(kpis.valor_compras_x_factura),
        tone: "indigo",
        description: "Valor total correspondiente a facturas de compra.",
      },
      {
        id: "compras_x_factura",
        label: "# Fact.",
        value: safeNumber(kpis.compras_x_factura).toLocaleString("es-CO"),
        fullValue: `${safeNumber(kpis.compras_x_factura).toLocaleString("es-CO")} facturas`,
        tone: "indigo",
        description: "Cantidad de facturas de compra registradas.",
      },
      {
        id: "valor_compras_x_cta_cobro",
        label: "Val. Ctas.",
        value: formatCurrencyCompact(kpis.valor_compras_x_cta_cobro),
        fullValue: formatCurrency(kpis.valor_compras_x_cta_cobro),
        tone: "purple",
        description: "Valor total correspondiente a cuentas de cobro o documentos soporte.",
      },
      {
        id: "compras_x_cta_cobro",
        label: "# Ctas.",
        value: safeNumber(kpis.compras_x_cta_cobro).toLocaleString("es-CO"),
        fullValue: `${safeNumber(kpis.compras_x_cta_cobro).toLocaleString("es-CO")} documentos`,
        tone: "purple",
        description: "Cantidad de cuentas de cobro o documentos soporte registrados.",
      },
    ],
    [kpis]
  );

  const modalResumen = useMemo(() => {
    const cantidad = modalRows.length;
    const total = modalRows.reduce((acc, r) => acc + safeNumber(r.total), 0);

    const pagado = modalRows.reduce((acc, r) => {
      const pagadoCalc = Number.isFinite(Number(r.pagado_calc))
        ? safeNumber(r.pagado_calc)
        : safeNumber(r.total) - safeNumber(r.saldo);

      return acc + pagadoCalc;
    }, 0);

    const saldo = modalRows.reduce((acc, r) => acc + safeNumber(r.saldo), 0);

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

    const data = await authFetch(url);
    return normalizeArray<FacturaDetalle>(data);
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

      if (!mesYYYYMM || mesYYYYMM.length < 7) {
        return;
      }

      const tipoDocumento: TipoDocumentoModal = "todos";

      setModalMes(mesYYYYMM);
      setModalEstado(estado);
      setModalTipoDocumento(tipoDocumento);
      setModalSortBy("fecha_desc");

      const rows = await cargarDetalleMes(mesYYYYMM, estado, tipoDocumento);

      setModalTitle(
        `Facturas ${labelEstadoModal(estado)} • ${labelTipoDocumento(
          tipoDocumento
        )} • ${formatMesYYYYMM(mesYYYYMM)}`
      );

      setModalRows(rows);
      setModalOpen(true);
    } catch (e) {
      console.error("Error abriendo modal de facturas", e);
      setModalRows([]);
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

      const rows = await cargarDetalleMes(modalMes, nuevoEstado, nuevoTipoDocumento);

      setModalTitle(
        `Facturas ${labelEstadoModal(nuevoEstado)} • ${labelTipoDocumento(
          nuevoTipoDocumento
        )} • ${formatMesYYYYMM(modalMes)}`
      );

      setModalRows(rows);
    } catch (e) {
      console.error("Error recargando modal", e);
      setModalRows([]);
    } finally {
      setModalLoading(false);
    }
  }

  async function handleProveedorClick(proveedor: string) {
    try {
      if (!proveedor) return;

      setModalLoading(true);

      const url = `/reportes/financiero/compras-gastos/detalle-proveedor${
        queryParams ? queryParams + "&" : "?"
      }proveedor=${encodeURIComponent(proveedor)}&tipo_documento=todos`;

      const data = await authFetch(url);
      const rows = normalizeArray<FacturaDetalle>(data);

      setModalTitle(`Facturas de ${proveedor}`);
      setModalRows(rows);
      setModalMes("");
      setModalEstado("total");
      setModalTipoDocumento("todos");
      setModalSortBy("fecha_desc");
      setModalOpen(true);
    } catch (e) {
      console.error("Error cargando facturas de proveedor", e);
      setModalRows([]);
    } finally {
      setModalLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1366px] space-y-3 px-2 py-2 text-[13px] lg:px-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black tracking-tight text-slate-900 lg:text-2xl">
            📊 Reporte Egresos por Compras & Gastos
          </h1>

        </div>

        <div className="grid w-full gap-2 lg:w-[650px] lg:grid-cols-3">
        <div className="flex flex-col">
          <label className="mb-1 text-[11px] font-bold uppercase tracking-tight text-slate-500">Fecha desde</label>
          <Input
            type="date"
            className="h-9 text-xs"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-[11px] font-bold uppercase tracking-tight text-slate-500">Fecha hasta</label>
          <Input
            type="date"
            className="h-9 text-xs"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-[11px] font-bold uppercase tracking-tight text-slate-500">
            Centro de Costos
          </label>
          <Select
            value={centroCostos}
            onChange={(e) => setCentroCostos(e.target.value)}
          >
            <option value="">Todos</option>
            {centros.map((cc) => (
              <SelectItem key={cc.id} value={cc.id} label={cc.nombre} />
            ))}
          </Select>
        </div>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando reporte…</p>}

      {errorMsg && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {errorMsg}
        </div>
      )}

      {!loading && !errorMsg && !hayData && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Este cliente todavía no tiene información de compras y gastos cargada. El reporte se
          mostrará en cero hasta que se sincronicen las compras.
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-slate-200 bg-white/70 p-1.5 shadow-sm sm:grid-cols-3 md:grid-cols-6 xl:grid-cols-12">
        {kpiItems.map((item) => (
          <KpiCard key={item.id} item={item} onSelect={setSelectedKpi} />
        ))}
      </div>

      {selectedKpi && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 px-3 pb-4 sm:items-center"
          onClick={() => setSelectedKpi(null)}
        >
          <div
            className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Detalle del KPI
                </p>
                <h2 className="mt-1 text-lg font-black text-slate-900">
                  {selectedKpi.label}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedKpi(null)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm font-black text-slate-600 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-center">
              <div className="text-xs font-bold uppercase text-slate-500">Valor completo</div>
              <div className="mt-1 break-words text-2xl font-black tracking-tight text-slate-900">
                {selectedKpi.fullValue}
              </div>
            </div>

            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>{selectedKpi.description}</p>
              <p>
                <span className="font-bold text-slate-800">Periodo:</span> {periodoTexto}
              </p>
              {centroCostos && (
                <p>
                  <span className="font-bold text-slate-800">Centro de costos:</span>{" "}
                  {centros.find((cc) => String(cc.id) === String(centroCostos))?.nombre || centroCostos}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="shadow-sm">
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-base font-black">Evolución Mensual</CardTitle>
        </CardHeader>

        <CardContent className="px-3 pb-3 pt-0">
          {evolucionSegura.length === 0 ? (
            <EmptyState
              title="Sin evolución mensual para mostrar"
              description="Cuando existan compras, facturas de compra o documentos soporte, aquí aparecerá la evolución mensual."
            />
          ) : (
            <ResponsiveContainer width="100%" height={290}>
              <BarChart
                data={evolucionSegura}
                margin={{ top: 14, bottom: 24, left: 8, right: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="mes"
                  tickFormatter={(mes) => formatMesGrafica(String(mes))}
                  angle={-30}
                  textAnchor="end"
                  height={42}
                />

                <YAxis tickFormatter={(v) => formatCurrency(Number(v))} fontSize={11} />

                <Tooltip
                  formatter={(value: any, name: string) => [
                    formatCurrency(Number(value)),
                    name,
                  ]}
                  labelFormatter={(label) => formatMesGrafica(String(label))}
                />

                <Legend wrapperStyle={{ fontSize: 11 }} />

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
          )}

          <div className="mt-1 text-right text-[11px] tracking-tight text-slate-500">
            * Haga click sobre una barra de interés para mayor información
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between px-3 py-2">
          <CardTitle className="text-base font-black">Top 15 Proveedores</CardTitle>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTopView("valor")}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                topView === "valor"
                  ? "bg-blue-600 text-white shadow"
                  : "bg-gray-100 hover:bg-gray-200"
              } transition`}
            >
              Por valor
            </button>

            <button
              onClick={() => setTopView("facturas")}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                topView === "facturas"
                  ? "bg-blue-600 text-white shadow"
                  : "bg-gray-100 hover:bg-gray-200"
              } transition`}
            >
              Por # facturas
            </button>
          </div>
        </CardHeader>

        <CardContent className="px-3 pb-3 pt-0">
          {topView === "valor" ? (
            topValorData.length === 0 ? (
              <EmptyState
                title="Sin proveedores para mostrar"
                description="Cuando existan compras registradas, aquí aparecerá el ranking de proveedores por valor."
                height="h-[300px]"
              />
            ) : (
              <div className="h-[300px] w-full">
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
                      width={165}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
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
            )
          ) : topFacturasData.length === 0 ? (
            <EmptyState
              title="Sin proveedores para mostrar"
              description="Cuando existan documentos de compra, aquí aparecerá el ranking de proveedores por número de facturas."
              height="h-[300px]"
            />
          ) : (
            <div className="h-[300px] w-full">
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
                  <Tooltip
                    formatter={(v: any) => `${Number(v || 0).toLocaleString("es-CO")}`}
                  />
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
                      formatter={(v: any) => `${Number(v || 0).toLocaleString("es-CO")}`}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-1 text-right text-[11px] tracking-tight text-slate-500">
            * Haga click sobre una barra de interés para mayor información
          </div>
        </CardContent>
      </Card>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-2"
        >
          <div
            className="mt-2 flex w-full max-w-6xl flex-col rounded-2xl bg-white shadow-xl animate-[fadeIn_0.2s_ease]"
            style={{
              width: "min(96vw, 1280px)",
              height: "min(88vh, 820px)",
              minWidth: "430px",
              minHeight: "360px",
              maxWidth: "98vw",
              maxHeight: "94vh",
              resize: "both",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-20 flex shrink-0 items-center justify-between rounded-t-2xl border-b bg-white px-4 py-3">
              <h3 className="text-base font-black">{modalTitle}</h3>

              <button
                onClick={() => setModalOpen(false)}
                className="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200"
              >
                Cerrar
              </button>
            </div>

            <div className="flex-1 overflow-auto p-3">
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

              <div className="mb-3 grid grid-cols-4 gap-2">
                <div className="rounded-xl border bg-gray-50 p-2">
                  <div className="text-xs text-gray-500">Cantidad</div>
                  <div className="text-base font-bold">
                    {modalResumen.cantidad.toLocaleString("es-CO")}
                  </div>
                </div>

                <div className="rounded-xl border bg-gray-50 p-2">
                  <div className="text-xs text-gray-500">Total</div>
                  <div className="text-base font-bold text-blue-600">
                    {formatCurrency(modalResumen.total)}
                  </div>
                </div>

                <div className="rounded-xl border bg-gray-50 p-2">
                  <div className="text-xs text-gray-500">Pagado</div>
                  <div className="text-base font-bold text-green-600">
                    {formatCurrency(modalResumen.pagado)}
                  </div>
                </div>

                <div className="rounded-xl border bg-gray-50 p-2">
                  <div className="text-xs text-gray-500">Saldo</div>
                  <div className="text-base font-bold text-red-600">
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
                <table className="min-w-full border-collapse text-xs">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="border-b">
                      {[
                        "Proveedor",
                        "Factura",
                        "Factura Proveedor",
                        "Fecha",
                        "Vencimiento",
                        "Estado",
                        "Centro de Costo",
                        "Total",
                        "Pagado",
                        "Saldo",
                      ].map((h, idx) => (
                        <th key={idx} className={`p-2 ${idx < 7 ? "text-left" : "text-right"}`}>
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
                        ? safeNumber(r.pagado_calc)
                        : safeNumber(r.total) - safeNumber(r.saldo);

                      return (
                        <tr key={`${r.factura || "factura"}-${i}`} className={rowClass}>
                          <td className="p-2">{r.proveedor_nombre || "Sin proveedor"}</td>
                          <td className="p-2">{r.factura || "—"}</td>
                          <td className="p-2">{r.factura_proveedor || "—"}</td>
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
                          <td className="p-2 text-right">{formatCurrency(safeNumber(r.total))}</td>
                          <td className="p-2 text-right">{formatCurrency(pagadoCalc)}</td>
                          <td className="p-2 text-right">{formatCurrency(safeNumber(r.saldo))}</td>
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