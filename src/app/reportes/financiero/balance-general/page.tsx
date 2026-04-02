"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Landmark,
  Wallet,
  Scale,
  ShieldCheck,
  Activity,
  BadgeDollarSign,
  Building2,
  Calculator,
} from "lucide-react";

type BalanceItem = {
  cuenta: string;
  cuenta_padre: string;
  nombre: string;
  seccion: string;
  grupo_balance: string;
  saldo_actual: number;
  saldo_anterior: number | null;
  variacion_abs: number | null;
  variacion_pct: number | null;
};

type BalanceResponse = {
  ok: boolean;
  fechas: {
    fecha_corte: string;
    comparar_con: string | null;
  };
  meta?: {
    modo_comparativo?: boolean;
    comparacion_solicitada?: boolean;
    snapshot_comparativo_existe?: boolean;
    explicacion_filtros?: {
      fecha_corte?: string;
      comparar_con?: string;
    };
  };
  kpis: {
    activo_corriente: number;
    activo_no_corriente: number;
    activos_totales: number;
    pasivo_corriente: number;
    pasivo_no_corriente: number;
    pasivos_totales: number;
    patrimonio_total: number;
    pasivo_mas_patrimonio: number;
    capital_trabajo: number;
    razon_corriente: number;
    nivel_endeudamiento_pct: number;
    autonomia_financiera_pct: number;
    cuadratura: number;
    cuadratura_original?: number;
    utilidad_calculada_actual?: number;
    utilidad_calculada_anterior?: number | null;
    ajuste_patrimonio_aplicado_actual?: number;
    ajuste_patrimonio_aplicado_anterior?: number | null;
  };
  resumen?: {
    narrativa?: string[];
    alertas?: string[];
  };
  balance: {
    activo_corriente: BalanceItem[];
    activo_no_corriente: BalanceItem[];
    pasivo_corriente: BalanceItem[];
    pasivo_no_corriente: BalanceItem[];
    patrimonio: BalanceItem[];
  };
};

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function getLastDayOfPreviousMonth(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const prevMonthLastDay = new Date(d.getFullYear(), d.getMonth(), 0);
  return prevMonthLastDay.toISOString().slice(0, 10);
}

function ValueCell({
  value,
  emphasizeNegative = false,
}: {
  value: number | null | undefined;
  emphasizeNegative?: boolean;
}) {
  const isNegative = (value || 0) < 0;

  return (
    <span className={isNegative && emphasizeNegative ? "text-red-600 font-bold" : "font-semibold"}>
      {formatCurrency(value)}
    </span>
  );
}

function VariacionBadge({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) {
    return <span className="text-slate-400 text-xs">—</span>;
  }

  let cls = "bg-slate-100 text-slate-700";
  if (value > 0) cls = "bg-green-100 text-green-700";
  if (value < 0) cls = "bg-red-100 text-red-700";

  return (
    <span className={`px-2 py-1 rounded-lg text-[11px] font-black ${cls}`}>
      {value > 0 ? "+" : ""}
      {formatNumber(value)}%
    </span>
  );
}

function CuadraturaBadge({ value }: { value: number }) {
  const ok = Math.abs(value) < 1;

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-xl text-sm font-black ${
        ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {ok ? "CUADRA" : `NO CUADRA (${formatCurrency(value)})`}
    </span>
  );
}

function ModeBadge({
  comparativo,
  snapshotComparativoExite,
}: {
  comparativo: boolean;
  snapshotComparativoExite: boolean;
}) {
  if (comparativo) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700">
        Modo comparativo
      </span>
    );
  }

  if (!snapshotComparativoExite) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-700">
        Modo simple
      </span>
    );
  }

  return null;
}

function StatCardBalance({
  title,
  value,
  icon,
  color = "slate",
  badge,
  highlight = false,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: "emerald" | "blue" | "sky" | "indigo" | "slate" | "amber";
  badge?: string;
  highlight?: boolean;
}) {
  const themes: Record<string, string> = {
    emerald: "text-emerald-600 bg-white border-slate-100",
    blue: "text-blue-600 bg-white border-slate-100",
    sky: "text-sky-600 bg-white border-slate-100",
    indigo: "text-indigo-600 bg-white border-slate-100",
    slate: "text-slate-700 bg-white border-slate-100",
    amber: "text-amber-600 bg-white border-slate-100",
  };

  return (
    <Card
      className={`relative overflow-hidden border shadow-lg rounded-[2rem] transition-all hover:scale-[1.01] ${
        highlight
          ? "bg-indigo-600 text-white shadow-indigo-200 border-none"
          : themes[color]
      }`}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div className={`p-2.5 rounded-2xl ${highlight ? "bg-white/20" : "bg-slate-50"}`}>
            {icon}
          </div>

          {badge && (
            <div
              className={`text-[9px] font-black px-2 py-1 rounded-lg ${
                highlight
                  ? "bg-emerald-400 text-emerald-950"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {badge}
            </div>
          )}
        </div>

        <p
          className={`text-[9px] font-black uppercase tracking-widest ${
            highlight ? "text-indigo-100" : "text-slate-400"
          }`}
        >
          {title}
        </p>

        <p className="text-[1.9rem] leading-none font-black mt-1 tracking-tighter">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function SectionTable({
  title,
  items,
  showComparison,
  open,
  onToggle,
}: {
  title: string;
  items: BalanceItem[];
  showComparison: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const totalActual = items.reduce((acc, it) => acc + (it.saldo_actual || 0), 0);
  const totalAnterior = showComparison
    ? items.reduce((acc, it) => acc + (it.saldo_anterior || 0), 0)
    : 0;

  const variacionAbs = showComparison ? totalActual - totalAnterior : null;
  const variacionPct =
    showComparison && totalAnterior !== 0
      ? (variacionAbs! / totalAnterior) * 100
      : showComparison
      ? 0
      : null;

  return (
    <Card className="mb-6 rounded-[2rem] shadow-lg border bg-white overflow-hidden">
      <CardHeader className="pb-3 px-6 pt-5">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-lg font-black text-slate-900">{title}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggle}
            className="rounded-xl text-xs font-black border-slate-200"
          >
            {open ? "− Ocultar" : "+ Ver detalle"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-6 pb-6">
        <div className="rounded-2xl border bg-slate-50 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12 text-sm">
            <div className="p-3 font-black text-slate-700 md:col-span-5">
              Total {title}
            </div>

            <div className="p-3 text-right md:col-span-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                Actual
              </div>
              <ValueCell value={totalActual} emphasizeNegative />
            </div>

            {showComparison && (
              <>
                <div className="p-3 text-right md:col-span-2 border-t md:border-t-0 md:border-l">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Anterior
                  </div>
                  <ValueCell value={totalAnterior} emphasizeNegative />
                </div>

                <div className="p-3 text-right md:col-span-1 border-t md:border-t-0 md:border-l">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Var. $
                  </div>
                  {variacionAbs === null ? (
                    "—"
                  ) : (
                    <ValueCell value={variacionAbs} emphasizeNegative />
                  )}
                </div>

                <div className="p-3 text-right md:col-span-1 border-t md:border-t-0 md:border-l">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Var. %
                  </div>
                  <VariacionBadge value={variacionPct} />
                </div>
              </>
            )}
          </div>
        </div>

        {open && (
          <div className="overflow-auto mt-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-slate-100 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                  <th className="text-left p-3">Cuenta</th>
                  <th className="text-left p-3">Nombre</th>
                  <th className="text-right p-3">Actual</th>
                  {showComparison && (
                    <>
                      <th className="text-right p-3">Anterior</th>
                      <th className="text-right p-3">Variación $</th>
                      <th className="text-right p-3">Variación %</th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={showComparison ? 6 : 3}
                      className="p-4 text-center text-slate-500"
                    >
                      Sin registros
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.cuenta} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono text-xs font-bold whitespace-nowrap text-slate-600">
                        {item.cuenta}
                      </td>
                      <td className="p-3 text-slate-800">{item.nombre}</td>
                      <td className="p-3 text-right">
                        <ValueCell value={item.saldo_actual} emphasizeNegative />
                      </td>

                      {showComparison && (
                        <>
                          <td className="p-3 text-right">
                            <ValueCell value={item.saldo_anterior} emphasizeNegative />
                          </td>
                          <td className="p-3 text-right">
                            {item.variacion_abs === null ? (
                              "—"
                            ) : (
                              <ValueCell value={item.variacion_abs} emphasizeNegative />
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <VariacionBadge value={item.variacion_pct} />
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}

                <tr className="bg-slate-100 font-black">
                  <td className="p-3" colSpan={2}>
                    Total {title}
                  </td>
                  <td className="p-3 text-right">
                    <ValueCell value={totalActual} emphasizeNegative />
                  </td>

                  {showComparison && (
                    <>
                      <td className="p-3 text-right">
                        <ValueCell value={totalAnterior} emphasizeNegative />
                      </td>
                      <td className="p-3 text-right">
                        {variacionAbs === null ? (
                          "—"
                        ) : (
                          <ValueCell value={variacionAbs} emphasizeNegative />
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <VariacionBadge value={variacionPct} />
                      </td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function BalanceGeneralPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [fechaCorte, setFechaCorte] = useState(today);
  const [compararCon, setCompararCon] = useState(getLastDayOfPreviousMonth(today));
  const [usarComparacion, setUsarComparacion] = useState(true);

  const [loading, setLoading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BalanceResponse | null>(null);

  const [openSections, setOpenSections] = useState({
    activo_corriente: true,
    activo_no_corriente: false,
    pasivo_corriente: false,
    pasivo_no_corriente: false,
    patrimonio: false,
  });

  useEffect(() => {
    setCompararCon(getLastDayOfPreviousMonth(fechaCorte));
  }, [fechaCorte]);

  const cargarBalance = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        fecha_corte: fechaCorte,
      });

      if (usarComparacion && compararCon) {
        params.append("comparar_con", compararCon);
      }

      const json = await authFetch(`/reportes/balance_general_v1?${params.toString()}`);
      setData(json);
    } catch (err: any) {
      setError(err.message || "Error cargando balance");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const regenerarSnapshot = async () => {
    try {
      setRebuilding(true);
      setError(null);

      const body: any = {
        fecha_corte: fechaCorte,
      };

      if (usarComparacion && compararCon) {
        body.comparar_con = compararCon;
      }

      await authFetch("/reportes/balance_general/rebuild_snapshot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      await cargarBalance();
    } catch (err: any) {
      setError(err.message || "Error regenerando snapshot");
    } finally {
      setRebuilding(false);
    }
  };

  useEffect(() => {
    cargarBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = useMemo(() => {
    if (!data) return null;
    return data.kpis;
  }, [data]);

  const modoComparativo = !!data?.meta?.modo_comparativo;
  const snapshotComparativoExiste = !!data?.meta?.snapshot_comparativo_existe;
  const comparacionSolicitada = !!data?.meta?.comparacion_solicitada;

  const patrimonioCalculado = useMemo(() => {
    if (!data?.balance?.patrimonio?.length) return false;
    return data.balance.patrimonio.some(
      (x) => x.cuenta === "39RESULTADO" || x.cuenta === "39AJUSTE"
    );
  }, [data]);

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="space-y-4 p-5 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Balance General
            <span className="text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">
              Premium
            </span>
          </h1>

          <p className="text-slate-500 text-xs font-medium mt-1">
            Estado de situación financiera con lectura ejecutiva, alertas y validación automática.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ModeBadge
            comparativo={modoComparativo}
            snapshotComparativoExite={snapshotComparativoExiste}
          />

          {patrimonioCalculado && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700">
              Patrimonio calculado
            </span>
          )}
        </div>
      </div>

      <Card className="rounded-[2rem] border shadow-sm bg-white">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap gap-4 items-end justify-between">
            <div className="flex gap-4 flex-wrap">
              <div className="flex flex-col min-w-[220px]">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">
                  Fecha de corte
                </label>
                <Input
                  type="date"
                  value={fechaCorte}
                  onChange={(e) => setFechaCorte(e.target.value)}
                  className="rounded-xl bg-slate-50 text-xs font-bold"
                />
              </div>

              <div className="flex flex-col min-w-[220px]">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">
                  Comparar con
                </label>
                <Input
                  type="date"
                  value={compararCon}
                  onChange={(e) => setCompararCon(e.target.value)}
                  disabled={!usarComparacion}
                  className="rounded-xl bg-slate-50 text-xs font-bold"
                />
              </div>

              <div className="flex flex-col justify-end">
                <label className="text-[10px] font-black text-white uppercase ml-1 mb-1">
                  .
                </label>
                <Button
                  onClick={cargarBalance}
                  disabled={loading}
                  className="bg-slate-900 text-white rounded-xl px-6 py-2.5 text-xs font-black hover:bg-black"
                >
                  {loading ? "Consultando..." : "Consultar balance"}
                </Button>
              </div>

              <div className="flex flex-col justify-end">
                <label className="text-[10px] font-black text-white uppercase ml-1 mb-1">
                  .
                </label>
                <Button
                  onClick={regenerarSnapshot}
                  disabled={rebuilding}
                  variant="outline"
                  className="rounded-xl px-6 py-2.5 text-xs font-black border-slate-200"
                >
                  {rebuilding ? "Regenerando..." : "Regenerar snapshot"}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 rounded-2xl p-3 border">
              <input
                id="usarComparacion"
                type="checkbox"
                checked={usarComparacion}
                onChange={(e) => setUsarComparacion(e.target.checked)}
              />
              <label htmlFor="usarComparacion" className="text-xs font-bold text-slate-700">
                Comparar contra otro corte
              </label>
            </div>
          </div>

          <div className="text-xs text-slate-600 bg-slate-50 border rounded-2xl p-4 leading-6">
            <div>
              <b>Fecha corte:</b>{" "}
              {data?.meta?.explicacion_filtros?.fecha_corte ||
                "Muestra la situación financiera acumulada hasta esa fecha."}
            </div>
            <div>
              <b>Comparar con:</b>{" "}
              {data?.meta?.explicacion_filtros?.comparar_con ||
                "Permite comparar contra otro corte para analizar variaciones. Se recomienda usar cierres de mes."}
            </div>
          </div>

          {comparacionSolicitada && !modoComparativo && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl p-4">
              Se solicitó comparación, pero el sistema está mostrando el balance en modo simple
              porque el snapshot comparativo no existe o no fue regenerado.
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="rounded-[2rem] border-red-200 bg-white">
          <CardContent className="py-4 text-red-700 font-semibold">{error}</CardContent>
        </Card>
      )}

      {cards && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCardBalance
              title="Activos Totales"
              value={formatCurrency(cards.activos_totales)}
              icon={<Wallet size={18} />}
              color="emerald"
            />

            <StatCardBalance
              title="Pasivos Totales"
              value={formatCurrency(cards.pasivos_totales)}
              icon={<Landmark size={18} />}
              color="blue"
            />

            <StatCardBalance
              title="Patrimonio"
              value={formatCurrency(cards.patrimonio_total)}
              icon={<Building2 size={18} />}
              color="sky"
              badge={patrimonioCalculado ? "CALCULADO" : undefined}
            />

            <StatCardBalance
              title="Capital de Trabajo"
              value={formatCurrency(cards.capital_trabajo)}
              icon={<BadgeDollarSign size={18} />}
              color="indigo"
              highlight
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <StatCardBalance
              title="Razón Corriente"
              value={formatNumber(cards.razon_corriente)}
              icon={<Scale size={18} />}
              color="slate"
            />

            <StatCardBalance
              title="Endeudamiento"
              value={`${formatNumber(cards.nivel_endeudamiento_pct)}%`}
              icon={<Activity size={18} />}
              color="amber"
            />

            <StatCardBalance
              title="Autonomía Financiera"
              value={`${formatNumber(cards.autonomia_financiera_pct)}%`}
              icon={<ShieldCheck size={18} />}
              color="blue"
            />

            <Card className="rounded-[2rem] border shadow-lg bg-white overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="p-2.5 rounded-2xl bg-slate-50">
                    <Calculator size={18} className="text-slate-700" />
                  </div>
                </div>

                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Cuadratura
                </p>

                <div className="mt-2">
                  <CuadraturaBadge value={cards.cuadratura} />
                </div>

                <div className="text-[11px] text-slate-500 leading-5 mt-3">
                  Verifica la ecuación:
                  <br />
                  <b>Activos = Pasivos + Patrimonio</b>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {data?.resumen?.narrativa?.length ? (
        <Card className="rounded-[2rem] shadow-sm border bg-white">
          <CardContent className="p-6 space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                Lectura ejecutiva
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Interpretación automática del estado de situación financiera.
              </p>
            </div>

            <div className="bg-slate-50 border rounded-2xl p-4 space-y-2">
              {data.resumen.narrativa.map((txt, idx) => (
                <div key={idx} className="text-sm text-slate-800 leading-6">
                  • {txt}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {data?.resumen?.alertas?.length ? (
        <Card className="rounded-[2rem] border border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div>
              <h3 className="text-sm font-black text-amber-800 uppercase tracking-wide">
                Alertas y observaciones
              </h3>
              <p className="text-xs text-amber-700 mt-1">
                Observaciones automáticas. No siempre significan error; pueden responder a
                devoluciones, compensaciones, naturaleza de la cuenta o reclasificaciones.
              </p>
            </div>

            <div className="space-y-2">
              {data.resumen.alertas.map((txt, idx) => (
                <div
                  key={idx}
                  className="text-sm text-amber-900 bg-white/70 border border-amber-100 rounded-xl px-3 py-2"
                >
                  ⚠️ {txt}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {data && (
        <>
          <SectionTable
            title="Activo Corriente"
            items={data.balance.activo_corriente}
            showComparison={modoComparativo}
            open={openSections.activo_corriente}
            onToggle={() => toggleSection("activo_corriente")}
          />

          <SectionTable
            title="Activo No Corriente"
            items={data.balance.activo_no_corriente}
            showComparison={modoComparativo}
            open={openSections.activo_no_corriente}
            onToggle={() => toggleSection("activo_no_corriente")}
          />

          <SectionTable
            title="Pasivo Corriente"
            items={data.balance.pasivo_corriente}
            showComparison={modoComparativo}
            open={openSections.pasivo_corriente}
            onToggle={() => toggleSection("pasivo_corriente")}
          />

          <SectionTable
            title="Pasivo No Corriente"
            items={data.balance.pasivo_no_corriente}
            showComparison={modoComparativo}
            open={openSections.pasivo_no_corriente}
            onToggle={() => toggleSection("pasivo_no_corriente")}
          />

          <SectionTable
            title="Patrimonio"
            items={data.balance.patrimonio}
            showComparison={modoComparativo}
            open={openSections.patrimonio}
            onToggle={() => toggleSection("patrimonio")}
          />
        </>
      )}
    </div>
  );
}