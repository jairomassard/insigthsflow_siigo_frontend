"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ComposedChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { authFetch } from "@/lib/api";

// Vista "año contra año" de Ingresos por Ventas.
// No tiene lógica de cálculo propia: consulta /reportes/facturas_enriquecidas
// dos veces (rango actual y el mismo rango corrido al año elegido) con los
// mismos filtros, así las cifras del período actual cuadran por construcción
// con la vista normal. Pagado/Pendiente se omiten a propósito: el saldo del
// año anterior es el de hoy, no el que tenía en su momento, y compararlo
// engañaría.

type Metrica = "subtotal" | "total_facturado" | "notas_credito";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const COLOR_ACTUAL = "#4f46e5";
const COLOR_COMPARADO = "#f59e0b";
const COLOR_VARIACION = "#0f766e";

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

const fmtPct = (n: number) =>
  `${n > 0 ? "+" : ""}${n.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const toNum = (v: any) => Number(v || 0);

// Mismo formato abreviado de las etiquetas de barra de la vista normal (page.tsx).
function abreviar(valor: number): string {
  const n = Number(valor || 0);
  const abs = Math.abs(n);

  if (abs >= 1_000_000) {
    return `${(n / 1_000_000).toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  }
  if (abs >= 1_000) {
    return `${(n / 1_000).toLocaleString("es-CO", { maximumFractionDigits: 0 })}K`;
  }
  return `${Math.round(n).toLocaleString("es-CO")}`;
}

const pad =(n: number) => String(n).padStart(2, "0");

const ultimoDiaMes = (y: number, m: number) => new Date(y, m, 0).getDate();

// Corre una fecha YYYY-MM-DD n años. Si el día no existe en el año destino
// (29 de febrero en año no bisiesto) se ajusta al último día del mes.
function correrAnios(ymd: string, offset: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const ny = y + offset;
  const nd = Math.min(d, ultimoDiaMes(ny, m));
  return `${ny}-${pad(m)}-${pad(nd)}`;
}

function mesesDelRango(desde: string, hasta: string) {
  const [y1, m1] = desde.split("-").map(Number);
  const [y2, m2] = hasta.split("-").map(Number);
  const out: { y: number; m: number }[] = [];

  let y = y1;
  let m = m1;
  while (y < y2 || (y === y2 && m <= m2)) {
    out.push({ y, m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

function etiquetaAnios(desde: string, hasta: string) {
  const a = desde.slice(0, 4);
  const b = hasta.slice(0, 4);
  return a === b ? a : `${a}–${b}`;
}

function fechaCorta(ymd: string, conAnio: boolean) {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${MESES[m - 1].toLowerCase()}${conAnio ? ` ${y}` : ""}`;
}

function variacion(actual: number, comparado: number) {
  const dif = actual - comparado;
  const pct = comparado !== 0 ? (dif / Math.abs(comparado)) * 100 : null;
  return { dif, pct };
}

type PeriodoData = {
  kpis: Record<string, any>;
  series: any[];
  top_clientes: any[];
};

export default function ComparativoAnual({
  desde,
  hasta,
  anioComparar,
  sellerId,
  costCenter,
  clienteSel,
  incluyeImpuesto,
  incluyeNotaCredito,
}: {
  desde: string;
  hasta: string;
  anioComparar: number;
  sellerId: string;
  costCenter: string;
  clienteSel: string;
  incluyeImpuesto: boolean;
  incluyeNotaCredito: boolean;
}) {
  const [actual, setActual] = useState<PeriodoData | null>(null);
  const [comparado, setComparado] = useState<PeriodoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [metrica, setMetrica] = useState<Metrica>("subtotal");

  const rangoValido = Boolean(desde && hasta && desde <= hasta);
  const offset = rangoValido ? anioComparar - Number(desde.slice(0, 4)) : 0;
  const desdeB = rangoValido ? correrAnios(desde, offset) : "";
  const hastaB = rangoValido ? correrAnios(hasta, offset) : "";

  const labelA = rangoValido ? etiquetaAnios(desde, hasta) : "";
  const labelB = rangoValido ? etiquetaAnios(desdeB, hastaB) : "";
  const cruzaAnio = rangoValido && desde.slice(0, 4) !== hasta.slice(0, 4);

  useEffect(() => {
    if (!rangoValido || offset === 0) return;

    const fetchPeriodo = async (d: string, h: string): Promise<PeriodoData> => {
      const qs = new URLSearchParams();
      qs.set("desde", d);
      qs.set("hasta", h);
      if (sellerId) qs.set("seller_id", sellerId);
      if (costCenter) qs.set("cost_center", costCenter);
      if (clienteSel) qs.set("cliente", clienteSel);
      qs.set("incluye_impuesto", incluyeImpuesto ? "1" : "0");
      qs.set("incluye_nota_credito", incluyeNotaCredito ? "1" : "0");
      // Solo se usan kpis/series/top_clientes; el detalle de facturas no hace falta.
      qs.set("limit", "1");

      const res = await authFetch(`/reportes/facturas_enriquecidas?${qs.toString()}`);
      if (res?.error) throw new Error(res.error);

      return {
        kpis: res.kpis || {},
        series: Array.isArray(res.series) ? res.series : [],
        top_clientes: Array.isArray(res.top_clientes) ? res.top_clientes : [],
      };
    };

    let cancelado = false;

    const cargar = async () => {
      setLoading(true);
      setErr("");
      try {
        const [a, b] = await Promise.all([fetchPeriodo(desde, hasta), fetchPeriodo(desdeB, hastaB)]);
        if (cancelado) return;
        setActual(a);
        setComparado(b);
      } catch (e: any) {
        if (!cancelado) setErr(e.message || "Error cargando el comparativo");
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    cargar();
    return () => {
      cancelado = true;
    };
  }, [desde, hasta, desdeB, hastaB, offset, rangoValido, sellerId, costCenter, clienteSel, incluyeImpuesto, incluyeNotaCredito]);

  const filas = useMemo(() => {
    if (!actual || !comparado || !rangoValido) return [];

    const porMes = (series: any[]) => {
      const map: Record<string, any> = {};
      series.forEach((s) => {
        const key = String(s.periodo || "").slice(0, 7);
        if (key) map[key] = s;
      });
      return map;
    };

    const mapA = porMes(actual.series);
    const mapB = porMes(comparado.series);
    const meses = mesesDelRango(desde, hasta);
    const diaDesde = Number(desde.slice(8, 10));
    const diaHasta = Number(hasta.slice(8, 10));

    let acumA = 0;
    let acumB = 0;

    return meses.map(({ y, m }, i) => {
      const a = toNum(mapA[`${y}-${pad(m)}`]?.[metrica]);
      const b = toNum(mapB[`${y + offset}-${pad(m)}`]?.[metrica]);
      acumA += a;
      acumB += b;

      // Marca meses incompletos para que no se lean como mes completo.
      let parcial = "";
      if (i === 0 && diaDesde > 1) parcial = `desde el ${diaDesde}`;
      if (i === meses.length - 1 && diaHasta < ultimoDiaMes(y, m)) {
        parcial = parcial ? `${diaDesde}–${diaHasta}` : `hasta el ${diaHasta}`;
      }

      const { dif, pct } = variacion(a, b);

      return {
        label: `${MESES[m - 1]}${cruzaAnio ? ` ${String(y).slice(2)}` : ""}`,
        parcial,
        a,
        b,
        dif,
        pct,
        acumA,
        acumB,
      };
    });
  }, [actual, comparado, metrica, desde, hasta, offset, rangoValido, cruzaAnio]);

  if (!rangoValido) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm">
        Selecciona un rango de fechas válido (Desde y Hasta) para comparar.
      </div>
    );
  }

  const rangoTexto = `${fechaCorta(desde, cruzaAnio)} – ${fechaCorta(hasta, cruzaAnio)}`;
  const rangoTextoB = `${fechaCorta(desdeB, true)} – ${fechaCorta(hastaB, true)}`;

  const kA = actual?.kpis || {};
  const kB = comparado?.kpis || {};
  const ncAbs = (k: Record<string, any>) =>
    k.notas_credito_abs !== undefined ? toNum(k.notas_credito_abs) : Math.abs(toNum(k.notas_credito));

  const ventasA = toNum(kA.subtotal);
  const ventasB = toNum(kB.subtotal);
  const resumen = variacion(ventasA, ventasB);
  const sinDatosComparado = comparado !== null && comparado.series.length === 0;

  const metricaLabel: Record<Metrica, string> = {
    subtotal: incluyeImpuesto ? "Ventas netas con impuesto" : "Ventas netas sin impuesto",
    total_facturado: "Facturas emitidas",
    notas_credito: "Notas crédito",
  };

  const totalA = filas.reduce((s, f) => s + f.a, 0);
  const totalB = filas.reduce((s, f) => s + f.b, 0);
  const totalVar = variacion(totalA, totalB);
  const metricaInversa = metrica === "notas_credito";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-5 shadow-sm">
        <div className="mb-3 inline-flex items-center rounded-full border border-indigo-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-600 shadow-sm">
          Modo comparativo
        </div>

        <h2 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
          <span style={{ color: COLOR_ACTUAL }}>{labelA}</span>
          <span className="text-slate-400">vs</span>
          <span style={{ color: COLOR_COMPARADO }}>{labelB}</span>
          <span className="text-base font-semibold text-slate-500">· {rangoTexto}</span>
        </h2>

        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-600">
          Se comparan las ventas del período mostrado ({rangoTexto}{cruzaAnio ? "" : ` ${labelA}`}) contra las
          mismas fechas de {labelB} ({rangoTextoB}), con los mismos filtros de vendedor, centro de costo,
          cliente, impuestos y notas crédito. Así el corte es justo: mismo día de inicio y de fin en ambos años.
        </p>

        {!loading && !err && actual && comparado && (
          <div className="mt-4 rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {ventasB === 0 ? (
              <>
                En {labelA} las ventas netas fueron <b>{fmtCOP(ventasA)}</b>. En {labelB} no hay ventas
                registradas para estas mismas fechas, así que no se puede calcular una variación.
              </>
            ) : (
              <>
                En {labelA} las ventas netas fueron <b>{fmtCOP(ventasA)}</b>,{" "}
                <b className={resumen.dif >= 0 ? "text-emerald-700" : "text-red-700"}>
                  {fmtPct(resumen.pct || 0)} ({resumen.dif >= 0 ? "+" : ""}
                  {fmtCOP(resumen.dif)})
                </b>{" "}
                {resumen.dif >= 0 ? "más" : "menos"} que en el mismo período de {labelB} ({fmtCOP(ventasB)}).
              </>
            )}
          </div>
        )}
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Cargando comparativo {labelA} vs {labelB}…</p>
        </div>
      )}

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <p className="font-medium text-red-700">Error: {err}</p>
        </div>
      )}

      {!loading && !err && actual && comparado && (
        <>
          {sinDatosComparado && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
              No hay movimientos de ventas en {labelB} para {rangoTextoB} con los filtros actuales. Revisa si ese
              año ya está sincronizado o elige otro año.
            </div>
          )}

          <div className="overflow-x-auto pb-1">
            <div className="grid min-w-[1100px] grid-cols-5 gap-3">
              <KpiComparativo
                title={metricaLabel.subtotal}
                actual={ventasA}
                comparado={ventasB}
                labelA={labelA}
                labelB={labelB}
                helper="Facturas emitidas menos notas crédito. Es la cifra principal para saber si vendiste más o menos."
                destacado
              />
              <KpiComparativo
                title="Facturas emitidas"
                actual={toNum(kA.total_facturado)}
                comparado={toNum(kB.total_facturado)}
                labelA={labelA}
                labelB={labelB}
                helper="Lo facturado antes de descontar notas crédito."
              />
              <KpiComparativo
                title="Notas crédito"
                actual={ncAbs(kA)}
                comparado={ncAbs(kB)}
                labelA={labelA}
                labelB={labelB}
                helper="Devoluciones y descuentos. Aquí una baja es buena noticia, por eso se marca en verde."
                inverso
              />
              <KpiComparativo
                title="Impuestos netos"
                actual={toNum(kA.impuestos)}
                comparado={toNum(kB.impuestos)}
                labelA={labelA}
                labelB={labelB}
                helper="Sube o baja junto con las ventas. Se muestra como referencia, sin juicio de bueno o malo."
                neutral
              />
              <KpiComparativo
                title="Retenciones"
                actual={toNum(kA.retenciones)}
                comparado={toNum(kB.retenciones)}
                labelA={labelA}
                labelB={labelB}
                helper="Retenciones que te practicaron los clientes (sin autorretención). Referencia."
                neutral
              />
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-white shadow-sm">
            <div className="border-b border-indigo-100 px-5 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-950">Mes a mes: {labelA} vs {labelB}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Cada mes tiene dos barras: <b style={{ color: COLOR_ACTUAL }}>{labelA}</b> (período mostrado) y{" "}
                    <b style={{ color: COLOR_COMPARADO }}>{labelB}</b> (año comparado). La línea verde azulado es la
                    variación % del mes (eje derecho): por encima de 0% vendiste más que en {labelB}.
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {(Object.keys(metricaLabel) as Metrica[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => setMetrica(k)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        metrica === k
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {metricaLabel[k]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4">
              {filas.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  Sin datos para los filtros seleccionados.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={380}>
                  <ComposedChart data={filas} margin={{ top: 24, right: 18, left: 8, bottom: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="valor" tickFormatter={fmtShort} tick={{ fontSize: 11 }} />
                    <YAxis
                      yAxisId="pct"
                      orientation="right"
                      tickFormatter={(v: any) => `${Math.round(Number(v))}%`}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      content={<MesTooltip labelA={labelA} labelB={labelB} inverso={metricaInversa} />}
                      cursor={{ fill: "rgba(99, 102, 241, 0.08)" }}
                    />
                    <Legend />
                    <Bar yAxisId="valor" dataKey="a" name={labelA} fill={COLOR_ACTUAL} radius={[6, 6, 0, 0]}>
                      <LabelList
                        dataKey="a"
                        position="top"
                        formatter={(v: any) => abreviar(Number(v))}
                        style={{ fontSize: 10, fill: COLOR_ACTUAL, fontWeight: 600 }}
                      />
                    </Bar>
                    <Bar yAxisId="valor" dataKey="b" name={labelB} fill={COLOR_COMPARADO} radius={[6, 6, 0, 0]}>
                      <LabelList
                        dataKey="b"
                        position="top"
                        formatter={(v: any) => abreviar(Number(v))}
                        style={{ fontSize: 10, fill: "#b45309", fontWeight: 600 }}
                      />
                    </Bar>
                    <Line
                      yAxisId="pct"
                      type="monotone"
                      dataKey="pct"
                      name="Variación %"
                      stroke={COLOR_VARIACION}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-indigo-200 bg-white shadow-sm">
              <div className="border-b border-indigo-100 px-5 py-4">
                <h3 className="text-base font-bold text-slate-950">Acumulado del período</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Cada punto suma {metricaLabel[metrica].toLowerCase()} desde el inicio del rango hasta ese mes. Si la
                  línea de <b style={{ color: COLOR_ACTUAL }}>{labelA}</b> va por encima de la de{" "}
                  <b style={{ color: COLOR_COMPARADO }}>{labelB}</b>, vas adelante del año comparado a esa fecha.
                </p>
              </div>

              <div className="p-4">
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={filas} margin={{ top: 16, right: 18, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} />
                    <Tooltip
                      content={<AcumuladoTooltip labelA={labelA} labelB={labelB} inverso={metricaInversa} />}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="acumA" name={labelA} stroke={COLOR_ACTUAL} strokeWidth={3} dot={{ r: 3 }} />
                    <Line
                      type="monotone"
                      dataKey="acumB"
                      name={labelB}
                      stroke={COLOR_COMPARADO}
                      strokeWidth={3}
                      strokeDasharray="6 4"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-200 bg-white shadow-sm">
              <div className="border-b border-indigo-100 px-5 py-4">
                <h3 className="text-base font-bold text-slate-950">Detalle mensual · {metricaLabel[metrica]}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Δ $ = {labelA} menos {labelB}. Δ % = esa diferencia sobre el valor de {labelB}. Los meses
                  incompletos indican el día de corte.
                </p>
              </div>

              <div className="max-h-[360px] overflow-auto p-4">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-100 text-slate-700">
                    <tr>
                      <th className="p-2 text-left">Mes</th>
                      <th className="p-2 text-right" style={{ color: COLOR_COMPARADO }}>{labelB}</th>
                      <th className="p-2 text-right" style={{ color: COLOR_ACTUAL }}>{labelA}</th>
                      <th className="p-2 text-right">Δ $</th>
                      <th className="p-2 text-right">Δ %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f) => (
                      <tr key={f.label} className="border-t text-slate-700 hover:bg-slate-50">
                        <td className="p-2 whitespace-nowrap">
                          {f.label}
                          {f.parcial && <span className="ml-1 text-[11px] text-slate-400">({f.parcial})</span>}
                        </td>
                        <td className="p-2 text-right whitespace-nowrap">{fmtCOP(f.b)}</td>
                        <td className="p-2 text-right whitespace-nowrap font-semibold">{fmtCOP(f.a)}</td>
                        <td className={`p-2 text-right whitespace-nowrap ${toneDelta(f.dif, metricaInversa)}`}>
                          {f.dif >= 0 ? "+" : ""}
                          {fmtCOP(f.dif)}
                        </td>
                        <td className={`p-2 text-right whitespace-nowrap font-semibold ${toneDelta(f.dif, metricaInversa)}`}>
                          {f.pct === null ? "—" : fmtPct(f.pct)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 bg-indigo-50/60 font-bold text-slate-900">
                      <td className="p-2">Total</td>
                      <td className="p-2 text-right whitespace-nowrap">{fmtCOP(totalB)}</td>
                      <td className="p-2 text-right whitespace-nowrap">{fmtCOP(totalA)}</td>
                      <td className={`p-2 text-right whitespace-nowrap ${toneDelta(totalVar.dif, metricaInversa)}`}>
                        {totalVar.dif >= 0 ? "+" : ""}
                        {fmtCOP(totalVar.dif)}
                      </td>
                      <td className={`p-2 text-right whitespace-nowrap ${toneDelta(totalVar.dif, metricaInversa)}`}>
                        {totalVar.pct === null ? "—" : fmtPct(totalVar.pct)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
                <p className="mt-2 text-[11px] text-slate-400">
                  &quot;—&quot; en Δ % significa que en {labelB} el valor fue $0, así que no hay base para calcular el porcentaje.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-white shadow-sm">
            <div className="border-b border-indigo-100 px-5 py-4">
              <h3 className="text-base font-bold text-slate-950">Top 5 clientes de cada año</h3>
              <p className="mt-1 text-sm text-slate-500">
                Los 5 clientes con mayor venta neta en cada período. La etiqueta <b>Nuevo en top</b> indica que ese
                cliente no estaba entre los 5 primeros del otro año (puede que sí te comprara, pero menos).
              </p>
            </div>

            <div className="grid gap-4 p-4 md:grid-cols-2">
              <TopLista
                titulo={labelA}
                color={COLOR_ACTUAL}
                filas={actual.top_clientes}
                otros={comparado.top_clientes}
              />
              <TopLista
                titulo={labelB}
                color={COLOR_COMPARADO}
                filas={comparado.top_clientes}
                otros={actual.top_clientes}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function toneDelta(dif: number, inverso = false, neutral = false) {
  if (neutral || dif === 0) return "text-slate-600";
  const bueno = inverso ? dif < 0 : dif > 0;
  return bueno ? "text-emerald-700" : "text-red-700";
}

function KpiComparativo({
  title,
  actual,
  comparado,
  labelA,
  labelB,
  helper,
  inverso = false,
  neutral = false,
  destacado = false,
}: {
  title: string;
  actual: number;
  comparado: number;
  labelA: string;
  labelB: string;
  helper: string;
  inverso?: boolean;
  neutral?: boolean;
  destacado?: boolean;
}) {
  const { dif, pct } = variacion(actual, comparado);
  const flecha = dif > 0 ? "▲" : dif < 0 ? "▼" : "■";

  return (
    <div
      className={`rounded-2xl border p-3 shadow-sm transition hover:shadow-md ${
        destacado ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-xs font-semibold leading-tight text-slate-700">{title}</p>

      <div className="mt-3 space-y-1 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold" style={{ color: COLOR_ACTUAL }}>{labelA}</span>
          <span className="text-sm font-bold text-slate-900">{fmtCOP(actual)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold" style={{ color: COLOR_COMPARADO }}>{labelB}</span>
          <span className="font-semibold text-slate-600">{fmtCOP(comparado)}</span>
        </div>
      </div>

      <div className={`mt-2 border-t border-slate-200 pt-2 text-sm font-bold ${toneDelta(dif, inverso, neutral)}`}>
        {flecha} {pct === null ? "Sin base de comparación" : fmtPct(pct)}
        <span className="ml-1 text-[11px] font-semibold">
          ({dif >= 0 ? "+" : ""}
          {fmtCOP(dif)})
        </span>
      </div>

      <p className="mt-1 text-[11px] leading-snug text-slate-500">{helper}</p>
    </div>
  );
}

function MesTooltip({ active, payload, labelA, labelB, inverso }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};

  return (
    <div className="min-w-[250px] rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl">
      <p className="mb-2 text-sm font-bold text-slate-900">
        {row.label}
        {row.parcial && <span className="ml-1 text-[11px] font-normal text-slate-400">({row.parcial})</span>}
      </p>
      <LineaTooltip label={labelA} value={fmtCOP(row.a)} color={COLOR_ACTUAL} />
      <LineaTooltip label={labelB} value={fmtCOP(row.b)} color={COLOR_COMPARADO} />
      <div className="my-2 border-t border-slate-200" />
      <div className={`flex justify-between gap-4 font-semibold ${toneDelta(row.dif, inverso)}`}>
        <span>Diferencia</span>
        <span>
          {row.dif >= 0 ? "+" : ""}
          {fmtCOP(row.dif)} · {row.pct === null ? "—" : fmtPct(row.pct)}
        </span>
      </div>
    </div>
  );
}

function AcumuladoTooltip({ active, payload, labelA, labelB, inverso }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  const { dif, pct } = variacion(row.acumA, row.acumB);

  return (
    <div className="min-w-[250px] rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl">
      <p className="mb-2 text-sm font-bold text-slate-900">Acumulado a {row.label}</p>
      <LineaTooltip label={labelA} value={fmtCOP(row.acumA)} color={COLOR_ACTUAL} />
      <LineaTooltip label={labelB} value={fmtCOP(row.acumB)} color={COLOR_COMPARADO} />
      <div className="my-2 border-t border-slate-200" />
      <div className={`flex justify-between gap-4 font-semibold ${toneDelta(dif, inverso)}`}>
        <span>{dif >= 0 ? "Adelante" : "Atrás"}</span>
        <span>
          {dif >= 0 ? "+" : ""}
          {fmtCOP(dif)} · {pct === null ? "—" : fmtPct(pct)}
        </span>
      </div>
    </div>
  );
}

function LineaTooltip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="mb-1 flex items-center justify-between gap-4">
      <span className="font-semibold" style={{ color }}>{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function TopLista({
  titulo,
  color,
  filas,
  otros,
}: {
  titulo: string;
  color: string;
  filas: any[];
  otros: any[];
}) {
  const nombresOtros = new Set(otros.map((o) => o.cliente));
  const max = Math.max(...filas.map((f) => toNum(f.total)), 1);

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="mb-3 text-sm font-bold" style={{ color }}>Top 5 · {titulo}</p>

      {filas.length === 0 ? (
        <p className="text-sm text-slate-500">Sin ventas en este período.</p>
      ) : (
        <ol className="space-y-2">
          {filas.map((f, i) => (
            <li key={`${f.cliente}-${i}`} className="text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-medium text-slate-700" title={f.cliente}>
                  {i + 1}. {f.cliente || "—"}
                  {!nombresOtros.has(f.cliente) && (
                    <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                      Nuevo en top
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-semibold text-slate-900">{fmtCOP(toNum(f.total))}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${Math.max((toNum(f.total) / max) * 100, 2)}%`, backgroundColor: color }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
