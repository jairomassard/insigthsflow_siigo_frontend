// Archivo: src/app/reportes/financiero/cuentas_por_pagar_raw/page.tsx

"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";

interface AccountPayableItem {
  document: string;
  date: string;
  due_date: string;
  supplier: {
    identification: string;
    name: string;
  };
  balance: number;
  amount: number;
  cost_center?: string;
}

export default function CuentasPorPagarRawPage() {
  const [data, setData] = useState<AccountPayableItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await authFetch("/debug/siigo/accounts-payable-raw");
        setData(result);
      } catch (err: any) {
        setError(err.message || "Error cargando datos");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">📦 Reporte Crudo de Cuentas por Pagar desde Siigo</h1>

      {loading && <p className="text-sm text-gray-600">Cargando datos desde Siigo…</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {!loading && !error && (
        <div className="overflow-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Documento</th>
                <th className="p-2 text-left">Fecha</th>
                <th className="p-2 text-left">Vencimiento</th>
                <th className="p-2 text-left">Proveedor</th>
                <th className="p-2 text-left">Identificación</th>
                <th className="p-2 text-right">Valor</th>
                <th className="p-2 text-right">Saldo</th>
                <th className="p-2 text-left">Centro de Costo</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2">{item.document}</td>
                  <td className="p-2">{item.date}</td>
                  <td className="p-2">{item.due_date}</td>
                  <td className="p-2">{item.supplier.name}</td>
                  <td className="p-2">{item.supplier.identification}</td>
                  <td className="p-2 text-right">${item.amount.toLocaleString("es-CO")}</td>
                  <td className="p-2 text-right font-bold text-red-600">${item.balance.toLocaleString("es-CO")}</td>
                  <td className="p-2">{item.cost_center || "—"}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-gray-500">
                    No se encontraron resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}