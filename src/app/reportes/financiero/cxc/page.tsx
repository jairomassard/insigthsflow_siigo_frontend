"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
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
  cliente_key?: string;
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
  aging_bucket?: string;
};

type Cliente = {
  cliente_nombre: string;
  cliente_key?: string;
  centro_costo_nombre?: string;
  vendedor_nombre?: string;
  num_facturas?: number;
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

type ProyeccionFactura = {
  idfactura: string;
  cliente_nombre: string;
  cliente_key?: string;
  fecha?: string;
  vencimiento?: string;
  saldo: number;
  public_url: string | null;
  dias_vencidos: number;
  dias_transcurridos?: number;
};

type Proyeccion = {
  fecha: string;
  total: number;
  total_str: string;
  vencido: boolean;
  facturas: ProyeccionFactura[];
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
  const [clientesExpandidos, setClientesExpandidos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await authFetch("/reportes/cuentas-por-cobrar?detalle=1");
        if (res.error) throw new Error(res.error);

        const detalle: FacturaDetalle[] = res.detalle || [];

        const clientesMapeados: Cliente[] = (res.consolidado || []).map((c: any) => {
          const clienteKey = c.cliente_key || normalizarCliente(c.cliente_nombre);

          return {
            ...c,
            cliente_key: clienteKey,
            facturas: detalle.filter((d: any) => {
              const detalleKey = d.cliente_key || normalizarCliente(d.cliente_nombre);
              return detalleKey === clienteKey;
            }),
          };
        });

        setResumen(res.resumen_global || {});
        setClientes(clientesMapeados);
        setProyeccion(res.proyeccion_por_fecha || []);
      } catch (e: any) {
        setError(e.message || "Error cargando el reporte de cartera");
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

    const diasMax = Math.max(...entry.facturas.map((f) => Number(f.dias_vencidos ?? 0)));

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

  const todosExpandidos = useMemo(() => {
    return (
      clientes.length > 0 &&
      clientes.every((c) => clientesExpandidos[c.cliente_key || normalizarCliente(c.cliente_nombre)])
    );
  }, [clientes, clientesExpandidos]);

  const toggleClienteTabla = (cliente: Cliente) => {
    const key = cliente.cliente_key || normalizarCliente(cliente.cliente_nombre);

    setClientesExpandidos((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleTodosClientes = () => {
    if (todosExpandidos) {
      setClientesExpandidos({});
      return;
    }

    const nuevoEstado: Record<string, boolean> = {};

    clientes.forEach((c) => {
      const key = c.cliente_key || normalizarCliente(c.cliente_nombre);
      nuevoEstado[key] = true;
    });

    setClientesExpandidos(nuevoEstado);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-blue-200">
              InsightFlow · Financiero
            </p>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">
              Reporte de Cuentas por Cobrar
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Análisis de cartera por vencimiento, cliente y factura. Usa la tabla de aging
              para revisar la deuda resumida y expande cada cliente para ver el detalle.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-right backdrop-blur">
            <p className="text-xs text-blue-100">Estado del reporte</p>
            <p className="text-lg font-semibold">
              {loading ? "Cargando..." : error ? "Con error" : "Actualizado"}
            </p>
          </div>
        </div>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">Cargando datos…</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="font-medium text-red-700">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <KpiCard
              title="Facturas vivas"
              value={resumen.facturas_vivas ?? 0}
              tone="slate"
              helper="Facturas con saldo pendiente."
            />

            <KpiCard
              title="Total CxC"
              value={resumen.total_global}
              tone="blue"
              helper="Saldo total pendiente de recaudo."
            />

            <KpiCard
              title="Total vencido"
              value={resumen.total_vencido}
              tone="red"
              helper="Cartera que ya pasó su fecha de vencimiento."
            />

            <KpiCard
              title="% vencido"
              value={`${resumen.pct_vencido ?? 0}%`}
              tone="orange"
              helper="Participación del vencido sobre el total de cartera."
            />
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            <KpiCard
              title="Por vencer"
              value={resumen.total_por_vencer}
              tone="green"
              helper="Cartera aún no vencida."
            />

            <KpiCard
              title="Vencido 1-30"
              value={fmt(resumen.total_1_30)}
              tone="rose"
              helper="Cartera vencida hasta 30 días."
            />

            <KpiCard
              title="Vencido 31-60"
              value={fmt(resumen.total_31_60)}
              tone="red"
              helper="Cartera vencida entre 31 y 60 días."
            />

            <KpiCard
              title="Vencido 61-90"
              value={fmt(resumen.total_61_90)}
              tone="redDark"
              helper="Cartera vencida entre 61 y 90 días."
            />

            <KpiCard
              title="Vencido 91+"
              value={fmt(resumen.total_91_mas)}
              tone="redDeep"
              helper="Cartera vencida por más de 90 días."
            />
          </div>

          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <CardHeader className="border-b bg-white">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Proyección de cobros por fecha
                  </CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    Haz clic sobre una barra para ver las facturas que vencen ese día.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <LegendPill colorClass="bg-green-600" label="Por vencer" />
                  <LegendPill colorClass="bg-rose-400" label="1-30" />
                  <LegendPill colorClass="bg-red-500" label="31-60" />
                  <LegendPill colorClass="bg-red-600" label="61-90" />
                  <LegendPill colorClass="bg-red-800" label="91+" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={proyeccion} margin={{ top: 24, right: 18, left: 8, bottom: 16 }}>
                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `$${(Number(v) / 1_000_000).toFixed(0)}M`}
                    />

                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || payload.length === 0) return null;

                        const entry = payload[0].payload as Proyeccion;
                        const rango = obtenerRangoBarra(entry);
                        const totalFormatted = entry.total_str;

                        return (
                          <div className="rounded-lg border bg-white p-3 text-sm shadow-lg">
                            {rango && (
                              <div className="mb-1 font-semibold text-slate-700">
                                {rango}
                              </div>
                            )}

                            <div>
                              <strong>Vencimiento:</strong> {label}
                            </div>

                            <div>
                              <strong>Total:</strong> {totalFormatted}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {entry.facturas?.length || 0} factura(s). Clic para ver detalle.
                            </div>
                          </div>
                        );
                      }}
                    />

                    <Bar
                      dataKey="total"
                      radius={[7, 7, 0, 0]}
                      cursor="pointer"
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
                            ...entry.facturas.map((f) => Number(f.dias_vencidos ?? 0))
                          );
                        }

                        let color = "#16a34a";

                        if (entry.vencido) {
                          if (diasMax <= 30) color = "#fb7185";
                          else if (diasMax <= 60) color = "#ef4444";
                          else if (diasMax <= 90) color = "#dc2626";
                          else color = "#991b1b";
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
                            displayValue = `${(v / 1_000_000_000).toFixed(1)}B`;
                          } else if (v >= 1_000_000) {
                            displayValue = `${(v / 1_000_000).toFixed(0)}M`;
                          } else if (v >= 1_000) {
                            displayValue = `${(v / 1_000).toFixed(0)}K`;
                          } else {
                            displayValue = v.toString();
                          }

                          return (
                            <text
                              x={x}
                              y={y}
                              dy={-4}
                              fill="#334155"
                              fontSize={11}
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
              </div>

              {selectedBar && (
                <div className="mt-4 rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      {obtenerRangoBarra(selectedBar) && (
                        <p className="text-sm font-semibold text-slate-700">
                          {obtenerRangoBarra(selectedBar)}
                        </p>
                      )}

                      <p className="font-semibold text-slate-900">
                        Vencimiento: {selectedBar.fecha}
                      </p>

                      <p className="text-sm font-bold text-green-700">
                        Total día: {selectedBar.total_str}
                      </p>

                      <p className="text-xs text-slate-500">
                        {selectedBar.facturas?.length || 0} factura(s) asociada(s) a esta fecha.
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedBar(null)}
                      className="rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-600"
                    >
                      Cerrar detalle
                    </button>
                  </div>

                  <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
                    <table className="w-full min-w-[860px] text-sm">
                      <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700">
                        <tr>
                          <th className="p-2 text-left">Cliente</th>
                          <th className="p-2 text-left">Factura</th>
                          <th className="p-2 text-left">Fecha factura</th>
                          <th className="p-2 text-left">Vencimiento</th>
                          <th className="p-2 text-right">Días vencidos</th>
                          <th className="p-2 text-right">Saldo</th>
                          <th className="p-2 text-center">Link</th>
                        </tr>
                      </thead>

                      <tbody>
                        {[...(selectedBar.facturas || [])]
                          .sort((a, b) => Number(b.saldo || 0) - Number(a.saldo || 0))
                          .map((f, idx) => (
                            <tr key={`${f.idfactura}-${idx}`} className="border-t hover:bg-slate-50">
                              <td className="p-2 font-medium">{f.cliente_nombre}</td>
                              <td className="p-2 whitespace-nowrap">{f.idfactura}</td>
                              <td className="p-2 whitespace-nowrap">{f.fecha || "-"}</td>
                              <td className="p-2 whitespace-nowrap">{f.vencimiento || selectedBar.fecha}</td>
                              <td className="p-2 text-right whitespace-nowrap">
                                {Number(f.dias_vencidos || 0) <= 0
                                  ? "No vencida"
                                  : fmtDias(f.dias_vencidos)}
                              </td>
                              <td className="p-2 text-right font-semibold whitespace-nowrap">
                                {fmt(f.saldo)}
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
              )}

              <div className="mt-6">
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Tabla de aging por cliente
                    </h2>
                    <p className="text-sm text-slate-500">
                      La fila principal muestra el resumen; el botón + despliega las facturas del cliente.
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    {mostrarTabla && (
                      <button
                        onClick={toggleTodosClientes}
                        className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                      >
                        {todosExpandidos ? "Contraer todos" : "Expandir todos"}
                      </button>
                    )}

                    <button
                      onClick={() => setMostrarTabla((prev) => !prev)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                    >
                      {mostrarTabla ? "Ocultar tabla de aging" : "Mostrar tabla de aging"}
                    </button>
                  </div>
                </div>

                {mostrarTabla && (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                    <table className="w-full min-w-[1120px] text-sm">
                      <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700">
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
                        {clientes.map((c, i) => {
                          const key = c.cliente_key || normalizarCliente(c.cliente_nombre);
                          const expandido = !!clientesExpandidos[key];

                          const facturasOrdenadasCliente = [...(c.facturas || [])].sort(
                            (a: FacturaDetalle, b: FacturaDetalle) => {
                              const diasB = Number(b.dias_vencidos || 0);
                              const diasA = Number(a.dias_vencidos || 0);

                              if (diasB !== diasA) return diasB - diasA;
                              return Number(b.saldo || 0) - Number(a.saldo || 0);
                            }
                          );

                          return (
                            <Fragment key={`${key}-${i}`}>
                              <tr
                                className={`border-b bg-white hover:bg-slate-50 ${
                                  c.total === 0 ? "text-slate-400" : ""
                                }`}
                              >
                                <td className="p-2 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => toggleClienteTabla(c)}
                                      className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
                                      title={expandido ? "Contraer facturas" : "Expandir facturas"}
                                    >
                                      {expandido ? "−" : "+"}
                                    </button>

                                    <div>
                                      <div className="font-medium text-slate-900">
                                        {c.cliente_nombre}
                                      </div>
                                      <div className="text-[11px] text-slate-500">
                                        {c.facturas?.length || 0} factura(s)
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <AgingValueCell
                                  value={c.aging.por_vencer}
                                  total={totalPorVencer}
                                  colorClass="text-green-600"
                                />

                                <AgingValueCell
                                  value={c.aging["1_30"]}
                                  total={total1_30}
                                  colorClass="text-orange-500"
                                />

                                <AgingValueCell
                                  value={c.aging["31_60"]}
                                  total={total31_60}
                                  colorClass="text-orange-600"
                                />

                                <AgingValueCell
                                  value={c.aging["61_90"]}
                                  total={total61_90}
                                  colorClass="text-red-600"
                                />

                                <AgingValueCell
                                  value={c.aging["91_mas"]}
                                  total={total91Mas}
                                  colorClass="text-red-800"
                                />

                                <td className="p-2 text-right font-semibold">
                                  <div>{fmt(c.total)}</div>
                                  <div className="text-[11px] text-slate-500">
                                    {fmtPct(pct(c.total, totalGeneral))}
                                  </div>
                                </td>
                              </tr>

                              {expandido && (
                                <tr className="bg-slate-50">
                                  <td colSpan={7} className="p-0">
                                    <div className="border-b border-slate-200 px-4 py-3">
                                      <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                        <div>
                                          <p className="text-sm font-semibold text-slate-800">
                                            Facturas abiertas de {c.cliente_nombre}
                                          </p>
                                          <p className="text-xs text-slate-500">
                                            Detalle por factura, vencimiento, edad de cartera, días transcurridos y enlace.
                                          </p>
                                        </div>

                                        <div className="rounded-lg bg-white px-3 py-2 text-right text-xs text-slate-600 shadow-sm">
                                          <div>Total cliente</div>
                                          <div className="font-bold text-slate-900">{fmt(c.total)}</div>
                                        </div>
                                      </div>

                                      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                        <table className="w-full min-w-[980px] text-xs">
                                          <thead className="bg-slate-100 text-slate-700">
                                            <tr>
                                              <th className="p-2 text-left">Factura</th>
                                              <th className="p-2 text-left">Fecha factura</th>
                                              <th className="p-2 text-left">Vencimiento</th>
                                              <th className="p-2 text-left">Edad</th>
                                              <th className="p-2 text-right">Días transc.</th>
                                              <th className="p-2 text-right">Días vencidos</th>
                                              <th className="p-2 text-right">Saldo</th>
                                              <th className="p-2 text-center">Factura</th>
                                            </tr>
                                          </thead>

                                          <tbody>
                                            {facturasOrdenadasCliente.length === 0 && (
                                              <tr>
                                                <td colSpan={8} className="p-4 text-center text-slate-500">
                                                  No hay facturas de detalle para este cliente.
                                                </td>
                                              </tr>
                                            )}

                                            {facturasOrdenadasCliente.map((f: FacturaDetalle, idx: number) => {
                                              const diasVencidos = Number(f.dias_vencidos || 0);
                                              const rango = f.aging_bucket || calcularRango(diasVencidos);

                                              return (
                                                <tr
                                                  key={`${f.idfactura}-${idx}`}
                                                  className="border-t hover:bg-slate-50"
                                                >
                                                  <td className="p-2 font-medium whitespace-nowrap">
                                                    {f.idfactura}
                                                  </td>

                                                  <td className="p-2 whitespace-nowrap">
                                                    {f.fecha}
                                                  </td>

                                                  <td className="p-2 whitespace-nowrap">
                                                    {f.vencimiento}
                                                  </td>

                                                  <td className="p-2 whitespace-nowrap">
                                                    <AgingBadge rango={rango} />
                                                  </td>

                                                  <td className="p-2 text-right whitespace-nowrap">
                                                    {fmtDias(f.dias_transcurridos)}
                                                  </td>

                                                  <td className="p-2 text-right whitespace-nowrap">
                                                    {diasVencidos <= 0 ? "No vencida" : fmtDias(diasVencidos)}
                                                  </td>

                                                  <td className="p-2 text-right font-semibold whitespace-nowrap">
                                                    {f.saldo_str || fmt(f.saldo)}
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
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}

                        <tr className="border-t-2 border-slate-300 bg-slate-100 font-semibold">
                          <td className="p-2 text-left">Totales</td>

                          <td className="p-2 text-right text-green-600">
                            <div>{fmt(totalPorVencer)}</div>
                            <div className="text-[11px] text-slate-500">100,0%</div>
                          </td>

                          <td className="p-2 text-right text-orange-500">
                            <div>{fmt(total1_30)}</div>
                            <div className="text-[11px] text-slate-500">100,0%</div>
                          </td>

                          <td className="p-2 text-right text-orange-600">
                            <div>{fmt(total31_60)}</div>
                            <div className="text-[11px] text-slate-500">100,0%</div>
                          </td>

                          <td className="p-2 text-right text-red-600">
                            <div>{fmt(total61_90)}</div>
                            <div className="text-[11px] text-slate-500">100,0%</div>
                          </td>

                          <td className="p-2 text-right text-red-800">
                            <div>{fmt(total91Mas)}</div>
                            <div className="text-[11px] text-slate-500">100,0%</div>
                          </td>

                          <td className="p-2 text-right font-bold">
                            <div>{fmt(totalGeneral)}</div>
                            <div className="text-[11px] text-slate-500">100,0%</div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {selectedCliente && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div
                className="relative flex flex-col rounded-2xl border border-white/40 bg-white shadow-2xl"
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
                <div className="sticky top-0 z-20 flex items-center justify-between rounded-t-2xl border-b bg-white px-4 py-3">
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

                <div className="flex-1 overflow-auto p-4">
                  <ClienteCard cliente={selectedCliente} ampliado />
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clientes.map((cliente, idx) => (
              <ClienteCard
                key={`${cliente.cliente_key || cliente.cliente_nombre}-${idx}`}
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

function KpiCard({
  title,
  value,
  helper,
  tone = "slate",
}: {
  title: string;
  value: any;
  helper?: string;
  tone?: "slate" | "blue" | "green" | "orange" | "rose" | "red" | "redDark" | "redDeep";
}) {
  const toneMap: Record<string, string> = {
    slate: "text-slate-900 bg-slate-50 border-slate-200",
    blue: "text-blue-700 bg-blue-50 border-blue-100",
    green: "text-green-700 bg-green-50 border-green-100",
    orange: "text-orange-600 bg-orange-50 border-orange-100",
    rose: "text-rose-600 bg-rose-50 border-rose-100",
    red: "text-red-600 bg-red-50 border-red-100",
    redDark: "text-red-700 bg-red-50 border-red-100",
    redDeep: "text-red-900 bg-red-50 border-red-100",
  };

  return (
    <Card className={`border ${toneMap[tone]} shadow-sm`}>
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

function LegendPill({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-600">
      <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
      {label}
    </span>
  );
}

function AgingValueCell({
  value,
  total,
  colorClass,
}: {
  value: number;
  total: number;
  colorClass: string;
}) {
  return (
    <td className={`p-2 text-right ${colorClass}`}>
      <div>{fmt(value)}</div>
      <div className="text-[11px] text-slate-500">
        {fmtPct(pct(value, total))}
      </div>
    </td>
  );
}

function AgingBadge({ rango }: { rango: string }) {
  const styles =
    rango === "Por vencer"
      ? "bg-green-50 text-green-700 border-green-100"
      : rango === "1-30"
      ? "bg-orange-50 text-orange-700 border-orange-100"
      : rango === "31-60"
      ? "bg-red-50 text-red-600 border-red-100"
      : rango === "61-90"
      ? "bg-red-100 text-red-700 border-red-200"
      : "bg-red-200 text-red-900 border-red-300";

  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${styles}`}>
      {rango}
    </span>
  );
}

function ClienteCard({
  cliente,
  onAmpliar,
  ampliado = false,
}: {
  cliente: Cliente;
  onAmpliar?: () => void;
  ampliado?: boolean;
}) {
  const [ordenFacturas, setOrdenFacturas] = useState<"fecha" | "vencimiento" | "saldo">(
    "fecha"
  );

  const facturasOrdenadas = [...(cliente.facturas || [])].sort(
    (a: FacturaDetalle, b: FacturaDetalle) => {
      if (ordenFacturas === "vencimiento") {
        const diasA = Number(a.dias_vencidos ?? 0);
        const diasB = Number(b.dias_vencidos ?? 0);

        if (diasB !== diasA) return diasB - diasA;

        return parseFecha(a.vencimiento) - parseFecha(b.vencimiento);
      }

      if (ordenFacturas === "saldo") {
        return Number(b.saldo || 0) - Number(a.saldo || 0);
      }

      return parseFecha(b.fecha) - parseFecha(a.fecha);
    }
  );

  return (
    <Card className={`h-full shadow-md ${ampliado ? "border-0 shadow-none" : ""}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{cliente.cliente_nombre}</CardTitle>
            <div className="mt-1 text-sm text-gray-600">
              Total: <b>{cliente.total_str || fmt(cliente.total)}</b>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {cliente.facturas?.length || 0} factura(s) abierta(s)
            </div>
          </div>

          {onAmpliar && (
            <button
              onClick={onAmpliar}
              className="rounded bg-slate-700 px-3 py-1 text-sm text-white transition hover:bg-slate-800"
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
            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
            <YAxis hide />
            <Tooltip formatter={(v: number) => fmt(Number(v))} />

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
                  fill={["#16a34a", "#fb7185", "#ef4444", "#dc2626", "#991b1b"][i]}
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
                    displayValue = `${(v / 1_000_000_000).toFixed(1)}B`;
                  } else if (v >= 1_000_000) {
                    displayValue = `${(v / 1_000_000).toFixed(0)}M`;
                  } else if (v >= 1_000) {
                    displayValue = `${(v / 1_000).toFixed(0)}K`;
                  } else {
                    displayValue = v.toString();
                  }

                  return (
                    <text
                      x={x}
                      y={y}
                      dy={-4}
                      fill="#334155"
                      fontSize={11}
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

        <Accordion
          type="single"
          collapsible
          className="mt-4"
          defaultValue={ampliado ? "facturas" : undefined}
        >
          <AccordionItem value="facturas">
            <AccordionTrigger className="text-sm font-medium">
              Ver detalle de facturas
            </AccordionTrigger>

            <AccordionContent>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-700">Ordenar por:</span>

                <div className="flex flex-wrap gap-2">
                  <OrderButton
                    active={ordenFacturas === "fecha"}
                    onClick={() => setOrdenFacturas("fecha")}
                  >
                    Fecha
                  </OrderButton>

                  <OrderButton
                    active={ordenFacturas === "vencimiento"}
                    onClick={() => setOrdenFacturas("vencimiento")}
                  >
                    Vencimiento
                  </OrderButton>

                  <OrderButton
                    active={ordenFacturas === "saldo"}
                    onClick={() => setOrdenFacturas("saldo")}
                  >
                    Saldo
                  </OrderButton>
                </div>
              </div>

              <div className={`${ampliado ? "max-h-none" : "max-h-[420px]"} overflow-auto`}>
                <table className="w-full min-w-[920px] border-collapse text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-100">
                      <th className="p-2 text-left">Factura</th>
                      <th className="p-2 text-left">Fecha</th>
                      <th className="p-2 text-left">Vencimiento</th>
                      <th className="p-2 text-left">Rango</th>
                      <th className="p-2 text-right">Días transc.</th>
                      <th className="p-2 text-right">Días vencidos</th>
                      <th className="p-2 text-right">Saldo</th>
                      <th className="p-2">Link</th>
                    </tr>
                  </thead>

                  <tbody>
                    {facturasOrdenadas.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-4 text-center text-slate-500">
                          No hay facturas abiertas para este cliente.
                        </td>
                      </tr>
                    )}

                    {facturasOrdenadas.map((f: FacturaDetalle, i: number) => {
                      const diasVencidos = Number(f.dias_vencidos || 0);
                      const rango = f.aging_bucket || calcularRango(diasVencidos);
                      const diasTranscurridos = f.dias_transcurridos ?? 0;

                      return (
                        <tr
                          key={`${f.idfactura}-${i}`}
                          className={`border-b hover:bg-slate-50 ${
                            rango !== "Por vencer" ? "text-red-600" : ""
                          }`}
                        >
                          <td className="p-2 whitespace-nowrap">{f.idfactura}</td>
                          <td className="p-2 whitespace-nowrap">{f.fecha}</td>
                          <td className="p-2 whitespace-nowrap">{f.vencimiento}</td>
                          <td className="p-2 whitespace-nowrap">
                            <AgingBadge rango={rango} />
                          </td>
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
                          <td className="p-2 text-right whitespace-nowrap">
                            {diasVencidos <= 0 ? "No vencida" : fmtDias(diasVencidos)}
                          </td>
                          <td className="p-2 text-right whitespace-nowrap font-semibold">
                            {f.saldo_str || fmt(f.saldo)}
                          </td>
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

function OrderButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-3 py-1 text-sm transition ${
        active
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function fmt(n: any) {
  if (typeof n === "number") {
    return `$ ${n.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
  }

  if (typeof n === "string") return n;

  return "$ 0";
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

function normalizarCliente(nombre: string) {
  return (nombre || "")
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ");
}

function calcularRango(diasVencidos: number) {
  if (diasVencidos <= 0) return "Por vencer";
  if (diasVencidos <= 30) return "1-30";
  if (diasVencidos <= 60) return "31-60";
  if (diasVencidos <= 90) return "61-90";
  return "91+";
}

function parseFecha(valor: any) {
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
  return Number.isNaN(intento) ? 0 : intento;
}