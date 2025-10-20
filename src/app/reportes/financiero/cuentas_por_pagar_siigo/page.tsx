// Archivo: frontend/src/app/reportes/financiero/cuentas_por_pagar_siigo/page.tsx

"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";

interface Discrepancia {
  factura: string;
  proveedor_siigo: string;
  proveedor_local: string;
  saldo_api: number;
  saldo_local: number | null;
  diferencia: number | null;
}

export default function CuentasPorPagarSiigoPage() {
  const [discrepancias, setDiscrepancias] = useState<Discrepancia[]>([]);
  const [totalSiigo, setTotalSiigo] = useState<number>(0);
  const [coincidencias, setCoincidencias] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await authFetch("/debug/siigo/accounts-payable-check");
        setDiscrepancias(res.discrepancias || []);
        setTotalSiigo(res.total_siigo || 0);
        setCoincidencias(res.coincidencias || 0);
      } catch (e) {
        console.error("Error consultando API de Siigo", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">🧾 Comparativo Cuentas por Pagar (API Siigo)</h1>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando información desde Siigo…</p>
      ) : (
        <div className="space-y-2">
          <p>
            <strong>Total facturas reportadas por Siigo:</strong> {totalSiigo.toLocaleString("es-CO")}
          </p>
          <p>
            <strong>Coincidencias exactas con tus datos locales:</strong> {coincidencias.toLocaleString("es-CO")}
          </p>
          <p>
            <strong>Discrepancias encontradas:</strong> {discrepancias.length.toLocaleString("es-CO")}
          </p>

          {discrepancias.length > 0 && (
            <div className="overflow-auto border rounded-xl mt-4">
              <table className="min-w-full text-sm border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                  <tr className="border-b">
                    <th className="p-2 text-left">Factura</th>
                    <th className="p-2 text-left">Proveedor (Siigo)</th>
                    <th className="p-2 text-left">Proveedor (Local)</th>
                    <th className="p-2 text-right">Saldo Siigo</th>
                    <th className="p-2 text-right">Saldo Local</th>
                    <th className="p-2 text-right">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {discrepancias.map((d, i) => (
                    <tr
                      key={`${d.factura}-${i}`}
                      className="border-b hover:bg-yellow-50"
                    >
                      <td className="p-2 font-mono text-xs">{d.factura}</td>
                      <td className="p-2">{d.proveedor_siigo}</td>
                      <td className="p-2">{d.proveedor_local}</td>
                      <td className="p-2 text-right text-blue-600">
                        {d.saldo_api.toLocaleString("es-CO")}
                      </td>
                      <td className="p-2 text-right">
                        {d.saldo_local !== null
                          ? d.saldo_local.toLocaleString("es-CO")
                          : "—"}
                      </td>
                      <td className="p-2 text-right font-bold text-red-600">
                        {d.diferencia !== null
                          ? d.diferencia.toLocaleString("es-CO")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
