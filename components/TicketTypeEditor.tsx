"use client";

import { useState } from "react";

type Row = { id: string; code: string; name: string; basePrice: number; isActive: boolean };

export function TicketTypeEditor(props: { rows: Row[] }) {
  const [rows, setRows] = useState<Row[]>(props.rows);
  const [msg, setMsg] = useState("");

  async function save(row: Row) {
    const res = await fetch("/api/admin/ticket-types", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(row)
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error ?? "Save failed");
    else setMsg("Saved.");
  }

  return (
    <div className="space-y-3">
      {msg ? <div className="text-sm text-gray-700">{msg}</div> : null}
      {rows.map((r, i) => (
        <div key={r.id} className="grid gap-2 rounded border bg-white p-3 md:grid-cols-5">
          <div className="md:col-span-1">
            <div className="text-xs text-gray-600">Code</div>
            <div className="font-semibold">{r.code}</div>
          </div>
          <label className="md:col-span-2">
            <div className="text-xs text-gray-600">Name</div>
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={r.name}
              onChange={(e) => {
                const next = rows.slice();
                const row = next[i];
                if (!row) return;
                next[i] = { ...row, name: e.target.value };
                setRows(next);
              }}
            />
          </label>
          <label className="md:col-span-1">
            <div className="text-xs text-gray-600">Base price (cents)</div>
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              type="number"
              value={r.basePrice}
              onChange={(e) => {
                const next = rows.slice();
                const row = next[i];
                if (!row) return;
                next[i] = { ...row, basePrice: Math.max(0, Math.floor(Number(e.target.value || 0))) };
                setRows(next);
              }}
            />
          </label>
          <label className="md:col-span-1 flex items-center justify-between gap-2">
            <span className="text-xs text-gray-600">Active</span>
            <input
              type="checkbox"
              checked={r.isActive}
              onChange={(e) => {
                const next = rows.slice();
                const row = next[i];
                if (!row) return;
                next[i] = { ...row, isActive: e.target.checked };
                setRows(next);
              }}
            />
          </label>

          <div className="md:col-span-5">
            <button
              onClick={() => {
                const row = rows[i];
                if (row) void save(row);
              }}
              className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Save
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
