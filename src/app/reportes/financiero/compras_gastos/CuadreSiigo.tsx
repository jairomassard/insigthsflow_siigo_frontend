"use client";

import { useEffect, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { authFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Puente entre el pendiente del reporte (suma documento por documento) y el
// total por pagar que muestra Siigo en su informe "Cuentas por cobrar/pagar
// general por cliente/proveedor" (que además resta anticipos/saldos a favor
// e incluye líneas de CxP sin factura). Ver endpoint
// /reportes/financiero/compras-gastos/cuadre-siigo en app.py.

interface TotalesCuadre {
  pend_docs: number;
  ajuste_docs: number;
  otras_deudas: number;
  saldo_favor: number;
  total_siigo: number;
}

interface ProveedorCuadre extends TotalesCuadre {
  nit: string;
  nombre: string;
}

interface RespuestaCuadre {
  disponible: boolean;
  motivo?: string;
  corte?: string | null;
  totales?: TotalesCuadre;
  proveedores?: ProveedorCuadre[];
  proveedores_cuadran?: number;
}

function cop(valor: number): string {
  return Number(valor || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function fechaCorte(iso?: string | null): string {
  if (!iso) return "sin sincronizar";
  try {
    return formatInTimeZone(new Date(iso), "America/Bogota", "dd/MM/yyyy hh:mm a");
  } catch {
    return iso;
  }
}

function LineaPuente({
  signo,
  label,
  valor,
  ayuda,
  tono = "text-slate-900",
}: {
  signo: string;
  label: string;
  valor: number;
  ayuda: string;
  tono?: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <span className="w-4 shrink-0 text-center text-base font-black text-slate-400">{signo}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-bold text-slate-800">{label}</div>
        <div className="text-[11px] leading-snug text-slate-500">{ayuda}</div>
      </div>
      <span className={`shrink-0 text-right text-[15px] font-black tabular-nums ${tono}`}>{cop(valor)}</span>
    </div>
  );
}

export default function CuadreSiigo({
  pendienteFiltrado,
  periodoTexto,
  conFiltroCentro,
}: {
  // KPI "Pendiente" de arriba (filtrado por período/centro de costo), para
  // explicar por qué difiere del pendiente de todos los años de este cuadre.
  pendienteFiltrado: number;
  periodoTexto: string;
  conFiltroCentro: boolean;
}) {
  const [data, setData] = useState<RespuestaCuadre | null>(null);
  const [error, setError] = useState("");
  const [verDetalle, setVerDetalle] = useState(false);

  useEffect(() => {
    authFetch("/reportes/financiero/compras-gastos/cuadre-siigo")
      .then((res) => setData(res as RespuestaCuadre))
      .catch((e) => setError(e?.message || "No fue posible calcular el cuadre con Siigo."));
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
    );
  }

  if (!data || !data.disponible || !data.totales) return null;

  const t = data.totales;
  const proveedores = data.proveedores || [];
  const fueraDelFiltro = t.pend_docs - pendienteFiltrado;
  const textoFiltro = conFiltroCentro ? `período ${periodoTexto} y centro de costo seleccionado` : `período ${periodoTexto}`;

  return (
    <Card className="border-sky-200 shadow-sm">
      <CardHeader className="px-3 py-2">
        <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
          <CardTitle className="text-base font-black">
            Cuadre con Siigo · Deuda total con proveedores (todos los años)
          </CardTitle>
          <span className="text-[11px] font-semibold text-slate-500">
            Foto de Siigo al {fechaCorte(data.corte)} · no usa los filtros de fecha ni centro de costo
          </span>
        </div>
        <p className="text-[12px] leading-snug text-slate-600">
          Las tarjetas y gráficas de arriba muestran solo las compras del {textoFiltro}. Este cuadre muestra
          toda la deuda vigente con proveedores, sin importar el año de la compra, y la compara con Siigo: Siigo,
          en su informe de cuentas por pagar por proveedor, además descuenta los anticipos (saldos a favor) e
          incluye deudas que no corresponden a una factura o documento soporte.
        </p>
      </CardHeader>

      <CardContent className="px-3 pb-3 pt-0">
        <div className="rounded-xl border border-slate-200 bg-white px-3">
          <LineaPuente
            signo=""
            label="Pendiente por facturas y documentos soporte (todos los años)"
            valor={t.pend_docs}
            ayuda={
              Math.abs(fueraDelFiltro) > 1
                ? `De estos, ${cop(pendienteFiltrado)} son compras del ${textoFiltro} (es el KPI "Pendiente" de arriba) y ${cop(fueraDelFiltro)} son compras fuera de esos filtros, la mayoría de años anteriores.`
                : `Saldo pendiente de todas las compras (FC y DS), documento por documento. Coincide con el KPI "Pendiente" de arriba porque los filtros actuales abarcan todas las compras con saldo.`
            }
          />
          <LineaPuente
            signo="+"
            label="Diferencia de cálculo en esos documentos"
            valor={t.ajuste_docs}
            ayuda="Lo que Siigo tiene en esos mismos documentos menos lo que muestra el reporte (topes por notas débito o retenciones, documentos con saldo negativo, redondeos)."
            tono="text-slate-700"
          />
          <LineaPuente
            signo="+"
            label="Otras deudas en Siigo sin factura asociada"
            valor={t.otras_deudas}
            ayuda="Saldos por pagar que Siigo registra con comprobantes contables (CC, RP, ajustes) y no con una factura de compra o documento soporte."
            tono="text-orange-700"
          />
          <LineaPuente
            signo="−"
            label="Saldo a favor (anticipos)"
            valor={t.saldo_favor}
            ayuda="Pagos anticipados o saldos a favor con el proveedor que todavía no se cruzaron contra una factura. Reducen lo que realmente se debe."
            tono="text-emerald-700"
          />
          <div className="flex items-center gap-3 py-2.5">
            <span className="w-4 shrink-0 text-center text-base font-black text-slate-400">=</span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-black text-slate-900">Total por pagar según Siigo</div>
              <div className="text-[11px] leading-snug text-slate-500">
                Debe coincidir con el &quot;Total general&quot; del informe de Siigo &quot;Cuentas por cobrar/pagar general por
                cliente/proveedor&quot; (tipo Saldos por pagar). Si un proveedor puntual no coincide, es porque ese informe y la
                API de Siigo no muestran lo mismo para él.
              </div>
            </div>
            <span className="shrink-0 text-right text-[17px] font-black tabular-nums text-sky-700">{cop(t.total_siigo)}</span>
          </div>
        </div>

        {proveedores.length > 0 && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setVerDetalle((v) => !v)}
              className="text-[12px] font-bold text-sky-700 hover:underline"
            >
              {verDetalle ? "Ocultar" : "Ver"} los {proveedores.length} proveedores que explican la diferencia
              {data.proveedores_cuadran ? ` (los otros ${data.proveedores_cuadran} cuadran exacto)` : ""}
            </button>

            {verDetalle && (
              <div className="mt-2 max-h-[360px] overflow-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[820px] text-[12px]">
                  <thead className="sticky top-0 bg-slate-100 text-slate-700">
                    <tr>
                      <th className="p-2 text-left">Proveedor</th>
                      <th className="p-2 text-right">Pendiente docs</th>
                      <th className="p-2 text-right">Dif. cálculo</th>
                      <th className="p-2 text-right">Otras deudas</th>
                      <th className="p-2 text-right">Saldo a favor</th>
                      <th className="p-2 text-right">Total Siigo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proveedores.map((p) => (
                      <tr key={p.nit} className="border-t text-slate-700 hover:bg-slate-50">
                        <td className="p-2">
                          <div className="font-semibold">{p.nombre || "—"}</div>
                          <div className="text-[10px] text-slate-400">NIT {p.nit}</div>
                        </td>
                        <td className="p-2 text-right tabular-nums">{cop(p.pend_docs)}</td>
                        <td className="p-2 text-right tabular-nums">{p.ajuste_docs ? cop(p.ajuste_docs) : "—"}</td>
                        <td className="p-2 text-right tabular-nums text-orange-700">{p.otras_deudas ? cop(p.otras_deudas) : "—"}</td>
                        <td className="p-2 text-right tabular-nums text-emerald-700">
                          {p.saldo_favor ? `− ${cop(p.saldo_favor)}` : "—"}
                        </td>
                        <td className="p-2 text-right font-bold tabular-nums text-sky-700">{cop(p.total_siigo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
