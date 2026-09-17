"use client";

import { useState } from "react";
import { API, getToken } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Landmark,
  Scale,
  FileBarChart2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";

type ItemFlujo = {
  cuenta: string;
  nombre: string;
  delta: number;
  efecto_caja?: number;
};

type FlujoEfectivoResponse = {
  ok: boolean;
  error?: string;
  fechas_faltantes?: string[];
  fechas?: { fecha_inicio: string; fecha_fin: string };
  kpis?: {
    utilidad_neta: number;
    dep_amort: number;
    variacion_capital_trabajo: number;
    flujo_operacion: number;
    flujo_inversion: number;
    flujo_financiacion: number;
    total_flujos_calculado: number;
    delta_caja_real: number;
    diferencia: number;
    diferencia_pct: number | null;
    cuadra: boolean;
  };
  detalle?: {
    operacion: ItemFlujo[];
    inversion: ItemFlujo[];
    financiacion: ItemFlujo[];
    excluido_patrimonio: ItemFlujo[];
  };
  resumen?: { narrativa: string[] };
};

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getLastDayOfPreviousMonth(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const prevMonthLastDay = new Date(d.getFullYear(), d.getMonth(), 0);
  return prevMonthLastDay.toISOString().slice(0, 10);
}

function getLastDayNMonthsBefore(dateStr: string, n: number) {
  const d = new Date(`${dateStr}T00:00:00`);
  const target = new Date(d.getFullYear(), d.getMonth() - n + 1, 0);
  return target.toISOString().slice(0, 10);
}

function formatFechaCorta(fecha?: string | null) {
  if (!fecha) return "";
  const [y, m, d] = fecha.slice(0, 10).split("-");
  if (!y || !m || !d) return fecha;
  return `${d}/${m}/${y}`;
}

function InfoHint({ text }: { text: string }) {
  return (
    <div className="relative group/info inline-flex">
      <button
        type="button"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
        aria-label="Ver explicación"
      >
        <HelpCircle size={11} />
      </button>
      <div className="pointer-events-none absolute top-6 right-0 z-50 w-64 rounded-2xl border border-slate-200 bg-white text-slate-700 px-3 py-3 text-[11px] leading-5 shadow-2xl opacity-0 scale-95 transition-all duration-200 group-hover/info:opacity-100 group-hover/info:scale-100">
        {text}
      </div>
    </div>
  );
}

function StatCardFlujo({
  title,
  value,
  icon,
  color = "slate",
  description,
  highlight = false,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: "emerald" | "red" | "blue" | "indigo" | "slate";
  description: string;
  highlight?: boolean;
}) {
  const themes: Record<string, string> = {
    emerald: "text-emerald-600 bg-white border-slate-100",
    red: "text-red-600 bg-white border-slate-100",
    blue: "text-blue-600 bg-white border-slate-100",
    indigo: "text-indigo-600 bg-white border-slate-100",
    slate: "text-slate-700 bg-white border-slate-100",
  };

  return (
    <Card
      className={`relative overflow-visible border shadow-lg rounded-[2rem] transition-all hover:scale-[1.01] ${
        highlight ? "bg-indigo-600 text-white shadow-indigo-200 border-none" : themes[color]
      }`}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div className={`p-2.5 rounded-2xl ${highlight ? "bg-white/20" : "bg-slate-50"}`}>{icon}</div>
          <InfoHint text={description} />
        </div>
        <p
          className={`text-[9px] font-black uppercase tracking-widest ${
            highlight ? "text-indigo-100" : "text-slate-400"
          }`}
        >
          {title}
        </p>
        <p className="text-[1.9rem] leading-none font-black mt-1 tracking-tighter break-words">{value}</p>
      </CardContent>
    </Card>
  );
}

function CuadraturaBadge({ cuadra, diferencia }: { cuadra: boolean; diferencia: number }) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-xl text-sm font-black ${
        cuadra ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {cuadra ? "CUADRA" : `NO CUADRA (${formatCurrency(diferencia)})`}
    </span>
  );
}

function TablaFlujo({
  titulo,
  items,
  open,
  onToggle,
  colorHeader,
}: {
  titulo: string;
  items: ItemFlujo[];
  open: boolean;
  onToggle: () => void;
  colorHeader: string;
}) {
  const total = items.reduce((acc, it) => acc + (it.efecto_caja ?? it.delta), 0);

  return (
    <Card className="rounded-[2rem] shadow-sm border bg-white overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-all"
      >
        <div className="flex items-center gap-3">
          <span className={`text-xs font-black uppercase tracking-widest ${colorHeader}`}>{titulo}</span>
          <span className="text-[10px] text-slate-400 font-bold">({items.length} cuentas)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-black text-slate-800">{formatCurrency(total)}</span>
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {open && (
        <CardContent className="p-0 border-t">
          {items.length === 0 ? (
            <p className="text-xs text-slate-400 px-6 py-4">Sin movimiento en este periodo.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="text-left font-black px-6 py-2">Cuenta</th>
                  <th className="text-right font-black px-6 py-2">Efecto en caja</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.cuenta} className="border-t border-slate-100">
                    <td className="px-6 py-2 text-slate-700">{it.nombre}</td>
                    <td className="px-6 py-2 text-right text-slate-700 font-semibold">
                      {formatCurrency(it.efecto_caja ?? it.delta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function FlujoEfectivoPage() {
  const today = new Date().toISOString().slice(0, 10);
  const finDefault = getLastDayOfPreviousMonth(today);
  const inicioDefault = getLastDayNMonthsBefore(finDefault, 6);

  const [fechaInicio, setFechaInicio] = useState(inicioDefault);
  const [fechaFin, setFechaFin] = useState(finDefault);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fechasFaltantes, setFechasFaltantes] = useState<string[]>([]);
  const [data, setData] = useState<FlujoEfectivoResponse | null>(null);

  const [openSections, setOpenSections] = useState({
    operacion: true,
    inversion: false,
    financiacion: false,
    excluido: false,
  });

  const consultar = async () => {
    try {
      setLoading(true);
      setError(null);
      setFechasFaltantes([]);
      const params = new URLSearchParams({ fecha_inicio: fechaInicio, fecha_fin: fechaFin });
      const token = getToken();
      const res = await fetch(`${API}/reportes/flujo_efectivo_v1?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) {
        setData(null);
        setError(json?.error || "No fue posible consultar el flujo de efectivo.");
        setFechasFaltantes(json?.fechas_faltantes || []);
        return;
      }
      setData(json);
    } catch {
      setData(null);
      setError("No fue posible consultar el flujo de efectivo.");
    } finally {
      setLoading(false);
    }
  };

  const k = data?.kpis;

  return (
    <div className="space-y-4 p-5 bg-slate-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Flujo de Efectivo
            <span className="text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">
              Premium
            </span>
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-1">
            Estado de Flujo de Efectivo, método indirecto — reconstruido a partir de tu Estado de Resultados
            y Balance General.
          </p>
        </div>
      </div>

      {/* FILTROS */}
      <Card className="rounded-[2rem] border shadow-sm bg-white">
        <CardContent className="p-5">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col min-w-[180px]">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">
                Fecha inicio del periodo
              </label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="rounded-xl bg-slate-50 text-xs font-bold"
              />
            </div>
            <div className="flex flex-col min-w-[180px]">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">
                Fecha fin del periodo
              </label>
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="rounded-xl bg-slate-50 text-xs font-bold"
              />
            </div>
            <Button
              onClick={consultar}
              disabled={loading}
              className="rounded-2xl px-6 py-3 text-xs font-black bg-slate-900 hover:bg-black text-white shadow-lg active:scale-95"
            >
              {loading ? "Consultando..." : "Consultar"}
            </Button>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
            Ambas fechas deben tener el <b>Balance de Prueba real de Siigo</b> cargado y aplicado (no el
            auxiliar acumulado) — es la única forma de garantizar que el saldo de apertura sea confiable.
          </p>
        </CardContent>
      </Card>

      {/* ERROR / FECHAS FALTANTES */}
      {error && (
        <Card className="rounded-[2rem] border border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="p-5 flex gap-3 items-start">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-bold text-amber-900">{error}</p>
              {fechasFaltantes.length > 0 && (
                <p className="text-xs text-amber-800 mt-2">
                  Sube y aplica el Balance de Prueba real de Siigo para:{" "}
                  <b>{fechasFaltantes.map(formatFechaCorta).join(" y ")}</b> desde la página de{" "}
                  <a href="/reportes/financiero/balance-general" className="underline font-bold">
                    Balance General
                  </a>
                  , y vuelve a consultar.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* RESULTADO */}
      {k && data?.fechas && (
        <>
          <p className="text-xs text-slate-500 font-medium px-1">
            Periodo: <b>{formatFechaCorta(data.fechas.fecha_inicio)}</b> →{" "}
            <b>{formatFechaCorta(data.fechas.fecha_fin)}</b>
          </p>

          {/* KPIs de partida */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCardFlujo
              title="Utilidad Neta"
              value={formatCurrency(k.utilidad_neta)}
              icon={<FileBarChart2 size={18} />}
              color="slate"
              description="Utilidad neta del periodo, tomada del Estado de Resultados."
            />
            <StatCardFlujo
              title="+ Depreciación/Amortización"
              value={formatCurrency(k.dep_amort)}
              icon={<TrendingUp size={18} />}
              color="blue"
              description="Gasto no monetario que se revierte porque no representa salida real de caja."
            />
            <StatCardFlujo
              title="Var. Capital de Trabajo"
              value={formatCurrency(k.variacion_capital_trabajo)}
              icon={<Scale size={18} />}
              color="indigo"
              description="Efecto en caja de los cambios en cuentas por cobrar, inventarios, cuentas por pagar y similares."
            />
            <StatCardFlujo
              title="Flujo de Operación"
              value={formatCurrency(k.flujo_operacion)}
              icon={<Wallet size={18} />}
              highlight
              description="Utilidad Neta + Depreciación/Amortización + Variación de Capital de Trabajo."
            />
          </div>

          {/* Los 3 flujos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCardFlujo
              title="Flujo de Operación"
              value={formatCurrency(k.flujo_operacion)}
              icon={<Wallet size={18} />}
              color={k.flujo_operacion >= 0 ? "emerald" : "red"}
              description="Caja generada (o consumida) por la operación normal del negocio."
            />
            <StatCardFlujo
              title="Flujo de Inversión"
              value={formatCurrency(k.flujo_inversion)}
              icon={<TrendingDown size={18} />}
              color={k.flujo_inversion >= 0 ? "emerald" : "red"}
              description="Caja usada o liberada por compra/venta de activos fijos e inversiones."
            />
            <StatCardFlujo
              title="Flujo de Financiación"
              value={formatCurrency(k.flujo_financiacion)}
              icon={<Landmark size={18} />}
              color={k.flujo_financiacion >= 0 ? "emerald" : "red"}
              description="Caja por deuda, capital, socios y accionistas."
            />
          </div>

          {/* Cuadratura */}
          <Card className="rounded-[2rem] border shadow-sm bg-white">
            <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-8">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Total 3 flujos (calculado)
                  </p>
                  <p className="text-xl font-black text-slate-800 mt-1">
                    {formatCurrency(k.total_flujos_calculado)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Movimiento real de caja
                  </p>
                  <p className="text-xl font-black text-slate-800 mt-1">{formatCurrency(k.delta_caja_real)}</p>
                </div>
              </div>
              <div className="flex flex-col items-start md:items-end gap-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cuadratura</p>
                <CuadraturaBadge cuadra={k.cuadra} diferencia={k.diferencia} />
              </div>
            </CardContent>
          </Card>

          {/* Narrativa */}
          {data.resumen?.narrativa && data.resumen.narrativa.length > 0 && (
            <Card className="rounded-[2rem] shadow-sm border bg-white overflow-hidden">
              <div className="bg-slate-900 text-white px-6 py-5 flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-white/10">
                  <FileBarChart2 size={18} className="text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide">Lectura ejecutiva</h3>
                  <p className="text-xs text-slate-400 mt-1">Interpretación automática del flujo de efectivo.</p>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="bg-slate-50 border rounded-2xl p-4 space-y-2">
                  {data.resumen.narrativa.map((txt, idx) => (
                    <div key={idx} className="text-sm text-slate-800 leading-6">
                      • {txt}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detalle por flujo */}
          {data.detalle && (
            <div className="space-y-3">
              <TablaFlujo
                titulo="Detalle Operación"
                items={data.detalle.operacion}
                open={openSections.operacion}
                onToggle={() => setOpenSections((s) => ({ ...s, operacion: !s.operacion }))}
                colorHeader="text-emerald-700"
              />
              <TablaFlujo
                titulo="Detalle Inversión"
                items={data.detalle.inversion}
                open={openSections.inversion}
                onToggle={() => setOpenSections((s) => ({ ...s, inversion: !s.inversion }))}
                colorHeader="text-blue-700"
              />
              <TablaFlujo
                titulo="Detalle Financiación"
                items={data.detalle.financiacion}
                open={openSections.financiacion}
                onToggle={() => setOpenSections((s) => ({ ...s, financiacion: !s.financiacion }))}
                colorHeader="text-indigo-700"
              />
              {data.detalle.excluido_patrimonio.length > 0 && (
                <Card className="rounded-[2rem] border border-amber-200 bg-amber-50 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setOpenSections((s) => ({ ...s, excluido: !s.excluido }))}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-amber-100/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle size={15} className="text-amber-600" />
                      <span className="text-xs font-black uppercase tracking-widest text-amber-800">
                        Excluido de financiación (requiere revisión)
                      </span>
                    </div>
                    {openSections.excluido ? (
                      <ChevronUp size={16} className="text-amber-600" />
                    ) : (
                      <ChevronDown size={16} className="text-amber-600" />
                    )}
                  </button>
                  {openSections.excluido && (
                    <CardContent className="p-0 border-t border-amber-200">
                      <p className="text-[11px] text-amber-800 px-6 py-3 leading-relaxed">
                        Estas cuentas de patrimonio se movieron en el periodo, pero no se contaron como
                        entrada/salida real de caja porque probablemente son apropiación de una utilidad ya
                        contada arriba, no un aporte o retiro real. Pídele a tu contador que confirme si alguna
                        de estas sí corresponde a un movimiento real de dinero.
                      </p>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-amber-100/60 text-amber-900">
                            <th className="text-left font-black px-6 py-2">Cuenta</th>
                            <th className="text-right font-black px-6 py-2">Movimiento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.detalle.excluido_patrimonio.map((it) => (
                            <tr key={it.cuenta} className="border-t border-amber-100">
                              <td className="px-6 py-2 text-slate-700">{it.nombre}</td>
                              <td className="px-6 py-2 text-right text-slate-700 font-semibold">
                                {formatCurrency(it.delta)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  )}
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
