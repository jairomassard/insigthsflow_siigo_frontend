"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type BalanceItem = {
  cuenta: string;
  cuenta_padre: string;
  nombre: string;
  seccion: string;
  grupo_balance: string;
  saldo_actual: number;
  saldo_anterior: number;
  variacion_abs: number;
  variacion_pct: number;
};

type BalanceResponse = {
  ok: boolean;
  fechas: {
    fecha_corte: string;
    comparar_con: string;
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
  };
  resumen?: {
    narrativa?: string[];
  };
  balance: {
    activo_corriente: BalanceItem[];
    activo_no_corriente: BalanceItem[];
    pasivo_corriente: BalanceItem[];
    pasivo_no_corriente: BalanceItem[];
    patrimonio: BalanceItem[];
  };
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function getLastDayOfPreviousMonth(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const prevMonthLastDay = new Date(d.getFullYear(), d.getMonth(), 0);
  return prevMonthLastDay.toISOString().slice(0, 10);
}

function VariacionBadge({ value }: { value: number }) {
  let cls = "bg-slate-100 text-slate-700";
  if (value > 0) cls = "bg-green-100 text-green-700";
  if (value < 0) cls = "bg-red-100 text-red-700";

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${cls}`}>
      {value > 0 ? "+" : ""}
      {formatNumber(value)}%
    </span>
  );
}

function CuadraturaBadge({ value }: { value: number }) {
  const ok = Math.abs(value) < 1;
  return (
    <span
      className={`px-3 py-1 rounded text-sm font-semibold ${
        ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {ok ? "CUADRA" : `NO CUADRA (${formatCurrency(value)})`}
    </span>
  );
}

function SectionTable({
  title,
  items,
}: {
  title: string;
  items: BalanceItem[];
}) {
  const totalActual = items.reduce((acc, it) => acc + (it.saldo_actual || 0), 0);
  const totalAnterior = items.reduce((acc, it) => acc + (it.saldo_anterior || 0), 0);
  const variacionAbs = totalActual - totalAnterior;
  const variacionPct =
    totalAnterior !== 0 ? (variacionAbs / totalAnterior) * 100 : 0;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left p-2">Cuenta</th>
                <th className="text-left p-2">Nombre</th>
                <th className="text-right p-2">Actual</th>
                <th className="text-right p-2">Anterior</th>
                <th className="text-right p-2">Variación $</th>
                <th className="text-right p-2">Variación %</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-500">
                    Sin registros
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.cuenta} className="border-b hover:bg-slate-50">
                    <td className="p-2 font-medium">{item.cuenta}</td>
                    <td className="p-2">{item.nombre}</td>
                    <td className="p-2 text-right">
                      {formatCurrency(item.saldo_actual)}
                    </td>
                    <td className="p-2 text-right">
                      {formatCurrency(item.saldo_anterior)}
                    </td>
                    <td className="p-2 text-right">
                      {formatCurrency(item.variacion_abs)}
                    </td>
                    <td className="p-2 text-right">
                      <VariacionBadge value={item.variacion_pct} />
                    </td>
                  </tr>
                ))
              )}

              <tr className="bg-slate-100 font-semibold">
                <td className="p-2" colSpan={2}>
                  Total {title}
                </td>
                <td className="p-2 text-right">{formatCurrency(totalActual)}</td>
                <td className="p-2 text-right">{formatCurrency(totalAnterior)}</td>
                <td className="p-2 text-right">{formatCurrency(variacionAbs)}</td>
                <td className="p-2 text-right">
                  <VariacionBadge value={variacionPct} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BalanceGeneralPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [fechaCorte, setFechaCorte] = useState(today);
  const [compararCon, setCompararCon] = useState(getLastDayOfPreviousMonth(today));
  const [loading, setLoading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BalanceResponse | null>(null);

  useEffect(() => {
    setCompararCon(getLastDayOfPreviousMonth(fechaCorte));
  }, [fechaCorte]);

  const cargarBalance = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        fecha_corte: fechaCorte,
        comparar_con: compararCon,
      });

      const res = await authFetch(`/reportes/balance_general_v1?${params.toString()}`);

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "No fue posible consultar el balance");
      }

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

      const res = await authFetch("/reportes/balance_general/rebuild_snapshot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fecha_corte: fechaCorte,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "No fue posible regenerar el snapshot");
      }

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

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Balance General</h1>
        <p className="text-sm text-slate-600">
          Estado de situación financiera comparativo a partir del auxiliar contable.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros y acciones</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-sm font-medium block mb-1">Fecha corte</label>
            <Input
              type="date"
              value={fechaCorte}
              onChange={(e) => setFechaCorte(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Comparar con</label>
            <Input
              type="date"
              value={compararCon}
              onChange={(e) => setCompararCon(e.target.value)}
            />
          </div>

          <Button onClick={cargarBalance} disabled={loading}>
            {loading ? "Consultando..." : "Consultar balance"}
          </Button>

          <Button onClick={regenerarSnapshot} disabled={rebuilding} variant="outline">
            {rebuilding ? "Regenerando..." : "Regenerar snapshot"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200">
          <CardContent className="py-4 text-red-700">{error}</CardContent>
        </Card>
      )}

      {cards && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Activos Totales</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">
                {formatCurrency(cards.activos_totales)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pasivos Totales</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">
                {formatCurrency(cards.pasivos_totales)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Patrimonio</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">
                {formatCurrency(cards.patrimonio_total)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Capital de Trabajo</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">
                {formatCurrency(cards.capital_trabajo)}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Razón Corriente</CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-semibold">
                {formatNumber(cards.razon_corriente)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Endeudamiento</CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-semibold">
                {formatNumber(cards.nivel_endeudamiento_pct)}%
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Autonomía Financiera</CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-semibold">
                {formatNumber(cards.autonomia_financiera_pct)}%
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cuadratura</CardTitle>
              </CardHeader>
              <CardContent>
                <CuadraturaBadge value={cards.cuadratura} />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {data?.resumen?.narrativa?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Lectura ejecutiva</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
              {data.resumen.narrativa.map((txt, idx) => (
                <li key={idx}>{txt}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {data && (
        <>
          <SectionTable
            title="Activo Corriente"
            items={data.balance.activo_corriente}
          />

          <SectionTable
            title="Activo No Corriente"
            items={data.balance.activo_no_corriente}
          />

          <SectionTable
            title="Pasivo Corriente"
            items={data.balance.pasivo_corriente}
          />

          <SectionTable
            title="Pasivo No Corriente"
            items={data.balance.pasivo_no_corriente}
          />

          <SectionTable
            title="Patrimonio"
            items={data.balance.patrimonio}
          />
        </>
      )}
    </div>
  );
}