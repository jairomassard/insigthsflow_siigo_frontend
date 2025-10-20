"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from "recharts";
import { authFetch } from "@/lib/api";

// Helpers de formato
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

type ClienteRow = {
  cliente: string;
  cantidad_facturas: number;
  total_facturado: number;
  total_pagado: number;
  saldo_pendiente: number;
};

type CentroCostoRow = {
  cliente_nombre: string;
  centro_costo_nombre: string;
  cost_center: number | null;
  cantidad_facturas: number;
  total_facturado: number;
  total_pagado: number;
  saldo_pendiente: number;
};

type FacturaRow = {
  cliente_nombre?: string; // 👈 ahora opcional
  idfactura: string;
  fecha: string;
  vencimiento?: string | null;
  dias_vencimiento: number | null; // 👈 ya no opcional
   estado_cartera?: "sano" | "alerta" | "vencido" | "pagado"; // 👈 ahora incluye pagado
  total: number;
  pagado: number;
  pendiente: number;
  public_url?: string | null;
  centro_costo_nombre?: string | null;
};

type FacturasEstadoRow = {
  cliente: string;  
  estado: "sano" | "alerta" | "vencido" | "pagado";
  cantidad: number;
};

type ClienteUI = ClienteRow & {
  centros_costo: Array<{
    centro_costo_nombre: string;
    cost_center: number | null;
    cantidad_facturas: number;
    total: number;
    pagado: number;
    pendiente: number;
  }>;
  facturas_recientes: FacturaRow[]; // 👈 ahora usa el tipo que ya definiste arriba
  facturas_por_estado: FacturasEstadoRow[]; // 👈 nuevo
};


export default function ReporteClientes() {
  // Data
  const [clientes, setClientes] = useState<ClienteUI[]>([]);
  const [clientesCatalogo, setClientesCatalogo] = useState<any[]>([]);
  const [ccCatalogo, setCcCatalogo] = useState<any[]>([]);

  // Estado UI
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Filtros
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [clienteSel, setClienteSel] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [estadoCartera, setEstadoCartera] = useState(""); // 👈 nuevo filtro

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [facturasModal, setFacturasModal] = useState<FacturaRow[]>([]);
  const [modalCliente, setModalCliente] = useState("");
  const [modalOffset, setModalOffset] = useState(0);

  // ---------- Cargar catálogos (clientes + centros de costo) ----------
  const loadCatalogos = async () => {
    try {
      const qs = new URLSearchParams();
      if (desde) qs.append("desde", desde);
      if (hasta) qs.append("hasta", hasta);

      const clientesRes = await authFetch(`/catalogos/clientes-facturas?${qs}`);
      setClientesCatalogo(Array.isArray(clientesRes) ? clientesRes : []);

      const ccRes = await authFetch(`/catalogos/centros-costo?${qs}`);
      setCcCatalogo(Array.isArray(ccRes) ? ccRes : []);
    } catch (e) {
      console.error("Error cargando catálogos", e);
    }
  };

  // Re-cargar catálogos si cambia el rango de fechas
  useEffect(() => {
    loadCatalogos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta]);

  // ---------- Cargar reporte (clientes + cc + facturas recientes) ----------
  const load = async () => {
    setLoading(true);
    setErr("");

    try {
      const qs = new URLSearchParams();
      if (desde) qs.append("desde", desde);
      if (hasta) qs.append("hasta", hasta);
      if (clienteSel) qs.append("cliente", clienteSel);
      if (costCenter) qs.append("cost_center", costCenter);
      if (estadoCartera) qs.append("estado", estadoCartera); // 👈 se envía al backend

      const res = await authFetch(`/reportes/analisis_clientes?${qs.toString()}`);
      if (res?.error) {
        setErr(res.error);
        setClientes([]);
        return;
      }

      const clientesRaw: ClienteRow[] = Array.isArray(res?.clientes) ? res.clientes : [];
      const ccRaw: CentroCostoRow[] = Array.isArray(res?.centros_costo) ? res.centros_costo : [];
      const factRaw: FacturaRow[] = Array.isArray(res?.facturas_recientes) ? res.facturas_recientes : [];

      const estadosRaw: FacturasEstadoRow[] = Array.isArray(res?.facturas_por_estado)
        ? res.facturas_por_estado
        : [];

      // Enriquecer: agrupar cc y facturas recientes por cliente
      const enriched: ClienteUI[] = clientesRaw.map((c) => {
        const centros = ccRaw
          .filter((x) => x.cliente_nombre === c.cliente)
          .map((x) => ({
            centro_costo_nombre: x.centro_costo_nombre,
            cost_center: x.cost_center ?? null,
            cantidad_facturas: x.cantidad_facturas,
            total: Number(x.total_facturado || 0),
            pagado: Number(x.total_pagado || 0),
            pendiente: Number(x.saldo_pendiente || 0),
          }));

        const facturasCli = factRaw
        .filter((f) => f.cliente_nombre === c.cliente)
        .map((f) => ({
            cliente_nombre: f.cliente_nombre, // 👈 aquí lo agregas
            idfactura: f.idfactura,
            fecha: f.fecha,
            vencimiento: f.vencimiento ?? null,
            dias_vencimiento: f.dias_vencimiento ?? null,
            estado_cartera: f.estado_cartera ?? undefined,
            total: Number(f.total || 0),
            pagado: Number(f.pagado || 0),
            pendiente: Number(f.pendiente || 0),
            public_url: f.public_url,
        }));

        return {
          cliente: c.cliente,
          cantidad_facturas: c.cantidad_facturas,
          total_facturado: Number(c.total_facturado || 0),
          total_pagado: Number(c.total_pagado || 0),
          saldo_pendiente: Number(c.saldo_pendiente || 0),
          centros_costo: centros,
          facturas_recientes: facturasCli,
          facturas_por_estado: (Array.isArray(estadosRaw) ? estadosRaw : []).filter(
            (e) => e.cliente === c.cliente
         ),

        };
      });

      setClientes(enriched);
    } catch (e: any) {
      setErr(e.message);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  const COLORS: Record<string, string> = {
    sano: "#2095b0",     // verde #16a34a    
    alerta: "#facc15",   // amarillo
    vencido: "#dc2626",  // rojo
    pagado: "#22c55e",   // verde claro
    };


  useEffect(() => {
    load(); // carga inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Modal: abrir y paginar facturas ----------
  const openModal = async (cliente: string) => {
    setShowModal(true);
    setModalCliente(cliente);
    setFacturasModal([]);
    setModalOffset(0);
    await loadMasFacturas(cliente, 0);
  };

  const loadMasFacturas = async (cliente: string, offset: number) => {
    try {
      const qs = new URLSearchParams();
      qs.append("cliente", cliente);
      qs.append("limit", "5");
      qs.append("offset", offset.toString());
      if (desde) qs.append("desde", desde);
      if (hasta) qs.append("hasta", hasta);
      if (costCenter) qs.append("cost_center", costCenter);
      if (estadoCartera) qs.append("estado", estadoCartera); // 👈 también aquí

      const res = await authFetch(`/reportes/facturas_cliente?${qs.toString()}`);
      if (Array.isArray(res?.rows)) {
        const normalizadas: FacturaRow[] = res.rows.map((f: any) => ({
        idfactura: f.idfactura,
        fecha: f.fecha,
        vencimiento: f.vencimiento ?? null,
        dias_vencimiento: f.dias_vencimiento ?? null,
        estado_cartera: f.estado_cartera ?? undefined,
        total: Number(f.total || 0),
        pagado: Number(f.pagado || 0),
        pendiente: Number(f.pendiente || 0),
        public_url: f.public_url,
        centro_costo_nombre: f.centro_costo_nombre ?? null,
        }));

        setFacturasModal((prev) => [...prev, ...normalizadas]);
        setModalOffset(offset + 5);
        }

    } catch (e) {
      console.error("Error cargando facturas cliente", e);
    }
  };

  // ---------- Render ----------
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">📊 Análisis Facturación de Clientes</h2>

      {/* Filtros */}
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
          <label className="block text-sm">Cliente</label>
          <select
            value={clienteSel}
            onChange={(e) => setClienteSel(e.target.value)}
            className="border rounded p-1"
          >
            <option value="">Todos</option>
            {clientesCatalogo.map((c: any) => (
              <option key={c.id} value={c.nombre}>
                {c.nombre}
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
            {ccCatalogo.map((cc: any) => (
              <option key={cc.id} value={cc.id}>
                {cc.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm">Estado cartera</label>
          <select
            value={estadoCartera}
            onChange={(e) => setEstadoCartera(e.target.value)}
            className="border rounded p-1"
          >
            <option value="">Todos</option>
            <option value="sano">Sano</option>
            <option value="alerta">Alerta</option>
            <option value="vencido">Vencido</option>
            <option value="pagado">Pagado</option> {/* 👈 nuevo */}
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

      {!loading &&
        !err &&
        clientes.map((cli, idx) => (
          <div key={idx} className="bg-white p-4 rounded shadow space-y-4">
            <h3 className="text-lg font-semibold">{cli.cliente}</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                <p className="text-sm text-gray-500">Facturas</p>
                <p className="text-xl font-bold text-blue-700">{cli.cantidad_facturas}</p>
                </div>
                <div>
                <p className="text-sm text-gray-500">Total facturado</p>
                <p className="text-xl font-bold text-emerald-600">{fmtCOP(cli.total_facturado)}</p>
                </div>
                <div>
                <p className="text-sm text-gray-500">Pagado</p>
                <p className="text-xl font-bold text-green-600">{fmtCOP(cli.total_pagado)}</p>
                </div>
                <div>
                <p className="text-sm text-gray-500">Pendiente</p>
                <p className="text-xl font-bold text-red-600">{fmtCOP(cli.saldo_pendiente)}</p>
                </div>
            </div>

            {/* BarChart */}
            <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={180}>
                <BarChart
                    data={[
                    {
                        name: cli.cliente,
                        pagado: Number(cli.total_pagado),
                        pendiente: Number(cli.saldo_pendiente),
                    },
                    ]}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" hide />
                    <YAxis tickFormatter={fmtShort} />
                    <Tooltip formatter={(v) => fmtCOP(Number(v))} />
                    <Bar dataKey="pagado" fill="#16a34a" name="Pagado">
                        <LabelList
                            dataKey="pagado"
                            position="insideTop"
                            fill="#fff"
                            formatter={(v: any) => fmtShort(v)}
                            offset={10} // 👈 le da margen adicional
                        />
                    </Bar>

                    <Bar dataKey="pendiente" fill="#dc2626" name="Pendiente">
                        <LabelList 
                            dataKey="pendiente"
                            position="insideTop"
                            fill="#fff"
                            formatter={(v: any) => fmtShort(v)}
                            offset={10} // 👈 le da margen adicional
                        />
                    </Bar>

                </BarChart>
                </ResponsiveContainer>
            </div>

            {/* PieChart de facturas por estado */}
            <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                <Pie
                    data={cli.facturas_por_estado || []}
                    dataKey="cantidad"
                    nameKey="estado"
                    cx="50%"
                    cy="50%"
                    outerRadius={60} // 👈 más pequeño
                    label={({ name, value }) => `${name}: ${value}`} // 👈 etiquetas externas
                    labelLine={true}
                >
                    {(cli.facturas_por_estado || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.estado] || "#8884d8"} />
                    ))}
                </Pie>
                <Tooltip formatter={(v) => `${v} facturas`} />
                {/*<Legend /> */}
                </PieChart>

                </ResponsiveContainer>
            </div>
            </div>


            {/* Por centro de costo */}
            {cli.centros_costo && cli.centros_costo.length > 0 && (
              <div>
                <h4 className="text-md font-semibold mb-2">Por centro de costo</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {cli.centros_costo.map((cc, i) => (
                    <div key={i} className="p-3 border rounded">
                      <p className="font-semibold">{cc.centro_costo_nombre}</p>
                      <p className="text-sm text-gray-500">
                        {cc.cantidad_facturas} facturas · {fmtCOP(cc.total)}
                      </p>
                      <p className="text-green-600 text-sm">Pagado: {fmtCOP(cc.pagado)}</p>
                      <p className="text-red-600 text-sm">Pendiente: {fmtCOP(cc.pendiente)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Facturas recientes */}
            {cli.facturas_recientes && cli.facturas_recientes.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-md font-semibold">Facturas recientes</h4>
                  <button
                    onClick={() => openModal(cli.cliente)}
                    className="text-blue-600 underline text-sm"
                  >
                    Más
                  </button>
                </div>
                <table className="w-full text-sm border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 border">Factura</th>
                      <th className="p-2 border">Fecha Factura</th>
                      <th className="p-2 border">Fecha Vencimiento</th>
                      <th className="p-2 border">Días Vencimiento</th>
                      <th className="p-2 border">Estado</th>
                      <th className="p-2 border">Total</th>
                      <th className="p-2 border">Pagado</th>
                      <th className="p-2 border">Pendiente</th>
                      <th className="p-2 border">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cli.facturas_recientes.map((f, j) => (
                      <tr key={j} className="border-t">
                        <td className="p-2 font-mono">{f.idfactura}</td>

                        <td className="p-2">{f.fecha}</td>
                        <td className="p-2">{f.vencimiento || "-"}</td>
                        <td
                            className={`p-2 font-bold ${
                                f.estado_cartera === "pagado"
                                ? "text-green-600"
                                : f.dias_vencimiento !== null && f.dias_vencimiento < 0
                                ? "text-red-600"
                                : f.dias_vencimiento !== null && f.dias_vencimiento <= 5
                                ? "text-yellow-600"
                                : "text-black"
                            }`}
                            >
                            {/* 👇 Si es pagado, no mostramos días */}
                            {f.estado_cartera === "pagado"
                                ? "-"
                                : f.dias_vencimiento !== null
                                ? f.dias_vencimiento > 0
                                ? `+${f.dias_vencimiento}`
                                : f.dias_vencimiento
                                : "-"}
                        </td>
                        <td className="p-2">
                            {f.estado_cartera === "sano" && <span className="text-green-600">✔️</span>}
                            {f.estado_cartera === "alerta" && <span className="text-yellow-600">⚠️</span>}
                            {f.estado_cartera === "vencido" && <span className="text-red-600">❌</span>}
                            {f.estado_cartera === "pagado" && (
                                <span className="text-green-600 font-bold">✅ Pagado</span>
                            )}
                        </td>

                        <td className="p-2">{fmtCOP(f.total)}</td>
                        <td className="p-2 text-green-600">{fmtCOP(f.pagado)}</td>
                        <td className="p-2 text-red-600">{fmtCOP(f.pendiente)}</td>

                        <td className="p-2">
                          {f.public_url ? (
                            <a
                              href={f.public_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline"
                            >
                              Ver
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

      {/* Modal facturas */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start p-6 overflow-auto">
          <div className="bg-white rounded shadow-lg w-full max-w-4xl p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
            >
              ✖
            </button>
            <h3 className="text-lg font-bold mb-4">Facturas de {modalCliente}</h3>
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Factura</th>

                  <th className="p-2 border">Fecha Factura</th>
                  <th className="p-2 border">Fecha Vencimiento</th>
                  <th className="p-2 border">Días Vencimiento</th>
                  <th className="p-2 border">Estado</th>
                  <th className="p-2 border">Total</th>
                  <th className="p-2 border">Pagado</th>
                  <th className="p-2 border">Pendiente</th>
                  <th className="p-2 border">Centro costo</th>
                  <th className="p-2 border">Link</th>
                </tr>
              </thead>
              <tbody>
                {facturasModal.map((f, j) => (
                  <tr key={j} className="border-t">
                    <td className="p-2 font-mono">{f.idfactura}</td>
                    <td className="p-2">{f.fecha}</td>
                    <td className="p-2">{f.vencimiento || "-"}</td>
                    <td
                        className={`p-2 font-bold ${
                            f.estado_cartera === "pagado"
                            ? "text-green-600"
                            : f.dias_vencimiento !== null && f.dias_vencimiento < 0
                            ? "text-red-600"
                            : f.dias_vencimiento !== null && f.dias_vencimiento <= 5
                            ? "text-yellow-600"
                            : "text-black"
                        }`}
                        >
                        {f.estado_cartera === "pagado"
                            ? "-" // 👈 no mostrar días si ya está pagado
                            : f.dias_vencimiento !== null
                            ? f.dias_vencimiento > 0
                            ? `+${f.dias_vencimiento}`
                            : f.dias_vencimiento
                            : "-"}
                    </td>


                    <td className="p-2">
                        {f.estado_cartera === "sano" && <span className="text-green-600">✔️</span>}
                        {f.estado_cartera === "alerta" && <span className="text-yellow-600">⚠️</span>}
                        {f.estado_cartera === "vencido" && <span className="text-red-600">❌</span>}
                        {f.estado_cartera === "pagado" && (
                            <span className="text-green-600 font-bold">✅ Pagado</span>
                        )}
                    </td>

                    
                    <td className="p-2">{fmtCOP(f.total)}</td>
                    <td className="p-2 text-green-600">{fmtCOP(f.pagado)}</td>
                    <td className="p-2 text-red-600">{fmtCOP(f.pendiente)}</td>
                    <td className="p-2">{f.centro_costo_nombre || "-"}</td>
                    <td className="p-2">
                      {f.public_url ? (
                        <a
                          href={f.public_url as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          Ver
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-center mt-4">
              <button
                onClick={() => loadMasFacturas(modalCliente, modalOffset)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Cargar más
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
