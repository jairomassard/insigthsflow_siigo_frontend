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

type Vendedor = { id: number; nombre: string };
type CentroCosto = { id: number; nombre: string; codigo?: string };
type Cliente = { id: string; nombre: string };

type Factura = {
  idfactura: string;
  fecha: string;
  cliente_nombre: string;
  vendedor_nombre?: string;
  centro_costo_nombre?: string;
  subtotal: number;
  impuestos?: number;
  impuestos_total?: number;
  total: number;
  pagado?: number;
  saldo: number;
  public_url?: string;
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

function calcularPagadoPendiente(f: Factura) {
  const total = Number(f.total || 0);
  const saldo = Number(f.saldo || 0);

  let pagado = f.pagado !== undefined ? Number(f.pagado) : total - saldo;
  let pendiente = saldo;

  if (saldo === total) pagado = 0;
  if (saldo === 0) {
    pagado = total;
    pendiente = 0;
  }

  return { pagado, pendiente };
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
  });
  const [estados, setEstados] = useState<any[]>([]);
  const [topClientes, setTopClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [clienteSel, setClienteSel] = useState("");

  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const totalSubtotal = toNum(kpis.subtotal);
  const totalImpuestos = toNum(kpis.impuestos);
  const totalAutorretencion = toNum(kpis.autorretencion);
  const totalFacturado = toNum(kpis.total_facturado);
  const totalRetenciones = toNum(kpis.retenciones);
  const totalUtilizable = toNum(kpis.total_utilizable);
  const totalPagado = toNum(kpis.pagado);
  const totalPendiente = toNum(kpis.pendiente);

  const pctPagado = totalFacturado ? (totalPagado / totalFacturado) * 100 : 0;
  const pctPendiente = totalFacturado ? (totalPendiente / totalFacturado) * 100 : 0;

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMes, setModalMes] = useState("");
  const [detalleFacturas, setDetalleFacturas] = useState<any[]>([]);

  const [modalClienteOpen, setModalClienteOpen] = useState(false);
  const [clienteEnModal, setClienteEnModal] = useState("");
  const [facturasCliente, setFacturasCliente] = useState<any[]>([]);

  const [modalEstadoOpen, setModalEstadoOpen] = useState(false);
  const [estadoEnModal, setEstadoEnModal] = useState("");
  const [facturasEstado, setFacturasEstado] = useState<any[]>([]);

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

      const url = `/reportes/facturas_enriquecidas?${qs.toString()}`;
      const res = await authFetch(url);

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
    setDesde("");
    setHasta("");
    setSellerId("");
    setCostCenter("");
    setClienteSel("");
  };

  const handleTopClienteClick = async (entry: any) => {
    if (!entry?.cliente) return;

    setClienteEnModal(entry.cliente);
    setModalClienteOpen(true);

    const qs = new URLSearchParams();
    if (desde) qs.set("desde", desde);
    if (hasta) qs.set("hasta", hasta);
    if (sellerId) qs.set("seller_id", sellerId);
    if (costCenter) qs.set("cost_center", costCenter);
    qs.set("cliente", entry.cliente);

    const res = await authFetch(`/reportes/facturas_por_cliente?${qs.toString()}`);
    setFacturasCliente(res.rows || []);
  };

  const handleEstadoClick = async (entry: any) => {
    if (!entry?.estado) return;

    setEstadoEnModal(entry.estado);
    setModalEstadoOpen(true);

    const qs = new URLSearchParams();
    if (desde) qs.set("desde", desde);
    if (hasta) qs.set("hasta", hasta);
    if (sellerId) qs.set("seller_id", sellerId);
    if (costCenter) qs.set("cost_center", costCenter);
    qs.set("estado", entry.estado);

    const res = await authFetch(`/reportes/facturas_por_estado?${qs.toString()}`);
    setFacturasEstado(res.rows || []);
  };

  const handleBarClick = async (entry: any) => {
    try {
      const periodo = entry?.periodo;
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

      setModalMes(periodo);
      setModalOpen(true);

      const qs = new URLSearchParams();
      qs.set("desde", desdeMes);
      qs.set("hasta", hastaMes);

      if (sellerId) qs.set("seller_id", sellerId);
      if (costCenter) qs.set("cost_center", costCenter);
      if (clienteSel) qs.set("cliente", clienteSel);

      const res = await authFetch(`/reportes/facturas_detalle_mes?${qs.toString()}`);
      setDetalleFacturas(res.rows || []);
    } catch (error) {
      console.error("Error cargando detalle por mes", error);
      setDetalleFacturas([]);
    }
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
        if (desde) qs.append("desde", desde);
        if (hasta) qs.append("hasta", hasta);

        const cli = await authFetch(`/catalogos/clientes-facturas?${qs.toString()}`);
        if (Array.isArray(cli)) setClientes(cli);
      } catch {}
    };

    loadCatalogos();
  }, [desde, hasta]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta, sellerId, costCenter, clienteSel]);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalOpen(false);
        setModalClienteOpen(false);
        setModalEstadoOpen(false);
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  const monthly = useMemo(
    () =>
      series.map((s: any) => ({
        periodo: s.label,
        subtotal: Number(s.subtotal || 0),
        impuestos: Number(s.impuestos || 0),
        descuentos: Number(s.descuentos || 0),
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
      <VentasModal
        open={modalOpen}
        title={`Facturas del mes: ${modalMes}`}
        subtitle={`Total de facturas: ${detalleFacturas.length}`}
        onClose={() => setModalOpen(false)}
        rows={detalleFacturas}
        showCliente
      />

      <VentasModal
        open={modalClienteOpen}
        title={`Facturas del cliente: ${clienteEnModal}`}
        subtitle={`Total de facturas: ${facturasCliente.length}`}
        onClose={() => setModalClienteOpen(false)}
        rows={facturasCliente}
      />

      <VentasModal
        open={modalEstadoOpen}
        title={`Facturas en estado: ${estadoEnModal}`}
        subtitle={`Total de facturas: ${facturasEstado.length}`}
        onClose={() => setModalEstadoOpen(false)}
        rows={facturasEstado}
        showCliente
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
              Vista ejecutiva de ventas netas, total facturado Siigo, pagos,
              cartera pendiente, clientes, vendedores y centros de costo.
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
          <div className="grid gap-3 md:grid-cols-6">
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
                title="Ventas netas"
                value={fmtCOP(totalSubtotal)}
                helper="Valor neto comercial."
                tone="green"
              />
              <KpiCard
                title="Impuestos"
                value={fmtCOP(totalImpuestos)}
                helper="Impuestos asociados."
                tone="yellow"
              />
              <KpiCard
                title="Retenciones"
                value={fmtCOP(totalRetenciones)}
                helper="Sin autorretención."
                tone="orange"
              />
              <KpiCard
                title="Total Siigo"
                value={fmtCOP(totalFacturado)}
                helper="Total facturado."
                tone="emerald"
              />
              <KpiCard
                title="Autorretención"
                value={fmtCOP(totalAutorretencion)}
                helper="Autorretenciones."
                tone="purple"
              />
              <KpiCard
                title="Total utilizable"
                value={fmtCOP(totalUtilizable)}
                helper="Total menos retenciones."
                tone="teal"
              />
              <KpiCard
                title="Pagado"
                value={fmtCOP(totalPagado)}
                helper={`${fmtPct(pctPagado)}% del total.`}
                tone="blue"
              />
              <KpiCard
                title="Pendiente"
                value={fmtCOP(totalPendiente)}
                helper={`${fmtPct(pctPendiente)}% del total.`}
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
                    Haz clic sobre una barra para ver las facturas del mes.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <LegendPill colorClass="bg-green-600" label="Ventas netas" />
                  <LegendPill colorClass="bg-emerald-500" label="Total facturado" />
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
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={monthly} margin={{ top: 24, right: 18, left: 8, bottom: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => fmtCOP(Number(v))} />
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
                      name="Total facturado"
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
                  Clientes con mayor venta en el periodo. Haz clic para ver facturas.
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
                      <Tooltip formatter={(v) => fmtCOP(Number(v))} />
                      <Bar
                        dataKey="total"
                        fill="#2563eb"
                        name="Ventas"
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
                  Comparativo entre valores pagados y pendientes. Haz clic para ver detalle.
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

function VentasModal({
  open,
  title,
  subtitle,
  rows,
  onClose,
  showCliente = false,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  rows: any[];
  onClose: () => void;
  showCliente?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="relative flex flex-col rounded-2xl border border-white/40 bg-white shadow-2xl"
        style={{
          width: "min(96vw, 1180px)",
          height: "min(90vh, 780px)",
          minWidth: "430px",
          minHeight: "420px",
          maxWidth: "97vw",
          maxHeight: "92vh",
          resize: "both",
          overflow: "auto",
        }}
      >
        <div className="sticky top-0 z-20 flex items-center justify-between rounded-t-2xl border-b bg-white px-4 py-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">{title}</h2>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="overflow-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[1120px] text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-2 text-left">Factura</th>
                  <th className="p-2 text-left">Fecha</th>
                  {showCliente && <th className="p-2 text-left">Cliente</th>}
                  <th className="p-2 text-left">Centro costo</th>
                  <th className="p-2 text-left">Vendedor</th>
                  <th className="p-2 text-right">Subtotal</th>
                  <th className="p-2 text-right">Impuestos</th>
                  <th className="p-2 text-right">Total</th>
                  <th className="p-2 text-right">Pagado</th>
                  <th className="p-2 text-right">Pendiente</th>
                  <th className="p-2 text-center">Link</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={showCliente ? 11 : 10}
                      className="p-8 text-center text-slate-500"
                    >
                      No hay facturas para mostrar.
                    </td>
                  </tr>
                )}

                {rows.map((f: any, idx: number) => {
                  const { pagado, pendiente } = calcularPagadoPendiente(f);
                  const impuestos = Number(f.impuestos ?? f.impuestos_total ?? 0);

                  return (
                    <tr
                      key={`${f.idfactura}-${idx}`}
                      className={`border-t hover:bg-slate-50 ${
                        Number(f.saldo) > 0 ? "text-red-600" : "text-slate-700"
                      }`}
                    >
                      <td className="p-2 font-medium whitespace-nowrap">{f.idfactura}</td>
                      <td className="p-2 whitespace-nowrap">{formatDate(f.fecha)}</td>
                      {showCliente && <td className="p-2">{f.cliente_nombre || "—"}</td>}
                      <td className="p-2">{f.centro_costo_nombre || "—"}</td>
                      <td className="p-2">{f.vendedor_nombre || "—"}</td>
                      <td className="p-2 text-right whitespace-nowrap">
                        {fmtCOP(Number(f.subtotal || 0))}
                      </td>
                      <td className="p-2 text-right whitespace-nowrap">
                        {fmtCOP(impuestos)}
                      </td>
                      <td className="p-2 text-right font-semibold whitespace-nowrap">
                        {fmtCOP(Number(f.total || 0))}
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

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
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

function fmtPct(n: any) {
  const value = Number(n || 0);
  return value.toLocaleString("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}