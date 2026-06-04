"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  LabelList,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { authFetch } from "@/lib/api";
import { getDefaultYearToDateRange } from "@/lib/dateDefaults";

type Vendedor = { id: number; nombre: string };
type CentroCosto = { id: number; nombre: string; codigo?: string };
type Cliente = { id: string; nombre: string };

type MovimientoVenta = {
  movimiento_id?: number;
  documento?: string;
  idfactura?: string;
  tipo_movimiento?: "FACTURA" | "NOTA_CREDITO" | string;
  fecha: string;
  vencimiento?: string;
  cliente_nombre?: string;
  vendedor_nombre?: string;
  centro_costo_nombre?: string;
  documento_afectado?: string;
  subtotal: number;
  impuestos_total?: number;
  impuestos?: number;
  total: number;
  valor?: number;
  pagado?: number;
  pendiente?: number;
  saldo?: number;
  public_url?: string;
};

type ResumenMovimientos = {
  facturas_emitidas?: number;
  notas_credito?: number;
  ventas_netas?: number;
  ventas_con_impuesto?: number;
  ventas_sin_impuesto?: number;
  pagado?: number;
  pendiente?: number;
  total_movimientos?: number;
  total_facturas?: number;
  total_notas_credito?: number;
};

const fmtCOP = (n: number) =>
  Number(n || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

const fmtShort = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(n || 0));

const toNum = (v: any) => Number(v || 0);

function abreviar(valor: number): string {
  const v = Number(valor || 0);
  const abs = Math.abs(v);

  if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return `${Math.round(v)}`;
}

function formatDate(value: any) {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function calcularPagadoPendiente(f: MovimientoVenta) {
  if (f.tipo_movimiento === "NOTA_CREDITO") {
    return { pagado: 0, pendiente: 0 };
  }

  const total = Number(f.total || 0);
  const saldo = Number(f.saldo || f.pendiente || 0);

  let pagado = f.pagado !== undefined ? Number(f.pagado) : total - saldo;
  let pendiente = f.pendiente !== undefined ? Number(f.pendiente) : saldo;

  if (saldo === total) pagado = 0;
  if (saldo === 0) {
    pagado = total;
    pendiente = 0;
  }

  return { pagado, pendiente };
}

function fmtPct(n: any) {
  const value = Number(n || 0);

  return value.toLocaleString("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export default function DashboardFinanciero() {
  const [data, setData] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [kpis, setKpis] = useState({
    subtotal: 0,
    impuestos: 0,
    autorretencion: 0,
    total_facturado: 0,
    retenciones: 0,
    total_utilizable: 0,
    pagado: 0,
    pendiente: 0,
    ventas_sin_impuesto: 0,
    ventas_con_impuesto: 0,
    facturas_emitidas_sin_impuesto: 0,
    facturas_emitidas_con_impuesto: 0,
    notas_credito_sin_impuesto: 0,
    notas_credito_con_impuesto: 0,
    notas_credito: 0,
    notas_credito_abs: 0,
  });

  const [estados, setEstados] = useState<any[]>([]);
  const [topClientes, setTopClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [defaultDates] = useState(() => getDefaultYearToDateRange());

  const [desde, setDesde] = useState(defaultDates.desde);
  const [hasta, setHasta] = useState(defaultDates.hasta);
  const [sellerId, setSellerId] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [clienteSel, setClienteSel] = useState("");

  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [incluyeImpuesto, setIncluyeImpuesto] = useState(true);
  const [incluyeNotaCredito, setIncluyeNotaCredito] = useState(true);

  const totalVentasNetas = toNum(kpis.subtotal);
  const totalImpuestosNetos = toNum(kpis.impuestos);
  const totalAutorretencion = toNum(kpis.autorretencion);
  const totalRetenciones = toNum(kpis.retenciones);
  const totalPagado = toNum(kpis.pagado);
  const totalPendiente = toNum(kpis.pendiente);

  const facturasEmitidasSinImpuesto = toNum(kpis.facturas_emitidas_sin_impuesto);
  const facturasEmitidasConImpuesto = toNum(kpis.facturas_emitidas_con_impuesto);
  const notasCreditoSinImpuesto = Math.abs(toNum(kpis.notas_credito_sin_impuesto));
  const notasCreditoConImpuesto = Math.abs(toNum(kpis.notas_credito_con_impuesto));

  const facturasEmitidas = toNum(kpis.total_facturado);

  const notasCredito = toNum(kpis.notas_credito_abs) ||
    (incluyeImpuesto ? notasCreditoConImpuesto : notasCreditoSinImpuesto);

  // Pagado y pendiente son valores de cartera sobre facturas, normalmente con impuesto.
  // Por eso el porcentaje se calcula sobre facturas emitidas con impuesto, no sobre ventas netas.
  const baseCobro = facturasEmitidasConImpuesto || facturasEmitidas;

  const pctPagado = baseCobro
    ? Math.min((totalPagado / baseCobro) * 100, 100)
    : 0;

  const pctPendiente = baseCobro
    ? Math.min((totalPendiente / baseCobro) * 100, 100)
    : 0;

  const [modalMovimientosOpen, setModalMovimientosOpen] = useState(false);
  const [modalMovimientosTitulo, setModalMovimientosTitulo] = useState("");
  const [modalMovimientosSubtitulo, setModalMovimientosSubtitulo] = useState("");
  const [movimientosDetalle, setMovimientosDetalle] = useState<MovimientoVenta[]>([]);
  const [resumenDetalle, setResumenDetalle] = useState<ResumenMovimientos | null>(null);

  const [modalEstadoOpen, setModalEstadoOpen] = useState(false);
  const [estadoEnModal, setEstadoEnModal] = useState("");
  const [facturasEstado, setFacturasEstado] = useState<MovimientoVenta[]>([]);

  const load = async () => {
    setLoading(true);
    setErr("");

    try {
      const qs = new URLSearchParams();

      if (desde) qs.append("desde", desde);
      if (hasta) qs.append("hasta", hasta);
      if (sellerId) qs.append("seller_id", sellerId);
      if (costCenter) qs.append("cost_center", costCenter);
      if (clienteSel) qs.append("cliente", clienteSel);

      qs.append("incluye_impuesto", incluyeImpuesto ? "1" : "0");
      qs.append("incluye_nota_credito", incluyeNotaCredito ? "1" : "0");

      const res = await authFetch(`/reportes/facturas_enriquecidas?${qs.toString()}`);

      if (res?.error) {
        setErr(res.error);
      } else {
        setData(res.rows || []);
        if (res.kpis) setKpis(res.kpis);
        if (Array.isArray(res.series)) setSeries(res.series);
        if (Array.isArray(res.estados)) setEstados(res.estados);
        if (Array.isArray(res.top_clientes)) setTopClientes(res.top_clientes);
      }
    } catch (e: any) {
      setErr(e.message || "Error cargando reporte de ventas");
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    const d = getDefaultYearToDateRange();

    setDesde(d.desde);
    setHasta(d.hasta);
    setSellerId("");
    setCostCenter("");
    setClienteSel("");
  };

  const qsBase = () => {
    const qs = new URLSearchParams();

    const fallbackDates = getDefaultYearToDateRange();
    const desdeFinal = desde || fallbackDates.desde;
    const hastaFinal = hasta || fallbackDates.hasta;

    qs.set("desde", desdeFinal);
    qs.set("hasta", hastaFinal);

    if (sellerId) qs.set("seller_id", sellerId);
    if (costCenter) qs.set("cost_center", costCenter);
    if (clienteSel) qs.set("cliente", clienteSel);

    qs.set("incluye_impuesto", incluyeImpuesto ? "1" : "0");
    qs.set("incluye_nota_credito", incluyeNotaCredito ? "1" : "0");
    qs.set("limit", "10000");

    return qs;
  };

  const cargarMovimientosDetalle = async ({
    titulo,
    subtitulo,
    desdeParam,
    hastaParam,
    clienteParam,
  }: {
    titulo: string;
    subtitulo: string;
    desdeParam?: string;
    hastaParam?: string;
    clienteParam?: string;
  }) => {
    try {
      setModalMovimientosTitulo(titulo);
      setModalMovimientosSubtitulo(subtitulo);
      setModalMovimientosOpen(true);
      setMovimientosDetalle([]);
      setResumenDetalle(null);

      const qs = qsBase();

      if (desdeParam) qs.set("desde", desdeParam);
      if (hastaParam) qs.set("hasta", hastaParam);

      if (clienteParam) qs.set("cliente", clienteParam);

      const res = await authFetch(`/reportes/ventas_movimientos_detalle?${qs.toString()}`);

      setMovimientosDetalle(res.rows || []);
      setResumenDetalle(res.resumen || null);
    } catch (error) {
      console.error("Error cargando movimientos", error);
      setMovimientosDetalle([]);
      setResumenDetalle(null);
    }
  };

  const handleTopClienteClick = async (entry: any) => {
    const item = entry?.payload || entry;
    if (!item?.cliente) return;

    await cargarMovimientosDetalle({
      titulo: `Movimientos del cliente: ${item.cliente}`,
      subtitulo: "Facturas y notas crédito del periodo seleccionado.",
      clienteParam: item.cliente,
    });
  };

  const handleEstadoClick = async (entry: any) => {
    const item = entry?.payload || entry;
    if (!item?.estado) return;

    setEstadoEnModal(item.estado);
    setModalEstadoOpen(true);

    const qs = new URLSearchParams();

    const fallbackDates = getDefaultYearToDateRange();
    const desdeFinal = desde || fallbackDates.desde;
    const hastaFinal = hasta || fallbackDates.hasta;

    qs.set("desde", desdeFinal);
    qs.set("hasta", hastaFinal);

    if (sellerId) qs.set("seller_id", sellerId);
    if (costCenter) qs.set("cost_center", costCenter);
    if (clienteSel) qs.set("cliente", clienteSel);

    qs.set("estado", item.estado);
    qs.set("incluye_impuesto", incluyeImpuesto ? "1" : "0");
    qs.set("incluye_nota_credito", incluyeNotaCredito ? "1" : "0");

    const res = await authFetch(`/reportes/facturas_por_estado?${qs.toString()}`);
    setFacturasEstado(res.rows || []);
  };

  const handleBarClick = async (entry: any) => {
    const item = entry?.payload || entry;
    const periodo = item?.periodo;
    if (!periodo) return;

    const dateObj = new Date(periodo);
    if (Number.isNaN(dateObj.getTime())) {
      console.error("Fecha inválida:", periodo);
      return;
    }

    const year = dateObj.getUTCFullYear();
    const month = dateObj.getUTCMonth();

    const desdeMes = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const hastaMesDate = new Date(Date.UTC(year, month + 1, 0));
    const hastaMes = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      hastaMesDate.getUTCDate()
    ).padStart(2, "0")}`;

    await cargarMovimientosDetalle({
      titulo: `Movimientos del mes: ${item?.label || periodo}`,
      subtitulo: "Facturas emitidas, notas crédito y venta neta del mes.",
      desdeParam: desdeMes,
      hastaParam: hastaMes,
    });
  };

  useEffect(() => {
    const loadCatalogos = async () => {
      try {
        const v = await authFetch("/catalogos/vendedores");
        if (Array.isArray(v)) setVendedores(v);
      } catch {}

      try {
        const c = await authFetch("/catalogos/centros-costo");
        if (Array.isArray(c)) setCentros(c);
      } catch {}

      try {
        const qs = new URLSearchParams();

        const fallbackDates = getDefaultYearToDateRange();
        const desdeFinal = desde || fallbackDates.desde;
        const hastaFinal = hasta || fallbackDates.hasta;

        qs.append("desde", desdeFinal);
        qs.append("hasta", hastaFinal);

        const cli = await authFetch(`/catalogos/clientes-facturas?${qs.toString()}`);
        if (Array.isArray(cli)) setClientes(cli);
      } catch {}
    };

    loadCatalogos();
  }, [desde, hasta]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta, sellerId, costCenter, clienteSel, incluyeImpuesto, incluyeNotaCredito]);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalMovimientosOpen(false);
        setModalEstadoOpen(false);
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  const monthly = useMemo(
    () =>
      series.map((s: any) => ({
        periodo: s.periodo || s.label,
        label: s.label || s.periodo,
        subtotal: Number(s.subtotal || 0),
        notas_credito: Number(s.notas_credito || 0),
        impuestos: Number(s.impuestos || 0),
        total_facturado: Number(s.total_facturado || 0),
        retenciones: Number(s.retenciones || 0),
        total_utilizable: Number(s.total_utilizable || 0),
        pagado: Number(s.pagado || 0),
        pendiente: Number(s.pendiente || 0),
      })),
    [series]
  );

  const estadosData = useMemo(
    () =>
      estados.map((e: any) => ({
        estado: e.estado,
        valor: Number(e.valor || 0),
      })),
    [estados]
  );

  const pieLabel = (props: any) => {
    const { name, percent } = props;
    return `${name}: ${(percent * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      <MovimientosModal
        open={modalMovimientosOpen}
        title={modalMovimientosTitulo}
        subtitle={modalMovimientosSubtitulo}
        onClose={() => setModalMovimientosOpen(false)}
        rows={movimientosDetalle}
        resumen={resumenDetalle}
        incluyeImpuesto={incluyeImpuesto}
      />

      <MovimientosModal
        open={modalEstadoOpen}
        title={`Facturas en estado: ${estadoEnModal}`}
        subtitle={`Total de facturas: ${facturasEstado.length}`}
        onClose={() => setModalEstadoOpen(false)}
        rows={facturasEstado}
        incluyeImpuesto={incluyeImpuesto}
        forceFacturas
      />

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-slate-100 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center rounded-full border border-blue-100 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 shadow-sm">
              Reporte financiero
            </div>

            <h1 className="text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
              Ingresos por Ventas
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              Vista ejecutiva de ventas netas alineadas con Siigo, facturas emitidas,
              notas crédito, pagos, cartera pendiente, clientes y centros de costo.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:flex md:items-center">
            <MiniMetric
              label="Estado"
              value={loading ? "Cargando" : err ? "Con error" : "Actualizado"}
            />
            <MiniMetric label="Facturas" value={data.length} />
            <MiniMetric label="% pagado" value={`${fmtPct(pctPagado)}`} />
            <MiniMetric label="% pendiente" value={`${fmtPct(pctPendiente)}`} danger />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <div className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
            Filtros del reporte
          </div>

          <h2 className="mt-2 text-lg font-bold tracking-tight text-slate-950">
            Consulta de ventas
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Los datos se actualizan automáticamente al cambiar los filtros.
          </p>
        </div>

        <div className="p-4">
          <div className="grid gap-3 md:grid-cols-7">
            <Field label="Desde">
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </Field>

            <Field label="Hasta">
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </Field>

            <Field label="Vendedor">
              <select
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Todos</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre || `ID ${v.id}`}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Centro de costo">
              <select
                value={costCenter}
                onChange={(e) => setCostCenter(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Todos</option>
                {centros.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre || `ID ${c.id}`} {c.codigo ? `(${c.codigo})` : ""}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Cliente">
              <select
                value={clienteSel}
                onChange={(e) => setClienteSel(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Todos</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre || `ID ${c.id}`}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Opciones Siigo a Incluir">
              <div className="flex h-10 items-center gap-4 rounded-lg border border-slate-300 bg-white px-3 text-xs">
                <label className="inline-flex items-center gap-2 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={incluyeImpuesto}
                    onChange={(e) => setIncluyeImpuesto(e.target.checked)}
                  />
                  Impuestos
                </label>

                <label className="inline-flex items-center gap-2 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={incluyeNotaCredito}
                    onChange={(e) => setIncluyeNotaCredito(e.target.checked)}
                  />
                  Notas crédito
                </label>
              </div>
            </Field>

            <div className="flex items-end">
              <button
                onClick={limpiarFiltros}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Cargando datos de ventas…</p>
        </div>
      )}

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <p className="font-medium text-red-700">Error: {err}</p>
        </div>
      )}

      {!loading && !err && (
        <>
          <div className="overflow-x-auto pb-1">
            <div className="grid min-w-[1280px] grid-cols-8 gap-3">
              <KpiCard
                title={incluyeImpuesto ? "Ventas netas con impuesto" : "Ventas netas sin impuesto"}
                value={fmtCOP(totalVentasNetas)}
                helper={
                  incluyeImpuesto
                    ? "Equivale al comparativo de Siigo con 'Incluye impuesto' activo: facturas menos notas crédito."
                    : "Equivale al comparativo de Siigo sin 'Incluye impuesto': facturas menos notas crédito."
                }
                tone="green"
              />

              <KpiCard
                title="Facturas emitidas"
                value={fmtCOP(facturasEmitidas)}
                helper={
                  incluyeImpuesto
                    ? "Total de facturas emitidas con impuesto, antes de descontar notas crédito."
                    : "Subtotal de facturas emitidas sin impuesto, antes de descontar notas crédito."
                }
                tone="emerald"
              />

              <KpiCard
                title="Notas crédito"
                value={fmtCOP(notasCredito)}
                helper={
                  incluyeImpuesto
                    ? "Notas crédito del periodo con impuesto."
                    : "Notas crédito del periodo sin impuesto."
                }
                tone="red"
              />

              <KpiCard
                title="Impuestos netos"
                value={fmtCOP(totalImpuestosNetos)}
                helper="Diferencia entre ventas con impuesto y ventas sin impuesto."
                tone="yellow"
              />

              <KpiCard
                title="Retenciones"
                value={fmtCOP(totalRetenciones)}
                helper="Retenciones sin autorretención."
                tone="orange"
              />

              <KpiCard
                title="Autorretención"
                value={fmtCOP(totalAutorretencion)}
                helper="Autorretenciones del periodo."
                tone="purple"
              />

              <KpiCard
                title="Pagado"
                value={fmtCOP(totalPagado)}
                helper={`${fmtPct(pctPagado)}% sobre facturas emitidas con impuesto.`}
                tone="blue"
              />

              <KpiCard
                title="Pendiente"
                value={fmtCOP(totalPendiente)}
                helper={`${fmtPct(pctPendiente)}% sobre facturas emitidas con impuesto.`}
                tone="red"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b px-5 py-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    Evolución mensual
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Haz clic sobre una barra para ver facturas y notas crédito del mes.
                    La venta neta se calcula como facturas emitidas menos notas crédito.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <LegendPill colorClass="bg-green-600" label="Ventas netas" />
                  <LegendPill colorClass="bg-emerald-500" label="Facturas emitidas" />
                  <LegendPill colorClass="bg-rose-500" label="Notas crédito" />
                  <LegendPill colorClass="bg-blue-500" label="Pagado" />
                  <LegendPill colorClass="bg-red-600" label="Pendiente" />
                </div>
              </div>
            </div>

            <div className="p-4">
              {monthly.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  Sin datos para los filtros seleccionados.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={monthly} margin={{ top: 24, right: 18, left: 8, bottom: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} />
                    <Tooltip
                      content={<MonthlyTooltip incluyeImpuesto={incluyeImpuesto} />}
                      cursor={{ fill: "rgba(148, 163, 184, 0.18)" }}
                    />
                    <Legend />

                    <Bar
                      dataKey="subtotal"
                      fill="#16a34a"
                      name="Ventas netas"
                      radius={[6, 6, 0, 0]}
                      cursor="pointer"
                      onClick={(data) => handleBarClick(data)}
                    >
                      <LabelList
                        dataKey="subtotal"
                        position="top"
                        formatter={(v: any) => abreviar(Number(v))}
                        style={{ fontSize: 10 }}
                      />
                    </Bar>

                    <Bar
                      dataKey="total_facturado"
                      fill="#10b981"
                      name="Facturas emitidas"
                      radius={[6, 6, 0, 0]}
                      cursor="pointer"
                      onClick={(data) => handleBarClick(data)}
                    >
                      <LabelList
                        dataKey="total_facturado"
                        position="top"
                        formatter={(v: any) => abreviar(Number(v))}
                        style={{ fontSize: 10 }}
                      />
                    </Bar>

                    <Bar
                      dataKey="notas_credito"
                      fill="#f43f5e"
                      name="Notas crédito"
                      radius={[6, 6, 0, 0]}
                      cursor="pointer"
                      onClick={(data) => handleBarClick(data)}
                    >
                      <LabelList
                        dataKey="notas_credito"
                        position="top"
                        formatter={(v: any) => abreviar(Number(v))}
                        style={{ fontSize: 10 }}
                      />
                    </Bar>

                    <Bar
                      dataKey="pagado"
                      fill="#3b82f6"
                      name="Pagado"
                      radius={[6, 6, 0, 0]}
                      cursor="pointer"
                      onClick={(data) => handleBarClick(data)}
                    >
                      <LabelList
                        dataKey="pagado"
                        position="top"
                        formatter={(v: any) => abreviar(Number(v))}
                        style={{ fontSize: 10 }}
                      />
                    </Bar>

                    <Bar
                      dataKey="pendiente"
                      fill="#dc2626"
                      name="Pendiente"
                      radius={[6, 6, 0, 0]}
                      cursor="pointer"
                      onClick={(data) => handleBarClick(data)}
                    >
                      <LabelList
                        dataKey="pendiente"
                        position="top"
                        formatter={(v: any) => abreviar(Number(v))}
                        style={{ fontSize: 10 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <h3 className="text-base font-bold text-slate-950">
                  Top 5 clientes
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Clientes con mayor venta neta en el periodo. Haz clic para ver facturas y notas crédito.
                </p>
              </div>

              <div className="p-4">
                {topClientes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                    Sin datos.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={topClientes}
                      layout="vertical"
                      margin={{ top: 10, right: 35, left: 10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tickFormatter={fmtShort} tick={{ fontSize: 11 }} />
                      <YAxis
                        dataKey="cliente"
                        type="category"
                        width={190}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip content={<TopClienteTooltip />} />

                      <Bar
                        dataKey="total"
                        fill="#2563eb"
                        name="Ventas netas"
                        radius={[0, 6, 6, 0]}
                        cursor="pointer"
                        onClick={(data) => handleTopClienteClick(data)}
                      >
                        <LabelList
                          dataKey="total"
                          position="right"
                          formatter={(v: any) => abreviar(Number(v))}
                          style={{ fontSize: 10 }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <h3 className="text-base font-bold text-slate-950">
                  Distribución por estado de pago
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Comparativo entre valores pagados y pendientes. Haz clic para ver detalle de facturas.
                </p>
              </div>

              <div className="p-4">
                {estados.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                    Sin datos.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={estadosData}
                        dataKey="valor"
                        nameKey="estado"
                        outerRadius={115}
                        label={pieLabel}
                        cursor="pointer"
                        onClick={(data) => handleEstadoClick(data)}
                      >
                        {estadosData.map((entry: any, index: number) => {
                          let color = "#3b82f6";
                          if (entry.estado === "Pendiente") color = "#dc2626";
                          if (entry.estado === "Pagado") color = "#16a34a";

                          return <Cell key={index} fill={color} />;
                        })}
                      </Pie>

                      <Tooltip formatter={(v) => fmtCOP(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MonthlyTooltip({ active, payload, incluyeImpuesto }: any) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload || {};

  return (
    <div className="min-w-[255px] rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl">
      <p className="mb-2 text-sm font-bold text-slate-900">{row.label}</p>

      <TooltipLine label="Facturas emitidas" value={row.total_facturado} tone="emerald" />
      <TooltipLine label="Notas crédito" value={row.notas_credito} tone="rose" />
      <div className="my-2 border-t border-slate-200" />
      <TooltipLine
        label={incluyeImpuesto ? "Ventas netas con impuesto" : "Ventas netas sin impuesto"}
        value={row.subtotal}
        tone="green"
      />
      <TooltipLine label="Impuestos netos" value={row.impuestos} tone="yellow" />
      <div className="my-2 border-t border-slate-200" />
      <TooltipLine label="Pagado" value={row.pagado} tone="blue" />
      <TooltipLine label="Pendiente" value={row.pendiente} tone="red" />

      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        Fórmula: facturas emitidas - notas crédito = ventas netas.
      </p>
    </div>
  );
}

function TopClienteTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload || {};

  return (
    <div className="min-w-[260px] rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl">
      <p className="mb-2 text-sm font-bold text-slate-900">{row.cliente}</p>
      <TooltipLine label="Facturas emitidas" value={row.facturas_emitidas} tone="emerald" />
      <TooltipLine label="Notas crédito" value={row.notas_credito} tone="rose" />
      <div className="my-2 border-t border-slate-200" />
      <TooltipLine label="Ventas netas" value={row.total} tone="green" />
    </div>
  );
}

function TooltipLine({ label, value, tone }: { label: string; value: any; tone: string }) {
  const toneMap: Record<string, string> = {
    emerald: "text-emerald-700",
    rose: "text-rose-700",
    green: "text-green-700",
    yellow: "text-yellow-700",
    blue: "text-blue-700",
    red: "text-red-700",
    slate: "text-slate-700",
  };

  return (
    <div className="mb-1 flex items-center justify-between gap-4">
      <span className={toneMap[tone] || toneMap.slate}>{label}</span>
      <span className="font-semibold text-slate-900">{fmtCOP(Number(value || 0))}</span>
    </div>
  );
}

function MovimientosModal({
  open,
  title,
  subtitle,
  rows,
  resumen,
  onClose,
  incluyeImpuesto,
  forceFacturas = false,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  rows: MovimientoVenta[];
  resumen?: ResumenMovimientos | null;
  onClose: () => void;
  incluyeImpuesto: boolean;
  forceFacturas?: boolean;
}) {
  if (!open) return null;

  const totalMovimientos = resumen?.total_movimientos ?? rows.length;
  const totalFacturas = resumen?.total_facturas ?? rows.filter((r) => r.tipo_movimiento !== "NOTA_CREDITO").length;
  const totalNotas = resumen?.total_notas_credito ?? rows.filter((r) => r.tipo_movimiento === "NOTA_CREDITO").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="relative flex flex-col rounded-2xl border border-white/40 bg-white shadow-2xl"
        style={{
          width: "min(97vw, 1280px)",
          height: "min(91vh, 820px)",
          minWidth: "430px",
          minHeight: "420px",
          maxWidth: "98vw",
          maxHeight: "94vh",
          resize: "both",
          overflow: "auto",
        }}
      >
        <div className="sticky top-0 z-20 rounded-t-2xl border-b bg-white px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950">{title}</h2>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>

            <button
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-600"
            >
              ✕
            </button>
          </div>

          {resumen && !forceFacturas && (
            <div className="mt-3 grid gap-2 md:grid-cols-6">
              <ModalMetric label="Facturas emitidas" value={fmtCOP(Number(resumen.facturas_emitidas || 0))} />
              <ModalMetric label="Notas crédito" value={fmtCOP(Number(resumen.notas_credito || 0))} danger />
              <ModalMetric
                label={incluyeImpuesto ? "Ventas netas con impuesto" : "Ventas netas sin impuesto"}
                value={fmtCOP(Number(resumen.ventas_netas || 0))}
                strong
              />
              <ModalMetric label="Pagado" value={fmtCOP(Number(resumen.pagado || 0))} />
              <ModalMetric label="Pendiente" value={fmtCOP(Number(resumen.pendiente || 0))} danger />
              <ModalMetric label="Movimientos" value={`${totalMovimientos} (${totalFacturas} fac. / ${totalNotas} NC)`} />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="overflow-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[1280px] text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-2 text-left">Tipo</th>
                  <th className="p-2 text-left">Documento</th>
                  <th className="p-2 text-left">Fecha</th>
                  <th className="p-2 text-left">Cliente</th>
                  <th className="p-2 text-left">Centro costo</th>
                  <th className="p-2 text-left">Vendedor</th>
                  <th className="p-2 text-left">Doc. afectado</th>
                  <th className="p-2 text-right">Subtotal</th>
                  <th className="p-2 text-right">Impuestos</th>
                  <th className="p-2 text-right">Total</th>
                  <th className="p-2 text-right">Valor reporte</th>
                  <th className="p-2 text-right">Pagado</th>
                  <th className="p-2 text-right">Pendiente</th>
                  <th className="p-2 text-center">Link</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={14} className="p-8 text-center text-slate-500">
                      No hay movimientos para mostrar.
                    </td>
                  </tr>
                )}

                {rows.map((f: MovimientoVenta, idx: number) => {
                  const isNC = f.tipo_movimiento === "NOTA_CREDITO";
                  const { pagado, pendiente } = calcularPagadoPendiente(f);
                  const impuestos = Number(f.impuestos ?? f.impuestos_total ?? 0);
                  const documento = f.documento || f.idfactura || "—";
                  const valorReporte = f.valor !== undefined
                    ? Number(f.valor || 0)
                    : incluyeImpuesto
                      ? Number(f.total || 0)
                      : Number(f.subtotal || 0);

                  return (
                    <tr
                      key={`${documento}-${idx}`}
                      className={`border-t hover:bg-slate-50 ${
                        isNC ? "bg-rose-50/40 text-rose-700" : Number(f.saldo || f.pendiente || 0) > 0 ? "text-red-600" : "text-slate-700"
                      }`}
                    >
                      <td className="p-2 whitespace-nowrap">
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                            isNC
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {isNC ? "Nota crédito" : "Factura"}
                        </span>
                      </td>
                      <td className="p-2 font-medium whitespace-nowrap">{documento}</td>
                      <td className="p-2 whitespace-nowrap">{formatDate(f.fecha)}</td>
                      <td className="p-2">{f.cliente_nombre || "—"}</td>
                      <td className="p-2">{f.centro_costo_nombre || "—"}</td>
                      <td className="p-2">{f.vendedor_nombre || "—"}</td>
                      <td className="p-2 whitespace-nowrap">{f.documento_afectado || "—"}</td>
                      <td className="p-2 text-right whitespace-nowrap">
                        {fmtCOP(Number(f.subtotal || 0))}
                      </td>
                      <td className="p-2 text-right whitespace-nowrap">
                        {fmtCOP(impuestos)}
                      </td>
                      <td className="p-2 text-right font-semibold whitespace-nowrap">
                        {fmtCOP(Number(f.total || 0))}
                      </td>
                      <td className="p-2 text-right font-bold whitespace-nowrap">
                        {fmtCOP(valorReporte)}
                      </td>
                      <td className="p-2 text-right whitespace-nowrap">
                        {fmtCOP(pagado)}
                      </td>
                      <td className="p-2 text-right font-semibold whitespace-nowrap">
                        {fmtCOP(pendiente)}
                      </td>
                      <td className="p-2 text-center">
                        {f.public_url ? (
                          <a
                            className="font-medium text-blue-600 hover:underline"
                            target="_blank"
                            rel="noreferrer"
                            href={f.public_url}
                          >
                            Ver
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
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
      className={`rounded-xl border bg-white px-4 py-3 text-center shadow-sm ${
        danger ? "border-red-100" : "border-slate-200"
      }`}
    >
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-bold ${danger ? "text-red-600" : "text-slate-900"}`}>
        {value ?? "-"}
      </p>
    </div>
  );
}

function ModalMetric({ label, value, danger = false, strong = false }: { label: string; value: any; danger?: boolean; strong?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${danger ? "border-rose-100 bg-rose-50" : strong ? "border-emerald-100 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-bold ${danger ? "text-rose-700" : strong ? "text-emerald-700" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function KpiCard({
  title,
  value,
  helper,
  tone = "slate",
}: {
  title: string;
  value: any;
  helper?: string;
  tone?: "slate" | "blue" | "green" | "yellow" | "orange" | "red" | "emerald" | "purple" | "teal";
}) {
  const toneMap: Record<string, string> = {
    slate: "text-slate-900 bg-slate-50 border-slate-200",
    blue: "text-blue-700 bg-blue-50 border-blue-100",
    green: "text-green-700 bg-green-50 border-green-100",
    yellow: "text-yellow-700 bg-yellow-50 border-yellow-100",
    orange: "text-orange-700 bg-orange-50 border-orange-100",
    red: "text-red-700 bg-red-50 border-red-100",
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-100",
    purple: "text-purple-700 bg-purple-50 border-purple-100",
    teal: "text-teal-700 bg-teal-50 border-teal-100",
  };

  return (
    <div
      className={`rounded-2xl border p-3 shadow-sm transition hover:shadow-md ${toneMap[tone]}`}
    >
      <p className="text-xs font-semibold leading-tight">{title}</p>
      <p className="mt-4 text-base font-bold leading-tight">{value ?? "-"}</p>
      {helper && (
        <p className="mt-1 text-[11px] leading-snug text-slate-500">
          {helper}
        </p>
      )}
    </div>
  );
}

function LegendPill({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-600">
      <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
      {label}
    </span>
  );
}
