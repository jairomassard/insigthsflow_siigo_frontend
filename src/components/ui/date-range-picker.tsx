"use client"
import React from "react"

export function DateRangePicker({
  desde,
  hasta,
  onDesdeChange,
  onHastaChange,
}: {
  desde: string
  hasta: string
  onDesdeChange: (val: string) => void
  onHastaChange: (val: string) => void
}) {
  return (
    <div className="flex gap-2 items-end">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Desde</label>
        <input
          type="date"
          value={desde}
          onChange={(e) => onDesdeChange(e.target.value)}
          className="border px-2 py-1 rounded-md text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Hasta</label>
        <input
          type="date"
          value={hasta}
          onChange={(e) => onHastaChange(e.target.value)}
          className="border px-2 py-1 rounded-md text-sm"
        />
      </div>
    </div>
  )
}
