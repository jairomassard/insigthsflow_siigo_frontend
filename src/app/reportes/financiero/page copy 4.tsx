"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { authFetch } from "@/lib/api";

type Vendedor = { id: number; nombre: string };
type CentroCosto = { id: number; nombre: string; codigo?: string };

const monthNames = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const fmtCOP = (n: number) =>
  n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

const fmtShort = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n || 0);

const toNum = (v: any) => Number(v || 0);

export default function DashboardFinanciero() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // filtros
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [centros, setCentros] = useState<CentroCosto[]>([]);

  // agrupación (Mes / Trimestre / Año)
  const [agrupacion, setAgrupacion] = useState<"mes" | "trimestre" | "anio">("mes");

  // cargar vendedores y centros
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
    };
    loadCatalogos();
  }, []);


  // ------------------------
  // KPIs desde backend
  // ------------------------
  const [kpis, setKpis] = useState({
    subtotal: 0,
    impuestos: 0,
    total: 0,
    pagos: 0,
    saldo: 0,
  });
  const [series, setSeries] = useState<any[]>([]);

  const totalSubtotal = toNum(kpis.subtotal);
  const totalImpuestos = toNum(kpis.impuestos);
  const totalConIVA = toNum(kpis.total);
  const totalPagos = toNum(kpis.pagos);
  const totalSaldo = toNum(kpis.saldo);



  // cargar facturas y KPIs
  // cargar facturas y KPIs
  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams();
      if (desde) qs.append("desde", desde);
      if (hasta) qs.append("hasta", hasta);
      if (sellerId) qs.append("seller_id", sellerId);
      if (costCenter) qs.append("cost_center", costCenter);

      const url = `/reportes/facturas_enriquecidas?${qs.toString()}`;
      const res = await authFetch(url);

      if (res?.error) {
        setErr(res.error);
      } else {
        setData(res.rows || res || []);
        if (res.kpis) setKpis(res.kpis);
        if (res.series) setSeries(res.series);
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);




  // ------------------------
  // Agrupaciones
  // ------------------------
  // ------------------------
  // Serie temporal (desde backend)
  // ------------------------
  const monthly = series.map((s) => {
    const d = new Date(s.periodo);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      periodo: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
      subtotal: toNum(s.subtotal),
      impuestos: toNum(s.impuestos),
      total: toNum(s.total),
    };
  });


  // Top 5 clientes
  const clientes = Object.values(
    data.reduce((acc: any, f: any) => {
      const raw = (f.cliente_nombre || "").toString().trim();
      const cliente = raw ? raw : "Desconocido";
      if (!acc[cliente]) acc[cliente] = { cliente, total: 0 };
      acc[cliente].total += toNum(f.total);
      return acc;
    }, {} as Record<string, { cliente: string; total: number }>)
  )
    .sort((a: any, b: any) => b.total - a.total)
    .slice(0, 5);

  // Estados de pago
  const estados = Object.values(
    data.reduce((acc: any, f: any) => {
      let est = (f.estado_pago || "").toString().toLowerCase();
      if (!["pagada", "pendiente", "parcial"].includes(est)) est = "desconocido";
      if (!acc[est]) acc[est] = { estado: est, valor: 0 };
      acc[est].valor += toNum(f.total);
      return acc;
    }, {} as Record<string, { estado: string; valor: number }>)
  );

  const colores = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#6b7280"];

  const pieLabel = (props: any) => {
    const { name, percent } = props;
    return `${name}: ${(percent * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">📊 Dashboard Financiero</h2>

      {/* FILTROS */}
      <div className="bg-gray-50 p-4 rounded shadow flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="border rounded p-1"
          />
        </div>
        <div>
          <label className="block text-sm">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="border rounded p-1"
          />
        </div>
        <div>
          <label className="block text-sm">Vendedor</label>
          <select
            value={sellerId}
            onChange={(e) => setSellerId(e.target.value)}
            className="border rounded p-1"
          >
            <option value="">Todos</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre || `ID ${v.id}`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm">Centro de costo</label>
          <select
            value={costCenter}
            onChange={(e) => setCostCenter(e.target.value)}
            className="border rounded p-1"
          >
            <option value="">Todos</option>
            {centros.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre || `ID ${c.id}`} {c.codigo ? `(${c.codigo})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm">Agrupar por</label>
          <select
            value={agrupacion}
            onChange={(e) => setAgrupacion(e.target.value as any)}
            className="border rounded p-1"
          >
            <option value="mes">Mes</option>
            <option value="trimestre">Trimestre</option>
            <option value="anio">Año</option>
          </select>
        </div>
        <button
          onClick={load}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Aplicar filtros
        </button>
      </div>

      {loading && <p>Cargando datos...</p>}
      {err && <p className="text-red-600">{err}</p>}

      {!loading && !err && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded shadow text-center">
              <p className="text-gray-500">Ventas netas</p>
              <p className="text-xl font-bold text-green-600">
                {fmtCOP(totalSubtotal)}
              </p>
            </div>
            <div className="bg-white p-4 rounded shadow text-center">
              <p className="text-gray-500">Impuestos</p>
              <p className="text-xl font-bold text-yellow-600">
                {fmtCOP(totalImpuestos)}
              </p>
            </div>
            <div className="bg-white p-4 rounded shadow text-center">
              <p className="text-gray-500">Total (con IVA)</p>
              <p className="text-xl font-bold text-emerald-600">
                {fmtCOP(totalConIVA)}
              </p>
            </div>
            <div className="bg-white p-4 rounded shadow text-center">
              <p className="text-gray-500">Pagos</p>
              <p className="text-xl font-bold text-blue-600">
                {fmtCOP(totalPagos)}
              </p>
            </div>
            <div className="bg-white p-4 rounded shadow text-center">
              <p className="text-gray-500">Saldo pendiente</p>
              <p className="text-xl font-bold text-red-600">
                {fmtCOP(totalSaldo)}
              </p>
            </div>
          </div>

          {/* Evolución temporal */}
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-2">
              Evolución {agrupacion === "mes" ? "mensual" : agrupacion === "trimestre" ? "trimestral" : "anual"}
            </h3>
            {monthly.length === 0 ? (
              <div className="text-sm text-gray-500">Sin datos.</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periodo" />
                  <YAxis tickFormatter={fmtShort} />
                  <Tooltip formatter={(v) => fmtCOP(Number(v))} />
                  <Legend />
                  <Bar dataKey="subtotal" fill="#2563eb" name="Subtotal" />
                  <Bar dataKey="impuestos" fill="#f59e0b" name="Impuestos" />
                  <Bar dataKey="total" fill="#16a34a" name="Total" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top clientes + Estados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-2">Top 5 clientes</h3>
              {clientes.length === 0 ? (
                <div className="text-sm text-gray-500">Sin datos.</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={clientes} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={fmtShort} />
                    <YAxis dataKey="cliente" type="category" width={180} />
                    <Tooltip formatter={(v) => fmtCOP(Number(v))} />
                    <Bar dataKey="total" fill="#2563eb" name="Ventas" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-2">
                Distribución por estado de pago
              </h3>
              {estados.length === 0 ? (
                <div className="text-sm text-gray-500">Sin datos.</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={estados}
                      dataKey="valor"
                      nameKey="estado"
                      outerRadius={120}
                      label={pieLabel}
                    >
                      {estados.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={colores[index % colores.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmtCOP(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
