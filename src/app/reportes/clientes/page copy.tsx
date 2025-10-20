// Archivo refinado visualmente: ReporteClientes Refinado
"use client";

import { useEffect, useState } from "react";
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
  LabelList,
} from "recharts";
import { authFetch } from "@/lib/api";

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

export default function ReporteClientes() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [modalCliente, setModalCliente] = useState("");
  const [facturasModal, setFacturasModal] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalOffset, setModalOffset] = useState(0);

  const COLORS: Record<string, string> = {
    sano: "#22c55e",
    alerta: "#facc15",
    vencido: "#dc2626",
    pagado: "#10b981",
  };

  const load = async () => {
    const res = await authFetch("/reportes/analisis_clientes");
    setClientes(res?.clientes || []);
  };

  useEffect(() => {
    load();
  }, []);

  const openModal = async (cliente: string) => {
    setShowModal(true);
    setModalCliente(cliente);
    setFacturasModal([]);
    setModalOffset(0);
    await loadMasFacturas(cliente, 0);
  };

  const loadMasFacturas = async (cliente: string, offset: number) => {
    const res = await authFetch(
      `/reportes/facturas_cliente?cliente=${encodeURIComponent(
        cliente
      )}&limit=10&offset=${offset}`
    );
    if (Array.isArray(res?.rows)) {
      setFacturasModal((prev) => [...prev, ...res.rows]);
      setModalOffset(offset + 10);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-2xl font-bold">📊 Análisis de Facturación</h2>

      {clientes.map((cli, idx) => (
        <div
          key={idx}
          className="bg-white p-4 rounded shadow space-y-4 border"
        >
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h3 className="text-xl font-semibold text-blue-800">
                {cli.cliente}
              </h3>
              <p className="text-sm text-gray-500">
                {cli.cantidad_facturas} facturas
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 text-center">
              <div>
                <p className="text-sm text-gray-500">Facturado</p>
                <p className="font-bold text-green-600">
                  {fmtCOP(cli.total_facturado)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pagado</p>
                <p className="font-bold text-emerald-600">
                  {fmtCOP(cli.total_pagado)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pendiente</p>
                <p className="font-bold text-red-600">
                  {fmtCOP(cli.saldo_pendiente)}
                </p>
              </div>
            </div>

            <ResponsiveContainer width={220} height={140}>
              <BarChart
                data={[cli]}
                layout="vertical"
                margin={{ top: 10, right: 10, bottom: 0, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="cliente" hide />
                <Tooltip formatter={(v) => fmtCOP(Number(v))} />
                <Bar dataKey="total_pagado" fill="#22c55e" />
                <Bar dataKey="saldo_pendiente" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>

            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={cli.facturas_por_estado}
                  dataKey="cantidad"
                  nameKey="estado"
                  outerRadius={60}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {cli.facturas_por_estado.map((entry: any, i: number) => (
                    <Cell
                      key={`cell-${i}`}
                      fill={COLORS[entry.estado] || "#8884d8"}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Facturas recientes</h4>
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Factura</th>
                  <th className="p-2 border">Fecha</th>
                  <th className="p-2 border">Pendiente</th>
                  <th className="p-2 border">Link</th>
                </tr>
              </thead>
              <tbody>
                {cli.facturas_recientes.map((f: any, i: number) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="p-2 font-mono">{f.idfactura}</td>
                    <td className="p-2">
                      {new Date(f.fecha).toLocaleDateString("es-CO")}
                    </td>
                    <td className="p-2 text-red-600 font-semibold">
                      {fmtCOP(f.pendiente)}
                    </td>
                    <td className="p-2">
                      <a
                        href={f.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        Ver
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 text-right">
              <button
                onClick={() => openModal(cli.cliente)}
                className="text-blue-700 hover:underline text-sm"
              >
                Ver todas
              </button>
            </div>
          </div>
        </div>
      ))}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-start p-6 z-50 overflow-auto">
          <div className="bg-white rounded-lg shadow-lg max-w-5xl w-full p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
            >
              ✖
            </button>
            <h3 className="text-lg font-bold mb-4">
              Facturas de {modalCliente}
            </h3>
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Factura</th>
                  <th className="p-2 border">Fecha</th>
                  <th className="p-2 border">Vencimiento</th>
                  <th className="p-2 border">Total</th>
                  <th className="p-2 border">Pagado</th>
                  <th className="p-2 border">Pendiente</th>
                  <th className="p-2 border">Link</th>
                </tr>
              </thead>
              <tbody>
                {facturasModal.map((f, j) => (
                  <tr key={j} className="border-t hover:bg-gray-50">
                    <td className="p-2 font-mono">{f.idfactura}</td>
                    <td className="p-2">
                      {new Date(f.fecha).toLocaleDateString("es-CO")}
                    </td>
                    <td className="p-2">
                      {f.vencimiento
                        ? new Date(f.vencimiento).toLocaleDateString("es-CO")
                        : "-"}
                    </td>
                    <td className="p-2">{fmtCOP(f.total)}</td>
                    <td className="p-2 text-green-600">{fmtCOP(f.pagado)}</td>
                    <td className="p-2 text-red-600">{fmtCOP(f.pendiente)}</td>
                    <td className="p-2">
                      <a
                        href={f.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        Ver
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-center">
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
