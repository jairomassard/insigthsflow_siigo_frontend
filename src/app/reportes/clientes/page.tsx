"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import useAuthGuard from "@/hooks/useAuthGuard";
import { authFetch } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  Cell,
} from "recharts";

type CatalogoItem = {
  id: string | number;
  nombre: string;
};

type FacturaCliente = {
  idfactura: string;
  fecha: string | null;
  vencimiento: string | null;
  total: number;
  pagado: number;
  pendiente: number;
  total_str: string;
  pagado_str: string;
  pendiente_str: string;
  public_url: string | null;
  cliente_nombre: string;
  cliente_key: string;
  cost_center?: number | string | null;
  centro_costo_nombre?: string;
  estado_cartera: "pagado" | "sano" | "alerta" | "vencido";
  dias_vencimiento: number | null;
};

type CentroCostoCliente = {
  centro_costo_nombre: string;
  cost_center?: number | string | null;
  cantidad_facturas: number;
  total_facturado: number;
  total_pagado: number;
  saldo_pendiente: number;
  total_facturado_str: string;
  saldo_pendiente_str: string;
};

type ClienteInsight = {
  cliente: string;
  cliente_key: string;
  cantidad_facturas: number;
  cantidad_centros_costo: number;
  total_facturado: number;
  total_pagado: number;
  saldo_pendiente: number;
  saldo_vencido: number;
  saldo_por_vencer: number;
  total_facturado_str: string;
  total_pagado_str: string;
  saldo_pendiente_str: string;
  saldo_vencido_str: string;
  saldo_por_vencer_str: string;
  pct_pagado: number;
  pct_pendiente: number;
  pct_vencido: number;
  ultima_factura: string | null;
  centros_costo: CentroCostoCliente[];
  facturas_recientes: FacturaCliente[];
  estados: {
    pagado: number;
    sano: number;
    alerta: number;
    vencido: number;
  };
  estados_saldo: {
    pagado: number;
    sano: number;
    alerta: number;
    vencido: number;
  };
};

type ResumenClientes = {
  clientes_facturados: number;
  cantidad_facturas: number;
  total_facturado: number;
  total_pagado: number;
  saldo_pendiente: number;
  saldo_vencido: number;
  saldo_por_vencer: number;
  pct_pagado: number;
  pct_vencido: number;
  total_facturado_str: string;
  total_pagado_str: string;
  saldo_pendiente_str: string;
  saldo_vencido_str: string;
  saldo_por_vencer_str: string;
};

export default function ReporteClientesPage() {
  useAuthGuard();

  const [loading, setLoading] = useState(true);
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState("");

  const [resumen, setResumen] = useState<ResumenClientes | null>(null);
  const [clientes, setClientes] = useState<ClienteInsight[]>([]);
  const [catalogoClientes, setCatalogoClientes] = useState<CatalogoItem[]>([]);
  const [catalogoCentrosCosto, setCatalogoCentrosCosto] = useState<CatalogoItem[]>([]);

  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [centroCostoFiltro, setCentroCostoFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");

  const [busquedaLocal, setBusquedaLocal] = useState("");
  const [orden, setOrden] = useState<
    "facturado" | "saldo" | "vencido" | "facturas" | "nombre"
  >("facturado");

  const [clientesExpandidos, setClientesExpandidos] = useState<Record<string, boolean>>({});
  const [clienteModal, setClienteModal] = useState<ClienteInsight | null>(null);

  const cargarDatos = async (modo: "inicial" | "consulta" = "consulta") => {
    if (modo === "inicial") {
      setLoading(true);
    } else {
      setConsultando(true);
    }

    setError("");

    try {
      const params = new URLSearchParams();

      if (desde) params.set("desde", desde);
      if (hasta) params.set("hasta", hasta);
      if (clienteFiltro) params.set("cliente", clienteFiltro);
      if (centroCostoFiltro) params.set("cost_center", centroCostoFiltro);
      if (estadoFiltro) params.set("estado", estadoFiltro);

      params.set("limit_facturas", "8");

      const url = `/reportes/analisis_clientes?${params.toString()}`;
      const res = await authFetch(url);

      if (res.error) throw new Error(res.error);

      setResumen(res.resumen || null);
      setClientes(res.clientes || []);
      setCatalogoClientes(res.catalogos?.clientes || []);
      setCatalogoCentrosCosto(res.catalogos?.centros_costo || []);
    } catch (e: any) {
      setError(e.message || "Error cargando el reporte de clientes");
    } finally {
      setLoading(false);
      setConsultando(false);
    }
  };

  useEffect(() => {
    cargarDatos("inicial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setClienteModal(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const clientesFiltrados = useMemo(() => {
    const q = busquedaLocal.trim().toLowerCase();

    const base = clientes.filter((c) => {
      if (!q) return true;
      return c.cliente.toLowerCase().includes(q);
    });

    return [...base].sort((a, b) => {
      if (orden === "nombre") return a.cliente.localeCompare(b.cliente);
      if (orden === "saldo") return b.saldo_pendiente - a.saldo_pendiente;
      if (orden === "vencido") return b.saldo_vencido - a.saldo_vencido;
      if (orden === "facturas") return b.cantidad_facturas - a.cantidad_facturas;
      return b.total_facturado - a.total_facturado;
    });
  }, [clientes, busquedaLocal, orden]);

  const topFacturacion = useMemo(() => {
    return [...clientes]
      .sort((a, b) => b.total_facturado - a.total_facturado)
      .slice(0, 10)
      .map((c) => ({
        cliente: cortarTexto(c.cliente, 24),
        total_facturado: c.total_facturado,
      }));
  }, [clientes]);

  const topSaldo = useMemo(() => {
    return [...clientes]
      .sort((a, b) => b.saldo_pendiente - a.saldo_pendiente)
      .slice(0, 10)
      .map((c) => ({
        cliente: cortarTexto(c.cliente, 24),
        saldo_pendiente: c.saldo_pendiente,
      }));
  }, [clientes]);

  const estadoGlobal = useMemo(() => {
    const data = {
      pagado: 0,
      sano: 0,
      alerta: 0,
      vencido: 0,
    };

    clientes.forEach((c) => {
      data.pagado += c.estados?.pagado || 0;
      data.sano += c.estados?.sano || 0;
      data.alerta += c.estados?.alerta || 0;
      data.vencido += c.estados?.vencido || 0;
    });

    return [
      { estado: "Pagado", cantidad: data.pagado },
      { estado: "Sano", cantidad: data.sano },
      { estado: "Alerta", cantidad: data.alerta },
      { estado: "Vencido", cantidad: data.vencido },
    ];
  }, [clientes]);

  const todosExpandidos =
    clientesFiltrados.length > 0 &&
    clientesFiltrados.every((c) => clientesExpandidos[c.cliente_key]);

  const toggleCliente = (cliente: ClienteInsight) => {
    setClientesExpandidos((prev) => ({
      ...prev,
      [cliente.cliente_key]: !prev[cliente.cliente_key],
    }));
  };

  const toggleTodos = () => {
    if (todosExpandidos) {
      setClientesExpandidos({});
      return;
    }

    const nuevo: Record<string, boolean> = {};
    clientesFiltrados.forEach((c) => {
      nuevo[c.cliente_key] = true;
    });

    setClientesExpandidos(nuevo);
  };

  const limpiarFiltros = () => {
    setDesde("");
    setHasta("");
    setClienteFiltro("");
    setCentroCostoFiltro("");
    setEstadoFiltro("");
    setBusquedaLocal("");
    setOrden("facturado");

    setTimeout(() => {
      cargarDatos("consulta");
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-slate-100 p-5 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center rounded-full border border-blue-100 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 shadow-sm">
              Reporte comercial
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
              Análisis de Clientes
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              Vista ejecutiva para analizar clientes facturados, cartera pendiente,
              pagos, centros de costo y facturas recientes.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:flex md:items-center">
            <MiniMetric
              label="Estado"
              value={loading ? "Cargando" : error ? "Con error" : "Actualizado"}
            />
            <MiniMetric
              label="Clientes"
              value={resumen?.clientes_facturados ?? 0}
            />
            <MiniMetric
              label="Facturas"
              value={resumen?.cantidad_facturas ?? 0}
            />
            <MiniMetric
              label="% vencido"
              value={`${resumen?.pct_vencido ?? 0}%`}
              danger
            />
          </div>
        </div>
      </div>

      {loading && (
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Cargando reporte de clientes…</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="rounded-2xl border-red-200 bg-red-50 shadow-sm">
          <CardContent className="p-6">
            <p className="font-medium text-red-700">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <>
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="border-b bg-white">
              <div className="flex flex-col gap-1">
                <div className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
                  Filtros del reporte
                </div>
                <CardTitle className="text-lg font-bold tracking-tight text-slate-950">
                  Consulta de clientes
                </CardTitle>
                <p className="text-sm text-slate-500">
                  Ajusta los filtros y presiona consultar. Los filtros locales no recargan el backend.
                </p>
              </div>
            </CardHeader>

            <CardContent className="p-4">
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

                <Field label="Cliente">
                  <select
                    value={clienteFiltro}
                    onChange={(e) => setClienteFiltro(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Todos</option>
                    {catalogoClientes.map((c) => (
                      <option key={String(c.id)} value={c.nombre}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Centro de costo">
                  <select
                    value={centroCostoFiltro}
                    onChange={(e) => setCentroCostoFiltro(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Todos</option>
                    {catalogoCentrosCosto.map((c) => (
                      <option key={String(c.id)} value={String(c.id)}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Estado cartera">
                  <select
                    value={estadoFiltro}
                    onChange={(e) => setEstadoFiltro(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Todos</option>
                    <option value="pagado">Pagado</option>
                    <option value="sano">Sano</option>
                    <option value="alerta">Por vencer pronto</option>
                    <option value="vencido">Vencido</option>
                  </select>
                </Field>

                <div className="flex items-end gap-2">
                  <button
                    onClick={() => cargarDatos("consulta")}
                    disabled={consultando}
                    className="h-10 flex-1 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {consultando ? "Consultando…" : "Consultar"}
                  </button>

                  <button
                    onClick={limpiarFiltros}
                    disabled={consultando}
                    className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Total facturado"
              value={resumen?.total_facturado_str}
              helper="Valor total de facturas emitidas en el periodo consultado."
              tone="blue"
            />

            <KpiCard
              title="Total pagado"
              value={resumen?.total_pagado_str}
              helper={`${resumen?.pct_pagado ?? 0}% del total facturado.`}
              tone="green"
            />

            <KpiCard
              title="Saldo pendiente"
              value={resumen?.saldo_pendiente_str}
              helper="Valor aún pendiente por recaudar."
              tone="orange"
            />

            <KpiCard
              title="Saldo vencido"
              value={resumen?.saldo_vencido_str}
              helper={`${resumen?.pct_vencido ?? 0}% del saldo pendiente.`}
              tone="red"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="rounded-2xl border-slate-200 shadow-sm xl:col-span-1">
              <CardHeader className="border-b">
                <CardTitle className="text-base font-bold">
                  Top clientes por facturación
                </CardTitle>
                <p className="text-sm text-slate-500">
                  Clientes con mayor valor facturado.
                </p>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={topFacturacion}
                    layout="vertical"
                    margin={{ top: 10, right: 25, left: 10, bottom: 10 }}
                  >
                    <XAxis
                      type="number"
                      tickFormatter={(v) => formatoAbreviado(Number(v))}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="cliente"
                      width={120}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip formatter={(v: any) => fmt(Number(v))} />
                    <Bar dataKey="total_facturado" fill="#2563eb" radius={[0, 6, 6, 0]}>
                      <LabelList
                        dataKey="total_facturado"
                        position="right"
                        formatter={(v: any) => formatoAbreviado(Number(v))}
                        fontSize={11}
                        fill="#334155"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 shadow-sm xl:col-span-1">
              <CardHeader className="border-b">
                <CardTitle className="text-base font-bold">
                  Top clientes por saldo
                </CardTitle>
                <p className="text-sm text-slate-500">
                  Clientes con mayor cartera pendiente.
                </p>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={topSaldo}
                    layout="vertical"
                    margin={{ top: 10, right: 25, left: 10, bottom: 10 }}
                  >
                    <XAxis
                      type="number"
                      tickFormatter={(v) => formatoAbreviado(Number(v))}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="cliente"
                      width={120}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip formatter={(v: any) => fmt(Number(v))} />
                    <Bar dataKey="saldo_pendiente" fill="#f97316" radius={[0, 6, 6, 0]}>
                      <LabelList
                        dataKey="saldo_pendiente"
                        position="right"
                        formatter={(v: any) => formatoAbreviado(Number(v))}
                        fontSize={11}
                        fill="#334155"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 shadow-sm xl:col-span-1">
              <CardHeader className="border-b">
                <CardTitle className="text-base font-bold">
                  Estado de facturas
                </CardTitle>
                <p className="text-sm text-slate-500">
                  Distribución de facturas por estado de cartera.
                </p>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={estadoGlobal}
                    margin={{ top: 20, right: 15, left: 5, bottom: 10 }}
                  >
                    <XAxis dataKey="estado" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                      {estadoGlobal.map((e, idx) => (
                        <Cell
                          key={idx}
                          fill={
                            e.estado === "Pagado"
                              ? "#16a34a"
                              : e.estado === "Sano"
                              ? "#2563eb"
                              : e.estado === "Alerta"
                              ? "#f97316"
                              : "#dc2626"
                          }
                        />
                      ))}
                      <LabelList dataKey="cantidad" position="top" fontSize={11} fill="#334155" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="border-b bg-white">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
                    Detalle de clientes
                  </div>

                  <CardTitle className="text-lg font-bold tracking-tight text-slate-950">
                    Clientes facturados
                  </CardTitle>

                  <p className="mt-1 text-sm text-slate-500">
                    Expande un cliente para ver centros de costo, estados y facturas recientes.
                  </p>
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <input
                    type="text"
                    value={busquedaLocal}
                    onChange={(e) => setBusquedaLocal(e.target.value)}
                    placeholder="Buscar cliente..."
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:w-64"
                  />

                  <select
                    value={orden}
                    onChange={(e) => setOrden(e.target.value as any)}
                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="facturado">Ordenar: facturación</option>
                    <option value="saldo">Ordenar: saldo pendiente</option>
                    <option value="vencido">Ordenar: saldo vencido</option>
                    <option value="facturas">Ordenar: # facturas</option>
                    <option value="nombre">Ordenar: nombre</option>
                  </select>

                  <button
                    onClick={toggleTodos}
                    className="h-10 rounded-lg bg-slate-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    {todosExpandidos ? "Contraer todos" : "Expandir todos"}
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700">
                    <tr>
                      <th className="p-3 text-left">Cliente</th>
                      <th className="p-3 text-right">Facturas</th>
                      <th className="p-3 text-right">Total facturado</th>
                      <th className="p-3 text-right">Pagado</th>
                      <th className="p-3 text-right">Saldo pendiente</th>
                      <th className="p-3 text-right">Saldo vencido</th>
                      <th className="p-3 text-right">% vencido</th>
                      <th className="p-3 text-center">Acción</th>
                    </tr>
                  </thead>

                  <tbody>
                    {clientesFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          No hay clientes para los filtros seleccionados.
                        </td>
                      </tr>
                    )}

                    {clientesFiltrados.map((c) => {
                      const expandido = !!clientesExpandidos[c.cliente_key];

                      return (
                        <Fragment key={c.cliente_key}>
                          <tr className="border-b bg-white hover:bg-slate-50">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleCliente(c)}
                                  className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
                                >
                                  {expandido ? "−" : "+"}
                                </button>

                                <div>
                                  <div className="font-semibold text-slate-900">
                                    {c.cliente}
                                  </div>

                                  <div className="text-xs text-slate-500">
                                    Última factura: {c.ultima_factura || "-"} ·{" "}
                                    {c.cantidad_centros_costo} centro(s) de costo
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="p-3 text-right font-medium">
                              {c.cantidad_facturas}
                            </td>

                            <td className="p-3 text-right font-semibold text-blue-700">
                              {c.total_facturado_str}
                            </td>

                            <td className="p-3 text-right text-green-700">
                              <div className="font-semibold">{c.total_pagado_str}</div>
                              <div className="text-[11px] text-slate-500">
                                {fmtPct(c.pct_pagado)}
                              </div>
                            </td>

                            <td className="p-3 text-right text-orange-600">
                              <div className="font-semibold">{c.saldo_pendiente_str}</div>
                              <div className="text-[11px] text-slate-500">
                                {fmtPct(c.pct_pendiente)}
                              </div>
                            </td>

                            <td className="p-3 text-right text-red-600">
                              {c.saldo_vencido_str}
                            </td>

                            <td className="p-3 text-right">
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                  c.pct_vencido > 50
                                    ? "bg-red-100 text-red-700"
                                    : c.pct_vencido > 0
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {fmtPct(c.pct_vencido)}
                              </span>
                            </td>

                            <td className="p-3 text-center">
                              <button
                                onClick={() => setClienteModal(c)}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                              >
                                Ver ficha
                              </button>
                            </td>
                          </tr>

                          {expandido && (
                            <tr className="bg-slate-50">
                              <td colSpan={8} className="p-0">
                                <ClienteDetalleInline cliente={c} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {clienteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div
                className="relative flex flex-col rounded-2xl border border-white/40 bg-white shadow-2xl"
                style={{
                  width: "min(95vw, 1180px)",
                  height: "min(90vh, 780px)",
                  minWidth: "430px",
                  minHeight: "420px",
                  maxWidth: "96vw",
                  maxHeight: "92vh",
                  resize: "both",
                  overflow: "auto",
                }}
              >
                <div className="sticky top-0 z-20 flex items-center justify-between rounded-t-2xl border-b bg-white px-4 py-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">
                      Ficha del cliente
                    </h2>
                    <p className="text-xs text-slate-500">
                      Puedes ampliar o reducir esta ventana desde la esquina inferior derecha.
                    </p>
                  </div>

                  <button
                    onClick={() => setClienteModal(null)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-4">
                  <ClienteFicha cliente={clienteModal} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ClienteDetalleInline({ cliente }: { cliente: ClienteInsight }) {
  return (
    <div className="space-y-4 border-b border-slate-200 p-4">
      <div className="grid gap-3 md:grid-cols-4">
        <MiniState label="Pagadas" value={cliente.estados.pagado} tone="green" />
        <MiniState label="Sanas" value={cliente.estados.sano} tone="blue" />
        <MiniState label="Por vencer pronto" value={cliente.estados.alerta} tone="orange" />
        <MiniState label="Vencidas" value={cliente.estados.vencido} tone="red" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <h3 className="mb-2 text-sm font-bold text-slate-900">
            Centros de costo
          </h3>

          <div className="max-h-72 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-2 text-left">Centro de costo</th>
                  <th className="p-2 text-right">Facturas</th>
                  <th className="p-2 text-right">Facturado</th>
                  <th className="p-2 text-right">Pendiente</th>
                </tr>
              </thead>

              <tbody>
                {cliente.centros_costo.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-3 text-center text-slate-500">
                      Sin centros de costo.
                    </td>
                  </tr>
                )}

                {cliente.centros_costo.map((cc, idx) => (
                  <tr key={`${cc.cost_center}-${idx}`} className="border-t">
                    <td className="p-2">{cc.centro_costo_nombre}</td>
                    <td className="p-2 text-right">{cc.cantidad_facturas}</td>
                    <td className="p-2 text-right font-semibold text-blue-700">
                      {cc.total_facturado_str}
                    </td>
                    <td className="p-2 text-right font-semibold text-orange-600">
                      {cc.saldo_pendiente_str}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <FacturasRecientesTable facturas={cliente.facturas_recientes} />
      </div>
    </div>
  );
}

function ClienteFicha({ cliente }: { cliente: ClienteInsight }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
              Cliente
            </div>

            <h2 className="text-2xl font-bold text-slate-950">
              {cliente.cliente}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {cliente.cantidad_facturas} factura(s) · {cliente.cantidad_centros_costo} centro(s) de costo · Última factura:{" "}
              {cliente.ultima_factura || "-"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
            <p className="text-xs text-slate-500">Saldo pendiente</p>
            <p className="text-xl font-bold text-orange-600">
              {cliente.saldo_pendiente_str}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard
          title="Total facturado"
          value={cliente.total_facturado_str}
          helper="Facturación total del cliente."
          tone="blue"
        />
        <KpiCard
          title="Total pagado"
          value={cliente.total_pagado_str}
          helper={`${fmtPct(cliente.pct_pagado)} del total facturado.`}
          tone="green"
        />
        <KpiCard
          title="Saldo pendiente"
          value={cliente.saldo_pendiente_str}
          helper={`${fmtPct(cliente.pct_pendiente)} del total facturado.`}
          tone="orange"
        />
        <KpiCard
          title="Saldo vencido"
          value={cliente.saldo_vencido_str}
          helper={`${fmtPct(cliente.pct_vencido)} del saldo pendiente.`}
          tone="red"
        />
      </div>

      <ClienteDetalleInline cliente={cliente} />
    </div>
  );
}

function FacturasRecientesTable({ facturas }: { facturas: FacturaCliente[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <h3 className="mb-2 text-sm font-bold text-slate-900">
        Facturas recientes
      </h3>

      <div className="max-h-72 overflow-auto">
        <table className="w-full min-w-[720px] text-xs">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-2 text-left">Factura</th>
              <th className="p-2 text-left">Fecha</th>
              <th className="p-2 text-left">Vencimiento</th>
              <th className="p-2 text-left">Estado</th>
              <th className="p-2 text-right">Total</th>
              <th className="p-2 text-right">Pendiente</th>
              <th className="p-2 text-center">Link</th>
            </tr>
          </thead>

          <tbody>
            {facturas.length === 0 && (
              <tr>
                <td colSpan={7} className="p-3 text-center text-slate-500">
                  Sin facturas recientes.
                </td>
              </tr>
            )}

            {facturas.map((f, idx) => (
              <tr key={`${f.idfactura}-${idx}`} className="border-t hover:bg-slate-50">
                <td className="p-2 font-medium whitespace-nowrap">{f.idfactura}</td>
                <td className="p-2 whitespace-nowrap">{f.fecha || "-"}</td>
                <td className="p-2 whitespace-nowrap">{f.vencimiento || "-"}</td>
                <td className="p-2 whitespace-nowrap">
                  <EstadoBadge estado={f.estado_cartera} />
                </td>
                <td className="p-2 text-right whitespace-nowrap font-semibold text-blue-700">
                  {f.total_str}
                </td>
                <td className="p-2 text-right whitespace-nowrap font-semibold text-orange-600">
                  {f.pendiente_str}
                </td>
                <td className="p-2 text-center">
                  {f.public_url ? (
                    <a
                      href={f.public_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      Ver
                    </a>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
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

function MiniState({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "blue" | "orange" | "red";
}) {
  const cls: Record<string, string> = {
    green: "bg-green-50 text-green-700 border-green-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    red: "bg-red-50 text-red-700 border-red-100",
  };

  return (
    <div className={`rounded-xl border px-3 py-2 shadow-sm ${cls[tone]}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-lg font-bold">{value}</p>
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
  tone?: "slate" | "blue" | "green" | "orange" | "red";
}) {
  const toneMap: Record<string, string> = {
    slate: "text-slate-900 bg-slate-50 border-slate-200",
    blue: "text-blue-700 bg-blue-50 border-blue-100",
    green: "text-green-700 bg-green-50 border-green-100",
    orange: "text-orange-700 bg-orange-50 border-orange-100",
    red: "text-red-700 bg-red-50 border-red-100",
  };

  return (
    <Card className={`rounded-2xl border ${toneMap[tone]} shadow-sm transition hover:shadow-md`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-bold">{value ?? "-"}</p>
        {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
      </CardContent>
    </Card>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const labelMap: Record<string, string> = {
    pagado: "Pagado",
    sano: "Sano",
    alerta: "Por vencer",
    vencido: "Vencido",
  };

  const cls =
    estado === "pagado"
      ? "bg-green-50 text-green-700 border-green-100"
      : estado === "sano"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : estado === "alerta"
      ? "bg-orange-50 text-orange-700 border-orange-100"
      : "bg-red-50 text-red-700 border-red-100";

  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${cls}`}>
      {labelMap[estado] || estado}
    </span>
  );
}

function fmt(n: any) {
  const value = Number(n || 0);
  return `$ ${value.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}

function fmtPct(n: any) {
  const value = Number(n || 0);
  return `${value.toLocaleString("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function formatoAbreviado(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${Math.round(n)}`;
}

function cortarTexto(texto: string, max = 24) {
  if (!texto) return "";
  if (texto.length <= max) return texto;
  return `${texto.slice(0, max)}…`;
}